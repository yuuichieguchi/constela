import { marked } from 'marked';
import markedShiki from 'marked-shiki';
import DOMPurify from 'isomorphic-dompurify';
import { getHighlighter } from './code.js';

let markedConfigured = false;

/**
 * Configure marked with shiki syntax highlighting
 */
async function configureMarked(): Promise<void> {
  if (markedConfigured) return;

  const highlighter = await getHighlighter();

  marked.use(
    markedShiki({
      highlight: async (code, lang) => {
        const loadedLangs = highlighter.getLoadedLanguages();
        let langToUse = lang || 'text';

        if (lang && !loadedLangs.includes(lang) && lang !== 'text') {
          try {
            await highlighter.loadLanguage(lang as Parameters<typeof highlighter.loadLanguage>[0]);
          } catch {
            langToUse = 'text';
          }
        }

        const html = highlighter.codeToHtml(code, {
          lang: langToUse,
          theme: 'github-dark',
        });
        return html.replace(/background-color:[^;]+;?/g, '');
      },
    })
  );

  marked.setOptions({ gfm: true, breaks: false });
  markedConfigured = true;
}

/**
 * Parse markdown content with syntax highlighting (async version)
 */
export async function parseMarkdownSSRAsync(content: string): Promise<string> {
  await configureMarked();
  const rawHtml = await marked.parse(content, { async: true });
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

/**
 * Parse markdown content without syntax highlighting (sync version for backwards compatibility)
 * @deprecated Use parseMarkdownSSRAsync for syntax highlighting support
 */
export function parseMarkdownSSR(content: string): string {
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}
