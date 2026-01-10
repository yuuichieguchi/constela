/**
 * Renderer - DOM rendering for compiled view nodes
 * 
 * Renders:
 * - element: Creates DOM elements with props and event handlers
 * - text: Creates text nodes
 * - if: Conditional rendering with reactive updates
 * - each: List rendering with reactive updates
 */

import type { StateStore } from '../state/store.js';
import type {
  CompiledNode,
  CompiledElementNode,
  CompiledTextNode,
  CompiledIfNode,
  CompiledEachNode,
  CompiledMarkdownNode,
  CompiledCodeNode,
  CompiledAction,
  CompiledExpression,
  CompiledEventHandler,
} from '@constela/compiler';
import { parseMarkdown } from './markdown.js';
import { highlightCode } from './code.js';
import { createEffect } from '../reactive/effect.js';
import { evaluate } from '../expression/evaluator.js';
import { executeAction } from '../action/executor.js';

export interface RenderContext {
  state: StateStore;
  actions: Record<string, CompiledAction>;
  locals: Record<string, unknown>;
  imports?: Record<string, unknown>;
  cleanups?: (() => void)[];
  refs?: Record<string, Element>;
}

// Type guard for event handlers
function isEventHandler(value: unknown): value is CompiledEventHandler {
  return (
    typeof value === 'object' &&
    value !== null &&
    'event' in value &&
    'action' in value
  );
}

export function render(node: CompiledNode, ctx: RenderContext): Node {
  switch (node.kind) {
    case 'element':
      return renderElement(node, ctx);
    case 'text':
      return renderText(node, ctx);
    case 'if':
      return renderIf(node, ctx);
    case 'each':
      return renderEach(node, ctx);
    case 'markdown':
      return renderMarkdown(node, ctx);
    case 'code':
      return renderCode(node, ctx);
    default:
      throw new Error('Unknown node kind');
  }
}

function renderElement(node: CompiledElementNode, ctx: RenderContext): HTMLElement {
  const el = document.createElement(node.tag);

  // Collect ref if specified
  if (node.ref && ctx.refs) {
    if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production' && ctx.refs[node.ref]) {
      console.warn(`Duplicate ref name "${node.ref}" detected. The later element will overwrite the earlier one.`);
    }
    ctx.refs[node.ref] = el;
  }

  // Apply props
  if (node.props) {
    for (const [propName, propValue] of Object.entries(node.props)) {
      if (isEventHandler(propValue)) {
        // Bind event handler
        const handler = propValue;
        const eventName = handler.event;
        el.addEventListener(eventName, async (event) => {
          const action = ctx.actions[handler.action];
          if (action) {
            // Create event-specific locals
            const eventLocals: Record<string, unknown> = {};
            const target = event.target;

            // Extract value for input-like elements
            if (target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement) {
              eventLocals['value'] = target.value;

              // Also provide checked for checkbox inputs
              if (target instanceof HTMLInputElement && target.type === 'checkbox') {
                eventLocals['checked'] = target.checked;
              }
            }

            // Evaluate payload with event locals merged into context locals
            let payload: unknown = undefined;
            if (handler.payload) {
              payload = evaluate(handler.payload, {
                state: ctx.state,
                locals: { ...ctx.locals, ...eventLocals },
                ...(ctx.imports && { imports: ctx.imports })
              });
            }

            const actionCtx = {
              state: ctx.state,
              actions: ctx.actions,
              locals: { ...ctx.locals, ...eventLocals, payload },
              eventPayload: payload,
            };
            await executeAction(action, actionCtx);
          }
        });
      } else {
        // Apply prop with effect for reactivity
        const cleanup = createEffect(() => {
          const value = evaluate(propValue as CompiledExpression, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) });
          applyProp(el, propName, value);
        });
        ctx.cleanups?.push(cleanup);
      }
    }
  }

  // Render children
  if (node.children) {
    for (const child of node.children) {
      const childNode = render(child, ctx);
      el.appendChild(childNode);
    }
  }

  return el;
}

function applyProp(el: HTMLElement, propName: string, value: unknown): void {
  // Handle special props
  if (propName === 'className') {
    el.className = String(value ?? '');
  } else if (propName === 'style' && typeof value === 'string') {
    el.setAttribute('style', value);
  } else if (propName === 'disabled') {
    if (value) {
      el.setAttribute('disabled', 'disabled');
      (el as HTMLButtonElement | HTMLInputElement).disabled = true;
    } else {
      el.removeAttribute('disabled');
      (el as HTMLButtonElement | HTMLInputElement).disabled = false;
    }
  } else if (propName === 'value' && el instanceof HTMLInputElement) {
    el.value = String(value ?? '');
  } else if (propName.startsWith('data-')) {
    el.setAttribute(propName, String(value ?? ''));
  } else {
    // Generic attribute
    if (value === true) {
      el.setAttribute(propName, '');
    } else if (value === false || value === null || value === undefined) {
      el.removeAttribute(propName);
    } else {
      el.setAttribute(propName, String(value));
    }
  }
}

