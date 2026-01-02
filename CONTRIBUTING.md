# Contributing to Constela

Thank you for your interest in contributing to Constela!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/constela.git
cd constela

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
constela/
├── packages/
│   ├── core/           # Types, schema, validator
│   ├── compiler/       # AST → CompiledProgram
│   ├── runtime/        # DOM renderer
│   └── cli/            # Command-line tools
├── examples/           # Example applications
└── docs/               # Documentation (future)
```

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/core && pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Building

```bash
# Build all packages
pnpm build

# Build a specific package
cd packages/core && pnpm build
```

### Type Checking

```bash
# Check all packages
pnpm type-check

# Check a specific package
cd packages/core && pnpm type-check
```

## Code Style

- TypeScript with strict mode
- ESM modules
- No default exports (prefer named exports)
- Use `readonly` for immutable data
- Use discriminated unions for AST types

## Testing Guidelines

- Write tests before implementation (TDD)
- Test files are located alongside source files or in `tests/` directory
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies (fetch, file system)

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Run type check (`pnpm type-check`)
6. Commit your changes
7. Push to your fork
8. Create a Pull Request

## Commit Messages

Use conventional commit format:

```
feat: add new expression type
fix: handle division by zero
docs: update README examples
test: add validator edge cases
refactor: simplify compiler pipeline
```

## Architecture Overview

### Compilation Pipeline

```
Input JSON → validatePass → analyzePass → transformPass → CompiledProgram
```

1. **validatePass**: JSON Schema validation
2. **analyzePass**: Semantic analysis (state/action references)
3. **transformPass**: AST → runtime-optimized format

### Runtime Architecture

- **Signals**: Fine-grained reactivity primitives
- **Effects**: Automatic dependency tracking
- **Renderer**: Direct DOM manipulation (no virtual DOM)

### Error Handling

All errors must include:
- `code`: Error type identifier
- `message`: Human-readable description
- `path`: JSON Pointer to error location

## Questions?

Open an issue for questions or discussions.
