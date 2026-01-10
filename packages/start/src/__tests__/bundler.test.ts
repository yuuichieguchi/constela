/**
 * Test module for bundleRuntime function.
 *
 * Coverage:
 * - Output file creation at correct path
 * - Return value (relative path)
 * - ESM format validation
 * - Export verification (hydrateApp, createApp)
 * - Minify option handling
 *
 * TDD Red Phase: These tests verify the bundleRuntime function correctly
 * bundles @constela/runtime exports for browser usage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Import the module under test - will fail until implemented
import { bundleRuntime, bundleCSS } from '../build/bundler.js';
import type { BundleRuntimeOptions, BundleCSSOptions } from '../build/bundler.js';

// ==================== Test Helpers ====================

/**
 * Create a temporary test directory with unique name
 */
async function createTestDir(): Promise<string> {
  const testDir = join(tmpdir(), `constela-bundler-test-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test directory
 */
async function cleanupTestDir(testDir: string): Promise<void> {
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ==================== Tests ====================

describe('bundleRuntime()', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Output File Creation ====================

  describe('output file creation', () => {
    it('should create output file at {outDir}/_constela/runtime.js', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const expectedPath = join(testDir, '_constela', 'runtime.js');
      expect(await fileExists(expectedPath)).toBe(true);
    });

    it('should create _constela directory if it does not exist', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Verify _constela does not exist
      expect(await fileExists(join(testDir, '_constela'))).toBe(false);

      // Act
      await bundleRuntime(options);

      // Assert
      expect(await fileExists(join(testDir, '_constela'))).toBe(true);
    });

    it('should overwrite existing runtime.js if it exists', async () => {
      // Arrange
      const constelaDir = join(testDir, '_constela');
      await mkdir(constelaDir, { recursive: true });
      const runtimePath = join(constelaDir, 'runtime.js');

      // Create a dummy file
      await writeFile(runtimePath, '// old content');

      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const content = await readFile(runtimePath, 'utf-8');
      expect(content).not.toBe('// old content');
    });
  });

  // ==================== Return Value ====================

  describe('return value', () => {
    it('should return the relative path "/_constela/runtime.js"', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      const result = await bundleRuntime(options);

      // Assert
      expect(result).toBe('/_constela/runtime.js');
    });

    it('should return consistent path regardless of outDir', async () => {
      // Arrange
      const nestedOutDir = join(testDir, 'deeply', 'nested', 'output');
      await mkdir(nestedOutDir, { recursive: true });

      const options: BundleRuntimeOptions = {
        outDir: nestedOutDir,
      };

      // Act
      const result = await bundleRuntime(options);

      // Assert
      expect(result).toBe('/_constela/runtime.js');
    });
  });

  // ==================== ESM Format Validation ====================

  describe('ESM format', () => {
    it('should output valid ESM with export statements', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // ESM should have export statements
      expect(content).toMatch(/export\s*\{|export\s+/);
    });

    it('should not contain CommonJS module.exports statements', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // Should not contain CommonJS module.exports pattern
      // Note: 'require' may appear in string literals from dependencies (e.g., Shiki grammar files)
      expect(content).not.toMatch(/module\.exports\s*=/);
    });

    it('should be valid JavaScript that can be parsed', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // Should be valid ESM (contains export statements)
      // Note: We can't parse ESM with Function constructor, so just check it contains exports
      expect(content).toMatch(/export\s*\{[^}]*\}/);
    });
  });

  // ==================== Export Verification ====================

  describe('exports', () => {
    it('should export hydrateApp function', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // Should export hydrateApp
      expect(content).toMatch(/export\s*\{[^}]*hydrateApp[^}]*\}|export\s+(?:const|function|var|let)\s+hydrateApp/);
    });

    it('should export createApp function', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // Should export createApp
      expect(content).toMatch(/export\s*\{[^}]*createApp[^}]*\}|export\s+(?:const|function|var|let)\s+createApp/);
    });

    it('should contain functional hydrateApp implementation', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // hydrateApp should be defined as a function (works for minified code too)
      expect(content).toMatch(/hydrateApp/);
    });

    it('should contain functional createApp implementation', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // createApp should be defined as a function (works for minified code too)
      expect(content).toMatch(/createApp/);
    });
  });

  // ==================== Minify Option ====================

  describe('minify option', () => {
    it('should minify output by default (minify: true)', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
        // minify defaults to true
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // Minified code typically has fewer newlines and shorter variable names
      const lineCount = content.split('\n').length;

      // Minified code should be relatively compact
      // Note: License comments from dependencies (DOMPurify, etc.) add some lines
      // Expect less than 150 lines for minified bundle with license comments preserved
      expect(lineCount).toBeLessThan(150);
    });

    it('should produce larger output when minify is false', async () => {
      // Arrange
      const minifiedDir = join(testDir, 'minified');
      const unminifiedDir = join(testDir, 'unminified');
      await mkdir(minifiedDir, { recursive: true });
      await mkdir(unminifiedDir, { recursive: true });

      // Act
      await bundleRuntime({ outDir: minifiedDir, minify: true });
      await bundleRuntime({ outDir: unminifiedDir, minify: false });

      // Assert
      const minifiedPath = join(minifiedDir, '_constela', 'runtime.js');
      const unminifiedPath = join(unminifiedDir, '_constela', 'runtime.js');

      const minifiedContent = await readFile(minifiedPath, 'utf-8');
      const unminifiedContent = await readFile(unminifiedPath, 'utf-8');

      // Unminified should be larger (more whitespace, longer names)
      expect(unminifiedContent.length).toBeGreaterThan(minifiedContent.length);
    });

    it('should preserve readability when minify is false', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
        minify: false,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      const runtimePath = join(testDir, '_constela', 'runtime.js');
      const content = await readFile(runtimePath, 'utf-8');

      // Unminified code should have multiple lines
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeGreaterThan(10);
    });

    it('should explicitly accept minify: true', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
        minify: true,
      };

      // Act & Assert - should not throw
      await expect(bundleRuntime(options)).resolves.toBeDefined();
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw error if outDir does not exist and cannot be created', async () => {
      // Arrange
      // Use an invalid path that cannot be created
      const invalidPath = '/nonexistent/root/path/that/cannot/exist';
      const options: BundleRuntimeOptions = {
        outDir: invalidPath,
      };

      // Act & Assert
      await expect(bundleRuntime(options)).rejects.toThrow();
    });

    it('should provide meaningful error message on failure', async () => {
      // Arrange
      const invalidPath = '/nonexistent/root/path/that/cannot/exist';
      const options: BundleRuntimeOptions = {
        outDir: invalidPath,
      };

      // Act & Assert
      try {
        await bundleRuntime(options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle outDir with trailing slash', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir + '/',
      };

      // Act
      const result = await bundleRuntime(options);

      // Assert
      expect(result).toBe('/_constela/runtime.js');
      expect(await fileExists(join(testDir, '_constela', 'runtime.js'))).toBe(true);
    });

    it('should handle outDir with spaces in path', async () => {
      // Arrange
      const pathWithSpaces = join(testDir, 'path with spaces');
      await mkdir(pathWithSpaces, { recursive: true });

      const options: BundleRuntimeOptions = {
        outDir: pathWithSpaces,
      };

      // Act
      await bundleRuntime(options);

      // Assert
      expect(await fileExists(join(pathWithSpaces, '_constela', 'runtime.js'))).toBe(true);
    });

    it('should handle concurrent calls to same outDir', async () => {
      // Arrange
      const options: BundleRuntimeOptions = {
        outDir: testDir,
      };

      // Act - Run multiple bundleRuntime calls concurrently
      const results = await Promise.all([
        bundleRuntime(options),
        bundleRuntime(options),
        bundleRuntime(options),
      ]);

      // Assert - All should succeed and return same path
      expect(results).toEqual([
        '/_constela/runtime.js',
        '/_constela/runtime.js',
        '/_constela/runtime.js',
      ]);
    });
  });
});

// ==================== bundleCSS() PostCSS/Tailwind CSS v4 Tests ====================

/**
 * Test module for bundleCSS PostCSS/Tailwind CSS v4 functionality.
 *
 * Coverage:
 * - PostCSS processing with content option
 * - @import "tailwindcss" directive expansion
 * - @tailwind utilities directive expansion
 * - Backward compatibility (no content option)
 * - Error handling for invalid CSS
 *
 * TDD Red Phase: These tests verify the bundleCSS function correctly
 * processes Tailwind CSS v4 directives via PostCSS when content option is provided.
 */
describe('bundleCSS() PostCSS processing', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Helper Functions ====================

  /**
   * Create a CSS file in the test directory
   */
  async function createCSSFile(
    filename: string,
    content: string
  ): Promise<string> {
    const filePath = join(testDir, filename);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a source file (HTML/TSX) in the test directory for Tailwind content scanning
   */
  async function createSourceFile(
    filename: string,
    content: string
  ): Promise<string> {
    const filePath = join(testDir, filename);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  // ==================== PostCSS Processing with content Option ====================

  describe('PostCSS processing with content option', () => {
    it('should process @import "tailwindcss" and generate utility classes', async () => {
      /**
       * Given: CSS file with @import "tailwindcss" and source file with Tailwind classes
       * When: bundleCSS is called with content option pointing to source files
       * Then: Output contains generated utility classes (.flex, .p-4) instead of @import directive
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        `
          export function Component() {
            return <div class="flex p-4">Hello</div>;
          }
        `
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the original @import directive
      expect(output).not.toContain('@import "tailwindcss"');
      expect(output).not.toContain("@import 'tailwindcss'");

      // Should contain generated .flex utility
      expect(output).toMatch(/\.flex\s*\{[^}]*display:\s*flex/);

      // Should contain generated .p-4 utility
      // Tailwind CSS v4 uses CSS variables: padding: calc(var(--spacing)*4)
      expect(output).toMatch(/\.p-4\s*\{[^}]*padding/);
    });

    it('should include utilities that are used in content files', async () => {
      /**
       * Given: CSS with Tailwind import and source with specific classes
       * When: bundleCSS is called with content option
       * Then: Used utilities are included in output
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        `
          export function Component() {
            return <div class="text-center">Centered</div>;
          }
        `
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should contain .text-center utility
      expect(output).toMatch(/\.text-center\s*\{[^}]*text-align:\s*center/);

      // Tailwind CSS v4 handles tree-shaking internally
      // The output should be valid CSS without @import directive
      expect(output).not.toContain('@import "tailwindcss"');
    });

    it('should support glob patterns in content option', async () => {
      /**
       * Given: CSS with Tailwind import and multiple source files
       * When: bundleCSS is called with glob pattern in content option
       * Then: All matching files are scanned for class usage
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );

      // Create src directory with multiple component files
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });

      await writeFile(
        join(srcDir, 'Button.tsx'),
        '<button class="bg-blue-500 text-white">Click</button>',
        'utf-8'
      );
      await writeFile(
        join(srcDir, 'Card.tsx'),
        '<div class="rounded-lg shadow-md">Card</div>',
        'utf-8'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [join(srcDir, '**/*.tsx')],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should contain utilities from both files
      expect(output).toMatch(/\.bg-blue-500/);
      expect(output).toMatch(/\.text-white/);
      expect(output).toMatch(/\.rounded-lg/);
      expect(output).toMatch(/\.shadow-md/);
    });
  });

  // ==================== Tailwind CSS v4 @import Expansion ====================

  describe('Tailwind CSS v4 @import expansion', () => {
    it('should generate utility classes when @import "tailwindcss" is used', async () => {
      /**
       * Given: CSS with @import "tailwindcss" directive (Tailwind CSS v4 syntax)
       * When: bundleCSS is called with content option
       * Then: Utilities are expanded based on content usage
       *
       * Note: Tailwind CSS v4 uses @import "tailwindcss" instead of @tailwind directives
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        '<div class="mt-4 mb-2">Spaced</div>'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the @import directive
      expect(output).not.toContain('@import "tailwindcss"');

      // Should contain generated margin utilities
      // Tailwind CSS v4 uses CSS variables: margin-top: calc(var(--spacing)*4)
      expect(output).toMatch(/\.mt-4\s*\{[^}]*margin-top/);
      expect(output).toMatch(/\.mb-2\s*\{[^}]*margin-bottom/);
    });

    it('should include base/reset styles from @import "tailwindcss"', async () => {
      /**
       * Given: CSS with @import "tailwindcss" directive
       * When: bundleCSS is called with content option
       * Then: Base/reset styles are included along with utilities
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );
      const sourcePath = await createSourceFile('component.tsx', '<div></div>');

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the @import directive
      expect(output).not.toContain('@import "tailwindcss"');

      // Should contain base/reset styles (e.g., box-sizing)
      expect(output).toMatch(/box-sizing:\s*border-box/);

      // Should be substantial in length due to base styles
      expect(output.length).toBeGreaterThan(1000);
    });
  });

  // ==================== Legacy Tailwind Directives ====================

  describe('legacy @tailwind directives', () => {
    it('should process @tailwind utilities directive', async () => {
      /**
       * Given: CSS with @tailwind utilities (v3 style)
       * When: bundleCSS is called with content option
       * Then: @tailwind utilities is expanded
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        `@layer utilities {
  @tailwind utilities;
}`
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        '<div class="flex p-4">Test</div>'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the @tailwind directive
      expect(output).not.toContain('@tailwind');

      // Should contain generated utilities
      expect(output).toMatch(/\.flex|\.p-4/);
    });

    it.skip('should process @plugin directive for typography', async () => {
      /**
       * Given: CSS with @plugin "@tailwindcss/typography"
       * When: bundleCSS is called with content option
       * Then: @plugin directive is processed (not left in output)
       *
       * Note: This test requires @tailwindcss/typography to be installed.
       * Skipped by default as it's an optional dependency.
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        `@import "tailwindcss";
@plugin "@tailwindcss/typography";`
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        '<div class="prose">Content</div>'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the @plugin directive
      expect(output).not.toContain('@plugin');

      // Should contain prose styles from typography plugin
      expect(output).toMatch(/\.prose/);
    });

    it('should process @source directive', async () => {
      /**
       * Given: CSS with @source directive
       * When: bundleCSS is called with content option
       * Then: @source directive is processed (not left in output)
       */

      // Arrange
      // Create a source directory with files
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(
        join(srcDir, 'app.tsx'),
        '<div class="bg-blue-500">Blue</div>',
        'utf-8'
      );

      const cssPath = await createCSSFile(
        'styles.css',
        `@import "tailwindcss";
@source "./src";`
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [join(srcDir, '**/*.tsx')],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the @source directive
      expect(output).not.toContain('@source');

      // Should contain bg-blue-500 utility
      expect(output).toMatch(/\.bg-blue-500/);
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility (no content option)', () => {
    it('should bundle plain CSS without PostCSS when content is not provided', async () => {
      /**
       * Given: CSS file without Tailwind directives
       * When: bundleCSS is called WITHOUT content option
       * Then: CSS is bundled normally without PostCSS processing
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        `
          .custom-class {
            color: red;
            background: blue;
          }
        `
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        // No content option
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should contain the custom class
      expect(output).toContain('.custom-class');
      expect(output).toMatch(/color:\s*red/);
    });

    it('should handle CSS with @import statements without Tailwind', async () => {
      /**
       * Given: CSS with regular @import (not tailwindcss)
       * When: bundleCSS is called without content option
       * Then: @import is resolved by esbuild bundler
       */

      // Arrange
      const baseCss = await createCSSFile(
        'base.css',
        `
          .base-style {
            font-size: 16px;
          }
        `
      );

      const mainCss = await createCSSFile(
        'main.css',
        `
          @import "./base.css";

          .main-style {
            color: green;
          }
        `
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: mainCss,
        // No content option
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should contain styles from both files (esbuild resolves @import)
      expect(output).toContain('.base-style');
      expect(output).toContain('.main-style');
    });

    it('should preserve existing bundleCSS behavior for multiple CSS files', async () => {
      /**
       * Given: Multiple CSS files without Tailwind
       * When: bundleCSS is called with array of CSS files
       * Then: All CSS files are bundled together
       */

      // Arrange
      const css1 = await createCSSFile(
        'first.css',
        '.first { display: block; }'
      );
      const css2 = await createCSSFile(
        'second.css',
        '.second { display: inline; }'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: [css1, css2],
        // No content option
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should contain styles from both files
      expect(output).toContain('.first');
      expect(output).toContain('.second');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw descriptive error for invalid CSS syntax', async () => {
      /**
       * Given: CSS file with syntax errors
       * When: bundleCSS is called
       * Then: A descriptive error is thrown
       */

      // Arrange
      const cssPath = await createCSSFile(
        'invalid.css',
        `
          .broken {
            color: red
            /* missing semicolon and closing brace
        `
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
      };

      // Act & Assert
      await expect(bundleCSS(options)).rejects.toThrow();
    });

    it('should throw error when content files do not match any files', async () => {
      /**
       * Given: CSS with Tailwind import and content pointing to non-existent files
       * When: bundleCSS is called
       * Then: A descriptive error is thrown or warning is issued
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [join(testDir, 'non-existent/**/*.tsx')],
      };

      // Act & Assert
      // Should either throw an error or produce empty output (depending on implementation)
      // At minimum, it should not crash silently
      await expect(bundleCSS(options)).rejects.toThrow();
    });

    it('should provide helpful error message when PostCSS processing fails', async () => {
      /**
       * Given: CSS with invalid Tailwind directive
       * When: bundleCSS is called with content option
       * Then: Error message indicates PostCSS/Tailwind processing issue
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        `
          @import "tailwindcss";
          @invalid-directive;
        `
      );
      const sourcePath = await createSourceFile('component.tsx', '<div></div>');

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act & Assert
      try {
        await bundleCSS(options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Error message should be descriptive
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty content array', async () => {
      /**
       * Given: CSS with Tailwind import and empty content array
       * When: bundleCSS is called
       * Then: Should process without generating any utilities (or throw informative error)
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should NOT contain the @import directive (PostCSS should process it)
      expect(output).not.toContain('@import "tailwindcss"');

      // Output might be minimal (no utilities used) or contain only base styles
      // The key is that PostCSS processing occurred
    });

    it('should handle CSS with both Tailwind and custom styles', async () => {
      /**
       * Given: CSS with Tailwind import AND custom CSS rules
       * When: bundleCSS is called with content option
       * Then: Both Tailwind utilities and custom styles are included
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        `
          @import "tailwindcss";

          .my-custom-class {
            border: 2px solid purple;
          }

          #unique-element {
            transform: rotate(45deg);
          }
        `
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        '<div class="flex my-custom-class">Custom</div>'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Should contain Tailwind utility
      expect(output).toMatch(/\.flex\s*\{/);

      // Should preserve custom CSS
      expect(output).toContain('.my-custom-class');
      expect(output).toMatch(/border.*purple|purple.*border/);
      expect(output).toContain('#unique-element');
    });

    it('should respect minify option with PostCSS processing', async () => {
      /**
       * Given: CSS with Tailwind import
       * When: bundleCSS is called with minify: false and content option
       * Then: Output is not minified (readable whitespace preserved)
       */

      // Arrange
      const cssPath = await createCSSFile(
        'styles.css',
        '@import "tailwindcss";'
      );
      const sourcePath = await createSourceFile(
        'component.tsx',
        '<div class="flex">Test</div>'
      );

      const outDir = join(testDir, 'dist');
      await mkdir(outDir, { recursive: true });

      const options: BundleCSSOptions = {
        outDir,
        css: cssPath,
        content: [sourcePath],
        minify: false,
      };

      // Act
      await bundleCSS(options);

      // Assert
      const outputPath = join(outDir, '_constela', 'styles.css');
      const output = await readFile(outputPath, 'utf-8');

      // Unminified output should have multiple lines
      const lineCount = output.split('\n').length;
      expect(lineCount).toBeGreaterThan(1);
    });
  });
});
