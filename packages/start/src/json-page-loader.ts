/**
 * JSON Page Loader for Constela Start
 *
 * This module provides utilities for loading and processing JSON-based page definitions:
 * - Loading JSON page files
 * - Resolving imports from external JSON files
 * - Loading data sources using DataLoader
 * - Generating static paths from page config
 * - Converting pages to CompiledProgram
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { CompiledProgram, CompiledNode, CompiledAction } from '@constela/compiler';
import type { DataSource, StaticPathsDefinition, Expression, ViewNode, ActionDefinition } from '@constela/core';
import { DataLoader } from './data/loader.js';
import { resolveImports } from './utils/import-resolver.js';

// Re-export resolveImports for backward compatibility
export { resolveImports } from './utils/import-resolver.js';

// ==================== Type Definitions ====================

/**
 * Widget definition in JSON page
 */
export interface WidgetDefinition {
  /** The DOM element ID where the widget should be mounted */
  id: string;
  /** Path to the widget JSON file (relative to the page file) */
  src: string;
}

/**
 * Compiled widget with ID and program
 */
export interface CompiledWidget {
  id: string;
  program: CompiledProgram;
}

/**
 * JSON Page definition structure
 */
export interface JsonPage {
  version: string;
  route?: {
    path: string;
    layout?: string;
    layoutProps?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  } | undefined;
  imports?: Record<string, string> | undefined;
  data?: Record<string, DataSource> | undefined;
  getStaticPaths?: StaticPathsDefinition | undefined;
  state?: Record<string, unknown> | undefined;
  actions?: unknown[] | Record<string, unknown> | undefined;
  view: ViewNode;
  components?: Record<string, unknown> | undefined;
  widgets?: WidgetDefinition[] | undefined;
}

/**
 * Resolved page info returned by loadJsonPage
 */
export interface PageInfo {
  filePath: string;
  page: JsonPage;
  resolvedImports: Record<string, unknown>;
  loadedData: Record<string, unknown>;
  widgets: CompiledWidget[];
}

/**
 * Static path result
 */
export interface StaticPathResult {
  params: Record<string, string>;
  data?: unknown;
}

// ==================== Helper Functions ====================

/**
 * Validate that version is supported
 */
function validateVersion(version: unknown): asserts version is '1.0' {
  if (version !== '1.0') {
    throw new Error(`Unsupported version: ${version}. Only version "1.0" is supported.`);
  }
}

/**
 * Extract route params from a path pattern
 * e.g., "/users/:id/posts/:postId" -> ["id", "postId"]
 */
function extractRouteParams(path: string): string[] {
  const params: string[] = [];
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      // Remove trailing asterisk for catch-all params like :slug*
      const paramName = segment.slice(1).replace('*', '');
      params.push(paramName);
    }
  }
  return params;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return '';
    if (typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }

  return current !== undefined && current !== null ? String(current) : '';
}

/**
 * Evaluate a param expression to extract value from data item
 */
function evaluateParamExpression(expr: Expression, item: unknown): string {
  switch (expr.expr) {
    case 'lit':
      return String(expr.value);
    case 'var':
      if (expr.name === 'item') {
        if (expr.path) {
          return getNestedValue(item, expr.path);
        }
        return String(item);
      }
      return '';
    case 'get':
      if (expr.base.expr === 'var' && expr.base.name === 'item') {
        return getNestedValue(item, expr.path);
      }
      return '';
    default:
      return '';
  }
}

// ==================== Core Functions ====================

/**
 * Compile a widget JSON to CompiledProgram
 */
function compileWidget(widgetJson: { version?: string; state?: Record<string, unknown>; actions?: unknown[] | Record<string, unknown>; view: ViewNode }): CompiledProgram {
  return {
    version: widgetJson.version || '1.0',
    state: convertState(widgetJson.state),
    actions: convertActions(widgetJson.actions),
    view: convertViewNode(widgetJson.view),
  };
}

/**
 * Load and compile widgets for a page
 */
