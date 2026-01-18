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
  CompiledPortalNode,
  CompiledLocalStateNode,
  CompiledLocalAction,
  CompiledAction,
  CompiledExpression,
  CompiledEventHandler,
} from '@constela/compiler';
import { parseMarkdown } from './markdown.js';
import { highlightCode } from './code.js';
import { createEffect } from '../reactive/effect.js';
import { createSignal, type Signal } from '../reactive/signal.js';
import { evaluate, evaluatePayload } from '../expression/evaluator.js';
import { executeAction } from '../action/executor.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg', 'path', 'line', 'circle', 'rect', 'ellipse', 'polyline', 'polygon',
  'g', 'defs', 'use', 'text', 'tspan', 'clipPath', 'mask', 'linearGradient',
  'radialGradient', 'stop', 'pattern', 'symbol', 'marker', 'image', 'filter',
  'foreignObject', 'animate', 'animateTransform', 'desc', 'title',
]);
function isSvgTag(tag: string): boolean { return SVG_TAGS.has(tag); }

/**
 * Local state store interface for component-level state
 */
interface LocalStateStore {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  signals: Record<string, Signal<unknown>>;
}

export interface RenderContext {
  state: StateStore;
  actions: Record<string, CompiledAction>;
  locals: Record<string, unknown>;
  imports?: Record<string, unknown>;
  cleanups?: (() => void)[];
  refs?: Record<string, Element>;
  inSvg?: boolean;
  // Local state support
  localState?: {
    store: LocalStateStore;
    actions: Record<string, CompiledLocalAction>;
  };
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

// ==================== Debounce/Throttle Utilities ====================

/**
 * Creates a debounced function that delays invoking fn until after wait ms
 * have elapsed since the last time the debounced function was invoked.
 */
function debounce(
  fn: (event: Event) => void | Promise<void>,
  wait: number,
  ctx: RenderContext
): (event: Event) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (event: Event) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(event);
    }, wait);
  };

  // Register cleanup for pending timeout
  ctx.cleanups?.push(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });

  return debouncedFn;
}

/**
 * Creates a throttled function that only invokes fn at most once per wait ms.
 * The first call is immediate, subsequent calls within the wait period are ignored.
 */
function throttle(
  fn: (event: Event) => void | Promise<void>,
  wait: number,
  ctx: RenderContext
): (event: Event) => void {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastEvent: Event | null = null;

  const throttledFn = (event: Event) => {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      // Execute immediately
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      fn(event);
    } else {
      // Schedule for later and save event
      lastEvent = event;
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          timeoutId = null;
          lastTime = Date.now();
          if (lastEvent) {
            fn(lastEvent);
            lastEvent = null;
          }
        }, remaining);
      }
    }
  };

  // Register cleanup for pending timeout
  ctx.cleanups?.push(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });

  return throttledFn;
}

// ==================== Event Handler Utilities ====================

/**
 * Creates the base event callback that extracts event data and executes action
 */
