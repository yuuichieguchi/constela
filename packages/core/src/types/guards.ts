/**
 * Type Guards for Constela AST Types
 *
 * This module provides runtime type checking functions for all AST types.
 */

import {
  BINARY_OPERATORS,
  UPDATE_OPERATIONS,
  HTTP_METHODS,
  DATA_SOURCE_TYPES,
  DATA_TRANSFORMS,
  STORAGE_OPERATIONS,
  STORAGE_TYPES,
  CLIPBOARD_OPERATIONS,
  NAVIGATE_TARGETS,
  FOCUS_OPERATIONS,
  VALIDITY_PROPERTIES,
  type Expression,
  type LitExpr,
  type StateExpr,
  type VarExpr,
  type BinExpr,
  type NotExpr,
  type ParamExpr,
  type CondExpr,
  type GetExpr,
  type RouteExpr,
  type ImportExpr,
  type DataExpr,
  type DataSource,
  type StaticPathsDefinition,
  type RouteDefinition,
  type LifecycleHooks,
  type ViewNode,
  type ElementNode,
  type TextNode,
  type IfNode,
  type EachNode,
  type ComponentNode,
  type SlotNode,
  type MarkdownNode,
  type CodeNode,
  type PortalNode,
  type ActionStep,
  type SetStep,
  type UpdateStep,
  type SetPathStep,
  type FetchStep,
  type StorageStep,
  type ClipboardStep,
  type NavigateStep,
  type ImportStep,
  type CallStep,
  type SubscribeStep,
  type DisposeStep,
  type DelayStep,
  type IntervalStep,
  type ClearTimerStep,
  type FocusStep,
  type RefExpr,
  type IndexExpr,
  type StyleExpr,
  type ConcatExpr,
  type ValidityExpr,
  type ArrayExpr,
  type StorageOperation,
  type StorageType,
  type ClipboardOperation,
  type NavigateTarget,
  type FocusOperation,
  type StateField,
  type NumberField,
  type StringField,
  type ListField,
  type BooleanField,
  type ObjectField,
  type EventHandler,
  type LayoutProgram,
  type LocalActionStep,
  type LocalActionDefinition,
  type CookieInitialExpr,
} from './ast.js';

// ==================== Helper Functions ====================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ==================== Expression Type Guards ====================

/**
 * Checks if value is a literal expression
 */
export function isLitExpr(value: unknown): value is LitExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'lit') return false;
  return 'value' in value;
}

/**
 * Checks if value is a state expression
 */
export function isStateExpr(value: unknown): value is StateExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'state') return false;
  return typeof value['name'] === 'string';
}

/**
 * Checks if value is a variable expression
 */
export function isVarExpr(value: unknown): value is VarExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'var') return false;
  return typeof value['name'] === 'string';
}

/**
 * Checks if value is a binary expression
 *
 * Note: This performs shallow validation only - it checks that `left` and `right`
 * are objects but does not recursively validate they are valid Expressions.
 * This is intentional for performance: deep validation would require traversing
 * potentially deeply nested expression trees on every type guard call.
 * Use the AST validator for full recursive validation instead.
 */
export function isBinExpr(value: unknown): value is BinExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'bin') return false;
  if (!BINARY_OPERATORS.includes(value['op'] as typeof BINARY_OPERATORS[number])) {
    return false;
  }
  if (!isObject(value['left']) || !isObject(value['right'])) return false;
  return true;
}

/**
 * Checks if value is a not expression
 *
 * Note: This performs shallow validation only - it checks that `operand` is
 * an object but does not recursively validate it is a valid Expression.
 * This is intentional for performance: deep validation would require traversing
 * potentially deeply nested expression trees on every type guard call.
 * Use the AST validator for full recursive validation instead.
 */
export function isNotExpr(value: unknown): value is NotExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'not') return false;
  if (!isObject(value['operand'])) return false;
  return true;
}

/**
 * Checks if value is a param expression
 */
export function isParamExpr(value: unknown): value is ParamExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'param') return false;
  if (typeof value['name'] !== 'string') return false;
  // Validate path if present
  if ('path' in value && value['path'] !== undefined) {
    if (typeof value['path'] !== 'string') return false;
  }
  return true;
}

/**
 * Checks if value is a cond expression
 *
 * Note: This performs shallow validation only - it checks that `if`, `then`, and `else`
 * are objects but does not recursively validate they are valid Expressions.
 * This is intentional for performance: deep validation would require traversing
 * potentially deeply nested expression trees on every type guard call.
 * Use the AST validator for full recursive validation instead.
 */
