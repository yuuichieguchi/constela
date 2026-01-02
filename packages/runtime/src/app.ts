/**
 * App - Main entry point for creating Constela applications
 * 
 * Creates a reactive application from a CompiledProgram and mounts it to the DOM.
 */

import type { CompiledProgram, CompiledAction } from '@constela/compiler';
import { createStateStore } from './state/store.js';
import { render, type RenderContext } from './renderer/index.js';

export interface AppInstance {
  destroy(): void;
  setState(name: string, value: unknown): void;
  getState(name: string): unknown;
}

export function createApp(
  program: CompiledProgram,
  mount: HTMLElement
): AppInstance {
  // Create state store
  const state = createStateStore(program.state);

  // Normalize actions (handle both Map and Record)
  let actions: Record<string, CompiledAction>;
  if (program.actions instanceof Map) {
    actions = {};
    program.actions.forEach((action, name) => {
      actions[name] = action;
    });
  } else {
    actions = program.actions;
  }

  // Create cleanups array for tracking all effects
  const cleanups: (() => void)[] = [];

  // Create render context
  const ctx: RenderContext = {
    state,
    actions,
    locals: {},
    cleanups,
  };

  // Render view
  const rootNode = render(program.view, ctx);
  mount.appendChild(rootNode);

  let destroyed = false;

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;

      // Cleanup all effects
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Remove rendered content
      while (mount.firstChild) {
        mount.removeChild(mount.firstChild);
      }
    },

    setState(name: string, value: unknown): void {
      if (destroyed) return;
      state.set(name, value);
    },

    getState(name: string): unknown {
      return state.get(name);
    },
  };
}
