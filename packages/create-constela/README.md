# create-constela

Create Constela applications with one command.

## Usage

```bash
# npm
npm create constela@latest my-app

# yarn
yarn create constela my-app

# pnpm
pnpm create constela my-app
```

Or with npx:

```bash
npx create-constela my-app
```

## Options

| Option | Description |
|--------|-------------|
| `-t, --template <name>` | Use a specific template (default: `default`) |
| `-e, --example <name>` | Use an example project |
| `--no-git` | Skip git initialization |
| `--no-install` | Skip package installation |
| `--package-manager <pm>` | Package manager to use (npm, yarn, pnpm) |
| `--list` | List available templates and examples |

## Templates

- `default` - Minimal starter with a single route

## Examples

- `counter` - Simple counter with state and actions
- `todo-list` - Todo app with list operations
- `fetch-list` - Data fetching example

## Interactive Mode

Running without arguments starts interactive mode:

```bash
npx create-constela
```

You'll be prompted for:
1. Project name
2. Template or example selection
3. Package manager preference

## Quick Start

```bash
# Create a new project
npx create-constela my-app --install

# Navigate and start dev server
cd my-app
npm run dev
```

Open http://localhost:3000 to see your app.

## License

MIT
