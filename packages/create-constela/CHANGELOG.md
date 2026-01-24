# create-constela

## 0.2.3

### Patch Changes

- Unify DSL file extension to `.constela.json`

  - Rename template files from `.json` to `.constela.json`
  - Update file-router.ts and build/index.ts to support `.constela.json` extension
  - Maintain backward compatibility with `.json` files

## 0.2.2

### Patch Changes

- fix: add CSS and @constela/start to fix dev server not serving node_modules

## 0.2.1

### Patch Changes

- fix: add missing examples templates (counter, todo-list, fetch-list)

## 0.2.0

### Minor Changes

- feat: add create-constela scaffolding CLI

  - Interactive prompts for project name and package manager
  - Template-based project scaffolding
  - Support for --list, --example, --template options
  - Git initialization and dependency installation
  - Path traversal security protection
