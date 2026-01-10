import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile, cp, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, basename } from 'node:path';
import type { CompiledProgram } from '@constela/compiler';
import type { BuildOptions, ScannedRoute } from '../types.js';
import { scanRoutes, filePathToPattern } from '../router/file-router.js';
import {
  JsonPageLoader,
  convertToCompiledProgram,
  type PageInfo,
  type JsonPage,
} from '../json-page-loader.js';
import {
  renderPage,
  wrapHtml,
  generateHydrationScript,
  type SSRContext,
} from '../runtime/entry-server.js';
import { bundleRuntime } from './bundler.js';

export interface BuildResult {
  outDir: string;
  routes: string[];
  generatedFiles: string[];
}

/**
 * Static path entry from getStaticPaths
 */
interface StaticPathEntry {
  params: Record<string, string>;
}

/**
 * Result from getStaticPaths function
 */
interface GetStaticPathsResult {
  paths: StaticPathEntry[];
}

/**
 * Layout definition loaded from JSON
 */
interface LayoutDefinition {
  version: string;
  layout?: string;
  view: unknown;
}

/**
 * Check if a route pattern contains dynamic segments
 */
function isDynamicRoute(pattern: string): boolean {
  return pattern.includes(':') || pattern.includes('*');
}

/**
 * Convert a file path to output HTML path
 * e.g., "about.json" -> "about/index.html"
 *       "index.json" -> "index.html"
 *       "docs/intro.json" -> "docs/intro/index.html"
 */
function getOutputPath(filePath: string, outDir: string): string {
  // Remove extension
  const withoutExt = filePath.replace(/\.(json|ts|tsx|js|jsx)$/, '');

  // Handle index files
  if (withoutExt === 'index' || withoutExt.endsWith('/index')) {
    return join(outDir, withoutExt + '.html');
  }

  // Other files become directories with index.html
  return join(outDir, withoutExt, 'index.html');
}

/**
 * Convert params to output path for dynamic routes
 * e.g., { slug: "getting-started" } with pattern "/docs/:slug" -> "docs/getting-started/index.html"
 */
function paramsToOutputPath(
  basePattern: string,
  params: Record<string, string>,
  outDir: string
): string {
  let path = basePattern;

  // Replace :param with actual value
  for (const [key, value] of Object.entries(params)) {
    // Handle catch-all params (e.g., :slug* or *)
    path = path.replace(`:${key}`, value);
    path = path.replace('*', value);
  }

  // Remove leading slash and add index.html
  const relativePath = path.startsWith('/') ? path.slice(1) : path;

  if (relativePath === '') {
    return join(outDir, 'index.html');
  }

  return join(outDir, relativePath, 'index.html');
}

/**
 * Load getStaticPaths from a .paths.ts file
 */
async function loadGetStaticPaths(
  pageFile: string
): Promise<GetStaticPathsResult | null> {
  // Determine the .paths.ts file path
  const dir = dirname(pageFile);
  const baseName = basename(pageFile, '.json');
  const pathsFile = join(dir, `${baseName}.paths.ts`);

  if (!existsSync(pathsFile)) {
    return null;
  }

  try {
    // Read the file content and extract paths
    const content = readFileSync(pathsFile, 'utf-8');

    // Simple regex-based extraction of paths array
    // This is a simplified implementation; in production, we'd use a proper parser
    const pathsMatch = content.match(/paths:\s*\[([\s\S]*?)\]/);
    if (!pathsMatch) {
      throw new Error(`Invalid getStaticPaths format in ${pathsFile}`);
    }

    const pathsContent = pathsMatch[1];

    // Extract params objects
    const paramsRegex = /\{\s*params:\s*\{([^}]+)\}\s*\}/g;
    const paths: StaticPathEntry[] = [];
    let match;

    while ((match = paramsRegex.exec(pathsContent ?? '')) !== null) {
      const paramsStr = match[1];
      const params: Record<string, string> = {};

      // Parse individual params
      const paramMatches = paramsStr?.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
      if (paramMatches) {
        for (const paramMatch of paramMatches) {
          const key = paramMatch[1];
          const value = paramMatch[2];
          if (key !== undefined && value !== undefined) {
            params[key] = value;
          }
        }
      }

      paths.push({ params });
    }

    // Validate the result format
    if (!Array.isArray(paths)) {
      throw new Error(`Invalid getStaticPaths format in ${pathsFile}: must return { paths: [] }`);
    }

    return { paths };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid getStaticPaths')) {
      throw error;
    }
    throw new Error(`Invalid getStaticPaths format in ${pathsFile}`);
  }
}

