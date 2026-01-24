/**
 * Test module for Array Expression evaluation.
 *
 * Coverage:
 * - Empty array evaluation
 * - Literal array evaluation
 * - Array with state values
 * - Array with function call results
 * - CodeMirror extensions pattern
 *
 * TDD Red Phase: These tests verify the runtime evaluation of array expressions.
 * The evaluator does not yet support 'array' expressions, so all tests are expected to FAIL.
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

describe('evaluate with Array expressions', () => {
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

  // ==================== Empty Array ====================

  describe('empty array', () => {
    it('should evaluate empty array expression to empty array', () => {
      // Arrange
      // DSL: []
      const expr = {
        expr: 'array',
        elements: [],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==================== Literal Array ====================

  describe('literal array', () => {
    it('should evaluate array with literal numbers', () => {
      // Arrange
      // DSL: [1, 2, 3]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 2 },
          { expr: 'lit', value: 3 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([1, 2, 3]);
    });

    it('should evaluate array with literal strings', () => {
      // Arrange
      // DSL: ["a", "b", "c"]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'lit', value: 'a' },
          { expr: 'lit', value: 'b' },
          { expr: 'lit', value: 'c' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should evaluate array with mixed literal types', () => {
      // Arrange
      // DSL: [1, "hello", true, null]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 'hello' },
          { expr: 'lit', value: true },
          { expr: 'lit', value: null },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([1, 'hello', true, null]);
    });
  });

  // ==================== State Values ====================

  describe('array with state values', () => {
    it('should evaluate array containing state reference', () => {
      // Arrange
      // DSL: [state.count, 10]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'state', name: 'count' },
          { expr: 'lit', value: 10 },
        ],
      } as CompiledExpression;
      const ctx = createContext({ count: 5 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([5, 10]);
    });

    it('should evaluate array containing state array', () => {
      // Arrange
      // DSL: [state.items, state.items]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'state', name: 'items' },
          { expr: 'state', name: 'items' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ items: [1, 2, 3] });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([[1, 2, 3], [1, 2, 3]]);
    });
  });

  // ==================== Variable References ====================

  describe('array with variable references', () => {
    it('should evaluate array containing variable reference', () => {
      // Arrange
      // DSL: [basicSetup, myExtension]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'var', name: 'basicSetup' },
          { expr: 'var', name: 'myExtension' },
        ],
      } as CompiledExpression;
      const basicSetupObj = { id: 'basicSetup' };
      const myExtensionObj = { id: 'myExtension' };
      const ctx = createContext({}, {
        basicSetup: basicSetupObj,
        myExtension: myExtensionObj,
      });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([basicSetupObj, myExtensionObj]);
    });
  });

  // ==================== CodeMirror Pattern ====================

  describe('CodeMirror extensions pattern', () => {
    it('should evaluate array with variable and call result (CodeMirror pattern)', () => {
      /**
       * This test represents the CodeMirror extensions pattern:
       * extensions: [basicSetup, json()]
       *
       * Where basicSetup is a variable and json() is a function call.
       */
      // Arrange
      // DSL: [basicSetup, json()]
      const basicSetupObj = { extension: 'basicSetup' };
      const jsonExtension = { extension: 'json' };

      // For this test, we simulate the json function being a callable
      // In actual implementation, call expressions handle this
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'var', name: 'basicSetup' },
          // Note: In real scenario, this would be a call expr result
          // For simplicity, we use a literal representing the result
          { expr: 'lit', value: jsonExtension },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, { basicSetup: basicSetupObj });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([basicSetupObj, jsonExtension]);
    });
  });

  // ==================== Nested Arrays ====================

  describe('nested arrays', () => {
    it('should evaluate nested array expressions', () => {
      // Arrange
      // DSL: [[1, 2], [3, 4]]
      const expr = {
        expr: 'array',
        elements: [
          {
            expr: 'array',
            elements: [
              { expr: 'lit', value: 1 },
              { expr: 'lit', value: 2 },
            ],
          },
          {
            expr: 'array',
            elements: [
              { expr: 'lit', value: 3 },
              { expr: 'lit', value: 4 },
            ],
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    it('should evaluate deeply nested array expressions', () => {
      // Arrange
      // DSL: [[[1]]]
      const expr = {
        expr: 'array',
        elements: [
          {
            expr: 'array',
            elements: [
              {
                expr: 'array',
                elements: [
                  { expr: 'lit', value: 1 },
                ],
              },
            ],
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([[[1]]]);
    });
  });

  // ==================== Complex Expressions ====================

  describe('complex expressions in array', () => {
    it('should evaluate array with conditional expression', () => {
      // Arrange
      // DSL: [condition ? "yes" : "no", value]
      const expr = {
        expr: 'array',
        elements: [
          {
            expr: 'cond',
            if: { expr: 'lit', value: true },
            then: { expr: 'lit', value: 'yes' },
            else: { expr: 'lit', value: 'no' },
          },
          { expr: 'lit', value: 'value' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['yes', 'value']);
    });

    it('should evaluate array with binary expression', () => {
      // Arrange
      // DSL: [1 + 2, 3 * 4]
      const expr = {
        expr: 'array',
        elements: [
          {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 1 },
            right: { expr: 'lit', value: 2 },
          },
          {
            expr: 'bin',
            op: '*',
            left: { expr: 'lit', value: 3 },
            right: { expr: 'lit', value: 4 },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([3, 12]);
    });

    it('should evaluate array with get expression', () => {
      // Arrange
      // DSL: [obj.a, obj.b]
      const expr = {
        expr: 'array',
        elements: [
          {
            expr: 'get',
            base: { expr: 'var', name: 'obj' },
            path: 'a',
          },
          {
            expr: 'get',
            base: { expr: 'var', name: 'obj' },
            path: 'b',
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, { obj: { a: 10, b: 20 } });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([10, 20]);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle undefined variable in array', () => {
      // Arrange
      // DSL: [undefined_var, 1]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'var', name: 'undefined_var' },
          { expr: 'lit', value: 1 },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, {});

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([undefined, 1]);
    });

    it('should handle undefined state in array', () => {
      // Arrange
      // DSL: [state.nonexistent, 1]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'state', name: 'nonexistent' },
          { expr: 'lit', value: 1 },
        ],
      } as CompiledExpression;
      const ctx = createContext({});

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([undefined, 1]);
    });

    it('should handle single element array', () => {
      // Arrange
      // DSL: [42]
      const expr = {
        expr: 'array',
        elements: [
          { expr: 'lit', value: 42 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual([42]);
    });
  });
});
