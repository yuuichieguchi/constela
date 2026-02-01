/**
 * Streaming SSR Types for Constela Framework
 *
 * Provides type definitions for streaming Server-Side Rendering,
 * supporting:
 * - Streaming render options with flush strategies
 * - Suspense boundaries for async content
 * - Stream chunks for progressive HTML delivery
 *
 * These types are designed for Edge Runtime compatibility,
 * using Web Streams API (not Node.js streams).
 */

import type { ViewNode } from './ast.js';

// ==================== Flush Strategy ====================

/**
 * Flush strategy for streaming SSR
 *
 * - 'immediate': Flush content as soon as it's available
 * - 'batched': Batch chunks until timeout or buffer limit
 * - 'manual': Only flush when explicitly requested
 */
export type FlushStrategy = 'immediate' | 'batched' | 'manual';

/**
 * Valid flush strategy values for type guard
 */
const FLUSH_STRATEGIES: readonly FlushStrategy[] = ['immediate', 'batched', 'manual'] as const;

// ==================== Streaming Render Options ====================

/**
 * Options for streaming SSR render
 */
export interface StreamingRenderOptions {
  /** Enable streaming mode */
  streaming: boolean;
  /** Strategy for flushing chunks to the client */
  flushStrategy: FlushStrategy;
  /** Timeout in ms for batched flush strategy (default: 50ms) */
  batchTimeout?: number;
}

// ==================== Suspense Boundary ====================

/**
 * Represents a suspense boundary in the view tree
 *
 * Used to mark async content that should:
 * 1. Initially render fallback content
 * 2. Stream resolved content when promise completes
 * 3. Replace fallback with resolved content on the client
 */
export interface SuspenseBoundary {
  /** Unique identifier for this suspense boundary */
  id: string;
  /** Fallback content to show while loading */
  fallback: ViewNode;
  /** Promise that resolves to the actual content */
  promise: Promise<ViewNode>;
}

// ==================== Stream Chunk ====================

/**
 * Chunk types for streaming SSR
 *
 * - 'html': Regular HTML content
 * - 'shell': Document shell (DOCTYPE, html, head, body opening)
 * - 'fallback': Suspense fallback content
 * - 'resolved': Resolved suspense content (replaces fallback)
 * - 'end': End of stream (closing tags)
 * - 'error': Error content
 */
export type StreamChunkType = 'html' | 'shell' | 'fallback' | 'resolved' | 'end' | 'error';

/**
 * Valid stream chunk type values for type guard
 */
const STREAM_CHUNK_TYPES: readonly StreamChunkType[] = [
  'html',
  'shell',
  'fallback',
  'resolved',
  'end',
  'error',
] as const;

/**
 * A chunk of content in the streaming SSR output
 */
export interface StreamChunk {
  /** Type of this chunk */
  type: StreamChunkType;
  /** HTML content */
  content: string;
  /** Suspense boundary ID (for fallback/resolved types) */
  boundaryId?: string;
  /** Error object (for error type) */
  error?: Error;
}

// ==================== Type Guards ====================

/**
 * Type guard for StreamingRenderOptions
 *
 * @param value - Value to check
 * @returns true if value is a valid StreamingRenderOptions
 */
export function isStreamingRenderOptions(value: unknown): value is StreamingRenderOptions {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required: streaming must be boolean
  if (typeof obj['streaming'] !== 'boolean') {
    return false;
  }

  // Required: flushStrategy must be valid
  if (
    typeof obj['flushStrategy'] !== 'string' ||
    !FLUSH_STRATEGIES.includes(obj['flushStrategy'] as FlushStrategy)
  ) {
    return false;
  }

  // Optional: batchTimeout must be number if present
  if (obj['batchTimeout'] !== undefined && typeof obj['batchTimeout'] !== 'number') {
    return false;
  }

  return true;
}

/**
 * Type guard for SuspenseBoundary
 *
 * @param value - Value to check
 * @returns true if value is a valid SuspenseBoundary
 */
export function isSuspenseBoundary(value: unknown): value is SuspenseBoundary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required: id must be string
  if (typeof obj['id'] !== 'string') {
    return false;
  }

  // Required: fallback must be present (ViewNode check is shallow)
  if (typeof obj['fallback'] !== 'object' || obj['fallback'] === null) {
    return false;
  }

  // Required: promise must be present and be a Promise
  if (!(obj['promise'] instanceof Promise)) {
    return false;
  }

  return true;
}

/**
 * Type guard for StreamChunk
 *
 * @param value - Value to check
 * @returns true if value is a valid StreamChunk
 */
export function isStreamChunk(value: unknown): value is StreamChunk {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required: type must be valid
  if (
    typeof obj['type'] !== 'string' ||
    !STREAM_CHUNK_TYPES.includes(obj['type'] as StreamChunkType)
  ) {
    return false;
  }

  // Required: content must be string
  if (typeof obj['content'] !== 'string') {
    return false;
  }

  // Optional: boundaryId must be string if present
  if (obj['boundaryId'] !== undefined && typeof obj['boundaryId'] !== 'string') {
    return false;
  }

  // Optional: error must be Error if present
  if (obj['error'] !== undefined && !(obj['error'] instanceof Error)) {
    return false;
  }

  return true;
}
