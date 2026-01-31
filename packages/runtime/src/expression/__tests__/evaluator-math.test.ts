/**
 * Test module for Math and Date method evaluation.
 *
 * Coverage:
 * - Math.min: Get minimum value from arguments
 * - Math.max: Get maximum value from arguments
 * - Math.round: Round to nearest integer
 * - Math.floor: Round down to integer
 * - Math.ceil: Round up to integer
 * - Math.abs: Get absolute value
 * - Date.now: Get current timestamp in milliseconds
 * - Date instance toISOString: Convert to ISO format string
 *
 * TDD Red Phase: These tests verify the runtime evaluation of call expressions
 * for Math and Date methods. The evaluator does not yet support calling
 * methods on global objects (Math, Date), so all tests are expected to FAIL.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

describe('evaluate with Math and Date methods', () => {
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

  // ==================== Math.min Method ====================

  describe('Math.min method', () => {
    it('should return minimum value from multiple arguments', () => {
      // Arrange
      // DSL: Math.min(3, 1, 2) -> 1
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'min',
        args: [
          { expr: 'lit', value: 3 },
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(1);
    });

    it('should return the value itself for single argument', () => {
      // Arrange
      // DSL: Math.min(5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'min',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should return minimum value from negative numbers', () => {
      // Arrange
      // DSL: Math.min(-1, -5, -2) -> -5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'min',
        args: [
          { expr: 'lit', value: -1 },
          { expr: 'lit', value: -5 },
          { expr: 'lit', value: -2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(-5);
    });

    it('should work with state values', () => {
      // Arrange
      // DSL: Math.min(state.a, state.b) -> minimum of a and b
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'min',
        args: [
          { expr: 'state', name: 'a' },
          { expr: 'state', name: 'b' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ a: 10, b: 5 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });
  });

  // ==================== Math.max Method ====================

  describe('Math.max method', () => {
    it('should return maximum value from multiple arguments', () => {
      // Arrange
      // DSL: Math.max(3, 1, 2) -> 3
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'max',
        args: [
          { expr: 'lit', value: 3 },
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(3);
    });

    it('should return the value itself for single argument', () => {
      // Arrange
      // DSL: Math.max(5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'max',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should return maximum value from negative numbers', () => {
      // Arrange
      // DSL: Math.max(-1, -5, -2) -> -1
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'max',
        args: [
          { expr: 'lit', value: -1 },
          { expr: 'lit', value: -5 },
          { expr: 'lit', value: -2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(-1);
    });

    it('should work with state and literal mixed', () => {
      // Arrange
      // DSL: Math.max(10, state.count) -> maximum of 10 and count
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'max',
        args: [
          { expr: 'lit', value: 10 },
          { expr: 'state', name: 'count' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ count: 25 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(25);
    });
  });

  // ==================== Math.round Method ====================

  describe('Math.round method', () => {
    it('should round 4.5 to 5', () => {
      // Arrange
      // DSL: Math.round(4.5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'round',
        args: [{ expr: 'lit', value: 4.5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should round 4.4 to 4', () => {
      // Arrange
      // DSL: Math.round(4.4) -> 4
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'round',
        args: [{ expr: 'lit', value: 4.4 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(4);
    });

    it('should round negative numbers correctly', () => {
      // Arrange
      // DSL: Math.round(-4.5) -> -4 (JavaScript rounds half towards positive infinity)
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'round',
        args: [{ expr: 'lit', value: -4.5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(-4);
    });
  });

  // ==================== Math.floor Method ====================

  describe('Math.floor method', () => {
    it('should floor 4.9 to 4', () => {
      // Arrange
      // DSL: Math.floor(4.9) -> 4
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'floor',
        args: [{ expr: 'lit', value: 4.9 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(4);
    });

    it('should floor negative number -4.1 to -5', () => {
      // Arrange
      // DSL: Math.floor(-4.1) -> -5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'floor',
        args: [{ expr: 'lit', value: -4.1 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(-5);
    });

    it('should return same value for integer input', () => {
      // Arrange
      // DSL: Math.floor(5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'floor',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });
  });

  // ==================== Math.ceil Method ====================

  describe('Math.ceil method', () => {
    it('should ceil 4.1 to 5', () => {
      // Arrange
      // DSL: Math.ceil(4.1) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'ceil',
        args: [{ expr: 'lit', value: 4.1 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should ceil negative number -4.9 to -4', () => {
      // Arrange
      // DSL: Math.ceil(-4.9) -> -4
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'ceil',
        args: [{ expr: 'lit', value: -4.9 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(-4);
    });

    it('should return same value for integer input', () => {
      // Arrange
      // DSL: Math.ceil(5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'ceil',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });
  });

  // ==================== Math.abs Method ====================

  describe('Math.abs method', () => {
    it('should return absolute value of negative number', () => {
      // Arrange
      // DSL: Math.abs(-5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'abs',
        args: [{ expr: 'lit', value: -5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should return same value for positive number', () => {
      // Arrange
      // DSL: Math.abs(5) -> 5
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'abs',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should return 0 for zero', () => {
      // Arrange
      // DSL: Math.abs(0) -> 0
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'abs',
        args: [{ expr: 'lit', value: 0 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(0);
    });
  });

  // ==================== Date.now Static Method ====================

  describe('Date.now static method', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current timestamp in milliseconds', () => {
      // Arrange
      const fixedTime = 1706000000000; // 2024-01-23T10:13:20.000Z
      vi.setSystemTime(fixedTime);

      // DSL: Date.now() -> current timestamp
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Date' },
        method: 'now',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(fixedTime);
    });

    it('should return a number type', () => {
      // Arrange
      // DSL: Date.now()
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Date' },
        method: 'now',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(typeof result).toBe('number');
    });
  });

  // ==================== Date Instance toISOString Method ====================

  describe('Date instance toISOString method', () => {
    it('should return ISO format string from Date instance', () => {
      // Arrange
      // This test requires creating a Date instance and calling toISOString on it
      // DSL: dateInstance.toISOString() -> ISO string
      // Since we pass the Date instance via locals, we use var expression
      const dateInstance = new Date('2024-01-23T10:00:00.000Z');
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'dateInstance' },
        method: 'toISOString',
      } as CompiledExpression;
      const ctx = createContext({}, { dateInstance });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('2024-01-23T10:00:00.000Z');
    });

    it('should return string type', () => {
      // Arrange
      const dateInstance = new Date('2024-06-15T15:30:00.000Z');
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'dateInstance' },
        method: 'toISOString',
      } as CompiledExpression;
      const ctx = createContext({}, { dateInstance });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  // ==================== Math Constants ====================

  describe('Math constants', () => {
    it('should return Math.PI value (3.141592653589793)', () => {
      // Arrange
      // DSL: Math.PI -> 3.141592653589793
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'PI',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.PI);
      expect(result).toBe(3.141592653589793);
    });

    it('should return Math.E value (2.718281828459045)', () => {
      // Arrange
      // DSL: Math.E -> 2.718281828459045
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'E',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.E);
      expect(result).toBe(2.718281828459045);
    });

    it('should return Math.LN2 value (0.6931471805599453)', () => {
      // Arrange
      // DSL: Math.LN2 -> 0.6931471805599453
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'LN2',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.LN2);
      expect(result).toBe(0.6931471805599453);
    });

    it('should return Math.LN10 value (2.302585092994046)', () => {
      // Arrange
      // DSL: Math.LN10 -> 2.302585092994046
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'LN10',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.LN10);
      expect(result).toBe(2.302585092994046);
    });

    it('should return Math.LOG2E value (1.4426950408889634)', () => {
      // Arrange
      // DSL: Math.LOG2E -> 1.4426950408889634
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'LOG2E',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.LOG2E);
      expect(result).toBe(1.4426950408889634);
    });

    it('should return Math.LOG10E value (0.4342944819032518)', () => {
      // Arrange
      // DSL: Math.LOG10E -> 0.4342944819032518
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'LOG10E',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.LOG10E);
      expect(result).toBe(0.4342944819032518);
    });

    it('should return Math.SQRT2 value (1.4142135623730951)', () => {
      // Arrange
      // DSL: Math.SQRT2 -> 1.4142135623730951
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'SQRT2',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.SQRT2);
      expect(result).toBe(1.4142135623730951);
    });

    it('should return Math.SQRT1_2 value (0.7071067811865476)', () => {
      // Arrange
      // DSL: Math.SQRT1_2 -> 0.7071067811865476
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'Math' },
        path: 'SQRT1_2',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(Math.SQRT1_2);
      expect(result).toBe(0.7071067811865476);
    });

    it('should use Math.PI in calculations (circumference formula)', () => {
      // Arrange
      // DSL: 2 * Math.PI * radius -> circumference
      // radius = 5, expected = 2 * 3.141592653589793 * 5 = 31.41592653589793
      const expr = {
        expr: 'bin',
        op: '*',
        left: {
          expr: 'bin',
          op: '*',
          left: { expr: 'lit', value: 2 },
          right: {
            expr: 'get',
            base: { expr: 'var', name: 'Math' },
            path: 'PI',
          },
        },
        right: { expr: 'state', name: 'radius' },
      } as CompiledExpression;
      const ctx = createContext({ radius: 5 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeCloseTo(31.41592653589793, 10);
    });

    it('should use Math.E in exponential calculations', () => {
      // Arrange
      // DSL: Math.E ** 2 -> e squared
      // expected = 2.718281828459045 ** 2 = 7.3890560989306495
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'pow',
        args: [
          {
            expr: 'get',
            base: { expr: 'var', name: 'Math' },
            path: 'E',
          },
          { expr: 'lit', value: 2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeCloseTo(7.3890560989306495, 10);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should return undefined for unknown Math method', () => {
      // Arrange
      // DSL: Math.unknownMethod(5)
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'unknownMethod',
        args: [{ expr: 'lit', value: 5 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for unknown Date method', () => {
      // Arrange
      // DSL: Date.unknownMethod()
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Date' },
        method: 'unknownMethod',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle Math.min with no arguments (returns undefined)', () => {
      // Arrange
      // DSL: Math.min() -> undefined (empty array guard)
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'min',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle Math.max with no arguments (returns undefined)', () => {
      // Arrange
      // DSL: Math.max() -> undefined (empty array guard)
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'max',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==================== Combined with State ====================

  describe('combined with state expressions', () => {
    it('should use Math.max to clamp state value to minimum', () => {
      // Arrange
      // DSL: Math.max(0, state.count) -> ensures count is at least 0
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'max',
        args: [
          { expr: 'lit', value: 0 },
          { expr: 'state', name: 'count' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ count: -5 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(0);
    });

    it('should use Math.min to clamp state value to maximum', () => {
      // Arrange
      // DSL: Math.min(100, state.count) -> ensures count is at most 100
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'min',
        args: [
          { expr: 'lit', value: 100 },
          { expr: 'state', name: 'count' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ count: 150 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(100);
    });

    it('should use Math.abs with state value', () => {
      // Arrange
      // DSL: Math.abs(state.delta) -> absolute value of delta
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'abs',
        args: [{ expr: 'state', name: 'delta' }],
      } as CompiledExpression;
      const ctx = createContext({ delta: -42 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(42);
    });

    it('should use Math.round with calculated value', () => {
      // Arrange
      // DSL: Math.round(state.price * 1.1) -> rounded price with tax
      // Using binary expression in the argument
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'Math' },
        method: 'round',
        args: [
          {
            expr: 'bin',
            op: '*',
            left: { expr: 'state', name: 'price' },
            right: { expr: 'lit', value: 1.1 },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({ price: 99 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(109); // 99 * 1.1 = 108.9 -> 109
    });
  });
});
