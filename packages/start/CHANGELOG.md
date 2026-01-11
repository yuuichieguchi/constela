# @constela/start

## 1.2.16

### Patch Changes

- fix: resolve layout import expressions in SSG build

  Layout files with `imports` section now correctly resolve import expressions during SSG build. Previously, import expressions like `{ "expr": "import", "name": "nav", "path": "topNav" }` were evaluated as undefined in SSG output while working correctly in dev server.

  Also adds support for nested layouts of any depth with circular reference detection.

## 1.2.15

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.1
  - @constela/router@8.0.0
  - @constela/runtime@0.10.2
  - @constela/server@3.0.1

## 1.2.14

### Patch Changes

- Fix layout import expressions not being resolved during SSR in dev server

## 1.2.13

### Patch Changes

- Add cssContent option to CLI and config file for Tailwind CSS v4 PostCSS processing

## 1.2.12

### Patch Changes

- fix(build): resolve tailwindcss/index.css for PostCSS processing

  - Fix CRITICAL-1: Resolve tailwindcss CSS entry point instead of JS entry
  - Fix WARNING-1: Document multiple CSS files limitation in JSDoc
  - Fix WARNING-2: Convert glob patterns to directory-level @source
  - Fix WARNING-3: Add explicit error message for missing @tailwindcss/postcss
  - Fix WARNING-4: Extract shouldMinify variable for consistency

## 1.2.11

### Patch Changes

- fix(build): use actual CSS file path for PostCSS from option

  - Remove isWithinProject check that caused incorrect path resolution
  - Always use sourceDir for base and firstCssFile for from option

## 1.2.10

### Patch Changes

- fix(build): fix PostCSS path resolution for Tailwind CSS v4 directives

  - Fix `from` option to use project root for package resolution
  - Fix `base` option to correctly resolve relative paths in CSS
  - Add tests for @tailwind utilities and @source directives

## 1.2.9

### Patch Changes

- fix(build): add PostCSS/Tailwind CSS v4 support to bundleCSS()

  - Add `content` option to `BundleCSSOptions` for Tailwind class scanning
  - Process CSS through `@tailwindcss/postcss` when `content` is provided
  - Add `cssContent` option to `BuildOptions` for build configuration
  - Expand `@tailwind utilities` and `@import "tailwindcss"` directives
  - Maintain backward compatibility when `content` is not provided

## 1.2.8

### Patch Changes

- fix(build): resolve glob patterns from pageDir and substitute layoutParams

  - Fix patternBaseDir to use pageDir instead of routesDir for glob pattern resolution in data sources
  - Add layoutParams substitution during layout processing to resolve param expressions
  - Fixes dynamic route generation for docs/ and reference/ pages

## 1.2.7

### Patch Changes

- Updated dependencies
  - @constela/server@3.0.1
  - @constela/runtime@0.10.1

## 1.2.6

### Patch Changes

- fix(build): support Expression in getStaticPaths.source

  Allow `getStaticPaths.source` to be an Expression (e.g., `{ expr: "import", name: "examples", path: "examples" }`) in addition to a string reference to a data source name.

## 1.2.5

### Patch Changes

- fix(build): add conditions: ['style'] to esbuild for Tailwind CSS v4 support

## 1.2.4

### Patch Changes

- fix(build): process inline getStaticPaths and bundle CSS

  - Fix JSON pages with inline `getStaticPaths` not being processed during build
  - Add `bundleCSS()` function to bundle CSS files with esbuild
  - Add `routesDir` option to `JsonPageLoader` for consistent glob pattern resolution
  - Generate `<link rel="stylesheet">` tag in HTML output when CSS is provided

## 1.2.3

### Patch Changes

- fix(build): add default publicDir value to match dev server behavior

## 1.2.2

### Patch Changes

- fix(start): use projectRoot for path traversal check in build
  fix(start): unify DEFAULT_ROUTES_DIR to src/routes
  fix(cli): use config-loader to pass routesDir/publicDir/layoutsDir to build() and createDevServer()

## 1.2.1

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.10.1
  - @constela/router@8.0.0

## 1.2.0

### Minor Changes

- feat(start): add production runtime bundling with esbuild

  - Bundle @constela/runtime for production builds instead of relying on importmap
  - Add runtimePath option to wrapHtml() with injection validation
  - Implement \_\_pathData injection in generateStaticPages for SSG
  - Skip bundling when no pages to generate

  feat(runtime): add safe globals and method binding to expression evaluator

  - Add safeGlobals (JSON, Math, Date, Object, Array, String, Number, Boolean, console)
  - Bind methods to their parent object to preserve 'this' context

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.10.0
  - @constela/router@8.0.0

## 1.1.0

### Minor Changes

- feat: Add MDX component param substitution for PropsTable/Callout with kind:each and expr:param support

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.0
  - @constela/router@7.0.0
  - @constela/runtime@0.9.2
  - @constela/server@3.0.0

## 1.0.0

### Major Changes

- Add ComponentsRef type and components field to DataSource for MDX component support. Add complete MDX DSL integration with breaking change to transformMdx signature

### Patch Changes

- Updated dependencies
  - @constela/core@0.7.0
  - @constela/compiler@0.6.1
  - @constela/runtime@0.9.1
  - @constela/router@6.0.0
  - @constela/server@2.0.0

## 0.4.1

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.6.0
  - @constela/core@0.6.0
  - @constela/runtime@0.9.0
  - @constela/router@6.0.0
  - @constela/server@2.0.0

## 0.4.0

### Minor Changes

- @constela/core (minor)

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.5.0
  - @constela/core@0.5.0
  - @constela/runtime@0.8.0
  - @constela/server@1.0.0
  - @constela/router@5.0.0

## 0.3.1

### Patch Changes

- Fix CLI handlers to actually start dev server and run build

## 0.3.0

### Minor Changes

- Add static file serving from public/ directory

## 0.2.0

### Minor Changes

- Add client-side features for official site migration

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.7.0
  - @constela/router@4.0.0

## 0.1.2

### Patch Changes

- feat: add SSR infrastructure
- Updated dependencies
  - @constela/runtime@0.6.0
  - @constela/router@3.0.0
  - @constela/server@0.1.2

## 0.1.1

### Patch Changes

- feat: add SSR infrastructure
- Updated dependencies
  - @constela/runtime@0.5.0
  - @constela/server@0.1.1
  - @constela/router@2.0.0
