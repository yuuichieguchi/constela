// Auto-generated from @constela/core ast.ts - DO NOT EDIT

export const EXPR_DOCS: Record<string, { signature: string; description: string }> = {
  lit: {
    signature: '{ "expr": "lit", "value": string | number | boolean | null | unknown[] }',
    description: 'Literal expression - represents a constant value',
  },
  state: {
    signature: '{ "expr": "state", "name": string, "path"?: string }',
    description: 'State expression - references a state field',
  },
  var: {
    signature: '{ "expr": "var", "name": string, "path"?: string }',
    description: 'Variable expression - references a loop variable or event data',
  },
  bin: {
    signature: '{ "expr": "bin", "op": BinaryOperator, "left": Expression, "right": Expression }',
    description: 'Binary expression - arithmetic, comparison, or logical operation',
  },
  not: {
    signature: '{ "expr": "not", "operand": Expression }',
    description: 'Not expression - logical negation',
  },
  param: {
    signature: '{ "expr": "param", "name": string, "path"?: string }',
    description: 'Param expression - references a component parameter',
  },
  cond: {
    signature: '{ "expr": "cond", "if": Expression, "then": Expression, "else": Expression }',
    description: 'Cond expression - conditional if/then/else',
  },
  get: {
    signature: '{ "expr": "get", "base": Expression, "path": string }',
    description: 'Get expression - property access',
  },
  route: {
    signature: '{ "expr": "route", "name": string, "source"?: "param\' | \'query\' | \'path" }',
    description: 'Route expression - references route parameters',
  },
  import: {
    signature: '{ "expr": "import", "name": string, "path"?: string }',
    description: 'Import expression - references imported external data',
  },
  data: {
    signature: '{ "expr": "data", "name": string, "path"?: string }',
    description: 'Data expression - references loaded data from data sources',
  },
  ref: {
    signature: '{ "expr": "ref", "name": string }',
    description: 'Ref expression - references a DOM element by ref name',
  },
  index: {
    signature: '{ "expr": "index", "base": Expression, "key": Expression }',
    description: 'Index expression - dynamic property/array access',
  },
  style: {
    signature: '{ "expr": "style", "name": string, "variants"?: Record<string, Expression> }',
    description: 'Style expression - references a style preset with optional variant values',
  },
  concat: {
    signature: '{ "expr": "concat", "items": Expression[] }',
    description: 'Concat expression - concatenates multiple expressions into a string',
  },
  validity: {
    signature: '{ "expr": "validity", "ref": string, "property"?: ValidityProperty }',
    description: 'Validity expression - gets form element validation state',
  },
  call: {
    signature: '{ "expr": "call", "target": Expression, "method": string, "args"?: Expression[] }',
    description: 'Call expression - calls a method on a target',
  },
  lambda: {
    signature: '{ "expr": "lambda", "param": string, "index"?: string, "body": Expression }',
    description: 'Lambda expression - anonymous function for array methods',
  },
  array: {
    signature: '{ "expr": "array", "elements": Expression[] }',
    description: 'Array expression - constructs an array from expressions',
  },
};

