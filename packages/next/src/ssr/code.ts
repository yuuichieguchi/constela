/**
 * SSR Code Renderer
 *
 * Renders code with basic HTML structure for SSR
 * Client-side hydration will apply full syntax highlighting
 */

import { escapeHtml } from '../utils/escape.js';

/**
 * Render code as HTML for SSR
 */
export function renderCodeSSR(code: string, language: string): string {
  const escapedCode = escapeHtml(code);
  const langClass = language ? ` class="language-${language}"` : '';
  return `<pre><code${langClass}>${escapedCode}</code></pre>`;
}
