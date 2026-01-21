# Constela

Constela is a compiler-first UI **language** designed for vibecoding.

Unlike React or Next.js, you do not write UI with JavaScript.
You describe UI behavior as a constrained JSON DSL,
which is validated, analyzed, and compiled into minimal runtime code.

Constela is optimized for:
- AI-generated UI
- deterministic behavior
- inspectable and debuggable state transitions

### Mental Model

| | Constela | React / Next.js |
|---|---|---|
| UI authoring | JSON DSL | JavaScript / JSX |
| Execution | compiler-driven | runtime-driven |
| State updates | declarative actions | arbitrary JS |
| Errors | structured errors | runtime exceptions |

### Measured Differences

We rebuilt Constela's official website using both Constela and Next.js and compared the results.
The measurements were repeated multiple times and showed consistent trends.

| Metric           | Constela | Next.js | Difference |
|------------------|----------|---------|------------|
| Build time       | 2.2s     | 12.3s   | 5.6× faster |
| node_modules size| 297MB    | 794MB   | 2.7× smaller |
| Output size      | 14MB     | 72MB    | 5.1× smaller |
| Deploy time      | 10s      | 50s     | 5.0× faster |

This is not an accidental optimization, but a structural difference:

- **Next.js** is a full application framework with routing analysis, bundling, optimization, and runtime setup.
- **Constela** is a compiler-first UI language. JSON is validated and compiled directly into minimal output.

> Note: Performance is not Constela's primary goal.
> The core value lies in compile-time validation and safe UI generation.
> These characteristics are a direct consequence of its design.

## Quick Start

### Create a New Project

The fastest way to get started with Constela:

```bash
npx create-constela my-app
cd my-app
npm run dev
```

Open http://localhost:3000 to see your app.

### Manual Installation

```bash
# Recommended: Full-stack development
npm install @constela/start

# Low-level API (advanced)
npm install @constela/runtime @constela/compiler
```

### Basic Usage

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

3. Start the dev server:

```bash
npx constela dev
```

Open http://localhost:3000 to see your app.

## DSL Overview

Constela programs are JSON documents with this structure:

```json
{
  "version": "1.0",
  "route": { ... },
  "imports": { ... },
  "data": { ... },
  "lifecycle": { ... },
  "state": { ... },
  "actions": [ ... ],
  "view": { ... },
  "components": { ... }
}
```

All fields except `version`, `state`, `actions`, and `view` are optional.

### State

Declare application state with explicit types:

```json
{
  "state": {
    "count": { "type": "number", "initial": 0 },
    "query": { "type": "string", "initial": "" },
    "items": { "type": "list", "initial": [] },
    "isVisible": { "type": "boolean", "initial": true },
    "form": { "type": "object", "initial": { "name": "", "email": "" } }
  }
}
```

**State types:** `number`, `string`, `list`, `boolean`, `object`

### View Nodes

Five node types for building UI:

```json
// Element node
{ "kind": "element", "tag": "div", "props": { "className": "container" }, "children": [...] }

// Text node
{ "kind": "text", "value": { "expr": "state", "name": "count" } }

// Conditional node
{ "kind": "if", "condition": { "expr": "state", "name": "visible" }, "then": {...}, "else": {...} }

// Loop node
{ "kind": "each", "items": { "expr": "state", "name": "todos" }, "as": "item", "body": {...} }

// Portal node (render children to a different DOM location)
{ "kind": "portal", "target": "body", "children": [...] }
```

**Portal targets:** `body`, `head`, or any CSS selector

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

// Conditional (if/then/else)
{ "expr": "cond", "if": {...}, "then": {...}, "else": {...} }

// Property access
{ "expr": "get", "base": { "expr": "state", "name": "user" }, "path": "address.city" }

// Route parameter (requires route definition)
{ "expr": "route", "name": "id", "source": "param" }

// Imported data reference (requires imports field)
{ "expr": "import", "name": "navigation", "path": "items" }

// Build-time data reference (requires data field)
{ "expr": "data", "name": "posts", "path": "0.title" }

// Form validation state (requires ref on form element)
{ "expr": "validity", "ref": "emailInput", "property": "valid" }
{ "expr": "validity", "ref": "emailInput", "property": "message" }
```

**Binary operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`

