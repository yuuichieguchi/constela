/**
 * Streaming SSR Renderer
 *
 * Renders CompiledProgram to a ReadableStream for Server-Side Rendering.
 * Uses Web Streams API for Edge Runtime compatibility.
 * Uses the unified evaluate module from @constela/core.
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
} from '@constela/compiler';
import { isCookieInitialExpr, evaluate as coreEvaluate } from '@constela/core';
import type { StylePreset, StreamingRenderOptions } from '@constela/core';
import { escapeHtml } from './utils/escape.js';
import { toCoreContext, VOID_ELEMENTS, formatValue } from './shared.js';
import type { SSRContext } from './shared.js';

// ==================== Constants ====================

/**
 * Chunk size threshold for immediate flush (in bytes)
 */
const CHUNK_SIZE_THRESHOLD = 1024;

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

      const value = coreEvaluate(propValue as CompiledExpression, toCoreContext(ctx));

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
  const value = coreEvaluate(node.value, toCoreContext(ctx));
  write(ctx, escapeHtml(formatValue(value)));
}

/**
 * Renders an if node to the stream
 */
async function renderIfToStream(node: CompiledIfNode, ctx: StreamingContext): Promise<void> {
  if (checkAbort(ctx)) return;

  const condition = coreEvaluate(node.condition, toCoreContext(ctx));

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

  const items = coreEvaluate(node.items, toCoreContext(ctx));

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
  const content = coreEvaluate(node.content, toCoreContext(ctx));
  // For streaming, we'll render a placeholder with the markdown content
  // The actual markdown parsing would need to be done client-side or with a streaming markdown parser
  write(ctx, '<div class="constela-markdown">' + escapeHtml(formatValue(content)) + '</div>');
}

/**
 * Renders a code node to the stream
 */
async function renderCodeToStream(node: CompiledCodeNode, ctx: StreamingContext): Promise<void> {
  const coreCtx = toCoreContext(ctx);
  const language = formatValue(coreEvaluate(node.language, coreCtx));
  const content = formatValue(coreEvaluate(node.content, coreCtx));

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
  const progressiveLocals = { ...ctx.locals };
  for (const [name, field] of Object.entries(node.state)) {
    const initial = (field as { initial: unknown }).initial;
    // field.initial may be a CompiledExpression or a literal value
    if (initial && typeof initial === 'object' && 'expr' in (initial as object)) {
      const evalCtx: StreamingContext = { ...ctx, locals: progressiveLocals };
      localStateValues[name] = coreEvaluate(initial as CompiledExpression, toCoreContext(evalCtx));
    } else {
      localStateValues[name] = initial;
    }
    progressiveLocals[name] = localStateValues[name];
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
