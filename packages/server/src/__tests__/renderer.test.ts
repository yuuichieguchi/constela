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
      expect(result).toBe('<!--if:then--><div>Visible</div>');
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
      expect(result).toBe('<!--if:else--><span>Hidden</span>');
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
      expect(result).toBe('<!--if:none-->');
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
      expect(result).toBe('<!--if:then--><div>Always visible</div>');
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
      expect(result).toBe('<!--if:none-->');
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
        '<!--if:then--><ul><li>First</li><li>Second</li><li>Third</li></ul>'
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
        // Should contain properly escaped quotes (using &quot;)
        expect(result).toContain('&quot;');
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

    // ==================== Syntax Highlighting (Shiki) ====================

    describe('code node syntax highlighting', () => {
      /**
       * Given: A code node with JavaScript code
       * When: renderCode is called
       * Then: Output should contain span elements generated by Shiki for syntax highlighting
       *
       * Shiki wraps tokens in <span> elements with inline styles for coloring.
       * Plain escaped HTML would NOT have these wrapper spans.
       */
      it('should produce syntax-highlighted HTML with span elements from Shiki', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: 'const x = 1;' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // Shiki wraps code tokens in <span> elements with style attributes
        // If just escapeHtml is used, there would be no spans inside the code block
        expect(result).toMatch(/<code[^>]*>.*<span[^>]*>.*<\/span>.*<\/code>/s);
      });

      /**
       * Given: A code node with TypeScript code containing keywords
       * When: renderCode is called
       * Then: Output should contain colored tokens (spans with style attributes)
       *
       * Shiki applies colors via CSS custom properties like style="--shiki-light:...;--shiki-dark:..."
       * when using dual-theme mode (defaultColor: false)
       */
      it('should render code blocks with colored tokens from Shiki', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'typescript' },
          content: { expr: 'lit', value: 'const name: string = "hello";' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // Shiki outputs spans with CSS custom properties for dual-theme support
        expect(result).toMatch(/<span[^>]*style="[^"]*--shiki-[^"]*"[^>]*>/);
      });

      /**
       * Given: A code node with Python code
       * When: renderCode is called
       * Then: Output should have multiple span elements for different token types
       *
       * Different tokens (keywords, strings, etc.) get different colors.
       */
      it('should render different tokens with different styling', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'python' },
          content: { expr: 'lit', value: 'def hello():\n    print("world")' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // Should have multiple spans with styles (at least for 'def', 'hello', 'print', '"world"')
        const spanMatches = result.match(/<span[^>]*style="[^"]*"[^>]*>/g);
        expect(spanMatches).not.toBeNull();
        expect(spanMatches!.length).toBeGreaterThan(1);
      });

      /**
       * Given: A code node with language and content
       * When: renderCode is called
       * Then: Language badge should still be rendered alongside syntax-highlighted code
       */
      it('should render language badge alongside syntax-highlighted code', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: 'const x = 1;' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // Should have language badge
        expect(result).toContain('javascript');
        // Should also have syntax highlighting (spans with CSS custom properties)
        expect(result).toMatch(/<span[^>]*style="[^"]*--shiki-[^"]*"[^>]*>/);
      });

      /**
       * Given: A code node with language and content
       * When: renderCode is called
       * Then: Copy button should still be present with syntax-highlighted code
       */
      it('should render copy button alongside syntax-highlighted code', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'typescript' },
          content: { expr: 'lit', value: 'interface User { name: string; }' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // Should have copy button class
        expect(result).toContain('constela-copy-btn');
        // Should also have syntax highlighting (spans with CSS custom properties)
        expect(result).toMatch(/<span[^>]*style="[^"]*--shiki-[^"]*"[^>]*>/);
      });

      /**
       * Given: A code node with Rust code
       * When: renderCode is called
       * Then: Output should NOT be plain escaped text, but have Shiki tokens
       *
       * This test ensures we don't just have escapeHtml output.
       */
      it('should not render plain escaped text without syntax highlighting', async () => {
        // Arrange
        const program = createProgram({
          kind: 'code',
          language: { expr: 'lit', value: 'rust' },
          content: { expr: 'lit', value: 'fn main() { println!("Hello"); }' },
        } as CompiledProgram['view']);

        // Act
        const result = await renderToString(program);

        // Assert
        // If Shiki is working, the code element should contain styled spans
        // Extract the code content
        const codeMatch = result.match(/<code[^>]*>([\s\S]*?)<\/code>/);
        expect(codeMatch).not.toBeNull();
        const codeContent = codeMatch![1];
        // Code content should NOT be just plain text - it should have span elements
        expect(codeContent).toContain('<span');
      });
    });
  });

  // ==================== Style Expression Evaluation ====================

  describe('style expression evaluation', () => {
    /**
     * Given: A style preset with only base class
     * When: Style expression references the preset without variants
     * Then: Should return the base class string
     */
    it('should evaluate style expression with only base class', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'style', name: 'button' } as never,
          },
        ],
      });
      const styles = {
        button: {
          base: 'px-4 py-2 rounded',
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe('<div>px-4 py-2 rounded</div>');
    });

    /**
     * Given: A style preset with variants
     * When: Style expression specifies variant values
     * Then: Should return base class + variant classes
     */
    it('should evaluate style expression with variant selection', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: {
              expr: 'style',
              name: 'button',
              variants: {
                size: { expr: 'lit', value: 'lg' },
              },
            } as never,
          },
        ],
      });
      const styles = {
        button: {
          base: 'px-4 py-2 rounded',
          variants: {
            size: {
              sm: 'text-sm h-8',
              md: 'text-base h-10',
              lg: 'text-lg h-12',
            },
          },
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe('<div>px-4 py-2 rounded text-lg h-12</div>');
    });

    /**
     * Given: A style preset with default variants
     * When: Style expression does not specify variant value
     * Then: Should apply default variant class
     */
    it('should apply default variant when not specified in expression', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: {
              expr: 'style',
              name: 'button',
            } as never,
          },
        ],
      });
      const styles = {
        button: {
          base: 'px-4 py-2 rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200 text-gray-800',
            },
          },
          defaultVariants: {
            variant: 'primary',
          },
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe('<div>px-4 py-2 rounded bg-blue-500 text-white</div>');
    });

    /**
     * Given: A style expression referencing undefined preset
     * When: Evaluating the style expression
     * Then: Should return empty string (graceful degradation)
     */
    it('should return empty string for unknown style preset', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: {
              expr: 'style',
              name: 'nonexistent',
            } as never,
          },
        ],
      });
      const styles = {
        button: {
          base: 'px-4 py-2 rounded',
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe('<div></div>');
    });

    /**
     * Given: An element with class prop using style expression
     * When: Rendering the element
     * Then: Should render element with evaluated style class in class attribute
     */
    it('should render element with style expression in class prop', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'button',
        props: {
          class: {
            expr: 'style',
            name: 'button',
            variants: {
              variant: { expr: 'lit', value: 'primary' },
              size: { expr: 'lit', value: 'lg' },
            },
          } as never,
        },
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 'Click me' },
          },
        ],
      });
      const styles = {
        button: {
          base: 'font-medium rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200 text-gray-800',
            },
            size: {
              sm: 'px-2 py-1 text-sm',
              md: 'px-4 py-2 text-base',
              lg: 'px-6 py-3 text-lg',
            },
          },
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe(
        '<button class="font-medium rounded bg-blue-500 text-white px-6 py-3 text-lg">Click me</button>'
      );
    });

    /**
     * Given: A style expression with variant value from state
     * When: Rendering with state containing the variant value
     * Then: Should evaluate state and apply correct variant class
     */
    it('should evaluate style variant from state value', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          props: {
            class: {
              expr: 'style',
              name: 'alert',
              variants: {
                type: { expr: 'state', name: 'alertType' },
              },
            } as never,
          },
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Alert message' },
            },
          ],
        },
        {
          alertType: { type: 'string', initial: 'error' },
        }
      );
      const styles = {
        alert: {
          base: 'p-4 rounded border',
          variants: {
            type: {
              info: 'bg-blue-100 border-blue-500',
              warning: 'bg-yellow-100 border-yellow-500',
              error: 'bg-red-100 border-red-500',
            },
          },
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe(
        '<div class="p-4 rounded border bg-red-100 border-red-500">Alert message</div>'
      );
    });

    /**
     * Given: A style preset with multiple variants
     * When: Style expression specifies all variant values
     * Then: Should apply all variant classes in preset order
     */
    it('should apply multiple variants in preset order', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'button',
        props: {
          class: {
            expr: 'style',
            name: 'button',
            variants: {
              variant: { expr: 'lit', value: 'outline' },
              size: { expr: 'lit', value: 'sm' },
              rounded: { expr: 'lit', value: 'full' },
            },
          } as never,
        },
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 'Button' },
          },
        ],
      });
      const styles = {
        button: {
          base: 'font-medium transition-colors',
          variants: {
            variant: {
              solid: 'bg-blue-500 text-white',
              outline: 'border-2 border-blue-500 text-blue-500',
            },
            size: {
              sm: 'px-2 py-1 text-sm',
              md: 'px-4 py-2 text-base',
            },
            rounded: {
              none: 'rounded-none',
              md: 'rounded-md',
              full: 'rounded-full',
            },
          },
        },
      };

      // Act
      const result = await renderToString(program, { styles });

      // Assert
      expect(result).toBe(
        '<button class="font-medium transition-colors border-2 border-blue-500 text-blue-500 px-2 py-1 text-sm rounded-full">Button</button>'
      );
    });
  });
});
