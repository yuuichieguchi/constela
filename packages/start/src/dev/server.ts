import { createServer, type Server } from 'node:http';
import { createReadStream } from 'node:fs';
import { join, isAbsolute, dirname, basename, relative } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { type ViewNode, isCookieInitialExpr, ConstelaError } from '@constela/core';
import type { DevServerOptions, ScannedRoute } from '../types.js';
import { resolveStaticFile } from '../static/index.js';
import { JsonPageLoader, convertToCompiledProgram } from '../json-page-loader.js';
import { renderPage, wrapHtml, generateHydrationScript, generateMetaTags, type WidgetConfig } from '../runtime/entry-server.js';
import { parseCookies } from '../edge/adapter.js';
import { scanRoutes } from '../router/file-router.js';
import { LayoutResolver } from '../layout/resolver.js';
import { analyzeLayoutPass, transformLayoutPass, composeLayoutWithPage } from '@constela/compiler';
import { createHMRServer, type HMRServer } from './hmr-server.js';
import { createWatcher, type FileWatcher } from './watcher.js';

// ==================== Types ====================

/**
 * Development server interface
 */
export interface DevServer {
  /** Start listening for connections */
  listen(): Promise<void>;
  /** Stop the server and close all connections */
  close(): Promise<void>;
  /** The port number the server is listening on */
  port: number;
  /** The port number the HMR WebSocket server is listening on */
  hmrPort: number;
}

// ==================== Constants ====================

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
const DEFAULT_PUBLIC_DIR = 'public';
const DEFAULT_ROUTES_DIR = 'src/routes';

// ==================== Route Matching ====================

/**
 * Match result from route matching
 */
interface MatchResult {
  route: ScannedRoute;
  params: Record<string, string>;
}

/**
 * Match a URL path against scanned routes.
 *
 * Supports:
 * - Static segments: /about matches /about
 * - Dynamic params: /users/:id matches /users/123
 * - Catch-all: /docs/* matches /docs/getting-started/intro
 *
 * @param url - The URL path to match (e.g., "/docs/getting-started")
 * @param routes - Array of scanned routes to match against
 * @returns MatchResult if matched, null otherwise
 */
function matchRoute(url: string, routes: ScannedRoute[]): MatchResult | null {
  // Normalize URL - remove trailing slash except for root
  const normalizedUrl = url === '/' ? '/' : url.replace(/\/$/, '');
  const urlSegments = normalizedUrl.split('/').filter(Boolean);

  for (const route of routes) {
    // Skip non-page routes
    if (route.type !== 'page') {
      continue;
    }

    const patternSegments = route.pattern.split('/').filter(Boolean);
    const params: Record<string, string> = {};

    // Check for catch-all pattern
    const hasCatchAll = patternSegments.includes('*');

    if (hasCatchAll) {
      // Find the index of catch-all segment
      const catchAllIndex = patternSegments.indexOf('*');

      // Static segments before catch-all must match
      let matched = true;
      for (let i = 0; i < catchAllIndex; i++) {
        const patternSeg = patternSegments[i];
        const urlSeg = urlSegments[i];

        if (patternSeg === undefined || urlSeg === undefined) {
          matched = false;
          break;
        }

        if (patternSeg.startsWith(':')) {
          // Dynamic param before catch-all
          const paramName = patternSeg.slice(1);
          params[paramName] = urlSeg;
        } else if (patternSeg !== urlSeg) {
          matched = false;
          break;
        }
      }

      if (matched && urlSegments.length >= catchAllIndex) {
        // Capture remaining segments as catch-all param
        // Extract param name from the route's params array (first catch-all param)
        const catchAllParamName = route.params.find((p) => {
          // The param that corresponds to '*' in the pattern
          // It's typically the last one or named 'slug'
          return true; // Use the first param for catch-all
        });

        if (catchAllParamName) {
          const remainingSegments = urlSegments.slice(catchAllIndex);
          params[catchAllParamName] = remainingSegments.join('/');
        }

        return { route, params };
      }
    } else {
      // Exact segment count must match for non-catch-all routes
      if (patternSegments.length !== urlSegments.length) {
        continue;
      }

      let matched = true;
      for (let i = 0; i < patternSegments.length; i++) {
        const patternSeg = patternSegments[i];
        const urlSeg = urlSegments[i];

        if (patternSeg === undefined || urlSeg === undefined) {
          matched = false;
          break;
        }

        if (patternSeg.startsWith(':')) {
          // Dynamic parameter - extract value
          const paramName = patternSeg.slice(1);
          params[paramName] = urlSeg;
        } else if (patternSeg !== urlSeg) {
          // Static segment doesn't match
          matched = false;
          break;
        }
      }

      if (matched) {
        return { route, params };
      }
    }
  }

  return null;
}

