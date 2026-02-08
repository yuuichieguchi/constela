# @constela/runtime

## 7.0.0

### Minor Changes

- feat(core,compiler,runtime): add CSS class-based transition system for if/each nodes

  Add TransitionDirective type with enter/exit animation classes. Schema validation, compiler pass-through, and runtime applyEnterTransition/applyExitTransition with cancel support and transitionend bubble guard.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @constela/core@0.23.0
  - @constela/compiler@0.16.0
  - @constela/ai@8.0.0

## 6.0.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.22.1
  - @constela/ai@7.0.1
  - @constela/compiler@0.15.22

## 6.0.0

### Patch Changes

- refactor: unify SSR/CSR evaluate() into @constela/core
- Updated dependencies
  - @constela/core@0.22.0
  - @constela/ai@7.0.0
  - @constela/compiler@0.15.21

## 5.0.6

### Patch Changes

- Updated dependencies [6e8ae3d]
  - @constela/core@0.21.4
  - @constela/ai@6.0.4
  - @constela/compiler@0.15.20

## 5.0.5

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.3
  - @constela/ai@6.0.3
  - @constela/compiler@0.15.19

## 5.0.4

### Patch Changes

- Add SVG filter primitive elements to SVG_TAGS whitelist to fix chart filter rendering

## 5.0.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.2
  - @constela/ai@6.0.2
  - @constela/compiler@0.15.18

## 5.0.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.1
  - @constela/ai@6.0.1
  - @constela/compiler@0.15.17

## 5.0.1

### Patch Changes

- Add modulo (%) operator to expression evaluators

## 5.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.0
  - @constela/ai@6.0.0
  - @constela/compiler@0.15.16

## 4.0.1

### Patch Changes

- fix: support inter-field dependencies in localState initialization

## 4.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.20.0
  - @constela/ai@5.0.0
  - @constela/compiler@0.15.15

## 3.0.1

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.15.14

## 3.0.0

### Patch Changes

- feat: move global helper functions to @constela/core for SSR support, enabling chart Y-axis scaling in server-side rendering
- Updated dependencies
  - @constela/core@0.19.0
  - @constela/ai@4.0.0
  - @constela/compiler@0.15.13

## 2.0.10

### Patch Changes

- fix: normalize Y-axis scaling in LineChart, AreaChart, ScatterChart using scaleChartY helper

## 2.0.9

### Patch Changes

- fix(runtime): pass styles through context chain for client-side style expressions
- Updated dependencies
  - @constela/compiler@0.15.12

## 2.0.8

### Patch Changes

- revert: 不完全な LineChart 修正を取り消し

## 2.0.7

### Patch Changes

- revert: 不完全な LineChart 修正を取り消し
- Updated dependencies
  - @constela/core@0.18.5
  - @constela/ai@3.0.5
  - @constela/compiler@0.15.11

## 2.0.6

### Patch Changes

- revert: 不完全な LineChart 修正を取り消し
- Updated dependencies
  - @constela/core@0.18.4
  - @constela/ai@3.0.4
  - @constela/compiler@0.15.10

## 2.0.5

### Patch Changes

- revert: LineChart/AreaChart の不完全な修正を取り消し
- Updated dependencies
  - @constela/core@0.18.3
  - @constela/ai@3.0.3
  - @constela/compiler@0.15.9

## 2.0.4

### Patch Changes

- Fix consecutive if nodes hydration marker detection

  SSR markers were misaligned when multiple consecutive if nodes existed.
  The fix pre-collects all if markers and consumes them sequentially,
  ensuring correct marker-to-if-node matching regardless of branch types.

## 2.0.3

### Patch Changes

- fix: evaluate localState initial expressions instead of using them as literal values

## 2.0.2

### Patch Changes

- fix: add ObjExpr type support for object literal expressions in lambda body
- Updated dependencies
  - @constela/core@0.18.2
  - @constela/compiler@0.15.8
  - @constela/ai@3.0.2

## 2.0.1

### Patch Changes

- fix: add LocalExpr type support for component local state
- Updated dependencies
  - @constela/core@0.18.1
  - @constela/compiler@0.15.7
  - @constela/ai@3.0.1

## 2.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.18.0
  - @constela/compiler@0.15.6
  - @constela/ai@3.0.0

## 1.0.5

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.15.5

## 1.0.4

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.4
  - @constela/compiler@0.15.4
  - @constela/ai@2.0.4

## 1.0.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.3
  - @constela/ai@2.0.3
  - @constela/compiler@0.15.3

## 1.0.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.2
  - @constela/ai@2.0.2
  - @constela/compiler@0.15.2

## 1.0.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.1
  - @constela/ai@2.0.1
  - @constela/compiler@0.15.1

## 1.0.0

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

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.0
  - @constela/compiler@0.15.0
  - @constela/ai@2.0.0

## 0.19.7

### Patch Changes

- fix: resolve type error and flaky tests for release build

  - bundler.ts: Use conditional spread for optional strategyOptions property
  - code.test.ts: Replace setTimeout with vi.waitFor for stable shiki initialization

## 0.19.6

### Patch Changes

