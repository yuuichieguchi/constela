/**
 * Test module for Call and Lambda Expression transformation.
 *
 * Coverage:
 * - CompiledCallExpr transformation
 * - CompiledLambdaExpr transformation
 * - Nested call/lambda expression transformation
 *
 * TDD Red Phase: These tests verify the transformation of call and lambda expressions.
 * Expected: All tests should FAIL initially because:
 * - transformExpression does not handle 'call' and 'lambda' expression types
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program, Expression } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';

// ==================== Helper Functions ====================

/**
 * Creates a minimal AnalysisContext for testing
 */
function createContext(options: {
  stateNames?: string[];
  actionNames?: string[];
} = {}): AnalysisContext {
  return {
    stateNames: new Set<string>(options.stateNames ?? []),
    actionNames: new Set<string>(options.actionNames ?? []),
    componentNames: new Set<string>(),
    routeParams: new Set<string>(),
    importNames: new Set<string>(),
    dataNames: new Set<string>(),
    refNames: new Set<string>(),
  };
}

/**
 * Creates a minimal Program for testing expression transformation
 */
function createProgramWithExpression(
  expression: Expression,
  state: Record<string, { type: string; initial: unknown }> = {}
): Program {
  return {
    version: '1.0',
    state: {
      items: { type: 'list', initial: [1, 2, 3] },
      count: { type: 'number', initial: 0 },
      ...state,
    },
    actions: [],
    view: {
      kind: 'text',
      value: expression,
    },
  } as unknown as Program;
}

// ==================== CompiledCallExpr Transformation Tests ====================

