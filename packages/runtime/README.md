# @constela/runtime

Executes Constela JSON programs in the browser with fine-grained reactivity.

## Installation

```bash
npm install @constela/runtime
```

## How It Works

Your JSON program:

```json
{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [
    {
      "name": "increment",
      "steps": [{ "do": "update", "target": "count", "operation": "increment" }]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "button",
    "props": { "onClick": { "event": "click", "action": "increment" } },
    "children": [{ "kind": "text", "value": { "expr": "state", "name": "count" } }]
  }
}
```

Becomes an interactive app with:
- **Reactive state management** - Signal-based updates without virtual DOM
- **Efficient DOM updates** - Fine-grained reactivity
- **Event handling** - Declarative action binding

## Features

### Fine-grained State Updates (setPath)

Update nested values without replacing entire arrays:

```json
{
  "do": "setPath",
  "target": "posts",
  "path": [5, "liked"],
  "value": { "expr": "lit", "value": true }
}
```

Dynamic path with variables:

```json
{
  "do": "setPath",
  "target": "posts",
  "path": { "expr": "var", "name": "payload", "path": "index" },
  "field": "liked",
  "value": { "expr": "lit", "value": true }
}
```

### String Concatenation (concat)

Build dynamic strings from multiple expressions:

```json
{
  "expr": "concat",
  "items": [
    { "expr": "lit", "value": "/users/" },
    { "expr": "var", "name": "userId" },
    { "expr": "lit", "value": "/profile" }
  ]
}
```

Useful for:
- Dynamic URLs: `/api/posts/{id}`
- CSS class names: `btn btn-{variant}`
- Formatted messages: `Hello, {name}!`

### Object Payloads for Event Handlers

Pass multiple values to actions with object-shaped payloads:

```json
{
  "kind": "element",
  "tag": "button",
  "props": {
    "onClick": {
      "event": "click",
      "action": "toggleLike",
      "payload": {
        "index": { "expr": "var", "name": "index" },
        "postId": { "expr": "var", "name": "post", "path": "id" },
        "currentLiked": { "expr": "var", "name": "post", "path": "liked" }
      }
    }
  }
}
```

Each expression field in the payload is evaluated when the event fires. The action receives the evaluated object:

```json
{ "index": 5, "postId": "abc123", "currentLiked": true }
```

### Key-based List Diffing

Efficient list updates - only changed items re-render:

```json
{
  "kind": "each",
  "items": { "expr": "state", "name": "posts" },
  "as": "post",
  "key": { "expr": "var", "name": "post", "path": "id" },
  "body": { ... }
}
```

Benefits:
- Add/remove items: Only affected DOM nodes change
- Reorder: DOM nodes move without recreation
- Update item: Only that item re-renders
- Input state preserved during updates

### WebSocket Connections

Real-time data with declarative WebSocket:

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

Send messages:

```json
{ "do": "send", "connection": "chat", "data": { "expr": "state", "name": "inputText" } }
```

Close connection:

```json
{ "do": "close", "connection": "chat" }
```

### Call/Lambda Expressions

Call methods on arrays, strings, Math, and Date:

```json
// Filter completed todos
{
  "expr": "call",
  "target": { "expr": "state", "name": "todos" },
  "method": "filter",
  "args": [{
    "expr": "lambda",
    "param": "todo",
    "body": { "expr": "get", "base": { "expr": "var", "name": "todo" }, "path": "completed" }
  }]
}

// Get array length
{ "expr": "call", "target": { "expr": "state", "name": "items" }, "method": "length" }

// Math.max
{
  "expr": "call",
  "target": { "expr": "var", "name": "Math" },
  "method": "max",
  "args": [{ "expr": "lit", "value": 10 }, { "expr": "state", "name": "count" }]
}
```

**Supported methods:**
- Array: length, at, includes, slice, indexOf, join, filter, map, find, findIndex, some, every
- String: length, charAt, substring, slice, split, trim, toUpperCase, toLowerCase, replace, includes, startsWith, endsWith, indexOf
- Math: min, max, round, floor, ceil, abs, sqrt, pow, random, sin, cos, tan
- Date: now, parse, toISOString, getTime, getFullYear, getMonth, getDate, getHours, getMinutes, getSeconds, getMilliseconds

