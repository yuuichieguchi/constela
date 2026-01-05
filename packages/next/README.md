# @constela/next

Next.js integration for Constela UI framework with SSR support.

## Installation

```bash
npm install @constela/next @constela/compiler @constela/runtime
# or
pnpm add @constela/next @constela/compiler @constela/runtime
```

## Requirements

- Next.js 13+ (App Router)
- React 18+

## Usage

### With SSR (Recommended)

```tsx
// app/page.tsx
import { ConstelaEmbed, renderToString } from '@constela/next';
import { compile } from '@constela/compiler';

const myProgram = {
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 },
  },
  actions: [
    {
      name: 'increment',
      steps: [{ do: 'update', target: 'count', operation: 'increment' }],
    },
  ],
  view: {
    kind: 'element',
    tag: 'div',
    children: [
      { kind: 'text', value: { expr: 'state', name: 'count' } },
      {
        kind: 'element',
        tag: 'button',
        props: { onClick: { event: 'click', action: 'increment' } },
        children: [{ kind: 'text', value: { expr: 'lit', value: '+1' } }],
      },
    ],
  },
};

export default function Page() {
  const result = compile(myProgram);
  if (!result.ok) throw new Error('Compile failed');

  const ssrHtml = renderToString(result.program);

  return (
    <div>
      <h1>My Counter</h1>
      <ConstelaEmbed program={result.program} ssrHtml={ssrHtml} />
    </div>
  );
}
```

### Client-Only (No SSR)

```tsx
'use client';

import { ConstelaEmbed } from '@constela/next';
import { compile } from '@constela/compiler';

export function DynamicWidget({ programAst }) {
  const result = compile(programAst);
  if (!result.ok) return <div>Error</div>;

  return <ConstelaEmbed program={result.program} />;
}
```

## API

### `renderToString(program: CompiledProgram): string`

Renders a compiled Constela program to an HTML string for SSR.

- **program**: The compiled program from `@constela/compiler`
- **Returns**: HTML string

### `<ConstelaEmbed />`

React component that embeds a Constela program.

```typescript
interface ConstelaEmbedProps {
  program: CompiledProgram;  // Required: Compiled Constela program
  ssrHtml?: string;          // Optional: Pre-rendered HTML from renderToString()
  className?: string;        // Optional: CSS class for container
  id?: string;               // Optional: ID for container
}
```

## How It Works

1. **Server-Side**: `renderToString()` converts the Constela program to static HTML
2. **Initial Render**: The SSR HTML is displayed immediately (fast LCP)
3. **Hydration**: On the client, `createApp()` takes over for interactivity

## License

MIT
