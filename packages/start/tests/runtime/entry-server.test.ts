/**
 * Test module for entry-server.ts wrapHtml dark mode support and generateHydrationScript.
 *
 * Coverage:
 * - wrapHtml dark class when theme is 'dark'
 * - wrapHtml no dark class when theme is 'light'
 * - wrapHtml backward compatibility without theme option
 * - wrapHtml theme anti-flash script support (themeStorageKey option)
 * - generateHydrationScript backward compatibility (no widgets)
 * - generateHydrationScript widget mounting support
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  wrapHtml,
  generateHydrationScript,
} from '../../src/runtime/entry-server.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Type Definitions for Widget Mounting Feature ====================
// NOTE: This interface will be exported from entry-server.ts after implementation

/**
 * Configuration for mounting a widget after hydration.
 */
interface WidgetConfig {
  /** The DOM element ID where the widget should be mounted */
  id: string;
  /** The compiled program for the widget */
  program: CompiledProgram;
}

// ==================== Test Fixtures ====================

const SAMPLE_CONTENT = '<div>Hello World</div>';
const SAMPLE_HYDRATION_SCRIPT = 'console.log("hydrate");';
const SAMPLE_HEAD = '<title>Test Page</title>';

/**
 * Creates a minimal CompiledProgram for testing purposes.
 */
function createMockProgram(overrides: Partial<CompiledProgram> = {}): CompiledProgram {
  return {
    component: { type: 'div', props: {}, children: [] },
    actions: new Map(),
    slots: new Map(),
    ...overrides,
  } as CompiledProgram;
}

// ==================== Tests ====================

describe('wrapHtml', () => {
  // ==================== Dark Mode Support ====================

  describe('dark mode class support', () => {
    it('should add dark class to html element when theme is dark', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { theme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when theme is light', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { theme: 'light' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when theme option is not provided', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when options is undefined', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, undefined);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when options is empty object', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = {};

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should generate valid HTML without theme option (3 args)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;

      // Act
      const result = wrapHtml(content, hydrationScript, head);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain(head);
      expect(result).toContain('<body>');
      expect(result).toContain(content);
      expect(result).toContain(hydrationScript);
    });

    it('should generate valid HTML without head and theme option (2 args)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<body>');
      expect(result).toContain(content);
    });

    it('should include meta charset and viewport tags', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<meta charset="utf-8">');
      expect(result).toContain('<meta name="viewport"');
    });

    it('should wrap content in div#app', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain(`<div id="app">${content}</div>`);
    });

    it('should include hydration script in module script tag', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<script type="module">');
      expect(result).toContain(hydrationScript);
      expect(result).toContain('</script>');
    });
  });

  // ==================== Theme Anti-Flash Script Support ====================

  describe('theme anti-flash script support', () => {
    it('should include anti-flash script when themeStorageKey is provided', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { themeStorageKey: 'theme' };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // Should include a blocking script that reads localStorage to prevent flash
      expect(result).toContain('localStorage');
      expect(result).toContain('theme');
      // The anti-flash script should be a blocking script (not type="module")
      expect(result).toMatch(/<script>[\s\S]*localStorage[\s\S]*<\/script>/);
    });

    it('should set dark class on html element when defaultTheme is dark', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { themeStorageKey: 'theme', defaultTheme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // HTML element should have dark class as default
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
    });

    it('should not include anti-flash script when themeStorageKey is not provided', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      // Should not contain localStorage script for theme detection
      expect(result).not.toMatch(/<script>[\s\S]*localStorage[\s\S]*<\/script>/);
    });

    it('should place anti-flash script before body content to prevent FOUC', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { themeStorageKey: 'theme' };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // Anti-flash script should appear before the main content
      const scriptMatch = result.match(/<script>[\s\S]*localStorage[\s\S]*<\/script>/);
      const contentIndex = result.indexOf(content);
      expect(scriptMatch).not.toBeNull();
      const scriptIndex = result.indexOf(scriptMatch![0]);
      expect(scriptIndex).toBeLessThan(contentIndex);
    });

    it('should use custom themeStorageKey in localStorage access', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const customKey = 'my-custom-theme-key';
      const options = { themeStorageKey: customKey };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // Should use the custom key in localStorage.getItem call
      expect(result).toContain(customKey);
    });

    it('should include JSON.parse for localStorage value to handle JSON-serialized themes', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { themeStorageKey: 'theme' };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // localStorage の値は JSON.stringify されているため、JSON.parse が必要
      expect(result).toContain('JSON.parse');
    });

    it('should check cookie before localStorage for theme (SSG/SSR sync)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { themeStorageKey: 'theme' };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // Should include document.cookie in the anti-flash script
      expect(result).toContain('document.cookie');
      // Cookie check should appear before localStorage check
      const cookieIndex = result.indexOf('document.cookie');
      const localStorageIndex = result.indexOf('localStorage');
      expect(cookieIndex).toBeLessThan(localStorageIndex);
    });

    it('should use themeStorageKey for cookie name', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const customKey = 'my-theme';
      const options = { themeStorageKey: customKey };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // Should use the custom key for cookie lookup
      expect(result).toContain(`${customKey}=`);
    });

    it('should fallback to localStorage when cookie is not present', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { themeStorageKey: 'theme' };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      // Should still include localStorage as fallback
      expect(result).toContain('localStorage.getItem');
      // The script should have conditional logic: if no cookie, check localStorage
      expect(result).toMatch(/if\s*\(\s*!theme\s*\)/);
    });
  });

  // ==================== Integration ====================

  describe('integration with theme option', () => {
    it('should work with head content and dark theme', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;
      const options = { theme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, head, options);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
      expect(result).toContain(head);
      expect(result).toContain(content);
      expect(result).toContain(hydrationScript);
    });

    it('should work with head content and light theme', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;
      const options = { theme: 'light' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, head, options);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
      expect(result).toContain(head);
      expect(result).toContain(content);
    });
  });
});

