import type { CompletionItem, Position } from 'vscode-languageserver/node.js';
import { CompletionItemKind } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parse, getLocation } from 'jsonc-parser';
import type { Program } from '@constela/core';
import { EXPR_TYPES, ACTION_STEPS, VIEW_NODES } from './generated/completion-data.js';

export function provideCompletion(
  document: TextDocument,
  position: Position
): CompletionItem[] {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const parseErrors: import('jsonc-parser').ParseError[] = [];
  const root = parse(text, parseErrors, { allowTrailingComma: true });

  if (!root) return [];

  const location = getLocation(text, offset);
  const context = analyzeContext(location.path, text, offset);

  switch (context) {
    case 'expr-type':
      return EXPR_TYPES;
    case 'action-step-type':
      return ACTION_STEPS;
    case 'view-node-type':
      return VIEW_NODES;
    case 'state-name':
      return extractStateNames(root as Program);
    case 'action-name':
      return extractActionNames(root as Program);
    case 'component-name':
      return extractComponentNames(root as Program);
    default:
      return [];
  }
}

type CompletionContext =
  | 'expr-type'
  | 'action-step-type'
  | 'view-node-type'
  | 'state-name'
  | 'action-name'
  | 'component-name'
  | 'unknown';

function analyzeContext(nodePath: (string | number)[], text: string, offset: number): CompletionContext {
  const pathStr = nodePath.join('.');
  const lastSegment = nodePath[nodePath.length - 1];

  // Use a larger window for text-based context detection
  const beforeCursor = text.slice(Math.max(0, offset - 150), offset);

  // Check for reference contexts FIRST (more specific)
  // State reference: inside { "expr": "state", "name": "|CURSOR|" }
  if (lastSegment === 'name' && beforeCursor.includes('"expr"') && beforeCursor.includes('"state"')) {
    return 'state-name';
  }

  // Action reference: inside { "action": "|CURSOR|" } or { "on*": { "action": "|CURSOR|" } }
  if (lastSegment === 'action' || (beforeCursor.includes('"action"') && beforeCursor.includes(':'))) {
    // Make sure we're after "action": and not in a different context
    const actionMatch = beforeCursor.match(/"action"\s*:\s*"?$/);
    if (actionMatch) {
      return 'action-name';
    }
  }

  // Component reference: inside { "kind": "component", "name": "|CURSOR|" } or { "node": "component", "name": "|CURSOR|" }
  if (lastSegment === 'name') {
    const hasComponentKind = beforeCursor.includes('"kind"') && beforeCursor.includes('"component"');
    const hasComponentNode = beforeCursor.includes('"node"') && beforeCursor.includes('"component"');
    if (hasComponentKind || hasComponentNode) {
      return 'component-name';
    }
  }

  // Check if we're typing the value of an "expr" key (for expression types)
  if (lastSegment === 'expr' || pathStr.endsWith('.expr')) {
    return 'expr-type';
  }

  // Check if we're typing the value of a "do" key (for action step types)
  if (lastSegment === 'do' || pathStr.endsWith('.do')) {
    return 'action-step-type';
  }

  // Check if we're typing the value of a "node" or "kind" key in view context (for view node types)
  if (lastSegment === 'node' || lastSegment === 'kind') {
    // Check if we're in view/children context
    if (pathStr.includes('view') || pathStr.includes('children') || pathStr.includes('template')) {
      return 'view-node-type';
    }
  }

  return 'unknown';
}

function extractStateNames(program: Program): CompletionItem[] {
  if (!program.state) return [];
  return Object.keys(program.state).map((name) => ({
    label: name,
    kind: CompletionItemKind.Variable,
    detail: 'State field',
  }));
}

function extractActionNames(program: Program): CompletionItem[] {
  if (!program.actions) return [];
  return program.actions.map((action) => ({
    label: action.name,
    kind: CompletionItemKind.Function,
    detail: 'Action',
  }));
}

function extractComponentNames(program: Program): CompletionItem[] {
  if (!program.components) return [];
  return Object.keys(program.components).map((name) => ({
    label: name,
    kind: CompletionItemKind.Class,
    detail: 'Component',
  }));
}
