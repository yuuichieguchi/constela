# @constela/start

## 1.9.4

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.4
  - @constela/compiler@0.15.4
  - @constela/ai@2.0.4
  - @constela/runtime@1.0.4
  - @constela/server@13.0.0
  - @constela/router@19.0.0

## 1.9.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.3
  - @constela/ai@2.0.3
  - @constela/compiler@0.15.3
  - @constela/runtime@1.0.3
  - @constela/server@13.0.0
  - @constela/router@19.0.0

## 1.9.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.2
  - @constela/ai@2.0.2
  - @constela/compiler@0.15.2
  - @constela/runtime@1.0.2
  - @constela/server@13.0.0
  - @constela/router@19.0.0

## 1.9.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.1
  - @constela/ai@2.0.1
  - @constela/compiler@0.15.1
  - @constela/runtime@1.0.1
  - @constela/server@13.0.0
  - @constela/router@19.0.0

## 1.9.0

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
  - @constela/runtime@1.0.0
  - @constela/compiler@0.15.0
  - @constela/server@13.0.0
  - @constela/ai@2.0.0
  - @constela/router@19.0.0

## 1.8.27

### Patch Changes

- fix: resolve type error and flaky tests for release build

  - bundler.ts: Use conditional spread for optional strategyOptions property
  - code.test.ts: Replace setTimeout with vi.waitFor for stable shiki initialization

- Updated dependencies
  - @constela/runtime@0.19.7
  - @constela/router@18.0.1

## 1.8.26

### Patch Changes

- chore: version bump for npm release
- Updated dependencies
  - @constela/runtime@0.19.6
  - @constela/core@0.16.2
  - @constela/compiler@0.14.7
  - @constela/server@12.0.2
  - @constela/router@18.0.1
  - @constela/ai@1.0.2

## 1.8.25

### Patch Changes

- fix(runtime): prevent double rendering in HMR by adding skipInitialRender option
- Updated dependencies
  - @constela/runtime@0.19.5
  - @constela/core@0.16.1
  - @constela/compiler@0.14.6
  - @constela/server@12.0.1
  - @constela/ai@1.0.1
  - @constela/router@18.0.0

## 1.8.24

### Patch Changes

- Updated dependencies [afd1084]
  - @constela/runtime@0.19.4
  - @constela/router@18.0.0

## 1.8.23

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
  - @constela/runtime@0.19.3
  - @constela/server@12.0.0
  - @constela/router@18.0.0

## 1.8.22

### Patch Changes

- Fix HMR client connection in generated hydration script

  - Add `hmrUrl` parameter to `generateHydrationScript` function
  - When `hmrUrl` is provided, generate code that sets up HMR client, handler, and error overlay
  - Remove redundant `window.__CONSTELA_HMR_URL__` script injection

## 1.8.21

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.14.4
  - @constela/router@18.0.0
  - @constela/runtime@0.19.2
  - @constela/server@11.0.1

## 1.8.20

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.14.3
  - @constela/router@18.0.0
  - @constela/runtime@0.19.1
  - @constela/server@11.0.1

## 1.8.19

### Patch Changes

- Fix localState/localActions being ignored when expanding components in json-page-loader

## 1.8.18

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.19.0
  - @constela/router@18.0.0

## 1.8.17

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.18.3
  - @constela/router@17.0.0

## 1.8.16

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.2
  - @constela/compiler@0.14.2
  - @constela/runtime@0.18.2
  - @constela/server@11.0.1
  - @constela/router@17.0.0

## 1.8.15

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.1
  - @constela/compiler@0.14.1
  - @constela/runtime@0.18.1
  - @constela/server@11.0.1
  - @constela/router@17.0.0

## 1.8.14

### Patch Changes

- fix: add ArrayExpr support for SSR

  Added `case 'array'` handling to server-side expression evaluation to support the new ArrayExpr type.

- Updated dependencies
  - @constela/server@11.0.1
  - @constela/runtime@0.18.0

## 1.8.13

### Patch Changes

- Updated dependencies
  - @constela/core@0.15.0
  - @constela/compiler@0.14.0
  - @constela/runtime@0.18.0
  - @constela/server@11.0.0
  - @constela/router@17.0.0

## 1.8.12

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.17.1
  - @constela/router@16.0.0

## 1.8.11

### Patch Changes

- Updated dependencies
  - @constela/server@10.0.1
  - @constela/runtime@0.17.0

## 1.8.10

### Patch Changes

- Updated dependencies
  - @constela/core@0.14.0
  - @constela/compiler@0.13.0
  - @constela/runtime@0.17.0
  - @constela/server@10.0.0
  - @constela/router@16.0.0

## 1.8.9

### Patch Changes

- Unify DSL file extension to `.constela.json`

  - Rename template files from `.json` to `.constela.json`
  - Update file-router.ts and build/index.ts to support `.constela.json` extension
  - Maintain backward compatibility with `.json` files

## 1.8.8

### Patch Changes

- revert: remove hmr: false from Vite config

