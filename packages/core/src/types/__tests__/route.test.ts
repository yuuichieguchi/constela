/**
 * Test module for Route Definition types.
 *
 * Coverage:
 * - RouteExpr type structure and type guard
 * - RouteDefinition type structure and type guard
 * - Program with route field
 * - Edge cases for route expressions
 *
 * TDD Red Phase: These tests verify the RouteExpr and RouteDefinition
 * types that will be added to support route definitions in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type { RouteExpr, RouteDefinition, Program } from '../ast.js';
import { isRouteExpr, isRouteDefinition, isExpression } from '../guards.js';

describe('RouteExpr', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have expr field set to "route"', () => {
      // Arrange
      const routeExpr = {
        expr: 'route',
        name: 'id',
      };

      // Assert
      expect(isRouteExpr(routeExpr)).toBe(true);
    });

    it('should require name field as string', () => {
      // Arrange
      const validRouteExpr = {
        expr: 'route',
        name: 'userId',
      };

      const invalidRouteExpr = {
        expr: 'route',
        name: 123, // Invalid: should be string
      };

      // Assert
      expect(isRouteExpr(validRouteExpr)).toBe(true);
      expect(isRouteExpr(invalidRouteExpr)).toBe(false);
    });

    it('should accept optional source field with valid values', () => {
      // Arrange
      const paramSource = { expr: 'route', name: 'id', source: 'param' };
      const querySource = { expr: 'route', name: 'page', source: 'query' };
      const pathSource = { expr: 'route', name: 'slug', source: 'path' };

      // Assert
      expect(isRouteExpr(paramSource)).toBe(true);
      expect(isRouteExpr(querySource)).toBe(true);
      expect(isRouteExpr(pathSource)).toBe(true);
    });

    it('should reject invalid source values', () => {
      // Arrange
      const invalidSource = {
        expr: 'route',
        name: 'id',
        source: 'invalid', // Invalid source value
      };

      // Assert
      expect(isRouteExpr(invalidSource)).toBe(false);
    });

    it('should default source to "param" when not specified', () => {
      // Arrange
      const routeExprWithoutSource = {
        expr: 'route',
        name: 'id',
      };

      // This test documents the expected default behavior
      // The actual default should be handled by the runtime/compiler
      expect(isRouteExpr(routeExprWithoutSource)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isRouteExpr(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isRouteExpr(undefined)).toBe(false);
    });

    it('should reject array', () => {
      expect(isRouteExpr([])).toBe(false);
    });

    it('should reject object without expr field', () => {
      const obj = { name: 'id' };
      expect(isRouteExpr(obj)).toBe(false);
    });

    it('should reject object with wrong expr value', () => {
      const obj = { expr: 'state', name: 'counter' };
      expect(isRouteExpr(obj)).toBe(false);
    });

    it('should reject object without name field', () => {
      const obj = { expr: 'route' };
      expect(isRouteExpr(obj)).toBe(false);
    });
  });
});

describe('RouteDefinition', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should require path field as string', () => {
      // Arrange
      const validRoute = {
        path: '/users/:id',
      };

      // Assert
      expect(isRouteDefinition(validRoute)).toBe(true);
    });

    it('should accept optional title field as Expression', () => {
      // Arrange
      const routeWithTitle = {
        path: '/users/:id',
        title: { expr: 'lit', value: 'User Profile' },
      };

      const routeWithDynamicTitle = {
        path: '/users/:id',
        title: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 'User: ' },
          right: { expr: 'route', name: 'id' },
        },
      };

      // Assert
      expect(isRouteDefinition(routeWithTitle)).toBe(true);
      expect(isRouteDefinition(routeWithDynamicTitle)).toBe(true);
    });

    it('should accept optional layout field as string', () => {
      // Arrange
      const routeWithLayout = {
        path: '/dashboard',
        layout: 'DashboardLayout',
      };

      // Assert
      expect(isRouteDefinition(routeWithLayout)).toBe(true);
    });

    it('should accept optional meta field as Record<string, Expression>', () => {
      // Arrange
      const routeWithMeta = {
        path: '/users/:id',
        meta: {
          description: { expr: 'lit', value: 'User profile page' },
          'og:title': { expr: 'route', name: 'id' },
        },
      };

      // Assert
      expect(isRouteDefinition(routeWithMeta)).toBe(true);
    });

    it('should accept full route definition with all fields', () => {
      // Arrange
      const fullRoute = {
        path: '/users/:id',
        title: { expr: 'lit', value: 'User Profile' },
        layout: 'MainLayout',
        meta: {
          description: { expr: 'lit', value: 'View user details' },
        },
      };

      // Assert
      expect(isRouteDefinition(fullRoute)).toBe(true);
    });
  });

  // ==================== Path Validation ====================

  describe('path validation', () => {
    it('should accept simple paths', () => {
      const route = { path: '/about' };
      expect(isRouteDefinition(route)).toBe(true);
    });

    it('should accept paths with dynamic segments', () => {
      const route = { path: '/users/:id' };
      expect(isRouteDefinition(route)).toBe(true);
    });

    it('should accept paths with multiple dynamic segments', () => {
      const route = { path: '/users/:userId/posts/:postId' };
      expect(isRouteDefinition(route)).toBe(true);
    });

    it('should accept root path', () => {
      const route = { path: '/' };
      expect(isRouteDefinition(route)).toBe(true);
    });

    it('should reject non-string path', () => {
      const route = { path: 123 };
      expect(isRouteDefinition(route)).toBe(false);
    });

    it('should reject missing path', () => {
      const route = { title: { expr: 'lit', value: 'Test' } };
      expect(isRouteDefinition(route)).toBe(false);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isRouteDefinition(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isRouteDefinition(undefined)).toBe(false);
    });

    it('should reject array', () => {
      expect(isRouteDefinition([])).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isRouteDefinition({})).toBe(false);
    });
  });
});

describe('Program with route field', () => {
  // ==================== Program Structure ====================

  describe('program structure', () => {
    it('should accept program without route field (backward compatibility)', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // This should pass validation (route is optional)
      // The actual validation would be done by validateAst
      expect(program.version).toBe('1.0');
      expect(program.route).toBeUndefined();
    });

    it('should accept program with route field', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
          title: { expr: 'lit', value: 'User Profile' },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.route).toBeDefined();
      expect(program.route?.path).toBe('/users/:id');
    });

    it('should maintain type safety with route expressions in view', () => {
      // Arrange - Program using route expression in view
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
              value: { expr: 'route', name: 'id' },
            },
          ],
        },
      };

      // This tests that route expressions can be used in the view
      // The actual validation should be done by the analyze pass
      const textNode = program.view as { children?: Array<{ value?: { expr?: string } }> };
      expect(textNode.children?.[0]?.value?.expr).toBe('route');
    });
  });

  // ==================== Route Expression Usage ====================

  describe('route expression usage in program', () => {
    it('should allow route expressions in title', () => {
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
      };

      // Route expressions should be valid in title
      const title = program.route?.title as { right?: { expr?: string } };
      expect(title?.right?.expr).toBe('route');
    });

    it('should allow route expressions in meta', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/posts/:slug',
          meta: {
            'og:title': { expr: 'route', name: 'slug', source: 'path' },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Route expressions should be valid in meta
      const meta = program.route?.meta as Record<string, { expr?: string }>;
      expect(meta?.['og:title']?.expr).toBe('route');
    });

    it('should allow route expressions in view nodes', () => {
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
          tag: 'h1',
          children: [
            {
              kind: 'text',
              value: { expr: 'route', name: 'id' },
            },
          ],
        },
      };

      // Route expressions should be valid in view
      const view = program.view as { children?: Array<{ value?: { expr?: string } }> };
      expect(view.children?.[0]?.value?.expr).toBe('route');
    });
  });
});

describe('isExpression with RouteExpr', () => {
  it('should recognize RouteExpr as valid Expression', () => {
    // Arrange
    const routeExpr = {
      expr: 'route',
      name: 'id',
    };

    // Assert - isExpression should include RouteExpr
    expect(isExpression(routeExpr)).toBe(true);
  });
});
