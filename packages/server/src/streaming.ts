/**
 * Streaming SSR Renderer
 *
 * Renders CompiledProgram to a ReadableStream for Server-Side Rendering.
 * Uses Web Streams API for Edge Runtime compatibility.
 *
 * Features:
 * - Three flush strategies: immediate, batched, manual
 * - Backpressure support via controller.desiredSize
 * - AbortSignal support for cancellation
 * - Suspense boundary support for async content
 */

import type {
  CompiledProgram,
  CompiledNode,
  CompiledElementNode,
  CompiledTextNode,
  CompiledIfNode,
  CompiledEachNode,
  CompiledMarkdownNode,
  CompiledCodeNode,
  CompiledPortalNode,
  CompiledLocalStateNode,
  CompiledExpression,
  CompiledEventHandler,
  CompiledCallExpr,
  CompiledLambdaExpr,
} from '@constela/compiler';
import { isCookieInitialExpr } from '@constela/core';
import type { StreamingRenderOptions } from '@constela/core';
import { escapeHtml } from './utils/escape.js';

// ==================== Constants ====================

/**
 * HTML void elements that should be self-closing
 */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Whitelist of safe array methods
 */
const SAFE_ARRAY_METHODS = new Set([
  'length', 'at', 'includes', 'slice', 'indexOf', 'join',
  'filter', 'map', 'find', 'findIndex', 'some', 'every',
]);

/**
 * Whitelist of safe string methods
 */
const SAFE_STRING_METHODS = new Set([
  'length', 'charAt', 'substring', 'slice', 'split',
  'trim', 'toUpperCase', 'toLowerCase', 'replace',
  'includes', 'startsWith', 'endsWith', 'indexOf',
]);

/**
 * Whitelist of safe Math methods
 */
const SAFE_MATH_METHODS = new Set([
  'min', 'max', 'round', 'floor', 'ceil', 'abs',
  'sqrt', 'pow', 'random', 'sin', 'cos', 'tan',
]);

/**
 * Whitelist of safe Date static methods
 */
const SAFE_DATE_STATIC_METHODS = new Set(['now', 'parse']);

/**
 * Whitelist of safe Date instance methods
 */
const SAFE_DATE_INSTANCE_METHODS = new Set([
  'toISOString', 'toDateString', 'toTimeString',
  'getTime', 'getFullYear', 'getMonth', 'getDate',
  'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
]);

/**
 * Chunk size threshold for immediate flush (in bytes)
 */
const CHUNK_SIZE_THRESHOLD = 1024;

// ==================== Style Types ====================

/**
 * Style preset definition for SSR
 */
interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<Record<string, string> & { class: string }>;
}

// ==================== SSR Context ====================

interface SSRContext {
  state: Map<string, unknown>;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  } | undefined;
  imports?: Record<string, unknown> | undefined;
  styles?: Record<string, StylePreset> | undefined;
}

// ==================== Streaming Context ====================

interface StreamingContext extends SSRContext {
  controller: ReadableStreamDefaultController<string>;
  options: StreamingRenderOptions;
  buffer: string;
  signal?: AbortSignal;
  aborted: boolean;
}

// ==================== Render Options ====================

/**
 * Extended options for streaming render
 */
export interface StreamRenderOptions {
  route?: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    path?: string;
  };
  imports?: Record<string, unknown>;
  styles?: Record<string, StylePreset>;
  stateOverrides?: Record<string, unknown>;
  cookies?: Record<string, string>;
  signal?: AbortSignal;
}

// ==================== HTML Transform Options ====================

/**
 * Options for HTML transform stream
 */
export interface HtmlTransformOptions {
  title: string;
  lang?: string;
  meta?: Record<string, string>;
  stylesheets?: string[];
  scripts?: string[];
}

// ==================== Type Guards ====================

/**
 * Type guard for event handlers
 */
function isEventHandler(value: unknown): value is CompiledEventHandler {
  return (
    typeof value === 'object' &&
    value !== null &&
    'event' in value &&
    'action' in value
  );
}

// ==================== Call Expression Helpers ====================

