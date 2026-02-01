/**
 * Test module for Streaming SSR types.
 *
 * Coverage:
 * - StreamingRenderOptions type structure
 * - SuspenseBoundary type structure
 * - StreamChunk type structure
 * - Type guards: isStreamingRenderOptions, isSuspenseBoundary
 *
 * TDD Red Phase: These tests verify the streaming types that will be added
 * to support Streaming SSR in Constela Framework.
 */

import { describe, it, expect } from 'vitest';

import type {
  StreamingRenderOptions,
  SuspenseBoundary,
  StreamChunk,
  FlushStrategy,
} from '../streaming.js';
import {
  isStreamingRenderOptions,
  isSuspenseBoundary,
  isStreamChunk,
} from '../streaming.js';

describe('StreamingRenderOptions', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    /**
     * Given: A streaming render options object with streaming enabled
     * When: Validating the type
     * Then: Should be a valid StreamingRenderOptions
     */
    it('should have streaming boolean field', () => {
      // Arrange
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Assert
      expect(isStreamingRenderOptions(options)).toBe(true);
      expect(options.streaming).toBe(true);
    });

    /**
     * Given: A streaming render options with flushStrategy
     * When: Validating the type
     * Then: Should accept valid flush strategies
     */
    it('should accept immediate flush strategy', () => {
      // Arrange
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'immediate',
      };

      // Assert
      expect(isStreamingRenderOptions(options)).toBe(true);
      expect(options.flushStrategy).toBe('immediate');
    });

    it('should accept batched flush strategy', () => {
      // Arrange
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'batched',
        batchTimeout: 50,
      };

      // Assert
      expect(isStreamingRenderOptions(options)).toBe(true);
      expect(options.flushStrategy).toBe('batched');
    });

    it('should accept manual flush strategy', () => {
      // Arrange
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'manual',
      };

      // Assert
      expect(isStreamingRenderOptions(options)).toBe(true);
      expect(options.flushStrategy).toBe('manual');
    });

    /**
     * Given: A streaming options with batched strategy
     * When: batchTimeout is provided
     * Then: Should accept the timeout value
     */
    it('should accept optional batchTimeout for batched strategy', () => {
      // Arrange
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'batched',
        batchTimeout: 100,
      };

      // Assert
      expect(isStreamingRenderOptions(options)).toBe(true);
      expect(options.batchTimeout).toBe(100);
    });

    /**
     * Given: Streaming options without batchTimeout
     * When: flushStrategy is batched
     * Then: Should still be valid (default timeout applies)
     */
    it('should allow batched strategy without explicit batchTimeout', () => {
      // Arrange
      const options: StreamingRenderOptions = {
        streaming: true,
        flushStrategy: 'batched',
      };

      // Assert
      expect(isStreamingRenderOptions(options)).toBe(true);
      expect(options.batchTimeout).toBeUndefined();
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isStreamingRenderOptions(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isStreamingRenderOptions(undefined)).toBe(false);
    });

    it('should reject object without streaming field', () => {
      const obj = { flushStrategy: 'immediate' };
      expect(isStreamingRenderOptions(obj)).toBe(false);
    });

    it('should reject object without flushStrategy field', () => {
      const obj = { streaming: true };
      expect(isStreamingRenderOptions(obj)).toBe(false);
    });

    it('should reject invalid flushStrategy value', () => {
      const obj = {
        streaming: true,
        flushStrategy: 'invalid',
      };
      expect(isStreamingRenderOptions(obj)).toBe(false);
    });

    it('should reject non-boolean streaming value', () => {
      const obj = {
        streaming: 'true',
        flushStrategy: 'immediate',
      };
      expect(isStreamingRenderOptions(obj)).toBe(false);
    });

    it('should reject non-number batchTimeout', () => {
      const obj = {
        streaming: true,
        flushStrategy: 'batched',
        batchTimeout: '100',
      };
      expect(isStreamingRenderOptions(obj)).toBe(false);
    });
  });
});

