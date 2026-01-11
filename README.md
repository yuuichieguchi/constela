# Constela

Constela is a compiler-first UI **language** designed for vibecoding.

Unlike React or Next.js, you do not write UI with JavaScript.
You describe UI behavior as a constrained JSON DSL,
which is validated, analyzed, and compiled into minimal runtime code.

Constela is optimized for:
- AI-generated UI
- deterministic behavior
- inspectable and debuggable state transitions

### Mental Model

| | React / Next.js | Constela |
|---|---|---|
| UI authoring | JavaScript / JSX | JSON DSL |
| Execution | runtime-driven | compiler-driven |
| State updates | arbitrary JS | declarative actions |
| Errors | runtime exceptions | structured errors |

## Quick Start

### Installation

```bash
# Basic usage
npm install @constela/runtime @constela/compiler

# With routing
npm install @constela/runtime @constela/compiler @constela/router

# With CLI tools
npm install @constela/runtime @constela/compiler @constela/cli
```

### Basic Usage

```typescript
import { compile } from '@constela/compiler';
import { createApp } from '@constela/runtime';

const program = {
  version: "1.0",
  state: {
    count: { type: "number", initial: 0 }
  },
  actions: [
    {
      name: "increment",
      steps: [{ do: "update", target: "count", operation: "increment" }]
    }
  ],
  view: {
    kind: "element",
    tag: "button",
    props: { onClick: { event: "click", action: "increment" } },
    children: [{ kind: "text", value: { expr: "state", name: "count" } }]
  }
};

const result = compile(program);
if (result.ok) {
  createApp(result.program, document.getElementById('app'));
}
```

## DSL Overview

Constela programs are JSON documents with this structure:

```json
{
  "version": "1.0",
  "route": { ... },
  "imports": { ... },
  "data": { ... },
  "lifecycle": { ... },
  "state": { ... },
  "actions": [ ... ],
  "view": { ... },
  "components": { ... }
}
```

All fields except `version`, `state`, `actions`, and `view` are optional.

### State

Declare application state with explicit types:

```json
{
  "state": {
    "count": { "type": "number", "initial": 0 },
    "query": { "type": "string", "initial": "" },
    "items": { "type": "list", "initial": [] },
    "isVisible": { "type": "boolean", "initial": true },
    "form": { "type": "object", "initial": { "name": "", "email": "" } }
  }
}
```

**State types:** `number`, `string`, `list`, `boolean`, `object`

### View Nodes

Four node types for building UI:

```json
// Element node
{ "kind": "element", "tag": "div", "props": { "className": "container" }, "children": [...] }

// Text node
{ "kind": "text", "value": { "expr": "state", "name": "count" } }

// Conditional node
{ "kind": "if", "condition": { "expr": "state", "name": "visible" }, "then": {...}, "else": {...} }

// Loop node
{ "kind": "each", "items": { "expr": "state", "name": "todos" }, "as": "item", "body": {...} }
```

### Expressions

Constrained expression system (no arbitrary JavaScript):

```json
// Literal
{ "expr": "lit", "value": "Hello" }

// State reference
{ "expr": "state", "name": "count" }

// Loop variable reference
{ "expr": "var", "name": "item" }

// Binary operation
{ "expr": "bin", "op": "+", "left": {...}, "right": {...} }

// Negation
{ "expr": "not", "operand": {...} }

// Conditional (if/then/else)
{ "expr": "cond", "if": {...}, "then": {...}, "else": {...} }

// Property access
{ "expr": "get", "base": { "expr": "state", "name": "user" }, "path": "address.city" }

// Route parameter (requires route definition)
{ "expr": "route", "name": "id", "source": "param" }

// Imported data reference (requires imports field)
{ "expr": "import", "name": "navigation", "path": "items" }

// Build-time data reference (requires data field)
{ "expr": "data", "name": "posts", "path": "0.title" }
```

