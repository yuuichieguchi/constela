import type { ScannedRoute, APIModule, APIContext, PageModule } from '../types.js';
import type { CompiledProgram } from '@constela/compiler';
import { matchRoute } from '@constela/router';
import {
  renderPage,
  generateHydrationScript,
  wrapHtml,
} from '../runtime/entry-server.js';
import { createAPIHandler } from '../api/handler.js';

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
        const program: CompiledProgram = pageModule.default;

        const content = await renderPage(program, {
          url: request.url,
          params: matchedParams,
          query: url.searchParams,
        });

        const hydrationScript = generateHydrationScript(program);
        const html = wrapHtml(content, hydrationScript);

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
