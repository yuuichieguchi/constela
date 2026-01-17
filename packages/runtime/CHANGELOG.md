# @constela/runtime

## 0.12.0

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
  - @constela/compiler@0.9.0

## 0.11.1

### Patch Changes

- c4301c2: Fix theme state initialization to read from localStorage in runtime instead of post-hydration sync in start

## 0.11.0

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
  - @constela/compiler@0.8.0

## 0.10.3

### Patch Changes

- fix(runtime): render SVG elements with correct namespace using createElementNS

## 0.10.2

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.1

## 0.10.1

### Patch Changes

- feat(runtime): add subscribe method to AppInstance

  Expose StateStore.subscribe() through hydrateApp() and createApp() return objects.
  This enables client-side code to reactively respond to state changes, fixing theme
  persistence across page navigation.

## 0.10.0

### Minor Changes

- feat(start): add production runtime bundling with esbuild

  - Bundle @constela/runtime for production builds instead of relying on importmap
  - Add runtimePath option to wrapHtml() with injection validation
  - Implement \_\_pathData injection in generateStaticPages for SSG
  - Skip bundling when no pages to generate

  feat(runtime): add safe globals and method binding to expression evaluator

  - Add safeGlobals (JSON, Math, Date, Object, Array, String, Number, Boolean, console)
  - Bind methods to their parent object to preserve 'this' context

## 0.9.2

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.0

## 0.9.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.7.0
  - @constela/compiler@0.6.1

## 0.9.0

### Minor Changes

- Add external library integration: RefExpr, ImportStep, CallStep, SubscribeStep, DisposeStep, and error variable injection in onError callbacks

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.6.0
  - @constela/core@0.6.0

## 0.8.0

### Minor Changes

- @constela/core (minor)

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.5.0
  - @constela/core@0.5.0

## 0.7.0

### Minor Changes

- Add client-side features for official site migration

## 0.6.0

### Minor Changes

- feat: add SSR infrastructure

## 0.5.0

### Minor Changes

- feat: add SSR infrastructure

## 0.4.0

### Minor Changes

- Add markdown and code view nodes for rich content rendering

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.4.0
  - @constela/core@0.4.0

## 0.3.5

### Patch Changes

- fix: add cond and get expression validation to schema validator
- Updated dependencies
  - @constela/core@0.3.3
  - @constela/compiler@0.3.3

## 0.3.4

### Patch Changes

- Updated dependencies [3849d2b]
  - @constela/core@0.3.2
  - @constela/compiler@0.3.2