async function loadWidgets(
  pageDir: string,
  widgets: WidgetDefinition[] | undefined,
  baseDir: string
): Promise<CompiledWidget[]> {
  if (!widgets || widgets.length === 0) {
    return [];
  }

  const resolvedBase = resolve(baseDir);
  const compiledWidgets: CompiledWidget[] = [];

  for (const widget of widgets) {
    const widgetPath = join(pageDir, widget.src);
    const resolvedWidgetPath = resolve(widgetPath);

    // Path traversal protection
    if (!resolvedWidgetPath.startsWith(resolvedBase + '/') && resolvedWidgetPath !== resolvedBase) {
      throw new Error(`Invalid widget path "${widget.id}": path traversal detected`);
    }

    // Check if widget file exists
    if (!existsSync(widgetPath)) {
      throw new Error(`Widget file not found: ${resolvedWidgetPath}`);
    }

    // Read and parse widget JSON
    let widgetContent: string;
    try {
      widgetContent = readFileSync(widgetPath, 'utf-8');
    } catch {
      throw new Error(`Failed to read widget file "${widget.id}": ${resolvedWidgetPath}`);
    }

    let widgetJson: { version?: string; state?: Record<string, unknown>; actions?: unknown[] | Record<string, unknown>; view: ViewNode };
    try {
      widgetJson = JSON.parse(widgetContent);
    } catch {
      throw new Error(`Invalid JSON in widget file "${widget.id}": ${resolvedWidgetPath}`);
    }

    // Compile the widget
    const program = compileWidget(widgetJson);

    compiledWidgets.push({
      id: widget.id,
      program,
    });
  }

  return compiledWidgets;
}

/**
 * Normalize relative glob patterns in data sources from page directory to project root.
 *
 * @param projectRoot - The project root directory (absolute path)
 * @param pageDir - The directory containing the page file (absolute path)
 * @param dataSources - Data sources from the page definition
 * @returns Data sources with normalized patterns
 */
export function normalizeDataSourcePatterns(
  projectRoot: string,
  pageDir: string,
  dataSources: Record<string, DataSource> | undefined
): Record<string, DataSource> {
  if (!dataSources || Object.keys(dataSources).length === 0) {
    return {};
  }

  const resolvedProjectRoot = resolve(projectRoot);
  const result: Record<string, DataSource> = {};

  for (const [name, source] of Object.entries(dataSources)) {
    // Clone the source to avoid mutating the original
    const normalizedSource: DataSource = { ...source };

    // Normalize pattern for glob type data sources
    if (source.type === 'glob' && source.pattern) {
      if (source.pattern.startsWith('./') || source.pattern.startsWith('../')) {
        // Resolve the pattern relative to pageDir to get absolute path
        const absolutePath = resolve(pageDir, source.pattern);

        // Ensure no path traversal outside projectRoot
        if (!absolutePath.startsWith(resolvedProjectRoot + '/') && absolutePath !== resolvedProjectRoot) {
          throw new Error(
            `Invalid pattern "${source.pattern}": path traversal outside project root detected`
          );
        }

        // Make it relative to projectRoot
        normalizedSource.pattern = relative(resolvedProjectRoot, absolutePath);
      }
    }

    // Normalize path for file type data sources
    if (source.type === 'file' && source.path) {
      if (source.path.startsWith('./') || source.path.startsWith('../')) {
        // Resolve the path relative to pageDir to get absolute path
        const absolutePath = resolve(pageDir, source.path);

        // Ensure no path traversal outside projectRoot
        if (!absolutePath.startsWith(resolvedProjectRoot + '/') && absolutePath !== resolvedProjectRoot) {
          throw new Error(
            `Invalid path "${source.path}": path traversal outside project root detected`
          );
        }

        // Make it relative to projectRoot
        normalizedSource.path = relative(resolvedProjectRoot, absolutePath);
      }
    }

    result[name] = normalizedSource;
  }

  return result;
}

/**
 * Load a JSON page file and return page info with resolved imports and data
 */