export function isCondExpr(value: unknown): value is CondExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'cond') return false;
  if (!isObject(value['if']) || !isObject(value['then']) || !isObject(value['else'])) return false;
  return true;
}

/**
 * Checks if value is a get expression
 *
 * Note: This performs shallow validation only - it checks that `base` is
 * an object but does not recursively validate it is a valid Expression.
 * This is intentional for performance: deep validation would require traversing
 * potentially deeply nested expression trees on every type guard call.
 * Use the AST validator for full recursive validation instead.
 */
export function isGetExpr(value: unknown): value is GetExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'get') return false;
  if (!isObject(value['base'])) return false;
  if (typeof value['path'] !== 'string') return false;
  return true;
}

/**
 * Checks if value is a route expression
 */
export function isRouteExpr(value: unknown): value is RouteExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'route') return false;
  if (typeof value['name'] !== 'string') return false;
  // Validate source if present
  if ('source' in value && value['source'] !== undefined) {
    const validSources = ['param', 'query', 'path'];
    if (!validSources.includes(value['source'] as string)) return false;
  }
  return true;
}

/**
 * Checks if value is an import expression
 */
export function isImportExpr(value: unknown): value is ImportExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'import') return false;
  if (typeof value['name'] !== 'string') return false;
  // Validate path if present
  if ('path' in value && value['path'] !== undefined) {
    if (typeof value['path'] !== 'string') return false;
  }
  return true;
}

/**
 * Checks if value is a data expression
 */
export function isDataExpr(value: unknown): value is DataExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'data') return false;
  if (typeof value['name'] !== 'string') return false;
  // Validate path if present
  if ('path' in value && value['path'] !== undefined) {
    if (typeof value['path'] !== 'string') return false;
  }
  return true;
}

/**
 * Checks if value is a ref expression
 */
export function isRefExpr(value: unknown): value is RefExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'ref') return false;
  return typeof value['name'] === 'string';
}

/**
 * Checks if value is an index expression
 *
 * Note: This performs shallow validation only - it checks that `base` and `key`
 * are objects but does not recursively validate they are valid Expressions.
 * This is intentional for performance: deep validation would require traversing
 * potentially deeply nested expression trees on every type guard call.
 * Use the AST validator for full recursive validation instead.
 */
export function isIndexExpr(value: unknown): value is IndexExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'index') return false;
  if (!('base' in value)) return false;
  if (!('key' in value)) return false;
  return true;
}

/**
 * Checks if value is a style expression
 */
export function isStyleExpr(value: unknown): value is StyleExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'style') return false;
  if (typeof value['name'] !== 'string') return false;
  // Validate variants if present
  if ('variants' in value && value['variants'] !== undefined) {
    if (!isObject(value['variants'])) return false;
  }
  return true;
}

/**
 * Checks if value is a concat expression
 */
export function isConcatExpr(value: unknown): value is ConcatExpr {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ConcatExpr).expr === 'concat' &&
    Array.isArray((value as ConcatExpr).items)
  );
}

/**
 * Checks if value is an array expression
 */
export function isArrayExpr(value: unknown): value is ArrayExpr {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ArrayExpr).expr === 'array' &&
    Array.isArray((value as ArrayExpr).elements)
  );
}

/**
 * Checks if value is a validity expression
 */
