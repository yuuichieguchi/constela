// Auto-generated from @constela/core ast.ts - DO NOT EDIT
import { CompletionItemKind } from 'vscode-languageserver';

export const EXPR_TYPES = [
  { label: 'lit', detail: 'Literal expression - represents a constant value', kind: CompletionItemKind.Value },
  { label: 'state', detail: 'State expression - references a state field', kind: CompletionItemKind.Value },
  { label: 'var', detail: 'Variable expression - references a loop variable or event data', kind: CompletionItemKind.Value },
  { label: 'bin', detail: 'Binary expression - arithmetic, comparison, or logical operation', kind: CompletionItemKind.Value },
  { label: 'not', detail: 'Not expression - logical negation', kind: CompletionItemKind.Value },
  { label: 'param', detail: 'Param expression - references a component parameter', kind: CompletionItemKind.Value },
  { label: 'cond', detail: 'Cond expression - conditional if/then/else', kind: CompletionItemKind.Value },
  { label: 'get', detail: 'Get expression - property access', kind: CompletionItemKind.Value },
  { label: 'route', detail: 'Route expression - references route parameters', kind: CompletionItemKind.Value },
  { label: 'import', detail: 'Import expression - references imported external data', kind: CompletionItemKind.Value },
  { label: 'data', detail: 'Data expression - references loaded data from data sources', kind: CompletionItemKind.Value },
  { label: 'ref', detail: 'Ref expression - references a DOM element by ref name', kind: CompletionItemKind.Value },
  { label: 'index', detail: 'Index expression - dynamic property/array access', kind: CompletionItemKind.Value },
  { label: 'style', detail: 'Style expression - references a style preset with optional variant values', kind: CompletionItemKind.Value },
  { label: 'concat', detail: 'Concat expression - concatenates multiple expressions into a string', kind: CompletionItemKind.Value },
  { label: 'validity', detail: 'Validity expression - gets form element validation state', kind: CompletionItemKind.Value },
  { label: 'call', detail: 'Call expression - calls a method on a target', kind: CompletionItemKind.Method },
  { label: 'lambda', detail: 'Lambda expression - anonymous function for array methods', kind: CompletionItemKind.Method },
  { label: 'array', detail: 'Array expression - constructs an array from expressions', kind: CompletionItemKind.Value },
];

export const ACTION_STEPS = [
  { label: 'set', detail: 'Set step - sets a state field to a new value', kind: CompletionItemKind.Function },
  { label: 'update', detail: 'Update step - performs an operation on a state field\n\nOperations and their required fields:\n- increment/decrement: Numeric operations. Optional `value` for amount (default: 1)\n- push: Add item to array. Requires `value`\n- pop: Remove last item from array. No additional fields\n- remove: Remove item from array by value or index. Requires `value`\n- toggle: Flip boolean value. No additional fields\n- merge: Shallow merge object. Requires `value` (object)\n- replaceAt: Replace array item at index. Requires `index` and `value`\n- insertAt: Insert item at array index. Requires `index` and `value`\n- splice: Delete and/or insert items. Requires `index` and `deleteCount`, optional `value` (array)', kind: CompletionItemKind.Function },
  { label: 'setPath', detail: 'SetPath step - sets a value at a specific path within a state field\n\nThis enables fine-grained state updates like `posts[5].liked = true`\nwithout re-creating the entire state.', kind: CompletionItemKind.Function },
  { label: 'fetch', detail: 'Fetch step - makes an HTTP request', kind: CompletionItemKind.Function },
  { label: 'storage', detail: 'Storage step - localStorage/sessionStorage operations', kind: CompletionItemKind.Function },
  { label: 'clipboard', detail: 'Clipboard step - clipboard API operations', kind: CompletionItemKind.Function },
  { label: 'navigate', detail: 'Navigate step - page navigation', kind: CompletionItemKind.Function },
  { label: 'import', detail: 'Import step - dynamically imports an external module\nModule name must be a static string for bundler optimization', kind: CompletionItemKind.Function },
  { label: 'call', detail: 'Call step - calls a function on an external library', kind: CompletionItemKind.Function },
  { label: 'subscribe', detail: 'Subscribe step - subscribes to an event on an object\nSubscription is auto-collected and disposed on lifecycle.onUnmount', kind: CompletionItemKind.Function },
  { label: 'dispose', detail: 'Dispose step - manually disposes a resource', kind: CompletionItemKind.Function },
  { label: 'dom', detail: 'DOM step - manipulate DOM elements (add/remove classes, attributes)', kind: CompletionItemKind.Function },
  { label: 'send', detail: 'Send step - sends data through a named WebSocket connection', kind: CompletionItemKind.Function },
  { label: 'close', detail: 'Close step - closes a named WebSocket connection', kind: CompletionItemKind.Function },
  { label: 'delay', detail: 'Delay step - executes steps after a delay (setTimeout equivalent)', kind: CompletionItemKind.Function },
  { label: 'interval', detail: 'Interval step - executes an action repeatedly (setInterval equivalent)', kind: CompletionItemKind.Function },
  { label: 'clearTimer', detail: 'ClearTimer step - clears a timer (clearTimeout/clearInterval equivalent)', kind: CompletionItemKind.Function },
  { label: 'focus', detail: 'Focus step - manages form element focus', kind: CompletionItemKind.Function },
  { label: 'if', detail: 'If step - conditional action execution', kind: CompletionItemKind.Function },
];

export const VIEW_NODES = [
  { label: 'element', detail: 'Element node - represents an HTML element', kind: CompletionItemKind.Class },
  { label: 'text', detail: 'Text node - represents text content', kind: CompletionItemKind.Class },
  { label: 'if', detail: 'If node - conditional rendering', kind: CompletionItemKind.Class },
  { label: 'each', detail: 'Each node - list rendering', kind: CompletionItemKind.Class },
  { label: 'component', detail: 'Component node - invokes a defined component', kind: CompletionItemKind.Class },
  { label: 'slot', detail: 'Slot node - placeholder for children in component definition\nFor layouts, can have an optional name for named slots', kind: CompletionItemKind.Class },
  { label: 'markdown', detail: 'Markdown node - renders markdown content', kind: CompletionItemKind.Class },
  { label: 'code', detail: 'Code node - renders syntax-highlighted code', kind: CompletionItemKind.Class },
  { label: 'portal', detail: 'Portal node - renders children to a different DOM location', kind: CompletionItemKind.Class },
];
