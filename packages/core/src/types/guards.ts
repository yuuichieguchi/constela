/**
 * Type Guards for Constela AST Types
 *
 * This module provides runtime type checking functions for all AST types.
 */

import {
  BINARY_OPERATORS,
  UPDATE_OPERATIONS,
  HTTP_METHODS,
  type Expression,
  type LitExpr,
  type StateExpr,
  type VarExpr,
  type BinExpr,
  type NotExpr,
  type ParamExpr,
  type CondExpr,
  type GetExpr,
  type ViewNode,
  type ElementNode,
  type TextNode,
  type IfNode,
  type EachNode,
  type ComponentNode,
  type SlotNode,
  type ActionStep,
  type SetStep,
  type UpdateStep,
  type FetchStep,
  type StateField,
  type NumberField,
  type StringField,
  type ListField,
  type BooleanField,
  type ObjectField,
  type EventHandler,
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
    isGetExpr(value)
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
 * Checks if value is any valid view node
 */
export function isViewNode(value: unknown): value is ViewNode {
  return (
    isElementNode(value) ||
    isTextNode(value) ||
    isIfNode(value) ||
    isEachNode(value) ||
    isComponentNode(value) ||
    isSlotNode(value)
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
 * Checks if value is any valid action step
 */
export function isActionStep(value: unknown): value is ActionStep {
  return isSetStep(value) || isUpdateStep(value) || isFetchStep(value);
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
 * Checks if value is a string field
 */
export function isStringField(value: unknown): value is StringField {
  if (!isObject(value)) return false;
  if (value['type'] !== 'string') return false;
  return typeof value['initial'] === 'string';
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