export const ACTION_DOCS: Record<string, { signature: string; description: string }> = {
  set: {
    signature: '{ "do": "set", "target": string, "value": Expression }',
    description: 'Set step - sets a state field to a new value',
  },
  update: {
    signature: '{ "do": "update", "target": string, "operation": UpdateOperation, "value"?: Expression, "index"?: Expression, "deleteCount"?: Expression }',
    description: 'Update step - performs an operation on a state field\n\nOperations and their required fields:\n- increment/decrement: Numeric operations. Optional `value` for amount (default: 1)\n- push: Add item to array. Requires `value`\n- pop: Remove last item from array. No additional fields\n- remove: Remove item from array by value or index. Requires `value`\n- toggle: Flip boolean value. No additional fields\n- merge: Shallow merge object. Requires `value` (object)\n- replaceAt: Replace array item at index. Requires `index` and `value`\n- insertAt: Insert item at array index. Requires `index` and `value`\n- splice: Delete and/or insert items. Requires `index` and `deleteCount`, optional `value` (array)',
  },
  setPath: {
    signature: '{ "do": "setPath", "target": string, "path": Expression, "value": Expression }',
    description: 'SetPath step - sets a value at a specific path within a state field\n\nThis enables fine-grained state updates like `posts[5].liked = true`\nwithout re-creating the entire state.',
  },
  fetch: {
    signature: '{ "do": "fetch", "url": Expression, "method"?: HttpMethod, "body"?: Expression, "result"?: string, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Fetch step - makes an HTTP request',
  },
  storage: {
    signature: '{ "do": "storage", "operation": StorageOperation, "key": Expression, "value"?: Expression, "storage": StorageType, "result"?: string, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Storage step - localStorage/sessionStorage operations',
  },
  clipboard: {
    signature: '{ "do": "clipboard", "operation": ClipboardOperation, "value"?: Expression, "result"?: string, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Clipboard step - clipboard API operations',
  },
  navigate: {
    signature: '{ "do": "navigate", "url": Expression, "target"?: NavigateTarget, "replace"?: boolean }',
    description: 'Navigate step - page navigation',
  },
  import: {
    signature: '{ "do": "import", "module": string, "result": string, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Import step - dynamically imports an external module\nModule name must be a static string for bundler optimization',
  },
  call: {
    signature: '{ "do": "call", "target": Expression, "args"?: Expression[], "result"?: string, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Call step - calls a function on an external library',
  },
  subscribe: {
    signature: '{ "do": "subscribe", "target": Expression, "event": string, "action": string }',
    description: 'Subscribe step - subscribes to an event on an object\nSubscription is auto-collected and disposed on lifecycle.onUnmount',
  },
  dispose: {
    signature: '{ "do": "dispose", "target": Expression }',
    description: 'Dispose step - manually disposes a resource',
  },
  dom: {
    signature: '{ "do": "dom", "operation": "addClass\' | \'removeClass\' | \'toggleClass\' | \'setAttribute\' | \'removeAttribute", "selector": Expression, "value"?: Expression, "attribute"?: string }',
    description: 'DOM step - manipulate DOM elements (add/remove classes, attributes)',
  },
  send: {
    signature: '{ "do": "send", "connection": string, "data": Expression }',
    description: 'Send step - sends data through a named WebSocket connection',
  },
  close: {
    signature: '{ "do": "close", "connection": string }',
    description: 'Close step - closes a named WebSocket connection',
  },
  delay: {
    signature: '{ "do": "delay", "ms": Expression, "then": ActionStep[], "result"?: string }',
    description: 'Delay step - executes steps after a delay (setTimeout equivalent)',
  },
  interval: {
    signature: '{ "do": "interval", "ms": Expression, "action": string, "result"?: string }',
    description: 'Interval step - executes an action repeatedly (setInterval equivalent)',
  },
  clearTimer: {
    signature: '{ "do": "clearTimer", "target": Expression }',
    description: 'ClearTimer step - clears a timer (clearTimeout/clearInterval equivalent)',
  },
  focus: {
    signature: '{ "do": "focus", "target": Expression, "operation": FocusOperation, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Focus step - manages form element focus',
  },
  if: {
    signature: '{ "do": "if", "condition": Expression, "then": ActionStep[], "else"?: ActionStep[] }',
    description: 'If step - conditional action execution',
  },
  generate: {
    signature: '{ "do": "generate", "provider": AiProviderType, "prompt": Expression, "output": AiOutputType, "result": string, "model"?: string, "onSuccess"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'Generate step - generates DSL using AI at runtime',
  },
  sseConnect: {
    signature: '{ "do": "sseConnect", "connection": string, "url": Expression, "eventTypes"?: string[], "reconnect"?: ReconnectConfig, "onOpen"?: ActionStep[], "onMessage"?: ActionStep[], "onError"?: ActionStep[] }',
    description: 'SSE connect step - establishes a Server-Sent Events connection',
  },
  sseClose: {
    signature: '{ "do": "sseClose", "connection": string }',
    description: 'SSE close step - closes a named SSE connection',
  },
  optimistic: {
    signature: '{ "do": "optimistic", "target": string, "path"?: Expression, "value": Expression, "result"?: string, "timeout"?: number }',
    description: 'Optimistic step - applies optimistic UI update',
  },
  confirm: {
    signature: '{ "do": "confirm", "id": Expression }',
    description: 'Confirm step - confirms an optimistic update',
  },
  reject: {
    signature: '{ "do": "reject", "id": Expression }',
    description: 'Reject step - rejects an optimistic update and rolls back',
  },
  bind: {
    signature: '{ "do": "bind", "connection": string, "eventType"?: string, "target": string, "path"?: Expression, "transform"?: Expression, "patch"?: boolean }',
    description: 'Bind step - binds connection messages to state',
  },
  unbind: {
    signature: '{ "do": "unbind", "connection": string, "target": string }',
    description: 'Unbind step - removes a binding',
  },
};

export const VIEW_DOCS: Record<string, { signature: string; description: string }> = {
  element: {
    signature: '{ "kind": "element", "tag": string, "ref"?: string, "props"?: Record<string, Expression | EventHandler>, "children"?: ViewNode[] }',
    description: 'Element node - represents an HTML element',
  },
  text: {
    signature: '{ "kind": "text", "value": Expression }',
    description: 'Text node - represents text content',
  },
  if: {
    signature: '{ "kind": "if", "condition": Expression, "then": ViewNode, "else"?: ViewNode }',
    description: 'If node - conditional rendering',
  },
  each: {
    signature: '{ "kind": "each", "items": Expression, "as": string, "index"?: string, "key"?: Expression, "body": ViewNode }',
    description: 'Each node - list rendering',
  },
  component: {
    signature: '{ "kind": "component", "name": string, "props"?: Record<string, Expression>, "children"?: ViewNode[] }',
    description: 'Component node - invokes a defined component',
  },
  slot: {
    signature: '{ "kind": "slot", "name"?: string }',
    description: 'Slot node - placeholder for children in component definition\nFor layouts, can have an optional name for named slots',
  },
  markdown: {
    signature: '{ "kind": "markdown", "content": Expression }',
    description: 'Markdown node - renders markdown content',
  },
  code: {
    signature: '{ "kind": "code", "language": Expression, "content": Expression }',
    description: 'Code node - renders syntax-highlighted code',
  },
  portal: {
    signature: '{ "kind": "portal", "target": \'body\' | \'head\' | string, "children": ViewNode[] }',
    description: 'Portal node - renders children to a different DOM location',
  },
  island: {
    signature: '{ "kind": "island", "id": string, "strategy": IslandStrategy, "strategyOptions"?: IslandStrategyOptions, "content": ViewNode, "state"?: Record<string, StateField>, "actions"?: ActionDefinition[] }',
    description: 'Island node - represents an interactive island in the Islands Architecture',
  },
  suspense: {
    signature: '{ "kind": "suspense", "id": string, "fallback": ViewNode, "content": ViewNode }',
    description: 'Suspense node - represents an async boundary with loading fallback',
  },
  errorBoundary: {
    signature: '{ "kind": "errorBoundary", "fallback": ViewNode, "content": ViewNode }',
    description: 'Error boundary node - catches errors and displays fallback UI',
  },
};
