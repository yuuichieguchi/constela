/**
 * Computed - Derived reactive value
 *
 * A Computed holds a derived value that is automatically recalculated
 * when its dependencies change. It tracks Signal dependencies and
 * memoizes results for efficiency.
 */

import {
  setCurrentEffect,
  getCurrentEffect,
  registerEffectCleanup,
  cleanupEffect,
} from './signal.js';

export interface Computed<T> {
  get(): T;
  subscribe?(fn: (value: T) => void): () => void;
}

/**
 * Creates a computed value that automatically tracks dependencies
 * and memoizes results.
 *
 * @param getter - Function that computes the derived value
 * @returns Computed object with get() and subscribe() methods
 */
export function createComputed<T>(getter: () => T): Computed<T> {
  let cachedValue: T;
  let isDirty = true; // Start dirty so first get() computes
  let isComputing = false;
  let hasValue = false;

  const subscribers = new Set<(value: T) => void>();
  // Track effects (including parent computeds) that depend on this computed
  const effectSubscribers = new Set<() => void>();

  // This function will be called when dependencies change
  const markDirty = (): void => {
    if (!isDirty) {
      isDirty = true;
      // Notify parent effects/computeds that we've changed
      // Make a copy to avoid mutation during iteration
      const effects = [...effectSubscribers];
      effects.forEach((effect) => effect());

      // If we have subscribers, we need to recompute and notify
      if (subscribers.size > 0 && hasValue) {
        const oldValue = cachedValue;
        try {
          compute();
          // Only notify if value actually changed
          if (!Object.is(cachedValue, oldValue)) {
            notifySubscribers();
          }
        } catch {
          // Error in recomputation - still mark as dirty
          // The error will be thrown on next get() call
        }
      }
    }
  };

  const compute = (): void => {
    if (isComputing) {
      throw new Error('Circular dependency detected in computed');
    }

    // Clean up previous effect subscriptions
    cleanupEffect(markDirty);

    isComputing = true;

    // Save previous effect context
    const previousEffect = getCurrentEffect();

    // Register our markDirty as the current effect for tracking
    registerEffectCleanup(markDirty);
    setCurrentEffect(markDirty);

    try {
      cachedValue = getter();
      isDirty = false;
      hasValue = true;
    } finally {
      isComputing = false;
      // Restore previous effect context
      setCurrentEffect(previousEffect);
    }
  };

  const notifySubscribers = (): void => {
    subscribers.forEach((fn) => {
      try {
        fn(cachedValue);
      } catch (e) {
        console.error('Error in computed subscriber:', e);
      }
    });
  };

  return {
    get(): T {
      if (isDirty) {
        compute();
      }

      // Track this computed as a dependency if we're inside an effect/computed
      const currentEff = getCurrentEffect();
      if (currentEff && currentEff !== markDirty) {
        // Add the parent effect/computed to our effectSubscribers
        // so they get notified when this computed's value changes
        effectSubscribers.add(currentEff);
      }

      return cachedValue;
    },

    subscribe(fn: (value: T) => void): () => void {
      // Ensure computed is evaluated at least once
      if (isDirty) {
        try {
          compute();
        } catch {
          // Ignore errors during initial computation for subscribe
        }
      }

      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
  };
}
