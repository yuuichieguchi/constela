# Constela for Visual Studio Code

Language support for [Constela](https://constela.dev) - a constrained UI DSL that compiles to minimal runtime JavaScript.

## Features

### Syntax Highlighting

Full syntax highlighting for `.constela.json` files with semantic coloring for:

- Expression types (`lit`, `state`, `var`, `bin`, `cond`, etc.)
- Action steps (`set`, `fetch`, `navigate`, `delay`, etc.)
- View nodes (`element`, `text`, `if`, `each`, `component`, etc.)
- State definitions, actions, components, and more

### IntelliSense

Smart auto-completion for:

- **Expression types** - Complete list of available expressions
- **Action steps** - All action types with descriptions
- **View nodes** - Element, text, conditional, loop nodes
- **State references** - Your defined state fields
- **Action references** - Your defined actions
- **Component references** - Your defined components

### Real-time Validation

Errors are displayed as you type, powered by the Constela compiler:

- JSON syntax errors
- Missing required fields
- Invalid references (undefined state, actions, components)
- Type mismatches

### Hover Information

Hover over keywords to see documentation:

- Expression signatures and descriptions
- Action step usage examples
- View node structure

### Go to Definition

Navigate to definitions with `Ctrl+Click` (or `Cmd+Click` on macOS):

- Jump to state field definitions
- Jump to action definitions
- Jump to component definitions

## Requirements

- Visual Studio Code 1.85.0 or higher

## Extension Settings

This extension contributes the following settings:

- `constela.trace.server`: Traces communication between VS Code and the language server (`off`, `messages`, `verbose`)
- `constela.validation.enable`: Enable/disable validation of Constela files

## File Association

The extension automatically activates for files matching:

- `*.constela.json`

## Quick Start

1. Create a new file with `.constela.json` extension
2. Start with the basic structure:

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
        { "do": "update", "name": "count", "with": "increment" }
      ]
    }
  ],
  "view": {
    "node": "element",
    "tag": "button",
    "props": {
      "onClick": { "action": "increment" }
    },
    "children": [
      {
        "node": "text",
        "content": { "expr": "state", "name": "count" }
      }
    ]
  }
}
```

3. Enjoy syntax highlighting, auto-completion, and validation!

## Learn More

- [Constela Website](https://constela.dev/)
- [GitHub Repository](https://github.com/yuuichieguchi/constela)
- [Examples](https://github.com/yuuichieguchi/constela/tree/main/examples)

## Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/yuuichieguchi/constela/issues).

## License

MIT
