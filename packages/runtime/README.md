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

### Component Local State

Components can have their own independent local state and actions:

```json
{
  "components": {
    "Counter": {
      "localState": {
        "count": { "type": "number", "initial": 0 }
      },
      "localActions": [
        {
          "name": "increment",
          "steps": [{ "do": "update", "target": "count", "operation": "increment" }]
        }
      ],
      "view": {
        "kind": "element",
        "tag": "button",
        "props": { "onClick": { "event": "click", "action": "increment" } },
        "children": [
          { "kind": "text", "value": { "expr": "state", "name": "count" } }
        ]
      }
    }
  }
}
```

Features:
- Each instance has independent state
- Local actions operate on local state only
- `state` expressions check local state first, then fall back to global
- Supported steps: `set`, `update`, `setPath`

Use cases: Accordions, dropdowns, form fields, toggles, tooltips

### Transition System

Add CSS class-based enter/exit animations to `if` nodes:

```json
{
  "kind": "if",
  "condition": { "expr": "state", "name": "showSuccess" },
  "then": {
    "kind": "element",
    "tag": "div",
    "props": { "className": { "expr": "lit", "value": "message" } },
    "children": [
      { "kind": "text", "value": { "expr": "lit", "value": "Success!" } }
    ]
  },
  "transition": {
    "enter": "fade-enter",
    "enterActive": "fade-enter-active",
    "exit": "fade-exit",
    "exitActive": "fade-exit-active",
    "duration": 300
  }
}
```

**CSS Example:**

```css
.fade-enter { opacity: 0; }
.fade-enter-active { transition: opacity 300ms ease; opacity: 1; }
.fade-exit { opacity: 1; }
.fade-exit-active { transition: opacity 300ms ease; opacity: 0; }
```

**Enter flow:** Element created → `enter` class added → next frame: `enter` removed, `enterActive` added → transition ends: `enterActive` removed.

**Exit flow:** `exit` class added → next frame: `exit` removed, `exitActive` added → transition ends: element removed from DOM.

- Transitions are client-side only (SSR renders without transition classes)
- Fast condition toggling is handled with a cancel mechanism
- `transitionend` events from child elements are ignored (bubble guard)

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

## Theme Provider

Manage application theming with reactive CSS variables:

```typescript
import { createThemeProvider } from '@constela/runtime';

const theme = createThemeProvider({
  config: {
    mode: 'system',
    colors: {
      primary: 'hsl(220 90% 56%)',
      background: 'hsl(0 0% 100%)',
    },
    darkColors: {
      background: 'hsl(222 47% 11%)',
    },
  },
  storageKey: 'app-theme',
  useCookies: true,
});

// Get current theme
const current = theme.getTheme();
console.log(current.resolvedMode); // 'light' or 'dark'

// Switch theme
theme.setMode('dark');

// Subscribe to changes
const unsubscribe = theme.subscribe((theme) => {
  console.log('Theme changed:', theme.resolvedMode);
});

// Cleanup
theme.destroy();
```

**Features:**

- System preference detection via `prefers-color-scheme`
- CSS variable application to `:root`
- Dark class management on `document.documentElement`
- Persistence via localStorage with optional cookies (for SSR)
- Subscription-based change notifications

## Realtime Features

### SSE Connections

Establish Server-Sent Events connections:

```json
{
  "actions": [
    {
      "name": "connectToNotifications",
      "steps": [
        {
          "do": "sseConnect",
          "connection": "notifications",
          "url": { "expr": "lit", "value": "/api/events" },
          "eventTypes": ["message", "update", "delete"],
          "reconnect": {
            "enabled": true,
            "strategy": "exponential",
            "maxRetries": 5,
            "baseDelay": 1000,
            "maxDelay": 30000
          },
          "onMessage": [
            { "do": "update", "target": "messages", "operation": "push", "value": { "expr": "var", "name": "payload" } }
          ]
        }
      ]
    }
  ]
}
```

**Reconnection Strategies:**

| Strategy | Description |
|----------|-------------|
| `exponential` | Exponential backoff (1s, 2s, 4s, 8s...) |
| `linear` | Linear backoff (1s, 2s, 3s, 4s...) |
| `none` | No automatic reconnection |

### Optimistic Updates

Apply UI changes immediately with automatic rollback on failure:

```json
{
  "actions": [
    {
      "name": "likePost",
      "steps": [
        {
          "do": "optimistic",
          "target": "posts",
          "path": { "expr": "var", "name": "payload", "path": "index" },
          "value": { "expr": "lit", "value": { "liked": true } },
          "result": "updateId",
          "timeout": 5000
        },
        {
          "do": "fetch",
          "url": { "expr": "concat", "items": [
            { "expr": "lit", "value": "/api/posts/" },
            { "expr": "var", "name": "payload", "path": "id" },
            { "expr": "lit", "value": "/like" }
          ]},
          "method": "POST",
          "onSuccess": [
            { "do": "confirm", "id": { "expr": "var", "name": "updateId" } }
          ],
          "onError": [
            { "do": "reject", "id": { "expr": "var", "name": "updateId" } }
          ]
        }
      ]
    }
  ]
}
```

### State Binding

Bind SSE messages directly to state:

```json
{
  "actions": [
    {
      "name": "bindNotifications",
      "steps": [
        {
          "do": "bind",
          "connection": "notifications",
          "eventType": "update",
          "target": "items",
          "transform": { "expr": "get", "base": { "expr": "var", "name": "payload" }, "path": "data" }
        }
      ]
    }
  ]
}
```

## Island Hydration

Hydrate interactive islands with the appropriate strategy:

```typescript
import { hydrateIsland } from '@constela/runtime';

// Hydrate an island when it becomes visible
hydrateIsland({
  id: 'interactive-chart',
  strategy: 'visible',
  strategyOptions: { threshold: 0.5 },
  program: compiledIslandProgram,
  mount: document.querySelector('[data-island="interactive-chart"]'),
});
```

**Supported Strategies:**

- `load` - Hydrate immediately
- `idle` - Hydrate when browser is idle (requestIdleCallback)
- `visible` - Hydrate when element enters viewport (IntersectionObserver)
- `interaction` - Hydrate on first user interaction (click, focus, mouseover)
- `media` - Hydrate when media query matches (matchMedia)
- `never` - Never hydrate (static content only)

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

### Transition Functions

```typescript
import { applyEnterTransition, applyExitTransition } from '@constela/runtime';

// Apply enter transition - returns a cancel function
const cancelEnter = applyEnterTransition(element, {
  enter: 'fade-enter',
  enterActive: 'fade-enter-active',
  duration: 300,
});

// Apply exit transition - returns { promise, cancel }
const { promise, cancel } = applyExitTransition(element, {
  exit: 'fade-exit',
  exitActive: 'fade-exit-active',
  duration: 300,
});

// Wait for exit to complete before removing element
await promise;
element.remove();
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
