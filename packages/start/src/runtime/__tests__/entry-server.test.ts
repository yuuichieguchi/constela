/**
 * Test suite for entry-server.ts
 *
 * Coverage:
 * - generateHydrationScript: Default behavior (no HMR)
 * - generateHydrationScript: HMR-enabled behavior (hmrUrl provided)
 * - generateHydrationScript: Widget mounting with HMR
 * - generateHydrationScript: Route context with HMR
 * - wrapHtml: Theme integration (themeConfig, themeCookie)
 */

import { describe, it, expect } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';
import type { ThemeConfig, ColorScheme } from '@constela/core';
import { generateHydrationScript, wrapHtml } from '../entry-server.js';

// ==================== Test Fixtures ====================

function createMinimalProgram(): CompiledProgram {
  return {
    view: {
      node: 'element',
      tag: 'div',
      children: [{ node: 'text', value: 'Hello' }],
    },
    state: {},
    actions: {},
  } as CompiledProgram;
}

function createWidgetProgram(): CompiledProgram {
  return {
    view: {
      node: 'element',
      tag: 'span',
      children: [{ node: 'text', value: 'Widget' }],
    },
    state: {},
    actions: {},
  } as CompiledProgram;
}

// ==================== Tests: Default Behavior (no hmrUrl) ====================

describe('generateHydrationScript', () => {
  describe('when hmrUrl is NOT provided', () => {
    it('should import only hydrateApp from @constela/runtime', () => {
      // Arrange
      const program = createMinimalProgram();

      // Act
      const script = generateHydrationScript(program);

      // Assert
      expect(script).toContain("import { hydrateApp } from '@constela/runtime'");
      expect(script).not.toContain('createHMRClient');
      expect(script).not.toContain('createHMRHandler');
      expect(script).not.toContain('createErrorOverlay');
    });

    it('should call hydrateApp directly', () => {
      // Arrange
      const program = createMinimalProgram();

      // Act
      const script = generateHydrationScript(program);

      // Assert
      expect(script).toContain('hydrateApp(');
      expect(script).not.toContain('handler.handleUpdate');
      expect(script).not.toContain('client.connect');
    });

    it('should include both hydrateApp and createApp when widgets are provided', () => {
      // Arrange
      const program = createMinimalProgram();
      const widgets = [{ id: 'my-widget', program: createWidgetProgram() }];

      // Act
      const script = generateHydrationScript(program, widgets);

      // Assert
      expect(script).toContain("import { hydrateApp, createApp } from '@constela/runtime'");
    });
  });

  // ==================== Tests: HMR Behavior (hmrUrl provided) ====================

  describe('when hmrUrl is provided', () => {
    it('should import HMR-related functions from @constela/runtime', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createHMRClient');
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('createErrorOverlay');
    });

    it('should create HMR client with the provided URL', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createHMRClient');
      expect(script).toContain('ws://localhost:3001');
    });

    it('should create error overlay', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createErrorOverlay()');
    });

    it('should create HMR handler with container and program', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createHMRHandler');
      expect(script).toContain("container: document.getElementById('app')");
      expect(script).toContain('program');
    });

    it('should call client.connect()', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toMatch(/client\.connect\(\)/);
    });

    it('should setup onUpdate handler to call handler.handleUpdate', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('onUpdate');
      expect(script).toContain('handleUpdate');
    });

    it('should setup onError handler to show error overlay', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('onError');
      expect(script).toContain('overlay.show');
    });

    it('should still call hydrateApp for initial hydration', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      // HMR mode should still hydrate the app initially
      expect(script).toContain('hydrateApp');
    });
  });

  // ==================== Tests: HMR skipInitialRender Option ====================

  describe('when hmrUrl is provided (skipInitialRender)', () => {
    it('should include skipInitialRender: true in HMR handler options', () => {
      /**
       * Given: Program and hmrUrl for HMR-enabled hydration
       * When: generateHydrationScript is called
       * Then: The generated script should include skipInitialRender: true
       *       in the createHMRHandler options
       *
       * This is necessary because hydrateApp() handles the initial rendering,
       * so the HMR handler should NOT render the initial app to avoid
       * double rendering.
       */
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      // The createHMRHandler call should include skipInitialRender: true
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('skipInitialRender: true');
    });

    it('should include skipInitialRender: true with route context', () => {
      /**
       * Given: Program, route context, and hmrUrl
       * When: generateHydrationScript is called
       * Then: The generated script should include both route and skipInitialRender: true
       */
      // Arrange
      const program = createMinimalProgram();
      const route = { params: { id: '123' }, query: { q: 'test' }, path: '/items/123' };
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, route, hmrUrl);

      // Assert
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('skipInitialRender: true');
      expect(script).toContain('route');
    });
  });

  // ==================== Tests: HMR with Route Context ====================

  describe('when hmrUrl is provided with route context', () => {
    it('should pass route context to HMR handler', () => {
      // Arrange
      const program = createMinimalProgram();
      const route = { params: { id: '123' }, query: { q: 'test' }, path: '/items/123' };
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, route, hmrUrl);

      // Assert
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('route');
    });
  });

  // ==================== Tests: HMR with Widgets ====================

  describe('when hmrUrl is provided with widgets', () => {
    it('should include createApp for widget mounting along with HMR imports', () => {
      // Arrange
      const program = createMinimalProgram();
      const widgets = [{ id: 'sidebar', program: createWidgetProgram() }];
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, widgets, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createApp');
      expect(script).toContain('createHMRClient');
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('createErrorOverlay');
    });

    it('should still mount widgets in HMR mode', () => {
      // Arrange
      const program = createMinimalProgram();
      const widgets = [{ id: 'sidebar', program: createWidgetProgram() }];
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, widgets, undefined, hmrUrl);

      // Assert
      expect(script).toContain("document.getElementById('sidebar')");
      expect(script).toContain('widgetProgram_sidebar');
    });
  });

  // ==================== Tests: Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty hmrUrl string as no HMR', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = '';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert - empty string should be treated as falsy, no HMR
      expect(script).not.toContain('createHMRClient');
      expect(script).toContain("import { hydrateApp } from '@constela/runtime'");
    });

    it('should escape special characters in hmrUrl', () => {
      // Arrange
      const program = createMinimalProgram();
      // URL with query params that could cause issues if not properly escaped
      const hmrUrl = "ws://localhost:3001?token=abc'123";

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert - should not break the script
      expect(script).toContain('createHMRClient');
      // The single quote should be escaped
      expect(script).not.toContain("'abc'123'"); // This would break
    });
  });
});

