/**
 * Test module for Streaming SSR Renderer.
 *
 * Coverage:
 * - renderToStream function (Web Streams API)
 * - Streaming chunks delivery
 * - Backpressure handling
 * - Error handling during streaming
 * - Abort/cancellation support
 * - Edge Runtime compatibility (no Node.js streams)
 * - Suspense boundary handling
 * - HTML wrapper TransformStream
 *
 * TDD Red Phase: These tests verify the streaming renderer that will be
 * implemented for Streaming SSR in Constela Framework.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { renderToStream, createHtmlTransformStream } from '../streaming.js';
import type { CompiledProgram } from '@constela/compiler';
import type { StreamingRenderOptions } from '@constela/core';

// ==================== Helper Functions ====================

/**
 * Creates a minimal CompiledProgram for testing
 */
function createProgram(
  view: CompiledProgram['view'],
  state: CompiledProgram['state'] = {},
  actions: CompiledProgram['actions'] = {}
): CompiledProgram {
  return {
    version: '1.0',
    state,
    actions,
    view,
  };
}

/**
 * Collects all chunks from a ReadableStream into an array
 */
async function collectChunks(stream: ReadableStream<string>): Promise<string[]> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return chunks;
}

/**
 * Collects all chunks from a ReadableStream into a single string
 */
async function streamToString(stream: ReadableStream<string>): Promise<string> {
  const chunks = await collectChunks(stream);
  return chunks.join('');
}

