/**
 * Test module for Edge adapter with function exports (dynamic route params support).
 *
 * Coverage:
 * - Function export support in edge adapter
 *   - Should resolve function export with extracted params
 *   - Should handle async function exports
 *   - Should return 500 when function export throws
 *   - Should maintain backward compatibility with static exports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScannedRoute, APIModule, APIContext } from '../../src/types.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Simple static program (backward compatibility)
 */
const staticProgram: CompiledProgram = {
  version: '1.0',
  state: {
    title: { type: 'string', initial: 'Static Page' },
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
 * Create program with dynamic content based on params
 */
function createDynamicProgram(params: Record<string, string>): CompiledProgram {
  const id = params.id || '';
  const slug = params.slug || '';
  return {
    version: '1.0',
    state: {
      id: { type: 'string', initial: id },
      slug: { type: 'string', initial: slug },
      title: { type: 'string', initial: 'Dynamic Page: ' + (id || slug) },
    },
    actions: {},
    view: {
      kind: 'element',
      tag: 'article',
      props: { 'data-id': { expr: 'lit', value: id } },
      children: [
        {
          kind: 'element',
          tag: 'h1',
          props: {},
          children: [{ kind: 'text', value: { expr: 'state', name: 'title' } }],
        },
      ],
    },
  };
}

/**
 * Sync function export
 */
const syncFunctionExport = (
  params: Record<string, string>
): CompiledProgram => {
  return createDynamicProgram(params);
};

/**
 * Async function export
 */
const asyncFunctionExport = async (
  params: Record<string, string>
): Promise<CompiledProgram> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return createDynamicProgram(params);
};

/**
 * Throwing function export
 */
const throwingFunctionExport = (): CompiledProgram => {
  throw new Error('Page generation failed');
};

/**
 * Async throwing function export
 */
const asyncThrowingFunctionExport = async (): Promise<CompiledProgram> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Async page generation failed');
};

/**
 * Mock page module with static export
 */
const mockStaticPageModule = {
  default: staticProgram,
};

/**
 * Mock page module with sync function export
 */
const mockSyncFunctionPageModule = {
  default: syncFunctionExport,
};

/**
 * Mock page module with async function export
 */
const mockAsyncFunctionPageModule = {
  default: asyncFunctionExport,
};

/**
 * Mock page module with throwing function export
 */
const mockThrowingPageModule = {
  default: throwingFunctionExport,
};

/**
 * Mock page module with async throwing function export
 */
const mockAsyncThrowingPageModule = {
  default: asyncThrowingFunctionExport,
};

/**
 * Sample scanned routes with dynamic parameters
 */
const routesWithDynamicParams: ScannedRoute[] = [
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
    file: '/routes/posts/[slug].page.ts',
    pattern: '/posts/:slug',
    type: 'page',
    params: ['slug'],
  },
  {
    file: '/routes/blog/[year]/[month].page.ts',
    pattern: '/blog/:year/:month',
    type: 'page',
    params: ['year', 'month'],
  },
];

// ==================== Edge Adapter with Function Export Tests ====================