// ==================== HTML Utilities ====================

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extract MDX content slot from loaded data.
 *
 * Looks for a matching item in the data source array based on slug parameter,
 * and returns the content as a slot for layout composition.
 *
 * @param loadedData - The loaded data from the page
 * @param dataSourceName - The name of the data source (e.g., 'docs')
 * @param routeParams - Route parameters containing the slug
 * @returns Record with 'mdx-content' slot if found, undefined otherwise
 */
export function extractMdxContentSlot(
  loadedData: Record<string, unknown>,
  dataSourceName: string,
  routeParams: Record<string, string>
): Record<string, ViewNode> | undefined {
  const dataSource = loadedData[dataSourceName];
  if (!Array.isArray(dataSource)) {
    return undefined;
  }

  // Default to 'index' for empty slug (e.g., /docs -> index.mdx)
  const slug = routeParams['slug'] || 'index';

  const item = dataSource.find(
    (entry: unknown) =>
      typeof entry === 'object' &&
      entry !== null &&
      'slug' in entry &&
      (entry as { slug: unknown }).slug === slug
  );

  if (!item || typeof item !== 'object' || !('content' in item)) {
    return undefined;
  }

  return { 'mdx-content': (item as { content: ViewNode }).content };
}

/**
 * Extract MDX content slot and matched item for data binding.
 *
 * This function is used in development mode to:
 * 1. Extract the MDX content for layout slot composition
 * 2. Return the matched item so it can be bound to the data source for data expression resolution
 *
 * @param loadedData - The loaded data from the page
 * @param dataSourceName - The name of the data source (e.g., 'docs')
 * @param routeParams - Route parameters containing the slug
 * @returns Object with slot and matchedItem, or undefined if no match
 */
export function extractMdxContentSlotWithData(
  loadedData: Record<string, unknown>,
  dataSourceName: string,
  routeParams: Record<string, string>
): { slot: Record<string, ViewNode>; matchedItem: unknown } | undefined {
  const dataSource = loadedData[dataSourceName];
  if (!Array.isArray(dataSource)) {
    return undefined;
  }

  // Default to 'index' for empty slug (e.g., /docs -> index.mdx)
  const slug = routeParams['slug'] || 'index';

  const item = dataSource.find(
    (entry: unknown) =>
      typeof entry === 'object' &&
      entry !== null &&
      'slug' in entry &&
      (entry as { slug: unknown }).slug === slug
  );

  if (!item || typeof item !== 'object' || !('content' in item)) {
    return undefined;
  }

  return {
    slot: { 'mdx-content': (item as { content: ViewNode }).content },
    matchedItem: item,
  };
}

// ==================== DevServer Implementation ====================

/**
 * Creates a development server with HMR support.
 *
 * The server uses:
 * - Node.js http module for the base server
 * - Vite middleware mode for HMR (future enhancement)
 * - Hono for request handling (future enhancement)
 *
 * @param options - Server configuration options
 * @returns Promise that resolves to a DevServer instance
 */
