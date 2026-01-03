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
  ParamType,
  // Expressions
  Expression,
  LitExpr,
  StateExpr,
  VarExpr,
  BinExpr,
  NotExpr,
  ParamExpr,
  CondExpr,
  GetExpr,
  // State Fields
  StateField,
  NumberField,
  StringField,
  ListField,
  BooleanField,
  ObjectField,
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
  ComponentNode,
  SlotNode,
  // Component Definition
  ParamDef,
  ComponentDef,
  // Program
  Program,
  ConstelaAst,
} from './types/ast.js';

export {
  BINARY_OPERATORS,
  UPDATE_OPERATIONS,
  HTTP_METHODS,
  PARAM_TYPES,
} from './types/ast.js';

// ==================== Type Guards ====================
export {
  // Expression type guards
  isLitExpr,
  isStateExpr,
  isVarExpr,
  isBinExpr,
  isNotExpr,
  isParamExpr,
  isCondExpr,
  isGetExpr,
  isExpression,
  // ViewNode type guards
  isElementNode,
  isTextNode,
  isIfNode,
  isEachNode,
  isComponentNode,
  isSlotNode,
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
  isBooleanField,
  isObjectField,
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
  createComponentNotFoundError,
  createComponentPropMissingError,
  createComponentCycleError,
  createComponentPropTypeError,
  createUndefinedParamError,
  createOperationInvalidForTypeError,
  createOperationMissingFieldError,
  createOperationUnknownError,
  createCondElseRequiredError,
} from './types/error.js';

// ==================== Validator ====================
export type { ValidationResult, ValidationSuccess, ValidationFailure } from './schema/validator.js';

export { validateAst } from './schema/validator.js';

// ==================== Schema ====================
export { astSchema } from './schema/ast.schema.js';
