# @constela/router

Client-side routing for Constela applications using the History API.

## Installation

```bash
npm install @constela/router
```

**Peer Dependencies:**
- `@constela/compiler` ^0.7.0
- `@constela/runtime` ^0.10.1

## Route Definition

Define routes in your JSON program:

```json
{
  "route": {
    "path": "/users/:id",
    "title": { "expr": "bin", "op": "+", "left": { "expr": "lit", "value": "User: " }, "right": { "expr": "route", "name": "id" } },
    "layout": "MainLayout",
    "meta": {
      "description": { "expr": "lit", "value": "User profile page" }
    }
  },
  "state": { ... },
  "actions": [ ... ],
  "view": { ... }
}
```

## Accessing Route Parameters

Use the `route` expression in your JSON:

**URL parameter** (e.g., `/users/123` → `"123"`):
```json
{ "expr": "route", "name": "id", "source": "param" }
```

**Query string parameter** (e.g., `?tab=settings` → `"settings"`):
```json
{ "expr": "route", "name": "tab", "source": "query" }
```

**Full path**:
```json
{ "expr": "route", "source": "path" }
```

## Route Patterns

| Pattern | Example Path | Params |
|---------|--------------|--------|
| `/` | `/` | `{}` |
| `/about` | `/about` | `{}` |
| `/users/:id` | `/users/123` | `{ id: "123" }` |
| `/posts/:id/comments/:cid` | `/posts/1/comments/5` | `{ id: "1", cid: "5" }` |
| `/docs/*` | `/docs/getting-started/intro` | Catch-all |

## File-Based Routing

With `@constela/start`, routes are derived from file paths:

| File | Route |
|------|-------|
| `src/routes/index.json` | `/` |
| `src/routes/about.json` | `/about` |
| `src/routes/users/[id].json` | `/users/:id` |
| `src/routes/docs/[...slug].json` | `/docs/*` |

## Example: Dynamic Page

```json
{
  "version": "1.0",
  "route": {
    "path": "/users/:id"
  },
  "state": {
    "user": { "type": "object", "initial": null },
    "loading": { "type": "boolean", "initial": true }
  },
  "lifecycle": {
    "onMount": "fetchUser"
  },
  "actions": [
    {
      "name": "fetchUser",
      "steps": [
        {
          "do": "fetch",
          "url": {
            "expr": "bin",
            "op": "+",
            "left": { "expr": "lit", "value": "https://api.example.com/users/" },
            "right": { "expr": "route", "name": "id" }
          },
          "method": "GET",
          "onSuccess": [
            { "do": "set", "target": "user", "value": { "expr": "var", "name": "data" } },
            { "do": "set", "target": "loading", "value": { "expr": "lit", "value": false } }
          ]
        }
      ]
    }
  ],
  "view": {
    "kind": "if",
    "condition": { "expr": "state", "name": "loading" },
    "then": { "kind": "text", "value": { "expr": "lit", "value": "Loading..." } },
    "else": {
      "kind": "element",
      "tag": "h1",
      "children": [
        { "kind": "text", "value": { "expr": "get", "base": { "expr": "state", "name": "user" }, "path": "name" } }
      ]
    }
  }
}
```

## Navigation

Navigate using the `navigate` action step:

**Basic navigation**:
```json
{
  "name": "goToProfile",
  "steps": [
    { "do": "navigate", "url": { "expr": "lit", "value": "/profile" } }
  ]
}
```

**With dynamic URL**:
```json
{
  "name": "goToUser",
  "steps": [
    {
      "do": "navigate",
      "url": {
        "expr": "bin",
        "op": "+",
        "left": { "expr": "lit", "value": "/users/" },
        "right": { "expr": "state", "name": "selectedUserId" }
      }
    }
  ]
}
```

**Replace history** (no back button):
```json
{
  "do": "navigate",
  "url": { "expr": "lit", "value": "/login" },
  "replace": true
}
```

## Internal API

> For framework developers only. End users should use the CLI.

### createRouter

```typescript
import { createRouter } from '@constela/router';

const router = createRouter({
  routes: [
    { path: '/', program: homeProgram, title: 'Home' },
    { path: '/about', program: aboutProgram, title: 'About' },
    { path: '/users/:id', program: userProgram, title: (ctx) => `User ${ctx.params.id}` },
  ],
  basePath: '/app',
  fallback: notFoundProgram,
  onRouteChange: (ctx) => console.log('Route changed:', ctx.path),
});

const { destroy } = router.mount(document.getElementById('app'));
router.navigate('/about');
```

### Helper Functions

```typescript
import { bindLink, createLink, matchRoute, parseParams } from '@constela/router';

// Bind existing anchor to router
bindLink(router, document.querySelector('a[href="/about"]'), '/about');

// Create router-aware anchor
const link = createLink(router, '/users/123', 'View User');

// Match route pattern
const match = matchRoute('/users/:id', '/users/123'); // { id: '123' }

// Parse params from path
const params = parseParams('/users/:id/posts/:postId', '/users/123/posts/456');
// { id: '123', postId: '456' }
```

## License

MIT
