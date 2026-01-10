/**
 * Test module for SSR Renderer.
 *
 * Coverage:
 * - Element nodes (simple, with props, with children, void elements)
 * - Text nodes (literal, escaped, state reference)
 * - If nodes (true condition, false condition, without else)
 * - Each nodes (iteration, empty array, index variable)
 * - Event handlers (should be ignored in SSR)
 * - Markdown nodes
 * - Code nodes (with shiki syntax highlighting)
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from '../renderer.js';
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
    it('should render simple div element', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div></div>');
    });

    it('should render element with class prop', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'test' },
        },
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div class="test"></div>');
    });

    it('should render element with multiple props', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('class="container"');
      expect(result).toContain('id="main"');
    });

    it('should render element with children', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div><span>text</span></div>');
    });

    it('should render nested elements', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div><ul><li>Item 1</li><li>Item 2</li></ul></div>');
    });
  });

  // ==================== Void Elements ====================

  describe('void elements', () => {
    it('should render input as self-closing', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' },
        },
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<input type="text" />');
    });

    it('should render br as self-closing', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'br',
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<br />');
    });

    it('should render img as self-closing with props', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<img');
      expect(result).toContain('src="test.png"');
      expect(result).toContain('alt="Test image"');
      expect(result).toContain('/>');
      expect(result).not.toContain('</img>');
    });

    it('should render hr as self-closing', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'hr',
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<hr />');
    });

    it('should render meta as self-closing', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'meta',
        props: {
          charset: { expr: 'lit', value: 'utf-8' },
        },
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<meta charset="utf-8" />');
    });
  });

  // ==================== Text Nodes ====================

  describe('text nodes', () => {
    it('should render literal text', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<p>Hello</p>');
    });

    it('should render number as text', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<span>42</span>');
    });

    it('should escape HTML in text content', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe(
        '<div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</div>'
      );
    });

    it('should render state value using initial value', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<span>Hello from state</span>');
    });

    it('should render empty string for null value', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<span></span>');
    });
  });

  // ==================== If Nodes ====================

  describe('if nodes', () => {
    it('should render then branch when condition is true', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div>Visible</div>');
    });

    it('should render else branch when condition is false', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<span>Hidden</span>');
    });

    it('should render empty string when condition is false and no else', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('');
    });

    it('should evaluate literal true condition', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div>Always visible</div>');
    });

    it('should evaluate literal false condition', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('');
    });
  });

  // ==================== Each Nodes ====================

  describe('each nodes', () => {
    it('should iterate over array and render items', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<li>A</li><li>B</li><li>C</li>');
    });

    it('should render empty string for empty array', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('');
    });

    it('should provide index variable when specified', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<li>0: Apple</li><li>1: Banana</li>');
    });

    it('should iterate over literal array', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<span>1</span><span>2</span><span>3</span>');
    });

    it('should handle nested each nodes', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe(
        '<tr><td>A1</td><td>A2</td></tr><tr><td>B1</td><td>B2</td></tr>'
      );
    });
  });

  // ==================== Event Handlers ====================

  describe('event handlers', () => {
    it('should ignore onclick handler in SSR', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<button>Click me</button>');
      expect(result).not.toContain('onclick');
    });

    it('should ignore oninput handler in SSR', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<input type="text" />');
      expect(result).not.toContain('oninput');
    });

    it('should render element with both props and ignored handlers', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('class="btn"');
      expect(result).not.toContain('onclick');
    });
  });

  // ==================== Prop Value Handling ====================

  describe('prop value handling', () => {
    it('should escape attribute values', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        props: {
          'data-value': { expr: 'lit', value: 'hello "world"' },
        },
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<div data-value="hello &quot;world&quot;"></div>');
    });

    it('should render state value in props', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('value="default value"');
    });

    it('should not render boolean false props', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<button>Button</button>');
      expect(result).not.toContain('disabled');
    });

    it('should render boolean true props as attribute name only', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe('<button disabled>Button</button>');
    });
  });

  // ==================== Complex Scenarios ====================

  describe('complex scenarios', () => {
    it('should render a complete form', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<form class="login-form">');
      expect(result).toContain('<label>Username</label>');
      expect(result).toContain('<input type="text" name="username" />');
      expect(result).toContain('<button type="submit">Login</button>');
      expect(result).toContain('</form>');
    });

    it('should render conditional list with items', async () => {
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
      const result = await renderToString(program);

      // Assert
      expect(result).toBe(
        '<ul><li>First</li><li>Second</li><li>Third</li></ul>'
      );
    });
  });

  // ==================== Markdown Nodes ====================

  describe('markdown nodes', () => {
    it('should render markdown container with constela-markdown class', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '# Hello' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('class="constela-markdown"');
    });

    it('should render basic markdown heading (# heading -> h1)', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '# Hello World' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<h1');
      expect(result).toContain('Hello World');
      expect(result).toContain('</h1>');
    });

    it('should render markdown with state value', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'markdown',
          content: { expr: 'state', name: 'markdownContent' },
        } as CompiledProgram['view'],
        {
          markdownContent: { type: 'string', initial: '# From State' },
        }
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<h1');
      expect(result).toContain('From State');
    });

    it('should render bold text in markdown', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '**bold text**' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<strong');
      expect(result).toContain('bold text');
      expect(result).toContain('</strong>');
    });

    it('should render italic text in markdown', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '*italic text*' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<em');
      expect(result).toContain('italic text');
      expect(result).toContain('</em>');
    });

    it('should render paragraph text', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: 'This is a paragraph.' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<p');
      expect(result).toContain('This is a paragraph.');
      expect(result).toContain('</p>');
    });

    it('should render links in markdown', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '[Click here](https://example.com)' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<a');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Click here');
      expect(result).toContain('</a>');
    });

    it('should render unordered list in markdown', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '- Item 1\n- Item 2\n- Item 3' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<ul');
      expect(result).toContain('<li');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should handle empty markdown content', async () => {
      // Arrange
      const program = createProgram({
        kind: 'markdown',
        content: { expr: 'lit', value: '' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('class="constela-markdown"');
    });
  });

  // ==================== Code Nodes ====================

  describe('code nodes', () => {
    it('should render code container with constela-code class', async () => {
      // Arrange
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('class="constela-code"');
    });

    it('should render code content', async () => {
      // Arrange
      const codeContent = 'const greeting = "Hello, World!";';
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('const');
      expect(result).toContain('greeting');
      expect(result).toContain('Hello, World!');
    });

    it('should render pre and code elements', async () => {
      // Arrange
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<pre');
      expect(result).toContain('<code');
      expect(result).toContain('</code>');
      expect(result).toContain('</pre>');
    });

    it('should render code with state values', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'state', name: 'codeContent' },
        } as CompiledProgram['view'],
        {
          codeContent: { type: 'string', initial: 'const fromState = true;' },
        }
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('const');
      expect(result).toContain('fromState');
      expect(result).toContain('true');
    });

    it('should render multi-line code', async () => {
      // Arrange
      const codeContent = `function add(a, b) {
  return a + b;
}`;
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('function');
      expect(result).toContain('add');
      expect(result).toContain('return');
    });

    it('should handle special HTML characters in code', async () => {
      // Arrange
      const codeContent = 'const html = "<div>&amp;</div>";';
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      // Shiki handles escaping internally, code content should be present
      expect(result).toContain('const');
      expect(result).toContain('html');
      // The < and > should be escaped in the output (shiki uses hex entities)
      expect(result).toContain('&#x3C;');
      expect(result).toContain('&#x3C;/');
    });

    it('should handle empty code content', async () => {
      // Arrange
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: '' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('class="constela-code"');
      expect(result).toContain('<pre');
      expect(result).toContain('<code');
    });

    it('should handle empty language', async () => {
      // Arrange
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: '' },
        content: { expr: 'lit', value: 'some code' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('some code');
    });

    it('should render syntax highlighted code with shiki', async () => {
      // Arrange
      const program = createProgram({
        kind: 'code',
        language: { expr: 'lit', value: 'typescript' },
        content: { expr: 'lit', value: 'const x: number = 42;' },
      } as CompiledProgram['view']);

      // Act
      const result = await renderToString(program);

      // Assert
      // Shiki outputs spans with inline styles for syntax highlighting
      expect(result).toContain('<span');
      expect(result).toContain('style=');
    });

    it('should render language from state', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'code',
          language: { expr: 'state', name: 'selectedLanguage' },
          content: { expr: 'lit', value: 'print("Hello")' },
        } as CompiledProgram['view'],
        {
          selectedLanguage: { type: 'string', initial: 'python' },
        }
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // Should render the code content
      expect(result).toContain('print');
      expect(result).toContain('Hello');
    });

    // ==================== Copy Button ====================

    describe('copy button', () => {
      /**
       * Given: A code node with any content
       * When: renderCode is called
       * Then: Output should contain a button with class "constela-copy-btn"
       */
      it('should render copy button with constela-copy-btn class', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: 'const x = 1;' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain('constela-copy-btn');
        expect(result).toContain('<button');
      });

      /**
       * Given: A code node with any content
       * When: renderCode is called
       * Then: Output should contain data-copy-target attribute on the button
       */
      it('should render copy button with data-copy-target attribute', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: 'const x = 1;' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain('data-copy-target="code"');
      });

      /**
       * Given: A code node with specific content
       * When: renderCode is called
       * Then: Output should contain data-code-content attribute with the raw code content
       */
      it('should render code wrapper with data-code-content attribute containing the code', async () => {
        // Arrange
        const codeContent = 'const greeting = "Hello, World!";';
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: codeContent },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain('data-code-content');
      });

      /**
       * Given: A code node with content containing special characters
       * When: renderCode is called
       * Then: data-code-content attribute should properly escape the content
       */
      it('should escape special characters in data-code-content attribute', async () => {
        // Arrange
        const codeContent = 'const html = "<div>Hello</div>";';
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: codeContent },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // The attribute value should be properly escaped for HTML
        expect(result).toContain('data-code-content');
        // Should not contain unescaped quotes that would break the attribute
        expect(result).not.toMatch(/data-code-content="[^"]*"[^"]*"/);
      });

      /**
       * Given: A code node with multi-line content
       * When: renderCode is called
       * Then: data-code-content should preserve the multi-line content
       */
      it('should handle multi-line code in data-code-content attribute', async () => {
        // Arrange
        const codeContent = `function add(a, b) {
  return a + b;
}`;
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: codeContent },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain('data-code-content');
      });

      /**
       * Given: A code node with empty language
       * When: renderCode is called
       * Then: Copy button should still be rendered
       */
      it('should render copy button even without language specified', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: '' },
          content: { expr: 'lit', value: 'some code' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain('constela-copy-btn');
        expect(result).toContain('data-copy-target="code"');
      });

      /**
       * Given: A code node
       * When: renderCode is called
       * Then: Copy button should contain an SVG icon
       */
      it('should render copy button with SVG icon', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: 'const x = 1;' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain('<svg');
        expect(result).toContain('</svg>');
      });
    });
  });
});
