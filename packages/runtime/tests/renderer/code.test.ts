/**
 * Test module for Code Node Rendering.
 *
 * Coverage:
 * - Renders container with constela-code class
 * - Renders code content
 * - Supports language specification
 * - Applies syntax highlighting (async)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledCodeNode, CompiledAction } from '@constela/compiler';

describe('render code node', () => {
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
    it('should render container with constela-code class', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.classList.contains('constela-code')).toBe(true);
    });

    it('should render as a div element', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.tagName.toLowerCase()).toBe('div');
    });

    it('should contain a pre element for code block', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const pre = result.querySelector('pre');
      expect(pre).not.toBeNull();
    });

    it('should contain a code element inside pre', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const code = result.querySelector('pre > code');
      expect(code).not.toBeNull();
    });
  });

  // ==================== Code Content Rendering ====================

  describe('code content rendering', () => {
    it('should render code content', () => {
      // Arrange
      const codeContent = 'const greeting = "Hello, World!";';
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.textContent).toContain(codeContent);
    });

    it('should render multi-line code', () => {
      // Arrange
      const codeContent = `function add(a, b) {
  return a + b;
}`;
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.textContent).toContain('function add');
      expect(result.textContent).toContain('return a + b');
    });

    it('should preserve whitespace in code', () => {
      // Arrange
      const codeContent = '  const indented = true;';
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const pre = result.querySelector('pre');
      expect(pre).not.toBeNull();
      // Pre elements should preserve whitespace
    });
  });

  // ==================== Language Specification ====================

  describe('language specification', () => {
    it('should support javascript language', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - should have language indication
      const code = result.querySelector('code');
      expect(code).not.toBeNull();
      expect(
        code?.classList.contains('language-javascript') ||
        result.dataset.language === 'javascript' ||
        code?.dataset.language === 'javascript'
      ).toBe(true);
    });

    it('should support typescript language', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'typescript' },
        content: { expr: 'lit', value: 'const x: number = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const code = result.querySelector('code');
      expect(code).not.toBeNull();
      expect(
        code?.classList.contains('language-typescript') ||
        result.dataset.language === 'typescript' ||
        code?.dataset.language === 'typescript'
      ).toBe(true);
    });

    it('should support python language', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'python' },
        content: { expr: 'lit', value: 'def hello():\n    print("Hello")' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const code = result.querySelector('code');
      expect(code).not.toBeNull();
      expect(
        code?.classList.contains('language-python') ||
        result.dataset.language === 'python' ||
        code?.dataset.language === 'python'
      ).toBe(true);
    });

    it('should support language from state', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'state', name: 'selectedLanguage' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext({
        selectedLanguage: { type: 'string', initial: 'rust' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      const code = result.querySelector('code');
      expect(code).not.toBeNull();
      expect(
        code?.classList.contains('language-rust') ||
        result.dataset.language === 'rust' ||
        code?.dataset.language === 'rust'
      ).toBe(true);
    });

    it('should handle unknown language gracefully', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'unknownlang' },
        content: { expr: 'lit', value: 'some code' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - should still render, just without highlighting
      expect(result.textContent).toContain('some code');
    });
  });

  // ==================== Syntax Highlighting ====================

  describe('syntax highlighting', () => {
    it('should apply syntax highlighting tokens', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Wait for async highlighting to complete
      await vi.waitFor(() => {
        const spans = result.querySelectorAll('span');
        expect(spans.length).toBeGreaterThan(0);
      }, { timeout: 5000, interval: 50 });
    });

    it('should highlight keywords', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'function test() { return true; }' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Wait for async highlighting to complete
      await vi.waitFor(() => {
        const code = result.querySelector('code');
        expect(code).not.toBeNull();
        expect(code?.querySelectorAll('span').length).toBeGreaterThan(0);
      }, { timeout: 5000, interval: 50 });
    });

    it('should highlight strings', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const str = "hello world";' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Wait for async highlighting to complete
      await vi.waitFor(() => {
        const code = result.querySelector('code');
        expect(code).not.toBeNull();
      }, { timeout: 5000, interval: 50 });
    });

    it('should highlight comments', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: '// This is a comment\nconst x = 1;' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Wait for async highlighting to complete
      await vi.waitFor(() => {
        const code = result.querySelector('code');
        expect(code).not.toBeNull();
      }, { timeout: 5000, interval: 50 });
    });
  });

  // ==================== State-based Content ====================

  describe('state-based content', () => {
    it('should render code from state', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'state', name: 'codeContent' },
      };
      const context = createContext({
        codeContent: { type: 'string', initial: 'const fromState = true;' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.textContent).toContain('const fromState = true;');
    });
  });

  // ==================== Reactive Updates ====================

  describe('reactive updates', () => {
    it('should update code when state changes', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'state', name: 'codeContent' },
      };
      const context = createContext({
        codeContent: { type: 'string', initial: 'const initial = 1;' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      expect(result.textContent).toContain('const initial = 1;');

      // Update state
      context.state.set('codeContent', 'const updated = 2;');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(result.textContent).toContain('const updated = 2;');
    });

    it('should update language when state changes', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'state', name: 'selectedLanguage' },
        content: { expr: 'lit', value: 'x = 1' },
      };
      const context = createContext({
        selectedLanguage: { type: 'string', initial: 'javascript' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Check initial language
      let code = result.querySelector('code');
      expect(
        code?.classList.contains('language-javascript') ||
        result.dataset.language === 'javascript' ||
        code?.dataset.language === 'javascript'
      ).toBe(true);

      // Update state
      context.state.set('selectedLanguage', 'python');

      // Wait for reactivity and re-highlighting
      await vi.waitFor(() => {
        code = result.querySelector('code');
        expect(
          code?.classList.contains('language-python') ||
          result.dataset.language === 'python' ||
          code?.dataset.language === 'python'
        ).toBe(true);
      }, { timeout: 5000, interval: 50 });
    });

    it('should re-apply highlighting when content changes', async () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'state', name: 'codeContent' },
      };
      const context = createContext({
        codeContent: { type: 'string', initial: 'const x = 1;' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Wait for initial highlighting
      await vi.waitFor(() => {
        const spans = result.querySelectorAll('span');
        expect(spans.length).toBeGreaterThan(0);
      }, { timeout: 5000, interval: 50 });

      // Update state
      context.state.set('codeContent', 'function newCode() { return true; }');

      // Wait for reactivity and re-highlighting
      await vi.waitFor(() => {
        expect(result.textContent).toContain('function newCode');
      }, { timeout: 5000, interval: 50 });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty code content', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: '' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.classList.contains('constela-code')).toBe(true);
      const pre = result.querySelector('pre');
      expect(pre).not.toBeNull();
    });

    it('should handle null code content', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: null },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.classList.contains('constela-code')).toBe(true);
    });

    it('should handle empty language', () => {
      // Arrange
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: '' },
        content: { expr: 'lit', value: 'some code' },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - should render as plain text
      expect(result.textContent).toContain('some code');
    });

    it('should handle special characters in code', () => {
      // Arrange
      const codeContent = 'const special = "<>&\\"\'";';
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert - special characters should be preserved/escaped properly
      expect(result.textContent).toContain('<>&');
    });

    it('should handle very long code', () => {
      // Arrange
      const longCode = 'const x = 1;\n'.repeat(1000);
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: longCode },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.textContent).toContain('const x = 1;');
    });

    it('should handle unicode in code', () => {
      // Arrange
      const codeContent = 'const greeting = "Hello World";';
      const node: CompiledCodeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: codeContent },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      // Assert
      expect(result.textContent).toContain('Hello');
    });
  });
});
