# @constela/server

Server-side rendering (SSR) for the Constela UI framework.

## Installation

```bash
npm install @constela/server
```

**Peer Dependencies:**
- `@constela/compiler` ^0.7.0

## Overview

This package provides SSR capabilities for Constela applications. Features:

- **HTML Generation** - Render programs to HTML strings
- **Route Context** - Pass route params and query strings
- **Markdown & Code** - Server-side Markdown and syntax highlighting
- **Dual Theme** - Light and dark theme code blocks

## API Reference

### renderToString

Main SSR function that renders a compiled program to HTML.

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

**Parameters:**
- `program: CompiledProgram` - Compiled program from `@constela/compiler`
- `options?: RenderOptions` - Optional render configuration

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

**Returns:** `Promise<string>` - Complete HTML string

## Internal Features

The package internally handles:

**Markdown Rendering:**
- Async parsing with Shiki syntax highlighting
- Sanitization via DOMPurify

**Code Highlighting:**
- Dual theme support (github-light, github-dark)
- CSS custom properties for theme switching
- Preloaded languages: javascript, typescript, json, html, css, python, rust, go, java, bash, markdown

**CSS Variables:** Code blocks use CSS custom properties:
```css
/* Light mode */
.shiki { background-color: var(--shiki-light-bg); }
.shiki span { color: var(--shiki-light); }

/* Dark mode */
.dark .shiki { background-color: var(--shiki-dark-bg); }
.dark .shiki span { color: var(--shiki-dark); }
```

## Output Structure

### Code Block HTML

```html
<div class="constela-code" data-code-content="...">
  <div class="group relative">
    <div class="language-badge">typescript</div>
    <button class="constela-copy-btn">
      <!-- Copy icon SVG -->
    </button>
    <pre><code class="shiki">...</code></pre>
  </div>
</div>
```

The `data-code-content` attribute contains the raw code for copy functionality.

## Expression Evaluation

SSR evaluates expressions server-side with some limitations:

- **No DOM refs** - `ref` expressions return `null`
- **No safe globals** - Limited to basic operations
- **Static only** - No reactive updates

## Security

- **HTML Escaping** - All text output is escaped
- **DOMPurify** - Markdown content is sanitized
- **Prototype Pollution Prevention** - Same as runtime

## Example

```typescript
import { compile } from '@constela/compiler';
import { renderToString } from '@constela/server';

const program = compile({
  version: '1.0',
  state: { name: { type: 'string', initial: 'World' } },
  actions: [],
  view: {
    kind: 'element',
    tag: 'h1',
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Hello, ' } },
      { kind: 'text', value: { expr: 'state', name: 'name' } },
    ],
  },
});

if (program.ok) {
  const html = await renderToString(program.program);
  console.log(html); // '<h1>Hello, World</h1>'
}
```

## Integration with @constela/runtime

Server-rendered HTML can be hydrated on the client:

```typescript
// Server
import { renderToString } from '@constela/server';
const html = await renderToString(program, { route, imports });

// Client
import { hydrateApp } from '@constela/runtime';
hydrateApp({ program, mount, route, imports });
```

## License

MIT
