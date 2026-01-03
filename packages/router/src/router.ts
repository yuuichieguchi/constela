/**
 * Router - Main routing implementation
 */

import type { CompiledProgram } from '@constela/compiler';
import { createApp, type AppInstance } from '@constela/runtime';
import { matchRoute } from './matcher.js';

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

export interface RouteDef {
  path: string;
  program: CompiledProgram;
  title?: string | ((ctx: RouteContext) => string);
}

export interface RouterOptions {
  routes: RouteDef[];
  basePath?: string;
  fallback?: CompiledProgram;
  onRouteChange?: (ctx: RouteContext) => void;
}

export interface RouterInstance {
  mount(el: HTMLElement): { destroy(): void };
  navigate(to: string, opts?: { replace?: boolean }): void;
  getContext(): RouteContext;
}

export function createRouter(options: RouterOptions): RouterInstance {
  const { routes, basePath = '', fallback, onRouteChange } = options;

  // Normalize basePath (remove trailing slash if present)
  const normalizedBasePath = basePath.replace(/\/+$/, '');

  let mountElement: HTMLElement | null = null;
  let currentApp: AppInstance | null = null;
  let currentContext: RouteContext = {
    path: '',
    params: {},
    query: new URLSearchParams(),
  };
  let destroyed = false;

  function normalizePath(path: string): string {
    // Handle query string separately
    const [pathPart, queryPart] = path.split('?');
    const cleanPath = pathPart!.startsWith('/') ? pathPart! : '/' + pathPart!;
    const fullPath = normalizedBasePath ? normalizedBasePath + cleanPath : cleanPath;
    return queryPart ? `${fullPath}?${queryPart}` : fullPath;
  }

  function parseCurrentUrl(): { path: string; query: URLSearchParams } {
    const rawPathname = window.location.pathname;

    // Handle query strings that might be embedded in pathname (for test mocking)
    const [pathnameWithoutQuery, embeddedQuery] = rawPathname.split('?');
    const pathname = pathnameWithoutQuery!;

    // Prefer window.location.search, but fall back to embedded query
    const queryString = window.location.search || (embeddedQuery ? `?${embeddedQuery}` : '');

    const path = normalizedBasePath
      ? pathname.replace(new RegExp(`^${normalizedBasePath}`), '') || '/'
      : pathname;
    const query = new URLSearchParams(queryString);

    return { path, query };
  }

  function findMatchingRoute(path: string): {
    route: RouteDef | null;
    params: Record<string, string>;
  } {
    for (const route of routes) {
      const match = matchRoute(route.path, path);
      if (match) {
        return { route, params: match.params };
      }
    }
    return { route: null, params: {} };
  }

  function renderRoute(): void {
    if (!mountElement) return;

    // Destroy current app
    if (currentApp) {
      currentApp.destroy();
      currentApp = null;
    }

    const { path, query } = parseCurrentUrl();
    const { route, params } = findMatchingRoute(path);

    currentContext = {
      path,
      params,
      query,
    };

    const program = route?.program ?? fallback;

    if (!program) {
      throw new Error(`No route matched for path: ${path} and no fallback provided`);
    }

    currentApp = createApp(program, mountElement);

    // Update document title if specified
    if (route?.title) {
      const title = typeof route.title === 'function'
        ? route.title(currentContext)
        : route.title;
      document.title = title;
    }

    if (onRouteChange) {
      onRouteChange(currentContext);
    }
  }

  function handlePopState(): void {
    if (destroyed || !mountElement) return;
    try {
      renderRoute();
    } catch (error) {
      // Log error but don't rethrow to prevent breaking browser navigation
      console.error('Router error during navigation:', error);
    }
  }

  return {
    mount(el: HTMLElement): { destroy(): void } {
      mountElement = el;

      // Listen to popstate for back/forward navigation
      window.addEventListener('popstate', handlePopState);

      // Initial render
      renderRoute();

      return {
        destroy(): void {
          if (destroyed) return;
          destroyed = true;
          window.removeEventListener('popstate', handlePopState);
          if (currentApp) {
            currentApp.destroy();
            currentApp = null;
          }
          mountElement = null;
        },
      };
    },

    navigate(to: string, opts?: { replace?: boolean }): void {
      if (!mountElement) return;

      const fullPath = normalizePath(to);

      if (opts?.replace) {
        window.history.replaceState({}, '', fullPath);
      } else {
        window.history.pushState({}, '', fullPath);
      }

      renderRoute();
    },

    getContext(): RouteContext {
      return { ...currentContext };
    },
  };
}
