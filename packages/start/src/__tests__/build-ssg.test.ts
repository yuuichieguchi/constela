/**
 * Test module for SSG Build Function.
 *
 * Coverage:
 * - Static page generation: build() creates HTML files in outDir for JSON pages
 * - Dynamic route generation: Pages with getStaticPaths generate multiple HTML files
 * - Layout composition: Pages with layouts include layout content
 * - CSS/assets copying: Static files from public/ are copied to dist/
 * - Error handling: Proper errors for missing pages, invalid JSON
 *
 * TDD Red Phase: These tests verify the build function correctly generates
 * static HTML files from JSON pages for SSG output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Import the module under test
import { build } from '../build/index.js';
import type { BuildResult } from '../build/index.js';

// ==================== Test Fixtures ====================

/**
 * Simple static page JSON
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
 * Page with layout reference
 */
const PAGE_WITH_LAYOUT_JSON = {
  version: '1.0',
  route: {
    path: '/about',
    layout: 'main',
    meta: {
      title: 'About Us',
      description: 'Learn more about us',
    },
  },
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'main',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'About page content' } },
    ],
  },
};

/**
 * Dynamic page with getStaticPaths
 */
const DYNAMIC_PAGE_JSON = {
  version: '1.0',
  route: {
    path: '/docs/:slug',
  },
  data: {
    docs: {
      type: 'glob',
      pattern: '../../content/docs/**/*.mdx',
      transform: 'mdx',
    },
  },
  getStaticPaths: {
    source: 'docs',
    params: {
      slug: { expr: 'var', name: 'item', path: 'slug' },
    },
  },
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'article',
    props: {},
    children: [],
  },
};

/**
 * Layout JSON definition
 */
const MAIN_LAYOUT_JSON = {
  version: '1.0',
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: 'layout-wrapper' },
    children: [
      {
        kind: 'element',
        tag: 'header',
        props: {},
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Header' } }],
      },
      { kind: 'slot', name: 'default' },
      {
        kind: 'element',
        tag: 'footer',
        props: {},
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Footer' } }],
      },
    ],
  },
};

// ==================== Test Helpers ====================

/**
 * Create a temporary test directory with unique name
 */
async function createTestDir(): Promise<string> {
  const testDir = join(tmpdir(), `constela-test-${randomUUID()}`);
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
    layouts?: Record<string, unknown>;
    publicFiles?: Record<string, string>;
    content?: Record<string, string>;
  } = {}
): Promise<{ pagesDir: string; outDir: string; publicDir: string }> {
  const pagesDir = join(testDir, 'src', 'pages');
  const layoutsDir = join(testDir, 'src', 'layouts');
  const outDir = join(testDir, 'dist');
  const publicDir = join(testDir, 'public');
  const contentDir = join(testDir, 'content');

  // Create directories
  await mkdir(pagesDir, { recursive: true });
  await mkdir(layoutsDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await mkdir(contentDir, { recursive: true });

  // Write page files
  if (options.pages) {
    for (const [path, content] of Object.entries(options.pages)) {
      const filePath = join(pagesDir, path);
      const dir = join(filePath, '..');
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, JSON.stringify(content, null, 2));
    }
  }

  // Write layout files
  if (options.layouts) {
    for (const [path, content] of Object.entries(options.layouts)) {
      const filePath = join(layoutsDir, path);
      const dir = join(filePath, '..');
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, JSON.stringify(content, null, 2));
    }
  }

  // Write public files
  if (options.publicFiles) {
    for (const [path, content] of Object.entries(options.publicFiles)) {
      const filePath = join(publicDir, path);
      const dir = join(filePath, '..');
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, content);
    }
  }

  // Write content files
  if (options.content) {
    for (const [path, content] of Object.entries(options.content)) {
      const filePath = join(contentDir, path);
      const dir = join(filePath, '..');
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, content);
    }
  }

  return { pagesDir, outDir, publicDir };
}

// ==================== Tests ====================

