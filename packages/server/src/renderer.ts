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
import { parseMarkdownSSRAsync } from './markdown.js';
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
  } | undefined;
  imports?: Record<string, unknown> | undefined;
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
      return await renderMarkdown(node, ctx);
    case 'code':
      return await renderCode(node, ctx);
    case 'slot':
      // Slots should be replaced during layout composition
      // If we reach here, render empty (slot content not provided)
      return '';
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
  // Initialize state from program's initial values
  const state = new Map<string, unknown>();
  for (const [name, field] of Object.entries(program.state)) {
    state.set(name, field.initial);
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
  };

  return await renderNode(program.view, ctx);
}
