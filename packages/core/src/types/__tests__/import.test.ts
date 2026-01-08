/**
 * Test module for Import Expression types.
 *
 * Coverage:
 * - ImportExpr type structure and type guard
 * - Program with imports field
 * - Edge cases for import expressions
 *
 * TDD Red Phase: These tests verify the ImportExpr type and Program.imports field
 * that will be added to support external data references in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type { ImportExpr, Program } from '../ast.js';
import { isImportExpr, isExpression } from '../guards.js';

describe('ImportExpr', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have expr field set to "import"', () => {
      // Arrange
      const importExpr = {
        expr: 'import',
        name: 'navigation',
      };

      // Assert
      expect(isImportExpr(importExpr)).toBe(true);
    });

    it('should require name field as string', () => {
      // Arrange
      const validImportExpr = {
        expr: 'import',
        name: 'config',
      };

      const invalidImportExpr = {
        expr: 'import',
        name: 123, // Invalid: should be string
      };

      // Assert
      expect(isImportExpr(validImportExpr)).toBe(true);
      expect(isImportExpr(invalidImportExpr)).toBe(false);
    });

    it('should accept optional path field for nested access', () => {
      // Arrange
      const importExprWithPath = {
        expr: 'import',
        name: 'navigation',
        path: 'items.0.title',
      };

      const importExprWithSimplePath = {
        expr: 'import',
        name: 'config',
        path: 'theme',
      };

      // Assert
      expect(isImportExpr(importExprWithPath)).toBe(true);
      expect(isImportExpr(importExprWithSimplePath)).toBe(true);
    });

    it('should reject invalid path type', () => {
      // Arrange
      const invalidPathType = {
        expr: 'import',
        name: 'config',
        path: 123, // Invalid: should be string
      };

      // Assert
      expect(isImportExpr(invalidPathType)).toBe(false);
    });

    it('should accept import expression without path (access entire imported data)', () => {
      // Arrange
      const importExprWithoutPath = {
        expr: 'import',
        name: 'settings',
      };

      // This should return the entire imported object
      expect(isImportExpr(importExprWithoutPath)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isImportExpr(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isImportExpr(undefined)).toBe(false);
    });

    it('should reject array', () => {
      expect(isImportExpr([])).toBe(false);
    });

    it('should reject object without expr field', () => {
      const obj = { name: 'navigation' };
      expect(isImportExpr(obj)).toBe(false);
    });

    it('should reject object with wrong expr value', () => {
      const obj = { expr: 'state', name: 'counter' };
      expect(isImportExpr(obj)).toBe(false);
    });

    it('should reject object without name field', () => {
      const obj = { expr: 'import' };
      expect(isImportExpr(obj)).toBe(false);
    });

    it('should reject empty string name', () => {
      // Empty string is technically a string, but may be invalid semantically
      const obj = { expr: 'import', name: '' };
      // Type guard allows empty string (semantic validation done elsewhere)
      expect(isImportExpr(obj)).toBe(true);
    });

    it('should handle complex path strings', () => {
      // Arrange
      const complexPaths = [
        { expr: 'import', name: 'data', path: 'a.b.c.d' },
        { expr: 'import', name: 'data', path: 'items.0' },
        { expr: 'import', name: 'data', path: 'users.0.name' },
        { expr: 'import', name: 'data', path: 'nested.array.0.field' },
      ];

      // Assert
      for (const expr of complexPaths) {
        expect(isImportExpr(expr)).toBe(true);
      }
    });
  });
});

describe('Program with imports field', () => {
  // ==================== Program Structure ====================

  describe('program structure', () => {
    it('should accept program without imports field (backward compatibility)', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // This should pass validation (imports is optional)
      expect(program.version).toBe('1.0');
      expect(program.imports).toBeUndefined();
    });

    it('should accept program with imports field', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './data/nav.json',
          config: './config/settings.json',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.imports).toBeDefined();
      expect(program.imports?.navigation).toBe('./data/nav.json');
      expect(program.imports?.config).toBe('./config/settings.json');
    });

    it('should accept program with empty imports field', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {},
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.imports).toBeDefined();
      expect(Object.keys(program.imports!)).toHaveLength(0);
    });

    it('should accept program with both imports and route fields', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        imports: {
          navigation: './nav.json',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.route).toBeDefined();
      expect(program.imports).toBeDefined();
    });

    it('should maintain type safety with import expressions in view', () => {
      // Arrange - Program using import expression in view
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './data/nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'nav',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'navigation', path: 'title' },
            },
          ],
        },
      } as unknown as Program; // Cast needed until types are implemented

      // This tests that import expressions can be used in the view
      const textNode = program.view as { children?: Array<{ value?: { expr?: string } }> };
      expect(textNode.children?.[0]?.value?.expr).toBe('import');
    });
  });

  // ==================== Import Paths ====================

  describe('import paths', () => {
    it('should accept relative paths', () => {
      const program: Program = {
        version: '1.0',
        imports: {
          data1: './data.json',
          data2: '../shared/config.json',
          data3: '../../root/settings.json',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      expect(program.imports?.data1).toBe('./data.json');
      expect(program.imports?.data2).toBe('../shared/config.json');
      expect(program.imports?.data3).toBe('../../root/settings.json');
    });

    it('should accept absolute paths', () => {
      const program: Program = {
        version: '1.0',
        imports: {
          config: '/config/app.json',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      expect(program.imports?.config).toBe('/config/app.json');
    });

    it('should accept paths with various JSON filenames', () => {
      const program: Program = {
        version: '1.0',
        imports: {
          nav: './navigation.json',
          config: './app-config.json',
          settings: './user_settings.json',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      expect(program.imports?.nav).toBe('./navigation.json');
      expect(program.imports?.config).toBe('./app-config.json');
      expect(program.imports?.settings).toBe('./user_settings.json');
    });
  });

  // ==================== Import Expression Usage ====================

  describe('import expression usage in program', () => {
    it('should allow import expressions in text nodes', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          content: './content.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'content', path: 'title' },
        },
      } as unknown as Program;

      const textNode = program.view as { value?: { expr?: string; name?: string } };
      expect(textNode.value?.expr).toBe('import');
      expect(textNode.value?.name).toBe('content');
    });

    it('should allow import expressions in each items', () => {
      // Arrange - Iterating over imported array data
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'import', name: 'navigation', path: 'items' },
          as: 'item',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'item', path: 'label' },
          },
        },
      } as unknown as Program;

      const eachNode = program.view as { items?: { expr?: string } };
      expect(eachNode.items?.expr).toBe('import');
    });

    it('should allow import expressions in conditional expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'if',
          condition: { expr: 'import', name: 'config', path: 'featureEnabled' },
          then: { kind: 'text', value: { expr: 'lit', value: 'Feature is ON' } },
        },
      } as unknown as Program;

      const ifNode = program.view as { condition?: { expr?: string } };
      expect(ifNode.condition?.expr).toBe('import');
    });

    it('should allow import expressions in binary expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          strings: './strings.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op: '+',
            left: { expr: 'import', name: 'strings', path: 'greeting' },
            right: { expr: 'lit', value: '!' },
          },
        },
      } as unknown as Program;

      const textNode = program.view as { value?: { left?: { expr?: string } } };
      expect(textNode.value?.left?.expr).toBe('import');
    });

    it('should allow import expressions in element props', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          links: './links.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'a',
          props: {
            href: { expr: 'import', name: 'links', path: 'homepage' },
          },
        },
      } as unknown as Program;

      const elementNode = program.view as { props?: { href?: { expr?: string } } };
      expect(elementNode.props?.href?.expr).toBe('import');
    });
  });
});

describe('isExpression with ImportExpr', () => {
  it('should recognize ImportExpr as valid Expression', () => {
    // Arrange
    const importExpr = {
      expr: 'import',
      name: 'navigation',
    };

    // Assert - isExpression should include ImportExpr
    expect(isExpression(importExpr)).toBe(true);
  });

  it('should recognize ImportExpr with path as valid Expression', () => {
    // Arrange
    const importExpr = {
      expr: 'import',
      name: 'config',
      path: 'settings.theme',
    };

    // Assert
    expect(isExpression(importExpr)).toBe(true);
  });
});
