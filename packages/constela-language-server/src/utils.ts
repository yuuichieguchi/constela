/**
 * Shared utility functions for the language server
 */

/**
 * Get the range of the word at a given offset in the text.
 * A "word" includes alphanumeric characters and double quotes.
 */
export function getWordRangeAtOffset(text: string, offset: number): { start: number; end: number } {
  let start = offset;
  let end = offset;

  while (start > 0 && /[\w"]/.test(text[start - 1] ?? '')) {
    start--;
  }

  while (end < text.length && /[\w"]/.test(text[end] ?? '')) {
    end++;
  }

  return { start, end };
}
