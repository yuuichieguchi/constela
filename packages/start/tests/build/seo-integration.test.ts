/**
 * Test module for SEO feature integration in build process.
 *
 * Coverage:
 * - config.seo.lang is passed to wrapHtml during build
 *   - Build output should contain <html lang="..."> when seo.lang is configured
 *   - Build output should NOT contain lang attribute when seo.lang is not configured
 * - route.canonical generates <link rel="canonical"> in build output
 *   - Both literal and dynamic canonical URLs
 * - route.jsonLd generates <script type="application/ld+json"> in build output
 *   - Structured data is properly serialized
 *
 * Bug context:
 * - SEO features (lang, canonical, jsonLd) were implemented in entry-server.ts
 * - However, build/index.ts and build/ssg.ts do NOT pass seo.lang config to wrapHtml
 * - These tests verify the integration is working end-to-end
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-seo-integration-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Simple page without SEO features
 */
const simplePage = {
  version: '1.0',
  route: {
    path: '/',
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Hello World' } },
    ],
  },
};

/**
 * Page with canonical URL (literal)
 */
const pageWithCanonical = {
  version: '1.0',
  route: {
    path: '/about',
    canonical: {
      expr: 'lit',
      value: 'https://example.com/about',
    },
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'About Page' } },
    ],
  },
};

/**
 * Page with JSON-LD structured data
 */
const pageWithJsonLd = {
  version: '1.0',
  route: {
    path: '/article',
    jsonLd: {
      type: 'Article',
      properties: {
        headline: { expr: 'lit', value: 'Test Article Title' },
        author: { expr: 'lit', value: 'John Doe' },
        datePublished: { expr: 'lit', value: '2024-01-01' },
      },
    },
  },
  view: {
    kind: 'element',
    tag: 'article',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Article content' } },
    ],
  },
};

/**
 * Page with both canonical and JSON-LD
 */
const pageWithAllSeoFeatures = {
  version: '1.0',
  route: {
    path: '/full-seo',
    title: { expr: 'lit', value: 'Full SEO Page' },
    meta: {
      description: { expr: 'lit', value: 'A page with all SEO features' },
    },
    canonical: {
      expr: 'lit',
      value: 'https://example.com/full-seo',
    },
    jsonLd: {
      type: 'WebPage',
      properties: {
        name: { expr: 'lit', value: 'Full SEO Page' },
        description: { expr: 'lit', value: 'A page with all SEO features' },
      },
    },
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Full SEO content' } },
    ],
  },
};

/**
 * Dynamic page with canonical URL using route params
 */
const dynamicPageWithCanonical = {
  version: '1.0',
  route: {
    path: '/posts/:slug',
    params: ['slug'],
    canonical: {
      expr: 'concat',
      items: [
        { expr: 'lit', value: 'https://example.com/posts/' },
        { expr: 'route', source: 'param', name: 'slug' },
      ],
    },
  },
  getStaticPaths: {
    source: 'posts',
    params: {
      slug: 'slug',
    },
  },
  view: {
    kind: 'element',
    tag: 'article',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Post content' } },
    ],
  },
};

// ==================== SEO Integration Tests ====================