function createEventCallback(
  handler: CompiledEventHandler,
  ctx: RenderContext
): (event: Event) => Promise<void> {
  return async (event: Event) => {
    const action = ctx.actions[handler.action];
    if (!action) return;

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

      // File input data
      if (target instanceof HTMLInputElement && target.type === 'file') {
        eventLocals['files'] = Array.from(target.files || []).map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          _file: f,
        }));
      }
    }

    // KeyboardEvent data
    if (event instanceof KeyboardEvent) {
      eventLocals['key'] = event.key;
      eventLocals['code'] = event.code;
      eventLocals['ctrlKey'] = event.ctrlKey;
      eventLocals['shiftKey'] = event.shiftKey;
      eventLocals['altKey'] = event.altKey;
      eventLocals['metaKey'] = event.metaKey;
    }

    // MouseEvent data
    if (event instanceof MouseEvent) {
      eventLocals['clientX'] = event.clientX;
      eventLocals['clientY'] = event.clientY;
      eventLocals['pageX'] = event.pageX;
      eventLocals['pageY'] = event.pageY;
      eventLocals['button'] = event.button;
    }

    // TouchEvent data - check for touches property for jsdom compatibility
    const touchEvent = event as { touches?: TouchList; changedTouches?: TouchList };
    if (touchEvent.touches && touchEvent.changedTouches) {
      eventLocals['touches'] = Array.from(touchEvent.touches).map(t => ({
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.pageX,
        pageY: t.pageY,
      }));
      eventLocals['changedTouches'] = Array.from(touchEvent.changedTouches).map(t => ({
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.pageX,
        pageY: t.pageY,
      }));
    }

    // Scroll event data
    if (handler.event === 'scroll' && event.target instanceof Element) {
      eventLocals['scrollTop'] = event.target.scrollTop;
      eventLocals['scrollLeft'] = event.target.scrollLeft;
    }

    // Evaluate payload with event locals merged into context locals
    let payload: unknown = undefined;
    if (handler.payload) {
      payload = evaluatePayload(handler.payload, {
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
  };
}

/**
 * Wraps an event callback with debounce or throttle if specified
 */
function wrapWithDebounceThrottle(
  callback: (event: Event) => Promise<void>,
  handler: CompiledEventHandler,
  ctx: RenderContext
): (event: Event) => void {
  // Debounce takes precedence if both are specified
  if (handler.debounce !== undefined && handler.debounce >= 0) {
    return debounce(callback, handler.debounce, ctx);
  }
  if (handler.throttle !== undefined && handler.throttle >= 0) {
    return throttle(callback, handler.throttle, ctx);
  }
  return callback;
}

// ==================== IntersectionObserver Support ====================

/**
 * Sets up an IntersectionObserver for the 'intersect' event
 */
function setupIntersectionObserver(
  el: Element,
  handler: CompiledEventHandler,
  ctx: RenderContext
): void {
  const options: IntersectionObserverInit = {};

  if (handler.options?.threshold !== undefined) {
    options.threshold = handler.options.threshold;
  }
  if (handler.options?.rootMargin !== undefined) {
    options.rootMargin = handler.options.rootMargin;
  }

  let hasTriggered = false;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target !== el) continue;

      // If once option is set and already triggered, skip
      if (handler.options?.once && hasTriggered) {
        continue;
      }

      const action = ctx.actions[handler.action];
      if (!action) continue;

      // Create intersection-specific locals
      const intersectLocals: Record<string, unknown> = {
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
      };

      // Evaluate payload with intersection locals
      let payload: unknown = undefined;
      if (handler.payload) {
        payload = evaluatePayload(handler.payload, {
          state: ctx.state,
          locals: { ...ctx.locals, ...intersectLocals },
          ...(ctx.imports && { imports: ctx.imports })
        });
      }

      const actionCtx = {
        state: ctx.state,
        actions: ctx.actions,
        locals: { ...ctx.locals, ...intersectLocals, payload },
        eventPayload: payload,
      };

      // Execute action
      executeAction(action, actionCtx);

      // Mark as triggered and unobserve if once
      if (handler.options?.once) {
        hasTriggered = true;
        observer.unobserve(el);
      }
    }
  }, options);

  observer.observe(el);

  // Register cleanup
  ctx.cleanups?.push(() => {
    observer.disconnect();
  });
}

// ==================== Render Functions ====================

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
    case 'portal':
      return renderPortal(node as CompiledPortalNode, ctx);
    case 'localState':
      return renderLocalState(node as CompiledLocalStateNode, ctx);
    default:
      throw new Error('Unknown node kind');
  }
}

