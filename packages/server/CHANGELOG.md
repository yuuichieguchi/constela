# @constela/server

## 5.0.1

### Patch Changes

- Add concat expression and evaluatePayload for object payloads

  - Add ConcatExpr type to concatenate multiple expressions into a string
  - Add evaluatePayload function to recursively evaluate object-shaped payloads
  - Fix event handler payload evaluation for object-style payloads like `{ index: expr, liked: expr }`

- Updated dependencies
  - @constela/compiler@0.9.1

## 5.0.0

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.9.0

## 4.1.0

### Minor Changes

- Add SSR style evaluation support

  - Style expressions are now evaluated during server-side rendering
  - Added `styles` option to `RenderOptions` for passing style presets
  - Added `StylePreset` interface for defining reusable styles with variants

## 4.0.0

### Patch Changes

- feat: add DX improvements, Builder API, and Style System

  ## Phase 1: DX Foundation

  - Enhanced error types with severity, suggestion, expected, actual, context
  - Levenshtein distance-based similar name detection (findSimilarNames)
  - "Did you mean?" suggestions for undefined state/action/component references
  - CLI --json flag for machine-readable output
  - Colored error output with NO_COLOR support

  ## Phase 2: CLI Extensions

  - New `validate` command for fast validation without compilation
  - New `--watch` flag for file watching and auto-recompilation
  - New `--verbose` flag for detailed compilation progress

  ## Phase 3: TypeScript Builder API

  - New @constela/builder package
  - 40+ builder functions for programmatic AST construction
  - Type-safe functional composition pattern

  ## Phase 4: Style System

  - StylePreset and StyleExpr types
  - JSON Schema validation for styles
  - Compiler analysis with UNDEFINED_STYLE/UNDEFINED_VARIANT errors
  - Runtime evaluation of style expressions

  ## Phase 5: Debug Tools

  - New `inspect` command for AST inspection
  - New `--debug` flag for internal debug information

- Updated dependencies
  - @constela/compiler@0.8.0

## 3.0.1

### Patch Changes

- fix(server): add index expression type support in SSR evaluate function

## 3.0.0

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.0

## 2.0.0

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.6.0

## 1.0.0

### Minor Changes

- @constela/core (minor)

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.5.0

## 0.1.2

### Patch Changes

- feat: add SSR infrastructure

## 0.1.1

### Patch Changes

- feat: add SSR infrastructure
