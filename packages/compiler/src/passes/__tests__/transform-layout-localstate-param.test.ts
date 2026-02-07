/**
 * Test module for transformLocalState param substitution in transform-layout.ts.
 *
 * Coverage:
 * - Expression objects inside localState field.initial should have param refs substituted
 * - Literal initial values should remain unchanged
 * - Call expressions with param args in initial should be transformed
 * - Nested expressions in initial should be recursively transformed
 *
 * TDD Red Phase: These tests verify that transformLocalState in transform-layout.ts
 * correctly transforms expression objects inside field.initial when those expressions
 * contain param references during layout composition.
 *
 * Bug Summary:
 * The transformLocalState function in transform-layout.ts simply copies field.initial
 * as-is (line: result[name] = { type: field.type, initial: field.initial }).
 * This means param references inside expression objects within initial values are
 * NOT replaced when a component is expanded with props. The function should call
 * transformExpression on field.initial when it is an expression object, passing
 * the TransformContext so that param refs get substituted.
 */

import { describe, it, expect } from 'vitest';
import { transformLayoutPass } from '../transform-layout.js';
import type { LayoutProgram, ViewNode, ComponentDef } from '@constela/core';
import type { LayoutAnalysisContext, AnalysisContext } from '../analyze.js';
import type { CompiledNode, CompiledLocalStateNode } from '../transform.js';

