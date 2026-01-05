/**
 * HTML Escape Utility
 *
 * Escapes special HTML characters to prevent XSS attacks.
 */

/**
 * HTML escape replacement map
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Regular expression to match HTML special characters
 */
const HTML_ESCAPE_REGEX = /[&<>"']/g;

/**
 * Escapes HTML special characters in a string.
 *
 * @param str - The string to escape
 * @returns The escaped string with HTML entities
 */
export function escapeHtml(str: string): string {
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] ?? char);
}