**Route sources:** `param` (default), `query`, `path`

**Validity properties:** `valid`, `valueMissing`, `typeMismatch`, `patternMismatch`, `tooLong`, `tooShort`, `rangeUnderflow`, `rangeOverflow`, `customError`, `message`

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
- `update` - Update with operation (see below)
- `fetch` - HTTP request with `onSuccess`/`onError` handlers
- `storage` - localStorage/sessionStorage operations
- `clipboard` - Clipboard read/write
- `navigate` - Page navigation
- `delay` - Execute steps after a delay
- `interval` - Execute action periodically
- `clearTimer` - Stop a running timer
- `focus` - Focus, blur, or select form elements

**Update operations:**

| Operation | State Type | Required Fields | Description |
|-----------|------------|-----------------|-------------|
| `increment` | number | - | Add to number (default: 1) |
| `decrement` | number | - | Subtract from number (default: 1) |
| `push` | list | `value` | Add item to end of array |
| `pop` | list | - | Remove last item from array |
| `remove` | list | `value` | Remove item by value or index |
| `toggle` | boolean | - | Flip boolean value |
| `merge` | object | `value` | Shallow merge into object |
| `replaceAt` | list | `index`, `value` | Replace item at index |
| `insertAt` | list | `index`, `value` | Insert item at index |
| `splice` | list | `index`, `deleteCount` | Delete/insert items |

```json
// Toggle boolean
{ "do": "update", "target": "isOpen", "operation": "toggle" }

// Merge object
{ "do": "update", "target": "form", "operation": "merge", "value": { "expr": "lit", "value": { "name": "John" } } }

// Replace at index
{ "do": "update", "target": "items", "operation": "replaceAt", "index": { "expr": "lit", "value": 0 }, "value": {...} }

// Insert at index
{ "do": "update", "target": "items", "operation": "insertAt", "index": { "expr": "lit", "value": 1 }, "value": {...} }

// Splice (delete 2 items at index 1, insert new items)
{ "do": "update", "target": "items", "operation": "splice", "index": { "expr": "lit", "value": 1 }, "deleteCount": { "expr": "lit", "value": 2 }, "value": { "expr": "lit", "value": ["a", "b"] } }
```

### Browser Actions

```json
// Storage (localStorage/sessionStorage)
{
  "do": "storage",
  "operation": "get",
  "key": { "expr": "lit", "value": "theme" },
  "storage": "local",
  "result": "savedTheme",
  "onSuccess": [
    { "do": "set", "target": "theme", "value": { "expr": "var", "name": "savedTheme" } }
  ]
}

{ "do": "storage", "operation": "set", "key": { "expr": "lit", "value": "theme" }, "value": { "expr": "state", "name": "theme" }, "storage": "local" }
{ "do": "storage", "operation": "remove", "key": { "expr": "lit", "value": "theme" }, "storage": "local" }

// Clipboard
{ "do": "clipboard", "operation": "write", "value": { "expr": "state", "name": "textToCopy" } }
{ "do": "clipboard", "operation": "read", "result": "clipboardText" }

// Navigate
{ "do": "navigate", "url": { "expr": "lit", "value": "/about" } }
{ "do": "navigate", "url": { "expr": "lit", "value": "https://example.com" }, "target": "_blank" }
{ "do": "navigate", "url": { "expr": "state", "name": "redirectUrl" }, "replace": true }
```

**Storage operations:** `get`, `set`, `remove`
**Storage types:** `local`, `session`
**Clipboard operations:** `write`, `read`
**Navigate targets:** `_self` (default), `_blank`

### Timer Actions

```json
// Delay execution
{
  "do": "delay",
  "ms": { "expr": "lit", "value": 2000 },
  "then": [
    { "do": "set", "target": "message", "value": { "expr": "lit", "value": "Delayed!" } }
  ]
}

// Periodic execution (returns timer ID)
{
  "do": "interval",
  "ms": { "expr": "lit", "value": 5000 },
  "action": "fetchData",
  "result": "pollTimerId"
}

// Stop a timer
{ "do": "clearTimer", "target": { "expr": "state", "name": "pollTimerId" } }
```

**Timer operations:**
- `delay` - Execute `then` steps after `ms` milliseconds
- `interval` - Execute `action` every `ms` milliseconds, stores timer ID in `result`
- `clearTimer` - Stop a running timer by its ID

