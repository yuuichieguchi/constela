/**
 * SSR Markdown Parser
 */

import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Parse markdown to HTML for SSR
 */
export function parseMarkdownSSR(content: string): string {
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}
