/**
 * Static file serving utilities.
 *
 * Provides path validation, MIME type detection, and file resolution
 * for serving static files from the public directory.
 */

import { extname, join, normalize, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';

// ==================== Types ====================

/**
 * Result of resolving a static file path
 */
export interface StaticFileResult {
  exists: boolean;
  filePath: string | null;
  mimeType: string | null;
  error?: 'path_traversal' | 'outside_public';
}

// ==================== Constants ====================

/**
 * MIME type mapping for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  // Web assets
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.xml': 'application/xml',
  // Other
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.map': 'application/json',
};

const DEFAULT_MIME_TYPE = 'application/octet-stream';

// ==================== Path Security ====================

/**
 * Check if a URL pathname is safe from path traversal attacks.
 *
 * Rejects:
 * - Paths containing '..' (decoded)
 * - Double slashes '//'
 * - Null bytes
 * - Backslashes
 * - Hidden files (starting with '.')
 * - Paths not starting with '/'
 * - Empty paths
 *
 * @param pathname - The URL pathname to validate
 * @returns true if the path is safe, false otherwise
 */
export function isPathSafe(pathname: string): boolean {
  // Reject empty paths
  if (!pathname) {
    return false;
  }

  // Must start with /
  if (!pathname.startsWith('/')) {
    return false;
  }

  // Reject backslashes (Windows path separator attack)
  if (pathname.includes('\\')) {
    return false;
  }

  // Reject double slashes
  if (pathname.includes('//')) {
    return false;
  }

  // Reject null bytes (raw or URL-encoded)
  if (pathname.includes('\x00') || pathname.includes('%00')) {
    return false;
  }

  // Decode URL and check for traversal patterns
  let decoded: string;
  try {
    // Decode multiple times to catch double-encoding
    decoded = pathname;
    let prevDecoded = '';
    while (decoded !== prevDecoded) {
      prevDecoded = decoded;
      decoded = decodeURIComponent(decoded);
    }
  } catch {
    // Invalid URL encoding - reject
    return false;
  }

  // Check decoded path for null bytes
  if (decoded.includes('\x00')) {
    return false;
  }

  // Reject paths containing '..' segment
  if (decoded.includes('..')) {
    return false;
  }

  // Reject hidden files (files starting with '.')
  // Check each segment of the path
  const segments = decoded.split('/').filter(Boolean);
  for (const segment of segments) {
    if (segment.startsWith('.')) {
      return false;
    }
  }

  return true;
}

// ==================== MIME Type Detection ====================

/**
 * Get the MIME type for a file based on its extension.
 *
 * @param filePath - The file path to check
 * @returns The MIME type string, or 'application/octet-stream' for unknown types
 */
export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? DEFAULT_MIME_TYPE;
}

// ==================== File Resolution ====================

/**
 * Check for obvious attack patterns that should return path_traversal error.
 * This is a subset of isPathSafe checks, excluding the .. check which
 * will be handled separately via path resolution boundary check.
 */
function hasObviousAttackPattern(pathname: string): boolean {
  // Reject empty paths
  if (!pathname) {
    return true;
  }

  // Must start with /
  if (!pathname.startsWith('/')) {
    return true;
  }

  // Reject backslashes (Windows path separator attack)
  if (pathname.includes('\\')) {
    return true;
  }

  // Reject double slashes
  if (pathname.includes('//')) {
    return true;
  }

  // Reject null bytes (raw or URL-encoded)
  if (pathname.includes('\x00') || pathname.includes('%00')) {
    return true;
  }

  // Decode URL and check for patterns
  let decoded: string;
  try {
    // Decode multiple times to catch double-encoding
    decoded = pathname;
    let prevDecoded = '';
    while (decoded !== prevDecoded) {
      prevDecoded = decoded;
      decoded = decodeURIComponent(decoded);
    }
  } catch {
    // Invalid URL encoding - reject
    return true;
  }

  // Check decoded path for null bytes
  if (decoded.includes('\x00')) {
    return true;
  }

  // Reject hidden files (files starting with '.')
  // Check each segment of the path
  const segments = decoded.split('/').filter(Boolean);
  for (const segment of segments) {
    if (segment.startsWith('.') && segment !== '..') {
      // Hidden file (but not a .. traversal which is handled separately)
      return true;
    }
  }

  // Check for .. at the start of the decoded path (obvious attack)
  // e.g., /../etc/passwd, /%2e%2e/etc/passwd
  if (decoded.startsWith('/..')) {
    return true;
  }

  return false;
}

/**
 * Resolve a URL pathname to an absolute file path within the public directory.
 *
 * Performs security validation and checks if the file exists.
 *
 * @param pathname - The URL pathname (e.g., '/favicon.ico')
 * @param publicDir - The absolute path to the public directory
 * @returns StaticFileResult with resolution details
 */
export function resolveStaticFile(
  pathname: string,
  publicDir: string
): StaticFileResult {
  // Check for obvious attack patterns
  if (hasObviousAttackPattern(pathname)) {
    return {
      exists: false,
      filePath: null,
      mimeType: null,
      error: 'path_traversal',
    };
  }

  // Decode the pathname for file system access
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return {
      exists: false,
      filePath: null,
      mimeType: null,
      error: 'path_traversal',
    };
  }

  // Remove leading slash and join with public directory
  const relativePath = decodedPathname.slice(1);
  const resolvedPath = normalize(join(publicDir, relativePath));
  const absolutePublicDir = resolve(publicDir);

  // Ensure the resolved path is within the public directory
  // This catches cases like /images/../../secret.txt which resolves outside publicDir
  // Use path separator to prevent prefix collision attack (e.g., /public-admin/secret vs /public/)
  const publicDirWithSep = absolutePublicDir.endsWith('/')
    ? absolutePublicDir
    : absolutePublicDir + '/';
  if (!resolvedPath.startsWith(publicDirWithSep) && resolvedPath !== absolutePublicDir) {
    return {
      exists: false,
      filePath: null,
      mimeType: null,
      error: 'outside_public',
    };
  }

  // Get MIME type based on extension
  const mimeType = getMimeType(resolvedPath);

  // Check if file exists and is not a directory
  let exists = false;
  if (existsSync(resolvedPath)) {
    try {
      const stats = statSync(resolvedPath);
      exists = stats.isFile();
    } catch {
      exists = false;
    }
  }

  return {
    exists,
    filePath: resolvedPath,
    mimeType,
  };
}