/**
 * Creates a JavaScript function from a lambda expression
 */
function createLambdaFunction(
  lambda: CompiledLambdaExpr,
  ctx: SSRContext
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
  ctx: SSRContext,
  rawArgs?: CompiledExpression[]
): unknown {
  if (!SAFE_ARRAY_METHODS.has(method)) return undefined;

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
function callStringMethod(target: string, method: string, args: unknown[]): unknown {
  if (!SAFE_STRING_METHODS.has(method)) return undefined;

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
function callMathMethod(method: string, args: unknown[]): unknown {
  if (!SAFE_MATH_METHODS.has(method)) return undefined;

  const numbers = args.filter((a): a is number => typeof a === 'number');

  switch (method) {
    case 'min':
      return numbers.length > 0 ? Math.min(...numbers) : undefined;
    case 'max':
      return numbers.length > 0 ? Math.max(...numbers) : undefined;
    case 'round':
      return numbers[0] !== undefined ? Math.round(numbers[0]) : undefined;
    case 'floor':
      return numbers[0] !== undefined ? Math.floor(numbers[0]) : undefined;
    case 'ceil':
      return numbers[0] !== undefined ? Math.ceil(numbers[0]) : undefined;
    case 'abs':
      return numbers[0] !== undefined ? Math.abs(numbers[0]) : undefined;
    case 'sqrt':
      return numbers[0] !== undefined ? Math.sqrt(numbers[0]) : undefined;
    case 'pow':
      return numbers[0] !== undefined && numbers[1] !== undefined
        ? Math.pow(numbers[0], numbers[1])
        : undefined;
    case 'random':
      return Math.random();
    case 'sin':
      return numbers[0] !== undefined ? Math.sin(numbers[0]) : undefined;
    case 'cos':
      return numbers[0] !== undefined ? Math.cos(numbers[0]) : undefined;
    case 'tan':
      return numbers[0] !== undefined ? Math.tan(numbers[0]) : undefined;
    default:
      return undefined;
  }
}

/**
 * Safely calls a Date static method
 */
function callDateStaticMethod(method: string, args: unknown[]): unknown {
  if (!SAFE_DATE_STATIC_METHODS.has(method)) return undefined;

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
function callDateInstanceMethod(target: Date, method: string): unknown {
  if (!SAFE_DATE_INSTANCE_METHODS.has(method)) return undefined;

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

// ==================== Expression Evaluation ====================

/**
 * Evaluates a compiled expression in SSR context
 */
function evaluate(expr: CompiledExpression, ctx: SSRContext): unknown {
  switch (expr.expr) {
    case 'lit':
      return expr.value;

    case 'state':
      return ctx.state.get(expr.name);

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

      // Traverse path
      for (const part of pathParts) {
        if (value == null) break;
        value = (value as Record<string, unknown>)[part];
      }

      return value;
    }

    case 'bin':
      return evaluateBinary(expr.op, expr.left, expr.right, ctx);

    case 'not':
      return !evaluate(expr.operand, ctx);

    case 'cond':
      return evaluate(expr.if, ctx)
        ? evaluate(expr.then, ctx)
        : evaluate(expr.else, ctx);

    case 'get': {
      const baseValue = evaluate(expr.base, ctx);
      if (baseValue == null) return undefined;

      const pathParts = expr.path.split('.');
      // Prototype pollution prevention
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
        default:
          return '';
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

    case 'data': {
      // Data expressions are resolved from importData (loadedData is merged into importData)
      const dataValue = ctx.imports?.[expr.name];
      if (dataValue === undefined) return undefined;
      if (expr.path) {
        return getNestedValue(dataValue, expr.path);
      }
      return dataValue;
    }

    case 'ref':
      // SSR context: DOM elements don't exist, return null
      return null;

    case 'index': {
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
      const base = evaluate(expr.base, ctx);
      const key = evaluate(expr.key, ctx);
      if (base == null || key == null) return undefined;
      if (typeof key === 'string' && forbiddenKeys.has(key)) return undefined;
      return (base as Record<string | number, unknown>)[key as string | number];
    }

    case 'param': {
      // Param expressions should be resolved during layout composition.
      // If one reaches SSR, it means layoutParams was missing - return undefined.
      return undefined;
    }

    case 'style': {
      return evaluateStyle(expr, ctx);
    }

    case 'concat': {
      return expr.items
        .map((item: CompiledExpression) => {
          const val = evaluate(item, ctx);
          return val == null ? '' : String(val);
        })
        .join('');
    }

    case 'validity': {
      // SSR context: DOM elements don't exist, return false for validity checks
      // Client-side hydration will re-evaluate with actual DOM elements
      return false;
    }

    case 'call': {
      const callExpr = expr as CompiledCallExpr;
      // target が null の場合はグローバルヘルパー関数呼び出し（SSR では未サポート）
      if (callExpr.target === null) {
        return undefined;
      }
      const target = evaluate(callExpr.target, ctx);
      if (target == null) return undefined;

      const args = callExpr.args?.map((arg: CompiledExpression) => {
        if (arg.expr === 'lambda') return arg;
        return evaluate(arg, ctx);
      }) ?? [];

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

      return undefined;
    }

    case 'lambda': {
      // Lambda expressions are not directly evaluated
      // They are passed to array methods and converted to functions there
      return undefined;
    }

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
      // Handle unknown expression types gracefully
      return undefined;
    }
  }
}

/**
 * Gets a nested value from an object using a dot-separated path
 * Handles both object keys and array indices (numeric strings)
 * Includes prototype pollution prevention
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
  const parts = path.split('.');

  let value: unknown = obj;

  for (const part of parts) {
    // Prototype pollution prevention
    if (forbiddenKeys.has(part)) {
      return undefined;
    }

    if (value == null) {
      return undefined;
    }

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

  return value;
}

/**
 * Evaluates binary expressions
 */
function evaluateBinary(
  op: string,
  left: CompiledExpression,
  right: CompiledExpression,
  ctx: SSRContext
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
    case '+':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal + rightVal;
      }
      return String(leftVal) + String(rightVal);
    case '-':
      return (
        (typeof leftVal === 'number' ? leftVal : 0) -
        (typeof rightVal === 'number' ? rightVal : 0)
      );
    case '*':
      return (
        (typeof leftVal === 'number' ? leftVal : 0) *
        (typeof rightVal === 'number' ? rightVal : 0)
      );
    case '/': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      if (divisor === 0) {
        return dividend === 0 ? NaN : dividend > 0 ? Infinity : -Infinity;
      }
      return dividend / divisor;
    }
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '<':
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

// ==================== Style Evaluation ====================

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
 */
function evaluateStyle(expr: StyleExprInput, ctx: SSRContext): string {
  const preset = ctx.styles?.[expr.name];
  if (!preset) return '';

  let classes = preset.base;

  // Apply variants in preset.variants key order for consistency
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

// ==================== Value Formatting ====================

/**
 * Formats a value as a string for text content
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// ==================== Streaming Helpers ====================

/**
 * Flushes the buffer based on the flush strategy
 */
function flush(ctx: StreamingContext, force = false): void {
  if (ctx.aborted) return;

  const { buffer, options, controller } = ctx;

  if (buffer.length === 0) return;

  switch (options.flushStrategy) {
    case 'immediate':
      // Flush immediately when buffer has content
      controller.enqueue(buffer);
      ctx.buffer = '';
      break;

    case 'batched':
      // Flush when buffer exceeds threshold or force is true
      if (force || buffer.length >= CHUNK_SIZE_THRESHOLD) {
        controller.enqueue(buffer);
        ctx.buffer = '';
      }
      break;

    case 'manual':
      // Only flush when forced (at the end)
      if (force) {
        controller.enqueue(buffer);
        ctx.buffer = '';
      }
      break;
  }
}

/**
 * Writes content to the streaming buffer
 */
function write(ctx: StreamingContext, content: string): void {
  if (ctx.aborted) return;
  ctx.buffer += content;
  flush(ctx);
}

/**
 * Checks if streaming should be aborted
 */
function checkAbort(ctx: StreamingContext): boolean {
  if (ctx.signal?.aborted) {
    ctx.aborted = true;
    return true;
  }
  return false;
}

// ==================== Node Rendering (Streaming) ====================

/**
 * Renders a compiled node to the stream
 */
async function renderNodeToStream(node: CompiledNode, ctx: StreamingContext): Promise<void> {
  if (checkAbort(ctx)) return;

  switch (node.kind) {
    case 'element':
      await renderElementToStream(node, ctx);
      break;
    case 'text':
      renderTextToStream(node, ctx);
      break;
    case 'if':
      await renderIfToStream(node, ctx);
      break;
    case 'each':
      await renderEachToStream(node, ctx);
      break;
    case 'markdown':
      await renderMarkdownToStream(node, ctx);
      break;
    case 'code':
      await renderCodeToStream(node, ctx);
      break;
    case 'slot':
      // Slots should be replaced during layout composition
      // If we reach here, render empty (slot content not provided)
      break;
    case 'portal':
      await renderPortalToStream(node as CompiledPortalNode, ctx);
      break;
    case 'localState':
      await renderLocalStateToStream(node as CompiledLocalStateNode, ctx);
      break;
    default: {
      // Handle suspense and other node types
      const unknownNode = node as { kind: string; id?: string; fallback?: CompiledNode; children?: CompiledNode[] };
      if (unknownNode.kind === 'suspense') {
        await renderSuspenseToStream(unknownNode as CompiledSuspenseNode, ctx);
      }
      // Unknown node types are silently ignored
    }
  }
}

/**
 * Suspense node type (for future implementation)
 */
interface CompiledSuspenseNode {
  kind: 'suspense';
  id: string;
  fallback: CompiledNode;
  children: CompiledNode[];
}

/**
 * Renders a suspense node to the stream
 */
async function renderSuspenseToStream(node: CompiledSuspenseNode, ctx: StreamingContext): Promise<void> {
  // Render the suspense boundary with a marker
  write(ctx, '<div data-suspense-id="' + escapeHtml(node.id) + '">');

  // Render fallback content first
  await renderNodeToStream(node.fallback, ctx);

  write(ctx, '</div>');

  // Then render the resolved content (in a real implementation, this would be async)
  // For now, we render children immediately after fallback
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await renderNodeToStream(child, ctx);
    }
  }
}

/**
 * Renders an element node to the stream
 */
async function renderElementToStream(node: CompiledElementNode, ctx: StreamingContext): Promise<void> {
  if (checkAbort(ctx)) return;

  const tag = node.tag;
  const isVoid = VOID_ELEMENTS.has(tag);

  // Build attributes string
  let attrs = '';
  if (node.props) {
    for (const [propName, propValue] of Object.entries(node.props)) {
      // Skip event handlers in SSR
      if (isEventHandler(propValue)) {
        continue;
      }

      const value = evaluate(propValue as CompiledExpression, ctx);

      // Handle boolean attributes
      if (value === false) {
        continue;
      }
      if (value === true) {
        attrs += ' ' + propName;
        continue;
      }

      // Skip null/undefined
      if (value === null || value === undefined) {
        continue;
      }

      // Regular attribute with escaped value
      attrs += ' ' + propName + '="' + escapeHtml(String(value)) + '"';
    }
  }

  // Void elements are self-closing
  if (isVoid) {
    write(ctx, '<' + tag + attrs + ' />');
    return;
  }

  // Write opening tag
  write(ctx, '<' + tag + attrs + '>');

  // Render children
  if (node.children) {
    for (const child of node.children) {
      await renderNodeToStream(child, ctx);
    }
  }

  // Write closing tag
  write(ctx, '</' + tag + '>');
}

/**
 * Renders a text node to the stream
 */
function renderTextToStream(node: CompiledTextNode, ctx: StreamingContext): void {
  const value = evaluate(node.value, ctx);
  write(ctx, escapeHtml(formatValue(value)));
}

/**
 * Renders an if node to the stream
 */
async function renderIfToStream(node: CompiledIfNode, ctx: StreamingContext): Promise<void> {
  if (checkAbort(ctx)) return;

  const condition = evaluate(node.condition, ctx);

  if (condition) {
    write(ctx, '<!--if:then-->');
    await renderNodeToStream(node.then, ctx);
  } else if (node.else) {
    write(ctx, '<!--if:else-->');
    await renderNodeToStream(node.else, ctx);
  } else {
    write(ctx, '<!--if:none-->');
  }
}

/**
 * Renders an each node to the stream
 */
async function renderEachToStream(node: CompiledEachNode, ctx: StreamingContext): Promise<void> {
  if (checkAbort(ctx)) return;

  const items = evaluate(node.items, ctx);

  if (!Array.isArray(items)) {
    return;
  }

  for (let index = 0; index < items.length; index++) {
    if (checkAbort(ctx)) return;

    const item = items[index];
    const itemLocals: Record<string, unknown> = {
      ...ctx.locals,
      [node.as]: item,
    };
    if (node.index) {
      itemLocals[node.index] = index;
    }

    const itemCtx: StreamingContext = {
      ...ctx,
      locals: itemLocals,
    };

    await renderNodeToStream(node.body, itemCtx);

    // Flush after each item for large arrays (streaming effect)
    if (index > 0 && index % 10 === 0) {
      flush(ctx);
    }
  }
}

/**
 * Renders a markdown node to the stream
 */
async function renderMarkdownToStream(node: CompiledMarkdownNode, ctx: StreamingContext): Promise<void> {
  const content = evaluate(node.content, ctx);
  // For streaming, we'll render a placeholder with the markdown content
  // The actual markdown parsing would need to be done client-side or with a streaming markdown parser
  write(ctx, '<div class="constela-markdown">' + escapeHtml(formatValue(content)) + '</div>');
}

/**
 * Renders a code node to the stream
 */
async function renderCodeToStream(node: CompiledCodeNode, ctx: StreamingContext): Promise<void> {
  const language = formatValue(evaluate(node.language, ctx));
  const content = formatValue(evaluate(node.content, ctx));

  const languageBadge = language
    ? '<div class="absolute right-12 top-3 z-10 rounded bg-muted-foreground/20 px-2 py-0.5 text-xs font-medium text-muted-foreground">' + escapeHtml(language) + '</div>'
    : '';

  const copyButton = '<button class="constela-copy-btn absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/80 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100" data-copy-target="code" aria-label="Copy code"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>';

  write(ctx, '<div class="constela-code" data-code-content="' + escapeHtml(content) + '"><div class="group relative">' + languageBadge + copyButton + '<pre><code>' + escapeHtml(content) + '</code></pre></div></div>');
}

/**
 * Renders a portal node to the stream
 */
async function renderPortalToStream(node: CompiledPortalNode, ctx: StreamingContext): Promise<void> {
  // In SSR, we render portal content inline with a marker
  write(ctx, '<!--portal:' + node.target + '-->');

  for (const child of node.children) {
    await renderNodeToStream(child, ctx);
  }

  write(ctx, '<!--/portal-->');
}

/**
 * Renders a local state node to the stream
 */
async function renderLocalStateToStream(node: CompiledLocalStateNode, ctx: StreamingContext): Promise<void> {
  // Create a map of local state with initial values (evaluate expressions)
  const localStateValues: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(node.state)) {
    const initial = (field as { initial: unknown }).initial;
    // field.initial may be a CompiledExpression or a literal value
    if (initial && typeof initial === 'object' && 'expr' in (initial as object)) {
      localStateValues[name] = evaluate(initial as CompiledExpression, ctx);
    } else {
      localStateValues[name] = initial;
    }
  }

  // Create a new context with local state merged into locals
  const childCtx: StreamingContext = {
    ...ctx,
    locals: {
      ...ctx.locals,
      ...localStateValues,
    },
  };

  // Render the child node with the new context
  await renderNodeToStream(node.child, childCtx);
}

