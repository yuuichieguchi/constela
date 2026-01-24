# @constela/core

Core types and validation for Constela JSON programs.

## Installation

```bash
npm install @constela/core
```

## JSON Program Structure

```json
{
  "version": "1.0",
  "route": { "path": "/", "layout": "MainLayout" },
  "imports": { "config": "./data/config.json" },
  "data": { "posts": { "type": "glob", "pattern": "content/*.mdx" } },
  "lifecycle": { "onMount": "loadData" },
  "state": { ... },
  "actions": [ ... ],
  "view": { ... },
  "components": { ... }
}
```

All fields except `version`, `state`, `actions`, and `view` are optional.

## State Types

5 supported state types:

```json
{
  "count": { "type": "number", "initial": 0 },
  "query": { "type": "string", "initial": "" },
  "items": { "type": "list", "initial": [] },
  "isVisible": { "type": "boolean", "initial": true },
  "form": { "type": "object", "initial": { "name": "", "email": "" } }
}
```

### Cookie Expression for Initial Value

String state can use a cookie expression to read initial value from cookies (SSR/SSG-safe):

```json
{
  "theme": {
    "type": "string",
    "initial": { "expr": "cookie", "key": "theme", "default": "dark" }
  }
}
```

- `key`: Cookie name to read
- `default`: Fallback value when cookie is not set
- Works in both SSR and client-side rendering
- Useful for theme persistence, user preferences, etc.

## Expression Types

17 expression types for constrained computation:

| Type | JSON Example | Description |
|------|-------------|-------------|
| `lit` | `{ "expr": "lit", "value": "Hello" }` | Literal value |
| `state` | `{ "expr": "state", "name": "count" }` | State reference |
| `var` | `{ "expr": "var", "name": "item" }` | Loop/event variable |
| `bin` | `{ "expr": "bin", "op": "+", "left": ..., "right": ... }` | Binary operation |
| `not` | `{ "expr": "not", "operand": ... }` | Logical negation |
| `param` | `{ "expr": "param", "name": "title" }` | Component parameter |
| `cond` | `{ "expr": "cond", "if": ..., "then": ..., "else": ... }` | Conditional |
| `get` | `{ "expr": "get", "base": ..., "path": "user.name" }` | Property access |
| `route` | `{ "expr": "route", "name": "id", "source": "param" }` | Route parameter |
| `import` | `{ "expr": "import", "name": "config" }` | External data |
| `data` | `{ "expr": "data", "name": "posts" }` | Build-time data |
| `ref` | `{ "expr": "ref", "name": "inputEl" }` | DOM element ref |
| `style` | `{ "expr": "style", "name": "button", "variants": {...} }` | Style reference |
| `concat` | `{ "expr": "concat", "items": [...] }` | String concatenation |
| `cookie` | `{ "expr": "cookie", "key": "theme", "default": "dark" }` | Cookie value (SSR-safe) |
| `call` | `{ "expr": "call", "target": ..., "method": "filter", "args": [...] }` | Method call |
| `lambda` | `{ "expr": "lambda", "param": "item", "body": ... }` | Anonymous function |

**Binary Operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`

**Concat Expression:**

Concatenate multiple expressions into a single string:

```json
{
  "expr": "concat",
  "items": [
    { "expr": "lit", "value": "Hello, " },
    { "expr": "var", "name": "username" },
    { "expr": "lit", "value": "!" }
  ]
}
```

- Evaluates each item and joins them as strings
- `null`/`undefined` values become empty strings
- Numbers and booleans are converted to strings

## View Node Types

8 node types for building UI:

```json
// Element node
{ "kind": "element", "tag": "div", "props": { ... }, "children": [ ... ] }

// Text node
{ "kind": "text", "value": { "expr": "state", "name": "count" } }

// Conditional node
{ "kind": "if", "condition": { ... }, "then": { ... }, "else": { ... } }

// Loop node
{ "kind": "each", "items": { "expr": "state", "name": "todos" }, "as": "item", "body": { ... } }

// Loop node with key (efficient diffing)
{ "kind": "each", "items": { ... }, "as": "item", "key": { "expr": "var", "name": "item", "path": "id" }, "body": { ... } }

// Component node
{ "kind": "component", "name": "Button", "props": { "label": { ... } } }

// Slot node (for layouts)
{ "kind": "slot" }
{ "kind": "slot", "name": "sidebar" }

// Markdown node
{ "kind": "markdown", "content": { "expr": "state", "name": "content" } }

// Code block node
{ "kind": "code", "code": { ... }, "language": { ... } }
```

## Action Step Types

14 step types for declarative actions:

```json
// Set state value
{ "do": "set", "target": "query", "value": { "expr": "lit", "value": "" } }

// Update with operation
{ "do": "update", "target": "count", "operation": "increment" }
{ "do": "update", "target": "todos", "operation": "push", "value": { ... } }

// Set nested path (fine-grained update)
{ "do": "setPath", "target": "posts", "path": [5, "liked"], "value": { "expr": "lit", "value": true } }
{ "do": "setPath", "target": "posts", "path": { "expr": "var", "name": "payload", "path": "index" }, "field": "liked", "value": { ... } }

// HTTP request
{ "do": "fetch", "url": { ... }, "method": "GET", "onSuccess": [ ... ], "onError": [ ... ] }

// Storage operation
{ "do": "storage", "operation": "get", "key": { ... }, "storage": "local" }

// Clipboard operation
{ "do": "clipboard", "operation": "write", "value": { ... } }

// Navigation
{ "do": "navigate", "url": { ... } }

// Dynamic import
{ "do": "import", "module": "chart.js", "result": "Chart" }

// External function call
{ "do": "call", "ref": "Chart", "method": "create", "args": [ ... ] }

