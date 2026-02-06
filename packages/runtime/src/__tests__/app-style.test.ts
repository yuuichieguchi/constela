/**
 * Test module for createApp Style Expressions.
 *
 * Coverage:
 * - Style expressions work when program.styles is provided
 * - Integration between createApp and style expression evaluation
 *
 * TDD Red Phase: These tests verify that createApp properly passes
 * program.styles through to the render context so style expressions work.
 * All tests should FAIL initially because styles is not passed to RenderContext.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import type { CompiledProgram } from '@constela/compiler';

describe('createApp - Style Expressions', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Basic Integration Tests ====================

  describe('basic style expression integration', () => {
    it('should render view with style expression using program.styles', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Click me' } }],
        },
        styles: {
          button: {
            base: 'px-4 py-2 rounded font-medium',
          },
        },
      };

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('button');

      // Assert - Should FAIL because styles is not passed to RenderContext
      expect(button?.className).toBe('px-4 py-2 rounded font-medium');

      // Cleanup
      app.destroy();
    });

    it('should render view with style expression using variants', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
              variants: { variant: { expr: 'lit', value: 'primary' } },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Submit' } }],
        },
        styles: {
          button: {
            base: 'px-4 py-2 rounded',
            variants: {
              variant: {
                primary: 'bg-blue-500 text-white',
                secondary: 'bg-gray-200 text-gray-800',
              },
            },
          },
        },
      };

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('button');

      // Assert - Should FAIL because styles is not passed through
      expect(button?.className).toBe('px-4 py-2 rounded bg-blue-500 text-white');

      // Cleanup
      app.destroy();
    });
  });

  // ==================== State-Based Variant Tests ====================

  describe('state-based style variants', () => {
    it('should update style when state-based variant changes', async () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {
          buttonVariant: { type: 'string', initial: 'primary' },
        },
        actions: {},
        view: {
          kind: 'element',
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
        },
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-500',
              },
            },
          },
        },
      };

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('button');

      // Assert initial state - Should FAIL because styles is not in context
      expect(button?.className).toBe('px-4 py-2 bg-blue-500');

      // Change state
      app.setState('buttonVariant', 'secondary');

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert updated state
      expect(button?.className).toBe('px-4 py-2 bg-gray-500');

      // Cleanup
      app.destroy();
    });
  });

  // ==================== Default Variants Tests ====================

  describe('default variants', () => {
    it('should apply default variant from program.styles', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
            },
          },
        },
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-500',
              },
            },
            defaultVariants: {
              variant: 'primary',
            },
          },
        },
      };

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('button');

      // Assert - Should apply default variant
      expect(button?.className).toBe('px-4 py-2 bg-blue-500');

      // Cleanup
      app.destroy();
    });
  });

  // ==================== Multiple Style Presets Tests ====================

  describe('multiple style presets', () => {
    it('should support multiple style presets in same program', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            className: { expr: 'style', name: 'container' },
          },
          children: [
            {
              kind: 'element',
              tag: 'h1',
              props: {
                className: { expr: 'style', name: 'heading' },
              },
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }],
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                className: {
                  expr: 'style',
                  name: 'button',
                  variants: { size: { expr: 'lit', value: 'lg' } },
                },
              },
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Action' } }],
            },
          ],
        },
        styles: {
          container: {
            base: 'flex flex-col gap-4 p-6',
          },
          heading: {
            base: 'text-2xl font-bold text-gray-900',
          },
          button: {
            base: 'rounded font-medium',
            variants: {
              size: {
                sm: 'px-2 py-1 text-sm',
                md: 'px-4 py-2 text-base',
                lg: 'px-6 py-3 text-lg',
              },
            },
          },
        },
      };

      // Act
      const app = createApp(program, container);

      // Assert - All style presets should be applied
      const div = container.querySelector('div');
      const h1 = container.querySelector('h1');
      const button = container.querySelector('button');

      expect(div?.className).toBe('flex flex-col gap-4 p-6');
      expect(h1?.className).toBe('text-2xl font-bold text-gray-900');
      expect(button?.className).toBe('rounded font-medium px-6 py-3 text-lg');

      // Cleanup
      app.destroy();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle program without styles property', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            className: { expr: 'lit', value: 'static-class' },
          },
        },
        // No styles property
      };

      // Act
      const app = createApp(program, container);
      const div = container.querySelector('div');

      // Assert - Should render normally without styles
      expect(div?.className).toBe('static-class');

      // Cleanup
      app.destroy();
    });

    it('should handle missing style preset gracefully', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: { expr: 'style', name: 'nonexistent' },
          },
        },
        styles: {
          button: { base: 'px-4 py-2' },
        },
      };

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('button');

      // Assert - Should result in empty or undefined className
      expect(button?.className).toBe('');

      // Cleanup
      app.destroy();
    });
  });
});
