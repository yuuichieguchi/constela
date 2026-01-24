/**
 * StateStore - Centralized state management
 *
 * Creates signals for each state field defined in the program.
 * Provides get/set methods for accessing state.
 */

import { createSignal, type Signal } from '../reactive/signal.js';
import { isCookieInitialExpr } from '@constela/core';

export interface StateStore {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  subscribe(name: string, fn: (value: unknown) => void): () => void;
  getPath(name: string, path: string | (string | number)[]): unknown;
  setPath(name: string, path: string | (string | number)[], value: unknown): void;
  subscribeToPath(
    name: string,
    path: string | (string | number)[],
    fn: (value: unknown) => void
  ): () => void;
  serialize(): Record<string, unknown>;
  restore(snapshot: Record<string, unknown>, newDefinitions: StateDefinition[]): void;
}

export interface StateDefinition {
  name?: string;
  type: string;
  initial: unknown;
}

/**
 * TypedStateStore - Generic interface for type-safe state access
 *
 * Usage:
 * interface AppState {
 *   items: { id: number; liked: boolean }[];
 *   filter: string;
 * }
 * const state = createStateStore(definitions) as TypedStateStore<AppState>;
 * state.get('items'); // returns { id: number; liked: boolean }[]
 */
export interface TypedStateStore<T extends Record<string, unknown>> extends StateStore {
  get<K extends keyof T>(name: K): T[K];
  set<K extends keyof T>(name: K, value: T[K]): void;
  subscribe<K extends keyof T>(name: K, fn: (value: T[K]) => void): () => void;
  getPath<K extends keyof T>(name: K, path: string | (string | number)[]): unknown;
  setPath<K extends keyof T>(name: K, path: string | (string | number)[], value: unknown): void;
  subscribeToPath<K extends keyof T>(name: K, path: string | (string | number)[], fn: (value: unknown) => void): () => void;
}

/**
 * Normalize path to array format
 * Handles both string paths ("address.city") and array paths ([0, "liked"])
 */
function normalizePath(path: string | (string | number)[]): (string | number)[] {
  if (typeof path === 'string') {
    return path.split('.').map((segment) => {
      const num = parseInt(segment, 10);
      return isNaN(num) ? segment : num;
    });
  }
  return path;
}

/**
 * Get value at a nested path within an object
 * Returns undefined if any intermediate value is nullish
 */