describe('transformPass - CompiledCallExpr', () => {
  describe('basic call expression transformation', () => {
    it('should transform call expression to CompiledCallExpr', () => {
      /**
       * Given: A call expression with target and method
       * When: The AST is transformed
       * Then: It should produce a CompiledCallExpr with correct structure
       *
       * Example: items.filter(...)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: { expr: 'lit', value: true },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        expr: string;
        target: { expr: string; name: string };
        method: string;
        args?: unknown[];
      };

      expect(callExpr.expr).toBe('call');
      expect(callExpr.target.expr).toBe('state');
      expect(callExpr.target.name).toBe('items');
      expect(callExpr.method).toBe('filter');
      expect(callExpr.args).toBeDefined();
      expect(callExpr.args?.length).toBe(1);
    });

    it('should transform target expression correctly', () => {
      /**
       * Given: A call expression with state expression as target
       * When: The AST is transformed
       * Then: Target should be a CompiledStateExpr
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'length',
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        target: { expr: string; name: string };
      };

      expect(callExpr.target.expr).toBe('state');
      expect(callExpr.target.name).toBe('items');
    });

    it('should transform args correctly', () => {
      /**
       * Given: A call expression with multiple args
       * When: The AST is transformed
       * Then: All args should be transformed to CompiledExpressions
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'slice',
        args: [
          { expr: 'lit', value: 0 },
          { expr: 'state', name: 'count' },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items', 'count'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{ expr: string }>;
      };

      expect(callExpr.args?.length).toBe(2);
      expect(callExpr.args?.[0]?.expr).toBe('lit');
      expect(callExpr.args?.[1]?.expr).toBe('state');
    });

    it('should handle call expression without args', () => {
      /**
       * Given: A call expression without args
       * When: The AST is transformed
       * Then: args should be undefined or empty
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'length',
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: unknown[];
      };

      expect(callExpr.args).toBeUndefined();
    });

    it('should handle call expression with empty args array', () => {
      /**
       * Given: A call expression with empty args array
       * When: The AST is transformed
       * Then: args should be undefined (optimized away)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'reverse',
        args: [],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: unknown[];
      };

      // Empty args should be omitted from output
      expect(callExpr.args).toBeUndefined();
    });
  });

  describe('call expression with complex targets', () => {
    it('should transform call with get expression target', () => {
      /**
       * Given: A call expression with get expression as target
       * When: The AST is transformed
       * Then: Target should be a CompiledGetExpr
       *
       * Example: state.data.values.filter(...)
       */
      const program = createProgramWithExpression(
        {
          expr: 'call',
          target: {
            expr: 'get',
            base: { expr: 'state', name: 'data' },
            path: 'values',
          },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'v',
              body: { expr: 'lit', value: true },
            },
          ],
        } as Expression,
        { data: { type: 'object', initial: { values: [] } } }
      );

      const context = createContext({ stateNames: ['data'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        target: { expr: string; base: { expr: string } };
      };

      expect(callExpr.target.expr).toBe('get');
      expect(callExpr.target.base.expr).toBe('state');
    });

    it('should transform chained call expressions', () => {
      /**
       * Given: Chained call expressions
       * When: The AST is transformed
       * Then: Both calls should be transformed correctly
       *
       * Example: items.filter(...).map(...)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: {
          expr: 'call',
          target: { expr: 'state', name: 'items' },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: { expr: 'lit', value: true },
            },
          ],
        },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: { expr: 'var', name: 'x' },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const outerCall = view.value as {
        expr: string;
        method: string;
        target: {
          expr: string;
          method: string;
        };
      };

      expect(outerCall.expr).toBe('call');
      expect(outerCall.method).toBe('map');
      expect(outerCall.target.expr).toBe('call');
      expect(outerCall.target.method).toBe('filter');
    });
  });
});

// ==================== CompiledLambdaExpr Transformation Tests ====================

describe('transformPass - CompiledLambdaExpr', () => {
  describe('basic lambda expression transformation', () => {
    it('should transform lambda expression to CompiledLambdaExpr', () => {
      /**
       * Given: A lambda expression with param and body
       * When: The AST is transformed
       * Then: It should produce a CompiledLambdaExpr with correct structure
       *
       * Example: (x) => x > 0
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{
          expr: string;
          param: string;
          body: { expr: string };
        }>;
      };

      const lambdaExpr = callExpr.args?.[0];
      expect(lambdaExpr?.expr).toBe('lambda');
      expect(lambdaExpr?.param).toBe('x');
      expect(lambdaExpr?.body.expr).toBe('bin');
    });

    it('should preserve param name in transformation', () => {
      /**
       * Given: A lambda expression with specific param name
       * When: The AST is transformed
       * Then: param should be preserved exactly
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: { expr: 'var', name: 'item' },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{ param: string }>;
      };

      expect(callExpr.args?.[0]?.param).toBe('item');
    });

    it('should preserve index when present', () => {
      /**
       * Given: A lambda expression with index parameter
       * When: The AST is transformed
       * Then: index should be preserved
       *
       * Example: (item, i) => i > 0
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            index: 'i',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'i' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{ param: string; index?: string }>;
      };

      expect(callExpr.args?.[0]?.param).toBe('item');
      expect(callExpr.args?.[0]?.index).toBe('i');
    });

    it('should not include index when not present', () => {
      /**
       * Given: A lambda expression without index parameter
       * When: The AST is transformed
       * Then: index should be undefined
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: { expr: 'var', name: 'x' },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{ index?: string }>;
      };

      expect(callExpr.args?.[0]?.index).toBeUndefined();
    });

    it('should transform body expression correctly', () => {
      /**
       * Given: A lambda expression with complex body
       * When: The AST is transformed
       * Then: body should be a valid CompiledExpression
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '&&',
              left: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 0 },
              },
              right: {
                expr: 'bin',
                op: '<',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'state', name: 'count' },
              },
            },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items', 'count'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{
          body: {
            expr: string;
            op: string;
            left: { expr: string };
            right: { expr: string };
          };
        }>;
      };

      const body = callExpr.args?.[0]?.body;
      expect(body?.expr).toBe('bin');
      expect(body?.op).toBe('&&');
      expect(body?.left.expr).toBe('bin');
      expect(body?.right.expr).toBe('bin');
    });
  });
});

// ==================== Nested Call/Lambda Transformation Tests ====================

describe('transformPass - nested call/lambda structures', () => {
  describe('call with lambda args', () => {
    it('should transform call with lambda containing state reference', () => {
      /**
       * Given: A call expression with lambda referencing state
       * When: The AST is transformed
       * Then: State reference in lambda body should be transformed
       *
       * Example: items.filter(x => x > count)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'state', name: 'count' },
            },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items', 'count'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{
          body: {
            right: { expr: string; name: string };
          };
        }>;
      };

      expect(callExpr.args?.[0]?.body.right.expr).toBe('state');
      expect(callExpr.args?.[0]?.body.right.name).toBe('count');
    });
  });

  describe('lambda body with call expression', () => {
    it('should transform lambda body containing call expression', () => {
      /**
       * Given: A lambda whose body is a call expression
       * When: The AST is transformed
       * Then: Nested call should be transformed correctly
       *
       * Example: items.map(item => item.values.filter(v => v > 0))
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'call',
              target: {
                expr: 'get',
                base: { expr: 'var', name: 'item' },
                path: 'values',
              },
              method: 'filter',
              args: [
                {
                  expr: 'lambda',
                  param: 'v',
                  body: {
                    expr: 'bin',
                    op: '>',
                    left: { expr: 'var', name: 'v' },
                    right: { expr: 'lit', value: 0 },
                  },
                },
              ],
            },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const outerCall = view.value as {
        expr: string;
        args?: Array<{
          expr: string;
          body: {
            expr: string;
            method: string;
            args?: Array<{ expr: string }>;
          };
        }>;
      };

      expect(outerCall.expr).toBe('call');
      expect(outerCall.args?.[0]?.expr).toBe('lambda');
      expect(outerCall.args?.[0]?.body.expr).toBe('call');
      expect(outerCall.args?.[0]?.body.method).toBe('filter');
      expect(outerCall.args?.[0]?.body.args?.[0]?.expr).toBe('lambda');
    });

    it('should transform deeply nested call/lambda chain', () => {
      /**
       * Given: A deeply nested call/lambda structure
       * When: The AST is transformed
       * Then: All levels should be transformed correctly
       *
       * Example: items.filter(x => x > 0).map(x => x * 2).reduce((a, b) => a + b, 0)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: {
          expr: 'call',
          target: {
            expr: 'call',
            target: { expr: 'state', name: 'items' },
            method: 'filter',
            args: [
              {
                expr: 'lambda',
                param: 'x',
                body: {
                  expr: 'bin',
                  op: '>',
                  left: { expr: 'var', name: 'x' },
                  right: { expr: 'lit', value: 0 },
                },
              },
            ],
          },
          method: 'map',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: {
                expr: 'bin',
                op: '*',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 2 },
              },
            },
          ],
        },
        method: 'reduce',
        args: [
          {
            expr: 'lambda',
            param: 'acc',
            index: 'curr',
            body: {
              expr: 'bin',
              op: '+',
              left: { expr: 'var', name: 'acc' },
              right: { expr: 'var', name: 'curr' },
            },
          },
          { expr: 'lit', value: 0 },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const reduceCall = view.value as {
        expr: string;
        method: string;
        target: {
          expr: string;
          method: string;
          target: {
            expr: string;
            method: string;
          };
        };
      };

      expect(reduceCall.expr).toBe('call');
      expect(reduceCall.method).toBe('reduce');
      expect(reduceCall.target.expr).toBe('call');
      expect(reduceCall.target.method).toBe('map');
      expect(reduceCall.target.target.expr).toBe('call');
      expect(reduceCall.target.target.method).toBe('filter');
    });
  });

  describe('real-world transformation scenarios', () => {
    it('should transform todos.filter(todo => todo.completed) pattern', () => {
      /**
       * Given: A common filter pattern with property access
       * When: The AST is transformed
       * Then: All expressions should be correctly transformed
       */
      const program = createProgramWithExpression(
        {
          expr: 'call',
          target: { expr: 'state', name: 'todos' },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'todo',
              body: {
                expr: 'get',
                base: { expr: 'var', name: 'todo' },
                path: 'completed',
              },
            },
          ],
        } as Expression,
        { todos: { type: 'list', initial: [] } }
      );

      const context = createContext({ stateNames: ['todos'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        expr: string;
        target: { expr: string; name: string };
        method: string;
        args?: Array<{
          expr: string;
          param: string;
          body: { expr: string; path: string };
        }>;
      };

      expect(callExpr.expr).toBe('call');
      expect(callExpr.target.name).toBe('todos');
      expect(callExpr.method).toBe('filter');
      expect(callExpr.args?.[0]?.body.expr).toBe('get');
      expect(callExpr.args?.[0]?.body.path).toBe('completed');
    });

    it('should transform array.map with conditional expression', () => {
      /**
       * Given: A map with conditional expression in lambda
       * When: The AST is transformed
       * Then: Conditional expression should be transformed
       *
       * Example: items.map(x => x > 0 ? x : 0)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'cond',
              if: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 0 },
              },
              then: { expr: 'var', name: 'x' },
              else: { expr: 'lit', value: 0 },
            },
          },
        ],
      } as Expression);

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { value: unknown };
      const callExpr = view.value as {
        args?: Array<{
          body: { expr: string };
        }>;
      };

      expect(callExpr.args?.[0]?.body.expr).toBe('cond');
    });
  });
});

// ==================== CompiledExpression Type Structure Tests ====================

describe('transformPass - CompiledCallExpr/CompiledLambdaExpr type structure', () => {
  it('should produce correct CompiledCallExpr structure', () => {
    /**
     * Verify the structure matches:
     * {
     *   expr: 'call';
     *   target: CompiledExpression;
     *   method: string;
     *   args?: CompiledExpression[];
     * }
     */
    const program = createProgramWithExpression({
      expr: 'call',
      target: { expr: 'state', name: 'items' },
      method: 'join',
      args: [{ expr: 'lit', value: ', ' }],
    } as Expression);

    const context = createContext({ stateNames: ['items'] });

    // Act
    const result = transformPass(program, context);

    // Assert
    const view = result.view as { value: unknown };
    const callExpr = view.value as Record<string, unknown>;

    // Verify required properties exist
    expect(callExpr).toHaveProperty('expr', 'call');
    expect(callExpr).toHaveProperty('target');
    expect(callExpr).toHaveProperty('method', 'join');
    expect(callExpr).toHaveProperty('args');
  });

  it('should produce correct CompiledLambdaExpr structure', () => {
    /**
     * Verify the structure matches:
     * {
     *   expr: 'lambda';
     *   param: string;
     *   index?: string;
     *   body: CompiledExpression;
     * }
     */
    const program = createProgramWithExpression({
      expr: 'call',
      target: { expr: 'state', name: 'items' },
      method: 'map',
      args: [
        {
          expr: 'lambda',
          param: 'item',
          index: 'idx',
          body: { expr: 'var', name: 'item' },
        },
      ],
    } as Expression);

    const context = createContext({ stateNames: ['items'] });

    // Act
    const result = transformPass(program, context);

    // Assert
    const view = result.view as { value: unknown };
    const callExpr = view.value as {
      args?: Array<Record<string, unknown>>;
    };
    const lambdaExpr = callExpr.args?.[0];

    // Verify required properties exist
    expect(lambdaExpr).toHaveProperty('expr', 'lambda');
    expect(lambdaExpr).toHaveProperty('param', 'item');
    expect(lambdaExpr).toHaveProperty('index', 'idx');
    expect(lambdaExpr).toHaveProperty('body');
  });
});