- chore: version bump for npm release
- Updated dependencies
  - @constela/core@0.16.2
  - @constela/compiler@0.14.7
  - @constela/ai@1.0.2

## 0.19.5

### Patch Changes

- fix(runtime): prevent double rendering in HMR by adding skipInitialRender option
- Updated dependencies
  - @constela/core@0.16.1
  - @constela/compiler@0.14.6
  - @constela/ai@1.0.1

## 0.19.4

### Patch Changes

- afd1084: fix: make @constela/ai an optional peer dependency

  @constela/ai was incorrectly added as a required dependency, causing installation failures for projects that don't use AI features. Now it's an optional peer dependency.

## 0.19.3

### Patch Changes

- feat(ai): add AI provider abstraction layer

  - New @constela/ai package with Anthropic and OpenAI providers
  - Security layer for DSL validation (forbidden tags, actions, URL validation)
  - DSL generator with prompt builders for component, view, and suggestion generation
  - AiDataSource and GenerateStep types added to @constela/core
  - Build-time AI data loading in @constela/start
  - Compiler transformation and runtime execution for GenerateStep
  - CLI suggest command for AI-powered DSL analysis

- Updated dependencies
  - @constela/ai@1.0.0
  - @constela/core@0.16.0
  - @constela/compiler@0.14.5

## 0.19.2

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.14.4

## 0.19.1

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.14.3

## 0.19.0

### Minor Changes

- Add localState/localActions support to hydrate.ts for SSR + Hydration environments

## 0.18.3

### Patch Changes

- fix: preserve array type in setValueAtPath when index is string

  Fixed bug where setValueAtPath would convert arrays to objects when the path index was a string (e.g., "0" instead of 0). Now determines clone type based on actual object type rather than head type.

## 0.18.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.2
  - @constela/compiler@0.14.2

## 0.18.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.1
  - @constela/compiler@0.14.1

## 0.18.0

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
  - @constela/compiler@0.14.0

## 0.17.1

### Patch Changes

- fix: return undefined for Math.min/max with no arguments

  Align behavior with @constela/server for consistency

## 0.17.0

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
  - @constela/compiler@0.13.0

## 0.16.6

### Patch Changes

- fix(hydrate): handle empty array in each loop during hydration

## 0.16.5

### Patch Changes

- Updated dependencies
  - @constela/core@0.13.0
  - @constela/compiler@0.12.0

## 0.16.4

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.11.4
  - @constela/core@0.12.3

## 0.16.3

### Patch Changes

- fix(runtime): add refs and route to all evaluate/evaluatePayload calls

  Fixed 10 locations in renderer where refs and route were not passed to evaluate context:

  - renderElement props evaluation
  - renderText value evaluation
  - renderIf condition evaluation
  - renderEach items/key evaluation
  - renderMarkdown content evaluation
  - renderCode language/content evaluation
  - createEventCallback payload evaluation
  - setupIntersectionObserver payload evaluation

## 0.16.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.2
  - @constela/compiler@0.11.3

## 0.16.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.1
  - @constela/compiler@0.11.2

## 0.16.0

### Minor Changes

- Add HMR (Hot Module Replacement) support for JSON DSL files

  - WebSocket HMR server and file watcher for development
  - State serialize/restore methods for preserving state during updates
  - HMR client with auto-reconnect and error overlay
  - `initClientWithHMR()` function for client-side HMR setup

## 0.15.2

### Patch Changes

- fix(runtime): handle SSR/client branch mismatch in hydrateIf

  - Add SSR branch markers (<!--if:then-->, <!--if:else-->, <!--if:none-->) to detect and fix SSG/client state mismatches during hydration
  - Prioritize cookie over localStorage in createStateStore when using cookie expression

## 0.15.1

### Patch Changes

- fix: add Secure attribute to theme cookie on HTTPS

  Cookie now includes Secure attribute when running on HTTPS to follow security best practices.

## 0.15.0

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

## 0.14.0

### Minor Changes

- feat: add high-priority features for React/Next.js parity

  - Timer functionality: delay, interval, clearTimer action steps
  - Event info expansion: KeyboardEvent, MouseEvent, TouchEvent, scroll data extraction
  - Form functionality: focus step, validity expression, file input support
  - Portal & Observer: PortalNode, IntersectionObserver, debounce/throttle for event handlers

### Patch Changes

- Updated dependencies
  - @constela/core@0.11.0
  - @constela/compiler@0.11.0

## 0.13.0

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
  - @constela/compiler@0.10.0

## 0.12.2

### Patch Changes

- Fix Proxy spread bug in createReactiveLocals by adding ownKeys and getOwnPropertyDescriptor traps

  Loop variables (itemName/indexName) were lost when spreading ctx.locals in event handlers inside each loops. This caused payload expressions referencing loop variables to receive undefined.

## 0.12.1

### Patch Changes

- Add concat expression and evaluatePayload for object payloads

  - Add ConcatExpr type to concatenate multiple expressions into a string
  - Add evaluatePayload function to recursively evaluate object-shaped payloads
  - Fix event handler payload evaluation for object-style payloads like `{ index: expr, liked: expr }`

- Updated dependencies
  - @constela/core@0.9.1
  - @constela/compiler@0.9.1

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
