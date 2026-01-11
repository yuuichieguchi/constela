import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile, cp, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, basename, isAbsolute, resolve } from 'node:path';
import { resolveImports } from '../utils/import-resolver.js';
import type { CompiledProgram } from '@constela/compiler';
import type { BuildOptions, ScannedRoute } from '../types.js';
import { scanRoutes, filePathToPattern } from '../router/file-router.js';
import {
  JsonPageLoader,
  convertToCompiledProgram,
  generateStaticPathsFromPage,
  type PageInfo,
  type JsonPage,
  type StaticPathResult,
} from '../json-page-loader.js';
import {
  renderPage,
  wrapHtml,
  generateHydrationScript,
  type SSRContext,
} from '../runtime/entry-server.js';
import { bundleRuntime, bundleCSS } from './bundler.js';

const DEFAULT_PUBLIC_DIR = 'public';

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
 * Layout definition with resolved imports
 */
interface LoadedLayoutDefinition extends LayoutDefinition {
  imports?: Record<string, string>;
  importData?: Record<string, unknown>;
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
 * Load a layout definition from file with resolved imports
 */
async function loadLayout(
  layoutName: string,
  layoutsDir: string
): Promise<LoadedLayoutDefinition> {
  const layoutPath = join(layoutsDir, `${layoutName}.json`);

  if (!existsSync(layoutPath)) {
    throw new Error(`Layout "${layoutName}" not found at ${layoutPath}`);
  }

  try {
    const content = readFileSync(layoutPath, 'utf-8');
    const parsed = JSON.parse(content) as LoadedLayoutDefinition;

    // Resolve imports if defined (same as layout/resolver.ts)
    if (parsed.imports && Object.keys(parsed.imports).length > 0) {
      const layoutDir = dirname(layoutPath);
      const resolvedImports = await resolveImports(layoutDir, parsed.imports);
      return { ...parsed, importData: resolvedImports };
    }

    return parsed;
  } catch (error) {
    // Re-throw import resolution errors with context
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
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
 * Substitute param expressions with layout params in an expression
 */
function substituteLayoutParamsInExpr(
  expr: unknown,
  layoutParams: Record<string, unknown>
): unknown {
  if (!expr || typeof expr !== 'object') {
    return expr;
  }

  const exprObj = expr as Record<string, unknown>;

  // If this is a param expression, substitute it
  if (exprObj['expr'] === 'param' && typeof exprObj['name'] === 'string') {
    const paramName = exprObj['name'];
    const paramValue = layoutParams[paramName];
    if (paramValue !== undefined) {
      // If param has a path, wrap the value in a get expression
      if (typeof exprObj['path'] === 'string') {
        return {
          expr: 'get',
          base: paramValue,
          path: exprObj['path'],
        };
      }
      return paramValue;
    }
  }

  // Recursively substitute in nested expressions
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(exprObj)) {
    if (key === 'expr') {
      result[key] = value;
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        result[key] = value.map((item) => substituteLayoutParamsInExpr(item, layoutParams));
      } else {
        result[key] = substituteLayoutParamsInExpr(value, layoutParams);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Substitute param expressions with layout params in a view node
 */
function substituteLayoutParamsInNode(
  node: unknown,
  layoutParams: Record<string, unknown>
): unknown {
  if (!node || typeof node !== 'object') {
    return node;
  }

  const nodeObj = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(nodeObj)) {
    if (key === 'children' && Array.isArray(value)) {
      result[key] = value.map((child) => substituteLayoutParamsInNode(child, layoutParams));
    } else if (key === 'props' && value && typeof value === 'object') {
      const props: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        props[propKey] = substituteLayoutParamsInExpr(propValue, layoutParams);
      }
      result[key] = props;
    } else if (key === 'value' && value && typeof value === 'object') {
      // Handle text node value or other expression values
      result[key] = substituteLayoutParamsInExpr(value, layoutParams);
    } else if (key === 'items' && value && typeof value === 'object') {
      // Handle each node items
      result[key] = substituteLayoutParamsInExpr(value, layoutParams);
    } else if (key === 'condition' && value && typeof value === 'object') {
      // Handle if node condition
      result[key] = substituteLayoutParamsInExpr(value, layoutParams);
    } else if (key === 'content' && value && typeof value === 'object') {
      // Handle markdown node content
      result[key] = substituteLayoutParamsInExpr(value, layoutParams);
    } else if (key === 'then' && value && typeof value === 'object') {
      result[key] = substituteLayoutParamsInNode(value, layoutParams);
    } else if (key === 'else' && value && typeof value === 'object') {
      result[key] = substituteLayoutParamsInNode(value, layoutParams);
    } else if (key === 'body' && value && typeof value === 'object') {
      result[key] = substituteLayoutParamsInNode(value, layoutParams);
    } else {
      result[key] = value;
    }
  }

  return result;
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
 * Recursively collect layout chain from innermost to outermost
 * Returns layouts in order: [innermost, ..., outermost]
 */
async function collectLayoutChain(
  layoutName: string,
  layoutsDir: string,
  visited: Set<string> = new Set()
): Promise<LoadedLayoutDefinition[]> {
  // Prevent infinite loops from circular layout references
  if (visited.has(layoutName)) {
    throw new Error(`Circular layout reference detected: ${layoutName}`);
  }
  visited.add(layoutName);

  const layout = await loadLayout(layoutName, layoutsDir);
  const chain: LoadedLayoutDefinition[] = [layout];

  // Recursively collect parent layouts
  if (layout.layout) {
    const parentChain = await collectLayoutChain(layout.layout, layoutsDir, visited);
    chain.push(...parentChain);
  }

  return chain;
}

/**
 * Recursively process layouts (handle nested layouts of any depth)
 */
async function processLayouts(
  pageInfo: PageInfo,
  layoutsDir: string | undefined
): Promise<PageInfo> {
  const layoutName = pageInfo.page.route?.layout;

  if (!layoutName || !layoutsDir) {
    return pageInfo;
  }

  // Collect all layouts in chain (innermost to outermost)
  const layoutChain = await collectLayoutChain(layoutName, layoutsDir);

  // Start with page's resolved imports
  let mergedImports = { ...pageInfo.resolvedImports };

  // Merge importData from all layouts (outermost first, so inner layouts can override)
  for (let i = layoutChain.length - 1; i >= 0; i--) {
    const layout = layoutChain[i];
    if (layout?.importData) {
      mergedImports = {
        ...layout.importData,
        ...mergedImports, // Inner layout/page imports take precedence
      };
    }
  }

  // Apply layouts from innermost to outermost
  let currentView: typeof pageInfo.page.view = pageInfo.page.view;
  for (const layout of layoutChain) {
    const normalizedLayoutView = normalizeViewNode(structuredClone(layout.view));
    currentView = applyLayout(currentView, normalizedLayoutView) as typeof pageInfo.page.view;
  }

  // Substitute layoutParams in the final wrapped view
  const layoutParams = pageInfo.page.route?.layoutParams;
  if (layoutParams && Object.keys(layoutParams).length > 0) {
    currentView = substituteLayoutParamsInNode(currentView, layoutParams) as typeof pageInfo.page.view;
  }

  // Create updated route without layout property
  let updatedRoute: typeof pageInfo.page.route;
  if (pageInfo.page.route) {
    const { layout: _layout, ...routeWithoutLayout } = pageInfo.page.route;
    updatedRoute = routeWithoutLayout;
  }

  // Create updated page info
  const updatedPageInfo: PageInfo = {
    ...pageInfo,
    resolvedImports: mergedImports,
    page: {
      ...pageInfo.page,
      view: currentView as typeof pageInfo.page.view,
      route: updatedRoute,
    },
  };

  return updatedPageInfo;
}

/**
 * Render a page to HTML
 */
async function renderPageToHtml(
  program: CompiledProgram,
  params: Record<string, string>,
  runtimePath?: string,
  cssPath?: string
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

  // Generate CSS link tag if cssPath is provided
  const cssLinkTag = cssPath ? `<link rel="stylesheet" href="${cssPath}">` : undefined;

  const hydrationScript = generateHydrationScript(normalizedProgram, undefined, routeContext);
  return wrapHtml(content, hydrationScript, cssLinkTag, runtimePath ? { runtimePath } : undefined);
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
  const publicDir = options?.publicDir ?? DEFAULT_PUBLIC_DIR;
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

  // Bundle CSS if provided
  let cssPath: string | undefined;
  if (options?.css) {
    cssPath = await bundleCSS({
      outDir,
      css: options.css,
      ...(options.cssContent ? { content: options.cssContent } : {}),
    });
  }

  // Resolve routesDir to absolute path
  // This is needed to correctly calculate relative paths when routesDir is absolute
  // (e.g., in tests where routesDir points to a temp directory)
  const absoluteRoutesDir = isAbsolute(routesDir) ? routesDir : resolve(routesDir);

  // Determine the project root from routesDir
  // If routesDir is like "/tmp/.../src/routes", project root is "/tmp/..."
  // We walk up from routesDir to find a reasonable project root
  const projectRoot = dirname(dirname(absoluteRoutesDir));

  // Process each JSON page
  for (const route of jsonPages) {
    // Calculate relative paths
    const relPathFromRoutesDir = relative(absoluteRoutesDir, route.file);
    const relPathFromProjectRoot = relative(projectRoot, route.file);

    // Read and validate JSON
    const content = readFileSync(route.file, 'utf-8');
    const page = validateJsonPage(content, route.file);

    // Check if this is a dynamic route
    if (isDynamicRoute(route.pattern)) {
      // Load page once outside the loop
      // Pass routesDir so that relative patterns in data sources are resolved from routes directory
      // This ensures patterns like "../../content/" work consistently regardless of page nesting depth
      const loader = new JsonPageLoader(projectRoot, { routesDir: absoluteRoutesDir });
      let pageInfo = await loader.loadPage(relPathFromProjectRoot);

      // Check for inline getStaticPaths first
      let staticPathsResult: StaticPathResult[] | null = null;

      if (pageInfo.page.getStaticPaths) {
        // Use inline getStaticPaths from JSON
        staticPathsResult = await generateStaticPathsFromPage(
          pageInfo.page,
          pageInfo.loadedData,
          pageInfo.resolvedImports
        );
      } else {
        // Fall back to .paths.ts file
        const externalPaths = await loadGetStaticPaths(route.file);
        if (externalPaths) {
          staticPathsResult = externalPaths.paths.map((p) => ({ params: p.params }));
        }
      }

      if (!staticPathsResult || staticPathsResult.length === 0) {
        // Skip dynamic routes without getStaticPaths
        continue;
      }

      // Apply layouts if configured (once, outside loop)
      if (layoutsDir) {
        pageInfo = await processLayouts(pageInfo, layoutsDir);
      }

      // Generate page for each path
      for (const pathEntry of staticPathsResult) {
        const params = pathEntry.params;
        const outputPath = paramsToOutputPath(route.pattern, params, outDir);

        // Convert to compiled program
        const program = await convertToCompiledProgram(pageInfo);

        // Render to HTML
        const html = await renderPageToHtml(program, params, runtimePath, cssPath);

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
      const outputPath = getOutputPath(relPathFromRoutesDir, outDir);

      // Create page loader with routesDir for consistent pattern resolution
      const loader = new JsonPageLoader(projectRoot, { routesDir: absoluteRoutesDir });

      // Load page info
      let pageInfo = await loader.loadPage(relPathFromProjectRoot);

      // Apply layouts if configured
      if (layoutsDir) {
        pageInfo = await processLayouts(pageInfo, layoutsDir);
      }

      // Convert to compiled program
      const program = await convertToCompiledProgram(pageInfo);

      // Render to HTML
      const html = await renderPageToHtml(program, {}, runtimePath, cssPath);

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
