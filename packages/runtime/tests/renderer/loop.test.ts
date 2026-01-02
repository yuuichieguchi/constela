/**
 * Test module for Loop (each) Node Rendering.
 *
 * Coverage:
 * - each node renders items
 * - each node provides item variable (as)
 * - each node provides index variable
 * - each node updates when list changes
 * - each node handles add/remove items
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledEachNode, CompiledAction } from '@constela/compiler';

describe('render each node', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {}
  ): RenderContext {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
    };
  }

  // ==================== Basic Item Rendering ====================

  describe('basic item rendering', () => {
    it('should render all items in the list', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'li',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['Apple', 'Banana', 'Cherry'] },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('Apple');
      expect(items[1].textContent).toBe('Banana');
      expect(items[2].textContent).toBe('Cherry');
    });

    it('should render empty list without errors', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'li',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: [] },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(0);
    });

    it('should render list with single item', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['Only one'] },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const items = container.querySelectorAll('span');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toBe('Only one');
    });

    it('should render number items', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'numbers' },
        as: 'num',
        body: {
          kind: 'element',
          tag: 'span',
          props: { className: { expr: 'lit', value: 'number' } },
          children: [{ kind: 'text', value: { expr: 'var', name: 'num' } }],
        },
      };
      const context = createContext({
        numbers: { type: 'list', initial: [1, 2, 3, 4, 5] },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const items = container.querySelectorAll('.number');
      expect(items.length).toBe(5);
      expect(items[0].textContent).toBe('1');
      expect(items[4].textContent).toBe('5');
    });
  });

  // ==================== Item Variable (as) ====================

  describe('item variable (as)', () => {
    it('should provide item variable with correct value', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: ['first', 'second', 'third'] },
        as: 'element',
        body: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-value': { expr: 'var', name: 'element' },
          },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const divs = container.querySelectorAll('div');
      expect(divs[0].getAttribute('data-value')).toBe('first');
      expect(divs[1].getAttribute('data-value')).toBe('second');
      expect(divs[2].getAttribute('data-value')).toBe('third');
    });

    it('should provide object item properties', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'users' },
        as: 'user',
        body: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'var', name: 'user' },
            },
          ],
        },
      };
      const context = createContext({
        users: {
          type: 'list',
          initial: [
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
          ],
        },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBe(2);
      // The text content will be the stringified object
    });
  });

  // ==================== Index Variable ====================

  describe('index variable', () => {
    it('should provide index variable when specified', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'i',
        body: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'var', name: 'i' } },
            { kind: 'text', value: { expr: 'lit', value: ': ' } },
            { kind: 'text', value: { expr: 'var', name: 'item' } },
          ],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['A', 'B', 'C'] },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const divs = container.querySelectorAll('div');
      expect(divs[0].textContent).toBe('0: A');
      expect(divs[1].textContent).toBe('1: B');
      expect(divs[2].textContent).toBe('2: C');
    });

    it('should start index at 0', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: ['only one'] },
        as: 'item',
        index: 'idx',
        body: {
          kind: 'element',
          tag: 'span',
          props: {
            'data-index': { expr: 'var', name: 'idx' },
          },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const span = container.querySelector('span');
      expect(span?.getAttribute('data-index')).toBe('0');
    });

    it('should use index in computed expressions', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: [10, 20, 30] },
        as: 'value',
        index: 'i',
        body: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: {
                expr: 'bin',
                op: '+',
                left: { expr: 'var', name: 'i' },
                right: { expr: 'var', name: 'value' },
              },
            },
          ],
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const divs = container.querySelectorAll('div');
      expect(divs[0].textContent).toBe('10'); // 0 + 10
      expect(divs[1].textContent).toBe('21'); // 1 + 20
      expect(divs[2].textContent).toBe('32'); // 2 + 30
    });
  });

  // ==================== Reactive Updates ====================

  describe('reactive updates', () => {
    it('should update when list changes', async () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'li',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['A', 'B'] },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);

      expect(container.querySelectorAll('li').length).toBe(2);

      // Update list
      context.state.set('items', ['A', 'B', 'C', 'D']);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(4);
      expect(items[2].textContent).toBe('C');
      expect(items[3].textContent).toBe('D');
    });

    it('should handle adding items', async () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        as: 'todo',
        body: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'todo-item' } },
          children: [{ kind: 'text', value: { expr: 'var', name: 'todo' } }],
        },
      };
      const context = createContext({
        todos: { type: 'list', initial: ['Task 1'] },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);

      expect(container.querySelectorAll('.todo-item').length).toBe(1);

      // Add items (simulating push by replacing the list)
      context.state.set('todos', ['Task 1', 'Task 2', 'Task 3']);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      const items = container.querySelectorAll('.todo-item');
      expect(items.length).toBe(3);
    });

    it('should handle removing items', async () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['A', 'B', 'C', 'D', 'E'] },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);

      expect(container.querySelectorAll('span').length).toBe(5);

      // Remove items
      context.state.set('items', ['A', 'C', 'E']);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      const spans = container.querySelectorAll('span');
      expect(spans.length).toBe(3);
      expect(spans[0].textContent).toBe('A');
      expect(spans[1].textContent).toBe('C');
      expect(spans[2].textContent).toBe('E');
    });

    it('should handle clearing the list', async () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['X', 'Y', 'Z'] },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);

      expect(container.querySelectorAll('div').length).toBe(3);

      // Clear list
      context.state.set('items', []);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(container.querySelectorAll('div').length).toBe(0);
    });

    it('should handle replacing entire list', async () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'li',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext({
        items: { type: 'list', initial: ['Old 1', 'Old 2', 'Old 3'] },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);

      // Replace entire list
      context.state.set('items', ['New A', 'New B']);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toBe('New A');
      expect(items[1].textContent).toBe('New B');
    });
  });

  // ==================== Nested Each Nodes ====================

  describe('nested each nodes', () => {
    it('should handle nested loops', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: ['A', 'B'] },
        as: 'outer',
        body: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'outer' } },
          children: [
            {
              kind: 'each',
              items: { expr: 'lit', value: [1, 2, 3] },
              as: 'inner',
              body: {
                kind: 'element',
                tag: 'span',
                children: [
                  { kind: 'text', value: { expr: 'var', name: 'outer' } },
                  { kind: 'text', value: { expr: 'var', name: 'inner' } },
                ],
              },
            },
          ],
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const outerDivs = container.querySelectorAll('.outer');
      expect(outerDivs.length).toBe(2);

      const spans = container.querySelectorAll('span');
      expect(spans.length).toBe(6); // 2 outer * 3 inner

      // Check values
      expect(spans[0].textContent).toBe('A1');
      expect(spans[1].textContent).toBe('A2');
      expect(spans[2].textContent).toBe('A3');
      expect(spans[3].textContent).toBe('B1');
      expect(spans[4].textContent).toBe('B2');
      expect(spans[5].textContent).toBe('B3');
    });
  });

  // ==================== Complex Body Templates ====================

  describe('complex body templates', () => {
    it('should handle conditional inside loop', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: [1, 2, 3, 4, 5] },
        as: 'num',
        body: {
          kind: 'if',
          condition: {
            expr: 'bin',
            op: '>',
            left: { expr: 'var', name: 'num' },
            right: { expr: 'lit', value: 2 },
          },
          then: {
            kind: 'element',
            tag: 'span',
            props: { className: { expr: 'lit', value: 'big' } },
            children: [{ kind: 'text', value: { expr: 'var', name: 'num' } }],
          },
          else: {
            kind: 'element',
            tag: 'span',
            props: { className: { expr: 'lit', value: 'small' } },
            children: [{ kind: 'text', value: { expr: 'var', name: 'num' } }],
          },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const bigItems = container.querySelectorAll('.big');
      const smallItems = container.querySelectorAll('.small');

      expect(smallItems.length).toBe(2); // 1, 2
      expect(bigItems.length).toBe(3); // 3, 4, 5
    });

    it('should handle nested elements in loop body', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'products' },
        as: 'product',
        body: {
          kind: 'element',
          tag: 'article',
          props: { className: { expr: 'lit', value: 'product-card' } },
          children: [
            {
              kind: 'element',
              tag: 'h3',
              children: [{ kind: 'text', value: { expr: 'var', name: 'product' } }],
            },
            {
              kind: 'element',
              tag: 'p',
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Product details' } }],
            },
          ],
        },
      };
      const context = createContext({
        products: { type: 'list', initial: ['Product A', 'Product B'] },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const articles = container.querySelectorAll('.product-card');
      expect(articles.length).toBe(2);

      expect(articles[0].querySelector('h3')?.textContent).toBe('Product A');
      expect(articles[1].querySelector('h3')?.textContent).toBe('Product B');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle list with undefined/null items', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: [null, 'valid', undefined] },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const spans = container.querySelectorAll('span');
      expect(spans.length).toBe(3);
      expect(spans[1].textContent).toBe('valid');
    });

    it('should handle very large lists', () => {
      // Arrange
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: items },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'li',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(100);
      expect(listItems[0].textContent).toBe('Item 0');
      expect(listItems[99].textContent).toBe('Item 99');
    });

    it('should handle items with special characters', () => {
      // Arrange
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: ['<script>', '&amp;', '"quotes"'] },
        as: 'item',
        body: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const spans = container.querySelectorAll('span');
      expect(spans[0].textContent).toBe('<script>');
      expect(spans[1].textContent).toBe('&amp;');
      expect(spans[2].textContent).toBe('"quotes"');
      // Should not execute script
      expect(container.querySelector('script')).toBeNull();
    });
  });
});
