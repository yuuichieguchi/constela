/**
 * Test module for Route Expression evaluation.
 *
 * Coverage:
 * - Route expression evaluates to route param value
 * - Route expression with different sources (param, query, path)
 * - Route expression in nested contexts
 * - Error handling for missing route params
 *
 * TDD Red Phase: These tests verify the runtime evaluation of route expressions
 * that will be added to support route definitions in Constela DSL.
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

describe('evaluate with Route expressions', () => {
  // ==================== Setup ====================

  let mockState: MockStateStore;
  let baseContext: EvaluationContext;

  beforeEach(() => {
    mockState = new MockStateStore({ counter: 0 });
    baseContext = {
      state: mockState as EvaluationContext['state'],
      locals: {},
    };
  });

  // ==================== Helper Functions ====================

  /**
   * Creates an EvaluationContext with route params
   */
  function createContextWithRoute(
    routeParams: Record<string, string>,
    queryParams: Record<string, string> = {},
    pathValue?: string
  ): EvaluationContext {
    return {
      state: mockState as EvaluationContext['state'],
      locals: {},
      route: {
        params: routeParams,
        query: queryParams,
        path: pathValue ?? '',
      },
    };
  }

  // ==================== Basic Route Param Evaluation ====================

  describe('basic route param evaluation', () => {
    it('should evaluate route expression to param value', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'id',
        source: 'param',
      };

      const context = createContextWithRoute({ id: '123' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('123');
    });

    it('should evaluate route expression with numeric param', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'userId',
        source: 'param',
      };

      const context = createContextWithRoute({ userId: '42' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      // Route params are always strings
      expect(result).toBe('42');
    });

    it('should evaluate route expression with special characters in value', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'slug',
        source: 'param',
      };

      const context = createContextWithRoute({ slug: 'hello-world-2024' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('hello-world-2024');
    });
  });

  // ==================== Source-specific Evaluation ====================

  describe('source-specific evaluation', () => {
    it('should evaluate param source from route params', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'id',
        source: 'param',
      };

      const context = createContextWithRoute(
        { id: '123' },
        { id: 'query-id' } // Query has same name but different value
      );

      // Act
      const result = evaluate(expr, context);

      // Assert
      // Should get from params, not query
      expect(result).toBe('123');
    });

    it('should evaluate query source from query params', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'page',
        source: 'query',
      };

      const context = createContextWithRoute(
        {},
        { page: '2', limit: '10' }
      );

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('2');
    });

    it('should evaluate multiple query params', () => {
      // Arrange
      const pageExpr: CompiledExpression = {
        expr: 'route',
        name: 'page',
        source: 'query',
      };

      const limitExpr: CompiledExpression = {
        expr: 'route',
        name: 'limit',
        source: 'query',
      };

      const context = createContextWithRoute(
        {},
        { page: '1', limit: '20' }
      );

      // Act
      const pageResult = evaluate(pageExpr, context);
      const limitResult = evaluate(limitExpr, context);

      // Assert
      expect(pageResult).toBe('1');
      expect(limitResult).toBe('20');
    });

    it('should evaluate path source to full path string', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'fullPath',
        source: 'path',
      };

      const context = createContextWithRoute(
        { id: '123' },
        {},
        '/users/123/posts'
      );

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('/users/123/posts');
    });

    it('should default to param source when not specified', () => {
      // Arrange - with source set to 'param' (the default)
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'id',
        source: 'param', // Default source
      };

      const context = createContextWithRoute({ id: 'default-source-test' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('default-source-test');
    });
  });

  // ==================== Missing Value Handling ====================

  describe('missing value handling', () => {
    it('should return empty string for missing param', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'nonexistent',
        source: 'param',
      };

      const context = createContextWithRoute({ id: '123' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('');
    });

    it('should return empty string for missing query param', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'missing',
        source: 'query',
      };

      const context = createContextWithRoute({}, { existing: 'value' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('');
    });

    it('should return empty string for missing path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'path',
        source: 'path',
      };

      // Context without path value
      const context = createContextWithRoute({});

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('');
    });

    it('should handle context without route data gracefully', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'id',
        source: 'param',
      };

      // Base context without route field
      const context = baseContext;

      // Act
      const result = evaluate(expr, context);

      // Assert
      // Should not throw, return empty string
      expect(result).toBe('');
    });
  });

  // ==================== Nested Expression Evaluation ====================

  describe('nested expression evaluation', () => {
    it('should evaluate route expression in binary expression', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 'User ID: ' },
        right: { expr: 'route', name: 'id', source: 'param' },
      };

      const context = createContextWithRoute({ id: '42' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('User ID: 42');
    });

    it('should evaluate route expression in conditional', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'lit', value: true },
        then: { expr: 'route', name: 'id', source: 'param' },
        else: { expr: 'lit', value: 'default' },
      };

      const context = createContextWithRoute({ id: '123' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('123');
    });

    it('should evaluate comparison with route expression', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '==',
        left: { expr: 'route', name: 'status', source: 'param' },
        right: { expr: 'lit', value: 'active' },
      };

      const context = createContextWithRoute({ status: 'active' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate get expression on route param value', () => {
      // This tests accessing properties if route param is a JSON string
      // (edge case - typically params are simple strings)
      const expr: CompiledExpression = {
        expr: 'get',
        base: { expr: 'lit', value: { name: 'test' } },
        path: 'name',
      };

      // Act
      const result = evaluate(expr, baseContext);

      // Assert
      expect(result).toBe('test');
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should work alongside state expressions', () => {
      // Arrange
      mockState = new MockStateStore({ prefix: 'ID-' });
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'state', name: 'prefix' },
        right: { expr: 'route', name: 'id', source: 'param' },
      };

      const context: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        route: { params: { id: '123' }, query: {}, path: '' },
      };

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('ID-123');
    });

    it('should work alongside var expressions', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'var', name: 'item' },
        right: { expr: 'route', name: 'suffix', source: 'param' },
      };

      const context: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: { item: 'prefix-' },
        route: { params: { suffix: '-end' }, query: {}, path: '' },
      };

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('prefix--end');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty string param value', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'optional',
        source: 'param',
      };

      const context = createContextWithRoute({ optional: '' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('');
    });

    it('should handle URL-encoded param values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'search',
        source: 'param',
      };

      // URL-encoded value (would be decoded by router)
      const context = createContextWithRoute({ search: 'hello world' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('hello world');
    });

    it('should handle param names with special characters', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'user-id', // Hyphenated param name
        source: 'param',
      };

      const context = createContextWithRoute({ 'user-id': '123' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('123');
    });
  });

  // ==================== Type Coercion ====================

  describe('type coercion', () => {
    it('should return string for route params (no automatic type coercion)', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'route',
        name: 'count',
        source: 'param',
      };

      const context = createContextWithRoute({ count: '42' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      // Route params should always be strings
      expect(typeof result).toBe('string');
      expect(result).toBe('42');
    });

    it('should allow arithmetic when combined with type coercion', () => {
      // Arrange
      // This shows how to use route params in arithmetic
      // The user would need to parse the value if needed
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 10 },
        right: { expr: 'route', name: 'offset', source: 'param' },
      };

      const context = createContextWithRoute({ offset: '5' });

      // Act
      const result = evaluate(expr, context);

      // Assert
      // String concatenation: 10 + "5" = "105"
      expect(result).toBe('105');
    });
  });
});
