# @constela/builder

Type-safe builders for constructing Constela AST programmatically.

## Installation

```bash
npm install @constela/builder
```

## Quick Start

### JSON (Primary)

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

### TypeScript Builder (Equivalent)

```typescript
import {
  createProgram,
  numberField,
  action, increment,
  button, text,
  state, onClick,
} from '@constela/builder';

const program = createProgram({
  state: {
    count: numberField(0),
  },
  actions: [
    action('increment', [increment('count')]),
  ],
  view: button(
    { onClick: onClick('increment') },
    [text(state('count'))]
  ),
});
```

## API Reference

### Expression Builders

Expressions compute values from state, variables, and literals.

| Builder | JSON Equivalent | Description |
|---------|----------------|-------------|
| `lit(value)` | `{ "expr": "lit", "value": ... }` | Literal value |
| `state(name, path?)` | `{ "expr": "state", "name": "...", "path": "..." }` | State reference |
| `variable(name, path?)` | `{ "expr": "var", "name": "...", "path": "..." }` | Loop/event variable |
| `bin(op, left, right)` | `{ "expr": "bin", "op": "...", ... }` | Binary operation |
| `not(operand)` | `{ "expr": "not", "operand": ... }` | Logical negation |
| `cond(if, then, else)` | `{ "expr": "cond", ... }` | Conditional |
| `get(base, path)` | `{ "expr": "get", "base": ..., "path": "..." }` | Property access |

**Binary Operator Shorthands:**

```typescript
// Arithmetic
add(left, right)     // +
sub(left, right)     // -
mul(left, right)     // *
divide(left, right)  // /

// Comparison
eq(left, right)      // ==
neq(left, right)     // !=
lt(left, right)      // <
lte(left, right)     // <=
gt(left, right)      // >
gte(left, right)     // >=

// Logical
and(left, right)     // &&
or(left, right)      // ||
```

**Example:**

```typescript
// JSON: { "expr": "bin", "op": ">", "left": { "expr": "state", "name": "count" }, "right": { "expr": "lit", "value": 0 } }
gt(state('count'), lit(0))

// JSON: { "expr": "cond", "if": ..., "then": { "expr": "lit", "value": "Yes" }, "else": { "expr": "lit", "value": "No" } }
cond(gt(state('count'), lit(0)), lit('Yes'), lit('No'))
```

### State Builders

Define reactive state fields.

| Builder | JSON Equivalent |
|---------|----------------|
| `numberField(initial)` | `{ "type": "number", "initial": 0 }` |
| `stringField(initial)` | `{ "type": "string", "initial": "" }` |
| `booleanField(initial)` | `{ "type": "boolean", "initial": false }` |
| `listField(initial?)` | `{ "type": "list", "initial": [] }` |
| `objectField(initial)` | `{ "type": "object", "initial": { ... } }` |

**Example:**

```typescript
const stateDefinition = {
  count: numberField(0),
  query: stringField(''),
  todos: listField([]),
  isVisible: booleanField(true),
  form: objectField({ name: '', email: '' }),
};
```

### Action Builders

Define actions with steps.

| Builder | JSON Equivalent |
|---------|----------------|
| `action(name, steps)` | `{ "name": "...", "steps": [...] }` |
| `set(target, value)` | `{ "do": "set", "target": "...", "value": ... }` |
| `update(target, op, value?)` | `{ "do": "update", "target": "...", ... }` |
| `fetch(url, options?)` | `{ "do": "fetch", "url": ..., ... }` |
| `navigate(url, options?)` | `{ "do": "navigate", "url": ... }` |

**Update Operation Shorthands:**

```typescript
increment(target, value?)  // Add to number
decrement(target, value?)  // Subtract from number
push(target, value)        // Add item to list
pop(target)                // Remove last item
toggle(target)             // Flip boolean
```

**Example:**

```typescript
// JSON: { "name": "addTodo", "steps": [{ "do": "update", "target": "todos", "operation": "push", "value": { "expr": "var", "name": "payload" } }] }
action('addTodo', [
  push('todos', variable('payload')),
])

// Fetch with callbacks
action('loadData', [
  fetch(lit('/api/data'), {
    method: 'GET',
    result: 'response',
    onSuccess: [set('data', variable('response'))],
    onError: [set('error', lit('Failed to load'))],
  }),
])
```

### View Builders

Build UI declaratively.

| Builder | JSON Equivalent |
|---------|----------------|
| `element(tag, props?, children?)` | `{ "kind": "element", "tag": "...", ... }` |
| `text(value)` | `{ "kind": "text", "value": ... }` |
| `ifNode(condition, then, else?)` | `{ "kind": "if", ... }` |
| `each(items, as, body, options?)` | `{ "kind": "each", ... }` |
| `component(name, props?, children?)` | `{ "kind": "component", "name": "...", ... }` |
| `slot(name?)` | `{ "kind": "slot" }` |

**Element Shorthands:**

```typescript
div(props?, children?)
span(props?, children?)
button(props?, children?)
input(props?, children?)
```

**Example:**

