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

2. Create a page (`src/routes/index.json`):

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
    routes/           # Page files (.json)
      index.json      # / route
      about.json      # /about route
      users/
        [id].json     # /users/:id route
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
| `index.json` | `/` |
| `about.json` | `/about` |
| `users/[id].json` | `/users/:id` |
| `docs/[...slug].json` | `/docs/*` |

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

## Configuration

Create `constela.config.json`:

```json
{
  "adapter": "node",
  "css": "src/styles/globals.css",
  "layoutsDir": "src/layouts"
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

```typescript
import { createAdapter } from '@constela/start';

const adapter = createAdapter({
  platform: 'cloudflare',
  routes: scannedRoutes,
});

export default { fetch: adapter.fetch };
```

## License

MIT