/**
 * Load a layout definition from file
 */
async function loadLayout(
  layoutName: string,
  layoutsDir: string
): Promise<LayoutDefinition> {
  const layoutPath = join(layoutsDir, `${layoutName}.json`);

  if (!existsSync(layoutPath)) {
    throw new Error(`Layout "${layoutName}" not found at ${layoutPath}`);
  }

  try {
    const content = readFileSync(layoutPath, 'utf-8');
    return JSON.parse(content) as LayoutDefinition;
  } catch {
    throw new Error(`Invalid JSON in layout file: ${layoutPath}`);
  }
}

/**
 * Apply layout to page view recursively
 */
function applyLayout(
  pageView: unknown,
  layoutView: unknown
): unknown {
  // Find and replace the slot in layout with page content
  return replaceSlot(layoutView, pageView);
}

/**
 * Normalize props values to expression format
 * Converts raw values like { class: 'foo' } to { class: { expr: 'lit', value: 'foo' } }
 */
function normalizeProps(props: unknown): Record<string, unknown> {
  if (!props || typeof props !== 'object') {
    return {};
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (value && typeof value === 'object' && 'expr' in value) {
      // Already in expression format
      normalized[key] = value;
    } else if (value !== undefined && value !== null) {
      // Convert to literal expression
      normalized[key] = { expr: 'lit', value };
    }
  }
  return normalized;
}

/**
 * Normalize expression format
 * Converts legacy formats to standard format:
 * - { expr: 'param', name: 'id' } -> { expr: 'route', source: 'param', name: 'id' }
 */
function normalizeExpression(expr: unknown): unknown {
  if (!expr || typeof expr !== 'object') {
    return expr;
  }

  const exprObj = expr as Record<string, unknown>;

  // Convert param expression to route expression
  if (exprObj['expr'] === 'param' && typeof exprObj['name'] === 'string') {
    return {
      expr: 'route',
      source: 'param',
      name: exprObj['name'],
    };
  }

  return expr;
}

/**
 * Normalize all nodes in a view tree to use expression format for props
 */
function normalizeViewNode(node: unknown): unknown {
  if (!node || typeof node !== 'object') {
    return node;
  }

  const nodeObj = node as Record<string, unknown>;

  // Normalize props if present
  if (nodeObj['props']) {
    nodeObj['props'] = normalizeProps(nodeObj['props']);
  }

  // Normalize text node value expression
  if (nodeObj['kind'] === 'text' && nodeObj['value']) {
    nodeObj['value'] = normalizeExpression(nodeObj['value']);
  }

  // Process children recursively
  if (Array.isArray(nodeObj['children'])) {
    nodeObj['children'] = nodeObj['children'].map((child) => normalizeViewNode(child));
  }

  return nodeObj;
}

/**
 * Replace slot node with content recursively
 */
function replaceSlot(node: unknown, content: unknown): unknown {
  if (!node || typeof node !== 'object') {
    return node;
  }

  const nodeObj = node as Record<string, unknown>;

  // Check if this is a slot node
  if (nodeObj['kind'] === 'slot') {
    return content;
  }

  // If node has children, process them recursively
  if (Array.isArray(nodeObj['children'])) {
    return {
      ...nodeObj,
      children: nodeObj['children'].map((child) => replaceSlot(child, content)),
    };
  }

  return node;
}

/**
 * Recursively process layouts (handle nested layouts)
 */
