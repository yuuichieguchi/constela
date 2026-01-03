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
npm install @constela/runtime @constela/compiler
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
  "state": { ... },
  "actions": [ ... ],
  "view": { ... }
}
```

### State

Declare application state with explicit types:

```json
{
  "state": {
    "count": { "type": "number", "initial": 0 },
    "query": { "type": "string", "initial": "" },
    "items": { "type": "list", "initial": [] }
  }
}
```

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
```

**Binary operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`

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
- `update` - Update with operation (`increment`, `decrement`, `push`, `pop`, `remove`)
- `fetch` - HTTP request with `onSuccess`/`onError` handlers

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

**Limitation:** Route params/query are NOT accessible inside DSL expressions in the current version.
Use `onRouteChange` callback to pass route data to your app via state updates.

## Packages

| Package | Description |
|---------|-------------|
| `@constela/core` | AST types, JSON Schema, validator |
| `@constela/compiler` | AST → CompiledProgram transformation |
| `@constela/runtime` | DOM renderer with fine-grained reactivity |
| `@constela/cli` | Command-line tools |
| `@constela/router` | Client-side routing (add-on) |

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

## Running Examples

```bash
# Build packages first
pnpm build

# Serve examples (requires a static file server)
npx serve .

# Then open in browser:
# - http://localhost:3000/examples/counter/
# - http://localhost:3000/examples/todo-list/
# - http://localhost:3000/examples/fetch-list/
# - http://localhost:3000/examples/components/
# - http://localhost:3000/examples/router/
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

- [ ] SSR (Server-Side Rendering)
- [ ] Style system integration
- [ ] TypeScript builder API

## License

MIT