function getValueAtPath(obj: unknown, path: (string | number)[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/**
 * Set value at a nested path immutably
 * Creates new objects/arrays at each level, preserving siblings
 */
function setValueAtPath(
  obj: unknown,
  path: (string | number)[],
  value: unknown
): unknown {
  if (path.length === 0) return value;

  // Safe to assert: path.length > 0 is guaranteed by the guard above
  const head = path[0] as string | number;
  const rest = path.slice(1);

  // Clone the current level appropriately based on the actual object type
  let clone: unknown;
  if (Array.isArray(obj)) {
    clone = [...obj];
  } else if (obj != null && typeof obj === 'object') {
    clone = { ...(obj as object) };
  } else {
    // If obj is null/undefined, determine type from head
    const isArrayIndex = typeof head === 'number' || (typeof head === 'string' && /^\d+$/.test(head));
    clone = isArrayIndex ? [] : {};
  }

  // Recursively set the nested value
  const objRecord = obj as Record<string | number, unknown> | null | undefined;
  (clone as Record<string | number, unknown>)[head] = setValueAtPath(
    objRecord?.[head],
    rest,
    value
  );

  return clone;
}

/**
 * Get cookie value by key from document.cookie
 * @param key - The cookie key to retrieve
 * @returns The cookie value or undefined if not found
 */
function getCookieValue(key: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const cookie of document.cookie.split(';')) {
    const eqIndex = cookie.indexOf('=');
    if (eqIndex === -1) continue;
    // Only trim the name part (before =), preserve value as-is
    const name = cookie.slice(0, eqIndex).trim();
    if (name === key) {
      const value = cookie.slice(eqIndex + 1);
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

export function createStateStore(
  definitions: Record<string, StateDefinition>
): StateStore {
  const signals = new Map<string, Signal<unknown>>();

  // Create a signal for each state field
  for (const [name, def] of Object.entries(definitions)) {
    let initialValue: unknown;

    // Evaluate cookie expression for initial value
    if (isCookieInitialExpr(def.initial)) {
      // Cookie expression is the source of truth - do NOT read localStorage
      const cookieValue = getCookieValue(def.initial.key);
      initialValue = cookieValue !== undefined ? cookieValue : def.initial.default;
    } else {
      initialValue = def.initial;

      // Read localStorage for 'theme' state to sync with anti-flash script
      // Only when NOT using cookie expression (backward compatibility)
      if (name === 'theme' && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('theme');
          if (stored !== null) {
            try {
              initialValue = JSON.parse(stored);
            } catch {
              initialValue = stored;
            }
          }
        } catch {
          // Ignore localStorage errors (SSR, private browsing, etc.)
        }
      }
    }

    signals.set(name, createSignal(initialValue));
  }

  return {
    get(name: string): unknown {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      return signal.get();
    },

    set(name: string, value: unknown): void {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }

      // Save theme to cookie for SSR synchronization (before signal.set to ensure it's set before subscribers are notified)
      if (name === 'theme' && typeof document !== 'undefined') {
        try {
          const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
          const oneYear = 365 * 24 * 60 * 60;
          const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `theme=${encodeURIComponent(valueStr)}; path=/; max-age=${oneYear}; SameSite=Lax${secure}`;
        } catch {
          // Ignore cookie setting errors
        }
      }

      signal.set(value);
    },

    subscribe(name: string, fn: (value: unknown) => void): () => void {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      return signal.subscribe!(fn);
    },

    getPath(name: string, path: string | (string | number)[]): unknown {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      const normalizedPath = normalizePath(path);
      return getValueAtPath(signal.get(), normalizedPath);
    },

    setPath(name: string, path: string | (string | number)[], value: unknown): void {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      const normalizedPath = normalizePath(path);
      const currentState = signal.get();
      const newState = setValueAtPath(currentState, normalizedPath, value);
      signal.set(newState);
    },

    subscribeToPath(
      name: string,
      path: string | (string | number)[],
      fn: (value: unknown) => void
    ): () => void {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      const normalizedPath = normalizePath(path);

      // Track the previous value at the path
      let previousValue = getValueAtPath(signal.get(), normalizedPath);

      // Subscribe to field-level changes and filter by path value changes
      return signal.subscribe!((newFieldValue: unknown) => {
        const newValue = getValueAtPath(newFieldValue, normalizedPath);
        if (newValue !== previousValue) {
          previousValue = newValue;
          fn(newValue);
        }
      });
    },

    serialize(): Record<string, unknown> {
      const result: Record<string, unknown> = {};
      for (const [name, signal] of signals) {
        const value = signal.get();
        // Skip function values (not serializable)
        if (typeof value !== 'function') {
          result[name] = value;
        }
      }
      return result;
    },

    restore(snapshot: Record<string, unknown>, newDefinitions: StateDefinition[]): void {
      for (const def of newDefinitions) {
        const name = def.name;
        if (!name) continue;

        const signal = signals.get(name);
        if (!signal) continue;

        // Check if field exists in snapshot
        if (!(name in snapshot)) {
          // Field doesn't exist in snapshot - use new initial value (already set)
          continue;
        }

        const snapshotValue = snapshot[name];
        const initialValue = def.initial;

        // Check if types match
        if (typesMatch(snapshotValue, initialValue)) {
          // Same type - restore from snapshot
          signal.set(snapshotValue);
        } else {
          // Type changed - use new initial value and warn
          console.warn(
            `State field "${name}" type changed. Using new initial value.`
          );
          signal.set(initialValue);
        }
      }
    },
  };
}

/**
 * Check if two values have the same type for restoration purposes
 * - null is considered compatible with object types (nullable objects)
 * - Arrays are compared with Array.isArray()
 * - Primitives are compared with typeof
 */
function typesMatch(a: unknown, b: unknown): boolean {
  // Handle null - null is compatible with object types
  if (a === null) {
    // null can be restored if the initial value is an object (including null)
    return b === null || (typeof b === 'object' && !Array.isArray(b));
  }
  if (b === null) {
    // If initial value is null, allow any object (including null) from snapshot
    return typeof a === 'object' && !Array.isArray(a);
  }

  // Handle arrays
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray || bIsArray) {
    return aIsArray && bIsArray;
  }

  // Handle primitives and objects with typeof
  return typeof a === typeof b;
}
