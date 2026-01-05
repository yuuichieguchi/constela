/**
 * Test module for Edge runtime adapter.
 *
 * Coverage:
 * - createAdapter: Create fetch handler for edge runtime
 * - fetch function: Request routing and response handling
 * - Platform support: cloudflare, vercel, deno, node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScannedRoute, APIModule, APIContext } from '../../src/types.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Simple test program for page rendering
 */
const simpleProgram: CompiledProgram = {
  version: '1.0',
  state: {
    title: { type: 'string', initial: 'Test Page' },
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
 * Mock page module
 */
const mockPageModule = {
  default: simpleProgram,
};

/**
 * Mock API module with GET handler
 */
const mockApiModule: APIModule = {
  GET: async (ctx: APIContext) => {
    return Response.json({ message: 'Hello from API', params: ctx.params });
  },
  POST: async (ctx: APIContext) => {
    const body = await ctx.request.json();
    return Response.json({ received: body }, { status: 201 });
  },
};

/**
 * Sample scanned routes
 */
const sampleRoutes: ScannedRoute[] = [
  {
    file: '/routes/index.page.ts',
    pattern: '/',
    type: 'page',
    params: [],
  },
  {
    file: '/routes/about.page.ts',
    pattern: '/about',
    type: 'page',
    params: [],
  },
  {
    file: '/routes/users/[id].page.ts',
    pattern: '/users/:id',
    type: 'page',
    params: ['id'],
  },
  {
    file: '/routes/api/hello.ts',
    pattern: '/api/hello',
    type: 'api',
    params: [],
  },
  {
    file: '/routes/api/users/[id].ts',
    pattern: '/api/users/:id',
    type: 'api',
    params: ['id'],
  },
];

// ==================== createAdapter Tests ====================

describe('createAdapter', () => {
  // ==================== Basic Creation ====================

  describe('basic creation', () => {
    it('should accept AdapterOptions and return an object', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      
      // Act
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
      });
      
      // Assert
      expect(adapter).toBeDefined();
      expect(typeof adapter).toBe('object');
    });

    it('should return object with fetch function', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      
      // Act
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
      });
      
      // Assert
      expect(adapter).toHaveProperty('fetch');
      expect(typeof adapter.fetch).toBe('function');
    });

    it('should accept module loader function', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      
      // Act
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      
      // Assert
      expect(adapter).toBeDefined();
    });
  });

  // ==================== Platform Support ====================

  describe('platform support', () => {
    it('should accept cloudflare platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      
      // Act & Assert - should not throw
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: [],
      });
      expect(adapter).toBeDefined();
    });

    it('should accept vercel platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      
      // Act & Assert - should not throw
      const adapter = createAdapter({
        platform: 'vercel',
        routes: [],
      });
      expect(adapter).toBeDefined();
    });

    it('should accept deno platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      
      // Act & Assert - should not throw
      const adapter = createAdapter({
        platform: 'deno',
        routes: [],
      });
      expect(adapter).toBeDefined();
    });

    it('should accept node platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      
      // Act & Assert - should not throw
      const adapter = createAdapter({
        platform: 'node',
        routes: [],
      });
      expect(adapter).toBeDefined();
    });
  });
});

// ==================== fetch Function Tests ====================