describe('transformLayoutPass: localState initial with param references', () => {
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

  // ==================== Param Substitution in localState Initial ====================

  describe('param substitution in localState initial expression', () => {
    it('should replace param ref inside call expression in localState initial when component is used with props', () => {
      /**
       * Given: A layout component "ChartContainer" has:
       *   - params: { data: { type: "array" } }
       *   - localState: { _bounds: { type: "object", initial: {
       *       expr: "call", target: null, method: "getChartBounds",
       *       args: [{ expr: "param", name: "data" }]
       *     }}}
       *   - The component is used with props: { data: { expr: "lit", value: [1,2,3] } }
       *
       * When: transformLayoutPass is called
       *
       * Then: The localState initial for _bounds should have the param ref
       *       { expr: "param", name: "data" } replaced with { expr: "lit", value: [1,2,3] }
       *
       * Bug: transformLocalState copies field.initial as-is, so the param ref
       *      remains unreplaced in the compiled output.
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ChartContainer: {
          params: {
            data: { type: 'array' },
          },
          localState: {
            _bounds: {
              type: 'object',
              initial: {
                expr: 'call',
                target: null,
                method: 'getChartBounds',
                args: [{ expr: 'param', name: 'data' }],
              },
            },
          },
          localActions: [],
          view: {
            kind: 'element',
            tag: 'div',
            props: { className: { expr: 'lit', value: 'chart-container' } },
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
              name: 'ChartContainer',
              props: {
                data: { expr: 'lit', value: [1, 2, 3] },
              },
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
      expect(viewChildren!.length).toBeGreaterThanOrEqual(2);

      const chartNode = viewChildren![0];
      expect(isCompiledLocalStateNode(chartNode!)).toBe(true);

      if (isCompiledLocalStateNode(chartNode!)) {
        const boundsState = chartNode.state['_bounds'];
        expect(boundsState).toBeDefined();
        expect(boundsState.type).toBe('object');

        // The initial value should be a transformed call expression
        // where the param ref has been substituted
        const initial = boundsState.initial as {
          expr: string;
          target: unknown;
          method: string;
          args?: Array<{ expr: string; value?: unknown; name?: string }>;
        };
        expect(initial.expr).toBe('call');
        expect(initial.target).toBeNull();
        expect(initial.method).toBe('getChartBounds');
        expect(initial.args).toBeDefined();
        expect(initial.args).toHaveLength(1);

        // The param ref should have been replaced with the prop value
        // Expected: { expr: "lit", value: [1, 2, 3] }
        // Bug (current): { expr: "param", name: "data" } (unchanged)
        expect(initial.args![0]!.expr).toBe('lit');
        expect(initial.args![0]!.value).toEqual([1, 2, 3]);
      }
    });

    it('should replace param ref with state expression when prop maps to state', () => {
      /**
       * Given: A layout component has localState initial with param ref,
       *        and the prop is a state expression
       *
       * When: transformLayoutPass is called
       *
       * Then: The param ref should be replaced with the state expression
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        DataProcessor: {
          params: {
            input: { type: 'array' },
          },
          localState: {
            processed: {
              type: 'object',
              initial: {
                expr: 'call',
                target: null,
                method: 'processData',
                args: [{ expr: 'param', name: 'input' }],
              },
            },
          },
          localActions: [],
          view: { kind: 'element', tag: 'div' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'DataProcessor',
              props: {
                input: { expr: 'state', name: 'myData' },
              },
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
      const processorNode = viewChildren![0];
      expect(isCompiledLocalStateNode(processorNode!)).toBe(true);

      if (isCompiledLocalStateNode(processorNode!)) {
        const processedState = processorNode.state['processed'];
        const initial = processedState.initial as {
          expr: string;
          target: unknown;
          method: string;
          args?: Array<{ expr: string; name?: string }>;
        };

        expect(initial.expr).toBe('call');
        expect(initial.args).toHaveLength(1);

        // Expected: { expr: "state", name: "myData" }
        // Bug (current): { expr: "param", name: "input" } (unchanged)
        expect(initial.args![0]!.expr).toBe('state');
        expect(initial.args![0]!.name).toBe('myData');
      }
    });

    it('should replace multiple param refs in localState initial with multiple args', () => {
      /**
       * Given: A layout component has localState initial with a call expression
       *        that has multiple param ref args
       *
       * When: transformLayoutPass is called
       *
       * Then: All param refs should be replaced with their respective prop values
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ScaleChart: {
          params: {
            data: { type: 'array' },
            config: { type: 'object' },
          },
          localState: {
            _bounds: {
              type: 'object',
              initial: {
                expr: 'call',
                target: null,
                method: 'scaleChartY',
                args: [
                  { expr: 'param', name: 'data' },
                  { expr: 'param', name: 'config' },
                ],
              },
            },
          },
          localActions: [],
          view: { kind: 'element', tag: 'svg' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ScaleChart',
              props: {
                data: { expr: 'lit', value: [10, 20, 30] },
                config: { expr: 'lit', value: { min: 0, max: 100 } },
              },
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
      const chartNode = viewChildren![0];
      expect(isCompiledLocalStateNode(chartNode!)).toBe(true);

      if (isCompiledLocalStateNode(chartNode!)) {
        const boundsState = chartNode.state['_bounds'];
        const initial = boundsState.initial as {
          expr: string;
          target: unknown;
          method: string;
          args?: Array<{ expr: string; value?: unknown; name?: string }>;
        };

        expect(initial.expr).toBe('call');
        expect(initial.method).toBe('scaleChartY');
        expect(initial.args).toHaveLength(2);

        // First arg: { expr: "lit", value: [10, 20, 30] }
        expect(initial.args![0]!.expr).toBe('lit');
        expect(initial.args![0]!.value).toEqual([10, 20, 30]);

        // Second arg: { expr: "lit", value: { min: 0, max: 100 } }
        expect(initial.args![1]!.expr).toBe('lit');
        expect(initial.args![1]!.value).toEqual({ min: 0, max: 100 });
      }
    });
  });

  // ==================== Literal Initial Values ====================

  describe('literal initial values remain unchanged', () => {
    it('should preserve literal initial values in localState when component has params', () => {
      /**
       * Given: A layout component has localState with literal initial values
       *        (not expression objects) AND the component is used with props
       *
       * When: transformLayoutPass is called
       *
       * Then: The literal initial values should remain unchanged
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ChartWithDefaults: {
          params: {
            data: { type: 'array' },
          },
          localState: {
            isExpanded: { type: 'boolean', initial: false },
            count: { type: 'number', initial: 0 },
            label: { type: 'string', initial: 'default' },
            _bounds: {
              type: 'object',
              initial: {
                expr: 'call',
                target: null,
                method: 'getChartBounds',
                args: [{ expr: 'param', name: 'data' }],
              },
            },
          },
          localActions: [],
          view: { kind: 'element', tag: 'div' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ChartWithDefaults',
              props: {
                data: { expr: 'lit', value: [1, 2, 3] },
              },
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
      const chartNode = viewChildren![0];
      expect(isCompiledLocalStateNode(chartNode!)).toBe(true);

      if (isCompiledLocalStateNode(chartNode!)) {
        // Literal initial values should remain unchanged
        expect(chartNode.state['isExpanded']).toEqual({ type: 'boolean', initial: false });
        expect(chartNode.state['count']).toEqual({ type: 'number', initial: 0 });
        expect(chartNode.state['label']).toEqual({ type: 'string', initial: 'default' });

        // Expression initial should have param replaced (this part will fail due to bug)
        const boundsInitial = chartNode.state['_bounds'].initial as {
          expr: string;
          args?: Array<{ expr: string; value?: unknown }>;
        };
        expect(boundsInitial.expr).toBe('call');
        expect(boundsInitial.args![0]!.expr).toBe('lit');
        expect(boundsInitial.args![0]!.value).toEqual([1, 2, 3]);
      }
    });
  });

  // ==================== Param Not Provided ====================

  describe('param ref with no matching prop', () => {
    it('should replace unmatched param ref with null literal in localState initial', () => {
      /**
       * Given: A layout component has localState initial with param ref,
       *        but the prop is not provided when the component is used
       *
       * When: transformLayoutPass is called
       *
       * Then: The param ref should be replaced with { expr: "lit", value: null }
       *       (matching the behavior of transformExpression for unresolved params)
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ChartMissingProp: {
          params: {
            data: { type: 'array' },
          },
          localState: {
            _bounds: {
              type: 'object',
              initial: {
                expr: 'call',
                target: null,
                method: 'getChartBounds',
                args: [{ expr: 'param', name: 'data' }],
              },
            },
          },
          localActions: [],
          view: { kind: 'element', tag: 'div' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ChartMissingProp',
              props: {
                // 'data' prop is NOT provided
              },
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
      const chartNode = viewChildren![0];
      expect(isCompiledLocalStateNode(chartNode!)).toBe(true);

      if (isCompiledLocalStateNode(chartNode!)) {
        const boundsInitial = chartNode.state['_bounds'].initial as {
          expr: string;
          args?: Array<{ expr: string; value?: unknown; name?: string }>;
        };

        expect(boundsInitial.expr).toBe('call');
        expect(boundsInitial.args).toHaveLength(1);

        // When the param is not provided, it should become { expr: "lit", value: null }
        // Bug (current): { expr: "param", name: "data" } (unchanged)
        expect(boundsInitial.args![0]!.expr).toBe('lit');
        expect(boundsInitial.args![0]!.value).toBeNull();
      }
    });
  });

  // ==================== Nested Expression in Initial ====================

  describe('nested expressions in localState initial', () => {
    it('should handle param ref inside binary expression in localState initial', () => {
      /**
       * Given: A layout component has localState initial that is a binary expression
       *        containing a param ref
       *
       * When: transformLayoutPass is called
       *
       * Then: The param ref in the binary expression should be replaced
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ComputedInit: {
          params: {
            offset: { type: 'number' },
          },
          localState: {
            startIndex: {
              type: 'number',
              initial: {
                expr: 'bin',
                op: '+',
                left: { expr: 'param', name: 'offset' },
                right: { expr: 'lit', value: 1 },
              },
            },
          },
          localActions: [],
          view: { kind: 'element', tag: 'div' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ComputedInit',
              props: {
                offset: { expr: 'lit', value: 10 },
              },
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
      const computedNode = viewChildren![0];
      expect(isCompiledLocalStateNode(computedNode!)).toBe(true);

      if (isCompiledLocalStateNode(computedNode!)) {
        const startIndexState = computedNode.state['startIndex'];
        const initial = startIndexState.initial as {
          expr: string;
          op: string;
          left: { expr: string; value?: unknown; name?: string };
          right: { expr: string; value: unknown };
        };

        expect(initial.expr).toBe('bin');
        expect(initial.op).toBe('+');

        // The param ref in the left operand should be replaced
        // Expected: { expr: "lit", value: 10 }
        // Bug (current): { expr: "param", name: "offset" } (unchanged)
        expect(initial.left.expr).toBe('lit');
        expect(initial.left.value).toBe(10);

        // The right operand (literal) should remain unchanged
        expect(initial.right.expr).toBe('lit');
        expect(initial.right.value).toBe(1);
      }
    });

    it('should handle param ref as direct initial value in localState', () => {
      /**
       * Given: A layout component has localState where initial IS the param expression
       *        (not wrapped in a call or other expression)
       *
       * When: transformLayoutPass is called
       *
       * Then: The param ref should be replaced with the prop value
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        DirectParam: {
          params: {
            initialValue: { type: 'string' },
          },
          localState: {
            currentValue: {
              type: 'string',
              initial: { expr: 'param', name: 'initialValue' },
            },
          },
          localActions: [],
          view: { kind: 'element', tag: 'div' },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'DirectParam',
              props: {
                initialValue: { expr: 'lit', value: 'hello world' },
              },
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
      const directNode = viewChildren![0];
      expect(isCompiledLocalStateNode(directNode!)).toBe(true);

      if (isCompiledLocalStateNode(directNode!)) {
        const currentValueState = directNode.state['currentValue'];

        // The initial should be the substituted value, not the param ref
        // Expected: { expr: "lit", value: "hello world" }
        // Bug (current): { expr: "param", name: "initialValue" } (unchanged)
        const initial = currentValueState.initial as { expr: string; value?: unknown; name?: string };
        expect(initial.expr).toBe('lit');
        expect(initial.value).toBe('hello world');
      }
    });
  });
});
