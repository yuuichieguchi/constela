/**
 * TextMate Grammar Updater
 *
 * Updates the TextMate grammar file with extracted keywords
 */

import type { ExtractionResult } from '../types.js';

/**
 * Regex special characters that need escaping
 */
const SPECIAL_CHARS = /[+*.()\[\]{}^$?\\|]/g;

/**
 * Escape regex special characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(SPECIAL_CHARS, '\\$&');
}

/**
 * Generate regex pattern for TextMate grammar
 *
 * Sorts keywords alphabetically, escapes special characters,
 * and joins with | separator.
 */
export function generateKeywordPattern(keywords: string[]): string {
  if (keywords.length === 0) {
    return '';
  }

  return keywords
    .map(escapeRegex)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
}

/**
 * Build match pattern for a given discriminator key and keyword pattern
 */
function buildMatchPattern(discriminator: string, keywordPattern: string): string {
  return `"(${discriminator})"\\s*:\\s*"(${keywordPattern})"`;
}

/**
 * TextMate grammar structure
 */
interface TextMateGrammar {
  repository: {
    'expr-key': { match: string; captures: unknown };
    'do-key': { match: string; captures: unknown };
    'node-key': { match: string; captures: unknown };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Update TextMate grammar file with new keywords
 *
 * Updates expr-key, do-key, and node-key match patterns
 * with extracted type names. Changes node-key discriminator
 * from "node" to "kind".
 */
export function updateTextMateGrammar(
  grammarContent: string,
  result: ExtractionResult
): string {
  const grammar: TextMateGrammar = JSON.parse(grammarContent);

  // Extract type names from each category
  const exprNames = result.expressions.map((e) => e.name);
  const actionNames = result.actionSteps.map((a) => a.name);
  const viewNodeNames = result.viewNodes.map((v) => v.name);

  // Generate patterns
  const exprPattern = generateKeywordPattern(exprNames);
  const actionPattern = generateKeywordPattern(actionNames);
  const viewNodePattern = generateKeywordPattern(viewNodeNames);

  // Update expr-key
  grammar.repository['expr-key'].match = buildMatchPattern('expr', exprPattern);

  // Update do-key
  grammar.repository['do-key'].match = buildMatchPattern('do', actionPattern);

  // Update node-key (change discriminator from "node" to "kind")
  grammar.repository['node-key'].match = buildMatchPattern('kind', viewNodePattern);

  // Return formatted JSON with 2-space indentation
  return JSON.stringify(grammar, null, 2);
}
