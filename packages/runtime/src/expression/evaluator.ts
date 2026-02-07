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
import type { CompiledExpression, CompiledCallExpr, CompiledLambdaExpr } from '@constela/compiler';
import { callGlobalFunction, GLOBAL_FUNCTIONS } from '@constela/core';

/**
 * Style preset definition - matches @constela/core StylePreset
 */
export interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<Record<string, string> & { class: string }>;
}

/**
 * Whitelist of safe array methods that can be called via call expressions
 */
const SAFE_ARRAY_METHODS = new Set([
  'length', 'at', 'includes', 'slice', 'indexOf', 'join',
  'filter', 'map', 'find', 'findIndex', 'some', 'every',
]);

/**
 * Whitelist of safe string methods that can be called via call expressions
 */
const SAFE_STRING_METHODS = new Set([
  'length', 'charAt', 'substring', 'slice', 'split',
  'trim', 'toUpperCase', 'toLowerCase', 'replace',
  'includes', 'startsWith', 'endsWith', 'indexOf',
]);

/**
 * Whitelist of safe Math static methods
 */
const SAFE_MATH_METHODS = new Set([
  'min', 'max', 'round', 'floor', 'ceil', 'abs',
  'sqrt', 'pow', 'random', 'sin', 'cos', 'tan',
]);

/**
 * Whitelist of safe Date static methods
 */
const SAFE_DATE_STATIC_METHODS = new Set([
  'now', 'parse',
]);

/**
 * Whitelist of safe Date instance methods
 */
const SAFE_DATE_INSTANCE_METHODS = new Set([
  'toISOString', 'toDateString', 'toTimeString',
  'getTime', 'getFullYear', 'getMonth', 'getDate',
  'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
]);


/**
 * Creates a JavaScript function from a lambda expression
 */
function createLambdaFunction(
  lambda: CompiledLambdaExpr,
  ctx: EvaluationContext
): (item: unknown, index: number) => unknown {
  return (item: unknown, index: number): unknown => {
    const lambdaLocals: Record<string, unknown> = {
      ...ctx.locals,
      [lambda.param]: item,
    };
    if (lambda.index !== undefined) {
      lambdaLocals[lambda.index] = index;
    }
    return evaluate(lambda.body, { ...ctx, locals: lambdaLocals });
  };
}

/**
 * Safely calls an array method
 */
function callArrayMethod(
  target: unknown[],
  method: string,
  args: unknown[],
  ctx: EvaluationContext,
  rawArgs?: CompiledExpression[]
): unknown {
  if (!SAFE_ARRAY_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'length':
      return target.length;
    case 'at': {
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return target.at(index);
    }
    case 'includes': {
      const searchElement = args[0];
      const fromIndex = typeof args[1] === 'number' ? args[1] : undefined;
      return target.includes(searchElement, fromIndex);
    }
    case 'slice': {
      const start = typeof args[0] === 'number' ? args[0] : undefined;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.slice(start, end);
    }
    case 'indexOf': {
      const searchElement = args[0];
      const fromIndex = typeof args[1] === 'number' ? args[1] : undefined;
      return target.indexOf(searchElement, fromIndex);
    }
    case 'join': {
      const separator = typeof args[0] === 'string' ? args[0] : ',';
      return target.join(separator);
    }
    case 'filter': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.filter((item, index) => !!fn(item, index));
    }
    case 'map': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.map((item, index) => fn(item, index));
    }
    case 'find': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.find((item, index) => !!fn(item, index));
    }
    case 'findIndex': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.findIndex((item, index) => !!fn(item, index));
    }
    case 'some': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.some((item, index) => !!fn(item, index));
    }
    case 'every': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.every((item, index) => !!fn(item, index));
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a string method
 */
function callStringMethod(
  target: string,
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_STRING_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'length':
      return target.length;
    case 'charAt': {
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return target.charAt(index);
    }
    case 'substring': {
      const start = typeof args[0] === 'number' ? args[0] : 0;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.substring(start, end);
    }
    case 'slice': {
      const start = typeof args[0] === 'number' ? args[0] : undefined;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.slice(start, end);
    }
    case 'split': {
      const separator = typeof args[0] === 'string' ? args[0] : '';
      return target.split(separator);
    }
    case 'trim':
      return target.trim();
    case 'toUpperCase':
      return target.toUpperCase();
    case 'toLowerCase':
      return target.toLowerCase();
    case 'replace': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const replace = typeof args[1] === 'string' ? args[1] : '';
      return target.replace(search, replace);
    }
    case 'includes': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.includes(search, position);
    }
    case 'startsWith': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.startsWith(search, position);
    }
    case 'endsWith': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const length = typeof args[1] === 'number' ? args[1] : undefined;
      return target.endsWith(search, length);
    }
    case 'indexOf': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.indexOf(search, position);
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a Math static method
 */