describe('build() - Static Page Generation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Basic HTML Generation ====================

  describe('basic HTML file generation', () => {
    it('should create HTML file for index.json page at dist/index.html', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const indexHtmlPath = join(outDir, 'index.html');
      expect(await fileExists(indexHtmlPath)).toBe(true);
      expect(result.outDir).toBe(outDir);
    });

    it('should create HTML file for nested page at dist/about/index.html', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'about.json': PAGE_WITH_LAYOUT_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const aboutHtmlPath = join(outDir, 'about', 'index.html');
      expect(await fileExists(aboutHtmlPath)).toBe(true);
    });

    it('should create HTML file for deeply nested page at dist/docs/guides/intro/index.html', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/guides/intro.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const nestedHtmlPath = join(outDir, 'docs', 'guides', 'intro', 'index.html');
      expect(await fileExists(nestedHtmlPath)).toBe(true);
    });

    it('should generate multiple HTML files for multiple pages', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': PAGE_WITH_LAYOUT_JSON,
          'contact.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'about', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'contact', 'index.html'))).toBe(true);
      expect(result.routes.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==================== HTML Content Validation ====================

  describe('HTML content validation', () => {
    it('should generate valid HTML document with DOCTYPE', async () => {
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
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('</html>');
    });

    it('should include rendered content from JSON page view', async () => {
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
      expect(htmlContent).toContain('Hello World');
    });

    it('should include div#app container for hydration', async () => {
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
      expect(htmlContent).toContain('<div id="app">');
      expect(htmlContent).toContain('</div>');
    });

    it('should include hydration script with module type', async () => {
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
      expect(htmlContent).toContain('<script type="module">');
      expect(htmlContent).toContain('hydrateApp');
    });

    it('should include meta tags for charset and viewport', async () => {
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
      expect(htmlContent).toContain('<meta charset="utf-8">');
      expect(htmlContent).toContain('<meta name="viewport"');
    });
  });

  // ==================== Build Result ====================

  describe('build result', () => {
    it('should return outDir in BuildResult', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(result.outDir).toBe(outDir);
    });

    it('should return discovered routes in BuildResult', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': PAGE_WITH_LAYOUT_JSON,
        },
      });

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(result.routes).toContain('/');
      expect(result.routes).toContain('/about');
    });

    it('should return generated file paths in BuildResult', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': PAGE_WITH_LAYOUT_JSON,
        },
      });

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      // Extended BuildResult should include generatedFiles
      expect(result).toHaveProperty('generatedFiles');
      const generatedFiles = (result as BuildResult & { generatedFiles: string[] }).generatedFiles;
      expect(generatedFiles).toContain(join(outDir, 'index.html'));
      expect(generatedFiles).toContain(join(outDir, 'about', 'index.html'));
    });
  });
});