function renderElement(node: CompiledElementNode, ctx: RenderContext): Element {
  const tag = node.tag;
  const inSvgContext = ctx.inSvg || tag === 'svg';
  const useSvgNamespace = inSvgContext && isSvgTag(tag);

  const el = useSvgNamespace
    ? document.createElementNS(SVG_NAMESPACE, tag)
    : document.createElement(tag);

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

        // Handle IntersectionObserver for 'intersect' event
        if (eventName === 'intersect') {
          setupIntersectionObserver(el, handler, ctx);
        } else {
          // Regular DOM event with optional debounce/throttle
          const eventCallback = createEventCallback(handler, ctx);
          const wrappedCallback = wrapWithDebounceThrottle(eventCallback, handler, ctx);
          el.addEventListener(eventName, wrappedCallback);
        }
      } else {
        // Apply prop with effect for reactivity
        const cleanup = createEffect(() => {
          const value = evaluate(propValue as CompiledExpression, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) });
          applyProp(el, propName, value, useSvgNamespace);
        });
        ctx.cleanups?.push(cleanup);
      }
    }
  }

  // Render children
  if (node.children) {
    const childInSvg = tag === 'foreignObject' ? false : inSvgContext;
    const childCtx = childInSvg !== ctx.inSvg ? { ...ctx, inSvg: childInSvg } : ctx;
    for (const child of node.children) {
      const childNode = render(child, childCtx);
      el.appendChild(childNode);
    }
  }

  return el;
}

