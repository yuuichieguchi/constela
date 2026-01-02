/**
 * Signal - Reactive primitive for state management
 *
 * A Signal holds a value and notifies subscribers when the value changes.
 * Used as the foundation for fine-grained reactivity.
 */

// Global tracking for current effect
let currentEffect: (() => void) | null = null;
let trackingEnabled = true;

// Track which signals each effect depends on
const effectDependencies = new Map<() => void, Set<Set<() => void>>>();

export function setCurrentEffect(effect: (() => void) | null): void {
  currentEffect = effect;
}

export function getCurrentEffect(): (() => void) | null {
  return currentEffect;
}

export function disableTracking(): void {
  trackingEnabled = false;
}

export function enableTracking(): void {
  trackingEnabled = true;
}

// Register an effect for dependency tracking cleanup
export function registerEffectCleanup(effect: () => void): void {
  if (!effectDependencies.has(effect)) {
    effectDependencies.set(effect, new Set());
  }
}

// Remove an effect from all its tracked signal subscriptions
export function cleanupEffect(effect: () => void): void {
  const deps = effectDependencies.get(effect);
  if (deps) {
    for (const signalSubscribers of deps) {
      signalSubscribers.delete(effect);
    }
    deps.clear();
    // Also remove the effect from the tracking map to prevent memory leaks
    effectDependencies.delete(effect);
  }
}

export interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe?(fn: (value: T) => void): () => void;
}

export function createSignal<T>(initial: T): Signal<T> {
  let value = initial;
  const subscribers = new Set<(value: T) => void>();
  const effectSubscribers = new Set<() => void>();

  const signal: Signal<T> = {
    get(): T {
      // Track dependency if inside an effect
      if (trackingEnabled && currentEffect) {
        effectSubscribers.add(currentEffect);
        // Register this signal's subscribers set with the effect
        const deps = effectDependencies.get(currentEffect);
        if (deps) {
          deps.add(effectSubscribers);
        }
      }
      // Return a copy for arrays to prevent mutation
      if (Array.isArray(value)) {
        return [...value] as T;
      }
      return value;
    },

    set(newValue: T): void {
      value = newValue;
      // Notify direct subscribers
      subscribers.forEach((fn) => fn(newValue));
      // Notify effect subscribers (copy to avoid mutation during iteration)
      const effects = [...effectSubscribers];
      effects.forEach((effect) => effect());
    },

    subscribe(fn: (value: T) => void): () => void {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
  };

  return signal;
}
