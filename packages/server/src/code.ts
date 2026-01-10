import { createHighlighter, type Highlighter } from 'shiki';
import { escapeHtml } from './utils/escape.js';

let highlighter: Highlighter | null = null;

const PRELOAD_LANGS = [
  'javascript',
  'typescript',
  'json',
  'html',
  'css',
  'python',
  'rust',
  'go',
  'java',
  'bash',
  'markdown',
];

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: PRELOAD_LANGS,
    });
  }
  return highlighter;
}

export async function renderCodeSSR(code: string, language: string): Promise<string> {
  const hl = await getHighlighter();
  const loadedLangs = hl.getLoadedLanguages();

  try {
    if (language && !loadedLangs.includes(language) && language !== 'text') {
      await hl.loadLanguage(language as Parameters<typeof hl.loadLanguage>[0]);
    }
    const langToUse = language || 'text';
    const html = hl.codeToHtml(code, { lang: langToUse, theme: 'github-dark' });
    return html.replace(/background-color:[^;]+;?/g, '');
  } catch {
    const escapedCode = escapeHtml(code);
    const langClass = language ? ` class="language-${language}"` : '';
    return `<pre><code${langClass}>${escapedCode}</code></pre>`;
  }
}
