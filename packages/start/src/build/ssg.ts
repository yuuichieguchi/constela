import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { CompiledProgram } from '@constela/compiler';
import type { ScannedRoute, PageModule, StaticPathsResult } from '../types.js';
import {
  renderPage,
  generateHydrationScript,
  wrapHtml,
  type SSRContext,
} from '../runtime/entry-server.js';
import { resolvePageExport } from '../utils/resolve-page.js';

/**
 * Provider function for static paths when getStaticPaths is not available in the module.
 * Used for dependency injection in tests.
 */
export type StaticPathsProvider = (
  pattern: string
) => StaticPathsResult | null | Promise<StaticPathsResult | null>;

/**
 * Options for generateStaticPages function
 */
export interface GenerateStaticPagesOptions {
  /**
   * Optional provider for static paths when module doesn't export getStaticPaths.
   * Primarily used for testing purposes.
   */
  staticPathsProvider?: StaticPathsProvider;
}

/**
 * Default program used when module cannot be loaded
 */
const defaultProgram: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: '' } }],
  },
};

/**
 * Generate output file path from route pattern
 *
 * @param pattern - Route pattern (e.g., '/about', '/users/1')
 * @param outDir - Output directory
 * @returns Full file path for the HTML file
 */
function getOutputPath(pattern: string, outDir: string): string {
  if (pattern === '/') {
    return join(outDir, 'index.html');
  }

  // Remove leading slash and create path
  const segments = pattern.slice(1).split('/');
  return join(outDir, ...segments, 'index.html');
}

/**
 * Resolve dynamic route pattern with actual params
 *
 * @param pattern - Route pattern with :param placeholders
 * @param params - Actual parameter values
 * @returns Resolved path
 */
function resolvePattern(
  pattern: string,
  params: Record<string, string>
): string {
  let resolved = pattern;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, value);
  }
  return resolved;
}

/**
 * Try to load a page module and get its program and getStaticPaths
 *
 * @param filePath - Path to the module file
 * @returns PageModule or null if loading fails
 */
async function tryLoadModule(filePath: string): Promise<PageModule | null> {
  try {
    const module = (await import(filePath)) as PageModule;
    return module;
  } catch {
    return null;
  }
}

/**
 * Get static paths for a dynamic route
 *
 * @param route - The scanned route
 * @param module - The loaded page module (if available)
 * @param staticPathsProvider - Optional provider for static paths (used in tests)
 * @returns StaticPathsResult or null if not available
 */
async function getStaticPathsForRoute(
  route: ScannedRoute,
  module: PageModule | null,
  staticPathsProvider?: StaticPathsProvider
): Promise<StaticPathsResult | null> {
  // First, try to use getStaticPaths from the module
  if (module?.getStaticPaths) {
    const result = await module.getStaticPaths();
    return result;
  }

  // Fall back to provider if available (for testing/DI)
  if (staticPathsProvider) {
    return await staticPathsProvider(route.pattern);
  }

  return null;
}

/**
 * Generate a single HTML page
 *
 * @param pattern - Route pattern (resolved, e.g., '/users/1')
 * @param outDir - Output directory
 * @param program - Compiled program to render
 * @param params - Route parameters
 * @returns Generated file path
 */
async function generateSinglePage(
  pattern: string,
  outDir: string,
  program: CompiledProgram,
  params: Record<string, string> = {}
): Promise<string> {
  const outputPath = getOutputPath(pattern, outDir);
  const outputDir = dirname(outputPath);

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Create SSR context
  const ctx: SSRContext = {
    url: pattern,
    params,
    query: new URLSearchParams(),
  };

  // Render page content
  const content = await renderPage(program, ctx);

  // Generate hydration script
  const hydrationScript = generateHydrationScript(program);

  // Wrap in full HTML document
  const html = wrapHtml(content, hydrationScript);

  // Write to file
  await writeFile(outputPath, html, 'utf-8');

  return outputPath;
}

/**
 * Generate static pages for SSG routes
 *
 * @param routes - Array of scanned routes
 * @param outDir - Output directory for generated HTML files
 * @param options - Optional configuration including staticPathsProvider for DI
 * @returns Array of generated file paths
 */
export async function generateStaticPages(
  routes: ScannedRoute[],
  outDir: string,
  options: GenerateStaticPagesOptions = {}
): Promise<string[]> {
  const { staticPathsProvider } = options;
  const generatedPaths: string[] = [];

  // Filter to only page routes (skip api and middleware)
  const pageRoutes = routes.filter((r) => r.type === 'page');

  for (const route of pageRoutes) {
    const isDynamic = route.params.length > 0;

    // Try to load the module
    const module = await tryLoadModule(route.file);

    // Get the page export (could be static program or function)
    const pageExport = module?.default ?? defaultProgram;

    if (isDynamic) {
      // Dynamic route: requires getStaticPaths
      const staticPaths = await getStaticPathsForRoute(route, module, staticPathsProvider);

      if (!staticPaths) {
        // Skip dynamic routes without getStaticPaths
        continue;
      }

      // Generate a page for each path
      for (const pathData of staticPaths.paths) {
        // Resolve the program with params (handles both static and function exports)
        const program = await resolvePageExport(pageExport, pathData.params, route.params);

        const resolvedPattern = resolvePattern(route.pattern, pathData.params);
        const filePath = await generateSinglePage(
          resolvedPattern,
          outDir,
          program,
          pathData.params
        );
        generatedPaths.push(filePath);
      }
    } else {
      // Static route: generate directly (with empty params)
      const program = await resolvePageExport(pageExport, {});
      const filePath = await generateSinglePage(route.pattern, outDir, program);
      generatedPaths.push(filePath);
    }
  }

  return generatedPaths;
}
