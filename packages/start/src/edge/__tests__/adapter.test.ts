/**
 * Test module for Edge Adapter with Streaming Support.
 *
 * Coverage:
 * - Streaming response with correct headers (Transfer-Encoding: chunked)
 * - Non-streaming response for backward compatibility
 * - wrapHtmlStream() function for streaming HTML responses
 * - Abort/cancel handling for streaming
 * - Configuration options validation (streaming, streamingFlushStrategy)
 *
 * TDD Red Phase: These tests verify the edge adapter streaming functionality
 * that will be implemented for Phase 1 of SSR streaming optimization.
 */

import { describe, it, expect } from 'vitest';
import type {
  ScannedRoute,
  PageModule,
  ConstelaConfig,
  DevServerOptions,
  BuildOptions,
} from '../../types.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

/**
 * Simple compiled program for testing
 */
const SIMPLE_PROGRAM: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Hello World' } }],
  },
};

/**
 * Program with state for testing hydration in streaming
 */
const PROGRAM_WITH_STATE: CompiledProgram = {
  version: '1.0',
  state: {
    counter: { expr: 'lit', value: 0 },
    message: { expr: 'lit', value: 'Interactive' },
  },
  actions: {
    increment: {
      type: 'setState',
      path: 'counter',
      value: {
        expr: 'bin',
        op: '+',
        left: { expr: 'state', name: 'counter' },
        right: { expr: 'lit', value: 1 },
      },
    },
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [
      { kind: 'text', value: { expr: 'state', name: 'message' } },
      { kind: 'text', value: { expr: 'state', name: 'counter' } },
    ],
  },
};

/**
 * Create a mock page module that returns a CompiledProgram
 */
function createMockPageModule(program: CompiledProgram): PageModule {
  return {
    default: program,
  };
}

/**
 * Create test routes configuration
 */
function createTestRoutes(): ScannedRoute[] {
  return [
    {
      file: '/pages/index.ts',
      pattern: '/',
      type: 'page',
      params: [],
    },
    {
      file: '/pages/about.ts',
      pattern: '/about',
      type: 'page',
      params: [],
    },
    {
      file: '/pages/posts/[id].ts',
      pattern: '/posts/:id',
      type: 'page',
      params: ['id'],
    },
  ];
}

// ==================== Configuration Type Tests ====================

describe('Configuration Types', () => {
  describe('ConstelaConfig streaming options', () => {
    it('should allow streaming option in ConstelaConfig', () => {
      /**
       * Given: ConstelaConfig type from types module
       * When: streaming option is added
       * Then: Type should accept boolean value
       *
       * This test will fail compilation until types.ts is updated with:
       * streaming?: boolean;
       */
      const testConfig: ConstelaConfig = {
        streaming: true,
      };

      expect(testConfig.streaming).toBe(true);
    });

    it('should allow streamingFlushStrategy option in ConstelaConfig', () => {
      /**
       * Given: ConstelaConfig type from types module
       * When: streamingFlushStrategy option is added
       * Then: Type should accept 'immediate' | 'batched' | 'manual'
       *
       * This test will fail compilation until types.ts is updated with:
       * streamingFlushStrategy?: 'immediate' | 'batched' | 'manual';
       */
      const testConfig: ConstelaConfig = {
        streaming: true,
        streamingFlushStrategy: 'immediate',
      };

      expect(testConfig.streamingFlushStrategy).toBe('immediate');
    });
  });

  describe('DevServerOptions streaming option', () => {
    it('should allow streaming option in DevServerOptions', () => {
      /**
       * Given: DevServerOptions type from types module
       * When: streaming option is added
       * Then: Type should accept boolean value
       *
       * This test will fail compilation until types.ts is updated with:
       * streaming?: boolean;
       */
      const testOptions: DevServerOptions = {
        port: 3000,
        streaming: true,
      };

      expect(testOptions.streaming).toBe(true);
    });
  });

  describe('BuildOptions streaming option', () => {
    it('should allow streaming option in BuildOptions', () => {
      /**
       * Given: BuildOptions type from types module
       * When: streaming option is added
       * Then: Type should accept boolean value
       *
       * This test will fail compilation until types.ts is updated with:
       * streaming?: boolean;
       */
      const testOptions: BuildOptions = {
        outDir: './dist',
        streaming: true,
      };

      expect(testOptions.streaming).toBe(true);
    });
  });
});

// ==================== AdapterOptions Type Tests ====================

