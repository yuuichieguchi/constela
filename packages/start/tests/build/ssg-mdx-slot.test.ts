/**
 * Test module for SSG MDX content slot binding.
 *
 * Coverage:
 * - extractMdxContentSlot function extracts MDX content based on route params
 * - SSG build with MDX data renders the MDX content in named slots
 * - processLayouts handles named MDX slots correctly
 *
 * Bug context:
 * - build/index.ts processLayouts() does NOT handle MDX content slots
 * - Uses applyLayout() which simply replaces slot nodes with page content
 * - Does NOT extract MDX content from loadedData based on route params
 * - Does NOT handle named slots like { kind: 'slot', name: 'mdx-content' }
 *
 * Reference: dev/server.ts (lines 177-203, 354-360) correctly implements this:
 *   const slots = extractMdxContentSlot(pageInfo.loadedData, 'docs', match.params);
 *   composedProgram = composeLayoutWithPage(compiledLayout, program, layoutParams, slots);
 *
 * TDD Red Phase: These tests MUST FAIL initially.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ViewNode } from '@constela/core';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-mdx-slot-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * MDX content ViewNode for testing.
 * This simulates the content field from MDX files after transformation.
 */
const mdxIntroContent: ViewNode = {
  kind: 'element',
  tag: 'article',
  props: { class: { expr: 'lit', value: 'mdx-article' } },
  children: [
    {
      kind: 'element',
      tag: 'h1',
      props: {},
      children: [
        { kind: 'text', value: { expr: 'lit', value: 'Introduction to Constela' } },
      ],
    },
    {
      kind: 'element',
      tag: 'p',
      props: {},
      children: [
        { kind: 'text', value: { expr: 'lit', value: 'Welcome to the documentation.' } },
      ],
    },
  ],
};

const mdxGuideContent: ViewNode = {
  kind: 'element',
  tag: 'article',
  props: { class: { expr: 'lit', value: 'mdx-article' } },
  children: [
    {
      kind: 'element',
      tag: 'h1',
      props: {},
      children: [
        { kind: 'text', value: { expr: 'lit', value: 'Getting Started Guide' } },
      ],
    },
    {
      kind: 'element',
      tag: 'p',
      props: {},
      children: [
        { kind: 'text', value: { expr: 'lit', value: 'This guide will help you get started.' } },
      ],
    },
  ],
};

/**
 * Simulated loadedData from MDX glob pattern.
 * This is what json-page-loader produces when processing MDX files.
 */
const mockLoadedData = {
  docs: [
    {
      slug: 'intro',
      frontmatter: { title: 'Introduction', order: 1 },
      content: mdxIntroContent,
      file: 'content/docs/intro.mdx',
    },
    {
      slug: 'guide',
      frontmatter: { title: 'Getting Started', order: 2 },
      content: mdxGuideContent,
      file: 'content/docs/guide.mdx',
    },
  ],
};

/**
 * Layout with named slot for MDX content.
 * This is the expected pattern for docs layouts.
 */
const layoutWithNamedMdxSlot = {
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
        tag: 'aside',
        props: { class: { expr: 'lit', value: 'docs-sidebar' } },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Documentation Navigation' } },
        ],
      },
      {
        kind: 'element',
        tag: 'main',
        props: { class: { expr: 'lit', value: 'docs-main' } },
        children: [
          // Named slot for MDX content - this is the key element
          { kind: 'slot', name: 'mdx-content' },
        ],
      },
      {
        kind: 'element',
        tag: 'footer',
        props: {},
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Documentation Footer' } },
        ],
      },
    ],
  },
};

/**
 * Dynamic page that loads MDX content via glob pattern.
 */
const dynamicDocsPage = {
  version: '1.0',
  route: {
    path: '/docs/:slug',
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
    tag: 'div',
    props: { class: { expr: 'lit', value: 'page-wrapper' } },
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Fallback page content' } },
    ],
  },
};

// ==================== extractMdxContentSlot Function Tests ====================

