/**
 * Test module for SSG layout imports resolution.
 *
 * Coverage:
 * - Layout import expression resolution during SSG build
 *   - Should resolve import expressions in layout view
 *   - Should include imported data in generated HTML
 *   - Should handle nested import paths (e.g., import.nav.siteName)
 *
 * Bug context:
 * - build/index.ts loadLayout function does not resolve imports section
 * - Layout files with import expressions result in undefined values during SSG
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-layout-imports-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Nav config data to be imported by layout
 */
const navConfigData = {
  siteName: 'SSG Layout Import Test',
  navItems: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
};

/**
 * Layout with imports section that references external JSON
 */
const layoutWithImports = {
  version: '1.0',
  type: 'layout',
  imports: {
    nav: '../data-layout/nav-config.json',
  },
  state: {},
  actions: [],
  view: {
    kind: 'element',
    tag: 'div',
    props: {
      class: { expr: 'lit', value: 'layout-wrapper' },
    },
    children: [
      {
        kind: 'element',
        tag: 'header',
        props: {},
        children: [
          {
            kind: 'text',
            value: { expr: 'import', name: 'nav', path: 'siteName' },
          },
        ],
      },
      {
        kind: 'element',
        tag: 'nav',
        props: {},
        children: [
          {
            kind: 'each',
            items: { expr: 'import', name: 'nav', path: 'navItems' },
            as: 'item',
            body: {
              kind: 'element',
              tag: 'a',
              props: {
                href: { expr: 'var', name: 'item', path: 'href' },
              },
              children: [
                {
                  kind: 'text',
                  value: { expr: 'var', name: 'item', path: 'label' },
                },
              ],
            },
          },
        ],
      },
      { kind: 'slot' },
      {
        kind: 'element',
        tag: 'footer',
        props: {},
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 'Footer content' },
          },
        ],
      },
    ],
  },
};

/**
 * Simple page that uses layout with imports
 */
const pageWithLayoutImports = {
  version: '1.0',
  route: {
    path: '/test-page',
    layout: 'nav-layout',
  },
  state: {},
  actions: [],
  view: {
    kind: 'element',
    tag: 'main',
    props: {},
    children: [
      {
        kind: 'text',
        value: { expr: 'lit', value: 'Page content goes here' },
      },
    ],
  },
};

// ==================== SSG Layout Imports Tests ====================

describe('SSG layout imports resolution', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;
  let dataDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');
    dataDir = join(tempDir, 'src', 'data-layout');

    // Create directories
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
    await mkdir(dataDir, { recursive: true });

    // Create fixture files
    await writeFile(
      join(dataDir, 'nav-config.json'),
      JSON.stringify(navConfigData, null, 2)
    );
    await writeFile(
      join(layoutsDir, 'nav-layout.json'),
      JSON.stringify(layoutWithImports, null, 2)
    );
    await writeFile(
      join(routesDir, 'test-page.json'),
      JSON.stringify(pageWithLayoutImports, null, 2)
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== Import Expression Resolution ====================

  describe('import expression resolution in layout', () => {
    it('should resolve import expressions in layout view during SSG build', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      const result = await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Read generated HTML
      const htmlPath = join(outDir, 'test-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The siteName from nav-config.json should be in the HTML
      // This is the key assertion - currently this FAILS because loadLayout
      // does not resolve the imports section
      expect(htmlContent).toContain('SSG Layout Import Test');
    });

    it('should include imported navigation items in generated HTML', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Navigation items from imported data should be rendered
      expect(htmlContent).toContain('Home');
      expect(htmlContent).toContain('About');
      expect(htmlContent).toContain('Contact');
    });

    it('should render navigation links with correct href from imported data', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Links should have correct href attributes from imported navItems
      expect(htmlContent).toContain('href="/"');
      expect(htmlContent).toContain('href="/about"');
      expect(htmlContent).toContain('href="/contact"');
    });
  });

  // ==================== Layout Structure Preservation ====================

  describe('layout structure preservation', () => {
    it('should preserve page content within layout slot', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Page content should be present
      expect(htmlContent).toContain('Page content goes here');

      // Layout wrapper should be present
      expect(htmlContent).toContain('layout-wrapper');

      // Footer from layout should be present
      expect(htmlContent).toContain('Footer content');
    });

    it('should maintain correct DOM structure with header, nav, main, footer', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // All layout elements should be present
      expect(htmlContent).toContain('<header');
      expect(htmlContent).toContain('<nav');
      expect(htmlContent).toContain('<main');
      expect(htmlContent).toContain('<footer');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw error when layout import file does not exist', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create layout with invalid import path
      const layoutWithInvalidImport = {
        ...layoutWithImports,
        imports: {
          nav: '../data-layout/non-existent.json',
        },
      };
      await writeFile(
        join(layoutsDir, 'nav-layout.json'),
        JSON.stringify(layoutWithInvalidImport, null, 2)
      );

      // Act & Assert
      // Once layout imports are resolved during SSG, this should throw an error
      // for missing import file. Currently this test FAILS because loadLayout
      // does not resolve imports at all (so it silently ignores the missing file).
      await expect(
        build({
          outDir,
          routesDir,
          layoutsDir,
        })
      ).rejects.toThrow();
    });
  });

  // ==================== Multiple Pages with Same Layout ====================

  describe('multiple pages sharing layout with imports', () => {
    it('should correctly resolve imports for multiple pages using same layout', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create additional page
      const anotherPage = {
        version: '1.0',
        route: {
          path: '/another-page',
          layout: 'nav-layout',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'main',
          props: {},
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Another page content' },
            },
          ],
        },
      };
      await writeFile(
        join(routesDir, 'another-page.json'),
        JSON.stringify(anotherPage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      // First page
      const htmlPath1 = join(outDir, 'test-page', 'index.html');
      const htmlContent1 = await readFile(htmlPath1, 'utf-8');
      expect(htmlContent1).toContain('SSG Layout Import Test');
      expect(htmlContent1).toContain('Page content goes here');

      // Second page
      const htmlPath2 = join(outDir, 'another-page', 'index.html');
      const htmlContent2 = await readFile(htmlPath2, 'utf-8');
      expect(htmlContent2).toContain('SSG Layout Import Test');
      expect(htmlContent2).toContain('Another page content');
    });
  });
});