// ==================== generateHydrationScript Tests ====================

describe('generateHydrationScript', () => {
  // ==================== Backward Compatibility ====================

  describe('backward compatibility (without widgets)', () => {
    it('should work without widgets parameter', () => {
      // Arrange
      const program = createMockProgram();

      // Act
      const result = generateHydrationScript(program);

      // Assert
      expect(result).toContain("import { hydrateApp } from '@constela/runtime'");
      expect(result).toContain("document.getElementById('app')");
    });

    it('should not include createApp import when no widgets provided', () => {
      // Arrange
      const program = createMockProgram();

      // Act
      const result = generateHydrationScript(program);

      // Assert
      expect(result).not.toContain('createApp');
    });
  });

  // ==================== Widget Mounting Support ====================

  describe('widget mounting support', () => {
    it('should include createApp import when widgets are provided', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram({
        component: { type: 'span', props: {}, children: ['Widget'] },
      });
      const widgets: WidgetConfig[] = [
        { id: 'code-demo-preview', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain('createApp');
      expect(result).toContain("import { hydrateApp, createApp } from '@constela/runtime'");
    });

    it('should mount widget to specified container element', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'code-demo-preview', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain("document.getElementById('code-demo-preview')");
    });

    it('should include widget program data in the script', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram({
        component: { type: 'div', props: { className: 'widget-test' }, children: [] },
      });
      const widgets: WidgetConfig[] = [
        { id: 'test-widget', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain('widget-test');
    });

    it('should mount multiple widgets when multiple widgets are provided', () => {
      // Arrange
      const program = createMockProgram();
      const widget1Program = createMockProgram();
      const widget2Program = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'widget-1', program: widget1Program },
        { id: 'widget-2', program: widget2Program },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain("document.getElementById('widget-1')");
      expect(result).toContain("document.getElementById('widget-2')");
    });

    it('should handle empty widgets array (no widget mounting)', () => {
      // Arrange
      const program = createMockProgram();
      const widgets: WidgetConfig[] = [];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // Empty array should behave like no widgets
      expect(result).not.toContain('createApp');
    });

    it('should mount widgets after main app hydration', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'my-widget', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // hydrateApp should appear before createApp for widgets
      const hydrateAppIndex = result.indexOf('hydrateApp({');
      const createAppIndex = result.indexOf('createApp(');
      expect(hydrateAppIndex).toBeLessThan(createAppIndex);
    });

    // ==================== Bug Fix: Positional Parameters ====================

    it('should call createApp with positional parameters, not object format', () => {
      // Arrange
      // BUG: Current implementation generates:
      //   createApp({ program: widgetProgram_xxx, container: container_xxx });
      // But createApp() expects positional parameters:
      //   createApp(program, mount)
      const program = createMockProgram();
      const widgetProgram = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'test-widget', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // The generated script should use positional parameters: createApp(widgetProgram_xxx, container_xxx)
      expect(result).toMatch(/createApp\(widgetProgram_\w+,\s*container_\w+\)/);
    });

    it('should NOT use object format for createApp call', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'my-widget', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // The generated script should NOT contain object-style call: createApp({
      expect(result).not.toContain('createApp({');
    });

    it('should generate correct positional createApp call for multiple widgets', () => {
      // Arrange
      const program = createMockProgram();
      const widget1Program = createMockProgram();
      const widget2Program = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'widget-alpha', program: widget1Program },
        { id: 'widget-beta', program: widget2Program },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // Both widget mounts should use positional parameters
      expect(result).toMatch(/createApp\(widgetProgram_widget_alpha,\s*container_widget_alpha\)/);
      expect(result).toMatch(/createApp\(widgetProgram_widget_beta,\s*container_widget_beta\)/);
      // Should not use object format
      expect(result).not.toContain('createApp({');
    });
  });

  // ==================== Dynamic Route Context (Client-Side Extraction) ====================

  describe('dynamic route context for SSG', () => {
    it('should include dynamic query parameter extraction from window.location.search', () => {
      // Arrange
      // When route is provided, the generated script should extract query parameters
      // dynamically from window.location.search instead of statically serializing them.
      // This is critical for SSG where the HTML is pre-built but query params vary per request.
      const program = createMockProgram();
      const route = {
        params: { slug: 'test-page' },
        query: { foo: 'bar' }, // Static query - should be ignored in favor of dynamic extraction
        path: '/docs/test-page',
      };

      // Act
      const result = generateHydrationScript(program, undefined, route);

      // Assert
      // The script should use URLSearchParams(window.location.search) for dynamic query extraction
      expect(result).toContain('URLSearchParams(window.location.search)');
    });

    it('should include dynamic path extraction from window.location.pathname', () => {
      // Arrange
      // When route is provided, the generated script should use window.location.pathname
      // for the path instead of the statically provided path.
      // This ensures the client always uses the actual URL path.
      const program = createMockProgram();
      const route = {
        params: { id: '123' },
        query: {},
        path: '/users/123', // Static path - should be replaced with dynamic extraction
      };

      // Act
      const result = generateHydrationScript(program, undefined, route);

      // Assert
      // The script should reference window.location.pathname for dynamic path extraction
      expect(result).toContain('window.location.pathname');
    });

    it('should preserve static params in the route context', () => {
      // Arrange
      // While query and path should be dynamic, params extracted during SSG build
      // should still be included statically as they are derived from the URL pattern.
      const program = createMockProgram();
      const route = {
        params: { category: 'guides', slug: 'getting-started' },
        query: {},
        path: '/docs/guides/getting-started',
      };

      // Act
      const result = generateHydrationScript(program, undefined, route);

      // Assert
      // Params should be serialized statically
      expect(result).toContain('"category"');
      expect(result).toContain('"guides"');
      expect(result).toContain('"slug"');
      expect(result).toContain('"getting-started"');
    });
  });
});

