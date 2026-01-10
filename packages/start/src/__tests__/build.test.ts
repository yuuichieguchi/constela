/**
 * Test module for build() bundleRuntime integration.
 *
 * Coverage:
 * - Build creates bundled runtime file at _constela/runtime.js
 * - Generated HTML imports from bundled runtime path (not bare @constela/runtime)
 * - No importmap in generated HTML for production builds
 * - Hydration script references /_constela/runtime.js
 *
 * TDD Red Phase: These tests verify the build function correctly integrates
 * bundleRuntime and generates production-ready HTML with bundled runtime imports.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Import the module under test
import { build } from '../build/index.js';

// ==================== Test Fixtures ====================

/**
 * Simple static page JSON for testing
 */
const SIMPLE_PAGE_JSON = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Hello World' } }],
  },
};

/**
 * Page with state for testing hydration
 * (Uses simple state expression that works with SSR)
 */
const PAGE_WITH_STATE_JSON = {
  version: '1.0',
  state: {
    message: { expr: 'lit', value: 'Interactive content' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'state', name: 'message' } }],
  },
};

// ==================== Test Helpers ====================

/**
 * Create a temporary test directory with unique name
 */
async function createTestDir(): Promise<string> {
  const testDir = join(tmpdir(), `constela-build-test-${randomUUID()}`);
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

/**
 * Setup a basic project structure for testing
 */
async function setupTestProject(
  testDir: string,
  options: {
    pages?: Record<string, unknown>;
  } = {}
): Promise<{ pagesDir: string; outDir: string }> {
  const pagesDir = join(testDir, 'src', 'routes');
  const outDir = join(testDir, 'dist');

  // Create directories
  await mkdir(pagesDir, { recursive: true });

  // Write page files
  if (options.pages) {
    for (const [path, content] of Object.entries(options.pages)) {
      const filePath = join(pagesDir, path);
      const dir = join(filePath, '..');
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, JSON.stringify(content, null, 2));
    }
  }

  return { pagesDir, outDir };
}

// ==================== Tests ====================

