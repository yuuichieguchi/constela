/**
 * Test module for SEO canonical URL feature.
 *
 * Coverage:
 * - generateMetaTags with literal canonical URL
 * - generateMetaTags with dynamic canonical URL (route params)
 * - generateMetaTags with concat expression for canonical URL
 * - generateMetaTags without canonical (no link tag generated)
 * - HTML escaping for XSS prevention in canonical URLs
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { generateMetaTags, evaluateMetaExpression } from '../../src/runtime/entry-server.js';
import type { CompiledRouteDefinition, CompiledExpression } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Creates a MetaContext for testing.
 */
function createMetaContext(
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  path: string = '/'
) {
  return { params, query, path };
}

// ==================== Tests ====================

describe('SEO canonical URL', () => {
  // ==================== generateMetaTags with canonical ====================

  describe('generateMetaTags', () => {
    describe('literal canonical URL', () => {
      it('should generate canonical link tag when canonical is a literal expression', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          canonical: {
            expr: 'lit',
            value: 'https://example.com/posts/hello-world',
          },
        };
        const ctx = createMetaContext(
          { slug: 'hello-world' },
          {},
          '/posts/hello-world'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/posts/hello-world">'
        );
      });

      it('should generate canonical link tag with trailing slash URL', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/about',
          params: [],
          canonical: {
            expr: 'lit',
            value: 'https://example.com/about/',
          },
        };
        const ctx = createMetaContext({}, {}, '/about');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/about/">'
        );
      });
    });

    describe('dynamic canonical URL with route params', () => {
      it('should evaluate canonical expression with route param', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          canonical: {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'https://example.com/posts/' },
              { expr: 'route', source: 'param', name: 'slug' },
            ],
          },
        };
        const ctx = createMetaContext(
          { slug: 'my-awesome-post' },
          {},
          '/posts/my-awesome-post'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/posts/my-awesome-post">'
        );
      });

      it('should evaluate canonical expression with multiple route params', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/docs/:category/:slug',
          params: ['category', 'slug'],
          canonical: {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'https://example.com/docs/' },
              { expr: 'route', source: 'param', name: 'category' },
              { expr: 'lit', value: '/' },
              { expr: 'route', source: 'param', name: 'slug' },
            ],
          },
        };
        const ctx = createMetaContext(
          { category: 'guides', slug: 'getting-started' },
          {},
          '/docs/guides/getting-started'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/docs/guides/getting-started">'
        );
      });

      it('should evaluate canonical expression using route path', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/blog/:slug',
          params: ['slug'],
          canonical: {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'https://example.com' },
              { expr: 'route', source: 'path', name: '' },
            ],
          },
        };
        const ctx = createMetaContext(
          { slug: 'hello' },
          {},
          '/blog/hello'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/blog/hello">'
        );
      });
    });

    describe('canonical not provided', () => {
      it('should not generate canonical link tag when canonical is not provided', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/about',
          params: [],
        };
        const ctx = createMetaContext({}, {}, '/about');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).not.toContain('canonical');
        expect(result).not.toContain('<link');
      });

      it('should not generate canonical link tag when route is undefined', () => {
        // Arrange
        const ctx = createMetaContext({}, {}, '/');

        // Act
        const result = generateMetaTags(undefined, ctx);

        // Assert
        expect(result).toBe('');
      });
    });

    describe('canonical with other meta tags', () => {
      it('should generate canonical link tag along with title and meta tags', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          title: { expr: 'lit', value: 'Hello World - My Blog' },
          meta: {
            description: {
              expr: 'lit',
              value: 'A great post about hello world',
            },
            'og:title': { expr: 'lit', value: 'Hello World' },
          },
          canonical: {
            expr: 'lit',
            value: 'https://example.com/posts/hello-world',
          },
        };
        const ctx = createMetaContext(
          { slug: 'hello-world' },
          {},
          '/posts/hello-world'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('<title>Hello World - My Blog</title>');
        expect(result).toContain(
          '<meta name="description" content="A great post about hello world">'
        );
        expect(result).toContain(
          '<meta property="og:title" content="Hello World">'
        );
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/posts/hello-world">'
        );
      });
    });
  });

  // ==================== evaluateMetaExpression for canonical ====================

  describe('evaluateMetaExpression', () => {
    describe('concat expression for URLs', () => {
      it('should concatenate literal strings', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'concat',
          items: [
            { expr: 'lit', value: 'https://example.com' },
            { expr: 'lit', value: '/posts/' },
            { expr: 'lit', value: 'hello-world' },
          ],
        };
        const ctx = createMetaContext();

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('https://example.com/posts/hello-world');
      });

      it('should concatenate literals and route params', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'concat',
          items: [
            { expr: 'lit', value: 'https://example.com/users/' },
            { expr: 'route', source: 'param', name: 'userId' },
            { expr: 'lit', value: '/profile' },
          ],
        };
        const ctx = createMetaContext({ userId: '12345' }, {}, '/users/12345');

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('https://example.com/users/12345/profile');
      });

      it('should handle empty concat items', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'concat',
          items: [],
        };
        const ctx = createMetaContext();

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('');
      });
    });

    describe('route param expression', () => {
      it('should return param value when param exists', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'route',
          source: 'param',
          name: 'slug',
        };
        const ctx = createMetaContext({ slug: 'my-post' }, {}, '/posts/my-post');

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('my-post');
      });

      it('should return empty string when param does not exist', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'route',
          source: 'param',
          name: 'nonexistent',
        };
        const ctx = createMetaContext({}, {}, '/');

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('');
      });

      it('should return path when source is path', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'route',
          source: 'path',
          name: '',
        };
        const ctx = createMetaContext({}, {}, '/docs/intro');

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('/docs/intro');
      });

      it('should return query value when source is query', () => {
        // Arrange
        const expr: CompiledExpression = {
          expr: 'route',
          source: 'query',
          name: 'page',
        };
        const ctx = createMetaContext({}, { page: '2' }, '/posts');

        // Act
        const result = evaluateMetaExpression(expr, ctx);

        // Assert
        expect(result).toBe('2');
      });
    });
  });

  // ==================== Security: XSS Prevention ====================

  describe('security', () => {
    describe('HTML escaping in canonical URLs', () => {
      it('should escape ampersand in canonical URL', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/search',
          params: [],
          canonical: {
            expr: 'lit',
            value: 'https://example.com/search?q=hello&page=1',
          },
        };
        const ctx = createMetaContext({}, {}, '/search');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('&amp;');
        expect(result).not.toContain('&page');
      });

      it('should escape double quotes in canonical URL', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/search',
          params: [],
          canonical: {
            expr: 'lit',
            value: 'https://example.com/search?q="test"',
          },
        };
        const ctx = createMetaContext({}, {}, '/search');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('&quot;');
        expect(result).not.toMatch(/href="[^"]*"[^"]*"/);
      });

      it('should escape angle brackets in canonical URL', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          canonical: {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'https://example.com/posts/' },
              { expr: 'route', source: 'param', name: 'slug' },
            ],
          },
        };
        // Malicious slug value
        const ctx = createMetaContext(
          { slug: '<script>alert(1)</script>' },
          {},
          '/posts/<script>alert(1)</script>'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).not.toContain('<script>');
      });

      it('should escape single quotes in canonical URL', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/search',
          params: [],
          canonical: {
            expr: 'lit',
            value: "https://example.com/search?q='test'",
          },
        };
        const ctx = createMetaContext({}, {}, '/search');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('&#39;');
      });

      it('should handle URL with all special characters', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          canonical: {
            expr: 'lit',
            value: 'https://example.com/test?a=1&b=<x>"y"\'z\'',
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('&amp;');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).toContain('&quot;');
        expect(result).toContain('&#39;');
      });
    });
  });
});
