# @constela/start

Meta-framework for Constela applications with dev server, build tools, and SSG.

## Installation

```bash
npm install @constela/start
```

## Quick Start

1. Create a project:

```bash
mkdir my-app && cd my-app
npm init -y
npm install @constela/start
mkdir -p src/routes
```

2. Create a page (`src/routes/index.constela.json`):

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

3. Start development:

```bash
npx constela dev
```

Open http://localhost:3000 to see your app.

## CLI Usage

```bash
# Development server
npx constela dev --port 3000

# Production build
npx constela build --outDir dist

# Start production server
npx constela start --port 3000
```

## Project Structure

```
project/
  src/
    routes/           # Page files (.constela.json)
      index.constela.json      # / route
      about.constela.json      # /about route
      users/
        [id].constela.json     # /users/:id route
    layouts/          # Layout files
      main.json
      docs.json
    components/       # Component files
      header.json
      footer.json
    data/             # Data files
      config.json
      navigation.json
  content/            # Content files (MDX)
    blog/
      *.mdx
  public/             # Static assets
```

## File-Based Routing

| File | Route |
|------|-------|
| `index.constela.json` | `/` |
| `about.constela.json` | `/about` |
| `users/[id].constela.json` | `/users/:id` |
| `docs/[...slug].constela.json` | `/docs/*` |

## Data Sources

Load data at build time:

### Glob Pattern

```json
{
  "data": {
    "posts": {
      "type": "glob",
      "pattern": "content/blog/*.mdx",
      "transform": "mdx"
    }
  }
}
```

### File

```json
{
  "data": {
    "config": {
      "type": "file",
      "path": "data/config.json"
    }
  }
}
```

### API

```json
{
  "data": {
    "users": {
      "type": "api",
      "url": "https://api.example.com/users"
    }
  }
}
```

**Transforms:** `mdx`, `yaml`, `csv`

## Layouts

Define reusable layouts:

```json
{
  "version": "1.0",
  "type": "layout",
  "state": {
    "theme": { "type": "string", "initial": "light" }
  },
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

### Components with Local State in Layouts

Layout components can use `localState` and `localActions` for instance-scoped state:

```json
{
  "version": "1.0",
  "type": "layout",
  "components": {
    "Sidebar": {
      "params": { "items": { "type": "list" } },
      "localState": {
        "expandedCategory": { "type": "string", "initial": "" }
      },
      "localActions": [
        {
          "name": "toggleCategory",
          "steps": [{ "do": "set", "target": "expandedCategory", "value": { "expr": "var", "name": "payload" } }]
        }
      ],
      "view": {
        "kind": "each",
        "items": { "expr": "param", "name": "items" },
        "as": "item",
        "body": {
          "kind": "element",
          "tag": "div",
          "children": [
            {
              "kind": "element",
              "tag": "button",
              "props": {
                "onClick": {
                  "event": "click",
                  "action": "toggleCategory",
                  "payload": { "expr": "var", "name": "item", "path": "name" }
                }
              },
              "children": [
                { "kind": "text", "value": { "expr": "var", "name": "item", "path": "name" } }
              ]
            }
          ]
        }
      }
    }
  },
  "view": { ... }
}
```

Key features:
- Components in layouts support `localState` and `localActions`
- `param` expressions inside components are substituted with prop values
- Works with dynamic props from `each` loops
- Each component instance maintains independent state

Use layout in pages:

```json
{
  "route": {
    "path": "/docs/:slug",
    "layout": "docs",
    "layoutParams": {
      "title": { "expr": "data", "name": "doc", "path": "title" }
    }
  }
}
```

**Named Slots:**

```json
{ "kind": "slot", "name": "sidebar" }
```

## Static Paths

Generate static pages for dynamic routes:

```json
{
  "data": {
    "docs": {
      "type": "glob",
      "pattern": "content/docs/*.mdx",
      "transform": "mdx"
    }
  },
  "route": {
    "path": "/docs/:slug",
    "getStaticPaths": {
      "source": "docs",
      "params": {
        "slug": { "expr": "get", "base": { "expr": "var", "name": "item" }, "path": "slug" }
      }
    }
  }
}
```

## MDX Support

Markdown files with JSX components:

```mdx
---
title: Getting Started
---

# Welcome

<Callout type="info">
  This is an info callout.