```typescript
// Conditional rendering
ifNode(
  gt(state('count'), lit(0)),
  text(lit('Positive')),
  text(lit('Zero or negative'))
)

// List rendering
each(
  state('todos'),
  'todo',
  div({}, [text(variable('todo', 'text'))]),
  { index: 'i', key: variable('todo', 'id') }
)
```

### Event Builders

Bind events to actions.

| Builder | JSON Equivalent |
|---------|----------------|
| `onClick(action, payload?)` | `{ "event": "click", "action": "..." }` |
| `onInput(action, payload?)` | `{ "event": "input", "action": "...", "payload": ... }` |
| `onChange(action, payload?)` | `{ "event": "change", "action": "...", "payload": ... }` |
| `onSubmit(action, payload?)` | `{ "event": "submit", "action": "..." }` |

**Note:** `onInput` and `onChange` automatically include `{ "expr": "var", "name": "event", "path": "target.value" }` as payload.

**Example:**

```typescript
input({
  value: state('query'),
  onInput: onInput('updateQuery'),
})
```

### Program Builder

Compose the complete program.

```typescript
createProgram({
  route?: { path: string, title?: Expression, layout?: string },
  state: Record<string, StateField>,
  actions: ActionDefinition[],
  view: ViewNode,
  components?: Record<string, ComponentDef>,
})
```

## Complete Example: Todo List

### JSON

```json
{
  "version": "1.0",
  "state": {
    "todos": { "type": "list", "initial": [] },
    "newTodo": { "type": "string", "initial": "" }
  },
  "actions": [
    {
      "name": "updateInput",
      "steps": [{ "do": "set", "target": "newTodo", "value": { "expr": "var", "name": "payload" } }]
    },
    {
      "name": "addTodo",
      "steps": [
        { "do": "update", "target": "todos", "operation": "push", "value": { "expr": "state", "name": "newTodo" } },
        { "do": "set", "target": "newTodo", "value": { "expr": "lit", "value": "" } }
      ]
    },
    {
      "name": "removeTodo",
      "steps": [{ "do": "update", "target": "todos", "operation": "remove", "value": { "expr": "var", "name": "payload" } }]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      {
        "kind": "element",
        "tag": "div",
        "children": [
          {
            "kind": "element",
            "tag": "input",
            "props": {
              "value": { "expr": "state", "name": "newTodo" },
              "onInput": { "event": "input", "action": "updateInput", "payload": { "expr": "var", "name": "event", "path": "target.value" } }
            }
          },
          {
            "kind": "element",
            "tag": "button",
            "props": { "onClick": { "event": "click", "action": "addTodo" } },
            "children": [{ "kind": "text", "value": { "expr": "lit", "value": "Add" } }]
          }
        ]
      },
      {
        "kind": "each",
        "items": { "expr": "state", "name": "todos" },
        "as": "todo",
        "index": "i",
        "body": {
          "kind": "element",
          "tag": "div",
          "children": [
            { "kind": "text", "value": { "expr": "var", "name": "todo" } },
            {
              "kind": "element",
              "tag": "button",
              "props": { "onClick": { "event": "click", "action": "removeTodo", "payload": { "expr": "var", "name": "i" } } },
              "children": [{ "kind": "text", "value": { "expr": "lit", "value": "Delete" } }]
            }
          ]
        }
      }
    ]
  }
}
```

### TypeScript Builder (Equivalent)

```typescript
import {
  createProgram,
  listField, stringField,
  action, set, push, update,
  div, input, button, text, each,
  state, variable, lit,
  onClick, onInput,
} from '@constela/builder';

const program = createProgram({
  state: {
    todos: listField<string>([]),
    newTodo: stringField(''),
  },
  actions: [
    action('updateInput', [
      set('newTodo', variable('payload')),
    ]),
    action('addTodo', [
      push('todos', state('newTodo')),
      set('newTodo', lit('')),
    ]),
    action('removeTodo', [
      update('todos', 'remove', variable('payload')),
    ]),
  ],
  view: div({}, [
    div({}, [
      input({
        value: state('newTodo'),
        onInput: onInput('updateInput'),
      }),
      button(
        { onClick: onClick('addTodo') },
        [text(lit('Add'))]
      ),
    ]),
    each(
      state('todos'),
      'todo',
      div({}, [
        text(variable('todo')),
        button(
          { onClick: onClick('removeTodo', variable('i')) },
          [text(lit('Delete'))]
        ),
      ]),
      { index: 'i' }
    ),
  ]),
});
```

## Integration with @constela/compiler

The builder produces AST that can be passed directly to the compiler.

```typescript
import { createProgram, /* builders */ } from '@constela/builder';
import { compile } from '@constela/compiler';

// Build program
const program = createProgram({
  state: { count: numberField(0) },
  actions: [action('increment', [increment('count')])],
  view: button({ onClick: onClick('increment') }, [text(state('count'))]),
});

// Compile
const result = compile(program);

if (result.ok) {
  // Use compiled program with runtime
  console.log(result.program);
} else {
  console.error(result.errors);
}
```

## When to Use Builders

| Use Case | Recommendation |
|----------|----------------|
| Static apps | Write JSON directly |
| Dynamic generation | Use builders |
| Code generation tools | Use builders |
| Testing | Use builders for test fixtures |
| IDE with JSON support | Write JSON directly |

## License

MIT
