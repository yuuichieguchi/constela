# @constela/runtime

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
