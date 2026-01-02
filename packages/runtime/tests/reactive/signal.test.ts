/**
 * Test module for Signal reactive primitive.
 *
 * Coverage:
 * - Signal creation and initial value
 * - Value retrieval via get()
 * - Value update via set()
 * - Independence of multiple signals
 * - Subscriber notification on change
 */

import { describe, it, expect, vi } from 'vitest';
import { createSignal } from '../../src/reactive/signal.js';
import type { Signal } from '../../src/reactive/signal.js';

describe('createSignal', () => {
  // ==================== Creation and Initial Value ====================

  describe('when created with initial value', () => {
    it('should return a Signal object with get and set methods', () => {
      // Arrange & Act
      const signal = createSignal<number>(0);

      // Assert
      expect(signal).toBeDefined();
      expect(typeof signal.get).toBe('function');
      expect(typeof signal.set).toBe('function');
    });

    it('should return the initial value via get()', () => {
      // Arrange
      const initialValue = 42;

      // Act
      const signal = createSignal<number>(initialValue);

      // Assert
      expect(signal.get()).toBe(initialValue);
    });

    it('should handle string initial value', () => {
      // Arrange
      const initialValue = 'hello';

      // Act
      const signal = createSignal<string>(initialValue);

      // Assert
      expect(signal.get()).toBe(initialValue);
    });

    it('should handle boolean initial value', () => {
      // Arrange & Act
      const signalTrue = createSignal<boolean>(true);
      const signalFalse = createSignal<boolean>(false);

      // Assert
      expect(signalTrue.get()).toBe(true);
      expect(signalFalse.get()).toBe(false);
    });

    it('should handle null initial value', () => {
      // Arrange & Act
      const signal = createSignal<string | null>(null);

      // Assert
      expect(signal.get()).toBeNull();
    });

    it('should handle array initial value', () => {
      // Arrange
      const initialValue = [1, 2, 3];

      // Act
      const signal = createSignal<number[]>(initialValue);

      // Assert
      expect(signal.get()).toEqual(initialValue);
    });

    it('should handle object initial value', () => {
      // Arrange
      const initialValue = { name: 'test', count: 5 };

      // Act
      const signal = createSignal<{ name: string; count: number }>(initialValue);

      // Assert
      expect(signal.get()).toEqual(initialValue);
    });
  });

  // ==================== Value Update via set() ====================

  describe('set()', () => {
    it('should update the value', () => {
      // Arrange
      const signal = createSignal<number>(0);

      // Act
      signal.set(10);

      // Assert
      expect(signal.get()).toBe(10);
    });

    it('should allow multiple updates', () => {
      // Arrange
      const signal = createSignal<number>(0);

      // Act
      signal.set(1);
      signal.set(2);
      signal.set(3);

      // Assert
      expect(signal.get()).toBe(3);
    });

    it('should handle updating to same value', () => {
      // Arrange
      const signal = createSignal<number>(5);

      // Act
      signal.set(5);

      // Assert
      expect(signal.get()).toBe(5);
    });

    it('should handle updating from one type to another (for union types)', () => {
      // Arrange
      const signal = createSignal<string | null>('initial');

      // Act
      signal.set(null);

      // Assert
      expect(signal.get()).toBeNull();

      // Act again
      signal.set('updated');

      // Assert
      expect(signal.get()).toBe('updated');
    });
  });

  // ==================== Independence of Multiple Signals ====================

  describe('multiple signals', () => {
    it('should be independent of each other', () => {
      // Arrange
      const signal1 = createSignal<number>(1);
      const signal2 = createSignal<number>(2);
      const signal3 = createSignal<number>(3);

      // Act
      signal1.set(10);

      // Assert - only signal1 should change
      expect(signal1.get()).toBe(10);
      expect(signal2.get()).toBe(2);
      expect(signal3.get()).toBe(3);
    });

    it('should allow signals of different types', () => {
      // Arrange
      const numberSignal = createSignal<number>(42);
      const stringSignal = createSignal<string>('hello');
      const booleanSignal = createSignal<boolean>(true);

      // Act
      numberSignal.set(100);
      stringSignal.set('world');
      booleanSignal.set(false);

      // Assert
      expect(numberSignal.get()).toBe(100);
      expect(stringSignal.get()).toBe('world');
      expect(booleanSignal.get()).toBe(false);
    });
  });

  // ==================== Subscriber Notification ====================

  describe('subscriber notification', () => {
    it('should notify subscribers when value changes', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const subscriber = vi.fn();

      // Subscribe to changes (if subscribe method exists)
      // This test assumes the Signal has some way to subscribe
      // The actual implementation may use effects instead
      signal.subscribe?.(subscriber);

      // Act
      signal.set(1);

      // Assert
      expect(subscriber).toHaveBeenCalled();
    });

    it('should pass new value to subscribers', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const subscriber = vi.fn();
      signal.subscribe?.(subscriber);

      // Act
      signal.set(42);

      // Assert
      expect(subscriber).toHaveBeenCalledWith(42);
    });

    it('should notify multiple subscribers', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      signal.subscribe?.(subscriber1);
      signal.subscribe?.(subscriber2);

      // Act
      signal.set(10);

      // Assert
      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const subscriber = vi.fn();
      const unsubscribe = signal.subscribe?.(subscriber);

      // Act
      unsubscribe?.();
      signal.set(10);

      // Assert - subscriber should not be called after unsubscribe
      expect(subscriber).not.toHaveBeenCalled();
    });
  });
});