function renderText(node: CompiledTextNode, ctx: RenderContext): Text {
  const textNode = document.createTextNode('');

  const cleanup = createEffect(() => {
    const value = evaluate(node.value, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) });
    textNode.textContent = formatValue(value);
  });
  ctx.cleanups?.push(cleanup);

  return textNode;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function renderIf(node: CompiledIfNode, ctx: RenderContext): Node {
  // Use a DocumentFragment as container
  const anchor = document.createComment('if');
  let currentNode: Node | null = null;
  let currentBranch: 'then' | 'else' | 'none' = 'none';
  let branchCleanups: (() => void)[] = [];

  const effectCleanup = createEffect(() => {
    const condition = evaluate(node.condition, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) });
    const shouldShowThen = Boolean(condition);
    const newBranch = shouldShowThen ? 'then' : (node.else ? 'else' : 'none');

    if (newBranch !== currentBranch) {
      // Cleanup previous branch effects
      for (const cleanup of branchCleanups) {
        cleanup();
      }
      branchCleanups = [];

      // Remove current node
      if (currentNode && currentNode.parentNode) {
        currentNode.parentNode.removeChild(currentNode);
      }

      // Create a local cleanups array for the new branch
      const localCleanups: (() => void)[] = [];
      const branchCtx: RenderContext = { ...ctx, cleanups: localCleanups };

      // Render new branch
      if (newBranch === 'then') {
        currentNode = render(node.then, branchCtx);
        branchCleanups = localCleanups;
      } else if (newBranch === 'else' && node.else) {
        currentNode = render(node.else, branchCtx);
        branchCleanups = localCleanups;
      } else {
        currentNode = null;
      }

      // Insert after anchor
      if (currentNode && anchor.parentNode) {
        anchor.parentNode.insertBefore(currentNode, anchor.nextSibling);
      }

      currentBranch = newBranch;
    }
  });
  ctx.cleanups?.push(effectCleanup);

  // Also push a cleanup that handles the branch cleanups when the if node itself is destroyed
  ctx.cleanups?.push(() => {
    for (const cleanup of branchCleanups) {
      cleanup();
    }
  });

  // Return a fragment containing anchor and initial content
  const fragment = document.createDocumentFragment();
  fragment.appendChild(anchor);
  if (currentNode) {
    fragment.appendChild(currentNode);
  }

  return fragment;
}

function renderEach(node: CompiledEachNode, ctx: RenderContext): Node {
  const anchor = document.createComment('each');
  let currentNodes: Node[] = [];
  let itemCleanups: (() => void)[] = [];

  const effectCleanup = createEffect(() => {
    const items = evaluate(node.items, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) }) as unknown[];

    // Cleanup previous item effects
    for (const cleanup of itemCleanups) {
      cleanup();
    }
    itemCleanups = [];

    // Remove old nodes
    for (const oldNode of currentNodes) {
      if (oldNode.parentNode) {
        oldNode.parentNode.removeChild(oldNode);
      }
    }
    currentNodes = [];

    // Render new items
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const itemLocals: Record<string, unknown> = {
          ...ctx.locals,
          [node.as]: item,
        };
        if (node.index) {
          itemLocals[node.index] = index;
        }

        // Create a local cleanups array for this item
        const localCleanups: (() => void)[] = [];
        const itemCtx: RenderContext = {
          ...ctx,
          locals: itemLocals,
          cleanups: localCleanups,
        };

        const itemNode = render(node.body, itemCtx);
        currentNodes.push(itemNode);
        // Collect all cleanups for this item into itemCleanups
        itemCleanups.push(...localCleanups);

        // Insert after anchor or last item
        if (anchor.parentNode) {
          let refNode: Node | null = anchor.nextSibling;
          // Find the correct position after existing items
          if (currentNodes.length > 1) {
            const lastExisting = currentNodes[currentNodes.length - 2];
            if (lastExisting) {
              refNode = lastExisting.nextSibling;
            }
          }
          anchor.parentNode.insertBefore(itemNode, refNode);
        }
      });
    }
  });
  ctx.cleanups?.push(effectCleanup);

  // Also push a cleanup that handles the item cleanups when the each node itself is destroyed
  ctx.cleanups?.push(() => {
    for (const cleanup of itemCleanups) {
      cleanup();
    }
  });

  const fragment = document.createDocumentFragment();
  fragment.appendChild(anchor);
  for (const n of currentNodes) {
    fragment.appendChild(n);
  }

  return fragment;
}

function renderMarkdown(node: CompiledMarkdownNode, ctx: RenderContext): HTMLElement {
  const container = document.createElement('div');
  container.className = 'constela-markdown';

  const cleanup = createEffect(() => {
    const content = evaluate(node.content, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) });
    const html = parseMarkdown(String(content ?? ''));
    container.innerHTML = html;
  });
  ctx.cleanups?.push(cleanup);

  return container;
}

function renderCode(node: CompiledCodeNode, ctx: RenderContext): HTMLElement {
  const container = document.createElement('div');
  container.className = 'constela-code';

  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  container.appendChild(pre);
  pre.appendChild(codeEl);

  const cleanup = createEffect(() => {
    const language = String(evaluate(node.language, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) }) ?? 'plaintext');
    const content = String(evaluate(node.content, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) }) ?? '');

    // Set language class for immediate access
    codeEl.className = `language-${language || 'plaintext'}`;
    codeEl.dataset['language'] = language || 'plaintext';
    container.dataset['language'] = language || 'plaintext';
    codeEl.textContent = content;

    // Apply syntax highlighting asynchronously
    highlightCode(content, language || 'plaintext').then(html => {
      container.innerHTML = html;
      // Re-apply the language class to the new code element after highlighting
      const newCode = container.querySelector('code');
      if (newCode) {
        newCode.classList.add(`language-${language || 'plaintext'}`);
        newCode.dataset['language'] = language || 'plaintext';
      }
      container.dataset['language'] = language || 'plaintext';
    });
  });
  ctx.cleanups?.push(cleanup);

  return container;
}
