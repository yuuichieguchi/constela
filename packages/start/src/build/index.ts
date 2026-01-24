import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile, cp, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, basename, isAbsolute, resolve } from 'node:path';
import { resolveImports } from '../utils/import-resolver.js';
import type { CompiledProgram } from '@constela/compiler';
import { type ViewNode, isCookieInitialExpr } from '@constela/core';
import type { BuildOptions, ScannedRoute } from '../types.js';
import { scanRoutes, filePathToPattern } from '../router/file-router.js';
import {
  JsonPageLoader,
  convertToCompiledProgram,
  generateStaticPathsFromPage,
  type PageInfo,
  type JsonPage,
  type StaticPathResult,
  type CompiledWidget,
} from '../json-page-loader.js';
import {
  renderPage,
  wrapHtml,
  generateHydrationScript,
  generateMetaTags,
  type SSRContext,
  type WrapHtmlOptions,
  type WidgetConfig,
} from '../runtime/entry-server.js';
import { bundleRuntime, bundleCSS } from './bundler.js';
import { loadConfig } from '../config/config-loader.js';

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
  state?: Record<string, unknown>;
  actions?: unknown[];
  lifecycle?: {
    onMount?: string;
    onUnmount?: string;
  };
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
  const withoutExt = filePath.replace(/\.(constela\.json|json|ts|tsx|js|jsx)$/, '');

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
  const baseName = pageFile.endsWith('.constela.json')
    ? basename(pageFile, '.constela.json')
    : basename(pageFile, '.json');
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
  layoutView: unknown,
  namedSlots?: Record<string, unknown>
): unknown {
  // Find and replace the slot in layout with page content
  return replaceSlot(layoutView, pageView, namedSlots);
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

  // Handle single object (when pathEntry.data has been bound)
  if (dataSource && typeof dataSource === 'object' && !Array.isArray(dataSource)) {
    if ('content' in dataSource) {
      return { 'mdx-content': (dataSource as { content: ViewNode }).content };
    }
    return undefined;
  }

  // Handle array (original behavior - find by slug)
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
 * Check if a value is an event handler in { event, action } format
 */
function isEventHandler(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'event' in value &&
    typeof (value as { event: unknown }).event === 'string' &&
    'action' in value &&
    typeof (value as { action: unknown }).action === 'string'
  );
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
    } else if (isEventHandler(value)) {
      // Event handlers should be kept as-is (not wrapped in lit expression)
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
function replaceSlot(
  node: unknown,
  content: unknown,
  namedSlots?: Record<string, unknown>
): unknown {
  if (!node || typeof node !== 'object') {
    return node;
  }

  const nodeObj = node as Record<string, unknown>;

  // Check if this is a slot node
  if (nodeObj['kind'] === 'slot') {
    const slotName = nodeObj['name'] as string | undefined;

    // Named slot - check if we have content for it
    if (slotName && namedSlots && slotName in namedSlots) {
      return namedSlots[slotName];
    }

    // Default slot (no name or name === 'default') - use main content
    if (!slotName || slotName === 'default') {
      return content;
    }

    // Named slot with no matching content - keep as-is (fallback)
    return node;
  }

  // If node has children, process them recursively
  if (Array.isArray(nodeObj['children'])) {
    return {
      ...nodeObj,
      children: nodeObj['children'].map((child) => replaceSlot(child, content, namedSlots)),
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
  layoutsDir: string | undefined,
  routeParams: Record<string, string> = {}
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

  // Merge state from layouts (outermost first, so inner layouts and page take precedence)
  let mergedState: Record<string, unknown> = {};
  for (let i = layoutChain.length - 1; i >= 0; i--) {
    const layout = layoutChain[i];
    if (layout?.state) {
      mergedState = {
        ...mergedState,
        ...layout.state,
      };
    }
  }
  // Page state takes precedence over layout state
  if (pageInfo.page.state) {
    mergedState = {
      ...mergedState,
      ...pageInfo.page.state,
    };
  }

  // Merge actions from layouts (outermost first, so inner layouts and page take precedence)
  // Actions are arrays, so we need to merge by name
  let mergedActionsMap: Map<string, unknown> = new Map();
  for (let i = layoutChain.length - 1; i >= 0; i--) {
    const layout = layoutChain[i];
    if (layout?.actions && Array.isArray(layout.actions)) {
      for (const action of layout.actions) {
        const actionDef = action as { name: string };
        // Inner layouts override outer layouts
        mergedActionsMap.set(actionDef.name, action);
      }
    }
  }
  // Page actions take precedence over layout actions
  if (pageInfo.page.actions && Array.isArray(pageInfo.page.actions)) {
    for (const action of pageInfo.page.actions) {
      const actionDef = action as { name: string };
      mergedActionsMap.set(actionDef.name, action);
    }
  }
  const mergedActions: unknown[] = Array.from(mergedActionsMap.values());

  // Merge lifecycle from layouts (outermost first, so inner layouts and page take precedence)
  let mergedLifecycle: { onMount?: string; onUnmount?: string } | undefined;
  for (let i = layoutChain.length - 1; i >= 0; i--) {
    const layout = layoutChain[i];
    if (layout?.lifecycle) {
      mergedLifecycle = {
        ...mergedLifecycle,
        ...layout.lifecycle,
      };
    }
  }
  // Page lifecycle takes precedence over layout lifecycle
  if (pageInfo.page.lifecycle) {
    mergedLifecycle = {
      ...mergedLifecycle,
      ...pageInfo.page.lifecycle,
    };
  }

  // Extract MDX content slots from loadedData
  // Try to find MDX content in any data source that has content with slug
  let namedSlots: Record<string, unknown> | undefined;

  // Infer slug from route path if not provided in routeParams
  // e.g., "/docs/intro" -> "intro", "/test" -> "test"
  let effectiveRouteParams = routeParams;
  if (!routeParams['slug'] && pageInfo.page.route?.path) {
    const pathSegments = pageInfo.page.route.path.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment && !lastSegment.startsWith(':')) {
      effectiveRouteParams = { ...routeParams, slug: lastSegment };
    }
  }

  // Check loadedData for MDX content
  if (pageInfo.loadedData && Object.keys(pageInfo.loadedData).length > 0) {
    for (const dataSourceName of Object.keys(pageInfo.loadedData)) {
      const slots = extractMdxContentSlot(pageInfo.loadedData, dataSourceName, effectiveRouteParams);
      if (slots) {
        namedSlots = namedSlots ? { ...namedSlots, ...slots } : slots;
        break; // Use first matching data source
      }
    }
  }

  // Also check resolvedImports for MDX content (when data is loaded via imports)
  if (!namedSlots && pageInfo.resolvedImports && Object.keys(pageInfo.resolvedImports).length > 0) {
    for (const importName of Object.keys(pageInfo.resolvedImports)) {
      const slots = extractMdxContentSlot(
        pageInfo.resolvedImports as Record<string, unknown>,
        importName,
        effectiveRouteParams
      );
      if (slots) {
        namedSlots = slots;
        break;
      }
    }
  }

  // Also check page.importData for MDX content (when data is embedded directly in page JSON)
  const pageWithImportData = pageInfo.page as unknown as { importData?: Record<string, unknown> };
  if (!namedSlots && pageWithImportData.importData && Object.keys(pageWithImportData.importData).length > 0) {
    for (const importName of Object.keys(pageWithImportData.importData)) {
      const slots = extractMdxContentSlot(
        pageWithImportData.importData,
        importName,
        effectiveRouteParams
      );
      if (slots) {
        namedSlots = slots;
        break;
      }
    }
  }

  // Apply layouts from innermost to outermost
  let currentView: typeof pageInfo.page.view = pageInfo.page.view;
  for (const layout of layoutChain) {
    const normalizedLayoutView = normalizeViewNode(structuredClone(layout.view));
    currentView = applyLayout(currentView, normalizedLayoutView, namedSlots) as typeof pageInfo.page.view;
  }

  // Replace any remaining named slots in the final view (e.g., mdx-content in page's view)
  if (namedSlots && Object.keys(namedSlots).length > 0) {
    currentView = replaceSlot(currentView, currentView, namedSlots) as typeof pageInfo.page.view;
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

  // Create updated page info with merged state, actions, and lifecycle
  const updatedPageInfo: PageInfo = {
    ...pageInfo,
    resolvedImports: mergedImports,
    page: {
      ...pageInfo.page,
      view: currentView as typeof pageInfo.page.view,
      route: updatedRoute,
      state: Object.keys(mergedState).length > 0 ? mergedState : undefined,
      actions: mergedActions.length > 0 ? mergedActions : undefined,
      lifecycle: mergedLifecycle,
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
  routePath: string,
  runtimePath?: string,
  cssPath?: string,
  externalImports?: Record<string, string>,
  widgets?: CompiledWidget[],
  lang?: string
): Promise<string> {
  // Normalize the view to handle legacy expression formats
  const normalizedProgram: CompiledProgram = {
    ...program,
    view: normalizeViewNode(structuredClone(program.view)) as CompiledProgram['view'],
  };

  const ctx: SSRContext = {
    url: routePath,
    params,
    query: new URLSearchParams(),
  };

  const content = await renderPage(normalizedProgram, ctx);

  // Create route context for hydration
  const routeContext = {
    params,
    query: {} as Record<string, string>,
    path: routePath,
  };

  // Generate meta tags from route definition
  const metaTags = generateMetaTags(normalizedProgram.route, {
    params,
    query: {},
    path: routePath,
  });

  // Generate CSS link tag if cssPath is provided
  const cssLinkTag = cssPath ? `<link rel="stylesheet" href="${cssPath}">` : undefined;

  // Combine meta tags with CSS link tag
  const head = [metaTags, cssLinkTag].filter(Boolean).join('\n') || undefined;

  // Convert CompiledWidget[] to WidgetConfig[] for generateHydrationScript
  const widgetConfigs: WidgetConfig[] | undefined = widgets?.map(w => ({ id: w.id, program: w.program }));
  const hydrationScript = generateHydrationScript(normalizedProgram, widgetConfigs, routeContext);

  // Build wrapHtml options
  const wrapOptions: WrapHtmlOptions = {};
  if (runtimePath) {
    wrapOptions.runtimePath = runtimePath;
  }
  if (externalImports && Object.keys(externalImports).length > 0) {
    wrapOptions.importMap = externalImports;
  }
  if (lang) {
    wrapOptions.lang = lang;
  }

  // Detect theme state from program (handle both string and cookie expression)
  const themeState = program.state?.['theme'];
  if (themeState) {
    let defaultTheme: 'dark' | 'light' | undefined;
    if (isCookieInitialExpr(themeState.initial)) {
      // For SSG, use the default value from cookie expression
      defaultTheme = themeState.initial.default as 'dark' | 'light';
    } else if (typeof themeState.initial === 'string') {
      defaultTheme = themeState.initial as 'dark' | 'light';
    }
    if (defaultTheme) {
      wrapOptions.defaultTheme = defaultTheme;
      wrapOptions.themeStorageKey = 'theme';
    }
  }

  return wrapHtml(
    content,
    hydrationScript,
    head,
    Object.keys(wrapOptions).length > 0 ? wrapOptions : undefined
  );
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
    (route) => route.type === 'page' && (route.file.endsWith('.json') || route.file.endsWith('.constela.json'))
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

  // Load config from constela.config.json in project root
  // Note: We use projectRoot (derived from routesDir) instead of process.cwd()
  // This ensures tests with temp directories can provide their own config
  const config = await loadConfig(projectRoot);

  // Merge seo.lang from config with options (options takes precedence)
  const seoLang = options?.seo?.lang ?? config.seo?.lang;

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

      // Generate page for each path
      for (const pathEntry of staticPathsResult) {
        const params = pathEntry.params;
        const outputPath = paramsToOutputPath(route.pattern, params, outDir);

        // Build route path from params (needed for canonical URLs in meta tags)
        let routePath = route.pattern;
        for (const [key, value] of Object.entries(params)) {
          routePath = routePath.replace(`:${key}`, value);
          routePath = routePath.replace('*', value);
        }

        // Bind current item data to the data source name BEFORE processLayouts
        // This allows extractMdxContentSlot to get the current item's content
        // and { "expr": "data", ... } to resolve to the current item
        let boundPageInfo = pageInfo;
        if (pathEntry.data && pageInfo.page.getStaticPaths?.source) {
          const source = pageInfo.page.getStaticPaths.source;

          // Only bind pathEntry.data for string sources (direct data references)
          // Expression sources (like { expr: "import", name: "examples", path: "examples" })
          // should NOT be bound because they may access sibling properties via index expressions
          if (typeof source === 'string') {
            boundPageInfo = {
              ...pageInfo,
              loadedData: {
                ...pageInfo.loadedData,
                [source]: pathEntry.data,  // Replace array with current item
              },
            };
          }
        }

        // Apply layouts if configured (inside loop to extract MDX content per params)
        let processedPageInfo = boundPageInfo;
        if (layoutsDir) {
          processedPageInfo = await processLayouts(boundPageInfo, layoutsDir, params);
        }

        // Convert to compiled program
        const program = await convertToCompiledProgram(processedPageInfo);

        // Render to HTML
        const html = await renderPageToHtml(program, params, routePath, runtimePath, cssPath, processedPageInfo.page.externalImports, processedPageInfo.widgets, seoLang);

        // Write file
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html, 'utf-8');

        generatedFiles.push(outputPath);

        /**
         * Generate parent directory index.html for cleaner URLs.
         *
         * When slug='index', both paths are generated:
         * - /docs/index/index.html (canonical path)
         * - /docs/index.html (parent directory, for /docs URL)
         *
         * This enables clean URLs: /docs serves the same content as /docs/index
         */
        const slugValue = params['slug'];
        if (slugValue && (slugValue === 'index' || slugValue.endsWith('/index'))) {
          // Calculate parent directory path
          // For slug='index': /docs/index/index.html -> /docs/index.html
          // For slug='guides/index': /docs/guides/index/index.html -> /docs/guides/index.html
          const parentOutputPath = join(dirname(dirname(outputPath)), 'index.html');

          // Only write if not already generated (don't overwrite static pages)
          if (!generatedFiles.includes(parentOutputPath)) {
            await mkdir(dirname(parentOutputPath), { recursive: true });
            await writeFile(parentOutputPath, html, 'utf-8');
            generatedFiles.push(parentOutputPath);
          }
        }

        routes.push(routePath);
      }
    } else {
      // Static page - generate single HTML file
      // Create page loader with routesDir for consistent pattern resolution
      const loader = new JsonPageLoader(projectRoot, { routesDir: absoluteRoutesDir });

      // Load page info
      let pageInfo = await loader.loadPage(relPathFromProjectRoot);

      // Determine output path and route path for canonical URLs
      let outputPath: string;
      const routePath = pageInfo.page.route?.path ?? route.pattern;
      if (pageInfo.page.route?.path) {
        // Use route.path to determine output directory
        const relativePath = routePath.startsWith('/') ? routePath.slice(1) : routePath;
        if (relativePath === '' || relativePath === '/') {
          outputPath = join(outDir, 'index.html');
        } else {
          outputPath = join(outDir, relativePath, 'index.html');
        }
      } else {
        outputPath = getOutputPath(relPathFromRoutesDir, outDir);
      }

      // Apply layouts if configured
      if (layoutsDir) {
        pageInfo = await processLayouts(pageInfo, layoutsDir, {});
      }

      // Convert to compiled program
      const program = await convertToCompiledProgram(pageInfo);

      // Render to HTML
      const html = await renderPageToHtml(program, {}, routePath, runtimePath, cssPath, pageInfo.page.externalImports, pageInfo.widgets, seoLang);

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

// Export for testing
export { normalizeProps };
