# Constela Language Specification

**Version:** 1.0
**Last Updated:** 2026-02-01

## 1. Introduction

Constela is a declarative JSON-based Domain-Specific Language (DSL) for building reactive web applications. It enables developers to define UI components, state management, and application logic entirely in JSON, which is then compiled and executed by the Constela runtime.

### 1.1 Design Goals

- **Declarative**: Define *what* the UI should look like, not *how* to build it
- **Type-Safe**: Full TypeScript integration with compile-time validation
- **Portable**: JSON programs can be executed in browsers, Node.js, and edge runtimes
- **Secure**: Constrained expression language prevents arbitrary code execution
- **Reactive**: Fine-grained reactivity without virtual DOM overhead

### 1.2 Key Concepts

- **Program**: The root unit of a Constela application
- **State**: Reactive data that drives the UI
- **View**: Declarative tree of UI nodes
- **Actions**: Named sequences of steps that modify state
- **Expressions**: Constrained computations for dynamic values
- **Components**: Reusable view definitions with parameters

---

## 2. Program Structure

A Constela program is a JSON object with the following structure:

```json
{
  "version": "1.0",
  "route": { ... },
  "imports": { ... },
  "data": { ... },
  "theme": { ... },
  "styles": { ... },
  "lifecycle": { ... },
  "state": { ... },
  "actions": [ ... ],
  "view": { ... },
  "components": { ... }
}
```

### 2.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | `"1.0"` | Schema version (currently only "1.0") |
| `state` | `Record<string, StateField>` | State field definitions |
| `actions` | `ActionDefinition[]` | Action definitions |
| `view` | `ViewNode` | Root view node |

### 2.2 Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `route` | `RouteDefinition` | Route configuration |
| `imports` | `Record<string, string>` | External data file paths |
| `data` | `Record<string, DataSource>` | Build-time data sources |
| `theme` | `ThemeConfig` | Theme configuration |
| `styles` | `Record<string, StylePreset>` | Style presets (CVA-like) |
| `lifecycle` | `LifecycleHooks` | Lifecycle event handlers |
| `components` | `Record<string, ComponentDef>` | Component definitions |

---

## 3. State Types

Constela supports 5 state types:

### 3.1 Number

```json
{
  "count": { "type": "number", "initial": 0 }
}
```

### 3.2 String

```json
{
  "query": { "type": "string", "initial": "" }
}
```

String state can use a cookie expression for SSR-safe initialization:

```json
{
  "theme": {
    "type": "string",
    "initial": { "expr": "cookie", "key": "theme", "default": "dark" }
  }
}
```

### 3.3 List

```json
{
  "items": { "type": "list", "initial": [] }
}
```

### 3.4 Boolean

```json
{
  "isVisible": { "type": "boolean", "initial": true }
}
```

### 3.5 Object

```json
{
  "form": {
    "type": "object",
    "initial": { "name": "", "email": "" }
  }
}
```

---

## 4. Expression Types

Expressions are used to compute dynamic values. There are 19 expression types:

### 4.1 Literal (`lit`)

```json
{ "expr": "lit", "value": "Hello" }
{ "expr": "lit", "value": 42 }
{ "expr": "lit", "value": true }
{ "expr": "lit", "value": null }
{ "expr": "lit", "value": [1, 2, 3] }
```

### 4.2 State (`state`)

```json
{ "expr": "state", "name": "count" }
{ "expr": "state", "name": "user", "path": "name" }
```

### 4.3 Variable (`var`)

References loop variables or event payload:

```json
{ "expr": "var", "name": "item" }
{ "expr": "var", "name": "item", "path": "id" }
{ "expr": "var", "name": "payload" }
```

### 4.4 Binary (`bin`)

Binary operations:

```json
{
  "expr": "bin",
  "op": "+",
  "left": { "expr": "state", "name": "count" },
  "right": { "expr": "lit", "value": 1 }
}
```

**Operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`

### 4.5 Not (`not`)

Logical negation:

```json
{
  "expr": "not",
  "operand": { "expr": "state", "name": "isLoading" }
}
```

### 4.6 Parameter (`param`)

Component parameter reference:

```json
{ "expr": "param", "name": "title" }
{ "expr": "param", "name": "user", "path": "email" }
```

### 4.7 Conditional (`cond`)

```json
{
  "expr": "cond",
  "if": { "expr": "state", "name": "isLoggedIn" },
  "then": { "expr": "lit", "value": "Welcome!" },
  "else": { "expr": "lit", "value": "Please log in" }
}
```

### 4.8 Get (`get`)

Property access:

```json
{
  "expr": "get",
  "base": { "expr": "var", "name": "item" },
  "path": "user.name"
}
```

### 4.9 Route (`route`)

Route parameter access:

```json
{ "expr": "route", "name": "id", "source": "param" }
{ "expr": "route", "name": "tab", "source": "query" }
{ "expr": "route", "name": "path", "source": "path" }
```

**Sources:** `param` (default), `query`, `path`

### 4.10 Import (`import`)

External data reference:

```json
{ "expr": "import", "name": "config" }
{ "expr": "import", "name": "config", "path": "siteName" }
```

### 4.11 Data (`data`)

Build-time data reference:

```json
{ "expr": "data", "name": "posts" }
{ "expr": "data", "name": "post", "path": "title" }
```

### 4.12 Ref (`ref`)

DOM element reference:

```json
{ "expr": "ref", "name": "inputEl" }
```

### 4.13 Index (`index`)

Dynamic property/array access:

```json
{
  "expr": "index",
  "base": { "expr": "state", "name": "items" },
  "key": { "expr": "var", "name": "index" }
}
```

### 4.14 Style (`style`)

Style preset reference:

```json
{
  "expr": "style",
  "name": "button",
  "variants": {
    "variant": { "expr": "lit", "value": "primary" },
    "size": { "expr": "state", "name": "buttonSize" }
  }
}
```

### 4.15 Concat (`concat`)

String concatenation:

```json
{
  "expr": "concat",
  "items": [
    { "expr": "lit", "value": "Hello, " },
    { "expr": "var", "name": "name" },
    { "expr": "lit", "value": "!" }
  ]
}
```

### 4.16 Validity (`validity`)

Form validation state:

```json
{ "expr": "validity", "ref": "emailInput", "property": "valid" }
{ "expr": "validity", "ref": "emailInput", "property": "message" }
```

**Properties:** `valid`, `valueMissing`, `typeMismatch`, `patternMismatch`, `tooLong`, `tooShort`, `rangeUnderflow`, `rangeOverflow`, `customError`, `message`

### 4.17 Call (`call`)

Method call:

```json
{
  "expr": "call",
  "target": { "expr": "state", "name": "items" },
  "method": "filter",
  "args": [{
    "expr": "lambda",
    "param": "item",
    "body": { "expr": "get", "base": { "expr": "var", "name": "item" }, "path": "active" }
  }]
}
```

**Supported methods:**

- **Array:** `length`, `at`, `includes`, `slice`, `indexOf`, `join`, `filter`, `map`, `find`, `findIndex`, `some`, `every`
- **String:** `length`, `charAt`, `substring`, `slice`, `split`, `trim`, `toUpperCase`, `toLowerCase`, `replace`, `includes`, `startsWith`, `endsWith`, `indexOf`
- **Math:** `min`, `max`, `round`, `floor`, `ceil`, `abs`, `sqrt`, `pow`, `random`, `sin`, `cos`, `tan`
- **Date:** `now`, `parse`, `toISOString`, `getTime`, `getFullYear`, `getMonth`, `getDate`, `getHours`, `getMinutes`, `getSeconds`, `getMilliseconds`

### 4.18 Lambda (`lambda`)

Anonymous function:

```json
{
  "expr": "lambda",
  "param": "item",
  "index": "i",
  "body": { "expr": "get", "base": { "expr": "var", "name": "item" }, "path": "active" }
}
```

### 4.19 Array (`array`)

Array construction:

```json
{
  "expr": "array",
  "elements": [
    { "expr": "var", "name": "first" },
    { "expr": "state", "name": "second" },
    { "expr": "lit", "value": "third" }
  ]
}
```

---

## 5. View Node Types

### 5.1 Element (`element`)

```json
{
  "kind": "element",
  "tag": "button",
  "ref": "submitBtn",
  "props": {
    "className": { "expr": "lit", "value": "btn" },
    "onClick": { "event": "click", "action": "submit" }
  },
  "children": [ ... ]
}
```

### 5.2 Text (`text`)

```json
{
  "kind": "text",
  "value": { "expr": "state", "name": "message" }
}
```

### 5.3 If (`if`)

```json
{
  "kind": "if",
  "condition": { "expr": "state", "name": "isVisible" },
  "then": { ... },
  "else": { ... }
}
```

### 5.4 Each (`each`)

```json
{
  "kind": "each",
  "items": { "expr": "state", "name": "todos" },
  "as": "todo",
  "index": "i",
  "key": { "expr": "var", "name": "todo", "path": "id" },
  "body": { ... }
}
```

### 5.5 Component (`component`)

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "variant": { "expr": "lit", "value": "primary" }
  },
  "children": [ ... ]
}
```

