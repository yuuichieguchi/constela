/**
 * App - Main entry point for creating Constela applications
 *
 * Creates a reactive application from a CompiledProgram and mounts it to the DOM.
 */

import type { CompiledProgram, CompiledAction } from '@constela/compiler';
import { createStateStore } from './state/store.js';
import { render, type RenderContext } from './renderer/index.js';
import { executeAction } from './action/executor.js';

export interface AppInstance {
  destroy(): void;
  setState(name: string, value: unknown): void;
  getState(name: string): unknown;
}

/**
 * Creates a Constela application and mounts it to the DOM.
 *
 * Lifecycle order:
 * 1. State initialization
 * 2. Refs map creation
 * 3. View rendering (refs populated during render)
 * 4. onMount execution (refs guaranteed to be available)
 * 5. App instance returned
 *
 * @param program - The compiled program to execute
 * @param mount - The DOM element to mount the app to
 * @returns An AppInstance with destroy, setState, and getState methods
 */
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

  // Create refs map for collecting element references
  const refs: Record<string, Element> = {};

  // Create render context
  const ctx: RenderContext = {
    state,
    actions,
    locals: {},
    cleanups,
    refs,
  };

  // Render view (before onMount so refs are available)
  const rootNode = render(program.view, ctx);
  mount.appendChild(rootNode);

  // Create action context for lifecycle hooks (after render so refs are populated)
  const actionCtx = {
    state,
    actions,
    locals: {},
    refs,
  };

  // Execute onMount lifecycle hook (after render so refs are available)
  if (program.lifecycle?.onMount) {
    const onMountAction = actions[program.lifecycle.onMount];
    if (onMountAction) {
      // Execute synchronously for immediate state updates
      void executeAction(onMountAction, actionCtx);
    }
  }

  let destroyed = false;

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;

      // Execute onUnmount lifecycle hook before cleanup
      if (program.lifecycle?.onUnmount) {
        const onUnmountAction = actions[program.lifecycle.onUnmount];
        if (onUnmountAction) {
          void executeAction(onUnmountAction, actionCtx);
        }
      }

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
