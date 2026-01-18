/**
 * File Watcher for Constela Start.
 *
 * Provides a file system watcher that monitors directories for changes
 * with support for:
 * - Recursive watching of nested directories
 * - Debouncing rapid changes
 * - File pattern filtering (default: *.json)
 * - Ignoring hidden files and node_modules
 */

import { watch, type FSWatcher } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { EventEmitter } from 'node:events';

// ==================== Types ====================

/**
 * Pattern matcher function type
 */
type PatternMatcher = (path: string) => boolean;

// ==================== Types ====================

/**
 * Event payload for file changes
 */
export interface FileChangeEvent {
  /** Absolute path to the changed file */
  path: string;
  /** Type of change: 'change' for create/modify, 'unlink' for delete */
  type: 'change' | 'unlink';
}

/**
 * File watcher interface
 */
export interface FileWatcher {
  /** Register a listener for change events */
  on(event: 'change', listener: (event: FileChangeEvent) => void): void;
  /** Register a listener for error events */
  on(event: 'error', listener: (error: Error) => void): void;
  /** Register a one-time listener for any event */
  once(event: string, listener: (...args: unknown[]) => void): void;
  /** Stop watching and clean up resources */
  close(): Promise<void>;
}

/**
 * Options for creating a file watcher
 */
export interface WatcherOptions {
  /** Directory to watch */
  directory: string;
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number;
  /** Glob patterns to match files (default: ['*.json']) */
  patterns?: string[];
}

// ==================== Constants ====================

const DEFAULT_DEBOUNCE_MS = 100;
const DEFAULT_PATTERNS = ['**/*.json'];

// ==================== Implementation ====================

/**
 * Checks if a path should be ignored (hidden files, node_modules, etc.)
 */
function shouldIgnore(filePath: string, baseDir: string): boolean {
  const relativePath = relative(baseDir, filePath);
  const segments = relativePath.split('/');

  for (const segment of segments) {
    // Ignore hidden files and directories (starting with .)
    if (segment.startsWith('.')) {
      return true;
    }
    // Ignore node_modules
    if (segment === 'node_modules') {
      return true;
    }
  }

  return false;
}

/**
 * Converts a glob pattern to a matcher function.
 *
 * Supports:
 * - Recursive patterns like starstar/star.ext - matches any directory depth
 * - Single star - matches any characters except /
 * - Literal extensions like .json, .tsx
 *
 * @param pattern - Glob pattern
 * @returns Matcher function
 */
function createPatternMatcher(pattern: string): PatternMatcher {
  // Handle **/*.ext pattern (most common case)
  if (pattern.startsWith('**/')) {
    const suffix = pattern.slice(3); // Remove **/

    if (suffix.startsWith('*.')) {
      // **/*.ext pattern - match any file with this extension
      const ext = suffix.slice(1); // Get .ext
      return (path: string) => path.endsWith(ext);
    }

    // **/filename pattern - match any path ending with filename
    return (path: string) => path.endsWith(suffix) || path.endsWith('/' + suffix);
  }

  // Handle *.ext pattern (files in root only)
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1); // Get .ext
    return (path: string) => {
      // Only match if there's no directory separator
      if (path.includes('/')) {
        return false;
      }
      return path.endsWith(ext);
    };
  }

  // Fallback: literal match
  return (path: string) => path === pattern;
}

/**
 * Checks if a file matches any of the patterns
 */
function matchesPatterns(filePath: string, baseDir: string, matchers: PatternMatcher[]): boolean {
  const relativePath = relative(baseDir, filePath);

  for (const matcher of matchers) {
    if (matcher(relativePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Creates a file watcher for the specified directory.
 *
 * @param options - Watcher configuration options
 * @returns Promise resolving to FileWatcher instance
 */
export async function createWatcher(options: WatcherOptions): Promise<FileWatcher> {
  const {
    directory,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    patterns = DEFAULT_PATTERNS,
  } = options;

  // Verify directory exists
  try {
    const stats = await stat(directory);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${directory}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Directory does not exist: ${directory}`);
    }
    throw error;
  }

  // Create pattern matchers
  const matchers = patterns.map((pattern) => createPatternMatcher(pattern));

  // Create event emitter for the watcher interface
  const emitter = new EventEmitter();

  // Track pending debounced events by file path
  const pendingEvents = new Map<string, NodeJS.Timeout>();

  // Track if watcher has been closed
  let isClosed = false;

  // Create fs.watch with recursive option
  let fsWatcher: FSWatcher | null = null;

  try {
    fsWatcher = watch(directory, { recursive: true }, (eventType, filename) => {
      if (isClosed || !filename) {
        return;
      }

      // Construct absolute path
      const absolutePath = join(directory, filename);

      // Check if should ignore
      if (shouldIgnore(absolutePath, directory)) {
        return;
      }

      // Check if matches patterns
      if (!matchesPatterns(absolutePath, directory, matchers)) {
        return;
      }

      // Cancel any pending debounced event for this file
      const existingTimeout = pendingEvents.get(absolutePath);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Schedule debounced event
      const timeout = setTimeout(async () => {
        pendingEvents.delete(absolutePath);

        if (isClosed) {
          return;
        }

        // Determine event type by checking if file exists
        let changeType: 'change' | 'unlink' = 'change';
        try {
          await stat(absolutePath);
          changeType = 'change';
        } catch {
          // File doesn't exist - it was deleted
          changeType = 'unlink';
        }

        const event: FileChangeEvent = {
          path: absolutePath,
          type: changeType,
        };

        emitter.emit('change', event);
      }, debounceMs);

      pendingEvents.set(absolutePath, timeout);
    });

    // Forward errors from fs.watch
    fsWatcher.on('error', (error) => {
      if (!isClosed) {
        emitter.emit('error', error);
      }
    });
  } catch (error) {
    throw error;
  }

  // Use type assertion for the watcher object since we can't declare overloads in object literals
  const watcher = {
    on(event: string, listener: (...args: unknown[]) => void): void {
      emitter.on(event, listener as (...args: unknown[]) => void);
    },

    once(event: string, listener: (...args: unknown[]) => void): void {
      emitter.once(event, listener);
    },

    close(): Promise<void> {
      return new Promise((resolve) => {
        if (isClosed) {
          resolve();
          return;
        }
        isClosed = true;

        // Clear all pending debounced events
        for (const timeout of pendingEvents.values()) {
          clearTimeout(timeout);
        }
        pendingEvents.clear();

        // Close fs watcher
        if (fsWatcher) {
          fsWatcher.close();
          fsWatcher = null;
        }

        // Remove all listeners
        emitter.removeAllListeners();

        resolve();
      });
    },
  };

  return watcher as FileWatcher;
}
