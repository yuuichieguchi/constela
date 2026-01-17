# Widget Integration Guide

Widgets are independent Constela programs that can be embedded within a page. They are useful for creating reusable, self-contained UI components like counters, timers, or interactive demos.

## What is a Widget?

A widget is a standalone Constela program with its own:
- State
- Actions
- View

Unlike components (which are reusable view definitions), widgets maintain their own reactive state and are mounted independently from the main page.

## Widget Definition

To use widgets in a page, add a `widgets` array to your JSON page file:

```json
{
  "version": "1.0",
  "route": { "path": "/" },
  "state": {},
  "actions": [],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      { "kind": "text", "value": { "expr": "lit", "value": "Page content" } },
      {
        "kind": "element",
        "tag": "div",
        "props": { "id": { "expr": "lit", "value": "counter-widget" } },
        "children": []
      }
    ]
  },
  "widgets": [
    { "id": "counter-widget", "src": "./widgets/counter.json" }
  ]
}
```

### Widget Definition Interface

```typescript
interface WidgetDefinition {
  /** The DOM element ID where the widget should be mounted */
  id: string;
  /** Path to the widget JSON file (relative to the page file) */
  src: string;
}
```

## Creating a Widget File

Widget files are standard Constela JSON programs. Create a file like `widgets/counter.json`:

```json
{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [
    {
      "name": "increment",
      "steps": [
        {
          "do": "update",
          "target": "count",
          "value": {
            "expr": "bin",
            "op": "+",
            "left": { "expr": "state", "name": "count" },
            "right": { "expr": "lit", "value": 1 }
          }
        }
      ]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "div",
    "props": { "class": { "expr": "lit", "value": "counter-widget" } },
    "children": [
      {
        "kind": "element",
        "tag": "span",
        "children": [
          { "kind": "text", "value": { "expr": "state", "name": "count" } }
        ]
      },
      {
        "kind": "element",
        "tag": "button",
        "props": { "on:click": { "action": "increment" } },
        "children": [
          { "kind": "text", "value": { "expr": "lit", "value": "+" } }
        ]
      }
    ]
  }
}
```

## Placing Widgets in a Page

Widgets are mounted into DOM elements with matching IDs. In your page view, create a container element with an `id` prop:

```json
{
  "kind": "element",
  "tag": "div",
  "props": { "id": { "expr": "lit", "value": "counter-widget" } },
  "children": []
}
```

The widget will replace the contents of this element when mounted.

## Multiple Widgets

You can include multiple widgets on a single page:

```json
{
  "widgets": [
    { "id": "counter-demo", "src": "./widgets/counter.json" },
    { "id": "timer-demo", "src": "./widgets/timer.json" }
  ]
}
```

Ensure each widget has a unique ID and a corresponding container element in the view.

## SSG Build Processing

When building with `constela build`, widgets are processed as follows:

1. **Widget Loading**: Each widget's JSON file is loaded and resolved relative to the page file
2. **Compilation**: Widget programs are compiled using the same compiler pipeline as pages
3. **HTML Generation**: The main page is rendered to HTML with widget container placeholders
4. **Hydration Script**: The build generates JavaScript that:
   - Imports both `hydrateApp` and `createApp` from `@constela/runtime`
   - Serializes each widget's compiled program
   - Mounts widgets using `createApp` after hydration

### Generated Hydration Script

For a page with widgets, the hydration script looks like:

```javascript
import { hydrateApp, createApp } from '@constela/runtime';

const program = { /* main page program */ };
const widgetProgram_counter_widget = { /* widget program */ };

hydrateApp({
  program,
  container: document.getElementById('app')
});

const container_counter_widget = document.getElementById('counter-widget');
if (container_counter_widget) {
  container_counter_widget.innerHTML = '';
  createApp(widgetProgram_counter_widget, container_counter_widget);
}
```

## Dev Server Behavior

During development (`constela dev`), widgets are:
- Hot-reloaded when the widget file changes
- Mounted after the main page hydrates
- Compiled on-demand when the page is requested

## Use Cases

Widgets are ideal for:

- **Interactive demos**: Embed live examples in documentation pages
- **Isolated functionality**: Components that don't need to share state with the page
- **Reusable interactive elements**: Counters, timers, polls, etc.
- **Third-party embeds**: Self-contained UI that can be dropped into any page

## Widgets vs Components

| Feature | Widget | Component |
|---------|--------|-----------|
| Own state | Yes | No (uses page state) |
| Own actions | Yes | No (uses page actions) |
| Mounting | Independent DOM element | Inline in view tree |
| Reusability | Across pages (separate file) | Within page (components object) |
| Props | Not supported | Supported |
| Slots | Not supported | Supported |

Use **components** for reusable view structures that work with the page's state.
Use **widgets** for fully independent, self-contained interactive elements.

## Source References

- Widget type definitions: `packages/start/src/json-page-loader.ts:27-40`
- Hydration script generation: `packages/start/src/runtime/entry-server.ts:160-228`
- SSG widget tests: `packages/start/tests/build/ssg-widgets.test.ts`
