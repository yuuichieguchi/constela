# @constela/cli

Command-line tools for the Constela UI framework.

## Installation

```bash
npm install -g @constela/cli
```

Or use with npx:

```bash
npx constela <command>
```

## Commands

### constela compile

Compiles a Constela DSL file to a program.

```bash
constela compile <input> [options]
```

**Arguments:**
- `<input>` - Input DSL file (JSON)

**Options:**
- `-o, --out <path>` - Output file path
- `--pretty` - Pretty-print JSON output
- `--json` - Output results as JSON (for tooling/AI integration)
- `-w, --watch` - Watch input file and recompile on changes
- `-v, --verbose` - Show detailed compilation progress
- `--debug` - Show internal debug information

**Examples:**

```bash
# Compile to stdout
constela compile app.constela.json

# Compile to file
constela compile app.constela.json --out dist/app.compiled.json

# Pretty-print output
constela compile app.constela.json --pretty

# JSON output for AI tools
constela compile app.constela.json --json

# Watch mode for development
constela compile app.constela.json --watch

# Verbose output with timing
constela compile app.constela.json --verbose
# Output:
# [1/3] Validating schema... OK (2ms)
# [2/3] Analyzing semantics... OK (1ms)
# [3/3] Transforming AST... OK (0ms)
# Compilation successful (5ms total)

# Debug information
constela compile app.constela.json --debug
# Output:
# [DEBUG] Input file: app.constela.json (1234 bytes)
# [DEBUG] Parse time: 1ms
# [DEBUG] Validate pass: 15 nodes validated (2ms)
# ...
```

### constela validate

Validates Constela JSON files without full compilation (faster feedback).

```bash
constela validate [input] [options]
```

**Arguments:**
- `[input]` - Input DSL file (JSON) or directory with `--all`

**Options:**
- `-a, --all` - Validate all JSON files in directory recursively
- `--json` - Output results as JSON

**Examples:**

```bash
# Validate single file
constela validate app.constela.json

# Validate all JSON files in directory
constela validate --all src/routes/

# JSON output for tooling
constela validate app.constela.json --json
```

**Error Output with Suggestions:**

```
Error [UNDEFINED_STATE] at /view/children/0/value/name

  Undefined state reference: 'count'

  Did you mean 'counter'?
```

### constela inspect

Inspects Constela program structure without compilation.

```bash
constela inspect <input> [options]
```

**Arguments:**
- `<input>` - Input DSL file (JSON)

**Options:**
- `--state` - Show only state information
- `--actions` - Show only actions information
- `--components` - Show only components information
- `--view` - Show only view tree
- `--json` - Output as JSON

**Examples:**

```bash
# Show all program structure
constela inspect app.constela.json

# Show only state
constela inspect app.constela.json --state

# JSON output
constela inspect app.constela.json --json
```

**Output:**

```
State (2 fields):
  count: number = 0
  items: list = []

Actions (2):
  increment: update count +1
  addItem: push to items

View Tree:
  element<div>
    text: state.count
    element<button> onClick=increment
```

### constela dev

Starts the development server with hot reload.

```bash
constela dev [options]
```

**Options:**
- `-p, --port <number>` - Server port (default: 3000)
- `--host <string>` - Server host (default: localhost)

**Examples:**

```bash
# Default settings
constela dev

# Custom port
constela dev --port 8080

# Accessible from network
constela dev --host 0.0.0.0
```

### constela build

Builds the application for production.

```bash
constela build [options]
```

**Options:**
- `-o, --outDir <path>` - Output directory (default: dist)

**Examples:**

```bash
# Default output to dist/
constela build

# Custom output directory
constela build --outDir build
```

**Output:**
- Static HTML files for each route
- Bundled runtime JavaScript
- Copied public assets

### constela start

Starts the production server.

```bash
constela start [options]
```

**Options:**
- `-p, --port <number>` - Server port (default: 3000)

**Examples:**

```bash
# Default settings
constela start

# Custom port
constela start --port 8080
```

The server binds to `0.0.0.0` by default for deployment compatibility.

## Project Structure

The CLI expects the following project structure:

```
project/
  src/
    pages/           # Page files (.constela.json, .ts)
      index.constela.json     # / route
      about.constela.json     # /about route
      users/
        [id].constela.json    # /users/:id route
    layouts/         # Layout files (optional)
      default.json
      docs.json
  public/            # Static assets
    styles/
    images/
  content/           # Content files (optional)
    blog/
      *.mdx
```

## Configuration

Create a `constela.config.ts` file in your project root:

```typescript
import type { ConstelaConfig } from '@constela/start';

export default {
  adapter: 'node', // 'cloudflare' | 'vercel' | 'deno' | 'node'
  ssg: {
    routes: ['/about', '/contact'],
  },
} satisfies ConstelaConfig;
```

## Debugging Guide

### Using Debug Mode

Add `--debug` to any compile command to see internal processing:

```bash
constela compile app.constela.json --debug
```

**Debug output includes:**
- File size and parse time
- Number of nodes validated
- Analysis pass details
- Transform timings

### Common Issues

#### UNDEFINED_STATE Error

```
Error [UNDEFINED_STATE] at /view/children/0/value/name
Undefined state reference: 'count'
Did you mean 'counter'?
```

**Solution:** Check your state name spelling. The error shows suggested corrections.

#### SCHEMA_INVALID Error

```
Error [SCHEMA_INVALID] at /view/kind
Invalid value: 'button'. Expected one of: element, text, if, each, component, slot, markdown, code
```

**Solution:** Use correct node kind. `kind: "element"` with `tag: "button"` for buttons.

#### Component Not Found

```
Error [COMPONENT_NOT_FOUND] at /view/children/0/name
Component 'Header' is not defined
```

**Solution:** Define the component in the `components` section or check import paths.

### Inspecting Program Structure

Use `inspect` to understand your program without compilation:

```bash
# See state structure
constela inspect app.constela.json --state

# See view tree
constela inspect app.constela.json --view

# Get JSON for tooling
constela inspect app.constela.json --json | jq '.state'
```

### Browser DevTools

For runtime debugging:

1. Open DevTools → Sources tab
2. Find `@constela/runtime` in the source tree
3. Set breakpoints in action handlers

State changes are logged to console in development mode.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Compilation error |
| 1 | Server startup failed |
| 1 | Build failed |

## Signals

The `start` command handles graceful shutdown:

- `SIGINT` (Ctrl+C) - Graceful shutdown
- `SIGTERM` - Graceful shutdown

## License

MIT