### Array Expression

Construct arrays dynamically from expressions:

```json
{
  "expr": "array",
  "elements": [
    { "expr": "var", "name": "basicSetup" },
    { "expr": "call", "target": { "expr": "var", "name": "json" }, "method": "apply", "args": [] }
  ]
}
```

Use cases:
- CodeMirror extensions: `[basicSetup, json()]`
- Dynamic configuration arrays
- Combining variables, literals, and call results in a single array

### Markdown Rendering

```json
{
  "kind": "markdown",
  "content": { "expr": "state", "name": "markdownContent" }
}
```

Rendered with [marked](https://marked.js.org/) and sanitized with [DOMPurify](https://github.com/cure53/DOMPurify).

### Code Blocks

```json
{
  "kind": "code",
  "code": { "expr": "lit", "value": "const x: number = 42;" },
  "language": { "expr": "lit", "value": "typescript" }
}
```

Features:
- Syntax highlighting with [Shiki](https://shiki.style/)
- Dual theme support (light/dark)
- Built-in copy button

### Hydration

Server-rendered HTML is hydrated on the client without DOM reconstruction:

```json
{
  "version": "1.0",
  "state": { "theme": { "type": "string", "initial": "light" } },
  "lifecycle": {
    "onMount": "loadTheme"
  },
  "actions": [
    {
      "name": "loadTheme",
      "steps": [
        {
          "do": "storage",
          "operation": "get",
          "key": { "expr": "lit", "value": "theme" },
          "storage": "local",
          "result": "savedTheme",
          "onSuccess": [
            { "do": "set", "target": "theme", "value": { "expr": "var", "name": "savedTheme" } }
          ]
        }
      ]
    }
  ],
  "view": { ... }
}
```

## Security

The runtime includes security measures:

- **Prototype Pollution Prevention** - Blocks `__proto__`, `constructor`, `prototype`
- **Safe Globals** - Only exposes `JSON`, `Math`, `Date`, `Object`, `Array`, `String`, `Number`, `Boolean`, `console`
- **HTML Sanitization** - DOMPurify for Markdown content

## Internal API

> For framework developers only. End users should use the CLI.

### createApp

```typescript
import { createApp } from '@constela/runtime';

const app = createApp(compiledProgram, document.getElementById('app'));

// Cleanup
app.destroy();
```

### hydrateApp

```typescript
import { hydrateApp } from '@constela/runtime';

const app = hydrateApp({
  program: compiledProgram,
  mount: document.getElementById('app'),
  route: { params: { id: '123' }, query: new URLSearchParams(), path: '/users/123' },
  imports: { config: { apiUrl: 'https://api.example.com' } }
});
```

### AppInstance

```typescript
interface AppInstance {
  destroy(): void;
  setState(name: string, value: unknown): void;
  getState(name: string): unknown;
  subscribe(name: string, fn: (value: unknown) => void): () => void;
}
```

### Reactive Primitives

```typescript
import { createSignal, createEffect, createComputed } from '@constela/runtime';

const count = createSignal(0);
count.get();  // Read
count.set(1); // Write

// Computed values with automatic dependency tracking
const doubled = createComputed(() => count.get() * 2);
doubled.get(); // Returns memoized value

const cleanup = createEffect(() => {
  console.log(`Count: ${count.get()}`);
});
```

### TypedStateStore (TypeScript)

Type-safe state access for TypeScript developers:

```typescript
import { createTypedStateStore } from '@constela/runtime';

interface AppState {
  posts: { id: number; liked: boolean }[];
  filter: string;
}

const state = createTypedStateStore<AppState>({
  posts: { type: 'list', initial: [] },
  filter: { type: 'string', initial: '' },
});

state.get('posts');  // Type: { id: number; liked: boolean }[]
state.set('filter', 'recent'); // OK
state.set('filter', 123);      // TypeScript error
```

## License

MIT