### Form Actions

```json
// Focus an input element
{ "do": "focus", "target": { "expr": "ref", "name": "emailInput" }, "operation": "focus" }

// Select text in an input
{ "do": "focus", "target": { "expr": "ref", "name": "codeInput" }, "operation": "select" }

// Blur (unfocus) an element
{ "do": "focus", "target": { "expr": "ref", "name": "searchInput" }, "operation": "blur" }
```

**Focus operations:** `focus`, `blur`, `select`

### Advanced Actions

#### DOM Manipulation

Manipulate DOM elements via refs:

```json
// Define a ref on an element
{
  "kind": "element",
  "tag": "div",
  "ref": "myElement",
  "children": [...]
}

// Manipulate via action
{ "do": "dom", "operation": "addClass", "ref": "myElement", "value": { "expr": "lit", "value": "active" } }
{ "do": "dom", "operation": "removeClass", "ref": "myElement", "value": { "expr": "lit", "value": "active" } }
{ "do": "dom", "operation": "toggleClass", "ref": "myElement", "value": { "expr": "lit", "value": "visible" } }
{ "do": "dom", "operation": "setAttribute", "ref": "myElement", "attr": "data-state", "value": { "expr": "state", "name": "currentState" } }
{ "do": "dom", "operation": "removeAttribute", "ref": "myElement", "attr": "disabled" }
```

**DOM operations:** `addClass`, `removeClass`, `toggleClass`, `setAttribute`, `removeAttribute`

#### Dynamic Imports & External Libraries

Import external JavaScript modules and call their methods:

```json
// Import a module
{ "do": "import", "module": "chart.js", "result": "Chart" }

// Call a method on the imported module
{ "do": "call", "ref": "Chart", "method": "create", "args": [{ "expr": "ref", "name": "canvas" }, { "expr": "state", "name": "chartConfig" }], "result": "chartInstance" }

// Subscribe to events
{ "do": "subscribe", "ref": "eventSource", "event": "message", "action": "handleMessage" }

// Dispose resources
{ "do": "dispose", "ref": "chartInstance" }
```

**Note:** Subscriptions are automatically disposed on component unmount.

### Markdown & Code Blocks

Render Markdown content and syntax-highlighted code:

```json
// Markdown node
{
  "kind": "markdown",
  "content": { "expr": "state", "name": "markdownContent" }
}

// Code block with syntax highlighting
{
  "kind": "code",
  "code": { "expr": "lit", "value": "const x: number = 42;" },
  "language": { "expr": "lit", "value": "typescript" }
}
```

