/**
 * Test module for Middleware chain functions.
 *
 * Coverage:
 * - createMiddlewareChain: Create middleware chain from array
 *   - Empty middleware array handling
 *   - Single middleware execution
 *   - Multiple middlewares execution order
 *   - next() behavior (call/skip/modify response)
 *   - Context sharing via locals
 *   - Early return (authentication failure, etc.)
 *   - Response modification (header addition, etc.)
 *   - Error handling (middleware throws, next throws)
 *   - Async middleware support
 */

import { describe, it, expect, vi } from 'vitest';
import type { Middleware, MiddlewareContext, MiddlewareNext } from '../../src/types.js';

// ==================== Test Fixtures ====================

/**
 * Create a mock MiddlewareContext
 */
function createMockContext(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  const url = new URL('http://localhost/test');
  return {
    request: new Request(url),
    params: {},
    url,
    locals: {},
    ...overrides,
  };
}

/**
 * Create a final handler that returns a simple response
 */
function createFinalHandler(body = 'final'): MiddlewareNext {
  return async () => new Response(body);
}

// ==================== createMiddlewareChain Tests ====================

describe('createMiddlewareChain', () => {
  // ==================== Basic Functionality ====================

  describe('basic functionality', () => {
    it('should call final handler directly when middleware array is empty', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const ctx = createMockContext();
      const finalCalled = vi.fn(async () => new Response('final response'));
      const chain = createMiddlewareChain([]);

      // Act
      const response = await chain(ctx, finalCalled);

      // Assert
      expect(finalCalled).toHaveBeenCalledTimes(1);
      expect(await response.text()).toBe('final response');
    });

    it('should execute a single middleware', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const middlewareCalled = vi.fn();
      const middleware: Middleware = async (ctx, next) => {
        middlewareCalled();
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([middleware]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(middlewareCalled).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple middlewares in order', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const order: number[] = [];
      const m1: Middleware = async (ctx, next) => {
        order.push(1);
        const res = await next();
        order.push(4);
        return res;
      };
      const m2: Middleware = async (ctx, next) => {
        order.push(2);
        const res = await next();
        order.push(3);
        return res;
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(order).toEqual([1, 2, 3, 4]);
    });
  });

  // ==================== next() Behavior ====================

  describe('next() behavior', () => {
    it('should call next middleware when next() is called', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const m1Called = vi.fn();
      const m2Called = vi.fn();
      const m1: Middleware = async (ctx, next) => {
        m1Called();
        return next();
      };
      const m2: Middleware = async (ctx, next) => {
        m2Called();
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(m1Called).toHaveBeenCalledTimes(1);
      expect(m2Called).toHaveBeenCalledTimes(1);
    });

    it('should skip subsequent middlewares when next() is not called', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const m2Called = vi.fn();
      const m1: Middleware = async (_ctx, _next) => {
        // Do not call next()
        return new Response('early response');
      };
      const m2: Middleware = async (ctx, next) => {
        m2Called();
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);
      const finalCalled = vi.fn(createFinalHandler());

      // Act
      const response = await chain(ctx, finalCalled);

      // Assert
      expect(m2Called).not.toHaveBeenCalled();
      expect(finalCalled).not.toHaveBeenCalled();
      expect(await response.text()).toBe('early response');
    });

    it('should allow middleware to get and modify next() response', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const middleware: Middleware = async (ctx, next) => {
        const response = await next();
        const body = await response.text();
        return new Response(`modified: ${body}`);
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([middleware]);

      // Act
      const response = await chain(ctx, async () => new Response('original'));

      // Assert
      expect(await response.text()).toBe('modified: original');
    });
  });

  // ==================== Context Sharing ====================

  describe('context sharing', () => {
    it('should share data between middlewares via locals', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const m1: Middleware = async (ctx, next) => {
        ctx.locals.user = { id: 1, name: 'Alice' };
        return next();
      };
      const m2: Middleware = async (ctx, next) => {
        ctx.locals.timestamp = Date.now();
        return next();
      };
      const receivedLocals: Record<string, unknown> = {};
      const final: MiddlewareNext = async () => {
        // This would typically be in handler, simulating access
        return new Response('ok');
      };
      const m3: Middleware = async (ctx, next) => {
        Object.assign(receivedLocals, ctx.locals);
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2, m3]);

      // Act
      await chain(ctx, final);

      // Assert
      expect(receivedLocals).toHaveProperty('user');
      expect(receivedLocals).toHaveProperty('timestamp');
      expect((receivedLocals.user as { id: number; name: string }).name).toBe('Alice');
    });

    it('should pass the same context object to all middlewares', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const contexts: MiddlewareContext[] = [];
      const m1: Middleware = async (ctx, next) => {
        contexts.push(ctx);
        return next();
      };
      const m2: Middleware = async (ctx, next) => {
        contexts.push(ctx);
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(contexts).toHaveLength(2);
      expect(contexts[0]).toBe(contexts[1]);
      expect(contexts[0]).toBe(ctx);
    });
  });

  // ==================== Early Return ====================

  describe('early return', () => {
    it('should stop chain when returning Response without calling next()', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const authMiddleware: Middleware = async (_ctx, _next) => {
        // Simulate authentication failure
        return new Response('Unauthorized', { status: 401 });
      };
      const handler: Middleware = async (ctx, next) => {
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([authMiddleware, handler]);
      const finalCalled = vi.fn(createFinalHandler());

      // Act
      const response = await chain(ctx, finalCalled);

      // Assert
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
      expect(finalCalled).not.toHaveBeenCalled();
    });

    it('should return 401 response for authentication failure scenario', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const authMiddleware: Middleware = async (ctx, next) => {
        const authHeader = ctx.request.headers.get('Authorization');
        if (!authHeader) {
          return Response.json({ error: 'Authentication required' }, { status: 401 });
        }
        return next();
      };
      const ctx = createMockContext({
        request: new Request('http://localhost/test'),
      });
      const chain = createMiddlewareChain([authMiddleware]);

      // Act
      const response = await chain(ctx, createFinalHandler());

      // Assert
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Authentication required' });
    });

    it('should allow authenticated requests to pass through', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const authMiddleware: Middleware = async (ctx, next) => {
        const authHeader = ctx.request.headers.get('Authorization');
        if (!authHeader) {
          return Response.json({ error: 'Authentication required' }, { status: 401 });
        }
        ctx.locals.authenticated = true;
        return next();
      };
      const ctx = createMockContext({
        request: new Request('http://localhost/test', {
          headers: { Authorization: 'Bearer token123' },
        }),
      });
      const chain = createMiddlewareChain([authMiddleware]);

      // Act
      const response = await chain(ctx, createFinalHandler('protected content'));

      // Assert
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('protected content');
      expect(ctx.locals.authenticated).toBe(true);
    });
  });

  // ==================== Response Modification ====================

  describe('response modification', () => {
    it('should allow middleware to add headers to response', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const corsMiddleware: Middleware = async (ctx, next) => {
        const response = await next();
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([corsMiddleware]);

      // Act
      const response = await chain(ctx, createFinalHandler());

      // Assert
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should allow middleware to modify response body', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const wrapperMiddleware: Middleware = async (ctx, next) => {
        const response = await next();
        const body = await response.json();
        return Response.json({
          success: true,
          data: body,
        });
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([wrapperMiddleware]);

      // Act
      const response = await chain(ctx, async () =>
        Response.json({ message: 'hello' })
      );

      // Assert
      const body = await response.json();
      expect(body).toEqual({
        success: true,
        data: { message: 'hello' },
      });
    });

    it('should allow multiple middlewares to modify response in reverse order', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const m1: Middleware = async (ctx, next) => {
        const response = await next();
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Middleware-1', 'true');
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      };
      const m2: Middleware = async (ctx, next) => {
        const response = await next();
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Middleware-2', 'true');
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);

      // Act
      const response = await chain(ctx, createFinalHandler());

      // Assert
      // m1 runs first, m2 runs second (before final)
      // Response comes back: final -> m2 adds header -> m1 adds header
      expect(response.headers.get('X-Middleware-1')).toBe('true');
      expect(response.headers.get('X-Middleware-2')).toBe('true');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should propagate error when middleware throws synchronously', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const errorMiddleware: Middleware = (_ctx, _next) => {
        throw new Error('Middleware error');
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([errorMiddleware]);

      // Act & Assert
      await expect(chain(ctx, createFinalHandler())).rejects.toThrow('Middleware error');
    });

    it('should propagate error when middleware rejects', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const errorMiddleware: Middleware = async (_ctx, _next) => {
        throw new Error('Async middleware error');
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([errorMiddleware]);

      // Act & Assert
      await expect(chain(ctx, createFinalHandler())).rejects.toThrow('Async middleware error');
    });

    it('should propagate error when next() throws', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const middleware: Middleware = async (ctx, next) => {
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([middleware]);
      const failingFinal: MiddlewareNext = async () => {
        throw new Error('Final handler error');
      };

      // Act & Assert
      await expect(chain(ctx, failingFinal)).rejects.toThrow('Final handler error');
    });

    it('should allow middleware to catch and handle errors from next()', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const errorHandlerMiddleware: Middleware = async (ctx, next) => {
        try {
          return await next();
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }
      };
      const failingMiddleware: Middleware = async (_ctx, _next) => {
        throw new Error('Something went wrong');
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([errorHandlerMiddleware, failingMiddleware]);

      // Act
      const response = await chain(ctx, createFinalHandler());

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Something went wrong' });
    });

    it('should handle error thrown in later middleware', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const order: string[] = [];
      const m1: Middleware = async (ctx, next) => {
        order.push('m1-before');
        try {
          const response = await next();
          order.push('m1-after');
          return response;
        } catch (error) {
          order.push('m1-catch');
          throw error;
        }
      };
      const m2: Middleware = async (_ctx, _next) => {
        order.push('m2-before');
        throw new Error('m2 error');
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);

      // Act & Assert
      await expect(chain(ctx, createFinalHandler())).rejects.toThrow('m2 error');
      expect(order).toEqual(['m1-before', 'm2-before', 'm1-catch']);
    });
  });

  // ==================== Async Processing ====================

  describe('async processing', () => {
    it('should execute async middlewares in correct order', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const order: number[] = [];
      const m1: Middleware = async (ctx, next) => {
        order.push(1);
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(2);
        const response = await next();
        order.push(5);
        return response;
      };
      const m2: Middleware = async (ctx, next) => {
        order.push(3);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(4);
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([m1, m2]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(order).toEqual([1, 2, 3, 4, 5]);
    });

    it('should properly await next() in async middleware', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const timingMiddleware: Middleware = async (ctx, next) => {
        const start = Date.now();
        const response = await next();
        const duration = Date.now() - start;
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Response-Time', `${duration}ms`);
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      };
      const slowFinal: MiddlewareNext = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Response('slow response');
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([timingMiddleware]);

      // Act
      const response = await chain(ctx, slowFinal);

      // Assert
      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toBeDefined();
      // Should have waited for the slow final handler
      const timeMs = parseInt(responseTime!.replace('ms', ''), 10);
      expect(timeMs).toBeGreaterThanOrEqual(50);
    });

    it('should support sync middleware returning Response directly', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const syncMiddleware: Middleware = (ctx, next) => {
        // Return Response synchronously without await
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([syncMiddleware]);

      // Act
      const response = await chain(ctx, createFinalHandler('sync result'));

      // Assert
      expect(await response.text()).toBe('sync result');
    });

    it('should handle mixed sync and async middlewares', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const order: string[] = [];
      const asyncMiddleware: Middleware = async (ctx, next) => {
        order.push('async-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        const response = await next();
        order.push('async-end');
        return response;
      };
      const syncMiddleware: Middleware = (ctx, next) => {
        order.push('sync');
        return next();
      };
      const ctx = createMockContext();
      const chain = createMiddlewareChain([asyncMiddleware, syncMiddleware]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(order).toEqual(['async-start', 'sync', 'async-end']);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle middleware that calls next() multiple times', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      let nextCallCount = 0;
      const middleware: Middleware = async (ctx, next) => {
        const res1 = await next();
        nextCallCount++;
        // Second call to next - should still work
        const res2 = await next();
        nextCallCount++;
        return res2;
      };
      const finalCallCount = vi.fn(async () => new Response('final'));
      const ctx = createMockContext();
      const chain = createMiddlewareChain([middleware]);

      // Act
      await chain(ctx, finalCallCount);

      // Assert
      // Behavior depends on implementation - should handle gracefully
      expect(nextCallCount).toBe(2);
      // Final should be called each time next() is called
      expect(finalCallCount).toHaveBeenCalledTimes(2);
    });

    it('should handle deeply nested middleware chain', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const count = 100;
      const middlewares: Middleware[] = Array.from({ length: count }, (_, i) => {
        return async (ctx: MiddlewareContext, next: MiddlewareNext) => {
          ctx.locals[`m${i}`] = true;
          return next();
        };
      });
      const ctx = createMockContext();
      const chain = createMiddlewareChain(middlewares);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(Object.keys(ctx.locals)).toHaveLength(count);
      expect(ctx.locals.m0).toBe(true);
      expect(ctx.locals.m99).toBe(true);
    });

    it('should handle context with existing locals', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const middleware: Middleware = async (ctx, next) => {
        ctx.locals.newValue = 'new';
        return next();
      };
      const ctx = createMockContext({
        locals: { existingValue: 'existing' },
      });
      const chain = createMiddlewareChain([middleware]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(ctx.locals.existingValue).toBe('existing');
      expect(ctx.locals.newValue).toBe('new');
    });

    it('should pass URL params correctly through chain', async () => {
      // Arrange
      const { createMiddlewareChain } = await import('../../src/middleware/index.js');
      const receivedParams: Record<string, string>[] = [];
      const middleware: Middleware = async (ctx, next) => {
        receivedParams.push({ ...ctx.params });
        return next();
      };
      const ctx = createMockContext({
        params: { id: '123', slug: 'test-article' },
        url: new URL('http://localhost/posts/123/test-article'),
      });
      const chain = createMiddlewareChain([middleware]);

      // Act
      await chain(ctx, createFinalHandler());

      // Assert
      expect(receivedParams[0]).toEqual({ id: '123', slug: 'test-article' });
    });
  });
});