### 5.6 Slot (`slot`)

```json
{ "kind": "slot" }
{ "kind": "slot", "name": "sidebar" }
```

### 5.7 Markdown (`markdown`)

```json
{
  "kind": "markdown",
  "content": { "expr": "state", "name": "markdownContent" }
}
```

### 5.8 Code (`code`)

```json
{
  "kind": "code",
  "language": { "expr": "lit", "value": "typescript" },
  "content": { "expr": "state", "name": "codeSnippet" }
}
```

### 5.9 Portal (`portal`)

```json
{
  "kind": "portal",
  "target": "body",
  "children": [ ... ]
}
```

**Targets:** `body`, `head`, or CSS selector string

### 5.10 Island (`island`)

```json
{
  "kind": "island",
  "id": "interactive-widget",
  "strategy": "visible",
  "strategyOptions": {
    "threshold": 0.5,
    "rootMargin": "100px"
  },
  "content": { ... },
  "state": { ... },
  "actions": [ ... ]
}
```

**Strategies:** `load`, `idle`, `visible`, `interaction`, `media`, `never`

### 5.11 Suspense (`suspense`)

```json
{
  "kind": "suspense",
  "id": "async-content",
  "fallback": { ... },
  "content": { ... }
}
```

### 5.12 ErrorBoundary (`errorBoundary`)

```json
{
  "kind": "errorBoundary",
  "fallback": { ... },
  "content": { ... }
}
```

---

## 6. Action Step Types

### 6.1 State Manipulation

#### Set (`set`)

```json
{ "do": "set", "target": "count", "value": { "expr": "lit", "value": 0 } }
```

#### Update (`update`)

```json
{ "do": "update", "target": "count", "operation": "increment" }
{ "do": "update", "target": "count", "operation": "increment", "value": { "expr": "lit", "value": 5 } }
{ "do": "update", "target": "items", "operation": "push", "value": { "expr": "var", "name": "newItem" } }
{ "do": "update", "target": "items", "operation": "replaceAt", "index": { "expr": "lit", "value": 0 }, "value": { "expr": "var", "name": "updated" } }
```

**Operations:** `increment`, `decrement`, `push`, `pop`, `remove`, `toggle`, `merge`, `replaceAt`, `insertAt`, `splice`

#### SetPath (`setPath`)

```json
{
  "do": "setPath",
  "target": "posts",
  "path": { "expr": "var", "name": "index" },
  "value": { "expr": "lit", "value": { "liked": true } }
}
```

### 6.2 HTTP Requests

#### Fetch (`fetch`)

```json
{
  "do": "fetch",
  "url": { "expr": "lit", "value": "/api/posts" },
  "method": "POST",
  "body": { "expr": "state", "name": "formData" },
  "result": "response",
  "onSuccess": [ ... ],
  "onError": [ ... ]
}
```

### 6.3 Storage & Clipboard