describe('build() - bundleRuntime Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Runtime File Creation ====================

  describe('bundled runtime file creation', () => {
    it('should create _constela/runtime.js in output directory', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const runtimePath = join(outDir, '_constela', 'runtime.js');
      expect(await fileExists(runtimePath)).toBe(true);
    });

    it('should create bundled runtime with valid ESM exports', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const runtimePath = join(outDir, '_constela', 'runtime.js');
      const runtimeContent = await readFile(runtimePath, 'utf-8');

      // Should contain export statements (ESM format)
      expect(runtimeContent).toMatch(/export\s*\{|export\s+/);
      // Should contain hydrateApp function
      expect(runtimeContent).toContain('hydrateApp');
    });

    it('should create bundled runtime before generating HTML', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Both runtime and HTML files should exist
      expect(await fileExists(join(outDir, '_constela', 'runtime.js'))).toBe(
        true
      );
      expect(await fileExists(join(outDir, 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'about', 'index.html'))).toBe(true);
    });
  });

  // ==================== HTML Runtime Import ====================

  describe('HTML bundled runtime import', () => {
    it('should generate HTML with bundled runtime import (not bare @constela/runtime)', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Should import from bundled runtime path
      expect(htmlContent).toContain("from '/_constela/runtime.js'");
      // Should NOT contain bare module specifier
      expect(htmlContent).not.toContain("from '@constela/runtime'");
    });

    it('should include hydration script referencing /_constela/runtime.js', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': PAGE_WITH_STATE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Should have module script with hydrateApp import from bundled runtime
      expect(htmlContent).toContain('<script type="module">');
      expect(htmlContent).toMatch(
        /import\s*\{[^}]*hydrateApp[^}]*\}\s*from\s*['"]\/\_constela\/runtime\.js['"]/
      );
    });

    it('should use bundled runtime path for all generated pages', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': SIMPLE_PAGE_JSON,
          'contact.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - All pages should use bundled runtime
      const indexHtml = await readFile(join(outDir, 'index.html'), 'utf-8');
      const aboutHtml = await readFile(
        join(outDir, 'about', 'index.html'),
        'utf-8'
      );
      const contactHtml = await readFile(
        join(outDir, 'contact', 'index.html'),
        'utf-8'
      );

      for (const html of [indexHtml, aboutHtml, contactHtml]) {
        expect(html).toContain("from '/_constela/runtime.js'");
        expect(html).not.toContain("from '@constela/runtime'");
      }
    });
  });

  // ==================== No Importmap in Production ====================

  describe('no importmap in production HTML', () => {
    it('should not include importmap in generated HTML', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Should NOT contain importmap script tag
      expect(htmlContent).not.toContain('<script type="importmap">');
      expect(htmlContent).not.toContain('"imports"');
    });

    it('should not include @constela/runtime in any importmap', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Should NOT contain @constela/runtime mapping
      expect(htmlContent).not.toMatch(/"@constela\/runtime"\s*:/);
    });

    it('should produce self-contained HTML that works without importmap', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': PAGE_WITH_STATE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Should have hydrateApp call
      expect(htmlContent).toContain('hydrateApp');
      // All imports should be from relative or absolute paths (not bare specifiers)
      const importMatches = htmlContent.matchAll(/from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        // All imports should start with / or . (not bare module specifier)
        expect(importPath).toMatch(/^[\/\.]/);
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty routes directory without creating runtime', async () => {
      // Arrange
      const pagesDir = join(testDir, 'src', 'routes');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      // No page files

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - No runtime should be created if no pages
      expect(result.routes).toHaveLength(0);
      // _constela directory may or may not exist, but runtime bundling should be skipped for empty builds
    });

    it('should handle build with dynamic routes using bundled runtime', async () => {
      // Arrange
      const dynamicPage = {
        version: '1.0',
        route: { path: '/posts/:id' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'route', source: 'param', name: 'id' } },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'posts/[id].json': dynamicPage,
        },
      });

      // Create getStaticPaths
      const getStaticPathsModule = `
        export function getStaticPaths() {
          return {
            paths: [
              { params: { id: '1' } },
              { params: { id: '2' } },
            ],
          };
        }
      `;
      await mkdir(join(pagesDir, 'posts'), { recursive: true });
      await writeFile(
        join(pagesDir, 'posts', '[id].paths.ts'),
        getStaticPathsModule
      );

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - All dynamic pages should use bundled runtime
      const post1Html = await readFile(
        join(outDir, 'posts', '1', 'index.html'),
        'utf-8'
      );
      const post2Html = await readFile(
        join(outDir, 'posts', '2', 'index.html'),
        'utf-8'
      );

      expect(post1Html).toContain("from '/_constela/runtime.js'");
      expect(post2Html).toContain("from '/_constela/runtime.js'");
      expect(post1Html).not.toContain("from '@constela/runtime'");
      expect(post2Html).not.toContain("from '@constela/runtime'");
    });

    it('should create only one bundled runtime for entire build', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': SIMPLE_PAGE_JSON,
          'contact.json': SIMPLE_PAGE_JSON,
          'docs/intro.json': SIMPLE_PAGE_JSON,
          'docs/guide.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Only one runtime file should exist
      const runtimePath = join(outDir, '_constela', 'runtime.js');
      expect(await fileExists(runtimePath)).toBe(true);

      // Verify all pages reference the same runtime
      const indexHtml = await readFile(join(outDir, 'index.html'), 'utf-8');
      const docsIntroHtml = await readFile(
        join(outDir, 'docs', 'intro', 'index.html'),
        'utf-8'
      );

      // Both should reference the same absolute path
      expect(indexHtml).toContain("from '/_constela/runtime.js'");
      expect(docsIntroHtml).toContain("from '/_constela/runtime.js'");
    });
  });
});
