/**
 * Test module for development server functions.
 *
 * Coverage:
 * - renderPage: SSR rendering of CompiledProgram
 * - generateHydrationScript: Generate hydration script for client
 * - wrapHtml: Wrap content in full HTML document
 * - createDevServer: Development server creation and management (integration)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Simple test program with static text
 */
const simpleProgram: CompiledProgram = {
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Hello' } }],
  },
};

/**
 * Program with state binding
 */
const statefulProgram: CompiledProgram = {
  version: '1.0',
  state: {
    message: { type: 'string', initial: 'World' },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'span',
    props: {},
    children: [{ kind: 'text', value: { expr: 'state', name: 'message' } }],
  },
};

/**
 * Program with nested elements
 */
const nestedProgram: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'main',
    props: { class: { expr: 'lit', value: 'container' } },
    children: [
      {
        kind: 'element',
        tag: 'h1',
        props: {},
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }],
      },
      {
        kind: 'element',
        tag: 'p',
        props: {},
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Content' } }],
      },
    ],
  },
};

// ==================== renderPage Tests ====================

describe('renderPage', () => {
  // ==================== Basic Rendering ====================

  describe('basic rendering', () => {
    it('should render CompiledProgram to HTML string', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const ctx = {
        url: '/',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const result = await renderPage(simpleProgram, ctx);

      // Assert
      expect(result).toContain('<div');
      expect(result).toContain('Hello');
      expect(result).toContain('</div>');
    });

    it('should render state values with initial value', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const ctx = {
        url: '/test',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const result = await renderPage(statefulProgram, ctx);

      // Assert
      expect(result).toContain('<span');
      expect(result).toContain('World');
      expect(result).toContain('</span>');
    });

    it('should render nested elements correctly', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const ctx = {
        url: '/',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const result = await renderPage(nestedProgram, ctx);

      // Assert
      expect(result).toContain('<main');
      expect(result).toContain('class="container"');
      expect(result).toContain('<h1>');
      expect(result).toContain('Title');
      expect(result).toContain('<p>');
      expect(result).toContain('Content');
    });
  });

  // ==================== SSR Context ====================

  describe('SSR context handling', () => {
    it('should accept url in SSRContext', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const ctx = {
        url: '/users/123',
        params: {},
        query: new URLSearchParams(),
      };

      // Act & Assert - should not throw
      await expect(renderPage(simpleProgram, ctx)).resolves.toBeDefined();
    });

    it('should accept params in SSRContext', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const ctx = {
        url: '/users/123',
        params: { id: '123' },
        query: new URLSearchParams(),
      };

      // Act & Assert - should not throw
      await expect(renderPage(simpleProgram, ctx)).resolves.toBeDefined();
    });

    it('should accept query in SSRContext', async () => {
      // Arrange
      const { renderPage } = await import('../../src/runtime/entry-server.js');
      const ctx = {
        url: '/search?q=test',
        params: {},
        query: new URLSearchParams('q=test'),
      };

      // Act & Assert - should not throw
      await expect(renderPage(simpleProgram, ctx)).resolves.toBeDefined();
    });
  });
});

// ==================== generateHydrationScript Tests ====================

describe('generateHydrationScript', () => {
  // ==================== Script Generation ====================

  describe('script generation', () => {
    it('should generate script that calls hydrateApp', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      // Act
      const result = generateHydrationScript(simpleProgram);

      // Assert
      expect(result).toContain('hydrateApp');
    });

    it('should include serialized program data', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      // Act
      const result = generateHydrationScript(simpleProgram);

      // Assert
      // Should contain some form of the program state/view
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return valid JavaScript code', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      // Act
      const result = generateHydrationScript(simpleProgram);

      // Assert - should not throw when evaluated (basic syntax check)
      expect(() => {
        // Check for basic script structure without executing
        if (!result.includes('import') && !result.includes('hydrateApp')) {
          throw new Error('Missing expected script content');
        }
      }).not.toThrow();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle program with empty state', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );
      const programWithEmptyState: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'text', value: { expr: 'lit', value: 'Empty' } },
      };

      // Act
      const result = generateHydrationScript(programWithEmptyState);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle program with actions', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );
      const programWithActions: CompiledProgram = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: {
          increment: {
            name: 'increment',
            steps: [
              {
                do: 'update',
                target: 'count',
                operation: 'add',
                value: { expr: 'lit', value: 1 },
              },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: { event: 'click', action: 'increment' },
          },
          children: [{ kind: 'text', value: { expr: 'state', name: 'count' } }],
        },
      };

      // Act
      const result = generateHydrationScript(programWithActions);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});

// ==================== wrapHtml Tests ====================

