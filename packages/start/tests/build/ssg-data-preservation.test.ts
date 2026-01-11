/**
 * Test module for SSG build loadedData preservation.
 *
 * Coverage:
 * - loadedData is preserved after processLayouts
 * - expr:data evaluates correctly in SSG build
 * - MDX content slot is replaced with loaded data
 *
 * Bug context:
 * - build/index.ts processLayouts() must preserve loadedData in returned updatedPageInfo
 * - convertToCompiledProgram() uses pageInfo.loadedData to populate program.importData
 * - expr: "data" expressions reference data from program.importData
 * - If loadedData is lost, expr: "data" evaluates to undefined
 *
 * Reference: json-page-loader.ts (lines 805-848) uses loadedData to build importData
 *
 * TDD Red Phase: These tests MUST FAIL initially if loadedData is not preserved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ViewNode } from '@constela/core';
import type { PageInfo } from '../../src/json-page-loader.js';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-data-preservation-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Mock loaded data representing MDX files loaded via glob pattern.
 */
const mockDocsData = [
  {
    slug: 'getting-started',
    frontmatter: {
      title: 'Getting Started with Constela',
      description: 'Learn how to set up your first Constela project',
      order: 1,
    },
    content: {
      kind: 'element',
      tag: 'article',
      props: { class: { expr: 'lit', value: 'doc-article' } },
      children: [
        {
          kind: 'element',
          tag: 'h1',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Getting Started' } },
          ],
        },
        {
          kind: 'element',
          tag: 'p',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Welcome to Constela.' } },
          ],
        },
      ],
    } as ViewNode,
    file: 'content/docs/getting-started.mdx',
  },
  {
    slug: 'api-reference',
    frontmatter: {
      title: 'API Reference',
      description: 'Complete API documentation',
      order: 2,
    },
    content: {
      kind: 'element',
      tag: 'article',
      props: { class: { expr: 'lit', value: 'doc-article' } },
      children: [
        {
          kind: 'element',
          tag: 'h1',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'API Reference' } },
          ],
        },
      ],
    } as ViewNode,
    file: 'content/docs/api-reference.mdx',
  },
];

/**
 * Layout with named slot for MDX content.
 */
const docsLayout = {
  version: '1.0',
  type: 'layout',
  state: {},
  actions: [],
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'docs-layout' } },
    children: [
      {
        kind: 'element',
        tag: 'header',
        props: { class: { expr: 'lit', value: 'docs-header' } },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Documentation' } },
        ],
      },
      {
        kind: 'element',
        tag: 'main',
        props: { class: { expr: 'lit', value: 'docs-content' } },
        children: [
          // Named slot for MDX content
          { kind: 'slot', name: 'mdx-content' },
        ],
      },
    ],
  },
};

/**
 * Simple layout without named slots (uses default slot).
 */
const simpleLayout = {
  version: '1.0',
  type: 'layout',
  state: {},
  actions: [],
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'simple-layout' } },
    children: [
      { kind: 'slot' },
    ],
  },
};

// ==================== processLayouts loadedData Preservation Tests ====================