describe('SuspenseBoundary', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    /**
     * Given: A valid suspense boundary configuration
     * When: Validating the type
     * Then: Should have required id, fallback, and promise fields
     */
    it('should require id field as string', () => {
      // Arrange
      const boundary: SuspenseBoundary = {
        id: 'suspense-1',
        fallback: { kind: 'element', tag: 'div' },
        promise: Promise.resolve({ kind: 'element', tag: 'span' }),
      };

      // Assert
      expect(isSuspenseBoundary(boundary)).toBe(true);
      expect(boundary.id).toBe('suspense-1');
    });

    /**
     * Given: A suspense boundary with fallback content
     * When: Validating the boundary
     * Then: fallback should be a ViewNode
     */
    it('should require fallback field as ViewNode', () => {
      // Arrange
      const boundary: SuspenseBoundary = {
        id: 'loading-state',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'skeleton' } },
        },
        promise: Promise.resolve({ kind: 'text', value: { expr: 'lit', value: 'Loaded' } }),
      };

      // Assert
      expect(isSuspenseBoundary(boundary)).toBe(true);
      expect(boundary.fallback.kind).toBe('element');
    });

    /**
     * Given: A suspense boundary with async content
     * When: Validating the boundary
     * Then: promise should be a Promise<ViewNode>
     */
    it('should require promise field as Promise<ViewNode>', async () => {
      // Arrange
      const asyncContent = { kind: 'text' as const, value: { expr: 'lit' as const, value: 'Content' } };
      const boundary: SuspenseBoundary = {
        id: 'async-content',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        promise: Promise.resolve(asyncContent),
      };

      // Assert
      expect(isSuspenseBoundary(boundary)).toBe(true);
      const resolved = await boundary.promise;
      expect(resolved.kind).toBe('text');
    });

    /**
     * Given: A suspense boundary with complex fallback
     * When: Rendering
     * Then: Should support nested elements in fallback
     */
    it('should support complex fallback with nested elements', () => {
      // Arrange
      const boundary: SuspenseBoundary = {
        id: 'complex-fallback',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'loading-container' } },
          children: [
            { kind: 'element', tag: 'span', props: { class: { expr: 'lit', value: 'spinner' } } },
            { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
          ],
        },
        promise: Promise.resolve({ kind: 'element', tag: 'main' }),
      };

      // Assert
      expect(isSuspenseBoundary(boundary)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isSuspenseBoundary(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isSuspenseBoundary(undefined)).toBe(false);
    });

    it('should reject object without id field', () => {
      const obj = {
        fallback: { kind: 'element', tag: 'div' },
        promise: Promise.resolve({ kind: 'element', tag: 'div' }),
      };
      expect(isSuspenseBoundary(obj)).toBe(false);
    });

    it('should reject object without fallback field', () => {
      const obj = {
        id: 'test',
        promise: Promise.resolve({ kind: 'element', tag: 'div' }),
      };
      expect(isSuspenseBoundary(obj)).toBe(false);
    });

    it('should reject object without promise field', () => {
      const obj = {
        id: 'test',
        fallback: { kind: 'element', tag: 'div' },
      };
      expect(isSuspenseBoundary(obj)).toBe(false);
    });

    it('should reject non-string id', () => {
      const obj = {
        id: 123,
        fallback: { kind: 'element', tag: 'div' },
        promise: Promise.resolve({ kind: 'element', tag: 'div' }),
      };
      expect(isSuspenseBoundary(obj)).toBe(false);
    });
  });
});