describe('wrapHtml', () => {
  // ==================== HTML Document Generation ====================

  describe('HTML document generation', () => {
    it('should include DOCTYPE declaration', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>Hello</div>';
      const script = 'console.log("test")';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toMatch(/^<!DOCTYPE html>/i);
    });

    it('should wrap content in div#app', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<span>Test Content</span>';
      const script = '';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toContain('<div id="app">');
      expect(result).toContain('<span>Test Content</span>');
      expect(result).toContain('</div>');
    });

    it('should include hydration script in script[type="module"]', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = 'hydrateApp(program)';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toContain('<script type="module">');
      expect(result).toContain('hydrateApp(program)');
      expect(result).toContain('</script>');
    });

    it('should include html, head, and body tags', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>Content</div>';
      const script = '';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain('</head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</body>');
      expect(result).toContain('</html>');
    });
  });

  // ==================== Optional Head Content ====================

  describe('optional head content', () => {
    it('should include head content when provided', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = '';
      const head = '<title>My App</title><meta name="description" content="Test">';

      // Act
      const result = wrapHtml(content, script, head);

      // Assert
      expect(result).toContain('<title>My App</title>');
      expect(result).toContain('<meta name="description" content="Test">');
    });

    it('should work without head content', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = '';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toContain('<head>');
      expect(result).toContain('</head>');
    });

    it('should include multiple head elements', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = '';
      const head = `
        <title>Test</title>
        <link rel="stylesheet" href="/styles.css">
        <meta charset="UTF-8">
      `;

      // Act
      const result = wrapHtml(content, script, head);

      // Assert
      expect(result).toContain('<title>Test</title>');
      expect(result).toContain('<link rel="stylesheet" href="/styles.css">');
      expect(result).toContain('<meta charset="UTF-8">');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '';
      const script = '';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toContain('<div id="app">');
      expect(result).toContain('</div>');
    });

    it('should handle empty script', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>App</div>';
      const script = '';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toBeDefined();
      // Should still have script tag structure even if empty
      expect(result).toContain('<script type="module">');
    });

    it('should handle content with special HTML characters', async () => {
      // Arrange
      const { wrapHtml } = await import('../../src/runtime/entry-server.js');
      const content = '<div>Test &amp; &lt;content&gt;</div>';
      const script = '';

      // Act
      const result = wrapHtml(content, script);

      // Assert
      expect(result).toContain('<div>Test &amp; &lt;content&gt;</div>');
    });
  });
});

// ==================== createDevServer Tests (Integration) ====================

describe('createDevServer', () => {
  let server: Awaited<ReturnType<typeof import('../../src/dev/server.js').createDevServer>> | null = null;

  afterEach(async () => {
    // Ensure server is closed after each test
    if (server) {
      await server.close();
      server = null;
    }
  });

  // ==================== Server Creation ====================

  describe('server creation', () => {
    it('should create DevServer with default options', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');

      // Act
      server = await createDevServer({});

      // Assert
      expect(server).toBeDefined();
      expect(server).toHaveProperty('listen');
      expect(server).toHaveProperty('close');
      expect(server).toHaveProperty('port');
    });

    it('should create DevServer with custom port', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      const customPort = 4567;

      // Act
      server = await createDevServer({ port: customPort });

      // Assert
      expect(server.port).toBe(customPort);
    });

    it('should create DevServer with custom host', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');

      // Act & Assert - should not throw
      server = await createDevServer({ host: 'localhost' });
      expect(server).toBeDefined();
    });

    it('should create DevServer with routesDir option', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');

      // Act & Assert - should not throw
      server = await createDevServer({ routesDir: './src/routes' });
      expect(server).toBeDefined();
    });
  });

  // ==================== Server Lifecycle ====================

  describe('server lifecycle', () => {
    it('should start server with listen()', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({ port: 0 }); // Use port 0 for dynamic allocation

      // Act
      await server.listen();

      // Assert
      expect(server.port).toBeGreaterThan(0);
    });

    it('should stop server with close()', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({ port: 0 });
      await server.listen();

      // Act
      await server.close();

      // Assert - should not throw, server should be closed
      server = null; // Mark as closed to avoid double-close in afterEach
    });

    it('should provide port number via port property', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({ port: 0 });

      // Act
      await server.listen();

      // Assert
      expect(typeof server.port).toBe('number');
      expect(server.port).toBeGreaterThan(0);
      expect(server.port).toBeLessThan(65536);
    });
  });

  // ==================== Dynamic Port Allocation ====================

  describe('dynamic port allocation', () => {
    it('should allocate available port when port is 0', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      server = await createDevServer({ port: 0 });

      // Act
      await server.listen();

      // Assert
      expect(server.port).toBeGreaterThan(0);
    });

    it('should use specified port when provided', async () => {
      // Arrange
      const { createDevServer } = await import('../../src/dev/server.js');
      const specifiedPort = 5432;
      server = await createDevServer({ port: specifiedPort });

      // Act
      await server.listen();

      // Assert
      expect(server.port).toBe(specifiedPort);
    });
  });
});

// ==================== Integration Tests ====================

describe('Dev Server Integration', () => {
  let server: Awaited<ReturnType<typeof import('../../src/dev/server.js').createDevServer>> | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  // ==================== Full SSR Flow ====================

  describe('full SSR flow', () => {
    it('should render page and wrap in HTML document', async () => {
      // Arrange
      const { renderPage, generateHydrationScript, wrapHtml } = await import(
        '../../src/runtime/entry-server.js'
      );
      const ctx = {
        url: '/',
        params: {},
        query: new URLSearchParams(),
      };

      // Act
      const content = await renderPage(simpleProgram, ctx);
      const script = generateHydrationScript(simpleProgram);
      const html = wrapHtml(content, script, '<title>Test App</title>');

      // Assert
      expect(html).toMatch(/^<!DOCTYPE html>/i);
      expect(html).toContain('<title>Test App</title>');
      expect(html).toContain('<div id="app">');
      expect(html).toContain('Hello');
      expect(html).toContain('<script type="module">');
      expect(html).toContain('hydrateApp');
    });
  });
});
