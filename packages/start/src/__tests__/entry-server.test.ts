/**
 * Test module for entry-server wrapHtml function.
 *
 * Coverage:
 * - runtimePath option: Replaces @constela/runtime imports with bundled runtime path
 * - importmap exclusion: Does not include importmap when runtimePath is provided
 * - Backward compatibility: Works normally without runtimePath option
 *
 * TDD Red Phase: These tests verify the runtimePath option for production builds.
 * The runtimePath option allows using a bundled runtime instead of bare module specifiers.
 */

import { describe, it, expect } from 'vitest';
import { wrapHtml, generateHydrationScript } from '../runtime/entry-server.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Minimal compiled program for testing
 */
const MINIMAL_PROGRAM: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Test' } }],
  },
};

/**
 * Generate a simple hydration script for testing
 */
function createTestHydrationScript(): string {
  return generateHydrationScript(MINIMAL_PROGRAM);
}

/**
 * Generate a hydration script with widgets (uses both hydrateApp and createApp)
 */
function createTestHydrationScriptWithWidgets(): string {
  const widget = {
    id: 'my-widget',
    program: MINIMAL_PROGRAM,
  };
  return generateHydrationScript(MINIMAL_PROGRAM, [widget]);
}

// ==================== wrapHtml runtimePath Tests ====================

describe('wrapHtml', () => {
  describe('runtimePath option', () => {
    // ==================== Import Replacement ====================

    it('should replace @constela/runtime import with runtimePath when provided', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const runtimePath = '/assets/runtime.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        runtimePath,
      });

      // Assert
      expect(result).toContain(`from '${runtimePath}'`);
      expect(result).not.toContain("from '@constela/runtime'");
    });

    it('should handle runtimePath with various import patterns (named exports)', () => {
      // Arrange
      const content = '<div>Hello</div>';
      // Script with multiple named exports: import { hydrateApp, createApp } from '@constela/runtime';
      const hydrationScript = createTestHydrationScriptWithWidgets();
      const runtimePath = '/dist/runtime.bundle.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        runtimePath,
      });

      // Assert
      // Should replace the import path but preserve the named imports
      expect(result).toContain('import { hydrateApp, createApp }');
      expect(result).toContain(`from '${runtimePath}'`);
      expect(result).not.toContain("from '@constela/runtime'");
    });

    it('should preserve other parts of hydrationScript when using runtimePath', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const runtimePath = '/assets/runtime.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        runtimePath,
      });

      // Assert
      // Should preserve program serialization and hydrateApp call
      expect(result).toContain('const program =');
      expect(result).toContain('hydrateApp(');
      expect(result).toContain("document.getElementById('app')");
    });

    // ==================== Import Map with runtimePath ====================

    it('should include importmap for external imports even when runtimePath is provided', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const importMap = {
        '@constela/runtime': '/node_modules/@constela/runtime/dist/index.js',
      };
      const runtimePath = '/assets/runtime.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        importMap,
        runtimePath,
      });

      // Assert
      // When runtimePath is provided with importMap, importmap should still be included
      // for external imports (e.g., esm.sh dependencies in playground)
      expect(result).toContain('<script type="importmap">');
      expect(result).toContain('"imports"');
      // runtimePath replacement should work
      expect(result).toContain(`from '${runtimePath}'`);
    });

    it('should include all external imports in importmap when runtimePath is provided', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const importMap = {
        '@constela/runtime': '/modules/runtime.js',
        'some-other-module': '/modules/other.js',
      };
      const runtimePath = '/bundled/runtime.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        importMap,
        runtimePath,
      });

      // Assert
      // importmap should be included for external imports
      expect(result).toContain('type="importmap"');
      expect(result).toContain('some-other-module');
      // runtimePath replacement should still work
      expect(result).toContain(`from '${runtimePath}'`);
    });

    // ==================== Backward Compatibility ====================

    it('should work normally without runtimePath (backward compatibility)', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const importMap = {
        '@constela/runtime': '/node_modules/@constela/runtime/dist/index.js',
      };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        importMap,
      });

      // Assert
      // Without runtimePath, should include importmap and keep original import
      expect(result).toContain('<script type="importmap">');
      expect(result).toContain('@constela/runtime');
      expect(result).toContain("from '@constela/runtime'");
    });

    it('should work with theme option alongside runtimePath', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const runtimePath = '/assets/runtime.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        theme: 'dark',
        runtimePath,
      });

      // Assert
      expect(result).toContain('<html class="dark">');
      expect(result).toContain(`from '${runtimePath}'`);
      expect(result).not.toContain("from '@constela/runtime'");
    });

    it('should preserve head content when using runtimePath', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const head = '<title>Test Page</title><link rel="stylesheet" href="/styles.css">';
      const runtimePath = '/assets/runtime.js';

      // Act
      const result = wrapHtml(content, hydrationScript, head, {
        runtimePath,
      });

      // Assert
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<link rel="stylesheet" href="/styles.css">');
      expect(result).toContain(`from '${runtimePath}'`);
    });

    // ==================== Edge Cases ====================

    it('should handle runtimePath with special characters in path', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const runtimePath = '/assets/runtime-v1.0.0.min.js';

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, {
        runtimePath,
      });

      // Assert
      expect(result).toContain(`from '${runtimePath}'`);
      expect(result).not.toContain("from '@constela/runtime'");
    });

    // ==================== Validation ====================

    it('should throw error for runtimePath with unsafe characters', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const maliciousPath = "'; alert('xss'); //";

      // Act & Assert
      expect(() =>
        wrapHtml(content, hydrationScript, undefined, {
          runtimePath: maliciousPath,
        })
      ).toThrow(/Invalid runtimePath/);
    });

    it('should throw error for runtimePath with quotes', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const pathWithQuotes = "/path/with'quote.js";

      // Act & Assert
      expect(() =>
        wrapHtml(content, hydrationScript, undefined, {
          runtimePath: pathWithQuotes,
        })
      ).toThrow(/Invalid runtimePath/);
    });

    it('should accept valid runtimePath patterns', () => {
      // Arrange
      const content = '<div>Hello</div>';
      const hydrationScript = createTestHydrationScript();
      const validPaths = [
        '/_constela/runtime.js',
        '/assets/runtime-1.0.0.min.js',
        '/path/to/deep/nested/file.js',
        '/runtime_v2.js',
      ];

      // Act & Assert
      for (const runtimePath of validPaths) {
        expect(() =>
          wrapHtml(content, hydrationScript, undefined, { runtimePath })
        ).not.toThrow();
      }
    });
  });
});