export async function loadJsonPage(
  baseDir: string,
  pagePath: string
): Promise<PageInfo> {
  const filePath = join(baseDir, pagePath);

  // Path traversal protection: ensure resolved path is within baseDir
  const resolvedBase = resolve(baseDir);
  const resolvedPath = resolve(filePath);
  if (!resolvedPath.startsWith(resolvedBase + '/') && resolvedPath !== resolvedBase) {
    throw new Error(`Invalid path: path traversal detected`);
  }

  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`Page file not found: ${filePath}`);
  }

  // Read and parse JSON
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read page file: ${filePath}`);
  }

  let page: JsonPage;
  try {
    page = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in page file: ${filePath}`);
  }

  // Validate required fields
  if (!('version' in page) || page.version === undefined) {
    throw new Error(`Missing required field "version" in page: ${filePath}`);
  }

  if (!('view' in page) || page.view === undefined) {
    throw new Error(`Missing required field "view" in page: ${filePath}`);
  }

  // Validate version
  validateVersion(page.version);

  // Resolve imports
  const pageDir = dirname(filePath);
  const resolvedImports = await resolveImports(pageDir, page.imports, baseDir);

  // Normalize data source patterns to be relative to baseDir
  const normalizedData = normalizeDataSourcePatterns(baseDir, pageDir, page.data);

  // Load data sources
  const loadedData = await loadPageData(baseDir, normalizedData, { imports: resolvedImports });

  // Load and compile widgets
  const widgets = await loadWidgets(pageDir, page.widgets, baseDir);

  return {
    filePath,
    page,
    resolvedImports,
    loadedData,
    widgets,
  };
}

/**
 * Load page data sources using DataLoader
 */