describe('AdapterOptions Streaming Types', () => {
  it('should define AdapterOptions interface with streaming option', async () => {
    /**
     * Given: AdapterOptions type from adapter module
     * When: streaming option is added
     * Then: Type should accept boolean value
     *
     * This test verifies the type exists and has the streaming property.
     * Will fail until adapter.ts exports AdapterOptions with streaming field.
     */
    // Dynamic import to check exports
    const adapterModule = await import('../adapter.js');

    // Check that the module exports the expected types
    expect(adapterModule).toHaveProperty('createAdapter');

    // Type assertion - this verifies the interface exists
    // The actual streaming option should be in AdapterOptions
    type AdapterOptions = Parameters<typeof adapterModule.createAdapter>[0];

    // Create an options object that should include streaming
    const options: AdapterOptions = {
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true, // This will fail compilation until AdapterOptions includes streaming
    };

    expect(options.streaming).toBe(true);
  });

  it('should define AdapterOptions with streamingFlushStrategy option', async () => {
    /**
     * Given: AdapterOptions type from adapter module
     * When: streamingFlushStrategy option is added
     * Then: Type should accept 'immediate' | 'batched' | 'manual'
     */
    const adapterModule = await import('../adapter.js');

    type AdapterOptions = Parameters<typeof adapterModule.createAdapter>[0];

    const options: AdapterOptions = {
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      streamingFlushStrategy: 'immediate', // This will fail until AdapterOptions includes this
    };

    expect(options.streamingFlushStrategy).toBe('immediate');
  });
});

// ==================== wrapHtmlStream Function Tests ====================

describe('wrapHtmlStream function', () => {
  it('should be exported from adapter module', async () => {
    /**
     * Given: Edge adapter module
     * When: Module is imported
     * Then: wrapHtmlStream function should be exported
     *
     * This test will fail until wrapHtmlStream is implemented and exported.
     */
    const adapter = await import('../adapter.js');

    expect(adapter).toHaveProperty('wrapHtmlStream');
    expect(typeof adapter.wrapHtmlStream).toBe('function');
  });

  it('should return a ReadableStream', async () => {
    /**
     * Given: Content stream and hydration script
     * When: wrapHtmlStream is called
     * Then: Result should be a ReadableStream
     */
    const { wrapHtmlStream } = await import('../adapter.js');

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>Content</div>'));
        controller.close();
      },
    });

    const htmlStream = wrapHtmlStream(contentStream, 'hydrateApp({});');

    expect(htmlStream).toBeInstanceOf(ReadableStream);
  });

  it('should stream DOCTYPE and opening tags first', async () => {
    /**
     * Given: Content stream and hydration script
     * When: First chunk is read from wrapHtmlStream
     * Then: It should contain DOCTYPE and opening HTML tags
     */
    const { wrapHtmlStream } = await import('../adapter.js');

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>Content</div>'));
        controller.close();
      },
    });

    const htmlStream = wrapHtmlStream(contentStream, 'hydrateApp({});');
    const reader = htmlStream.getReader();
    const { value: firstChunk } = await reader.read();
    reader.releaseLock();

    const text = new TextDecoder().decode(firstChunk);
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('<html');
    expect(text).toContain('<head>');
  });

  it('should stream closing tags and hydration script last', async () => {
    /**
     * Given: Content stream and hydration script
     * When: All chunks are read from wrapHtmlStream
     * Then: Final output should end with closing tags and hydration script
     */
    const { wrapHtmlStream } = await import('../adapter.js');

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>Content</div>'));
        controller.close();
      },
    });

    const hydrationScript =
      "import { hydrateApp } from '@constela/runtime'; hydrateApp({});";

    const htmlStream = wrapHtmlStream(contentStream, hydrationScript);
    const reader = htmlStream.getReader();
    const chunks: Uint8Array[] = [];

    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) {
        chunks.push(result.value);
      }
      done = result.done;
    }

    const fullHtml = new TextDecoder().decode(
      new Uint8Array(
        chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])
      )
    );

    expect(fullHtml).toContain('</body>');
    expect(fullHtml).toContain('</html>');
    expect(fullHtml).toContain('<script type="module">');
    expect(fullHtml).toContain(hydrationScript);
  });

  it('should include head content when provided', async () => {
    /**
     * Given: Content stream, hydration script, and head content
     * When: wrapHtmlStream is called with head option
     * Then: Head content should be included in the HTML head
     */
    const { wrapHtmlStream } = await import('../adapter.js');

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>Content</div>'));
        controller.close();
      },
    });

    const headContent =
      '<title>Test Page</title><meta name="description" content="Test">';

    const htmlStream = wrapHtmlStream(contentStream, 'hydrateApp({});', {
      head: headContent,
    });

    const reader = htmlStream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) chunks.push(result.value);
      done = result.done;
    }

    const fullHtml = new TextDecoder().decode(
      new Uint8Array(
        chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])
      )
    );

    expect(fullHtml).toContain('<title>Test Page</title>');
    expect(fullHtml).toContain('<meta name="description" content="Test">');
  });

  it('should support theme option', async () => {
    /**
     * Given: Content stream with theme: 'dark' option
     * When: wrapHtmlStream is called
     * Then: HTML element should have class="dark"
     */
    const { wrapHtmlStream } = await import('../adapter.js');

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>Dark Theme</div>'));
        controller.close();
      },
    });

    const htmlStream = wrapHtmlStream(contentStream, 'hydrateApp({});', {
      theme: 'dark',
    });

    const reader = htmlStream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) chunks.push(result.value);
      done = result.done;
    }

    const fullHtml = new TextDecoder().decode(
      new Uint8Array(
        chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])
      )
    );

    expect(fullHtml).toMatch(/<html[^>]*class="dark"/);
  });

  it('should support lang option', async () => {
    /**
     * Given: Content stream with lang: 'ja' option
     * When: wrapHtmlStream is called
     * Then: HTML element should have lang="ja" attribute
     */
    const { wrapHtmlStream } = await import('../adapter.js');

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>日本語</div>'));
        controller.close();
      },
    });

    const htmlStream = wrapHtmlStream(contentStream, 'hydrateApp({});', {
      lang: 'ja',
    });

    const reader = htmlStream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) chunks.push(result.value);
      done = result.done;
    }

    const fullHtml = new TextDecoder().decode(
      new Uint8Array(
        chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[])
      )
    );

    expect(fullHtml).toMatch(/<html[^>]*lang="ja"/);
  });
});

