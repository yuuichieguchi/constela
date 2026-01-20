/**
 * Test module for SEO JSON-LD feature.
 *
 * Coverage:
 * - generateMetaTags with literal JSON-LD properties
 * - generateMetaTags with dynamic JSON-LD properties (route params)
 * - JSON-LD structure (@context, @type, properties)
 * - Security: XSS prevention by escaping </script>
 * - Edge cases: empty properties, undefined jsonLd
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { generateMetaTags } from '../../src/runtime/entry-server.js';
import type { CompiledRouteDefinition } from '@constela/compiler';

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

describe('SEO JSON-LD', () => {
  // ==================== generateMetaTags with JSON-LD ====================

  describe('generateMetaTags with JSON-LD', () => {
    describe('literal JSON-LD properties', () => {
      it('should generate JSON-LD script tag when jsonLd is provided with literal properties', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'My Blog Post' },
              author: { expr: 'lit', value: 'John Doe' },
            },
          },
        };
        const ctx = createMetaContext(
          { slug: 'my-post' },
          {},
          '/posts/my-post'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('<script type="application/ld+json">');
        expect(result).toContain('"@context":"https://schema.org"');
        expect(result).toContain('"@type":"Article"');
        expect(result).toContain('"headline":"My Blog Post"');
        expect(result).toContain('"author":"John Doe"');
        expect(result).toContain('</script>');
      });

      it('should generate valid JSON structure with @context as first property', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/about',
          params: [],
          jsonLd: {
            type: 'WebPage',
            properties: {
              name: { expr: 'lit', value: 'About Us' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/about');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Extract JSON-LD content and parse it
        const match = result.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        expect(match).not.toBeNull();
        const jsonContent = match![1];
        // Verify it starts with @context (accounting for possible escaping)
        expect(jsonContent).toMatch(/^\s*\{[^}]*"@context"/);
      });

      it('should generate JSON-LD with numeric property values', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/products/:id',
          params: ['id'],
          jsonLd: {
            type: 'Product',
            properties: {
              name: { expr: 'lit', value: 'Widget' },
              price: { expr: 'lit', value: 29.99 },
            },
          },
        };
        const ctx = createMetaContext({ id: '123' }, {}, '/products/123');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('"price":29.99');
      });
    });

    describe('dynamic JSON-LD properties with route params', () => {
      it('should evaluate route param in JSON-LD headline property', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'route', source: 'param', name: 'slug' },
            },
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
        expect(result).toContain('"headline":"hello-world"');
      });

      it('should evaluate route path in JSON-LD url property', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/blog/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'WebPage',
            properties: {
              url: {
                expr: 'concat',
                items: [
                  { expr: 'lit', value: 'https://example.com' },
                  { expr: 'route', source: 'path', name: '' },
                ],
              },
            },
          },
        };
        const ctx = createMetaContext(
          { slug: 'my-article' },
          {},
          '/blog/my-article'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('"url":"https://example.com/blog/my-article"');
      });

      it('should evaluate query param in JSON-LD property', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/search',
          params: [],
          jsonLd: {
            type: 'SearchResultsPage',
            properties: {
              query: { expr: 'route', source: 'query', name: 'q' },
            },
          },
        };
        const ctx = createMetaContext({}, { q: 'typescript' }, '/search');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).toContain('"query":"typescript"');
      });

      it('should evaluate binary expression in JSON-LD property', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: {
                expr: 'bin',
                op: '+',
                left: { expr: 'route', source: 'param', name: 'slug' },
                right: { expr: 'lit', value: ' - My Blog' },
              },
            },
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
        expect(result).toContain('"headline":"hello-world - My Blog"');
      });
    });

    describe('JSON-LD not provided', () => {
      it('should not generate JSON-LD script tag when jsonLd is not provided', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/about',
          params: [],
        };
        const ctx = createMetaContext({}, {}, '/about');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        expect(result).not.toContain('application/ld+json');
        expect(result).not.toContain('@context');
        expect(result).not.toContain('@type');
      });

      it('should not generate JSON-LD script tag when route is undefined', () => {
        // Arrange
        const ctx = createMetaContext({}, {}, '/');

        // Act
        const result = generateMetaTags(undefined, ctx);

        // Assert
        expect(result).toBe('');
      });
    });

    describe('JSON-LD with other meta tags', () => {
      it('should generate JSON-LD along with title and meta tags', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          title: { expr: 'lit', value: 'Hello World - My Blog' },
          meta: {
            description: { expr: 'lit', value: 'A great post about hello world' },
            'og:title': { expr: 'lit', value: 'Hello World' },
          },
          canonical: { expr: 'lit', value: 'https://example.com/posts/hello-world' },
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Hello World' },
              author: { expr: 'lit', value: 'John Doe' },
            },
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
        expect(result).toContain('<meta name="description" content="A great post about hello world">');
        expect(result).toContain('<meta property="og:title" content="Hello World">');
        expect(result).toContain('<link rel="canonical" href="https://example.com/posts/hello-world">');
        expect(result).toContain('<script type="application/ld+json">');
        expect(result).toContain('"@type":"Article"');
      });
    });
  });

  // ==================== JSON-LD Types ====================

  describe('JSON-LD types', () => {
    it('should support Article type with typical properties', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/posts/:slug',
        params: ['slug'],
        jsonLd: {
          type: 'Article',
          properties: {
            headline: { expr: 'lit', value: 'Understanding TypeScript Generics' },
            author: { expr: 'lit', value: 'Jane Doe' },
            datePublished: { expr: 'lit', value: '2024-01-15' },
            description: { expr: 'lit', value: 'A comprehensive guide to TypeScript generics' },
          },
        },
      };
      const ctx = createMetaContext({ slug: 'typescript-generics' }, {}, '/posts/typescript-generics');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      expect(result).toContain('"@type":"Article"');
      expect(result).toContain('"headline":"Understanding TypeScript Generics"');
      expect(result).toContain('"author":"Jane Doe"');
      expect(result).toContain('"datePublished":"2024-01-15"');
      expect(result).toContain('"description":"A comprehensive guide to TypeScript generics"');
    });

    it('should support WebPage type', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/about',
        params: [],
        jsonLd: {
          type: 'WebPage',
          properties: {
            name: { expr: 'lit', value: 'About Our Company' },
            description: { expr: 'lit', value: 'Learn about our mission and team' },
          },
        },
      };
      const ctx = createMetaContext({}, {}, '/about');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      expect(result).toContain('"@type":"WebPage"');
      expect(result).toContain('"name":"About Our Company"');
    });

    it('should support Organization type', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/company',
        params: [],
        jsonLd: {
          type: 'Organization',
          properties: {
            name: { expr: 'lit', value: 'Acme Corporation' },
            url: { expr: 'lit', value: 'https://acme.example.com' },
            logo: { expr: 'lit', value: 'https://acme.example.com/logo.png' },
          },
        },
      };
      const ctx = createMetaContext({}, {}, '/company');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      expect(result).toContain('"@type":"Organization"');
      expect(result).toContain('"name":"Acme Corporation"');
      expect(result).toContain('"url":"https://acme.example.com"');
      expect(result).toContain('"logo":"https://acme.example.com/logo.png"');
    });

    it('should support Product type', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/products/:id',
        params: ['id'],
        jsonLd: {
          type: 'Product',
          properties: {
            name: { expr: 'lit', value: 'Premium Widget' },
            description: { expr: 'lit', value: 'The best widget on the market' },
            sku: { expr: 'route', source: 'param', name: 'id' },
          },
        },
      };
      const ctx = createMetaContext({ id: 'SKU-12345' }, {}, '/products/SKU-12345');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      expect(result).toContain('"@type":"Product"');
      expect(result).toContain('"name":"Premium Widget"');
      expect(result).toContain('"sku":"SKU-12345"');
    });

    it('should support BreadcrumbList type', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/docs/:category/:slug',
        params: ['category', 'slug'],
        jsonLd: {
          type: 'BreadcrumbList',
          properties: {
            // Note: In a real implementation, itemListElement would need array support
            name: { expr: 'lit', value: 'Documentation Navigation' },
          },
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
      expect(result).toContain('"@type":"BreadcrumbList"');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty properties object', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/test',
        params: [],
        jsonLd: {
          type: 'WebPage',
          properties: {},
        },
      };
      const ctx = createMetaContext({}, {}, '/test');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      // Should still generate valid JSON-LD with @context and @type
      expect(result).toContain('<script type="application/ld+json">');
      expect(result).toContain('"@context":"https://schema.org"');
      expect(result).toContain('"@type":"WebPage"');
      expect(result).toContain('</script>');
    });

    it('should handle empty string property value', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/test',
        params: [],
        jsonLd: {
          type: 'Article',
          properties: {
            headline: { expr: 'lit', value: '' },
          },
        },
      };
      const ctx = createMetaContext({}, {}, '/test');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      // Empty string is valid JSON value
      expect(result).toContain('"headline":""');
    });

    it('should handle missing route param gracefully', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/posts/:slug',
        params: ['slug'],
        jsonLd: {
          type: 'Article',
          properties: {
            headline: { expr: 'route', source: 'param', name: 'nonexistent' },
          },
        },
      };
      const ctx = createMetaContext({ slug: 'test' }, {}, '/posts/test');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      // Should output empty string for missing param
      expect(result).toContain('"headline":""');
    });

    it('should handle boolean property values', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/test',
        params: [],
        jsonLd: {
          type: 'Article',
          properties: {
            isAccessibleForFree: { expr: 'lit', value: true },
          },
        },
      };
      const ctx = createMetaContext({}, {}, '/test');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      expect(result).toContain('"isAccessibleForFree":true');
    });

    it('should handle null property values', () => {
      // Arrange
      const route: CompiledRouteDefinition = {
        path: '/test',
        params: [],
        jsonLd: {
          type: 'Article',
          properties: {
            alternativeHeadline: { expr: 'lit', value: null },
          },
        },
      };
      const ctx = createMetaContext({}, {}, '/test');

      // Act
      const result = generateMetaTags(route, ctx);

      // Assert
      expect(result).toContain('"alternativeHeadline":null');
    });
  });

  // ==================== Security: XSS Prevention ====================

  describe('security', () => {
    describe('XSS prevention via </script> escaping', () => {
      it('should escape </script> in literal property values to prevent XSS', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Test</script><script>alert(1)</script>' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/posts/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should not contain literal </script> which could break out of JSON-LD script tag
        expect(result).not.toContain('</script><script>');
        // Should be escaped using Unicode escape sequences
        expect(result).toContain('\\u003c/script\\u003e');
      });

      it('should escape </script> in dynamic route param values', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'route', source: 'param', name: 'slug' },
            },
          },
        };
        // Malicious slug value
        const ctx = createMetaContext(
          { slug: 'evil</script><script>alert("xss")</script>' },
          {},
          '/posts/evil'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should not contain literal </script>
        expect(result).not.toContain('</script><script>');
        // Should be escaped
        expect(result).toContain('\\u003c/script\\u003e');
      });

      it('should escape < and > in property values', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: '<b>Bold</b> & <i>Italic</i>' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should escape angle brackets
        expect(result).toContain('\\u003c');
        expect(result).toContain('\\u003e');
        expect(result).not.toMatch(/<b>Bold<\/b>/);
      });

      it('should escape & in property values', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Tom & Jerry' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should escape ampersand
        expect(result).toContain('\\u0026');
        expect(result).not.toContain('"headline":"Tom & Jerry"');
      });

      it('should produce parseable JSON after escaping', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Test</script><script>alert(1)' },
              author: { expr: 'lit', value: 'John & Jane <Doe>' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Extract JSON content and verify it's valid JSON
        const match = result.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        expect(match).not.toBeNull();
        const jsonContent = match![1];
        // The escaped JSON should be parseable
        expect(() => JSON.parse(jsonContent)).not.toThrow();
      });

      it('should escape Unicode line/paragraph separators', () => {
        // Arrange
        // U+2028 (Line Separator) and U+2029 (Paragraph Separator) can break JSON in some contexts
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Line\u2028Break\u2029Test' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should escape these Unicode characters
        expect(result).toContain('\\u2028');
        expect(result).toContain('\\u2029');
      });
    });

    describe('multiple script tag escape attempts', () => {
      it('should handle nested script tag injection attempts', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: {
                expr: 'lit',
                value: '</script></script><script><script>alert(1)</script>',
              },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Count number of unescaped </script> tags - should only be the closing tag of JSON-LD script
        const scriptCloseMatches = result.match(/<\/script>/g) || [];
        // Should only have 1 legitimate </script> closing tag for the JSON-LD script
        expect(scriptCloseMatches.length).toBe(1);
      });

      it('should handle case variations of script tag', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/test',
          params: [],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: '</SCRIPT></Script></ScRiPt>' },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Extract the JSON content (between <script> and </script>)
        const match = result.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        expect(match).not.toBeNull();
        const jsonContent = match![1];

        // The JSON content should not contain unescaped </script> (case-insensitive)
        expect(jsonContent).not.toMatch(/<\/script>/i);

        // Count legitimate closing tags - should only be 1
        const scriptCloseMatches = result.match(/<\/script>/g) || [];
        expect(scriptCloseMatches.length).toBe(1);
      });
    });
  });

  // ==================== Nested Objects and Arrays ====================

  describe('nested objects and arrays', () => {
    describe('nested objects in properties', () => {
      it('should generate JSON-LD with nested object property (author as Person)', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Understanding TypeScript' },
              author: {
                expr: 'object',
                type: 'Person',
                properties: {
                  name: { expr: 'lit', value: 'John Doe' },
                  url: { expr: 'lit', value: 'https://example.com/john' },
                },
              },
            },
          },
        };
        const ctx = createMetaContext(
          { slug: 'typescript-guide' },
          {},
          '/posts/typescript-guide'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should contain nested author object with @type
        expect(result).toContain('"author":{');
        expect(result).toContain('"@type":"Person"');
        expect(result).toContain('"name":"John Doe"');
        expect(result).toContain('"url":"https://example.com/john"');

        // Verify it's valid JSON
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.author).toEqual({
          '@type': 'Person',
          name: 'John Doe',
          url: 'https://example.com/john',
        });
      });

      it('should generate JSON-LD with deeply nested objects (offers with priceSpecification)', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/products/:id',
          params: ['id'],
          jsonLd: {
            type: 'Product',
            properties: {
              name: { expr: 'lit', value: 'Premium Widget' },
              offers: {
                expr: 'object',
                type: 'Offer',
                properties: {
                  price: { expr: 'lit', value: 99.99 },
                  priceCurrency: { expr: 'lit', value: 'USD' },
                  priceSpecification: {
                    expr: 'object',
                    type: 'UnitPriceSpecification',
                    properties: {
                      price: { expr: 'lit', value: 99.99 },
                      priceCurrency: { expr: 'lit', value: 'USD' },
                      unitCode: { expr: 'lit', value: 'EA' },
                    },
                  },
                },
              },
            },
          },
        };
        const ctx = createMetaContext({ id: 'widget-001' }, {}, '/products/widget-001');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.offers['@type']).toBe('Offer');
        expect(parsed.offers.priceSpecification['@type']).toBe('UnitPriceSpecification');
        expect(parsed.offers.priceSpecification.unitCode).toBe('EA');
      });

      it('should evaluate dynamic expressions in nested object properties', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'route', source: 'param', name: 'slug' },
              author: {
                expr: 'object',
                type: 'Person',
                properties: {
                  name: { expr: 'lit', value: 'John Doe' },
                  url: {
                    expr: 'concat',
                    items: [
                      { expr: 'lit', value: 'https://example.com/authors/' },
                      { expr: 'route', source: 'param', name: 'slug' },
                    ],
                  },
                },
              },
            },
          },
        };
        const ctx = createMetaContext(
          { slug: 'john-doe' },
          {},
          '/posts/john-doe'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.author.url).toBe('https://example.com/authors/john-doe');
      });
    });

    describe('arrays in properties', () => {
      it('should generate JSON-LD with array of literal values', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'TypeScript Tips' },
              keywords: {
                expr: 'array',
                items: [
                  { expr: 'lit', value: 'typescript' },
                  { expr: 'lit', value: 'javascript' },
                  { expr: 'lit', value: 'programming' },
                ],
              },
            },
          },
        };
        const ctx = createMetaContext(
          { slug: 'ts-tips' },
          {},
          '/posts/ts-tips'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.keywords).toEqual(['typescript', 'javascript', 'programming']);
      });

      it('should generate JSON-LD with array of objects (multiple authors)', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/posts/:slug',
          params: ['slug'],
          jsonLd: {
            type: 'Article',
            properties: {
              headline: { expr: 'lit', value: 'Collaborative Article' },
              author: {
                expr: 'array',
                items: [
                  {
                    expr: 'object',
                    type: 'Person',
                    properties: {
                      name: { expr: 'lit', value: 'Alice' },
                    },
                  },
                  {
                    expr: 'object',
                    type: 'Person',
                    properties: {
                      name: { expr: 'lit', value: 'Bob' },
                    },
                  },
                ],
              },
            },
          },
        };
        const ctx = createMetaContext(
          { slug: 'collab-article' },
          {},
          '/posts/collab-article'
        );

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.author).toHaveLength(2);
        expect(parsed.author[0]).toEqual({ '@type': 'Person', name: 'Alice' });
        expect(parsed.author[1]).toEqual({ '@type': 'Person', name: 'Bob' });
      });

      it('should generate JSON-LD with array containing dynamic expressions', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/search',
          params: [],
          jsonLd: {
            type: 'ItemList',
            properties: {
              name: { expr: 'lit', value: 'Search Results' },
              itemListElement: {
                expr: 'array',
                items: [
                  {
                    expr: 'object',
                    type: 'ListItem',
                    properties: {
                      position: { expr: 'lit', value: 1 },
                      name: { expr: 'route', source: 'query', name: 'q' },
                    },
                  },
                ],
              },
            },
          },
        };
        const ctx = createMetaContext({}, { q: 'typescript' }, '/search');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.itemListElement[0].name).toBe('typescript');
      });
    });

    describe('BreadcrumbList structure', () => {
      it('should generate complete BreadcrumbList JSON-LD with itemListElement array', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/docs/:category/:slug',
          params: ['category', 'slug'],
          jsonLd: {
            type: 'BreadcrumbList',
            properties: {
              itemListElement: {
                expr: 'array',
                items: [
                  {
                    expr: 'object',
                    type: 'ListItem',
                    properties: {
                      position: { expr: 'lit', value: 1 },
                      name: { expr: 'lit', value: 'Home' },
                      item: { expr: 'lit', value: 'https://example.com/' },
                    },
                  },
                  {
                    expr: 'object',
                    type: 'ListItem',
                    properties: {
                      position: { expr: 'lit', value: 2 },
                      name: { expr: 'lit', value: 'Documentation' },
                      item: { expr: 'lit', value: 'https://example.com/docs' },
                    },
                  },
                  {
                    expr: 'object',
                    type: 'ListItem',
                    properties: {
                      position: { expr: 'lit', value: 3 },
                      name: { expr: 'route', source: 'param', name: 'category' },
                      item: {
                        expr: 'concat',
                        items: [
                          { expr: 'lit', value: 'https://example.com/docs/' },
                          { expr: 'route', source: 'param', name: 'category' },
                        ],
                      },
                    },
                  },
                ],
              },
            },
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
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);

        // Verify structure
        expect(parsed['@context']).toBe('https://schema.org');
        expect(parsed['@type']).toBe('BreadcrumbList');
        expect(parsed.itemListElement).toHaveLength(3);

        // Verify first item
        expect(parsed.itemListElement[0]).toEqual({
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://example.com/',
        });

        // Verify second item
        expect(parsed.itemListElement[1]).toEqual({
          '@type': 'ListItem',
          position: 2,
          name: 'Documentation',
          item: 'https://example.com/docs',
        });

        // Verify third item (with dynamic values)
        expect(parsed.itemListElement[2]).toEqual({
          '@type': 'ListItem',
          position: 3,
          name: 'guides',
          item: 'https://example.com/docs/guides',
        });
      });

      it('should escape XSS in nested object/array values', () => {
        // Arrange
        const route: CompiledRouteDefinition = {
          path: '/docs/:category',
          params: ['category'],
          jsonLd: {
            type: 'BreadcrumbList',
            properties: {
              itemListElement: {
                expr: 'array',
                items: [
                  {
                    expr: 'object',
                    type: 'ListItem',
                    properties: {
                      position: { expr: 'lit', value: 1 },
                      name: { expr: 'lit', value: '</script><script>alert(1)</script>' },
                      item: { expr: 'lit', value: 'https://example.com/' },
                    },
                  },
                ],
              },
            },
          },
        };
        const ctx = createMetaContext({ category: 'test' }, {}, '/docs/test');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        // Should not contain unescaped </script>
        expect(result).not.toContain('</script><script>');
        // Should have only one legitimate </script> tag
        const scriptCloseMatches = result.match(/<\/script>/g) || [];
        expect(scriptCloseMatches.length).toBe(1);

        // Should still be valid JSON
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        expect(() => JSON.parse(match![1])).not.toThrow();
      });
    });

    describe('nested object without @type', () => {
      it('should generate JSON-LD with plain nested object (no @type)', () => {
        // Arrange
        // Some JSON-LD properties don't need @type (e.g., address as plain object)
        const route: CompiledRouteDefinition = {
          path: '/contact',
          params: [],
          jsonLd: {
            type: 'Organization',
            properties: {
              name: { expr: 'lit', value: 'Acme Corp' },
              contactPoint: {
                expr: 'object',
                // No type specified - should be plain object without @type
                properties: {
                  telephone: { expr: 'lit', value: '+1-800-555-1234' },
                  email: { expr: 'lit', value: 'contact@acme.example.com' },
                },
              },
            },
          },
        };
        const ctx = createMetaContext({}, {}, '/contact');

        // Act
        const result = generateMetaTags(route, ctx);

        // Assert
        const match = result.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match![1]);
        expect(parsed.contactPoint).toEqual({
          telephone: '+1-800-555-1234',
          email: 'contact@acme.example.com',
        });
        // Should NOT have @type in contactPoint
        expect(parsed.contactPoint['@type']).toBeUndefined();
      });
    });
  });
});
