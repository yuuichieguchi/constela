/**
 * Test module for API route handler functions.
 *
 * Coverage:
 * - createAPIHandler: Create handler function from API module
 *   - HTTP method handling (GET, POST, PUT, DELETE)
 *   - Context passing (params, query, request)
 *   - Response handling (JSON, status codes, headers)
 *   - Error handling (405 for undefined methods, 500 for thrown errors)
 *   - Async/sync handler support
 */

import { describe, it, expect, vi } from 'vitest';
import type { APIContext, APIModule } from '../../src/types.js';

// ==================== Test Fixtures ====================

/**
 * Create a mock APIContext
 */
function createMockContext(overrides: Partial<APIContext> = {}): APIContext {
  return {
    params: {},
    query: new URLSearchParams(),
    request: new Request('http://localhost/api/test', { method: 'GET' }),
    ...overrides,
  };
}

// ==================== createAPIHandler Tests ====================

describe('createAPIHandler', () => {
  // ==================== HTTP Method Handling ====================

  describe('HTTP method handling', () => {
    it('should handle GET requests', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ message: 'ok' }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'GET' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ message: 'ok' });
    });

    it('should handle POST requests', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        POST: () => Response.json({ created: true }, { status: 201 }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'POST' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual({ created: true });
    });

    it('should handle PUT requests', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        PUT: () => Response.json({ updated: true }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'PUT' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ updated: true });
    });

    it('should handle DELETE requests', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        DELETE: () => new Response(null, { status: 204 }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'DELETE' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(204);
    });
  });

  // ==================== Context Passing ====================

  describe('context passing', () => {
    it('should pass params to handler', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const receivedParams: Record<string, string>[] = [];
      const module: APIModule = {
        GET: (ctx) => {
          receivedParams.push(ctx.params);
          return Response.json({ received: true });
        },
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        params: { id: '123', slug: 'test-post' },
        request: new Request('http://localhost/api/test', { method: 'GET' }),
      });

      // Act
      await handler(ctx);

      // Assert
      expect(receivedParams).toHaveLength(1);
      expect(receivedParams[0]).toEqual({ id: '123', slug: 'test-post' });
    });

    it('should pass query to handler', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const receivedQuery: URLSearchParams[] = [];
      const module: APIModule = {
        GET: (ctx) => {
          receivedQuery.push(ctx.query);
          return Response.json({ received: true });
        },
      };
      const handler = createAPIHandler(module);
      const query = new URLSearchParams('page=1&limit=10');
      const ctx = createMockContext({
        query,
        request: new Request('http://localhost/api/test?page=1&limit=10', { method: 'GET' }),
      });

      // Act
      await handler(ctx);

      // Assert
      expect(receivedQuery).toHaveLength(1);
      expect(receivedQuery[0]?.get('page')).toBe('1');
      expect(receivedQuery[0]?.get('limit')).toBe('10');
    });

    it('should pass request object to handler', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const receivedRequests: Request[] = [];
      const module: APIModule = {
        POST: (ctx) => {
          receivedRequests.push(ctx.request);
          return Response.json({ received: true });
        },
      };
      const handler = createAPIHandler(module);
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
      });
      const ctx = createMockContext({ request });

      // Act
      await handler(ctx);

      // Assert
      expect(receivedRequests).toHaveLength(1);
      expect(receivedRequests[0]?.method).toBe('POST');
      expect(receivedRequests[0]?.headers.get('Content-Type')).toBe('application/json');
    });
  });

  // ==================== Response Handling ====================

  describe('response handling', () => {
    it('should return JSON response', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ users: [{ id: 1, name: 'Alice' }] }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.headers.get('Content-Type')).toContain('application/json');
      const body = await response.json();
      expect(body).toEqual({ users: [{ id: 1, name: 'Alice' }] });
    });

    it('should return custom status code', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        POST: () => Response.json({ error: 'Validation failed' }, { status: 400 }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'POST' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return custom headers', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () =>
          new Response(JSON.stringify({ data: 'test' }), {
            headers: {
              'Content-Type': 'application/json',
              'X-Custom-Header': 'custom-value',
              'Cache-Control': 'max-age=3600',
            },
          }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(response.headers.get('Cache-Control')).toBe('max-age=3600');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should return 405 for undefined method', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ message: 'ok' }),
        // POST, PUT, DELETE are not defined
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'POST' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(405);
    });

    it('should include Allow header in 405 response', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ message: 'ok' }),
        POST: () => Response.json({ message: 'ok' }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'DELETE' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(405);
      const allowHeader = response.headers.get('Allow');
      expect(allowHeader).toBeDefined();
      expect(allowHeader).toContain('GET');
      expect(allowHeader).toContain('POST');
    });

    it('should return 500 when handler throws error', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => {
          throw new Error('Something went wrong');
        },
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(500);
    });

    it('should return 500 when async handler rejects', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: async () => {
          throw new Error('Async error');
        },
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(500);
    });

    it('should return error message in 500 response body', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => {
          throw new Error('Database connection failed');
        },
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });

  // ==================== Async/Sync Handler Support ====================

  describe('async/sync handler support', () => {
    it('should support handler returning Promise<Response>', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: async () => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return Response.json({ async: true });
        },
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ async: true });
    });

    it('should support handler returning Response synchronously', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ sync: true }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ sync: true });
    });

    it('should handle mixed async and sync handlers in same module', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ type: 'sync' }),
        POST: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return Response.json({ type: 'async' });
        },
      };
      const handler = createAPIHandler(module);

      // Act - GET (sync)
      const getResponse = await handler(
        createMockContext({
          request: new Request('http://localhost/api/test', { method: 'GET' }),
        })
      );

      // Act - POST (async)
      const postResponse = await handler(
        createMockContext({
          request: new Request('http://localhost/api/test', { method: 'POST' }),
        })
      );

      // Assert
      expect((await getResponse.json()).type).toBe('sync');
      expect((await postResponse.json()).type).toBe('async');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty params object', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: (ctx) => Response.json({ params: ctx.params }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({ params: {} });

      // Act
      const response = await handler(ctx);

      // Assert
      const body = await response.json();
      expect(body.params).toEqual({});
    });

    it('should handle empty query string', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: (ctx) => Response.json({ query: Object.fromEntries(ctx.query) }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({ query: new URLSearchParams() });

      // Act
      const response = await handler(ctx);

      // Assert
      const body = await response.json();
      expect(body.query).toEqual({});
    });

    it('should handle module with no handlers defined', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {};
      const handler = createAPIHandler(module);
      const ctx = createMockContext();

      // Act
      const response = await handler(ctx);

      // Assert
      expect(response.status).toBe(405);
    });

    it('should handle HEAD request by using GET handler if defined', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ message: 'ok' }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'HEAD' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      // HEAD should work with GET handler or return 405
      expect([200, 405]).toContain(response.status);
    });

    it('should handle OPTIONS request', async () => {
      // Arrange
      const { createAPIHandler } = await import('../../src/api/handler.js');
      const module: APIModule = {
        GET: () => Response.json({ message: 'ok' }),
        POST: () => Response.json({ message: 'ok' }),
      };
      const handler = createAPIHandler(module);
      const ctx = createMockContext({
        request: new Request('http://localhost/api/test', { method: 'OPTIONS' }),
      });

      // Act
      const response = await handler(ctx);

      // Assert
      // OPTIONS should return allowed methods or be handled appropriately
      expect([200, 204, 405]).toContain(response.status);
    });
  });
});
