/**
 * Test module for Layout Composition transformation.
 *
 * Coverage:
 * - Layout composition (inserting page view into slot)
 * - Named slot composition
 * - Multiple slots in layout
 * - Layout state/action merging with page
 * - Compiled layout structure
 *
 * TDD Red Phase: These tests verify the transformation of layout programs
 * and composition with page programs that will be added to support layout
 * composition in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { transformLayoutPass, composeLayoutWithPage } from '../transform-layout.js';
import type { Program, LayoutProgram, ViewNode } from '@constela/core';
import type { AnalysisContext, LayoutAnalysisContext } from '../analyze.js';
import type { CompiledProgram } from '../transform.js';

describe('transformLayoutPass', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(): AnalysisContext {
    return {
      stateNames: new Set<string>(),
      actionNames: new Set<string>(),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(),
      importNames: new Set<string>(),
    };
  }

  /**
   * Creates a LayoutAnalysisContext for testing
   */
  function createLayoutContext(slotNames: string[] = [], hasDefaultSlot = true): LayoutAnalysisContext {
    return {
      ...createContext(),
      slotNames: new Set<string>(slotNames),
      hasDefaultSlot,
    };
  }

  /**
   * Creates a minimal LayoutProgram for testing
   */
  function createLayoutProgram(view: ViewNode): LayoutProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view,
    } as unknown as LayoutProgram;
  }

  /**
   * Creates a minimal page Program for testing
   */
  function createPageProgram(view: ViewNode): Program {
    return {
      version: '1.0',
      state: {},
      actions: [],
      view,
    } as unknown as Program;
  }

  // ==================== Basic Layout Transformation ====================

  describe('basic layout transformation', () => {
    it('should transform layout program structure', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot' },
        ],
      } as ViewNode);

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      expect(result.version).toBe('1.0');
      expect(result.type).toBe('layout');
    });

    it('should preserve layout state in transformation', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {
          menuOpen: { type: 'boolean', initial: false },
        },
        actions: [],
        view: { kind: 'slot' },
      } as unknown as LayoutProgram;

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      expect(result.state).toBeDefined();
      expect(result.state.menuOpen).toBeDefined();
    });

    it('should preserve layout actions in transformation', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: { menuOpen: { type: 'boolean', initial: false } },
        actions: [
          { name: 'toggleMenu', steps: [] },
        ],
        view: { kind: 'slot' },
      } as unknown as LayoutProgram;

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]?.name).toBe('toggleMenu');
    });

    it('should preserve layout components in transformation', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Header' },
            { kind: 'slot' },
          ],
        },
        components: {
          Header: {
            view: { kind: 'element', tag: 'header' },
          },
        },
      } as unknown as LayoutProgram;

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      expect(result.components).toBeDefined();
      expect(result.components?.Header).toBeDefined();
    });
  });
});