**Binary operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`

**Route sources:** `param` (default), `query`, `path`

### Actions

Named actions with declarative steps:

```json
{
  "actions": [
    {
      "name": "increment",
      "steps": [
        { "do": "update", "target": "count", "operation": "increment" }
      ]
    },
    {
      "name": "addTodo",
      "steps": [
        { "do": "update", "target": "todos", "operation": "push", "value": {...} },
        { "do": "set", "target": "input", "value": { "expr": "lit", "value": "" } }
      ]
    }
  ]
}
```

**Step types:**
- `set` - Set state value
- `update` - Update with operation (see below)
- `fetch` - HTTP request with `onSuccess`/`onError` handlers
- `storage` - localStorage/sessionStorage operations
- `clipboard` - Clipboard read/write
- `navigate` - Page navigation

**Update operations:**

| Operation | State Type | Required Fields | Description |
|-----------|------------|-----------------|-------------|
| `increment` | number | - | Add to number (default: 1) |
| `decrement` | number | - | Subtract from number (default: 1) |
| `push` | list | `value` | Add item to end of array |
| `pop` | list | - | Remove last item from array |
| `remove` | list | `value` | Remove item by value or index |
| `toggle` | boolean | - | Flip boolean value |
| `merge` | object | `value` | Shallow merge into object |
| `replaceAt` | list | `index`, `value` | Replace item at index |
| `insertAt` | list | `index`, `value` | Insert item at index |
| `splice` | list | `index`, `deleteCount` | Delete/insert items |

```json
// Toggle boolean
{ "do": "update", "target": "isOpen", "operation": "toggle" }

// Merge object
{ "do": "update", "target": "form", "operation": "merge", "value": { "expr": "lit", "value": { "name": "John" } } }

// Replace at index
{ "do": "update", "target": "items", "operation": "replaceAt", "index": { "expr": "lit", "value": 0 }, "value": {...} }

// Insert at index
{ "do": "update", "target": "items", "operation": "insertAt", "index": { "expr": "lit", "value": 1 }, "value": {...} }

// Splice (delete 2 items at index 1, insert new items)
{ "do": "update", "target": "items", "operation": "splice", "index": { "expr": "lit", "value": 1 }, "deleteCount": { "expr": "lit", "value": 2 }, "value": { "expr": "lit", "value": ["a", "b"] } }
```

### Browser Actions

```json
// Storage (localStorage/sessionStorage)
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

{ "do": "storage", "operation": "set", "key": { "expr": "lit", "value": "theme" }, "value": { "expr": "state", "name": "theme" }, "storage": "local" }
{ "do": "storage", "operation": "remove", "key": { "expr": "lit", "value": "theme" }, "storage": "local" }

// Clipboard
{ "do": "clipboard", "operation": "write", "value": { "expr": "state", "name": "textToCopy" } }
{ "do": "clipboard", "operation": "read", "result": "clipboardText" }

// Navigate
{ "do": "navigate", "url": { "expr": "lit", "value": "/about" } }
{ "do": "navigate", "url": { "expr": "lit", "value": "https://example.com" }, "target": "_blank" }
{ "do": "navigate", "url": { "expr": "state", "name": "redirectUrl" }, "replace": true }
```

**Storage operations:** `get`, `set`, `remove`
**Storage types:** `local`, `session`
**Clipboard operations:** `write`, `read`
**Navigate targets:** `_self` (default), `_blank`

### Advanced Actions

#### DOM Manipulation

Manipulate DOM elements via refs:

```json
// Define a ref on an element
{
  "kind": "element",
  "tag": "div",
  "ref": "myElement",
  "children": [...]
}