## 1.8.7

### Patch Changes

- fix(dev): disable Vite HMR to prevent WebSocket connection errors

## 1.8.6

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.16.6
  - @constela/router@15.0.0

## 1.8.5

### Patch Changes

- fix(start): dev server now correctly binds matched MDX item for data expressions

## 1.8.4

### Patch Changes

- fix(start): slug generation now correctly strips glob base path

## 1.8.3

### Patch Changes

- fix(start): non-index.mdx files now preserve directory path in slug

## 1.8.2

### Patch Changes

- fix(start): nested index.mdx now uses parent directory name as slug

## 1.8.1

### Patch Changes

- fix: dynamic route canonical URL now correctly uses resolved path

  - Pass actual route path to generateMetaTags instead of hardcoded '/'
  - Dynamic routes like /examples/:slug now generate correct canonical URLs
  - { expr: 'route', source: 'path' } now evaluates to /examples/counter instead of /

## 1.8.0

### Minor Changes

- fix: SEO features (seo.lang, canonical, jsonLd) now properly reflected in build output

  - Load constela.config.json and pass seo.lang to wrapHtml during build
  - Copy title, canonical, jsonLd from route definition to compiled program
  - Add seo option to BuildOptions and DevServerOptions

  feat: Extended BCP 47 language tag support

  - Support extended language subtags (zh-cmn-Hans)
  - Support variant subtags (sl-rozaj-biske)
  - Support extension subtags (de-DE-u-co-phonebk)
  - Support grandfathered tags (i-klingon)

  feat: JSON-LD nested object/array support

  - Support expr: 'object' with optional @type
  - Support expr: 'array' for itemListElement etc.
  - Recursive evaluation for complex structures like BreadcrumbList

  fix: Flaky watcher test

  - Add delay after watcher creation to prevent race condition

## 1.7.0

### Minor Changes

- feat: add SEO features (lang attribute, canonical URL, JSON-LD)

  - Add `seo.lang` config option to output `<html lang="...">` attribute
  - Add `canonical` expression to RouteDefinition for `<link rel="canonical">` generation
  - Add `jsonLd` structured data to RouteDefinition for `<script type="application/ld+json">` generation
  - Include XSS protection for all SEO features (BCP 47 validation for lang, HTML escaping for canonical and JSON-LD)

### Patch Changes

- Updated dependencies
  - @constela/core@0.13.0
  - @constela/compiler@0.12.0
  - @constela/runtime@0.16.5
  - @constela/server@9.0.0
  - @constela/router@15.0.0

## 1.6.4

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.11.4
  - @constela/core@0.12.3
  - @constela/router@14.0.0
  - @constela/runtime@0.16.4
  - @constela/server@8.0.1

## 1.6.3

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.16.3
  - @constela/router@14.0.0

## 1.6.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.2
  - @constela/compiler@0.11.3
  - @constela/runtime@0.16.2
  - @constela/server@8.0.1
  - @constela/router@14.0.0

## 1.6.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.12.1
  - @constela/compiler@0.11.2
  - @constela/runtime@0.16.1
  - @constela/server@8.0.1
  - @constela/router@14.0.0

## 1.6.0

### Minor Changes

- Add HMR (Hot Module Replacement) support for JSON DSL files

  - WebSocket HMR server and file watcher for development
  - State serialize/restore methods for preserving state during updates
  - HMR client with auto-reconnect and error overlay
  - `initClientWithHMR()` function for client-side HMR setup

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.16.0
  - @constela/router@14.0.0

## 1.5.5

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.15.2
  - @constela/server@8.0.1
  - @constela/router@13.0.0

## 1.5.4

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.15.1
  - @constela/router@13.0.0

## 1.5.3

### Patch Changes

- fix: handle cookie expression in SSG build theme detection

  ssg.ts and index.ts now properly handle cookie expressions in theme state, extracting the default value for SSG builds instead of treating the expression object as a string.

## 1.5.2

### Patch Changes

- fix: anti-flash script checks cookie before localStorage for SSG/SSR theme sync

  The anti-flash script now checks cookie first for theme value, then falls back to localStorage. This fixes theme flashing on SSG-built pages when user has a different theme saved in cookie.

## 1.5.1

### Patch Changes

- fix: handle cookie expression in theme state for wrapHtml

  When theme state uses cookie expression, the initialTheme detection for wrapHtml was not handling the expression object correctly. Now uses isCookieInitialExpr to detect and evaluate cookie expressions.

## 1.5.0

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
  - @constela/runtime@0.15.0
  - @constela/server@8.0.0
  - @constela/compiler@0.11.1
  - @constela/router@13.0.0

## 1.4.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.11.0
  - @constela/compiler@0.11.0
  - @constela/runtime@0.14.0
  - @constela/router@12.0.0
  - @constela/server@7.0.0

## 1.4.2

### Patch Changes

- fix: integrate generateMetaTags in main SSG build process

## 1.4.1

### Patch Changes

