/**
 * Test module for Computed (derived state).
 *
 * Coverage:
 * - Basic computed value from state
 * - Computed value updates when dependency changes
 * - Computed value with multiple dependencies
 * - Computed value caching (memoization)
 * - Computed value with array length
 * - Computed value with filter expression
 * - Subscribe to computed value changes
 * - Computed depending on another computed
 * - Lazy evaluation
 * - Error handling
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete.
 */

import { describe, it, expect, vi } from 'vitest';
import { createComputed } from '../computed.js';
import { createSignal } from '../signal.js';

describe('Computed (derived state)', () => {
  // ==================== Basic Computed Value ====================

  describe('basic computed value from state', () => {
    it('should return a computed value derived from a signal', () => {
      // Arrange
      const count = createSignal(10);

      // Act
      const doubleCount = createComputed(() => count.get() * 2);

      // Assert
      expect(doubleCount.get()).toBe(20);
    });

    it('should return a computed string derived from a signal', () => {
      // Arrange
      const name = createSignal('Alice');

      // Act
      const greeting = createComputed(() => 'Hello, ' + name.get() + '!');

      // Assert
      expect(greeting.get()).toBe('Hello, Alice!');
    });

    it('should return a computed boolean derived from a signal', () => {
      // Arrange
      const count = createSignal(5);

      // Act
      const isPositive = createComputed(() => count.get() > 0);

      // Assert
      expect(isPositive.get()).toBe(true);
    });
  });

  // ==================== Dependency Updates ====================

  describe('computed value updates when dependency changes', () => {
    it('should update computed value when signal changes', () => {
      // Arrange
      const count = createSignal(10);
      const doubleCount = createComputed(() => count.get() * 2);

      // Act
      count.set(20);

      // Assert
      expect(doubleCount.get()).toBe(40);
    });

    it('should update computed value multiple times as signal changes', () => {
      // Arrange
      const count = createSignal(1);
      const squared = createComputed(() => count.get() ** 2);

      // Assert initial value
      expect(squared.get()).toBe(1);

      // Act & Assert multiple updates
      count.set(2);
      expect(squared.get()).toBe(4);

      count.set(3);
      expect(squared.get()).toBe(9);

      count.set(10);
      expect(squared.get()).toBe(100);
    });

    it('should handle signal value becoming zero', () => {
      // Arrange
      const count = createSignal(5);
      const doubled = createComputed(() => count.get() * 2);

      // Act
      count.set(0);

      // Assert
      expect(doubled.get()).toBe(0);
    });

    it('should handle signal value becoming negative', () => {
      // Arrange
      const count = createSignal(5);
      const doubled = createComputed(() => count.get() * 2);

      // Act
      count.set(-5);

      // Assert
      expect(doubled.get()).toBe(-10);
    });
  });

  // ==================== Multiple Dependencies ====================

  describe('computed value with multiple dependencies', () => {
    it('should update when any dependency changes', () => {
      // Arrange
      const a = createSignal(5);
      const b = createSignal(3);
      const sum = createComputed(() => a.get() + b.get());

      // Assert initial value
      expect(sum.get()).toBe(8);

      // Act & Assert - change first dependency
      a.set(10);
      expect(sum.get()).toBe(13);

      // Act & Assert - change second dependency
      b.set(7);
      expect(sum.get()).toBe(17);
    });

    it('should handle three or more dependencies', () => {
      // Arrange
      const x = createSignal(1);
      const y = createSignal(2);
      const z = createSignal(3);
      const product = createComputed(() => x.get() * y.get() * z.get());

      // Assert initial value
      expect(product.get()).toBe(6);

      // Act & Assert
      x.set(2);
      expect(product.get()).toBe(12);

      y.set(3);
      expect(product.get()).toBe(18);

      z.set(4);
      expect(product.get()).toBe(24);
    });

    it('should handle mixed types of dependencies', () => {
      // Arrange
      const firstName = createSignal('John');
      const lastName = createSignal('Doe');
      const age = createSignal(30);
      const profile = createComputed(
        () => firstName.get() + ' ' + lastName.get() + ', age ' + age.get()
      );

      // Assert initial value
      expect(profile.get()).toBe('John Doe, age 30');

      // Act & Assert
      firstName.set('Jane');
      expect(profile.get()).toBe('Jane Doe, age 30');

      age.set(25);
      expect(profile.get()).toBe('Jane Doe, age 25');
    });
  });

  // ==================== Memoization / Caching ====================

  describe('computed value caching (memoization)', () => {
    it('should not re-evaluate if dependencies have not changed', () => {
      // Arrange
      const count = createSignal(10);
      const evaluationSpy = vi.fn(() => count.get() * 2);
      const doubled = createComputed(evaluationSpy);

      // Act - access the computed value multiple times
      doubled.get();
      doubled.get();
      doubled.get();

      // Assert - should only have evaluated once
      expect(evaluationSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-evaluate only when dependencies change', () => {
      // Arrange
      const count = createSignal(10);
      const evaluationSpy = vi.fn(() => count.get() * 2);
      const doubled = createComputed(evaluationSpy);

      // Act - initial access
      doubled.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(1);

      // Act - access again without change
      doubled.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(1);

      // Act - change dependency and access
      count.set(20);
      doubled.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(2);

      // Act - access again without change
      doubled.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(2);
    });

    it('should re-evaluate only for changed dependencies in multi-dependency computed', () => {
      // Arrange
      const a = createSignal(1);
      const b = createSignal(2);
      const evaluationSpy = vi.fn(() => a.get() + b.get());
      const sum = createComputed(evaluationSpy);

      // Act - initial access
      sum.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(1);

      // Act - change 'a' and access
      a.set(5);
      sum.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(2);

      // Act - change 'b' and access
      b.set(10);
      sum.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== Array Operations ====================

  describe('computed value with array length', () => {
    it('should compute array length', () => {
      // Arrange
      const items = createSignal([1, 2, 3]);

      // Act
      const itemCount = createComputed(() => items.get().length);

      // Assert
      expect(itemCount.get()).toBe(3);
    });

    it('should update when array is modified', () => {
      // Arrange
      const items = createSignal<number[]>([1, 2, 3]);
      const itemCount = createComputed(() => items.get().length);

      // Assert initial
      expect(itemCount.get()).toBe(3);

      // Act - add item
      items.set([...items.get(), 4]);
      expect(itemCount.get()).toBe(4);

      // Act - remove items
      items.set([1]);
      expect(itemCount.get()).toBe(1);

      // Act - empty array
      items.set([]);
      expect(itemCount.get()).toBe(0);
    });
  });

  describe('computed value with filter expression', () => {
    it('should count filtered items', () => {
      // Arrange
      const posts = createSignal([
        { id: 1, liked: true },
        { id: 2, liked: false },
        { id: 3, liked: true },
      ]);

      // Act
      const likedCount = createComputed(
        () => posts.get().filter((p) => p.liked).length
      );

      // Assert
      expect(likedCount.get()).toBe(2);
    });

    it('should update filtered count when array changes', () => {
      // Arrange
      const posts = createSignal([
        { id: 1, liked: true },
        { id: 2, liked: false },
        { id: 3, liked: true },
      ]);
      const likedCount = createComputed(
        () => posts.get().filter((p) => p.liked).length
      );

      // Assert initial
      expect(likedCount.get()).toBe(2);

      // Act - add a liked post
      posts.set([...posts.get(), { id: 4, liked: true }]);
      expect(likedCount.get()).toBe(3);

      // Act - change existing post to not liked
      const updatedPosts = posts.get().map((p) =>
        p.id === 1 ? { ...p, liked: false } : p
      );
      posts.set(updatedPosts);
      expect(likedCount.get()).toBe(2);
    });

    it('should return filtered array', () => {
      // Arrange
      const numbers = createSignal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      // Act
      const evenNumbers = createComputed(() =>
        numbers.get().filter((n) => n % 2 === 0)
      );

      // Assert
      expect(evenNumbers.get()).toEqual([2, 4, 6, 8, 10]);
    });
  });

  // ==================== Subscribe to Computed ====================

  describe('subscribe to computed value changes', () => {
    it('should call subscriber when computed value changes', () => {
      // Arrange
      const count = createSignal(10);
      const doubled = createComputed(() => count.get() * 2);
      const subscriber = vi.fn();

      // Act - subscribe
      doubled.subscribe!(subscriber);

      // Act - change dependency
      count.set(20);

      // Assert
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(40);
    });

    it('should not call subscriber when value does not change', () => {
      // Arrange
      const count = createSignal(10);
      const isEven = createComputed(() => count.get() % 2 === 0);
      const subscriber = vi.fn();

      // Act - subscribe
      isEven.subscribe!(subscriber);

      // Act - change to another even number
      count.set(20); // Still even, result should be the same

      // Assert - subscriber should not be called if value is the same
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should call subscriber for each value change', () => {
      // Arrange
      const count = createSignal(1);
      const squared = createComputed(() => count.get() ** 2);
      const subscriber = vi.fn();

      // Act
      squared.subscribe!(subscriber);

      count.set(2);
      count.set(3);
      count.set(4);

      // Assert
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenNthCalledWith(1, 4);
      expect(subscriber).toHaveBeenNthCalledWith(2, 9);
      expect(subscriber).toHaveBeenNthCalledWith(3, 16);
    });

    it('should return unsubscribe function', () => {
      // Arrange
      const count = createSignal(10);
      const doubled = createComputed(() => count.get() * 2);
      const subscriber = vi.fn();

      // Act - subscribe and unsubscribe
      const unsubscribe = doubled.subscribe!(subscriber);

      count.set(20);
      expect(subscriber).toHaveBeenCalledTimes(1);

      unsubscribe();

      count.set(30);
      count.set(40);

      // Assert - should only have been called once before unsubscribe
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', () => {
      // Arrange
      const count = createSignal(10);
      const doubled = createComputed(() => count.get() * 2);
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      // Act
      doubled.subscribe!(subscriber1);
      doubled.subscribe!(subscriber2);

      count.set(20);

      // Assert
      expect(subscriber1).toHaveBeenCalledWith(40);
      expect(subscriber2).toHaveBeenCalledWith(40);
    });
  });

  // ==================== Computed Depending on Computed ====================

  describe('computed depending on another computed', () => {
    it('should handle chained computed values', () => {
      // Arrange
      const count = createSignal(5);
      const doubled = createComputed(() => count.get() * 2);
      const quadrupled = createComputed(() => doubled.get() * 2);

      // Assert
      expect(doubled.get()).toBe(10);
      expect(quadrupled.get()).toBe(20);
    });

    it('should update chained computed when root signal changes', () => {
      // Arrange
      const count = createSignal(5);
      const doubled = createComputed(() => count.get() * 2);
      const quadrupled = createComputed(() => doubled.get() * 2);

      // Act
      count.set(10);

      // Assert
      expect(doubled.get()).toBe(20);
      expect(quadrupled.get()).toBe(40);
    });

    it('should handle deeply nested computed chain', () => {
      // Arrange
      const base = createSignal(1);
      const level1 = createComputed(() => base.get() + 1); // 2
      const level2 = createComputed(() => level1.get() + 1); // 3
      const level3 = createComputed(() => level2.get() + 1); // 4
      const level4 = createComputed(() => level3.get() + 1); // 5

      // Assert initial
      expect(level4.get()).toBe(5);

      // Act
      base.set(10);

      // Assert
      expect(level1.get()).toBe(11);
      expect(level2.get()).toBe(12);
      expect(level3.get()).toBe(13);
      expect(level4.get()).toBe(14);
    });

    it('should handle computed depending on multiple other computed values', () => {
      // Arrange
      const a = createSignal(1);
      const b = createSignal(2);
      const doubleA = createComputed(() => a.get() * 2);
      const doubleB = createComputed(() => b.get() * 2);
      const sum = createComputed(() => doubleA.get() + doubleB.get());

      // Assert initial
      expect(sum.get()).toBe(6); // (1*2) + (2*2) = 6

      // Act
      a.set(5);
      expect(sum.get()).toBe(14); // (5*2) + (2*2) = 14

      b.set(10);
      expect(sum.get()).toBe(30); // (5*2) + (10*2) = 30
    });

    it('should notify subscribers through computed chain', () => {
      // Arrange
      const count = createSignal(1);
      const doubled = createComputed(() => count.get() * 2);
      const quadrupled = createComputed(() => doubled.get() * 2);
      const subscriber = vi.fn();

      // Act
      quadrupled.subscribe!(subscriber);
      count.set(5);

      // Assert
      expect(subscriber).toHaveBeenCalledWith(20); // 5 * 2 * 2 = 20
    });
  });

  // ==================== Lazy Evaluation ====================

  describe('lazy evaluation', () => {
    it('should not evaluate until accessed', () => {
      // Arrange
      const count = createSignal(10);
      const evaluationSpy = vi.fn(() => count.get() * 2);

      // Act - create computed but do not access it
      const doubled = createComputed(evaluationSpy);

      // Assert - should not have evaluated yet
      expect(evaluationSpy).not.toHaveBeenCalled();

      // Act - now access it
      doubled.get();

      // Assert - now it should have evaluated
      expect(evaluationSpy).toHaveBeenCalledTimes(1);
    });

    it('should not re-evaluate on dependency change until accessed', () => {
      // Arrange
      const count = createSignal(10);
      const evaluationSpy = vi.fn(() => count.get() * 2);
      const doubled = createComputed(evaluationSpy);

      // Act - initial access
      doubled.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(1);

      // Act - change dependency but do not access computed
      count.set(20);
      count.set(30);
      count.set(40);

      // Assert - should still only have evaluated once
      expect(evaluationSpy).toHaveBeenCalledTimes(1);

      // Act - now access it
      doubled.get();

      // Assert - should have re-evaluated once
      expect(evaluationSpy).toHaveBeenCalledTimes(2);
      expect(doubled.get()).toBe(80);
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw error when getter throws', () => {
      // Arrange
      const shouldThrow = createSignal(true);
      const problematic = createComputed(() => {
        if (shouldThrow.get()) {
          throw new Error('Computation failed');
        }
        return 'success';
      });

      // Act & Assert
      expect(() => problematic.get()).toThrow('Computation failed');
    });

    it('should recover when error condition is resolved', () => {
      // Arrange
      const shouldThrow = createSignal(true);
      const problematic = createComputed(() => {
        if (shouldThrow.get()) {
          throw new Error('Computation failed');
        }
        return 'success';
      });

      // Act - first access throws
      expect(() => problematic.get()).toThrow('Computation failed');

      // Act - fix the error condition
      shouldThrow.set(false);

      // Assert - should now work
      expect(problematic.get()).toBe('success');
    });

    it('should handle division by zero', () => {
      // Arrange
      const numerator = createSignal(10);
      const denominator = createSignal(0);
      const ratio = createComputed(() => numerator.get() / denominator.get());

      // Act & Assert
      expect(ratio.get()).toBe(Infinity);
    });

    it('should handle accessing undefined properties', () => {
      // Arrange
      const user = createSignal<{ name?: string } | null>(null);
      const userName = createComputed(() => user.get()?.name ?? 'Unknown');

      // Assert - should handle null gracefully
      expect(userName.get()).toBe('Unknown');

      // Act
      user.set({ name: 'Alice' });

      // Assert
      expect(userName.get()).toBe('Alice');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle computed returning undefined', () => {
      // Arrange
      const maybeValue = createSignal<number | undefined>(undefined);
      const computed = createComputed(() => maybeValue.get());

      // Assert
      expect(computed.get()).toBeUndefined();
    });

    it('should handle computed returning null', () => {
      // Arrange
      const maybeValue = createSignal<number | null>(null);
      const computed = createComputed(() => maybeValue.get());

      // Assert
      expect(computed.get()).toBeNull();
    });

    it('should handle computed returning empty array', () => {
      // Arrange
      const items = createSignal<number[]>([]);
      const doubled = createComputed(() => items.get().map((x) => x * 2));

      // Assert
      expect(doubled.get()).toEqual([]);
    });

    it('should handle computed returning empty object', () => {
      // Arrange
      const data = createSignal({});
      const computed = createComputed(() => ({ ...data.get() }));

      // Assert
      expect(computed.get()).toEqual({});
    });

    it('should handle same value set to dependency', () => {
      // Arrange
      const count = createSignal(10);
      const evaluationSpy = vi.fn(() => count.get() * 2);
      const doubled = createComputed(evaluationSpy);

      // Act - initial access
      doubled.get();
      expect(evaluationSpy).toHaveBeenCalledTimes(1);

      // Act - set same value
      count.set(10);
      doubled.get();

      // Note: behavior depends on implementation
      // Signal might not notify if value is the same
      // or computed might still be marked as dirty
    });
  });
});
