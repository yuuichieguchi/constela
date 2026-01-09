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
  CompiledExpression,
  CompiledEventHandler,
} from '@constela/compiler';
import { parseMarkdownSSR } from './markdown.js';
import { renderCodeSSR } from './code.js';
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

// ==================== SSR Context ====================

interface SSRContext {
  state: Map<string, unknown>;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
  imports?: Record<string, unknown>;
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

    case 'ref':
      // SSR context: DOM elements don't exist, return null
      return null;

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
      return renderMarkdown(node, ctx);
    case 'code':
      return await renderCode(node, ctx);
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
    return await renderNode(node.then, ctx);
  }

  if (node.else) {
    return await renderNode(node.else, ctx);
  }

  return '';
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
function renderMarkdown(node: CompiledMarkdownNode, ctx: SSRContext): string {
  const content = evaluate(node.content, ctx);
  const html = parseMarkdownSSR(formatValue(content));
  return `<div class="constela-markdown">${html}</div>`;
}

/**
 * Renders a code node to HTML string
 */
async function renderCode(node: CompiledCodeNode, ctx: SSRContext): Promise<string> {
  const language = formatValue(evaluate(node.language, ctx));
  const content = formatValue(evaluate(node.content, ctx));
  const html = await renderCodeSSR(content, language);
  return `<div class="constela-code">${html}</div>`;
}

// ==================== Main Export ====================

/**
 * Renders a CompiledProgram to an HTML string.
 *
 * @param program - The compiled program to render
 * @returns Promise that resolves to HTML string representation
 */
export async function renderToString(program: CompiledProgram): Promise<string> {
  // Initialize state from program's initial values
  const state = new Map<string, unknown>();
  for (const [name, field] of Object.entries(program.state)) {
    state.set(name, field.initial);
  }

  const ctx: SSRContext = {
    state,
    locals: {},
  };

  return await renderNode(program.view, ctx);
}
