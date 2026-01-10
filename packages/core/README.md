# @constela/core

Core types, schema validation, and error handling for the Constela UI framework.

## Installation

```bash
npm install @constela/core
```

## Overview

This package provides the foundational AST (Abstract Syntax Tree) types and validation infrastructure for Constela programs. It defines:

- **AST Type Definitions** - All expression, node, step, and state types
- **Type Guards** - Runtime type checking functions
- **Error Types** - Structured error handling with error codes
- **Validation** - Schema-based AST validation

## API Reference

### validateAst

Validates raw input against the Constela AST schema.

```typescript
import { validateAst } from '@constela/core';

const result = validateAst(input);
if (result.ok) {
  console.log('Valid program:', result.program);
} else {
  console.error('Validation failed:', result.error);
}
```

**Returns:** `ValidationResult`
- Success: `{ ok: true, program: Program }`
- Failure: `{ ok: false, error: ConstelaError }`

## Type Definitions

### Expression Types (12 kinds)

| Type | Description | Example |
|------|-------------|---------|
| `LitExpr` | Literal values | `{ expr: "lit", value: "Hello" }` |
| `StateExpr` | State field reference | `{ expr: "state", name: "count" }` |
| `VarExpr` | Loop/event variable | `{ expr: "var", name: "item" }` |
| `BinExpr` | Binary operation | `{ expr: "bin", op: "+", left: ..., right: ... }` |
| `NotExpr` | Logical negation | `{ expr: "not", operand: ... }` |
| `ParamExpr` | Component parameter | `{ expr: "param", name: "title" }` |
| `CondExpr` | Conditional | `{ expr: "cond", if: ..., then: ..., else: ... }` |
| `GetExpr` | Property access | `{ expr: "get", base: ..., path: "user.name" }` |
| `RouteExpr` | Route parameter | `{ expr: "route", name: "id", source: "param" }` |
| `ImportExpr` | External data | `{ expr: "import", name: "config" }` |
| `DataExpr` | Build-time data | `{ expr: "data", name: "posts" }` |
| `RefExpr` | DOM element ref | `{ expr: "ref", name: "inputEl" }` |