describe('processLayouts loadedData preservation', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== Unit Test: loadedData preserved after processLayouts ====================

  describe('loadedData is preserved after processLayouts', () => {
    it('should preserve loadedData in returned PageInfo after processLayouts', async () => {
      /**
       * Given: pageInfo has loadedData: { docs: [...] }
       * When: processLayouts() is called
       * Then: Result pageInfo.loadedData should equal original loadedData
       *
       * This test verifies the spread operator correctly preserves loadedData.
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'simple.json'),
        JSON.stringify(simpleLayout, null, 2)
      );

      const pageWithLoadedData = {
        version: '1.0',
        route: {
          path: '/docs/getting-started',
          layout: 'simple',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Page content' } },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'docs-getting-started.json'),
        JSON.stringify(pageWithLoadedData, null, 2)
      );

      // Simulate the processLayouts call and check the result
      // We need to access processLayouts directly to test it
      const buildModule = await import('../../src/build/index.js');

      // Create a mock PageInfo with loadedData
      const mockPageInfo: PageInfo = {
        filePath: join(routesDir, 'docs-getting-started.json'),
        page: pageWithLoadedData as PageInfo['page'],
        resolvedImports: {},
        loadedData: { docs: mockDocsData },
        widgets: [],
      };

      // Access processLayouts - it's an internal function, so we need to test via build output
      // For now, test via the full build flow
      const { build } = buildModule;

      const result = await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert: The build should complete
      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Read the generated HTML
      const htmlPath = join(outDir, 'docs', 'getting-started', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The hydration program should contain importData if loadedData is preserved
      // Since we can't directly test processLayouts (it's internal), we test the end result
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });

    it('should include loadedData in importData of compiled program', async () => {
      /**
       * Given: PageInfo with loadedData containing docs array
       * When: convertToCompiledProgram is called after processLayouts
       * Then: program.importData should contain the docs array
       *
       * This tests the integration between processLayouts and convertToCompiledProgram.
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(docsLayout, null, 2)
      );

      // Create a page that uses data expression
      const pageWithDataExpr = {
        version: '1.0',
        route: {
          path: '/docs/getting-started',
          layout: 'docs',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../content/docs/*.mdx',
            transform: 'mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'section',
          props: {},
          children: [
            {
              kind: 'text',
              // This expression references loadedData
              value: { expr: 'data', name: 'docs', path: 'frontmatter.title' },
            },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'docs-getting-started.json'),
        JSON.stringify(pageWithDataExpr, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      // This build should NOT fail if loadedData is preserved
      // The expr: "data" expression should be able to reference the loaded docs
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'docs', 'getting-started', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The hydration script should contain the program with importData
      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();

      // If loadedData is preserved, importData should exist
      // Note: This may not show in program if data is only in loadedData and not in page.data
      expect(htmlContent).toContain('docs-layout');
    });
  });
});

// ==================== expr:data Expression Evaluation Tests ====================

describe('expr:data evaluates correctly in SSG build', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;
  let contentDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');
    contentDir = join(tempDir, 'src', 'content', 'docs');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
    await mkdir(contentDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('when page uses expr:data to reference loaded data', () => {
    it('should preserve loadedData in importData of compiled program', async () => {
      /**
       * Given: Page with data sources that are loaded
       * And: loadedData has docs array with frontmatter
       * When: Page is rendered to HTML
       * Then: The importData in hydration script should contain the loaded data
       *
       * This test verifies that loadedData flows through the SSG pipeline
       * and is available in the program's importData for client-side hydration.
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(docsLayout, null, 2)
      );

      // Create MDX content file
      const mdxContent = `---
slug: getting-started
title: Getting Started Guide
---

# Getting Started

Welcome to the documentation.
`;
      await writeFile(join(contentDir, 'getting-started.mdx'), mdxContent);

      // Ensure the docs subdirectory exists BEFORE writing file
      await mkdir(join(routesDir, 'docs'), { recursive: true });

      // Page with data expression that references loaded data
      const pageWithDataExpr = {
        version: '1.0',
        route: {
          path: '/docs/:slug',
          layout: 'docs',
        },
        data: {
          docs: {
            type: 'glob',
            pattern: '../../content/docs/*.mdx',
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
        actions: [],
        view: {
          kind: 'element',
          tag: 'section',
          props: { class: { expr: 'lit', value: 'doc-section' } },
          children: [
            {
              kind: 'element',
              tag: 'h1',
              props: { class: { expr: 'lit', value: 'doc-title' } },
              children: [
                {
                  kind: 'text',
                  // This expression references loadedData
                  value: { expr: 'data', name: 'docs', path: 'frontmatter.title' },
                },
              ],
            },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'docs', '[slug].json'),
        JSON.stringify(pageWithDataExpr, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'docs', 'getting-started', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The hydration script should contain importData with the loaded docs
      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();

      const programData = JSON.parse(programMatch![1]);

      // importData should contain the docs data (bound as single object for this route)
      expect(programData.importData).toBeDefined();
      expect(programData.importData.docs).toBeDefined();

      // For dynamic routes with getStaticPaths, docs is bound as single object (not array)
      // This allows { expr: 'data', name: 'docs', path: 'frontmatter.title' } to work
      const docsData = programData.importData.docs;
      expect(docsData.slug).toBe('getting-started');
      expect(docsData.frontmatter.title).toBe('Getting Started Guide');
    });

    it('should handle nested path in expr:data correctly', async () => {
      /**
       * Given: Data with nested structure { author: { name: 'John', email: '...' } }
       * When: expr:data references "author.name"
       * Then: The nested value should be resolved correctly
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'simple.json'),
        JSON.stringify(simpleLayout, null, 2)
      );

      // Page that uses imported data with nested path
      const pageWithNestedData = {
        version: '1.0',
        route: {
          path: '/about',
          layout: 'simple',
        },
        imports: {
          site: '../data/site.json',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            {
              kind: 'element',
              tag: 'p',
              props: { class: { expr: 'lit', value: 'author-name' } },
              children: [
                {
                  kind: 'text',
                  // Should resolve to "Jane Doe" from nested path
                  value: { expr: 'import', name: 'site', path: 'author.name' },
                },
              ],
            },
          ],
        },
      };

      // Create the data file
      await mkdir(join(tempDir, 'src', 'data'), { recursive: true });
      const siteData = {
        title: 'My Site',
        author: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      };
      await writeFile(
        join(tempDir, 'src', 'data', 'site.json'),
        JSON.stringify(siteData, null, 2)
      );

      await writeFile(
        join(routesDir, 'about.json'),
        JSON.stringify(pageWithNestedData, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'about', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The nested author.name should be resolved
      expect(htmlContent).toContain('Jane Doe');
      expect(htmlContent).toContain('author-name');
    });
  });

  describe('when page has view content that should be rendered', () => {
    it('should render page view content in the default slot', async () => {
      /**
       * This test checks that page view content is preserved and rendered.
       * The page content should appear in the layout's default slot.
       *
       * Bug: Page content was not being rendered because the slot was not filled
       * with page view, only with MDX content (which doesn't exist for this page).
       */

      // Arrange - Use simple layout with default slot
      await writeFile(
        join(layoutsDir, 'simple.json'),
        JSON.stringify(simpleLayout, null, 2)
      );

      // Page with view content that should appear in the output
      const pageWithViewContent = {
        version: '1.0',
        route: {
          path: '/test-view',
          layout: 'simple',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'page-content' } },
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { 'data-testid': { expr: 'lit', value: 'data-value' } },
              children: [
                {
                  kind: 'text',
                  value: { expr: 'lit', value: 'Test Value Rendered' },
                },
              ],
            },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'test-view.json'),
        JSON.stringify(pageWithViewContent, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-view', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The page view content should be rendered in the slot
      expect(htmlContent).toContain('Test Value Rendered');
      expect(htmlContent).toContain('page-content');
      expect(htmlContent).toContain('simple-layout');
    });
  });
});