export function isValidityExpr(value: unknown): value is ValidityExpr {
  if (!isObject(value)) return false;
  if (value['expr'] !== 'validity') return false;
  if (typeof value['ref'] !== 'string') return false;
  // Validate property if present
  if ('property' in value && value['property'] !== undefined) {
    if (!VALIDITY_PROPERTIES.includes(value['property'] as typeof VALIDITY_PROPERTIES[number])) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if value is a data source
 */
export function isDataSource(value: unknown): value is DataSource {
  if (!isObject(value)) return false;

  // Check type field is valid
  const type = value['type'];
  if (!DATA_SOURCE_TYPES.includes(type as typeof DATA_SOURCE_TYPES[number])) {
    return false;
  }

  // Validate transform if present
  if ('transform' in value && value['transform'] !== undefined) {
    if (!DATA_TRANSFORMS.includes(value['transform'] as typeof DATA_TRANSFORMS[number])) {
      return false;
    }
  }

  // Type-specific validation
  switch (type) {
    case 'glob':
      // Glob requires pattern
      if (typeof value['pattern'] !== 'string') return false;
      break;
    case 'file':
      // File requires path
      if (typeof value['path'] !== 'string') return false;
      break;
    case 'api':
      // API requires url
      if (typeof value['url'] !== 'string') return false;
      break;
  }

  return true;
}

/**
 * Checks if value is a static paths definition
 */
export function isStaticPathsDefinition(value: unknown): value is StaticPathsDefinition {
  if (!isObject(value)) return false;
  if (typeof value['source'] !== 'string') return false;
  if (!('params' in value) || !isObject(value['params'])) return false;
  return true;
}

/**
 * Checks if value is a route definition
 */
export function isRouteDefinition(value: unknown): value is RouteDefinition {
  if (!isObject(value)) return false;
  if (typeof value['path'] !== 'string') return false;
  // title, layout, meta are optional - no further validation needed for type guard
  return true;
}

/**
 * Checks if value is any valid expression
 */
export function isExpression(value: unknown): value is Expression {
  return (
    isLitExpr(value) ||
    isStateExpr(value) ||
    isVarExpr(value) ||
    isBinExpr(value) ||
    isNotExpr(value) ||
    isParamExpr(value) ||
    isCondExpr(value) ||
    isGetExpr(value) ||
    isRouteExpr(value) ||
    isImportExpr(value) ||
    isDataExpr(value) ||
    isRefExpr(value) ||
    isIndexExpr(value) ||
    isStyleExpr(value) ||
    isConcatExpr(value) ||
    isValidityExpr(value) ||
    isArrayExpr(value)
  );
}

// ==================== ViewNode Type Guards ====================

/**
 * Checks if value is an element node
 */
export function isElementNode(value: unknown): value is ElementNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'element') return false;
  return typeof value['tag'] === 'string';
}

/**
 * Checks if value is a text node
 */
export function isTextNode(value: unknown): value is TextNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'text') return false;
  return isObject(value['value']);
}

/**
 * Checks if value is an if node
 */
export function isIfNode(value: unknown): value is IfNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'if') return false;
  if (!isObject(value['condition'])) return false;
  if (!isObject(value['then'])) return false;
  return true;
}

/**
 * Checks if value is an each node
 */
export function isEachNode(value: unknown): value is EachNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'each') return false;
  if (!isObject(value['items'])) return false;
  if (typeof value['as'] !== 'string') return false;
  if (!isObject(value['body'])) return false;
  return true;
}

/**
 * Checks if value is a component node
 */
export function isComponentNode(value: unknown): value is ComponentNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'component') return false;
  if (typeof value['name'] !== 'string') return false;
  // Validate props if present
  if ('props' in value && value['props'] !== undefined) {
    if (!isObject(value['props'])) return false;
  }
  // Validate children if present
  if ('children' in value && value['children'] !== undefined) {
    if (!Array.isArray(value['children'])) return false;
  }
  return true;
}

/**
 * Checks if value is a slot node
 */
export function isSlotNode(value: unknown): value is SlotNode {
  if (!isObject(value)) return false;
  return value['kind'] === 'slot';
}

/**
 * Checks if value is a markdown node
 */
export function isMarkdownNode(value: unknown): value is MarkdownNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'markdown') return false;
  return 'content' in value && isObject(value['content']);
}

/**
 * Checks if value is a code node
 */
export function isCodeNode(value: unknown): value is CodeNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'code') return false;
  if (!('language' in value) || !isObject(value['language'])) return false;
  if (!('content' in value) || !isObject(value['content'])) return false;
  return true;
}

/**
 * Checks if value is a portal node
 */
export function isPortalNode(value: unknown): value is PortalNode {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'portal') return false;
  if (typeof value['target'] !== 'string') return false;
  if (!Array.isArray(value['children'])) return false;
  return true;
}

/**
 * Checks if value is any valid view node
 */
export function isViewNode(value: unknown): value is ViewNode {
  return (
    isElementNode(value) ||
    isTextNode(value) ||
    isIfNode(value) ||
    isEachNode(value) ||
    isComponentNode(value) ||
    isSlotNode(value) ||
    isMarkdownNode(value) ||
    isCodeNode(value) ||
    isPortalNode(value)
  );
}

// ==================== ActionStep Type Guards ====================

/**
 * Checks if value is a set step
 */
export function isSetStep(value: unknown): value is SetStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'set') return false;
  if (typeof value['target'] !== 'string') return false;
  if (!isObject(value['value'])) return false;
  return true;
}

/**
 * Checks if value is an update step
 */
export function isUpdateStep(value: unknown): value is UpdateStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'update') return false;
  if (typeof value['target'] !== 'string') return false;
  if (!UPDATE_OPERATIONS.includes(value['operation'] as typeof UPDATE_OPERATIONS[number])) {
    return false;
  }
  return true;
}

