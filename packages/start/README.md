# @constela/start

Meta-framework for Constela applications with dev server, build tools, and SSG.

## Installation

```bash
npm install @constela/start
```

## Overview

This package provides a full-stack framework for building Constela applications:

- **Dev Server** - Vite-powered development server with HMR
- **Build** - Production builds with SSG support
- **File Router** - File-based routing conventions
- **Data Loading** - Glob, file, and API data sources
- **MDX** - Markdown with JSX component support
- **Layouts** - Nested layout composition
- **API Routes** - Server-side API endpoints
- **Middleware** - Request middleware chain
- **Edge Adapters** - Deploy to Cloudflare, Vercel, Deno

## CLI Usage

```bash
# Development server
npx constela-start dev --port 3000

# Production build
npx constela-start build --outDir dist

# Start production server
npx constela-start start --port 3000
```

## API Reference

### createDevServer

Creates a development server with hot reload.

```typescript
import { createDevServer } from '@constela/start';

const server = await createDevServer({
  port: 3000,
  host: 'localhost',
  routesDir: 'src/pages',
  publicDir: 'public',
  layoutsDir: 'src/layouts',
  css: {
    links: ['/styles/main.css'],
  },
});
```

**DevServerOptions:**
- `port?: number` - Server port (default: 3000)
- `host?: string` - Server host (default: localhost)
- `routesDir?: string` - Pages directory (default: src/pages)
- `publicDir?: string` - Static files directory (default: public)
- `layoutsDir?: string` - Layouts directory
- `css?: { links?: string[] }` - CSS configuration

### build

Builds the application for production.

```typescript
import { build } from '@constela/start';

const result = await build({
  outDir: 'dist',
  routesDir: 'src/pages',
  publicDir: 'public',
  layoutsDir: 'src/layouts',
  css: { links: ['/styles/main.css'] },
  target: 'node', // or 'edge'
});

console.log('Routes:', result.routes);
console.log('Files:', result.files);
```

**BuildOptions:**
- `outDir?: string` - Output directory (default: dist)
- `routesDir?: string` - Pages directory
- `publicDir?: string` - Static files directory
- `layoutsDir?: string` - Layouts directory
- `css?: { links?: string[] }` - CSS configuration
- `target?: 'node' | 'edge'` - Build target

### generateStaticPages

Generates static HTML pages for SSG.

```typescript
import { generateStaticPages } from '@constela/start';

const files = await generateStaticPages({
  routesDir: 'src/pages',
  outDir: 'dist',
  layoutsDir: 'src/layouts',
});
```

## File-Based Routing

### scanRoutes

Discovers routes from the file system.

```typescript
import { scanRoutes } from '@constela/start';

const routes = await scanRoutes('src/pages');
// [{ path: '/', file: 'index.json', type: 'page' }, ...]
```

**Routing Conventions:**

| File | Route |
|------|-------|
| `index.json` | `/` |
| `about.json` | `/about` |
| `users/[id].json` | `/users/:id` |
| `docs/[...slug].json` | `/docs/*` |
| `api/users.ts` | `/api/users` (API route) |
| `_middleware.ts` | Middleware |

### filePathToPattern

Converts file paths to route patterns.

```typescript
import { filePathToPattern } from '@constela/start';

filePathToPattern('users/[id].json'); // '/users/:id'
filePathToPattern('docs/[...slug].json'); // '/docs/*'
```

## Data Loading

### DataLoader

Loads data from various sources.

```typescript
import { DataLoader } from '@constela/start';

const loader = new DataLoader('src/pages');

// Glob pattern
const posts = await loader.loadGlob('content/blog/*.mdx', 'mdx');

// Single file
const config = await loader.loadFile('data/config.json');

// API endpoint
const users = await loader.loadApi('https://api.example.com/users');
```

### Data Source Types

**Glob Pattern:**
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

**File:**
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

**API:**
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

### Transforms

- `mdx` - Markdown with JSX to Constela nodes
- `yaml` - YAML to JSON
- `csv` - CSV to array of objects

