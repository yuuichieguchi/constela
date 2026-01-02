/**
 * Effect - Reactive side effect
 *
 * An effect runs a function and automatically tracks signal dependencies.
 * When any tracked signal changes, the effect re-runs.
 */

import {
  setCurrentEffect,
  getCurrentEffect,
  registerEffectCleanup,
  cleanupEffect,
} from './signal.js';

type CleanupFn = () => void;
type EffectFn = () => void | CleanupFn;

// Stack to handle nested effects
const effectStack: (() => void)[] = [];

export function createEffect(fn: EffectFn): () => void {
  let cleanup: CleanupFn | undefined;
  let isDisposed = false;

  const execute = (): void => {
    if (isDisposed) return;

    // Run cleanup from previous execution
    if (typeof cleanup === 'function') {
      cleanup();
      cleanup = undefined;
    }

    // Clear old dependencies before re-tracking
    cleanupEffect(execute);

    // Push this effect onto the stack
    effectStack.push(execute);
    setCurrentEffect(execute);

    // Register this effect for cleanup tracking
    registerEffectCleanup(execute);

    try {
      // Run the effect function
      const result = fn();
      // Only store cleanup if it's a function
      if (typeof result === 'function') {
        cleanup = result;
      }
    } finally {
      // Pop this effect from the stack
      effectStack.pop();
      // Restore parent effect
      const parentEffect = effectStack[effectStack.length - 1];
      setCurrentEffect(parentEffect ?? null);
    }
  };

  // Run immediately
  execute();

  // Return cleanup function
  return (): void => {
    isDisposed = true;
    cleanupEffect(execute);
    if (typeof cleanup === 'function') {
      cleanup();
      cleanup = undefined;
    }
  };
}
