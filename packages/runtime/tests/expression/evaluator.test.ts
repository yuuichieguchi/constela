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

  // ==================== Conditional Expressions ====================

  describe('cond expressions', () => {
    it('should return then branch when condition is truthy', () => {
      // Arrange
      const expr = {
        expr: 'cond',
        if: { expr: 'lit', value: true },
        then: { expr: 'lit', value: 'Welcome!' },
        else: { expr: 'lit', value: 'Please log in' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Welcome!');
    });

    it('should return else branch when condition is falsy', () => {
      // Arrange
      const expr = {
        expr: 'cond',
        if: { expr: 'lit', value: false },
        then: { expr: 'lit', value: 'Welcome!' },
        else: { expr: 'lit', value: 'Please log in' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Please log in');
    });

    it('should work with state references as condition', () => {
      // Arrange
      const expr = {
        expr: 'cond',
        if: { expr: 'state', name: 'isLoggedIn' },
        then: { expr: 'lit', value: 'Welcome!' },
        else: { expr: 'lit', value: 'Please log in' },
      } as CompiledExpression;
      const context = createContext({ isLoggedIn: { type: 'boolean', initial: true } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Welcome!');
    });

    it('should work with nested expressions', () => {
      // Arrange - condition: count > 0
      const expr = {
        expr: 'cond',
        if: {
          expr: 'bin',
          op: '>',
          left: { expr: 'state', name: 'count' },
          right: { expr: 'lit', value: 0 },
        },
        then: { expr: 'lit', value: 'Has items' },
        else: { expr: 'lit', value: 'Empty' },
      } as CompiledExpression;
      const context = createContext({ count: { type: 'number', initial: 5 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Has items');
    });

    it('should handle truthy non-boolean values in condition', () => {
      // Arrange - non-empty string is truthy
      const expr = {
        expr: 'cond',
        if: { expr: 'lit', value: 'some string' },
        then: { expr: 'lit', value: 'truthy' },
        else: { expr: 'lit', value: 'falsy' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('truthy');
    });

    it('should handle falsy non-boolean values in condition', () => {
      // Arrange - empty string is falsy
      const expr = {
        expr: 'cond',
        if: { expr: 'lit', value: '' },
        then: { expr: 'lit', value: 'truthy' },
        else: { expr: 'lit', value: 'falsy' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('falsy');
    });

    it('should handle null condition as falsy', () => {
      // Arrange
      const expr = {
        expr: 'cond',
        if: { expr: 'lit', value: null },
        then: { expr: 'lit', value: 'truthy' },
        else: { expr: 'lit', value: 'falsy' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('falsy');
    });

    it('should handle zero as falsy', () => {
      // Arrange
      const expr = {
        expr: 'cond',
        if: { expr: 'lit', value: 0 },
        then: { expr: 'lit', value: 'truthy' },
        else: { expr: 'lit', value: 'falsy' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('falsy');
    });
  });

  // ==================== Get Expressions (Property Access) ====================

  describe('get expressions', () => {
    it('should access simple property from object', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'user' },
        path: 'name',
      } as CompiledExpression;
      const context = createContext({}, { user: { name: 'Alice', age: 30 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Alice');
    });

    it('should access nested path (a.b.c)', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'state', name: 'user' },
        path: 'address.city',
      } as CompiledExpression;
      const context = createContext({
        user: {
          type: 'object',
          initial: {
            name: 'Bob',
            address: { city: 'Tokyo', country: 'Japan' },
          },
        },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Tokyo');
    });

    it('should return undefined for null base', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'lit', value: null },
        path: 'name',
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined base', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'nonexistent' },
        path: 'name',
      } as CompiledExpression;
      const context = createContext({}, {});

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing property', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'user' },
        path: 'email',
      } as CompiledExpression;
      const context = createContext({}, { user: { name: 'Alice' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing nested property', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'user' },
        path: 'address.city',
      } as CompiledExpression;
      const context = createContext({}, { user: { name: 'Alice' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    // ==================== Prototype Pollution Prevention ====================

    it('should block __proto__ access', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'obj' },
        path: '__proto__',
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'test' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should block constructor access', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'obj' },
        path: 'constructor',
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'test' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should block prototype access', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'obj' },
        path: 'prototype',
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'test' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should block __proto__ in nested path', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'obj' },
        path: 'nested.__proto__.dangerous',
      } as CompiledExpression;
      const context = createContext({}, { obj: { nested: { value: 1 } } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should access array element with index path', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'items' },
        path: '0',
      } as CompiledExpression;
      const context = createContext({}, { items: ['first', 'second', 'third'] });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('first');
    });

    it('should access nested property from array element', () => {
      // Arrange
      const expr = {
        expr: 'get',
        base: { expr: 'var', name: 'users' },
        path: '0.name',
      } as CompiledExpression;
      const context = createContext({}, {
        users: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Alice');
    });
  });

  // ==================== Index Expressions (Dynamic Property Access) ====================

  describe('index expressions', () => {
    /**
     * The 'index' expression allows dynamic property access using another expression as the key.
     * Syntax: { expr: 'index', base: <expression>, key: <expression> }
     * Equivalent to: base[key]
     */

    // Extended context helper that includes route and imports
    function createFullContext(
      stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
      locals: Record<string, unknown> = {},
      route?: { params: Record<string, string>; query: Record<string, string>; path: string },
      imports?: Record<string, unknown>
    ): EvaluationContext {
      return {
        state: createStateStore(stateDefinitions),
        locals,
        route,
        imports,
      };
    }

    // ==================== Basic Index Access ====================

    it('should access object property with literal string key', () => {
      // Arrange
      // Equivalent to: obj['name']
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'obj' },
        key: { expr: 'lit', value: 'name' },
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'Alice', age: 30 } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Alice');
    });

    it('should access nested object property with literal key', () => {
      // Arrange
      // Equivalent to: users['admin']
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'users' },
        key: { expr: 'lit', value: 'admin' },
      } as CompiledExpression;
      const context = createContext({}, {
        users: {
          admin: { name: 'Admin User', role: 'admin' },
          guest: { name: 'Guest User', role: 'guest' },
        },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual({ name: 'Admin User', role: 'admin' });
    });

    // ==================== Index Access with Dynamic Key ====================

    it('should access import data with route query param as key', () => {
      // Arrange
      // Equivalent to: examples.codes[query.example]
      // where examples.codes = { hello: 'console.log("hello")', world: 'console.log("world")' }
      // and query.example = 'hello'
      const expr = {
        expr: 'index',
        base: { expr: 'import', name: 'examples', path: 'codes' },
        key: { expr: 'route', source: 'query', name: 'example' },
      } as CompiledExpression;
      const context = createFullContext(
        {},
        {},
        { params: {}, query: { example: 'hello' }, path: '/examples' },
        {
          examples: {
            codes: {
              hello: 'console.log("hello")',
              world: 'console.log("world")',
            },
          },
        }
      );

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('console.log("hello")');
    });

    it('should access object with variable as key', () => {
      // Arrange
      // Equivalent to: data[selectedKey]
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'data' },
        key: { expr: 'var', name: 'selectedKey' },
      } as CompiledExpression;
      const context = createContext({}, {
        data: { a: 1, b: 2, c: 3 },
        selectedKey: 'b',
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(2);
    });

    it('should access object with state value as key', () => {
      // Arrange
      // Equivalent to: config[state.currentTheme]
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'config' },
        key: { expr: 'state', name: 'currentTheme' },
      } as CompiledExpression;
      const context = createContext(
        { currentTheme: { type: 'string', initial: 'dark' } },
        { config: { light: '#ffffff', dark: '#000000' } }
      );

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('#000000');
    });

    // ==================== Undefined/Missing Key Handling ====================

    it('should return undefined when key does not exist in object', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'obj' },
        key: { expr: 'lit', value: 'nonexistent' },
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'Alice' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when key expression evaluates to undefined', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'obj' },
        key: { expr: 'var', name: 'undefinedKey' },
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'Alice' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when base is null', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'lit', value: null },
        key: { expr: 'lit', value: 'name' },
      } as CompiledExpression;
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when base is undefined', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'nonexistent' },
        key: { expr: 'lit', value: 'name' },
      } as CompiledExpression;
      const context = createContext({}, {});

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    // ==================== Array Access ====================

    it('should access array element with numeric string key', () => {
      // Arrange
      // Equivalent to: items['1'] (or items[1])
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'items' },
        key: { expr: 'lit', value: '1' },
      } as CompiledExpression;
      const context = createContext({}, { items: ['first', 'second', 'third'] });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('second');
    });

    it('should access array element with number key', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'items' },
        key: { expr: 'lit', value: 0 },
      } as CompiledExpression;
      const context = createContext({}, { items: ['first', 'second', 'third'] });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('first');
    });

    it('should return undefined for out-of-bounds array index', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'items' },
        key: { expr: 'lit', value: 10 },
      } as CompiledExpression;
      const context = createContext({}, { items: ['first', 'second'] });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    // ==================== Nested Access on Result ====================

    it('should allow chained index access', () => {
      // Arrange
      // Equivalent to: matrix['row1']['col2']
      const expr = {
        expr: 'index',
        base: {
          expr: 'index',
          base: { expr: 'var', name: 'matrix' },
          key: { expr: 'lit', value: 'row1' },
        },
        key: { expr: 'lit', value: 'col2' },
      } as CompiledExpression;
      const context = createContext({}, {
        matrix: {
          row1: { col1: 'a', col2: 'b' },
          row2: { col1: 'c', col2: 'd' },
        },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('b');
    });

    it('should work with get expression on index result', () => {
      // Arrange
      // Equivalent to: users[selectedId].name
      const expr = {
        expr: 'get',
        base: {
          expr: 'index',
          base: { expr: 'var', name: 'users' },
          key: { expr: 'var', name: 'selectedId' },
        },
        path: 'name',
      } as CompiledExpression;
      const context = createContext({}, {
        users: {
          u1: { name: 'Alice', age: 30 },
          u2: { name: 'Bob', age: 25 },
        },
        selectedId: 'u2',
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Bob');
    });

    // ==================== Prototype Pollution Prevention ====================

    it('should block __proto__ as key', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'obj' },
        key: { expr: 'lit', value: '__proto__' },
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'test' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should block constructor as key', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'obj' },
        key: { expr: 'lit', value: 'constructor' },
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'test' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should block prototype as key', () => {
      // Arrange
      const expr = {
        expr: 'index',
        base: { expr: 'var', name: 'obj' },
        key: { expr: 'lit', value: 'prototype' },
      } as CompiledExpression;
      const context = createContext({}, { obj: { name: 'test' } });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
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
