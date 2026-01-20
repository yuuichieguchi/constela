/**
 * Data Loader for Build-time Content Loading
 *
 * This module provides utilities for loading data sources at build time:
 * - Glob patterns for multiple files
 * - Single file loading
 * - API fetching
 * - MDX/YAML/CSV transformations
 * - Static path generation for SSG
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import fg from 'fast-glob';
import type { CompiledNode } from '@constela/compiler';
import type { DataSource, StaticPathsDefinition, Expression, ComponentsRef } from '@constela/core';
import { mdxContentToNode as mdxContentToNodeImpl } from '../build/mdx.js';

// ==================== Types ====================

export interface GlobResult {
  file: string;
  raw: string;
  frontmatter?: Record<string, unknown>;
  content?: string;
}

export interface MdxGlobResult {
  file: string;
  raw: string;
  frontmatter: Record<string, unknown>;
  content: CompiledNode;
  slug: string;
}

interface ComponentDef {
  params?: Record<string, { type: string; required?: boolean }>;
  view: CompiledNode;
}

export const mdxContentToNode = mdxContentToNodeImpl;

export interface StaticPath {
  params: Record<string, string>;
  data?: unknown;
}

// ==================== JSON Reference Resolution (RFC 6901) ====================

/**
 * Resolve JSON $ref references within a JSON document.
 *
 * Implements JSON Pointer (RFC 6901) for $ref resolution:
 * - $ref paths start with # and use / as delimiter
 * - Special character encoding: ~0 = ~, ~1 = /
 * - Circular references are detected and throw an error
 * - Returns a new object without modifying the original
 *
 * @param json - The JSON document to resolve references in
 * @returns A new object with all $ref references resolved
 * @throws Error if $ref path is invalid or circular
 */
export function resolveJsonRefs<T>(json: T): T {
  // Deep clone to avoid modifying the original
  const cloned = JSON.parse(JSON.stringify(json)) as T;

  // Track paths being resolved to detect circular references
  const resolvingPaths = new Set<string>();

  return resolveRefsRecursive(cloned, cloned, resolvingPaths);
}

/**
 * Recursively resolve $ref references in an object
 */
function resolveRefsRecursive<T>(
  current: T,
  root: unknown,
  resolvingPaths: Set<string>
): T {
  // Null or primitive - return as-is
  if (current === null || typeof current !== 'object') {
    return current;
  }

  // Handle arrays
  if (Array.isArray(current)) {
    return current.map((item) => resolveRefsRecursive(item, root, resolvingPaths)) as T;
  }

  // Handle objects
  const obj = current as Record<string, unknown>;

  // Check if this is a $ref object (only has $ref property)
  if ('$ref' in obj && Object.keys(obj).length === 1) {
    const refPath = obj['$ref'];

    if (typeof refPath !== 'string') {
      throw new Error(`Invalid $ref: value must be a string`);
    }

    // Validate JSON Pointer format
    if (!refPath.startsWith('#')) {
      throw new Error(`Invalid $ref: path must start with # (got "${refPath}")`);
    }

    // Check for self-referential (circular) references
    if (resolvingPaths.has(refPath)) {
      throw new Error(`Circular $ref detected: "${refPath}"`);
    }

    // Resolve the reference
    resolvingPaths.add(refPath);
    try {
      const resolved = resolveJsonPointer(root, refPath);
      // Recursively resolve any $refs in the resolved value
      return resolveRefsRecursive(resolved as T, root, resolvingPaths);
    } finally {
      resolvingPaths.delete(refPath);
    }
  }

  // Regular object - recursively resolve each property
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveRefsRecursive(value, root, resolvingPaths);
  }

  return result as T;
}

/**
 * Resolve a JSON Pointer path to a value in the document
 *
 * JSON Pointer (RFC 6901) rules:
 * - Path starts with # for document-relative reference
 * - Path segments are separated by /
 * - ~0 decodes to ~
 * - ~1 decodes to /
 */
