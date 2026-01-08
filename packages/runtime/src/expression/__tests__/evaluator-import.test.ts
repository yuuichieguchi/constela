/**
 * Test module for Import Expression evaluation.
 *
 * Coverage:
 * - Import expression evaluates to imported data value
 * - Import expression with path accesses nested data
 * - Import expression returns undefined for missing paths
 * - Error handling for missing imports
 *
 * TDD Red Phase: These tests verify the runtime evaluation of import expressions
 * that will be added to support external data references in Constela DSL.
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

describe('evaluate with Import expressions', () => {
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
   * Creates an EvaluationContext with import data
   */
  function createContextWithImports(
    importData: Record<string, unknown>
  ): EvaluationContext {
    return {
      state: mockState as EvaluationContext['state'],
      locals: {},
      imports: importData,
    };
  }

  /**
   * Creates mock import data for testing
   */
  function createMockImportData(): Record<string, unknown> {
    return {
      navigation: {
        title: 'Main Navigation',
        items: [
          { label: 'Home', href: '/', active: true },
          { label: 'About', href: '/about', active: false },
          { label: 'Contact', href: '/contact', active: false },
        ],
      },
      config: {
        appName: 'Test App',
        theme: 'dark',
        maxItems: 100,
        featureEnabled: true,
        nullValue: null,
      },
      strings: {
        greeting: 'Hello',
        farewell: 'Goodbye',
        nested: {
          deep: {
            value: 'Deep nested value',
          },
        },
      },
    };
  }

  // ==================== Basic Import Evaluation ====================

  describe('basic import evaluation', () => {
    it('should evaluate import expression to entire imported data', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual(importData.config);
    });

    it('should evaluate import expression with path to nested value', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'appName',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Test App');
    });

    it('should evaluate import expression with numeric path for array access', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'navigation',
        path: 'items.0',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual({ label: 'Home', href: '/', active: true });
    });

    it('should evaluate import expression with deep nested path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'strings',
        path: 'nested.deep.value',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Deep nested value');
    });

    it('should evaluate import expression with array item property path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'navigation',
        path: 'items.1.label',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('About');
    });
  });

  // ==================== Different Value Types ====================

  describe('different value types', () => {
    it('should evaluate string values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'theme',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('dark');
    });

    it('should evaluate numeric values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'maxItems',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBe(100);
    });

    it('should evaluate boolean values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'featureEnabled',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should evaluate null values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'nullValue',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeNull();
    });

    it('should evaluate array values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'navigation',
        path: 'items',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBe(3);
    });

    it('should evaluate object values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'strings',
        path: 'nested',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(typeof result).toBe('object');
      expect(result).toEqual({ deep: { value: 'Deep nested value' } });
    });
  });

  // ==================== Missing Value Handling ====================

  describe('missing value handling', () => {
    it('should return undefined for missing import name', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'nonexistent',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing path in import data', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'nonexistentProperty',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for deep missing path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'deeply.nested.missing.path',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for out of bounds array index', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'navigation',
        path: 'items.99',
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle context without imports data gracefully', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
      };

      // Base context without imports field
      const context = baseContext;

      // Act
      const result = evaluate(expr, context);

      // Assert
      // Should not throw, return undefined
      expect(result).toBeUndefined();
    });

    it('should handle empty imports object', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
      };

      const context = createContextWithImports({});

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==================== Nested Expression Evaluation ====================

  describe('nested expression evaluation', () => {
    it('should evaluate import expression in binary expression', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'import', name: 'strings', path: 'greeting' },
        right: { expr: 'lit', value: ', World!' },
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Hello, World!');
    });

    it('should evaluate import expression in conditional', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'import', name: 'config', path: 'featureEnabled' },
        then: { expr: 'lit', value: 'Feature is ON' },
        else: { expr: 'lit', value: 'Feature is OFF' },
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Feature is ON');
    });

    it('should evaluate comparison with import expression', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '==',
        left: { expr: 'import', name: 'config', path: 'theme' },
        right: { expr: 'lit', value: 'dark' },
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate numeric comparison with import expression', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '>',
        left: { expr: 'import', name: 'config', path: 'maxItems' },
        right: { expr: 'lit', value: 50 },
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate not expression with import boolean', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'not',
        operand: { expr: 'import', name: 'config', path: 'featureEnabled' },
      };

      const importData = createMockImportData();
      const context = createContextWithImports(importData);

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should work alongside state expressions', () => {
      // Arrange
      mockState = new MockStateStore({ prefix: 'App: ' });
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'state', name: 'prefix' },
        right: { expr: 'import', name: 'config', path: 'appName' },
      };

      const importData = createMockImportData();
      const context: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        imports: importData,
      };

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('App: Test App');
    });

    it('should work alongside var expressions', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'var', name: 'item' },
        right: { expr: 'import', name: 'strings', path: 'farewell' },
      };

      const importData = createMockImportData();
      const context: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: { item: 'Prefix - ' },
        imports: importData,
      };

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Prefix - Goodbye');
    });

    it('should work alongside route expressions', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'import', name: 'strings', path: 'greeting' },
        right: { expr: 'route', name: 'userName', source: 'param' },
      };

      const importData = createMockImportData();
      const context: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        imports: importData,
        route: {
          params: { userName: ' Alice' },
          query: {},
          path: '/users/Alice',
        },
      };

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Hello Alice');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'emptyString',
      };

      const context = createContextWithImports({
        config: { emptyString: '' },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('');
    });

    it('should handle zero numeric values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'zero',
      };

      const context = createContextWithImports({
        config: { zero: 0 },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle false boolean values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'disabled',
      };

      const context = createContextWithImports({
        config: { disabled: false },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle empty array values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'emptyArray',
      };

      const context = createContextWithImports({
        config: { emptyArray: [] },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty object values', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'emptyObject',
      };

      const context = createContextWithImports({
        config: { emptyObject: {} },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle special characters in import names', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'nav-data',
        path: 'title',
      };

      const context = createContextWithImports({
        'nav-data': { title: 'Navigation' },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('Navigation');
    });

    it('should handle special characters in path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'special-key',
      };

      const context = createContextWithImports({
        config: { 'special-key': 'special value' },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe('special value');
    });
  });

  // ==================== Prototype Pollution Prevention ====================

  describe('prototype pollution prevention', () => {
    it('should prevent __proto__ access in path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: '__proto__',
      };

      const context = createContextWithImports({
        config: { value: 'test' },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should prevent constructor access in path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'constructor',
      };

      const context = createContextWithImports({
        config: { value: 'test' },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should prevent prototype access in nested path', () => {
      // Arrange
      const expr: CompiledExpression = {
        expr: 'import',
        name: 'config',
        path: 'nested.__proto__.polluted',
      };

      const context = createContextWithImports({
        config: { nested: { value: 'test' } },
      });

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
