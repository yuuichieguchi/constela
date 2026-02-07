/**
 * SSR Renderer
 *
 * Renders CompiledProgram to HTML string for Server-Side Rendering.
 * Uses the unified evaluate module from @constela/core.
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
} from '@constela/compiler';
import { isCookieInitialExpr, evaluate as coreEvaluate } from '@constela/core';
import type { StylePreset } from '@constela/core';
import { parseMarkdownSSRAsync } from './markdown.js';
import { renderCodeSSR } from './code.js';
import { escapeHtml } from './utils/escape.js';
import { toCoreContext, VOID_ELEMENTS, formatValue } from './shared.js';
import type { SSRContext } from './shared.js';

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

      const value = coreEvaluate(propValue as CompiledExpression, toCoreContext(ctx));

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
  const value = coreEvaluate(node.value, toCoreContext(ctx));
  return escapeHtml(formatValue(value));
}

/**
 * Renders an if node to HTML string
 */
async function renderIf(node: CompiledIfNode, ctx: SSRContext): Promise<string> {
  const condition = coreEvaluate(node.condition, toCoreContext(ctx));

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
  const items = coreEvaluate(node.items, toCoreContext(ctx));

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
  const content = coreEvaluate(node.content, toCoreContext(ctx));
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
  const coreCtx = toCoreContext(ctx);
  const language = formatValue(coreEvaluate(node.language, coreCtx));
  const content = formatValue(coreEvaluate(node.content, coreCtx));

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
  // Create a map of local state with initial values (evaluate expressions)
  const localStateValues: Record<string, unknown> = {};
  const progressiveLocals = { ...ctx.locals };
  for (const [name, field] of Object.entries(node.state)) {
    // field.initial may be a CompiledExpression or a literal value
    const initial = field.initial;
    if (initial && typeof initial === 'object' && 'expr' in initial) {
      const evalCtx: SSRContext = { ...ctx, locals: progressiveLocals };
      localStateValues[name] = coreEvaluate(initial as CompiledExpression, toCoreContext(evalCtx));
    } else {
      localStateValues[name] = initial;
    }
    progressiveLocals[name] = localStateValues[name];
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
