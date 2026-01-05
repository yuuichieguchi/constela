import fg from 'fast-glob';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ScannedRoute } from '../types.js';

/**
 * Convert file path to URL pattern
 *
 * Rules:
 * - index.ts -> /
 * - about.ts -> /about
 * - users/index.ts -> /users
 * - users/[id].ts -> /users/:id
 * - blog/[...slug].ts -> /blog/*
 *
 * @param filePath - File path relative to routes directory
 * @param _routesDir - Routes directory (unused, kept for API compatibility)
 */
export function filePathToPattern(filePath: string, _routesDir?: string): string {
  // Normalize path separators to forward slashes
  let normalized = filePath.replace(/\\/g, '/');

  // Remove file extension (.ts, .tsx, .js, .jsx)
  normalized = normalized.replace(/\.(ts|tsx|js|jsx)$/, '');

  // Split into segments
  const segments = normalized.split('/');

  // Process each segment
  const processedSegments = segments.map((segment) => {
    // Handle catch-all: [...slug] -> *
    if (segment.startsWith('[...') && segment.endsWith(']')) {
      return '*';
    }

    // Handle dynamic parameter: [id] -> :id
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1);
      return `:${paramName}`;
    }

    return segment;
  });

  // Remove trailing 'index' segment
  if (processedSegments.at(-1) === 'index') {
    processedSegments.pop();
  }

  // Build path
  const path = '/' + processedSegments.join('/');

  // Handle root path
  if (path === '/') {
    return '/';
  }

  // Remove trailing slash if present
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Extract parameter names from a file path
 *
 * @param filePath - File path relative to routes directory
 */
function extractParams(filePath: string): string[] {
  const params: string[] = [];

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Match all dynamic segments: [param] or [...param]
  const regex = /\[(?:\.\.\.)?([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const paramName = match[1];
    if (paramName !== undefined) {
      params.push(paramName);
    }
  }

  return params;
}

/**
 * Determine route type from file path
 *
 * @param filePath - File path relative to routes directory
 */
function determineRouteType(filePath: string): 'page' | 'api' | 'middleware' {
  const normalized = filePath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? '';

  // Check for middleware
  if (fileName.startsWith('_middleware.')) {
    return 'middleware';
  }

  // Check for API routes (path contains /api/ or starts with api/)
  if (normalized.startsWith('api/') || normalized.includes('/api/')) {
    return 'api';
  }

  return 'page';
}

/**
 * Check if a file should be included as a route
 *
 * @param filePath - File path relative to routes directory
 */
function shouldIncludeRoute(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? '';

  // Exclude .d.ts files
  if (fileName.endsWith('.d.ts')) {
    return false;
  }

  // Exclude files starting with _ (except _middleware)
  if (fileName.startsWith('_') && !fileName.startsWith('_middleware.')) {
    return false;
  }

  return true;
}

/**
 * Scan routes directory for route files
 *
 * @param routesDir - Directory to scan for route files
 */
export async function scanRoutes(routesDir: string): Promise<ScannedRoute[]> {
  // Validate routesDir exists and is a directory
  if (!existsSync(routesDir)) {
    throw new Error(`Routes directory does not exist: ${routesDir}`);
  }

  const stats = statSync(routesDir);
  if (!stats.isDirectory()) {
    throw new Error(`Routes path is not a directory: ${routesDir}`);
  }

  // Use fast-glob to find all route files
  const files = await fg('**/*.{ts,tsx,js,jsx}', {
    cwd: routesDir,
    ignore: ['node_modules/**', '**/*.d.ts'],
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  // Process files and create routes
  const routes: ScannedRoute[] = [];

  for (const filePath of files) {
    // Check if file should be included
    if (!shouldIncludeRoute(filePath)) {
      continue;
    }

    const route: ScannedRoute = {
      file: join(routesDir, filePath),
      pattern: filePathToPattern(filePath, routesDir),
      type: determineRouteType(filePath),
      params: extractParams(filePath),
    };

    routes.push(route);
  }

  // Sort routes by specificity
  routes.sort((a, b) => {
    return compareRoutes(a, b);
  });

  return routes;
}

/**
 * Compare two routes for sorting
 * Returns negative if a should come first, positive if b should come first
 */
function compareRoutes(a: ScannedRoute, b: ScannedRoute): number {
  // Middleware always comes first
  if (a.type === 'middleware' && b.type !== 'middleware') return -1;
  if (b.type === 'middleware' && a.type !== 'middleware') return 1;

  const segmentsA = a.pattern.split('/').filter(Boolean);
  const segmentsB = b.pattern.split('/').filter(Boolean);

  // Compare segment by segment
  const minLen = Math.min(segmentsA.length, segmentsB.length);

  for (let i = 0; i < minLen; i++) {
    const segA = segmentsA[i] ?? '';
    const segB = segmentsB[i] ?? '';

    const typeA = getSegmentType(segA);
    const typeB = getSegmentType(segB);

    // If same type, continue to next segment
    if (typeA !== typeB) {
      // Static > Dynamic > CatchAll (lower value = higher priority)
      return typeA - typeB;
    }

    // If both static and different, sort alphabetically
    if (typeA === 0 && segA !== segB) {
      return segA.localeCompare(segB);
    }
  }

  // If all compared segments are equal, shorter path should come first
  // /users should come before /users/:id
  if (segmentsA.length !== segmentsB.length) {
    return segmentsA.length - segmentsB.length;
  }

  // Same length, same types - alphabetical
  return a.pattern.localeCompare(b.pattern);
}

/**
 * Get segment type for sorting priority
 * 0 = static (highest priority)
 * 1 = dynamic
 * 2 = catch-all (lowest priority)
 */
function getSegmentType(segment: string): number {
  if (segment === '*') return 2;
  if (segment.startsWith(':')) return 1;
  return 0;
}
