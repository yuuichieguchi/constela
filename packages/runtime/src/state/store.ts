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
    signals.set(name, createSignal(def.initial));
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