describe('composeLayoutWithPage', () => {
  // ==================== Helper Functions ====================

  function createLayout(view: ViewNode): CompiledProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view,
    } as unknown as CompiledProgram;
  }

  function createPage(view: ViewNode): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: [],
      view,
    } as unknown as CompiledProgram;
  }

  // ==================== Default Slot Composition ====================

  describe('default slot composition', () => {
    it('should insert page view into default slot', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'layout' } },
        children: [
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPage({
        kind: 'element',
        tag: 'main',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Page Content' } },
        ],
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      // The slot should be replaced with page view
      expect(result.view.kind).toBe('element');
      const viewDiv = result.view as { children: ViewNode[] };
      expect(viewDiv.children[0]?.kind).toBe('element');
      expect((viewDiv.children[0] as { tag: string }).tag).toBe('main');
    });

    it('should preserve layout structure around inserted content', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'header', children: [] },
          { kind: 'slot' },
          { kind: 'element', tag: 'footer', children: [] },
        ],
      } as ViewNode);

      const page = createPage({
        kind: 'element',
        tag: 'article',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      expect(children).toHaveLength(3);
      expect((children[0] as { tag: string }).tag).toBe('header');
      expect((children[1] as { tag: string }).tag).toBe('article'); // Page content
      expect((children[2] as { tag: string }).tag).toBe('footer');
    });

    it('should handle slot as root view', () => {
      // Arrange
      const layout = createLayout({ kind: 'slot' } as ViewNode);
      const page = createPage({ kind: 'element', tag: 'main' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.view.kind).toBe('element');
      expect((result.view as { tag: string }).tag).toBe('main');
    });
  });

  // ==================== Named Slot Composition ====================

  describe('named slot composition', () => {
    it('should insert content into named slots', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot' }, // default slot
        ],
      } as ViewNode);

      const page = createPage({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const slots = {
        header: { kind: 'element', tag: 'h1', children: [] } as ViewNode,
      };

      // Act
      const result = composeLayoutWithPage(layout, page, slots);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      expect((children[0] as { tag: string }).tag).toBe('h1'); // header slot
      expect((children[1] as { tag: string }).tag).toBe('main'); // default slot
    });

    it('should handle multiple named slots', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot', name: 'sidebar' },
          { kind: 'slot' }, // default/content slot
          { kind: 'slot', name: 'footer' },
        ],
      } as ViewNode);

      const page = createPage({ kind: 'element', tag: 'article' } as ViewNode);

      const slots = {
        header: { kind: 'element', tag: 'header' } as ViewNode,
        sidebar: { kind: 'element', tag: 'aside' } as ViewNode,
        footer: { kind: 'element', tag: 'footer' } as ViewNode,
      };

      // Act
      const result = composeLayoutWithPage(layout, page, slots);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      expect(children).toHaveLength(4);
      expect((children[0] as { tag: string }).tag).toBe('header');
      expect((children[1] as { tag: string }).tag).toBe('aside');
      expect((children[2] as { tag: string }).tag).toBe('article');
      expect((children[3] as { tag: string }).tag).toBe('footer');
    });

    it('should leave unfilled named slots empty', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'optional-sidebar' },
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPage({ kind: 'element', tag: 'main' } as ViewNode);

      // Act - Not providing content for optional-sidebar
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      // Unfilled named slots should be removed or rendered as empty element
      expect(children.length).toBeLessThanOrEqual(2);
    });
  });

  // ==================== State and Action Merging ====================

  describe('state and action merging', () => {
    it('should merge layout state with page state', () => {
      // Arrange
      const layout: CompiledProgram = {
        version: '1.0',
        type: 'layout',
        state: {
          menuOpen: { type: 'boolean', initial: false },
        },
        actions: [],
        view: { kind: 'slot' },
      } as unknown as CompiledProgram;

      const page: CompiledProgram = {
        version: '1.0',
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as CompiledProgram;

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.state.menuOpen).toBeDefined();
      expect(result.state.count).toBeDefined();
    });

    it('should merge layout actions with page actions', () => {
      // Arrange
      const layout: CompiledProgram = {
        version: '1.0',
        type: 'layout',
        state: { menuOpen: { type: 'boolean', initial: false } },
        actions: [{ name: 'toggleMenu', steps: [] }],
        view: { kind: 'slot' },
      } as unknown as CompiledProgram;

      const page: CompiledProgram = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [{ name: 'increment', steps: [] }],
        view: { kind: 'element', tag: 'div' },
      } as unknown as CompiledProgram;

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const actionsArray = Object.values(result.actions);
      expect(actionsArray).toHaveLength(2);
      expect(actionsArray.some(a => a.name === 'toggleMenu')).toBe(true);
      expect(actionsArray.some(a => a.name === 'increment')).toBe(true);
    });

    it('should prefix layout state to avoid conflicts', () => {
      // Arrange - Both have state named 'count'
      const layout: CompiledProgram = {
        version: '1.0',
        type: 'layout',
        state: { count: { type: 'number', initial: 100 } },
        actions: [],
        view: { kind: 'slot' },
      } as unknown as CompiledProgram;

      const page: CompiledProgram = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as CompiledProgram;

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      // Layout state should be prefixed to avoid conflict
      expect(result.state['$layout.count'] || result.state['_layout_count']).toBeDefined();
      expect(result.state.count).toBeDefined();
    });

    it('should prefix layout actions to avoid conflicts', () => {
      // Arrange - Both have action named 'reset'
      const layout: CompiledProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [{ name: 'reset', steps: [] }],
        view: { kind: 'slot' },
      } as unknown as CompiledProgram;

      const page: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: [{ name: 'reset', steps: [] }],
        view: { kind: 'element', tag: 'div' },
      } as unknown as CompiledProgram;

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      // Layout actions should be prefixed to avoid conflict
      const actionsArray = Object.values(result.actions);
      const actionNames = actionsArray.map(a => a.name);
      expect(actionNames).toContain('reset'); // Page action
      expect(actionNames.some(n => n.includes('layout') || n.startsWith('$'))).toBe(true);
    });

    it('should merge components from layout and page', () => {
      // Arrange
      const layout: CompiledProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
        components: {
          Header: { view: { kind: 'element', tag: 'header' } },
        },
      } as unknown as CompiledProgram;

      const page: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
        components: {
          Card: { view: { kind: 'element', tag: 'div' } },
        },
      } as unknown as CompiledProgram;

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.components?.Header).toBeDefined();
      expect(result.components?.Card).toBeDefined();
    });
  });

  // ==================== Nested Slots ====================

  describe('nested slots in layout', () => {
    it('should compose slot inside conditional', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'if',
            condition: { expr: 'state', name: 'showContent' },
            then: { kind: 'slot' },
            else: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
          },
        ],
      } as ViewNode);

      const page = createPage({ kind: 'element', tag: 'main' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const ifNode = (result.view as { children: ViewNode[] }).children[0] as { then: ViewNode };
      expect((ifNode.then as { tag: string }).tag).toBe('main');
    });

    it('should compose slot in deeply nested structure', () => {
      // Arrange
      const layout = createLayout({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'section',
            children: [
              {
                kind: 'element',
                tag: 'article',
                children: [{ kind: 'slot' }],
              },
            ],
          },
        ],
      } as ViewNode);

      const page = createPage({
        kind: 'text',
        value: { expr: 'lit', value: 'Content' },
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const section = (result.view as { children: ViewNode[] }).children[0] as { children: ViewNode[] };
      const article = section.children[0] as { children: ViewNode[] };
      expect(article.children[0]?.kind).toBe('text');
    });
  });

  // ==================== Route Preservation ====================

  describe('route preservation', () => {
    it('should preserve page route in composed result', () => {
      // Arrange
      const layout = createLayout({ kind: 'slot' } as ViewNode);

      const page: CompiledProgram = {
        version: '1.0',
        route: {
          path: '/users/:id',
          title: { expr: 'lit', value: 'User Profile' },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as CompiledProgram;

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.route?.path).toBe('/users/:id');
      expect(result.route?.title).toBeDefined();
    });

    it('should not include layout route in result', () => {
      // Arrange - Layouts should not have routes
      const layout: CompiledProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
      } as unknown as CompiledProgram;

      const page = createPage({ kind: 'element', tag: 'div' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.route).toBeUndefined();
    });
  });
});

