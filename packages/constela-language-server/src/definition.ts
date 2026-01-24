import type { Definition, Position } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parse, getLocation } from 'jsonc-parser';
import type { Program } from '@constela/core';
import { getWordRangeAtOffset } from './utils.js';

export function provideDefinition(
  document: TextDocument,
  position: Position
): Definition | null {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const parseErrors: import('jsonc-parser').ParseError[] = [];
  const root = parse(text, parseErrors, { allowTrailingComma: true }) as Program | null;

  if (parseErrors.length > 0 || !root) return null;

  const location = getLocation(text, offset);
  const pathStr = location.path.join('.');

  // Get the word at cursor
  const wordRange = getWordRangeAtOffset(text, offset);
  const word = text.slice(wordRange.start, wordRange.end).replace(/"/g, '');

  // State reference
  if (pathStr.includes('name') && isStateContext(text, offset)) {
    const stateOffset = findDefinition(text, 'state', word);
    if (stateOffset !== null) {
      return {
        uri: document.uri,
        range: {
          start: document.positionAt(stateOffset),
          end: document.positionAt(stateOffset + word.length),
        },
      };
    }
  }

  // Action reference
  if (pathStr.includes('action') || pathStr.includes('on')) {
    const actionOffset = findActionDefinition(text, word);
    if (actionOffset !== null) {
      return {
        uri: document.uri,
        range: {
          start: document.positionAt(actionOffset),
          end: document.positionAt(actionOffset + word.length),
        },
      };
    }
  }

  // Component reference
  if (pathStr.includes('name') && isComponentContext(text, offset)) {
    const componentOffset = findDefinition(text, 'components', word);
    if (componentOffset !== null) {
      return {
        uri: document.uri,
        range: {
          start: document.positionAt(componentOffset),
          end: document.positionAt(componentOffset + word.length),
        },
      };
    }
  }

  return null;
}

function isStateContext(text: string, offset: number): boolean {
  const before = text.slice(Math.max(0, offset - 100), offset);
  return before.includes('"expr"') && before.includes('"state"');
}

function isComponentContext(text: string, offset: number): boolean {
  const before = text.slice(Math.max(0, offset - 150), offset);
  // Check for both "node": "component" and "kind": "component" patterns
  const hasNodeComponent = before.includes('"node"') && before.includes('"component"');
  const hasKindComponent = before.includes('"kind"') && before.includes('"component"');
  return hasNodeComponent || hasKindComponent;
}

function findDefinition(text: string, section: string, name: string): number | null {
  // Find the section
  const sectionPattern = new RegExp(`"${section}"\\s*:\\s*\\{`);
  const sectionMatch = sectionPattern.exec(text);
  if (!sectionMatch) return null;

  const sectionStart = sectionMatch.index;

  // Find the name within the section
  const namePattern = new RegExp(`"${name}"\\s*:`);
  const searchText = text.slice(sectionStart);
  const nameMatch = namePattern.exec(searchText);

  if (!nameMatch) return null;

  return sectionStart + nameMatch.index + 1; // +1 to skip the quote
}

function findActionDefinition(text: string, name: string): number | null {
  // Actions are in an array with "name" property
  const pattern = new RegExp(`"name"\\s*:\\s*"${name}"`);
  const match = pattern.exec(text);

  if (!match) return null;

  // Find the start of "name" property value
  const valueStart = match.index + match[0].indexOf(name);
  return valueStart;
}