async function processLayouts(
  pageInfo: PageInfo,
  layoutsDir: string | undefined
): Promise<PageInfo> {
  const layoutName = pageInfo.page.route?.layout;

  if (!layoutName || !layoutsDir) {
    return pageInfo;
  }

  const layout = await loadLayout(layoutName, layoutsDir);

  // Normalize layout view (convert raw props to expression format)
  const normalizedLayoutView = normalizeViewNode(structuredClone(layout.view));

  // Apply layout to page view
  const wrappedView = applyLayout(pageInfo.page.view, normalizedLayoutView);

  // Create updated route without layout property
  let updatedRoute: typeof pageInfo.page.route;
  if (pageInfo.page.route) {
    const { layout: _layout, ...routeWithoutLayout } = pageInfo.page.route;
    updatedRoute = routeWithoutLayout;
  }

  // Create updated page info
  let updatedPageInfo: PageInfo = {
    ...pageInfo,
    page: {
      ...pageInfo.page,
      view: wrappedView as typeof pageInfo.page.view,
      route: updatedRoute,
    },
  };

  // If layout has a parent layout, process it recursively
  if (layout.layout) {
    const parentLayout = await loadLayout(layout.layout, layoutsDir);
    const normalizedParentLayoutView = normalizeViewNode(structuredClone(parentLayout.view));
    const doubleWrappedView = applyLayout(updatedPageInfo.page.view, normalizedParentLayoutView);

    updatedPageInfo = {
      ...updatedPageInfo,
      page: {
        ...updatedPageInfo.page,
        view: doubleWrappedView as typeof pageInfo.page.view,
      },
    };
  }

  return updatedPageInfo;
}

/**
 * Render a page to HTML
 */
async function renderPageToHtml(
  program: CompiledProgram,
  params: Record<string, string>,
  runtimePath?: string
): Promise<string> {
  // Normalize the view to handle legacy expression formats
  const normalizedProgram: CompiledProgram = {
    ...program,
    view: normalizeViewNode(structuredClone(program.view)) as CompiledProgram['view'],
  };

  const ctx: SSRContext = {
    url: '/',
    params,
    query: new URLSearchParams(),
  };

  const content = await renderPage(normalizedProgram, ctx);

  // Create route context for hydration
  const routeContext = {
    params,
    query: {} as Record<string, string>,
    path: '/',
  };

  const hydrationScript = generateHydrationScript(normalizedProgram, undefined, routeContext);
  return wrapHtml(content, hydrationScript, undefined, runtimePath ? { runtimePath } : undefined);
}

/**
 * Copy public directory contents to output directory
 */
async function copyPublicDir(
  publicDir: string,
  outDir: string,
  generatedFiles: Set<string>
): Promise<void> {
  if (!existsSync(publicDir)) {
    return;
  }

  // Recursively copy files
  await copyDirRecursive(publicDir, outDir, generatedFiles);
}

/**
 * Recursively copy directory contents
 */
async function copyDirRecursive(
  srcDir: string,
  destDir: string,
  skipFiles: Set<string>
): Promise<void> {
  const entries = await readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyDirRecursive(srcPath, destPath, skipFiles);
    } else {
      // Skip if this file would overwrite a generated HTML file
      if (skipFiles.has(destPath)) {
        continue;
      }

      await mkdir(dirname(destPath), { recursive: true });
      await cp(srcPath, destPath);
    }
  }
}

/**
 * Validate JSON page structure
 */
function validateJsonPage(content: string, filePath: string): JsonPage {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  const page = parsed as Record<string, unknown>;

  if (!page['view']) {
    throw new Error(`Missing required field "view" in ${filePath}`);
  }

  return page as unknown as JsonPage;
}

/**
 * Build application for production
 *
 * @param options - Build options
 * @returns BuildResult with outDir, discovered routes, and generated files
 */
