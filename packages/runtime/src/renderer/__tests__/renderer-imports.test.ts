/**
 * Test module for Renderer with Import expressions.
 *
 * Coverage:
 * - RenderContext should accept imports field
 * - Import expressions in rendered elements should evaluate correctly
 * - Import expressions in each loops should work during rendering
 *
 * TDD Red Phase: These tests verify that the render function properly
 * passes imports to the evaluation context so that `expr: "import"`
 * expressions work correctly during client-side rendering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledNode } from '@constela/compiler';

describe('Renderer with Import expressions', () => {
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

  function createRenderContext(
    overrides?: Partial<RenderContext>
  ): RenderContext {
    return {
      state: createStateStore({}),
      actions: {},
      locals: {},
      cleanups: [],
      ...overrides,
    };
  }

  // ==================== RenderContext with imports ====================

  describe('RenderContext with imports', () => {
    it('should accept imports field in RenderContext', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          'data-value': { expr: 'import', name: 'config', path: 'value' },
        },
      };

      const ctx = createRenderContext({
        imports: {
          config: { value: 'test-value' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const el = container.querySelector('div');
      expect(el?.getAttribute('data-value')).toBe('test-value');
    });

    it('should pass imports to nested element rendering', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'span',
            props: {
              className: { expr: 'import', name: 'theme', path: 'className' },
            },
          },
        ],
      };

      const ctx = createRenderContext({
        imports: {
          theme: { className: 'nested-class' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const span = container.querySelector('span');
      expect(span?.className).toBe('nested-class');
    });
  });

  // ==================== Import expressions in element props ====================

  describe('import expressions in element props', () => {
    it('should evaluate import expression in element class', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: { expr: 'import', name: 'styles', path: 'containerClass' },
        },
      };

      const ctx = createRenderContext({
        imports: {
          styles: { containerClass: 'my-container' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const el = container.querySelector('div');
      expect(el?.className).toBe('my-container');
    });

    it('should evaluate import expression in element href', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'a',
        props: {
          href: { expr: 'import', name: 'links', path: 'homepage' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Home' } },
        ],
      };

      const ctx = createRenderContext({
        imports: {
          links: { homepage: 'https://example.com' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('should evaluate nested import path in props', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          'data-app': { expr: 'import', name: 'config', path: 'app.name' },
        },
      };

      const ctx = createRenderContext({
        imports: {
          config: {
            app: { name: 'MyApp', version: '1.0' },
          },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const el = container.querySelector('div');
      expect(el?.getAttribute('data-app')).toBe('MyApp');
    });
  });

  // ==================== Import expressions in text nodes ====================

  describe('import expressions in text nodes', () => {
    it('should evaluate import expression in text content', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'text',
        value: { expr: 'import', name: 'strings', path: 'greeting' },
      };

      const ctx = createRenderContext({
        imports: {
          strings: { greeting: 'Hello, World!' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      expect(container.textContent).toBe('Hello, World!');
    });

    it('should evaluate import expression in element child text', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'h1',
        children: [
          { kind: 'text', value: { expr: 'import', name: 'content', path: 'title' } },
        ],
      };

      const ctx = createRenderContext({
        imports: {
          content: { title: 'Page Title' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const h1 = container.querySelector('h1');
      expect(h1?.textContent).toBe('Page Title');
    });
  });

  // ==================== Import expressions in each loops ====================

  describe('import expressions in each loops', () => {
    it('should evaluate import expression as each items source', () => {
      // Arrange
      const node: CompiledNode = {
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
      };

      const ctx = createRenderContext({
        imports: {
          data: { items: ['Apple', 'Banana', 'Cherry'] },
        },
      });

      // Act
      const result = render(node, ctx);
      const ul = document.createElement('ul');
      ul.appendChild(result);
      container.appendChild(ul);

      // Assert
      const lis = container.querySelectorAll('li');
      expect(lis).toHaveLength(3);
      expect(lis[0]?.textContent).toBe('Apple');
      expect(lis[1]?.textContent).toBe('Banana');
      expect(lis[2]?.textContent).toBe('Cherry');
    });

    it('should evaluate import expression for objects in each loop', () => {
      // Arrange
      const node: CompiledNode = {
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
      };

      const ctx = createRenderContext({
        imports: {
          navigation: {
            links: [
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ],
          },
        },
      });

      // Act
      const result = render(node, ctx);
      const nav = document.createElement('nav');
      nav.appendChild(result);
      container.appendChild(nav);

      // Assert
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(3);
      expect(links[0]?.getAttribute('href')).toBe('/');
      expect(links[0]?.textContent).toBe('Home');
      expect(links[1]?.getAttribute('href')).toBe('/about');
      expect(links[2]?.getAttribute('href')).toBe('/contact');
    });

    it('should pass imports to each body context', () => {
      // Arrange - Each loop body also uses import expression
      const node: CompiledNode = {
        kind: 'each',
        items: { expr: 'import', name: 'data', path: 'users' },
        as: 'user',
        body: {
          kind: 'element',
          tag: 'div',
          props: {
            className: { expr: 'import', name: 'styles', path: 'userCard' },
          },
          children: [
            { kind: 'text', value: { expr: 'var', name: 'user', path: 'name' } },
          ],
        },
      };

      const ctx = createRenderContext({
        imports: {
          data: {
            users: [{ name: 'Alice' }, { name: 'Bob' }],
          },
          styles: { userCard: 'user-card-class' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const divs = container.querySelectorAll('div');
      expect(divs).toHaveLength(2);
      expect(divs[0]?.className).toBe('user-card-class');
      expect(divs[0]?.textContent).toBe('Alice');
      expect(divs[1]?.className).toBe('user-card-class');
      expect(divs[1]?.textContent).toBe('Bob');
    });
  });

  // ==================== Import expressions in conditionals ====================

  describe('import expressions in conditionals', () => {
    it('should evaluate import expression in if condition', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'if',
        condition: { expr: 'import', name: 'config', path: 'showFeature' },
        then: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'feature' } },
        },
        else: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'no-feature' } },
        },
      };

      const ctx = createRenderContext({
        imports: {
          config: { showFeature: true },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      expect(container.querySelector('#feature')).not.toBeNull();
      expect(container.querySelector('#no-feature')).toBeNull();
    });

    it('should render else branch when import condition is false', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'if',
        condition: { expr: 'import', name: 'config', path: 'showFeature' },
        then: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'feature' } },
        },
        else: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'no-feature' } },
        },
      };

      const ctx = createRenderContext({
        imports: {
          config: { showFeature: false },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      expect(container.querySelector('#feature')).toBeNull();
      expect(container.querySelector('#no-feature')).not.toBeNull();
    });
  });

  // ==================== Missing imports handling ====================

  describe('missing imports handling', () => {
    it('should handle context without imports gracefully', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          'data-value': { expr: 'import', name: 'config', path: 'value' },
        },
      };

      // Context without imports field
      const ctx = createRenderContext();

      // Act & Assert - Should not throw
      expect(() => {
        const result = render(node, ctx);
        container.appendChild(result);
      }).not.toThrow();
    });

    it('should handle empty imports object', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'text',
        value: { expr: 'import', name: 'missing', path: 'value' },
      };

      const ctx = createRenderContext({
        imports: {},
      });

      // Act & Assert - Should not throw
      expect(() => {
        const result = render(node, ctx);
        container.appendChild(result);
      }).not.toThrow();
    });

    it('should handle missing import path gracefully', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'span',
        children: [
          { kind: 'text', value: { expr: 'import', name: 'config', path: 'nonexistent.path' } },
        ],
      };

      const ctx = createRenderContext({
        imports: {
          config: { existingValue: 'test' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert - Should render without error, text should be empty
      const span = container.querySelector('span');
      expect(span).not.toBeNull();
      // Undefined should render as empty string
      expect(span?.textContent).toBe('');
    });
  });

  // ==================== Combining imports with state and locals ====================

  describe('combining imports with state and locals', () => {
    it('should evaluate imports alongside state expressions', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'state', name: 'prefix' } },
          { kind: 'text', value: { expr: 'import', name: 'data', path: 'suffix' } },
        ],
      };

      const state = createStateStore({
        prefix: { type: 'string', initial: 'Hello, ' },
      });

      const ctx = createRenderContext({
        state,
        imports: {
          data: { suffix: 'World!' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const div = container.querySelector('div');
      expect(div?.textContent).toBe('Hello, World!');
    });

    it('should evaluate imports alongside local variables', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'span',
        children: [
          { kind: 'text', value: { expr: 'var', name: 'localValue' } },
          { kind: 'text', value: { expr: 'lit', value: ' - ' } },
          { kind: 'text', value: { expr: 'import', name: 'config', path: 'appName' } },
        ],
      };

      const ctx = createRenderContext({
        locals: { localValue: 'Local' },
        imports: {
          config: { appName: 'MyApp' },
        },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const span = container.querySelector('span');
      expect(span?.textContent).toBe('Local - MyApp');
    });
  });
});
