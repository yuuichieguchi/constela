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
  DataTransform,
  DataSourceType,
  StorageOperation,
  StorageType,
  ClipboardOperation,
  NavigateTarget,
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
  RouteExpr,
  ImportExpr,
  DataExpr,
  RefExpr,
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
  StorageStep,
  ClipboardStep,
  NavigateStep,
  ImportStep,
  CallStep,
  SubscribeStep,
  DisposeStep,
  DomStep,
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
  MarkdownNode,
  CodeNode,
  // Component Definition
  ParamDef,
  ComponentDef,
  // Data Source Types
  DataSource,
  ComponentsRef,
  StaticPathsDefinition,
  // Route Definition
  RouteDefinition,
  // Lifecycle Hooks
  LifecycleHooks,
  // Program
  Program,
  ConstelaAst,
  // Layout Program
  LayoutProgram,
  ConstelaProgram,
} from './types/ast.js';

export {
  BINARY_OPERATORS,
  UPDATE_OPERATIONS,
  HTTP_METHODS,
  PARAM_TYPES,
  DATA_TRANSFORMS,
  DATA_SOURCE_TYPES,
  STORAGE_OPERATIONS,
  STORAGE_TYPES,
  CLIPBOARD_OPERATIONS,
  NAVIGATE_TARGETS,
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
  isRouteExpr,
  isImportExpr,
  isDataExpr,
  isRefExpr,
  isExpression,
  // Route Definition type guard
  isRouteDefinition,
  // Data source type guards
  isDataSource,
  isStaticPathsDefinition,
  // ViewNode type guards
  isElementNode,
  isTextNode,
  isIfNode,
  isEachNode,
  isComponentNode,
  isSlotNode,
  isMarkdownNode,
  isCodeNode,
  isViewNode,
  // ActionStep type guards
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
  // Layout type guards
  isLayoutProgram,
  isNamedSlotNode,
  // Lifecycle type guard
  isLifecycleHooks,
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
  createUndefinedRouteParamError,
  createRouteNotDefinedError,
  createUndefinedImportError,
  createImportsNotDefinedError,
  // Layout error factories
  createLayoutMissingSlotError,
  createLayoutNotFoundError,
  createInvalidSlotNameError,
  createDuplicateSlotNameError,
  createDuplicateDefaultSlotError,
  createSlotInLoopError,
  // Data source error factories
  createInvalidDataSourceError,
  createUndefinedDataSourceError,
  createDataNotDefinedError,
  createUndefinedDataError,
  // External library error factories
  createUndefinedRefError,
  // Browser action error factories
  createInvalidStorageOperationError,
  createInvalidStorageTypeError,
  createStorageSetMissingValueError,
  createInvalidClipboardOperationError,
  createClipboardWriteMissingValueError,
  createInvalidNavigateTargetError,
} from './types/error.js';

// ==================== Validator ====================
export type { ValidationResult, ValidationSuccess, ValidationFailure } from './schema/validator.js';

export { validateAst } from './schema/validator.js';

// ==================== Schema ====================
export { astSchema } from './schema/ast.schema.js';
