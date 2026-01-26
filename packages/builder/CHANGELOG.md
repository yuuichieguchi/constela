# @constela/builder

## 0.2.16

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.2

## 0.2.15

### Patch Changes

- fix(runtime): prevent double rendering in HMR by adding skipInitialRender option
- Updated dependencies
  - @constela/core@0.16.1

## 0.2.14

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.0

## 0.2.13

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.2

## 0.2.12

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.1

## 0.2.11

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.0

## 0.2.10

### Patch Changes

- Updated dependencies
  - @constela/core@0.14.0

## 0.2.9

### Patch Changes

- Updated dependencies
  - @constela/core@0.13.0

## 0.2.8

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.3

## 0.2.7

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.2

## 0.2.6

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.1

## 0.2.5

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.0

## 0.2.4

### Patch Changes

- Updated dependencies
  - @constela/core@0.11.0

## 0.2.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.10.0

## 0.2.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.9.1

## 0.2.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.9.0

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies
  - @constela/core@0.8.0
