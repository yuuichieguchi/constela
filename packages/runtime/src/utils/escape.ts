/**
 * HTML escaping utilities for browser environments.
 *
 * Provides XSS protection by escaping special HTML characters.
 */

/**
 * Escapes HTML special characters in a string to prevent XSS attacks.
 *
 * Uses the browser's DOM API for reliable escaping.
 *
 * @param text - The text to escape
 * @returns The escaped HTML string
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
