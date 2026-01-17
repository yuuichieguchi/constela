/**
 * Test module for evaluatePayload function.
 *
 * Coverage:
 * - Single expression payload (existing behavior)
 * - Object payload with expression fields
 * - Mixed expression and literal fields
 * - Multiple expression fields
 * - Prototype pollution prevention
 * - Empty object payload
 * - Complex nested expressions in object payload
 *
 * TDD Red Phase: These tests verify the evaluatePayload function
 * that will evaluate payloads containing either a single expression
 * or an object with expression fields.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, evaluatePayload, type EvaluationContext } from '../evaluator.js';
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

describe('evaluatePayload', () => {
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

  // ==================== Single Expression Payload ====================

  describe('single expression payload', () => {
    it('should evaluate literal expression payload', () => {
      // Arrange
      const payload: CompiledExpression = { expr: 'lit', value: 'test' };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toBe('test');
    });

    it('should evaluate var expression payload', () => {
      // Arrange
      const payload: CompiledExpression = { expr: 'var', name: 'x' };
      const ctx = createContext({}, { x: 42 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toBe(42);
    });

    it('should evaluate state expression payload', () => {
      // Arrange
      const payload: CompiledExpression = { expr: 'state', name: 'count' };
      const ctx = createContext({ count: 10 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toBe(10);
    });

    it('should evaluate state expression payload with path', () => {
      // Arrange
      const payload: CompiledExpression = { expr: 'state', name: 'user', path: 'name' };
      const ctx = createContext({ user: { name: 'Alice', age: 30 } });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toBe('Alice');
    });

    it('should evaluate binary expression payload', () => {
      // Arrange
      const payload: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 10 },
        right: { expr: 'lit', value: 5 },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toBe(15);
    });
  });

  // ==================== Object Payload with Expression Fields ====================

  describe('object payload with expression fields', () => {
    it('should evaluate object payload with var expression field', () => {
      // Arrange
      const payload = {
        index: { expr: 'var', name: 'i' },
      };
      const ctx = createContext({}, { i: 5 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ index: 5 });
    });

    it('should evaluate object payload with state expression field', () => {
      // Arrange
      const payload = {
        liked: { expr: 'state', name: 'isLiked' },
      };
      const ctx = createContext({ isLiked: true });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ liked: true });
    });

    it('should evaluate object payload with literal expression field', () => {
      // Arrange
      const payload = {
        id: { expr: 'lit', value: 123 },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ id: 123 });
    });
  });

  // ==================== Mixed Expression and Literal Fields ====================

  describe('mixed expression and literal fields', () => {
    it('should preserve non-expression values as-is', () => {
      // Arrange
      const payload = {
        id: { expr: 'lit', value: 123 },
        name: 'static',
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ id: 123, name: 'static' });
    });

    it('should handle mixed types including numbers', () => {
      // Arrange
      const payload = {
        value: { expr: 'var', name: 'x' },
        count: 42,
        label: 'test',
      };
      const ctx = createContext({}, { x: 100 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ value: 100, count: 42, label: 'test' });
    });

    it('should handle mixed types including booleans', () => {
      // Arrange
      const payload = {
        active: { expr: 'state', name: 'isActive' },
        disabled: false,
        visible: true,
      };
      const ctx = createContext({ isActive: true });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ active: true, disabled: false, visible: true });
    });

    it('should handle mixed types including null', () => {
      // Arrange
      const payload = {
        data: { expr: 'var', name: 'item' },
        optional: null,
      };
      const ctx = createContext({}, { item: 'value' });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ data: 'value', optional: null });
    });

    it('should handle mixed types including arrays', () => {
      // Arrange
      const payload = {
        selected: { expr: 'state', name: 'index' },
        options: ['a', 'b', 'c'],
      };
      const ctx = createContext({ index: 1 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ selected: 1, options: ['a', 'b', 'c'] });
    });
  });

  // ==================== Multiple Expression Fields ====================

  describe('multiple expression fields', () => {
    it('should evaluate multiple expression fields', () => {
      // Arrange
      const payload = {
        a: { expr: 'var', name: 'x' },
        b: { expr: 'state', name: 'y' },
      };
      const ctx = createContext({ y: 2 }, { x: 1 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should evaluate three expression fields', () => {
      // Arrange
      const payload = {
        first: { expr: 'lit', value: 'hello' },
        second: { expr: 'var', name: 'name' },
        third: { expr: 'state', name: 'count' },
      };
      const ctx = createContext({ count: 100 }, { name: 'world' });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ first: 'hello', second: 'world', third: 100 });
    });

    it('should evaluate expression fields with same expression type', () => {
      // Arrange
      const payload = {
        x: { expr: 'var', name: 'a' },
        y: { expr: 'var', name: 'b' },
        z: { expr: 'var', name: 'c' },
      };
      const ctx = createContext({}, { a: 1, b: 2, c: 3 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  // ==================== Prototype Pollution Prevention ====================

  describe('prototype pollution prevention', () => {
    it('should skip __proto__ key in object payload', () => {
      // Arrange
      const payload = {
        __proto__: { expr: 'lit', value: 'bad' },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({});
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    });

    it('should skip constructor key in object payload', () => {
      // Arrange
      const payload = {
        constructor: { expr: 'lit', value: 'bad' },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({});
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    });

    it('should skip prototype key in object payload', () => {
      // Arrange
      const payload = {
        prototype: { expr: 'lit', value: 'bad' },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({});
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
    });

    it('should skip dangerous keys while preserving safe keys', () => {
      // Arrange
      const payload = {
        __proto__: { expr: 'lit', value: 'bad' },
        safeKey: { expr: 'lit', value: 'good' },
        constructor: { expr: 'lit', value: 'bad' },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ safeKey: 'good' });
    });

    it('should not modify Object.prototype when processing dangerous keys', () => {
      // Arrange
      const originalPrototype = { ...Object.prototype };
      const payload = {
        __proto__: { expr: 'lit', value: { polluted: true } },
      };
      const ctx = baseContext;

      // Act
      evaluatePayload(payload, ctx);

      // Assert - verify prototype is not polluted
      expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined();
    });
  });

  // ==================== Empty Object Payload ====================

  describe('empty object payload', () => {
    it('should return empty object for empty payload', () => {
      // Arrange
      const payload = {};
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({});
    });
  });

  // ==================== Complex Nested Expressions ====================

  describe('complex nested expressions in object payload', () => {
    it('should evaluate object payload with concat expression field', () => {
      // Arrange
      const payload = {
        message: {
          expr: 'concat',
          items: [
            { expr: 'lit', value: 'Hello, ' },
            { expr: 'var', name: 'name' },
            { expr: 'lit', value: '!' },
          ],
        },
      };
      const ctx = createContext({}, { name: 'World' });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ message: 'Hello, World!' });
    });

    it('should evaluate object payload with conditional expression field', () => {
      // Arrange
      const payload = {
        status: {
          expr: 'cond',
          if: { expr: 'state', name: 'isActive' },
          then: { expr: 'lit', value: 'Active' },
          else: { expr: 'lit', value: 'Inactive' },
        },
      };
      const ctx = createContext({ isActive: true });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ status: 'Active' });
    });

    it('should evaluate object payload with binary expression field', () => {
      // Arrange
      const payload = {
        total: {
          expr: 'bin',
          op: '+',
          left: { expr: 'var', name: 'price' },
          right: { expr: 'var', name: 'tax' },
        },
      };
      const ctx = createContext({}, { price: 100, tax: 10 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ total: 110 });
    });

    it('should evaluate object payload with get expression field', () => {
      // Arrange
      const payload = {
        userName: {
          expr: 'get',
          base: { expr: 'var', name: 'user' },
          path: 'profile.name',
        },
      };
      const ctx = createContext({}, { user: { profile: { name: 'Alice' } } });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ userName: 'Alice' });
    });

    it('should evaluate object payload with not expression field', () => {
      // Arrange
      const payload = {
        isDisabled: {
          expr: 'not',
          operand: { expr: 'state', name: 'isEnabled' },
        },
      };
      const ctx = createContext({ isEnabled: true });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ isDisabled: false });
    });

    it('should evaluate complex payload with multiple nested expressions', () => {
      // Arrange
      const payload = {
        greeting: {
          expr: 'concat',
          items: [
            { expr: 'lit', value: 'Welcome, ' },
            { expr: 'var', name: 'userName' },
          ],
        },
        itemCount: {
          expr: 'bin',
          op: '+',
          left: { expr: 'state', name: 'existingCount' },
          right: { expr: 'lit', value: 1 },
        },
        isVip: {
          expr: 'cond',
          if: {
            expr: 'bin',
            op: '>',
            left: { expr: 'state', name: 'points' },
            right: { expr: 'lit', value: 1000 },
          },
          then: { expr: 'lit', value: true },
          else: { expr: 'lit', value: false },
        },
        staticValue: 'unchanged',
      };
      const ctx = createContext(
        { existingCount: 5, points: 1500 },
        { userName: 'Bob' }
      );

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({
        greeting: 'Welcome, Bob',
        itemCount: 6,
        isVip: true,
        staticValue: 'unchanged',
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle undefined expression evaluation result', () => {
      // Arrange
      const payload = {
        value: { expr: 'var', name: 'nonexistent' },
      };
      const ctx = createContext({}, {});

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ value: undefined });
    });

    it('should handle null expression evaluation result', () => {
      // Arrange
      const payload = {
        value: { expr: 'lit', value: null },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ value: null });
    });

    it('should handle zero as expression result', () => {
      // Arrange
      const payload = {
        count: { expr: 'lit', value: 0 },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ count: 0 });
    });

    it('should handle empty string as expression result', () => {
      // Arrange
      const payload = {
        text: { expr: 'lit', value: '' },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ text: '' });
    });

    it('should handle false as expression result', () => {
      // Arrange
      const payload = {
        enabled: { expr: 'lit', value: false },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ enabled: false });
    });

    it('should handle nested object as static value', () => {
      // Arrange
      const payload = {
        config: { nested: { deep: 'value' } },
        id: { expr: 'var', name: 'itemId' },
      };
      const ctx = createContext({}, { itemId: 99 });

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({
        config: { nested: { deep: 'value' } },
        id: 99,
      });
    });
  });

  // ==================== Type Detection ====================

  describe('type detection for expression vs non-expression', () => {
    it('should detect expression by presence of expr field', () => {
      // Arrange - object with 'expr' field is an expression
      const payload = {
        field: { expr: 'lit', value: 'test' },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ field: 'test' });
    });

    it('should treat object without expr field as static value', () => {
      // Arrange - object without 'expr' field is a static value
      const payload = {
        field: { name: 'test', value: 123 },
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ field: { name: 'test', value: 123 } });
    });

    it('should treat array as static value', () => {
      // Arrange
      const payload = {
        items: [1, 2, 3],
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('should treat function as static value', () => {
      // Arrange
      const fn = () => 'test';
      const payload = {
        callback: fn,
      };
      const ctx = baseContext;

      // Act
      const result = evaluatePayload(payload, ctx);

      // Assert
      expect(result).toEqual({ callback: fn });
    });
  });
});
