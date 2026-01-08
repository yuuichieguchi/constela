/**
 * Test module for Data Source analysis.
 *
 * Coverage:
 * - Data source validation
 * - getStaticPaths references valid data source
 * - Error for invalid data source reference
 * - Data expression validation
 * - DataExpr type guard validation
 *
 * TDD Red Phase: These tests verify the semantic analysis of data sources
 * and getStaticPaths that will be added to support build-time content loading
 * in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program } from '@constela/core';

describe('analyzePass with Data sources', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program for testing data source analysis
   */
  function createProgramWithData(
    data: Record<string, unknown>,
    view: unknown = { kind: 'element', tag: 'div' }
  ): Program {
    return {
      version: '1.0',
      data,
      state: {},
      actions: [],
      view,
    } as unknown as Program;
  }

  /**
   * Creates a Program with data and getStaticPaths
   */
  function createProgramWithStaticPaths(
    data: Record<string, unknown>,
    getStaticPaths: unknown
  ): Program {
    return {
      version: '1.0',
      route: {
        path: '/blog/:slug',
        getStaticPaths,
      },
      data,
      state: {},
      actions: [],
      view: { kind: 'element', tag: 'div' },
    } as unknown as Program;
  }

  // ==================== Valid Data Sources ====================

  describe('valid data sources', () => {
    it('should accept glob data source with pattern', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          pattern: 'content/blog/*.mdx',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept glob data source with transform', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          pattern: 'content/**/*.mdx',
          transform: 'mdx',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept file data source with path', () => {
      // Arrange
      const program = createProgramWithData({
        config: {
          type: 'file',
          path: 'data/config.json',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept file data source with yaml transform', () => {
      // Arrange
      const program = createProgramWithData({
        settings: {
          type: 'file',
          path: 'data/settings.yaml',
          transform: 'yaml',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept api data source with url', () => {
      // Arrange
      const program = createProgramWithData({
        externalPosts: {
          type: 'api',
          url: 'https://api.example.com/posts',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept multiple data sources of different types', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          pattern: 'content/blog/*.mdx',
          transform: 'mdx',
        },
        config: {
          type: 'file',
          path: 'data/config.json',
        },
        external: {
          type: 'api',
          url: 'https://api.example.com/data',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should include data names in analysis context', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          pattern: 'content/*.mdx',
        },
        config: {
          type: 'file',
          path: 'data/config.json',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      if (result.ok) {
        expect(result.context.dataNames.has('posts')).toBe(true);
        expect(result.context.dataNames.has('config')).toBe(true);
      }
    });
  });

  // ==================== Invalid Data Sources ====================

  describe('invalid data sources', () => {
    it('should reject glob data source without pattern', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          // Missing pattern
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('INVALID_DATA_SOURCE');
      }
    });

    it('should reject file data source without path', () => {
      // Arrange
      const program = createProgramWithData({
        config: {
          type: 'file',
          // Missing path
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('INVALID_DATA_SOURCE');
      }
    });

    it('should reject api data source without url', () => {
      // Arrange
      const program = createProgramWithData({
        external: {
          type: 'api',
          // Missing url
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('INVALID_DATA_SOURCE');
      }
    });

    it('should reject data source with invalid type', () => {
      // Arrange
      const program = createProgramWithData({
        invalid: {
          type: 'unknown',
          pattern: 'content/*.txt',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('INVALID_DATA_SOURCE');
      }
    });

    it('should reject data source with invalid transform', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          pattern: 'content/*.txt',
          transform: 'invalid',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('INVALID_DATA_SOURCE');
      }
    });

    it('should provide meaningful error path for invalid data source', () => {
      // Arrange
      const program = createProgramWithData({
        posts: {
          type: 'glob',
          // Missing pattern
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/data/posts');
      }
    });
  });

  // ==================== getStaticPaths Validation ====================

  describe('getStaticPaths validation', () => {
    it('should accept getStaticPaths referencing valid data source', () => {
      // Arrange
      const program = createProgramWithStaticPaths(
        {
          blogPosts: {
            type: 'glob',
            pattern: 'content/blog/*.mdx',
            transform: 'mdx',
          },
        },
        {
          source: 'blogPosts',
          params: {
            slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject getStaticPaths referencing undefined data source', () => {
      // Arrange
      const program = createProgramWithStaticPaths(
        {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        {
          source: 'nonexistentData', // Does not exist in data
          params: {
            slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_DATA_SOURCE');
      }
    });

    it('should reject getStaticPaths when no data is defined', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/blog/:slug',
          getStaticPaths: {
            source: 'posts',
            params: {
              slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
            },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('DATA_NOT_DEFINED');
      }
    });

    it('should provide meaningful error message for undefined data source', () => {
      // Arrange
      const program = createProgramWithStaticPaths(
        {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        {
          source: 'blogPosts', // Typo - should be 'posts'
          params: {
            slug: { expr: 'lit', value: 'test' },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.message).toContain('blogPosts');
        expect(result.errors[0]?.path).toContain('/route/getStaticPaths');
      }
    });

    it('should validate params expressions in getStaticPaths', () => {
      // Arrange
      const program = createProgramWithStaticPaths(
        {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        {
          source: 'posts',
          params: {
            slug: { expr: 'state', name: 'undefinedState' }, // Invalid: references undefined state
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some(e => e.code === 'UNDEFINED_STATE')).toBe(true);
      }
    });
  });

  // ==================== Data Expression Validation ====================

  describe('data expression validation', () => {
    it('should accept data expression referencing defined data source', () => {
      // Arrange
      const program = createProgramWithData(
        {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        {
          kind: 'each',
          items: { expr: 'data', name: 'posts' },
          as: 'post',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'post' },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject data expression referencing undefined data source', () => {
      // Arrange
      const program = createProgramWithData(
        {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        {
          kind: 'each',
          items: { expr: 'data', name: 'unknownData' }, // Does not exist
          as: 'item',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'item' },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_DATA');
      }
    });

    it('should reject data expression when no data is defined', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'data', name: 'posts' },
          as: 'post',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'post' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('DATA_NOT_DEFINED');
      }
    });

    it('should validate data expression nested in get expression', () => {
      // Arrange
      const program = createProgramWithData(
        {
          config: {
            type: 'file',
            path: 'data/config.json',
          },
        },
        {
          kind: 'text',
          value: {
            expr: 'get',
            base: { expr: 'data', name: 'config' },
            path: 'title',
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined data expression nested in get expression', () => {
      // Arrange
      const program = createProgramWithData(
        {
          config: {
            type: 'file',
            path: 'data/config.json',
          },
        },
        {
          kind: 'text',
          value: {
            expr: 'get',
            base: { expr: 'data', name: 'unknownConfig' },
            path: 'title',
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_DATA');
      }
    });

    it('should validate data expression in if condition', () => {
      // Arrange
      const program = createProgramWithData(
        {
          config: {
            type: 'file',
            path: 'data/config.json',
          },
        },
        {
          kind: 'if',
          condition: {
            expr: 'get',
            base: { expr: 'data', name: 'config' },
            path: 'featureEnabled',
          },
          then: { kind: 'text', value: { expr: 'lit', value: 'ON' } },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate data expression in element props', () => {
      // Arrange
      const program = createProgramWithData(
        {
          links: {
            type: 'file',
            path: 'data/links.json',
          },
        },
        {
          kind: 'element',
          tag: 'a',
          props: {
            href: {
              expr: 'get',
              base: { expr: 'data', name: 'links' },
              path: 'homepage',
            },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should provide meaningful error path for undefined data expression', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        data: {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'data', name: 'unknownData' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/view/children/0/value');
      }
    });

    it('should collect multiple undefined data errors', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        data: {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'data', name: 'unknown1' },
            },
            {
              kind: 'text',
              value: { expr: 'data', name: 'unknown2' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should work alongside state expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        data: {
          config: {
            type: 'file',
            path: 'data/config.json',
          },
        },
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'count' },
            },
            {
              kind: 'text',
              value: {
                expr: 'get',
                base: { expr: 'data', name: 'config' },
                path: 'title',
              },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should work alongside import expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        imports: {
          navigation: './nav.json',
        },
        data: {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'navigation', path: 'title' },
            },
            {
              kind: 'each',
              items: { expr: 'data', name: 'posts' },
              as: 'post',
              body: {
                kind: 'text',
                value: { expr: 'var', name: 'post' },
              },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should work alongside route expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/blog/:slug',
        },
        data: {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'route', name: 'slug' },
            },
            {
              kind: 'each',
              items: { expr: 'data', name: 'posts' },
              as: 'post',
              body: {
                kind: 'text',
                value: { expr: 'var', name: 'post' },
              },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle data names with special characters', () => {
      // Arrange
      const program = createProgramWithData({
        'blog-posts': {
          type: 'glob',
          pattern: 'content/*.mdx',
        },
        'config_data': {
          type: 'file',
          path: 'data/config.json',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle deeply nested data expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        data: {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'lit', value: true },
              then: {
                kind: 'each',
                items: { expr: 'data', name: 'posts' },
                as: 'post',
                body: {
                  kind: 'text',
                  value: {
                    expr: 'bin',
                    op: '+',
                    left: { expr: 'lit', value: 'Post: ' },
                    right: {
                      expr: 'get',
                      base: { expr: 'var', name: 'post' },
                      path: 'title',
                    },
                  },
                },
              },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should return empty set for programs without data', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Act
      const result = analyzePass(program);

      // Assert
      if (result.ok) {
        expect(result.context.dataNames.size).toBe(0);
      }
    });
  });

  // ==================== DataExpr Type Guard ====================

  describe('DataExpr type guard (isDataExpr)', () => {
    it('should validate data expression with name field', () => {
      // Arrange
      const program = createProgramWithData(
        {
          posts: {
            type: 'glob',
            pattern: 'content/*.mdx',
          },
        },
        {
          kind: 'text',
          value: { expr: 'data', name: 'posts' },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate data expression with optional path field', () => {
      // Arrange
      const program = createProgramWithData(
        {
          config: {
            type: 'file',
            path: 'data/config.json',
          },
        },
        {
          kind: 'text',
          value: { expr: 'data', name: 'config', path: 'settings.theme' },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});
