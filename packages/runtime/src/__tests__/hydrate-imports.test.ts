/**
 * Test module for Hydration with Import expressions.
 *
 * Coverage:
 * - HydrateContext should pass program.importData to evaluation
 * - Import expressions in props should evaluate correctly during hydration
 * - Import expressions in each loops should work during hydration
 *
 * TDD Red Phase: These tests verify that hydration properly passes
 * program.importData to the evaluation context so that `expr: "import"`
 * expressions work correctly during client-side hydration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hydrateApp } from '../hydrate.js';
import type { CompiledProgram } from '@constela/compiler';

describe('Hydration with Import expressions', () => {
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

  // ==================== importData in HydrateContext ====================

  describe('importData in HydrateContext', () => {
    it('should make importData accessible during hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          config: { appName: 'Test App', version: '1.0.0' },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-app-name': { expr: 'import', name: 'config', path: 'appName' },
          },
        },
      });

      // Set up SSR content
      setupSSRContent('<div data-app-name="Test App"></div>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const el = container.querySelector('div');
      expect(el?.getAttribute('data-app-name')).toBe('Test App');

      app.destroy();
    });

    it('should handle nested importData paths during hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          navigation: {
            title: 'Main Nav',
            links: [
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'nav',
          props: {
            'aria-label': { expr: 'import', name: 'navigation', path: 'title' },
          },
        },
      });

      // Set up SSR content
      setupSSRContent('<nav aria-label="Main Nav"></nav>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const nav = container.querySelector('nav');
      expect(nav?.getAttribute('aria-label')).toBe('Main Nav');

      app.destroy();
    });
  });

  // ==================== Import expressions in props ====================

  describe('import expressions in props during hydration', () => {
    it('should evaluate import expression in element class', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          theme: { className: 'dark-mode' },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            className: { expr: 'import', name: 'theme', path: 'className' },
          },
        },
      });

      // Set up SSR content
      setupSSRContent('<div class="dark-mode"></div>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const el = container.querySelector('div');
      expect(el?.className).toBe('dark-mode');

      app.destroy();
    });

    it('should evaluate import expression in text content', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          strings: { greeting: 'Hello from imports!' },
        },
        view: {
          kind: 'element',
          tag: 'h1',
          children: [
            { kind: 'text', value: { expr: 'import', name: 'strings', path: 'greeting' } },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<h1>Hello from imports!</h1>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const h1 = container.querySelector('h1');
      expect(h1?.textContent).toBe('Hello from imports!');

      app.destroy();
    });

    it('should evaluate import expression combined with state', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          prefix: { type: 'string', initial: 'Welcome: ' },
        },
        importData: {
          user: { name: 'Alice' },
        },
        view: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'prefix' } },
            { kind: 'text', value: { expr: 'import', name: 'user', path: 'name' } },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<span>Welcome: Alice</span>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const span = container.querySelector('span');
      expect(span?.textContent).toBe('Welcome: Alice');

      app.destroy();
    });
  });

  // ==================== Import expressions in each loops ====================

  describe('import expressions in each loops during hydration', () => {
    it('should evaluate import expression as each items source', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          data: {
            items: ['Item 1', 'Item 2', 'Item 3'],
          },
        },
        view: {
          kind: 'element',
          tag: 'ul',
          children: [
            {
              kind: 'each',
              items: { expr: 'import', name: 'data', path: 'items' },
              as: 'item',
              body: {
                kind: 'element',
                tag: 'li',
                children: [
                  { kind: 'text', value: { expr: 'var', name: 'item' } },
                ],
              },
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const lis = container.querySelectorAll('li');
      expect(lis).toHaveLength(3);
      expect(lis[0]?.textContent).toBe('Item 1');
      expect(lis[1]?.textContent).toBe('Item 2');
      expect(lis[2]?.textContent).toBe('Item 3');

      app.destroy();
    });

    it('should evaluate import expression for objects in each loop', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          navigation: {
            links: [
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'nav',
          children: [
            {
              kind: 'each',
              items: { expr: 'import', name: 'navigation', path: 'links' },
              as: 'link',
              body: {
                kind: 'element',
                tag: 'a',
                props: {
                  href: { expr: 'var', name: 'link', path: 'href' },
                },
                children: [
                  { kind: 'text', value: { expr: 'var', name: 'link', path: 'label' } },
                ],
              },
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<nav><a href="/">Home</a><a href="/about">About</a></nav>');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);
      expect(links[0]?.getAttribute('href')).toBe('/');
      expect(links[0]?.textContent).toBe('Home');
      expect(links[1]?.getAttribute('href')).toBe('/about');
      expect(links[1]?.textContent).toBe('About');

      app.destroy();
    });
  });

  // ==================== Missing importData handling ====================

  describe('missing importData handling during hydration', () => {
    it('should handle missing importData gracefully', async () => {
      // Arrange - No importData in program
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-value': { expr: 'import', name: 'config', path: 'value' },
          },
        },
      });

      // Set up SSR content (may have empty or undefined value)
      setupSSRContent('<div data-value=""></div>');

      // Act & Assert - Should not throw
      expect(() => {
        const app = hydrateApp({ program, container });
        app.destroy();
      }).not.toThrow();
    });

    it('should handle empty importData object', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {},
        view: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'import', name: 'missing', path: 'value' } },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<span></span>');

      // Act & Assert - Should not throw
      expect(() => {
        const app = hydrateApp({ program, container });
        app.destroy();
      }).not.toThrow();
    });
  });
});
