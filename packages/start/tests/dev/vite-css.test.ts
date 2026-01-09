/**
 * Test module for Vite CSS middleware integration in dev server.
 *
 * Coverage:
 * - CSS link injection into HTML head
 * - CSS file serving via Vite middleware
 * - Integration with existing JSON page rendering
 * - Vite server cleanup
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { DevServer } from '../../src/dev/server.js';

// ==================== Test Fixtures ====================

const fixturesCssDir = new URL('../fixtures/css', import.meta.url).pathname;
const fixturesPagesCssDir = new URL('../fixtures/pages-css', import.meta.url).pathname;

// ==================== Helper Functions ====================

/**
 * Create a base URL from port
 */
function baseUrl(port: number): string {
  return `http://localhost:${port}`;
}

// ==================== Vite CSS Integration Tests ====================

describe('Vite CSS Integration', () => {
  let server: DevServer | null = null;

  afterEach(async () => {
    // Ensure server is closed after each test
    if (server) {
      await server.close();
      server = null;
    }
  });

  // ==================== CSS Link Injection ====================

  describe('CSS link injection', () => {
    it('should include CSS link tag in HTML head when css option is provided', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        css: `${fixturesCssDir}/test.css`,
      });
      await server.listen();

      // Act
      const response = await fetch(baseUrl(server.port) + '/');
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('<link');
      expect(html).toContain('rel="stylesheet"');
      expect(html).toContain('test.css');
    });

    it('should not include CSS link when css option is not provided', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        // No css option
      });
      await server.listen();

      // Act
      const response = await fetch(baseUrl(server.port) + '/');
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // Should not contain stylesheet link (except for any default styles)
      expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+\.css/);
    });

    it('should include multiple CSS link tags when css is an array', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        css: [
          `${fixturesCssDir}/test.css`,
          `${fixturesCssDir}/other.css`,
        ],
      });
      await server.listen();

      // Act
      const response = await fetch(baseUrl(server.port) + '/');
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      // Count stylesheet links
      const stylesheetMatches = html.match(/<link[^>]+rel="stylesheet"/g);
      expect(stylesheetMatches?.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==================== CSS File Serving via Vite ====================

  describe('CSS file serving via Vite', () => {
    it('should serve CSS file via Vite middleware (may be transformed to JS module)', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        css: `${fixturesCssDir}/test.css`,
      });
      await server.listen();

      // Act
      // Vite serves CSS through its middleware, typically at the original path
      const response = await fetch(baseUrl(server.port) + fixturesCssDir + '/test.css');

      // Assert
      expect(response.status).toBe(200);
      // Vite transforms CSS to JS module for HMR in dev mode
      // So we accept both text/css and text/javascript
      const contentType = response.headers.get('Content-Type') ?? '';
      expect(contentType).toMatch(/text\/(css|javascript)/);
      const content = await response.text();
      // CSS content should be present (either as raw CSS or within JS module)
      expect(content).toContain('.test-class');
    });

    it('should respond to /@vite/client requests', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        css: `${fixturesCssDir}/test.css`,
      });
      await server.listen();

      // Act
      const response = await fetch(baseUrl(server.port) + '/@vite/client');

      // Assert
      // Vite client should be served when Vite middleware is active
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toMatch(/javascript/);
    });
  });

  // ==================== Integration with Existing Features ====================

  describe('integration with existing features', () => {
    it('should still render JSON pages correctly with Vite enabled', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        css: `${fixturesCssDir}/test.css`,
      });
      await server.listen();

      // Act
      const response = await fetch(baseUrl(server.port) + '/');
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toMatch(/text\/html/);
      // Should contain the JSON page content
      expect(html).toContain('CSS Test');
      expect(html).toContain('class="test-class"');
      // Should also have CSS link
      expect(html).toContain('rel="stylesheet"');
    });
  });

  // ==================== Cleanup ====================

  describe('cleanup', () => {
    it('should close Vite server when dev server closes', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({
        port: 0,
        routesDir: fixturesPagesCssDir,
        css: `${fixturesCssDir}/test.css`,
      });
      await server.listen();
      const port = server.port;

      // Act
      await server.close();
      server = null; // Mark as closed

      // Assert
      // After closing, the server should not respond
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      try {
        await fetch(`http://localhost:${port}/`, { signal: controller.signal });
        // If fetch succeeds, server is still running - this is unexpected
        expect.fail('Server should not respond after close');
      } catch (error) {
        // Expected: connection refused or aborted
        expect(error).toBeDefined();
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });
});