// Manipulate via action
{ "do": "dom", "operation": "addClass", "ref": "myElement", "value": { "expr": "lit", "value": "active" } }
{ "do": "dom", "operation": "removeClass", "ref": "myElement", "value": { "expr": "lit", "value": "active" } }
{ "do": "dom", "operation": "toggleClass", "ref": "myElement", "value": { "expr": "lit", "value": "visible" } }
{ "do": "dom", "operation": "setAttribute", "ref": "myElement", "attr": "data-state", "value": { "expr": "state", "name": "currentState" } }
{ "do": "dom", "operation": "removeAttribute", "ref": "myElement", "attr": "disabled" }
```

**DOM operations:** `addClass`, `removeClass`, `toggleClass`, `setAttribute`, `removeAttribute`

#### Dynamic Imports & External Libraries

Import external JavaScript modules and call their methods:

```json
// Import a module
{ "do": "import", "module": "chart.js", "result": "Chart" }

// Call a method on the imported module
{ "do": "call", "ref": "Chart", "method": "create", "args": [{ "expr": "ref", "name": "canvas" }, { "expr": "state", "name": "chartConfig" }], "result": "chartInstance" }

// Subscribe to events
{ "do": "subscribe", "ref": "eventSource", "event": "message", "action": "handleMessage" }

// Dispose resources
{ "do": "dispose", "ref": "chartInstance" }
```

**Note:** Subscriptions are automatically disposed on component unmount.

### Markdown & Code Blocks

Render Markdown content and syntax-highlighted code:

```json
// Markdown node
{
  "kind": "markdown",
  "content": { "expr": "state", "name": "markdownContent" }
}

// Code block with syntax highlighting
{
  "kind": "code",
  "code": { "expr": "lit", "value": "const x: number = 42;" },
  "language": { "expr": "lit", "value": "typescript" }
}
```

**Features:**
- Markdown rendered with [marked](https://marked.js.org/)
- Code highlighting with [Shiki](https://shiki.style/)
- Dual theme support (light/dark)
- Built-in copy button

### Components

Reusable view definitions with props and slots:

```json
{
  "components": {
    "Button": {
      "params": {
        "label": { "type": "string" },
        "disabled": { "type": "boolean", "required": false }
      },
      "view": {
        "kind": "element",
        "tag": "button",
        "props": { "disabled": { "expr": "param", "name": "disabled" } },
        "children": [
          { "kind": "text", "value": { "expr": "param", "name": "label" } }
        ]
      }
    },
    "Card": {
      "params": { "title": { "type": "string" } },
      "view": {
        "kind": "element",
        "tag": "div",
        "children": [
          { "kind": "text", "value": { "expr": "param", "name": "title" } },
          { "kind": "slot" }
        ]
      }
    }
  }
}
```

**Using components:**

```json
{
  "kind": "component",
  "name": "Card",
  "props": { "title": { "expr": "lit", "value": "My Card" } },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Card content goes here" } }
  ]
}
```

**Param types:** `string`, `number`, `boolean`, `json`

**Param expression:**
```json
{ "expr": "param", "name": "label" }
{ "expr": "param", "name": "user", "path": "name" }
```

### Event Handling

Bind events to actions via props:

```json
{
  "kind": "element",
  "tag": "button",
  "props": {
    "onClick": { "event": "click", "action": "increment" }
  }
}
```

For input events with payload:

```json
{
  "props": {
    "onInput": { "event": "input", "action": "setQuery", "payload": { "expr": "var", "name": "value" } }
  }
}
```

### Route Definition

Define page routes with path, layout, and metadata:

```json
{
  "route": {
    "path": "/users/:id",
    "title": { "expr": "bin", "op": "+", "left": { "expr": "lit", "value": "User: " }, "right": { "expr": "route", "name": "id" } },
    "layout": "MainLayout",
    "meta": {
      "description": { "expr": "lit", "value": "User profile page" }
    }
  }
}
```

Access route params in expressions with `{ "expr": "route", "name": "id" }`.

### Imports

Import external JSON data files:

```json
{
  "imports": {
    "navigation": "./data/navigation.json",
    "config": "./data/site-config.json"
  }
}
```

Access imported data with `{ "expr": "import", "name": "navigation", "path": "items" }`.

### Data Sources

Load data at build time for static site generation:

```json
{
  "data": {
    "posts": {
      "type": "glob",
      "pattern": "content/blog/*.mdx",
      "transform": "mdx"
    },
    "config": {
      "type": "file",
      "path": "data/config.json"
    },
    "users": {
      "type": "api",
      "url": "https://api.example.com/users"
    }
  },
  "route": {
    "path": "/posts/:slug",
    "getStaticPaths": {
      "source": "posts",
      "params": {
        "slug": { "expr": "get", "base": { "expr": "var", "name": "item" }, "path": "slug" }
      }
    }
  }
}
```

**Data source types:** `glob`, `file`, `api`
**Transforms:** `mdx`, `yaml`, `csv`

### Lifecycle Hooks

Execute actions on component lifecycle events:

```json
{
  "lifecycle": {
    "onMount": "loadTheme",
    "onUnmount": "saveState",
    "onRouteEnter": "fetchData",
    "onRouteLeave": "cleanup"
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
  ]
}
```

### Layouts

Define reusable page layouts with slots:

```json
{
  "version": "1.0",
  "type": "layout",
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      { "kind": "component", "name": "Header" },
      { "kind": "element", "tag": "main", "children": [{ "kind": "slot" }] },
      { "kind": "component", "name": "Footer" }
    ]
  }
}
```

Pages reference layouts via `route.layout`. The page's view is inserted at the `slot` node.

Named slots are supported for multi-slot layouts:
```json
{ "kind": "slot", "name": "sidebar" }
```

## Example: Counter

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
    },
    {
      "name": "decrement",
      "steps": [{ "do": "update", "target": "count", "operation": "decrement" }]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      {
        "kind": "element",
        "tag": "p",
        "children": [
          { "kind": "text", "value": { "expr": "lit", "value": "Count: " } },
          { "kind": "text", "value": { "expr": "state", "name": "count" } }
        ]
      },
      {
        "kind": "element",
        "tag": "button",
        "props": { "onClick": { "event": "click", "action": "decrement" } },
        "children": [{ "kind": "text", "value": { "expr": "lit", "value": "-" } }]
      },
      {
        "kind": "element",
        "tag": "button",
        "props": { "onClick": { "event": "click", "action": "increment" } },
        "children": [{ "kind": "text", "value": { "expr": "lit", "value": "+" } }]
      }
    ]
  }
}
```

