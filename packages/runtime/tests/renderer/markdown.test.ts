/**
 * Test module for Markdown Node Rendering.
 *
 * Coverage:
 * - Renders container with constela-markdown class
 * - Renders basic markdown (# heading -> h1)
 * - Escapes dangerous HTML (XSS prevention)
 * - Updates reactively when state changes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledMarkdownNode, CompiledAction } from '@constela/compiler';

describe('render markdown node', () => {
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

  // ==================== Container Rendering ====================

  describe('container rendering', () => {
    it('should render container with constela-markdown class', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '# Hello' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.classList.contains('constela-markdown')).toBe(true);
    });

    it('should render as a div element', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: 'Some content' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.tagName.toLowerCase()).toBe('div');
    });
  });

  // ==================== Basic Markdown Rendering ====================

  describe('basic markdown rendering', () => {
    it('should render heading markdown (# heading -> h1)', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '# Hello World' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const h1 = result.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toBe('Hello World');
    });

    it('should render h2 heading (## heading)', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '## Section Title' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const h2 = result.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2?.textContent).toBe('Section Title');
    });

    it('should render paragraph text', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: 'This is a paragraph.' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const p = result.querySelector('p');
      expect(p).not.toBeNull();
      expect(p?.textContent).toBe('This is a paragraph.');
    });

    it('should render bold text', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '**bold text**' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const strong = result.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('bold text');
    });

    it('should render italic text', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '*italic text*' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const em = result.querySelector('em');
      expect(em).not.toBeNull();
      expect(em?.textContent).toBe('italic text');
    });

    it('should render links', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '[Click here](https://example.com)' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const link = result.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.textContent).toBe('Click here');
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('should render unordered list', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '- Item 1\n- Item 2\n- Item 3' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const ul = result.querySelector('ul');
      expect(ul).not.toBeNull();
      const items = result.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('should render ordered list', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '1. First\n2. Second\n3. Third' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const ol = result.querySelector('ol');
      expect(ol).not.toBeNull();
      const items = result.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('should render inline code', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: 'Use `console.log()` for debugging' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const code = result.querySelector('code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe('console.log()');
    });

    it('should render blockquote', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '> This is a quote' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const blockquote = result.querySelector('blockquote');
      expect(blockquote).not.toBeNull();
      expect(blockquote?.textContent?.trim()).toBe('This is a quote');
    });
  });

  // ==================== XSS Prevention ====================

  describe('XSS prevention', () => {
    it('should escape script tags', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '<script>alert("xss")</script>' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - script tag should NOT be present as a script element
      const script = result.querySelector('script');
      expect(script).toBeNull();
    });

    it('should escape onclick attributes', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '<div onclick="alert(\'xss\')">Click me</div>' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - onclick should be removed
      const div = result.querySelector('div[onclick]');
      expect(div).toBeNull();
    });

    it('should escape javascript: URLs', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '[Click](javascript:alert("xss"))' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - javascript: URL should be sanitized (href removed or not containing javascript:)
      const link = result.querySelector('a');
      if (link) {
        const href = link.getAttribute('href');
        // href is null (removed) or doesn't contain javascript: - both are valid sanitization
        expect(href === null || !href.includes('javascript:')).toBe(true);
      }
    });

    it('should escape onerror attributes in img tags', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '<img src="x" onerror="alert(\'xss\')">' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - onerror should be removed
      const img = result.querySelector('img[onerror]');
      expect(img).toBeNull();
    });

    it('should escape iframe tags', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '<iframe src="https://evil.com"></iframe>' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - iframe should NOT be present
      const iframe = result.querySelector('iframe');
      expect(iframe).toBeNull();
    });

    it('should escape data: URLs in links', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '[Download](data:text/html,<script>alert("xss")</script>)' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - data: URL should be sanitized (href removed or not containing data:)
      const link = result.querySelector('a');
      if (link) {
        const href = link.getAttribute('href');
        // href is null (removed) or doesn't contain data: - both are valid sanitization
        expect(href === null || !href.includes('data:')).toBe(true);
      }
    });
  });

  // ==================== State-based Content ====================

  describe('state-based content', () => {
    it('should render markdown from state', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'state', name: 'markdownContent' },
      };
      const context = createContext({
        markdownContent: { type: 'string', initial: '# From State' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const h1 = result.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toBe('From State');
    });
  });

  // ==================== Reactive Updates ====================

  describe('reactive updates', () => {
    it('should update markdown when state changes', async () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'state', name: 'markdownContent' },
      };
      const context = createContext({
        markdownContent: { type: 'string', initial: '# Initial Heading' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      let h1 = result.querySelector('h1');
      expect(h1?.textContent).toBe('Initial Heading');

      // Update state
      context.state.set('markdownContent', '# Updated Heading');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      h1 = result.querySelector('h1');
      expect(h1?.textContent).toBe('Updated Heading');
    });

    it('should update markdown structure when state changes', async () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'state', name: 'markdownContent' },
      };
      const context = createContext({
        markdownContent: { type: 'string', initial: '# Heading' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      expect(result.querySelector('h1')).not.toBeNull();
      expect(result.querySelector('ul')).toBeNull();

      // Update state to list
      context.state.set('markdownContent', '- Item 1\n- Item 2');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(result.querySelector('ul')).not.toBeNull();
      expect(result.querySelectorAll('li').length).toBe(2);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty markdown content', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.classList.contains('constela-markdown')).toBe(true);
      expect(result.innerHTML.trim()).toBe('');
    });

    it('should handle null markdown content', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: null },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.classList.contains('constela-markdown')).toBe(true);
    });

    it('should handle complex nested markdown', () => {
      // Arrange
      const complexMarkdown = `
# Main Title

This is a paragraph with **bold** and *italic* text.

## Section 1

- List item with \`code\`
- Another item

> A blockquote

## Section 2

1. Numbered item
2. Another numbered item
`;
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: complexMarkdown },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.querySelector('h1')).not.toBeNull();
      expect(result.querySelectorAll('h2').length).toBe(2);
      expect(result.querySelector('strong')).not.toBeNull();
      expect(result.querySelector('em')).not.toBeNull();
      expect(result.querySelector('ul')).not.toBeNull();
      expect(result.querySelector('ol')).not.toBeNull();
      expect(result.querySelector('blockquote')).not.toBeNull();
      expect(result.querySelector('code')).not.toBeNull();
    });

    it('should handle unicode characters in markdown', () => {
      // Arrange
      const node: CompiledMarkdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '# Japanese Text' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const h1 = result.querySelector('h1');
      expect(h1?.textContent).toContain('Japanese');
    });
  });
});
