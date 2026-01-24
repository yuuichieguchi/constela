# @constela/language-server

Language Server Protocol (LSP) implementation for Constela DSL.

> **Note**: This package is bundled into the [VSCode extension](https://marketplace.visualstudio.com/items?itemName=constela.vscode-constela) and is not published to npm separately.

## Features

- **Diagnostics**: Real-time validation using the Constela compiler
- **Completion**: Auto-completion for expressions, actions, view nodes, and references
- **Hover**: Documentation on hover for DSL keywords
- **Go to Definition**: Navigate to state, action, and component definitions

## Usage

This package is intended for internal use by the VSCode extension. If you want to use Constela language support in VSCode, install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=constela.vscode-constela).

## Development

```bash
# Build
pnpm run build

# Test
pnpm test

# Type check
pnpm run type-check
```

## License

MIT
