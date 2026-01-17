/**
 * Expression Evaluator - Evaluates compiled expressions
 *
 * Supports:
 * - Literal values (lit)
 * - State reads (state)
 * - Variable reads (var)
 * - Binary operations (bin)
 * - Not operation (not)
 * - Conditional expressions (cond)
 * - Property access (get)
 */

import type { StateStore } from '../state/store.js';
import type { CompiledExpression } from '@constela/compiler';

/**
 * Style preset definition - matches @constela/core StylePreset
 */
export interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<Record<string, string> & { class: string }>;
}

export interface EvaluationContext {
  state: StateStore;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
  imports?: Record<string, unknown>;
  refs?: Record<string, Element>;  // DOM element refs
  styles?: Record<string, StylePreset>;  // Style presets for style expressions
}

export function evaluate(expr: CompiledExpression, ctx: EvaluationContext): unknown {
  switch (expr.expr) {
    case 'lit':
      return expr.value;

    case 'state': {
      const stateValue = ctx.state.get(expr.name);
      if (expr.path && stateValue != null) {
        return getNestedValue(stateValue, expr.path);
      }
      return stateValue;
    }

    case 'var': {
      let varName = expr.name;
      let pathParts: string[] = [];

      // Support dot notation in name: "user.name" -> name="user", path="name"
      if (varName.includes('.')) {
        const parts = varName.split('.');
        varName = parts[0]!;
        pathParts = parts.slice(1);
      }

      // Add explicit path if provided
      if (expr.path) {
        pathParts = pathParts.concat(expr.path.split('.'));
      }

      // Prototype pollution prevention
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
      for (const part of pathParts) {
        if (forbiddenKeys.has(part)) {
          return undefined;
        }
      }

      let value = ctx.locals[varName];

      // Fallback to safe globals if not found in locals
      if (value === undefined) {
        const safeGlobals: Record<string, unknown> = {
          JSON,
          Math,
          Date,
          Object,
          Array,
          String,
          Number,
          Boolean,
          console,
        };
        value = safeGlobals[varName];
      }

      // Traverse path
      for (const part of pathParts) {
        if (value == null) break;
        value = (value as Record<string, unknown>)[part];
      }

      // Bind methods to their parent object
      if (typeof value === 'function' && pathParts.length > 0) {
        let parent = ctx.locals[varName];
        if (parent === undefined) {
          const safeGlobals: Record<string, unknown> = { JSON, Math, Date, Object, Array, String, Number, Boolean, console };
          parent = safeGlobals[varName];
        }
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (parent == null) break;
          parent = (parent as Record<string, unknown>)[pathParts[i]!];
        }
        if (parent != null) {
          return (value as Function).bind(parent);
        }
      }

      return value;
    }

    case 'bin':
      return evaluateBinary(expr.op, expr.left, expr.right, ctx);

    case 'not':
      return !evaluate(expr.operand, ctx);

    case 'cond':
      return evaluate(expr.if, ctx) ? evaluate(expr.then, ctx) : evaluate(expr.else, ctx);

    case 'get': {
      const baseValue = evaluate(expr.base, ctx);
      if (baseValue == null) return undefined;

      const pathParts = expr.path.split('.');
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

      let value: unknown = baseValue;
      for (const part of pathParts) {
        if (forbiddenKeys.has(part)) return undefined;
        if (value == null) return undefined;
        value = (value as Record<string, unknown>)[part];
      }
      return value;
    }

    case 'route': {
      const source = expr.source ?? 'param';
      const routeCtx = ctx.route;
      if (!routeCtx) return '';
      switch (source) {
        case 'param':
          return routeCtx.params[expr.name] ?? '';
        case 'query':
          return routeCtx.query[expr.name] ?? '';
        case 'path':
          return routeCtx.path;
      }
    }

    case 'import': {
      const importData = ctx.imports?.[expr.name];
      if (importData === undefined) return undefined;
      if (expr.path) {
        return getNestedValue(importData, expr.path);
      }
      return importData;
    }

    case 'ref':
      return ctx.refs?.[expr.name] ?? null;

    case 'index': {
      const base = evaluate(expr.base, ctx);
      const key = evaluate(expr.key, ctx);
      if (base == null || key == null) return undefined;
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
      if (typeof key === 'string' && forbiddenKeys.has(key)) return undefined;
      return (base as Record<string | number, unknown>)[key as string | number];
    }

    case 'data': {
      // Data expressions are resolved from imports (loadedData is merged into importData)
      const dataValue = ctx.imports?.[expr.name];
      if (dataValue === undefined) return undefined;
      if (expr.path) {
        return getNestedValue(dataValue, expr.path);
      }
      return dataValue;
    }

    case 'param': {
      // Param expressions should be resolved during layout composition.
      // If one reaches runtime, it means layoutParams was missing - return undefined.
      return undefined;
    }

    case 'style':
      return evaluateStyle(expr, ctx);

    case 'concat': {
      return expr.items
        .map(item => {
          const val = evaluate(item, ctx);
          return val == null ? '' : String(val);
        })
        .join('');
    }

    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Type guard to check if a value is a CompiledExpression
 * Uses hasOwnProperty to avoid prototype chain issues
 */
function isExpression(value: unknown): value is CompiledExpression {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'expr') &&
    typeof (value as { expr: unknown }).expr === 'string'
  );
}

