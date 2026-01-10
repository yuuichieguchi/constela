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

**Examples:**

```bash
# Compile to stdout
constela compile app.json

# Compile to file
constela compile app.json --out dist/app.compiled.json

# Pretty-print output
constela compile app.json --pretty
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
    pages/           # Page files (.json, .ts)
      index.json     # / route
      about.json     # /about route
      users/
        [id].json    # /users/:id route
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
