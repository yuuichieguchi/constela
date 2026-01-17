# @constela/compiler

## 0.9.0

### Minor Changes

- feat: add fine-grained state updates, key-based list diffing, computed state, and WebSocket support

  - Add setPath/getPath/subscribeToPath for partial state updates
  - Add key-based diffing for efficient list rendering
  - Add createComputed for memoized derived state
  - Add WebSocket connection support with send/close actions
  - Add TypedStateStore for type-safe state access

### Patch Changes

- Updated dependencies
  - @constela/core@0.9.0

## 0.8.0

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

## 0.7.1

### Patch Changes

- Fix param expressions being converted to null during layout transformation

## 0.7.0

### Minor Changes

- feat: Add MDX component param substitution for PropsTable/Callout with kind:each and expr:param support

## 0.6.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.7.0

## 0.6.0

### Minor Changes

- Add external library integration: RefExpr, ImportStep, CallStep, SubscribeStep, DisposeStep, and error variable injection in onError callbacks

### Patch Changes

- Updated dependencies
  - @constela/core@0.6.0

## 0.5.0

### Minor Changes

- @constela/core (minor)

### Patch Changes

- Updated dependencies
  - @constela/core@0.5.0

## 0.4.0

### Minor Changes

- Add markdown and code view nodes for rich content rendering

### Patch Changes

- Updated dependencies
  - @constela/core@0.4.0

## 0.3.3

### Patch Changes

- fix: add cond and get expression validation to schema validator
- Updated dependencies
  - @constela/core@0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies [3849d2b]
  - @constela/core@0.3.2
