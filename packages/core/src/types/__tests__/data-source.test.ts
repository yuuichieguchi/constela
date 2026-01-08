/**
 * Test module for Data Source types.
 *
 * Coverage:
 * - DataSource type structure (glob, file, api)
 * - StaticPathsDefinition type structure
 * - Program with data field
 * - Type guards: isDataSource, isStaticPathsDefinition
 * - RouteDefinition with getStaticPaths field
 *
 * TDD Red Phase: These tests verify the DataSource and StaticPathsDefinition
 * types that will be added to support build-time content loading in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type { DataSource, StaticPathsDefinition, RouteDefinition, Program } from '../ast.js';
import { isDataSource, isStaticPathsDefinition } from '../guards.js';

describe('DataSource', () => {
  // ==================== Type Structure - Glob ====================

  describe('glob type structure', () => {
    it('should have type field set to "glob"', () => {
      // Arrange
      const dataSource = {
        type: 'glob',
        pattern: 'content/blog/*.mdx',
      };

      // Assert
      expect(isDataSource(dataSource)).toBe(true);
    });

    it('should require pattern field for glob type', () => {
      // Arrange
      const validGlob = {
        type: 'glob',
        pattern: 'content/**/*.mdx',
      };

      const invalidGlob = {
        type: 'glob',
        // Missing pattern field
      };

      // Assert
      expect(isDataSource(validGlob)).toBe(true);
      expect(isDataSource(invalidGlob)).toBe(false);
    });

    it('should accept optional transform field for glob type', () => {
      // Arrange
      const globWithMdxTransform = {
        type: 'glob',
        pattern: 'content/blog/*.mdx',
        transform: 'mdx',
      };

      const globWithYamlTransform = {
        type: 'glob',
        pattern: 'data/*.yaml',
        transform: 'yaml',
      };

      const globWithCsvTransform = {
        type: 'glob',
        pattern: 'data/*.csv',
        transform: 'csv',
      };

      // Assert
      expect(isDataSource(globWithMdxTransform)).toBe(true);
      expect(isDataSource(globWithYamlTransform)).toBe(true);
      expect(isDataSource(globWithCsvTransform)).toBe(true);
    });

    it('should reject invalid transform values', () => {
      // Arrange
      const invalidTransform = {
        type: 'glob',
        pattern: 'content/**/*.txt',
        transform: 'invalid',
      };

      // Assert
      expect(isDataSource(invalidTransform)).toBe(false);
    });
  });

  // ==================== Type Structure - File ====================

  describe('file type structure', () => {
    it('should have type field set to "file"', () => {
      // Arrange
      const dataSource = {
        type: 'file',
        path: 'data/config.json',
      };

      // Assert
      expect(isDataSource(dataSource)).toBe(true);
    });

    it('should require path field for file type', () => {
      // Arrange
      const validFile = {
        type: 'file',
        path: 'data/settings.json',
      };

      const invalidFile = {
        type: 'file',
        // Missing path field
      };

      // Assert
      expect(isDataSource(validFile)).toBe(true);
      expect(isDataSource(invalidFile)).toBe(false);
    });

    it('should accept optional transform field for file type', () => {
      // Arrange
      const fileWithYamlTransform = {
        type: 'file',
        path: 'data/config.yaml',
        transform: 'yaml',
      };

      // Assert
      expect(isDataSource(fileWithYamlTransform)).toBe(true);
    });
  });

  // ==================== Type Structure - API ====================

  describe('api type structure', () => {
    it('should have type field set to "api"', () => {
      // Arrange
      const dataSource = {
        type: 'api',
        url: 'https://api.example.com/posts',
      };

      // Assert
      expect(isDataSource(dataSource)).toBe(true);
    });

    it('should require url field for api type', () => {
      // Arrange
      const validApi = {
        type: 'api',
        url: 'https://api.example.com/data',
      };

      const invalidApi = {
        type: 'api',
        // Missing url field
      };

      // Assert
      expect(isDataSource(validApi)).toBe(true);
      expect(isDataSource(invalidApi)).toBe(false);
    });

    it('should accept optional transform field for api type', () => {
      // Arrange
      const apiWithTransform = {
        type: 'api',
        url: 'https://api.example.com/data.csv',
        transform: 'csv',
      };

      // Assert
      expect(isDataSource(apiWithTransform)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isDataSource(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isDataSource(undefined)).toBe(false);
    });

    it('should reject array', () => {
      expect(isDataSource([])).toBe(false);
    });

    it('should reject object without type field', () => {
      const obj = { pattern: 'content/*.mdx' };
      expect(isDataSource(obj)).toBe(false);
    });

    it('should reject object with invalid type value', () => {
      const obj = { type: 'invalid', pattern: 'content/*.mdx' };
      expect(isDataSource(obj)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isDataSource({})).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isDataSource('glob')).toBe(false);
      expect(isDataSource(123)).toBe(false);
      expect(isDataSource(true)).toBe(false);
    });
  });
});

