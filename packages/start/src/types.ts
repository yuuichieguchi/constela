import type { CompiledProgram } from '@constela/compiler';

/**
 * Scanned route from file system
 */
export interface ScannedRoute {
  file: string;
  pattern: string;
  type: 'page' | 'api' | 'middleware';
  params: string[];
}

/**
 * API endpoint context
 */
export interface APIContext {
  params: Record<string, string>;
  query: URLSearchParams;
  request: Request;
}

/**
 * API module with HTTP method handlers
 */
export interface APIModule {
  GET?: (ctx: APIContext) => Promise<Response> | Response;
  POST?: (ctx: APIContext) => Promise<Response> | Response;
  PUT?: (ctx: APIContext) => Promise<Response> | Response;
  DELETE?: (ctx: APIContext) => Promise<Response> | Response;
  PATCH?: (ctx: APIContext) => Promise<Response> | Response;
}

/**
 * Middleware context
 */
export interface MiddlewareContext {
  request: Request;
  params: Record<string, string>;
  url: URL;
  locals: Record<string, unknown>;
}

export type MiddlewareNext = () => Promise<Response>;

export type Middleware = (
  ctx: MiddlewareContext,
  next: MiddlewareNext
) => Promise<Response> | Response;

/**
 * Function-form page export that receives route params.
 *
 * @example
 * // pages/users/[id].ts
 * export default async function(params: Record<string, string>) {
 *   const user = await fetchUser(params.id);
 *   return createUserPage(user);
 * }
 */
export type PageExportFunction = (
  params: Record<string, string>
) => Promise<CompiledProgram> | CompiledProgram;

/**
 * Page module with Constela program
 */
export interface PageModule {
  default: CompiledProgram | PageExportFunction;
  getStaticPaths?: () => Promise<StaticPathsResult> | StaticPathsResult;
}

/**
 * Single path entry from getStaticPaths
 */
export interface StaticPathEntry {
  /** Route parameters for this path */
  params: Record<string, string>;
  /** Optional data to inject as __pathData in importData */
  data?: unknown;
}

export interface StaticPathsResult {
  paths: StaticPathEntry[];
}

/**
 * Constela configuration
 */
export interface ConstelaConfig {
  ssg?: {
    routes?: string[];
  };
  edge?: {
    adapter?: 'cloudflare' | 'vercel' | 'deno' | 'node';
  };
}

/**
 * Development server options
 */
export interface DevServerOptions {
  port?: number;
  host?: string;
  routesDir?: string;
  publicDir?: string;
  /** Layouts directory for layout composition */
  layoutsDir?: string;
  /** CSS entry point(s) for Vite middleware processing */
  css?: string | string[];
}

/**
 * Build options
 */
export interface BuildOptions {
  outDir?: string | undefined;
  routesDir?: string | undefined;
  publicDir?: string | undefined;
  layoutsDir?: string | undefined;
  /** CSS entry point(s) for Vite middleware processing */
  css?: string | string[] | undefined;
  target?: 'node' | 'edge' | undefined;
}
