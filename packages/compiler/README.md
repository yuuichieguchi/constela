# @constela/compiler

Compiler for the Constela UI framework - transforms AST to optimized runtime programs.

## Installation

```bash
npm install @constela/compiler
```

## Overview

This package transforms validated Constela AST into optimized `CompiledProgram` structures for runtime execution. It implements a three-pass compiler pipeline:

1. **Validate Pass** - Schema and syntax validation
2. **Analyze Pass** - Semantic analysis and context collection
3. **Transform Pass** - AST-to-Program transformation

## API Reference

### compile

Main compilation function that orchestrates the entire pipeline.

```typescript
import { compile } from '@constela/compiler';

const result = compile(input);

if (result.ok) {
  // Success
  console.log(result.program);
} else {
  // Failure - array of errors
  console.error(result.errors);
}
```

**Parameters:**
- `input: unknown` - Raw program input (typically parsed JSON)

**Returns:** `CompileResult`
- Success: `{ ok: true, program: CompiledProgram }`
- Failure: `{ ok: false, errors: ConstelaError[] }`

### Individual Passes

#### validatePass

```typescript
import { validatePass } from '@constela/compiler';

const result = validatePass(input);
if (result.ok) {
  // result.program is a validated Program
}
```

#### analyzePass

```typescript
import { analyzePass } from '@constela/compiler';

const result = analyzePass(validatedProgram);
if (result.ok) {
  // result.context contains analysis results
  console.log(result.context.stateNames);
  console.log(result.context.actionNames);
}
```

**AnalysisContext:**
- `stateNames: Set<string>` - State field identifiers
- `actionNames: Set<string>` - Action names
- `componentNames: Set<string>` - Component identifiers
- `routeParams: Set<string>` - Route parameter names
- `importNames: Set<string>` - External import names
- `dataNames: Set<string>` - Data source names
- `refNames: Set<string>` - DOM element reference names

#### transformPass

```typescript
import { transformPass } from '@constela/compiler';

const compiledProgram = transformPass(program, analysisContext);
```

## Layout Compilation

Layouts have a separate compilation path with additional validation.

### analyzeLayoutPass

```typescript
import { analyzeLayoutPass } from '@constela/compiler';

const result = analyzeLayoutPass(layoutProgram);
if (result.ok) {
  // result.context contains layout-specific analysis
}
```

**Layout Validations:**
- At least one slot exists
- No duplicate named slots
- No duplicate default slots
- Slots not inside loops

### transformLayoutPass

```typescript
import { transformLayoutPass } from '@constela/compiler';

const compiledLayout = transformLayoutPass(layoutProgram, layoutContext);
```

### composeLayoutWithPage

Composes a compiled layout with a page program.

```typescript
import { composeLayoutWithPage } from '@constela/compiler';

const composedProgram = composeLayoutWithPage(compiledLayout, compiledPage);
```

**Composition Process:**
- Merges state from both layout and page
- Merges actions from both
- Replaces slot nodes with page content
- Named slots match by name

## CompiledProgram Structure

```typescript
interface CompiledProgram {
  version: '1.0';
  route?: {
    path: string;
    params: string[];
    title?: CompiledExpression;
    layout?: string;
    layoutParams?: Record<string, CompiledExpression>;
    meta?: Record<string, CompiledExpression>;
  };
  lifecycle?: {
    onMount?: string;
    onUnmount?: string;
    onRouteEnter?: string;
    onRouteLeave?: string;
  };
  state: Record<string, {
    type: 'number' | 'string' | 'list' | 'boolean' | 'object';
    initial: unknown;
  }>;
  actions: Record<string, CompiledAction>;
  view: CompiledNode;
  importData?: Record<string, unknown>;
}
```

## Compiled Types

### CompiledExpression (13 types)

All expression types are preserved with optimizations:

```typescript
type CompiledExpression =
  | CompiledLitExpr
  | CompiledStateExpr
  | CompiledVarExpr
  | CompiledBinExpr
  | CompiledNotExpr
  | CompiledCondExpr
  | CompiledGetExpr
  | CompiledRouteExpr
  | CompiledImportExpr
  | CompiledDataExpr
  | CompiledRefExpr
  | CompiledIndexExpr
  | CompiledParamExpr;
```

### CompiledNode (7 types)

```typescript
type CompiledNode =
  | CompiledElementNode
  | CompiledTextNode
  | CompiledIfNode
  | CompiledEachNode
  | CompiledMarkdownNode
  | CompiledCodeNode
  | CompiledSlotNode;
```

### CompiledAction

```typescript
interface CompiledAction {
  name: string;
  params?: Record<string, { type: string }>;
  steps: CompiledStep[];
}
```

### CompiledStep (12 types)

```typescript
type CompiledStep =
  | CompiledSetStep
  | CompiledUpdateStep
  | CompiledFetchStep
  | CompiledStorageStep
  | CompiledClipboardStep
  | CompiledNavigateStep
  | CompiledImportStep
  | CompiledCallStep
  | CompiledSubscribeStep
  | CompiledDisposeStep
  | CompiledDomStep
  | CompiledIfStep;
```

## Error Handling

The compiler collects multiple errors during the analyze pass:

```typescript
const result = compile(input);

if (!result.ok) {
  for (const error of result.errors) {
    console.log(`[${error.code}] ${error.message}`);
    console.log(`  at ${error.path}`);
  }
}
```

Errors include JSON Pointer paths for precise location reporting.

## Example

```typescript
import { compile } from '@constela/compiler';

const program = {
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 }
  },
  actions: [
    {
      name: 'increment',
      steps: [{ do: 'update', target: 'count', operation: 'increment' }]
    }
  ],
  view: {
    kind: 'element',
    tag: 'button',
    props: { onClick: { event: 'click', action: 'increment' } },
    children: [{ kind: 'text', value: { expr: 'state', name: 'count' } }]
  }
};

const result = compile(program);

if (result.ok) {
  // result.program is ready for runtime
  console.log(result.program.actions.increment);
}
```

## License

MIT
