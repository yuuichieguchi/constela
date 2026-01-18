import type { ScannedRoute, APIModule, APIContext, PageModule } from '../types.js';
import { matchRoute } from '@constela/router';
import {
  renderPage,
  generateHydrationScript,
  wrapHtml,
} from '../runtime/entry-server.js';
import { createAPIHandler } from '../api/handler.js';
import { resolvePageExport } from '../utils/resolve-page.js';
import { isCookieInitialExpr } from '@constela/core';

// ==================== Type Definitions ====================

export type PlatformAdapter = 'cloudflare' | 'vercel' | 'deno' | 'node';

export interface AdapterOptions {
  platform: PlatformAdapter;
  routes: ScannedRoute[];
  loadModule?: (file: string) => Promise<unknown>;
}

export interface EdgeAdapter {
  fetch: (request: Request) => Promise<Response>;
}

// ==================== Helper Functions ====================

/**
 * Default module loader (dynamic import)
 */
async function defaultLoadModule(file: string): Promise<unknown> {
  return import(file);
}

/**
 * Check if request is for static assets
 */
function isStaticAssetRequest(pathname: string): boolean {
  return pathname.startsWith('/_assets/') ||
         pathname.startsWith('/_static/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.map');
}

/**
 * Create a 404 Not Found response
 */
function createNotFoundResponse(): Response {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a 500 Internal Server Error response
 */
function createErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ==================== Cookie Parsing ====================

/**
 * Parse Cookie header into key-value pairs
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name) {
      const value = valueParts.join('=').trim();
      try {
        cookies[name.trim()] = decodeURIComponent(value);
      } catch {
        cookies[name.trim()] = value;
      }
    }
  }
  return cookies;
}

// ==================== Adapter Creation ====================

/**
 * Create edge runtime adapter
 */
export function createAdapter(options: AdapterOptions): EdgeAdapter {
  const { routes, loadModule = defaultLoadModule } = options;

  async function fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      let pathname = url.pathname;

      // Normalize trailing slash (except for root)
      if (pathname !== '/' && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }

      // Skip static asset requests
      if (isStaticAssetRequest(pathname)) {
        return createNotFoundResponse();
      }

      // Find matching route
      let matchedRoute: ScannedRoute | null = null;
      let matchedParams: Record<string, string> = {};

      for (const route of routes) {
        const match = matchRoute(route.pattern, pathname);
        if (match) {
          matchedRoute = route;
          matchedParams = match.params;
          break;
        }
      }

      // Return 404 if no route matches
      if (!matchedRoute) {
        return createNotFoundResponse();
      }

      // Load the module
      const module = await loadModule(matchedRoute.file);

      // Handle based on route type
      if (matchedRoute.type === 'api') {
        // API route handling
        const apiModule = module as APIModule;
        const ctx: APIContext = {
          params: matchedParams,
          query: url.searchParams,
          request,
        };

        const handler = createAPIHandler(apiModule);
        return await handler(ctx);
      } else {
        // Page route handling (SSR)
        const pageModule = module as PageModule;
        const program = await resolvePageExport(pageModule.default, matchedParams, matchedRoute.params);

        // Parse cookies from request headers
        const cookieHeader = request.headers.get('Cookie');
        const cookies = parseCookies(cookieHeader);

        const content = await renderPage(program, {
          url: request.url,
          params: matchedParams,
          query: url.searchParams,
          cookies,
        });

        // Create route context for hydration
        const routeContext = {
          params: matchedParams,
          query: Object.fromEntries(url.searchParams.entries()),
          path: url.pathname,
        };

        const hydrationScript = generateHydrationScript(program, undefined, routeContext);

        // Detect theme state from program (handle both string and cookie expression)
        const themeState = program.state?.['theme'];
        let initialTheme: 'dark' | 'light' | undefined;
        if (themeState) {
          if (isCookieInitialExpr(themeState.initial)) {
            const cookieValue = cookies[themeState.initial.key];
            initialTheme = (cookieValue ?? themeState.initial.default) as 'dark' | 'light';
          } else if (typeof themeState.initial === 'string') {
            initialTheme = themeState.initial as 'dark' | 'light';
          }
        }

        const html = wrapHtml(content, hydrationScript, undefined, initialTheme ? {
          theme: initialTheme,
          defaultTheme: initialTheme,
          themeStorageKey: 'theme'
        } : undefined);

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  return { fetch };
}
