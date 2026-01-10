/**
 * Test module for Hydration with Route expressions.
 *
 * Coverage:
 * - HydrateContext should pass route to evaluate() calls
 * - Route expressions in props should evaluate correctly during hydration
 * - Route expressions in text nodes should work during hydration
 * - Route expressions in conditional (if) nodes should work during hydration
 * - Route expressions in list (each) nodes should work during hydration
 * - Route expressions in event handler payloads should work during hydration
 *
 * TDD Red Phase: These tests verify that hydration properly passes
 * route context to the evaluation context so that `expr: "route"`
 * expressions work correctly during client-side hydration.
 *
 * Bug reference: 9 evaluate() calls in hydrate.ts do not pass ctx.route
 * to the evaluation context, causing route-dependent elements to disappear
 * after hydration when SSR had route info but hydration doesn't.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hydrateApp } from '../hydrate.js';
import type { CompiledProgram } from '@constela/compiler';

describe('Hydration with Route expressions', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper Functions ====================

  function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  /**
   * Sets up container with SSR-rendered HTML to match the program structure
   */
  function setupSSRContent(html: string): void {
    container.innerHTML = html;
  }

  // ==================== Route expressions in props ====================

  describe('route expressions in props during hydration', () => {
    it('should evaluate route param expression in element attribute', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-user-id': { expr: 'route', name: 'id', source: 'param' },
          },
        },
      });

      // Set up SSR content (SSR rendered with route param)
      setupSSRContent('<div data-user-id="123"></div>');

      // Act - Hydrate with route context
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: '123' },
          query: {},
          path: '/users/123',
        },
      });
      await Promise.resolve();

      // Assert - Attribute should be preserved after hydration
      const el = container.querySelector('div');
      expect(el?.getAttribute('data-user-id')).toBe('123');

      app.destroy();
    });

    it('should evaluate route query expression in element attribute', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-page': { expr: 'route', name: 'page', source: 'query' },
          },
        },
      });

      // Set up SSR content
      setupSSRContent('<div data-page="2"></div>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: {},
          query: { page: '2' },
          path: '/items?page=2',
        },
      });
      await Promise.resolve();

      // Assert
      const el = container.querySelector('div');
      expect(el?.getAttribute('data-page')).toBe('2');

      app.destroy();
    });

    it('should evaluate route path expression in element attribute', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-current-path': { expr: 'route', name: 'path', source: 'path' },
          },
        },
      });

      // Set up SSR content
      setupSSRContent('<div data-current-path="/users/123/profile"></div>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: '123' },
          query: {},
          path: '/users/123/profile',
        },
      });
      await Promise.resolve();

      // Assert
      const el = container.querySelector('div');
      expect(el?.getAttribute('data-current-path')).toBe('/users/123/profile');

      app.destroy();
    });
  });

  // ==================== Route expressions in text nodes ====================

  describe('route expressions in text nodes during hydration', () => {
    it('should evaluate route param expression in text content', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'h1',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'User ID: ' } },
            { kind: 'text', value: { expr: 'route', name: 'id', source: 'param' } },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<h1>User ID: 456</h1>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: '456' },
          query: {},
          path: '/users/456',
        },
      });
      await Promise.resolve();

      // Assert - Text content should be preserved after hydration
      const h1 = container.querySelector('h1');
      expect(h1?.textContent).toBe('User ID: 456');

      app.destroy();
    });

    it('should evaluate route query expression in text content', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Page ' } },
            { kind: 'text', value: { expr: 'route', name: 'page', source: 'query' } },
            { kind: 'text', value: { expr: 'lit', value: ' of 10' } },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<span>Page 3 of 10</span>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: {},
          query: { page: '3' },
          path: '/items?page=3',
        },
      });
      await Promise.resolve();

      // Assert
      const span = container.querySelector('span');
      expect(span?.textContent).toBe('Page 3 of 10');

      app.destroy();
    });
  });

  // ==================== Route expressions in conditional nodes ====================

  describe('route expressions in conditional (if) nodes during hydration', () => {
    it('should evaluate route param in if condition', async () => {
      // Arrange - Show content only when user ID matches
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: {
                expr: 'bin',
                op: '==',
                left: { expr: 'route', name: 'id', source: 'param' },
                right: { expr: 'lit', value: 'admin' },
              },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'admin-content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Admin Panel' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'user-content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'User View' } }],
              },
            },
          ],
        },
      });

      // Set up SSR content (admin view)
      setupSSRContent('<div><span id="admin-content">Admin Panel</span></div>');

      // Act - Hydrate with admin route
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: 'admin' },
          query: {},
          path: '/users/admin',
        },
      });
      await Promise.resolve();

      // Assert - Admin content should be visible after hydration
      expect(container.querySelector('#admin-content')).not.toBeNull();
      expect(container.querySelector('#admin-content')?.textContent).toBe('Admin Panel');
      expect(container.querySelector('#user-content')).toBeNull();

      app.destroy();
    });

    it('should handle route query in if condition', async () => {
      // Arrange - Show premium content based on query param
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: {
                expr: 'bin',
                op: '==',
                left: { expr: 'route', name: 'plan', source: 'query' },
                right: { expr: 'lit', value: 'premium' },
              },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'premium-features' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Premium Features' } }],
              },
            },
          ],
        },
      });

      // Set up SSR content (premium user)
      setupSSRContent('<div><div id="premium-features">Premium Features</div></div>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: {},
          query: { plan: 'premium' },
          path: '/dashboard?plan=premium',
        },
      });
      await Promise.resolve();

      // Assert - Premium content should be visible after hydration
      expect(container.querySelector('#premium-features')).not.toBeNull();
      expect(container.querySelector('#premium-features')?.textContent).toBe('Premium Features');

      app.destroy();
    });
  });

  // ==================== Route expressions in each nodes ====================

  describe('route expressions in each nodes during hydration', () => {
    it('should preserve route context when evaluating each items', async () => {
      // Arrange - This tests that route is passed when evaluating each.items
      // Using a state-based items for simplicity, but route param affects display
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: ['Item A', 'Item B'] },
        },
        view: {
          kind: 'element',
          tag: 'ul',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'element',
                tag: 'li',
                children: [
                  { kind: 'text', value: { expr: 'var', name: 'item' } },
                  { kind: 'text', value: { expr: 'lit', value: ' (Category: ' } },
                  { kind: 'text', value: { expr: 'route', name: 'category', source: 'param' } },
                  { kind: 'text', value: { expr: 'lit', value: ')' } },
                ],
              },
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<ul><li>Item A (Category: electronics)</li><li>Item B (Category: electronics)</li></ul>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { category: 'electronics' },
          query: {},
          path: '/products/electronics',
        },
      });
      await Promise.resolve();

      // Assert - Route param should be included in each item's text
      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(2);
      expect(items[0]?.textContent).toBe('Item A (Category: electronics)');
      expect(items[1]?.textContent).toBe('Item B (Category: electronics)');

      app.destroy();
    });
  });

  // ==================== Route expressions in event handler payloads ====================

  describe('route expressions in event handler payloads during hydration', () => {
    it('should evaluate route param in event handler payload', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          lastClickedId: { type: 'string', initial: '' },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'lastClickedId', value: { expr: 'var', name: 'payload' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'action-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              payload: { expr: 'route', name: 'id', source: 'param' },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Click Me' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="action-btn">Click Me</button>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: 'user-789' },
          query: {},
          path: '/users/user-789',
        },
      });

      // Verify initial state
      expect(app.getState('lastClickedId')).toBe('');

      // Simulate click
      const button = container.querySelector('#action-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert - Route param should have been used as payload
      expect(app.getState('lastClickedId')).toBe('user-789');

      app.destroy();
    });
  });

  // ==================== Missing route handling ====================

  describe('missing route handling during hydration', () => {
    it('should handle hydration without route context gracefully', async () => {
      // Arrange - Program uses route expression but no route provided
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-id': { expr: 'route', name: 'id', source: 'param' },
          },
        },
      });

      // Set up SSR content (with empty value since no route)
      setupSSRContent('<div data-id=""></div>');

      // Act - Hydrate WITHOUT route context
      expect(() => {
        const app = hydrateApp({
          program,
          container,
          // No route provided
        });
        app.destroy();
      }).not.toThrow();
    });

    it('should return empty string for missing route param', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'route', name: 'nonexistent', source: 'param' } },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<span></span>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: '123' }, // 'nonexistent' is not in params
          query: {},
          path: '/test',
        },
      });
      await Promise.resolve();

      // Assert - Should be empty string, not throw
      const span = container.querySelector('span');
      expect(span?.textContent).toBe('');

      app.destroy();
    });
  });

  // ==================== State changes with route context ====================

  describe('state changes should preserve route context', () => {
    it('should maintain route context when state changes trigger re-evaluation', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          counter: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'counter' } },
              children: [{ kind: 'text', value: { expr: 'state', name: 'counter' } }],
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'route-id' } },
              children: [{ kind: 'text', value: { expr: 'route', name: 'id', source: 'param' } }],
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<div><span id="counter">0</span><span id="route-id">test-123</span></div>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: 'test-123' },
          query: {},
          path: '/items/test-123',
        },
      });

      // Change state to trigger re-evaluation
      app.setState('counter', 5);
      await Promise.resolve();

      // Assert - Route param should still be available after state change
      expect(container.querySelector('#counter')?.textContent).toBe('5');
      expect(container.querySelector('#route-id')?.textContent).toBe('test-123');

      app.destroy();
    });
  });
});