#### Storage (`storage`)

```json
{ "do": "storage", "operation": "get", "key": { "expr": "lit", "value": "theme" }, "storage": "local", "result": "savedTheme" }
{ "do": "storage", "operation": "set", "key": { "expr": "lit", "value": "theme" }, "value": { "expr": "state", "name": "theme" }, "storage": "local" }
{ "do": "storage", "operation": "remove", "key": { "expr": "lit", "value": "theme" }, "storage": "session" }
```

#### Clipboard (`clipboard`)

```json
{ "do": "clipboard", "operation": "write", "value": { "expr": "state", "name": "textToCopy" } }
{ "do": "clipboard", "operation": "read", "result": "clipboardText", "onSuccess": [ ... ] }
```

### 6.4 Navigation

```json
{ "do": "navigate", "url": { "expr": "lit", "value": "/dashboard" } }
{ "do": "navigate", "url": { "expr": "lit", "value": "https://example.com" }, "target": "_blank" }
{ "do": "navigate", "url": { "expr": "lit", "value": "/settings" }, "replace": true }
```

### 6.5 Dynamic Import & External Calls

#### Import (`import`)

```json
{
  "do": "import",
  "module": "chart.js",
  "result": "Chart",
  "onSuccess": [ ... ],
  "onError": [ ... ]
}
```

#### Call (`call`)

```json
{
  "do": "call",
  "target": { "expr": "var", "name": "Chart" },
  "args": [
    { "expr": "ref", "name": "canvas" },
    { "expr": "state", "name": "chartConfig" }
  ],
  "result": "chartInstance"
}
```

#### Subscribe (`subscribe`)

```json
{
  "do": "subscribe",
  "target": { "expr": "state", "name": "editor" },
  "event": "onDidChangeContent",
  "action": "handleEditorChange"
}
```

#### Dispose (`dispose`)

```json
{
  "do": "dispose",
  "target": { "expr": "state", "name": "chartInstance" }
}
```

### 6.6 DOM Manipulation

```json
{ "do": "dom", "operation": "addClass", "selector": { "expr": "lit", "value": "html" }, "value": { "expr": "lit", "value": "dark" } }
{ "do": "dom", "operation": "removeClass", "selector": { "expr": "lit", "value": "body" }, "value": { "expr": "lit", "value": "loading" } }
{ "do": "dom", "operation": "toggleClass", "selector": { "expr": "lit", "value": ".menu" }, "value": { "expr": "lit", "value": "open" } }
{ "do": "dom", "operation": "setAttribute", "selector": { "expr": "ref", "name": "input" }, "attribute": "disabled", "value": { "expr": "lit", "value": "" } }
```

### 6.7 WebSocket

```json
{ "do": "send", "connection": "chat", "data": { "expr": "state", "name": "message" } }
{ "do": "close", "connection": "chat" }
```

### 6.8 Timers

#### Delay (`delay`)

```json
{
  "do": "delay",
  "ms": { "expr": "lit", "value": 2000 },
  "then": [ ... ],
  "result": "timeoutId"
}
```

#### Interval (`interval`)

```json
{
  "do": "interval",
  "ms": { "expr": "lit", "value": 5000 },
  "action": "refreshData",
  "result": "intervalId"
}
```

#### ClearTimer (`clearTimer`)

```json
{ "do": "clearTimer", "target": { "expr": "state", "name": "intervalId" } }
```

### 6.9 Focus Management

```json
{ "do": "focus", "target": { "expr": "ref", "name": "inputEl" }, "operation": "focus" }
{ "do": "focus", "target": { "expr": "ref", "name": "inputEl" }, "operation": "blur" }
{ "do": "focus", "target": { "expr": "ref", "name": "inputEl" }, "operation": "select" }
```

### 6.10 Conditional Execution

```json
{
  "do": "if",
  "condition": { "expr": "state", "name": "isValid" },
  "then": [ ... ],
  "else": [ ... ]
}
```

### 6.11 SSE (Server-Sent Events)

#### SSEConnect (`sseConnect`)