describe('StaticPathsDefinition', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should require source field as string', () => {
      // Arrange
      const validStaticPaths = {
        source: 'blogPosts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
        },
      };

      // Assert
      expect(isStaticPathsDefinition(validStaticPaths)).toBe(true);
    });

    it('should require params field as Record<string, Expression>', () => {
      // Arrange
      const validStaticPaths = {
        source: 'posts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
          year: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'date.year' },
        },
      };

      const invalidStaticPaths = {
        source: 'posts',
        // Missing params field
      };

      // Assert
      expect(isStaticPathsDefinition(validStaticPaths)).toBe(true);
      expect(isStaticPathsDefinition(invalidStaticPaths)).toBe(false);
    });

    it('should accept params with different expression types', () => {
      // Arrange
      const staticPathsWithLit = {
        source: 'categories',
        params: {
          category: { expr: 'lit', value: 'tech' },
        },
      };

      const staticPathsWithGet = {
        source: 'posts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'metadata.slug' },
        },
      };

      // Assert
      expect(isStaticPathsDefinition(staticPathsWithLit)).toBe(true);
      expect(isStaticPathsDefinition(staticPathsWithGet)).toBe(true);
    });

    it('should reject non-string source', () => {
      // Arrange
      const invalidStaticPaths = {
        source: 123, // Invalid: should be string
        params: {
          slug: { expr: 'lit', value: 'test' },
        },
      };

      // Assert
      expect(isStaticPathsDefinition(invalidStaticPaths)).toBe(false);
    });

    it('should reject non-object params', () => {
      // Arrange
      const invalidStaticPaths = {
        source: 'posts',
        params: 'invalid', // Invalid: should be object
      };

      // Assert
      expect(isStaticPathsDefinition(invalidStaticPaths)).toBe(false);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isStaticPathsDefinition(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isStaticPathsDefinition(undefined)).toBe(false);
    });

    it('should reject array', () => {
      expect(isStaticPathsDefinition([])).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isStaticPathsDefinition({})).toBe(false);
    });
  });
});

describe('RouteDefinition with getStaticPaths', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should accept route with getStaticPaths field', () => {
      // Arrange
      const route: RouteDefinition = {
        path: '/blog/:slug',
        getStaticPaths: {
          source: 'blogPosts',
          params: {
            slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
          },
        },
      } as RouteDefinition;

      // Assert - getStaticPaths should be accessible
      expect(route.getStaticPaths).toBeDefined();
      expect(route.getStaticPaths?.source).toBe('blogPosts');
    });

    it('should accept route without getStaticPaths (backward compatibility)', () => {
      // Arrange
      const route: RouteDefinition = {
        path: '/about',
        title: { expr: 'lit', value: 'About Us' },
      } as RouteDefinition;

      // Assert
      expect(route.getStaticPaths).toBeUndefined();
    });

    it('should accept route with all fields including getStaticPaths', () => {
      // Arrange
      const route: RouteDefinition = {
        path: '/posts/:year/:slug',
        title: { expr: 'lit', value: 'Blog Post' },
        layout: 'BlogLayout',
        meta: {
          description: { expr: 'lit', value: 'A blog post' },
        },
        getStaticPaths: {
          source: 'allPosts',
          params: {
            year: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'year' },
            slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
          },
        },
      } as RouteDefinition;

      // Assert
      expect(route.path).toBe('/posts/:year/:slug');
      expect(route.getStaticPaths).toBeDefined();
      expect(route.getStaticPaths?.params.year).toBeDefined();
      expect(route.getStaticPaths?.params.slug).toBeDefined();
    });
  });
});