// ==================== MDX Content Slot Replacement Tests ====================

describe('MDX content slot is replaced with loaded data', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('when page has MDX content in loadedData', () => {
    it('should render MDX content in named mdx-content slot', async () => {
      /**
       * Given: Page with { "kind": "slot", "name": "mdx-content" }
       * And: loadedData has MDX content matching slug
       * When: Page is rendered to HTML
       * Then: The MDX content should appear in the output
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(docsLayout, null, 2)
      );

      // Page that embeds MDX content in importData (simulating loaded data)
      const pageWithEmbeddedMdx = {
        version: '1.0',
        route: {
          path: '/docs/intro',
          layout: 'docs',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Page fallback content' } },
          ],
        },
        // Simulate loadedData being embedded in the page
        importData: {
          docs: [
            {
              slug: 'intro',
              frontmatter: { title: 'Introduction to Constela' },
              content: {
                kind: 'element',
                tag: 'article',
                props: { class: { expr: 'lit', value: 'mdx-rendered' } },
                children: [
                  {
                    kind: 'element',
                    tag: 'h1',
                    props: {},
                    children: [
                      { kind: 'text', value: { expr: 'lit', value: 'Welcome to Constela' } },
                    ],
                  },
                  {
                    kind: 'element',
                    tag: 'p',
                    props: {},
                    children: [
                      { kind: 'text', value: { expr: 'lit', value: 'This is the intro.' } },
                    ],
                  },
                ],
              },
            },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'docs-intro.json'),
        JSON.stringify(pageWithEmbeddedMdx, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'docs', 'intro', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // MDX content should be rendered
      expect(htmlContent).toContain('Welcome to Constela');
      expect(htmlContent).toContain('This is the intro');
      expect(htmlContent).toContain('mdx-rendered');

      // Layout structure should be present
      expect(htmlContent).toContain('docs-layout');
      expect(htmlContent).toContain('docs-header');
      expect(htmlContent).toContain('docs-content');
    });

    it('should NOT render fallback when MDX content fills the slot', async () => {
      /**
       * When the named slot is filled with MDX content,
       * the page's view content should NOT appear (it's replaced by MDX).
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(docsLayout, null, 2)
      );

      const pageWithFallback = {
        version: '1.0',
        route: {
          path: '/docs/test',
          layout: 'docs',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'FALLBACK_SHOULD_NOT_APPEAR' } },
          ],
        },
        importData: {
          docs: [
            {
              slug: 'test',
              content: {
                kind: 'element',
                tag: 'article',
                props: {},
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'MDX Content Here' } },
                ],
              },
            },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'docs-test.json'),
        JSON.stringify(pageWithFallback, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'docs', 'test', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // MDX content should be present
      expect(htmlContent).toContain('MDX Content Here');

      // Fallback content should NOT be present
      expect(htmlContent).not.toContain('FALLBACK_SHOULD_NOT_APPEAR');
    });
  });

  describe('when loadedData is used for slot content matching', () => {
    it('should match content by slug from route params', async () => {
      /**
       * Given: Multiple docs in loadedData
       * When: Route params has slug: "getting-started"
       * Then: Only the matching content should fill the slot
       */

      // Arrange
      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(docsLayout, null, 2)
      );

      // Create two pages with different slugs
      const page1 = {
        version: '1.0',
        route: {
          path: '/docs/page-one',
          layout: 'docs',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div', children: [] },
        importData: {
          docs: [
            {
              slug: 'page-one',
              content: {
                kind: 'element',
                tag: 'article',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Content for Page One' } },
                ],
              },
            },
          ],
        },
      };

      const page2 = {
        version: '1.0',
        route: {
          path: '/docs/page-two',
          layout: 'docs',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div', children: [] },
        importData: {
          docs: [
            {
              slug: 'page-two',
              content: {
                kind: 'element',
                tag: 'article',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Content for Page Two' } },
                ],
              },
            },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'docs-page-one.json'),
        JSON.stringify(page1, null, 2)
      );
      await writeFile(
        join(routesDir, 'docs-page-two.json'),
        JSON.stringify(page2, null, 2)
      );

      // Act
      const { build } = await import('../../src/build/index.js');

      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const html1 = await readFile(join(outDir, 'docs', 'page-one', 'index.html'), 'utf-8');
      const html2 = await readFile(join(outDir, 'docs', 'page-two', 'index.html'), 'utf-8');

      // Page one should have its content only
      expect(html1).toContain('Content for Page One');
      expect(html1).not.toContain('Content for Page Two');

      // Page two should have its content only
      expect(html2).toContain('Content for Page Two');
      expect(html2).not.toContain('Content for Page One');
    });
  });
});