- fix: export generateMetaTags and MetaContext from package, fix exactOptionalPropertyTypes type error in JsonPageLoader

## 1.4.0

### Minor Changes

- feat: add OGP meta tag generation from route.meta and route.title

  - Add `evaluateMetaExpression()` function to evaluate compiled expressions for meta tag values
  - Add `generateMetaTags()` function to generate HTML meta tags from route definition
  - Support `<title>` tag generation from `route.title`
  - Support `<meta name="...">` for standard meta tags (description, author, etc.)
  - Support `<meta property="...">` for OGP/Twitter meta tags (og:_, twitter:_)
  - Integrate meta tag generation in dev server and SSG build
  - Include HTML escaping for XSS prevention

## 1.3.5

### Patch Changes

- Updated dependencies
  - @constela/core@0.10.0
  - @constela/compiler@0.10.0
  - @constela/runtime@0.13.0
  - @constela/server@6.0.0
  - @constela/router@11.0.0

## 1.3.4

### Patch Changes

- fix(mdx): throw error instead of returning null for disallowed patterns in safeEvalLiteral

  - Add extractCodeOutsideStrings to check only actual code (not string literals)
  - Allow "dangerous" words inside string literals (e.g., "operations that require one")
  - Throw informative error for actual dangerous code patterns

## 1.3.3

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.12.2
  - @constela/router@10.0.0

## 1.3.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.9.1
  - @constela/compiler@0.9.1
  - @constela/runtime@0.12.1
  - @constela/server@5.0.1
  - @constela/router@10.0.0

## 1.3.1

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.12.0
  - @constela/core@0.9.0
  - @constela/compiler@0.9.0
  - @constela/router@10.0.0
  - @constela/server@5.0.0

## 1.3.0

### Minor Changes

- feat(cli): add terminal URL hyperlink support with OSC 8 escape sequences

  - Add `hyperlink` function to generate clickable URLs in supported terminals
  - Update dev/start server output format with startup time display
  - Respect `NO_COLOR` environment variable for CI/CD compatibility

## 1.2.29

### Patch Changes

- c4301c2: Fix theme state initialization to read from localStorage in runtime instead of post-hydration sync in start
- Updated dependencies [c4301c2]
  - @constela/runtime@0.11.1
  - @constela/router@9.0.0

## 1.2.28

### Patch Changes

- Sync theme state from localStorage on client initialization to fix state/DOM mismatch after page reload

## 1.2.27

### Patch Changes

- Fix theme persistence in dev server and edge adapter by passing themeStorageKey option to wrapHtml

## 1.2.26

### Patch Changes

- Fix theme persistence bug by parsing JSON-serialized localStorage values in anti-flash script

## 1.2.25

### Patch Changes

- Updated dependencies
  - @constela/server@4.1.0
  - @constela/runtime@0.11.0

## 1.2.24

### Patch Changes

- Updated dependencies
  - @constela/core@0.8.0
  - @constela/compiler@0.8.0
  - @constela/runtime@0.11.0
  - @constela/server@4.0.0
  - @constela/router@9.0.0

## 1.2.23

### Patch Changes

- fix(start): pass widgets to generateHydrationScript in SSG build

## 1.2.22

### Patch Changes

- Updated dependencies
  - @constela/runtime@0.10.3
  - @constela/router@8.0.0

## 1.2.21

### Patch Changes

- fix(start): dynamically resolve query params and path from window.location in hydration script

  SSG builds now correctly handle query parameters by extracting them from `window.location.search` at runtime instead of embedding static values during build. This fixes the Try in Playground feature where example code was not being loaded when navigating with query parameters.

## 1.2.20

### Patch Changes

- Fix Examples page and Playground theme issues

  - Only bind pathEntry.data for string sources in getStaticPaths (fixes Examples page)
  - Add themeStorageKey and defaultTheme options to wrapHtml()
  - Inject blocking script to prevent theme flash on page load

## 1.2.19

### Patch Changes

- fix(build): generate parent directory index.html for slug='index' routes

  fix(build): add externalImports field for SSG dynamic imports

## 1.2.18

### Patch Changes

- fix(start): merge layout state/actions/lifecycle and bind dynamic route data in SSG build

  - Merge state, actions, and lifecycle from layouts into pages during SSG build
  - Bind pathEntry.data to loadedData for dynamic routes, enabling expr:data expressions
  - Replace named slots (mdx-content) in final view after layout application
  - Fix onClick handlers not working in SSG builds
  - Fix MDX content not rendering in docs pages

## 1.2.17

### Patch Changes

- fix(start): preserve event handlers in SSG build and add MDX slot support

  - Fix onClick event handlers being serialized as `[object Object]` in SSG build output
  - Add `isEventHandler()` helper to detect `{ event, action }` format in `normalizeProps()`
  - Add `extractMdxContentSlot()` function for MDX content slot extraction
  - Modify `replaceSlot()` to handle named slots (e.g., `mdx-content`)
  - Update `processLayouts()` to pass route params and extract MDX slots

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