```json
{
  "do": "sseConnect",
  "connection": "notifications",
  "url": { "expr": "lit", "value": "/api/events" },
  "eventTypes": ["message", "update", "delete"],
  "reconnect": {
    "enabled": true,
    "strategy": "exponential",
    "maxRetries": 5,
    "baseDelay": 1000,
    "maxDelay": 30000
  },
  "onOpen": [ ... ],
  "onMessage": [ ... ],
  "onError": [ ... ]
}
```

**Reconnection Strategies:** `exponential`, `linear`, `none`

#### SSEClose (`sseClose`)

```json
{ "do": "sseClose", "connection": "notifications" }
```

### 6.12 Optimistic Updates

#### Optimistic (`optimistic`)

```json
{
  "do": "optimistic",
  "target": "posts",
  "path": { "expr": "var", "name": "index" },
  "value": { "expr": "lit", "value": { "liked": true } },
  "result": "updateId",
  "timeout": 5000
}
```

#### Confirm (`confirm`)

```json
{ "do": "confirm", "id": { "expr": "var", "name": "updateId" } }
```

#### Reject (`reject`)

```json
{ "do": "reject", "id": { "expr": "var", "name": "updateId" } }
```

### 6.13 State Binding

#### Bind (`bind`)

```json
{
  "do": "bind",
  "connection": "notifications",
  "eventType": "update",
  "target": "messages",
  "path": { "expr": "var", "name": "payload", "path": "id" },
  "transform": { "expr": "get", "base": { "expr": "var", "name": "payload" }, "path": "data" },
  "patch": false
}
```

#### Unbind (`unbind`)

```json
{ "do": "unbind", "connection": "notifications", "target": "messages" }
```

---

## 7. Theme Configuration

```json
{
  "theme": {
    "mode": "system",
    "colors": {
      "primary": "hsl(220 90% 56%)",
      "primary-foreground": "hsl(0 0% 100%)",
      "secondary": "hsl(215 28% 17%)",
      "secondary-foreground": "hsl(210 40% 98%)",
      "destructive": "hsl(0 84% 60%)",
      "destructive-foreground": "hsl(0 0% 100%)",
      "background": "hsl(0 0% 100%)",
      "foreground": "hsl(222 47% 11%)",
      "muted": "hsl(210 40% 96%)",
      "muted-foreground": "hsl(215 16% 47%)",
      "accent": "hsl(210 40% 96%)",
      "accent-foreground": "hsl(222 47% 11%)",
      "popover": "hsl(0 0% 100%)",
      "popover-foreground": "hsl(222 47% 11%)",
      "card": "hsl(0 0% 100%)",
      "card-foreground": "hsl(222 47% 11%)",
      "border": "hsl(214 32% 91%)",
      "input": "hsl(214 32% 91%)",
      "ring": "hsl(220 90% 56%)"
    },
    "darkColors": {
      "background": "hsl(222 47% 11%)",
      "foreground": "hsl(210 40% 98%)",
      "muted": "hsl(217 33% 17%)",
      "muted-foreground": "hsl(215 20% 65%)",
      "popover": "hsl(222 47% 11%)",
      "card": "hsl(222 47% 11%)",
      "border": "hsl(217 33% 17%)",
      "input": "hsl(217 33% 17%)"
    },
    "fonts": {
      "sans": "Inter, system-ui, sans-serif",
      "serif": "Georgia, serif",
      "mono": "JetBrains Mono, monospace"
    },
    "cssPrefix": "app"
  }
}
```

**ColorScheme:** `light`, `dark`, `system`

---

## 8. Islands Architecture

Islands enable partial hydration for optimal performance:

```json
{
  "kind": "island",
  "id": "interactive-chart",
  "strategy": "visible",
  "strategyOptions": {
    "threshold": 0.5,
    "rootMargin": "100px"
  },
  "content": { ... },
  "state": { ... },
  "actions": [ ... ]
}
```

### 8.1 Hydration Strategies