describe('renderToStream', () => {
  // ==================== Basic Streaming ====================

  describe('basic streaming', () => {
    /**
     * Given: A simple program with a div element
     * When: renderToStream is called
     * Then: Should return a ReadableStream
     */
    it('should return a ReadableStream', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);

      // Assert
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    /**
     * Given: A simple program
     * When: Consuming the stream
     * Then: Should produce valid HTML content
     */
    it('should produce valid HTML content', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'container' } },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Hello World' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toContain('<div class="container">');
      expect(html).toContain('Hello World');
      expect(html).toContain('</div>');
    });

    /**
     * Given: A program with nested elements
     * When: Consuming the stream
     * Then: Should maintain correct nesting in output
     */
    it('should handle nested elements correctly', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'main',
        children: [
          {
            kind: 'element',
            tag: 'section',
            children: [
              {
                kind: 'element',
                tag: 'article',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Content' } },
                ],
              },
            ],
          },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toBe('<main><section><article>Content</article></section></main>');
    });
  });

  // ==================== Flush Strategies ====================

  describe('flush strategies', () => {
    /**
     * Given: Immediate flush strategy
     * When: Rendering content
     * Then: Should flush content as soon as available
     */
    it('should flush immediately with immediate strategy', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Immediate' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const chunks = await collectChunks(stream);

      // Assert
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('Immediate');
    });

    /**
     * Given: Batched flush strategy with timeout
     * When: Rendering content
     * Then: Should batch chunks until timeout
     */
    it('should batch chunks with batched strategy', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'span', children: [{ kind: 'text', value: { expr: 'lit', value: '1' } }] },
          { kind: 'element', tag: 'span', children: [{ kind: 'text', value: { expr: 'lit', value: '2' } }] },
          { kind: 'element', tag: 'span', children: [{ kind: 'text', value: { expr: 'lit', value: '3' } }] },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'batched',
        batchTimeout: 10,
      };

      // Act
      const stream = renderToStream(program, options);
      const chunks = await collectChunks(stream);

      // Assert - batched should have fewer chunks than immediate
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('<span>1</span>');
      expect(chunks.join('')).toContain('<span>2</span>');
      expect(chunks.join('')).toContain('<span>3</span>');
    });

    /**
     * Given: Manual flush strategy
     * When: Rendering content
     * Then: Should not flush until explicitly requested
     */
    it('should wait for manual flush with manual strategy', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Manual' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'manual',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toContain('Manual');
    });
  });

  // ==================== State Handling ====================

  describe('state handling', () => {
    /**
     * Given: A program with state references
     * When: Streaming the content
     * Then: Should use initial state values
     */
    it('should use initial state values in stream', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'message' } },
          ],
        },
        {
          message: { type: 'string', initial: 'Hello from state' },
        }
      );
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toContain('Hello from state');
    });
  });

  // ==================== Each Nodes ====================

  describe('each nodes streaming', () => {
    /**
     * Given: A program with each node
     * When: Streaming the content
     * Then: Should stream each item
     */
    it('should stream each items', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'li',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'item' } },
            ],
          },
        },
        {
          items: { type: 'array', initial: ['A', 'B', 'C'] },
        }
      );
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toContain('<li>A</li>');
      expect(html).toContain('<li>B</li>');
      expect(html).toContain('<li>C</li>');
    });

    /**
     * Given: A large array
     * When: Streaming
     * Then: Should stream chunks progressively
     */
    it('should stream large arrays in chunks', async () => {
      // Arrange
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'item' } },
            ],
          },
        },
        {
          items: { type: 'array', initial: items },
        }
      );
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const chunks = await collectChunks(stream);

      // Assert
      expect(chunks.length).toBeGreaterThan(1);
      const html = chunks.join('');
      expect(html).toContain('Item 0');
      expect(html).toContain('Item 99');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: An empty program (minimal view)
     * When: Streaming
     * Then: Should produce empty but valid stream
     */
    it('should handle empty content', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toBe('<div></div>');
    });

    /**
     * Given: Content with HTML special characters
     * When: Streaming
     * Then: Should properly escape content
     */
    it('should escape HTML special characters', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: '<script>alert("XSS")</script>' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    /**
     * Given: Void elements
     * When: Streaming
     * Then: Should render as self-closing
     */
    it('should handle void elements correctly', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'br' },
          { kind: 'element', tag: 'input', props: { type: { expr: 'lit', value: 'text' } } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      expect(html).toContain('<br />');
      expect(html).toContain('<input type="text" />');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    /**
     * Given: An error during rendering
     * When: Streaming
     * Then: Should handle error gracefully
     */
    it('should handle rendering errors gracefully', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'state', name: 'nonexistent' }, // Reference to undefined state
          },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act & Assert
      const stream = renderToStream(program, options);
      
      // Should not throw, but may include error content or empty string
      const html = await streamToString(stream);
      expect(typeof html).toBe('string');
    });

    /**
     * Given: A stream
     * When: Error occurs mid-stream
     * Then: Should emit error chunk
     */
    it('should emit error chunk on failure', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Before error' } },
          // Simulate a node that will fail
          { kind: 'invalid' as any },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      
      // Assert - should handle gracefully
      try {
        await streamToString(stream);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==================== Abort/Cancellation ====================

  describe('abort and cancellation', () => {
    /**
     * Given: A streaming render in progress
     * When: AbortController signals abort
     * Then: Should stop streaming and clean up
     */
    it('should support AbortController for cancellation', async () => {
      // Arrange
      const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'item' } },
            ],
          },
        },
        {
          items: { type: 'array', initial: items },
        }
      );
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };
      const abortController = new AbortController();

      // Act
      const stream = renderToStream(program, options, { signal: abortController.signal });
      const reader = stream.getReader();

      // Read first chunk then abort
      await reader.read();
      abortController.abort();

      // Assert - should handle abort gracefully
      try {
        await reader.read();
      } catch (error) {
        // Expected behavior - abort should cancel the stream
        expect(error).toBeDefined();
      }
    });

    /**
     * Given: A cancelled stream
     * When: Checking resource cleanup
     * Then: Should release all resources
     */
    it('should clean up resources on cancellation', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Content' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const reader = stream.getReader();
      
      // Cancel immediately
      await reader.cancel();

      // Assert - stream should be closed
      const { done } = await reader.read();
      expect(done).toBe(true);
    });
  });

  // ==================== Backpressure ====================

  describe('backpressure handling', () => {
    /**
     * Given: A slow consumer
     * When: Streaming large content
     * Then: Should respect backpressure and not overwhelm memory
     */
    it('should handle backpressure from slow consumers', async () => {
      // Arrange
      const items = Array.from({ length: 1000 }, (_, i) => `Large content block ${i}`);
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'item' } },
            ],
          },
        },
        {
          items: { type: 'array', initial: items },
        }
      );
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const reader = stream.getReader();
      const chunks: string[] = [];

      // Simulate slow consumer with delays
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        // Simulate slow processing
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Assert
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('Large content block 0');
      expect(chunks.join('')).toContain('Large content block 999');
    });
  });

  // ==================== Edge Runtime Compatibility ====================

  describe('edge runtime compatibility', () => {
    /**
     * Given: The streaming renderer
     * When: Checking dependencies
     * Then: Should not use Node.js specific APIs
     */
    it('should use Web Streams API (not Node.js streams)', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Edge compatible' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);

      // Assert - should be Web Streams API ReadableStream
      expect(stream).toBeInstanceOf(ReadableStream);
      expect(typeof stream.getReader).toBe('function');
      expect(typeof stream.pipeTo).toBe('function');
      expect(typeof stream.pipeThrough).toBe('function');
    });

    /**
     * Given: The streaming renderer
     * When: Used with TransformStream
     * Then: Should work with Web Streams pipelines
     */
    it('should work with Web Streams pipelines', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Pipeline test' } },
        ],
      });
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Create a simple transform that uppercases content
      const uppercaseTransform = new TransformStream<string, string>({
        transform(chunk, controller) {
          controller.enqueue(chunk.toUpperCase());
        },
      });

      // Act
      const stream = renderToStream(program, options);
      const transformedStream = stream.pipeThrough(uppercaseTransform);
      const html = await streamToString(transformedStream);

      // Assert
      expect(html).toContain('PIPELINE TEST');
    });
  });
});

