/**
 * Client-side entry point for Constela applications
 * Handles hydration and Escape Hatch mechanism for external library integration.
 */

import type { CompiledProgram } from '@constela/compiler';
import { hydrateApp, type AppInstance } from '@constela/runtime';

/**
 * Context provided to EscapeHandler mount functions
 */
export interface EscapeContext {
  appInstance: AppInstance;
  getState: (name: string) => unknown;
  setState: (name: string, value: unknown) => void;
  subscribe: (name: string, fn: (value: unknown) => void) => () => void;
}

/**
 * Handler for escape hatch elements
 */
export interface EscapeHandler {
  name: string;
  mount: (element: HTMLElement, ctx: EscapeContext) => () => void;
}

/**
 * Options for initializing the client application
 */
export interface InitClientOptions {
  program: CompiledProgram;
  container: HTMLElement;
  escapeHandlers?: EscapeHandler[];
}

/**
 * Extended AppInstance with subscribe support check
 */
interface ExtendedAppInstance extends AppInstance {
  subscribe?: (name: string, fn: (value: unknown) => void) => () => void;
}

/**
 * Initialize the client application with hydration and escape hatch support.
 *
 * @param options - Configuration options
 * @returns AppInstance for controlling the application
 */
export function initClient(options: InitClientOptions): AppInstance {
  const { program, container, escapeHandlers = [] } = options;

  // Step 1: Hydrate the application
  const appInstance = hydrateApp({ program, container }) as ExtendedAppInstance;

  // Step 2: Find all escape hatch elements
  const escapeElements = container.querySelectorAll<HTMLElement>(
    '[data-constela-escape]'
  );

  // Step 3: Create handler map for quick lookup
  const handlerMap = new Map<string, EscapeHandler>();
  for (const handler of escapeHandlers) {
    handlerMap.set(handler.name, handler);
  }

  // Step 4: Mount escape handlers and collect cleanup functions
  const cleanupFns: (() => void)[] = [];

  for (const element of escapeElements) {
    const escapeName = element.getAttribute('data-constela-escape') ?? '';
    const handler = handlerMap.get(escapeName);

    if (!handler) {
      // Ignore unregistered escape names
      continue;
    }

    // Create EscapeContext for this handler
    const escapeContext: EscapeContext = {
      appInstance,
      getState: (name: string) => appInstance.getState(name),
      setState: (name: string, value: unknown) => appInstance.setState(name, value),
      subscribe: (name: string, fn: (value: unknown) => void) => {
        // Use appInstance.subscribe if available, otherwise return no-op
        if (typeof appInstance.subscribe === 'function') {
          return appInstance.subscribe(name, fn);
        }
        // Return empty unsubscribe function
        return () => {};
      },
    };

    // Mount the handler and collect cleanup
    try {
      const cleanup = handler.mount(element, escapeContext);
      cleanupFns.push(cleanup);
    } catch {
      // Handle mount errors gracefully - continue with other handlers
    }
  }

  // Step 5: Theme synchronization effect
  if (program.state?.['theme']) {
    const updateThemeClass = (value: unknown) => {
      if (value === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initial sync from current state
    const currentTheme = appInstance.getState?.('theme');
    if (currentTheme) {
      updateThemeClass(currentTheme);
    }

    // Subscribe to changes
    if (appInstance.subscribe) {
      const unsubscribeTheme = appInstance.subscribe('theme', updateThemeClass);
      cleanupFns.push(unsubscribeTheme);
    }
  }

  // Step 6: Track destroy state
  let destroyed = false;

  // Step 7: Return extended AppInstance
  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;

      // Run all escape handler cleanups
      for (const cleanup of cleanupFns) {
        cleanup();
      }

      // Destroy the underlying app instance
      appInstance.destroy();
    },

    setState(name: string, value: unknown): void {
      appInstance.setState(name, value);
    },

    getState(name: string): unknown {
      return appInstance.getState(name);
    },
  };
}
