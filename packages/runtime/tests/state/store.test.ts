/**
 * Test module for StateStore.
 *
 * Coverage:
 * - createStateStore initializes from definitions
 * - get() returns current value
 * - set() updates value
 * - Updates trigger reactive effects
 * - Type handling for different state field types
 */

import { describe, it, expect, vi } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import type { StateStore } from '../../src/state/store.js';
import { createEffect } from '../../src/reactive/effect.js';

describe('createStateStore', () => {
  // ==================== Initialization ====================

  describe('initialization', () => {
    it('should create a StateStore from state definitions', () => {
      // Arrange
      const stateDefinitions = {
        count: { type: 'number', initial: 0 },
        name: { type: 'string', initial: 'hello' },
        items: { type: 'list', initial: [1, 2, 3] },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store).toBeDefined();
      expect(typeof store.get).toBe('function');
      expect(typeof store.set).toBe('function');
    });

    it('should initialize number state with initial value', () => {
      // Arrange
      const stateDefinitions = {
        count: { type: 'number', initial: 42 },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('count')).toBe(42);
    });

    it('should initialize string state with initial value', () => {
      // Arrange
      const stateDefinitions = {
        message: { type: 'string', initial: 'hello world' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('message')).toBe('hello world');
    });

    it('should initialize list state with initial value', () => {
      // Arrange
      const stateDefinitions = {
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('items')).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty state definitions', () => {
      // Arrange
      const stateDefinitions = {};

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store).toBeDefined();
    });

    it('should handle multiple state fields of different types', () => {
      // Arrange
      const stateDefinitions = {
        counter: { type: 'number', initial: 0 },
        username: { type: 'string', initial: '' },
        todos: { type: 'list', initial: [] },
        isLoading: { type: 'number', initial: 0 }, // Using number as boolean
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('counter')).toBe(0);
      expect(store.get('username')).toBe('');
      expect(store.get('todos')).toEqual([]);
      expect(store.get('isLoading')).toBe(0);
    });
  });

  // ==================== get() Method ====================

  describe('get()', () => {
    it('should return the current value of a state field', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 10 },
      });

      // Act
      const value = store.get('count');

      // Assert
      expect(value).toBe(10);
    });

    it('should return updated value after set()', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });

      store.set('count', 100);

      // Act
      const value = store.get('count');

      // Assert
      expect(value).toBe(100);
    });

    it('should throw or return undefined for non-existent state field', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });

      // Act & Assert
      // Implementation may throw or return undefined
      expect(() => {
        store.get('nonexistent');
      }).toThrow();
    });
  });

  // ==================== set() Method ====================

  describe('set()', () => {
    it('should update number state', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });

      // Act
      store.set('count', 42);

      // Assert
      expect(store.get('count')).toBe(42);
    });

    it('should update string state', () => {
      // Arrange
      const store = createStateStore({
        message: { type: 'string', initial: 'hello' },
      });

      // Act
      store.set('message', 'world');

      // Assert
      expect(store.get('message')).toBe('world');
    });

    it('should update list state', () => {
      // Arrange
      const store = createStateStore({
        items: { type: 'list', initial: [1, 2, 3] },
      });

      // Act
      store.set('items', [4, 5, 6, 7]);

      // Assert
      expect(store.get('items')).toEqual([4, 5, 6, 7]);
    });

    it('should allow multiple updates to same field', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });

      // Act
      store.set('count', 1);
      store.set('count', 2);
      store.set('count', 3);

      // Assert
      expect(store.get('count')).toBe(3);
    });

    it('should throw for non-existent state field', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });

      // Act & Assert
      expect(() => {
        store.set('nonexistent', 10);
      }).toThrow();
    });
  });

  // ==================== Reactivity ====================

  describe('reactivity', () => {
    it('should trigger effects when state changes', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });
      const effectFn = vi.fn(() => {
        store.get('count');
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act
      store.set('count', 10);

      // Assert
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it('should trigger effects only for changed state', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
        name: { type: 'string', initial: 'test' },
      });

      const countEffect = vi.fn(() => {
        store.get('count');
      });
      const nameEffect = vi.fn(() => {
        store.get('name');
      });

      createEffect(countEffect);
      createEffect(nameEffect);

      expect(countEffect).toHaveBeenCalledTimes(1);
      expect(nameEffect).toHaveBeenCalledTimes(1);

      // Act - only change count
      store.set('count', 10);

      // Assert - only count effect should re-run
      expect(countEffect).toHaveBeenCalledTimes(2);
      expect(nameEffect).toHaveBeenCalledTimes(1);
    });

    it('should handle effects that read multiple state fields', () => {
      // Arrange
      const store = createStateStore({
        a: { type: 'number', initial: 1 },
        b: { type: 'number', initial: 2 },
      });

      const effectFn = vi.fn(() => {
        return store.get('a') + store.get('b');
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - change first field
      store.set('a', 10);
      expect(effectFn).toHaveBeenCalledTimes(2);

      // Act - change second field
      store.set('b', 20);
      expect(effectFn).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== List Operations (if supported directly) ====================

  describe('list operations', () => {
    it('should allow replacing entire list', () => {
      // Arrange
      const store = createStateStore({
        items: { type: 'list', initial: ['a', 'b'] },
      });

      // Act
      store.set('items', ['x', 'y', 'z']);

      // Assert
      expect(store.get('items')).toEqual(['x', 'y', 'z']);
    });

    it('should not mutate original array when getting', () => {
      // Arrange
      const store = createStateStore({
        items: { type: 'list', initial: [1, 2, 3] },
      });

      // Act
      const items = store.get('items') as number[];
      items.push(4);

      // Assert - original should be unchanged
      expect(store.get('items')).toEqual([1, 2, 3]);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle setting same value', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 5 },
      });
      const effectFn = vi.fn(() => {
        store.get('count');
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - set to same value
      store.set('count', 5);

      // Assert - effect may or may not re-run depending on implementation
      // At minimum, value should remain correct
      expect(store.get('count')).toBe(5);
    });

    it('should handle special string values', () => {
      // Arrange
      const store = createStateStore({
        text: { type: 'string', initial: '' },
      });

      // Act & Assert - empty string
      store.set('text', '');
      expect(store.get('text')).toBe('');

      // Act & Assert - unicode
      store.set('text', 'Hello');
      expect(store.get('text')).toBe('Hello');

      // Act & Assert - special characters
      store.set('text', '<script>alert("xss")</script>');
      expect(store.get('text')).toBe('<script>alert("xss")</script>');
    });

    it('should handle zero and negative numbers', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
      });

      // Act & Assert - zero
      expect(store.get('count')).toBe(0);

      // Act & Assert - negative
      store.set('count', -42);
      expect(store.get('count')).toBe(-42);

      // Act & Assert - float
      store.set('count', 3.14);
      expect(store.get('count')).toBe(3.14);
    });

    it('should handle empty list', () => {
      // Arrange
      const store = createStateStore({
        items: { type: 'list', initial: [] },
      });

      // Assert
      expect(store.get('items')).toEqual([]);
    });
  });
});