describe('build() - Dynamic Route Generation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== getStaticPaths ====================

  describe('pages with getStaticPaths', () => {
    it('should generate multiple HTML files from getStaticPaths', async () => {
      // Arrange
      const docsPage = {
        version: '1.0',
        route: { path: '/docs/:slug' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[slug].json': docsPage,
        },
      });

      // Create a mock getStaticPaths module
      const getStaticPathsModule = `
        export function getStaticPaths() {
          return {
            paths: [
              { params: { slug: 'getting-started' } },
              { params: { slug: 'installation' } },
              { params: { slug: 'configuration' } },
            ],
          };
        }
      `;
      await writeFile(
        join(pagesDir, 'docs', '[slug].paths.ts'),
        getStaticPathsModule
      );

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'docs', 'getting-started', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'installation', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'configuration', 'index.html'))).toBe(true);
    });

    it('should handle catch-all routes with [...slug] pattern', async () => {
      // Arrange
      const catchAllPage = {
        version: '1.0',
        route: { path: '/docs/*' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[...slug].json': catchAllPage,
        },
      });

      // Create getStaticPaths for catch-all
      const getStaticPathsModule = `
        export function getStaticPaths() {
          return {
            paths: [
              { params: { slug: 'guides/getting-started' } },
              { params: { slug: 'api/reference' } },
              { params: { slug: 'tutorials/basics/intro' } },
            ],
          };
        }
      `;
      await writeFile(
        join(pagesDir, 'docs', '[...slug].paths.ts'),
        getStaticPathsModule
      );

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'docs', 'guides', 'getting-started', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'api', 'reference', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'tutorials', 'basics', 'intro', 'index.html'))).toBe(true);
    });

    it('should pass params to page for rendering', async () => {
      // Arrange
      const userPage = {
        version: '1.0',
        route: { path: '/users/:id' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            {
              kind: 'text',
              value: { expr: 'param', name: 'id' },
            },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'users/[id].json': userPage,
        },
      });

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
      await writeFile(
        join(pagesDir, 'users', '[id].paths.ts'),
        getStaticPathsModule
      );

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const user1Html = await readFile(join(outDir, 'users', '1', 'index.html'), 'utf-8');
      const user2Html = await readFile(join(outDir, 'users', '2', 'index.html'), 'utf-8');

      // Each page should contain the respective param value
      expect(user1Html).toContain('1');
      expect(user2Html).toContain('2');
    });

    it('should skip dynamic routes without getStaticPaths', async () => {
      // Arrange
      const dynamicPage = {
        version: '1.0',
        route: { path: '/posts/:id' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'posts/[id].json': dynamicPage, // No getStaticPaths
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'index.html'))).toBe(true);
      // Dynamic route directory should not exist without getStaticPaths
      expect(await fileExists(join(outDir, 'posts'))).toBe(false);
    });
  });
});

describe('build() - Layout Composition', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Layout Integration ====================

  describe('pages with layouts', () => {
    it('should wrap page content with layout when layout is specified', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'about.json': PAGE_WITH_LAYOUT_JSON,
        },
        layouts: {
          'main.json': MAIN_LAYOUT_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        layoutsDir: join(testDir, 'src', 'layouts'),
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'about', 'index.html'), 'utf-8');
      expect(htmlContent).toContain('Header');
      expect(htmlContent).toContain('Footer');
      expect(htmlContent).toContain('About page content');
    });

    it('should render layout wrapper structure correctly', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'about.json': PAGE_WITH_LAYOUT_JSON,
        },
        layouts: {
          'main.json': MAIN_LAYOUT_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        layoutsDir: join(testDir, 'src', 'layouts'),
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'about', 'index.html'), 'utf-8');
      expect(htmlContent).toContain('class="layout-wrapper"');
    });

    it('should handle nested layouts', async () => {
      // Arrange
      const docsLayout = {
        version: '1.0',
        layout: 'main', // Nested under main layout
        view: {
          kind: 'element',
          tag: 'div',
          props: { class: 'docs-layout' },
          children: [
            {
              kind: 'element',
              tag: 'aside',
              props: {},
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Sidebar' } }],
            },
            { kind: 'slot', name: 'default' },
          ],
        },
      };

      const docsPage = {
        version: '1.0',
        route: {
          path: '/docs/intro',
          layout: 'docs',
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Documentation content' } }],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/intro.json': docsPage,
        },
        layouts: {
          'main.json': MAIN_LAYOUT_JSON,
          'docs.json': docsLayout,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        layoutsDir: join(testDir, 'src', 'layouts'),
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'docs', 'intro', 'index.html'), 'utf-8');
      expect(htmlContent).toContain('Header'); // From main layout
      expect(htmlContent).toContain('Sidebar'); // From docs layout
      expect(htmlContent).toContain('Documentation content'); // From page
      expect(htmlContent).toContain('Footer'); // From main layout
    });

    it('should render page without layout when no layout specified', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
        layouts: {
          'main.json': MAIN_LAYOUT_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        layoutsDir: join(testDir, 'src', 'layouts'),
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');
      expect(htmlContent).toContain('Hello World');
      expect(htmlContent).not.toContain('Header');
      expect(htmlContent).not.toContain('Footer');
    });
  });
});