// ==================== WrapHtmlStreamOptions Type Tests ====================

describe('WrapHtmlStreamOptions type', () => {
  it('should be exported from adapter module', async () => {
    /**
     * Given: Edge adapter module
     * When: Module is imported
     * Then: WrapHtmlStreamOptions type should be usable
     *
     * This verifies the type exists by using it in a type context.
     */
    const adapter = await import('../adapter.js');

    // If WrapHtmlStreamOptions is exported as a type, this should work
    // The test verifies wrapHtmlStream accepts the expected options
    const options = {
      head: '<title>Test</title>',
      theme: 'dark' as const,
      lang: 'en',
      runtimePath: '/_constela/runtime.js',
    };

    const contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<div>Test</div>'));
        controller.close();
      },
    });

    // This should work without type errors if WrapHtmlStreamOptions is correct
    const result = adapter.wrapHtmlStream(contentStream, 'hydrateApp({});', options);
    expect(result).toBeInstanceOf(ReadableStream);
  });
});

// ==================== Streaming Response Behavior Tests ====================

describe('Streaming Response Behavior', () => {
  it('should create adapter that returns streaming response when streaming is enabled', async () => {
    /**
     * Given: Adapter created with streaming: true
     * When: fetch is called for a page route
     * Then: Response should have Transfer-Encoding: chunked header
     *
     * This test verifies the streaming behavior works end-to-end.
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Transfer-Encoding')).toBe('chunked');
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  });

  it('should return ReadableStream body when streaming is enabled', async () => {
    /**
     * Given: Adapter configured with streaming: true
     * When: fetch is called for a page route
     * Then: Response body should be a ReadableStream
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    expect(response.body).toBeInstanceOf(ReadableStream);
  });

  it('should stream complete HTML document in chunks', async () => {
    /**
     * Given: Adapter configured with streaming: true
     * When: Response body is read completely
     * Then: Concatenated chunks should form valid HTML document
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);
    const html = await response.text();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('Hello World');
    expect(html).toContain('</html>');
  });

  it('should return non-streaming response when streaming is not enabled', async () => {
    /**
     * Given: Adapter configured without streaming option (default)
     * When: fetch is called for a page route
     * Then: Response should NOT have Transfer-Encoding: chunked header
     *
     * This ensures backward compatibility.
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      // streaming: false (default)
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Transfer-Encoding')).toBeNull();
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  });
});

// ==================== Abort/Cancel Handling Tests ====================

describe('Streaming Abort/Cancel Handling', () => {
  it('should handle request abort signal gracefully', async () => {
    /**
     * Given: Adapter with streaming enabled and an AbortController
     * When: Request is aborted while streaming
     * Then: Should not throw, stream should be cancelled gracefully
     */
    const { createAdapter } = await import('../adapter.js');

    const slowModule: PageModule = {
      default: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return SIMPLE_PROGRAM;
      },
    };

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => slowModule,
    });

    const abortController = new AbortController();
    const request = new Request('https://example.com/', {
      signal: abortController.signal,
    });

    const responsePromise = adapter.fetch(request);

    // Abort immediately
    abortController.abort();

    // Should not throw, but stream should be cancelled
    await expect(responsePromise).resolves.toBeDefined();
  });

  it('should clean up resources when stream is cancelled by consumer', async () => {
    /**
     * Given: Adapter with streaming enabled
     * When: Stream reader is cancelled by consumer
     * Then: Resources should be cleaned up
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(PROGRAM_WITH_STATE),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);
    const reader = response.body!.getReader();

    // Read one chunk then cancel
    await reader.read();
    await reader.cancel('User cancelled');

    // Should not throw, reader should be released
    await expect(reader.closed).resolves.toBeUndefined();
  });
});

// ==================== Flush Strategy Tests ====================

describe('Streaming Flush Strategy', () => {
  it('should accept immediate flush strategy', async () => {
    /**
     * Given: AdapterOptions with streamingFlushStrategy: 'immediate'
     * When: createAdapter is called
     * Then: Adapter should be created without error
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      streamingFlushStrategy: 'immediate',
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    expect(adapter).toBeDefined();
    expect(adapter.fetch).toBeInstanceOf(Function);
  });

  it('should accept batched flush strategy', async () => {
    /**
     * Given: AdapterOptions with streamingFlushStrategy: 'batched'
     * When: createAdapter is called
     * Then: Adapter should be created without error
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      streamingFlushStrategy: 'batched',
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    expect(adapter).toBeDefined();
  });

  it('should accept manual flush strategy', async () => {
    /**
     * Given: AdapterOptions with streamingFlushStrategy: 'manual'
     * When: createAdapter is called
     * Then: Adapter should be created without error
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      streamingFlushStrategy: 'manual',
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    expect(adapter).toBeDefined();
  });

  it('should default to immediate flush strategy when not specified', async () => {
    /**
     * Given: AdapterOptions with streaming: true but no flush strategy
     * When: createAdapter is called and response is streamed
     * Then: Chunks should be flushed immediately (default behavior)
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      // streamingFlushStrategy not specified - should default to 'immediate'
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);
    const reader = response.body!.getReader();

    // Read first chunk
    const { value, done } = await reader.read();
    reader.releaseLock();

    // First chunk should be available immediately (DOCTYPE + head)
    expect(done).toBe(false);
    expect(value).toBeDefined();
    const text = new TextDecoder().decode(value);
    expect(text).toContain('<!DOCTYPE html>');
  });
});

// ==================== Edge Platform Compatibility Tests ====================

describe('Edge Platform Compatibility', () => {
  it('should work with Cloudflare Workers streaming', async () => {
    /**
     * Given: Adapter configured for Cloudflare with streaming
     * When: fetch is called
     * Then: Response should be compatible with Cloudflare Workers
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    // Cloudflare expects standard Response with ReadableStream
    expect(response).toBeInstanceOf(Response);
    expect(response.body).toBeInstanceOf(ReadableStream);
  });

  it('should work with Vercel Edge Functions streaming', async () => {
    /**
     * Given: Adapter configured for Vercel with streaming
     * When: fetch is called
     * Then: Response should be compatible with Vercel Edge
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'vercel',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.body).toBeInstanceOf(ReadableStream);
  });

  it('should work with Deno Deploy streaming', async () => {
    /**
     * Given: Adapter configured for Deno with streaming
     * When: fetch is called
     * Then: Response should be compatible with Deno Deploy
     */
    const { createAdapter } = await import('../adapter.js');

    const adapter = createAdapter({
      platform: 'deno',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => createMockPageModule(SIMPLE_PROGRAM),
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.body).toBeInstanceOf(ReadableStream);
  });
});

// ==================== Error Handling Tests ====================

describe('Error Handling in Streaming', () => {
  it('should handle errors during streaming gracefully', async () => {
    /**
     * Given: Adapter with streaming and a module that throws error
     * When: fetch is called
     * Then: Error response should be returned
     */
    const { createAdapter } = await import('../adapter.js');

    const errorModule: PageModule = {
      default: () => {
        throw new Error('Render failed');
      },
    };

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => errorModule,
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    expect(response.status).toBe(500);
  });

  it('should handle async errors during content streaming', async () => {
    /**
     * Given: Adapter with streaming and content that fails mid-stream
     * When: fetch is called and stream is read
     * Then: Error should be propagated through stream
     */
    const { createAdapter } = await import('../adapter.js');

    const asyncErrorModule: PageModule = {
      default: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Async render failed');
      },
    };

    const adapter = createAdapter({
      platform: 'cloudflare',
      routes: createTestRoutes(),
      streaming: true,
      loadModule: async () => asyncErrorModule,
    });

    const request = new Request('https://example.com/');
    const response = await adapter.fetch(request);

    // Error should result in 500 response
    expect(response.status).toBe(500);
  });
});