describe('extractMdxContentSlot utility function', () => {
  /**
   * This function should be exported from build/index.ts but currently does NOT exist.
   * In dev/server.ts, this function extracts MDX content based on route params.
   *
   * Test will FAIL because the function is not exported from build/index.ts.
   */

  // ==================== Happy Path ====================

  describe('when given valid loadedData with matching slug', () => {
    it('should extract MDX content from loadedData matching route slug', async () => {
      // Arrange
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'docs';

      // Act
      // This import should fail because extractMdxContentSlot is not in build/index.ts
      const buildModule = await import('../../src/build/index.js');

      // The function should exist but currently does NOT
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      // Assert - Function should exist
      expect(extractMdxContentSlot).toBeDefined();

      // Act - Extract slot content
      const slots = extractMdxContentSlot(mockLoadedData, dataSourceName, routeParams);

      // Assert - Slot should contain MDX content
      expect(slots).toBeDefined();
      expect(slots!['mdx-content']).toBeDefined();

      const mdxContent = slots!['mdx-content'] as ViewNode & { tag: string };
      expect(mdxContent.kind).toBe('element');
      expect(mdxContent.tag).toBe('article');
    });

    it('should return correct content for different slugs', async () => {
      // Arrange
      const routeParamsGuide = { slug: 'guide' };
      const dataSourceName = 'docs';

      // Act
      const buildModule = await import('../../src/build/index.js');
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      expect(extractMdxContentSlot).toBeDefined();

      const slots = extractMdxContentSlot(mockLoadedData, dataSourceName, routeParamsGuide);

      // Assert - Should get guide content, not intro
      expect(slots).toBeDefined();
      const mdxContent = slots!['mdx-content'] as ViewNode & {
        children: Array<{ children: Array<{ value: { value: string } }> }>;
      };

      // The h1 should contain "Getting Started Guide"
      const h1 = mdxContent.children[0];
      const textNode = h1.children[0];
      expect(textNode.value.value).toBe('Getting Started Guide');
    });

    it('should handle index slug for root docs page', async () => {
      // Arrange - Empty slug should default to 'index'
      const loadedDataWithIndex = {
        docs: [
          {
            slug: 'index',
            frontmatter: { title: 'Documentation Index' },
            content: {
              kind: 'element',
              tag: 'article',
              children: [
                { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Index Page' } }] },
              ],
            } as ViewNode,
          },
        ],
      };

      const routeParams = { slug: '' }; // Empty slug should map to 'index'
      const dataSourceName = 'docs';

      // Act
      const buildModule = await import('../../src/build/index.js');
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      expect(extractMdxContentSlot).toBeDefined();

      const slots = extractMdxContentSlot(loadedDataWithIndex, dataSourceName, routeParams);

      // Assert
      expect(slots).toBeDefined();
      expect(slots!['mdx-content']).toBeDefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('when no matching content found', () => {
    it('should return undefined when slug does not match any entry', async () => {
      // Arrange
      const routeParams = { slug: 'nonexistent' };
      const dataSourceName = 'docs';

      // Act
      const buildModule = await import('../../src/build/index.js');
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      expect(extractMdxContentSlot).toBeDefined();

      const slots = extractMdxContentSlot(mockLoadedData, dataSourceName, routeParams);

      // Assert
      expect(slots).toBeUndefined();
    });

    it('should return undefined when data source does not exist', async () => {
      // Arrange
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'nonexistent-source';

      // Act
      const buildModule = await import('../../src/build/index.js');
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      expect(extractMdxContentSlot).toBeDefined();

      const slots = extractMdxContentSlot(mockLoadedData, dataSourceName, routeParams);

      // Assert
      expect(slots).toBeUndefined();
    });

    it('should return undefined when loadedData is empty', async () => {
      // Arrange
      const emptyLoadedData = {};
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'docs';

      // Act
      const buildModule = await import('../../src/build/index.js');
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      expect(extractMdxContentSlot).toBeDefined();

      const slots = extractMdxContentSlot(emptyLoadedData, dataSourceName, routeParams);

      // Assert
      expect(slots).toBeUndefined();
    });

    it('should return undefined when data source is not an array', async () => {
      // Arrange
      const invalidLoadedData = {
        docs: { slug: 'intro', content: mdxIntroContent }, // Object instead of array
      };
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'docs';

      // Act
      const buildModule = await import('../../src/build/index.js');
      const extractMdxContentSlot = (buildModule as Record<string, unknown>)[
        'extractMdxContentSlot'
      ] as typeof import('../../src/dev/server.js').extractMdxContentSlot;

      expect(extractMdxContentSlot).toBeDefined();

      const slots = extractMdxContentSlot(
        invalidLoadedData as unknown as Record<string, unknown>,
        dataSourceName,
        routeParams
      );

      // Assert
      expect(slots).toBeUndefined();
    });
  });
});

// ==================== SSG Build Integration Tests ====================

describe('SSG build with MDX content slots', () => {
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

    // Create directories
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
    await mkdir(contentDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== Named Slot Replacement ====================

  describe('named MDX slot replacement in layout', () => {
    it('should render MDX content in named mdx-content slot', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create layout with named slot
      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(layoutWithNamedMdxSlot, null, 2)
      );

      // Create page definition - simulating what JsonPageLoader produces
      // after loading MDX content
      const pageWithMdxData = {
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
            { kind: 'text', value: { expr: 'lit', value: 'Page fallback' } },
          ],
        },
        // Simulated loadedData from MDX processing
        importData: {
          docs: [
            {
              slug: 'intro',
              frontmatter: { title: 'Introduction' },
              content: mdxIntroContent,
            },
          ],
        },
      };
      await writeFile(
        join(routesDir, 'docs-intro.json'),
        JSON.stringify(pageWithMdxData, null, 2)
      );

      // Act
      const result = await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      expect(result.generatedFiles.length).toBeGreaterThan(0);

      const htmlPath = join(outDir, 'docs', 'intro', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The MDX content should be rendered, not the fallback
      expect(htmlContent).toContain('Introduction to Constela');
      expect(htmlContent).toContain('Welcome to the documentation');

      // Layout structure should be present
      expect(htmlContent).toContain('docs-layout');
      expect(htmlContent).toContain('docs-sidebar');
      expect(htmlContent).toContain('Documentation Navigation');
      expect(htmlContent).toContain('Documentation Footer');
    });

    it('should NOT render fallback page content when MDX slot is filled', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(layoutWithNamedMdxSlot, null, 2)
      );

      const pageWithMdxData = {
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
            { kind: 'text', value: { expr: 'lit', value: 'SHOULD NOT APPEAR' } },
          ],
        },
        importData: {
          docs: [
            {
              slug: 'intro',
              content: mdxIntroContent,
            },
          ],
        },
      };
      await writeFile(
        join(routesDir, 'docs-intro.json'),
        JSON.stringify(pageWithMdxData, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'docs', 'intro', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // MDX content should appear
      expect(htmlContent).toContain('Introduction to Constela');

      // Fallback content should NOT appear
      expect(htmlContent).not.toContain('SHOULD NOT APPEAR');
    });
  });

  // ==================== Multiple Dynamic Pages ====================

  describe('dynamic routes with MDX content', () => {
    it('should render different MDX content for different slugs', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      await writeFile(
        join(layoutsDir, 'docs.json'),
        JSON.stringify(layoutWithNamedMdxSlot, null, 2)
      );

      // Create two pages with different content
      const introPage = {
        version: '1.0',
        route: { path: '/docs/intro', layout: 'docs' },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div', children: [] },
        importData: {
          docs: [{ slug: 'intro', content: mdxIntroContent }],
        },
      };

      const guidePage = {
        version: '1.0',
        route: { path: '/docs/guide', layout: 'docs' },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div', children: [] },
        importData: {
          docs: [{ slug: 'guide', content: mdxGuideContent }],
        },
      };

      await writeFile(
        join(routesDir, 'docs-intro.json'),
        JSON.stringify(introPage, null, 2)
      );
      await writeFile(
        join(routesDir, 'docs-guide.json'),
        JSON.stringify(guidePage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert - Intro page
      const introHtml = await readFile(
        join(outDir, 'docs', 'intro', 'index.html'),
        'utf-8'
      );
      expect(introHtml).toContain('Introduction to Constela');
      expect(introHtml).not.toContain('Getting Started Guide');

      // Assert - Guide page
      const guideHtml = await readFile(
        join(outDir, 'docs', 'guide', 'index.html'),
        'utf-8'
      );
      expect(guideHtml).toContain('Getting Started Guide');
      expect(guideHtml).not.toContain('Introduction to Constela');
    });
  });

  // ==================== Layout with Default Slot AND Named Slot ====================

  describe('layout with both default and named slots', () => {
    it('should fill named slot with MDX and default slot with page content', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Layout with BOTH default slot and named mdx-content slot
      const layoutWithBothSlots = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'hybrid-layout' } },
          children: [
            {
              kind: 'element',
              tag: 'main',
              props: {},
              children: [
                // Named slot for MDX
                { kind: 'slot', name: 'mdx-content' },
              ],
            },
            {
              kind: 'element',
              tag: 'aside',
              props: {},
              children: [
                // Default slot for page-defined content
                { kind: 'slot' },
              ],
            },
          ],
        },
      };

      await writeFile(
        join(layoutsDir, 'hybrid.json'),
        JSON.stringify(layoutWithBothSlots, null, 2)
      );

      const pageWithBothContents = {
        version: '1.0',
        route: { path: '/hybrid/intro', layout: 'hybrid' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'section',
          props: { class: { expr: 'lit', value: 'sidebar-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Sidebar from page view' } },
          ],
        },
        importData: {
          docs: [{ slug: 'intro', content: mdxIntroContent }],
        },
      };

      await writeFile(
        join(routesDir, 'hybrid-intro.json'),
        JSON.stringify(pageWithBothContents, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlContent = await readFile(
        join(outDir, 'hybrid', 'intro', 'index.html'),
        'utf-8'
      );

      // MDX content in named slot
      expect(htmlContent).toContain('Introduction to Constela');

      // Page view content in default slot
      expect(htmlContent).toContain('Sidebar from page view');
      expect(htmlContent).toContain('sidebar-content');
    });
  });
});

