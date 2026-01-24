/**
 * Test module for Call and Lambda Expression semantic analysis.
 *
 * Coverage:
 * - call expression target validation (state references)
 * - call expression args validation
 * - lambda expression param scope
 * - lambda expression index scope
 * - lambda expression body validation
 * - Nested call/lambda scope management
 *
 * TDD Red Phase: These tests verify the semantic analysis of call and lambda expressions.
 * Expected: All tests should FAIL initially because:
 * - validateExpression does not handle 'call' and 'lambda' expression types
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program, Expression } from '@constela/core';

// ==================== Helper Functions ====================

/**
 * Creates a minimal Program for testing call/lambda analysis
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

/**
 * Creates a Program with expression in each node body
 */
function createProgramWithEachExpression(
  items: Expression,
  bodyExpression: Expression
): Program {
  return {
    version: '1.0',
    state: {
      items: { type: 'list', initial: [1, 2, 3] },
      todos: { type: 'list', initial: [] },
    },
    actions: [],
    view: {
      kind: 'each',
      items,
      as: 'item',
      body: {
        kind: 'text',
        value: bodyExpression,
      },
    },
  } as unknown as Program;
}

// ==================== Call Expression Semantic Analysis ====================

describe('analyzePass with Call expressions', () => {
  // ==================== Call Target Validation ====================

  describe('call expression target validation', () => {
    it('should accept call expression with valid state reference as target', () => {
      /**
       * Given: A call expression targeting a defined state
       * When: The AST is analyzed
       * Then: Analysis should succeed
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
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should reject call expression with undefined state reference as target', () => {
      /**
       * Given: A call expression targeting an undefined state
       * When: The AST is analyzed
       * Then: Analysis should fail with UNDEFINED_STATE error
       *
       * Example: unknownState.filter(...)
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'unknownState' },
        method: 'filter',
        args: [],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        expect(result.errors[0]?.path).toContain('/view/value/target');
      }
    });

    it('should validate nested call targets correctly', () => {
      /**
       * Given: A chained call expression with valid state
       * When: The AST is analyzed
       * Then: Analysis should succeed for all nested targets
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

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Call Args Validation ====================

  describe('call expression args validation', () => {
    it('should validate expressions in call args', () => {
      /**
       * Given: A call expression with state reference in args
       * When: The AST is analyzed
       * Then: State references in args should be validated
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

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should reject undefined state in call args', () => {
      /**
       * Given: A call expression with undefined state in args
       * When: The AST is analyzed
       * Then: Analysis should fail with UNDEFINED_STATE error
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'slice',
        args: [
          { expr: 'lit', value: 0 },
          { expr: 'state', name: 'undefinedCount' },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        expect(result.errors[0]?.path).toContain('/view/value/args/1');
      }
    });

    it('should validate lambda expressions in call args', () => {
      /**
       * Given: A call expression with lambda in args referencing state
       * When: The AST is analyzed
       * Then: Lambda body should be validated for state references
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

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Lambda Expression Semantic Analysis ====================

describe('analyzePass with Lambda expressions', () => {
  // ==================== Lambda Param Scope ====================

  describe('lambda param scope', () => {
    it('should allow referencing param variable in lambda body', () => {
      /**
       * Given: A lambda expression with param used in body
       * When: The AST is analyzed
       * Then: Param reference should be valid
       *
       * Example: (item) => item > 0
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'item' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should reject undefined variable in lambda body', () => {
      /**
       * Given: A lambda expression referencing undefined variable
       * When: The AST is analyzed
       * Then: Analysis should fail with UNDEFINED_VAR error
       *
       * Example: (item) => unknownVar > 0
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'unknownVar' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('VAR_UNDEFINED');
        expect(result.errors[0]?.path).toContain('/view/value/args/0/body');
      }
    });
  });

  // ==================== Lambda Index Scope ====================

  describe('lambda index scope', () => {
    it('should allow referencing index variable when defined', () => {
      /**
       * Given: A lambda expression with index parameter
       * When: The AST is analyzed
       * Then: Index reference should be valid
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

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should allow using both param and index in lambda body', () => {
      /**
       * Given: A lambda expression using both param and index
       * When: The AST is analyzed
       * Then: Both references should be valid
       *
       * Example: (item, i) => item > i
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
              left: { expr: 'var', name: 'item' },
              right: { expr: 'var', name: 'i' },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Lambda Body State References ====================

  describe('lambda body state references', () => {
    it('should allow referencing state in lambda body', () => {
      /**
       * Given: A lambda expression referencing state in body
       * When: The AST is analyzed
       * Then: State reference should be valid
       *
       * Example: (item) => item > state.count
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'item' },
              right: { expr: 'state', name: 'count' },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should reject undefined state in lambda body', () => {
      /**
       * Given: A lambda expression referencing undefined state
       * When: The AST is analyzed
       * Then: Analysis should fail with UNDEFINED_STATE error
       *
       * Example: (item) => item > state.undefinedState
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'item' },
              right: { expr: 'state', name: 'undefinedState' },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        expect(result.errors[0]?.path).toContain('/view/value/args/0/body');
      }
    });
  });
});

// ==================== Nested Call/Lambda Scope Management ====================

describe('analyzePass with nested call/lambda structures', () => {
  // ==================== Real-world Patterns ====================

  describe('real-world patterns', () => {
    it('should validate todos.filter(lambda: todo => todo.completed) pattern', () => {
      /**
       * Given: A common filter pattern with object property access
       * When: The AST is analyzed
       * Then: Analysis should succeed
       *
       * Example: todos.filter(todo => todo.completed)
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

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should validate chained filter.map pattern', () => {
      /**
       * Given: Chained array methods with lambdas
       * When: The AST is analyzed
       * Then: All lambda scopes should be correctly managed
       *
       * Example: items.filter(x => x > 0).map(x => x * 2)
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
            param: 'y',
            body: {
              expr: 'bin',
              op: '*',
              left: { expr: 'var', name: 'y' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should isolate lambda scopes in chained calls', () => {
      /**
       * Given: Chained calls where inner lambda param should not leak
       * When: The AST is analyzed
       * Then: Outer lambda should not see inner lambda's params
       *
       * Example: items.map(x => ...).filter(y => x) - x should be undefined in filter
       */
      const program = createProgramWithExpression({
        expr: 'call',
        target: {
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
        },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'y',
            // Trying to reference 'x' from previous lambda - should fail
            body: { expr: 'var', name: 'x' },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('VAR_UNDEFINED');
      }
    });
  });

  // ==================== Nested Lambda in Lambda ====================

  describe('nested lambda structures', () => {
    it('should validate lambda containing call with nested lambda', () => {
      /**
       * Given: A lambda whose body contains another call with lambda
       * When: The AST is analyzed
       * Then: Inner lambda should have access to its own params only
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

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should allow inner lambda to access outer lambda param', () => {
      /**
       * Given: A nested lambda referencing outer lambda's param
       * When: The AST is analyzed
       * Then: Inner lambda should have access to outer param
       *
       * Example: items.map(item => item.values.filter(v => v > item.min))
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
                    right: {
                      expr: 'get',
                      base: { expr: 'var', name: 'item' },
                      path: 'min',
                    },
                  },
                },
              ],
            },
          },
        ],
      } as Expression);

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Call/Lambda in Each Loop ====================

  describe('call/lambda combined with each loop', () => {
    it('should validate call expression in each items', () => {
      /**
       * Given: An each node with call expression as items source
       * When: The AST is analyzed
       * Then: Both call and each scopes should work correctly
       *
       * Example: each items.filter(x => x > 0) as item
       */
      const program = createProgramWithEachExpression(
        {
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
        } as Expression,
        { expr: 'var', name: 'item' } as Expression
      );

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should allow lambda to access each loop variable', () => {
      /**
       * Given: A lambda inside each loop body accessing each variable
       * When: The AST is analyzed
       * Then: Lambda should have access to each loop variable
       *
       * Example: each items as item { item.values.filter(v => v > 0) }
       */
      const program: Program = {
        version: '1.0',
        state: {
          items: { type: 'list', initial: [] },
        },
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'text',
            value: {
              expr: 'call',
              target: {
                expr: 'get',
                base: { expr: 'var', name: 'item' },
                path: 'values',
              },
              method: 'join',
              args: [{ expr: 'lit', value: ', ' }],
            },
          },
        },
      } as unknown as Program;

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Error Path Validation ====================

describe('analyzePass error paths for call/lambda', () => {
  it('should provide correct path for undefined state in nested call target', () => {
    /**
     * Given: Undefined state in nested call target
     * When: The AST is analyzed
     * Then: Error path should point to exact location
     */
    const program = createProgramWithExpression({
      expr: 'call',
      target: {
        expr: 'call',
        target: { expr: 'state', name: 'unknownState' },
        method: 'filter',
        args: [],
      },
      method: 'map',
      args: [],
    } as Expression);

    const result = analyzePass(program);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      expect(result.errors[0]?.path).toContain('/view/value/target/target');
    }
  });

  it('should provide correct path for undefined var in lambda body', () => {
    /**
     * Given: Undefined variable in lambda body
     * When: The AST is analyzed
     * Then: Error path should point to lambda body location
     */
    const program = createProgramWithExpression({
      expr: 'call',
      target: { expr: 'state', name: 'items' },
      method: 'filter',
      args: [
        {
          expr: 'lambda',
          param: 'item',
          body: { expr: 'var', name: 'undefinedVar' },
        },
      ],
    } as Expression);

    const result = analyzePass(program);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('VAR_UNDEFINED');
      expect(result.errors[0]?.path).toContain('/view/value/args/0/body');
    }
  });
});
