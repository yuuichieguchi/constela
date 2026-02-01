/**
 * Island Loader - Dynamic module loading for Islands Architecture
 *
 * This module provides lazy loading and caching for island bundles,
 * enabling efficient code splitting for interactive components.
 */

/**
 * Options for creating an island loader.
 */
export interface IslandLoaderOptions {
  /** Base path for island bundles (default: "/_constela/islands/") */
  basePath?: string;
}

/**
 * Loaded island module structure.
 */
export interface LoadedIslandModule {
  /** The island definition */
  island: unknown;
  /** Island state definitions */
  state: Record<string, { type: string; initial: unknown }>;
  /** Island action definitions */
  actions: Record<string, unknown>;
  /** Default export (same as island) */
  default: unknown;
}

/**
 * Island loader interface.
 */
export interface IslandLoader {
  /**
   * Load an island module by ID.
   * Returns a promise that resolves with the loaded module.
   */
  load(id: string): Promise<LoadedIslandModule>;

  /**
   * Preload an island module in the background.
   * Fire-and-forget operation for warming the cache.
   */
  preload(id: string): void;
}

/**
 * Create an island loader for dynamically loading island bundles.
 *
 * The loader provides:
 * - Dynamic import of island bundles
 * - Caching of loaded modules
 * - Deduplication of concurrent requests
 * - Preloading for performance optimization
 *
 * @param options - Loader options
 * @returns Island loader instance
 *
 * @example
 * ```typescript
 * const loader = createIslandLoader();
 *
 * // Load an island when needed
 * const module = await loader.load('counter-island');
 *
 * // Preload islands for faster subsequent loads
 * loader.preload('modal-island');
 * ```
 */
export function createIslandLoader(options: IslandLoaderOptions = {}): IslandLoader {
  const basePath = options.basePath ?? '/_constela/islands/';

  // Cache for loaded modules
  const cache = new Map<string, LoadedIslandModule>();

  // In-flight promises for deduplication
  const pending = new Map<string, Promise<LoadedIslandModule>>();

  /**
   * Load an island module by ID.
   */
  async function load(id: string): Promise<LoadedIslandModule> {
    // Check cache first
    const cached = cache.get(id);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request
    const pendingPromise = pending.get(id);
    if (pendingPromise) {
      return pendingPromise;
    }

    // Create the loading promise with proper cleanup
    // We wrap the loadModule call to ensure cleanup happens and the promise
    // is properly handled even when multiple callers await it
    const loadPromise = (async () => {
      try {
        const module = await loadModule(id);
        // Store in cache on success
        cache.set(id, module);
        return module;
      } finally {
        // Remove from pending map regardless of outcome
        pending.delete(id);
      }
    })();

    // Store in pending map for deduplication
    pending.set(id, loadPromise);

    return loadPromise;
  }

  /**
   * Actually load the module via dynamic import.
   */
  async function loadModule(id: string): Promise<LoadedIslandModule> {
    // Sanitize ID for URL (same logic as bundler)
    const sanitizedId = id.replace(/[\/\\:*?"<>|]/g, '_');
    const modulePath = `${basePath}${sanitizedId}.js`;

    try {
      // Use dynamic import
      // Note: In browser environment, this uses native ES module loading
      const module = (await import(/* @vite-ignore */ modulePath)) as LoadedIslandModule;
      return module;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load island "${id}" from ${modulePath}: ${message}`);
    }
  }

  /**
   * Preload an island module in the background.
   */
  function preload(id: string): void {
    // Don't preload if already cached
    if (cache.has(id)) {
      return;
    }

    // Don't preload if already loading
    if (pending.has(id)) {
      return;
    }

    // Start loading in background (fire-and-forget)
    load(id).catch(() => {
      // Silently ignore preload errors
      // The actual load() call will retry and report errors
    });
  }

  return {
    load,
    preload,
  };
}
