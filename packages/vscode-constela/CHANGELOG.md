# Changelog

All notable changes to the Constela extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-07

### Added

- New expression type support: `local`, `array`, `obj`
- New action step support: `generate`, `sseConnect`, `sseClose`, `optimistic`, `confirm`, `reject`, `bind`, `unbind`
- New view node support: `island`, `suspense`, `errorBoundary`

### Changed

- Updated `call` expression `target` to accept `null`

## [0.1.5] - 2026-01-24

### Fixed

- Language Server crash on startup (`Cannot find module './impl/format'`)
- Hover and Go to Definition not working
- Centered language icon in file explorer

### Technical

- Added `mainFields: ['module', 'main']` to esbuild config to prefer ESM over UMD
- Created dedicated entry point (`main.ts`) that calls `startServer()`

## [0.1.4] - 2026-01-24

### Added

- `call` and `lambda` expression support for completion and hover
- Auto-generated definitions from `@constela/core` AST types

### Fixed

- TextMate grammar now uses `kind` discriminator for ViewNode (was incorrectly `node`)
- Hover documentation now shows correct property names (e.g., `not.operand` instead of `not.value`)

### Technical

- New `@constela/codegen` package for auto-generating Language Server definitions
- Build script now runs codegen automatically before bundling

## [0.1.3] - 2025-01-24

### Fixed

- Corrected homepage URL to https://constela.dev/
- Corrected repository URLs in package metadata

## [0.1.1] - 2025-01-24

### Added

- README documentation for Marketplace
- CHANGELOG for version history

## [0.1.0] - 2025-01-24

### Added

- **Syntax Highlighting** - TextMate grammar for Constela DSL keywords
  - Expression types (`lit`, `state`, `var`, `bin`, `not`, `cond`, `get`, `concat`, etc.)
  - Action steps (`set`, `update`, `fetch`, `navigate`, `delay`, `interval`, etc.)
  - View nodes (`element`, `text`, `if`, `each`, `component`, `slot`, etc.)
  - Top-level sections (`state`, `actions`, `view`, `components`, `route`, etc.)

- **Language Server** - Full LSP implementation
  - Real-time validation using Constela compiler
  - JSON parse error detection
  - Semantic error reporting with suggestions

- **Auto-completion**
  - Expression type completions
  - Action step completions
  - View node completions
  - State field name completions
  - Action name completions
  - Component name completions

- **Hover Documentation**
  - Expression type signatures and descriptions
  - Action step usage documentation
  - View node structure information

- **Go to Definition**
  - Navigate to state field definitions
  - Navigate to action definitions
  - Navigate to component definitions

- **JSON Schema Validation**
  - Basic schema validation for `.constela.json` files

### Technical

- Bundled language server with all dependencies (no external npm packages required)
- Self-contained `.vsix` package (~160 KB)
