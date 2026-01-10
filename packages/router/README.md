# @constela/router

Client-side routing for Constela applications using the History API.

## Installation

```bash
npm install @constela/router
```

**Peer Dependencies:**
- `@constela/compiler` ^0.7.0
- `@constela/runtime` ^0.10.1

## Overview

This package provides History API-based client-side routing without changes to the core DSL. Features:

- **Dynamic Routes** - Parameter extraction (`:id`)
- **Catch-all Routes** - Wildcard patterns (`*`)
- **Programmatic Navigation** - Navigate via API
- **Browser Integration** - Back/forward button support

## API Reference

### createRouter

Creates a router instance.

```typescript
import { createRouter } from '@constela/router';

const router = createRouter({
  routes: [
    { path: '/', program: homeProgram, title: 'Home' },
    { path: '/about', program: aboutProgram, title: 'About' },
    { path: '/users/:id', program: userProgram, title: (ctx) => `User ${ctx.params.id}` },
    { path: '/docs/*', program: docsProgram, title: 'Documentation' },
  ],
  basePath: '/app', // Optional base path
  fallback: notFoundProgram, // 404 page
  onRouteChange: (ctx) => {
    console.log('Route changed:', ctx.path);
  },
});
```

**RouterOptions:**
- `routes: RouteDef[]` - Route definitions
- `basePath?: string` - Optional URL prefix
- `fallback?: CompiledProgram` - 404 fallback program
- `onRouteChange?: (ctx: RouteContext) => void` - Route change callback

### RouterInstance

```typescript
interface RouterInstance {
  mount(element: HTMLElement): { destroy: () => void };
  navigate(to: string, options?: { replace?: boolean }): void;
  getContext(): RouteContext;
}
```

#### mount(element)

Mounts the router to a DOM element.

```typescript
const { destroy } = router.mount(document.getElementById('app'));

// Later: cleanup
destroy();
```

#### navigate(to, options?)

Programmatic navigation.

```typescript
// Push to history
router.navigate('/users/123');

// Replace current entry
router.navigate('/login', { replace: true });
```

#### getContext()

Gets current route context.

```typescript
const ctx = router.getContext();
console.log(ctx.path);   // '/users/123'
console.log(ctx.params); // { id: '123' }
console.log(ctx.query);  // URLSearchParams
```

### RouteDef

```typescript
interface RouteDef {
  path: string;
  program: CompiledProgram;
  title?: string | ((ctx: RouteContext) => string);
}
```

### RouteContext

```typescript
interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}
```

## Helper Functions

### bindLink

Binds an anchor element to router navigation.

```typescript
import { bindLink } from '@constela/router';

const anchor = document.querySelector('a[href="/about"]');
bindLink(router, anchor, '/about');
```

Prevents default navigation and uses client-side routing instead.

### createLink

Creates a router-aware anchor element.

```typescript
import { createLink } from '@constela/router';

const link = createLink(router, '/users/123', 'View User');
document.body.appendChild(link);
```

### matchRoute

Matches a path against a route pattern.

```typescript
import { matchRoute } from '@constela/router';

const match = matchRoute('/users/:id', '/users/123');
// match = { id: '123' } or null if no match
```

### parseParams

Extracts parameters from a matched path.

```typescript
import { parseParams } from '@constela/router';

const params = parseParams('/users/:id/posts/:postId', '/users/123/posts/456');
// params = { id: '123', postId: '456' }
```

## Route Patterns

| Pattern | Example Path | Params |
|---------|--------------|--------|
| `/` | `/` | `{}` |
| `/about` | `/about` | `{}` |
| `/users/:id` | `/users/123` | `{ id: '123' }` |
| `/posts/:id/comments/:cid` | `/posts/1/comments/5` | `{ id: '1', cid: '5' }` |
| `/docs/*` | `/docs/getting-started/intro` | Catch-all |

## Usage with DSL

Route parameters are accessible in DSL expressions:

```json
{
  "route": {
    "path": "/users/:id"
  },
  "view": {
    "kind": "text",
    "value": { "expr": "route", "name": "id", "source": "param" }
  }
}
```

**Route Sources:**
- `param` - URL parameters (default)
- `query` - Query string parameters
- `path` - Full path string

## Example

```typescript
import { compile } from '@constela/compiler';
import { createRouter, bindLink } from '@constela/router';

// Compile pages
const homeProgram = compile(homeAst).program;
const aboutProgram = compile(aboutAst).program;

// Create router
const router = createRouter({
  routes: [
    { path: '/', program: homeProgram, title: 'Home' },
    { path: '/about', program: aboutProgram, title: 'About' },
  ],
});

// Mount
const { destroy } = router.mount(document.getElementById('app'));

// Bind existing links
document.querySelectorAll('a[data-route]').forEach((a) => {
  bindLink(router, a, a.getAttribute('href'));
});
```

## License

MIT
