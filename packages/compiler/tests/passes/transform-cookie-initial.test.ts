/**
 * Test module for transform pass - Cookie Expression Initial Value Support
 *
 * Coverage:
 * - Cookie expression in state initial value is preserved in CompiledProgram
 * - Default value is included when cookie expression is present
 * - Backwards compatible with primitive initial values
 *
 * TDD Red Phase: These tests will FAIL because cookie expression support
 * in state initial values is not yet implemented.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { transformPass, type CompiledProgram } from '../../src/passes/transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../../src/passes/analyze.js';

// ==================== Test Fixtures ====================

/**
 * Creates a minimal AST Program for testing
 */
function createAst(overrides: Partial<Program> = {}): Program {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  } as Program;
}

/**
 * Creates a minimal AnalysisContext for testing
 */
function createContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return {
    stateNames: new Set(),
    actionNames: new Set(),
    ...overrides,
  };
}

// ==================== Cookie Expression Initial Value Tests ====================

describe('transformPass - Cookie Expression Initial Value', () => {
  // ==================== Cookie expression preserved in CompiledProgram ====================

  describe('cookie expression is preserved in CompiledProgram', () => {
    /**
     * Given: A program with state initial as cookie expression
     * When: transformPass is called
     * Then: The initial value should be preserved as a cookie expression object
     */
    it('should preserve cookie expression in state initial value', () => {
      // Arrange
      const ast = createAst({
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'dark' },
          },
        },
      });
      const context = createContext({ stateNames: new Set(['theme']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['theme']).toBeDefined();
      expect(result.state['theme'].type).toBe('string');
      expect(result.state['theme'].initial).toEqual({
        expr: 'cookie',
        key: 'theme',
        default: 'dark',
      });
    });

    /**
     * Given: A program with multiple state fields, some with cookie expressions
     * When: transformPass is called
     * Then: Only the cookie expression fields should have expression objects as initial
     */
    it('should preserve cookie expression alongside primitive initial values', () => {
      // Arrange
      const ast = createAst({
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' },
          },
          count: {
            type: 'number',
            initial: 0,
          },
          name: {
            type: 'string',
            initial: 'Guest',
          },
        },
      });
      const context = createContext({
        stateNames: new Set(['theme', 'count', 'name']),
      });

      // Act
      const result = transformPass(ast, context);

      // Assert
      // Cookie expression initial
      expect(result.state['theme'].initial).toEqual({
        expr: 'cookie',
        key: 'theme',
        default: 'light',
      });
      // Primitive initials remain unchanged
      expect(result.state['count'].initial).toBe(0);
      expect(result.state['name'].initial).toBe('Guest');
    });

    /**
     * Given: A program with locale state using cookie expression
     * When: transformPass is called
     * Then: The cookie expression should be preserved with its key and default
     */
    it('should preserve cookie expression for non-theme state fields', () => {
      // Arrange
      const ast = createAst({
        state: {
          locale: {
            type: 'string',
            initial: { expr: 'cookie', key: 'user-locale', default: 'en-US' },
          },
        },
      });
      const context = createContext({ stateNames: new Set(['locale']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['locale'].initial).toEqual({
        expr: 'cookie',
        key: 'user-locale',
        default: 'en-US',
      });
    });
  });

  // ==================== Default value is used when cookie expression is present ====================

  describe('default value handling', () => {
    /**
     * Given: A cookie expression with a default value
     * When: transformPass is called
     * Then: The default value should be preserved in the expression
     */
    it('should preserve default value in cookie expression', () => {
      // Arrange
      const ast = createAst({
        state: {
          colorScheme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'color-scheme', default: 'system' },
          },
        },
      });
      const context = createContext({ stateNames: new Set(['colorScheme']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      const initial = result.state['colorScheme'].initial as {
        expr: string;
        key: string;
        default: string;
      };
      expect(initial.default).toBe('system');
    });

    /**
     * Given: A cookie expression with empty string as default
     * When: transformPass is called
     * Then: The empty string default should be preserved
     */
    it('should preserve empty string as default value', () => {
      // Arrange
      const ast = createAst({
        state: {
          sessionId: {
            type: 'string',
            initial: { expr: 'cookie', key: 'session', default: '' },
          },
        },
      });
      const context = createContext({ stateNames: new Set(['sessionId']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      const initial = result.state['sessionId'].initial as {
        expr: string;
        key: string;
        default: string;
      };
      expect(initial.default).toBe('');
    });

    /**
     * Given: Multiple cookie expressions with different defaults
     * When: transformPass is called
     * Then: Each expression should retain its own default value
     */
    it('should preserve distinct default values for multiple cookie expressions', () => {
      // Arrange
      const ast = createAst({
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'dark' },
          },
          locale: {
            type: 'string',
            initial: { expr: 'cookie', key: 'locale', default: 'ja-JP' },
          },
          timezone: {
            type: 'string',
            initial: { expr: 'cookie', key: 'tz', default: 'Asia/Tokyo' },
          },
        },
      });
      const context = createContext({
        stateNames: new Set(['theme', 'locale', 'timezone']),
      });

      // Act
      const result = transformPass(ast, context);

      // Assert
      const themeInitial = result.state['theme'].initial as { default: string };
      const localeInitial = result.state['locale'].initial as { default: string };
      const timezoneInitial = result.state['timezone'].initial as { default: string };

      expect(themeInitial.default).toBe('dark');
      expect(localeInitial.default).toBe('ja-JP');
      expect(timezoneInitial.default).toBe('Asia/Tokyo');
    });
  });

  // ==================== Backwards compatibility with primitive initial values ====================

  describe('backwards compatibility with primitive initial values', () => {
    /**
     * Given: A program with only primitive initial values (no cookie expressions)
     * When: transformPass is called
     * Then: The primitive values should be preserved as-is (existing behavior)
     */
    it('should preserve primitive string initial values', () => {
      // Arrange
      const ast = createAst({
        state: {
          message: { type: 'string', initial: 'Hello, World!' },
        },
      });
      const context = createContext({ stateNames: new Set(['message']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['message'].initial).toBe('Hello, World!');
    });

    /**
     * Given: A program with number initial value
     * When: transformPass is called
     * Then: The number value should be preserved as-is
     */
    it('should preserve primitive number initial values', () => {
      // Arrange
      const ast = createAst({
        state: {
          count: { type: 'number', initial: 42 },
        },
      });
      const context = createContext({ stateNames: new Set(['count']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['count'].initial).toBe(42);
    });

    /**
     * Given: A program with boolean initial value
     * When: transformPass is called
     * Then: The boolean value should be preserved as-is
     */
    it('should preserve primitive boolean initial values', () => {
      // Arrange
      const ast = createAst({
        state: {
          isEnabled: { type: 'boolean', initial: true },
          isHidden: { type: 'boolean', initial: false },
        },
      });
      const context = createContext({
        stateNames: new Set(['isEnabled', 'isHidden']),
      });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['isEnabled'].initial).toBe(true);
      expect(result.state['isHidden'].initial).toBe(false);
    });

    /**
     * Given: A program with list initial value
     * When: transformPass is called
     * Then: The array value should be preserved as-is
     */
    it('should preserve primitive list initial values', () => {
      // Arrange
      const ast = createAst({
        state: {
          items: { type: 'list', initial: ['a', 'b', 'c'] },
        },
      });
      const context = createContext({ stateNames: new Set(['items']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['items'].initial).toEqual(['a', 'b', 'c']);
    });

    /**
     * Given: A program with object initial value
     * When: transformPass is called
     * Then: The object value should be preserved as-is
     */
    it('should preserve primitive object initial values', () => {
      // Arrange
      const ast = createAst({
        state: {
          config: { type: 'object', initial: { key: 'value', nested: { a: 1 } } },
        },
      });
      const context = createContext({ stateNames: new Set(['config']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state['config'].initial).toEqual({
        key: 'value',
        nested: { a: 1 },
      });
    });

    /**
     * Given: A program mixing cookie expressions and primitive values
     * When: transformPass is called
     * Then: Both should be correctly handled without interference
     */
    it('should handle mixed cookie expressions and primitive values correctly', () => {
      // Arrange
      const ast = createAst({
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'dark' },
          },
          count: { type: 'number', initial: 0 },
          items: { type: 'list', initial: [] },
          isActive: { type: 'boolean', initial: false },
          locale: {
            type: 'string',
            initial: { expr: 'cookie', key: 'locale', default: 'en' },
          },
        },
      });
      const context = createContext({
        stateNames: new Set(['theme', 'count', 'items', 'isActive', 'locale']),
      });

      // Act
      const result = transformPass(ast, context);

      // Assert
      // Cookie expressions
      expect(result.state['theme'].initial).toEqual({
        expr: 'cookie',
        key: 'theme',
        default: 'dark',
      });
      expect(result.state['locale'].initial).toEqual({
        expr: 'cookie',
        key: 'locale',
        default: 'en',
      });
      // Primitives
      expect(result.state['count'].initial).toBe(0);
      expect(result.state['items'].initial).toEqual([]);
      expect(result.state['isActive'].initial).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: A cookie expression with special characters in key
     * When: transformPass is called
     * Then: The key should be preserved exactly as specified
     */
    it('should preserve cookie key with special characters', () => {
      // Arrange
      const ast = createAst({
        state: {
          preference: {
            type: 'string',
            initial: { expr: 'cookie', key: 'user-pref_v2', default: 'default' },
          },
        },
      });
      const context = createContext({ stateNames: new Set(['preference']) });

      // Act
      const result = transformPass(ast, context);

      // Assert
      const initial = result.state['preference'].initial as { key: string };
      expect(initial.key).toBe('user-pref_v2');
    });

    /**
     * Given: A state with empty state object
     * When: transformPass is called
     * Then: Result state should be empty (no error)
     */
    it('should handle empty state object', () => {
      // Arrange
      const ast = createAst({
        state: {},
      });
      const context = createContext();

      // Act
      const result = transformPass(ast, context);

      // Assert
      expect(result.state).toEqual({});
    });
  });
});