// ==================== Tests: wrapHtml Theme Integration ====================

describe('wrapHtml theme integration', () => {
  // ==================== Test Fixtures ====================

  function createThemeConfig(): ThemeConfig {
    return {
      mode: 'light',
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#1f2937',
      },
      darkColors: {
        primary: '#60a5fa',
        background: '#0f172a',
        foreground: '#f8fafc',
      },
      fonts: {
        sans: 'Inter, sans-serif',
      },
      cssPrefix: 'app',
    };
  }

  // ==================== Happy Path ====================

  it('should inject theme CSS from themeConfig', () => {
    /**
     * Given: WrapHtmlOptions with themeConfig containing colors
     * When: wrapHtml is called
     * Then: Output contains <style> with CSS variables
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
      },
    };

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
    });

    // Assert
    expect(html).toContain('<style>');
    expect(html).toContain('--primary: #3b82f6');
    expect(html).toContain('--background: #ffffff');
  });

  it('should inject theme CSS in head before other content', () => {
    /**
     * Given: WrapHtmlOptions with themeConfig and custom head content
     * When: wrapHtml is called
     * Then: CSS should be in <head>, before the user-provided head content
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const customHead = '<link rel="stylesheet" href="/custom.css">';
    const themeConfig: ThemeConfig = {
      colors: { primary: '#3b82f6' },
    };

    // Act
    const html = wrapHtml(content, hydrationScript, customHead, {
      themeConfig,
    });

    // Assert
    const styleIndex = html.indexOf('<style>');
    const customHeadIndex = html.indexOf(customHead);
    expect(styleIndex).toBeGreaterThan(-1);
    expect(customHeadIndex).toBeGreaterThan(-1);
    expect(styleIndex).toBeLessThan(customHeadIndex);
  });

  it('should set dark class when themeConfig.mode is dark', () => {
    /**
     * Given: themeConfig with mode: 'dark'
     * When: wrapHtml is called
     * Then: html tag should have class="dark"
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      mode: 'dark',
      colors: { primary: '#3b82f6' },
    };

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
    });

    // Assert
    expect(html).toMatch(/<html[^>]*class="dark"/);
  });

  it('should prioritize themeCookie over themeConfig.mode', () => {
    /**
     * Given: themeCookie is 'light' but themeConfig.mode is 'dark'
     * When: wrapHtml is called
     * Then: html should NOT have dark class (cookie takes precedence)
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      mode: 'dark',
      colors: { primary: '#3b82f6' },
    };
    const themeCookie: ColorScheme = 'light';

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
      themeCookie,
    });

    // Assert
    expect(html).not.toMatch(/<html[^>]*class="dark"/);
  });

  it('should apply dark class when themeCookie is dark', () => {
    /**
     * Given: themeCookie is 'dark' and themeConfig.mode is 'light'
     * When: wrapHtml is called
     * Then: html should have dark class (cookie takes precedence)
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      mode: 'light',
      colors: { primary: '#3b82f6' },
    };
    const themeCookie: ColorScheme = 'dark';

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
      themeCookie,
    });

    // Assert
    expect(html).toMatch(/<html[^>]*class="dark"/);
  });

  it('should generate FOUC prevention script when themeConfig provided', () => {
    /**
     * Given: themeConfig is provided
     * When: wrapHtml is called
     * Then: Script should be in head to prevent flash of unstyled content
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      colors: { primary: '#3b82f6' },
    };

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
    });

    // Assert
    // FOUC script should be in head, checking for localStorage theme
    expect(html).toMatch(/<head>[\s\S]*<script>[\s\S]*localStorage[\s\S]*<\/script>[\s\S]*<\/head>/);
  });

  it('should use cssPrefix from themeConfig', () => {
    /**
     * Given: themeConfig with cssPrefix: 'app'
     * When: wrapHtml is called
     * Then: CSS variables should be prefixed with 'app-'
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      colors: { primary: '#3b82f6' },
      cssPrefix: 'app',
    };

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
    });

    // Assert
    expect(html).toContain('--app-primary: #3b82f6');
  });

  // ==================== Edge Cases ====================

  it('should handle themeConfig without colors', () => {
    /**
     * Given: themeConfig with only fonts (no colors)
     * When: wrapHtml is called
     * Then: Should only generate font CSS variables
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      fonts: { sans: 'Inter, sans-serif' },
    };

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
    });

    // Assert
    expect(html).toContain('--font-sans: Inter, sans-serif');
    expect(html).not.toContain('--primary');
  });

  it('should generate dark mode CSS variables', () => {
    /**
     * Given: themeConfig with both colors and darkColors
     * When: wrapHtml is called
     * Then: Should generate both :root and .dark CSS rules
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      colors: { primary: '#3b82f6' },
      darkColors: { primary: '#60a5fa' },
    };

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
    });

    // Assert
    expect(html).toContain(':root {');
    expect(html).toContain('.dark {');
    expect(html).toContain('--primary: #3b82f6');
    expect(html).toContain('--primary: #60a5fa');
  });

  it('should not inject theme CSS when themeConfig is undefined', () => {
    /**
     * Given: No themeConfig provided
     * When: wrapHtml is called
     * Then: Should not contain theme-related <style> tag
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {});

    // Assert
    // Should not have theme CSS (existing behavior preserved)
    expect(html).not.toMatch(/<style>[\s\S]*:root[\s\S]*<\/style>/);
  });

  it('should handle themeCookie system value', () => {
    /**
     * Given: themeCookie is 'system'
     * When: wrapHtml is called
     * Then: Should not apply dark class (let client handle system preference)
     */
    // Arrange
    const content = '<div>Hello</div>';
    const hydrationScript = 'hydrateApp({});';
    const themeConfig: ThemeConfig = {
      mode: 'dark',
      colors: { primary: '#3b82f6' },
    };
    const themeCookie: ColorScheme = 'system';

    // Act
    const html = wrapHtml(content, hydrationScript, undefined, {
      themeConfig,
      themeCookie,
    });

    // Assert
    // 'system' should not apply dark class - let FOUC script handle it
    expect(html).not.toMatch(/<html[^>]*class="dark"/);
  });
});