// Event subscription
{ "do": "subscribe", "ref": "eventSource", "event": "message", "action": "handleMessage" }

// Resource disposal
{ "do": "dispose", "ref": "chartInstance" }

// DOM manipulation
{ "do": "dom", "operation": "addClass", "ref": "myElement", "value": { ... } }

// WebSocket send
{ "do": "send", "connection": "chat", "data": { "expr": "state", "name": "inputText" } }

// WebSocket close
{ "do": "close", "connection": "chat" }
```

## Connections

WebSocket connections for real-time data:

```json
{
  "connections": {
    "chat": {
      "type": "websocket",
      "url": "wss://api.example.com/ws",
      "onMessage": { "action": "handleMessage" },
      "onOpen": { "action": "connectionOpened" },
      "onClose": { "action": "connectionClosed" }
    }
  }
}
```

**Update Operations:**

| Operation | State Type | Description |
|-----------|------------|-------------|
| `increment` | number | Add to number |
| `decrement` | number | Subtract from number |
| `push` | list | Add item to end |
| `pop` | list | Remove last item |
| `remove` | list | Remove by value/index |
| `toggle` | boolean | Flip boolean |
| `merge` | object | Shallow merge |
| `replaceAt` | list | Replace at index |
| `insertAt` | list | Insert at index |
| `splice` | list | Delete/insert items |

## Lifecycle Hooks

```json
{
  "lifecycle": {
    "onMount": "loadData",
    "onUnmount": "cleanup",
    "onRouteEnter": "fetchData",
    "onRouteLeave": "saveState"
  }
}
```

## Style System

Define reusable style presets with variants (similar to CVA/Tailwind Variants):

```json
{
  "styles": {
    "button": {
      "base": "px-4 py-2 rounded font-medium",
      "variants": {
        "variant": {
          "primary": "bg-blue-500 text-white",
          "secondary": "bg-gray-200 text-gray-800"
        },
        "size": {
          "sm": "text-sm",
          "md": "text-base",
          "lg": "text-lg"
        }
      },
      "defaultVariants": {
        "variant": "primary",
        "size": "md"
      }
    }
  }
}
```

Use styles with `StyleExpr`:

```json
{
  "kind": "element",
  "tag": "button",
  "props": {
    "className": {
      "expr": "style",
      "name": "button",
      "variants": {
        "variant": { "expr": "lit", "value": "primary" },
        "size": { "expr": "state", "name": "buttonSize" }
      }
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `SCHEMA_INVALID` | JSON Schema validation error |
| `UNSUPPORTED_VERSION` | Unsupported version string |
| `UNDEFINED_STATE` | Reference to undefined state |
| `UNDEFINED_ACTION` | Reference to undefined action |
| `DUPLICATE_ACTION` | Duplicate action name |
| `VAR_UNDEFINED` | Undefined variable reference |
| `COMPONENT_NOT_FOUND` | Undefined component |
| `COMPONENT_PROP_MISSING` | Missing required prop |
| `COMPONENT_CYCLE` | Circular component reference |
| `COMPONENT_PROP_TYPE` | Prop type mismatch |
| `PARAM_UNDEFINED` | Undefined parameter |
| `OPERATION_INVALID_FOR_TYPE` | Invalid operation for state type |
| `OPERATION_MISSING_FIELD` | Missing required field for operation |
| `ROUTE_NOT_DEFINED` | Route not defined |
| `UNDEFINED_ROUTE_PARAM` | Undefined route parameter |
| `LAYOUT_MISSING_SLOT` | Layout missing slot node |
| `LAYOUT_NOT_FOUND` | Referenced layout not found |
| `INVALID_SLOT_NAME` | Invalid slot name |
| `DUPLICATE_SLOT_NAME` | Duplicate slot name |
| `DUPLICATE_DEFAULT_SLOT` | Multiple default slots |
| `SLOT_IN_LOOP` | Slot inside loop |
| `UNDEFINED_DATA_SOURCE` | Undefined data source |
| `UNDEFINED_IMPORT` | Undefined import reference |
| `UNDEFINED_REF` | Undefined element ref |
| `INVALID_STORAGE_OPERATION` | Invalid storage operation |
| `INVALID_CLIPBOARD_OPERATION` | Invalid clipboard operation |
| `INVALID_NAVIGATE_TARGET` | Invalid navigate target |
| `UNDEFINED_STYLE` | Reference to undefined style preset |
| `UNDEFINED_VARIANT` | Reference to undefined style variant |

### Error Suggestions

Errors for undefined references include "Did you mean?" suggestions using Levenshtein distance:

```typescript
import { findSimilarNames } from '@constela/core';

const candidates = new Set(['counter', 'items', 'query']);
const similar = findSimilarNames('count', candidates);
// Returns: ['counter'] - similar names within distance 2
```

## Internal API

> For framework developers only.

### validateAst

```typescript
import { validateAst } from '@constela/core';

const result = validateAst(input);
if (result.ok) {
  console.log('Valid program:', result.program);
} else {
  console.error('Validation failed:', result.error);
}
```

### Type Guards

48 type guard functions for runtime type checking:

```typescript
import {
  isLitExpr, isStateExpr, isVarExpr, isBinExpr, isConcatExpr,
  isElementNode, isTextNode, isIfNode, isEachNode,
  isSetStep, isUpdateStep, isFetchStep,
  isNumberField, isStringField, isListField,
} from '@constela/core';
```

### ConstelaError

```typescript
import { ConstelaError } from '@constela/core';

const error = new ConstelaError(
  'UNDEFINED_STATE',
  'State "count" is not defined',
  '/view/children/0/props/onClick'
);
```

## License

MIT