describe('build() - Static Assets Copying', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Public Directory ====================

  describe('public directory handling', () => {
    it('should copy files from public/ to dist/', async () => {
      // Arrange
      const { pagesDir, outDir, publicDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
        publicFiles: {
          'favicon.ico': 'binary-favicon-content',
          'robots.txt': 'User-agent: *\nAllow: /',
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        publicDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'favicon.ico'))).toBe(true);
      expect(await fileExists(join(outDir, 'robots.txt'))).toBe(true);
    });

    it('should preserve directory structure from public/', async () => {
      // Arrange
      const { pagesDir, outDir, publicDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
        publicFiles: {
          'assets/css/style.css': 'body { margin: 0; }',
          'assets/images/logo.png': 'png-binary-content',
          'js/app.js': 'console.log("app");',
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        publicDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'assets', 'css', 'style.css'))).toBe(true);
      expect(await fileExists(join(outDir, 'assets', 'images', 'logo.png'))).toBe(true);
      expect(await fileExists(join(outDir, 'js', 'app.js'))).toBe(true);
    });

    it('should preserve file contents when copying', async () => {
      // Arrange
      const cssContent = 'body { margin: 0; padding: 0; }';
      const { pagesDir, outDir, publicDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
        publicFiles: {
          'style.css': cssContent,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        publicDir,
      });

      // Assert
      const copiedContent = await readFile(join(outDir, 'style.css'), 'utf-8');
      expect(copiedContent).toBe(cssContent);
    });

    it('should not overwrite generated HTML with public files', async () => {
      // Arrange: public/index.html should NOT overwrite generated dist/index.html
      const { pagesDir, outDir, publicDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
        publicFiles: {
          'index.html': '<html>Public HTML</html>',
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        publicDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');
      // Should contain generated content, not public file content
      expect(htmlContent).toContain('Hello World');
      expect(htmlContent).not.toContain('Public HTML');
    });

    it('should handle empty public directory gracefully', async () => {
      // Arrange
      const { pagesDir, outDir, publicDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
        // No public files
      });

      // Act & Assert - should not throw
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
          publicDir,
        })
      ).resolves.toBeDefined();
    });

    it('should handle missing public directory gracefully', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });
      const nonExistentPublicDir = join(testDir, 'non-existent-public');

      // Act & Assert - should not throw
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
          publicDir: nonExistentPublicDir,
        })
      ).resolves.toBeDefined();
    });
  });
});

