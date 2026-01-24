/**
 * Test module for Call Expression evaluation (Array methods).
 *
 * Coverage:
 * - length method: Get array length
 * - at method: Get element at index (positive/negative/out-of-range)
 * - includes method: Check if element exists
 * - slice method: Get subarray
 * - State array method calls
 * - Error cases (null/undefined target)
 *
 * TDD Red Phase: These tests verify the runtime evaluation of call expressions
 * for array methods. The evaluator does not yet support 'call' expressions,
 * so all tests are expected to FAIL.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, type EvaluationContext } from '../evaluator.js';
import type { CompiledExpression } from '@constela/compiler';

// Mock StateStore for testing
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

describe('evaluate with Call expressions (Array methods)', () => {
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

  // ==================== length Method ====================

  describe('length method', () => {
    it('should return array length', () => {
      // Arrange
      // DSL: [1, 2, 3].length()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(3);
    });

    it('should return 0 for empty array', () => {
      // Arrange
      // DSL: [].length()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [] },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(0);
    });
  });

  // ==================== at Method ====================

  describe('at method', () => {
    it('should return element at positive index 0', () => {
      // Arrange
      // DSL: [1, 2, 3].at(0)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'at',
        args: [{ expr: 'lit', value: 0 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(1);
    });

    it('should return element at positive index 2', () => {
      // Arrange
      // DSL: [1, 2, 3].at(2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'at',
        args: [{ expr: 'lit', value: 2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(3);
    });

    it('should return element at negative index -1', () => {
      // Arrange
      // DSL: [1, 2, 3].at(-1)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'at',
        args: [{ expr: 'lit', value: -1 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(3);
    });

    it('should return undefined for out-of-range index', () => {
      // Arrange
      // DSL: [1, 2, 3].at(5)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'at',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==================== includes Method ====================

  describe('includes method', () => {
    it('should return true when element exists', () => {
      // Arrange
      // DSL: [1, 2, 3].includes(2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'includes',
        args: [{ expr: 'lit', value: 2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when element does not exist', () => {
      // Arrange
      // DSL: [1, 2, 3].includes(5)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'includes',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(false);
    });

    it('should work with string array', () => {
      // Arrange
      // DSL: ["a", "b"].includes("a")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: ['a', 'b'] },
        method: 'includes',
        args: [{ expr: 'lit', value: 'a' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== slice Method ====================

  describe('slice method', () => {
    it('should return subarray with start only', () => {
      // Arrange
      // DSL: [1, 2, 3, 4, 5].slice(2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'slice',
        args: [{ expr: 'lit', value: 2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([3, 4, 5]);
    });

    it('should return subarray with start and end', () => {
      // Arrange
      // DSL: [1, 2, 3, 4, 5].slice(1, 3)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'slice',
        args: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 3 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([2, 3]);
    });

    it('should handle negative index', () => {
      // Arrange
      // DSL: [1, 2, 3, 4, 5].slice(-2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        method: 'slice',
        args: [{ expr: 'lit', value: -2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([4, 5]);
    });

    it('should return copy of array with no arguments', () => {
      // Arrange
      // DSL: [1, 2, 3].slice()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'slice',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // ==================== State Array Method Calls ====================

  describe('state array method calls', () => {
    it('should call length on state array', () => {
      // Arrange
      // DSL: state.items.length()
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'length',
      } as CompiledExpression;
      const ctx = createContext({ items: [10, 20, 30, 40] });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(4);
    });

    it('should call at on state array', () => {
      // Arrange
      // DSL: state.items.at(0)
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'at',
        args: [{ expr: 'lit', value: 0 }],
      } as CompiledExpression;
      const ctx = createContext({ items: ['first', 'second', 'third'] });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('first');
    });

    it('should call includes on state array', () => {
      // Arrange
      // DSL: state.items.includes(value)
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'includes',
        args: [{ expr: 'var', name: 'searchValue' }],
      } as CompiledExpression;
      const ctx = createContext(
        { items: ['apple', 'banana', 'cherry'] },
        { searchValue: 'banana' }
      );

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('should call slice on state array', () => {
      // Arrange
      // DSL: state.items.slice(1, 3)
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'slice',
        args: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 3 },
        ],
      } as CompiledExpression;
      const ctx = createContext({ items: [100, 200, 300, 400, 500] });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([200, 300]);
    });
  });

  // ==================== Error Cases ====================

  describe('error cases', () => {
    it('should return undefined when target is null', () => {
      // Arrange
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: null },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when target is undefined state', () => {
      // Arrange
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'nonexistent' },
        method: 'length',
      } as CompiledExpression;
      const ctx = createContext({});

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when method does not exist on array', () => {
      // Arrange
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'nonexistentMethod',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle nested array access with at', () => {
      // Arrange
      // DSL: state.matrix.at(0) -> first row
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'matrix' },
        method: 'at',
        args: [{ expr: 'lit', value: 0 }],
      } as CompiledExpression;
      const ctx = createContext({
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle chained method with variable index', () => {
      // Arrange
      // DSL: items.at(idx) where idx comes from var
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'items' },
        method: 'at',
        args: [{ expr: 'var', name: 'idx' }],
      } as CompiledExpression;
      const ctx = createContext({}, { items: ['a', 'b', 'c'], idx: 1 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('b');
    });

    it('should handle includes with object reference (strict equality)', () => {
      // Arrange
      // Note: includes uses strict equality, so object references matter
      const sharedObj = { id: 1 };
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'items' },
        method: 'includes',
        args: [{ expr: 'var', name: 'searchItem' }],
      } as CompiledExpression;
      const ctx = createContext({}, { items: [sharedObj, { id: 2 }], searchItem: sharedObj });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle empty args array', () => {
      // Arrange
      // slice() with empty args array
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: [1, 2, 3] },
        method: 'slice',
        args: [],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
