/**
 * Code Highlighter
 *
 * Syntax highlighting using shiki
 */

import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;
const DEFAULT_LANGUAGES = ['javascript', 'typescript', 'json', 'html', 'css'];

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: DEFAULT_LANGUAGES,
    });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, language: string): Promise<string> {
  const highlighter = await getHighlighter();
  const loadedLangs = highlighter.getLoadedLanguages();

  if (!loadedLangs.includes(language)) {
    try {
      await highlighter.loadLanguage(language as Parameters<Highlighter['loadLanguage']>[0]);
    } catch {
      language = 'plaintext';
    }
  }

  return highlighter.codeToHtml(code, {
    lang: language,
    theme: 'github-dark',
  });
}