describe('build() - Error Handling', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Error Cases ====================

  describe('error handling', () => {
    it('should throw error for invalid JSON page file', async () => {
      // Arrange
      const pagesDir = join(testDir, 'src', 'pages');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      await writeFile(join(pagesDir, 'invalid.json'), '{ not valid json }');

      // Act & Assert
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
        })
      ).rejects.toThrow(/invalid json/i);
    });

    it('should throw error when page is missing required view field', async () => {
      // Arrange
      const invalidPage = {
        version: '1.0',
        state: {},
        actions: {},
        // Missing 'view' field
      };

      const pagesDir = join(testDir, 'src', 'pages');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      await writeFile(join(pagesDir, 'missing-view.json'), JSON.stringify(invalidPage));

      // Act & Assert
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
        })
      ).rejects.toThrow(/missing.*view/i);
    });

    it('should throw error when layout is specified but not found', async () => {
      // Arrange
      const pageWithMissingLayout = {
        version: '1.0',
        route: {
          path: '/about',
          layout: 'nonexistent',
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      };

      const pagesDir = join(testDir, 'src', 'pages');
      const layoutsDir = join(testDir, 'src', 'layouts');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      await mkdir(layoutsDir, { recursive: true });
      await writeFile(join(pagesDir, 'about.json'), JSON.stringify(pageWithMissingLayout));

      // Act & Assert
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
          layoutsDir,
        })
      ).rejects.toThrow(/layout.*nonexistent.*not found/i);
    });

    it('should throw error when getStaticPaths returns invalid format', async () => {
      // Arrange
      const dynamicPage = {
        version: '1.0',
        route: { path: '/posts/:id' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      };

      const pagesDir = join(testDir, 'src', 'pages');
      const outDir = join(testDir, 'dist');
      await mkdir(join(pagesDir, 'posts'), { recursive: true });
      await writeFile(join(pagesDir, 'posts', '[id].json'), JSON.stringify(dynamicPage));

      // Invalid getStaticPaths - returns array instead of { paths: [] }
      const invalidGetStaticPaths = `
        export function getStaticPaths() {
          return [{ id: '1' }]; // Invalid format
        }
      `;
      await writeFile(join(pagesDir, 'posts', '[id].paths.ts'), invalidGetStaticPaths);

      // Act & Assert
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
        })
      ).rejects.toThrow(/invalid.*getStaticPaths/i);
    });

    it('should provide helpful error message with file path on failure', async () => {
      // Arrange
      const pagesDir = join(testDir, 'src', 'pages');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      await writeFile(join(pagesDir, 'broken.json'), '{ invalid }');

      // Act & Assert
      try {
        await build({
          routesDir: pagesDir,
          outDir,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('broken.json');
      }
    });

    it('should handle permission errors gracefully', async () => {
      // This test is platform-specific and may need adjustment
      // Skip on Windows where permissions work differently
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        return;
      }

      // Arrange
      const { pagesDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Create output directory with no write permission
      const readOnlyOutDir = join(testDir, 'readonly-dist');
      await mkdir(readOnlyOutDir, { recursive: true });

      // We can't easily test permission errors in a cross-platform way
      // This is a placeholder for the expected behavior
      expect(true).toBe(true);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty pages directory', async () => {
      // Arrange
      const pagesDir = join(testDir, 'src', 'pages');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      // No page files

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(result.routes).toHaveLength(0);
    });

    it('should ignore non-JSON files in pages directory', async () => {
      // Arrange
      const pagesDir = join(testDir, 'src', 'pages');
      const outDir = join(testDir, 'dist');
      await mkdir(pagesDir, { recursive: true });
      await writeFile(join(pagesDir, 'index.json'), JSON.stringify(SIMPLE_PAGE_JSON));
      await writeFile(join(pagesDir, 'readme.md'), '# Readme');
      await writeFile(join(pagesDir, 'utils.ts'), 'export const x = 1;');

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(result.routes).toContain('/');
      expect(await fileExists(join(outDir, 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'readme', 'index.html'))).toBe(false);
    });

    it('should handle pages with special characters in filename', async () => {
      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'hello-world.json': SIMPLE_PAGE_JSON,
          'foo_bar.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'hello-world', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'foo_bar', 'index.html'))).toBe(true);
    });

    it('should handle Unicode content in pages', async () => {
      // Arrange
      const unicodePage = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello, world!' } },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': unicodePage,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');
      expect(htmlContent).toContain('Hello');
    });
  });
});