describe('adapter.fetch with function exports', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ==================== Function Export Resolution ====================

  describe('function export resolution', () => {
    it('should resolve sync function export with extracted params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const capturingFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        capturedParams = { ...params };
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: capturingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/123');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      expect(capturedParams).toEqual({ id: '123' });
    });

    it('should resolve async function export with extracted params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const asyncCapturingFn = async (
        params: Record<string, string>
      ): Promise<CompiledProgram> => {
        capturedParams = { ...params };
        await new Promise((resolve) => setTimeout(resolve, 10));
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: asyncCapturingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/posts/hello-world');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      expect(capturedParams).toEqual({ slug: 'hello-world' });
    });

    it('should pass multiple params to function export', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const multiParamFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        capturedParams = { ...params };
        return staticProgram;
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: multiParamFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/blog/2024/06');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      expect(capturedParams).toEqual({ year: '2024', month: '06' });
    });

    it('should call function export for each request', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const callLog: Record<string, string>[] = [];

      const loggingFn = (params: Record<string, string>): CompiledProgram => {
        callLog.push({ ...params });
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: loggingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      // Act
      await adapter.fetch(new Request('http://localhost/users/1'));
      await adapter.fetch(new Request('http://localhost/users/2'));
      await adapter.fetch(new Request('http://localhost/users/3'));

      // Assert
      expect(callLog).toHaveLength(3);
      expect(callLog[0]).toEqual({ id: '1' });
      expect(callLog[1]).toEqual({ id: '2' });
      expect(callLog[2]).toEqual({ id: '3' });
    });
  });

  // ==================== Response Content ====================

  describe('response content', () => {
    it('should return SSR HTML from function export', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockSyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/test-user');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should include hydration script in response from function export', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockSyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/hydrated');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(html).toContain('<script');
      expect(html).toContain('hydrateApp');
    });

    it('should render view from function export result', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockSyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/render-test');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(html).toContain('<article');
      expect(html).toContain('data-id');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should return 500 when sync function export throws', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockThrowingPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/will-fail');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(500);
    });

    it('should return 500 when async function export throws', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi
        .fn()
        .mockResolvedValue(mockAsyncThrowingPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/async-fail');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(500);
    });

    it('should include error message in 500 response from function export', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockThrowingPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/error-msg');

      // Act
      const response = await adapter.fetch(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Page generation failed');
    });

    it('should handle error from specific params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');

      const conditionalFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        if (params.id === 'forbidden') {
          throw new Error('Access denied for user: forbidden');
        }
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: conditionalFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      // Act
      const successResponse = await adapter.fetch(
        new Request('http://localhost/users/allowed')
      );
      const errorResponse = await adapter.fetch(
        new Request('http://localhost/users/forbidden')
      );

      // Assert
      expect(successResponse.status).toBe(200);
      expect(errorResponse.status).toBe(500);
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should still work with static CompiledProgram exports', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockStaticPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
    });

    it('should handle static export with dynamic route params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockStaticPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/static-user');

      // Act
      const response = await adapter.fetch(request);
      const html = await response.text();

      // Assert
      expect(response.status).toBe(200);
      expect(html).toContain('<!DOCTYPE html>');
      // Static export should render regardless of params
    });

    it('should handle mixed static and function exports across routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');

      const moduleLoader = vi.fn().mockImplementation((file: string) => {
        if (file.includes('index')) {
          return Promise.resolve(mockStaticPageModule);
        }
        return Promise.resolve(mockSyncFunctionPageModule);
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      // Act
      const staticResponse = await adapter.fetch(
        new Request('http://localhost/')
      );
      const dynamicResponse = await adapter.fetch(
        new Request('http://localhost/users/dynamic')
      );

      // Assert
      expect(staticResponse.status).toBe(200);
      expect(dynamicResponse.status).toBe(200);
    });
  });

  // ==================== Async Behavior ====================

  describe('async behavior', () => {
    it('should wait for async function export to resolve', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let resolved = false;

      const slowFn = async (
        params: Record<string, string>
      ): Promise<CompiledProgram> => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        resolved = true;
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: slowFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/slow');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(resolved).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests with function exports', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const callOrder: string[] = [];

      const trackingFn = async (
        params: Record<string, string>
      ): Promise<CompiledProgram> => {
        callOrder.push('start:' + params.id);
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 20)
        );
        callOrder.push('end:' + params.id);
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: trackingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      // Act
      const responses = await Promise.all([
        adapter.fetch(new Request('http://localhost/users/1')),
        adapter.fetch(new Request('http://localhost/users/2')),
        adapter.fetch(new Request('http://localhost/users/3')),
      ]);

      // Assert
      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(callOrder.filter((c) => c.startsWith('start'))).toHaveLength(3);
      expect(callOrder.filter((c) => c.startsWith('end'))).toHaveLength(3);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should pass empty params object for non-dynamic routes', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const capturingFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        capturedParams = { ...params };
        return staticProgram;
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: capturingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/about');

      // Act
      await adapter.fetch(request);

      // Assert
      expect(capturedParams).toEqual({});
    });

    it('should handle special characters in params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const capturingFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        capturedParams = { ...params };
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: capturingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/posts/hello-world-2024');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      expect(capturedParams).toEqual({ slug: 'hello-world-2024' });
    });

    it('should handle numeric-like string params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const capturingFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        capturedParams = { ...params };
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: capturingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/12345');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      expect(capturedParams?.id).toBe('12345');
      expect(typeof capturedParams?.id).toBe('string');
    });

    it('should handle URL-encoded params', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      let capturedParams: Record<string, string> | null = null;

      const capturingFn = (
        params: Record<string, string>
      ): CompiledProgram => {
        capturedParams = { ...params };
        return createDynamicProgram(params);
      };

      const moduleLoader = vi.fn().mockResolvedValue({
        default: capturingFn,
      });

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      // URL with encoded space
      const request = new Request('http://localhost/posts/hello%20world');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
      // Params should be decoded
      expect(capturedParams?.slug).toBe('hello world');
    });
  });

  // ==================== Platform Support ====================

  describe('platform support with function exports', () => {
    it('should work with cloudflare platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockSyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'cloudflare',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/cf-user');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should work with vercel platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockSyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'vercel',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/vercel-user');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should work with deno platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockAsyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'deno',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/deno-user');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should work with node platform', async () => {
      // Arrange
      const { createAdapter } = await import('../../src/edge/adapter.js');
      const moduleLoader = vi.fn().mockResolvedValue(mockAsyncFunctionPageModule);

      const adapter = createAdapter({
        platform: 'node',
        routes: routesWithDynamicParams,
        loadModule: moduleLoader,
      });

      const request = new Request('http://localhost/users/node-user');

      // Act
      const response = await adapter.fetch(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
