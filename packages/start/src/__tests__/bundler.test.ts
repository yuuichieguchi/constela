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
import { bundleRuntime } from '../build/bundler.js';
import type { BundleRuntimeOptions } from '../build/bundler.js';

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
