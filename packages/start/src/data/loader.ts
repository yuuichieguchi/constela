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
import { join } from 'node:path';
import fg from 'fast-glob';
import type { DataSource, StaticPathsDefinition, Expression } from '@constela/core';

// ==================== Types ====================

export interface GlobResult {
  file: string;
  raw: string;
  frontmatter?: Record<string, unknown>;
  content?: string;
}

export interface StaticPath {
  params: Record<string, string>;
  data?: unknown;
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

// ==================== Transform Functions ====================

/**
 * Transform MDX content - parse frontmatter and content
 */
export function transformMdx(content: string): { frontmatter: Record<string, unknown>; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: content.trim() };
  }

  const frontmatter = parseYaml(match[1]!);
  return { frontmatter, content: match[2]!.trim() };
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
 */
function applyTransform(content: string, transform: string | undefined, filename: string): unknown {
  if (!transform) {
    // Auto-detect based on file extension
    if (filename.endsWith('.json')) {
      return JSON.parse(content);
    }
    return content;
  }

  switch (transform) {
    case 'mdx':
      return transformMdx(content);
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
  transform?: string
): Promise<GlobResult[]> {
  const files = await fg(pattern, { cwd: baseDir });
  const results: GlobResult[] = [];

  for (const file of files) {
    const fullPath = join(baseDir, file);
    const content = readFileSync(fullPath, 'utf-8');

    if (transform === 'mdx') {
      const transformed = transformMdx(content);
      results.push({
        file,
        raw: content,
        frontmatter: transformed.frontmatter,
        content: transformed.content,
      });
    } else {
      results.push({
        file,
        raw: content,
      });
    }
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
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Load a single data source
   */
  async loadDataSource(name: string, dataSource: DataSource): Promise<unknown> {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    let data: unknown;

    switch (dataSource.type) {
      case 'glob':
        if (!dataSource.pattern) {
          throw new Error(`Glob data source '${name}' requires pattern`);
        }
        data = await loadGlob(this.projectRoot, dataSource.pattern, dataSource.transform);
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