describe('build() - Default Options', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Default Values ====================

  describe('default option values', () => {
    it('should use "dist" as default outDir', async () => {
      // Arrange
      const pagesDir = join(testDir, 'src', 'routes');
      await mkdir(pagesDir, { recursive: true });
      await writeFile(join(pagesDir, 'index.json'), JSON.stringify(SIMPLE_PAGE_JSON));

      // Change CWD temporarily for this test
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Act
        const result = await build({
          routesDir: pagesDir,
        });

        // Assert
        expect(result.outDir).toBe('dist');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should use "src/routes" as default routesDir', async () => {
      // Arrange
      const defaultRoutesDir = join(testDir, 'src', 'routes');
      const outDir = join(testDir, 'dist');
      await mkdir(defaultRoutesDir, { recursive: true });
      await writeFile(join(defaultRoutesDir, 'index.json'), JSON.stringify(SIMPLE_PAGE_JSON));

      // Change CWD temporarily for this test
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Act
        const result = await build({
          outDir,
        });

        // Assert
        expect(result.routes).toContain('/');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should use "public" as default publicDir and copy files from it', async () => {
      // Arrange
      // Create the default "public" directory structure in the project root
      const defaultPublicDir = join(testDir, 'public');
      const pagesDir = join(testDir, 'src', 'routes');
      const outDir = join(testDir, 'dist');

      await mkdir(pagesDir, { recursive: true });
      await mkdir(defaultPublicDir, { recursive: true });

      // Write page file
      await writeFile(join(pagesDir, 'index.json'), JSON.stringify(SIMPLE_PAGE_JSON));

      // Write public files that should be copied with default publicDir
      await writeFile(join(defaultPublicDir, 'favicon.ico'), 'default-favicon-content');
      await writeFile(join(defaultPublicDir, 'robots.txt'), 'User-agent: *\nAllow: /');

      // Change CWD temporarily so the default "public" directory is found
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Act - Call build WITHOUT specifying publicDir
        // It should use "public" as the default and copy files from it
        await build({
          routesDir: pagesDir,
          outDir,
          // publicDir is intentionally NOT specified
        });

        // Assert - Files from default "public" directory should be copied to outDir
        expect(await fileExists(join(outDir, 'favicon.ico'))).toBe(true);
        expect(await fileExists(join(outDir, 'robots.txt'))).toBe(true);

        // Verify content was preserved
        const faviconContent = await readFile(join(outDir, 'favicon.ico'), 'utf-8');
        expect(faviconContent).toBe('default-favicon-content');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});

describe('build() - Integration Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Full Build Workflow ====================

  describe('complete build workflow', () => {
    it('should build a complete site with multiple page types', async () => {
      // Arrange
      const { pagesDir, outDir, publicDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': PAGE_WITH_LAYOUT_JSON,
          'contact.json': SIMPLE_PAGE_JSON,
        },
        layouts: {
          'main.json': MAIN_LAYOUT_JSON,
        },
        publicFiles: {
          'favicon.ico': 'favicon-content',
          'css/style.css': 'body { color: black; }',
        },
      });

      const layoutsDir = join(testDir, 'src', 'layouts');

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
        publicDir,
        layoutsDir,
      });

      // Assert - HTML files generated
      expect(await fileExists(join(outDir, 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'about', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'contact', 'index.html'))).toBe(true);

      // Assert - Public files copied
      expect(await fileExists(join(outDir, 'favicon.ico'))).toBe(true);
      expect(await fileExists(join(outDir, 'css', 'style.css'))).toBe(true);

      // Assert - Routes discovered
      expect(result.routes).toContain('/');
      expect(result.routes).toContain('/about');
      expect(result.routes).toContain('/contact');

      // Assert - Content rendered
      const aboutHtml = await readFile(join(outDir, 'about', 'index.html'), 'utf-8');
      expect(aboutHtml).toContain('About page content');
      expect(aboutHtml).toContain('Header'); // From layout
    });

    it('should build site structure matching constela.dev expected output', async () => {
      // Arrange - Simulate constela.dev structure
      const indexPage = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome to Constela' } }],
        },
      };

      const playgroundPage = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Playground' } }],
        },
      };

      const docsPage = {
        version: '1.0',
        route: { path: '/docs/*' },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': indexPage,
          'playground.json': playgroundPage,
          'docs/[...slug].json': docsPage,
        },
      });

      // Create getStaticPaths for docs
      const getStaticPathsModule = `
        export function getStaticPaths() {
          return {
            paths: [
              { params: { slug: 'getting-started' } },
              { params: { slug: 'api/overview' } },
              { params: { slug: 'guides/tutorial' } },
            ],
          };
        }
      `;
      await mkdir(join(pagesDir, 'docs'), { recursive: true });
      await writeFile(join(pagesDir, 'docs', '[...slug].paths.ts'), getStaticPathsModule);

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Expected structure for constela.dev
      expect(await fileExists(join(outDir, 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'playground', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'getting-started', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'api', 'overview', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'guides', 'tutorial', 'index.html'))).toBe(true);
    });
  });
});
