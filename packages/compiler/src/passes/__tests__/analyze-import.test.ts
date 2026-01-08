/**
 * Test module for Import Expression analysis.
 *
 * Coverage:
 * - Import expression validation against defined imports
 * - Error when import expression references undefined import
 * - Import expressions in different contexts (view, each, if)
 * - Import path validation
 *
 * TDD Red Phase: These tests verify the semantic analysis of import expressions
 * that will be added to support external data references in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program } from '@constela/core';

describe('analyzePass with Import expressions', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program for testing import analysis
   */
  function createProgramWithImport(
    imports: Record<string, string>,
    importExprName: string,
    importExprPath?: string
  ): Program {
    const importExpr = importExprPath
      ? { expr: 'import' as const, name: importExprName, path: importExprPath }
      : { expr: 'import' as const, name: importExprName };

    return {
      version: '1.0',
      imports,
      state: {},
      actions: [],
      view: {
        kind: 'text',
        value: importExpr,
      },
    } as unknown as Program; // Cast needed until types are implemented
  }

  // ==================== Valid Import References ====================

  describe('valid import references', () => {
    it('should accept import expression referencing defined import', () => {
      // Arrange
      // imports: { navigation: './nav.json' } defines 'navigation'
      const program = createProgramWithImport(
        { navigation: './data/nav.json' },
        'navigation'
      );

      // Act
      const result = analyzePass(program);

      // Assert
      // Should pass without errors when import expr references valid import
      expect(result.ok).toBe(true);
    });

    it('should accept import expression with path for nested access', () => {
      // Arrange
      const program = createProgramWithImport(
        { config: './config.json' },
        'config',
        'settings.theme'
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept multiple import definitions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
          config: './config.json',
          strings: './i18n/en.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'navigation', path: 'title' },
            },
            {
              kind: 'text',
              value: { expr: 'import', name: 'config', path: 'appName' },
            },
            {
              kind: 'text',
              value: { expr: 'import', name: 'strings', path: 'greeting' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept import expression without path (access entire data)', () => {
      // Arrange
      const program = createProgramWithImport(
        { data: './data.json' },
        'data'
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Invalid Import References ====================

  describe('invalid import references', () => {
    it('should reject import expression referencing undefined import', () => {
      // Arrange
      // imports: { navigation: '...' } only defines 'navigation', not 'config'
      const program = createProgramWithImport(
        { navigation: './nav.json' },
        'config' // Undefined import name
      );

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail with UNDEFINED_IMPORT error
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_IMPORT');
      }
    });

    it('should reject import expression when no imports are defined', () => {
      // Arrange
      // Program without imports field but using import expression
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'navigation' },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail because import expression used without imports definition
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('IMPORTS_NOT_DEFINED');
      }
    });

    it('should reject import expression with empty imports object', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {},
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'navigation' },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_IMPORT');
      }
    });

    it('should provide meaningful error path for undefined import', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'unknownImport' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Error path should point to the specific expression location
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/view/children/0/value');
      }
    });

    it('should collect multiple undefined import errors', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'unknown1' },
            },
            {
              kind: 'text',
              value: { expr: 'import', name: 'unknown2' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ==================== Import Expressions in Different Contexts ====================

  describe('import expressions in different contexts', () => {
    it('should validate import expressions in each items', () => {
      // Arrange
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
            value: { expr: 'var', name: 'item' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined import in each items', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'import', name: 'unknownData', path: 'items' },
          as: 'item',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'item' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/view/items');
      }
    });

    it('should validate import expressions in if condition', () => {
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
          then: { kind: 'text', value: { expr: 'lit', value: 'Feature ON' } },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined import in if condition', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {},
        state: {},
        actions: [],
        view: {
          kind: 'if',
          condition: { expr: 'import', name: 'config', path: 'enabled' },
          then: { kind: 'text', value: { expr: 'lit', value: 'ON' } },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/view/condition');
      }
    });

    it('should validate import expressions nested in binary expressions', () => {
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
            left: { expr: 'import', name: 'strings', path: 'prefix' },
            right: { expr: 'lit', value: ' - suffix' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate import expressions in conditional expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
          strings: './strings.json',
        },
        state: {
          useDefault: { type: 'boolean', initial: false },
        },
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'cond',
            if: { expr: 'state', name: 'useDefault' },
            then: { expr: 'import', name: 'strings', path: 'defaultMessage' },
            else: { expr: 'import', name: 'config', path: 'customMessage' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate import expressions in element props', () => {
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

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined import in element props', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {},
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'a',
          props: {
            href: { expr: 'import', name: 'links', path: 'url' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
    });
  });

  // ==================== Import Names Collection ====================

  describe('import names collection', () => {
    it('should include import names in analysis context', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
          config: './config.json',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Context should include importNames
      if (result.ok) {
        expect(result.context.importNames.has('navigation')).toBe(true);
        expect(result.context.importNames.has('config')).toBe(true);
      }
    });

    it('should return empty set for programs without imports', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Act
      const result = analyzePass(program);

      // Assert
      if (result.ok) {
        expect(result.context.importNames.size).toBe(0);
      }
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should work alongside state expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'count' },
            },
            {
              kind: 'text',
              value: { expr: 'import', name: 'config', path: 'title' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should work alongside route expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'route', name: 'id' },
            },
            {
              kind: 'text',
              value: { expr: 'import', name: 'config', path: 'userPrefix' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate mixed expression tree with imports', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          strings: './strings.json',
        },
        state: {
          userName: { type: 'string', initial: '' },
        },
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op: '+',
            left: {
              expr: 'bin',
              op: '+',
              left: { expr: 'import', name: 'strings', path: 'greeting' },
              right: { expr: 'lit', value: ', ' },
            },
            right: { expr: 'state', name: 'userName' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle import names with special characters', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          'nav-data': './nav.json',
          'config_settings': './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'nav-data' },
            },
            {
              kind: 'text',
              value: { expr: 'import', name: 'config_settings' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle deeply nested import expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          data: './data.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'lit', value: true },
              then: {
                kind: 'each',
                items: { expr: 'import', name: 'data', path: 'items' },
                as: 'item',
                body: {
                  kind: 'text',
                  value: {
                    expr: 'bin',
                    op: '+',
                    left: { expr: 'import', name: 'data', path: 'prefix' },
                    right: { expr: 'var', name: 'item' },
                  },
                },
              },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle import path with array indices', () => {
      // Arrange
      const program = createProgramWithImport(
        { data: './data.json' },
        'data',
        'items.0.name'
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});