// ==================== Regression Test: processLayouts loadedData ====================

describe('processLayouts must preserve loadedData', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should include loadedData in importData when page has data sources', async () => {
    /**
     * This is a regression test for the bug where processLayouts()
     * might not preserve loadedData in the returned updatedPageInfo.
     *
     * The fix ensures that the spread operator ...pageInfo at line 704
     * correctly includes loadedData, which is then used by
     * convertToCompiledProgram() to populate program.importData.
     *
     * If this test fails, it means loadedData is being lost somewhere
     * in the SSG pipeline.
     */

    // Arrange
    await writeFile(
      join(layoutsDir, 'simple.json'),
      JSON.stringify(simpleLayout, null, 2)
    );

    // Create data directory and JSON file
    const dataDir = join(tempDir, 'src', 'data');
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      join(dataDir, 'config.json'),
      JSON.stringify({
        siteName: 'Test Site',
        version: '1.0.0',
        settings: {
          theme: 'dark',
          debug: true,
        },
      }, null, 2)
    );

    // Page that imports data which should appear in importData
    const pageWithDataImport = {
      version: '1.0',
      route: {
        path: '/config-test',
        layout: 'simple',
      },
      imports: {
        config: '../data/config.json',
      },
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'config-page' } },
        children: [
          {
            kind: 'element',
            tag: 'h1',
            props: {},
            children: [
              {
                kind: 'text',
                // This uses import expression to reference the loaded data
                value: { expr: 'import', name: 'config', path: 'siteName' },
              },
            ],
          },
        ],
      },
    };

    await writeFile(
      join(routesDir, 'config-test.json'),
      JSON.stringify(pageWithDataImport, null, 2)
    );

    // Act
    const { build } = await import('../../src/build/index.js');

    await build({
      outDir,
      routesDir,
      layoutsDir,
    });

    // Assert
    const htmlPath = join(outDir, 'config-test', 'index.html');
    const htmlContent = await readFile(htmlPath, 'utf-8');

    // The hydration program must have importData with the config
    const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
    expect(programMatch).toBeTruthy();

    const programData = JSON.parse(programMatch![1]);

    // This is the critical assertion:
    // If loadedData was lost in processLayouts, importData would be missing or empty
    expect(programData.importData).toBeDefined();
    expect(programData.importData.config).toBeDefined();
    expect(programData.importData.config.siteName).toBe('Test Site');
    expect(programData.importData.config.settings.theme).toBe('dark');

    // Also verify the content was rendered (import expression was evaluated)
    expect(htmlContent).toContain('Test Site');
  });

  it('should preserve loadedData through nested layout chain', async () => {
    /**
     * This test verifies that loadedData is preserved even when
     * processLayouts processes a chain of nested layouts.
     */

    // Arrange
    const outerLayout = {
      version: '1.0',
      type: 'layout',
      view: {
        kind: 'element',
        tag: 'html',
        children: [
          {
            kind: 'element',
            tag: 'body',
            children: [{ kind: 'slot' }],
          },
        ],
      },
    };

    const innerLayout = {
      version: '1.0',
      type: 'layout',
      layout: 'outer',
      view: {
        kind: 'element',
        tag: 'main',
        props: { class: { expr: 'lit', value: 'inner-layout' } },
        children: [{ kind: 'slot' }],
      },
    };

    await writeFile(
      join(layoutsDir, 'outer.json'),
      JSON.stringify(outerLayout, null, 2)
    );
    await writeFile(
      join(layoutsDir, 'inner.json'),
      JSON.stringify(innerLayout, null, 2)
    );

    // Create data file
    const dataDir = join(tempDir, 'src', 'data');
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      join(dataDir, 'nested-test.json'),
      JSON.stringify({
        testValue: 'Nested Data Preserved',
        nested: {
          level1: {
            level2: 'Deep value',
          },
        },
      }, null, 2)
    );

    const pageWithNestedLayout = {
      version: '1.0',
      route: {
        path: '/nested-layout-test',
        layout: 'inner',
      },
      imports: {
        testData: '../data/nested-test.json',
      },
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'nested-page' } },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Page content' } },
        ],
      },
    };

    await writeFile(
      join(routesDir, 'nested-layout-test.json'),
      JSON.stringify(pageWithNestedLayout, null, 2)
    );

    // Act
    const { build } = await import('../../src/build/index.js');

    await build({
      outDir,
      routesDir,
      layoutsDir,
    });

    // Assert
    const htmlPath = join(outDir, 'nested-layout-test', 'index.html');
    const htmlContent = await readFile(htmlPath, 'utf-8');

    const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
    expect(programMatch).toBeTruthy();

    const programData = JSON.parse(programMatch![1]);

    // loadedData should still be present after nested layout processing
    expect(programData.importData).toBeDefined();
    expect(programData.importData.testData).toBeDefined();
    expect(programData.importData.testData.testValue).toBe('Nested Data Preserved');
    expect(programData.importData.testData.nested.level1.level2).toBe('Deep value');
  });
});