// ==================== processLayouts Function Tests ====================

describe('processLayouts with named slots', () => {
  let tempDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    layoutsDir = join(tempDir, 'layouts');
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * The processLayouts function in build/index.ts should:
   * 1. Extract MDX content from pageInfo.loadedData using extractMdxContentSlot
   * 2. Pass extracted slots to layout composition (like dev server does)
   * 3. Handle named slots correctly, not just default slots
   *
   * Currently it does NONE of these - it only calls applyLayout which replaces
   * ALL slots with page content.
   */

  it('should pass MDX content slots to layout composition', async () => {
    // Arrange
    await writeFile(
      join(layoutsDir, 'docs.json'),
      JSON.stringify(layoutWithNamedMdxSlot, null, 2)
    );

    // This tests the internal behavior of processLayouts
    // We need to verify that it extracts and passes MDX slots

    // Currently this functionality does NOT exist in processLayouts
    // The test will FAIL because:
    // 1. processLayouts does not call extractMdxContentSlot
    // 2. processLayouts uses applyLayout instead of composeLayoutWithPage with slots

    // For now, we test by checking the build output
    const { build } = await import('../../src/build/index.js');

    const outDir = join(tempDir, 'dist');
    const routesDir = join(tempDir, 'routes');
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });

    const page = {
      version: '1.0',
      route: { path: '/test', layout: 'docs' },
      state: {},
      actions: [],
      view: { kind: 'element', tag: 'div', children: [] },
      importData: {
        docs: [{ slug: 'test', content: mdxIntroContent }],
      },
    };
    await writeFile(join(routesDir, 'test.json'), JSON.stringify(page, null, 2));

    // Act
    await build({ outDir, routesDir, layoutsDir });

    // Assert
    const html = await readFile(join(outDir, 'test', 'index.html'), 'utf-8');

    // The MDX content should be rendered in the named slot
    expect(html).toContain('Introduction to Constela');
  });

  it('should handle nested layouts with MDX content slots', async () => {
    // Arrange
    // Parent layout with outer structure
    const parentLayout = {
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

    // Child layout (docs) that extends parent
    const childLayout = {
      version: '1.0',
      type: 'layout',
      layout: 'root', // Extends parent
      view: {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'docs-wrapper' } },
        children: [
          { kind: 'slot', name: 'mdx-content' },
        ],
      },
    };

    await writeFile(join(layoutsDir, 'root.json'), JSON.stringify(parentLayout, null, 2));
    await writeFile(join(layoutsDir, 'docs.json'), JSON.stringify(childLayout, null, 2));

    const { build } = await import('../../src/build/index.js');

    const outDir = join(tempDir, 'dist');
    const routesDir = join(tempDir, 'routes');
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });

    const page = {
      version: '1.0',
      route: { path: '/nested', layout: 'docs' },
      state: {},
      actions: [],
      view: { kind: 'element', tag: 'div', children: [] },
      importData: {
        docs: [{ slug: 'nested', content: mdxIntroContent }],
      },
    };
    await writeFile(join(routesDir, 'nested.json'), JSON.stringify(page, null, 2));

    // Act
    await build({ outDir, routesDir, layoutsDir });

    // Assert
    const html = await readFile(join(outDir, 'nested', 'index.html'), 'utf-8');

    // Nested layout structure
    expect(html).toContain('docs-wrapper');

    // MDX content should be in the named slot
    expect(html).toContain('Introduction to Constela');
  });
});

