# @constela/server

Server-side rendering (SSR) for Constela JSON programs.

## Installation

```bash
npm install @constela/server
```

**Peer Dependencies:**
- `@constela/compiler` ^0.7.0

## How It Works

JSON program → HTML string

```json
{
  "version": "1.0",
  "state": { "name": { "type": "string", "initial": "World" } },
  "view": {
    "kind": "element",
    "tag": "h1",
    "children": [
      { "kind": "text", "value": { "expr": "lit", "value": "Hello, " } },
      { "kind": "text", "value": { "expr": "state", "name": "name" } }
    ]
  }
}
```

↓ SSR

```html
<h1>Hello, World</h1>
```

## Features

### Markdown Rendering

```json
{
  "kind": "markdown",
  "content": { "expr": "data", "name": "article", "path": "content" }
}
```

Rendered with async parsing and Shiki syntax highlighting.

### Code Highlighting

```json
{
  "kind": "code",
  "code": { "expr": "lit", "value": "const x = 1;" },
  "language": { "expr": "lit", "value": "typescript" }
}
```

Features:
- Dual theme support (github-light, github-dark)
- CSS custom properties for theme switching
- Preloaded languages: javascript, typescript, json, html, css, python, rust, go, java, bash, markdown

### Route Context

Pass route parameters for dynamic pages:

```json
{
  "route": { "path": "/users/:id" },
  "view": {
    "kind": "text",
    "value": { "expr": "route", "name": "id", "source": "param" }
  }
}
```

### Import Data

Pass external data at render time:

```json
{
  "imports": { "config": "./data/config.json" },
  "view": {
    "kind": "text",
    "value": { "expr": "import", "name": "config", "path": "siteName" }
  }
}
```

## Output Structure

### Code Block HTML

```html
<div class="constela-code" data-code-content="...">
  <div class="group relative">
    <div class="language-badge">typescript</div>
    <button class="constela-copy-btn"><!-- Copy icon --></button>
    <pre><code class="shiki">...</code></pre>
  </div>
</div>
```

### CSS Variables

```css
/* Light mode */
.shiki { background-color: var(--shiki-light-bg); }
.shiki span { color: var(--shiki-light); }

/* Dark mode */
.dark .shiki { background-color: var(--shiki-dark-bg); }
.dark .shiki span { color: var(--shiki-dark); }
```

## Security

- **HTML Escaping** - All text output is escaped
- **DOMPurify** - Markdown content is sanitized
- **Prototype Pollution Prevention** - Same as runtime

## Internal API

> For framework developers only. End users should use the CLI.

### renderToString

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

**RenderOptions:**

```typescript
interface RenderOptions {
  route?: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    path?: string;
  };
  imports?: Record<string, unknown>;
}
```

## Integration with @constela/runtime

Server-rendered HTML can be hydrated on the client:

```json
{
  "version": "1.0",
  "lifecycle": { "onMount": "initializeClient" },
  "state": { ... },
  "actions": [
    {
      "name": "initializeClient",
      "steps": [
        { "do": "storage", "operation": "get", "key": { "expr": "lit", "value": "preferences" }, ... }
      ]
    }
  ],
  "view": { ... }
}
```

## License

MIT