/**
 * Checks if value is a setPath step
 */
export function isSetPathStep(value: unknown): value is SetPathStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'setPath') return false;
  if (typeof value['target'] !== 'string') return false;
  if (!isObject(value['path'])) return false;
  if (!isObject(value['value'])) return false;
  return true;
}

/**
 * Checks if value is a fetch step
 */
export function isFetchStep(value: unknown): value is FetchStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'fetch') return false;
  if (!isObject(value['url'])) return false;
  // Validate method if present
  if ('method' in value && value['method'] !== undefined) {
    if (!HTTP_METHODS.includes(value['method'] as typeof HTTP_METHODS[number])) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if value is a storage step
 */
export function isStorageStep(value: unknown): value is StorageStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'storage') return false;
  if (!STORAGE_OPERATIONS.includes(value['operation'] as StorageOperation)) {
    return false;
  }
  if (!STORAGE_TYPES.includes(value['storage'] as StorageType)) {
    return false;
  }
  if (!('key' in value)) return false;
  return true;
}

/**
 * Checks if value is a clipboard step
 */
export function isClipboardStep(value: unknown): value is ClipboardStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'clipboard') return false;
  if (!CLIPBOARD_OPERATIONS.includes(value['operation'] as ClipboardOperation)) {
    return false;
  }
  return true;
}

/**
 * Checks if value is a navigate step
 */
export function isNavigateStep(value: unknown): value is NavigateStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'navigate') return false;
  if (!('url' in value)) return false;
  // Validate target if present
  if ('target' in value && value['target'] !== undefined) {
    if (!NAVIGATE_TARGETS.includes(value['target'] as NavigateTarget)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if value is an import step
 */
export function isImportStep(value: unknown): value is ImportStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'import') return false;
  if (typeof value['module'] !== 'string') return false;
  if (typeof value['result'] !== 'string') return false;
  return true;
}

/**
 * Checks if value is a call step
 */
export function isCallStep(value: unknown): value is CallStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'call') return false;
  if (!isObject(value['target'])) return false;
  return true;
}

/**
 * Checks if value is a subscribe step
 */
export function isSubscribeStep(value: unknown): value is SubscribeStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'subscribe') return false;
  if (!isObject(value['target'])) return false;
  if (typeof value['event'] !== 'string') return false;
  if (typeof value['action'] !== 'string') return false;
  return true;
}

/**
 * Checks if value is a dispose step
 */
export function isDisposeStep(value: unknown): value is DisposeStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'dispose') return false;
  if (!isObject(value['target'])) return false;
  return true;
}

/**
 * Checks if value is a delay step
 */
export function isDelayStep(value: unknown): value is DelayStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'delay') return false;
  if (!isObject(value['ms'])) return false;
  if (!Array.isArray(value['then'])) return false;
  return true;
}

/**
 * Checks if value is an interval step
 */
export function isIntervalStep(value: unknown): value is IntervalStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'interval') return false;
  if (!isObject(value['ms'])) return false;
  if (typeof value['action'] !== 'string') return false;
  return true;
}

/**
 * Checks if value is a clearTimer step
 */
export function isClearTimerStep(value: unknown): value is ClearTimerStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'clearTimer') return false;
  if (!isObject(value['target'])) return false;
  return true;
}

/**
 * Checks if value is a focus step
 */
export function isFocusStep(value: unknown): value is FocusStep {
  if (!isObject(value)) return false;
  if (value['do'] !== 'focus') return false;
  if (!isObject(value['target'])) return false;
  if (!FOCUS_OPERATIONS.includes(value['operation'] as FocusOperation)) {
    return false;
  }
  return true;
}

/**
 * Checks if value is any valid action step
 */
export function isActionStep(value: unknown): value is ActionStep {
  return (
    isSetStep(value) ||
    isUpdateStep(value) ||
    isSetPathStep(value) ||
    isFetchStep(value) ||
    isStorageStep(value) ||
    isClipboardStep(value) ||
    isNavigateStep(value) ||
    isImportStep(value) ||
    isCallStep(value) ||
    isSubscribeStep(value) ||
    isDisposeStep(value) ||
    isDelayStep(value) ||
    isIntervalStep(value) ||
    isClearTimerStep(value) ||
    isFocusStep(value)
  );
}

/**
 * Checks if value is a valid local action step
 * Local actions only allow set, update, and setPath steps
 */