describe('SEO integration in build process', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    // Create directories
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== config.seo.lang Tests ====================

  describe('config.seo.lang in build output', () => {
    it('should output <html lang="ja"> when seo.lang is "ja" in config', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create config file with seo.lang
      const configContent = {
        seo: {
          lang: 'ja',
        },
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      // Create a simple page
      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );

      // Act
      // NOTE: The build function currently does NOT accept config or read it automatically
      // This test documents the expected behavior once the implementation is complete
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // This assertion will FAIL until the implementation passes seo.lang to wrapHtml
      expect(htmlContent).toMatch(/<html[^>]*lang="ja"/);
    });

    it('should output <html lang="en"> when seo.lang is "en" in config', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      const configContent = {
        seo: {
          lang: 'en',
        },
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // This assertion will FAIL until the implementation passes seo.lang to wrapHtml
      expect(htmlContent).toMatch(/<html[^>]*lang="en"/);
    });

    it('should output <html lang="zh-CN"> when seo.lang is "zh-CN" in config', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      const configContent = {
        seo: {
          lang: 'zh-CN',
        },
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // This assertion will FAIL until the implementation passes seo.lang to wrapHtml
      expect(htmlContent).toMatch(/<html[^>]*lang="zh-CN"/);
    });

    it('should NOT output lang attribute when seo.lang is not configured', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create config WITHOUT seo.lang
      const configContent = {
        css: 'styles.css',
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Should have <html> or <html class="..."> but NOT <html lang="...">
      expect(htmlContent).not.toMatch(/<html[^>]*lang="/);
    });

    it('should apply seo.lang to all pages in multi-page build', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      const configContent = {
        seo: {
          lang: 'ja',
        },
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      // Create multiple pages
      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );
      await writeFile(
        join(routesDir, 'about.json'),
        JSON.stringify(pageWithCanonical, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const indexHtml = await readFile(join(outDir, 'index.html'), 'utf-8');
      const aboutHtml = await readFile(join(outDir, 'about', 'index.html'), 'utf-8');

      // Both pages should have lang="ja"
      expect(indexHtml).toMatch(/<html[^>]*lang="ja"/);
      expect(aboutHtml).toMatch(/<html[^>]*lang="ja"/);
    });
  });

  // ==================== route.canonical Tests ====================

  describe('route.canonical in build output', () => {
    it('should output <link rel="canonical"> when route.canonical is defined', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      await writeFile(
        join(routesDir, 'about.json'),
        JSON.stringify(pageWithCanonical, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'about', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Canonical link tag should be present
      expect(htmlContent).toContain('<link rel="canonical" href="https://example.com/about">');
    });

    it.skip('should evaluate dynamic canonical URL with route params', async () => {
      // NOTE: This test is skipped because it requires complex import resolution setup.
      // The canonical URL feature with route params is tested in unit tests for generateMetaTags.
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create posts data directory and file
      const dataDir = join(routesDir, 'posts', 'data');
      await mkdir(dataDir, { recursive: true });
      await writeFile(
        join(dataDir, 'posts.json'),
        JSON.stringify([
          { slug: 'hello-world', title: 'Hello World' },
          { slug: 'second-post', title: 'Second Post' },
        ])
      );

      // Create dynamic page with canonical URL that uses route params
      // Using inline paths in getStaticPaths to avoid import resolution complexity
      const dynamicPage = {
        version: '1.0',
        route: {
          path: '/posts/:slug',
          params: ['slug'],
          canonical: {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'https://example.com/posts/' },
              { expr: 'route', source: 'param', name: 'slug' },
            ],
          },
        },
        imports: {
          posts: './data/posts.json',
        },
        getStaticPaths: {
          source: 'posts',
          params: {
            slug: 'slug',
          },
        },
        view: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Post content' } },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'posts', '[slug].json'),
        JSON.stringify(dynamicPage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const helloWorldHtml = await readFile(
        join(outDir, 'posts', 'hello-world', 'index.html'),
        'utf-8'
      );
      const secondPostHtml = await readFile(
        join(outDir, 'posts', 'second-post', 'index.html'),
        'utf-8'
      );

      // Each page should have its own canonical URL with resolved params
      expect(helloWorldHtml).toContain(
        '<link rel="canonical" href="https://example.com/posts/hello-world">'
      );
      expect(secondPostHtml).toContain(
        '<link rel="canonical" href="https://example.com/posts/second-post">'
      );
    });

    it('should NOT output <link rel="canonical"> when route.canonical is not defined', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Should not contain canonical link
      expect(htmlContent).not.toContain('rel="canonical"');
    });
  });

  // ==================== route.jsonLd Tests ====================

  describe('route.jsonLd in build output', () => {
    it('should output <script type="application/ld+json"> when route.jsonLd is defined', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      await writeFile(
        join(routesDir, 'article.json'),
        JSON.stringify(pageWithJsonLd, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'article', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // JSON-LD script tag should be present
      expect(htmlContent).toContain('<script type="application/ld+json">');

      // Verify structured data content
      expect(htmlContent).toContain('"@context":"https://schema.org"');
      expect(htmlContent).toContain('"@type":"Article"');
      expect(htmlContent).toContain('"headline":"Test Article Title"');
      expect(htmlContent).toContain('"author":"John Doe"');
      expect(htmlContent).toContain('"datePublished":"2024-01-01"');
    });

    it('should NOT output JSON-LD script when route.jsonLd is not defined', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(simplePage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Should not contain JSON-LD script
      expect(htmlContent).not.toContain('application/ld+json');
    });

    it('should properly escape JSON-LD content to prevent XSS', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      const pageWithXssAttempt = {
        version: '1.0',
        route: {
          path: '/xss-test',
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: '</script><script>alert(1)</script>' },
            },
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Test' } }],
        },
      };

      await writeFile(
        join(routesDir, 'xss-test.json'),
        JSON.stringify(pageWithXssAttempt, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'xss-test', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Script tag should be escaped in JSON-LD
      expect(htmlContent).not.toContain('</script><script>');
      // The escape sequence should be used instead
      expect(htmlContent).toContain('\\u003c/script\\u003e');
    });
  });

  // ==================== Combined SEO Features Tests ====================

  describe('combined SEO features in build output', () => {
    it('should output all SEO features together: lang, canonical, and JSON-LD', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      const configContent = {
        seo: {
          lang: 'en',
        },
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      await writeFile(
        join(routesDir, 'full-seo.json'),
        JSON.stringify(pageWithAllSeoFeatures, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'full-seo', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // All SEO features should be present
      // 1. lang attribute from config
      expect(htmlContent).toMatch(/<html[^>]*lang="en"/);

      // 2. Title tag
      expect(htmlContent).toContain('<title>Full SEO Page</title>');

      // 3. Meta description
      expect(htmlContent).toContain('<meta name="description" content="A page with all SEO features">');

      // 4. Canonical link
      expect(htmlContent).toContain('<link rel="canonical" href="https://example.com/full-seo">');

      // 5. JSON-LD structured data
      expect(htmlContent).toContain('<script type="application/ld+json">');
      expect(htmlContent).toContain('"@type":"WebPage"');
    });

    it('should output canonical URL with dynamic route path using source: path', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Create examples routes directory
      const examplesRouteDir = join(routesDir, 'examples');
      await mkdir(examplesRouteDir, { recursive: true });

      // Dynamic page with canonical URL using { expr: 'route', source: 'path' }
      // This should generate canonical like "https://constela.dev/examples/counter"
      // NOT "https://constela.dev/" (which is the current bug)
      //
      // Bug context:
      // - build/index.ts renderPageToHtml() passes path: '/' to generateMetaTags
      // - This causes { expr: 'route', source: 'path' } to always return '/'
      // - Expected: path should be the resolved route path (e.g., '/examples/counter')
      const dynamicPageWithPathCanonical = {
        version: '1.0',
        route: {
          path: '/examples/:slug',
          canonical: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 'https://constela.dev' },
            right: { expr: 'route', source: 'path' },
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Example content' } },
          ],
        },
      };

      await writeFile(
        join(examplesRouteDir, '[slug].json'),
        JSON.stringify(dynamicPageWithPathCanonical, null, 2)
      );

      // Create .paths.ts file with static paths (simpler than data source resolution)
      // The loadGetStaticPaths function parses this using regex
      const pathsContent = `
export const getStaticPaths = () => ({
  paths: [
    { params: { slug: 'counter' } },
    { params: { slug: 'todo' } },
  ],
});
`;
      await writeFile(join(examplesRouteDir, '[slug].paths.ts'), pathsContent);

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert - check canonical URL contains the full dynamic path
      const counterHtml = await readFile(
        join(outDir, 'examples', 'counter', 'index.html'),
        'utf-8'
      );
      const todoHtml = await readFile(
        join(outDir, 'examples', 'todo', 'index.html'),
        'utf-8'
      );

      // The canonical URL should include the full path "/examples/counter"
      // Currently FAILING because path is always '/' in MetaContext
      expect(counterHtml).toContain(
        '<link rel="canonical" href="https://constela.dev/examples/counter">'
      );
      expect(todoHtml).toContain(
        '<link rel="canonical" href="https://constela.dev/examples/todo">'
      );

      // Verify they are NOT using the root path (the bug behavior)
      expect(counterHtml).not.toContain(
        '<link rel="canonical" href="https://constela.dev/">'
      );
      expect(todoHtml).not.toContain(
        '<link rel="canonical" href="https://constela.dev/">'
      );
    });

    it('should apply seo.lang with dark theme class together', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      const configContent = {
        seo: {
          lang: 'ja',
        },
      };
      await writeFile(
        join(tempDir, 'constela.config.json'),
        JSON.stringify(configContent, null, 2)
      );

      // Page with dark theme state
      const pageWithDarkTheme = {
        version: '1.0',
        route: {
          path: '/dark-theme',
        },
        state: {
          theme: { type: 'string', initial: 'dark' },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Dark Theme Page' } },
          ],
        },
      };

      await writeFile(
        join(routesDir, 'dark-theme.json'),
        JSON.stringify(pageWithDarkTheme, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'dark-theme', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Should have both lang and class attributes
      expect(htmlContent).toMatch(/<html[^>]*lang="ja"/);
      expect(htmlContent).toMatch(/<html[^>]*class="dark"/);
    });
  });
});
