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
import { dirname, join, resolve } from 'node:path';
import type { CompiledProgram, CompiledNode, CompiledAction } from '@constela/compiler';
import type { DataSource, StaticPathsDefinition, Expression, ViewNode, ActionDefinition } from '@constela/core';
import { DataLoader } from './data/loader.js';

// ==================== Type Definitions ====================

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
}

/**
 * Resolved page info returned by loadJsonPage
 */
export interface PageInfo {
  filePath: string;
  page: JsonPage;
  resolvedImports: Record<string, unknown>;
  loadedData: Record<string, unknown>;
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

  // Load data sources
  const loadedData = await loadPageData(baseDir, page.data, { imports: resolvedImports });

  return {
    filePath,
    page,
    resolvedImports,
    loadedData,
  };
}

/**
 * Resolve imports from external JSON files
 * @param pageDir - The directory containing the page file (imports are relative to this)
 * @param imports - Map of import names to relative paths
 * @param projectRoot - Optional project root directory for path traversal validation
 */
export async function resolveImports(
  pageDir: string,
  imports?: Record<string, string>,
  projectRoot?: string
): Promise<Record<string, unknown>> {
  if (!imports || Object.keys(imports).length === 0) {
    return {};
  }

  const resolved: Record<string, unknown> = {};

  // Path traversal protection: resolve projectRoot once (if provided)
  const resolvedRoot = projectRoot ? resolve(projectRoot) : null;

  for (const [name, importPath] of Object.entries(imports)) {
    const fullPath = join(pageDir, importPath);

    // Path traversal protection: ensure resolved path is within projectRoot (if provided)
    if (resolvedRoot) {
      const resolvedPath = resolve(fullPath);
      if (!resolvedPath.startsWith(resolvedRoot + '/') && resolvedPath !== resolvedRoot) {
        throw new Error(`Invalid import path "${name}": path traversal detected`);
      }
    }

    if (!existsSync(fullPath)) {
      throw new Error(`Import "${name}" not found: ${fullPath}`);
    }

    let content: string;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read import "${name}": ${fullPath}`);
    }

    try {
      resolved[name] = JSON.parse(content);
    } catch {
      throw new Error(`Invalid JSON in import "${name}": ${fullPath}`);
    }
  }

  return resolved;
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
