# @constela/cli

## 0.5.6

### Patch Changes

- Updated dependencies
  - @constela/start@1.4.0

## 0.5.5

### Patch Changes

- Updated dependencies
  - @constela/core@0.10.0
  - @constela/compiler@0.10.0
  - @constela/start@1.3.5

## 0.5.4

### Patch Changes

- Updated dependencies
  - @constela/start@1.3.4

## 0.5.3

### Patch Changes

- @constela/start@1.3.3

## 0.5.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.9.1
  - @constela/compiler@0.9.1
  - @constela/start@1.3.2

## 0.5.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.9.0
  - @constela/compiler@0.9.0
  - @constela/start@1.3.1

## 0.5.0

### Minor Changes

- feat(cli): add terminal URL hyperlink support with OSC 8 escape sequences

  - Add `hyperlink` function to generate clickable URLs in supported terminals
  - Update dev/start server output format with startup time display
  - Respect `NO_COLOR` environment variable for CI/CD compatibility

### Patch Changes

- Updated dependencies
  - @constela/start@1.3.0

## 0.4.5

### Patch Changes

- Updated dependencies [c4301c2]
  - @constela/start@1.2.29

## 0.4.4

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.28

## 0.4.3

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.27

## 0.4.2

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.26

## 0.4.1

### Patch Changes

- @constela/start@1.2.25

## 0.4.0

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
  - @constela/start@1.2.24

## 0.3.30

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.23

## 0.3.29

### Patch Changes

- @constela/start@1.2.22

## 0.3.28

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.21

## 0.3.27

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.20

## 0.3.26

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.19

## 0.3.25

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.18

## 0.3.24

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.17

## 0.3.23

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.16

## 0.3.22

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.1
  - @constela/start@1.2.15

## 0.3.21

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.14

## 0.3.20

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.13

## 0.3.19

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.12

## 0.3.18

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.11

## 0.3.17

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.10

## 0.3.16

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.9

## 0.3.15

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.8

## 0.3.14

### Patch Changes

- @constela/start@1.2.7

## 0.3.13

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.6

## 0.3.12

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.5

## 0.3.11

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.4

## 0.3.10

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.3

## 0.3.9

### Patch Changes

- fix(start): use projectRoot for path traversal check in build
  fix(start): unify DEFAULT_ROUTES_DIR to src/routes
  fix(cli): use config-loader to pass routesDir/publicDir/layoutsDir to build() and createDevServer()
- Updated dependencies
  - @constela/start@1.2.2

## 0.3.8

### Patch Changes

- @constela/start@1.2.1

## 0.3.7

### Patch Changes

- Updated dependencies
  - @constela/start@1.2.0

## 0.3.6

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.7.0
  - @constela/start@1.1.0

## 0.3.5

### Patch Changes

- Updated dependencies
  - @constela/start@1.0.0
  - @constela/core@0.7.0
  - @constela/compiler@0.6.1

## 0.3.4

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.6.0
  - @constela/core@0.6.0
  - @constela/start@0.4.1

## 0.3.3

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.5.0
  - @constela/core@0.5.0
  - @constela/start@0.4.0

## 0.3.2

### Patch Changes

- Updated dependencies
  - @constela/start@0.3.1

## 0.3.1

### Patch Changes

- Updated dependencies
  - @constela/start@0.3.0

## 0.3.0

### Minor Changes

- Add dev, build, start commands for unified CLI experience

## 0.2.4

### Patch Changes

- Updated dependencies
  - @constela/compiler@0.4.0
  - @constela/core@0.4.0

## 0.2.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.3.3
  - @constela/compiler@0.3.3

## 0.2.2

### Patch Changes

- Updated dependencies [3849d2b]
  - @constela/core@0.3.2
  - @constela/compiler@0.3.2
