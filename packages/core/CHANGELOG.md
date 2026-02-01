# @constela/core

## 0.17.4

### Patch Changes

- Support EventHandler props on component nodes

  - Add missing action types to VALID_ACTION_TYPES (sseConnect, sseClose, optimistic, confirm, reject)
  - Skip EventHandler validation in component node props
  - Add EventHandler validation in validateComponentProps
  - Transform EventHandler props correctly for component nodes

## 0.17.3

### Patch Changes

- fix: support concat expression in validateExpression

  Add validation for concat expression type that was missing from
  the validator but already implemented in @constela/runtime.

## 0.17.2

### Patch Changes

- fix: support storage and dom actions in validateActionStep

  Add validation for storage and dom action types that were already
  implemented in @constela/runtime but missing from the validator.

## 0.17.1

### Patch Changes

- fix: support cookie expression in validateStateField

  The validateStateField function now correctly validates cookie expressions
  for string type state fields. Previously only plain strings were accepted,
  but the AST schema allows `{ expr: 'cookie', key: string, default: string }`.

## 0.17.0

### Minor Changes

- feat: Constela 2026.02 Release

  ## Theme System

  - CSS variable-based theming with light/dark/system modes
  - ThemeProvider with SSR support and FOUC prevention
  - Automatic system theme detection via prefers-color-scheme

  ## DatePicker & Calendar

  - Calendar component with locale support and min/max constraints
  - DatePicker with popup calendar and format options
  - Date helper functions: getCalendarDays, getWeekDays, formatDate

  ## Tree & Accordion

  - Accordion with single/multiple expansion modes
  - Tree component with nested nodes and selection
  - Full ARIA accessibility support

  ## DataTable & VirtualScroll

  - DataTable with sorting, filtering, pagination, and row selection
  - VirtualScroll for efficient rendering of large lists
  - Table helper functions: sortBy, getPaginatedItems, getVisibleRange

  ## Chart Components

  - BarChart, LineChart, AreaChart, PieChart, DonutChart
  - Curved line paths with Catmull-Rom splines
  - CSS animations for data visualization

  ## Realtime Features

  - SSE connections with auto-reconnection (exponential/linear backoff)
  - Optimistic updates with confirm/reject/rollback
  - Realtime state bindings with JSON Patch support

  ## SSR/Edge Optimization

  - Streaming SSR with Web Streams API
  - Islands Architecture with 6 hydration strategies
  - Suspense and ErrorBoundary support
  - Island bundling and prefetching

## 0.16.2

### Patch Changes

- chore: version bump for npm release

## 0.16.1

### Patch Changes

- fix(runtime): prevent double rendering in HMR by adding skipInitialRender option

## 0.16.0

### Minor Changes

- feat(ai): add AI provider abstraction layer

  - New @constela/ai package with Anthropic and OpenAI providers
  - Security layer for DSL validation (forbidden tags, actions, URL validation)
  - DSL generator with prompt builders for component, view, and suggestion generation
  - AiDataSource and GenerateStep types added to @constela/core
  - Build-time AI data loading in @constela/start
  - Compiler transformation and runtime execution for GenerateStep
  - CLI suggest command for AI-powered DSL analysis

## 0.15.2

### Patch Changes

- fix: remove incorrect field validation from setPath (field is not part of SetPathStep AST)

## 0.15.1

### Patch Changes

- fix: add setPath to VALID_ACTION_TYPES and use dynamic error messages in validator

## 0.15.0

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

## 0.14.0

### Minor Changes

- feat: add call/lambda expressions with array, string, and Math methods

  - Add CallExpr and LambdaExpr types to support method calls on arrays, strings, Math, and Date
  - Array methods: length, at, includes, slice, indexOf, join, filter, map, find, findIndex, some, every
  - String methods: length, charAt, substring, slice, split, trim, toUpperCase, toLowerCase, replace, includes, startsWith, endsWith, indexOf
  - Math methods: min, max, round, floor, ceil, abs, sqrt, pow, random, sin, cos, tan
  - Date methods: now, parse, toISOString, getTime, getFullYear, etc.
  - Lambda expressions support param and optional index for array iteration methods
  - Security: whitelist-based method filtering and prototype pollution prevention

## 0.13.0

### Minor Changes

- feat: add SEO features (lang attribute, canonical URL, JSON-LD)

  - Add `seo.lang` config option to output `<html lang="...">` attribute
  - Add `canonical` expression to RouteDefinition for `<link rel="canonical">` generation
  - Add `jsonLd` structured data to RouteDefinition for `<script type="application/ld+json">` generation
  - Include XSS protection for all SEO features (BCP 47 validation for lang, HTML escaping for canonical and JSON-LD)

## 0.12.3

### Patch Changes

- fix(compiler): support object payload in event handler transformation

  - transformEventHandler now correctly handles object payload format (`{ key: Expression }`)
  - Added `Record<string, Expression>` to EventHandler.payload type definition
  - Single expression payloads (`{ expr: ... }`) continue to work as before

## 0.12.2

### Patch Changes

- Add IfStep action type to validator, schema, and compiler transform

## 0.12.1

### Patch Changes

- Add missing types to validator whitelist: portal, validity, index, delay, interval, clearTimer, focus

## 0.12.0

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

## 0.11.0

### Minor Changes

- feat: add high-priority features for React/Next.js parity

  - Timer functionality: delay, interval, clearTimer action steps
  - Event info expansion: KeyboardEvent, MouseEvent, TouchEvent, scroll data extraction
  - Form functionality: focus step, validity expression, file input support
  - Portal & Observer: PortalNode, IntersectionObserver, debounce/throttle for event handlers

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

## 0.9.1

### Patch Changes

- Add concat expression and evaluatePayload for object payloads

  - Add ConcatExpr type to concatenate multiple expressions into a string
  - Add evaluatePayload function to recursively evaluate object-shaped payloads
  - Fix event handler payload evaluation for object-style payloads like `{ index: expr, liked: expr }`

## 0.9.0

### Minor Changes

- feat: add fine-grained state updates, key-based list diffing, computed state, and WebSocket support

  - Add setPath/getPath/subscribeToPath for partial state updates
  - Add key-based diffing for efficient list rendering
  - Add createComputed for memoized derived state
  - Add WebSocket connection support with send/close actions
  - Add TypedStateStore for type-safe state access

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

## 0.7.0

### Minor Changes

- Add ComponentsRef type and components field to DataSource for MDX component support. Add complete MDX DSL integration with breaking change to transformMdx signature

## 0.6.0

### Minor Changes

- Add external library integration: RefExpr, ImportStep, CallStep, SubscribeStep, DisposeStep, and error variable injection in onError callbacks

## 0.5.0

### Minor Changes

- @constela/core (minor)

## 0.4.0

### Minor Changes

- Add markdown and code view nodes for rich content rendering

## 0.3.3

### Patch Changes

- fix: add cond and get expression validation to schema validator

## 0.3.2

### Patch Changes

- 3849d2b: Remove ajv dependency to eliminate unsafe-eval CSP requirement