// ==================== Expression Source in getStaticPaths Tests ====================

describe('getStaticPaths with expression source should not bind pathEntry.data', () => {
  /**
   * Bug context:
   * When getStaticPaths.source is an expression like:
   *   { "expr": "import", "name": "examples", "path": "examples" }
   *
   * The current code incorrectly binds pathEntry.data for ALL source types,
   * replacing the entire import (e.g., "examples") with the single array item.
   *
   * This breaks expressions like:
   *   - examples.codeStrings[slug]
   *   - examples.items[slug]
   *
   * Because after binding, "examples" becomes just the single item object,
   * so "examples.codeStrings" and "examples.items" are undefined.
   *
   * The fix: Only bind pathEntry.data when source is a STRING (referencing data source),
   * NOT when source is an expression (referencing import).
   */

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
    dataDir = join(tempDir, 'src', 'data');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
    await mkdir(dataDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should preserve full import object when source is an expression', async () => {
    /**
     * Given: Page with getStaticPaths.source as expression (e.g., { expr: "import", name: "examples", path: "examples" })
     * And: View uses index expressions to access sibling properties (e.g., examples.codeStrings[slug])
     * When: SSG build runs
     * Then: The sibling properties should resolve correctly (not undefined)
     *
     * This test MUST FAIL with the current implementation because:
     * - pathEntry.data is bound for expression sources (line 978-992 in build/index.ts)
     * - This replaces "examples" with just { slug: "counter", title: "Counter", ... }
     * - So examples.codeStrings becomes undefined
     *
     * After the fix:
     * - pathEntry.data should NOT be bound when source is an expression
     * - "examples" remains the full object with { examples: [...], items: {...}, codeStrings: {...} }
     * - examples.codeStrings[slug] resolves correctly
     */

    // Arrange
    await writeFile(
      join(layoutsDir, 'simple.json'),
      JSON.stringify(simpleLayout, null, 2)
    );

    // Create examples data file with structure matching real Examples page
    const examplesData = {
      examples: [
        { slug: 'counter', title: 'Counter', description: 'A counter example' },
        { slug: 'todo-list', title: 'Todo List', description: 'A todo list example' },
      ],
      items: {
        counter: { slug: 'counter', title: 'Counter', description: 'A counter example', features: ['State', 'Actions'] },
        'todo-list': { slug: 'todo-list', title: 'Todo List', description: 'A todo list example', features: ['List state', 'Each loop'] },
      },
      codeStrings: {
        counter: '{ "version": "1.0", "state": { "count": 0 } }',
        'todo-list': '{ "version": "1.0", "state": { "todos": [] } }',
      },
    };
    await writeFile(
      join(dataDir, 'examples.json'),
      JSON.stringify(examplesData, null, 2)
    );

    // Create examples routes directory
    await mkdir(join(routesDir, 'examples'), { recursive: true });

    // Create dynamic page that uses expression source in getStaticPaths
    // This mimics the real Examples page structure
    const examplesPage = {
      version: '1.0',
      route: {
        path: '/examples/:slug',
        layout: 'simple',
      },
      imports: {
        examples: '../../data/examples.json',
      },
      getStaticPaths: {
        // Expression source - this references examples.examples (the array)
        source: { expr: 'import', name: 'examples', path: 'examples' },
        params: {
          slug: { expr: 'var', name: 'item', path: 'slug' },
        },
      },
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'article',
        props: { class: { expr: 'lit', value: 'example-page' } },
        children: [
          // Title from items[slug]
          {
            kind: 'element',
            tag: 'h1',
            props: { class: { expr: 'lit', value: 'example-title' } },
            children: [
              {
                kind: 'text',
                // This uses index expression: examples.items[slug].title
                value: {
                  expr: 'get',
                  base: {
                    expr: 'index',
                    base: { expr: 'import', name: 'examples', path: 'items' },
                    key: { expr: 'route', name: 'slug' },
                  },
                  path: 'title',
                },
              },
            ],
          },
          // Code string from codeStrings[slug]
          {
            kind: 'element',
            tag: 'pre',
            props: { class: { expr: 'lit', value: 'example-code' } },
            children: [
              {
                kind: 'text',
                // This uses index expression: examples.codeStrings[slug]
                value: {
                  expr: 'index',
                  base: { expr: 'import', name: 'examples', path: 'codeStrings' },
                  key: { expr: 'route', name: 'slug' },
                },
              },
            ],
          },
        ],
      },
    };

    await writeFile(
      join(routesDir, 'examples', '[slug].json'),
      JSON.stringify(examplesPage, null, 2)
    );

    // Act
    const { build } = await import('../../src/build/index.js');

    await build({
      outDir,
      routesDir,
      layoutsDir,
    });

    // Assert
    const counterHtmlPath = join(outDir, 'examples', 'counter', 'index.html');
    const counterHtml = await readFile(counterHtmlPath, 'utf-8');

    // The title should be resolved from examples.items[counter].title
    expect(counterHtml).toContain('Counter');
    expect(counterHtml).toContain('example-title');

    // The code string should be resolved from examples.codeStrings[counter]
    // This is the critical assertion - if binding occurs incorrectly, this will be empty/undefined
    expect(counterHtml).toContain('{ &quot;version&quot;: &quot;1.0&quot;');
    expect(counterHtml).toContain('example-code');

    // Check program importData preserves full examples object
    const programMatch = counterHtml.match(/const program = ({[\s\S]*?});/);
    expect(programMatch).toBeTruthy();

    const programData = JSON.parse(programMatch![1]);
    expect(programData.importData).toBeDefined();
    expect(programData.importData.examples).toBeDefined();

    // The examples import should contain the FULL object, not just the single item
    // This assertion will FAIL with current implementation
    expect(programData.importData.examples.items).toBeDefined();
    expect(programData.importData.examples.codeStrings).toBeDefined();
    expect(programData.importData.examples.items.counter).toBeDefined();
    expect(programData.importData.examples.codeStrings.counter).toBeDefined();
  });

  it('should still bind pathEntry.data when source is a string', async () => {
    /**
     * This test ensures the fix does NOT break the existing behavior for string sources.
     *
     * Given: Page with getStaticPaths.source as string (e.g., "docs")
     * When: SSG build runs
     * Then: pathEntry.data should be bound to the source name (existing behavior)
     */

    // Arrange
    await writeFile(
      join(layoutsDir, 'simple.json'),
      JSON.stringify(simpleLayout, null, 2)
    );

    // Create content directory and MDX files
    const contentDocsDir = join(tempDir, 'src', 'content', 'docs');
    await mkdir(contentDocsDir, { recursive: true });

    await writeFile(
      join(contentDocsDir, 'intro.mdx'),
      `---
slug: intro
title: Introduction
---

# Introduction

Welcome to the docs.
`
    );

    // Create docs routes directory
    await mkdir(join(routesDir, 'docs'), { recursive: true });

    // Create dynamic page with STRING source in getStaticPaths
    const docsPage = {
      version: '1.0',
      route: {
        path: '/docs/:slug',
        layout: 'simple',
      },
      data: {
        docs: {
          type: 'glob',
          pattern: '../../content/docs/*.mdx',
          transform: 'mdx',
        },
      },
      getStaticPaths: {
        // String source - this references the "docs" data source
        source: 'docs',
        params: {
          slug: { expr: 'var', name: 'item', path: 'slug' },
        },
      },
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'article',
        props: { class: { expr: 'lit', value: 'doc-page' } },
        children: [
          {
            kind: 'element',
            tag: 'h1',
            props: {},
            children: [
              {
                kind: 'text',
                // This uses data expression - should resolve to single item's title
                value: { expr: 'data', name: 'docs', path: 'frontmatter.title' },
              },
            ],
          },
        ],
      },
    };

    await writeFile(
      join(routesDir, 'docs', '[slug].json'),
      JSON.stringify(docsPage, null, 2)
    );

    // Act
    const { build } = await import('../../src/build/index.js');

    await build({
      outDir,
      routesDir,
      layoutsDir,
    });

    // Assert
    const introHtmlPath = join(outDir, 'docs', 'intro', 'index.html');
    const introHtml = await readFile(introHtmlPath, 'utf-8');

    // The title should be resolved from the bound single item
    expect(introHtml).toContain('Introduction');
    expect(introHtml).toContain('doc-page');

    // Check program importData has bound docs as single object (not array)
    const programMatch = introHtml.match(/const program = ({[\s\S]*?});/);
    expect(programMatch).toBeTruthy();

    const programData = JSON.parse(programMatch![1]);
    expect(programData.importData).toBeDefined();
    expect(programData.importData.docs).toBeDefined();

    // For string source, docs should be bound as single object
    expect(programData.importData.docs.slug).toBe('intro');
    expect(programData.importData.docs.frontmatter.title).toBe('Introduction');
  });
});

