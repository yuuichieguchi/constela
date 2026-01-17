# @constela/compiler

Transforms Constela JSON programs into optimized runtime code.

## Installation

```bash
npm install @constela/compiler
```

## Usage

```bash
constela compile app.json --out dist/app.compiled.json
```

## JSON Input

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

## Compiler Pipeline

The compiler transforms JSON programs through three passes:

1. **Validate** - JSON Schema validation
2. **Analyze** - Semantic analysis (state, actions, components, routes)
3. **Transform** - AST to optimized runtime program

## Supported Features

- **setPath** - Compiles to efficient path-based state updates
- **Key-based each** - Compiles key expressions for list diffing
- **WebSocket connections** - Compiles connection definitions and send/close actions
- **concat expression** - Compiles string concatenation expressions
- **Object payloads** - Supports object-shaped event handler payloads with expression fields

## CompiledProgram Structure

```json
{
  "version": "1.0",
  "route": {
    "path": "/users/:id",
    "params": ["id"],
    "title": { ... },
    "layout": "MainLayout"
  },
  "lifecycle": {
    "onMount": "loadData",
    "onUnmount": "cleanup"
  },
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "connections": {
    "chat": {
      "type": "websocket",
      "url": { ... },
      "onMessage": { "action": "handleMessage" }
    }
  },
  "actions": {
    "increment": {
      "name": "increment",
      "steps": [{ "do": "update", "target": "count", "operation": "increment" }]
    }
  },
  "view": { ... }
}
```

## Layout Compilation

Layouts are compiled separately with slot validation:

```json
{
  "version": "1.0",
  "type": "layout",
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      { "kind": "component", "name": "Header" },
      { "kind": "slot" },
      { "kind": "component", "name": "Footer" }
    ]
  }
}
```

**Layout Validations:**
- At least one slot exists
- No duplicate named slots
- No duplicate default slots
- Slots not inside loops

## Error Handling

Structured errors with JSON Pointer paths:

```json
{
  "code": "UNDEFINED_STATE",
  "message": "State \"count\" is not defined",
  "path": "/view/children/0/props/onClick"
}
```

**Error Codes:**
- `SCHEMA_INVALID` - JSON Schema validation error
- `UNDEFINED_STATE` - Reference to undefined state
- `UNDEFINED_ACTION` - Reference to undefined action
- `DUPLICATE_ACTION` - Duplicate action name
- `VAR_UNDEFINED` - Undefined variable reference
- `COMPONENT_NOT_FOUND` - Undefined component
- `COMPONENT_PROP_MISSING` - Missing required prop
- `COMPONENT_CYCLE` - Circular component reference
- `OPERATION_INVALID_FOR_TYPE` - Invalid operation for state type
- `LAYOUT_MISSING_SLOT` - Layout missing slot node
- `LAYOUT_NOT_FOUND` - Referenced layout not found

## Internal API

> For framework developers only. End users should use the CLI.

### compile

```typescript
import { compile } from '@constela/compiler';

const result = compile(jsonInput);

if (result.ok) {
  console.log(result.program);
} else {
  console.error(result.errors);
}
```

### Individual Passes

```typescript
import { validatePass, analyzePass, transformPass } from '@constela/compiler';

// Step 1: Validate
const validated = validatePass(input);

// Step 2: Analyze
const analyzed = analyzePass(validated.program);

// Step 3: Transform
const compiled = transformPass(analyzed.program, analyzed.context);
```

### Layout Compilation

```typescript
import { analyzeLayoutPass, transformLayoutPass, composeLayoutWithPage } from '@constela/compiler';

const layoutResult = analyzeLayoutPass(layoutProgram);
const compiledLayout = transformLayoutPass(layoutProgram, layoutResult.context);
const composedProgram = composeLayoutWithPage(compiledLayout, compiledPage);
```

## License

MIT
