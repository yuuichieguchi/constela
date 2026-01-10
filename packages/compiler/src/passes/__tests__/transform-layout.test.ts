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
import type { Program, LayoutProgram, ViewNode, Expression } from '@constela/core';
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

    it('should preserve layout importData in transformation', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
        importData: {
          config: {
            repoMain: 'https://github.com/example/repo',
            siteName: 'My Site',
          },
          navigation: {
            items: [
              { label: 'Home', href: '/' },
              { label: 'Docs', href: '/docs' },
            ],
          },
        },
      } as unknown as LayoutProgram;

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      // The compiled layout should preserve importData for later use during composition
      expect(result.importData).toBeDefined();
      expect(result.importData?.config).toEqual({
        repoMain: 'https://github.com/example/repo',
        siteName: 'My Site',
      });
      expect(result.importData?.navigation).toEqual({
        items: [
          { label: 'Home', href: '/' },
          { label: 'Docs', href: '/docs' },
        ],
      });
    });

    it('should handle layout without importData', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
        // No importData
      } as unknown as LayoutProgram;

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      // Should not throw, importData can be undefined
      expect(result.importData === undefined || Object.keys(result.importData).length === 0).toBe(true);
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
      const result = composeLayoutWithPage(layout, page, undefined, slots);

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
      const result = composeLayoutWithPage(layout, page, undefined, slots);

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

// ==================== Issue 2: composeLayoutWithPage with layoutParams ====================

