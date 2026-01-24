import type { Hover, Position } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parse, getLocation } from 'jsonc-parser';
import { MarkupKind } from 'vscode-languageserver/node.js';
import { getWordRangeAtOffset } from './utils.js';

const EXPR_DOCS: Record<string, { signature: string; description: string }> = {
  lit: { signature: '{ "expr": "lit", "value": any }', description: 'A literal value (string, number, boolean, null, array, or object).' },
  state: { signature: '{ "expr": "state", "name": string }', description: 'Reference to a state field. Reactive - UI updates when state changes.' },
  var: { signature: '{ "expr": "var", "name": string }', description: 'Reference to a local variable (e.g., loop variable in `each`).' },
  bin: { signature: '{ "expr": "bin", "op": string, "left": Expr, "right": Expr }', description: 'Binary expression. Operators: +, -, *, /, %, ==, !=, <, <=, >, >=, &&, ||' },
  not: { signature: '{ "expr": "not", "value": Expr }', description: 'Logical NOT expression.' },
  cond: { signature: '{ "expr": "cond", "if": Expr, "then": Expr, "else": Expr }', description: 'Conditional expression (ternary).' },
  get: { signature: '{ "expr": "get", "base": Expr, "path": string }', description: 'Property access on an object. Path can be dot-separated.' },
  concat: { signature: '{ "expr": "concat", "parts": Expr[] }', description: 'String concatenation.' },
  route: { signature: '{ "expr": "route", "part": "params" | "query" | "path" }', description: 'Access route parameters, query string, or current path.' },
  import: { signature: '{ "expr": "import", "name": string }', description: 'Reference to an imported module.' },
  data: { signature: '{ "expr": "data", "name": string }', description: 'Reference to a build-time data source.' },
  ref: { signature: '{ "expr": "ref", "name": string }', description: 'Reference to a DOM element by ref name.' },
  index: { signature: '{ "expr": "index" }', description: 'Current index in an `each` loop.' },
  style: { signature: '{ "expr": "style", "name": string, "variant"?: string }', description: 'Reference to a style preset.' },
  param: { signature: '{ "expr": "param", "name": string }', description: 'Reference to a component prop/parameter.' },
  validity: { signature: '{ "expr": "validity", "ref": string, "property"?: string }', description: 'Form element validity state.' },
};

const ACTION_DOCS: Record<string, { signature: string; description: string }> = {
  set: { signature: '{ "do": "set", "name": string, "value": Expr }', description: 'Set a state field to a new value.' },
  update: { signature: '{ "do": "update", "name": string, "with": "push" | "filter" | ... }', description: 'Update a state field using a built-in function.' },
  setPath: { signature: '{ "do": "setPath", "name": string, "path": Expr, "value": Expr }', description: 'Set a nested path within a state field.' },
  fetch: { signature: '{ "do": "fetch", "url": Expr, "method"?: string, ... }', description: 'Make an HTTP request.' },
  navigate: { signature: '{ "do": "navigate", "to": string | Expr }', description: 'Navigate to a route.' },
  storage: { signature: '{ "do": "storage", "action": "get" | "set" | "remove", ... }', description: 'Interact with localStorage.' },
  clipboard: { signature: '{ "do": "clipboard", "action": "write" | "read", ... }', description: 'Interact with the clipboard.' },
  delay: { signature: '{ "do": "delay", "ms": number, "then": Step[] }', description: 'Delay execution of steps.' },
  interval: { signature: '{ "do": "interval", "ms": number, "steps": Step[], "timerId": string }', description: 'Execute steps at an interval.' },
  clearTimer: { signature: '{ "do": "clearTimer", "timerId": string }', description: 'Clear a timer by ID.' },
  focus: { signature: '{ "do": "focus", "ref": string }', description: 'Focus a DOM element by ref.' },
  dom: { signature: '{ "do": "dom", "action": "addClass" | "removeClass" | ..., "ref": string, ... }', description: 'DOM manipulation actions.' },
  if: { signature: '{ "do": "if", "cond": Expr, "then": Step[], "else"?: Step[] }', description: 'Conditional action execution.' },
  call: { signature: '{ "do": "call", "import": string, "method": string, "args"?: Expr[] }', description: 'Call a method on an imported module.' },
  import: { signature: '{ "do": "import", "from": string, "name": string }', description: 'Dynamically import a module.' },
  subscribe: { signature: '{ "do": "subscribe", "import": string, "method": string, ... }', description: 'Subscribe to an observable.' },
  dispose: { signature: '{ "do": "dispose", "subscriptionId": string }', description: 'Dispose a subscription.' },
  send: { signature: '{ "do": "send", "connectionId": string, "data": Expr }', description: 'Send data over WebSocket.' },
  close: { signature: '{ "do": "close", "connectionId": string }', description: 'Close a WebSocket connection.' },
};

const VIEW_DOCS: Record<string, { signature: string; description: string }> = {
  element: { signature: '{ "node": "element", "tag": string, "props"?: {...}, "children"?: [...] }', description: 'An HTML element node.' },
  text: { signature: '{ "node": "text", "content": Expr }', description: 'A text node with dynamic content.' },
  if: { signature: '{ "node": "if", "cond": Expr, "then": ViewNode, "else"?: ViewNode }', description: 'Conditional rendering.' },
  each: { signature: '{ "node": "each", "items": Expr, "as": string, "template": ViewNode }', description: 'Loop rendering over a list.' },
  component: { signature: '{ "node": "component", "name": string, "props"?: {...} }', description: 'Render a component instance.' },
  slot: { signature: '{ "node": "slot", "name"?: string }', description: 'Slot placeholder for component children.' },
  markdown: { signature: '{ "node": "markdown", "content": Expr }', description: 'Render Markdown content.' },
  code: { signature: '{ "node": "code", "content": Expr, "language"?: string }', description: 'Render a code block.' },
  portal: { signature: '{ "node": "portal", "target": string, "children": ViewNode[] }', description: 'Render children into a target element.' },
};

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
