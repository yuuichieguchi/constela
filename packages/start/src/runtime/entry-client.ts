/**
 * Client-side entry point for Constela applications
 * Handles hydration and Escape Hatch mechanism for external library integration.
 */

import type { CompiledProgram } from '@constela/compiler';
import {
  hydrateApp,
  createHMRClient,
  createHMRHandler,
  createErrorOverlay,
  type AppInstance,
  type HMRClient,
} from '@constela/runtime';

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
 * Route context for the application
 */
export interface RouteContext {
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}

/**
 * Options for initializing the client application
 */
export interface InitClientOptions {
  program: CompiledProgram;
  container: HTMLElement;
  escapeHandlers?: EscapeHandler[];
  route?: RouteContext;
}


/**
 * Initialize the client application with hydration and escape hatch support.
 *
 * @param options - Configuration options
 * @returns AppInstance for controlling the application
 */
export function initClient(options: InitClientOptions): AppInstance {
  const { program, container, escapeHandlers = [], route } = options;

  // Step 1: Hydrate the application with route context
  const appInstance = hydrateApp({ program, container, ...(route && { route }) });

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
        return appInstance.subscribe(name, fn);
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
    const unsubscribeTheme = appInstance.subscribe('theme', updateThemeClass);
    cleanupFns.push(unsubscribeTheme);
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

    subscribe(name: string, fn: (value: unknown) => void): () => void {
      return appInstance.subscribe(name, fn);
    },
  };
}

/**
 * Options for initializing the client application with HMR support
 */
export interface InitClientWithHMROptions extends InitClientOptions {
  /** WebSocket URL for HMR server (e.g., "ws://localhost:3001") */
  hmrUrl?: string;
}

/**
 * Initialize the client application with HMR (Hot Module Replacement) support.
 *
 * This function extends initClient with automatic HMR setup:
 * - Connects to HMR WebSocket server
 * - Handles update messages by preserving state and re-hydrating
 * - Shows error overlay on compilation errors
 *
 * @param options - Configuration options including optional HMR URL
 * @returns AppInstance for controlling the application
 */
export function initClientWithHMR(options: InitClientWithHMROptions): AppInstance {
  const { hmrUrl, ...clientOptions } = options;
  const app = initClient(clientOptions);

  // Only enable HMR if URL is provided (development mode)
  if (hmrUrl) {
    const overlay = createErrorOverlay();
    const handlerOptions = {
      container: options.container,
      program: options.program,
      ...(options.route && { route: options.route }),
    };
    const handler = createHMRHandler(handlerOptions);

    const client = createHMRClient({
      url: hmrUrl,
      onUpdate: (_file: string, program: CompiledProgram) => {
        overlay.hide();
        handler.handleUpdate(program);
      },
      onError: (file: string, errors: unknown[]) => {
        overlay.show({
          file,
          errors: errors.map((e) => {
            if (typeof e === 'object' && e !== null) {
              const errObj = e as { code?: string; message?: string; suggestion?: string };
              const result: { code?: string; message: string; suggestion?: string } = {
                message: errObj.message ?? 'Unknown error',
              };
              if (errObj.code !== undefined) result.code = errObj.code;
              if (errObj.suggestion !== undefined) result.suggestion = errObj.suggestion;
              return result;
            }
            return { message: String(e) };
          }),
        });
      },
      onConnect: () => {
        console.log('[HMR] Connected');
      },
      onDisconnect: () => {
        console.log('[HMR] Disconnected');
      },
    });

    client.connect();

    // Extend destroy to cleanup HMR
    const originalDestroy = app.destroy;
    app.destroy = () => {
      client.disconnect();
      handler.destroy();
      overlay.hide();
      originalDestroy();
    };
  }

  return app;
}
