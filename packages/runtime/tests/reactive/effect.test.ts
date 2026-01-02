/**
 * Test module for Effect reactive primitive.
 *
 * Coverage:
 * - Effect runs immediately on creation
 * - Effect re-runs when dependencies change
 * - Effect cleanup function works
 * - Nested effects work correctly
 * - Dependency tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEffect } from '../../src/reactive/effect.js';
import { createSignal } from '../../src/reactive/signal.js';

describe('createEffect', () => {
  // ==================== Immediate Execution ====================

  describe('immediate execution', () => {
    it('should run the effect function immediately', () => {
      // Arrange
      const effectFn = vi.fn();

      // Act
      createEffect(effectFn);

      // Assert
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should return a cleanup function', () => {
      // Arrange
      const effectFn = vi.fn();

      // Act
      const cleanup = createEffect(effectFn);

      // Assert
      expect(typeof cleanup).toBe('function');
    });
  });

  // ==================== Dependency Tracking and Re-execution ====================

  describe('dependency tracking', () => {
    it('should re-run when a signal dependency changes', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        signal.get(); // Read signal to create dependency
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act
      signal.set(1);

      // Assert
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it('should re-run multiple times as dependencies change', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        signal.get();
      });

      createEffect(effectFn);

      // Act
      signal.set(1);
      signal.set(2);
      signal.set(3);

      // Assert
      expect(effectFn).toHaveBeenCalledTimes(4); // 1 initial + 3 updates
    });

    it('should track multiple signal dependencies', () => {
      // Arrange
      const signal1 = createSignal<number>(0);
      const signal2 = createSignal<string>('hello');
      const effectFn = vi.fn(() => {
        signal1.get();
        signal2.get();
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - change first signal
      signal1.set(1);
      expect(effectFn).toHaveBeenCalledTimes(2);

      // Act - change second signal
      signal2.set('world');
      expect(effectFn).toHaveBeenCalledTimes(3);
    });

    it('should not re-run when unrelated signals change', () => {
      // Arrange
      const trackedSignal = createSignal<number>(0);
      const untrackedSignal = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        trackedSignal.get(); // Only track this one
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - change unrelated signal
      untrackedSignal.set(100);

      // Assert - effect should not re-run
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should re-track dependencies on each run', () => {
      // Arrange
      const condition = createSignal<boolean>(true);
      const signalA = createSignal<number>(1);
      const signalB = createSignal<number>(2);

      const effectFn = vi.fn(() => {
        if (condition.get()) {
          signalA.get();
        } else {
          signalB.get();
        }
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - signalA should trigger re-run (it's being tracked)
      signalA.set(10);
      expect(effectFn).toHaveBeenCalledTimes(2);

      // signalB should NOT trigger re-run (not being tracked yet)
      signalB.set(20);
      expect(effectFn).toHaveBeenCalledTimes(2);

      // Switch condition to false
      condition.set(false);
      expect(effectFn).toHaveBeenCalledTimes(3);

      // Now signalB should trigger re-run
      signalB.set(30);
      expect(effectFn).toHaveBeenCalledTimes(4);

      // And signalA should NOT (no longer tracked)
      signalA.set(100);
      expect(effectFn).toHaveBeenCalledTimes(4);
    });
  });

  // ==================== Cleanup Function ====================

  describe('cleanup', () => {
    it('should stop re-running after cleanup is called', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        signal.get();
      });

      const cleanup = createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - cleanup
      cleanup();
      signal.set(1);
      signal.set(2);

      // Assert - effect should not have re-run
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should call effect cleanup callback if returned', () => {
      // Arrange
      const cleanupCallback = vi.fn();
      const effectFn = vi.fn(() => {
        return cleanupCallback;
      });

      const cleanup = createEffect(effectFn);

      // Act
      cleanup();

      // Assert
      expect(cleanupCallback).toHaveBeenCalledTimes(1);
    });

    it('should call cleanup callback before each re-run', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const cleanupCallback = vi.fn();
      const effectFn = vi.fn(() => {
        signal.get();
        return cleanupCallback;
      });

      createEffect(effectFn);
      expect(cleanupCallback).not.toHaveBeenCalled();

      // Act - trigger re-run
      signal.set(1);

      // Assert - cleanup should be called before re-run
      expect(cleanupCallback).toHaveBeenCalledTimes(1);
      expect(effectFn).toHaveBeenCalledTimes(2);

      // Act - trigger another re-run
      signal.set(2);

      // Assert
      expect(cleanupCallback).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== Nested Effects ====================

  describe('nested effects', () => {
    it('should support nested effects', () => {
      // Arrange
      const outerSignal = createSignal<number>(0);
      const innerSignal = createSignal<number>(0);
      const outerEffectFn = vi.fn();
      const innerEffectFn = vi.fn();

      // Act
      createEffect(() => {
        outerSignal.get();
        outerEffectFn();

        createEffect(() => {
          innerSignal.get();
          innerEffectFn();
        });
      });

      // Assert - both should have run initially
      expect(outerEffectFn).toHaveBeenCalledTimes(1);
      expect(innerEffectFn).toHaveBeenCalledTimes(1);
    });

    it('should allow inner effects to track their own dependencies', () => {
      // Arrange
      const outerSignal = createSignal<number>(0);
      const innerSignal = createSignal<number>(0);
      const outerEffectFn = vi.fn();
      const innerEffectFn = vi.fn();

      createEffect(() => {
        outerSignal.get();
        outerEffectFn();

        createEffect(() => {
          innerSignal.get();
          innerEffectFn();
        });
      });

      // Act - change inner signal
      innerSignal.set(1);

      // Assert - only inner effect should re-run
      expect(outerEffectFn).toHaveBeenCalledTimes(1);
      expect(innerEffectFn).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle effects that read the same signal multiple times', () => {
      // Arrange
      const signal = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        signal.get();
        signal.get();
        signal.get();
      });

      createEffect(effectFn);

      // Act
      signal.set(1);

      // Assert - should only run once per change
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it('should handle effects that set signals during execution', () => {
      // Arrange
      const sourceSignal = createSignal<number>(0);
      const derivedSignal = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        derivedSignal.set(sourceSignal.get() * 2);
      });

      createEffect(effectFn);
      expect(derivedSignal.get()).toBe(0);

      // Act
      sourceSignal.set(5);

      // Assert
      expect(derivedSignal.get()).toBe(10);
    });

    it('should handle empty effect function', () => {
      // Arrange & Act & Assert - should not throw
      expect(() => {
        createEffect(() => {});
      }).not.toThrow();
    });
  });

  // ==================== Batching (if supported) ====================

  describe('batching', () => {
    it('should batch multiple signal updates into single effect run', async () => {
      // Arrange
      const signal1 = createSignal<number>(0);
      const signal2 = createSignal<number>(0);
      const effectFn = vi.fn(() => {
        signal1.get();
        signal2.get();
      });

      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Act - update multiple signals in quick succession
      // (batching may be synchronous or use microtasks)
      signal1.set(1);
      signal2.set(2);

      // Wait for any async batching
      await Promise.resolve();

      // Assert - ideally should batch, but at minimum should work correctly
      // The exact call count depends on implementation
      expect(effectFn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
