/**
 * Test module for Layout Composition with Component LocalState.
 *
 * Coverage:
 * - composeLayoutWithPage preserves layout components in result
 * - composeLayoutWithPage preserves page components in result
 * - composeLayoutWithPage merges components from both layout and page
 * - Layout component with localState is wrapped with localState node in composed view
 * - Multiple layout components with localState are each wrapped
 * - Nested component expansion preserves localState wrapping
 *
 * TDD Red Phase: These tests verify that when layout components containing
 * localState/localActions are composed with pages, the localState wrapping
 * is correctly applied in the composed result.
 *
 * Bug Summary:
 * 1. CompiledProgram interface doesn't have `components` property
 * 2. When layout components are expanded, they're not wrapped with `localState` node
 * 3. The composed program loses component definitions
 */

import { describe, it, expect } from 'vitest';
import { composeLayoutWithPage } from '../transform-layout.js';
import type { ViewNode, ComponentDef, Expression } from '@constela/core';
import type { CompiledProgram, CompiledNode, CompiledLocalStateNode } from '../transform.js';

describe('composeLayoutWithPage with Component LocalState', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a layout CompiledProgram with optional components
   */
  function createLayoutWithComponents(
    view: ViewNode,
    components?: Record<string, ComponentDef>
  ): CompiledProgram {
    const result: CompiledProgram = {
      version: '1.0',
      state: {},
      actions: {},
      view: view as unknown as CompiledNode,
    };
    if (components) {
      (result as unknown as { components: Record<string, ComponentDef> }).components = components;
    }
    return result;
  }

  /**
   * Creates a page CompiledProgram with optional components
   */
  function createPageWithComponents(
    view: ViewNode,
    components?: Record<string, ComponentDef>
  ): CompiledProgram {
    const result: CompiledProgram = {
      version: '1.0',
      state: {},
      actions: {},
      view: view as unknown as CompiledNode,
    };
    if (components) {
      (result as unknown as { components: Record<string, ComponentDef> }).components = components;
    }
    return result;
  }

  /**
   * Type guard to check if a node is CompiledLocalStateNode
   */
  function isCompiledLocalStateNode(node: CompiledNode): node is CompiledLocalStateNode {
    return node.kind === 'localState';
  }

  /**
   * Finds a node by path in the view tree
   */
  function findNodeByPath(node: CompiledNode, path: number[]): CompiledNode | undefined {
    if (path.length === 0) return node;
    
    if (node.kind === 'element') {
      const children = (node as { children?: CompiledNode[] }).children;
      if (children && children[path[0]] !== undefined) {
        return findNodeByPath(children[path[0]]!, path.slice(1));
      }
    } else if (node.kind === 'localState') {
      const localStateNode = node as CompiledLocalStateNode;
      if (path[0] === 0) {
        return findNodeByPath(localStateNode.child, path.slice(1));
      }
    }
    return undefined;
  }

  // ==================== Component Preservation Tests ====================

  describe('component preservation in composed result', () => {
    it('should preserve layout components in composed result', () => {
      /**
       * Given: Layout has components defined
       * When: composeLayoutWithPage is called
       * Then: The composed result should include layout components
       *
       * Bug: CompiledProgram.components is undefined because CompiledProgram
       *      interface doesn't have a `components` property defined.
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        Header: {
          view: { kind: 'element', tag: 'header' },
        } as ComponentDef,
        Footer: {
          view: { kind: 'element', tag: 'footer' },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'slot' }],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const resultWithComponents = result as unknown as {
        components?: Record<string, ComponentDef>;
      };
      expect(resultWithComponents.components).toBeDefined();
      expect(resultWithComponents.components?.Header).toBeDefined();
      expect(resultWithComponents.components?.Footer).toBeDefined();
    });

    it('should preserve page components in composed result', () => {
      /**
       * Given: Page has components defined
       * When: composeLayoutWithPage is called
       * Then: The composed result should include page components
       */
      // Arrange
      const layout = createLayoutWithComponents({
        kind: 'element',
        tag: 'div',
        children: [{ kind: 'slot' }],
      } as ViewNode);

      const pageComponents: Record<string, ComponentDef> = {
        Card: {
          view: { kind: 'element', tag: 'article' },
        } as ComponentDef,
        Button: {
          view: { kind: 'element', tag: 'button' },
        } as ComponentDef,
      };

      const page = createPageWithComponents(
        { kind: 'element', tag: 'main' } as ViewNode,
        pageComponents
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const resultWithComponents = result as unknown as {
        components?: Record<string, ComponentDef>;
      };
      expect(resultWithComponents.components).toBeDefined();
      expect(resultWithComponents.components?.Card).toBeDefined();
      expect(resultWithComponents.components?.Button).toBeDefined();
    });

    it('should merge components from both layout and page', () => {
      /**
       * Given: Both layout and page have components
       * When: composeLayoutWithPage is called
       * Then: The composed result should include all components from both
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        Header: { view: { kind: 'element', tag: 'header' } } as ComponentDef,
      };
      const pageComponents: Record<string, ComponentDef> = {
        Card: { view: { kind: 'element', tag: 'article' } } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'slot' }],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents(
        { kind: 'element', tag: 'main' } as ViewNode,
        pageComponents
      );

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const resultWithComponents = result as unknown as {
        components?: Record<string, ComponentDef>;
      };
      expect(resultWithComponents.components).toBeDefined();
      expect(resultWithComponents.components?.Header).toBeDefined();
      expect(resultWithComponents.components?.Card).toBeDefined();
    });
  });

  // ==================== LocalState Wrapping in Composed View ====================

  describe('localState wrapping in composed view', () => {
    it('should wrap layout component with localState in composed view', () => {
      /**
       * Given: Layout has a component node that references a component with localState
       * When: composeLayoutWithPage is called
       * Then: The component should be expanded AND wrapped with localState node
       *
       * Bug: When layout components are expanded in composeLayoutWithPage,
       *      the component with localState is NOT wrapped with a 'localState' node.
       *      The transformViewNode in transform-layout.ts doesn't apply localState
       *      wrapping like transform.ts does.
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        Accordion: {
          localState: {
            isOpen: { type: 'boolean', initial: false },
          },
          localActions: [
            {
              name: 'toggle',
              steps: [{ do: 'update', target: 'isOpen', operation: 'toggle' }],
            },
          ],
          view: {
            kind: 'element',
            tag: 'div',
            props: { className: { expr: 'lit', value: 'accordion' } },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Accordion Content' } },
            ],
          },
        } as unknown as ComponentDef,
      };

      // Layout view includes a component node
      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Accordion', props: {} },
            { kind: 'slot' },
          ],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      // The first child of the composed view should be a localState node
      // wrapping the expanded Accordion component
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();
      expect(viewChildren!.length).toBeGreaterThanOrEqual(2);

      const accordionNode = viewChildren![0];
      expect(isCompiledLocalStateNode(accordionNode!)).toBe(true);

      if (isCompiledLocalStateNode(accordionNode!)) {
        expect(accordionNode.state).toBeDefined();
        expect(accordionNode.state['isOpen']).toEqual({
          type: 'boolean',
          initial: false,
        });
        expect(accordionNode.actions).toBeDefined();
        expect(accordionNode.actions['toggle']).toBeDefined();
        expect(accordionNode.child.kind).toBe('element');
      }
    });

    it('should wrap multiple layout components with localState independently', () => {
      /**
       * Given: Layout has multiple component nodes with localState
       * When: composeLayoutWithPage is called
       * Then: Each component should be wrapped with its own localState node
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        AccordionA: {
          localState: {
            isOpenA: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'toggleA', steps: [{ do: 'update', target: 'isOpenA', operation: 'toggle' }] },
          ],
          view: { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'a' } } },
        } as unknown as ComponentDef,
        AccordionB: {
          localState: {
            isOpenB: { type: 'boolean', initial: true },
          },
          localActions: [
            { name: 'toggleB', steps: [{ do: 'update', target: 'isOpenB', operation: 'toggle' }] },
          ],
          view: { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'b' } } },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'AccordionA', props: {} },
            { kind: 'component', name: 'AccordionB', props: {} },
            { kind: 'slot' },
          ],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();
      expect(viewChildren!.length).toBeGreaterThanOrEqual(3);

      // AccordionA should be wrapped with localState
      const accordionA = viewChildren![0];
      expect(isCompiledLocalStateNode(accordionA!)).toBe(true);
      if (isCompiledLocalStateNode(accordionA!)) {
        expect(accordionA.state['isOpenA']).toBeDefined();
        expect(accordionA.actions['toggleA']).toBeDefined();
      }

      // AccordionB should be wrapped with localState
      const accordionB = viewChildren![1];
      expect(isCompiledLocalStateNode(accordionB!)).toBe(true);
      if (isCompiledLocalStateNode(accordionB!)) {
        expect(accordionB.state['isOpenB']).toBeDefined();
        expect(accordionB.actions['toggleB']).toBeDefined();
      }
    });

    it('should handle nested component expansion with localState wrapping', () => {
      /**
       * Given: Layout component is nested inside conditional or each node
       * When: composeLayoutWithPage is called
       * Then: The nested component should still be wrapped with localState
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        NestedAccordion: {
          localState: {
            expanded: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'expand', steps: [{ do: 'set', target: 'expanded', value: { expr: 'lit', value: true } }] },
          ],
          view: { kind: 'element', tag: 'details' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showAccordion' },
              then: { kind: 'component', name: 'NestedAccordion', props: {} },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // Find the if node
      const ifNode = viewChildren![0] as { kind: string; then: CompiledNode };
      expect(ifNode.kind).toBe('if');

      // The then branch should be a localState node
      expect(isCompiledLocalStateNode(ifNode.then)).toBe(true);
      if (isCompiledLocalStateNode(ifNode.then)) {
        expect(ifNode.then.state['expanded']).toBeDefined();
        expect(ifNode.then.actions['expand']).toBeDefined();
      }
    });

    it('should handle component without localState (no wrapping needed)', () => {
      /**
       * Given: Layout has component WITHOUT localState
       * When: composeLayoutWithPage is called
       * Then: The component should be expanded but NOT wrapped with localState
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        SimpleHeader: {
          view: {
            kind: 'element',
            tag: 'header',
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Site Title' } }],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'SimpleHeader', props: {} },
            { kind: 'slot' },
          ],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // The first child should be the expanded header element, NOT a localState node
      const headerNode = viewChildren![0];
      expect(headerNode!.kind).toBe('element');
      expect((headerNode as { tag: string }).tag).toBe('header');
    });
  });

  // ==================== Mixed Components (with and without localState) ====================

  describe('mixed components handling', () => {
    it('should correctly handle mix of components with and without localState', () => {
      /**
       * Given: Layout has both components with localState and without
       * When: composeLayoutWithPage is called
       * Then: Only components with localState should be wrapped
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        Header: {
          // No localState
          view: { kind: 'element', tag: 'header' },
        } as ComponentDef,
        Sidebar: {
          localState: {
            isCollapsed: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'collapse', steps: [{ do: 'set', target: 'isCollapsed', value: { expr: 'lit', value: true } }] },
          ],
          view: { kind: 'element', tag: 'aside' },
        } as unknown as ComponentDef,
        Footer: {
          // No localState
          view: { kind: 'element', tag: 'footer' },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Header', props: {} },
            { kind: 'component', name: 'Sidebar', props: {} },
            { kind: 'slot' },
            { kind: 'component', name: 'Footer', props: {} },
          ],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      // Act
      const result = composeLayoutWithPage(layout, page);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();
      expect(viewChildren!.length).toBe(4);

      // Header - NOT wrapped
      expect(viewChildren![0]!.kind).toBe('element');
      expect((viewChildren![0] as { tag: string }).tag).toBe('header');

      // Sidebar - WRAPPED with localState
      expect(isCompiledLocalStateNode(viewChildren![1]!)).toBe(true);
      if (isCompiledLocalStateNode(viewChildren![1]!)) {
        expect(viewChildren![1].state['isCollapsed']).toBeDefined();
      }

      // Page content in slot
      expect(viewChildren![2]!.kind).toBe('element');
      expect((viewChildren![2] as { tag: string }).tag).toBe('main');

      // Footer - NOT wrapped
      expect(viewChildren![3]!.kind).toBe('element');
      expect((viewChildren![3] as { tag: string }).tag).toBe('footer');
    });
  });

  // ==================== Component with Params and LocalState ====================

  describe('component with params and localState', () => {
    it('should handle component with both params and localState', () => {
      /**
       * Given: Layout component has both params and localState
       * When: composeLayoutWithPage is called with layoutParams
       * Then: Params should be resolved AND localState wrapping should be applied
       */
      // Arrange
      const layoutComponents: Record<string, ComponentDef> = {
        ConfigurableAccordion: {
          params: {
            title: { type: 'string' },
          },
          localState: {
            isOpen: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'toggle', steps: [{ do: 'update', target: 'isOpen', operation: 'toggle' }] },
          ],
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'param', name: 'title' } },
            ],
          },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ConfigurableAccordion',
              props: {
                title: { expr: 'param', name: 'pageTitle' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        layoutComponents
      );

      const page = createPageWithComponents({
        kind: 'element',
        tag: 'main',
      } as ViewNode);

      const layoutParams: Record<string, Expression> = {
        pageTitle: { expr: 'lit', value: 'My Accordion Title' },
      };

      // Act
      const result = composeLayoutWithPage(layout, page, layoutParams);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // The accordion should be wrapped with localState
      const accordionNode = viewChildren![0];
      expect(isCompiledLocalStateNode(accordionNode!)).toBe(true);

      if (isCompiledLocalStateNode(accordionNode!)) {
        expect(accordionNode.state['isOpen']).toBeDefined();
        expect(accordionNode.actions['toggle']).toBeDefined();
      }
    });
  });
});