/**
 * Evaluates a payload that can be either a single expression or an object with expression fields
 */
export function evaluatePayload(
  payload: CompiledExpression | Record<string, CompiledExpression>,
  ctx: EvaluationContext
): unknown {
  // Single expression case
  if (isExpression(payload)) {
    return evaluate(payload, ctx);
  }

  // Object payload case - evaluate each field recursively
  if (typeof payload === 'object' && payload !== null) {
    const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (forbiddenKeys.has(key)) continue;

      if (isExpression(value)) {
        result[key] = evaluate(value, ctx);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return payload;
}

/**
 * Gets a nested value from an object using a dot-separated path
 * Handles both object keys and array indices (numeric strings)
 * Includes prototype pollution prevention
 * Binds methods to their parent object to preserve 'this' context
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
  const parts = path.split('.');

  let value: unknown = obj;
  let parent: unknown = null;

  for (const part of parts) {
    // Prototype pollution prevention
    if (forbiddenKeys.has(part)) {
      return undefined;
    }

    if (value == null) {
      return undefined;
    }

    parent = value;

    // Handle array access with numeric indices
    if (Array.isArray(value)) {
      const index = Number(part);
      if (Number.isInteger(index) && index >= 0) {
        value = value[index];
      } else {
        // Non-numeric key on array, try as object property
        value = (value as unknown as Record<string, unknown>)[part];
      }
    } else if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  // Bind methods to their parent object to preserve 'this' context
  if (typeof value === 'function' && parent != null) {
    return (value as Function).bind(parent);
  }

  return value;
}

function evaluateBinary(
  op: string,
  left: CompiledExpression,
  right: CompiledExpression,
  ctx: EvaluationContext
): unknown {
  // Short-circuit evaluation for logical operators
  if (op === '&&') {
    const leftVal = evaluate(left, ctx);
    if (!leftVal) return leftVal;
    return evaluate(right, ctx);
  }

  if (op === '||') {
    const leftVal = evaluate(left, ctx);
    if (leftVal) return leftVal;
    return evaluate(right, ctx);
  }

  const leftVal = evaluate(left, ctx);
  const rightVal = evaluate(right, ctx);

  switch (op) {
    // Arithmetic
    case '+':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal + rightVal;
      }
      // Fallback for string concatenation
      return String(leftVal) + String(rightVal);
    case '-':
      return (typeof leftVal === 'number' ? leftVal : 0) - (typeof rightVal === 'number' ? rightVal : 0);
    case '*':
      return (typeof leftVal === 'number' ? leftVal : 0) * (typeof rightVal === 'number' ? rightVal : 0);
    case '/': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      // Handle division by zero - return Infinity (matches JavaScript semantics)
      if (divisor === 0) {
        return dividend === 0 ? NaN : (dividend > 0 ? Infinity : -Infinity);
      }
      return dividend / divisor;
    }

    // Comparison (using strict equality)
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '<':
      // Safe comparison with type checking
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal < rightVal;
      }
      return String(leftVal) < String(rightVal);
    case '<=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal <= rightVal;
      }
      return String(leftVal) <= String(rightVal);
    case '>':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal > rightVal;
      }
      return String(leftVal) > String(rightVal);
    case '>=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal >= rightVal;
      }
      return String(leftVal) >= String(rightVal);

    default:
      throw new Error('Unknown binary operator: ' + op);
  }
}

/**
 * Style expression type for evaluateStyle
 */
interface StyleExprInput {
  expr: 'style';
  name: string;
  variants?: Record<string, CompiledExpression>;
}

/**
 * Evaluates a style expression to produce CSS class names
 *
 * @param expr - The style expression to evaluate
 * @param ctx - The evaluation context containing styles presets
 * @returns The computed CSS class string, or undefined if preset not found
 */
export function evaluateStyle(
  expr: StyleExprInput,
  ctx: EvaluationContext
): string | undefined {
  const preset = ctx.styles?.[expr.name];
  if (!preset) return undefined;

  let classes = preset.base;

  // Apply variants in preset.variants key order for consistency
  // For each variant key, use the expression value if specified, otherwise use default
  if (preset.variants) {
    for (const variantKey of Object.keys(preset.variants)) {
      let variantValueStr: string | null = null;

      // Check if variant is specified in expression
      if (expr.variants?.[variantKey]) {
        let variantValue: unknown;
        try {
          variantValue = evaluate(expr.variants[variantKey]!, ctx);
        } catch {
          // If evaluation fails (e.g., state doesn't exist), skip this variant
          continue;
        }
        if (variantValue != null) {
          variantValueStr = String(variantValue);
        }
      } else if (preset.defaultVariants?.[variantKey] !== undefined) {
        // Use default variant if not specified in expression
        variantValueStr = preset.defaultVariants[variantKey]!;
      }

      // Apply variant classes if we have a value
      if (variantValueStr !== null) {
        const variantClasses = preset.variants[variantKey]?.[variantValueStr];
        if (variantClasses) {
          classes += ' ' + variantClasses;
        }
      }
    }
  }

  return classes.trim();
}
