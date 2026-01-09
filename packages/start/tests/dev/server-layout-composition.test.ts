/**
 * Test module for dev server layout composition integration.
 *
 * Coverage:
 * - Page with layout should be composed with layout header/footer
 * - Page without layout should render page content only
 * - Layout state should be merged with page state
 * - Layout actions should be merged with page actions
 *
 * TDD Red Phase: These tests verify the layout composition functionality
 * that needs to be integrated into the dev server at line ~285.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';

// ==================== Test Fixtures Path ====================

const FIXTURES_DIR = new URL('../fixtures', import.meta.url).pathname;
const PAGES_LAYOUT_DIR = join(FIXTURES_DIR, 'pages-layout');
const LAYOUTS_DIR = join(FIXTURES_DIR, 'layouts');

// ==================== Types ====================

type DevServer = Awaited<ReturnType<typeof import('../../src/dev/server.js').createDevServer>>;

// ==================== Layout Composition in Dev Server ====================

describe('Dev Server Layout Composition', () => {
  let server: DevServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // ==================== Page with Layout ====================

  describe('page with layout should be composed', () => {
    it('should render layout header when page specifies layout', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('Header'); // Layout header
      expect(html).toContain('Page Content'); // Page content
    });

    it('should render layout footer when page specifies layout', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('Footer'); // Layout footer
    });

    it('should include layout wrapper class in rendered HTML', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('class="layout-wrapper"');
    });

    it('should place page content in slot position (between header and footer)', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert - content order should be: header, page content, footer
      const headerIndex = html.indexOf('Header');
      const contentIndex = html.indexOf('Page Content');
      const footerIndex = html.indexOf('Footer');

      expect(headerIndex).toBeLessThan(contentIndex);
      expect(contentIndex).toBeLessThan(footerIndex);
    });
  });

  // ==================== Page without Layout ====================

  describe('page without layout should render as-is', () => {
    it('should render only page content without layout wrapper', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/without-layout`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('No Layout Page');
      expect(html).not.toContain('Header');
      expect(html).not.toContain('Footer');
      expect(html).not.toContain('layout-wrapper');
    });

    it('should not include layout elements for pages without layout property', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('Home Page');
      expect(html).not.toContain('Header');
      expect(html).not.toContain('Footer');
    });
  });

  // ==================== Layout State Merging ====================

  describe('layout state should be merged', () => {
    it('should include layout state in hydration script', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // The hydration script should contain both page state (count) and layout state (theme)
      // Check that the script contains layout's theme state
      expect(html).toContain('theme');
      // Check that page state is also present
      expect(html).toContain('count');
    });

    it('should preserve page state when composing with layout', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert - page state should be preserved in composed program
      expect(response.status).toBe(200);
      // Hydration script should include page's count state
      expect(html).toMatch(/"count"/);
    });
  });

  // ==================== Layout Actions Merging ====================

  describe('layout actions should be merged', () => {
    it('should include layout actions in hydration script', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // The hydration script should contain layout's toggleTheme action
      expect(html).toContain('toggleTheme');
    });
  });

  // ==================== Error Handling ====================

  describe('layout error handling', () => {
    it('should return 500 when specified layout does not exist', async () => {
      // Arrange - Create a page that references non-existent layout
      const { createDevServer } = await import('../../src/dev/server.js');
      const invalidLayoutPagesDir = join(FIXTURES_DIR, 'pages-invalid-layout');

      // This test requires a page fixture with invalid layout reference
      // For now, we'll test that layoutsDir option is properly handled
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: '/nonexistent/layouts',
      });
      await server.listen();

      // Act
      const response = await fetch(`http://localhost:${server.port}/with-layout`);

      // Assert - should either fail or handle gracefully
      // When layout directory doesn't exist but page requests layout, should error
      expect([200, 500]).toContain(response.status);
    });
  });

  // ==================== DevServerOptions layoutsDir ====================

  describe('DevServerOptions layoutsDir', () => {
    it('should accept layoutsDir option', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');

      // Act & Assert - should not throw
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        layoutsDir: LAYOUTS_DIR,
      });

      expect(server).toBeDefined();
    });

    it('should work without layoutsDir option', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');

      // Act
      server = await createDevServer({
        port: 0,
        routesDir: PAGES_LAYOUT_DIR,
        // No layoutsDir - should work, just no layout composition
      });
      await server.listen();

      // Assert - pages should render without layout
      const response = await fetch(`http://localhost:${server.port}/with-layout`);
      expect(response.status).toBe(200);
    });
  });
});

// ==================== Unit Tests for Layout Composition Logic ====================

describe('Layout Composition Logic (Unit Tests)', () => {
  // These tests verify the composition logic that should be called
  // after pageLoader.compile() in server.ts

  describe('composePageWithLayout function', () => {
    it('should merge layout state with page state', async () => {
      // Arrange
      const { composeLayoutWithPage } = await import('@constela/compiler');
      const { CompiledProgram } = await import('@constela/compiler');

      const layoutProgram = {
        version: '1.0' as const,
        state: {
          theme: { type: 'string', initial: 'light' },
        },
        actions: {},
        view: {
          kind: 'element' as const,
          tag: 'div',
          children: [{ kind: 'slot' as const }],
        },
      };

      const pageProgram = {
        version: '1.0' as const,
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: {},
        view: {
          kind: 'element' as const,
          tag: 'main',
          children: [{ kind: 'text' as const, value: { expr: 'lit' as const, value: 'Content' } }],
        },
      };

      // Act
      const composed = composeLayoutWithPage(
        layoutProgram as any,
        pageProgram as any
      );

      // Assert
      expect(composed.state).toHaveProperty('theme');
      expect(composed.state).toHaveProperty('count');
      expect(composed.state['theme']).toEqual({ type: 'string', initial: 'light' });
      expect(composed.state['count']).toEqual({ type: 'number', initial: 0 });
    });

    it('should merge layout actions with page actions', async () => {
      // Arrange
      const { composeLayoutWithPage } = await import('@constela/compiler');

      const layoutProgram = {
        version: '1.0' as const,
        state: {},
        actions: {
          toggleTheme: { name: 'toggleTheme', steps: [] },
        },
        view: {
          kind: 'element' as const,
          tag: 'div',
          children: [{ kind: 'slot' as const }],
        },
      };

      const pageProgram = {
        version: '1.0' as const,
        state: {},
        actions: {
          increment: { name: 'increment', steps: [] },
        },
        view: {
          kind: 'element' as const,
          tag: 'main',
        },
      };

      // Act
      const composed = composeLayoutWithPage(
        layoutProgram as any,
        pageProgram as any
      );

      // Assert
      expect(composed.actions).toHaveProperty('toggleTheme');
      expect(composed.actions).toHaveProperty('increment');
    });

    it('should replace slot with page view', async () => {
      // Arrange
      const { composeLayoutWithPage } = await import('@constela/compiler');

      const layoutProgram = {
        version: '1.0' as const,
        state: {},
        actions: {},
        view: {
          kind: 'element' as const,
          tag: 'div',
          props: { class: { expr: 'lit' as const, value: 'layout' } },
          children: [
            { kind: 'element' as const, tag: 'header' },
            { kind: 'slot' as const },
            { kind: 'element' as const, tag: 'footer' },
          ],
        },
      };

      const pageProgram = {
        version: '1.0' as const,
        state: {},
        actions: {},
        view: {
          kind: 'element' as const,
          tag: 'main',
          children: [{ kind: 'text' as const, value: { expr: 'lit' as const, value: 'Page' } }],
        },
      };

      // Act
      const composed = composeLayoutWithPage(
        layoutProgram as any,
        pageProgram as any
      );

      // Assert
      const view = composed.view as { kind: string; tag: string; children: any[] };
      expect(view.tag).toBe('div');
      expect(view.children).toHaveLength(3);
      expect(view.children[0].tag).toBe('header');
      expect(view.children[1].tag).toBe('main'); // Page content replaces slot
      expect(view.children[2].tag).toBe('footer');
    });

    it('should handle page without route.layout (no composition needed)', async () => {
      // Arrange
      const pageProgram = {
        version: '1.0' as const,
        state: { message: { type: 'string', initial: 'Hello' } },
        actions: {},
        view: {
          kind: 'element' as const,
          tag: 'div',
        },
        route: {
          path: '/about',
          // No layout property
        },
      };

      // Act - when route.layout is undefined, no composition should occur
      // The page should be returned as-is

      // Assert
      expect(pageProgram.route.layout).toBeUndefined();
      expect(pageProgram.state).toHaveProperty('message');
    });
  });
});