describe('StreamChunk', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    /**
     * Given: A stream chunk with HTML content
     * When: Validating the chunk
     * Then: Should have type 'html' and content string
     */
    it('should support html chunk type', () => {
      // Arrange
      const chunk: StreamChunk = {
        type: 'html',
        content: '<div>Hello</div>',
      };

      // Assert
      expect(isStreamChunk(chunk)).toBe(true);
      expect(chunk.type).toBe('html');
      expect(chunk.content).toBe('<div>Hello</div>');
    });

    /**
     * Given: A stream chunk with shell HTML
     * When: Validating the chunk
     * Then: Should have type 'shell' for document shell
     */
    it('should support shell chunk type', () => {
      // Arrange
      const chunk: StreamChunk = {
        type: 'shell',
        content: '<!DOCTYPE html><html><head></head><body>',
      };

      // Assert
      expect(isStreamChunk(chunk)).toBe(true);
      expect(chunk.type).toBe('shell');
    });

    /**
     * Given: A stream chunk for suspense fallback
     * When: Validating the chunk
     * Then: Should have type 'fallback' with boundary id
     */
    it('should support fallback chunk type with boundaryId', () => {
      // Arrange
      const chunk: StreamChunk = {
        type: 'fallback',
        content: '<div class="skeleton">Loading...</div>',
        boundaryId: 'suspense-1',
      };

      // Assert
      expect(isStreamChunk(chunk)).toBe(true);
      expect(chunk.type).toBe('fallback');
      expect(chunk.boundaryId).toBe('suspense-1');
    });

    /**
     * Given: A stream chunk for resolved suspense content
     * When: Validating the chunk
     * Then: Should have type 'resolved' with boundary id
     */
    it('should support resolved chunk type with boundaryId', () => {
      // Arrange
      const chunk: StreamChunk = {
        type: 'resolved',
        content: '<div>Actual Content</div>',
        boundaryId: 'suspense-1',
      };

      // Assert
      expect(isStreamChunk(chunk)).toBe(true);
      expect(chunk.type).toBe('resolved');
      expect(chunk.boundaryId).toBe('suspense-1');
    });

    /**
     * Given: A stream chunk for end of stream
     * When: Validating the chunk
     * Then: Should have type 'end'
     */
    it('should support end chunk type', () => {
      // Arrange
      const chunk: StreamChunk = {
        type: 'end',
        content: '</body></html>',
      };

      // Assert
      expect(isStreamChunk(chunk)).toBe(true);
      expect(chunk.type).toBe('end');
    });

    /**
     * Given: A stream chunk for error
     * When: Validating the chunk
     * Then: Should have type 'error' with error content
     */
    it('should support error chunk type', () => {
      // Arrange
      const chunk: StreamChunk = {
        type: 'error',
        content: '<div class="error">Something went wrong</div>',
        error: new Error('Render failed'),
      };

      // Assert
      expect(isStreamChunk(chunk)).toBe(true);
      expect(chunk.type).toBe('error');
      expect(chunk.error).toBeInstanceOf(Error);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isStreamChunk(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isStreamChunk(undefined)).toBe(false);
    });

    it('should reject object without type field', () => {
      const obj = { content: '<div>Test</div>' };
      expect(isStreamChunk(obj)).toBe(false);
    });

    it('should reject object without content field', () => {
      const obj = { type: 'html' };
      expect(isStreamChunk(obj)).toBe(false);
    });

    it('should reject invalid type value', () => {
      const obj = { type: 'invalid', content: '<div>Test</div>' };
      expect(isStreamChunk(obj)).toBe(false);
    });

    it('should reject non-string content', () => {
      const obj = { type: 'html', content: 123 };
      expect(isStreamChunk(obj)).toBe(false);
    });
  });
});

describe('FlushStrategy', () => {
  // ==================== Type Validation ====================

  describe('type validation', () => {
    /**
     * Given: Various flush strategy values
     * When: Checking if they are valid
     * Then: Only valid strategies should pass
     */
    it('should accept "immediate" as valid flush strategy', () => {
      const strategy: FlushStrategy = 'immediate';
      expect(['immediate', 'batched', 'manual'].includes(strategy)).toBe(true);
    });

    it('should accept "batched" as valid flush strategy', () => {
      const strategy: FlushStrategy = 'batched';
      expect(['immediate', 'batched', 'manual'].includes(strategy)).toBe(true);
    });

    it('should accept "manual" as valid flush strategy', () => {
      const strategy: FlushStrategy = 'manual';
      expect(['immediate', 'batched', 'manual'].includes(strategy)).toBe(true);
    });
  });
});
