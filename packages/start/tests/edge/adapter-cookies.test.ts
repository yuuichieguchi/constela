/**
 * Test module for Edge adapter Cookie parsing feature.
 *
 * Coverage:
 * - parseCookies helper function correctly parses cookie header
 * - createAdapter passes cookies to renderPage
 * - theme cookie value is used in SSR output
 *
 * TDD Red Phase: These tests will FAIL because cookie parsing is not yet implemented.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScannedRoute, PageModule } from '../../src/types.js';
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
 * Creates a theme-aware program for testing theme cookie integration
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
          class: { expr: 'lit', value: 'dark-theme-container' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Dark Mode Rendered' } },
        ],
      },
      else: {
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'light-theme-container' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Light Mode Rendered' } },
        ],
      },
    },
    {
      theme: { type: 'string', initial: 'light' },
    }
  );
}

const sampleRoutes: ScannedRoute[] = [
  {
    file: '/routes/index.page.ts',
    pattern: '/',
    type: 'page',
    params: [],
  },
];

// ==================== Tests ====================

describe('Cookie parsing in Edge adapter', () => {
  // ==================== parseCookies Helper Function ====================

  describe('parseCookies helper function', () => {
    /**
     * Given: A standard Cookie header string "name=value; other=123"
     * When: parseCookies is called
     * Then: Returns { name: 'value', other: '123' }
     */
    it('should parse simple cookie header into key-value object', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = 'name=value; other=123';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({
        name: 'value',
        other: '123',
      });
    });

    /**
     * Given: A Cookie header with a single cookie "theme=dark"
     * When: parseCookies is called
     * Then: Returns { theme: 'dark' }
     */
    it('should parse single cookie', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = 'theme=dark';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({ theme: 'dark' });
    });

    /**
     * Given: A Cookie header with multiple cookies separated by semicolon and space
     * When: parseCookies is called
     * Then: Returns all cookies as key-value pairs
     */
    it('should parse multiple cookies correctly', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = 'theme=dark; locale=en-US; sessionId=abc123xyz';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({
        theme: 'dark',
        locale: 'en-US',
        sessionId: 'abc123xyz',
      });
    });

    /**
     * Given: An empty string Cookie header
     * When: parseCookies is called
     * Then: Returns empty object {}
     */
    it('should return empty object for empty cookie header', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = '';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({});
    });

    /**
     * Given: A null/undefined Cookie header
     * When: parseCookies is called
     * Then: Returns empty object {}
     */
    it('should return empty object for null cookie header', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');

      // Act
      const result = parseCookies(null as unknown as string);

      // Assert
      expect(result).toEqual({});
    });

    /**
     * Given: A Cookie header with URL-encoded values "name=hello%20world"
     * When: parseCookies is called
     * Then: Returns decoded values { name: 'hello world' }
     */
    it('should decode URL-encoded cookie values', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = 'message=hello%20world; path=%2Ftest%2Fpage';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({
        message: 'hello world',
        path: '/test/page',
      });
    });

    /**
     * Given: A Cookie header with extra whitespace
     * When: parseCookies is called
     * Then: Returns trimmed key-value pairs
     */
    it('should handle extra whitespace in cookie header', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = '  theme=dark ;  locale=ja  ;count=5 ';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({
        theme: 'dark',
        locale: 'ja',
        count: '5',
      });
    });

    /**
     * Given: A Cookie header with values containing '=' character
     * When: parseCookies is called
     * Then: Only splits on first '=' for each cookie
     */
    it('should handle values containing equals sign', async () => {
      // Arrange
      const { parseCookies } = await import('../../src/edge/adapter.js');
      const cookieHeader = 'data=key=value; token=abc=def=ghi';

      // Act
      const result = parseCookies(cookieHeader);

      // Assert
      expect(result).toEqual({
        data: 'key=value',
        token: 'abc=def=ghi',
      });
    });
  });

  // ==================== createAdapter passes cookies to renderPage ====================

  describe('createAdapter cookie passing', () => {
    /**
     * Given: A request with Cookie header
     * When: adapter.fetch is called
     * Then: Cookies should be parsed and passed to renderPage
     */
    it('should pass parsed cookies to renderPage', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const themeProgram = createThemeAwareProgram();
      const mockPageModule: PageModule = {
        default: themeProgram,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      // Request with Cookie header
      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'theme=dark',
        },
      });

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      // The cookies should have been passed to renderPage
      // and theme should affect the rendered output
    });

    /**
     * Given: A request without Cookie header
     * When: adapter.fetch is called
     * Then: Cookies should be empty object passed to renderPage
     */
    it('should handle request without Cookie header', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'No cookies' } },
          ],
        }
      );
      const mockPageModule: PageModule = {
        default: program,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      // Request without Cookie header
      const request = new Request('http://localhost/');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('No cookies');
    });
  });

  // ==================== Theme cookie affects SSR output ====================

  describe('theme cookie in SSR output', () => {
    /**
     * Given: A page with theme-based conditional rendering
     * When: Request includes Cookie: theme=dark
     * Then: The response should contain dark theme HTML
     */
    it('should render dark theme when theme=dark cookie is present', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const themeProgram = createThemeAwareProgram();
      const mockPageModule: PageModule = {
        default: themeProgram,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'theme=dark',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert - extract SSR rendered content from <div id="app">...</div>
      const appContentMatch = html.match(/<div id="app">([\s\S]*?)<\/div>\s*<script/);
      const appContent = appContentMatch ? appContentMatch[1] : '';
      expect(appContent).toContain('dark-theme-container');
      expect(appContent).toContain('Dark Mode Rendered');
      expect(appContent).not.toContain('light-theme-container');
      expect(appContent).not.toContain('Light Mode Rendered');
    });

    /**
     * Given: A page with theme-based conditional rendering (initial: light)
     * When: Request includes Cookie: theme=light
     * Then: The response should contain light theme HTML
     */
    it('should render light theme when theme=light cookie is present', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const themeProgram = createThemeAwareProgram();
      const mockPageModule: PageModule = {
        default: themeProgram,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'theme=light',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(html).toContain('light-theme-container');
      expect(html).toContain('Light Mode Rendered');
    });

    /**
     * Given: A page with theme state (initial: dark)
     * When: Request has no theme cookie
     * Then: The response should use the initial dark theme
     */
    it('should use initial theme when no theme cookie is present', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      // Create program with dark as initial
      const darkInitialProgram = createProgram(
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
              then: { expr: 'lit', value: 'dark-bg' },
              else: { expr: 'lit', value: 'light-bg' },
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
      const mockPageModule: PageModule = {
        default: darkInitialProgram,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      // Request without theme cookie
      const request = new Request('http://localhost/');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(html).toContain('dark-bg');
    });

    /**
     * Given: A page that displays theme state value
     * When: Request includes Cookie: theme=custom
     * Then: The response should show the custom theme value
     */
    it('should pass custom theme value from cookie to SSR', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          props: {
            'data-theme': { expr: 'state', name: 'theme' },
          },
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: { type: 'string', initial: 'system' },
        }
      );
      const mockPageModule: PageModule = {
        default: program,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'theme=sepia; other=value',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(html).toContain('data-theme="sepia"');
      expect(html).toContain('>sepia<');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: A request with multiple cookies including theme
     * When: adapter.fetch is called
     * Then: Theme cookie should be correctly extracted and used
     */
    it('should correctly extract theme from multiple cookies', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const themeProgram = createThemeAwareProgram();
      const mockPageModule: PageModule = {
        default: themeProgram,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'sessionId=xyz123; theme=dark; locale=en; tracking=disabled',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(html).toContain('dark-theme-container');
    });

    /**
     * Given: API route request with Cookie header
     * When: adapter.fetch is called
     * Then: Cookies should still be available but not affect page rendering
     */
    it('should not affect API routes with cookie handling', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const apiModule = {
        GET: () => Response.json({ message: 'ok' }),
      };
      const moduleLoader = vi.fn().mockResolvedValue(apiModule);

      const apiRoutes: ScannedRoute[] = [
        {
          file: '/routes/api/test.ts',
          pattern: '/api/test',
          type: 'api',
          params: [],
        },
      ];

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: apiRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/api/test', {
        headers: {
          Cookie: 'theme=dark',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toEqual({ message: 'ok' });
    });
  });

  // ==================== Cookie Expression for Theme State ====================

  describe('cookie expression for theme state initial value', () => {
    /**
     * Creates a program with cookie expression for theme state.
     *
     * This simulates a program defined as:
     * {
     *   "state": {
     *     "theme": {
     *       "type": "string",
     *       "initial": { "expr": "cookie", "key": "theme", "default": "dark" }
     *     }
     *   }
     * }
     */
    function createCookieExpressionThemeProgram(defaultTheme: string = 'dark'): CompiledProgram {
      return createProgram(
        {
          kind: 'element',
          tag: 'div',
          props: {
            'data-theme': { expr: 'state', name: 'theme' },
          },
          children: [
            { kind: 'text', value: { expr: 'state', name: 'theme' } },
          ],
        },
        {
          theme: {
            type: 'string',
            initial: {
              expr: 'cookie',
              key: 'theme',
              default: defaultTheme,
            },
          },
        }
      );
    }

    /**
     * Given: A program with cookie expression for theme (default: "dark")
     * When: Request includes Cookie: theme=light
     * Then: wrapHtml should receive "light" as the theme value
     *
     * Bug: Current implementation (line 170-171 in adapter.ts) treats
     * initial as a string, resulting in undefined when it's a CookieInitialExpr.
     */
    it('should pass cookie value to wrapHtml when theme uses cookie expression', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const program = createCookieExpressionThemeProgram('dark');
      const mockPageModule: PageModule = {
        default: program,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'theme=light',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      // For light theme, the <html> element should NOT have class="dark"
      // (Tailwind CSS pattern: dark mode uses class="dark", light mode has no class)
      expect(html).not.toMatch(/<html[^>]*class="dark"/);
    });

    /**
     * Given: A program with cookie expression for theme (default: "dark")
     * When: Request has no theme cookie
     * Then: wrapHtml should receive the default value "dark"
     *
     * Bug: Current implementation returns undefined instead of the default value.
     */
    it('should use default value from cookie expression when no cookie present', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const program = createCookieExpressionThemeProgram('dark');
      const mockPageModule: PageModule = {
        default: program,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      // Request without theme cookie
      const request = new Request('http://localhost/');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      // The HTML should have class="dark" on the <html> element
      // because the default value from cookie expression is "dark"
      expect(html).toMatch(/<html[^>]*class="dark"/);
    });

    /**
     * Given: A program with regular string initial value for theme
     * When: Request is made
     * Then: wrapHtml should receive the string value directly
     *
     * This ensures backward compatibility with existing non-cookie expression programs.
     */
    it('should work with regular string initial value (backward compatibility)', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      // Use the original createThemeAwareProgram which has string initial value
      const program = createThemeAwareProgram();
      const mockPageModule: PageModule = {
        default: program,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      // Request without cookie - should use initial value 'light' from state definition
      const request = new Request('http://localhost/');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      // For light theme, the <html> element should NOT have class="dark"
      // (Tailwind CSS pattern: dark mode uses class="dark", light mode has no class)
      expect(html).not.toMatch(/<html[^>]*class="dark"/);
    });

    /**
     * Given: A program with cookie expression for theme (default: "light")
     * When: Request includes Cookie: theme=dark
     * Then: Both renderPage content AND wrapHtml should use "dark"
     *
     * This verifies end-to-end consistency: the SSR content and HTML wrapper
     * should both reflect the same theme value.
     */
    it('should have consistent theme between renderPage content and wrapHtml', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      // Create a program that renders different content based on theme
      const program: CompiledProgram = createProgram(
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
              class: { expr: 'lit', value: 'dark-theme-content' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Dark Mode Active' } },
            ],
          },
          else: {
            kind: 'element',
            tag: 'div',
            props: {
              class: { expr: 'lit', value: 'light-theme-content' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Light Mode Active' } },
            ],
          },
        },
        {
          theme: {
            type: 'string',
            initial: {
              expr: 'cookie',
              key: 'theme',
              default: 'light',
            },
          },
        }
      );
      const mockPageModule: PageModule = {
        default: program,
      };
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/', {
        headers: {
          Cookie: 'theme=dark',
        },
      });

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      // 1. The SSR content should show dark theme (this works because renderPage handles cookie expr)
      expect(html).toContain('dark-theme-content');
      expect(html).toContain('Dark Mode Active');

      // 2. The HTML wrapper should also have dark theme class (this is the bug)
      expect(html).toMatch(/<html[^>]*class="dark"/);
    });
  });
});
