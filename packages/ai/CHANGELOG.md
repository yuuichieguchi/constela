# @constela/ai

## 2.0.0

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.0

## 1.0.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.2

## 1.0.1

### Patch Changes

- fix(runtime): prevent double rendering in HMR by adding skipInitialRender option
- Updated dependencies
  - @constela/core@0.16.1

## 1.0.0

### Minor Changes

- feat(ai): add AI provider abstraction layer

  - New @constela/ai package with Anthropic and OpenAI providers
  - Security layer for DSL validation (forbidden tags, actions, URL validation)
  - DSL generator with prompt builders for component, view, and suggestion generation
  - AiDataSource and GenerateStep types added to @constela/core
  - Build-time AI data loading in @constela/start
  - Compiler transformation and runtime execution for GenerateStep
  - CLI suggest command for AI-powered DSL analysis

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.0