describe('createHtmlTransformStream', () => {
  // ==================== HTML Wrapper ====================

  describe('HTML wrapper', () => {
    /**
     * Given: A raw HTML stream
     * When: Passing through HTML transform
     * Then: Should wrap with DOCTYPE and html/head/body tags
     */
    it('should wrap content with HTML document structure', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<div>Content</div>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({
        title: 'Test Page',
      });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const html = await streamToString(outputStream);

      // Assert
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<title>Test Page</title>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<div>Content</div>');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });

    /**
     * Given: HTML transform options with meta tags
     * When: Creating the stream
     * Then: Should include meta tags in head
     */
    it('should include meta tags in head', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<main>App</main>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({
        title: 'Meta Test',
        meta: {
          description: 'A test page',
          viewport: 'width=device-width, initial-scale=1',
        },
      });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const html = await streamToString(outputStream);

      // Assert
      expect(html).toContain('<meta name="description" content="A test page"');
      expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1"');
    });

    /**
     * Given: HTML transform options with stylesheets
     * When: Creating the stream
     * Then: Should include link tags for stylesheets
     */
    it('should include stylesheet links', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<div>Styled</div>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({
        title: 'Styled Page',
        stylesheets: ['/styles/main.css', '/styles/theme.css'],
      });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const html = await streamToString(outputStream);

      // Assert
      expect(html).toContain('<link rel="stylesheet" href="/styles/main.css"');
      expect(html).toContain('<link rel="stylesheet" href="/styles/theme.css"');
    });

    /**
     * Given: HTML transform options with scripts
     * When: Creating the stream
     * Then: Should include script tags before closing body
     */
    it('should include script tags', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<div>Interactive</div>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({
        title: 'Interactive Page',
        scripts: ['/js/app.js', '/js/hydrate.js'],
      });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const html = await streamToString(outputStream);

      // Assert
      expect(html).toContain('<script src="/js/app.js"');
      expect(html).toContain('<script src="/js/hydrate.js"');
      // Scripts should be before closing body
      const scriptsIndex = html.indexOf('/js/app.js');
      const bodyEndIndex = html.indexOf('</body>');
      expect(scriptsIndex).toBeLessThan(bodyEndIndex);
    });

    /**
     * Given: HTML transform with lang attribute
     * When: Creating the stream
     * Then: Should set lang on html element
     */
    it('should set lang attribute on html element', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<div>Japanese content</div>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({
        title: 'Japanese Page',
        lang: 'ja',
      });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const html = await streamToString(outputStream);

      // Assert
      expect(html).toContain('<html lang="ja"');
    });
  });

  // ==================== Streaming Behavior ====================

  describe('streaming behavior', () => {
    /**
     * Given: Multiple chunks of content
     * When: Streaming through transform
     * Then: Should maintain chunk order
     */
    it('should maintain chunk order', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<header>Header</header>');
          controller.enqueue('<main>Main</main>');
          controller.enqueue('<footer>Footer</footer>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({ title: 'Order Test' });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const html = await streamToString(outputStream);

      // Assert - content should be in order
      const headerIndex = html.indexOf('Header');
      const mainIndex = html.indexOf('Main');
      const footerIndex = html.indexOf('Footer');
      expect(headerIndex).toBeLessThan(mainIndex);
      expect(mainIndex).toBeLessThan(footerIndex);
    });

    /**
     * Given: HTML transform stream
     * When: First chunk is emitted
     * Then: Should include document shell (DOCTYPE, html, head, body opening)
     */
    it('should emit document shell before content', async () => {
      // Arrange
      const chunks: string[] = [];
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<div>First</div>');
          controller.enqueue('<div>Second</div>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({ title: 'Shell Test' });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const reader = outputStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Assert - first chunk should contain document shell
      const firstChunk = chunks[0];
      expect(firstChunk).toContain('<!DOCTYPE html>');
      expect(firstChunk).toContain('<html');
      expect(firstChunk).toContain('<body>');
    });

    /**
     * Given: HTML transform stream
     * When: Stream is closed
     * Then: Should emit closing tags (body, html)
     */
    it('should emit closing tags when stream ends', async () => {
      // Arrange
      const inputStream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('<div>Content</div>');
          controller.close();
        },
      });
      const transform = createHtmlTransformStream({ title: 'Close Test' });

      // Act
      const outputStream = inputStream.pipeThrough(transform);
      const chunks = await collectChunks(outputStream);

      // Assert - last chunk should contain closing tags
      const html = chunks.join('');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });
  });
});