describe('CompiledLayoutProgram type', () => {
  it('should have correct structure with type field', () => {
    // This test verifies the CompiledLayoutProgram interface
    const compiledLayout = {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view: { kind: 'slot' },
    };

    expect(compiledLayout.type).toBe('layout');
    expect(compiledLayout.version).toBe('1.0');
  });
});

// ==================== Issue 1: composeLayoutWithPage loses importData ====================

describe('composeLayoutWithPage importData merging', () => {
  // ==================== Helper Functions ====================

  function createLayoutWithImports(
    view: ViewNode,
    importData?: Record<string, unknown>
  ): CompiledProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: {},
      view,
      importData,
    } as unknown as CompiledProgram;
  }

  function createPageWithImports(
    view: ViewNode,
    importData?: Record<string, unknown>
  ): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view,
      importData,
    } as unknown as CompiledProgram;
  }

  // ==================== Page importData preservation ====================

  describe('page importData preservation', () => {
    it('should preserve page importData in composed result', () => {
      // Arrange
      const layout = createLayoutWithImports({ kind: 'slot' } as ViewNode);
      const page = createPageWithImports(
        { kind: 'element', tag: 'main' } as ViewNode,
        {
          pageConfig: { theme: 'dark', title: 'My Page' },
          pageData: [1, 2, 3],
        }
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.pageConfig).toEqual({ theme: 'dark', title: 'My Page' });
      expect(result.importData?.pageData).toEqual([1, 2, 3]);
    });

    it('should preserve nested page importData', () => {
      // Arrange
      const layout = createLayoutWithImports({ kind: 'slot' } as ViewNode);
      const page = createPageWithImports(
        { kind: 'element', tag: 'main' } as ViewNode,
        {
          navigation: {
            items: [
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
            ],
          },
        }
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.navigation).toBeDefined();
      expect((result.importData?.navigation as { items: unknown[] })?.items).toHaveLength(2);
    });
  });

  // ==================== Layout importData preservation ====================

  describe('layout importData preservation', () => {
    it('should preserve layout importData in composed result', () => {
      // Arrange
      const layout = createLayoutWithImports(
        { kind: 'slot' } as ViewNode,
        {
          layoutConfig: { sidebarWidth: 250, showHeader: true },
          layoutStrings: { copyright: '2024 MyApp' },
        }
      );
      const page = createPageWithImports({ kind: 'element', tag: 'main' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.layoutConfig).toEqual({ sidebarWidth: 250, showHeader: true });
      expect(result.importData?.layoutStrings).toEqual({ copyright: '2024 MyApp' });
    });

    it('should preserve layout importData with complex nested structure', () => {
      // Arrange
      const layout = createLayoutWithImports(
        { kind: 'slot' } as ViewNode,
        {
          menu: {
            main: [
              { label: 'Dashboard', icon: 'home' },
              { label: 'Settings', icon: 'gear' },
            ],
            footer: [{ label: 'Help' }],
          },
        }
      );
      const page = createPageWithImports({ kind: 'element', tag: 'main' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.menu).toBeDefined();
    });
  });

  // ==================== Merging both importData ====================

  describe('merging layout and page importData', () => {
    it('should merge importData from both layout and page', () => {
      // Arrange
      const layout = createLayoutWithImports(
        { kind: 'slot' } as ViewNode,
        {
          layoutNav: { items: ['Home', 'About'] },
        }
      );
      const page = createPageWithImports(
        { kind: 'element', tag: 'main' } as ViewNode,
        {
          pageData: { content: 'Hello World' },
        }
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.layoutNav).toEqual({ items: ['Home', 'About'] });
      expect(result.importData?.pageData).toEqual({ content: 'Hello World' });
    });

    it('should give page importData precedence on key conflicts', () => {
      // Arrange - Both have 'config' key
      const layout = createLayoutWithImports(
        { kind: 'slot' } as ViewNode,
        {
          config: { theme: 'light', fontSize: 14 },
          layoutOnly: 'from-layout',
        }
      );
      const page = createPageWithImports(
        { kind: 'element', tag: 'main' } as ViewNode,
        {
          config: { theme: 'dark', maxWidth: 1200 },
          pageOnly: 'from-page',
        }
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      // Page should take precedence for conflicting keys
      expect(result.importData?.config).toEqual({ theme: 'dark', maxWidth: 1200 });
      // Non-conflicting keys should be preserved
      expect(result.importData?.layoutOnly).toBe('from-layout');
      expect(result.importData?.pageOnly).toBe('from-page');
    });

    it('should handle case where only layout has importData', () => {
      // Arrange
      const layout = createLayoutWithImports(
        { kind: 'slot' } as ViewNode,
        { layoutData: { value: 42 } }
      );
      const page = createPageWithImports({ kind: 'element', tag: 'main' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.layoutData).toEqual({ value: 42 });
    });

    it('should handle case where only page has importData', () => {
      // Arrange
      const layout = createLayoutWithImports({ kind: 'slot' } as ViewNode);
      const page = createPageWithImports(
        { kind: 'element', tag: 'main' } as ViewNode,
        { pageData: { value: 100 } }
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      expect(result.importData).toBeDefined();
      expect(result.importData?.pageData).toEqual({ value: 100 });
    });

    it('should handle case where neither has importData', () => {
      // Arrange
      const layout = createLayoutWithImports({ kind: 'slot' } as ViewNode);
      const page = createPageWithImports({ kind: 'element', tag: 'main' } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      // Should not have importData or should be undefined/empty
      expect(result.importData === undefined || Object.keys(result.importData).length === 0).toBe(true);
    });
  });
});
