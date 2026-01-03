/**
 * Route matching utilities
 */

export interface MatchResult {
  params: Record<string, string>;
}

/**
 * Matches a URL path against a route pattern
 *
 * @param pattern - Route pattern (e.g., "/users/:id")
 * @param path - URL path to match (e.g., "/users/123")
 * @returns Match result with params, or null if no match
 */
export function matchRoute(pattern: string, path: string): MatchResult | null {
  // Normalize paths (handle trailing slashes)
  const normalizedPattern = pattern === '/' ? '/' : pattern.replace(/\/+$/, '');
  const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');

  // Handle root path
  if (normalizedPattern === '/') {
    return normalizedPath === '/' ? { params: {} } : null;
  }

  const patternParts = normalizedPattern.split('/').filter(Boolean);
  const pathParts = normalizedPath.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]!;
    const pathPart = pathParts[i]!;

    if (patternPart.startsWith(':')) {
      // Dynamic segment - extract param name and value
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      // Static segment mismatch
      return null;
    }
  }

  return { params };
}

/**
 * Parses URL params from a matched route
 */
export function parseParams(pattern: string, path: string): Record<string, string> {
  const match = matchRoute(pattern, path);
  return match?.params ?? {};
}
