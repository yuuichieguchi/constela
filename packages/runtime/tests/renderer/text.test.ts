/**
 * Test module for Text Node Rendering.
 *
 * Coverage:
 * - Renders text node
 * - Updates text reactively when state changes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledTextNode, CompiledAction } from '@constela/compiler';

describe('render text node', () => {
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

  // ==================== Basic Text Rendering ====================

  describe('basic text rendering', () => {
    it('should render text node with literal string', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: 'Hello, World!' },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(Text);
      expect(result.textContent).toBe('Hello, World!');
    });

    it('should render text node with literal number', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: 42 },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('42');
    });

    it('should render text node with literal boolean', () => {
      // Arrange
      const nodeTrue: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: true },
      };
      const nodeFalse: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: false },
      };
      const context = createContext();

      // Act
      const resultTrue = render(nodeTrue, context);
      const resultFalse = render(nodeFalse, context);

      // Assert
      expect(resultTrue.textContent).toBe('true');
      expect(resultFalse.textContent).toBe('false');
    });

    it('should render empty text for null value', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: null },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('');
    });

    it('should render empty string', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: '' },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('');
    });
  });

  // ==================== State-based Text ====================

  describe('state-based text', () => {
    it('should render text from state', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'state', name: 'message' },
      };
      const context = createContext({
        message: { type: 'string', initial: 'Hello from state!' },
      });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('Hello from state!');
    });

    it('should render number from state', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'state', name: 'count' },
      };
      const context = createContext({
        count: { type: 'number', initial: 100 },
      });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('100');
    });
  });

  // ==================== Variable-based Text ====================

  describe('variable-based text', () => {
    it('should render text from local variable', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'var', name: 'item' },
      };
      const context = createContext({}, {}, { item: 'Item from locals' });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('Item from locals');
    });

    it('should render loop index from local variable', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'var', name: 'index' },
      };
      const context = createContext({}, {}, { index: 5 });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('5');
    });
  });

  // ==================== Computed Text ====================

  describe('computed text', () => {
    it('should render concatenated strings', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 'Hello, ' },
          right: { expr: 'state', name: 'name' },
        },
      };
      const context = createContext({
        name: { type: 'string', initial: 'Alice' },
      });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('Hello, Alice');
    });

    it('should render computed number as text', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '*',
          left: { expr: 'state', name: 'quantity' },
          right: { expr: 'state', name: 'price' },
        },
      };
      const context = createContext({
        quantity: { type: 'number', initial: 3 },
        price: { type: 'number', initial: 10 },
      });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('30');
    });

    it('should render complex expression as text', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '+',
          left: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 'Count: ' },
            right: { expr: 'state', name: 'count' },
          },
          right: { expr: 'lit', value: ' items' },
        },
      };
      const context = createContext({
        count: { type: 'number', initial: 5 },
      });

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('Count: 5 items');
    });
  });

  // ==================== Reactive Updates ====================

  describe('reactive updates', () => {
    it('should update text when state changes', async () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'state', name: 'message' },
      };
      const context = createContext({
        message: { type: 'string', initial: 'Initial message' },
      });

      // Act
      const result = render(node, context) as Text;
      container.appendChild(result);

      expect(result.textContent).toBe('Initial message');

      // Update state
      context.state.set('message', 'Updated message');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(result.textContent).toBe('Updated message');
    });

    it('should update text when number state changes', async () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'state', name: 'count' },
      };
      const context = createContext({
        count: { type: 'number', initial: 0 },
      });

      // Act
      const result = render(node, context) as Text;
      container.appendChild(result);

      expect(result.textContent).toBe('0');

      // Update state multiple times
      context.state.set('count', 1);
      await Promise.resolve();
      expect(result.textContent).toBe('1');

      context.state.set('count', 42);
      await Promise.resolve();
      expect(result.textContent).toBe('42');
    });

    it('should update computed text when state changes', async () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 'Total: $' },
          right: {
            expr: 'bin',
            op: '*',
            left: { expr: 'state', name: 'quantity' },
            right: { expr: 'state', name: 'price' },
          },
        },
      };
      const context = createContext({
        quantity: { type: 'number', initial: 2 },
        price: { type: 'number', initial: 10 },
      });

      // Act
      const result = render(node, context) as Text;
      container.appendChild(result);

      expect(result.textContent).toBe('Total: $20');

      // Update quantity
      context.state.set('quantity', 5);
      await Promise.resolve();
      expect(result.textContent).toBe('Total: $50');

      // Update price
      context.state.set('price', 15);
      await Promise.resolve();
      expect(result.textContent).toBe('Total: $75');
    });

    it('should handle rapid state changes', async () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'state', name: 'counter' },
      };
      const context = createContext({
        counter: { type: 'number', initial: 0 },
      });

      // Act
      const result = render(node, context) as Text;
      container.appendChild(result);

      // Rapid updates
      for (let i = 1; i <= 10; i++) {
        context.state.set('counter', i);
      }

      // Wait for reactivity
      await Promise.resolve();

      // Assert - should have the final value
      expect(result.textContent).toBe('10');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle special characters', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: '<script>alert("xss")</script>' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as Text;
      container.appendChild(result);

      // Assert - text nodes automatically escape HTML
      expect(result.textContent).toBe('<script>alert("xss")</script>');
      // The actual DOM should not have a script element
      expect(container.querySelector('script')).toBeNull();
    });

    it('should handle unicode characters', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: 'Hello' },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('Hello');
    });

    it('should handle newlines in text', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: 'Line 1\nLine 2\nLine 3' },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle whitespace-only text', () => {
      // Arrange
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: '   ' },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe('   ');
    });

    it('should handle very long text', () => {
      // Arrange
      const longText = 'A'.repeat(10000);
      const node: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'lit', value: longText },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.textContent).toBe(longText);
      expect(result.textContent!.length).toBe(10000);
    });
  });
});
