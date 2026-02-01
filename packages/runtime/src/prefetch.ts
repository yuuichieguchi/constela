/**
 * Island Prefetching - Optimized preloading for Islands Architecture
 *
 * This module provides prefetching strategies for island bundles,
 * enabling optimized loading based on user interaction patterns.
 */

import type { IslandLoader } from './island-loader.js';

// ==================== Constants ====================

export const PREFETCH_STRATEGIES = ['hover', 'visible', 'immediate'] as const;
export type PrefetchStrategy = (typeof PREFETCH_STRATEGIES)[number];

// ==================== Interfaces ====================

/**
 * Options for configuring prefetch behavior.
 */
export interface PrefetchOptions {
  /** The prefetch strategy to use */
  strategy: PrefetchStrategy;
  /** Intersection threshold for visible strategy (0-1) */
  threshold?: number;
  /** Root margin for visible strategy */
  rootMargin?: string;
}

/**
 * Prefetcher interface returned by createPrefetcher.
 */
export interface Prefetcher {
  /**
   * Prefetch an island when the element is hovered.
   * Returns a cleanup function to remove the event listener.
   */
  prefetchOnHover(element: HTMLElement, id: string): () => void;

  /**
   * Prefetch an island when the element becomes visible.
   * Returns a cleanup function to unobserve the element.
   */
  prefetchOnVisible(element: HTMLElement, id: string, options?: PrefetchOptions): () => void;
}

// ==================== Type Guards ====================

/**
 * Checks if a value is a valid PrefetchOptions object.
 */
export function isPrefetchOptions(value: unknown): value is PrefetchOptions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // strategy is required and must be valid
  if (!PREFETCH_STRATEGIES.includes(obj['strategy'] as PrefetchStrategy)) {
    return false;
  }

  // threshold is optional but must be number if present
  if ('threshold' in obj && obj['threshold'] !== undefined) {
    if (typeof obj['threshold'] !== 'number') {
      return false;
    }
  }

  // rootMargin is optional but must be string if present
  if ('rootMargin' in obj && obj['rootMargin'] !== undefined) {
    if (typeof obj['rootMargin'] !== 'string') {
      return false;
    }
  }

  return true;
}

// ==================== Global Prefetch ====================

// Global loader reference (set by runtime initialization)
let globalLoader: IslandLoader | null = null;

/**
 * Set the global island loader for prefetchIsland.
 * This is typically called during app initialization.
 */
export function setGlobalLoader(loader: IslandLoader): void {
  globalLoader = loader;
}

/**
 * Prefetch an island by ID.
 * Uses the global loader if available.
 *
 * @param id - The island ID to prefetch
 * @param options - Optional prefetch options
 */
export function prefetchIsland(id: string, options?: PrefetchOptions): void {
  // Validate options if provided
  if (options !== undefined && !isPrefetchOptions(options)) {
    return;
  }

  // Use global loader if available
  if (globalLoader) {
    globalLoader.preload(id);
  }
}

// ==================== Prefetcher Factory ====================

/**
 * Create a prefetcher instance bound to a specific island loader.
 *
 * @param loader - The island loader to use for prefetching
 * @returns Prefetcher instance with prefetchOnHover and prefetchOnVisible methods
 *
 * @example
 * ```typescript
 * const loader = createIslandLoader();
 * const prefetcher = createPrefetcher(loader);
 *
 * // Prefetch on hover
 * const cleanup = prefetcher.prefetchOnHover(element, 'counter-island');
 *
 * // Prefetch when visible
 * const cleanup2 = prefetcher.prefetchOnVisible(element, 'chart-island', {
 *   strategy: 'visible',
 *   threshold: 0.5,
 *   rootMargin: '100px',
 * });
 * ```
 */
export function createPrefetcher(loader: IslandLoader): Prefetcher {
  // Track prefetched IDs to avoid duplicate prefetches
  const prefetchedIds = new Set<string>();

  /**
   * Prefetch an island ID once.
   */
  function prefetchOnce(id: string): void {
    if (prefetchedIds.has(id)) {
      return;
    }
    prefetchedIds.add(id);
    loader.preload(id);
  }

  /**
   * Prefetch an island when the element is hovered.
   */
  function prefetchOnHover(element: HTMLElement, id: string): () => void {
    let cleaned = false;

    const handler = (): void => {
      if (cleaned) return;
      prefetchOnce(id);
    };

    element.addEventListener('mouseenter', handler, { passive: true });

    return (): void => {
      if (cleaned) return;
      cleaned = true;
      element.removeEventListener('mouseenter', handler, { passive: true } as EventListenerOptions);
    };
  }

  /**
   * Prefetch an island when the element becomes visible.
   */
  function prefetchOnVisible(element: HTMLElement, id: string, options?: PrefetchOptions): () => void {
    let cleaned = false;
    let observer: IntersectionObserver | null = null;

    const observerOptions: IntersectionObserverInit = {};
    if (options?.threshold !== undefined) {
      observerOptions.threshold = options.threshold;
    }
    if (options?.rootMargin !== undefined) {
      observerOptions.rootMargin = options.rootMargin;
    }

    const callback: IntersectionObserverCallback = (entries): void => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target === element) {
          prefetchOnce(id);
          // Unobserve after first intersection
          if (observer) {
            observer.unobserve(element);
          }
          break;
        }
      }
    };

    observer = new IntersectionObserver(callback, observerOptions);
    observer.observe(element);

    return (): void => {
      if (cleaned) return;
      cleaned = true;
      if (observer) {
        observer.unobserve(element);
        observer = null;
      }
    };
  }

  return {
    prefetchOnHover,
    prefetchOnVisible,
  };
}
