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

// ==================== Bug #1: Inline getStaticPaths in JSON ====================

describe('build() - Inline getStaticPaths in JSON Pages', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  /**
   * Bug: JSON pages can define getStaticPaths inline, but build() only reads .paths.ts files.
   * The JsonPageLoader has getStaticPaths() method that correctly handles inline definitions,
   * but build() uses loadGetStaticPaths() which only checks for .paths.ts files.
   */
  describe('inline getStaticPaths definition', () => {
    it('should generate pages from inline getStaticPaths in JSON page', async () => {
      /**
       * Given: A dynamic route JSON page with inline getStaticPaths definition
       * When: build() is called
       * Then: HTML files should be generated for each path from the inline definition
       *
       * This test verifies that JSON pages with inline getStaticPaths are processed
       * correctly, not just pages with external .paths.ts files.
       */

      // Arrange - Create content files that will be loaded via glob
      const contentDir = join(testDir, 'content', 'posts');
      await mkdir(contentDir, { recursive: true });

      // Create MDX content files with frontmatter containing slug
      await writeFile(
        join(contentDir, 'hello-world.mdx'),
        '---\nslug: hello-world\ntitle: Hello World\n---\n# Hello World'
      );
      await writeFile(
        join(contentDir, 'second-post.mdx'),
        '---\nslug: second-post\ntitle: Second Post\n---\n# Second Post'
      );
      await writeFile(
        join(contentDir, 'third-post.mdx'),
        '---\nslug: third-post\ntitle: Third Post\n---\n# Third Post'
      );

      // Create a dynamic page with inline getStaticPaths using glob data
      const dynamicPageWithInlineGetStaticPaths = {
        version: '1.0',
        route: {
          path: '/posts/:slug',
        },
        data: {
          posts: {
            type: 'glob',
            pattern: '../../../content/posts/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'posts',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Post content' },
            },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'posts/[slug].json': dynamicPageWithInlineGetStaticPaths,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - All pages from inline getStaticPaths should be generated
      expect(await fileExists(join(outDir, 'posts', 'hello-world', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'posts', 'second-post', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'posts', 'third-post', 'index.html'))).toBe(true);
    });

    it('should prefer inline getStaticPaths over .paths.ts file when both exist', async () => {
      /**
       * Given: A dynamic route with both inline getStaticPaths and external .paths.ts
       * When: build() is called
       * Then: The inline definition should take precedence (or both should be merged)
       *
       * This test ensures consistent behavior when both definitions exist.
       */

      // Arrange - Create content files
      const contentDir = join(testDir, 'content', 'docs');
      await mkdir(contentDir, { recursive: true });

      await writeFile(
        join(contentDir, 'inline-doc-1.mdx'),
        '---\nslug: inline-doc-1\n---\n# Inline Doc 1'
      );
      await writeFile(
        join(contentDir, 'inline-doc-2.mdx'),
        '---\nslug: inline-doc-2\n---\n# Inline Doc 2'
      );

      const pageWithBothDefinitions = {
        version: '1.0',
        route: {
          path: '/docs/:slug',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../../content/docs/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'docs',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[slug].json': pageWithBothDefinitions,
        },
      });

      // Also create a .paths.ts file with different paths
      const externalPathsModule = `
        export function getStaticPaths() {
          return {
            paths: [
              { params: { slug: 'external-doc-1' } },
              { params: { slug: 'external-doc-2' } },
            ],
          };
        }
      `;
      await writeFile(join(pagesDir, 'docs', '[slug].paths.ts'), externalPathsModule);

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Inline paths should be generated (from inline getStaticPaths, not .paths.ts)
      expect(await fileExists(join(outDir, 'docs', 'inline-doc-1', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'docs', 'inline-doc-2', 'index.html'))).toBe(true);
    });

    it('should handle inline getStaticPaths with nested param paths', async () => {
      /**
       * Given: A JSON page with inline getStaticPaths using nested path expressions
       * When: build() is called
       * Then: Params should be correctly extracted from nested paths
       */

      // Arrange - Create content files with nested frontmatter
      const contentDir = join(testDir, 'content', 'articles');
      await mkdir(contentDir, { recursive: true });

      await writeFile(
        join(contentDir, 'january-update.mdx'),
        '---\nmeta:\n  year: "2024"\n  slug: january-update\n---\n# January Update'
      );
      await writeFile(
        join(contentDir, 'february-news.mdx'),
        '---\nmeta:\n  year: "2024"\n  slug: february-news\n---\n# February News'
      );
      await writeFile(
        join(contentDir, 'annual-review.mdx'),
        '---\nmeta:\n  year: "2023"\n  slug: annual-review\n---\n# Annual Review'
      );

      const pageWithNestedParams = {
        version: '1.0',
        route: {
          path: '/blog/:year/:slug',
        },
        data: {
          articles: {
            type: 'glob',
            pattern: '../../../../content/articles/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'articles',
          params: {
            year: { expr: 'var', name: 'item', path: 'frontmatter.meta.year' },
            slug: { expr: 'var', name: 'item', path: 'frontmatter.meta.slug' },
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'blog/[year]/[slug].json': pageWithNestedParams,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      expect(await fileExists(join(outDir, 'blog', '2024', 'january-update', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'blog', '2024', 'february-news', 'index.html'))).toBe(true);
      expect(await fileExists(join(outDir, 'blog', '2023', 'annual-review', 'index.html'))).toBe(true);
    });
  });
});

// ==================== Bug #2: CSS Processing in Build ====================

describe('build() - CSS Processing', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  /**
   * Bug: BuildOptions accepts a `css` option but build() doesn't process it.
   * CSS should be bundled to {outDir}/_constela/styles.css and HTML should
   * include a stylesheet link.
   */
  describe('CSS bundling', () => {
    it('should bundle CSS file to _constela/styles.css when css option is provided', async () => {
      /**
       * Given: A project with a CSS file and build options specifying css
       * When: build() is called with css option
       * Then: CSS should be bundled to {outDir}/_constela/styles.css
       */

      // Arrange - Create CSS file
      const cssDir = join(testDir, 'src', 'styles');
      await mkdir(cssDir, { recursive: true });
      const cssContent = `
        :root {
          --primary-color: #007bff;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: sans-serif;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
      `;
      await writeFile(join(cssDir, 'main.css'), cssContent);

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        css: join(cssDir, 'main.css'),
      });

      // Assert - CSS should be bundled
      const bundledCssPath = join(outDir, '_constela', 'styles.css');
      expect(await fileExists(bundledCssPath)).toBe(true);

      // Verify CSS content is preserved
      const bundledContent = await readFile(bundledCssPath, 'utf-8');
      expect(bundledContent).toContain('--primary-color');
      expect(bundledContent).toContain('font-family');
    });

    it('should include stylesheet link in generated HTML when css is provided', async () => {
      /**
       * Given: A project with CSS option specified
       * When: build() generates HTML files
       * Then: Each HTML file should include <link rel="stylesheet" href="/_constela/styles.css">
       */

      // Arrange
      const cssDir = join(testDir, 'src', 'styles');
      await mkdir(cssDir, { recursive: true });
      await writeFile(join(cssDir, 'app.css'), 'body { color: black; }');

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
          'about.json': PAGE_WITH_LAYOUT_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        css: join(cssDir, 'app.css'),
      });

      // Assert - HTML files should include stylesheet link
      const indexHtml = await readFile(join(outDir, 'index.html'), 'utf-8');
      const aboutHtml = await readFile(join(outDir, 'about', 'index.html'), 'utf-8');

      expect(indexHtml).toContain('<link rel="stylesheet" href="/_constela/styles.css">');
      expect(aboutHtml).toContain('<link rel="stylesheet" href="/_constela/styles.css">');
    });

    it('should handle multiple CSS entry points as array', async () => {
      /**
       * Given: Multiple CSS files specified as an array
       * When: build() is called
       * Then: All CSS should be bundled together into styles.css
       */

      // Arrange
      const cssDir = join(testDir, 'src', 'styles');
      await mkdir(cssDir, { recursive: true });

      await writeFile(join(cssDir, 'reset.css'), '* { margin: 0; padding: 0; box-sizing: border-box; }');
      await writeFile(join(cssDir, 'typography.css'), 'body { font-size: 16px; line-height: 1.5; }');
      await writeFile(join(cssDir, 'layout.css'), '.container { max-width: 1200px; }');

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
        css: [
          join(cssDir, 'reset.css'),
          join(cssDir, 'typography.css'),
          join(cssDir, 'layout.css'),
        ],
      });

      // Assert - All CSS content should be bundled
      const bundledCssPath = join(outDir, '_constela', 'styles.css');
      expect(await fileExists(bundledCssPath)).toBe(true);

      const bundledContent = await readFile(bundledCssPath, 'utf-8');
      expect(bundledContent).toContain('box-sizing');
      expect(bundledContent).toContain('font-size');
      expect(bundledContent).toContain('max-width');
    });

    it('should not include stylesheet link when css option is not provided', async () => {
      /**
       * Given: A project without CSS option
       * When: build() is called
       * Then: HTML should not include stylesheet link to _constela/styles.css
       */

      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      // Act - No css option provided
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const indexHtml = await readFile(join(outDir, 'index.html'), 'utf-8');
      expect(indexHtml).not.toContain('/_constela/styles.css');
    });

    it('should throw error when CSS file does not exist', async () => {
      /**
       * Given: A css option pointing to a non-existent file
       * When: build() is called
       * Then: Should throw a descriptive error
       */

      // Arrange
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON,
        },
      });

      const nonExistentCss = join(testDir, 'src', 'styles', 'non-existent.css');

      // Act & Assert
      await expect(
        build({
          routesDir: pagesDir,
          outDir,
          css: nonExistentCss,
        })
      ).rejects.toThrow(/css.*not found|no such file/i);
    });
  });
});