// ==================== renderPage Tests ====================

describe('renderPage', () => {
  // Import renderPage for testing
  // Note: We need to mock renderToString to verify imports are passed correctly

  describe('importData handling', () => {
    it('should pass program importData to renderToString for import expression evaluation', async () => {
      // This test verifies that renderPage correctly passes importData to renderToString
      // so that import expressions like { expr: 'import', module: 'nav', path: 'topNav' }
      // can be evaluated during SSR.

      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const { renderToString } = await import('@constela/server');
      const { vi } = await import('vitest');

      // Create a program with importData
      const programWithImportData: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'nav',
          children: [
            {
              kind: 'each',
              items: { expr: 'import', name: 'nav', path: 'topNav' },
              as: 'item',
              body: {
                kind: 'element',
                tag: 'a',
                props: {
                  href: { expr: 'var', name: 'item', path: 'href' },
                },
                children: [
                  { kind: 'text', value: { expr: 'var', name: 'item', path: 'label' } },
                ],
              },
            },
          ],
        },
        importData: {
          nav: {
            topNav: [
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
              { label: 'Docs', href: '/docs' },
            ],
          },
        },
      } as unknown as CompiledProgram;

      const ssrContext = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const html = await renderPage(programWithImportData, ssrContext);

      // Assert
      // The HTML should contain the rendered navigation items from importData
      expect(html).toContain('Home');
      expect(html).toContain('About');
      expect(html).toContain('Docs');
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/about"');
      expect(html).toContain('href="/docs"');
    });

    it('should correctly render import expressions in text content', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');

      const programWithImportText: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'footer',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'config', path: 'copyright' },
            },
          ],
        },
        importData: {
          config: {
            copyright: '2024 My Company. All rights reserved.',
          },
        },
      } as unknown as CompiledProgram;

      const ssrContext = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const html = await renderPage(programWithImportText, ssrContext);

      // Assert
      expect(html).toContain('2024 My Company. All rights reserved.');
    });

    it('should correctly render import expressions in element props', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');

      const programWithImportProps: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'a',
          props: {
            href: { expr: 'import', name: 'links', path: 'repoUrl' },
            class: { expr: 'lit', value: 'repo-link' },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'GitHub' } },
          ],
        },
        importData: {
          links: {
            repoUrl: 'https://github.com/example/repo',
          },
        },
      } as unknown as CompiledProgram;

      const ssrContext = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const html = await renderPage(programWithImportProps, ssrContext);

      // Assert
      expect(html).toContain('href="https://github.com/example/repo"');
      expect(html).toContain('GitHub');
    });

    it('should handle nested import paths correctly', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');

      const programWithNestedImport: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'import', name: 'settings', path: 'theme.primaryColor' },
            },
          ],
        },
        importData: {
          settings: {
            theme: {
              primaryColor: '#3b82f6',
              secondaryColor: '#10b981',
            },
          },
        },
      } as unknown as CompiledProgram;

      const ssrContext = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const html = await renderPage(programWithNestedImport, ssrContext);

      // Assert
      expect(html).toContain('#3b82f6');
    });

    it('should work when program has no importData', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');

      const programWithoutImportData: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Static content' } },
          ],
        },
        // No importData
      } as unknown as CompiledProgram;

      const ssrContext = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const html = await renderPage(programWithoutImportData, ssrContext);

      // Assert
      expect(html).toContain('Static content');
    });
  });
});