| Strategy | Description | Options |
|----------|-------------|---------|
| `load` | Hydrate immediately on page load | - |
| `idle` | Hydrate when browser is idle | `timeout` (ms) |
| `visible` | Hydrate when element enters viewport | `threshold` (0-1), `rootMargin` |
| `interaction` | Hydrate on first user interaction | - |
| `media` | Hydrate when media query matches | `media` (query string) |
| `never` | Never hydrate (static only) | - |

### 8.2 Strategy Options

```typescript
interface IslandStrategyOptions {
  threshold?: number;      // visible: 0-1 (default: 0)
  rootMargin?: string;     // visible: CSS margin string
  media?: string;          // media: media query string
  timeout?: number;        // idle: timeout in ms
}
```

---

## 9. Component Definition

```json
{
  "components": {
    "Button": {
      "params": {
        "variant": { "type": "string", "required": false },
        "size": { "type": "string", "required": false },
        "disabled": { "type": "boolean", "required": false }
      },
      "localState": {
        "isPressed": { "type": "boolean", "initial": false }
      },
      "localActions": [
        {
          "name": "handlePress",
          "steps": [{ "do": "set", "target": "isPressed", "value": { "expr": "lit", "value": true } }]
        }
      ],
      "view": {
        "kind": "element",
        "tag": "button",
        "props": {
          "className": {
            "expr": "style",
            "name": "button",
            "variants": {
              "variant": { "expr": "param", "name": "variant" },
              "size": { "expr": "param", "name": "size" }
            }
          },
          "disabled": { "expr": "param", "name": "disabled" },
          "onClick": { "event": "click", "action": "handlePress" }
        },
        "children": [{ "kind": "slot" }]
      }
    }
  }
}
```

### 9.1 Parameter Types

| Type | Description |
|------|-------------|
| `string` | String parameter |
| `number` | Numeric parameter |
| `boolean` | Boolean parameter |
| `json` | Complex object parameter |

---

## 10. Layout Definition

```json
{
  "version": "1.0",
  "type": "layout",
  "imports": {
    "navigation": "./data/navigation.json"
  },
  "state": {
    "isSidebarOpen": { "type": "boolean", "initial": true }
  },
  "actions": [
    {
      "name": "toggleSidebar",
      "steps": [{ "do": "update", "target": "isSidebarOpen", "operation": "toggle" }]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "div",
    "props": { "className": { "expr": "lit", "value": "layout" } },
    "children": [
      { "kind": "component", "name": "Header" },
      {
        "kind": "element",
        "tag": "aside",
        "children": [{ "kind": "slot", "name": "sidebar" }]
      },
      {
        "kind": "element",
        "tag": "main",
        "children": [{ "kind": "slot" }]
      },
      { "kind": "component", "name": "Footer" }
    ]
  },
  "components": { ... }
}
```

---

## 11. Route Definition

```json
{
  "route": {
    "path": "/posts/:id",
    "title": { "expr": "concat", "items": [
      { "expr": "data", "name": "post", "path": "title" },
      { "expr": "lit", "value": " - My Blog" }
    ]},
    "layout": "docs",
    "layoutParams": {
      "sidebar": { "expr": "data", "name": "navigation" }
    },
    "meta": {
      "description": { "expr": "data", "name": "post", "path": "excerpt" },
      "og:image": { "expr": "data", "name": "post", "path": "coverImage" }
    },
    "canonical": { "expr": "concat", "items": [
      { "expr": "lit", "value": "https://example.com/posts/" },
      { "expr": "route", "name": "id", "source": "param" }
    ]},
    "jsonLd": {
      "type": "Article",
      "properties": {
        "headline": { "expr": "data", "name": "post", "path": "title" },
        "author": { "expr": "data", "name": "post", "path": "author" },
        "datePublished": { "expr": "data", "name": "post", "path": "date" }
      }
    },
    "getStaticPaths": {
      "source": "posts",
      "params": {
        "id": { "expr": "get", "base": { "expr": "var", "name": "item" }, "path": "slug" }
      }
    }
  }
}
```

---

## 12. Data Sources

### 12.1 Glob

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

### 12.2 File

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

### 12.3 API

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

### 12.4 Transforms