## Routing (via @constela/router)

Client-side routing is provided as a separate package that works alongside the core DSL.
**Note:** Routing is NOT part of the DSL - it's an application-level add-on.

```typescript
import { compile } from '@constela/compiler';
import { createRouter, bindLink } from '@constela/router';

// Compile multiple pages
const homeProgram = compile(homeAst).program;
const aboutProgram = compile(aboutAst).program;
const userProgram = compile(userAst).program;

// Create router
const router = createRouter({
  routes: [
    { path: '/', program: homeProgram, title: 'Home' },
    { path: '/about', program: aboutProgram, title: 'About' },
    { path: '/users/:id', program: userProgram, title: ctx => `User ${ctx.params.id}` },
  ],
  fallback: notFoundProgram,
  onRouteChange: (ctx) => {
    console.log('Route changed:', ctx.path, ctx.params);
  },
});

// Mount router
const { destroy } = router.mount(document.getElementById('app'));

// Programmatic navigation
router.navigate('/about');
router.navigate('/users/123', { replace: true });

// Bind links for client-side navigation
document.querySelectorAll('a[href]').forEach(a => bindLink(router, a));
```

**Route Context:**
```typescript
{
  path: string,           // Current path
  params: Record<string, string>,  // URL params (e.g., { id: '123' })
  query: URLSearchParams  // Query string params
}
```

**Note:** Route params are now accessible in DSL expressions via `{ "expr": "route", "name": "id" }` when using the `route` field in your program.