**Features:**
- Markdown rendered with [marked](https://marked.js.org/)
- Code highlighting with [Shiki](https://shiki.style/)
- Dual theme support (light/dark)
- Built-in copy button

### Components

Reusable view definitions with props and slots:

```json
{
  "components": {
    "Button": {
      "params": {
        "label": { "type": "string" },
        "disabled": { "type": "boolean", "required": false }
      },
      "view": {
        "kind": "element",
        "tag": "button",
        "props": { "disabled": { "expr": "param", "name": "disabled" } },
        "children": [
          { "kind": "text", "value": { "expr": "param", "name": "label" } }
        ]
      }
    },
    "Card": {
      "params": { "title": { "type": "string" } },
      "view": {
        "kind": "element",
        "tag": "div",
        "children": [
          { "kind": "text", "value": { "expr": "param", "name": "title" } },
          { "kind": "slot" }
        ]
      }
    }
  }
}
```

**Using components:**

```json
{
  "kind": "component",
  "name": "Card",
  "props": { "title": { "expr": "lit", "value": "My Card" } },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Card content goes here" } }
  ]
}
```

**Param types:** `string`, `number`, `boolean`, `json`

**Param expression:**
```json
{ "expr": "param", "name": "label" }
{ "expr": "param", "name": "user", "path": "name" }
```

### Component Local State

Components can have their own independent local state that is not shared with other instances:

```json
{
  "components": {
    "Accordion": {
      "params": { "title": { "type": "string" } },
      "localState": {
        "isExpanded": { "type": "boolean", "initial": false }
      },
      "localActions": [
        {
          "name": "toggle",
          "steps": [{ "do": "update", "target": "isExpanded", "operation": "toggle" }]
        }
      ],
      "view": {
        "kind": "element",
        "tag": "div",
        "children": [
          {
            "kind": "element",
            "tag": "button",
            "props": {
              "onClick": { "event": "click", "action": "toggle" }
            },
            "children": [
              { "kind": "text", "value": { "expr": "param", "name": "title" } }
            ]
          },
          {
            "kind": "if",
            "condition": { "expr": "state", "name": "isExpanded" },
            "then": { "kind": "slot" }
          }
        ]
      }
    }
  }
}
```

**Key features:**
- Each component instance maintains its own state
- `localState` uses the same syntax as global `state`
- `localActions` can only use `set`, `update`, and `setPath` steps (no `fetch`, `navigate`, etc.)
- Access local state with `{ "expr": "state", "name": "isExpanded" }` within the component

**Use cases:**
- Accordion / Collapsible sections
- Dropdowns and tooltips
- Form field validation state
- Toggle switches
- Any component that needs internal state without polluting global state

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

**Debounce & Throttle:**

```json
// Debounce: Wait 300ms after last event before executing
{ "event": "input", "action": "search", "debounce": 300 }

// Throttle: Execute at most once per 100ms
{ "event": "scroll", "action": "trackScroll", "throttle": 100 }
```

**IntersectionObserver (visibility tracking):**

```json
{
  "onIntersect": {
    "event": "intersect",
    "action": "loadMore",
    "options": { "threshold": 0.5, "rootMargin": "100px" }
  }
}
```

**Available event data variables:**

| Event Type | Available Variables |
|------------|---------------------|
| Input | `value`, `checked` |
| Keyboard | `key`, `code`, `ctrlKey`, `shiftKey`, `altKey`, `metaKey` |
| Mouse | `clientX`, `clientY`, `pageX`, `pageY`, `button` |
| Touch | `touches` (array with `clientX`, `clientY`, `pageX`, `pageY`) |
| Scroll | `scrollTop`, `scrollLeft` |
| File Input | `files` (array with `name`, `size`, `type`) |

### Route Definition

Define page routes with path, layout, and metadata:

```json
{
  "route": {
    "path": "/users/:id",
    "title": { "expr": "bin", "op": "+", "left": { "expr": "lit", "value": "User: " }, "right": { "expr": "route", "name": "id" } },
    "layout": "MainLayout",
    "meta": {
      "description": { "expr": "lit", "value": "User profile page" }
    }
  }
}
```

Access route params in expressions with `{ "expr": "route", "name": "id" }`.

### Meta Tag Generation

`route.title` and `route.meta` automatically generate HTML meta tags at build time.

**Example route definition:**

```json
{
  "route": {
    "path": "/posts/:slug",
    "title": {
      "expr": "concat",
      "items": [
        { "expr": "route", "name": "slug", "source": "param" },
        { "expr": "lit", "value": " | My Blog" }
      ]
    },
    "meta": {
      "description": { "expr": "lit", "value": "Read our latest blog posts" },
      "og:title": { "expr": "route", "name": "slug", "source": "param" },
      "og:type": { "expr": "lit", "value": "article" },
      "og:url": {
        "expr": "concat",
        "items": [
          { "expr": "lit", "value": "https://example.com" },
          { "expr": "route", "name": "", "source": "path" }
        ]
      },
      "twitter:card": { "expr": "lit", "value": "summary_large_image" }
    }
  }
}
```

**Generated HTML (for `/posts/hello-world`):**

```html
<title>hello-world | My Blog</title>
<meta name="description" content="Read our latest blog posts">
<meta property="og:title" content="hello-world">
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/posts/hello-world">
<meta property="twitter:card" content="summary_large_image">
```

**Tag generation rules:**

| Key | Generated Tag |
|-----|---------------|
| `title` | `<title>...</title>` |
| `og:*` | `<meta property="og:*" content="...">` |
| `twitter:*` | `<meta property="twitter:*" content="...">` |
| Other | `<meta name="*" content="...">` |

**Supported expressions for dynamic values:**

- `{ "expr": "lit", "value": "static text" }` - Literal value
- `{ "expr": "route", "name": "slug", "source": "param" }` - Route parameter
- `{ "expr": "route", "name": "q", "source": "query" }` - Query parameter
- `{ "expr": "route", "name": "", "source": "path" }` - Current path
- `{ "expr": "concat", "items": [...] }` - Concatenate multiple expressions

#### Canonical URL

Set canonical URL via `route.canonical`:

```json
{
  "route": {
    "path": "/posts/:slug",
    "canonical": {
      "expr": "bin",
      "op": "+",
      "left": { "expr": "lit", "value": "https://example.com" },
      "right": { "expr": "route", "source": "path" }
    }
  }
}
```

**Output (for `/posts/hello-world`):**
```html
<link rel="canonical" href="https://example.com/posts/hello-world">
```

#### JSON-LD Structured Data

Add structured data via `route.jsonLd`:

```json
{
  "route": {
    "path": "/posts/:slug",
    "jsonLd": {
      "type": "Article",
      "properties": {
        "headline": { "expr": "route", "name": "slug", "source": "param" },
        "author": {
          "expr": "object",
          "type": "Person",
          "properties": {
            "name": { "expr": "lit", "value": "John Doe" }
          }
        },
        "datePublished": { "expr": "lit", "value": "2024-01-15" }
      }
    }
  }
}
```

**Output:**
```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"hello-world","author":{"@type":"Person","name":"John Doe"},"datePublished":"2024-01-15"}
</script>
```

**JSON-LD features:**
- Nested objects with `{ "expr": "object", "type": "Person", "properties": {...} }`
- Arrays with `{ "expr": "array", "items": [...] }`
- Dynamic values using any expression type
- XSS protection (automatically escapes `</script>` and other dangerous sequences)

### Imports

Import external JSON data files:

```json
{
  "imports": {
    "navigation": "./data/navigation.json",
    "config": "./data/site-config.json"
  }
}
```

Access imported data with `{ "expr": "import", "name": "navigation", "path": "items" }`.

### Data Sources

Load data at build time for static site generation:

```json
{
  "data": {
    "posts": {
      "type": "glob",
      "pattern": "content/blog/*.mdx",
      "transform": "mdx"
    },
    "config": {
      "type": "file",
      "path": "data/config.json"
    },
    "users": {
      "type": "api",
      "url": "https://api.example.com/users"
    }
  },
  "route": {
    "path": "/posts/:slug",
    "getStaticPaths": {
      "source": "posts",
      "params": {
        "slug": { "expr": "get", "base": { "expr": "var", "name": "item" }, "path": "slug" }
      }
    }
  }
}
```

**Data source types:** `glob`, `file`, `api`
**Transforms:** `mdx`, `yaml`, `csv`

### Lifecycle Hooks

Execute actions on component lifecycle events:

```json
{
  "lifecycle": {
    "onMount": "loadTheme",
    "onUnmount": "saveState",
    "onRouteEnter": "fetchData",
    "onRouteLeave": "cleanup"
  },
  "actions": [
    {
      "name": "loadTheme",
      "steps": [
        {
          "do": "storage",
          "operation": "get",
          "key": { "expr": "lit", "value": "theme" },
          "storage": "local",
          "result": "savedTheme",
          "onSuccess": [
            { "do": "set", "target": "theme", "value": { "expr": "var", "name": "savedTheme" } }
          ]
        }
      ]
    }
  ]
}
```

### Layouts

Define reusable page layouts with slots:

```json
{
  "version": "1.0",
  "type": "layout",
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

Pages reference layouts via `route.layout`. The page's view is inserted at the `slot` node.

Named slots are supported for multi-slot layouts:
```json
{ "kind": "slot", "name": "sidebar" }
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

## Routing (via @constela/router)

Client-side routing is provided as a separate package that works alongside the core DSL.
**Note:** Routing is NOT part of the DSL - it's an application-level add-on.

```typescript
import { compile } from '@constela/compiler';
import { createRouter, bindLink } from '@constela/router';

// Compile multiple pages
const homeProgram = compile(homeAst).program;
const aboutProgram = compile(aboutAst).program;
const userProgram = compile(userAst).program;

// Create router
const router = createRouter({
  routes: [
    { path: '/', program: homeProgram, title: 'Home' },
    { path: '/about', program: aboutProgram, title: 'About' },
    { path: '/users/:id', program: userProgram, title: ctx => `User ${ctx.params.id}` },
  ],
  fallback: notFoundProgram,
  onRouteChange: (ctx) => {
    console.log('Route changed:', ctx.path, ctx.params);
  },
});

// Mount router
const { destroy } = router.mount(document.getElementById('app'));

// Programmatic navigation
router.navigate('/about');
router.navigate('/users/123', { replace: true });

// Bind links for client-side navigation
document.querySelectorAll('a[href]').forEach(a => bindLink(router, a));
```

**Route Context:**
```typescript
{
  path: string,           // Current path
  params: Record<string, string>,  // URL params (e.g., { id: '123' })
  query: URLSearchParams  // Query string params
}
```

**Note:** Route params are now accessible in DSL expressions via `{ "expr": "route", "name": "id" }` when using the `route` field in your program.

## Dynamic Routes (via @constela/start)

For SSG with dynamic routes, export a function that receives route params:

```typescript
// pages/docs/[...slug].ts
import type { PageExportFunction, StaticPathsResult } from '@constela/start';

export const getStaticPaths = async (): Promise<StaticPathsResult> => ({
  paths: [
    { params: { slug: 'getting-started' } },
    { params: { slug: 'api/components' } },
  ]
});

const page: PageExportFunction = async (params) => {
  const content = await loadMarkdown(`docs/${params.slug}.md`);
  return compileToProgram(content);
};

export default page;
```

Static `CompiledProgram` exports continue to work for non-dynamic routes:

```typescript
// pages/about.ts
export default {
  version: '1.0',
  state: {},
  actions: {},
  view: { kind: 'element', tag: 'div', ... }
};
```

## Full-Stack Development (via @constela/start)

`@constela/start` provides a complete framework for building Constela applications:

### Configuration

Configure your application via `constela.config.json`:

#### HTML lang Attribute

Set the `lang` attribute on `<html>`:

```json
{
  "seo": {
    "lang": "ja"
  }
}
```

**Output:** `<html lang="ja">`

Supports all BCP 47 language tags including extended forms like `zh-Hans-CN`, `de-DE-u-co-phonebk`.

### Dev Server

```bash
# Start development server
npx constela dev --port 3000
```

Features:
- Vite-powered hot reload
- File-based routing
- Layout composition
- SSR with hydration

### Hot Module Replacement (HMR)

The dev server includes built-in HMR that works automatically:

- **Edit JSON, save, see changes** - No manual refresh needed
- **State is preserved** - Form inputs, counters, and UI state survive updates
- **Error overlay** - Compile errors are shown with suggestions
- **Auto-reconnect** - Connection loss is handled gracefully

Just run `npx constela dev` and start editing your JSON files.

### Production Build

```bash
# Build for production
npx constela build --outDir dist
```

Generates:
- Static HTML for all routes
- Bundled runtime JavaScript
- Optimized assets

### MDX Support

Transform Markdown with JSX components:

```json
{
  "data": {
    "docs": {
      "type": "glob",
      "pattern": "content/docs/*.mdx",
      "transform": "mdx"
    }
  }
}
```

MDX files support:
- Frontmatter (YAML)
- Custom components
- Code blocks with syntax highlighting
- GitHub Flavored Markdown

### API Routes

Create server-side API endpoints:

```typescript
// pages/api/users.ts
export const GET = async (ctx) => {
  return new Response(JSON.stringify({ users: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = async (ctx) => {
  const body = await ctx.request.json();
  // Handle POST request
};
```

### Middleware

Add request middleware:

```typescript
// pages/_middleware.ts
export default async (ctx, next) => {
  console.log('Request:', ctx.url);
  const response = await next();
  return response;
};
```

### Edge Deployment

Deploy to edge platforms:

```typescript
import { createAdapter } from '@constela/start';

const adapter = createAdapter({
  platform: 'cloudflare', // 'vercel' | 'deno' | 'node'
  routes: scannedRoutes,
});

export default { fetch: adapter.fetch };
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `create-constela` | 0.2.0 | CLI scaffolding tool (`npx create-constela my-app`) |
| `@constela/core` | 0.8.0 | AST types, JSON Schema, validator, 47 type guards, error codes, Style System |
| `@constela/compiler` | 0.8.0 | 3-pass compiler: validate → analyze → transform, Style analysis |
| `@constela/runtime` | 0.16.0 | DOM renderer, hydration, reactive signals, Style evaluation |
| `@constela/router` | 9.0.0 | History API routing, dynamic params, catch-all routes |
| `@constela/server` | 4.1.0 | SSR with Shiki dual-theme syntax highlighting |
| `@constela/start` | 1.6.0 | Dev server, build, SSG, MDX, layouts, API routes, edge adapters |
| `@constela/cli` | 0.4.1 | CLI: compile, dev, build, start, validate, inspect commands |
| `@constela/builder` | 0.2.0 | Type-safe builders for programmatic AST construction |

See each package's README for detailed API documentation.

## Documentation

- [Widget Integration Guide](docs/widgets.md) - Embedding independent Constela programs in pages
- [Architecture](docs/architecture.md) - Package structure, compilation pipeline, and runtime
- [Troubleshooting](docs/troubleshooting.md) - Common errors, debugging, and solutions

## CLI Usage

```bash
# Compile a Constela program
constela compile app.json

# With custom output path
constela compile app.json --out dist/app.compiled.json

# Pretty-print output
constela compile app.json --pretty

# JSON output for AI tools
constela compile app.json --json

# Watch mode - recompile on file changes
constela compile app.json --watch

# Verbose output with timing
constela compile app.json --verbose

# Fast validation without compilation
constela validate app.json
constela validate --all src/routes/

# Inspect program structure
constela inspect app.json
constela inspect app.json --state --json
```

### Error Messages with Suggestions

The CLI provides helpful error messages with "Did you mean?" suggestions:

```
Error [UNDEFINED_STATE] at /view/children/0/value/name

  Undefined state reference: 'count'

  Did you mean 'counter'?
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

## App Instance API

The `createApp` function returns an `AppInstance` with the following methods:

```typescript
interface AppInstance {
  destroy(): void;                                              // Cleanup and unmount
  setState(name: string, value: unknown): void;                 // Update state
  getState(name: string): unknown;                              // Read state
  subscribe(name: string, fn: (value: unknown) => void): () => void;  // Observe state changes
}
```

### Example: External State Updates

```typescript
const app = createApp(result.program, document.getElementById('app'));

// Update state from outside the DSL
app.setState('count', 10);

// Subscribe to state changes
const unsubscribe = app.subscribe('count', (value) => {
  console.log('Count changed:', value);
});

// Read current state
console.log(app.getState('count')); // 10

// Stop listening
unsubscribe();
```

## Server-Side Rendering (SSR)

Render Constela programs on the server with `@constela/server`:

```typescript
import { renderToString } from '@constela/server';

const html = await renderToString(compiledProgram, {
  route: {
    params: { id: '123' },
    query: { tab: 'overview' },
    path: '/users/123',
  },
  imports: {
    config: { siteName: 'My Site' },
  },
});
```

## Hydration

Hydrate server-rendered HTML on the client without DOM reconstruction:

```typescript
import { hydrateApp } from '@constela/runtime';

const app = hydrateApp({
  program: compiledProgram,
  mount: document.getElementById('app'),
  route: {
    params: { id: '123' },
    query: new URLSearchParams('tab=overview'),
    path: '/users/123',
  },
  imports: {
    config: { siteName: 'My Site' },
  },
});

// App is now interactive
app.subscribe('count', (value) => console.log('count:', value));
```

## Error Model

All errors include structured information:

```typescript
{
  code: ErrorCode,
  message: string,
  path: string,  // JSON Pointer, e.g., "/view/children/0/props/onClick"
  details?: object
}
```

**Error Codes:**
- `SCHEMA_INVALID` - JSON Schema validation error
- `UNDEFINED_STATE` - Reference to undefined state field
- `UNDEFINED_ACTION` - Reference to undefined action
- `VAR_UNDEFINED` - Reference to undefined variable
- `DUPLICATE_ACTION` - Duplicate action name
- `UNSUPPORTED_VERSION` - Unsupported version string
- `COMPONENT_NOT_FOUND` - Reference to undefined component
- `COMPONENT_PROP_MISSING` - Required prop not provided
- `COMPONENT_CYCLE` - Circular component reference detected
- `COMPONENT_PROP_TYPE` - Prop type mismatch
- `PARAM_UNDEFINED` - Reference to undefined param in component
- `OPERATION_INVALID_FOR_TYPE` - Update operation incompatible with state type
- `OPERATION_MISSING_FIELD` - Required field missing for update operation
- `EXPR_COND_ELSE_REQUIRED` - Cond expression requires else field
- `UNDEFINED_ROUTE_PARAM` - Route expression references undefined route param
- `UNDEFINED_IMPORT` - Import expression references undefined import
- `UNDEFINED_DATA` - Data expression references undefined data source
- `LAYOUT_MISSING_SLOT` - Layout program has no slot node
- `LAYOUT_NOT_FOUND` - Referenced layout not found

## Running Examples

```bash
# Install dependencies
pnpm install

# Build packages first
pnpm build

# Start examples dev server
pnpm --filter @constela/examples dev

# Then open in browser:
# - http://localhost:5173/counter/
# - http://localhost:5173/todo-list/
# - http://localhost:5173/fetch-list/
# - http://localhost:5173/components/
# - http://localhost:5173/router/
# - http://localhost:5173/styles/
```

## Design Principles

1. **Constrained surface area** - Small set of node types and expression types
2. **Schema-first** - DSL is JSON, validated by JSON Schema
3. **Compiler-first** - Parse → validate → analyze → transform pipeline
4. **Deterministic state** - Explicit declarations, no implicit reactivity
5. **AI-friendly errors** - Structured errors with JSON Pointer paths

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Testing Guide

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @constela/core test
pnpm --filter @constela/compiler test
pnpm --filter @constela/runtime test
pnpm --filter @constela/server test
pnpm --filter @constela/router test
pnpm --filter @constela/start test
pnpm --filter @constela/cli test

# Watch mode
pnpm --filter @constela/core test -- --watch

# Run specific test file
pnpm --filter @constela/core test -- validator.test.ts
```

#### Test Structure

Each package has tests in `tests/` or `src/__tests__/`:

| Package | Test Location | Coverage |
|---------|--------------|----------|
| @constela/core | `tests/` | Type guards, validators, error codes |
| @constela/compiler | `tests/passes/` | Validate, analyze, transform passes |
| @constela/runtime | `src/__tests__/` | Expression eval, action execution, hydration |
| @constela/server | `src/__tests__/` | SSR rendering, markdown, code blocks |
| @constela/router | `tests/` | Route matching, helpers, navigation |
| @constela/start | `tests/` | Build, dev server, data loading, layouts |
| @constela/cli | `tests/` | All CLI commands |

#### Writing Tests

Tests use [Vitest](https://vitest.dev/). Follow the AAA pattern:

```typescript
import { describe, it, expect } from 'vitest';
import { validateAst } from '../src/validator.js';

describe('validateAst', () => {
  it('should return ok for valid AST', () => {
    // Arrange
    const ast = { version: '1.0', state: {}, actions: [], view: { kind: 'element', tag: 'div' } };

    // Act
    const result = validateAst(ast);

    // Assert
    expect(result.ok).toBe(true);
  });
});
```

#### Testing Constela Applications

To test your Constela application:

1. **Validate JSON files:**
   ```bash
   constela validate --all src/routes/
   ```

2. **Inspect program structure:**
   ```bash
   constela inspect src/routes/index.json --state
   ```

3. **Build and check output:**
   ```bash
   constela build && ls -la dist/
   ```

## Roadmap

### Completed

- [x] Style system integration (`styles`, `StyleExpr`)
- [x] TypeScript builder API (`@constela/builder`)
- [x] Enhanced error messages with "Did you mean?" suggestions
- [x] CLI improvements (`--json`, `--watch`, `--verbose`, `--debug`)
- [x] New CLI commands (`validate`, `inspect`)
- [x] Timer actions (`delay`, `interval`, `clearTimer`)
- [x] Enhanced event data (keyboard, mouse, touch, scroll, files)
- [x] Form features (`focus` step, `validity` expression)
- [x] Portal node for rendering outside component tree
- [x] Event handler options (`debounce`, `throttle`, `intersect`)
- [x] Hot Module Replacement (HMR)

### Planned

- [ ] Visual editor / playground
- [ ] IDE extensions (VSCode, etc.)

## License

MIT
