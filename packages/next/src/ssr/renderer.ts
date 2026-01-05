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
  CompiledExpression,
  CompiledEventHandler,
} from '@constela/compiler';
import { escapeHtml } from '../utils/escape.js';

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

    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
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
function renderNode(node: CompiledNode, ctx: SSRContext): string {
  switch (node.kind) {
    case 'element':
      return renderElement(node, ctx);
    case 'text':
      return renderText(node, ctx);
    case 'if':
      return renderIf(node, ctx);
    case 'each':
      return renderEach(node, ctx);
    default: {
      const _exhaustiveCheck: never = node;
      throw new Error(`Unknown node kind: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Renders an element node to HTML string
 */
function renderElement(node: CompiledElementNode, ctx: SSRContext): string {
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
      childrenHtml += renderNode(child, ctx);
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
function renderIf(node: CompiledIfNode, ctx: SSRContext): string {
  const condition = evaluate(node.condition, ctx);

  if (condition) {
    return renderNode(node.then, ctx);
  }

  if (node.else) {
    return renderNode(node.else, ctx);
  }

  return '';
}

/**
 * Renders an each node to HTML string
 */
function renderEach(node: CompiledEachNode, ctx: SSRContext): string {
  const items = evaluate(node.items, ctx);

  if (!Array.isArray(items)) {
    return '';
  }

  let result = '';
  items.forEach((item, index) => {
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

    result += renderNode(node.body, itemCtx);
  });

  return result;
}

// ==================== Main Export ====================

/**
 * Renders a CompiledProgram to an HTML string.
 *
 * @param program - The compiled program to render
 * @returns HTML string representation
 */
export function renderToString(program: CompiledProgram): string {
  // Initialize state from program's initial values
  const state = new Map<string, unknown>();
  for (const [name, field] of Object.entries(program.state)) {
    state.set(name, field.initial);
  }

  const ctx: SSRContext = {
    state,
    locals: {},
  };

  return renderNode(program.view, ctx);
}
