/**
 * Test module for Optimistic UI Updates Manager.
 *
 * Coverage:
 * - Apply update: Immediately updates state, returns unique ID
 * - Confirm update: Removes pending update, returns true
 * - Reject update: Rolls back to original value, returns true
 * - Path updates: Works with nested paths like ['items', 0, 'liked']
 * - Multiple pending: Handles multiple simultaneous pending updates
 * - Unknown ID: confirm/reject with unknown ID returns false
 * - Auto rollback: Optional timeout-based auto rollback
 * - getPending: Returns pending update by ID
 * - getAllPending: Returns all pending updates
 *
 * TDD Red Phase: These tests verify the optimistic update functionality
 * for immediate UI feedback before server confirmation with rollback support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOptimisticManager,
  type OptimisticManager,
  type PendingUpdate,
} from '../manager.js';

// ==================== Test Setup ====================

describe('OptimisticManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==================== Fixtures ====================

  /**
   * Creates a simple state store for testing
   */
  function createStateStore(initialState: Record<string, unknown> = {}) {
    const store = { ...initialState };

    return {
      getState: (target: string): unknown => store[target],
      setState: (target: string, value: unknown): void => {
        store[target] = value;
      },
      getAll: () => ({ ...store }),
    };
  }

  // ==================== createOptimisticManager Tests ====================

  describe('createOptimisticManager', () => {
    it('should create an OptimisticManager instance', () => {
      // Act
      const manager = createOptimisticManager();

      // Assert
      expect(manager).toBeDefined();
      expect(typeof manager.apply).toBe('function');
      expect(typeof manager.confirm).toBe('function');
      expect(typeof manager.reject).toBe('function');
      expect(typeof manager.getPending).toBe('function');
      expect(typeof manager.getAllPending).toBe('function');
      expect(typeof manager.setAutoRollbackTimeout).toBe('function');
      expect(typeof manager.dispose).toBe('function');
    });
  });

  // ==================== apply() Tests ====================

  describe('apply()', () => {
    it('should immediately update state and return unique ID', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 0 });

      // Act
      const updateId = manager.apply(
        'counter',
        undefined,
        10,
        store.getState,
        store.setState
      );

      // Assert
      expect(updateId).toBeDefined();
      expect(typeof updateId).toBe('string');
      expect(updateId.length).toBeGreaterThan(0);
      expect(store.getState('counter')).toBe(10);
    });

    it('should generate unique IDs for each apply call', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 0, b: 0 });

      // Act
      const id1 = manager.apply('a', undefined, 1, store.getState, store.setState);
      const id2 = manager.apply('b', undefined, 2, store.getState, store.setState);
      const id3 = manager.apply('a', undefined, 3, store.getState, store.setState);

      // Assert
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should store original value before update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 42 });

      // Act
      const updateId = manager.apply(
        'counter',
        undefined,
        100,
        store.getState,
        store.setState
      );

      // Assert
      const pending = manager.getPending(updateId);
      expect(pending).toBeDefined();
      expect(pending?.originalValue).toBe(42);
      expect(pending?.optimisticValue).toBe(100);
    });

    it('should record timestamp when applying update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'old' });
      const now = Date.now();
      vi.setSystemTime(now);

      // Act
      const updateId = manager.apply(
        'value',
        undefined,
        'new',
        store.getState,
        store.setState
      );

      // Assert
      const pending = manager.getPending(updateId);
      expect(pending?.timestamp).toBe(now);
    });

    it('should clone state when updating to prevent mutation', () => {
      // Arrange
      const manager = createOptimisticManager();
      const originalObject = { nested: { value: 1 } };
      const store = createStateStore({ data: originalObject });

      // Act
      const updatedObject = { nested: { value: 2 } };
      manager.apply('data', undefined, updatedObject, store.getState, store.setState);

      // Assert - original object should not be mutated
      expect(originalObject.nested.value).toBe(1);
      expect(store.getState('data')).toEqual({ nested: { value: 2 } });
    });
  });

  // ==================== Path Updates Tests ====================

  describe('path updates', () => {
    it('should update nested value at specified path', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        user: { profile: { name: 'Alice', age: 30 } },
      });

      // Act
      manager.apply(
        'user',
        ['profile', 'name'],
        'Bob',
        store.getState,
        store.setState
      );

      // Assert
      const user = store.getState('user') as { profile: { name: string; age: number } };
      expect(user.profile.name).toBe('Bob');
      expect(user.profile.age).toBe(30); // other fields unchanged
    });

    it('should update array item at specified index path', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        items: [
          { id: 1, liked: false },
          { id: 2, liked: false },
          { id: 3, liked: false },
        ],
      });

      // Act
      manager.apply(
        'items',
        [1, 'liked'],
        true,
        store.getState,
        store.setState
      );

      // Assert
      const items = store.getState('items') as Array<{ id: number; liked: boolean }>;
      expect(items[0].liked).toBe(false);
      expect(items[1].liked).toBe(true);
      expect(items[2].liked).toBe(false);
    });

    it('should store deep path in pending update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        data: { deeply: { nested: { value: 'original' } } },
      });

      // Act
      const updateId = manager.apply(
        'data',
        ['deeply', 'nested', 'value'],
        'updated',
        store.getState,
        store.setState
      );

      // Assert
      const pending = manager.getPending(updateId);
      expect(pending?.path).toEqual(['deeply', 'nested', 'value']);
    });

    it('should preserve array references for unmodified items', () => {
      // Arrange
      const manager = createOptimisticManager();
      const item0 = { id: 1, name: 'first' };
      const item1 = { id: 2, name: 'second' };
      const store = createStateStore({
        items: [item0, item1],
      });

      // Act
      manager.apply(
        'items',
        [1, 'name'],
        'modified',
        store.getState,
        store.setState
      );

      // Assert
      const items = store.getState('items') as Array<{ id: number; name: string }>;
      expect(items[0]).toEqual(item0); // Content should match
      expect(items[1].name).toBe('modified');
    });

    it('should handle empty path as full replacement', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ data: { old: 'value' } });

      // Act
      manager.apply(
        'data',
        [],
        { new: 'value' },
        store.getState,
        store.setState
      );

      // Assert
      expect(store.getState('data')).toEqual({ new: 'value' });
    });
  });

  // ==================== confirm() Tests ====================

  describe('confirm()', () => {
    it('should remove pending update and return true', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 0 });
      const updateId = manager.apply(
        'counter',
        undefined,
        10,
        store.getState,
        store.setState
      );

      // Act
      const result = manager.confirm(updateId);

      // Assert
      expect(result).toBe(true);
      expect(manager.getPending(updateId)).toBeUndefined();
    });

    it('should return false for unknown ID', () => {
      // Arrange
      const manager = createOptimisticManager();

      // Act
      const result = manager.confirm('unknown-id');

      // Assert
      expect(result).toBe(false);
    });

    it('should not modify state when confirming', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'initial' });
      const updateId = manager.apply(
        'value',
        undefined,
        'optimistic',
        store.getState,
        store.setState
      );

      // Act
      manager.confirm(updateId);

      // Assert - state should remain as optimistic value
      expect(store.getState('value')).toBe('optimistic');
    });

    it('should only remove the specified pending update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 0, b: 0 });
      const id1 = manager.apply('a', undefined, 1, store.getState, store.setState);
      const id2 = manager.apply('b', undefined, 2, store.getState, store.setState);

      // Act
      manager.confirm(id1);

      // Assert
      expect(manager.getPending(id1)).toBeUndefined();
      expect(manager.getPending(id2)).toBeDefined();
    });

    it('should return false when confirming same ID twice', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 0 });
      const updateId = manager.apply(
        'value',
        undefined,
        10,
        store.getState,
        store.setState
      );

      // Act
      const first = manager.confirm(updateId);
      const second = manager.confirm(updateId);

      // Assert
      expect(first).toBe(true);
      expect(second).toBe(false);
    });
  });

  // ==================== reject() Tests ====================

  describe('reject()', () => {
    it('should rollback to original value and return true', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 42 });
      const updateId = manager.apply(
        'counter',
        undefined,
        100,
        store.getState,
        store.setState
      );

      // Act
      const result = manager.reject(updateId, store.getState, store.setState);

      // Assert
      expect(result).toBe(true);
      expect(store.getState('counter')).toBe(42);
    });

    it('should return false for unknown ID', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({});

      // Act
      const result = manager.reject('unknown-id', store.getState, store.setState);

      // Assert
      expect(result).toBe(false);
    });

    it('should remove pending update after rejection', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      const updateId = manager.apply(
        'value',
        undefined,
        'optimistic',
        store.getState,
        store.setState
      );

      // Act
      manager.reject(updateId, store.getState, store.setState);

      // Assert
      expect(manager.getPending(updateId)).toBeUndefined();
    });

    it('should rollback nested path to original value', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        user: { profile: { name: 'Alice' } },
      });
      const updateId = manager.apply(
        'user',
        ['profile', 'name'],
        'Bob',
        store.getState,
        store.setState
      );

      // Act
      manager.reject(updateId, store.getState, store.setState);

      // Assert
      const user = store.getState('user') as { profile: { name: string } };
      expect(user.profile.name).toBe('Alice');
    });

    it('should rollback array item to original value', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        items: [
          { id: 1, liked: false },
          { id: 2, liked: false },
        ],
      });
      const updateId = manager.apply(
        'items',
        [0, 'liked'],
        true,
        store.getState,
        store.setState
      );

      // Act
      manager.reject(updateId, store.getState, store.setState);

      // Assert
      const items = store.getState('items') as Array<{ id: number; liked: boolean }>;
      expect(items[0].liked).toBe(false);
    });

    it('should return false when rejecting same ID twice', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      const updateId = manager.apply(
        'value',
        undefined,
        'optimistic',
        store.getState,
        store.setState
      );

      // Act
      const first = manager.reject(updateId, store.getState, store.setState);
      const second = manager.reject(updateId, store.getState, store.setState);

      // Assert
      expect(first).toBe(true);
      expect(second).toBe(false);
    });
  });

  // ==================== Multiple Pending Updates Tests ====================

  describe('multiple pending updates', () => {
    it('should track multiple simultaneous pending updates', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 1, b: 2, c: 3 });

      // Act
      const id1 = manager.apply('a', undefined, 10, store.getState, store.setState);
      const id2 = manager.apply('b', undefined, 20, store.getState, store.setState);
      const id3 = manager.apply('c', undefined, 30, store.getState, store.setState);

      // Assert
      const allPending = manager.getAllPending();
      expect(allPending).toHaveLength(3);
      expect(allPending.map((p) => p.id)).toContain(id1);
      expect(allPending.map((p) => p.id)).toContain(id2);
      expect(allPending.map((p) => p.id)).toContain(id3);
    });

    it('should handle multiple updates to same target', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 0 });

      // Act
      const id1 = manager.apply(
        'counter',
        undefined,
        1,
        store.getState,
        store.setState
      );
      const id2 = manager.apply(
        'counter',
        undefined,
        2,
        store.getState,
        store.setState
      );
      const id3 = manager.apply(
        'counter',
        undefined,
        3,
        store.getState,
        store.setState
      );

      // Assert - current value should be latest
      expect(store.getState('counter')).toBe(3);

      // All updates should be tracked
      const allPending = manager.getAllPending();
      expect(allPending).toHaveLength(3);
    });

    it('should correctly rollback multiple updates in reverse order', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 0 });

      const id1 = manager.apply(
        'counter',
        undefined,
        1,
        store.getState,
        store.setState
      );
      const id2 = manager.apply(
        'counter',
        undefined,
        2,
        store.getState,
        store.setState
      );
      const id3 = manager.apply(
        'counter',
        undefined,
        3,
        store.getState,
        store.setState
      );

      // Act - reject in reverse order
      manager.reject(id3, store.getState, store.setState);
      expect(store.getState('counter')).toBe(2);

      manager.reject(id2, store.getState, store.setState);
      expect(store.getState('counter')).toBe(1);

      manager.reject(id1, store.getState, store.setState);
      expect(store.getState('counter')).toBe(0);
    });

    it('should handle interleaved confirm and reject', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 0, b: 0 });

      const id1 = manager.apply('a', undefined, 1, store.getState, store.setState);
      const id2 = manager.apply('b', undefined, 2, store.getState, store.setState);
      const id3 = manager.apply('a', undefined, 3, store.getState, store.setState);

      // Act
      manager.confirm(id1); // confirm first a update
      manager.reject(id2, store.getState, store.setState); // reject b update
      manager.confirm(id3); // confirm second a update

      // Assert
      expect(store.getState('a')).toBe(3); // confirmed
      expect(store.getState('b')).toBe(0); // rolled back
      expect(manager.getAllPending()).toHaveLength(0);
    });
  });

  // ==================== getPending() Tests ====================

  describe('getPending()', () => {
    it('should return pending update by ID', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'old' });
      const updateId = manager.apply(
        'value',
        undefined,
        'new',
        store.getState,
        store.setState
      );

      // Act
      const pending = manager.getPending(updateId);

      // Assert
      expect(pending).toBeDefined();
      expect(pending?.id).toBe(updateId);
      expect(pending?.target).toBe('value');
      expect(pending?.originalValue).toBe('old');
      expect(pending?.optimisticValue).toBe('new');
    });

    it('should return undefined for unknown ID', () => {
      // Arrange
      const manager = createOptimisticManager();

      // Act
      const pending = manager.getPending('nonexistent');

      // Assert
      expect(pending).toBeUndefined();
    });

    it('should include path in pending update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        items: [{ id: 1, liked: false }],
      });
      const updateId = manager.apply(
        'items',
        [0, 'liked'],
        true,
        store.getState,
        store.setState
      );

      // Act
      const pending = manager.getPending(updateId);

      // Assert
      expect(pending?.path).toEqual([0, 'liked']);
    });

    it('should have undefined path when no path specified', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 0 });
      const updateId = manager.apply(
        'value',
        undefined,
        10,
        store.getState,
        store.setState
      );

      // Act
      const pending = manager.getPending(updateId);

      // Assert
      expect(pending?.path).toBeUndefined();
    });
  });

  // ==================== getAllPending() Tests ====================

  describe('getAllPending()', () => {
    it('should return empty array when no pending updates', () => {
      // Arrange
      const manager = createOptimisticManager();

      // Act
      const allPending = manager.getAllPending();

      // Assert
      expect(allPending).toEqual([]);
    });

    it('should return all pending updates', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 1, b: 2 });

      manager.apply('a', undefined, 10, store.getState, store.setState);
      manager.apply('b', undefined, 20, store.getState, store.setState);

      // Act
      const allPending = manager.getAllPending();

      // Assert
      expect(allPending).toHaveLength(2);
      expect(allPending.map((p) => p.target)).toContain('a');
      expect(allPending.map((p) => p.target)).toContain('b');
    });

    it('should return defensive copy of pending updates', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 0 });
      manager.apply('value', undefined, 1, store.getState, store.setState);

      // Act
      const allPending1 = manager.getAllPending();
      const allPending2 = manager.getAllPending();

      // Assert - should be different array instances
      expect(allPending1).not.toBe(allPending2);
      expect(allPending1).toEqual(allPending2);
    });

    it('should reflect confirmed updates removal', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 1, b: 2 });

      const id1 = manager.apply('a', undefined, 10, store.getState, store.setState);
      manager.apply('b', undefined, 20, store.getState, store.setState);

      // Act
      manager.confirm(id1);
      const allPending = manager.getAllPending();

      // Assert
      expect(allPending).toHaveLength(1);
      expect(allPending[0].target).toBe('b');
    });
  });

  // ==================== Auto Rollback Tests ====================

  describe('auto rollback timeout', () => {
    it('should auto-rollback after specified timeout', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      manager.setAutoRollbackTimeout(5000);

      // Act
      manager.apply('value', undefined, 'optimistic', store.getState, store.setState);

      // Assert - before timeout
      vi.advanceTimersByTime(4999);
      expect(store.getState('value')).toBe('optimistic');

      // After timeout
      vi.advanceTimersByTime(1);
      expect(store.getState('value')).toBe('original');
    });

    it('should not auto-rollback if confirmed before timeout', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      manager.setAutoRollbackTimeout(5000);

      const updateId = manager.apply(
        'value',
        undefined,
        'optimistic',
        store.getState,
        store.setState
      );

      // Act
      vi.advanceTimersByTime(3000);
      manager.confirm(updateId);
      vi.advanceTimersByTime(5000);

      // Assert - should remain as optimistic value since confirmed
      expect(store.getState('value')).toBe('optimistic');
    });

    it('should not auto-rollback if rejected before timeout', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      manager.setAutoRollbackTimeout(5000);

      const updateId = manager.apply(
        'value',
        undefined,
        'optimistic',
        store.getState,
        store.setState
      );

      // Act
      vi.advanceTimersByTime(2000);
      manager.reject(updateId, store.getState, store.setState);

      // Store value after rejection
      const valueAfterReject = store.getState('value');

      vi.advanceTimersByTime(5000);

      // Assert - should remain as original (already rolled back)
      expect(store.getState('value')).toBe('original');
      expect(valueAfterReject).toBe('original');
    });

    it('should apply auto-rollback to updates created after setAutoRollbackTimeout', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });

      // First update without timeout
      const id1 = manager.apply(
        'value',
        undefined,
        'first',
        store.getState,
        store.setState
      );
      manager.confirm(id1);

      // Set timeout
      manager.setAutoRollbackTimeout(3000);

      // Second update should have auto-rollback
      manager.apply('value', undefined, 'second', store.getState, store.setState);

      // Act
      vi.advanceTimersByTime(3000);

      // Assert
      expect(store.getState('value')).toBe('first');
    });

    it('should disable auto-rollback when timeout is 0', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      manager.setAutoRollbackTimeout(5000);
      manager.setAutoRollbackTimeout(0); // Disable

      // Act
      manager.apply('value', undefined, 'optimistic', store.getState, store.setState);
      vi.advanceTimersByTime(10000);

      // Assert - should not have rolled back
      expect(store.getState('value')).toBe('optimistic');
    });

    it('should handle multiple pending updates with auto-rollback', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 'a-original', b: 'b-original' });
      manager.setAutoRollbackTimeout(3000);

      // Act
      manager.apply('a', undefined, 'a-optimistic', store.getState, store.setState);
      vi.advanceTimersByTime(1000);
      manager.apply('b', undefined, 'b-optimistic', store.getState, store.setState);

      // At t=3000, 'a' should rollback
      vi.advanceTimersByTime(2000);
      expect(store.getState('a')).toBe('a-original');
      expect(store.getState('b')).toBe('b-optimistic');

      // At t=4000, 'b' should rollback
      vi.advanceTimersByTime(1000);
      expect(store.getState('b')).toBe('b-original');
    });
  });

  // ==================== dispose() Tests ====================

  describe('dispose()', () => {
    it('should clear all pending updates', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ a: 1, b: 2 });

      manager.apply('a', undefined, 10, store.getState, store.setState);
      manager.apply('b', undefined, 20, store.getState, store.setState);

      // Act
      manager.dispose();

      // Assert
      expect(manager.getAllPending()).toEqual([]);
    });

    it('should cancel auto-rollback timers', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });
      manager.setAutoRollbackTimeout(5000);

      manager.apply('value', undefined, 'optimistic', store.getState, store.setState);

      // Act
      manager.dispose();
      vi.advanceTimersByTime(10000);

      // Assert - auto-rollback should not have happened
      expect(store.getState('value')).toBe('optimistic');
    });

    it('should allow new operations after dispose', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 0 });

      manager.apply('value', undefined, 1, store.getState, store.setState);
      manager.dispose();

      // Act
      const newId = manager.apply(
        'value',
        undefined,
        2,
        store.getState,
        store.setState
      );

      // Assert
      expect(store.getState('value')).toBe(2);
      expect(manager.getPending(newId)).toBeDefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle undefined as original value', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({});

      // Act
      const updateId = manager.apply(
        'newKey',
        undefined,
        'value',
        store.getState,
        store.setState
      );

      // Assert
      const pending = manager.getPending(updateId);
      expect(pending?.originalValue).toBeUndefined();
      expect(store.getState('newKey')).toBe('value');
    });

    it('should handle null as optimistic value', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ value: 'original' });

      // Act
      const updateId = manager.apply(
        'value',
        undefined,
        null,
        store.getState,
        store.setState
      );

      // Assert
      expect(store.getState('value')).toBeNull();

      manager.reject(updateId, store.getState, store.setState);
      expect(store.getState('value')).toBe('original');
    });

    it('should handle complex nested objects', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        data: {
          users: [
            { id: 1, posts: [{ id: 'p1', likes: 0 }] },
            { id: 2, posts: [{ id: 'p2', likes: 5 }] },
          ],
        },
      });

      // Act
      const updateId = manager.apply(
        'data',
        ['users', 0, 'posts', 0, 'likes'],
        10,
        store.getState,
        store.setState
      );

      // Assert
      const data = store.getState('data') as {
        users: Array<{ id: number; posts: Array<{ id: string; likes: number }> }>;
      };
      expect(data.users[0].posts[0].likes).toBe(10);

      // Rollback
      manager.reject(updateId, store.getState, store.setState);
      const rolledBack = store.getState('data') as typeof data;
      expect(rolledBack.users[0].posts[0].likes).toBe(0);
    });

    it('should handle array operations', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        items: ['a', 'b', 'c'],
      });

      // Act - update entire array
      const updateId = manager.apply(
        'items',
        undefined,
        ['a', 'b', 'c', 'd'],
        store.getState,
        store.setState
      );

      // Assert
      expect(store.getState('items')).toEqual(['a', 'b', 'c', 'd']);

      manager.reject(updateId, store.getState, store.setState);
      expect(store.getState('items')).toEqual(['a', 'b', 'c']);
    });

    it('should handle rapid successive updates', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ counter: 0 });
      const ids: string[] = [];

      // Act
      for (let i = 1; i <= 100; i++) {
        ids.push(
          manager.apply('counter', undefined, i, store.getState, store.setState)
        );
      }

      // Assert
      expect(store.getState('counter')).toBe(100);
      expect(manager.getAllPending()).toHaveLength(100);

      // Reject all
      for (const id of ids.reverse()) {
        manager.reject(id, store.getState, store.setState);
      }
      expect(store.getState('counter')).toBe(0);
    });

    it('should handle empty string as target', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ '': 'empty-key-value' });

      // Act
      const updateId = manager.apply(
        '',
        undefined,
        'new-value',
        store.getState,
        store.setState
      );

      // Assert
      expect(store.getState('')).toBe('new-value');
      expect(manager.getPending(updateId)?.target).toBe('');
    });

    it('should handle special characters in path', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        'special-key': { 'nested.key': { value: 'original' } },
      });

      // Act
      const updateId = manager.apply(
        'special-key',
        ['nested.key', 'value'],
        'updated',
        store.getState,
        store.setState
      );

      // Assert
      const data = store.getState('special-key') as { 'nested.key': { value: string } };
      expect(data['nested.key'].value).toBe('updated');

      manager.reject(updateId, store.getState, store.setState);
      const rolledBack = store.getState('special-key') as typeof data;
      expect(rolledBack['nested.key'].value).toBe('original');
    });
  });

  // ==================== Type Safety Tests ====================

  describe('type safety', () => {
    it('should preserve type information in pending update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({ count: 42 });

      // Act
      const updateId = manager.apply(
        'count',
        undefined,
        100,
        store.getState,
        store.setState
      );

      // Assert
      const pending = manager.getPending(updateId);
      expect(typeof pending?.originalValue).toBe('number');
      expect(typeof pending?.optimisticValue).toBe('number');
    });

    it('should handle mixed types in path update', () => {
      // Arrange
      const manager = createOptimisticManager();
      const store = createStateStore({
        data: { 0: { name: 'first' }, 1: { name: 'second' } },
      });

      // Act - using numeric key as string path
      const updateId = manager.apply(
        'data',
        ['0', 'name'],
        'updated',
        store.getState,
        store.setState
      );

      // Assert
      const data = store.getState('data') as Record<string, { name: string }>;
      expect(data['0'].name).toBe('updated');
    });
  });
});
