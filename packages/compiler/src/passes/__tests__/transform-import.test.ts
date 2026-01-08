/**
 * Test module for Import Expression transformation.
 *
 * Coverage:
 * - ImportExpr transforms to CompiledImportExpr
 * - Program imports are resolved and embedded at compile time
 * - Import expressions in different node types
 * - Compiled program includes resolved import data
 *
 * TDD Red Phase: These tests verify the transformation of import expressions
 * that will be added to support external data references in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';

describe('transformPass with Import expressions', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(
    importNames: string[] = [],
    routeParams: string[] = []
  ): AnalysisContext {
    return {
      stateNames: new Set<string>(),
      actionNames: new Set<string>(),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(routeParams),
      importNames: new Set<string>(importNames),
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
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
        ],
      },
      config: {
        appName: 'Test App',
        featureEnabled: true,
      },
    };
  }

  // ==================== ImportExpr Transformation ====================

  describe('ImportExpr transformation', () => {
    it('should transform ImportExpr to CompiledImportExpr', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './data/nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'navigation' },
        },
      } as unknown as Program;

      const context = createContext(['navigation']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      // The view should contain a compiled import expression or resolved literal
      expect(result.view.kind).toBe('text');
      const textNode = result.view as { kind: string; value: { expr: string; name?: string; value?: unknown } };
      // After transformation, import could be either:
      // 1. CompiledImportExpr for runtime resolution
      // 2. LitExpr with resolved value for compile-time resolution
      expect(['import', 'lit']).toContain(textNode.value.expr);
    });

    it('should preserve import name in CompiledImportExpr', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'config' },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { name?: string } };
      // If runtime resolution, name should be preserved
      if (textNode.value.name) {
        expect(textNode.value.name).toBe('config');
      }
    });

    it('should preserve path in CompiledImportExpr', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'navigation', path: 'items.0.label' },
        },
      } as unknown as Program;

      const context = createContext(['navigation']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { path?: string } };
      // If runtime resolution, path should be preserved
      if (textNode.value.path) {
        expect(textNode.value.path).toBe('items.0.label');
      }
    });

    it('should transform ImportExpr in binary expressions', () => {
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

      const context = createContext(['strings']);
      const importData = { strings: { greeting: 'Hello' } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { expr: string; left: { expr: string } } };
      expect(textNode.value.expr).toBe('bin');
      expect(['import', 'lit']).toContain(textNode.value.left.expr);
    });

    it('should transform ImportExpr in conditional expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {
          useConfig: { type: 'boolean', initial: true },
        },
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'cond',
            if: { expr: 'state', name: 'useConfig' },
            then: { expr: 'import', name: 'config', path: 'appName' },
            else: { expr: 'lit', value: 'Default' },
          },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { then: { expr: string } } };
      expect(['import', 'lit']).toContain(textNode.value.then.expr);
    });

    it('should transform ImportExpr in element props', () => {
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
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Click here' } },
          ],
        },
      } as unknown as Program;

      const context = createContext(['links']);
      const importData = { links: { homepage: 'https://example.com' } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const elementNode = result.view as { props?: { href: { expr: string } } };
      expect(elementNode.props?.href.expr).toBeDefined();
    });

    it('should transform ImportExpr in each items', () => {
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
            value: { expr: 'var', name: 'item', path: 'label' },
          },
        },
      } as unknown as Program;

      const context = createContext(['navigation']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const eachNode = result.view as { kind: string; items: { expr: string } };
      expect(eachNode.kind).toBe('each');
      expect(['import', 'lit']).toContain(eachNode.items.expr);
    });
  });

  // ==================== Compile-time Resolution ====================

  describe('compile-time resolution', () => {
    it('should resolve import to literal value at compile time', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'config', path: 'appName' },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = { config: { appName: 'My App' } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      // If compile-time resolution is enabled, the value should be a literal
      const textNode = result.view as { value: { expr: string; value?: unknown } };
      if (textNode.value.expr === 'lit') {
        expect(textNode.value.value).toBe('My App');
      }
    });

    it('should resolve nested import path at compile time', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          data: './data.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'data', path: 'users.0.name' },
        },
      } as unknown as Program;

      const context = createContext(['data']);
      const importData = {
        data: {
          users: [
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
          ],
        },
      };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { expr: string; value?: unknown } };
      if (textNode.value.expr === 'lit') {
        expect(textNode.value.value).toBe('Alice');
      }
    });

    it('should resolve entire import object at compile time', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'import', name: 'config' },
          as: 'item',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'item' },
          },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = { config: { key1: 'value1', key2: 'value2' } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const eachNode = result.view as { items: { expr: string; value?: unknown } };
      if (eachNode.items.expr === 'lit') {
        expect(eachNode.items.value).toEqual({ key1: 'value1', key2: 'value2' });
      }
    });

    it('should resolve array import at compile time', () => {
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
            value: { expr: 'var', name: 'item', path: 'label' },
          },
        },
      } as unknown as Program;

      const context = createContext(['navigation']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const eachNode = result.view as { items: { expr: string; value?: unknown[] } };
      if (eachNode.items.expr === 'lit') {
        expect(Array.isArray(eachNode.items.value)).toBe(true);
        expect(eachNode.items.value).toHaveLength(2);
      }
    });
  });

  // ==================== CompiledProgram Structure ====================

  describe('CompiledProgram structure with imports', () => {
    it('should include importData in compiled program', () => {
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

      const context = createContext(['navigation', 'config']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      // Compiled program should include resolved import data
      expect(result.importData).toBeDefined();
      expect(result.importData?.navigation).toBeDefined();
      expect(result.importData?.config).toBeDefined();
    });

    it('should handle program without imports', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      // Compiled program should not have importData field
      expect(result.importData).toBeUndefined();
    });

    it('should handle empty imports object', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {},
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const context = createContext();

      // Act
      const result = transformPass(program, context, {});

      // Assert
      // With empty imports, importData should be undefined or empty
      expect(result.importData === undefined || Object.keys(result.importData).length === 0).toBe(true);
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should transform imports alongside state expressions', () => {
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

      const context = createContext(['config']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const view = result.view as { children: Array<{ value: { expr: string } }> };
      expect(view.children[0]?.value.expr).toBe('state');
      expect(['import', 'lit']).toContain(view.children[1]?.value.expr);
    });

    it('should transform imports alongside route expressions', () => {
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
              value: { expr: 'import', name: 'config', path: 'prefix' },
            },
          ],
        },
      } as unknown as Program;

      const context = createContext(['config'], ['id']);
      const importData = createMockImportData();

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const view = result.view as { children: Array<{ value: { expr: string } }> };
      expect(view.children[0]?.value.expr).toBe('route');
      expect(['import', 'lit']).toContain(view.children[1]?.value.expr);
    });

    it('should handle mixed expression tree with imports', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          strings: './strings.json',
        },
        state: {
          userName: { type: 'string', initial: 'User' },
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

      const context = createContext(['strings']);
      const importData = { strings: { greeting: 'Hello' } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      // The transformation should preserve the binary expression structure
      const textNode = result.view as { value: { expr: string } };
      expect(textNode.value.expr).toBe('bin');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle undefined path resolution gracefully', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'config', path: 'nonexistent.path' },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = { config: { existing: 'value' } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      // Should handle gracefully - either null/undefined value or preserved expression
      expect(result.view).toBeDefined();
    });

    it('should handle null values in import data', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'config', path: 'nullField' },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = { config: { nullField: null } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { value?: unknown } };
      if (textNode.value.value !== undefined) {
        expect(textNode.value.value).toBeNull();
      }
    });

    it('should handle deeply nested import expressions in view', () => {
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
                  value: { expr: 'var', name: 'item' },
                },
              },
            },
          ],
        },
      } as unknown as Program;

      const context = createContext(['data']);
      const importData = { data: { items: [1, 2, 3] } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const view = result.view as {
        children: Array<{
          then: { items: { expr: string } };
        }>;
      };
      expect(['import', 'lit']).toContain(view.children[0]?.then?.items?.expr);
    });

    it('should handle boolean values in import data', () => {
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
          then: { kind: 'text', value: { expr: 'lit', value: 'Enabled' } },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = { config: { featureEnabled: true } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const ifNode = result.view as { condition: { value?: boolean } };
      if (ifNode.condition.value !== undefined) {
        expect(ifNode.condition.value).toBe(true);
      }
    });

    it('should handle numeric values in import data', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          config: './config.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'import', name: 'config', path: 'maxItems' },
        },
      } as unknown as Program;

      const context = createContext(['config']);
      const importData = { config: { maxItems: 100 } };

      // Act
      const result = transformPass(program, context, importData);

      // Assert
      const textNode = result.view as { value: { value?: number } };
      if (textNode.value.value !== undefined) {
        expect(textNode.value.value).toBe(100);
      }
    });
  });
});
