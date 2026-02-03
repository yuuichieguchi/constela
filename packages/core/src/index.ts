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
  FocusOperation,
  ValidityProperty,
  // Expressions
  Expression,
  LitExpr,
  StateExpr,
  LocalExpr,
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
  StyleExpr,
  ConcatExpr,
  ValidityExpr,
  IndexExpr,
  CallExpr,
  LambdaExpr,
  ArrayExpr,
  ObjExpr,
  // State Fields
  StateField,
  NumberField,
  StringField,
  ListField,
  BooleanField,
  ObjectField,
  CookieInitialExpr,
  // Action Steps
  ActionStep,
  SetStep,
  UpdateStep,
  SetPathStep,
  FetchStep,
  StorageStep,
  ClipboardStep,
  NavigateStep,
  ImportStep,
  CallStep,
  SubscribeStep,
  DisposeStep,
  DomStep,
  SendStep,
  CloseStep,
  DelayStep,
  IntervalStep,
  ClearTimerStep,
  FocusStep,
  IfStep,
  // Realtime Steps
  SSEConnectStep,
  SSECloseStep,
  OptimisticStep,
  ConfirmStep,
  RejectStep,
  BindStep,
  UnbindStep,
  ReconnectConfig,
  // Event Handler
  EventHandler,
  EventHandlerOptions,
  // Action Definition
  ActionDefinition,
  // Local Action Types
  LocalActionStep,
  LocalActionDefinition,
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
  PortalNode,
  // Island Types
  IslandStrategy,
  IslandStrategyOptions,
  IslandNode,
  // Suspense and Error Boundary Types
  SuspenseNode,
  ErrorBoundaryNode,
  // Component Definition
  ParamDef,
  ComponentDef,
  // Style Preset Types
  StylePreset,
  CompoundVariant,
  // Data Source Types
  DataSource,
  ComponentsRef,
  StaticPathsDefinition,
  // AI Types
  AiProviderType,
  AiOutputType,
  AiDataSource,
  GenerateStep,
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

// ==================== Theme Types ====================
export type {
  ColorScheme,
  ThemeColors,
  ThemeFonts,
  ThemeConfig,
} from './types/theme.js';

export { COLOR_SCHEMES } from './types/theme.js';

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
  FOCUS_OPERATIONS,
  VALIDITY_PROPERTIES,
  AI_PROVIDER_TYPES,
  AI_OUTPUT_TYPES,
  ISLAND_STRATEGIES,
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
  isStyleExpr,
  isConcatExpr,
  isValidityExpr,
  isArrayExpr,
  isExpression,
  // Route Definition type guard
  isRouteDefinition,
  // Data source type guards
  isDataSource,
  isStaticPathsDefinition,
  // AI type guards
  isAiDataSource,
  isGenerateStep,
  // ViewNode type guards
  isElementNode,
  isTextNode,
  isIfNode,
  isEachNode,
  isComponentNode,
  isSlotNode,
  isMarkdownNode,
  isCodeNode,
  isPortalNode,
  isViewNode,
  // Island type guards
  isIslandStrategy,
  isIslandStrategyOptions,
  isIslandNode,
  // Suspense and Error Boundary type guards
  isSuspenseNode,
  isErrorBoundaryNode,
  // ActionStep type guards
  isSetStep,
  isUpdateStep,
  isSetPathStep,
  isFetchStep,
  isStorageStep,
  isClipboardStep,
  isNavigateStep,
  isImportStep,
  isCallStep,
  isSubscribeStep,
  isDisposeStep,
  isFocusStep,
  isActionStep,
  // LocalAction type guards
  isLocalActionStep,
  isLocalActionDefinition,
  // StateField type guards
  isNumberField,
  isStringField,
  isListField,
  isBooleanField,
  isObjectField,
  isStateField,
  // Cookie initial expression type guard
  isCookieInitialExpr,
  // EventHandler type guard
  isEventHandler,
  // Layout type guards
  isLayoutProgram,
  isNamedSlotNode,
  // Lifecycle type guard
  isLifecycleHooks,
} from './types/guards.js';

// Theme type guards
export {
  isColorScheme,
  isThemeColors,
  isThemeFonts,
  isThemeConfig,
} from './types/theme.js';

// ==================== Error Types ====================
export type { ErrorCode, ErrorOptions } from './types/error.js';

export {
  ConstelaError,
  isConstelaError,
  findSimilarNames,
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
  // Style error factories
  createUndefinedStyleError,
  createUndefinedVariantError,
  // Local state error factories
  createUndefinedLocalStateError,
  createLocalActionInvalidStepError,
  // Island error factories
  createDuplicateIslandIdError,
} from './types/error.js';

// ==================== Validator ====================
export type { ValidationResult, ValidationSuccess, ValidationFailure } from './schema/validator.js';

export { validateAst } from './schema/validator.js';

// ==================== Schema ====================
export { astSchema } from './schema/ast.schema.js';

// ==================== Streaming SSR Types ====================
export type {
  FlushStrategy,
  StreamingRenderOptions,
  SuspenseBoundary,
  StreamChunk,
  StreamChunkType,
} from './types/streaming.js';

export {
  isStreamingRenderOptions,
  isSuspenseBoundary,
  isStreamChunk,
} from './types/streaming.js';