// ==================== Main Export: renderToStream ====================

/**
 * Renders a CompiledProgram to a ReadableStream.
 *
 * @param program - The compiled program to render
 * @param streamOptions - Streaming options (flush strategy, etc.)
 * @param options - Optional render options including route context
 * @returns ReadableStream of HTML strings
 */
export function renderToStream(
  program: CompiledProgram,
  streamOptions: StreamingRenderOptions,
  options?: StreamRenderOptions
): ReadableStream<string> {
  // Initialize state from program's initial values, with optional overrides
  const state = new Map<string, unknown>();
  for (const [name, field] of Object.entries(program.state)) {
    const stateField = field as { type: string; initial: unknown };
    const overrideValue = options?.stateOverrides?.[name];
    if (overrideValue !== undefined) {
      state.set(name, overrideValue);
    } else if (isCookieInitialExpr(stateField.initial)) {
      const cookieInitial = stateField.initial as { key: string; default: string };
      const cookieValue = options?.cookies?.[cookieInitial.key];
      state.set(name, cookieValue !== undefined ? cookieValue : cookieInitial.default);
    } else {
      state.set(name, stateField.initial);
    }
  }

  const signal = options?.signal;

  return new ReadableStream<string>({
    async start(controller) {
      const baseCtx = {
        state,
        locals: {},
        route: options?.route
          ? {
              params: options.route.params ?? {},
              query: options.route.query ?? {},
              path: options.route.path ?? '',
            }
          : undefined,
        imports: options?.imports ?? program.importData,
        styles: options?.styles,
        controller,
        options: streamOptions,
        buffer: '',
        aborted: false,
      };
      const ctx: StreamingContext = signal
        ? { ...baseCtx, signal }
        : baseCtx;

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          ctx.aborted = true;
          try {
            controller.close();
          } catch {
            // Controller may already be closed
          }
        });
      }

      try {
        await renderNodeToStream(program.view, ctx);

        // Flush any remaining content
        flush(ctx, true);

        if (!ctx.aborted) {
          controller.close();
        }
      } catch (error) {
        if (!ctx.aborted) {
          controller.error(error);
        }
      }
    },

    cancel() {
      // Stream was cancelled by the consumer
    },
  });
}