## MDX Support

### mdxToConstela

Transforms MDX content to Constela view nodes.

```typescript
import { mdxToConstela } from '@constela/start';

const result = await mdxToConstela(mdxContent, {
  components: {
    Callout: {
      params: { type: { type: 'string' } },
      view: { kind: 'element', tag: 'div', ... },
    },
  },
});
```

**Supported Markdown:**
- Headings, paragraphs, emphasis, strong
- Links, images, lists (ordered/unordered)
- Blockquotes, tables (GFM)
- Code blocks with language
- Horizontal rules, line breaks

**MDX Extensions:**
- JSX elements
- Custom components (PascalCase)
- Expression interpolation

### Static Paths with MDX

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

## Layout System

### LayoutResolver

Manages layout discovery and composition.

```typescript
import { LayoutResolver } from '@constela/start';

const resolver = new LayoutResolver('src/layouts');
await resolver.scan();

if (resolver.has('docs')) {
  const layout = await resolver.load('docs');
}
```

### Layout Definition

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

**Named Slots:**
```json
{ "kind": "slot", "name": "sidebar" }
```

### Page with Layout

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

## API Routes

### createAPIHandler

Creates an API route handler.

```typescript
import { createAPIHandler } from '@constela/start';

const handler = createAPIHandler({
  GET: async (ctx) => {
    return new Response(JSON.stringify({ users: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  POST: async (ctx) => {
    const body = await ctx.request.json();
    // ...
  },
});
```

**APIContext:**
```typescript
interface APIContext {
  params: Record<string, string>;
  query: URLSearchParams;
  request: Request;
}
```

**Supported Methods:** GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

## Middleware

### createMiddlewareChain

Creates a middleware chain for request processing.

```typescript
import { createMiddlewareChain } from '@constela/start';

const chain = createMiddlewareChain([
  async (ctx, next) => {
    console.log('Request:', ctx.url);
    const response = await next();
    console.log('Response:', response.status);
    return response;
  },
  async (ctx, next) => {
    ctx.locals.user = await getUser(ctx.request);
    return next();
  },
]);
```

**MiddlewareContext:**
```typescript
interface MiddlewareContext {
  request: Request;
  params: Record<string, string>;
  url: URL;
  locals: Record<string, unknown>;
}
```

## Edge Adapters

### createAdapter

Creates an adapter for edge deployment.

```typescript
import { createAdapter } from '@constela/start';

const adapter = createAdapter({
  platform: 'cloudflare', // or 'vercel', 'deno', 'node'
  routes: scannedRoutes,
  fallback: notFoundProgram,
});

// Cloudflare Workers
export default {
  fetch: adapter.fetch,
};
```

**Platforms:**
- `cloudflare` - Cloudflare Workers
- `vercel` - Vercel Edge Functions
- `deno` - Deno Deploy
- `node` - Node.js

## Page Types

### Static Page

```typescript
// pages/about.ts
import type { CompiledProgram } from '@constela/compiler';

const page: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: { kind: 'element', tag: 'div', ... },
};

export default page;
```

### Dynamic Page

```typescript
// pages/users/[id].ts
import type { PageExportFunction, StaticPathsResult } from '@constela/start';

export const getStaticPaths = async (): Promise<StaticPathsResult> => ({
  paths: [
    { params: { id: '1' } },
    { params: { id: '2' } },
  ],
});

const page: PageExportFunction = async (params) => {
  const user = await fetchUser(params.id);
  return compileUserPage(user);
};

export default page;
```

## Configuration

### ConstelaConfig

```typescript
interface ConstelaConfig {
  adapter?: 'cloudflare' | 'vercel' | 'deno' | 'node';
  ssg?: {
    routes?: string[];
  };
}
```

## Exports

### Runtime Entry Points

```typescript
// Client-side hydration
import '@constela/start/client';

// Server-side rendering
import { render } from '@constela/start/server';
```

## License

MIT
