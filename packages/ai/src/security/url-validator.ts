/**
 * URL validation utilities for security enforcement
 *
 * Validates URLs to prevent XSS and other injection attacks.
 */

export const FORBIDDEN_URL_SCHEMES = Object.freeze([
  'javascript:',
  'data:',
  'vbscript:',
] as const);

export type ForbiddenUrlScheme = (typeof FORBIDDEN_URL_SCHEMES)[number];

export interface UrlValidationOptions {
  allowedDomains?: string[];
  allowRelative?: boolean; // default: true
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if a URL uses a forbidden scheme.
 * Case-insensitive for scheme matching.
 */
export function isForbiddenScheme(url: string): boolean {
  const trimmedUrl = url.trim().toLowerCase();

  // Check URL-encoded schemes
  const decodedUrl = tryDecodeUri(trimmedUrl);

  return FORBIDDEN_URL_SCHEMES.some(
    (scheme) => trimmedUrl.startsWith(scheme) || decodedUrl.startsWith(scheme)
  );
}

/**
 * Safely decode URI, returning original on failure
 */
function tryDecodeUri(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

/**
 * Validate a URL against security rules.
 */
export function validateUrl(
  url: string,
  options?: UrlValidationOptions
): UrlValidationResult {
  const trimmedUrl = url.trim();

  // Empty URL is invalid
  if (trimmedUrl === '') {
    return { valid: false, reason: 'Empty URL is not allowed' };
  }

  // Check forbidden schemes (case-insensitive)
  if (isForbiddenScheme(trimmedUrl)) {
    const lowerUrl = trimmedUrl.toLowerCase();
    let scheme = 'unknown';
    for (const forbiddenScheme of FORBIDDEN_URL_SCHEMES) {
      if (lowerUrl.startsWith(forbiddenScheme) || tryDecodeUri(lowerUrl).startsWith(forbiddenScheme)) {
        scheme = forbiddenScheme.replace(':', '');
        break;
      }
    }
    return { valid: false, reason: `Forbidden URL scheme: ${scheme}` };
  }

  // Check if it's a relative URL
  const isRelative = !trimmedUrl.includes('://') && !trimmedUrl.startsWith('//');
  const allowRelative = options?.allowRelative ?? true;

  if (isRelative) {
    return allowRelative
      ? { valid: true }
      : { valid: false, reason: 'Relative URLs are not allowed' };
  }

  // For absolute URLs, check allowed domains if specified
  if (options?.allowedDomains && options.allowedDomains.length > 0) {
    try {
      const urlObj = new URL(trimmedUrl);
      const hostname = urlObj.hostname.toLowerCase();
      const isAllowed = options.allowedDomains.some((domain) => {
        const lowerDomain = domain.toLowerCase();
        return hostname === lowerDomain;
      });
      if (!isAllowed) {
        return { valid: false, reason: `Domain not in allowed list: ${hostname}` };
      }
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }
  }

  return { valid: true };
}
