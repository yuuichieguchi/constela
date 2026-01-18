/**
 * Test module for entry-server.ts Cookie handling feature.
 *
 * Coverage:
 * - SSRContext accepts cookies property
 * - renderPage uses theme cookie value when available
 * - renderPage falls back to initial value when no cookie
 *
 * TDD Red Phase: These tests will FAIL because cookie handling is not yet implemented.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
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

/**
 * Creates a program with theme state for theme-based conditional rendering
 */
function createThemeAwareProgram(): CompiledProgram {
  return createProgram(
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
          class: { expr: 'lit', value: 'dark-mode' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Dark Theme Active' } },
        ],
      },
      else: {
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'light-mode' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Light Theme Active' } },
        ],
      },
    },
    {
      theme: { type: 'string', initial: 'light' },
    }
  );
}

// ==================== Tests ====================

describe('SSRContext with cookies', () => {
  // ==================== SSRContext accepts cookies property ====================

  describe('SSRContext cookies property', () => {
    /**
     * Given: SSRContext with cookies property
     * When: renderPage is called
     * Then: No error should be thrown (cookies property is accepted)
     */
    it('should accept cookies property in SSRContext', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
          ],
        }
      );

      // SSRContext with cookies property
      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: { theme: 'dark' },
      };

      // Act & Assert - should not throw
      const html = await renderPage(program, ctx);
      expect(html).toContain('Hello');
    });

    /**
     * Given: SSRContext with cookies as Record<string, string>
     * When: renderPage is called with various cookie values
     * Then: Cookies should be accessible during SSR
     */
    it('should accept cookies as Record<string, string>', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Content' } },
          ],
        }
      );

      const ctx = {
        url: '/page',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: 'dark',
          locale: 'en-US',
          sessionId: 'abc123',
        },
      };

      // Act & Assert
      const html = await renderPage(program, ctx);
      expect(html).toBeDefined();
    });
  });

  // ==================== renderPage uses theme cookie value ====================

  describe('renderPage theme cookie handling', () => {
    /**
     * Given: A program with theme state (initial: 'light') and conditional rendering
     * When: renderPage is called with cookies.theme = 'dark'
     * Then: The rendered output should reflect theme='dark'
     */
    it('should use theme cookie value when rendering', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createThemeAwareProgram();

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: 'dark',
        },
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('dark-mode');
      expect(html).toContain('Dark Theme Active');
      expect(html).not.toContain('light-mode');
      expect(html).not.toContain('Light Theme Active');
    });

    /**
     * Given: A program with theme state (initial: 'dark')
     * When: renderPage is called with cookies.theme = 'light'
     * Then: The rendered output should override initial dark to light
     */
    it('should override initial theme with cookie theme value', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'if',
          condition: {
            expr: 'bin',
            op: '==',
            left: { expr: 'state', name: 'theme' },
            right: { expr: 'lit', value: 'light' },
          },
          then: {
            kind: 'element',
            tag: 'main',
            props: {
              class: { expr: 'lit', value: 'light-theme' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Light Mode' } },
            ],
          },
          else: {
            kind: 'element',
            tag: 'main',
            props: {
              class: { expr: 'lit', value: 'dark-theme' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Dark Mode' } },
            ],
          },
        },
        {
          theme: { type: 'string', initial: 'dark' },
        }
      );

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: 'light',
        },
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('light-theme');
      expect(html).toContain('Light Mode');
      expect(html).not.toContain('dark-theme');
    });

    /**
     * Given: A program that displays theme state value directly
     * When: renderPage is called with cookies.theme = 'dark'
     * Then: The text content should show 'dark'
     */
    it('should make theme cookie value available in state expressions', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Current theme: ' } },
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: { type: 'string', initial: 'system' },
        }
      );

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: 'dark',
        },
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('Current theme: dark');
      expect(html).not.toContain('system');
    });
  });

  // ==================== Fallback to initial value when no cookie ====================

  describe('fallback to initial value', () => {
    /**
     * Given: A program with theme state (initial: 'light')
     * When: renderPage is called without theme cookie
     * Then: The rendered output should use the initial value 'light'
     */
    it('should use initial theme value when theme cookie is not provided', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createThemeAwareProgram();

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {}, // No theme cookie
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('light-mode');
      expect(html).toContain('Light Theme Active');
      expect(html).not.toContain('dark-mode');
    });

    /**
     * Given: A program with theme state (initial: 'dark')
     * When: renderPage is called without cookies property at all
     * Then: The rendered output should use the initial value 'dark'
     */
    it('should use initial theme value when cookies property is undefined', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          props: {
            class: {
              expr: 'cond',
              if: {
                expr: 'bin',
                op: '==',
                left: { expr: 'state', name: 'theme' },
                right: { expr: 'lit', value: 'dark' },
              },
              then: { expr: 'lit', value: 'bg-black' },
              else: { expr: 'lit', value: 'bg-white' },
            },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Content' } },
          ],
        },
        {
          theme: { type: 'string', initial: 'dark' },
        }
      );

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        // No cookies property
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('class="bg-black"');
    });

    /**
     * Given: A program with theme state
     * When: renderPage is called with empty theme cookie value
     * Then: The rendered output should use the initial value
     */
    it('should use initial theme value when theme cookie is empty string', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: { type: 'string', initial: 'default-theme' },
        }
      );

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: '', // Empty string
        },
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('default-theme');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: A program without theme state
     * When: renderPage is called with theme cookie
     * Then: Cookie should be ignored (no error, no effect)
     */
    it('should ignore theme cookie when program has no theme state', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
        {
          count: { type: 'number', initial: 42 },
        }
      );

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: 'dark', // Should be ignored
        },
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toBe('<div>42</div>');
    });

    /**
     * Given: A program with theme state
     * When: renderPage is called with invalid theme cookie value
     * Then: The invalid value should still be used (validation is app-level concern)
     */
    it('should use theme cookie value even if not standard light/dark', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: { type: 'string', initial: 'light' },
        }
      );

      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
        cookies: {
          theme: 'custom-theme-name',
        },
      };

      // Act
      const html = await renderPage(program, ctx);

      // Assert
      expect(html).toContain('custom-theme-name');
    });
  });
});
