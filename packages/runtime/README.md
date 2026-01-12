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
import { createSignal, createEffect } from '@constela/runtime';

const count = createSignal(0);
count.get();  // Read
count.set(1); // Write

const cleanup = createEffect(() => {
  console.log(`Count: ${count.get()}`);
});
```

## License

MIT
