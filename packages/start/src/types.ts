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
 * Page module with Constela program
 */
export interface PageModule {
  default: CompiledProgram;
  getStaticPaths?: () => Promise<StaticPathsResult> | StaticPathsResult;
}

export interface StaticPathsResult {
  paths: Array<{ params: Record<string, string> }>;
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
}

/**
 * Build options
 */
export interface BuildOptions {
  outDir?: string;
  routesDir?: string;
  target?: 'node' | 'edge';
}
