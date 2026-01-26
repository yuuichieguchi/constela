/**
 * HMR Handler - Update handler for Hot Module Replacement
 *
 * This module handles applying HMR updates to the running application,
 * preserving state across updates.
 *
 * Update Flow:
 * 1. Serialize current state: state.serialize()
 * 2. Destroy old app: app.destroy()
 * 3. Render new app with new program
 * 4. Restore state: state.restore(snapshot, newDefinitions)
 */

import type { CompiledProgram, CompiledAction } from '@constela/compiler';
import type { AppInstance } from '../app.js';
import { createStateStore, type StateStore, type StateDefinition } from '../state/store.js';
import { render, type RenderContext } from '../renderer/index.js';
import { executeAction } from '../action/executor.js';

/**
 * Route context for the application
 */
export interface RouteContext {
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}

/**
 * Options for creating an HMR handler
 */
export interface HMRHandlerOptions {
  /** Container element for the application */
  container: HTMLElement;
  /** Initial compiled program */
  program: CompiledProgram;
  /** Optional route context */
  route?: RouteContext;
  /**
   * Skip initial app creation (for hydration scenarios where hydrateApp handles initial render).
   * When true, the HMR handler will NOT render the app on creation. The first handleUpdate()
   * call will clear the container (removing SSR content) before rendering.
   * @default false
   */
  skipInitialRender?: boolean;
}

/**
 * HMR Handler interface
 */
export interface HMRHandler {
  /** Apply a program update while preserving state */
  handleUpdate(program: CompiledProgram): void;
  /** Destroy the handler and cleanup resources */
  destroy(): void;
}

/**
 * Extended AppInstance with access to state store for HMR
 */
interface HMRAppInstance extends AppInstance {
  /** The state store for serialization/restoration */
  stateStore: StateStore;
}

/**
 * Creates an app instance with access to the state store.
 * This is similar to createApp but exposes the state store for HMR.
 */
function createHMRApp(
  program: CompiledProgram,
  container: HTMLElement,
  route?: RouteContext,
  existingStateStore?: StateStore
): HMRAppInstance {
  // Create or reuse state store
  const state = existingStateStore ?? createStateStore(program.state);

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
    ...(route && { route }),
    ...(program.importData && { imports: program.importData }),
  };

  // Render view
  const rootNode = render(program.view, ctx);
  container.appendChild(rootNode);

  // Create action context for lifecycle hooks
  const actionCtx = {
    state,
    actions,
    locals: {},
    refs,
    ...(route && { route }),
    ...(program.importData && { imports: program.importData }),
  };

  // Execute onMount lifecycle hook
  if (program.lifecycle?.onMount) {
    const onMountAction = actions[program.lifecycle.onMount];
    if (onMountAction) {
      void executeAction(onMountAction, actionCtx);
    }
  }

  let destroyed = false;

  return {
    stateStore: state,

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
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    },

    setState(name: string, value: unknown): void {
      if (destroyed) return;
      state.set(name, value);
    },

    getState(name: string): unknown {
      return state.get(name);
    },

    subscribe(name: string, fn: (value: unknown) => void): () => void {
      if (destroyed) return () => {};
      return state.subscribe(name, fn);
    },
  };
}

/**
 * Creates an HMR handler for applying hot updates to the running application.
 *
 * Update Flow:
 * 1. Serialize current state: state.serialize()
 * 2. Destroy old app: app.destroy()
 * 3. Create new state store from new program
 * 4. Restore state: state.restore(snapshot, newDefinitions)
 * 5. Render new app with restored state
 *
 * @param options - Handler configuration options
 * @returns HMRHandler interface for managing updates
 */
export function createHMRHandler(options: HMRHandlerOptions): HMRHandler {
  const { container, program, route, skipInitialRender } = options;

  let currentApp: HMRAppInstance | null = null;
  let destroyed = false;

  // Create initial app only if skipInitialRender is not true
  if (!skipInitialRender) {
    currentApp = createHMRApp(program, container, route);
  }

  return {
    handleUpdate(newProgram: CompiledProgram): void {
      // Don't apply updates after handler is destroyed
      if (destroyed) {
        return;
      }

      // If skipInitialRender was used, currentApp is null on first update
      // We need to clear the container (which has SSR content) before rendering
      if (!currentApp) {
        // Clear container (remove SSR content)
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        // Create the app directly with the new program
        currentApp = createHMRApp(newProgram, container, route);
        return;
      }

      // Normal update flow: Serialize current state before destroying
      const stateSnapshot = currentApp.stateStore.serialize();
      currentApp.destroy();
      currentApp = null;

      // Create new state store
      const newStateStore = createStateStore(newProgram.state);

      // Convert state definitions to array format for restore
      const newDefinitions: StateDefinition[] = Object.entries(newProgram.state).map(
        ([name, def]) => ({
          name,
          ...def,
        })
      );

      // Restore state (handles type changes gracefully)
      newStateStore.restore(stateSnapshot, newDefinitions);

      // Create new app with restored state
      currentApp = createHMRApp(newProgram, container, route, newStateStore);
    },

    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;

      if (currentApp) {
        currentApp.destroy();
        currentApp = null;
      }
    },
  };
}