describe('Program with data field', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should accept program without data field (backward compatibility)', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.data).toBeUndefined();
    });

    it('should accept program with data field', () => {
      // Arrange
      const program = {
        version: '1.0',
        data: {
          blogPosts: {
            type: 'glob',
            pattern: 'content/blog/*.mdx',
            transform: 'mdx',
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Assert
      expect(program.data).toBeDefined();
      expect(program.data?.blogPosts).toBeDefined();
    });

    it('should accept program with multiple data sources', () => {
      // Arrange
      const program = {
        version: '1.0',
        data: {
          blogPosts: {
            type: 'glob',
            pattern: 'content/blog/*.mdx',
            transform: 'mdx',
          },
          config: {
            type: 'file',
            path: 'data/config.json',
          },
          externalPosts: {
            type: 'api',
            url: 'https://api.example.com/posts',
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Assert
      expect(Object.keys(program.data ?? {}).length).toBe(3);
    });

    it('should accept program with data and route with getStaticPaths', () => {
      // Arrange
      const program = {
        version: '1.0',
        route: {
          path: '/blog/:slug',
          getStaticPaths: {
            source: 'blogPosts',
            params: {
              slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
            },
          },
        },
        data: {
          blogPosts: {
            type: 'glob',
            pattern: 'content/blog/*.mdx',
            transform: 'mdx',
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Assert
      expect(program.data?.blogPosts).toBeDefined();
      expect(program.route?.getStaticPaths?.source).toBe('blogPosts');
    });
  });

  // ==================== Data Source Usage ====================

  describe('data source usage in view', () => {
    it('should allow data expression in each items', () => {
      // Arrange
      const program = {
        version: '1.0',
        data: {
          posts: {
            type: 'glob',
            pattern: 'content/**/*.mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'data', name: 'posts' },
          as: 'post',
          body: {
            kind: 'text',
            value: { expr: 'get', base: { expr: 'var', name: 'post' }, path: 'title' },
          },
        },
      } as unknown as Program;

      // This tests that data expressions can be used in the view
      const view = program.view as { items?: { expr?: string; name?: string } };
      expect(view.items?.expr).toBe('data');
      expect(view.items?.name).toBe('posts');
    });

    it('should allow data expression in if condition', () => {
      // Arrange
      const program = {
        version: '1.0',
        data: {
          config: {
            type: 'file',
            path: 'data/config.json',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'if',
          condition: {
            expr: 'get',
            base: { expr: 'data', name: 'config' },
            path: 'featureEnabled',
          },
          then: { kind: 'text', value: { expr: 'lit', value: 'Feature ON' } },
        },
      } as unknown as Program;

      // This tests that data expressions can be nested in get expressions
      const view = program.view as { condition?: { base?: { expr?: string } } };
      expect(view.condition?.base?.expr).toBe('data');
    });
  });

  // ==================== SSG Integration ====================

  describe('SSG integration', () => {
    it('should support full SSG configuration', () => {
      // Arrange - Complete SSG blog setup
      const program = {
        version: '1.0',
        route: {
          path: '/blog/:slug',
          title: {
            expr: 'get',
            base: { expr: 'data', name: 'currentPost' },
            path: 'frontmatter.title',
          },
          getStaticPaths: {
            source: 'blogPosts',
            params: {
              slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'frontmatter.slug' },
            },
          },
        },
        data: {
          blogPosts: {
            type: 'glob',
            pattern: 'content/blog/*.mdx',
            transform: 'mdx',
          },
          currentPost: {
            type: 'file',
            path: 'content/blog/${route.slug}.mdx', // Dynamic path reference
            transform: 'mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'article',
          children: [
            {
              kind: 'element',
              tag: 'h1',
              children: [
                {
                  kind: 'text',
                  value: {
                    expr: 'get',
                    base: { expr: 'data', name: 'currentPost' },
                    path: 'frontmatter.title',
                  },
                },
              ],
            },
            {
              kind: 'markdown',
              content: {
                expr: 'get',
                base: { expr: 'data', name: 'currentPost' },
                path: 'content',
              },
            },
          ],
        },
      } as unknown as Program;

      // Assert
      expect(program.route?.getStaticPaths?.source).toBe('blogPosts');
      expect(program.data?.blogPosts.type).toBe('glob');
      expect(program.data?.currentPost.transform).toBe('mdx');
    });
  });
});