export async function loadPageData(
  baseDir: string,
  dataSources?: Record<string, DataSource>,
  context?: { imports?: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  if (!dataSources || Object.keys(dataSources).length === 0) {
    return {};
  }

  const loader = new DataLoader(baseDir);
  const result: Record<string, unknown> = {};

  for (const [name, source] of Object.entries(dataSources)) {
    result[name] = await loader.loadDataSource(name, source, context);
  }

  return result;
}

/**
 * Generate static paths from page config
 */
export async function generateStaticPathsFromPage(
  pageConfig: JsonPage,
  loadedData: Record<string, unknown>
): Promise<StaticPathResult[]> {
  if (!pageConfig.getStaticPaths) {
    return [];
  }

  const { source, params } = pageConfig.getStaticPaths;

  // Get source data
  const sourceData = loadedData[source];
  if (sourceData === undefined) {
    throw new Error(`Data source "${source}" not found for getStaticPaths`);
  }

  if (!Array.isArray(sourceData)) {
    throw new Error(`Data source "${source}" must be an array for getStaticPaths`);
  }

  const paths: StaticPathResult[] = [];

  for (const item of sourceData) {
    const extractedParams: Record<string, string> = {};

    for (const [paramName, paramExpr] of Object.entries(params)) {
      extractedParams[paramName] = evaluateParamExpression(paramExpr, item);
    }

    paths.push({
      params: extractedParams,
      data: item,
    });
  }

  return paths;
}

/**
 * Convert view node to compiled format (pass through for JSON pages)
 */
function convertViewNode(node: ViewNode): CompiledNode {
  // For JSON pages, the view is already in a format close to CompiledNode
  // We just need to type it correctly
  return node as unknown as CompiledNode;
}

/**
 * Convert actions to compiled format
 * Supports both array format and object format
 */
function convertActions(actions: unknown[] | Record<string, unknown> | undefined): Record<string, CompiledAction> {
  if (!actions) {
    return {};
  }

  // Handle empty object
  if (typeof actions === 'object' && !Array.isArray(actions) && Object.keys(actions).length === 0) {
    return {};
  }

  // Handle array format
  if (Array.isArray(actions)) {
    if (actions.length === 0) {
      return {};
    }
    const result: Record<string, CompiledAction> = {};
    for (const action of actions) {
      const actionDef = action as ActionDefinition;
      result[actionDef.name] = {
        name: actionDef.name,
        steps: actionDef.steps as CompiledAction['steps'],
      };
    }
    return result;
  }

  // Handle object format (already in Record<string, unknown> shape)
  const result: Record<string, CompiledAction> = {};
  for (const [name, action] of Object.entries(actions)) {
    const actionDef = action as { steps?: CompiledAction['steps'] };
    result[name] = {
      name,
      steps: actionDef.steps ?? [],
    };
  }
  return result;
}

/**
 * Convert state to compiled format
 */
function convertState(state: Record<string, unknown> | undefined): Record<string, { type: string; initial: unknown }> {
  if (!state || Object.keys(state).length === 0) {
    return {};
  }

  const result: Record<string, { type: string; initial: unknown }> = {};
  for (const [name, field] of Object.entries(state)) {
    const stateField = field as { type: string; initial: unknown };
    result[name] = {
      type: stateField.type,
      initial: stateField.initial,
    };
  }
  return result;
}

/**
 * Convert PageInfo to CompiledProgram
 */
export async function convertToCompiledProgram(pageInfo: PageInfo): Promise<CompiledProgram> {
  const { page, resolvedImports, loadedData } = pageInfo;

  const program: CompiledProgram = {
    version: '1.0',
    state: convertState(page.state),
    actions: convertActions(page.actions),
    view: convertViewNode(page.view),
  };

  // Add route if present
  if (page.route) {
    program.route = {
      path: page.route.path,
      params: extractRouteParams(page.route.path),
    };
    if (page.route.layout) {
      program.route.layout = page.route.layout;
    }
    if (page.route.layoutParams) {
      program.route.layoutParams = page.route.layoutParams;
    }
    if (page.route.meta) {
      // Convert meta to CompiledExpression format
      program.route.meta = {};
      for (const [key, value] of Object.entries(page.route.meta)) {
        program.route.meta[key] = { expr: 'lit', value } as CompiledProgram['route'] extends { meta?: Record<string, infer T> } ? T : never;
      }
    }
  }

  // Add importData if there are resolved imports or loaded data
  const hasImports = Object.keys(resolvedImports).length > 0;
  const hasData = Object.keys(loadedData).length > 0;

  if (hasImports || hasData) {
    program.importData = {
      ...resolvedImports,
      ...loadedData,
    };
  }

  return program;
}

// ==================== JsonPageLoader Class ====================

/**
 * JsonPageLoader class for managing JSON page loading with caching
 */
export class JsonPageLoader {
  private projectRoot: string;
  private cache: Map<string, PageInfo> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Load a JSON page with full resolution
   */
  async loadPage(pagePath: string): Promise<PageInfo> {
    // Check cache first
    if (this.cache.has(pagePath)) {
      return this.cache.get(pagePath)!;
    }

    const pageInfo = await loadJsonPage(this.projectRoot, pagePath);
    this.cache.set(pagePath, pageInfo);
    return pageInfo;
  }

  /**
   * Get static paths for a page
   */
  async getStaticPaths(pagePath: string): Promise<StaticPathResult[]> {
    const pageInfo = await this.loadPage(pagePath);
    return generateStaticPathsFromPage(pageInfo.page, pageInfo.loadedData);
  }

  /**
   * Compile a page to CompiledProgram
   */
  async compile(
    pagePath: string,
    options?: { params?: Record<string, string> }
  ): Promise<CompiledProgram> {
    const pageInfo = await this.loadPage(pagePath);
    const program = await convertToCompiledProgram(pageInfo);

    // If params are provided, we could filter or select specific data
    // For now, we just return the compiled program as-is
    if (options?.params) {
      // Future enhancement: filter data based on params
    }

    return program;
  }

  /**
   * Clear cache for a specific page or all pages
   */
  clearCache(pagePath?: string): void {
    if (pagePath) {
      this.cache.delete(pagePath);
    } else {
      this.cache.clear();
    }
  }
}
