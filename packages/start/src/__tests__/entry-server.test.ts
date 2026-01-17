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

import { describe, it, expect, beforeAll } from 'vitest';
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

// ==================== Meta Tag Generation Tests ====================

describe('evaluateMetaExpression', () => {
  // Import will fail until implementation exists - this is expected (TDD Red phase)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let evaluateMetaExpression: any;

  beforeAll(async () => {
    try {
      const module = await import('../runtime/entry-server.js');
      evaluateMetaExpression = module.evaluateMetaExpression;
    } catch {
      // Function doesn't exist yet - expected in TDD Red phase
    }
  });

  // ==================== Literal Expressions ====================

  describe('literal expressions', () => {
    it('should evaluate literal string expression', () => {
      // Arrange
      const expr = { expr: 'lit' as const, value: 'Hello World' };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('Hello World');
    });

    it('should evaluate literal number and convert to string', () => {
      // Arrange
      const expr = { expr: 'lit' as const, value: 42 };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('42');
    });
  });

  // ==================== Route Expressions ====================

  describe('route expressions', () => {
    it('should evaluate route param expression', () => {
      // Arrange
      const expr = { expr: 'route' as const, name: 'slug', source: 'param' as const };
      const ctx = { params: { slug: 'my-article' }, query: {}, path: '/posts/my-article' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('my-article');
    });

    it('should evaluate route query expression', () => {
      // Arrange
      const expr = { expr: 'route' as const, name: 'q', source: 'query' as const };
      const ctx = { params: {}, query: { q: 'search term' }, path: '/search' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('search term');
    });

    it('should evaluate route path expression', () => {
      // Arrange
      const expr = { expr: 'route' as const, name: '', source: 'path' as const };
      const ctx = { params: {}, query: {}, path: '/about/team' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('/about/team');
    });

    it('should return empty string for missing param', () => {
      // Arrange
      const expr = { expr: 'route' as const, name: 'nonexistent', source: 'param' as const };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('');
    });

    it('should return empty string for missing query', () => {
      // Arrange
      const expr = { expr: 'route' as const, name: 'missing', source: 'query' as const };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('');
    });
  });

  // ==================== Binary Expressions ====================

  describe('binary expressions', () => {
    it('should evaluate binary + for string concatenation', () => {
      // Arrange
      const expr = {
        expr: 'bin' as const,
        op: '+',
        left: { expr: 'lit' as const, value: 'Hello ' },
        right: { expr: 'lit' as const, value: 'World' },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('Hello World');
    });
  });

  // ==================== Concat Expressions ====================

  describe('concat expressions', () => {
    it('should evaluate concat expression (template string)', () => {
      // Arrange
      const expr = {
        expr: 'concat' as const,
        items: [
          { expr: 'lit' as const, value: 'Welcome to ' },
          { expr: 'lit' as const, value: 'Constela' },
          { expr: 'lit' as const, value: '!' },
        ],
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('Welcome to Constela!');
    });

    it('should handle nested concat with route expressions', () => {
      // Arrange
      const expr = {
        expr: 'concat' as const,
        items: [
          { expr: 'route' as const, name: 'title', source: 'param' as const },
          { expr: 'lit' as const, value: ' | ' },
          { expr: 'lit' as const, value: 'My Site' },
        ],
      };
      const ctx = { params: { title: 'Blog Post' }, query: {}, path: '/posts/blog-post' };

      // Act & Assert
      if (!evaluateMetaExpression) {
        expect.fail('evaluateMetaExpression is not exported - TDD Red phase');
      }
      const result = evaluateMetaExpression(expr, ctx);
      expect(result).toBe('Blog Post | My Site');
    });
  });
});

// ==================== generateMetaTags Tests ====================

describe('generateMetaTags', () => {
  // Import will fail until implementation exists - this is expected (TDD Red phase)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let generateMetaTags: any;

  beforeAll(async () => {
    try {
      const module = await import('../runtime/entry-server.js');
      generateMetaTags = module.generateMetaTags;
    } catch {
      // Function doesn't exist yet - expected in TDD Red phase
    }
  });

  // ==================== Empty/Undefined Cases ====================

  describe('empty and undefined cases', () => {
    it('should return empty string when route is undefined', () => {
      // Arrange
      const route = undefined;
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toBe('');
    });

    it('should return empty string when route has no title or meta', () => {
      // Arrange
      const route = { path: '/', params: [] };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toBe('');
    });
  });

  // ==================== Title Tag Generation ====================

  describe('title tag generation', () => {
    it('should generate title tag from literal', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        title: { expr: 'lit' as const, value: 'Welcome Page' },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<title>Welcome Page</title>');
    });

    it('should generate title tag from route param expression', () => {
      // Arrange
      const route = {
        path: '/posts/:slug',
        params: ['slug'],
        title: {
          expr: 'concat' as const,
          items: [
            { expr: 'route' as const, name: 'slug', source: 'param' as const },
            { expr: 'lit' as const, value: ' | Blog' },
          ],
        },
      };
      const ctx = { params: { slug: 'my-article' }, query: {}, path: '/posts/my-article' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<title>my-article | Blog</title>');
    });
  });

  // ==================== Meta Tag Generation (name attribute) ====================

  describe('meta tags with name attribute', () => {
    it('should generate description meta tag with name attribute', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          description: { expr: 'lit' as const, value: 'This is a great page' },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta name="description" content="This is a great page">');
    });

    it('should generate generic meta tag with name attribute', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          author: { expr: 'lit' as const, value: 'John Doe' },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta name="author" content="John Doe">');
    });
  });

  // ==================== Meta Tag Generation (property attribute) ====================

  describe('meta tags with property attribute (OGP/Twitter)', () => {
    it('should generate og:title meta tag with property attribute', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          'og:title': { expr: 'lit' as const, value: 'My OG Title' },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta property="og:title" content="My OG Title">');
    });

    it('should generate og:type meta tag with property attribute', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          'og:type': { expr: 'lit' as const, value: 'website' },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta property="og:type" content="website">');
    });

    it('should generate twitter:card meta tag with property attribute', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          'twitter:card': { expr: 'lit' as const, value: 'summary_large_image' },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta property="twitter:card" content="summary_large_image">');
    });
  });

  // ==================== HTML Escaping ====================

  describe('HTML escaping', () => {
    it('should HTML-escape content with special characters', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        title: { expr: 'lit' as const, value: 'Title with <script> & "quotes"' },
        meta: {
          description: { expr: 'lit' as const, value: "Description with <b>tags</b> & 'quotes'" },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      // Title should be escaped
      expect(result).toContain('<title>Title with &lt;script&gt; &amp; &quot;quotes&quot;</title>');
      // Meta content should be escaped
      expect(result).toContain('content="Description with &lt;b&gt;tags&lt;/b&gt; &amp; &#39;quotes&#39;"');
    });
  });

  // ==================== Empty Value Handling ====================

  describe('empty value handling', () => {
    it('should skip meta tags with empty values', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          description: { expr: 'lit' as const, value: 'Valid description' },
          keywords: { expr: 'lit' as const, value: '' },
          'og:title': { expr: 'route' as const, name: 'missing', source: 'param' as const },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta name="description" content="Valid description">');
      expect(result).not.toContain('keywords');
      expect(result).not.toContain('og:title');
    });
  });

  // ==================== Multiple Meta Tags ====================

  describe('multiple meta tags', () => {
    it('should generate multiple meta tags in correct order', () => {
      // Arrange
      const route = {
        path: '/',
        params: [],
        meta: {
          description: { expr: 'lit' as const, value: 'Page description' },
          'og:title': { expr: 'lit' as const, value: 'OG Title' },
          'og:description': { expr: 'lit' as const, value: 'OG Description' },
        },
      };
      const ctx = { params: {}, query: {}, path: '/' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);
      expect(result).toContain('<meta name="description" content="Page description">');
      expect(result).toContain('<meta property="og:title" content="OG Title">');
      expect(result).toContain('<meta property="og:description" content="OG Description">');
    });
  });

  // ==================== Full Integration Test ====================

  describe('full integration', () => {
    it('should generate title + multiple meta tags from complex route', () => {
      // Arrange
      const route = {
        path: '/posts/:slug',
        params: ['slug'],
        title: {
          expr: 'concat' as const,
          items: [
            { expr: 'route' as const, name: 'slug', source: 'param' as const },
            { expr: 'lit' as const, value: ' | My Blog' },
          ],
        },
        meta: {
          description: { expr: 'lit' as const, value: 'Read our latest blog posts' },
          'og:title': {
            expr: 'concat' as const,
            items: [
              { expr: 'route' as const, name: 'slug', source: 'param' as const },
              { expr: 'lit' as const, value: ' - My Blog' },
            ],
          },
          'og:type': { expr: 'lit' as const, value: 'article' },
          'og:url': {
            expr: 'concat' as const,
            items: [
              { expr: 'lit' as const, value: 'https://example.com' },
              { expr: 'route' as const, name: '', source: 'path' as const },
            ],
          },
          'twitter:card': { expr: 'lit' as const, value: 'summary_large_image' },
        },
      };
      const ctx = { params: { slug: 'hello-world' }, query: {}, path: '/posts/hello-world' };

      // Act & Assert
      if (!generateMetaTags) {
        expect.fail('generateMetaTags is not exported - TDD Red phase');
      }
      const result = generateMetaTags(route, ctx);

      // Verify title
      expect(result).toContain('<title>hello-world | My Blog</title>');

      // Verify meta tags
      expect(result).toContain('<meta name="description" content="Read our latest blog posts">');
      expect(result).toContain('<meta property="og:title" content="hello-world - My Blog">');
      expect(result).toContain('<meta property="og:type" content="article">');
      expect(result).toContain('<meta property="og:url" content="https://example.com/posts/hello-world">');
      expect(result).toContain('<meta property="twitter:card" content="summary_large_image">');
    });
  });
});
