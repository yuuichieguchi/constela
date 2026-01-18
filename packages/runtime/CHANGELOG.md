# @constela/runtime

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