## Dynamic Routes (via @constela/start)

For SSG with dynamic routes, export a function that receives route params:

```typescript
// pages/docs/[...slug].ts
import type { PageExportFunction, StaticPathsResult } from '@constela/start';

export const getStaticPaths = async (): Promise<StaticPathsResult> => ({
  paths: [
    { params: { slug: 'getting-started' } },
    { params: { slug: 'api/components' } },
  ]
});

const page: PageExportFunction = async (params) => {
  const content = await loadMarkdown(`docs/${params.slug}.md`);
  return compileToProgram(content);
};

export default page;
```

Static `CompiledProgram` exports continue to work for non-dynamic routes:

```typescript
// pages/about.ts
export default {
  version: '1.0',
  state: {},
  actions: {},
  view: { kind: 'element', tag: 'div', ... }
};
```

## Full-Stack Development (via @constela/start)

`@constela/start` provides a complete framework for building Constela applications:

### Dev Server

```bash
# Start development server
npx constela dev --port 3000
```

Features:
- Vite-powered hot reload
- File-based routing
- Layout composition
- SSR with hydration

### Production Build

```bash
# Build for production
npx constela build --outDir dist
```

Generates:
- Static HTML for all routes
- Bundled runtime JavaScript
- Optimized assets

### MDX Support

Transform Markdown with JSX components:

```json
{
  "data": {
    "docs": {
      "type": "glob",
      "pattern": "content/docs/*.mdx",
      "transform": "mdx"
    }
  }
}
```

MDX files support:
- Frontmatter (YAML)
- Custom components
- Code blocks with syntax highlighting
- GitHub Flavored Markdown

### API Routes

Create server-side API endpoints:

```typescript
// pages/api/users.ts
export const GET = async (ctx) => {
  return new Response(JSON.stringify({ users: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = async (ctx) => {
  const body = await ctx.request.json();
  // Handle POST request
};
```

### Middleware

Add request middleware:

```typescript
// pages/_middleware.ts
export default async (ctx, next) => {
  console.log('Request:', ctx.url);
  const response = await next();
  return response;
};
```

### Edge Deployment

Deploy to edge platforms:

```typescript
import { createAdapter } from '@constela/start';

const adapter = createAdapter({
  platform: 'cloudflare', // 'vercel' | 'deno' | 'node'
  routes: scannedRoutes,
});

export default { fetch: adapter.fetch };
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@constela/core` | 0.7.0 | AST types, JSON Schema, validator, 47 type guards, error codes |
| `@constela/compiler` | 0.7.1 | 3-pass compiler: validate → analyze → transform |
| `@constela/runtime` | 0.10.3 | DOM renderer, hydration, reactive signals, Markdown/Code support |
| `@constela/router` | 8.0.0 | History API routing, dynamic params, catch-all routes |
| `@constela/server` | 3.0.1 | SSR with Shiki dual-theme syntax highlighting |
| `@constela/start` | 1.2.22 | Dev server, build, SSG, MDX, layouts, API routes, edge adapters |
| `@constela/cli` | 0.3.29 | CLI: compile, dev, build, start commands |

See each package's README for detailed API documentation.

## CLI Usage

```bash
# Compile a Constela program
constela compile app.json

# With custom output path
constela compile app.json --out dist/app.compiled.json

# Pretty-print output
constela compile app.json --pretty
```

## API Usage

```typescript
import { compile } from '@constela/compiler';
import { createApp } from '@constela/runtime';

// Load and compile
const ast = JSON.parse(await fs.readFile('app.json', 'utf-8'));
const result = compile(ast);

if (!result.ok) {
  console.error('Compilation failed:', result.errors);
  process.exit(1);
}

// Mount to DOM
const app = createApp(result.program, document.getElementById('app'));

// Later: cleanup
app.destroy();
```

## App Instance API

The `createApp` function returns an `AppInstance` with the following methods:

```typescript
interface AppInstance {
  destroy(): void;                                              // Cleanup and unmount
  setState(name: string, value: unknown): void;                 // Update state
  getState(name: string): unknown;                              // Read state
  subscribe(name: string, fn: (value: unknown) => void): () => void;  // Observe state changes
}
```

### Example: External State Updates

```typescript
const app = createApp(result.program, document.getElementById('app'));

// Update state from outside the DSL
app.setState('count', 10);

// Subscribe to state changes
const unsubscribe = app.subscribe('count', (value) => {
  console.log('Count changed:', value);
});

// Read current state
console.log(app.getState('count')); // 10

// Stop listening
unsubscribe();
```

## Server-Side Rendering (SSR)

Render Constela programs on the server with `@constela/server`:

```typescript
import { renderToString } from '@constela/server';

const html = await renderToString(compiledProgram, {
  route: {
    params: { id: '123' },
    query: { tab: 'overview' },
    path: '/users/123',
  },
  imports: {
    config: { siteName: 'My Site' },
  },
});
```

## Hydration

Hydrate server-rendered HTML on the client without DOM reconstruction:

```typescript
import { hydrateApp } from '@constela/runtime';

const app = hydrateApp({
  program: compiledProgram,
  mount: document.getElementById('app'),
  route: {
    params: { id: '123' },
    query: new URLSearchParams('tab=overview'),
    path: '/users/123',
  },
  imports: {
    config: { siteName: 'My Site' },
  },
});

// App is now interactive
app.subscribe('count', (value) => console.log('count:', value));
```

## Error Model

All errors include structured information:

```typescript
{
  code: ErrorCode,
  message: string,
  path: string,  // JSON Pointer, e.g., "/view/children/0/props/onClick"
  details?: object
}
```

**Error Codes:**
- `SCHEMA_INVALID` - JSON Schema validation error
- `UNDEFINED_STATE` - Reference to undefined state field
- `UNDEFINED_ACTION` - Reference to undefined action
- `VAR_UNDEFINED` - Reference to undefined variable
- `DUPLICATE_ACTION` - Duplicate action name
- `UNSUPPORTED_VERSION` - Unsupported version string
- `COMPONENT_NOT_FOUND` - Reference to undefined component
- `COMPONENT_PROP_MISSING` - Required prop not provided
- `COMPONENT_CYCLE` - Circular component reference detected
- `COMPONENT_PROP_TYPE` - Prop type mismatch
- `PARAM_UNDEFINED` - Reference to undefined param in component
- `OPERATION_INVALID_FOR_TYPE` - Update operation incompatible with state type
- `OPERATION_MISSING_FIELD` - Required field missing for update operation
- `EXPR_COND_ELSE_REQUIRED` - Cond expression requires else field
- `UNDEFINED_ROUTE_PARAM` - Route expression references undefined route param
- `UNDEFINED_IMPORT` - Import expression references undefined import
- `UNDEFINED_DATA` - Data expression references undefined data source
- `LAYOUT_MISSING_SLOT` - Layout program has no slot node
- `LAYOUT_NOT_FOUND` - Referenced layout not found

## Running Examples

```bash
# Install dependencies
pnpm install

# Build packages first
pnpm build

# Start examples dev server
pnpm --filter @constela/examples dev

# Then open in browser:
# - http://localhost:5173/counter/
# - http://localhost:5173/todo-list/
# - http://localhost:5173/fetch-list/
# - http://localhost:5173/components/
# - http://localhost:5173/router/
```

## Design Principles

1. **Constrained surface area** - Small set of node types and expression types
2. **Schema-first** - DSL is JSON, validated by JSON Schema
3. **Compiler-first** - Parse → validate → analyze → transform pipeline
4. **Deterministic state** - Explicit declarations, no implicit reactivity
5. **AI-friendly errors** - Structured errors with JSON Pointer paths

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Roadmap

- [ ] Style system integration
- [ ] TypeScript builder API

## License

MIT
