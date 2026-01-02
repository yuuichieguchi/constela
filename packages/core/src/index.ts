/**
 * @constela/core - Core types, schema, and validator for Constela UI framework
 *
 * This is the main entry point for the package, re-exporting all public APIs.
 */

// ==================== AST Types ====================
export type {
  // Constants
  BinaryOperator,
  UpdateOperation,
  HttpMethod,
  // Expressions
  Expression,
  LitExpr,
  StateExpr,
  VarExpr,
  BinExpr,
  NotExpr,
  // State Fields
  StateField,
  NumberField,
  StringField,
  ListField,
  // Action Steps
  ActionStep,
  SetStep,
  UpdateStep,
  FetchStep,
  // Event Handler
  EventHandler,
  // Action Definition
  ActionDefinition,
  // View Nodes
  ViewNode,
  ElementNode,
  TextNode,
  IfNode,
  EachNode,
  // Program
  Program,
  ConstelaAst,
} from './types/ast.js';

export {
  BINARY_OPERATORS,
  UPDATE_OPERATIONS,
  HTTP_METHODS,
} from './types/ast.js';

// ==================== Type Guards ====================
export {
  // Expression type guards
  isLitExpr,
  isStateExpr,
  isVarExpr,
  isBinExpr,
  isNotExpr,
  isExpression,
  // ViewNode type guards
  isElementNode,
  isTextNode,
  isIfNode,
  isEachNode,
  isViewNode,
  // ActionStep type guards
  isSetStep,
  isUpdateStep,
  isFetchStep,
  isActionStep,
  // StateField type guards
  isNumberField,
  isStringField,
  isListField,
  isStateField,
  // EventHandler type guard
  isEventHandler,
} from './types/guards.js';

// ==================== Error Types ====================
export type { ErrorCode } from './types/error.js';

export {
  ConstelaError,
  isConstelaError,
  createSchemaError,
  createUndefinedStateError,
  createUndefinedActionError,
  createUndefinedVarError,
  createDuplicateActionError,
  createUnsupportedVersionError,
} from './types/error.js';

// ==================== Validator ====================
export type { ValidationResult, ValidationSuccess, ValidationFailure } from './schema/validator.js';

export { validateAst } from './schema/validator.js';

// ==================== Schema ====================
export { astSchema } from './schema/ast.schema.js';
