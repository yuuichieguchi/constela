/**
 * Typed State Store - Helper for creating type-safe state stores
 */

import { createStateStore, type TypedStateStore, type StateDefinition } from './store.js';

/**
 * Creates a type-safe state store with inferred types
 *
 * @example
 * interface AppState {
 *   items: { id: number; liked: boolean }[];
 *   filter: string;
 *   count: number;
 * }
 *
 * const state = createTypedStateStore<AppState>({
 *   items: { type: 'list', initial: [] },
 *   filter: { type: 'string', initial: '' },
 *   count: { type: 'number', initial: 0 },
 * });
 *
 * state.get('items'); // correctly typed as { id: number; liked: boolean }[]
 * state.set('count', 10); // type-checked
 */
export function createTypedStateStore<T extends Record<string, unknown>>(
  definitions: { [K in keyof T]: StateDefinition }
): TypedStateStore<T> {
  return createStateStore(definitions) as TypedStateStore<T>;
}

export type { TypedStateStore };
