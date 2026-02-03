/**
 * SSR Renderer
 *
 * Renders CompiledProgram to HTML string for Server-Side Rendering.
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
  CompiledIslandNode,
  CompiledSuspenseNode,
  CompiledErrorBoundaryNode,
  CompiledExpression,
  CompiledEventHandler,
  CompiledCallExpr,
  CompiledLambdaExpr,
} from '@constela/compiler';
import { isCookieInitialExpr } from '@constela/core';
import { parseMarkdownSSRAsync } from './markdown.js';
import { renderCodeSSR } from './code.js';
import { escapeHtml } from './utils/escape.js';

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
        .map(item => {
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

    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustiveCheck)}`);
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
 *
 * @param expr - The style expression to evaluate
 * @param ctx - The evaluation context containing styles presets
 * @returns The computed CSS class string, or empty string if preset not found
 */
function evaluateStyle(expr: StyleExprInput, ctx: SSRContext): string {
  const preset = ctx.styles?.[expr.name];
  if (!preset) return '';

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

// ==================== Node Rendering ====================

/**
 * Renders a compiled node to HTML string
 */
async function renderNode(node: CompiledNode, ctx: SSRContext): Promise<string> {
  switch (node.kind) {
    case 'element':
      return await renderElement(node, ctx);
    case 'text':
      return renderText(node, ctx);
    case 'if':
      return await renderIf(node, ctx);
    case 'each':
      return await renderEach(node, ctx);
    case 'markdown':
      return await renderMarkdown(node, ctx);
    case 'code':
      return await renderCode(node, ctx);
    case 'slot':
      // Slots should be replaced during layout composition
      // If we reach here, render empty (slot content not provided)
      return '';
    case 'portal':
      // In SSR, portal children are rendered inline since we can't manipulate DOM
      return await renderPortal(node as CompiledPortalNode, ctx);
    case 'localState':
      return await renderLocalState(node as CompiledLocalStateNode, ctx);
    case 'island':
      // Render island content with SSR, client will hydrate
      return await renderIsland(node as CompiledIslandNode, ctx);
    case 'suspense':
      // In SSR, render content immediately (fallback is for loading states)
      return await renderNode((node as CompiledSuspenseNode).content, ctx);
    case 'errorBoundary':
      // In SSR, render content (error boundaries are client-side only)
      return await renderNode((node as CompiledErrorBoundaryNode).content, ctx);
    default: {
      const _exhaustiveCheck: never = node;
      throw new Error(`Unknown node kind: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Renders an element node to HTML string
 */
async function renderElement(node: CompiledElementNode, ctx: SSRContext): Promise<string> {
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
        attrs += ` ${propName}`;
        continue;
      }

      // Skip null/undefined
      if (value === null || value === undefined) {
        continue;
      }

      // Regular attribute with escaped value
      attrs += ` ${propName}="${escapeHtml(String(value))}"`;
    }
  }

  // Void elements are self-closing
  if (isVoid) {
    return `<${tag}${attrs} />`;
  }

  // Render children
  let childrenHtml = '';
  if (node.children) {
    for (const child of node.children) {
      childrenHtml += await renderNode(child, ctx);
    }
  }

  return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
}

/**
 * Renders a text node to HTML string
 */
function renderText(node: CompiledTextNode, ctx: SSRContext): string {
  const value = evaluate(node.value, ctx);
  return escapeHtml(formatValue(value));
}

/**
 * Renders an if node to HTML string
 */
async function renderIf(node: CompiledIfNode, ctx: SSRContext): Promise<string> {
  const condition = evaluate(node.condition, ctx);

  if (condition) {
    const content = await renderNode(node.then, ctx);
    return `<!--if:then-->${content}`;
  }

  if (node.else) {
    const content = await renderNode(node.else, ctx);
    return `<!--if:else-->${content}`;
  }

  return '<!--if:none-->';
}

/**
 * Renders an each node to HTML string
 */
async function renderEach(node: CompiledEachNode, ctx: SSRContext): Promise<string> {
  const items = evaluate(node.items, ctx);

  if (!Array.isArray(items)) {
    return '';
  }

  let result = '';
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const itemLocals: Record<string, unknown> = {
      ...ctx.locals,
      [node.as]: item,
    };
    if (node.index) {
      itemLocals[node.index] = index;
    }

    const itemCtx: SSRContext = {
      ...ctx,
      locals: itemLocals,
    };

    result += await renderNode(node.body, itemCtx);
  }

  return result;
}

/**
 * Renders a markdown node to HTML string
 */
async function renderMarkdown(node: CompiledMarkdownNode, ctx: SSRContext): Promise<string> {
  const content = evaluate(node.content, ctx);
  const html = await parseMarkdownSSRAsync(formatValue(content));
  return `<div class="constela-markdown">${html}</div>`;
}

/**
 * Renders a code node to HTML string
 * Matches the structure of the original React CodePreview component:
 * - group relative wrapper with constela-code class
 * - language badge + copy button in top-right corner
 * - pre/code with appropriate styling (with syntax highlighting)
 */
async function renderCode(node: CompiledCodeNode, ctx: SSRContext): Promise<string> {
  const language = formatValue(evaluate(node.language, ctx));
  const content = formatValue(evaluate(node.content, ctx));

  // Get syntax-highlighted code from renderCodeSSR
  const highlightedCode = await renderCodeSSR(content, language);

  const languageBadge = language
    ? `<div class="absolute right-12 top-3 z-10 rounded bg-muted-foreground/20 px-2 py-0.5 text-xs font-medium text-muted-foreground">${escapeHtml(language)}</div>`
    : '';

  const copyButton = `<button class="constela-copy-btn absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/80 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100" data-copy-target="code" aria-label="Copy code"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;

  return `<div class="constela-code" data-code-content="${escapeHtml(content)}"><div class="group relative">${languageBadge}${copyButton}${highlightedCode}</div></div>`;
}

/**
 * Renders a portal node to HTML string
 *
 * In SSR context, portal children are rendered inline as a comment marker
 * followed by the children content. The client-side hydration will handle
 * moving the content to the target location.
 */
async function renderPortal(node: CompiledPortalNode, ctx: SSRContext): Promise<string> {
  // Render children
  const childrenHtml = await Promise.all(
    node.children.map(child => renderNode(child, ctx))
  );

  // In SSR, we render portal content inline with a marker
  // The client will move it to the target during hydration
  return `<!--portal:${node.target}-->${childrenHtml.join('')}<!--/portal-->`;
}

/**
 * Renders a local state node to HTML string
 *
 * In SSR context, local state is rendered with initial values.
 * The local state is made available to the child node via the context.
 */
async function renderLocalState(node: CompiledLocalStateNode, ctx: SSRContext): Promise<string> {
  // Create a map of local state with initial values
  const localStateValues: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(node.state)) {
    localStateValues[name] = field.initial;
  }

  // Create a new context with local state merged into locals
  // Local state takes precedence over parent locals for same-named keys
  const childCtx: SSRContext = {
    ...ctx,
    locals: {
      ...ctx.locals,
      ...localStateValues,
    },
  };

  // Render the child node with the new context
  return await renderNode(node.child, childCtx);
}

/**
 * Renders an island node to HTML string
 *
 * Islands are rendered with their content during SSR, wrapped in a marker
 * element that the client-side runtime can hydrate.
 */
async function renderIsland(node: CompiledIslandNode, ctx: SSRContext): Promise<string> {
  // Create island state values if present
  const islandStateValues: Record<string, unknown> = {};
  if (node.state) {
    for (const [name, field] of Object.entries(node.state)) {
      islandStateValues[name] = field.initial;
    }
  }

  // Create a new context with island state merged into state
  // Island state takes precedence over global state for same-named keys
  // Note: ctx.state is a Map, so we need to create a new Map and merge values
  const islandState = new Map(ctx.state);
  for (const [name, value] of Object.entries(islandStateValues)) {
    islandState.set(name, value);
  }

  const islandCtx: SSRContext = {
    ...ctx,
    state: islandState,
  };

  // Render the island content
  const content = await renderNode(node.content, islandCtx);

  // Build data attributes for hydration
  const dataAttrs = [
    `data-island-id="${escapeHtml(node.id)}"`,
    `data-island-strategy="${escapeHtml(node.strategy)}"`,
  ];

  // Add strategy options if present
  if (node.strategyOptions) {
    dataAttrs.push(`data-island-options="${escapeHtml(JSON.stringify(node.strategyOptions))}"`);
  }

  // Add initial state if present for client hydration
  if (node.state) {
    dataAttrs.push(`data-island-state="${escapeHtml(JSON.stringify(islandStateValues))}"`);
  }

  // Wrap content in a div with island marker attributes
  return `<div ${dataAttrs.join(' ')}>${content}</div>`;
}

// ==================== Main Export ====================

/**
 * Options for renderToString
 */
export interface RenderOptions {
  route?: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    path?: string;
  };
  imports?: Record<string, unknown>;
  styles?: Record<string, StylePreset>;
  stateOverrides?: Record<string, unknown>;
  cookies?: Record<string, string>;
}

/**
 * Renders a CompiledProgram to an HTML string.
 *
 * @param program - The compiled program to render
 * @param options - Optional render options including route context
 * @returns Promise that resolves to HTML string representation
 */
export async function renderToString(
  program: CompiledProgram,
  options?: RenderOptions
): Promise<string> {
  // Initialize state from program's initial values, with optional overrides
  const state = new Map<string, unknown>();
  for (const [name, field] of Object.entries(program.state)) {
    const overrideValue = options?.stateOverrides?.[name];
    if (overrideValue !== undefined) {
      state.set(name, overrideValue);
    } else if (isCookieInitialExpr(field.initial)) {
      const cookieValue = options?.cookies?.[field.initial.key];
      state.set(name, cookieValue !== undefined ? cookieValue : field.initial.default);
    } else {
      state.set(name, field.initial);
    }
  }

  const ctx: SSRContext = {
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
  };

  return await renderNode(program.view, ctx);
}
