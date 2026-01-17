# Constela Architecture

This document describes the architecture of Constela, including package dependencies, the compilation pipeline, and runtime behavior.

## Package Overview

Constela is organized as a monorepo with the following packages:

| Package | Version | Description |
|---------|---------|-------------|
| `@constela/core` | 0.8.0 | AST types, JSON Schema, validator, type guards, error codes, Style System |
| `@constela/compiler` | 0.8.0 | 3-pass compiler: validate → analyze → transform |
| `@constela/runtime` | 0.11.0 | DOM renderer, hydration, reactive signals |
| `@constela/router` | 9.0.0 | History API routing, dynamic params |
| `@constela/server` | 4.1.0 | SSR with syntax highlighting |
| `@constela/start` | 1.2.25 | Dev server, build, SSG, MDX, layouts |
| `@constela/cli` | 0.4.1 | CLI commands: compile, dev, build, validate, inspect |
| `@constela/builder` | 0.2.0 | Type-safe builders for programmatic AST construction |

## Package Dependency Graph

```
@constela/core
    ↑
@constela/compiler
    ↑
    ├──────────────────┬─────────────────┐
    │                  │                 │
@constela/runtime  @constela/server  @constela/start
    │                  │                 │
    └──────────────────┴─────────────────┤
                                         ↓
                                   @constela/cli
```

### Dependency Details

- **@constela/core**: No dependencies. Provides foundational types and validation.
- **@constela/compiler**: Depends on `@constela/core` for AST types.
- **@constela/runtime**: Depends on `@constela/compiler` for CompiledProgram types.
- **@constela/server**: Depends on `@constela/compiler` for SSR rendering.
- **@constela/start**: Depends on `@constela/compiler`, `@constela/runtime`, and `@constela/server`.
- **@constela/cli**: Depends on `@constela/start` for full functionality.

## Compilation Pipeline

The compiler transforms a Constela AST (JSON) into a `CompiledProgram` through three passes:

```
JSON Input → [Validate] → [Analyze] → [Transform] → CompiledProgram
```

### Pass 1: Validate

**Purpose**: Verify the JSON structure conforms to the Constela schema.

**Operations**:
- JSON Schema validation
- Type checking for state declarations
- Syntax verification for expressions and actions

**Errors Produced**:
- `SCHEMA_INVALID` - JSON structure doesn't match schema
- `UNSUPPORTED_VERSION` - Invalid version string

### Pass 2: Analyze

**Purpose**: Semantic analysis of the validated AST.

**Operations**:
- State reference resolution (verify all state references exist)
- Action reference resolution (verify all action references exist)
- Variable scope analysis (check `each` loop variables)
- Component analysis (verify components exist, check props, detect cycles)
- Route parameter analysis
- Import and data source validation

**Errors Produced**:
- `UNDEFINED_STATE` - Reference to undefined state field
- `UNDEFINED_ACTION` - Reference to undefined action
- `VAR_UNDEFINED` - Reference to undefined loop variable
- `COMPONENT_NOT_FOUND` - Reference to undefined component
- `COMPONENT_PROP_MISSING` - Required prop not provided
- `COMPONENT_CYCLE` - Circular component reference detected
- `PARAM_UNDEFINED` - Reference to undefined component param
- `UNDEFINED_ROUTE_PARAM` - Route param not in path
- `UNDEFINED_IMPORT` - Import not defined
- `UNDEFINED_DATA` - Data source not defined

### Pass 3: Transform

**Purpose**: Convert the analyzed AST into an optimized CompiledProgram.

**Operations**:
- Action array → action map conversion
- Expression normalization
- Component inlining (inline component definitions into view tree)
- Style evaluation
- Dead code elimination

**Output**:
```typescript
interface CompiledProgram {
  version: string;
  state: Record<string, CompiledStateField>;
  actions: Record<string, CompiledAction>;
  view: CompiledNode;
  styles?: Record<string, CompiledStyle>;
}
```

## Runtime Architecture

