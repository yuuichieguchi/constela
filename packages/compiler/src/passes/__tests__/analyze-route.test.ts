/**
 * Test module for Route Expression analysis.
 *
 * Coverage:
 * - Route expression validation against route params
 * - Error when route expression references undefined param
 * - Route expressions in different contexts (view, title, meta)
 * - Route param extraction from path
 *
 * TDD Red Phase: These tests verify the semantic analysis of route expressions
 * that will be added to support route definitions in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program } from '@constela/core';

describe('analyzePass with Route expressions', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program for testing route analysis
   */
  function createProgramWithRoute(
    routePath: string,
    routeExprName: string,
    routeSource?: 'param' | 'query' | 'path'
  ): Program {
    const routeExpr = routeSource
      ? { expr: 'route' as const, name: routeExprName, source: routeSource }
      : { expr: 'route' as const, name: routeExprName };

    return {
      version: '1.0',
      route: {
        path: routePath,
      },
      state: {},
      actions: [],
      view: {
        kind: 'text',
        value: routeExpr,
      },
    } as unknown as Program; // Cast needed until types are implemented
  }

  // ==================== Valid Route References ====================

  describe('valid route references', () => {
    it('should accept route expression referencing defined param', () => {
      // Arrange
      // Path /users/:id defines param 'id'
      const program = createProgramWithRoute('/users/:id', 'id');

      // Act
      const result = analyzePass(program);

      // Assert
      // Should pass without errors when route expr references valid param
      expect(result.ok).toBe(true);
    });

    it('should accept route expression with multiple params', () => {
      // Arrange
      // Path /users/:userId/posts/:postId defines params 'userId' and 'postId'
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:userId/posts/:postId',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'route', name: 'userId' },
            },
            {
              kind: 'text',
              value: { expr: 'route', name: 'postId' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept route expression with query source', () => {
      // Arrange
      // Query params are always valid (dynamic at runtime)
      const program = createProgramWithRoute('/search', 'q', 'query');

      // Act
      const result = analyzePass(program);

      // Assert
      // Query params should be accepted without path validation
      expect(result.ok).toBe(true);
    });

    it('should accept route expression with path source', () => {
      // Arrange
      // Path source accesses the full path string
      const program = createProgramWithRoute('/blog/*', 'slug', 'path');

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Invalid Route References ====================

  describe('invalid route references', () => {
    it('should reject route expression referencing undefined param', () => {
      // Arrange
      // Path /users/:id only defines 'id', not 'name'
      const program = createProgramWithRoute('/users/:id', 'name');

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail with UNDEFINED_ROUTE_PARAM error
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ROUTE_PARAM');
      }
    });

    it('should reject route expression when no route is defined', () => {
      // Arrange
      // Program without route field but using route expression
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'route', name: 'id' },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail because route expression used without route definition
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('ROUTE_NOT_DEFINED');
      }
    });

    it('should provide meaningful error path for undefined route param', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'route', name: 'unknownParam' },
            },
          ],
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Error path should point to the specific expression location
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/view/children/0/value');
      }
    });
  });

  // ==================== Route Expressions in Different Contexts ====================

  describe('route expressions in different contexts', () => {
    it('should validate route expressions in title', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
          title: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 'User: ' },
            right: { expr: 'route', name: 'id' },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined route param in title', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
          title: { expr: 'route', name: 'unknownParam' },
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
        expect(result.errors[0]?.path).toContain('/route/title');
      }
    });

    it('should validate route expressions in meta', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/posts/:slug',
          meta: {
            'og:title': { expr: 'route', name: 'slug' },
            description: { expr: 'lit', value: 'A blog post' },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined route param in meta', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/posts/:slug',
          meta: {
            'og:title': { expr: 'route', name: 'unknownParam' },
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
        expect(result.errors[0]?.path).toContain('/route/meta/og:title');
      }
    });

    it('should validate route expressions nested in binary expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 'User ID: ' },
            right: { expr: 'route', name: 'id' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate route expressions in conditional expressions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        state: {
          showId: { type: 'boolean', initial: true },
        },
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'cond',
            if: { expr: 'state', name: 'showId' },
            then: { expr: 'route', name: 'id' },
            else: { expr: 'lit', value: 'hidden' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Route Param Extraction ====================

  describe('route param extraction from path', () => {
    it('should extract params from simple path', () => {
      // This tests the internal param extraction logic
      // Path: /users/:id -> extracts ['id']
      const program = createProgramWithRoute('/users/:id', 'id');
      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should extract params from nested path', () => {
      // Path: /users/:userId/posts/:postId/comments/:commentId
      // Should extract ['userId', 'postId', 'commentId']
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:userId/posts/:postId/comments/:commentId',
        },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'route', name: 'userId' } },
            { kind: 'text', value: { expr: 'route', name: 'postId' } },
            { kind: 'text', value: { expr: 'route', name: 'commentId' } },
          ],
        },
      } as unknown as Program;

      const result = analyzePass(program);

      expect(result.ok).toBe(true);
    });

    it('should handle path without params', () => {
      // Path: /about -> extracts []
      const program: Program = {
        version: '1.0',
        route: {
          path: '/about',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const result = analyzePass(program);

      // Should pass - no route expressions used
      expect(result.ok).toBe(true);
    });

    it('should reject param reference when path has no params', () => {
      // Path: /about -> no params
      // But trying to use route expression
      const program: Program = {
        version: '1.0',
        route: {
          path: '/about',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'route', name: 'id' },
        },
      } as unknown as Program;

      const result = analyzePass(program);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ROUTE_PARAM');
      }
    });
  });

  // ==================== Analysis Context ====================

  describe('analysis context updates', () => {
    it('should include route params in analysis context', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Context should include routeParams
      if (result.ok) {
        expect(result.context.routeParams.has('id')).toBe(true);
      }
    });
  });
});