export async function createDevServer(
  options: DevServerOptions = {}
): Promise<DevServer> {
  const {
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    routesDir = DEFAULT_ROUTES_DIR,
    publicDir = join(process.cwd(), DEFAULT_PUBLIC_DIR),
    layoutsDir,
    css,
  } = options;

  let httpServer: Server | null = null;
  let actualPort = port;
  let viteServer: ViteDevServer | null = null;
  let hmrServer: HMRServer | null = null;
  let watcher: FileWatcher | null = null;

  // Create Vite server if CSS option is provided
  if (css) {
    viteServer = await createViteServer({
      root: process.cwd(),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
      logLevel: 'silent',
    });
  }

  // Resolve routes directory to absolute path
  const absoluteRoutesDir = isAbsolute(routesDir)
    ? routesDir
    : join(process.cwd(), routesDir);

  // Scan routes on startup
  let routes: ScannedRoute[] = [];
  try {
    routes = await scanRoutes(absoluteRoutesDir);
  } catch {
    // Routes directory may not exist yet - that's okay
    routes = [];
  }

  // Initialize layout resolver if layoutsDir is provided
  let layoutResolver: LayoutResolver | null = null;
  if (layoutsDir) {
    const absoluteLayoutsDir = isAbsolute(layoutsDir)
      ? layoutsDir
      : join(process.cwd(), layoutsDir);
    layoutResolver = new LayoutResolver(absoluteLayoutsDir);
    await layoutResolver.initialize();
  }

  const devServer: DevServer = {
    get port(): number {
      return actualPort;
    },

    get hmrPort(): number {
      return hmrServer?.port ?? 0;
    },

    async listen(): Promise<void> {
      return new Promise((resolve, reject) => {
        httpServer = createServer(async (req, res) => {
          // Parse URL pathname
          const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
          const pathname = url.pathname;

          // Handle Vite middleware first if available
          if (viteServer) {
            await new Promise<void>((resolveMiddleware) => {
              viteServer!.middlewares(req, res, () => {
                // Vite called next() - request not handled by Vite
                resolveMiddleware();
              });
            });

            // Check if response was already sent by Vite
            if (res.writableEnded) {
              return;
            }
          }

          // Try to serve static file
          const staticResult = resolveStaticFile(pathname, publicDir);

          // If security error detected (path_traversal or outside_public), return 403
          if (staticResult.error === 'path_traversal' || staticResult.error === 'outside_public') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }

          // If file exists, stream it
          if (staticResult.exists && staticResult.filePath && staticResult.mimeType) {
            res.writeHead(200, { 'Content-Type': staticResult.mimeType });
            const stream = createReadStream(staticResult.filePath);
            stream.pipe(res);
            stream.on('error', () => {
              // Only send error response if headers haven't been sent yet
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
              }
              res.end('Internal Server Error');
            });
            return;
          }

          // Try to match against JSON page routes
          const match = matchRoute(pathname, routes);

          if (match) {
            try {
              // Use project root for JsonPageLoader to allow imports outside routesDir
              // (e.g., "../data/examples.json" from src/pages/index.json)
              const projectRoot = process.cwd();
              const pageLoader = new JsonPageLoader(projectRoot);

              // Get relative path from project root
              const relativePath = match.route.file.startsWith(projectRoot)
                ? match.route.file.slice(projectRoot.length + 1)
                : match.route.file;

              // Load page info with widgets
              const pageInfo = await pageLoader.loadPage(relativePath);
              const program = await convertToCompiledProgram(pageInfo);

              // Compose with layout if page specifies one and layoutResolver is available
              let composedProgram = program;

              // Get widgets from pageInfo
              const widgets: WidgetConfig[] = pageInfo.widgets.map(w => ({ id: w.id, program: w.program }));
              // Extract MDX content slot and matched item for data binding
              const mdxResult = extractMdxContentSlotWithData(pageInfo.loadedData, 'docs', match.params);

              if (program.route?.layout && layoutResolver) {
                const layoutProgram = await layoutResolver.getLayout(program.route.layout);
                if (layoutProgram) {
                  const analysis = analyzeLayoutPass(layoutProgram);
                  if (analysis.ok) {
                    const compiledLayout = transformLayoutPass(layoutProgram, analysis.context);
                    // composeLayoutWithPage handles both array and Record formats for actions
                    // Pass layoutParams from page route to resolve param expressions in layout
                    const layoutParams = program.route?.layoutParams;
                    // Extract MDX content slot from the result
                    const slots = mdxResult?.slot;
                    composedProgram = composeLayoutWithPage(
                      compiledLayout as unknown as import('@constela/compiler').CompiledProgram,
                      program,
                      layoutParams,
                      slots
                    );

                    // Merge layout importData into composed program for SSR
                    // The layout resolver loads imports and attaches them as importData
                    const layoutImportData = (layoutProgram as unknown as { importData?: Record<string, unknown> }).importData;
                    if (layoutImportData) {
                      (composedProgram as unknown as { importData?: Record<string, unknown> }).importData = {
                        ...((composedProgram as unknown as { importData?: Record<string, unknown> }).importData ?? {}),
                        ...layoutImportData,
                      };
                    }
                  }
                }
              }

              // Bind matched item to data source for data expressions (works with or without layout)
              // This enables data expressions like { expr: "data", "name": "docs", "path": "frontmatter.title" }
              if (mdxResult?.matchedItem) {
                const existingImportData = (composedProgram as unknown as { importData?: Record<string, unknown> }).importData ?? {};
                (composedProgram as unknown as { importData: Record<string, unknown> }).importData = {
                  ...existingImportData,
                  docs: mdxResult.matchedItem,  // Bind single matched item instead of array
                };
              }

              // Parse cookies from request headers
              const cookies = parseCookies(req.headers.cookie ?? null);

              // Create SSR context
              const ssrContext = {
                url: pathname,
                params: match.params,
                query: url.searchParams,
                cookies,
              };

              // Render the page
              const content = await renderPage(composedProgram, ssrContext);

              // Create route context for hydration
              const routeContext = {
                params: match.params,
                query: Object.fromEntries(url.searchParams.entries()),
                path: pathname,
              };
              const hydrationScript = generateHydrationScript(composedProgram, widgets, routeContext);

              // Generate meta tags from route definition
              const metaTags = generateMetaTags(composedProgram.route, {
                params: match.params,
                query: Object.fromEntries(url.searchParams.entries()),
                path: pathname,
              });

              // Generate CSS link tags if css option is provided
              const cssHead = css
                ? (Array.isArray(css) ? css : [css])
                    .map((p) => `<link rel="stylesheet" href="/${p}">`)
                    .join('\n')
                : '';

              // Generate HMR script to inject WebSocket URL for client
              const hmrScript = hmrServer
                ? `<script>window.__CONSTELA_HMR_URL__ = "ws://${host}:${hmrServer.port}";</script>`
                : '';

              // Combine meta tags with CSS head and HMR script
              const head = [metaTags, cssHead, hmrScript].filter(Boolean).join('\n');

              // Get initial theme from composed program state (handle both string and cookie expression)
              const themeState = composedProgram.state?.['theme'];
              let initialTheme: 'dark' | 'light' | undefined;
              if (themeState) {
                if (isCookieInitialExpr(themeState.initial)) {
                  const cookieValue = cookies[themeState.initial.key];
                  initialTheme = (cookieValue ?? themeState.initial.default) as 'dark' | 'light';
                } else if (typeof themeState.initial === 'string') {
                  initialTheme = themeState.initial as 'dark' | 'light';
                }
              }

              // Import map for resolving bare module specifiers in browser
              const importMap = {
                '@constela/runtime': '/node_modules/@constela/runtime/dist/index.js',
                '@constela/core': '/node_modules/@constela/core/dist/index.js',
                '@constela/compiler': '/node_modules/@constela/compiler/dist/index.js',
                'marked': '/node_modules/marked/lib/marked.esm.js',
                'monaco-editor': '/node_modules/monaco-editor/esm/vs/editor/editor.api.js',
              };

              const html = wrapHtml(content, hydrationScript, head || undefined, {
                ...(initialTheme ? {
                  theme: initialTheme,
                  defaultTheme: initialTheme,
                  themeStorageKey: 'theme'
                } : {}),
                importMap,
                ...(options.seo?.lang ? { lang: options.seo.lang } : {}),
              });

              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(html);
              return;
            } catch (error) {
              // In dev mode, return 500 with error message
              const errorMessage = error instanceof Error ? error.message : String(error);
              const errorStack = error instanceof Error ? error.stack : '';

              res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Server Error</title>
<style>
body { font-family: system-ui, sans-serif; padding: 2rem; background: #1a1a1a; color: #fff; }
h1 { color: #ff6b6b; }
pre { background: #2d2d2d; padding: 1rem; border-radius: 4px; overflow-x: auto; }
</style>
</head>
<body>
<h1>Server Error</h1>
<p>${escapeHtml(errorMessage)}</p>
<pre>${escapeHtml(errorStack ?? '')}</pre>
</body>
</html>`);
              return;
            }
          }

          // No route matched - return 404
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>404 Not Found</title>
<style>
body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; }
h1 { color: #666; }
</style>
</head>
<body>
<h1>404 Not Found</h1>
<p>The page <code>${escapeHtml(pathname)}</code> could not be found.</p>
</body>
</html>`);
        });

        httpServer.on('error', (err) => {
          reject(err);
        });

        httpServer.listen(port, host, async () => {
          // Get the actual port (important when port is 0)
          const address = httpServer?.address() as AddressInfo | null;
          if (address) {
            actualPort = address.port;
          }

          // Initialize HMR server
          try {
            hmrServer = await createHMRServer({ port: 0 });

            // Initialize file watcher for routes directory
            watcher = await createWatcher({
              directory: absoluteRoutesDir,
              patterns: ['**/*.json'],
            });

            // Handle file changes
            watcher.on('change', async (event) => {
              const projectRoot = process.cwd();
              const pageLoader = new JsonPageLoader(projectRoot);

              try {
                // Normalize path to use forward slashes (for Windows compatibility)
                const relativePath = relative(projectRoot, event.path).replace(/\\/g, '/');
                const pageInfo = await pageLoader.loadPage(relativePath);
                const program = await convertToCompiledProgram(pageInfo);

                if (hmrServer) {
                  hmrServer.broadcastUpdate(event.path, program);
                }
              } catch (error) {
                if (hmrServer) {
                  if (error instanceof ConstelaError) {
                    hmrServer.broadcastError(event.path, [error]);
                  } else {
                    // Create a generic error object with minimal ConstelaError shape
                    const genericError = {
                      code: 'COMPILE_ERROR',
                      message: error instanceof Error ? error.message : String(error),
                      path: event.path,
                      severity: 'error' as const,
                      suggestion: undefined,
                      expected: undefined,
                      actual: undefined,
                      context: undefined,
                      name: 'ConstelaError',
                      toJSON: () => ({
                        code: 'COMPILE_ERROR',
                        message: error instanceof Error ? error.message : String(error),
                        path: event.path,
                        severity: 'error',
                        suggestion: undefined,
                        expected: undefined,
                        actual: undefined,
                        context: undefined,
                      }),
                    } as unknown as ConstelaError;
                    hmrServer.broadcastError(event.path, [genericError]);
                  }
                }
              }
            });
          } catch (hmrError) {
            // HMR initialization failed - log but don't fail server startup
            console.warn('HMR initialization failed:', hmrError);
          }

          resolve();
        });
      });
    },

    async close(): Promise<void> {
      // Close file watcher first
      if (watcher) {
        await watcher.close();
        watcher = null;
      }

      // Close HMR server
      if (hmrServer) {
        await hmrServer.close();
        hmrServer = null;
      }

      // Close Vite server if it exists
      if (viteServer) {
        await viteServer.close();
        viteServer = null;
      }

      return new Promise((resolve, reject) => {
        if (!httpServer) {
          resolve();
          return;
        }

        // Force close all active connections (Node.js 18.2+)
        httpServer.closeAllConnections();

        httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            httpServer = null;
            resolve();
          }
        });
      });
    },
  };

  return devServer;
}