The runtime executes `CompiledProgram` in the browser using a signal-based reactive system.

### Signal-Based Reactivity

State is managed using signals, which automatically track dependencies and update the DOM when values change.

```
State Change → Signal Update → Effect Triggers → DOM Patch
```

**Key Concepts**:
- **Signal**: A reactive value container that notifies subscribers when changed
- **Effect**: A function that runs when its dependencies change
- **Computed**: A derived value that updates when source signals change

### DOM Rendering

1. **Initial Render**: Walk the compiled view tree and create DOM nodes
2. **Event Binding**: Attach event listeners that dispatch actions
3. **Text Binding**: Create text nodes with reactive expressions
4. **Conditional Rendering**: `if` nodes create/destroy subtrees based on condition
5. **List Rendering**: `each` nodes manage keyed item collections

### Action Execution

When an action is triggered:

1. Look up action in the `actions` map
2. Execute each step in sequence
3. For `set`/`update` steps, update the signal value
4. Signal change triggers effects, updating the DOM

## SSR/SSG Flow

### Server-Side Rendering (SSR)

```
Request → Load CompiledProgram → renderToString() → HTML Response
```

**Process**:
1. Load the CompiledProgram for the requested route
2. Evaluate expressions with route context (params, query)
3. Render view tree to HTML string
4. Return HTML with hydration script

### Static Site Generation (SSG)

```
Build → Scan Routes → For Each Route:
  Load JSON → Compile → Render HTML → Write File
```

**Process**:
1. Scan `routes/` directory for JSON page files
2. For dynamic routes, call `getStaticPaths` to get all paths
3. Compile each page
4. Render to HTML with hydration script
5. Bundle runtime JavaScript
6. Write to output directory

### Hydration

Hydration connects server-rendered HTML to the reactive runtime without re-rendering.

```
Page Load → Parse SSR HTML → hydrateApp() → Attach Signals & Events
```

**Process**:
1. Browser loads HTML with embedded hydration script
2. Script imports `hydrateApp` from `@constela/runtime`
3. `hydrateApp` walks the existing DOM (doesn't recreate nodes)
4. Attaches signals to text nodes for reactivity
5. Binds event listeners to elements
6. Page becomes interactive

## Package Responsibilities

### @constela/core

- Type definitions (AST, Expression, ViewNode, etc.)
- JSON Schema for validation
- Error codes and error factory functions
- Type guards (47 type guards for AST nodes)
- Style system types

### @constela/compiler

- 3-pass compilation pipeline
- AST transformation to CompiledProgram
- Semantic analysis
- Error reporting with suggestions ("Did you mean?")
- Style analysis and compilation

### @constela/runtime

- DOM rendering engine
- Signal-based state management
- Event handling and action dispatch
- Hydration from SSR HTML
- `createApp` and `hydrateApp` exports

### @constela/server

- `renderToString` for SSR
- Markdown rendering with marked
- Code syntax highlighting with Shiki
- Dual-theme support (light/dark)

### @constela/start

- Vite-powered dev server
- SSG build system
- File-based routing
- Layout system
- Widget support
- Data loading (glob, file, api)
- MDX processing

### @constela/cli

- `constela compile` - Compile JSON to CompiledProgram
- `constela dev` - Start development server
- `constela build` - Build for production
- `constela validate` - Validate JSON files
- `constela inspect` - Inspect program structure

### @constela/builder

- Type-safe AST construction
- Fluent API for programmatic program creation
- Expression builders
- View node builders

## Data Flow Summary

```
                    ┌─────────────────┐
                    │   JSON Source   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Validate     │ ← @constela/core (schema)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Analyze      │ ← @constela/compiler
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Transform     │ ← @constela/compiler
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐           ┌────────▼────────┐
     │  Server Render  │           │  Client Render  │
     │ (@constela/     │           │ (@constela/     │
     │  server)        │           │  runtime)       │
     └────────┬────────┘           └────────┬────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │   Interactive   │
                    │      App        │
                    └─────────────────┘
```