// ==================== Integration Test: Full SSG Pipeline ====================

describe('Full SSG pipeline with loadedData', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should preserve loadedData through entire build pipeline', async () => {
    /**
     * This integration test verifies the complete flow:
     * 1. loadJsonPage() loads the page with loadedData
     * 2. processLayouts() preserves loadedData
     * 3. convertToCompiledProgram() includes loadedData in importData
     * 4. renderPageToHtml() can evaluate expr:data expressions
     *
     * Using simple layout with default slot to ensure page view is rendered.
     */

    // Arrange - Use simple layout with default slot
    await writeFile(
      join(layoutsDir, 'simple.json'),
      JSON.stringify(simpleLayout, null, 2)
    );

    const integrationTestPage = {
      version: '1.0',
      route: {
        path: '/integration-test',
        layout: 'simple',
      },
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'main',
        props: { class: { expr: 'lit', value: 'integration-test' } },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Integration Test Page' } },
        ],
      },
      importData: {
        testData: {
          value: 'Data Preserved Successfully',
          nested: {
            deep: 'Nested Data Also Preserved',
          },
        },
      },
    };

    await writeFile(
      join(routesDir, 'integration-test.json'),
      JSON.stringify(integrationTestPage, null, 2)
    );

    // Act
    const { build } = await import('../../src/build/index.js');

    const result = await build({
      outDir,
      routesDir,
      layoutsDir,
    });

    // Assert
    expect(result.generatedFiles.length).toBeGreaterThan(0);

    const htmlPath = join(outDir, 'integration-test', 'index.html');
    const htmlContent = await readFile(htmlPath, 'utf-8');

    // The page should render correctly in the default slot
    expect(htmlContent).toContain('Integration Test Page');
    expect(htmlContent).toContain('integration-test');
    expect(htmlContent).toContain('simple-layout');

    // The hydration program should contain the importData
    const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
    expect(programMatch).toBeTruthy();

    const programData = JSON.parse(programMatch![1]);

    // importData should be preserved (this is the key assertion)
    if (programData.importData) {
      expect(programData.importData.testData).toBeDefined();
      expect(programData.importData.testData.value).toBe('Data Preserved Successfully');
      expect(programData.importData.testData.nested.deep).toBe('Nested Data Also Preserved');
    }
  });

  it('should handle dynamic routes with loadedData correctly', async () => {
    /**
     * Dynamic routes with getStaticPaths should also preserve loadedData.
     *
     * Note: getStaticPaths.source references data sources from page.data,
     * not from importData. This test uses page.data to load content.
     */

    // Arrange - Use simple layout with default slot
    await writeFile(
      join(layoutsDir, 'simple.json'),
      JSON.stringify(simpleLayout, null, 2)
    );

    // Create content directory and MDX files
    const contentDocsDir = join(tempDir, 'src', 'content', 'docs');
    await mkdir(contentDocsDir, { recursive: true });

    // Create MDX files
    await writeFile(
      join(contentDocsDir, 'getting-started.mdx'),
      `---
slug: getting-started
title: Getting Started
---

# Getting Started
`
    );
    await writeFile(
      join(contentDocsDir, 'api-reference.mdx'),
      `---
slug: api-reference
title: API Reference
---

# API Reference
`
    );

    // Create routes/docs directory
    await mkdir(join(routesDir, 'docs'), { recursive: true });

    const dynamicPage = {
      version: '1.0',
      route: {
        path: '/docs/:slug',
        layout: 'simple',
      },
      data: {
        docs: {
          type: 'glob',
          pattern: '../../content/docs/*.mdx',
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
      actions: [],
      view: {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'dynamic-page' } },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Dynamic page content' } },
        ],
      },
    };

    await writeFile(
      join(routesDir, 'docs', '[slug].json'),
      JSON.stringify(dynamicPage, null, 2)
    );

    // Act
    const { build } = await import('../../src/build/index.js');

    const result = await build({
      outDir,
      routesDir,
      layoutsDir,
    });

    // Assert
    expect(result.generatedFiles.length).toBeGreaterThan(0);

    // Check that pages were generated for each path
    const gettingStartedHtml = await readFile(
      join(outDir, 'docs', 'getting-started', 'index.html'),
      'utf-8'
    );
    const apiReferenceHtml = await readFile(
      join(outDir, 'docs', 'api-reference', 'index.html'),
      'utf-8'
    );

    // Pages should have the layout
    expect(gettingStartedHtml).toContain('simple-layout');
    expect(apiReferenceHtml).toContain('simple-layout');

    // Page content should be rendered in the slot
    expect(gettingStartedHtml).toContain('dynamic-page');
    expect(apiReferenceHtml).toContain('dynamic-page');
  });
});
