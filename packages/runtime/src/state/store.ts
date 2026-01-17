/**
 * StateStore - Centralized state management
 * 
 * Creates signals for each state field defined in the program.
 * Provides get/set methods for accessing state.
 */

import { createSignal, type Signal } from '../reactive/signal.js';

export interface StateStore {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  subscribe(name: string, fn: (value: unknown) => void): () => void;
}

export interface StateDefinition {
  type: string;
  initial: unknown;
}

export function createStateStore(
  definitions: Record<string, StateDefinition>
): StateStore {
  const signals = new Map<string, Signal<unknown>>();

  // Create a signal for each state field
  for (const [name, def] of Object.entries(definitions)) {
    let initialValue = def.initial;

    // Read localStorage for 'theme' state to sync with anti-flash script
    if (name === 'theme' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('theme');
        if (stored !== null) {
          try {
            initialValue = JSON.parse(stored);
          } catch {
            initialValue = stored;
          }
        }
      } catch {
        // Ignore localStorage errors (SSR, private browsing, etc.)
      }
    }

    signals.set(name, createSignal(initialValue));
  }

  return {
    get(name: string): unknown {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      return signal.get();
    },

    set(name: string, value: unknown): void {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      signal.set(value);
    },

    subscribe(name: string, fn: (value: unknown) => void): () => void {
      const signal = signals.get(name);
      if (!signal) {
        throw new Error(`State field "${name}" does not exist`);
      }
      return signal.subscribe!(fn);
    },
  };
}