function applyProp(el: Element, propName: string, value: unknown, isSvg: boolean = false): void {
  // Handle SVG className separately (SVG elements don't have className as a string property)
  if (isSvg && propName === 'className') {
    if (value) {
      el.setAttribute('class', String(value));
    } else {
      el.removeAttribute('class');
    }
    return;
  }

  // Handle special props
  if (propName === 'className') {
    (el as HTMLElement).className = String(value ?? '');
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

interface ItemState {
  key: unknown;
  node: Node;
  cleanups: (() => void)[];
  itemSignal: Signal<unknown>;
  indexSignal: Signal<number>;
}

/**
 * Creates a proxy for locals that resolves signals on property access.
 * This allows reactive updates when signals are updated.
 */
function createReactiveLocals(
  baseLocals: Record<string, unknown>,
  itemKey: string,
  itemSignal: Signal<unknown>,
  indexKey: string | undefined,
  indexSignal: Signal<number>
): Record<string, unknown> {
  return new Proxy(baseLocals, {
    get(target, prop: string) {
      if (prop === itemKey) {
        return itemSignal.get();
      }
      if (indexKey && prop === indexKey) {
        return indexSignal.get();
      }
      return target[prop];
    },
    has(target, prop: string) {
      if (prop === itemKey) return true;
      if (indexKey && prop === indexKey) return true;
      return prop in target;
    },
    ownKeys(target) {
      const keys = Reflect.ownKeys(target);
      if (!keys.includes(itemKey)) keys.push(itemKey);
      if (indexKey && !keys.includes(indexKey)) keys.push(indexKey);
      return keys;
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === itemKey || (indexKey && prop === indexKey)) {
        return { enumerable: true, configurable: true };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}

function renderEach(node: CompiledEachNode, ctx: RenderContext): Node {
  const anchor = document.createComment('each');
  const hasKey = !!node.key;

  // For keyed rendering
  let itemStateMap = new Map<unknown, ItemState>();

  // For non-keyed rendering
  let currentNodes: Node[] = [];
  let itemCleanups: (() => void)[] = [];

  const effectCleanup = createEffect(() => {
    const items = evaluate(node.items, { state: ctx.state, locals: ctx.locals, ...(ctx.imports && { imports: ctx.imports }) }) as unknown[];

    if (!hasKey || !node.key) {
      // No key: use current behavior (re-render all)
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
      return;
    }

    // Key-based diffing
    const newItemStateMap = new Map<unknown, ItemState>();
    const newNodes: Node[] = [];
    const seenKeys = new Set<unknown>();

    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        // Evaluate key for this item (using temporary locals for key evaluation)
        const tempLocals: Record<string, unknown> = {
          ...ctx.locals,
          [node.as]: item,
          ...(node.index ? { [node.index]: index } : {}),
        };
        const keyValue = evaluate(node.key!, {
          state: ctx.state,
          locals: tempLocals,
          ...(ctx.imports && { imports: ctx.imports }),
        });

        // Duplicate key warning
        if (seenKeys.has(keyValue)) {
          if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
            console.warn(`Duplicate key "${keyValue}" in each loop. Keys should be unique.`);
          }
        }
        seenKeys.add(keyValue);

        // Check if we have existing state for this key
        const existingState = itemStateMap.get(keyValue);

        if (existingState) {
          // Reuse existing node - update signals to trigger reactive updates
          existingState.itemSignal.set(item);
          existingState.indexSignal.set(index);
          newItemStateMap.set(keyValue, existingState);
          newNodes.push(existingState.node);
        } else {
          // Create new item with signals for reactivity
          const itemSignal = createSignal<unknown>(item);
          const indexSignal = createSignal<number>(index);

          // Create reactive locals using proxy
          const reactiveLocals = createReactiveLocals(
            ctx.locals,
            node.as,
            itemSignal,
            node.index,
            indexSignal
          );

          const localCleanups: (() => void)[] = [];
          const itemCtx: RenderContext = {
            ...ctx,
            locals: reactiveLocals,
            cleanups: localCleanups,
          };

          const itemNode = render(node.body, itemCtx);
          const newState: ItemState = {
            key: keyValue,
            node: itemNode,
            cleanups: localCleanups,
            itemSignal,
            indexSignal,
          };
          newItemStateMap.set(keyValue, newState);
          newNodes.push(itemNode);
        }
      });
    }

    // Cleanup removed items
    for (const [key, state] of itemStateMap) {
      if (!newItemStateMap.has(key)) {
        // This item was removed
        for (const cleanup of state.cleanups) {
          cleanup();
        }
        if (state.node.parentNode) {
          state.node.parentNode.removeChild(state.node);
        }
      }
    }

    // Reorder/insert nodes in correct position
    // Save focus state before moving nodes (DOM operations can lose focus in some environments)
    const activeElement = document.activeElement;
    const shouldRestoreFocus = activeElement && activeElement !== document.body;

    if (anchor.parentNode) {
      let refNode: Node = anchor;
      for (const itemNode of newNodes) {
        const nextSibling = refNode.nextSibling;
        if (nextSibling !== itemNode) {
          // Node needs to be moved/inserted
          anchor.parentNode.insertBefore(itemNode, refNode.nextSibling);
        }
        refNode = itemNode;
      }
    }

    // Restore focus if it was lost during DOM operations
    if (shouldRestoreFocus && activeElement instanceof HTMLElement && document.activeElement !== activeElement) {
      activeElement.focus();
    }

    // Update state
    itemStateMap = newItemStateMap;
    currentNodes = newNodes;

    // Collect all cleanups for disposal
    itemCleanups = [];
    for (const state of itemStateMap.values()) {
      itemCleanups.push(...state.cleanups);
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

// ==================== Portal Support ====================

/**
 * Renders a portal node by rendering children to a different DOM location.
 * Returns a comment node as a placeholder in the original location.
 */
function renderPortal(node: CompiledPortalNode, ctx: RenderContext): Node {
  // Determine target element
  let targetElement: Element | null = null;

  if (node.target === 'body') {
    targetElement = document.body;
  } else if (node.target === 'head') {
    targetElement = document.head;
  } else {
    // CSS selector
    targetElement = document.querySelector(node.target);
  }

  // If target doesn't exist, return an empty comment and don't render children
  if (!targetElement) {
    return document.createComment('portal:target-not-found');
  }

  // Create a container for portal content with data-portal attribute
  const portalContainer = document.createElement('div');
  portalContainer.setAttribute('data-portal', 'true');
  portalContainer.style.display = 'contents';

  // Create cleanups array for portal children
  const portalCleanups: (() => void)[] = [];
  const portalCtx: RenderContext = {
    ...ctx,
    cleanups: portalCleanups,
  };

  // Render children into portal container
  for (const child of node.children) {
    const childNode = render(child, portalCtx);
    portalContainer.appendChild(childNode);
  }

  // Append portal container to target
  targetElement.appendChild(portalContainer);

  // Register cleanup to remove portal content
  ctx.cleanups?.push(() => {
    // Run child cleanups first
    for (const cleanup of portalCleanups) {
      cleanup();
    }
    // Remove portal container from target
    if (portalContainer.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
    }
  });

  // Return a comment node as placeholder
  return document.createComment('portal');
}

// ==================== Local State Support ====================

/**
 * Creates a local state store with reactive signals for each state property
 */
function createLocalStateStore(
  stateDefs: Record<string, { type: string; initial: unknown }>
): LocalStateStore {
  const signals: Record<string, Signal<unknown>> = {};

  for (const [name, def] of Object.entries(stateDefs)) {
    signals[name] = createSignal<unknown>(def.initial);
  }

  return {
    get(name: string): unknown {
      return signals[name]?.get();
    },
    set(name: string, value: unknown): void {
      signals[name]?.set(value);
    },
    signals,
  };
}

/**
 * Creates a proxy for locals that resolves local state signals on property access.
 * This allows reactive updates when local state signals are updated.
 */
function createLocalsWithLocalState(
  baseLocals: Record<string, unknown>,
  localStore: LocalStateStore
): Record<string, unknown> {
  return new Proxy(baseLocals, {
    get(target, prop: string) {
      // Check local state first
      if (prop in localStore.signals) {
        return localStore.get(prop);
      }
      return target[prop];
    },
    has(target, prop: string) {
      if (prop in localStore.signals) return true;
      return prop in target;
    },
    ownKeys(target) {
      const keys = Reflect.ownKeys(target);
      for (const key of Object.keys(localStore.signals)) {
        if (!keys.includes(key)) keys.push(key);
      }
      return keys;
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in localStore.signals) {
        return { enumerable: true, configurable: true };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}

/**
 * Creates a proxy for state that first checks local state before delegating to global state.
 * This allows local state names to shadow global state names within a component.
 */
function createStateWithLocalState(
  globalState: StateStore,
  localStore: LocalStateStore
): StateStore {
  return {
    get(name: string): unknown {
      // Check local state first
      if (name in localStore.signals) {
        return localStore.get(name);
      }
      return globalState.get(name);
    },
    set(name: string, value: unknown): void {
      // Only set in global state - local state is handled separately via local actions
      globalState.set(name, value);
    },
    setPath(name: string, path: (string | number)[], value: unknown): void {
      globalState.setPath(name, path, value);
    },
    subscribe(name: string, fn: (value: unknown) => void): () => void {
      // Check local state first
      if (name in localStore.signals) {
        return localStore.signals[name]!.subscribe!(fn);
      }
      return globalState.subscribe(name, fn);
    },
    getPath(name: string, path: string | (string | number)[]): unknown {
      return globalState.getPath(name, path);
    },
    subscribeToPath(
      name: string,
      path: string | (string | number)[],
      fn: (value: unknown) => void
    ): () => void {
      return globalState.subscribeToPath(name, path, fn);
    },
  };
}

/**
 * Extended action type with local action metadata
 */
interface ExtendedAction extends CompiledAction {
  _isLocalAction?: boolean;
  _localStore?: LocalStateStore;
}

/**
 * Renders a local state node by creating a local state store and merging it
 * with the render context for child rendering.
 */
function renderLocalState(node: CompiledLocalStateNode, ctx: RenderContext): Node {
  // Create local state store with signals
  const localStore = createLocalStateStore(node.state);

  // Create merged locals with local state
  const mergedLocals = createLocalsWithLocalState(ctx.locals, localStore);

  // Create proxied state that checks local state first
  const mergedState = createStateWithLocalState(ctx.state, localStore);

  // Create merged actions with local actions marked
  const mergedActions: Record<string, ExtendedAction> = { ...ctx.actions };
  for (const [name, action] of Object.entries(node.actions)) {
    // Mark as local action and attach the store
    mergedActions[name] = {
      ...action,
      _isLocalAction: true,
      _localStore: localStore,
    };
  }

  // Create child context
  const childCtx: RenderContext = {
    ...ctx,
    state: mergedState,
    locals: mergedLocals,
    actions: mergedActions,
    localState: {
      store: localStore,
      actions: node.actions,
    },
  };

  // Render child
  return render(node.child, childCtx);
}
