import type { Hover, Position } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parse, getLocation } from 'jsonc-parser';
import { MarkupKind } from 'vscode-languageserver/node.js';
import { getWordRangeAtOffset } from './utils.js';
import { EXPR_DOCS, ACTION_DOCS, VIEW_DOCS } from './generated/hover-data.js';

export function provideHover(
  document: TextDocument,
  position: Position
): Hover | null {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const parseErrors: import('jsonc-parser').ParseError[] = [];
  parse(text, parseErrors, { allowTrailingComma: true });

  if (parseErrors.length > 0) return null;

  const location = getLocation(text, offset);
  const pathStr = location.path.join('.');

  // Get the word at cursor
  const wordRange = getWordRangeAtOffset(text, offset);
  const word = text.slice(wordRange.start, wordRange.end).replace(/"/g, '');

  // Check expression types
  if (pathStr.includes('expr') && EXPR_DOCS[word]) {
    const doc = EXPR_DOCS[word];
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${word}** expression\n\n\`\`\`json\n${doc.signature}\n\`\`\`\n\n${doc.description}`,
      },
    };
  }

  // Check action types
  if ((pathStr.includes('do') || pathStr.includes('steps')) && ACTION_DOCS[word]) {
    const doc = ACTION_DOCS[word];
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${word}** action\n\n\`\`\`json\n${doc.signature}\n\`\`\`\n\n${doc.description}`,
      },
    };
  }

  // Check view types
  if ((pathStr.includes('node') || pathStr.includes('view') || pathStr.includes('children')) && VIEW_DOCS[word]) {
    const doc = VIEW_DOCS[word];
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${word}** node\n\n\`\`\`json\n${doc.signature}\n\`\`\`\n\n${doc.description}`,
      },
    };
  }

  return null;
}
