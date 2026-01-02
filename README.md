# Constela

A constrained UI DSL that compiles to minimal runtime JavaScript.

Constela is a **compiler-first, AI-friendly UI framework** designed for vibecoding. Instead of writing arbitrary UI code, developers (and LLMs) write a constrained, declarative DSL that is:

- **Easy for AI to generate correctly** - Small, well-defined surface area
- **Structurally validated** - JSON Schema validation with detailed error paths
- **Compiled to efficient runtime** - No virtual DOM, fine-grained reactivity
- **Deterministic** - Explicit state declarations and named actions

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
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

## Packages

| Package | Description |
|---------|-------------|
| `@constela/core` | AST types, JSON Schema, validator |
| `@constela/compiler` | AST → CompiledProgram transformation |
| `@constela/runtime` | DOM renderer with fine-grained reactivity |
| `@constela/cli` | Command-line tools |

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
  code: 'SCHEMA_INVALID' | 'STATE_UNDEFINED' | 'ACTION_UNDEFINED' | ...,
  message: string,
  path: string,  // JSON Pointer, e.g., "/view/children/0/props/onClick"
  details?: object
}
```

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
```

## Design Principles

1. **Constrained surface area** - Small set of node types and expression types
2. **Schema-first** - DSL is JSON, validated by JSON Schema
3. **Compiler-first** - Parse → validate → analyze → transform pipeline
4. **Deterministic state** - Explicit declarations, no implicit reactivity
5. **AI-friendly errors** - Structured errors with JSON Pointer paths

## Roadmap

- [ ] SSR (Server-Side Rendering)
- [ ] Routing
- [ ] Component system
- [ ] Style system integration
- [ ] TypeScript builder API

## License

MIT