| Transform | Description |
|-----------|-------------|
| `mdx` | MDX to HTML with frontmatter |
| `yaml` | YAML to JSON |
| `csv` | CSV to JSON array |

---

## 13. Style System

CVA-like style presets:

```json
{
  "styles": {
    "button": {
      "base": "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
      "variants": {
        "variant": {
          "default": "bg-primary text-primary-foreground hover:bg-primary/90",
          "destructive": "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          "outline": "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          "ghost": "hover:bg-accent hover:text-accent-foreground",
          "link": "text-primary underline-offset-4 hover:underline"
        },
        "size": {
          "default": "h-10 px-4 py-2",
          "sm": "h-9 rounded-md px-3",
          "lg": "h-11 rounded-md px-8",
          "icon": "h-10 w-10"
        }
      },
      "compoundVariants": [
        { "variant": "outline", "size": "sm", "class": "border-2" }
      ],
      "defaultVariants": {
        "variant": "default",
        "size": "default"
      }
    }
  }
}
```

---

## 14. Error Codes Reference

| Code | Description |
|------|-------------|
| `SCHEMA_INVALID` | JSON Schema validation error |
| `UNSUPPORTED_VERSION` | Unsupported version string |
| `UNDEFINED_STATE` | Reference to undefined state |
| `UNDEFINED_ACTION` | Reference to undefined action |
| `DUPLICATE_ACTION` | Duplicate action name |
| `VAR_UNDEFINED` | Undefined variable reference |
| `COMPONENT_NOT_FOUND` | Undefined component |
| `COMPONENT_PROP_MISSING` | Missing required prop |
| `COMPONENT_CYCLE` | Circular component reference |
| `COMPONENT_PROP_TYPE` | Prop type mismatch |
| `PARAM_UNDEFINED` | Undefined parameter |
| `OPERATION_INVALID_FOR_TYPE` | Invalid operation for state type |
| `OPERATION_MISSING_FIELD` | Missing required field for operation |
| `ROUTE_NOT_DEFINED` | Route not defined |
| `UNDEFINED_ROUTE_PARAM` | Undefined route parameter |
| `LAYOUT_MISSING_SLOT` | Layout missing slot node |
| `LAYOUT_NOT_FOUND` | Referenced layout not found |
| `INVALID_SLOT_NAME` | Invalid slot name |
| `DUPLICATE_SLOT_NAME` | Duplicate slot name |
| `DUPLICATE_DEFAULT_SLOT` | Multiple default slots |
| `SLOT_IN_LOOP` | Slot inside loop |
| `UNDEFINED_DATA_SOURCE` | Undefined data source |
| `UNDEFINED_IMPORT` | Undefined import reference |
| `UNDEFINED_REF` | Undefined element ref |
| `INVALID_STORAGE_OPERATION` | Invalid storage operation |
| `INVALID_CLIPBOARD_OPERATION` | Invalid clipboard operation |
| `INVALID_NAVIGATE_TARGET` | Invalid navigate target |
| `UNDEFINED_STYLE` | Reference to undefined style preset |
| `UNDEFINED_VARIANT` | Reference to undefined style variant |

---

## 15. Security Considerations

### 15.1 Prototype Pollution Prevention

All property access paths are validated against forbidden keys: `__proto__`, `constructor`, `prototype`

### 15.2 Safe Globals

Only whitelisted globals are exposed: `JSON`, `Math`, `Date`, `Object`, `Array`, `String`, `Number`, `Boolean`, `console`

### 15.3 HTML Sanitization

Markdown content is sanitized with DOMPurify before rendering.

### 15.4 MDX Security

MDX attribute expressions are validated at compile time. Dangerous patterns (`require()`, `eval()`, `window`) are rejected.

---

## Appendix A: TypeScript Types

See `@constela/core` for complete type definitions:

```typescript
import type {
  Program,
  LayoutProgram,
  StateField,
  ActionDefinition,
  ViewNode,
  Expression,
  ThemeConfig,
  IslandNode,
  IslandStrategy,
} from '@constela/core';
```
