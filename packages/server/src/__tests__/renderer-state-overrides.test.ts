/**
 * Test module for SSR Renderer stateOverrides feature.
 *
 * Coverage:
 * - RenderOptions.stateOverrides overrides initial state values during SSR
 * - stateOverrides with theme value affects conditional rendering
 * - stateOverrides is optional (defaults to program's initial values)
 *
 * TDD Red Phase: These tests will FAIL because stateOverrides is not yet implemented.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { renderToString, type RenderOptions } from '../index.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Creates a minimal CompiledProgram for testing
 */
function createProgram(
  view: CompiledProgram['view'],
  state: CompiledProgram['state'] = {},
  actions: CompiledProgram['actions'] = {}
): CompiledProgram {
  return {
    version: '1.0',
    state,
    actions,
    view,
  };
}

// ==================== Tests ====================

describe('renderToString with stateOverrides', () => {
  // ==================== Basic State Override ====================

  describe('basic state override', () => {
    /**
     * Given: A program with initial state { count: 0 }
     * When: renderToString is called with stateOverrides { count: 42 }
     * Then: The rendered output should use the overridden value (42)
     */
    it('should override the initial state value with stateOverrides', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'count' },
            },
          ],
        },
        {
          count: { type: 'number', initial: 0 },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          count: 42,
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<span>42</span>');
    });

    /**
     * Given: A program with initial state { message: 'default' }
     * When: renderToString is called with stateOverrides { message: 'overridden' }
     * Then: The rendered output should use the overridden value
     */
    it('should override string state value with stateOverrides', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'p',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'message' },
            },
          ],
        },
        {
          message: { type: 'string', initial: 'default' },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          message: 'overridden',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<p>overridden</p>');
    });

    /**
     * Given: A program with multiple state fields
     * When: renderToString is called with stateOverrides for one field
     * Then: Only the overridden field should change, others remain initial values
     */
    it('should only override specified state fields, leaving others unchanged', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'name' },
            },
            {
              kind: 'text',
              value: { expr: 'lit', value: ': ' },
            },
            {
              kind: 'text',
              value: { expr: 'state', name: 'score' },
            },
          ],
        },
        {
          name: { type: 'string', initial: 'Player 1' },
          score: { type: 'number', initial: 100 },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          score: 999,
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      // name should remain 'Player 1', score should be overridden to 999
      expect(result).toBe('<div>Player 1: 999</div>');
    });
  });

  // ==================== Theme Override with Conditional Rendering ====================

  describe('theme override with conditional rendering', () => {
    /**
     * Given: A program with theme state and conditional rendering based on theme
     * When: renderToString is called with stateOverrides { theme: 'dark' }
     * Then: The dark theme branch should be rendered
     */
    it('should affect conditional rendering when theme is overridden to dark', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: {
            expr: 'bin',
            op: '==',
            left: { expr: 'state', name: 'theme' },
            right: { expr: 'lit', value: 'dark' },
          },
          then: {
            kind: 'element',
            tag: 'div',
            props: {
              class: { expr: 'lit', value: 'dark-theme' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Dark Mode' } },
            ],
          },
          else: {
            kind: 'element',
            tag: 'div',
            props: {
              class: { expr: 'lit', value: 'light-theme' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Light Mode' } },
            ],
          },
        },
        {
          theme: { type: 'string', initial: 'light' },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          theme: 'dark',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark-theme');
      expect(result).toContain('Dark Mode');
      expect(result).not.toContain('light-theme');
      expect(result).not.toContain('Light Mode');
    });

    /**
     * Given: A program with theme state (initial: 'dark')
     * When: renderToString is called with stateOverrides { theme: 'light' }
     * Then: The light theme branch should be rendered despite initial being dark
     */
    it('should override dark initial theme to light when specified', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: {
            expr: 'bin',
            op: '==',
            left: { expr: 'state', name: 'theme' },
            right: { expr: 'lit', value: 'dark' },
          },
          then: {
            kind: 'element',
            tag: 'div',
            props: {
              class: { expr: 'lit', value: 'bg-gray-900 text-white' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Dark Theme Active' } },
            ],
          },
          else: {
            kind: 'element',
            tag: 'div',
            props: {
              class: { expr: 'lit', value: 'bg-white text-gray-900' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Light Theme Active' } },
            ],
          },
        },
        {
          theme: { type: 'string', initial: 'dark' },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          theme: 'light',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('bg-white');
      expect(result).toContain('Light Theme Active');
      expect(result).not.toContain('bg-gray-900');
      expect(result).not.toContain('Dark Theme Active');
    });

    /**
     * Given: A program with theme state affecting element class attribute
     * When: renderToString is called with stateOverrides { theme: 'dark' }
     * Then: The class attribute should reflect the overridden theme value
     */
    it('should affect class attribute based on overridden theme state', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'body',
          props: {
            class: {
              expr: 'cond',
              if: {
                expr: 'bin',
                op: '==',
                left: { expr: 'state', name: 'theme' },
                right: { expr: 'lit', value: 'dark' },
              },
              then: { expr: 'lit', value: 'dark bg-slate-900' },
              else: { expr: 'lit', value: 'light bg-white' },
            },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Content' } },
          ],
        },
        {
          theme: { type: 'string', initial: 'light' },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          theme: 'dark',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('class="dark bg-slate-900"');
      expect(result).not.toContain('class="light bg-white"');
    });
  });

  // ==================== Optional stateOverrides ====================

  describe('stateOverrides is optional', () => {
    /**
     * Given: A program with initial state values
     * When: renderToString is called without stateOverrides option
     * Then: The rendered output should use the program's initial values
     */
    it('should use initial values when stateOverrides is not provided', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'counter' },
            },
          ],
        },
        {
          counter: { type: 'number', initial: 10 },
        }
      );

      // Act - no stateOverrides in options
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<span>10</span>');
    });

    /**
     * Given: A program with initial state values
     * When: renderToString is called with empty options object
     * Then: The rendered output should use the program's initial values
     */
    it('should use initial values when options is empty object', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'title' },
            },
          ],
        },
        {
          title: { type: 'string', initial: 'Default Title' },
        }
      );

      const options: RenderOptions = {};

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<div>Default Title</div>');
    });

    /**
     * Given: A program with initial state values
     * When: renderToString is called with stateOverrides as undefined
     * Then: The rendered output should use the program's initial values
     */
    it('should use initial values when stateOverrides is explicitly undefined', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'p',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'status' },
            },
          ],
        },
        {
          status: { type: 'string', initial: 'pending' },
        }
      );

      const options: RenderOptions = {
        stateOverrides: undefined,
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<p>pending</p>');
    });

    /**
     * Given: A program with initial state values
     * When: renderToString is called with empty stateOverrides object
     * Then: The rendered output should use the program's initial values
     */
    it('should use initial values when stateOverrides is empty object', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'value' },
            },
          ],
        },
        {
          value: { type: 'number', initial: 999 },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {},
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<span>999</span>');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: A program with state
     * When: stateOverrides contains a key that doesn't exist in program state
     * Then: The extra key should be ignored (no error thrown)
     */
    it('should ignore stateOverrides for non-existent state fields', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'exists' },
            },
          ],
        },
        {
          exists: { type: 'string', initial: 'I exist' },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          exists: 'I am overridden',
          nonExistent: 'Should be ignored',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<div>I am overridden</div>');
    });

    /**
     * Given: A program with list state
     * When: stateOverrides provides a different array
     * Then: The each loop should iterate over the overridden array
     */
    it('should override list state and affect each loop rendering', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'li',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'item' } },
            ],
          },
        },
        {
          items: { type: 'list', initial: ['A', 'B', 'C'] },
        }
      );

      const options: RenderOptions = {
        stateOverrides: {
          items: ['X', 'Y'],
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<li>X</li><li>Y</li>');
      expect(result).not.toContain('A');
      expect(result).not.toContain('B');
      expect(result).not.toContain('C');
    });
  });
});