function resolveJsonPointer(root: unknown, pointer: string): unknown {
  // Remove the leading #
  const path = pointer.slice(1);

  // Empty path after # means root
  if (path === '' || path === '/') {
    return root;
  }

  // Validate path format (must be empty or start with /)
  if (!path.startsWith('/')) {
    throw new Error(`Invalid $ref: path after # must be empty or start with / (got "${pointer}")`);
  }

  // Split path into segments and decode
  const segments = path.slice(1).split('/').map(decodeJsonPointerSegment);

  let current: unknown = root;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      throw new Error(`Invalid $ref: path "${pointer}" references null/undefined`);
    }

    if (Array.isArray(current)) {
      // Array index access
      const index = parseInt(segment, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Invalid $ref: array index "${segment}" out of bounds in "${pointer}"`);
      }
      current = current[index];
    } else if (typeof current === 'object') {
      // Object property access
      const obj = current as Record<string, unknown>;
      if (!(segment in obj)) {
        throw new Error(`Invalid $ref: property "${segment}" not found in "${pointer}"`);
      }
      current = obj[segment];
    } else {
      throw new Error(`Invalid $ref: cannot access "${segment}" on primitive value in "${pointer}"`);
    }
  }

  return current;
}

/**
 * Decode a JSON Pointer segment according to RFC 6901
 * ~1 -> /
 * ~0 -> ~
 *
 * Order matters: ~1 must be decoded before ~0
 */
function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

// ==================== YAML Parser ====================

interface StackEntry {
  indent: number;
  obj: Record<string, unknown>;
  key?: string;
  isArray?: boolean;
}

/**
 * Simple YAML parser for basic cases
 * Supports: strings, numbers, booleans, arrays, nested objects
 */
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: StackEntry[] = [{ indent: -2, obj: result }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '' || line.trim().startsWith('#')) continue;

    // Check for array item first
    const arrayMatch = line.match(/^(\s*)-\s*(.*)$/);
    if (arrayMatch) {
      const [, indentStr, rest] = arrayMatch;
      const indent = indentStr?.length ?? 0;

      // Pop stack to find the right parent
      while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1]!;
      const key = parent.key;
      if (key) {
        if (!Array.isArray(parent.obj[key])) {
          parent.obj[key] = [];
        }
        const arr = parent.obj[key] as unknown[];

        // Check if this is an object item (key: value on same line)
        const objMatch = rest?.match(/^([\w-]+):\s*(.*)$/);
        if (objMatch) {
          const [, k, v] = objMatch;
          const newObj: Record<string, unknown> = {};
          if (v?.trim()) {
            newObj[k!] = parseValue(v);
          }
          arr.push(newObj);
          // Push this object for subsequent nested properties
          stack.push({ indent, obj: newObj, key: k!, isArray: true });
        } else if (rest?.trim()) {
          arr.push(parseValue(rest.trim()));
        }
      }
      continue;
    }

    // Check for key: value pattern
    const match = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!match) continue;

    const [, indentStr, key, value] = match;
    const indent = indentStr?.length ?? 0;

    // Pop stack to find the right parent based on indentation
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }

    // Get the target object to add this key-value pair to
    let targetObj: Record<string, unknown>;
    const currentTop = stack[stack.length - 1]!;

    if (currentTop.isArray) {
      // We're inside an array object, add to it directly
      targetObj = currentTop.obj;
    } else if (currentTop.key) {
      // We have a parent key, get or create the nested object
      if (!currentTop.obj[currentTop.key]) {
        currentTop.obj[currentTop.key] = {};
      }
      targetObj = currentTop.obj[currentTop.key] as Record<string, unknown>;
    } else {
      targetObj = currentTop.obj;
    }

    if (value?.trim() === '' || value === undefined) {
      // This is a parent key (will have children)
      const newObj: Record<string, unknown> = {};
      targetObj[key!] = newObj;
      stack.push({ indent, obj: targetObj, key: key! });
    } else {
      targetObj[key!] = parseValue(value);
    }
  }

  return result;
}

/**
 * Parse a single YAML value
 */
function parseValue(value: string): unknown {
  const trimmed = value.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Null
  if (trimmed === 'null' || trimmed === '~') return null;

  // Number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);

  // Quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // Plain string
  return trimmed;
}

// ==================== Component Definitions ====================

/**
 * Load component definitions from a JSON file
 */
export function loadComponentDefinitions(
  baseDir: string,
  componentsPath: string
): Record<string, ComponentDef> {
  const fullPath = join(baseDir, componentsPath);

  // Path traversal protection: ensure resolved path is within baseDir
  const resolvedBase = join(baseDir, '');
  const resolvedPath = join(fullPath, '');
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error(`Invalid component path: path traversal detected`);
  }

  if (!existsSync(fullPath)) {
    throw new Error(`MDX components file not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, 'utf-8');

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in MDX components file: ${fullPath}`);
  }
}

// ==================== Transform Functions ====================

/**
 * Transform MDX content - parse frontmatter and compile content to CompiledNode
 */
export async function transformMdx(
  content: string,
  file: string,
  options?: { components?: Record<string, ComponentDef> }
): Promise<MdxGlobResult> {
  // Parse frontmatter using existing pattern
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let frontmatter: Record<string, unknown> = {};
  let mdxContent: string;

  if (match) {
    frontmatter = parseYaml(match[1]!);
    mdxContent = match[2]!.trim();
  } else {
    mdxContent = content.trim();
  }

  // Transform MDX to CompiledNode
  const compiledContent = await mdxContentToNodeImpl(
    mdxContent,
    options?.components ? { components: options.components } : undefined
  );

  // Generate slug (frontmatter priority)
  const fmSlug = frontmatter['slug'];
  let slug: string;
  if (typeof fmSlug === 'string') {
    slug = fmSlug;
  } else {
    const filename = basename(file, extname(file));
    if (filename === 'index') {
      // For index.mdx, use parent directory name
      const dir = dirname(file);
      slug = dir === '.' ? 'index' : basename(dir);
    } else {
      slug = filename;
    }
  }

  return {
    file,
    raw: content,
    frontmatter,
    content: compiledContent,
    slug,
  };
}

/**
 * Transform YAML content
 */
export function transformYaml(content: string): Record<string, unknown> {
  return parseYaml(content);
}

/**
 * Transform CSV content to array of objects
 */
export function transformCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headerLine = lines[0]!;
  const headers = parseCSVLine(headerLine);

  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!.trim()] = (values[j] ?? '').trim();
    }
    result.push(row);
  }

  return result;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Apply transform to content based on transform type
 * Note: MDX transform is handled separately via loadGlob with async transformMdx
 */
function applyTransform(content: string, transform: string | undefined, filename: string): unknown {
  if (!transform) {
    // Auto-detect based on file extension
    if (filename.endsWith('.json')) {
      const parsed = JSON.parse(content);
      // Resolve $ref references in JSON files
      return resolveJsonRefs(parsed);
    }
    return content;
  }

  switch (transform) {
    case 'mdx':
      // MDX transform is async and requires file path for slug generation
      // Use loadGlob for MDX files instead
      throw new Error('MDX transform for single files is not supported via loadFile. Use loadGlob instead.');
    case 'yaml':
      return transformYaml(content);
    case 'csv':
      return transformCsv(content);
    default:
      return content;
  }
}

// ==================== Load Functions ====================

/**
 * Load files matching a glob pattern
 */
export async function loadGlob(
  baseDir: string,
  pattern: string,
  transform?: string,
  options?: { components?: Record<string, ComponentDef> }
): Promise<GlobResult[] | MdxGlobResult[]> {
  const files = await fg(pattern, { cwd: baseDir });

  if (transform === 'mdx') {
    const results: MdxGlobResult[] = [];
    for (const file of files) {
      const fullPath = join(baseDir, file);
      const content = readFileSync(fullPath, 'utf-8');
      const transformed = await transformMdx(content, file, options);
      results.push(transformed);
    }
    return results;
  }

  const results: GlobResult[] = [];
  for (const file of files) {
    const fullPath = join(baseDir, file);
    const content = readFileSync(fullPath, 'utf-8');
    results.push({
      file,
      raw: content,
    });
  }
  return results;
}

/**
 * Load a single file
 */
export async function loadFile(
  baseDir: string,
  filePath: string,
  transform?: string
): Promise<unknown> {
  const fullPath = join(baseDir, filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, 'utf-8');
  return applyTransform(content, transform, filePath);
}

/**
 * Load data from API endpoint
 */
export async function loadApi(url: string, transform?: string): Promise<unknown> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`api request failed: ${response.status} ${response.statusText}`);
    }

    if (transform === 'csv') {
      const text = await response.text();
      return transformCsv(text);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.includes('api request failed')) {
      throw error;
    }
    throw new Error(`Network error: ${(error as Error).message}`);
  }
}

// ==================== Static Paths Generation ====================

/**
 * Evaluate a simple expression to extract value from data item
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
 * Generate static paths from data using params expression
 */
export async function generateStaticPaths(
  data: unknown[],
  staticPathsDef: StaticPathsDefinition
): Promise<StaticPath[]> {
  const paths: StaticPath[] = [];

  for (const item of data) {
    const params: Record<string, string> = {};

    for (const [paramName, paramExpr] of Object.entries(staticPathsDef.params)) {
      params[paramName] = evaluateParamExpression(paramExpr, item);
    }

    paths.push({ params, data: item });
  }

  return paths;
}

// ==================== DataLoader Class ====================

/**
 * DataLoader class for managing data source loading with caching
 */
export class DataLoader {
  private cache: Map<string, unknown> = new Map();
  private componentCache: Map<string, Record<string, ComponentDef>> = new Map();
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Resolve components from string path or import reference
   */
  private resolveComponents(
    ref: string | ComponentsRef,
    imports?: Record<string, unknown>
  ): Record<string, ComponentDef> {
    // String path
    if (typeof ref === 'string') {
      if (this.componentCache.has(ref)) {
        return this.componentCache.get(ref)!;
      }
      const defs = loadComponentDefinitions(this.projectRoot, ref);
      this.componentCache.set(ref, defs);
      return defs;
    }

    // Import expression reference
    if (ref.expr === 'import') {
      if (!imports) {
        throw new Error(`Import context required for component reference "${ref.name}"`);
      }
      const imported = imports[ref.name];
      if (!imported || typeof imported !== 'object') {
        throw new Error(`Component import "${ref.name}" not found or invalid`);
      }
      return imported as Record<string, ComponentDef>;
    }

    return {};
  }

  /**
   * Load a single data source
   */
  async loadDataSource(
    name: string,
    dataSource: DataSource,
    context?: { imports?: Record<string, unknown> }
  ): Promise<unknown> {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    let componentDefs: Record<string, ComponentDef> | undefined;

    // Resolve components for MDX transform
    if (dataSource.transform === 'mdx' && dataSource.components) {
      componentDefs = this.resolveComponents(
        dataSource.components as string | ComponentsRef,
        context?.imports
      );
    }

    let data: unknown;

    switch (dataSource.type) {
      case 'glob':
        if (!dataSource.pattern) {
          throw new Error(`Glob data source '${name}' requires pattern`);
        }
        data = await loadGlob(
          this.projectRoot,
          dataSource.pattern,
          dataSource.transform,
          componentDefs ? { components: componentDefs } : undefined
        );
        break;

      case 'file':
        if (!dataSource.path) {
          throw new Error(`File data source '${name}' requires path`);
        }
        data = await loadFile(this.projectRoot, dataSource.path, dataSource.transform);
        break;

      case 'api':
        if (!dataSource.url) {
          throw new Error(`API data source '${name}' requires url`);
        }
        data = await loadApi(dataSource.url, dataSource.transform);
        break;

      default:
        throw new Error(`Unknown data source type: ${(dataSource as DataSource).type}`);
    }

    // Store in cache
    this.cache.set(name, data);
    return data;
  }

  /**
   * Load all data sources
   */
  async loadAllDataSources(dataSources: Record<string, DataSource>): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const [name, source] of Object.entries(dataSources)) {
      result[name] = await this.loadDataSource(name, source);
    }

    return result;
  }

  /**
   * Clear cache for a specific data source or all caches
   */
  clearCache(name?: string): void {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}