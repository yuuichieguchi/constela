# @constela/compiler

## 0.14.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.1

## 0.14.0

### Minor Changes

- feat: add ArrayExpr for dynamic array construction

  Added `expr: 'array'` expression type to Constela DSL for dynamically constructing arrays from expressions.

  Example:

  ```json
  {
    "expr": "array",
    "elements": [
      { "expr": "var", "name": "basicSetup" },
      {
        "expr": "call",
        "target": { "expr": "var", "name": "json" },
        "args": []
      }
    ]
  }
  ```

  This enables patterns like CodeMirror extensions: `[basicSetup, json()]`

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.0

## 0.13.0

### Minor Changes

- feat: add call/lambda expressions with array, string, and Math methods

  - Add CallExpr and LambdaExpr types to support method calls on arrays, strings, Math, and Date
  - Array methods: length, at, includes, slice, indexOf, join, filter, map, find, findIndex, some, every
  - String methods: length, charAt, substring, slice, split, trim, toUpperCase, toLowerCase, replace, includes, startsWith, endsWith, indexOf
  - Math methods: min, max, round, floor, ceil, abs, sqrt, pow, random, sin, cos, tan
  - Date methods: now, parse, toISOString, getTime, getFullYear, etc.
  - Lambda expressions support param and optional index for array iteration methods
  - Security: whitelist-based method filtering and prototype pollution prevention

### Patch Changes

- Updated dependencies
  - @constela/core@0.14.0

## 0.12.0

### Minor Changes

- feat: add SEO features (lang attribute, canonical URL, JSON-LD)

  - Add `seo.lang` config option to output `<html lang="...">` attribute
  - Add `canonical` expression to RouteDefinition for `<link rel="canonical">` generation
  - Add `jsonLd` structured data to RouteDefinition for `<script type="application/ld+json">` generation
  - Include XSS protection for all SEO features (BCP 47 validation for lang, HTML escaping for canonical and JSON-LD)

### Patch Changes

- Updated dependencies
  - @constela/core@0.13.0

## 0.11.4

### Patch Changes

- fix(compiler): support object payload in event handler transformation

  - transformEventHandler now correctly handles object payload format (`{ key: Expression }`)
  - Added `Record<string, Expression>` to EventHandler.payload type definition
  - Single expression payloads (`{ expr: ... }`) continue to work as before

- Updated dependencies
  - @constela/core@0.12.3

## 0.11.3

### Patch Changes

- Add IfStep action type to validator, schema, and compiler transform
- Updated dependencies
  - @constela/core@0.12.2

## 0.11.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.1

## 0.11.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.0

## 0.11.0

### Minor Changes

- feat: add high-priority features for React/Next.js parity

  - Timer functionality: delay, interval, clearTimer action steps
  - Event info expansion: KeyboardEvent, MouseEvent, TouchEvent, scroll data extraction
  - Form functionality: focus step, validity expression, file input support
  - Portal & Observer: PortalNode, IntersectionObserver, debounce/throttle for event handlers

### Patch Changes

- Updated dependencies
  - @constela/core@0.11.0

## 0.10.0

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
  - @constela/core@0.10.0

## 0.9.1

### Patch Changes

- Add concat expression and evaluatePayload for object payloads

  - Add ConcatExpr type to concatenate multiple expressions into a string
  - Add evaluatePayload function to recursively evaluate object-shaped payloads
  - Fix event handler payload evaluation for object-style payloads like `{ index: expr, liked: expr }`

- Updated dependencies
  - @constela/core@0.9.1

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
