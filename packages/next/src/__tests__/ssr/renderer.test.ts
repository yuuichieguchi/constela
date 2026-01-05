/**
 * Test module for SSR Renderer.
 *
 * Coverage:
 * - Element nodes (simple, with props, with children, void elements)
 * - Text nodes (literal, escaped, state reference)
 * - If nodes (true condition, false condition, without else)
 * - Each nodes (iteration, empty array, index variable)
 * - Event handlers (should be ignored in SSR)
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from '../../ssr/renderer.js';
import type { CompiledProgram } from '@constela/compiler';

describe('renderToString', () => {
  // ==================== Helper Functions ====================

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

  // ==================== Element Nodes ====================

  describe('element nodes', () => {
    it('should render simple div element', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div></div>');
    });

    it('should render element with class prop', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'test' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div class="test"></div>');
    });

    it('should render element with multiple props', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'container' },
          id: { expr: 'lit', value: 'main' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toContain('class="container"');
      expect(result).toContain('id="main"');
    });

    it('should render element with children', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'span',
            children: [
              {
                kind: 'text',
                value: { expr: 'lit', value: 'text' },
              },
            ],
          },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div><span>text</span></div>');
    });

    it('should render nested elements', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'ul',
            children: [
              {
                kind: 'element',
                tag: 'li',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Item 1' } },
                ],
              },
              {
                kind: 'element',
                tag: 'li',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Item 2' } },
                ],
              },
            ],
          },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div><ul><li>Item 1</li><li>Item 2</li></ul></div>');
    });
  });

  // ==================== Void Elements ====================

  describe('void elements', () => {
    it('should render input as self-closing', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<input type="text" />');
    });

    it('should render br as self-closing', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'br',
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<br />');
    });

    it('should render img as self-closing with props', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'img',
        props: {
          src: { expr: 'lit', value: 'test.png' },
          alt: { expr: 'lit', value: 'Test image' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toContain('<img');
      expect(result).toContain('src="test.png"');
      expect(result).toContain('alt="Test image"');
      expect(result).toContain('/>');
      expect(result).not.toContain('</img>');
    });

    it('should render hr as self-closing', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'hr',
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<hr />');
    });

    it('should render meta as self-closing', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'meta',
        props: {
          charset: { expr: 'lit', value: 'utf-8' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<meta charset="utf-8" />');
    });
  });

  // ==================== Text Nodes ====================

  describe('text nodes', () => {
    it('should render literal text', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'p',
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 'Hello' },
          },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<p>Hello</p>');
    });

    it('should render number as text', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'span',
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 42 },
          },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<span>42</span>');
    });

    it('should escape HTML in text content', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: '<script>alert("XSS")</script>' },
          },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe(
        '<div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</div>'
      );
    });

    it('should render state value using initial value', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'message' },
            },
          ],
        },
        {
          message: { type: 'string', initial: 'Hello from state' },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<span>Hello from state</span>');
    });

    it('should render empty string for null value', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'span',
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: null },
          },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<span></span>');
    });
  });

  // ==================== If Nodes ====================

  describe('if nodes', () => {
    it('should render then branch when condition is true', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: { expr: 'state', name: 'show' },
          then: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
            ],
          },
        },
        {
          show: { type: 'boolean', initial: true },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div>Visible</div>');
    });

    it('should render else branch when condition is false', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: { expr: 'state', name: 'show' },
          then: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
            ],
          },
          else: {
            kind: 'element',
            tag: 'span',
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Hidden' } },
            ],
          },
        },
        {
          show: { type: 'boolean', initial: false },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<span>Hidden</span>');
    });

    it('should render empty string when condition is false and no else', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: { expr: 'state', name: 'show' },
          then: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
            ],
          },
        },
        {
          show: { type: 'boolean', initial: false },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('');
    });

    it('should evaluate literal true condition', () => {
      // Arrange
      const program = createProgram({
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Always visible' } },
          ],
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div>Always visible</div>');
    });

    it('should evaluate literal false condition', () => {
      // Arrange
      const program = createProgram({
        kind: 'if',
        condition: { expr: 'lit', value: false },
        then: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Never visible' } },
          ],
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('');
    });
  });

  // ==================== Each Nodes ====================

  describe('each nodes', () => {
    it('should iterate over array and render items', () => {
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
          items: { type: 'array', initial: ['A', 'B', 'C'] },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<li>A</li><li>B</li><li>C</li>');
    });

    it('should render empty string for empty array', () => {
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
          items: { type: 'array', initial: [] },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('');
    });

    it('should provide index variable when specified', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          index: 'idx',
          body: {
            kind: 'element',
            tag: 'li',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'idx' } },
              { kind: 'text', value: { expr: 'lit', value: ': ' } },
              { kind: 'text', value: { expr: 'var', name: 'item' } },
            ],
          },
        },
        {
          items: { type: 'array', initial: ['Apple', 'Banana'] },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<li>0: Apple</li><li>1: Banana</li>');
    });

    it('should iterate over literal array', () => {
      // Arrange
      const program = createProgram({
        kind: 'each',
        items: { expr: 'lit', value: [1, 2, 3] },
        as: 'num',
        body: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'var', name: 'num' } },
          ],
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<span>1</span><span>2</span><span>3</span>');
    });

    it('should handle nested each nodes', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'rows' },
          as: 'row',
          body: {
            kind: 'element',
            tag: 'tr',
            children: [
              {
                kind: 'each',
                items: { expr: 'var', name: 'row' },
                as: 'cell',
                body: {
                  kind: 'element',
                  tag: 'td',
                  children: [
                    { kind: 'text', value: { expr: 'var', name: 'cell' } },
                  ],
                },
              },
            ],
          },
        },
        {
          rows: {
            type: 'array',
            initial: [
              ['A1', 'A2'],
              ['B1', 'B2'],
            ],
          },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe(
        '<tr><td>A1</td><td>A2</td></tr><tr><td>B1</td><td>B2</td></tr>'
      );
    });
  });

  // ==================== Event Handlers ====================

  describe('event handlers', () => {
    it('should ignore onclick handler in SSR', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'button',
        props: {
          onclick: { event: 'click', action: 'handleClick' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Click me' } },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<button>Click me</button>');
      expect(result).not.toContain('onclick');
    });

    it('should ignore oninput handler in SSR', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' },
          oninput: { event: 'input', action: 'handleInput' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<input type="text" />');
      expect(result).not.toContain('oninput');
    });

    it('should render element with both props and ignored handlers', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'button',
        props: {
          class: { expr: 'lit', value: 'btn' },
          onclick: { event: 'click', action: 'submit' },
          disabled: { expr: 'lit', value: false },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Submit' } },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toContain('class="btn"');
      expect(result).not.toContain('onclick');
    });
  });

  // ==================== Prop Value Handling ====================

  describe('prop value handling', () => {
    it('should escape attribute values', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        props: {
          'data-value': { expr: 'lit', value: 'hello "world"' },
        },
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<div data-value="hello &quot;world&quot;"></div>');
    });

    it('should render state value in props', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'input',
          props: {
            type: { expr: 'lit', value: 'text' },
            value: { expr: 'state', name: 'inputValue' },
          },
        },
        {
          inputValue: { type: 'string', initial: 'default value' },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toContain('value="default value"');
    });

    it('should not render boolean false props', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'button',
        props: {
          disabled: { expr: 'lit', value: false },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Button' } },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<button>Button</button>');
      expect(result).not.toContain('disabled');
    });

    it('should render boolean true props as attribute name only', () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'button',
        props: {
          disabled: { expr: 'lit', value: true },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Button' } },
        ],
      });

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe('<button disabled>Button</button>');
    });
  });

  // ==================== Complex Scenarios ====================

  describe('complex scenarios', () => {
    it('should render a complete form', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'form',
          props: {
            class: { expr: 'lit', value: 'login-form' },
          },
          children: [
            {
              kind: 'element',
              tag: 'label',
              children: [
                { kind: 'text', value: { expr: 'lit', value: 'Username' } },
              ],
            },
            {
              kind: 'element',
              tag: 'input',
              props: {
                type: { expr: 'lit', value: 'text' },
                name: { expr: 'lit', value: 'username' },
              },
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                type: { expr: 'lit', value: 'submit' },
                onclick: { event: 'click', action: 'handleSubmit' },
              },
              children: [
                { kind: 'text', value: { expr: 'lit', value: 'Login' } },
              ],
            },
          ],
        },
        {}
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toContain('<form class="login-form">');
      expect(result).toContain('<label>Username</label>');
      expect(result).toContain('<input type="text" name="username" />');
      expect(result).toContain('<button type="submit">Login</button>');
      expect(result).toContain('</form>');
    });

    it('should render conditional list with items', () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: { expr: 'state', name: 'hasItems' },
          then: {
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
                  ],
                },
              },
            ],
          },
          else: {
            kind: 'element',
            tag: 'p',
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'No items' } },
            ],
          },
        },
        {
          hasItems: { type: 'boolean', initial: true },
          items: { type: 'array', initial: ['First', 'Second', 'Third'] },
        }
      );

      // Act
      const result = renderToString(program);

      // Assert
      expect(result).toBe(
        '<ul><li>First</li><li>Second</li><li>Third</li></ul>'
      );
    });
  });
});
