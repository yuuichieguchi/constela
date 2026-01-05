/**
 * Markdown Renderer
 *
 * Renders markdown content to DOM using marked and DOMPurify
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for safety
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Parse markdown and return sanitized HTML string
 */
export function parseMarkdown(content: string): string {
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}