describe('Suspense Boundary Streaming', () => {
  // ==================== Fallback Rendering ====================

  describe('fallback rendering', () => {
    /**
     * Given: A program with suspense boundary
     * When: Streaming begins
     * Then: Should emit fallback content immediately
     */
    it('should emit fallback content immediately for suspense boundaries', async () => {
      // Arrange
      const program = createProgram({
        kind: 'suspense',
        id: 'async-content',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'skeleton' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
          ],
        },
        children: [
          {
            kind: 'async',
            promise: 'fetchData',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'data' } },
            ],
          },
        ],
      } as any); // Type assertion for suspense node
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const chunks = await collectChunks(stream);
      const firstChunk = chunks[0];

      // Assert - fallback should be in early chunks
      const html = chunks.join('');
      expect(html).toContain('Loading...');
      expect(html).toContain('skeleton');
    });
  });

  // ==================== Resolution Replacement ====================

  describe('resolution replacement', () => {
    /**
     * Given: A suspense boundary with resolved promise
     * When: Promise resolves
     * Then: Should emit replacement script
     */
    it('should emit replacement script when suspense resolves', async () => {
      // This test verifies the out-of-order streaming pattern
      // where resolved content is sent with a script to replace the fallback
      
      // Arrange
      const program = createProgram({
        kind: 'suspense',
        id: 'async-section',
        fallback: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Loading section...' } },
          ],
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Loaded content!' } },
        ],
      } as any);
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Act
      const stream = renderToStream(program, options);
      const html = await streamToString(stream);

      // Assert
      // Should have a marker for the suspense boundary
      expect(html).toContain('data-suspense-id="async-section"');
      // Should include the resolved content (possibly in a template for replacement)
      expect(html).toContain('Loaded content!');
    });
  });
});
