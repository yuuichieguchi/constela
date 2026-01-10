# @constela/runtime

Runtime DOM renderer for the Constela UI framework with fine-grained reactivity.

## Installation

```bash
npm install @constela/runtime
```

## Overview

This package provides the client-side rendering engine for Constela applications. Key features:

- **Fine-grained Reactivity** - Signal-based updates without virtual DOM
- **Hydration** - Rehydrate server-rendered HTML
- **Markdown & Code** - Built-in Markdown and syntax highlighting support

## API Reference

### createApp

Creates and mounts a Constela application.

```typescript
import { createApp } from '@constela/runtime';

const app = createApp(compiledProgram, document.getElementById('app'));

// Later: cleanup
app.destroy();
```

**Parameters:**
- `program: CompiledProgram` - Compiled program from `@constela/compiler`
- `mount: HTMLElement` - DOM element to mount to

**Returns:** `AppInstance`

### hydrateApp

Hydrates server-rendered HTML without DOM reconstruction.

```typescript
import { hydrateApp } from '@constela/runtime';

const app = hydrateApp({
  program: compiledProgram,
  mount: document.getElementById('app'),
  route: {
    params: { id: '123' },
    query: { tab: 'details' },
    path: '/users/123'
  },
  imports: {
    config: { apiUrl: 'https://api.example.com' }
  }
});
```

**HydrateOptions:**
- `program: CompiledProgram` - Compiled program
- `mount: HTMLElement` - Container element
- `route?: RouteContext` - Route parameters
- `imports?: Record<string, unknown>` - Import data

### AppInstance

```typescript
interface AppInstance {
  destroy(): void;
  setState(name: string, value: unknown): void;
  getState(name: string): unknown;
  subscribe(name: string, fn: (value: unknown) => void): () => void;
}
```

#### destroy()

Cleans up the application, removes event listeners, and clears state.

#### setState(name, value)

Updates a state field programmatically.

```typescript
app.setState('count', 10);
app.setState('user', { name: 'John', email: 'john@example.com' });
```

#### getState(name)

Reads current state value.

```typescript
const count = app.getState('count');
```

#### subscribe(name, fn)

Subscribes to state changes. Returns an unsubscribe function.

```typescript
const unsubscribe = app.subscribe('count', (value) => {
  console.log('count changed:', value);
});

// Later: stop listening
unsubscribe();
```

## Reactive Primitives

Low-level reactive APIs for advanced usage.

### createSignal

Creates a reactive signal with fine-grained dependency tracking.

```typescript
import { createSignal } from '@constela/runtime';

const count = createSignal(0);

// Read value (auto-tracks in effects)
console.log(count.get()); // 0

// Update value
count.set(1);

// Subscribe to changes
const unsubscribe = count.subscribe((value) => {
  console.log('Value:', value);
});
```

### createEffect

Creates a reactive side effect that auto-tracks dependencies.

```typescript
import { createSignal, createEffect } from '@constela/runtime';

const name = createSignal('World');

const cleanup = createEffect(() => {
  console.log(`Hello, ${name.get()}!`);

  // Optional cleanup function
  return () => {
    console.log('Effect cleaned up');
  };
});

name.set('Constela'); // Logs: "Hello, Constela!"

cleanup(); // Stops the effect
```

### createStateStore

Centralized state management with signal-based reactivity.

```typescript
import { createStateStore } from '@constela/runtime';

const store = createStateStore({
  count: { type: 'number', initial: 0 },
  name: { type: 'string', initial: '' }
});

store.get('count'); // 0
store.set('count', 5);
store.subscribe('count', (value) => console.log(value));
```

## Expression Evaluation

### evaluate

Evaluates compiled expressions.

```typescript
import { evaluate } from '@constela/runtime';

const result = evaluate(expression, {
  state: stateStore,
  locals: { item: { id: 1, name: 'Test' } },
  route: { params: { id: '123' }, query: new URLSearchParams(), path: '/items/123' },
  imports: { config: { apiUrl: '...' } },
  data: { posts: [...] },
  refs: { inputEl: document.querySelector('#input') }
});
```

**Supported Expressions:**
- Literals, state reads, variables
- Binary operations, logical not, conditionals
- Property access, array indexing
- Route parameters/query/path
- Imports and loaded data
- DOM refs

## Action Execution

### executeAction

Executes compiled actions.

```typescript
import { executeAction } from '@constela/runtime';

await executeAction(action, {
  state: stateStore,
  locals: {},
  route: { ... },
  imports: { ... },
  refs: { ... },
  subscriptions: []
});
```

**Supported Steps:**
- `set`, `update` - State mutations
- `fetch` - HTTP requests
- `storage` - localStorage/sessionStorage
- `clipboard` - Clipboard operations
- `navigate` - Page navigation
- `import`, `call` - Dynamic imports and function calls
- `subscribe`, `dispose` - Event subscriptions
- `dom` - DOM manipulation
- `if` - Conditional execution

## Rendering

### render

Renders compiled nodes to DOM.

```typescript
import { render } from '@constela/runtime';

const domNode = render(compiledNode, {
  state: stateStore,
  actions: compiledProgram.actions,
  components: {},
  locals: {},
  route: { ... },
  imports: { ... },
  refs: {},
  subscriptions: [],
  cleanups: []
});
```

**Supported Nodes:**
- Element nodes with props and event handlers
- Text nodes with reactive updates
- Conditional rendering (`if/else`)
- List rendering (`each`)
- Markdown with sanitization
- Code blocks with Shiki highlighting

## Markdown & Code Blocks

The runtime includes built-in support for rendering Markdown and syntax-highlighted code.

### Markdown

Rendered using [marked](https://marked.js.org/) with [DOMPurify](https://github.com/cure53/DOMPurify) sanitization.

```json
{
  "kind": "markdown",
  "content": { "expr": "state", "name": "markdownContent" }
}
```

### Code Blocks

Rendered with [Shiki](https://shiki.style/) syntax highlighting.

```json
{
  "kind": "code",
  "code": { "expr": "lit", "value": "const x = 1;" },
  "language": { "expr": "lit", "value": "typescript" }
}
```

**Features:**
- Dual theme support (light/dark)
- Copy button with feedback
- Dynamic language loading

## Security

The runtime includes security measures:

- **Prototype Pollution Prevention** - Blocks `__proto__`, `constructor`, `prototype`
- **Safe Globals** - Only exposes `JSON`, `Math`, `Date`, `Object`, `Array`, `String`, `Number`, `Boolean`, `console`
- **HTML Sanitization** - DOMPurify for Markdown content

## License

MIT
