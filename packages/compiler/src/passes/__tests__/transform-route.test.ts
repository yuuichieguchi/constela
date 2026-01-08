/**
 * Test module for Route Expression transformation.
 *
 * Coverage:
 * - RouteExpr transforms to CompiledRouteExpr
 * - RouteDefinition transforms correctly
 * - Route expressions in different node types
 * - Compiled program includes route field
 *
 * TDD Red Phase: These tests verify the transformation of route expressions
 * that will be added to support route definitions in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';

describe('transformPass with Route expressions', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(routeParams: string[] = []): AnalysisContext {
    return {
      stateNames: new Set<string>(),
      actionNames: new Set<string>(),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(routeParams),
    };
  }

  // ==================== RouteExpr Transformation ====================

  describe('RouteExpr transformation', () => {
    it('should transform RouteExpr to CompiledRouteExpr', () => {
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
          value: { expr: 'route', name: 'id' },
        },
      } as unknown as Program;

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      // The view should contain a compiled route expression
      expect(result.view.kind).toBe('text');
      const textNode = result.view as { kind: string; value: { expr: string; name: string } };
      expect(textNode.value.expr).toBe('route');
      expect(textNode.value.name).toBe('id');
    });

    it('should preserve source field in CompiledRouteExpr', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/search',
        },
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'route', name: 'q', source: 'query' },
        },
      } as unknown as Program;

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const textNode = result.view as { value: { source: string } };
      expect(textNode.value.source).toBe('query');
    });

    it('should transform RouteExpr in binary expressions', () => {
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
            left: { expr: 'lit', value: 'User: ' },
            right: { expr: 'route', name: 'id' },
          },
        },
      } as unknown as Program;

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      const textNode = result.view as { value: { expr: string; right: { expr: string } } };
      expect(textNode.value.expr).toBe('bin');
      expect(textNode.value.right.expr).toBe('route');
    });

    it('should transform RouteExpr in conditional expressions', () => {
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

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      const textNode = result.view as { value: { then: { expr: string } } };
      expect(textNode.value.then.expr).toBe('route');
    });

    it('should transform RouteExpr in element props', () => {
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
          tag: 'a',
          props: {
            href: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: '/api/users/' },
              right: { expr: 'route', name: 'id' },
            },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'View User' } },
          ],
        },
      } as unknown as Program;

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      const elementNode = result.view as { props?: { href: { right: { expr: string } } } };
      expect(elementNode.props?.href.right.expr).toBe('route');
    });
  });

  // ==================== RouteDefinition Transformation ====================

  describe('RouteDefinition transformation', () => {
    it('should include route in compiled program', () => {
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

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      // Compiled program should include route field
      expect(result.route).toBeDefined();
      expect(result.route?.path).toBe('/users/:id');
    });

    it('should transform title expression in route definition', () => {
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

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      const title = result.route?.title as { expr: string; right: { expr: string } };
      expect(title.expr).toBe('bin');
      expect(title.right.expr).toBe('route');
    });

    it('should preserve layout in route definition', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/dashboard',
          layout: 'DashboardLayout',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.route?.layout).toBe('DashboardLayout');
    });

    it('should transform meta expressions in route definition', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/posts/:slug',
          meta: {
            description: { expr: 'lit', value: 'A blog post' },
            'og:title': { expr: 'route', name: 'slug' },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const context = createContext(['slug']);

      // Act
      const result = transformPass(program, context);

      // Assert
      const description = result.route?.meta?.description as { expr: string };
      const ogTitle = result.route?.meta?.['og:title'] as { expr: string };
      expect(description.expr).toBe('lit');
      expect(ogTitle.expr).toBe('route');
    });

    it('should handle program without route definition', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      // Compiled program should not have route field
      expect(result.route).toBeUndefined();
    });
  });

  // ==================== CompiledProgram Type ====================

  describe('CompiledProgram type with route', () => {
    it('should have correct CompiledRouteDefinition structure', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
          title: { expr: 'lit', value: 'User Profile' },
          layout: 'MainLayout',
          meta: {
            description: { expr: 'lit', value: 'View user details' },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      // CompiledRouteDefinition should have:
      // - path: string
      // - title?: CompiledExpression
      // - layout?: string
      // - meta?: Record<string, CompiledExpression>
      expect(typeof result.route?.path).toBe('string');
      const title = result.route?.title as { expr: string };
      expect(title.expr).toBeDefined();
      expect(typeof result.route?.layout).toBe('string');
      const description = result.route?.meta?.description as { expr: string };
      expect(description.expr).toBeDefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle route with no expressions (static route)', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/about',
          title: { expr: 'lit', value: 'About Us' },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.route?.path).toBe('/about');
      const title = result.route?.title as { expr: string };
      expect(title.expr).toBe('lit');
    });

    it('should handle deeply nested route expressions', () => {
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
              kind: 'if',
              condition: { expr: 'lit', value: true },
              then: {
                kind: 'each',
                items: { expr: 'lit', value: [1, 2, 3] },
                as: 'item',
                body: {
                  kind: 'text',
                  value: {
                    expr: 'bin',
                    op: '+',
                    left: { expr: 'route', name: 'id' },
                    right: { expr: 'var', name: 'item' },
                  },
                },
              },
            },
          ],
        },
      } as unknown as Program;

      const context = createContext(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      // Should correctly transform nested route expressions
      const view = result.view as { children: Array<{ then: { body: { value: { left: { expr: string } } } } }> };
      expect(view.children[0]?.then?.body?.value?.left?.expr).toBe('route');
    });
  });
});