</Callout>
```

### Security

MDX attribute expressions are validated at compile time. Dangerous patterns like `require()`, `eval()`, or `window` in actual code will throw explicit errors:

```mdx
<!-- Error: MDX attribute contains disallowed pattern: require -->
<Button data={require("module")} />
```

However, these words are allowed inside string literals:

```mdx
<!-- OK: "require" is inside a string literal -->
<PropsTable items={[{ description: "operations that require one" }]} />
```

## Islands Architecture

Define interactive islands for partial hydration:

```json
{
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      {
        "kind": "island",
        "id": "interactive-counter",
        "strategy": "visible",
        "strategyOptions": { "threshold": 0.5 },
        "content": {
          "kind": "element",
          "tag": "button",
          "props": { "onClick": { "event": "click", "action": "increment" } },
          "children": [{ "kind": "text", "value": { "expr": "state", "name": "count" } }]
        },
        "state": {
          "count": { "type": "number", "initial": 0 }
        },
        "actions": [
          {
            "name": "increment",
            "steps": [{ "do": "update", "target": "count", "operation": "increment" }]
          }
        ]
      }
    ]
  }
}
```

**Hydration Strategies:**

| Strategy | When to Hydrate | Use Case |
|----------|-----------------|----------|
| `load` | Immediately | Critical interactive elements |
| `idle` | Browser idle | Non-urgent interactions |
| `visible` | In viewport | Below-the-fold content |
| `interaction` | User interaction | Lazy-loaded widgets |
| `media` | Media query match | Responsive components |
| `never` | Never | Static content only |

**Build Optimization:**

Islands are automatically code-split during build:

```bash
npx constela build --islands
```

Output structure:

```
dist/
  _islands/
    interactive-counter.js   # Island-specific bundle
    chart-widget.js
  client.js                  # Main client bundle
```

## Configuration

Create `constela.config.json`:

```json
{
  "adapter": "node",
  "css": "src/styles/globals.css",
  "layoutsDir": "src/layouts",
  "islands": {
    "enabled": true,
    "defaultStrategy": "visible"
  },
  "streaming": {
    "enabled": true,
    "flushStrategy": "batched"
  }
}
```

**Adapters:** `cloudflare`, `vercel`, `deno`, `node`

## Internal API

> For framework developers only. End users should use the CLI.

### createDevServer

```typescript
import { createDevServer } from '@constela/start';

const server = await createDevServer({
  port: 3000,
  routesDir: 'src/routes',
  layoutsDir: 'src/layouts',
});
```

### build

```typescript
import { build } from '@constela/start';

const result = await build({
  outDir: 'dist',
  routesDir: 'src/routes',
  target: 'node',
});
```

### DataLoader

```typescript
import { DataLoader } from '@constela/start';

const loader = new DataLoader('src/routes');
const posts = await loader.loadGlob('content/blog/*.mdx', 'mdx');
const config = await loader.loadFile('data/config.json');
```

### LayoutResolver

```typescript
import { LayoutResolver } from '@constela/start';

const resolver = new LayoutResolver('src/layouts');
await resolver.scan();
const layout = await resolver.load('docs');
```

### API Routes

```typescript
// src/routes/api/users.ts
export const GET = async (ctx) => {
  return new Response(JSON.stringify({ users: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Middleware

```typescript
// src/routes/_middleware.ts
export default async (ctx, next) => {
  console.log('Request:', ctx.url);
  return next();
};
```

### Edge Adapters

Deploy to any edge platform with streaming support:

```typescript
import { createAdapter } from '@constela/start';

const adapter = createAdapter({
  platform: 'cloudflare',
  routes: scannedRoutes,
  streaming: true,
});

export default { fetch: adapter.fetch };
```

**Platform-specific adapters:**

```typescript
// Cloudflare Workers
import { cloudflareAdapter } from '@constela/start/adapters/cloudflare';

export default {
  fetch: cloudflareAdapter({
    routes: scannedRoutes,
    streaming: true,
  }),
};

// Vercel Edge
import { vercelAdapter } from '@constela/start/adapters/vercel';

export const config = { runtime: 'edge' };
export default vercelAdapter({ routes: scannedRoutes, streaming: true });

// Deno Deploy
import { denoAdapter } from '@constela/start/adapters/deno';

Deno.serve(denoAdapter({ routes: scannedRoutes, streaming: true }));

// Node.js
import { nodeAdapter } from '@constela/start/adapters/node';
import { createServer } from 'http';

const handler = nodeAdapter({ routes: scannedRoutes, streaming: true });
createServer(handler).listen(3000);
```

**Streaming Response:**

All adapters support streaming HTML responses:

```typescript
// Returns ReadableStream<Uint8Array> for streaming
const response = await adapter.fetch(request);
// Content-Type: text/html; charset=utf-8
// Transfer-Encoding: chunked
```

## License

MIT
