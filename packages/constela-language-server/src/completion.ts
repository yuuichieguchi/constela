import type { CompletionItem, Position } from 'vscode-languageserver/node.js';
import { CompletionItemKind } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parse, getLocation } from 'jsonc-parser';
import type { Program } from '@constela/core';

const EXPR_TYPES = [
  { label: 'lit', detail: 'Literal value', kind: CompletionItemKind.Value },
  { label: 'state', detail: 'State reference', kind: CompletionItemKind.Variable },
  { label: 'var', detail: 'Local variable', kind: CompletionItemKind.Variable },
  { label: 'bin', detail: 'Binary expression', kind: CompletionItemKind.Operator },
  { label: 'not', detail: 'Logical NOT', kind: CompletionItemKind.Operator },
  { label: 'cond', detail: 'Conditional expression', kind: CompletionItemKind.Keyword },
  { label: 'get', detail: 'Property access', kind: CompletionItemKind.Property },
  { label: 'concat', detail: 'String concatenation', kind: CompletionItemKind.Function },
  { label: 'route', detail: 'Route parameter', kind: CompletionItemKind.Variable },
  { label: 'import', detail: 'Import reference', kind: CompletionItemKind.Module },
  { label: 'data', detail: 'Data source reference', kind: CompletionItemKind.Reference },
  { label: 'ref', detail: 'Element reference', kind: CompletionItemKind.Reference },
  { label: 'index', detail: 'Loop index', kind: CompletionItemKind.Variable },
  { label: 'style', detail: 'Style reference', kind: CompletionItemKind.Color },
  { label: 'validity', detail: 'Form validity', kind: CompletionItemKind.Property },
  { label: 'param', detail: 'Component parameter', kind: CompletionItemKind.Variable },
];

const ACTION_STEPS = [
  { label: 'set', detail: 'Set state value', kind: CompletionItemKind.Method },
  { label: 'update', detail: 'Update state with function', kind: CompletionItemKind.Method },
  { label: 'setPath', detail: 'Set nested state path', kind: CompletionItemKind.Method },
  { label: 'fetch', detail: 'HTTP fetch', kind: CompletionItemKind.Method },
  { label: 'navigate', detail: 'Navigate to route', kind: CompletionItemKind.Method },
  { label: 'storage', detail: 'LocalStorage operation', kind: CompletionItemKind.Method },
  { label: 'clipboard', detail: 'Clipboard operation', kind: CompletionItemKind.Method },
  { label: 'delay', detail: 'Delay execution', kind: CompletionItemKind.Method },
  { label: 'interval', detail: 'Set interval', kind: CompletionItemKind.Method },
  { label: 'clearTimer', detail: 'Clear timer', kind: CompletionItemKind.Method },
  { label: 'focus', detail: 'Focus element', kind: CompletionItemKind.Method },
  { label: 'dom', detail: 'DOM manipulation', kind: CompletionItemKind.Method },
  { label: 'if', detail: 'Conditional step', kind: CompletionItemKind.Keyword },
  { label: 'call', detail: 'Call external function', kind: CompletionItemKind.Method },
  { label: 'import', detail: 'Dynamic import', kind: CompletionItemKind.Module },
  { label: 'subscribe', detail: 'Subscribe to observable', kind: CompletionItemKind.Method },
  { label: 'dispose', detail: 'Dispose subscription', kind: CompletionItemKind.Method },
  { label: 'send', detail: 'Send WebSocket message', kind: CompletionItemKind.Method },
  { label: 'close', detail: 'Close WebSocket', kind: CompletionItemKind.Method },
];

const VIEW_NODES = [
  { label: 'element', detail: 'HTML element', kind: CompletionItemKind.Class },
  { label: 'text', detail: 'Text node', kind: CompletionItemKind.Text },
  { label: 'if', detail: 'Conditional rendering', kind: CompletionItemKind.Keyword },
  { label: 'each', detail: 'Loop rendering', kind: CompletionItemKind.Keyword },
  { label: 'component', detail: 'Component instance', kind: CompletionItemKind.Class },
  { label: 'slot', detail: 'Slot placeholder', kind: CompletionItemKind.Class },
  { label: 'markdown', detail: 'Markdown content', kind: CompletionItemKind.Text },
  { label: 'code', detail: 'Code block', kind: CompletionItemKind.Snippet },
  { label: 'portal', detail: 'Portal to target', kind: CompletionItemKind.Class },
];

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
