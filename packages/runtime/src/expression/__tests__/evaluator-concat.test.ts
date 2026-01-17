/**
 * Test module for Concat Expression evaluation.
 *
 * Coverage:
 * - Concatenate literal strings
 * - Concatenate with variable expression
 * - Concatenate with state expression
 * - null/undefined items treated as empty string
 * - Numbers converted to strings
 * - Empty items array
 * - Single item
 *
 * TDD Red Phase: These tests verify the runtime evaluation of concat expressions
 * that will be added to support string concatenation in Constela DSL.
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

describe('evaluate with Concat expressions', () => {
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

  // ==================== Basic Concat Evaluation ====================

  describe('basic concat evaluation', () => {
    it('should concatenate literal strings', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Hello' },
          { expr: 'lit', value: ' World' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Hello World');
    });

    it('should concatenate with variable expression', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Name: ' },
          { expr: 'var', name: 'username' },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, { username: 'Alice' });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Name: Alice');
    });

    it('should concatenate with state expression', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Count: ' },
          { expr: 'state', name: 'count' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ count: 42 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Count: 42');
    });
  });

  // ==================== Null/Undefined Handling ====================

  describe('null/undefined handling', () => {
    it('should treat null items as empty string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'a' },
          { expr: 'lit', value: null },
          { expr: 'lit', value: 'b' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('ab');
    });

    it('should treat undefined variable as empty string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'a' },
          { expr: 'var', name: 'missing' },
          { expr: 'lit', value: 'b' },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, {}); // empty locals

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('ab');
    });

    it('should treat undefined state as empty string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'prefix-' },
          { expr: 'state', name: 'nonexistent' },
          { expr: 'lit', value: '-suffix' },
        ],
      } as CompiledExpression;
      const ctx = createContext({}); // empty state

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('prefix--suffix');
    });
  });

  // ==================== Type Conversion ====================

  describe('type conversion', () => {
    it('should convert numbers to strings', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 123 },
          { expr: 'lit', value: 456 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('123456');
    });

    it('should convert boolean to string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Active: ' },
          { expr: 'lit', value: true },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Active: true');
    });

    it('should convert zero to string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Value: ' },
          { expr: 'lit', value: 0 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Value: 0');
    });

    it('should convert false to string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Enabled: ' },
          { expr: 'lit', value: false },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Enabled: false');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should return empty string for empty items array', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('');
    });

    it('should return single item value as string', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [{ expr: 'lit', value: 'solo' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('solo');
    });

    it('should handle many items', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'a' },
          { expr: 'lit', value: 'b' },
          { expr: 'lit', value: 'c' },
          { expr: 'lit', value: 'd' },
          { expr: 'lit', value: 'e' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('abcde');
    });

    it('should handle empty string items', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'start' },
          { expr: 'lit', value: '' },
          { expr: 'lit', value: 'end' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('startend');
    });
  });

  // ==================== Nested Expression Evaluation ====================

  describe('nested expression evaluation', () => {
    it('should evaluate nested concat in concat', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Start-' },
          {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'Inner' },
              { expr: 'lit', value: 'Part' },
            ],
          },
          { expr: 'lit', value: '-End' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Start-InnerPart-End');
    });

    it('should evaluate conditional in concat items', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Status: ' },
          {
            expr: 'cond',
            if: { expr: 'state', name: 'isActive' },
            then: { expr: 'lit', value: 'Active' },
            else: { expr: 'lit', value: 'Inactive' },
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({ isActive: true });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Status: Active');
    });

    it('should evaluate binary expression in concat items', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Sum: ' },
          {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 10 },
            right: { expr: 'lit', value: 20 },
          },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Sum: 30');
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should work with route expression', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'User: ' },
          { expr: 'route', name: 'userId', source: 'param' },
        ],
      } as CompiledExpression;
      const ctx: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        route: {
          params: { userId: '12345' },
          query: {},
          path: '/users/12345',
        },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('User: 12345');
    });

    it('should work with import expression', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'App: ' },
          { expr: 'import', name: 'config', path: 'appName' },
        ],
      } as CompiledExpression;
      const ctx: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        imports: {
          config: { appName: 'MyApp' },
        },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('App: MyApp');
    });

    it('should work with get expression', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Name: ' },
          {
            expr: 'get',
            base: { expr: 'var', name: 'user' },
            path: 'name',
          },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, { user: { name: 'Bob' } });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Name: Bob');
    });
  });

  // ==================== Real-world Use Cases ====================

  describe('real-world use cases', () => {
    it('should build URL with dynamic segments', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: '/api/users/' },
          { expr: 'state', name: 'userId' },
          { expr: 'lit', value: '/posts' },
        ],
      } as CompiledExpression;
      const ctx = createContext({ userId: 42 });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('/api/users/42/posts');
    });

    it('should build CSS class names', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'btn btn-' },
          { expr: 'var', name: 'variant' },
          { expr: 'lit', value: ' btn-' },
          { expr: 'var', name: 'size' },
        ],
      } as CompiledExpression;
      const ctx = createContext({}, { variant: 'primary', size: 'lg' });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('btn btn-primary btn-lg');
    });

    it('should build formatted message with multiple variables', () => {
      // Arrange
      const expr = {
        expr: 'concat',
        items: [
          { expr: 'lit', value: 'Hello ' },
          { expr: 'var', name: 'firstName' },
          { expr: 'lit', value: ' ' },
          { expr: 'var', name: 'lastName' },
          { expr: 'lit', value: ', you have ' },
          { expr: 'state', name: 'messageCount' },
          { expr: 'lit', value: ' new messages.' },
        ],
      } as CompiledExpression;
      const ctx = createContext(
        { messageCount: 5 },
        { firstName: 'John', lastName: 'Doe' }
      );

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Hello John Doe, you have 5 new messages.');
    });
  });
});