// ==================== Regression Tests ====================

describe('regression: SSG MDX content slot binding', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * This test demonstrates the exact bug:
   * - Dev server correctly renders MDX content in named slots
   * - SSG build does NOT render MDX content in named slots
   *
   * The dev server (server.ts) does:
   *   const slots = extractMdxContentSlot(pageInfo.loadedData, 'docs', match.params);
   *   composedProgram = composeLayoutWithPage(compiledLayout, program, layoutParams, slots);
   *
   * The SSG build (build/index.ts processLayouts) does:
   *   currentView = applyLayout(currentView, normalizedLayoutView);
   *   // NO slot extraction, NO slot passing
   */

  it('should render same content as dev server for MDX pages with layout', async () => {
    // This is the key regression test
    // SSG output should match dev server output for the same page

    const { build } = await import('../../src/build/index.js');

    const outDir = join(tempDir, 'dist');
    const routesDir = join(tempDir, 'routes');
    const layoutsDir = join(tempDir, 'layouts');

    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });

    // Layout with named MDX slot (same as dev server would use)
    await writeFile(
      join(layoutsDir, 'docs.json'),
      JSON.stringify(layoutWithNamedMdxSlot, null, 2)
    );

    // Page with MDX content (same as dev server would load)
    const page = {
      version: '1.0',
      route: { path: '/docs/intro', layout: 'docs' },
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Page fallback' } },
        ],
      },
      importData: {
        docs: [
          {
            slug: 'intro',
            frontmatter: { title: 'Introduction' },
            content: mdxIntroContent,
          },
        ],
      },
    };

    await writeFile(join(routesDir, 'docs-intro.json'), JSON.stringify(page, null, 2));

    // Act
    await build({ outDir, routesDir, layoutsDir });

    // Assert - This is what dev server would render
    const html = await readFile(join(outDir, 'docs', 'intro', 'index.html'), 'utf-8');

    // Layout structure
    expect(html).toContain('docs-layout');
    expect(html).toContain('docs-sidebar');
    expect(html).toContain('docs-main');

    // MDX content MUST be present (this is what currently FAILS)
    expect(html).toContain('Introduction to Constela');
    expect(html).toContain('Welcome to the documentation');

    // Fallback should NOT be present when MDX fills the slot
    expect(html).not.toContain('Page fallback');
  });
});