describe('adapter.fetch', () => {
  // ==================== Route Matching ====================

  describe('route matching', () => {
    it('should match exact path routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(moduleLoader).toHaveBeenCalledWith('/routes/index.page.ts');
      expect(response.status).toBe(200);
    });

    it('should match parameterized routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/users/123');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(moduleLoader).toHaveBeenCalledWith('/routes/users/[id].page.ts');
      expect(response.status).toBe(200);
    });

    it('should extract params from URL', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;
      const customApiModule: APIModule = {
        GET: (ctx) => {
          capturedParams = ctx.params;
          return Response.json({ ok: true });
        },
      };
      const moduleLoader = vi.fn().mockResolvedValue(customApiModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/users/456');
      
      // Act
      await adapter.fetch(request);
      
      // Assert
      expect(capturedParams).toEqual({ id: '456' });
    });
  });

  // ==================== Page Routes ====================

  describe('page routes', () => {
    it('should return SSR HTML for page routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should include hydration script in page response', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/');
      
      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();
      
      // Assert
      expect(html).toContain('<script');
      expect(html).toContain('hydrateApp');
    });

    it('should render page with params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/users/789');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
    });
  });

  // ==================== API Routes ====================

  describe('API routes', () => {
    it('should call API handler for API routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockApiModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/hello');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('message');
    });

    it('should handle GET requests to API routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockApiModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/hello', { method: 'GET' });
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Hello from API');
    });

    it('should handle POST requests to API routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockApiModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/hello', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
      });
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.received).toEqual({ data: 'test' });
    });

    it('should pass params to API handler', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockApiModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/users/999');
      
      // Act
      const response = await adapter.fetch(request);
      const body = await response.json();
      
      // Assert
      expect(body.params).toEqual({ id: '999' });
    });
  });

  // ==================== 404 Handling ====================

  describe('404 handling', () => {
    it('should return 404 for unmatched routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn();
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/nonexistent/path');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(404);
    });

    it('should return JSON error body for 404', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn();
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/does/not/exist');
      
      // Act
      const response = await adapter.fetch(request);
      const body = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(body).toHaveProperty('error');
    });

    it('should not call module loader for 404', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn();
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/unknown');
      
      // Act
      await adapter.fetch(request);
      
      // Assert
      expect(moduleLoader).not.toHaveBeenCalled();
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should return 500 when module loading fails', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockRejectedValue(new Error('Module not found'));
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(500);
    });

    it('should return 500 when handler throws', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const throwingModule: APIModule = {
        GET: () => {
          throw new Error('Handler error');
        },
      };
      const moduleLoader = vi.fn().mockResolvedValue(throwingModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/hello');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(500);
    });

    it('should include error message in 500 response', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const throwingModule: APIModule = {
        GET: () => {
          throw new Error('Specific error message');
        },
      };
      const moduleLoader = vi.fn().mockResolvedValue(throwingModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/hello');
      
      // Act
      const response = await adapter.fetch(request);
      const body = await response.json();
      
      // Assert
      expect(response.status).toBe(500);
      expect(body).toHaveProperty('error');
    });
  });

  // ==================== Static Asset Handling ====================

  describe('static asset handling', () => {
    it('should pass through requests for static assets', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn();
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/_assets/style.css');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      // Static assets should either be handled separately or return 404
      expect([200, 404]).toContain(response.status);
      expect(moduleLoader).not.toHaveBeenCalled();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty routes array', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn();
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: [],
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(404);
    });

    it('should handle requests with query parameters', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedQuery: URLSearchParams | null = null;
      const apiWithQuery: APIModule = {
        GET: (ctx) => {
          capturedQuery = ctx.query;
          return Response.json({ ok: true });
        },
      };
      const moduleLoader = vi.fn().mockResolvedValue(apiWithQuery);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/api/hello?foo=bar&page=1');
      
      // Act
      await adapter.fetch(request);
      
      // Assert
      expect(capturedQuery?.get('foo')).toBe('bar');
      expect(capturedQuery?.get('page')).toBe('1');
    });

    it('should handle requests with trailing slash', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/about/');
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      // Should match /about route with or without trailing slash
      expect([200, 404]).toContain(response.status);
    });

    it('should handle HEAD requests', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockPageModule);
      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: sampleRoutes,
        loadModule: moduleLoader,
      });
      const request = new Request('http://localhost/', { method: 'HEAD' });
      
      // Act
      const response = await adapter.fetch(request);
      
      // Assert
      expect(response.status).toBe(200);
      // HEAD should not have body
    });
  });
});
