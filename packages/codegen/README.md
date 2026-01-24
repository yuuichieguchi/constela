# @constela/codegen

Internal code generator for Constela VSCode extension.

## Overview

Extracts type information from `@constela/core` AST definitions and generates:

- **completion-data.ts** - Completion entries for Language Server
- **hover-data.ts** - Hover documentation for Language Server
- **TextMate grammar** - Syntax highlighting patterns

## Usage

```bash
# Run code generation
pnpm --filter @constela/codegen generate
```

This is automatically executed during VSCode extension build (`packages/vscode-constela`).

## How It Works

1. **Extractor** (`src/extractor.ts`) - Uses `ts-morph` to parse `packages/core/src/types/ast.ts`
2. **Generators** (`src/generators/`) - Transform extracted types into output files
3. **Script** (`scripts/generate.ts`) - CLI entry point

## Generated Files

| Output | Location |
|--------|----------|
| completion-data.ts | `packages/constela-language-server/src/generated/` |
| hover-data.ts | `packages/constela-language-server/src/generated/` |
| constela.tmLanguage.json | `packages/vscode-constela/syntaxes/` (updated in-place) |

## Development

```bash
# Run tests
pnpm --filter @constela/codegen test

# Type check
pnpm --filter @constela/codegen type-check
```
