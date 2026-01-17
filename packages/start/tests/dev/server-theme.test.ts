/**
 * Test module for theme persistence in development server.
 *
 * Coverage:
 * - Theme state detection from CompiledProgram
 * - wrapHtml receives themeStorageKey when theme state is present
 * - Anti-flash script generation for theme persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Program with theme state (dark initial)
 */
const programWithDarkTheme: CompiledProgram = {
  version: '1.0',
  state: {
    theme: { type: 'string', initial: 'dark' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Themed App' } }],
  },
};

/**
 * Program with theme state (light initial)
 */
const programWithLightTheme: CompiledProgram = {
  version: '1.0',
  state: {
    theme: { type: 'string', initial: 'light' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Themed App' } }],
  },
};

/**
 * Program without theme state
 */
const programWithoutTheme: CompiledProgram = {
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'No Theme App' } }],
  },
};

// ==================== wrapHtml Theme Options Tests ====================

describe('wrapHtml theme options', () => {
  // ==================== Anti-Flash Script Generation ====================

  describe('anti-flash script generation', () => {
    it('should generate anti-flash script when themeStorageKey is provided', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = 'console.log("test")';

      // Act
      const result = wrapHtml(content, script, '', {
        themeStorageKey: 'theme',
        defaultTheme: 'dark',
      });

      // Assert
      expect(result).toContain("localStorage.getItem('theme')");
      expect(result).toContain("document.documentElement.classList.add('dark')");
    });

    it('should NOT generate anti-flash script when themeStorageKey is NOT provided', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = 'console.log("test")';

      // Act
      const result = wrapHtml(content, script, '', {
        theme: 'dark', // Only theme, no themeStorageKey
      });

      // Assert
      expect(result).not.toContain("localStorage.getItem");
      expect(result).toContain('class="dark"'); // Should still have dark class
    });
  });
});

// ==================== Dev Server Theme Integration Tests ====================

describe('Dev Server Theme Integration', () => {
  let server: Awaited<ReturnType<typeof import('../../src/dev/server.js').createDevServer>> | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // ==================== Theme State Detection ====================

  describe('theme state detection', () => {
    it('should include anti-flash script when page has theme state with dark initial', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      const fixturesDir = new URL('../fixtures/pages', import.meta.url).pathname;
      server = await createDevServer({
        port: 0,
        routesDir: fixturesDir,
      });
      await server.listen();

      // Act
      // This test requires a fixture with theme state
      const response = await fetch(`http://localhost:${server.port}/page-with-theme`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // The anti-flash script should be present to prevent theme flash
      expect(html).toContain("localStorage.getItem('theme')");
      expect(html).toContain("document.documentElement.classList");
    });

    it('should include anti-flash script when page has theme state with light initial', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      const fixturesDir = new URL('../fixtures/pages', import.meta.url).pathname;
      server = await createDevServer({
        port: 0,
        routesDir: fixturesDir,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/page-with-light-theme`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain("localStorage.getItem('theme')");
    });

    it('should NOT include anti-flash script when page has NO theme state', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      const fixturesDir = new URL('../fixtures/pages', import.meta.url).pathname;
      server = await createDevServer({
        port: 0,
        routesDir: fixturesDir,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/page-without-widgets`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // No theme state means no anti-flash script
      expect(html).not.toContain("localStorage.getItem('theme')");
    });

    it('should pass defaultTheme option to wrapHtml when initialTheme exists', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      const fixturesDir = new URL('../fixtures/pages', import.meta.url).pathname;
      server = await createDevServer({
        port: 0,
        routesDir: fixturesDir,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/page-with-theme`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // The HTML element should have dark class when defaultTheme is dark
      expect(html).toContain('<html class="dark">');
    });
  });
});