// ==================== Main Export: createHtmlTransformStream ====================

/**
 * Creates a TransformStream that wraps content with HTML document structure.
 *
 * @param options - HTML document options (title, meta, stylesheets, scripts)
 * @returns TransformStream that wraps content with HTML structure
 */
export function createHtmlTransformStream(options: HtmlTransformOptions): TransformStream<string, string> {
  let isFirstChunk = true;

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      if (isFirstChunk) {
        // Emit document shell before first chunk
        const shell = buildDocumentShell(options);
        controller.enqueue(shell + chunk);
        isFirstChunk = false;
      } else {
        controller.enqueue(chunk);
      }
    },

    flush(controller) {
      // Emit closing tags
      const scripts = buildScriptTags(options.scripts);
      controller.enqueue(scripts + '</body></html>');
    },
  });
}

/**
 * Builds the HTML document shell (DOCTYPE, html, head, body opening)
 */
function buildDocumentShell(options: HtmlTransformOptions): string {
  const lang = options.lang ?? 'en';

  let head = '<head>';
  head += '<meta charset="UTF-8">';
  head += '<title>' + escapeHtml(options.title) + '</title>';

  // Add meta tags
  if (options.meta) {
    for (const [name, content] of Object.entries(options.meta)) {
      head += '<meta name="' + escapeHtml(name) + '" content="' + escapeHtml(content) + '">';
    }
  }

  // Add stylesheet links
  if (options.stylesheets) {
    for (const href of options.stylesheets) {
      head += '<link rel="stylesheet" href="' + escapeHtml(href) + '">';
    }
  }

  head += '</head>';

  return '<!DOCTYPE html><html lang="' + escapeHtml(lang) + '">' + head + '<body>';
}

/**
 * Builds script tags for the document
 */
function buildScriptTags(scripts?: string[]): string {
  if (!scripts || scripts.length === 0) return '';

  return scripts
    .map(src => '<script src="' + escapeHtml(src) + '"></script>')
    .join('');
}