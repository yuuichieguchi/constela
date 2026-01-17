/**
 * Test module for Component Local State transformation.
 *
 * Coverage:
 * - Component with localState wraps view in CompiledLocalStateNode
 * - CompiledLocalStateNode includes state definitions
 * - CompiledLocalStateNode includes compiled local actions
 * - Child node is correctly passed through
 *
 * TDD Red Phase: These tests verify the transformation of component-level
 * local state into CompiledLocalStateNode for runtime execution.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program, ComponentDef } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledLocalStateNode,
  CompiledLocalAction,
} from '../../index.js';

describe('transformPass with Component Local State', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(options: {
    stateNames?: string[];
    actionNames?: string[];
    componentNames?: string[];
  } = {}): AnalysisContext {
    return {
      stateNames: new Set<string>(options.stateNames ?? []),
      actionNames: new Set<string>(options.actionNames ?? []),
      componentNames: new Set<string>(options.componentNames ?? []),
      routeParams: new Set<string>(),
      importNames: new Set<string>(),
      dataNames: new Set<string>(),
      refNames: new Set<string>(),
      styleNames: new Set<string>(),
    };
  }

  /**
   * Creates a minimal Program with components for testing local state transformation
   */
  function createProgramWithComponent(
    componentDef: ComponentDef & {
      localState?: Record<string, { type: string; initial: unknown }>;
      localActions?: Array<{ name: string; steps: unknown[] }>;
    },
    componentName: string = 'TestComponent'
  ): Program {
    return {
      version: '1.0',
      state: {},
      actions: [],
      view: {
        kind: 'component',
        name: componentName,
        props: {},
      },
      components: {
        [componentName]: componentDef,
      },
    } as unknown as Program;
  }

  /**
   * Type guard to check if a node is CompiledLocalStateNode
   */
  function isCompiledLocalStateNode(node: CompiledNode): node is CompiledLocalStateNode {
    return node.kind === 'localState';
  }

  // ==================== Basic Transformation ====================

  describe('basic localState transformation', () => {
    it('should wrap component with localState in CompiledLocalStateNode', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.kind).toBe('localState');
      }
    });

    it('should include state definitions in CompiledLocalStateNode', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
          count: { type: 'number', initial: 42 },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.state).toBeDefined();
        expect(result.view.state['isExpanded']).toEqual({
          type: 'boolean',
          initial: false,
        });
        expect(result.view.state['count']).toEqual({
          type: 'number',
          initial: 42,
        });
      }
    });

    it('should include compiled local actions in CompiledLocalStateNode', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggleExpand',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.actions).toBeDefined();
        expect(result.view.actions['toggleExpand']).toBeDefined();
        expect(result.view.actions['toggleExpand']?.name).toBe('toggleExpand');
        expect(result.view.actions['toggleExpand']?.steps.length).toBe(1);
      }
    });

    it('should pass through child node correctly', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'container' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
          ],
        },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.child).toBeDefined();
        expect(result.view.child.kind).toBe('element');
        if (result.view.child.kind === 'element') {
          expect(result.view.child.tag).toBe('div');
          expect(result.view.child.children?.length).toBe(1);
        }
      }
    });
  });

  // ==================== Component Without LocalState ====================

  describe('component without localState', () => {
    it('should not wrap component without localState in CompiledLocalStateNode', () => {
      // Arrange
      const program = createProgramWithComponent({
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      // Component without localState should not produce CompiledLocalStateNode
      expect(result.view.kind).toBe('element');
    });

    it('should handle component with params but no localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        params: {
          title: { type: 'string' },
        },
        view: {
          kind: 'element',
          tag: 'h1',
          children: [{ kind: 'text', value: { expr: 'param', name: 'title' } }],
        },
      });
      // Add title prop to component invocation
      (program.view as unknown as { props: Record<string, unknown> }).props = {
        title: { expr: 'lit', value: 'Hello' },
      };
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.view.kind).toBe('element');
    });
  });

  // ==================== Action Step Transformation ====================

  describe('local action step transformation', () => {
    it('should transform set step correctly', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          count: { type: 'number', initial: 0 },
        },
        localActions: [
          {
            name: 'resetCount',
            steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 100 } }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        const action = result.view.actions['resetCount'];
        expect(action?.steps[0]?.do).toBe('set');
        if (action?.steps[0]?.do === 'set') {
          expect(action.steps[0].target).toBe('count');
          expect(action.steps[0].value).toEqual({ expr: 'lit', value: 100 });
        }
      }
    });

    it('should transform update step with toggle correctly', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isVisible: { type: 'boolean', initial: true },
        },
        localActions: [
          {
            name: 'toggleVisibility',
            steps: [{ do: 'update', target: 'isVisible', operation: 'toggle' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        const action = result.view.actions['toggleVisibility'];
        expect(action?.steps[0]?.do).toBe('update');
        if (action?.steps[0]?.do === 'update') {
          expect(action.steps[0].target).toBe('isVisible');
          expect(action.steps[0].operation).toBe('toggle');
        }
      }
    });

    it('should transform update step with increment correctly', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          counter: { type: 'number', initial: 0 },
        },
        localActions: [
          {
            name: 'increment',
            steps: [{ do: 'update', target: 'counter', operation: 'increment' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        const action = result.view.actions['increment'];
        expect(action?.steps[0]?.do).toBe('update');
        if (action?.steps[0]?.do === 'update') {
          expect(action.steps[0].target).toBe('counter');
          expect(action.steps[0].operation).toBe('increment');
        }
      }
    });

    it('should transform multiple action steps correctly', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          loading: { type: 'boolean', initial: false },
          data: { type: 'object', initial: {} },
        },
        localActions: [
          {
            name: 'startLoading',
            steps: [
              { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'data', value: { expr: 'lit', value: {} } },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        const action = result.view.actions['startLoading'];
        expect(action?.steps.length).toBe(2);
      }
    });
  });

  // ==================== State Type Support ====================

  describe('all state types', () => {
    it('should transform boolean localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          flag: { type: 'boolean', initial: true },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.state['flag']).toEqual({ type: 'boolean', initial: true });
      }
    });

    it('should transform number localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          count: { type: 'number', initial: 42 },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.state['count']).toEqual({ type: 'number', initial: 42 });
      }
    });

    it('should transform string localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          label: { type: 'string', initial: 'Hello' },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.state['label']).toEqual({ type: 'string', initial: 'Hello' });
      }
    });

    it('should transform list localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          items: { type: 'list', initial: [1, 2, 3] },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.state['items']).toEqual({ type: 'list', initial: [1, 2, 3] });
      }
    });

    it('should transform object localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          data: { type: 'object', initial: { key: 'value' } },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.state['data']).toEqual({
          type: 'object',
          initial: { key: 'value' },
        });
      }
    });
  });

  // ==================== Multiple Components ====================

  describe('multiple components with localState', () => {
    it('should transform multiple components with localState independently', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'ComponentA', props: {} },
            { kind: 'component', name: 'ComponentB', props: {} },
          ],
        },
        components: {
          ComponentA: {
            localState: {
              expandedA: { type: 'boolean', initial: false },
            },
            localActions: [
              {
                name: 'toggleA',
                steps: [{ do: 'update', target: 'expandedA', operation: 'toggle' }],
              },
            ],
            view: { kind: 'element', tag: 'div' },
          },
          ComponentB: {
            localState: {
              expandedB: { type: 'boolean', initial: true },
            },
            localActions: [
              {
                name: 'toggleB',
                steps: [{ do: 'update', target: 'expandedB', operation: 'toggle' }],
              },
            ],
            view: { kind: 'element', tag: 'span' },
          },
        },
      } as unknown as Program;
      const context = createContext({
        componentNames: ['ComponentA', 'ComponentB'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.view.kind).toBe('element');
      if (result.view.kind === 'element') {
        expect(result.view.children?.length).toBe(2);

        // First child should be CompiledLocalStateNode for ComponentA
        const childA = result.view.children?.[0];
        expect(isCompiledLocalStateNode(childA!)).toBe(true);
        if (isCompiledLocalStateNode(childA!)) {
          expect(childA.state['expandedA']).toBeDefined();
          expect(childA.actions['toggleA']).toBeDefined();
        }

        // Second child should be CompiledLocalStateNode for ComponentB
        const childB = result.view.children?.[1];
        expect(isCompiledLocalStateNode(childB!)).toBe(true);
        if (isCompiledLocalStateNode(childB!)) {
          expect(childB.state['expandedB']).toBeDefined();
          expect(childB.actions['toggleB']).toBeDefined();
        }
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty localState object', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {},
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      // Empty localState might still wrap in CompiledLocalStateNode or not
      // depending on implementation decision
      expect(result.view).toBeDefined();
    });

    it('should handle empty localActions array', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          count: { type: 'number', initial: 0 },
        },
        localActions: [],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(Object.keys(result.view.actions).length).toBe(0);
      }
    });

    it('should handle component with complex nested view', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggle',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isExpanded' },
              then: {
                kind: 'element',
                tag: 'div',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Expanded content' } },
                ],
              },
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                onClick: { event: 'click', action: 'toggle' },
              },
              children: [
                { kind: 'text', value: { expr: 'lit', value: 'Toggle' } },
              ],
            },
          ],
        },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        expect(result.view.child.kind).toBe('element');
        if (result.view.child.kind === 'element') {
          expect(result.view.child.children?.length).toBe(2);
        }
      }
    });

    it('should preserve CompiledProgram structure with localState components', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result: CompiledProgram = transformPass(program, context);

      // Assert
      expect(result.version).toBe('1.0');
      expect(result.state).toBeDefined();
      expect(result.actions).toBeDefined();
      expect(result.view).toBeDefined();
    });
  });

  // ==================== Type Compatibility ====================

  describe('CompiledLocalStateNode type compatibility', () => {
    it('should have correct CompiledLocalStateNode structure', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggle',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        // Verify structure matches CompiledLocalStateNode interface
        expect(result.view).toHaveProperty('kind');
        expect(result.view).toHaveProperty('state');
        expect(result.view).toHaveProperty('actions');
        expect(result.view).toHaveProperty('child');
        expect(result.view.kind).toBe('localState');
        expect(typeof result.view.state).toBe('object');
        expect(typeof result.view.actions).toBe('object');
      }
    });

    it('should have CompiledLocalAction with correct structure', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          count: { type: 'number', initial: 0 },
        },
        localActions: [
          {
            name: 'increment',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
              { do: 'set', target: 'count', value: { expr: 'lit', value: 10 } },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });
      const context = createContext({ componentNames: ['TestComponent'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (isCompiledLocalStateNode(result.view)) {
        const action: CompiledLocalAction | undefined = result.view.actions['increment'];
        expect(action).toBeDefined();
        expect(action?.name).toBe('increment');
        expect(Array.isArray(action?.steps)).toBe(true);
        expect(action?.steps.length).toBe(2);
      }
    });
  });
});