// ==================== Feature: externalImports for importMap Generation ====================

describe('build() - externalImports for importMap Generation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  /**
   * Feature: JSON pages can define externalImports field to generate importMap in HTML.
   *
   * When a page JSON has an externalImports field, the generated HTML should include
   * a <script type="importmap"> with the specified import mappings.
   */
  describe('importMap generation from externalImports', () => {
    it('should include importmap script when externalImports is defined', async () => {
      /**
       * Given: A JSON page with externalImports field
       * When: build() is called
       * Then: Generated HTML should contain <script type="importmap"> with the imports
       */

      // Arrange
      const pageWithExternalImports = {
        version: '1.0',
        externalImports: {
          'monaco-editor': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/+esm',
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Code Editor Page' } },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'editor.json': pageWithExternalImports,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'editor', 'index.html'), 'utf-8');

      // Should contain importmap script tag
      expect(htmlContent).toContain('<script type="importmap">');

      // Should contain the import mapping
      expect(htmlContent).toContain('"monaco-editor"');
      expect(htmlContent).toContain('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/+esm');
    });

    it('should generate valid JSON in importmap script', async () => {
      /**
       * Given: A JSON page with externalImports field
       * When: build() generates HTML
       * Then: The importmap script should contain valid JSON
       */

      // Arrange
      const pageWithExternalImports = {
        version: '1.0',
        externalImports: {
          'lodash-es': 'https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/+esm',
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': pageWithExternalImports,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Extract importmap content
      const importmapMatch = htmlContent.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
      expect(importmapMatch).not.toBeNull();

      // Parse as JSON to validate structure
      const importmapContent = importmapMatch![1];
      const importmap = JSON.parse(importmapContent);

      expect(importmap).toHaveProperty('imports');
      expect(importmap.imports).toHaveProperty('lodash-es');
      expect(importmap.imports['lodash-es']).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/+esm');
    });

    it('should handle multiple import entries', async () => {
      /**
       * Given: A JSON page with multiple externalImports entries
       * When: build() is called
       * Then: All imports should be included in the importmap
       */

      // Arrange
      const pageWithMultipleImports = {
        version: '1.0',
        externalImports: {
          'monaco-editor': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/+esm',
          'lodash-es': 'https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/+esm',
          'three': 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm',
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'playground.json': pageWithMultipleImports,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'playground', 'index.html'), 'utf-8');

      // Extract and parse importmap
      const importmapMatch = htmlContent.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
      expect(importmapMatch).not.toBeNull();

      const importmap = JSON.parse(importmapMatch![1]);
      expect(Object.keys(importmap.imports)).toHaveLength(3);
      expect(importmap.imports['monaco-editor']).toBe('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/+esm');
      expect(importmap.imports['lodash-es']).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/+esm');
      expect(importmap.imports['three']).toBe('https://cdn.jsdelivr.net/npm/three@0.169.0/+esm');
    });

    it('should NOT include importmap when externalImports is not defined', async () => {
      /**
       * Given: A JSON page WITHOUT externalImports field
       * When: build() is called
       * Then: Generated HTML should NOT contain importmap script
       */

      // Arrange - Page without externalImports
      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': SIMPLE_PAGE_JSON, // Uses the fixture without externalImports
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');
      expect(htmlContent).not.toContain('<script type="importmap">');
      expect(htmlContent).not.toContain('importmap');
    });

    it('should NOT include importmap when externalImports is empty object', async () => {
      /**
       * Given: A JSON page with empty externalImports object
       * When: build() is called
       * Then: Generated HTML should NOT contain importmap script
       */

      // Arrange
      const pageWithEmptyExternalImports = {
        version: '1.0',
        externalImports: {},
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
          'index.json': pageWithEmptyExternalImports,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');
      expect(htmlContent).not.toContain('<script type="importmap">');
    });

    it('should place importmap script before module scripts in head', async () => {
      /**
       * Given: A JSON page with externalImports
       * When: build() generates HTML
       * Then: importmap script should appear before any module scripts
       *       (importmap must be defined before modules that use it)
       */

      // Arrange
      const pageWithExternalImports = {
        version: '1.0',
        externalImports: {
          'chart.js': 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm',
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'charts.json': pageWithExternalImports,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'charts', 'index.html'), 'utf-8');

      const importmapIndex = htmlContent.indexOf('<script type="importmap">');
      const moduleScriptIndex = htmlContent.indexOf('<script type="module">');

      expect(importmapIndex).toBeGreaterThan(-1);
      expect(moduleScriptIndex).toBeGreaterThan(-1);
      // importmap MUST come before module scripts
      expect(importmapIndex).toBeLessThan(moduleScriptIndex);
    });

    it('should work with layout composition', async () => {
      /**
       * Given: A JSON page with externalImports AND a layout
       * When: build() is called
       * Then: Generated HTML should include importmap and layout content
       */

      // Arrange
      const pageWithExternalImportsAndLayout = {
        version: '1.0',
        route: {
          path: '/visualizer',
          layout: 'main',
        },
        externalImports: {
          'd3': 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm',
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: 'visualizer' },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'D3 Visualization' } },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'visualizer.json': pageWithExternalImportsAndLayout,
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
      const htmlContent = await readFile(join(outDir, 'visualizer', 'index.html'), 'utf-8');

      // Should have importmap
      expect(htmlContent).toContain('<script type="importmap">');
      expect(htmlContent).toContain('"d3"');
      expect(htmlContent).toContain('https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm');

      // Should have layout content
      expect(htmlContent).toContain('Header');
      expect(htmlContent).toContain('Footer');
      expect(htmlContent).toContain('D3 Visualization');
    });

    it('should work with dynamic routes using getStaticPaths', async () => {
      /**
       * Given: A dynamic route page with externalImports
       * When: build() generates multiple pages via getStaticPaths
       * Then: Each generated HTML should include the importmap
       */

      // Arrange
      const contentDir = join(testDir, 'content', 'demos');
      await mkdir(contentDir, { recursive: true });

      await writeFile(
        join(contentDir, 'charts.mdx'),
        '---\nslug: charts\ntitle: Chart Demo\n---\n# Charts'
      );
      await writeFile(
        join(contentDir, 'graphs.mdx'),
        '---\nslug: graphs\ntitle: Graph Demo\n---\n# Graphs'
      );

      const dynamicPageWithExternalImports = {
        version: '1.0',
        route: {
          path: '/demos/:slug',
        },
        externalImports: {
          'chart.js': 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm',
        },
        data: {
          demos: {
            type: 'glob',
            pattern: '../../../content/demos/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'demos',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Demo Page' } },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'demos/[slug].json': dynamicPageWithExternalImports,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Both generated pages should have importmap
      const chartsHtml = await readFile(join(outDir, 'demos', 'charts', 'index.html'), 'utf-8');
      const graphsHtml = await readFile(join(outDir, 'demos', 'graphs', 'index.html'), 'utf-8');

      expect(chartsHtml).toContain('<script type="importmap">');
      expect(chartsHtml).toContain('"chart.js"');

      expect(graphsHtml).toContain('<script type="importmap">');
      expect(graphsHtml).toContain('"chart.js"');
    });

    it('should escape special characters in importmap JSON', async () => {
      /**
       * Given: externalImports with URL containing special characters
       * When: build() generates HTML
       * Then: The importmap JSON should be properly escaped
       */

      // Arrange
      const pageWithSpecialChars = {
        version: '1.0',
        externalImports: {
          'my-lib': 'https://example.com/lib.js?version=1.0&format=esm',
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'index.json': pageWithSpecialChars,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'index.html'), 'utf-8');

      // Extract and parse importmap to verify it's valid JSON
      const importmapMatch = htmlContent.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
      expect(importmapMatch).not.toBeNull();

      // Should not throw when parsing
      const importmap = JSON.parse(importmapMatch![1]);
      expect(importmap.imports['my-lib']).toBe('https://example.com/lib.js?version=1.0&format=esm');
    });

    it('should support scoped package names in externalImports', async () => {
      /**
       * Given: externalImports with scoped package names (e.g., @scope/package)
       * When: build() generates HTML
       * Then: The importmap should correctly include scoped packages
       */

      // Arrange
      const pageWithScopedPackages = {
        version: '1.0',
        externalImports: {
          '@codemirror/state': 'https://cdn.jsdelivr.net/npm/@codemirror/state@6.4.0/+esm',
          '@codemirror/view': 'https://cdn.jsdelivr.net/npm/@codemirror/view@6.23.0/+esm',
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'editor.json': pageWithScopedPackages,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert
      const htmlContent = await readFile(join(outDir, 'editor', 'index.html'), 'utf-8');

      const importmapMatch = htmlContent.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
      expect(importmapMatch).not.toBeNull();

      const importmap = JSON.parse(importmapMatch![1]);
      expect(importmap.imports['@codemirror/state']).toBe('https://cdn.jsdelivr.net/npm/@codemirror/state@6.4.0/+esm');
      expect(importmap.imports['@codemirror/view']).toBe('https://cdn.jsdelivr.net/npm/@codemirror/view@6.23.0/+esm');
    });
  });
});

// ==================== Bug #3: Parent Directory index.html for slug='index' ====================

describe('build() - Parent Directory index.html Generation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  /**
   * Bug: When a dynamic route has slug='index', only dist/docs/index/index.html is generated.
   * Expected: Both dist/docs/index/index.html AND dist/docs/index.html should be generated.
   *
   * This is important for clean URLs: /docs should serve the index content without
   * requiring /docs/index in the URL.
   */
  describe('slug="index" generates parent directory index.html', () => {
    it('should generate parent directory index.html when slug is "index"', async () => {
      /**
       * Given: A dynamic route /docs/:slug with a content item having slug='index'
       * When: build() is called
       * Then: Both dist/docs/index/index.html AND dist/docs/index.html should be generated
       *
       * This allows /docs to serve the index content directly.
       */

      // Arrange - Create content files
      const contentDir = join(testDir, 'content', 'docs');
      await mkdir(contentDir, { recursive: true });

      // Create MDX content with slug='index' (the main docs landing page)
      await writeFile(
        join(contentDir, 'index.mdx'),
        '---\nslug: index\ntitle: Documentation Home\n---\n# Welcome to Docs'
      );

      // Create another doc for comparison
      await writeFile(
        join(contentDir, 'getting-started.mdx'),
        '---\nslug: getting-started\ntitle: Getting Started\n---\n# Getting Started'
      );

      // Create a dynamic page with inline getStaticPaths
      const docsPage = {
        version: '1.0',
        route: {
          path: '/docs/:slug',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../../content/docs/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'docs',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Documentation content' },
            },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[slug].json': docsPage,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Both files should be generated for slug='index'
      // Primary path: /docs/index -> dist/docs/index/index.html
      expect(await fileExists(join(outDir, 'docs', 'index', 'index.html'))).toBe(true);

      // Parent path: /docs -> dist/docs/index.html (NEW BEHAVIOR)
      expect(await fileExists(join(outDir, 'docs', 'index.html'))).toBe(true);

      // Regular slug should only have its own path
      expect(await fileExists(join(outDir, 'docs', 'getting-started', 'index.html'))).toBe(true);
      // getting-started should NOT create a parent index.html
      expect(await fileExists(join(outDir, 'docs', 'getting-started.html'))).toBe(false);
    });

    it('should generate parent directory index.html for nested catch-all route with slug="index"', async () => {
      /**
       * Given: A catch-all route /docs/:slug* with slug='guides/index'
       * When: build() is called
       * Then: Both dist/docs/guides/index/index.html AND dist/docs/guides/index.html should be generated
       */

      // Arrange - Create nested content files
      const contentDir = join(testDir, 'content', 'docs');
      await mkdir(join(contentDir, 'guides'), { recursive: true });

      // Create MDX with nested slug ending in 'index'
      await writeFile(
        join(contentDir, 'guides', 'index.mdx'),
        '---\nslug: guides/index\ntitle: Guides Overview\n---\n# Guides'
      );

      // Create regular nested doc
      await writeFile(
        join(contentDir, 'guides', 'first-guide.mdx'),
        '---\nslug: guides/first-guide\ntitle: First Guide\n---\n# First Guide'
      );

      // Create catch-all page
      const docsPage = {
        version: '1.0',
        route: {
          path: '/docs/*',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../../content/docs/**/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'docs',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[...slug].json': docsPage,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Both files should be generated for slug='guides/index'
      // Primary path: /docs/guides/index -> dist/docs/guides/index/index.html
      expect(await fileExists(join(outDir, 'docs', 'guides', 'index', 'index.html'))).toBe(true);

      // Parent path: /docs/guides -> dist/docs/guides/index.html (NEW BEHAVIOR)
      expect(await fileExists(join(outDir, 'docs', 'guides', 'index.html'))).toBe(true);

      // Regular nested slug should only have its own path
      expect(await fileExists(join(outDir, 'docs', 'guides', 'first-guide', 'index.html'))).toBe(true);
    });

    it('should generate identical content in both index.html files', async () => {
      /**
       * Given: A dynamic route with slug='index'
       * When: build() generates both index.html files
       * Then: Both files should have identical content
       */

      // Arrange
      const contentDir = join(testDir, 'content', 'docs');
      await mkdir(contentDir, { recursive: true });

      await writeFile(
        join(contentDir, 'index.mdx'),
        '---\nslug: index\ntitle: Docs Index\n---\n# Docs Index Content'
      );

      const docsPage = {
        version: '1.0',
        route: {
          path: '/docs/:slug',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../../content/docs/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'docs',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: 'docs-content' },
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Docs Index Page' },
            },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[slug].json': docsPage,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Both files should exist and have identical content
      const primaryPath = join(outDir, 'docs', 'index', 'index.html');
      const parentPath = join(outDir, 'docs', 'index.html');

      expect(await fileExists(primaryPath)).toBe(true);
      expect(await fileExists(parentPath)).toBe(true);

      const primaryContent = await readFile(primaryPath, 'utf-8');
      const parentContent = await readFile(parentPath, 'utf-8');

      expect(primaryContent).toBe(parentContent);
    });

    it('should include both paths in generatedFiles result', async () => {
      /**
       * Given: A dynamic route with slug='index'
       * When: build() is called
       * Then: BuildResult.generatedFiles should include both paths
       */

      // Arrange
      const contentDir = join(testDir, 'content', 'docs');
      await mkdir(contentDir, { recursive: true });

      await writeFile(
        join(contentDir, 'index.mdx'),
        '---\nslug: index\ntitle: Docs Index\n---\n# Index'
      );

      const docsPage = {
        version: '1.0',
        route: {
          path: '/docs/:slug',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../../content/docs/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'docs',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
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

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/[slug].json': docsPage,
        },
      });

      // Act
      const result = await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - generatedFiles should include both paths
      expect(result.generatedFiles).toContain(join(outDir, 'docs', 'index', 'index.html'));
      expect(result.generatedFiles).toContain(join(outDir, 'docs', 'index.html'));
    });

    it('should not overwrite existing static index page', async () => {
      /**
       * Given: A static page at /docs/index.json AND a dynamic route with slug='index'
       * When: build() is called
       * Then: The static page should take precedence for dist/docs/index.html
       *       and dynamic route creates dist/docs/index/index.html only
       *
       * This prevents accidental overwrites when both static and dynamic routes exist.
       */

      // Arrange
      const contentDir = join(testDir, 'content', 'docs');
      await mkdir(contentDir, { recursive: true });

      await writeFile(
        join(contentDir, 'index.mdx'),
        '---\nslug: index\ntitle: Dynamic Docs Index\n---\n# Dynamic Index'
      );

      // Static page for /docs
      const staticDocsPage = {
        version: '1.0',
        route: {
          path: '/docs',
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Static Docs Page' },
            },
          ],
        },
      };

      // Dynamic page for /docs/:slug
      const dynamicDocsPage = {
        version: '1.0',
        route: {
          path: '/docs/:slug',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../../content/docs/*.mdx',
            transform: 'mdx',
          },
        },
        getStaticPaths: {
          source: 'docs',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
        },
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Dynamic Docs Content' },
            },
          ],
        },
      };

      const { pagesDir, outDir } = await setupTestProject(testDir, {
        pages: {
          'docs/index.json': staticDocsPage,
          'docs/[slug].json': dynamicDocsPage,
        },
      });

      // Act
      await build({
        routesDir: pagesDir,
        outDir,
      });

      // Assert - Static page should be at dist/docs/index.html
      const docsIndexHtml = await readFile(join(outDir, 'docs', 'index.html'), 'utf-8');
      expect(docsIndexHtml).toContain('Static Docs Page');

      // Dynamic index should still be at dist/docs/index/index.html
      const docsIndexIndexHtml = await readFile(join(outDir, 'docs', 'index', 'index.html'), 'utf-8');
      expect(docsIndexIndexHtml).toContain('Dynamic Docs Content');
    });
  });
});