export function isLocalActionStep(value: unknown): value is LocalActionStep {
  return isSetStep(value) || isUpdateStep(value) || isSetPathStep(value);
}

/**
 * Checks if value is a local action definition
 */
export function isLocalActionDefinition(value: unknown): value is LocalActionDefinition {
  if (!isObject(value)) return false;
  if (typeof value['name'] !== 'string') return false;
  if (!Array.isArray(value['steps'])) return false;
  // Validate each step is a valid local action step
  for (const step of value['steps']) {
    if (!isLocalActionStep(step)) return false;
  }
  return true;
}

// ==================== StateField Type Guards ====================

/**
 * Checks if value is a number field
 */
export function isNumberField(value: unknown): value is NumberField {
  if (!isObject(value)) return false;
  if (value['type'] !== 'number') return false;
  return typeof value['initial'] === 'number';
}

/**
 * Checks if value is a cookie initial expression
 */
export function isCookieInitialExpr(value: unknown): value is CookieInitialExpr {
  return (
    typeof value === 'object' &&
    value !== null &&
    'expr' in value &&
    (value as { expr: unknown }).expr === 'cookie' &&
    'key' in value &&
    typeof (value as { key: unknown }).key === 'string' &&
    'default' in value &&
    typeof (value as { default: unknown }).default === 'string'
  );
}

/**
 * Checks if value is a string field
 */
export function isStringField(value: unknown): value is StringField {
  if (!isObject(value)) return false;
  if (value['type'] !== 'string') return false;
  return typeof value['initial'] === 'string' || isCookieInitialExpr(value['initial']);
}

/**
 * Checks if value is a list field
 */
export function isListField(value: unknown): value is ListField {
  if (!isObject(value)) return false;
  if (value['type'] !== 'list') return false;
  return Array.isArray(value['initial']);
}

/**
 * Checks if value is a boolean field
 */
export function isBooleanField(value: unknown): value is BooleanField {
  if (!isObject(value)) return false;
  if (value['type'] !== 'boolean') return false;
  return typeof value['initial'] === 'boolean';
}

/**
 * Checks if value is an object field
 */
export function isObjectField(value: unknown): value is ObjectField {
  if (!isObject(value)) return false;
  if (value['type'] !== 'object') return false;
  return typeof value['initial'] === 'object' && value['initial'] !== null;
}

/**
 * Checks if value is any valid state field
 */
export function isStateField(value: unknown): value is StateField {
  return (
    isNumberField(value) ||
    isStringField(value) ||
    isListField(value) ||
    isBooleanField(value) ||
    isObjectField(value)
  );
}

// ==================== EventHandler Type Guard ====================

/**
 * Checks if value is an event handler
 */
export function isEventHandler(value: unknown): value is EventHandler {
  if (!isObject(value)) return false;
  if (!('event' in value) || typeof value['event'] !== 'string') return false;
  if (!('action' in value) || typeof value['action'] !== 'string') return false;
  return true;
}

// ==================== Layout Program Type Guards ====================

/**
 * Checks if value is a layout program
 */
export function isLayoutProgram(value: unknown): value is LayoutProgram {
  if (!isObject(value)) return false;
  if (value['version'] !== '1.0') return false;
  if (value['type'] !== 'layout') return false;
  if (!('view' in value)) return false;
  return true;
}

/**
 * Checks if value is a named slot node (slot with a name property)
 */
export function isNamedSlotNode(value: unknown): value is SlotNode & { name: string } {
  if (!isObject(value)) return false;
  if (value['kind'] !== 'slot') return false;
  if (typeof value['name'] !== 'string') return false;
  return true;
}

// ==================== Lifecycle Hooks Type Guard ====================

/**
 * Checks if value is a lifecycle hooks object
 *
 * Lifecycle hooks are permissive - they allow unknown properties for extensibility.
 * Only known properties are validated to be strings.
 */
export function isLifecycleHooks(value: unknown): value is LifecycleHooks {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  const knownFields = ['onMount', 'onUnmount', 'onRouteEnter', 'onRouteLeave'];

  // Validate known fields if present - they must be strings
  for (const key of knownFields) {
    if (key in obj && obj[key] !== undefined) {
      if (typeof obj[key] !== 'string') return false;
    }
  }

  // Allow unknown properties for extensibility - only validate their type is string
  for (const key of Object.keys(obj)) {
    if (!knownFields.includes(key)) {
      // Unknown properties must also be strings (action names)
      if (typeof obj[key] !== 'string') return false;
    }
  }

  return true;
}
