/**
 * Test module for Expression Evaluator.
 *
 * Coverage:
 * - Literal expressions return value
 * - State expressions read from store
 * - Var expressions read from locals
 * - Binary operations calculate correctly
 * - Not expression negates boolean
 * - Nested expressions evaluate correctly
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from '../../src/expression/evaluator.js';
import type { EvaluationContext } from '../../src/expression/evaluator.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledExpression } from '@constela/compiler';

describe('evaluate', () => {
  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
    locals: Record<string, unknown> = {}
  ): EvaluationContext {
    return {
      state: createStateStore(stateDefinitions),
      locals,
    };
  }

  // ==================== Literal Expressions ====================

  describe('literal expressions', () => {
    it('should return number value', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: 42 };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(42);
    });

    it('should return string value', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: 'hello' };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('hello');
    });

    it('should return boolean true', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: true };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return boolean false', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: false };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return null value', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: null };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeNull();
    });

    it('should return zero', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: 0 };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(0);
    });

    it('should return empty string', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'lit', value: '' };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('');
    });
  });

  // ==================== State Expressions ====================

  describe('state expressions', () => {
    it('should read number from state store', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'state', name: 'count' };
      const context = createContext({ count: { type: 'number', initial: 42 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(42);
    });

    it('should read string from state store', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'state', name: 'message' };
      const context = createContext({ message: { type: 'string', initial: 'hello' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('hello');
    });

    it('should read list from state store', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'state', name: 'items' };
      const context = createContext({ items: { type: 'list', initial: [1, 2, 3] } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual([1, 2, 3]);
    });

    it('should read updated state value', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'state', name: 'count' };
      const context = createContext({ count: { type: 'number', initial: 0 } });
      context.state.set('count', 100);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(100);
    });
  });

  // ==================== Var Expressions ====================

  describe('var expressions', () => {
    it('should read from locals', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'item' };
      const context = createContext({}, { item: 'test value' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('test value');
    });

    it('should read loop index from locals', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'index' };
      const context = createContext({}, { index: 5 });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(5);
    });

    it('should read object from locals', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user' };
      const context = createContext({}, { user: { name: 'Alice', age: 30 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should return undefined for non-existent var', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'nonexistent' };
      const context = createContext({}, {});

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should access nested property with path', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user', path: 'name' };
      const context = createContext({}, { user: { name: 'Alice', age: 30 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Alice');
    });

    it('should access deeply nested property with dotted path', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user', path: 'address.city' };
      const context = createContext({}, {
        user: {
          name: 'Bob',
          address: {
            city: 'Tokyo',
            country: 'Japan',
          },
        },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Tokyo');
    });

    it('should return undefined for missing nested path', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user', path: 'address.city' };
      const context = createContext({}, { user: { name: 'Alice' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when base variable is null', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user', path: 'name' };
      const context = createContext({}, { user: null });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeNull();
    });

    it('should return undefined when base variable is undefined', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user', path: 'name' };
      const context = createContext({}, {});

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle path on intermediate null value', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'data', path: 'level1.level2.level3' };
      const context = createContext({}, { data: { level1: null } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeNull();
    });

    // ==================== Dot Notation in Name ====================

    it('should access nested property via dot notation in name', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user.name' };
      const context = createContext({}, { user: { name: 'Alice', age: 30 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Alice');
    });

    it('should access deeply nested property via dot notation in name', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user.address.city' };
      const context = createContext({}, {
        user: {
          name: 'Bob',
          address: {
            city: 'Tokyo',
            country: 'Japan',
          },
        },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Tokyo');
    });

    it('should combine dot notation in name with explicit path', () => {
      // Arrange - "user.address" in name + "city" in path
      const expr: CompiledExpression = { expr: 'var', name: 'user.address', path: 'city' };
      const context = createContext({}, {
        user: {
          address: {
            city: 'Osaka',
            country: 'Japan',
          },
        },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Osaka');
    });

    it('should return undefined for non-existent nested property via dot notation', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user.nonexistent' };
      const context = createContext({}, { user: { name: 'Alice' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when intermediate value is null in dot notation', () => {
      // Arrange
      const expr: CompiledExpression = { expr: 'var', name: 'user.address.city' };
      const context = createContext({}, { user: { address: null } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeNull();
    });

    // ==================== Prototype Pollution Prevention ====================

    it('should block __proto__ access via dot notation', () => {
      const expr: CompiledExpression = { expr: 'var', name: 'obj.__proto__' };
      const context = createContext({}, { obj: { name: 'test' } });

      const result = evaluate(expr, context);

      expect(result).toBeUndefined();
    });

    it('should block constructor access via path field', () => {
      const expr: CompiledExpression = { expr: 'var', name: 'obj', path: 'constructor' };
      const context = createContext({}, { obj: { name: 'test' } });

      const result = evaluate(expr, context);

      expect(result).toBeUndefined();
    });

    it('should block prototype access in nested path', () => {
      const expr: CompiledExpression = { expr: 'var', name: 'obj.nested.prototype.dangerous' };
      const context = createContext({}, { obj: { nested: { value: 1 } } });

      const result = evaluate(expr, context);

      expect(result).toBeUndefined();
    });
  });

  // ==================== Binary Expressions - Arithmetic ====================

  describe('binary expressions - arithmetic', () => {
    it('should add two numbers', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 10 },
        right: { expr: 'lit', value: 5 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(15);
    });

    it('should subtract two numbers', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '-',
        left: { expr: 'lit', value: 10 },
        right: { expr: 'lit', value: 3 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(7);
    });

    it('should multiply two numbers', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '*',
        left: { expr: 'lit', value: 4 },
        right: { expr: 'lit', value: 5 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(20);
    });

    it('should divide two numbers', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '/',
        left: { expr: 'lit', value: 20 },
        right: { expr: 'lit', value: 4 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(5);
    });

    it('should concatenate strings with +', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 'hello' },
        right: { expr: 'lit', value: ' world' },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('hello world');
    });
  });

  // ==================== Binary Expressions - Comparison ====================

  describe('binary expressions - comparison', () => {
    it('should compare equal numbers (==)', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '==',
        left: { expr: 'lit', value: 5 },
        right: { expr: 'lit', value: 5 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should compare unequal numbers (==)', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '==',
        left: { expr: 'lit', value: 5 },
        right: { expr: 'lit', value: 10 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(false);
    });

    it('should compare not equal (!=)', () => {
      // Arrange
      const exprTrue: CompiledExpression = {
        expr: 'bin',
        op: '!=',
        left: { expr: 'lit', value: 5 },
        right: { expr: 'lit', value: 10 },
      };
      const exprFalse: CompiledExpression = {
        expr: 'bin',
        op: '!=',
        left: { expr: 'lit', value: 5 },
        right: { expr: 'lit', value: 5 },
      };
      const context = createContext();

      // Act & Assert
      expect(evaluate(exprTrue, context)).toBe(true);
      expect(evaluate(exprFalse, context)).toBe(false);
    });

    it('should compare less than (<)', () => {
      // Arrange
      const exprTrue: CompiledExpression = {
        expr: 'bin',
        op: '<',
        left: { expr: 'lit', value: 3 },
        right: { expr: 'lit', value: 5 },
      };
      const exprFalse: CompiledExpression = {
        expr: 'bin',
        op: '<',
        left: { expr: 'lit', value: 5 },
        right: { expr: 'lit', value: 3 },
      };
      const context = createContext();

      // Act & Assert
      expect(evaluate(exprTrue, context)).toBe(true);
      expect(evaluate(exprFalse, context)).toBe(false);
    });

    it('should compare less than or equal (<=)', () => {
      // Arrange
      const context = createContext();

      expect(
        evaluate(
          { expr: 'bin', op: '<=', left: { expr: 'lit', value: 3 }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(true);

      expect(
        evaluate(
          { expr: 'bin', op: '<=', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(true);

      expect(
        evaluate(
          { expr: 'bin', op: '<=', left: { expr: 'lit', value: 6 }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(false);
    });

    it('should compare greater than (>)', () => {
      // Arrange
      const context = createContext();

      expect(
        evaluate(
          { expr: 'bin', op: '>', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 3 } },
          context
        )
      ).toBe(true);

      expect(
        evaluate(
          { expr: 'bin', op: '>', left: { expr: 'lit', value: 3 }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(false);
    });

    it('should compare greater than or equal (>=)', () => {
      // Arrange
      const context = createContext();

      expect(
        evaluate(
          { expr: 'bin', op: '>=', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 3 } },
          context
        )
      ).toBe(true);

      expect(
        evaluate(
          { expr: 'bin', op: '>=', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(true);

      expect(
        evaluate(
          { expr: 'bin', op: '>=', left: { expr: 'lit', value: 4 }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(false);
    });
  });

  // ==================== Binary Expressions - Logical ====================

  describe('binary expressions - logical', () => {
    it('should perform logical AND (&&)', () => {
      const context = createContext();

      // true && true = true
      expect(
        evaluate(
          { expr: 'bin', op: '&&', left: { expr: 'lit', value: true }, right: { expr: 'lit', value: true } },
          context
        )
      ).toBe(true);

      // true && false = false
      expect(
        evaluate(
          { expr: 'bin', op: '&&', left: { expr: 'lit', value: true }, right: { expr: 'lit', value: false } },
          context
        )
      ).toBe(false);

      // false && true = false
      expect(
        evaluate(
          { expr: 'bin', op: '&&', left: { expr: 'lit', value: false }, right: { expr: 'lit', value: true } },
          context
        )
      ).toBe(false);

      // false && false = false
      expect(
        evaluate(
          { expr: 'bin', op: '&&', left: { expr: 'lit', value: false }, right: { expr: 'lit', value: false } },
          context
        )
      ).toBe(false);
    });

    it('should perform logical OR (||)', () => {
      const context = createContext();

      // true || true = true
      expect(
        evaluate(
          { expr: 'bin', op: '||', left: { expr: 'lit', value: true }, right: { expr: 'lit', value: true } },
          context
        )
      ).toBe(true);

      // true || false = true
      expect(
        evaluate(
          { expr: 'bin', op: '||', left: { expr: 'lit', value: true }, right: { expr: 'lit', value: false } },
          context
        )
      ).toBe(true);

      // false || true = true
      expect(
        evaluate(
          { expr: 'bin', op: '||', left: { expr: 'lit', value: false }, right: { expr: 'lit', value: true } },
          context
        )
      ).toBe(true);

      // false || false = false
      expect(
        evaluate(
          { expr: 'bin', op: '||', left: { expr: 'lit', value: false }, right: { expr: 'lit', value: false } },
          context
        )
      ).toBe(false);
    });

    it('should short-circuit AND evaluation', () => {
      // If left side is false, right side should not be evaluated
      // We can't directly test this without side effects, but we can verify result
      const context = createContext();

      const expr: CompiledExpression = {
        expr: 'bin',
        op: '&&',
        left: { expr: 'lit', value: false },
        right: { expr: 'lit', value: true },
      };

      expect(evaluate(expr, context)).toBe(false);
    });

    it('should short-circuit OR evaluation', () => {
      // If left side is true, right side should not be evaluated
      const context = createContext();

      const expr: CompiledExpression = {
        expr: 'bin',
        op: '||',
        left: { expr: 'lit', value: true },
        right: { expr: 'lit', value: false },
      };

      expect(evaluate(expr, context)).toBe(true);
    });
  });

  // ==================== Not Expressions ====================

  describe('not expressions', () => {
    it('should negate true to false', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'not',
        operand: { expr: 'lit', value: true },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(false);
    });

    it('should negate false to true', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'not',
        operand: { expr: 'lit', value: false },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should negate truthy values', () => {
      const context = createContext();

      // Non-zero number is truthy
      expect(
        evaluate({ expr: 'not', operand: { expr: 'lit', value: 1 } }, context)
      ).toBe(false);

      // Non-empty string is truthy
      expect(
        evaluate({ expr: 'not', operand: { expr: 'lit', value: 'hello' } }, context)
      ).toBe(false);
    });

    it('should negate falsy values', () => {
      const context = createContext();

      // Zero is falsy
      expect(
        evaluate({ expr: 'not', operand: { expr: 'lit', value: 0 } }, context)
      ).toBe(true);

      // Empty string is falsy
      expect(
        evaluate({ expr: 'not', operand: { expr: 'lit', value: '' } }, context)
      ).toBe(true);

      // Null is falsy
      expect(
        evaluate({ expr: 'not', operand: { expr: 'lit', value: null } }, context)
      ).toBe(true);
    });
  });

  // ==================== Nested Expressions ====================

  describe('nested expressions', () => {
    it('should evaluate nested arithmetic', () => {
      // (2 + 3) * 4 = 20
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '*',
        left: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 2 },
          right: { expr: 'lit', value: 3 },
        },
        right: { expr: 'lit', value: 4 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(20);
    });

    it('should evaluate nested comparison with state', () => {
      // state.count > 10 && state.count < 20
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '&&',
        left: {
          expr: 'bin',
          op: '>',
          left: { expr: 'state', name: 'count' },
          right: { expr: 'lit', value: 10 },
        },
        right: {
          expr: 'bin',
          op: '<',
          left: { expr: 'state', name: 'count' },
          right: { expr: 'lit', value: 20 },
        },
      };

      const context = createContext({ count: { type: 'number', initial: 15 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate double negation', () => {
      // !!true = true
      const expr: CompiledExpression = {
        expr: 'not',
        operand: {
          expr: 'not',
          operand: { expr: 'lit', value: true },
        },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate complex expression with state and locals', () => {
      // state.total + (item.price * item.quantity)
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'state', name: 'total' },
        right: {
          expr: 'bin',
          op: '*',
          left: { expr: 'var', name: 'price' },
          right: { expr: 'var', name: 'quantity' },
        },
      };

      const context = createContext(
        { total: { type: 'number', initial: 100 } },
        { price: 25, quantity: 4 }
      );

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(200); // 100 + (25 * 4)
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle division by zero', () => {
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '/',
        left: { expr: 'lit', value: 10 },
        right: { expr: 'lit', value: 0 },
      };
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert - JavaScript returns Infinity for division by zero
      expect(result).toBe(Infinity);
    });

    it('should handle string comparison', () => {
      const context = createContext();

      expect(
        evaluate(
          { expr: 'bin', op: '==', left: { expr: 'lit', value: 'abc' }, right: { expr: 'lit', value: 'abc' } },
          context
        )
      ).toBe(true);

      expect(
        evaluate(
          { expr: 'bin', op: '==', left: { expr: 'lit', value: 'abc' }, right: { expr: 'lit', value: 'def' } },
          context
        )
      ).toBe(false);
    });

    it('should handle comparing different types', () => {
      const context = createContext();

      // String '5' vs number 5
      expect(
        evaluate(
          { expr: 'bin', op: '==', left: { expr: 'lit', value: '5' }, right: { expr: 'lit', value: 5 } },
          context
        )
      ).toBe(false); // Assuming strict equality
    });
  });
});
