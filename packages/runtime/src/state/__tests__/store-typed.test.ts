/**
 * Type tests for TypedStateStore
 * These tests verify that TypeScript type inference works correctly
 */

import { describe, it, expect } from 'vitest';
import { createTypedStateStore } from '../typed.js';
import type { TypedStateStore } from '../store.js';

interface TestAppState {
  items: { id: number; liked: boolean }[];
  filter: string;
  count: number;
  isLoading: boolean;
}

describe('TypedStateStore', () => {
  it('should provide type-safe get', () => {
    const state = createTypedStateStore<TestAppState>({
      items: { type: 'list', initial: [] },
      filter: { type: 'string', initial: '' },
      count: { type: 'number', initial: 0 },
      isLoading: { type: 'boolean', initial: false },
    });

    // These should all type-check correctly
    const items = state.get('items');
    const filter = state.get('filter');
    const count = state.get('count');
    const isLoading = state.get('isLoading');

    // Runtime assertions
    expect(Array.isArray(items)).toBe(true);
    expect(typeof filter).toBe('string');
    expect(typeof count).toBe('number');
    expect(typeof isLoading).toBe('boolean');
  });

  it('should provide type-safe set', () => {
    const state = createTypedStateStore<TestAppState>({
      items: { type: 'list', initial: [] },
      filter: { type: 'string', initial: '' },
      count: { type: 'number', initial: 0 },
      isLoading: { type: 'boolean', initial: false },
    });

    // These should all type-check correctly
    state.set('items', [{ id: 1, liked: true }]);
    state.set('filter', 'test');
    state.set('count', 42);
    state.set('isLoading', true);

    expect(state.get('items')).toEqual([{ id: 1, liked: true }]);
    expect(state.get('filter')).toBe('test');
    expect(state.get('count')).toBe(42);
    expect(state.get('isLoading')).toBe(true);
  });

  it('should provide type-safe subscribe', () => {
    const state = createTypedStateStore<TestAppState>({
      items: { type: 'list', initial: [] },
      filter: { type: 'string', initial: '' },
      count: { type: 'number', initial: 0 },
      isLoading: { type: 'boolean', initial: false },
    });

    let receivedCount: number | undefined;
    const unsubscribe = state.subscribe('count', (value) => {
      receivedCount = value; // Should be typed as number
    });

    state.set('count', 100);
    expect(receivedCount).toBe(100);

    unsubscribe();
  });

  // Additional tests for path methods
  it('should work with getPath and setPath', () => {
    const state = createTypedStateStore<TestAppState>({
      items: { type: 'list', initial: [{ id: 1, liked: false }] },
      filter: { type: 'string', initial: '' },
      count: { type: 'number', initial: 0 },
      isLoading: { type: 'boolean', initial: false },
    });

    state.setPath('items', [0, 'liked'], true);
    const liked = state.getPath('items', [0, 'liked']);
    expect(liked).toBe(true);
  });
});
