/**
 * Test module for Renderer Style Expressions.
 *
 * Coverage:
 * - Style expression evaluation with base classes
 * - Style expression with variants
 * - Style expression with default variants
 * - Style expression with compound variants
 *
 * TDD Red Phase: These tests verify that the renderer properly evaluates
 * style expressions when styles are passed through the RenderContext.
 * All tests should FAIL initially because styles is not part of RenderContext.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { StylePreset } from '../../expression/evaluator.js';

/**
 * Creates a RenderContext with styles for testing style expressions
 */
function createContextWithStyles(
  styles: Record<string, StylePreset>,
  stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
  locals: Record<string, unknown> = {}
): RenderContext {
  return {
    state: createStateStore(stateDefinitions),
    actions: {},
    locals,
    cleanups: [],
    styles,
  };
}

describe('render - Style Expressions', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Basic Style Expression Tests ====================

  describe('basic style expression', () => {
    it('should render element with style expression as className', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: { className: { expr: 'style', name: 'button' } },
      };
      const ctx = createContextWithStyles({
        button: { base: 'px-4 py-2 rounded font-medium' },
      });

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert - Should FAIL because styles is not passed to evaluate()
      expect(element.className).toBe('px-4 py-2 rounded font-medium');
    });

    it('should return empty string for undefined style preset', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: { className: { expr: 'style', name: 'nonexistent' } },
      };
      const ctx = createContextWithStyles({});

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert
      expect(element.className).toBe('');
    });
  });

  // ==================== Variant Tests ====================

  describe('style expression with variants', () => {
    it('should render element with style expression using single variant', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: {
          className: {
            expr: 'style',
            name: 'button',
            variants: {
              variant: { expr: 'lit', value: 'primary' },
            },
          },
        },
      };
      const ctx = createContextWithStyles({
        button: {
          base: 'rounded font-medium',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200 text-gray-800',
            },
          },
        },
      });

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert - Should FAIL because styles is not passed through context
      expect(element.className).toBe('rounded font-medium bg-blue-500 text-white');
    });

    it('should render element with style expression using multiple variants', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: {
          className: {
            expr: 'style',
            name: 'button',
            variants: {
              variant: { expr: 'lit', value: 'primary' },
              size: { expr: 'lit', value: 'lg' },
            },
          },
        },
      };
      const ctx = createContextWithStyles({
        button: {
          base: 'rounded font-medium',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200',
            },
            size: {
              sm: 'px-2 py-1 text-sm',
              lg: 'px-6 py-3 text-lg',
            },
          },
        },
      });

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert - Should FAIL because styles is not passed through context
      expect(element.className).toBe('rounded font-medium bg-blue-500 text-white px-6 py-3 text-lg');
    });

    it('should resolve variant value from state expression', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: {
          className: {
            expr: 'style',
            name: 'button',
            variants: {
              variant: { expr: 'state', name: 'buttonVariant' },
            },
          },
        },
      };
      const ctx = createContextWithStyles(
        {
          button: {
            base: 'rounded',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-200',
              },
            },
          },
        },
        { buttonVariant: { type: 'string', initial: 'secondary' } }
      );

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert - Should FAIL because styles is not in context
      expect(element.className).toBe('rounded bg-gray-200');
    });
  });

  // ==================== Default Variants Tests ====================

  describe('style expression with default variants', () => {
    it('should apply default variant when not specified', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: {
          className: { expr: 'style', name: 'button' },
        },
      };
      const ctx = createContextWithStyles({
        button: {
          base: 'rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500',
              secondary: 'bg-gray-200',
            },
          },
          defaultVariants: {
            variant: 'primary',
          },
        },
      });

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert - Should apply default variant
      expect(element.className).toBe('rounded bg-blue-500');
    });

    it('should override default variant when explicitly specified', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'button',
        props: {
          className: {
            expr: 'style',
            name: 'button',
            variants: {
              variant: { expr: 'lit', value: 'secondary' },
            },
          },
        },
      };
      const ctx = createContextWithStyles({
        button: {
          base: 'rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500',
              secondary: 'bg-gray-200',
            },
          },
          defaultVariants: {
            variant: 'primary',
          },
        },
      });

      // Act
      const element = render(node, ctx) as HTMLElement;

      // Assert - Should override default with specified variant
      expect(element.className).toBe('rounded bg-gray-200');
    });
  });

  // ==================== Nested Element Tests ====================

  describe('style expression in nested elements', () => {
    it('should pass styles context to child elements', () => {
      // Arrange
      const node = {
        kind: 'element' as const,
        tag: 'div',
        props: {
          className: { expr: 'style', name: 'container' },
        },
        children: [
          {
            kind: 'element' as const,
            tag: 'button',
            props: {
              className: { expr: 'style', name: 'button' },
            },
          },
        ],
      };
      const ctx = createContextWithStyles({
        container: { base: 'flex gap-4' },
        button: { base: 'px-4 py-2' },
      });

      // Act
      const element = render(node, ctx) as HTMLElement;
      container.appendChild(element);

      // Assert - Both parent and child should have styles
      expect(element.className).toBe('flex gap-4');
      expect(element.querySelector('button')?.className).toBe('px-4 py-2');
    });
  });

  // ==================== Each Loop Tests ====================

  describe('style expression in each loop', () => {
    it('should apply styles in each iteration', () => {
      // Arrange
      const node = {
        kind: 'each' as const,
        items: { expr: 'lit', value: ['a', 'b', 'c'] },
        as: 'item',
        body: {
          kind: 'element' as const,
          tag: 'div',
          props: {
            className: { expr: 'style', name: 'card' },
          },
        },
      };
      const ctx = createContextWithStyles({
        card: { base: 'p-4 border rounded' },
      });

      // Act
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      // Assert - All cards should have styles
      const cards = container.querySelectorAll('div');
      expect(cards).toHaveLength(3);
      cards.forEach((card) => {
        expect(card.className).toBe('p-4 border rounded');
      });
    });
  });

  // ==================== Conditional Rendering Tests ====================

  describe('style expression in conditional rendering', () => {
    it('should apply styles in if branch', () => {
      // Arrange
      const node = {
        kind: 'if' as const,
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'element' as const,
          tag: 'div',
          props: {
            className: { expr: 'style', name: 'alert' },
          },
        },
      };
      const ctx = createContextWithStyles({
        alert: { base: 'p-4 bg-yellow-100 border-yellow-500' },
      });

      // Act
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      // Assert
      const alert = container.querySelector('div');
      expect(alert?.className).toBe('p-4 bg-yellow-100 border-yellow-500');
    });
  });
});
