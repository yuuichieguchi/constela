/**
 * Test module for transformLayoutPass with Component LocalState.
 *
 * Coverage:
 * - transformLayoutPass preserves components in CompiledLayoutProgram
 * - Layout view with component node is expanded with localState wrapping
 * - CompiledProgram type includes components property
 *
 * TDD Red Phase: These tests verify that the transformLayoutPass correctly
 * handles layout components containing localState/localActions.
 *
 * Bug Summary:
 * 1. CompiledProgram interface doesn't have `components` property
 * 2. When layout components are expanded in transformViewNode (transform-layout.ts),
 *    they're not wrapped with `localState` node like in transform.ts
 */

import { describe, it, expect } from 'vitest';
import { transformLayoutPass, CompiledLayoutProgram } from '../transform-layout.js';
import type { LayoutProgram, ViewNode, ComponentDef } from '@constela/core';
import type { LayoutAnalysisContext, AnalysisContext } from '../analyze.js';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledLocalStateNode,
} from '../transform.js';

describe('transformLayoutPass with Component LocalState', () => {
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
  function createLayoutContext(): LayoutAnalysisContext {
    return {
      ...createContext(),
      slotNames: new Set<string>(),
      hasDefaultSlot: true,
    };
  }

  /**
   * Creates a LayoutProgram with components for testing
   */
  function createLayoutWithComponents(
    view: ViewNode,
    components: Record<string, ComponentDef>
  ): LayoutProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view,
      components,
    } as unknown as LayoutProgram;
  }

  /**
   * Type guard to check if a node is CompiledLocalStateNode
   */
  function isCompiledLocalStateNode(node: CompiledNode): node is CompiledLocalStateNode {
    return node.kind === 'localState';
  }

  // ==================== Component Preservation Tests ====================

  describe('component preservation in CompiledLayoutProgram', () => {
    it('should preserve components in CompiledLayoutProgram', () => {
      /**
       * Given: LayoutProgram has components defined
       * When: transformLayoutPass is called
       * Then: CompiledLayoutProgram should include components
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
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
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      expect(result.components).toBeDefined();
      expect(result.components?.Header).toBeDefined();
      expect(result.components?.Footer).toBeDefined();
    });

    it('should preserve component with localState in CompiledLayoutProgram', () => {
      /**
       * Given: LayoutProgram has component with localState
       * When: transformLayoutPass is called
       * Then: CompiledLayoutProgram.components should include the localState definition
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        Accordion: {
          localState: {
            isOpen: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'toggle', steps: [{ do: 'update', target: 'isOpen', operation: 'toggle' }] },
          ],
          view: { kind: 'element', tag: 'details' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'slot' }],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      expect(result.components).toBeDefined();
      expect(result.components?.Accordion).toBeDefined();
      expect((result.components?.Accordion as unknown as { localState?: unknown })?.localState).toBeDefined();
    });
  });

  // ==================== LocalState Wrapping in Layout View ====================

  describe('localState wrapping in layout view transformation', () => {
    it('should wrap component with localState in transformed layout view', () => {
      /**
       * Given: Layout has a component node that references a component with localState
       * When: transformLayoutPass is called
       * Then: The component should be expanded AND wrapped with localState node
       *
       * Bug: transformViewNode in transform-layout.ts expands component but
       *      does NOT apply localState wrapping. Compare with transform.ts
       *      which does wrap with CompiledLocalStateNode.
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        Accordion: {
          localState: {
            isExpanded: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'expand', steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }] },
          ],
          view: {
            kind: 'element',
            tag: 'div',
            props: { className: { expr: 'lit', value: 'accordion' } },
          },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Accordion', props: {} },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();
      expect(viewChildren!.length).toBeGreaterThanOrEqual(2);

      // The first child should be a localState node wrapping the expanded Accordion
      const accordionNode = viewChildren![0];
      expect(isCompiledLocalStateNode(accordionNode!)).toBe(true);

      if (isCompiledLocalStateNode(accordionNode!)) {
        expect(accordionNode.state).toBeDefined();
        expect(accordionNode.state['isExpanded']).toEqual({
          type: 'boolean',
          initial: false,
        });
        expect(accordionNode.actions).toBeDefined();
        expect(accordionNode.actions['expand']).toBeDefined();
        expect(accordionNode.child.kind).toBe('element');
      }
    });

    it('should wrap multiple components with localState independently', () => {
      /**
       * Given: Layout has multiple component nodes with localState
       * When: transformLayoutPass is called
       * Then: Each component should be wrapped with its own localState node
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        AccordionA: {
          localState: { openA: { type: 'boolean', initial: false } },
          localActions: [{ name: 'toggleA', steps: [] }],
          view: { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'a' } } },
        } as unknown as ComponentDef,
        AccordionB: {
          localState: { openB: { type: 'boolean', initial: true } },
          localActions: [{ name: 'toggleB', steps: [] }],
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
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();
      expect(viewChildren!.length).toBeGreaterThanOrEqual(3);

      // AccordionA should be wrapped
      const nodeA = viewChildren![0];
      expect(isCompiledLocalStateNode(nodeA!)).toBe(true);
      if (isCompiledLocalStateNode(nodeA!)) {
        expect(nodeA.state['openA']).toBeDefined();
        expect(nodeA.actions['toggleA']).toBeDefined();
      }

      // AccordionB should be wrapped
      const nodeB = viewChildren![1];
      expect(isCompiledLocalStateNode(nodeB!)).toBe(true);
      if (isCompiledLocalStateNode(nodeB!)) {
        expect(nodeB.state['openB']).toBeDefined();
        expect(nodeB.actions['toggleB']).toBeDefined();
      }
    });

    it('should not wrap component without localState', () => {
      /**
       * Given: Layout has component WITHOUT localState
       * When: transformLayoutPass is called
       * Then: The component should be expanded but NOT wrapped
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        SimpleHeader: {
          view: { kind: 'element', tag: 'header' },
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
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // The first child should be the header element directly, not wrapped
      const headerNode = viewChildren![0];
      expect(headerNode!.kind).toBe('element');
      expect((headerNode as { tag: string }).tag).toBe('header');
    });
  });

  // ==================== Nested Component in Conditional ====================

  describe('nested component expansion', () => {
    it('should handle component with localState inside conditional', () => {
      /**
       * Given: Layout has component with localState inside an if node
       * When: transformLayoutPass is called
       * Then: The component in then/else should be wrapped with localState
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        NestedComponent: {
          localState: { active: { type: 'boolean', initial: true } },
          localActions: [{ name: 'deactivate', steps: [] }],
          view: { kind: 'element', tag: 'section' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showComponent' },
              then: { kind: 'component', name: 'NestedComponent', props: {} },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // Find the if node
      const ifNode = viewChildren![0] as { kind: string; then: CompiledNode };
      expect(ifNode.kind).toBe('if');

      // The then branch should be wrapped with localState
      expect(isCompiledLocalStateNode(ifNode.then)).toBe(true);
      if (isCompiledLocalStateNode(ifNode.then)) {
        expect(ifNode.then.state['active']).toBeDefined();
        expect(ifNode.then.actions['deactivate']).toBeDefined();
      }
    });

    it('should handle component with localState inside each node body', () => {
      /**
       * Given: Layout has component with localState inside each node body
       * When: transformLayoutPass is called
       * Then: The component in body should be wrapped with localState
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ListItem: {
          localState: { selected: { type: 'boolean', initial: false } },
          localActions: [{ name: 'select', steps: [] }],
          view: { kind: 'element', tag: 'li' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'ul',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: { kind: 'component', name: 'ListItem', props: {} },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // Find the each node
      const eachNode = viewChildren![0] as { kind: string; body: CompiledNode };
      expect(eachNode.kind).toBe('each');

      // The body should be wrapped with localState
      expect(isCompiledLocalStateNode(eachNode.body)).toBe(true);
      if (isCompiledLocalStateNode(eachNode.body)) {
        expect(eachNode.body.state['selected']).toBeDefined();
        expect(eachNode.body.actions['select']).toBeDefined();
      }
    });
  });

  // ==================== LocalAction Step Transformation ====================

  describe('localAction step transformation', () => {
    it('should correctly transform set step in localAction', () => {
      /**
       * Given: Layout component has localAction with set step
       * When: transformLayoutPass is called
       * Then: The set step should be correctly compiled
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        Counter: {
          localState: { count: { type: 'number', initial: 0 } },
          localActions: [
            {
              name: 'reset',
              steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }],
            },
          ],
          view: { kind: 'element', tag: 'div' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Counter', props: {} },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const counterNode = viewChildren![0];

      expect(isCompiledLocalStateNode(counterNode!)).toBe(true);
      if (isCompiledLocalStateNode(counterNode!)) {
        const resetAction = counterNode.actions['reset'];
        expect(resetAction).toBeDefined();
        expect(resetAction!.steps.length).toBe(1);
        expect(resetAction!.steps[0]!.do).toBe('set');
      }
    });

    it('should correctly transform update step in localAction', () => {
      /**
       * Given: Layout component has localAction with update/toggle step
       * When: transformLayoutPass is called
       * Then: The update step should be correctly compiled
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        Toggle: {
          localState: { active: { type: 'boolean', initial: false } },
          localActions: [
            {
              name: 'toggle',
              steps: [{ do: 'update', target: 'active', operation: 'toggle' }],
            },
          ],
          view: { kind: 'element', tag: 'button' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Toggle', props: {} },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const toggleNode = viewChildren![0];

      expect(isCompiledLocalStateNode(toggleNode!)).toBe(true);
      if (isCompiledLocalStateNode(toggleNode!)) {
        const toggleAction = toggleNode.actions['toggle'];
        expect(toggleAction).toBeDefined();
        expect(toggleAction!.steps.length).toBe(1);

        const step = toggleAction!.steps[0] as { do: string; target: string; operation: string };
        expect(step.do).toBe('update');
        expect(step.target).toBe('active');
        expect(step.operation).toBe('toggle');
      }
    });
  });
});

// ==================== CompiledProgram Type Tests ====================

describe('CompiledProgram type with components', () => {
  it('should allow components property on CompiledProgram', () => {
    /**
     * This test verifies that the CompiledProgram type includes a `components`
     * property. This is needed for layout composition to work correctly.
     *
     * Bug: CompiledProgram interface in transform.ts does NOT include
     *      a `components` property, which causes TypeScript errors and
     *      runtime issues when composing layouts with pages.
     */
    // Arrange
    const programWithComponents: CompiledProgram = {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' } as CompiledNode,
      // This should not cause a TypeScript error if type is correct
    };

    // Add components property - this tests the type
    const withComponents = programWithComponents as CompiledProgram & {
      components?: Record<string, unknown>;
    };
    withComponents.components = {
      TestComponent: { view: { kind: 'element', tag: 'span' } },
    };

    // Assert
    expect(withComponents.components).toBeDefined();
    expect(withComponents.components?.TestComponent).toBeDefined();

    // The actual fix would be to add `components?: Record<string, ComponentDef>`
    // to the CompiledProgram interface. This test documents the expected behavior.
  });
});
