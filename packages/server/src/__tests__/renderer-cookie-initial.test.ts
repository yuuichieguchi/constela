/**
 * Test module for SSR Renderer - Cookie Expression Initial Value Evaluation
 *
 * Coverage:
 * - Cookie expression evaluates to cookie value when cookies provided
 * - Cookie expression evaluates to default when cookie not present
 * - Works with stateOverrides (stateOverrides takes precedence)
 *
 * TDD Red Phase: These tests will FAIL because cookie expression evaluation
 * in SSR is not yet implemented.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { renderToString, type RenderOptions } from '../index.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Type Definition for Cookie Initial Expression ====================

/**
 * Cookie initial expression type
 * This type defines the structure for cookie-based state initialization
 */
interface CookieInitialExpr {
  expr: 'cookie';
  key: string;
  default: string;
}

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
 * Creates a program with theme state using cookie expression
 */
function createThemeCookieProgram(defaultTheme: string = 'light'): CompiledProgram {
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
      theme: {
        type: 'string',
        initial: { expr: 'cookie', key: 'theme', default: defaultTheme } as unknown,
      },
    }
  );
}

// ==================== Tests ====================

describe('renderToString with Cookie Expression Initial Values', () => {
  // ==================== Cookie expression evaluates to cookie value ====================

  describe('cookie expression evaluates to cookie value when cookies provided', () => {
    /**
     * Given: A program with state initial as cookie expression { expr: 'cookie', key: 'theme', default: 'light' }
     * When: renderToString is called with cookies: { theme: 'dark' }
     * Then: The state should be initialized to 'dark' (from cookie)
     */
    it('should evaluate cookie expression to cookie value when cookie is provided', async () => {
      // Arrange
      const program = createThemeCookieProgram('light');
      const options: RenderOptions = {
        cookies: {
          theme: 'dark',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark-mode');
      expect(result).toContain('Dark Theme Active');
      expect(result).not.toContain('light-mode');
    });

    /**
     * Given: A program with multiple cookie expressions
     * When: renderToString is called with corresponding cookies
     * Then: Each state should be initialized from its respective cookie
     */
    it('should evaluate multiple cookie expressions from their respective cookies', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
            { kind: 'text', value: { expr: 'lit', value: ' - ' } },
            { kind: 'text', value: { expr: 'state', name: 'locale' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
          },
          locale: {
            type: 'string',
            initial: { expr: 'cookie', key: 'user-locale', default: 'en-US' } as unknown,
          },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: 'dark',
          'user-locale': 'ja-JP',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark');
      expect(result).toContain('ja-JP');
      expect(result).not.toContain('light');
      expect(result).not.toContain('en-US');
    });

    /**
     * Given: A program with cookie expression for theme
     * When: renderToString is called with theme cookie = 'custom-theme'
     * Then: The state should use the custom theme value
     */
    it('should handle custom theme values from cookies', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'system' } as unknown,
          },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: 'high-contrast',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toBe('<span>high-contrast</span>');
    });
  });

  // ==================== Cookie expression evaluates to default when cookie not present ====================

  describe('cookie expression evaluates to default when cookie not present', () => {
    /**
     * Given: A program with state initial as cookie expression with default 'light'
     * When: renderToString is called without any cookies
     * Then: The state should be initialized to 'light' (the default)
     */
    it('should use default value when no cookies are provided', async () => {
      // Arrange
      const program = createThemeCookieProgram('light');
      const options: RenderOptions = {};

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('light-mode');
      expect(result).toContain('Light Theme Active');
      expect(result).not.toContain('dark-mode');
    });

    /**
     * Given: A program with cookie expression for 'theme' key
     * When: renderToString is called with empty cookies object
     * Then: The state should use the default value
     */
    it('should use default value when cookies object is empty', async () => {
      // Arrange
      const program = createThemeCookieProgram('dark');
      const options: RenderOptions = {
        cookies: {},
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark-mode');
      expect(result).toContain('Dark Theme Active');
    });

    /**
     * Given: A program with cookie expression for 'theme' key
     * When: renderToString is called with other cookies but not 'theme'
     * Then: The state should use the default value
     */
    it('should use default value when specific cookie key is not present', async () => {
      // Arrange
      const program = createThemeCookieProgram('light');
      const options: RenderOptions = {
        cookies: {
          'other-cookie': 'some-value',
          session: 'abc123',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('light-mode');
      expect(result).toContain('Light Theme Active');
    });

    /**
     * Given: A program with multiple cookie expressions
     * When: Some cookies are present and some are not
     * Then: Present cookies should use cookie value, missing should use default
     */
    it('should mix cookie values and defaults based on cookie presence', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
            { kind: 'text', value: { expr: 'lit', value: ' / ' } },
            { kind: 'text', value: { expr: 'state', name: 'locale' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
          },
          locale: {
            type: 'string',
            initial: { expr: 'cookie', key: 'locale', default: 'en-US' } as unknown,
          },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: 'dark',
          // locale cookie is NOT present
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark'); // From cookie
      expect(result).toContain('en-US'); // From default
    });

    /**
     * Given: A program with cookie expression with empty string default
     * When: Cookie is not present
     * Then: The state should be initialized to empty string
     */
    it('should use empty string as default when specified', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          props: {
            'data-session': { expr: 'state', name: 'sessionId' },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Content' } },
          ],
        },
        {
          sessionId: {
            type: 'string',
            initial: { expr: 'cookie', key: 'session', default: '' } as unknown,
          },
        }
      );
      const options: RenderOptions = {};

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('data-session=""');
    });
  });

  // ==================== Works with stateOverrides (stateOverrides takes precedence) ====================

  describe('stateOverrides takes precedence over cookie expressions', () => {
    /**
     * Given: A program with cookie expression initial and cookies provided
     * When: stateOverrides is also provided for the same state
     * Then: stateOverrides should take precedence over cookie value
     */
    it('should use stateOverrides over cookie value', async () => {
      // Arrange
      const program = createThemeCookieProgram('light');
      const options: RenderOptions = {
        cookies: {
          theme: 'dark',
        },
        stateOverrides: {
          theme: 'light',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      // stateOverrides: light takes precedence over cookies: dark
      expect(result).toContain('light-mode');
      expect(result).toContain('Light Theme Active');
      expect(result).not.toContain('dark-mode');
    });

    /**
     * Given: A program with cookie expression initial and no cookies provided
     * When: stateOverrides is provided for the same state
     * Then: stateOverrides should take precedence over default value
     */
    it('should use stateOverrides over default value', async () => {
      // Arrange
      const program = createThemeCookieProgram('light'); // default: 'light'
      const options: RenderOptions = {
        stateOverrides: {
          theme: 'dark',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      // stateOverrides: dark takes precedence over default: light
      expect(result).toContain('dark-mode');
      expect(result).toContain('Dark Theme Active');
      expect(result).not.toContain('light-mode');
    });

    /**
     * Given: Multiple states with cookie expressions
     * When: stateOverrides is provided for some but not all
     * Then: Overridden states use stateOverrides, others use cookie/default
     */
    it('should apply stateOverrides selectively while using cookies for others', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
            { kind: 'text', value: { expr: 'lit', value: ' | ' } },
            { kind: 'text', value: { expr: 'state', name: 'locale' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
          },
          locale: {
            type: 'string',
            initial: { expr: 'cookie', key: 'locale', default: 'en-US' } as unknown,
          },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: 'dark',
          locale: 'ja-JP',
        },
        stateOverrides: {
          theme: 'system', // Override theme only
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('system'); // From stateOverrides
      expect(result).toContain('ja-JP'); // From cookies (not overridden)
      expect(result).not.toContain('dark'); // Cookie value ignored due to override
    });

    /**
     * Given: A program with mixed cookie expression and primitive initial values
     * When: stateOverrides is provided for cookie expression state
     * Then: Precedence order: stateOverrides > cookies > default
     */
    it('should demonstrate precedence: stateOverrides > cookies > default', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'default-theme' } as unknown,
          },
        }
      );

      // Test 1: Only default (no cookies, no overrides)
      const result1 = await renderToString(program, {});
      expect(result1).toContain('default-theme');

      // Test 2: Cookie provided (no overrides)
      const result2 = await renderToString(program, {
        cookies: { theme: 'cookie-theme' },
      });
      expect(result2).toContain('cookie-theme');

      // Test 3: Both cookie and override provided
      const result3 = await renderToString(program, {
        cookies: { theme: 'cookie-theme' },
        stateOverrides: { theme: 'override-theme' },
      });
      expect(result3).toContain('override-theme');
    });
  });

  // ==================== Mixed primitive and cookie expression initial values ====================

  describe('backwards compatibility with primitive initial values', () => {
    /**
     * Given: A program with primitive initial values (not cookie expressions)
     * When: renderToString is called with or without cookies
     * Then: Primitive initial values should work as before
     */
    it('should continue to work with primitive initial values', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'message' } },
          ],
        },
        {
          message: { type: 'string', initial: 'Hello, World!' },
        }
      );
      const options: RenderOptions = {
        cookies: {
          message: 'Should be ignored',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      // Primitive initial should not be affected by cookies
      expect(result).toBe('<div>Hello, World!</div>');
    });

    /**
     * Given: A program with both cookie expressions and primitive initials
     * When: renderToString is called
     * Then: Cookie expressions should evaluate correctly, primitives unchanged
     */
    it('should handle mixed cookie expressions and primitive initial values', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
            { kind: 'text', value: { expr: 'lit', value: ' - ' } },
            { kind: 'text', value: { expr: 'state', name: 'version' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
          },
          version: { type: 'string', initial: '1.0.0' },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: 'dark',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark'); // From cookie
      expect(result).toContain('1.0.0'); // Primitive initial unchanged
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: A cookie expression with empty string cookie value
     * When: Cookie is set to empty string
     * Then: Empty string should be used as the value
     */
    it('should handle empty string cookie value', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'lit', value: '[' } },
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
            { kind: 'text', value: { expr: 'lit', value: ']' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'default' } as unknown,
          },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: '',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      // Empty string cookie value should be used, not the default
      expect(result).toBe('<span>[]</span>');
    });

    /**
     * Given: RenderOptions with cookies as undefined
     * When: renderToString is called
     * Then: Should use default values without error
     */
    it('should handle undefined cookies gracefully', async () => {
      // Arrange
      const program = createThemeCookieProgram('dark');
      const options: RenderOptions = {
        cookies: undefined,
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      expect(result).toContain('dark-mode');
    });

    /**
     * Given: Cookie value with special characters
     * When: renderToString is called
     * Then: Should handle and escape the value correctly
     */
    it('should handle cookie values with special characters', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          props: {
            'data-theme': { expr: 'state', name: 'theme' },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Content' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'default' } as unknown,
          },
        }
      );
      const options: RenderOptions = {
        cookies: {
          theme: 'dark&light<>',
        },
      };

      // Act
      const result = await renderToString(program, options);

      // Assert
      // Special characters should be escaped in HTML attribute
      expect(result).toContain('data-theme="dark&amp;light&lt;&gt;"');
    });
  });
});
