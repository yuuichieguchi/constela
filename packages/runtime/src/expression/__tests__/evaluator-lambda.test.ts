/**
 * Test module for Lambda expression evaluation with array methods.
 *
 * Coverage:
 * - filter method: Filter array elements with lambda predicate
 * - map method: Transform array elements with lambda function
 * - find method: Find first matching element with lambda predicate
 * - findIndex method: Find index of first matching element
 * - some method: Check if any element matches predicate
 * - every method: Check if all elements match predicate
 * - Lambda with index parameter
 *
 * TDD Red Phase: These tests verify the runtime evaluation of array methods
 * with lambda expressions. The evaluator does not yet support lambda expressions,
 * so all tests are expected to FAIL.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, type EvaluationContext } from '../evaluator.js';
import type { CompiledExpression } from '@constela/compiler';

// ==================== Mock StateStore ====================

class MockStateStore {
  private state: Record<string, unknown>;

  constructor(initialState: Record<string, unknown> = {}) {
    this.state = initialState;
  }

  get(name: string): unknown {
    return this.state[name];
  }

  set(name: string, value: unknown): void {
    this.state[name] = value;
  }
}

// ==================== Test Suite ====================

describe('evaluate with Lambda expressions (Array higher-order methods)', () => {
  // ==================== Setup ====================

  let mockState: MockStateStore;
  let baseContext: EvaluationContext;

  beforeEach(() => {
    mockState = new MockStateStore({});
    baseContext = {
      state: mockState as EvaluationContext['state'],
      locals: {},
    };
  });

  // ==================== Helper Functions ====================

  /**
   * Creates an EvaluationContext with state and locals
   */
  function createContext(
    stateData: Record<string, unknown> = {},
    locals: Record<string, unknown> = {}
  ): EvaluationContext {
    mockState = new MockStateStore(stateData);
    return {
      state: mockState as EvaluationContext['state'],
      locals,
    };
  }

  // ==================== filter Method + Lambda ====================

  describe('filter method with lambda', () => {
    it('should filter elements matching predicate: [1,2,3,4,5].filter(x => x > 2) -> [3,4,5]', () => {
      /**
       * Given: An array [1,2,3,4,5] and a lambda predicate x > 2
       * When: filter is called with the lambda
       * Then: Returns [3,4,5]
       *
       * DSL:
       * {
       *   expr: 'call',
       *   target: { expr: 'lit', value: [1,2,3,4,5] },
       *   method: 'filter',
       *   args: [{
       *     expr: 'lambda',
       *     param: 'x',
       *     body: { expr: 'bin', op: '>', left: { expr: 'var', name: 'x' }, right: { expr: 'lit', value: 2 } }
       *   }]
       * }
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([3, 4, 5]);
    });

    it('should filter objects by property: todos.filter(todo => todo.completed)', () => {
      /**
       * Given: An array of todo objects in state
       * When: filter is called with lambda checking completed property
       * Then: Returns only completed todos
       */
      const expr = {
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
      } as CompiledExpression;
      const ctx = createContext({
        todos: [
          { id: 1, text: 'Learn TDD', completed: true },
          { id: 2, text: 'Write tests', completed: false },
          { id: 3, text: 'Implement', completed: true },
        ],
      });

      const result = evaluate(expr, ctx);

      expect(result).toEqual([
        { id: 1, text: 'Learn TDD', completed: true },
        { id: 3, text: 'Implement', completed: true },
      ]);
    });

    it('should return empty array when no elements match: [1,2,3].filter(x => x > 10) -> []', () => {
      /**
       * Given: An array [1,2,3] and a lambda predicate x > 10
       * When: filter is called with the lambda
       * Then: Returns empty array
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 10 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([]);
    });
  });

  // ==================== map Method + Lambda ====================

  describe('map method with lambda', () => {
    it('should transform each element: [1,2,3].map(x => x * 2) -> [2,4,6]', () => {
      /**
       * Given: An array [1,2,3] and a lambda that doubles each element
       * When: map is called with the lambda
       * Then: Returns [2,4,6]
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
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
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([2, 4, 6]);
    });

    it('should extract property from objects: users.map(user => user.name)', () => {
      /**
       * Given: An array of user objects in state
       * When: map is called with lambda extracting name property
       * Then: Returns array of names
       */
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'users' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'user',
            body: {
              expr: 'get',
              base: { expr: 'var', name: 'user' },
              path: 'name',
            },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ],
      });

      const result = evaluate(expr, ctx);

      expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should return empty array for empty input: [].map(x => x * 2) -> []', () => {
      /**
       * Given: An empty array
       * When: map is called
       * Then: Returns empty array
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [] },
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
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([]);
    });
  });

  // ==================== find Method + Lambda ====================

  describe('find method with lambda', () => {
    it('should return first matching element: [1,2,3,4,5].find(x => x > 2) -> 3', () => {
      /**
       * Given: An array [1,2,3,4,5] and a lambda predicate x > 2
       * When: find is called with the lambda
       * Then: Returns 3 (first element matching the predicate)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'find',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(3);
    });

    it('should find object by property: users.find(user => user.id === targetId)', () => {
      /**
       * Given: An array of user objects and a target ID in locals
       * When: find is called with lambda comparing id
       * Then: Returns the matching user object
       */
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'users' },
        method: 'find',
        args: [
          {
            expr: 'lambda',
            param: 'user',
            body: {
              expr: 'bin',
              op: '==',
              left: {
                expr: 'get',
                base: { expr: 'var', name: 'user' },
                path: 'id',
              },
              right: { expr: 'var', name: 'targetId' },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext(
        {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Charlie' },
          ],
        },
        { targetId: 2 }
      );

      const result = evaluate(expr, ctx);

      expect(result).toEqual({ id: 2, name: 'Bob' });
    });

    it('should return undefined when no match: [1,2,3].find(x => x > 10) -> undefined', () => {
      /**
       * Given: An array [1,2,3] and a predicate that matches nothing
       * When: find is called
       * Then: Returns undefined
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'find',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 10 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBeUndefined();
    });
  });

  // ==================== findIndex Method + Lambda ====================

  describe('findIndex method with lambda', () => {
    it('should return index of first matching element: [1,2,3,4,5].findIndex(x => x > 2) -> 2', () => {
      /**
       * Given: An array [1,2,3,4,5] and a lambda predicate x > 2
       * When: findIndex is called with the lambda
       * Then: Returns 2 (index of first element > 2, which is 3)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'findIndex',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(2);
    });

    it('should return -1 when no match: [1,2,3].findIndex(x => x > 10) -> -1', () => {
      /**
       * Given: An array [1,2,3] and a predicate that matches nothing
       * When: findIndex is called
       * Then: Returns -1
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'findIndex',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 10 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(-1);
    });
  });

  // ==================== some Method + Lambda ====================

  describe('some method with lambda', () => {
    it('should return true when at least one element matches: [1,2,3].some(x => x > 2) -> true', () => {
      /**
       * Given: An array [1,2,3] and a lambda predicate x > 2
       * When: some is called with the lambda
       * Then: Returns true (3 > 2)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'some',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(true);
    });

    it('should return false when no elements match: [1,2,3].some(x => x > 10) -> false', () => {
      /**
       * Given: An array [1,2,3] and a predicate that matches nothing
       * When: some is called
       * Then: Returns false
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'some',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 10 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(false);
    });

    it('should return false for empty array: [].some(x => x > 0) -> false', () => {
      /**
       * Given: An empty array
       * When: some is called
       * Then: Returns false (vacuous truth - no elements to satisfy)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [] },
        method: 'some',
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
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(false);
    });
  });

  // ==================== every Method + Lambda ====================

  describe('every method with lambda', () => {
    it('should return true when all elements match: [1,2,3].every(x => x > 0) -> true', () => {
      /**
       * Given: An array [1,2,3] and a lambda predicate x > 0
       * When: every is called with the lambda
       * Then: Returns true (all elements > 0)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'every',
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
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(true);
    });

    it('should return false when not all elements match: [1,2,3].every(x => x > 1) -> false', () => {
      /**
       * Given: An array [1,2,3] and a lambda predicate x > 1
       * When: every is called
       * Then: Returns false (1 is not > 1)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'every',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 1 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(false);
    });

    it('should return true for empty array: [].every(x => x > 10) -> true', () => {
      /**
       * Given: An empty array
       * When: every is called
       * Then: Returns true (vacuous truth - no elements to falsify)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [] },
        method: 'every',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 10 },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBe(true);
    });
  });

  // ==================== Lambda with Index Parameter ====================

  describe('lambda with index parameter', () => {
    it('should provide index to map callback: ["a","b","c"].map((item, i) => i) -> [0,1,2]', () => {
      /**
       * Given: An array ["a","b","c"] and a lambda that returns the index
       * When: map is called with lambda using index parameter
       * Then: Returns [0,1,2]
       *
       * DSL:
       * {
       *   expr: 'call',
       *   target: { expr: 'lit', value: ["a", "b", "c"] },
       *   method: 'map',
       *   args: [{
       *     expr: 'lambda',
       *     param: 'item',
       *     index: 'i',
       *     body: { expr: 'var', name: 'i' }
       *   }]
       * }
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: ['a', 'b', 'c'] },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            index: 'i',
            body: { expr: 'var', name: 'i' },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([0, 1, 2]);
    });

    it('should provide index to filter callback: ["a","b","c"].filter((item, i) => i > 0) -> ["b","c"]', () => {
      /**
       * Given: An array ["a","b","c"] and a lambda that filters by index
       * When: filter is called with lambda using index parameter
       * Then: Returns ["b","c"] (indices 1 and 2)
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: ['a', 'b', 'c'] },
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
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual(['b', 'c']);
    });

    it('should use both item and index in expression: arr.map((x, i) => x + i)', () => {
      /**
       * Given: An array [10, 20, 30] and a lambda that adds item and index
       * When: map is called
       * Then: Returns [10+0, 20+1, 30+2] = [10, 21, 32]
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [10, 20, 30] },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            index: 'i',
            body: {
              expr: 'bin',
              op: '+',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'var', name: 'i' },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([10, 21, 32]);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle nested property access in lambda: users.filter(u => u.address.city === "Tokyo")', () => {
      /**
       * Given: An array of users with nested address objects
       * When: filter is called with lambda accessing nested property
       * Then: Returns users in Tokyo
       */
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'users' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'u',
            body: {
              expr: 'bin',
              op: '==',
              left: {
                expr: 'get',
                base: { expr: 'var', name: 'u' },
                path: 'address.city',
              },
              right: { expr: 'lit', value: 'Tokyo' },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({
        users: [
          { name: 'Alice', address: { city: 'Tokyo' } },
          { name: 'Bob', address: { city: 'Osaka' } },
          { name: 'Charlie', address: { city: 'Tokyo' } },
        ],
      });

      const result = evaluate(expr, ctx);

      expect(result).toEqual([
        { name: 'Alice', address: { city: 'Tokyo' } },
        { name: 'Charlie', address: { city: 'Tokyo' } },
      ]);
    });

    it('should handle chained method calls: items.filter(...).map(...)', () => {
      /**
       * Given: An array [1,2,3,4,5]
       * When: filter(x => x > 2) then map(x => x * 2)
       * Then: Returns [6, 8, 10] (filter to [3,4,5] then double)
       */
      const expr = {
        expr: 'call',
        target: {
          expr: 'call',
          target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 2 },
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
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual([6, 8, 10]);
    });

    it('should handle conditional in lambda body: items.map(x => x > 0 ? "positive" : "negative")', () => {
      /**
       * Given: An array [-1, 0, 1, 2]
       * When: map is called with conditional lambda
       * Then: Returns ["negative", "negative", "positive", "positive"]
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [-1, 0, 1, 2] },
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
              then: { expr: 'lit', value: 'positive' },
              else: { expr: 'lit', value: 'negative' },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toEqual(['negative', 'negative', 'positive', 'positive']);
    });

    it('should handle lambda accessing outer scope: items.filter(x => x > threshold)', () => {
      /**
       * Given: An array [1,2,3,4,5] and a threshold variable
       * When: filter is called with lambda referencing outer variable
       * Then: Returns elements greater than threshold
       */
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'var', name: 'threshold' },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, { threshold: 3 });

      const result = evaluate(expr, ctx);

      expect(result).toEqual([4, 5]);
    });

    it('should handle lambda accessing state: items.filter(item => item.category === state.selectedCategory)', () => {
      /**
       * Given: An array of items and a selectedCategory in state
       * When: filter is called with lambda referencing state
       * Then: Returns items matching the category
       */
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '==',
              left: {
                expr: 'get',
                base: { expr: 'var', name: 'item' },
                path: 'category',
              },
              right: { expr: 'state', name: 'selectedCategory' },
            },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({
        items: [
          { name: 'Apple', category: 'fruit' },
          { name: 'Carrot', category: 'vegetable' },
          { name: 'Banana', category: 'fruit' },
        ],
        selectedCategory: 'fruit',
      });

      const result = evaluate(expr, ctx);

      expect(result).toEqual([
        { name: 'Apple', category: 'fruit' },
        { name: 'Banana', category: 'fruit' },
      ]);
    });
  });

  // ==================== Error Cases ====================

  describe('error cases', () => {
    it('should return undefined when target is null', () => {
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: null },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: { expr: 'lit', value: true },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBeUndefined();
    });

    it('should return undefined when calling lambda method on non-array', () => {
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'not an array' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: { expr: 'lit', value: true },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      const result = evaluate(expr, ctx);

      expect(result).toBeUndefined();
    });
  });
});