**Binary Operators:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`

### State Field Types (5 kinds)

| Type | Description |
|------|-------------|
| `NumberField` | `{ type: "number", initial: 0 }` |
| `StringField` | `{ type: "string", initial: "" }` |
| `ListField` | `{ type: "list", initial: [] }` |
| `BooleanField` | `{ type: "boolean", initial: false }` |
| `ObjectField` | `{ type: "object", initial: {} }` |

### View Node Types (8 kinds)

| Type | Description |
|------|-------------|
| `ElementNode` | HTML elements with props and events |
| `TextNode` | Text content with expressions |
| `IfNode` | Conditional rendering |
| `EachNode` | List rendering |
| `ComponentNode` | Component invocation |
| `SlotNode` | Layout slot placeholder |
| `MarkdownNode` | Markdown content |
| `CodeNode` | Syntax-highlighted code |

### Action Step Types (11 kinds)

| Type | Description |
|------|-------------|
| `SetStep` | Set state value |
| `UpdateStep` | Update with operation (increment, push, etc.) |
| `FetchStep` | HTTP requests |
| `StorageStep` | localStorage/sessionStorage |
| `ClipboardStep` | Clipboard operations |
| `NavigateStep` | Page navigation |
| `ImportStep` | Dynamic module import |
| `CallStep` | External function call |
| `SubscribeStep` | Event subscription |
| `DisposeStep` | Resource disposal |
| `DomStep` | DOM manipulation |

**Update Operations:**
- Number: `increment`, `decrement`
- List: `push`, `pop`, `remove`, `replaceAt`, `insertAt`, `splice`
- Boolean: `toggle`
- Object: `merge`

### Lifecycle Hooks

```typescript
interface LifecycleHooks {
  onMount?: string;      // Action name
  onUnmount?: string;    // Action name
  onRouteEnter?: string; // Action name
  onRouteLeave?: string; // Action name
}
```

## Type Guards

47 type guard functions for runtime type checking:

```typescript
import {
  // Expressions
  isLitExpr,
  isStateExpr,
  isVarExpr,
  isBinExpr,
  isNotExpr,
  isParamExpr,
  isCondExpr,
  isGetExpr,
  isRouteExpr,
  isImportExpr,
  isDataExpr,
  isRefExpr,

  // View nodes
  isElementNode,
  isTextNode,
  isIfNode,
  isEachNode,
  isComponentNode,
  isSlotNode,
  isMarkdownNode,
  isCodeNode,
  isNamedSlotNode,

  // Action steps
  isSetStep,
  isUpdateStep,
  isFetchStep,
  isStorageStep,
  isClipboardStep,
  isNavigateStep,
  isImportStep,
  isCallStep,
  isSubscribeStep,
  isDisposeStep,
  isDomStep,

  // State fields
  isNumberField,
  isStringField,
  isListField,
  isBooleanField,
  isObjectField,

  // Others
  isEventHandler,
  isDataSource,
  isLayoutProgram,
} from '@constela/core';
```

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `SCHEMA_INVALID` | JSON Schema validation error |
| `UNSUPPORTED_VERSION` | Unsupported version string |
| `UNDEFINED_STATE` | Reference to undefined state |
| `UNDEFINED_ACTION` | Reference to undefined action |
| `DUPLICATE_ACTION` | Duplicate action name |
| `VAR_UNDEFINED` | Undefined variable reference |
| `COMPONENT_NOT_FOUND` | Undefined component |
| `COMPONENT_PROP_MISSING` | Missing required prop |
| `COMPONENT_CYCLE` | Circular component reference |
| `COMPONENT_PROP_TYPE` | Prop type mismatch |
| `PARAM_UNDEFINED` | Undefined parameter |
| `OPERATION_INVALID_FOR_TYPE` | Invalid operation for state type |
| `OPERATION_MISSING_FIELD` | Missing required field for operation |
| `OPERATION_UNKNOWN` | Unknown operation |
| `ROUTE_NOT_DEFINED` | Route not defined |
| `UNDEFINED_ROUTE_PARAM` | Undefined route parameter |
| `LAYOUT_MISSING_SLOT` | Layout missing slot node |
| `LAYOUT_NOT_FOUND` | Referenced layout not found |
| `INVALID_SLOT_NAME` | Invalid slot name |
| `DUPLICATE_SLOT_NAME` | Duplicate slot name |
| `DUPLICATE_DEFAULT_SLOT` | Multiple default slots |
| `SLOT_IN_LOOP` | Slot inside loop |
| `INVALID_DATA_SOURCE` | Invalid data source |
| `UNDEFINED_DATA_SOURCE` | Undefined data source |
| `DATA_NOT_DEFINED` | Data field not defined |
| `UNDEFINED_DATA` | Undefined data reference |
| `UNDEFINED_REF` | Undefined element ref |
| `INVALID_STORAGE_OPERATION` | Invalid storage operation |
| `INVALID_STORAGE_TYPE` | Invalid storage type |
| `STORAGE_SET_MISSING_VALUE` | Storage set missing value |
| `INVALID_CLIPBOARD_OPERATION` | Invalid clipboard operation |
| `CLIPBOARD_WRITE_MISSING_VALUE` | Clipboard write missing value |
| `INVALID_NAVIGATE_TARGET` | Invalid navigate target |

### ConstelaError

```typescript
import { ConstelaError } from '@constela/core';

const error = new ConstelaError(
  'UNDEFINED_STATE',
  'State "count" is not defined',
  '/view/children/0/props/onClick'
);

console.log(error.code);    // 'UNDEFINED_STATE'
console.log(error.message); // 'State "count" is not defined'
console.log(error.path);    // '/view/children/0/props/onClick'
console.log(error.toJSON()); // { code, message, path }
```

## Program Structure

```typescript
interface Program {
  version: '1.0';
  route?: RouteDefinition;
  imports?: Record<string, string>;
  data?: Record<string, DataSource>;
  lifecycle?: LifecycleHooks;
  state: Record<string, StateField>;
  actions: Action[];
  view: ViewNode;
  components?: Record<string, ComponentDefinition>;
}
```

## License

MIT
