/**
 * Test module for JSON $ref Resolution.
 *
 * Coverage:
 * - Basic $ref resolution with JSON Pointer
 * - Nested path $ref resolution
 * - Multiple $refs in an object
 * - Objects without $ref remain unchanged
 * - Invalid $ref paths throw errors
 *
 * TDD Red Phase: These tests verify the $ref resolution functionality
 * for JSON files loaded by the data loader.
 */

import { describe, it, expect } from 'vitest';
import { resolveJsonRefs } from '../../src/data/loader.js';

describe('resolveJsonRefs', () => {
  // ==================== Basic $ref Resolution ====================

  describe('basic $ref resolution', () => {
    it('should resolve $ref pointing to array element by index', () => {
      // Arrange
      const json = {
        examples: [
          { slug: 'counter', title: 'Counter' },
          { slug: 'todo', title: 'Todo' },
        ],
        items: {
          counter: { $ref: '#/examples/0' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.items.counter).toEqual({ slug: 'counter', title: 'Counter' });
    });

    it('should resolve $ref pointing to object property', () => {
      // Arrange
      const json = {
        definitions: {
          user: { name: 'John', age: 30 },
        },
        data: {
          currentUser: { $ref: '#/definitions/user' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.data.currentUser).toEqual({ name: 'John', age: 30 });
    });

    it('should resolve $ref at root level', () => {
      // Arrange
      const json = {
        shared: { value: 42 },
        ref: { $ref: '#/shared' },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.ref).toEqual({ value: 42 });
    });
  });

  // ==================== Nested Path $ref Resolution ====================

  describe('nested path $ref resolution', () => {
    it('should resolve $ref to deeply nested property', () => {
      // Arrange
      const json = {
        examples: [
          { slug: 'counter', code: { language: 'typescript', content: 'const x = 1;' } },
        ],
        items: {
          counterCode: { $ref: '#/examples/0/code' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.items.counterCode).toEqual({
        language: 'typescript',
        content: 'const x = 1;',
      });
    });

    it('should resolve $ref to primitive value', () => {
      // Arrange
      const json = {
        examples: [
          { slug: 'counter', title: 'Counter Example' },
        ],
        metadata: {
          firstTitle: { $ref: '#/examples/0/title' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.metadata.firstTitle).toBe('Counter Example');
    });

    it('should resolve $ref through multiple levels of nesting', () => {
      // Arrange
      const json = {
        config: {
          database: {
            connection: {
              host: 'localhost',
              port: 5432,
            },
          },
        },
        settings: {
          dbHost: { $ref: '#/config/database/connection/host' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.settings.dbHost).toBe('localhost');
    });
  });

  // ==================== Multiple $refs in Object ====================

  describe('multiple $refs in object', () => {
    it('should resolve multiple $refs in the same object', () => {
      // Arrange
      const json = {
        examples: [
          { slug: 'counter', title: 'Counter' },
          { slug: 'todo', title: 'Todo' },
        ],
        items: {
          first: { $ref: '#/examples/0' },
          second: { $ref: '#/examples/1' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.items.first).toEqual({ slug: 'counter', title: 'Counter' });
      expect(result.items.second).toEqual({ slug: 'todo', title: 'Todo' });
    });

    it('should resolve $refs in deeply nested structures', () => {
      // Arrange
      const json = {
        templates: {
          header: { type: 'header', content: 'Welcome' },
          footer: { type: 'footer', content: 'Goodbye' },
        },
        pages: {
          home: {
            sections: {
              top: { $ref: '#/templates/header' },
              bottom: { $ref: '#/templates/footer' },
            },
          },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.pages.home.sections.top).toEqual({ type: 'header', content: 'Welcome' });
      expect(result.pages.home.sections.bottom).toEqual({ type: 'footer', content: 'Goodbye' });
    });

    it('should resolve $refs in array elements', () => {
      // Arrange
      const json = {
        components: {
          button: { type: 'button', label: 'Click' },
          input: { type: 'input', placeholder: 'Type here' },
        },
        layout: [
          { $ref: '#/components/button' },
          { $ref: '#/components/input' },
        ],
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.layout[0]).toEqual({ type: 'button', label: 'Click' });
      expect(result.layout[1]).toEqual({ type: 'input', placeholder: 'Type here' });
    });
  });

  // ==================== Objects Without $ref ====================

  describe('objects without $ref remain unchanged', () => {
    it('should return object unchanged when no $ref exists', () => {
      // Arrange
      const json = {
        examples: [
          { slug: 'counter', title: 'Counter' },
        ],
        items: {
          counter: { slug: 'counter', title: 'Counter' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result).toEqual(json);
    });

    it('should preserve non-$ref properties in mixed objects', () => {
      // Arrange
      const json = {
        shared: { value: 100 },
        data: {
          name: 'Test',
          count: 5,
          reference: { $ref: '#/shared' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.data.name).toBe('Test');
      expect(result.data.count).toBe(5);
      expect(result.data.reference).toEqual({ value: 100 });
    });

    it('should handle empty objects', () => {
      // Arrange
      const json = {};

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle arrays without $ref', () => {
      // Arrange
      const json = {
        items: [
          { name: 'first' },
          { name: 'second' },
        ],
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result).toEqual(json);
    });
  });

  // ==================== Invalid $ref Paths ====================

  describe('invalid $ref paths throw errors', () => {
    it('should throw error for non-existent path', () => {
      // Arrange
      const json = {
        examples: [],
        items: {
          missing: { $ref: '#/examples/0' },
        },
      };

      // Act & Assert
      expect(() => resolveJsonRefs(json)).toThrow(/invalid.*\$ref/i);
    });

    it('should throw error for path to non-existent property', () => {
      // Arrange
      const json = {
        data: { name: 'test' },
        ref: { $ref: '#/data/nonexistent' },
      };

      // Act & Assert
      expect(() => resolveJsonRefs(json)).toThrow(/invalid.*\$ref/i);
    });

    it('should throw error for malformed $ref path without leading #', () => {
      // Arrange
      const json = {
        data: { value: 1 },
        ref: { $ref: '/data/value' },
      };

      // Act & Assert
      expect(() => resolveJsonRefs(json)).toThrow(/invalid.*\$ref/i);
    });

    it('should throw error for $ref with invalid JSON Pointer syntax', () => {
      // Arrange
      const json = {
        data: { value: 1 },
        ref: { $ref: '#data.value' },
      };

      // Act & Assert
      expect(() => resolveJsonRefs(json)).toThrow(/invalid.*\$ref/i);
    });

    it('should throw error when $ref points to itself (circular reference)', () => {
      // Arrange
      const json = {
        self: { $ref: '#/self' },
      };

      // Act & Assert
      expect(() => resolveJsonRefs(json)).toThrow(/circular|invalid.*\$ref/i);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle $ref to null value', () => {
      // Arrange
      const json = {
        nullable: null,
        ref: { $ref: '#/nullable' },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.ref).toBeNull();
    });

    it('should handle $ref to boolean value', () => {
      // Arrange
      const json = {
        flag: true,
        ref: { $ref: '#/flag' },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.ref).toBe(true);
    });

    it('should handle $ref to number value', () => {
      // Arrange
      const json = {
        count: 42,
        ref: { $ref: '#/count' },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.ref).toBe(42);
    });

    it('should handle escaped characters in JSON Pointer (tilde encoding)', () => {
      // Arrange
      // JSON Pointer: ~ is encoded as ~0, / is encoded as ~1
      const json = {
        'special/key': { value: 'slash' },
        'tilde~key': { value: 'tilde' },
        refs: {
          slashRef: { $ref: '#/special~1key' },
          tildeRef: { $ref: '#/tilde~0key' },
        },
      };

      // Act
      const result = resolveJsonRefs(json);

      // Assert
      expect(result.refs.slashRef).toEqual({ value: 'slash' });
      expect(result.refs.tildeRef).toEqual({ value: 'tilde' });
    });

    it('should not modify the original object', () => {
      // Arrange
      const json = {
        shared: { value: 100 },
        ref: { $ref: '#/shared' },
      };
      const originalJson = JSON.parse(JSON.stringify(json));

      // Act
      resolveJsonRefs(json);

      // Assert
      expect(json).toEqual(originalJson);
    });
  });
});