export async function build(options?: BuildOptions): Promise<BuildResult> {
  const outDir = options?.outDir ?? 'dist';
  const routesDir = options?.routesDir ?? 'src/routes';
  const publicDir = options?.publicDir;
  const layoutsDir = options?.layoutsDir;

  const generatedFiles: string[] = [];

  // Create output directory
  await mkdir(outDir, { recursive: true });

  // Scan for route files
  let scannedRoutes: ScannedRoute[] = [];
  try {
    scannedRoutes = await scanRoutes(routesDir);
  } catch {
    // If routesDir does not exist, return empty result
    return {
      outDir,
      routes: [],
      generatedFiles: [],
    };
  }

  // Collect all routes (for backward compatibility)
  const routes: string[] = scannedRoutes.map((r) => r.pattern);

  // Filter to only JSON page files for HTML generation
  const jsonPages = scannedRoutes.filter(
    (route) => route.type === 'page' && route.file.endsWith('.json')
  );

  // Skip bundling if no pages to generate
  if (jsonPages.length === 0) {
    // Copy public directory if exists
    if (publicDir) {
      const generatedSet = new Set(generatedFiles);
      await copyPublicDir(publicDir, outDir, generatedSet);
    }
    return {
      outDir,
      routes,
      generatedFiles: [],
    };
  }

  // Bundle runtime for production (only if there are pages to generate)
  const runtimePath = await bundleRuntime({ outDir });

  // Process each JSON page
  for (const route of jsonPages) {
    const relPath = relative(routesDir, route.file);

    // Read and validate JSON
    const content = readFileSync(route.file, 'utf-8');
    const page = validateJsonPage(content, route.file);

    // Check if this is a dynamic route
    if (isDynamicRoute(route.pattern)) {
      // Load getStaticPaths
      const staticPaths = await loadGetStaticPaths(route.file);

      if (!staticPaths) {
        // Skip dynamic routes without getStaticPaths
        continue;
      }

      // Validate getStaticPaths result
      if (!staticPaths.paths || !Array.isArray(staticPaths.paths)) {
        throw new Error(`Invalid getStaticPaths format in ${route.file}`);
      }

      // Generate page for each path
      for (const pathEntry of staticPaths.paths) {
        const params = pathEntry.params;
        const outputPath = paramsToOutputPath(route.pattern, params, outDir);

        // Create page loader for this page
        const loader = new JsonPageLoader(routesDir);

        // Load page info
        let pageInfo = await loader.loadPage(relPath);

        // Apply layouts if configured
        if (layoutsDir) {
          pageInfo = await processLayouts(pageInfo, layoutsDir);
        }

        // Convert to compiled program
        const program = await convertToCompiledProgram(pageInfo);

        // Render to HTML
        const html = await renderPageToHtml(program, params, runtimePath);

        // Write file
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html, 'utf-8');

        generatedFiles.push(outputPath);

        // Build route path from params
        let routePath = route.pattern;
        for (const [key, value] of Object.entries(params)) {
          routePath = routePath.replace(`:${key}`, value);
          routePath = routePath.replace('*', value);
        }
        routes.push(routePath);
      }
    } else {
      // Static page - generate single HTML file
      const outputPath = getOutputPath(relPath, outDir);

      // Create page loader
      const loader = new JsonPageLoader(routesDir);

      // Load page info
      let pageInfo = await loader.loadPage(relPath);

      // Apply layouts if configured
      if (layoutsDir) {
        pageInfo = await processLayouts(pageInfo, layoutsDir);
      }

      // Convert to compiled program
      const program = await convertToCompiledProgram(pageInfo);

      // Render to HTML
      const html = await renderPageToHtml(program, {}, runtimePath);

      // Write file
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, html, 'utf-8');

      generatedFiles.push(outputPath);
      // Note: route.pattern is already in routes from initial scan
    }
  }

  // Copy public directory (after generating HTML to avoid overwriting)
  if (publicDir) {
    const generatedSet = new Set(generatedFiles);
    await copyPublicDir(publicDir, outDir, generatedSet);
  }

  return {
    outDir,
    routes,
    generatedFiles,
  };
}
