# @constela/server

## 12.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.0
  - @constela/compiler@0.14.5

## 11.0.1

### Patch Changes

- fix: add ArrayExpr support for SSR

  Added `case 'array'` handling to server-side expression evaluation to support the new ArrayExpr type.

## 11.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.0
  - @constela/compiler@0.14.0

## 10.0.1

### Patch Changes

- feat: add call/lambda expression support for SSR

  - Support array methods: length, at, includes, slice, indexOf, join, filter, map, find, findIndex, some, every
  - Support string methods: length, charAt, substring, slice, split, trim, toUpperCase, toLowerCase, replace, includes, startsWith, endsWith, indexOf
  - Support Math methods: min, max, round, floor, ceil, abs, sqrt, pow, random, sin, cos, tan
  - Support Date methods: now, parse, toISOString, getTime, getFullYear, etc.

## 10.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.14.0
  - @constela/compiler@0.13.0

## 9.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.13.0
  - @constela/compiler@0.12.0

## 8.0.1

### Patch Changes

- fix(runtime): handle SSR/client branch mismatch in hydrateIf

  - Add SSR branch markers (<!--if:then-->, <!--if:else-->, <!--if:none-->) to detect and fix SSG/client state mismatches during hydration
  - Prioritize cookie over localStorage in createStateStore when using cookie expression

## 8.0.0

### Minor Changes

- feat: SSR theme state synchronization with cookies

  Phase 1:

  - Add `stateOverrides` option to `RenderOptions` for overriding state initial values during SSR
  - Add `cookies` property to `SSRContext` for reading cookies in SSR
  - Add `parseCookies` helper function in edge adapter
  - Save theme state to cookie when changed for SSR synchronization

  Phase 2:

  - Add `CookieInitialExpr` type for DSL cookie expressions in state initial values
  - Support `{ "expr": "cookie", "key": "theme", "default": "dark" }` syntax for state initial values
  - Evaluate cookie expressions during SSR and client-side initialization

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.0
  - @constela/compiler@0.11.1

## 7.0.0

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.11.0

## 6.0.0

### Minor Changes

- feat: add component local state support

  - Add `localState` and `localActions` fields to ComponentDef
  - Add `LocalActionStep` and `LocalActionDefinition` types
  - Add `UNDEFINED_LOCAL_STATE` and `LOCAL_ACTION_INVALID_STEP` error codes
  - Add `CompiledLocalStateNode` and `CompiledLocalAction` types
  - Add validation for localState and localActions in analyze pass
  - Add transformation for localState wrapping in transform pass
  - Add `renderLocalState` function in runtime renderer
  - Add local action execution support in action executor
  - Add SSR support for localState nodes in server renderer

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.10.0

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
