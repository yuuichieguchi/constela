/**
 * Test module for theme persistence in Edge runtime adapter.
 *
 * Coverage:
 * - Theme state detection from CompiledProgram
 * - wrapHtml receives theme options when program has theme state
 * - Anti-flash script generation for theme persistence in edge runtime
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScannedRoute, APIModule, APIContext } from '../../src/types.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Program with dark theme state
 */
const programWithDarkTheme: CompiledProgram = {
  version: '1.0',
  state: {
    theme: { type: 'string', initial: 'dark' },
    title: { type: 'string', initial: 'Themed Page' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'state', name: 'title' } }],
  },
};

/**
 * Program with light theme state
 */
const programWithLightTheme: CompiledProgram = {
  version: '1.0',
  state: {
    theme: { type: 'string', initial: 'light' },
    title: { type: 'string', initial: 'Light Themed Page' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'state', name: 'title' } }],
  },
};

/**
 * Program without theme state
 */
const programWithoutTheme: CompiledProgram = {
  version: '1.0',
  state: {
    title: { type: 'string', initial: 'No Theme Page' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'state', name: 'title' } }],
  },
};

/**
 * Mock page module with dark theme
 */
const mockDarkThemePageModule = {
  default: programWithDarkTheme,
};

/**
 * Mock page module with light theme
 */
const mockLightThemePageModule = {
  default: programWithLightTheme,
};

/**
 * Mock page module without theme
 */
const mockNoThemePageModule = {
  default: programWithoutTheme,
};

/**
 * Sample scanned routes for theme testing
 */
const themeTestRoutes: ScannedRoute[] = [
  {
    file: '/routes/themed.page.ts',
    pattern: '/themed',
    type: 'page',
    params: [],
  },
  {
    file: '/routes/no-theme.page.ts',
    pattern: '/no-theme',
    type: 'page',
    params: [],
  },
];

// ==================== Edge Adapter Theme Tests ====================

describe('Edge Adapter Theme Persistence', () => {
  // ==================== Theme State Detection ====================

  describe('theme state detection', () => {
    it('should include anti-flash script when program has dark theme state', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockDarkThemePageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: themeTestRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/themed');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // Anti-flash script should read from localStorage
      expect(html).toContain("localStorage.getItem('theme')");
      // Should include classList manipulation for theme
      expect(html).toContain("document.documentElement.classList");
    });

    it('should include anti-flash script when program has light theme state', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockLightThemePageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: themeTestRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/themed');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain("localStorage.getItem('theme')");
    });

    it('should NOT include anti-flash script when program has NO theme state', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockNoThemePageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: themeTestRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/no-theme');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // No theme state should mean no anti-flash script
      expect(html).not.toContain("localStorage.getItem('theme')");
    });
  });

  // ==================== HTML Class Attribute ====================

  describe('HTML class attribute', () => {
    it('should add dark class to html element when defaultTheme is dark', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockDarkThemePageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: themeTestRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/themed');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('<html class="dark">');
    });

    it('should NOT add dark class when defaultTheme is light', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockLightThemePageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: themeTestRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/themed');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // Light theme should not have dark class
      expect(html).toContain('<html>');
      expect(html).not.toContain('<html class="dark">');
    });

    it('should NOT add dark class when no theme state exists', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockNoThemePageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: themeTestRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/no-theme');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).not.toContain('<html class="dark">');
    });
  });

  // ==================== Platform Consistency ====================

  describe('platform consistency', () => {
    const platforms = ['cloudflare', 'vercel', 'deno', 'node'] as const;

    platforms.forEach((platform) => {
      it(`should generate anti-flash script on ${platform} platform`, async () => {
        // Arrange
        const { createAdapter } = await import('../../src/edge/adapter.js');
        const moduleLoader = vi.fn().mockResolvedValue(mockDarkThemePageModule);
        const adapter = createAdapter({
          platform,
          routes: themeTestRoutes,
          loadModule: moduleLoader,
        });
        const request = new Request('http://localhost/themed');

        // Act
        const response = await adapter.fetch(request);
        const html = await response.text();

        // Assert
        expect(response.status).toBe(200);
        expect(html).toContain("localStorage.getItem('theme')");
      });
    });
  });
});