function callMathMethod(
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_MATH_METHODS.has(method)) {
    return undefined;
  }

  const numbers = args.filter((a): a is number => typeof a === 'number');

  switch (method) {
    case 'min':
      return numbers.length > 0 ? Math.min(...numbers) : undefined;
    case 'max':
      return numbers.length > 0 ? Math.max(...numbers) : undefined;
    case 'round': {
      const num = numbers[0];
      return num !== undefined ? Math.round(num) : undefined;
    }
    case 'floor': {
      const num = numbers[0];
      return num !== undefined ? Math.floor(num) : undefined;
    }
    case 'ceil': {
      const num = numbers[0];
      return num !== undefined ? Math.ceil(num) : undefined;
    }
    case 'abs': {
      const num = numbers[0];
      return num !== undefined ? Math.abs(num) : undefined;
    }
    case 'sqrt': {
      const num = numbers[0];
      return num !== undefined ? Math.sqrt(num) : undefined;
    }
    case 'pow': {
      const base = numbers[0];
      const exponent = numbers[1];
      return base !== undefined && exponent !== undefined ? Math.pow(base, exponent) : undefined;
    }
    case 'random':
      return Math.random();
    case 'sin': {
      const num = numbers[0];
      return num !== undefined ? Math.sin(num) : undefined;
    }
    case 'cos': {
      const num = numbers[0];
      return num !== undefined ? Math.cos(num) : undefined;
    }
    case 'tan': {
      const num = numbers[0];
      return num !== undefined ? Math.tan(num) : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a Date static method
 */
function callDateStaticMethod(
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_DATE_STATIC_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'now':
      return Date.now();
    case 'parse': {
      const dateString = args[0];
      return typeof dateString === 'string' ? Date.parse(dateString) : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a Date instance method
 */
function callDateInstanceMethod(
  target: Date,
  method: string
): unknown {
  if (!SAFE_DATE_INSTANCE_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'toISOString':
      return target.toISOString();
    case 'toDateString':
      return target.toDateString();
    case 'toTimeString':
      return target.toTimeString();
    case 'getTime':
      return target.getTime();
    case 'getFullYear':
      return target.getFullYear();
    case 'getMonth':
      return target.getMonth();
    case 'getDate':
      return target.getDate();
    case 'getHours':
      return target.getHours();
    case 'getMinutes':
      return target.getMinutes();
    case 'getSeconds':
      return target.getSeconds();
    case 'getMilliseconds':
      return target.getMilliseconds();
    default:
      return undefined;
  }
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

    case 'local':
      return ctx.locals[expr.name];

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
          ...GLOBAL_FUNCTIONS,
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
          const safeGlobals: Record<string, unknown> = { JSON, Math, Date, Object, Array, String, Number, Boolean, console, ...GLOBAL_FUNCTIONS };
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

    case 'validity': {
      const element = ctx.refs?.[expr.ref];
      if (!element) return null;

      // Check if element has validity property (form elements)
      const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!formElement.validity) return null;

      const validity = formElement.validity;
      const property = expr.property || 'valid';

      if (property === 'message') {
        return formElement.validationMessage || '';
      }

      return validity[property as keyof ValidityState] ?? null;
    }

    case 'call': {
      const callExpr = expr as CompiledCallExpr;
      const target = callExpr.target != null ? evaluate(callExpr.target, ctx) : null;

      const args = callExpr.args?.map(arg => {
        // lambda expressions are not directly evaluated; they are passed to array methods
        if (arg.expr === 'lambda') return arg;
        return evaluate(arg, ctx);
      }) ?? [];

      // Global function calls (target is null)
      if (target === null) {
        return callGlobalFunction(callExpr.method, args);
      }

      // Array methods
      if (Array.isArray(target)) {
        return callArrayMethod(target, callExpr.method, args, ctx, callExpr.args);
      }

      // String methods
      if (typeof target === 'string') {
        return callStringMethod(target, callExpr.method, args);
      }

      // Math static methods
      if (target === Math) {
        return callMathMethod(callExpr.method, args);
      }

      // Date static methods
      if (target === Date) {
        return callDateStaticMethod(callExpr.method, args);
      }

      // Date instance methods
      if (target instanceof Date) {
        return callDateInstanceMethod(target, callExpr.method);
      }

      // Function call support (for global helper functions like getCalendarDays, getWeekDays, etc.)
      if (typeof target === 'function' && callExpr.method === 'call') {
        return target(...args);
      }

      return undefined;
    }

    case 'lambda':
      // Lambda expressions are not directly evaluated
      // They are passed to array methods and converted to functions there
      return undefined;

    case 'array': {
      const arrayExpr = expr as { expr: 'array'; elements: CompiledExpression[] };
      return arrayExpr.elements.map(elem => evaluate(elem, ctx));
    }

    case 'obj': {
      const objExpr = expr as { expr: 'obj'; props: Record<string, CompiledExpression> };
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(objExpr.props)) {
        result[key] = evaluate(value, ctx);
      }
      return result;
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
    case '%': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      if (divisor === 0) return NaN;
      return dividend % divisor;
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