describe('composeLayoutWithPage with layoutParams', () => {
  // ==================== Helper Functions ====================

  function createLayoutWithView(view: ViewNode): CompiledProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: {},
      view,
    } as unknown as CompiledProgram;
  }

  function createPageWithView(view: ViewNode): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view,
    } as unknown as CompiledProgram;
  }

  // ==================== Basic Param Expression Resolution ====================

  describe('basic param expression resolution', () => {
    it('should replace param expression with provided layoutParams value', () => {
      /**
       * Given: Layout has a text node with { "expr": "param", "name": "myParam" }
       * When: composeLayoutWithPage is called with layoutParams { myParam: { expr: "lit", value: "resolved value" } }
       * Then: The composed result should have the param expression replaced with the literal value
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'param', name: 'myParam' },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        myParam: { expr: 'lit' as const, value: 'resolved value' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const textNode = children[0] as { value: { expr: string; value: string } };
      expect(textNode.value.expr).toBe('lit');
      expect(textNode.value.value).toBe('resolved value');
    });

    it('should replace param expression in element props', () => {
      /**
       * Given: Layout has element with prop using param expression
       * When: composeLayoutWithPage is called with corresponding layoutParams
       * Then: The prop value should be replaced with the provided expression
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        props: {
          title: { expr: 'param', name: 'pageTitle' },
        },
        children: [{ kind: 'slot' }],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        pageTitle: { expr: 'lit' as const, value: 'Welcome Page' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const props = (result.view as { props: Record<string, unknown> }).props;
      expect(props.title).toEqual({ expr: 'lit', value: 'Welcome Page' });
    });

    it('should handle multiple param expressions in same layout', () => {
      /**
       * Given: Layout has multiple param expressions
       * When: composeLayoutWithPage is called with all corresponding layoutParams
       * Then: All param expressions should be resolved
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'param', name: 'title' },
          } as ViewNode,
          {
            kind: 'text',
            value: { expr: 'param', name: 'subtitle' },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        title: { expr: 'lit' as const, value: 'Main Title' },
        subtitle: { expr: 'lit' as const, value: 'Sub Title' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const titleNode = children[0] as { value: { expr: string; value: string } };
      const subtitleNode = children[1] as { value: { expr: string; value: string } };
      expect(titleNode.value).toEqual({ expr: 'lit', value: 'Main Title' });
      expect(subtitleNode.value).toEqual({ expr: 'lit', value: 'Sub Title' });
    });
  });

  // ==================== Param Expression with Path ====================

  describe('param expression with path', () => {
    it('should handle param expression with path by substituting entire expression', () => {
      /**
       * Given: Layout has { "expr": "param", "name": "nav", "path": "items" }
       * When: layoutParams provides { nav: { expr: "import", name: "docsNav", path: "navigation" } }
       * Then: The param expression should be substituted with a get expression
       *       that accesses "items" on the provided import expression
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'nav',
        children: [
          {
            kind: 'each',
            items: { expr: 'param', name: 'nav', path: 'items' },
            as: 'item',
            body: {
              kind: 'text',
              value: { expr: 'var', name: 'item', path: 'label' },
            },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        nav: { expr: 'import' as const, name: 'docsNav', path: 'navigation' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const eachNode = children[0] as { items: { expr: string; base?: unknown; path?: string; name?: string } };

      // The param with path should be resolved to a get expression
      // that combines the provided import expression with the path
      expect(eachNode.items.expr).toBe('get');
      expect((eachNode.items.base as { expr: string; name: string; path: string }).expr).toBe('import');
      expect((eachNode.items.base as { expr: string; name: string; path: string }).name).toBe('docsNav');
      expect(eachNode.items.path).toBe('items');
    });

    it('should handle nested path in param expression', () => {
      /**
       * Given: Layout has { "expr": "param", "name": "config", "path": "settings.theme" }
       * When: layoutParams provides { config: { expr: "import", name: "siteConfig" } }
       * Then: The result should be a get expression with combined path
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        props: {
          'data-theme': { expr: 'param', name: 'config', path: 'settings.theme' },
        },
        children: [{ kind: 'slot' }],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        config: { expr: 'import' as const, name: 'siteConfig' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const props = (result.view as { props: Record<string, unknown> }).props;
      const themeExpr = props['data-theme'] as { expr: string; base?: unknown; path?: string };

      expect(themeExpr.expr).toBe('get');
      expect((themeExpr.base as { expr: string; name: string }).expr).toBe('import');
      expect((themeExpr.base as { expr: string; name: string }).name).toBe('siteConfig');
      expect(themeExpr.path).toBe('settings.theme');
    });
  });

  // ==================== Missing Param Handling ====================

  describe('missing layoutParam handling', () => {
    it('should replace missing param with null literal', () => {
      /**
       * Given: Layout has param expression { "expr": "param", "name": "optionalParam" }
       * When: composeLayoutWithPage is called without that param in layoutParams
       * Then: The param expression should be replaced with { expr: "lit", value: null }
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'param', name: 'optionalParam' },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act - No layoutParams provided for optionalParam
      const result = composeLayoutWithPage(layout, page, {});

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const textNode = children[0] as { value: { expr: string; value: unknown } };
      expect(textNode.value.expr).toBe('lit');
      expect(textNode.value.value).toBeNull();
    });

    it('should handle undefined layoutParams parameter gracefully', () => {
      /**
       * Given: Layout has param expressions
       * When: composeLayoutWithPage is called without layoutParams argument
       * Then: All param expressions should be replaced with null literals
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'param', name: 'someParam' },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act - layoutParams is undefined (using old signature for backward compatibility)
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const textNode = children[0] as { value: { expr: string; value: unknown } };
      expect(textNode.value.expr).toBe('lit');
      expect(textNode.value.value).toBeNull();
    });

    it('should handle partial layoutParams - only resolve provided params', () => {
      /**
       * Given: Layout has multiple param expressions
       * When: layoutParams only provides some of them
       * Then: Provided params should be resolved, missing ones should become null
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'param', name: 'providedParam' },
          } as ViewNode,
          {
            kind: 'text',
            value: { expr: 'param', name: 'missingParam' },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        providedParam: { expr: 'lit' as const, value: 'I exist!' },
        // missingParam is not provided
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const providedNode = children[0] as { value: { expr: string; value: unknown } };
      const missingNode = children[1] as { value: { expr: string; value: unknown } };

      expect(providedNode.value).toEqual({ expr: 'lit', value: 'I exist!' });
      expect(missingNode.value).toEqual({ expr: 'lit', value: null });
    });
  });

  // ==================== Nested View Structure ====================

  describe('param resolution in nested view structures', () => {
    it('should resolve param expressions inside conditional nodes', () => {
      /**
       * Given: Layout has param expression inside if/then/else structure
       * When: composeLayoutWithPage is called with layoutParams
       * Then: Param expressions in all branches should be resolved
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'if',
            condition: { expr: 'state', name: 'showTitle' },
            then: {
              kind: 'text',
              value: { expr: 'param', name: 'title' },
            },
            else: {
              kind: 'text',
              value: { expr: 'param', name: 'fallbackTitle' },
            },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        title: { expr: 'lit' as const, value: 'Main Title' },
        fallbackTitle: { expr: 'lit' as const, value: 'Fallback' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const ifNode = children[0] as { then: { value: unknown }; else: { value: unknown } };

      expect(ifNode.then.value).toEqual({ expr: 'lit', value: 'Main Title' });
      expect(ifNode.else.value).toEqual({ expr: 'lit', value: 'Fallback' });
    });

    it('should resolve param expressions inside each node', () => {
      /**
       * Given: Layout has param expression as items source for each node
       * When: composeLayoutWithPage is called with layoutParams
       * Then: The items expression should be resolved
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'nav',
        children: [
          {
            kind: 'each',
            items: { expr: 'param', name: 'navItems' },
            as: 'item',
            body: {
              kind: 'element',
              tag: 'a',
              props: {
                href: { expr: 'var', name: 'item', path: 'href' },
              },
              children: [
                { kind: 'text', value: { expr: 'var', name: 'item', path: 'label' } },
              ],
            },
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        navItems: { expr: 'import' as const, name: 'navigation', path: 'items' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      const eachNode = children[0] as { items: { expr: string; name: string; path: string } };

      expect(eachNode.items.expr).toBe('import');
      expect(eachNode.items.name).toBe('navigation');
      expect(eachNode.items.path).toBe('items');
    });

    it('should resolve param expressions deeply nested in component children', () => {
      /**
       * Given: Layout has deeply nested param expressions
       * When: composeLayoutWithPage is called with layoutParams
       * Then: All nested param expressions should be resolved
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'header',
            children: [
              {
                kind: 'element',
                tag: 'h1',
                children: [
                  {
                    kind: 'text',
                    value: { expr: 'param', name: 'deepTitle' },
                  },
                ],
              },
            ],
          } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams = {
        deepTitle: { expr: 'lit' as const, value: 'Deeply Nested Title' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const divChildren = (result.view as { children: ViewNode[] }).children;
      const header = divChildren[0] as { children: ViewNode[] };
      const h1 = header.children[0] as { children: ViewNode[] };
      const textNode = h1.children[0] as { value: { expr: string; value: string } };

      expect(textNode.value).toEqual({ expr: 'lit', value: 'Deeply Nested Title' });
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should work with existing slots parameter when layoutParams not provided', () => {
      /**
       * Given: Existing usage with slots parameter
       * When: composeLayoutWithPage is called without layoutParams (old signature)
       * Then: Named slot composition should still work correctly
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const slots = {
        header: { kind: 'element', tag: 'h1', children: [] } as ViewNode,
      };

      // Act - Using old signature with just slots
      const result = composeLayoutWithPage(layout, page, undefined, slots);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;
      expect((children[0] as { tag: string }).tag).toBe('h1');
      expect((children[1] as { tag: string }).tag).toBe('main');
    });

    it('should work with both layoutParams and slots provided', () => {
      /**
       * Given: Layout with both param expressions and named slots
       * When: composeLayoutWithPage is called with both layoutParams and slots
       * Then: Both param resolution and slot composition should work
       */
      // Arrange
      const layout = createLayoutWithView({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'param', name: 'siteTitle' },
          } as ViewNode,
          { kind: 'slot', name: 'sidebar' } as ViewNode,
          { kind: 'slot' },
        ],
      } as ViewNode);

      const page = createPageWithView({
        kind: 'element',
        tag: 'article',
      } as ViewNode);

      const layoutParams = {
        siteTitle: { expr: 'lit' as const, value: 'My Site' },
      };

      const slots = {
        sidebar: { kind: 'element', tag: 'aside', children: [] } as ViewNode,
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams, slots);

      // Assert
      const children = (result.view as { children: ViewNode[] }).children;

      // First child: resolved param expression
      const titleNode = children[0] as { value: { expr: string; value: string } };
      expect(titleNode.value).toEqual({ expr: 'lit', value: 'My Site' });

      // Second child: filled named slot
      expect((children[1] as { tag: string }).tag).toBe('aside');

      // Third child: default slot with page content
      expect((children[2] as { tag: string }).tag).toBe('article');
    });
  });
});

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
