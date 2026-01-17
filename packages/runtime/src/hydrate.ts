/**
 * Hydrate - Attach to existing SSR-rendered HTML
 *
 * This module provides client-side hydration for server-rendered Constela apps.
 * It attaches event handlers and enables reactivity without reconstructing the DOM.
 */

import type {
  CompiledProgram,
  CompiledAction,
  CompiledNode,
  CompiledElementNode,
  CompiledTextNode,
  CompiledIfNode,
  CompiledEachNode,
  CompiledExpression,
  CompiledEventHandler,
} from '@constela/compiler';
import type { AppInstance } from './app.js';
import { createStateStore, type StateStore } from './state/store.js';
import { createEffect } from './reactive/effect.js';
import { createSignal, type Signal } from './reactive/signal.js';
import { evaluate } from './expression/evaluator.js';
import { executeAction } from './action/executor.js';
import { render, type RenderContext } from './renderer/index.js';

/**
 * Options for hydrating an SSR-rendered application
 */
export interface HydrateOptions {
  /** The compiled program to hydrate */
  program: CompiledProgram;
  /** The container element containing SSR-rendered HTML */
  container: HTMLElement;
  /** Optional route context for dynamic routes */
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
}

/**
 * Context for hydration
 */
interface HydrateContext {
  state: StateStore;
  actions: Record<string, CompiledAction>;
  locals: Record<string, unknown>;
  cleanups: (() => void)[];
  imports?: Record<string, unknown>;
  refs?: Record<string, Element>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
}

/**
 * State for a single item in a keyed each loop
 */
interface HydrateItemState {
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
  itemSignal: Signal<unknown>,
  indexSignal: Signal<number>,
  itemName: string,
  indexName?: string
): Record<string, unknown> {
  return new Proxy(baseLocals, {
    get(target, prop) {
      if (prop === itemName) return itemSignal.get();
      if (indexName && prop === indexName) return indexSignal.get();
      return target[prop as string];
    },
    has(target, prop) {
      if (prop === itemName) return true;
      if (indexName && prop === indexName) return true;
      return prop in target;
    },
  });
}

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

/**
 * Hydrates a server-rendered application.
 *
 * Lifecycle order:
 * 1. State initialization
 * 2. Refs map creation
 * 3. DOM hydration (refs populated during hydration)
 * 4. Copy buttons initialization
 * 5. onMount execution (refs guaranteed to be available)
 * 6. App instance returned
 *
 * @param options - Hydration options containing program and container
 * @returns AppInstance for controlling the hydrated application
 */
export function hydrateApp(options: HydrateOptions): AppInstance {
  const { program, container, route } = options;

  // Create state store
  const state = createStateStore(program.state);

  // Normalize actions (handle both Map and Record)
  let actions: Record<string, CompiledAction>;
  if (program.actions instanceof Map) {
    actions = {};
    program.actions.forEach((action, name) => {
      actions[name] = action;
    });
  } else {
    actions = program.actions;
  }

  // Create cleanups array for tracking all effects
  const cleanups: (() => void)[] = [];

  // Create refs map for collecting element references
  const refs: Record<string, Element> = {};

  // Create hydration context
  const ctx: HydrateContext = {
    state,
    actions,
    locals: {},
    cleanups,
    refs,
    ...(program.importData && { imports: program.importData }),
    ...(route && { route }),
  };

  // Hydrate the existing DOM (before onMount so refs are available)
  const firstChild = container.firstElementChild;
  if (firstChild) {
    hydrate(program.view, firstChild, ctx);
  }

  // Create action context for lifecycle hooks (after hydration so refs are populated)
  const actionCtx = {
    state,
    actions,
    locals: {},
    refs,
    ...(route && { route }),
    ...(program.importData && { imports: program.importData }),
  };

  // Execute onMount lifecycle hook (after hydration so refs are available)
  if (program.lifecycle?.onMount) {
    const onMountAction = actions[program.lifecycle.onMount];
    if (onMountAction) {
      void executeAction(onMountAction, actionCtx);
    }
  }

  // Initialize copy buttons
  initCopyButtons(container);

  let destroyed = false;

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;

      // Execute onUnmount lifecycle hook before cleanup
      if (program.lifecycle?.onUnmount) {
        const onUnmountAction = actions[program.lifecycle.onUnmount];
        if (onUnmountAction) {
          void executeAction(onUnmountAction, actionCtx);
        }
      }

      // Cleanup all effects
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Remove rendered content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    },

    setState(name: string, value: unknown): void {
      if (destroyed) return;
      state.set(name, value);
    },

    getState(name: string): unknown {
      return state.get(name);
    },

    subscribe(name: string, fn: (value: unknown) => void): () => void {
      if (destroyed) return () => {};
      return state.subscribe(name, fn);
    },
  };
}

/**
 * Hydrates a compiled node against an existing DOM node
 */
function hydrate(node: CompiledNode, domNode: Node, ctx: HydrateContext): void {
  switch (node.kind) {
    case 'element':
      hydrateElement(node, domNode as HTMLElement, ctx);
      break;
    case 'text':
      hydrateText(node, domNode as Text, ctx);
      break;
    case 'if':
      hydrateIf(node, domNode, ctx);
      break;
    case 'each':
      hydrateEach(node, domNode, ctx);
      break;
    case 'markdown':
    case 'code':
      // For markdown/code, no special hydration needed (server rendered is static)
      break;
    default:
      break;
  }
}

/**
 * Hydrates an element node
 */
function hydrateElement(
  node: CompiledElementNode,
  el: HTMLElement,
  ctx: HydrateContext
): void {
  // Collect ref if specified
  if (node.ref && ctx.refs) {
    ctx.refs[node.ref] = el;
  }

  // Apply props and attach event handlers
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
            if (
              target instanceof HTMLInputElement ||
              target instanceof HTMLTextAreaElement ||
              target instanceof HTMLSelectElement
            ) {
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
                ...(ctx.imports && { imports: ctx.imports }),
                ...(ctx.route && { route: ctx.route }),
              });
            }

            const actionCtx = {
              state: ctx.state,
              actions: ctx.actions,
              locals: { ...ctx.locals, ...eventLocals, payload },
              eventPayload: payload,
              ...(ctx.refs && { refs: ctx.refs }),
              ...(ctx.route && { route: ctx.route }),
              ...(ctx.imports && { imports: ctx.imports }),
            };
            await executeAction(action, actionCtx);
          }
        });
      } else {
        // Apply prop with effect for reactivity (update existing attribute)
        const cleanup = createEffect(() => {
          const value = evaluate(propValue as CompiledExpression, {
            state: ctx.state,
            locals: ctx.locals,
            ...(ctx.imports && { imports: ctx.imports }),
            ...(ctx.route && { route: ctx.route }),
          });
          applyProp(el, propName, value);
        });
        ctx.cleanups.push(cleanup);
      }
    }
  }

  // Hydrate children
  if (node.children) {
    hydrateChildren(node.children, el, ctx);
  }
}

/**
 * Hydrates children nodes, handling text node merging from SSR
 */
function hydrateChildren(
  children: CompiledNode[],
  parent: HTMLElement,
  ctx: HydrateContext
): void {
  // SSR merges consecutive text nodes into a single text node.
  // We need to handle this by grouping consecutive text nodes together.

  // Get all DOM children (excluding comments)
  const domChildren: Node[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]!;
    if (child.nodeType !== Node.COMMENT_NODE) {
      domChildren.push(child);
    }
  }

  let domIndex = 0;

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i]!;

    if (childNode.kind === 'text') {
      // Collect consecutive text nodes
      const textNodes: CompiledTextNode[] = [childNode];
      while (
        i + 1 < children.length &&
        children[i + 1]!.kind === 'text'
      ) {
        i++;
        textNodes.push(children[i] as CompiledTextNode);
      }

      // Find the corresponding DOM text node
      const domChild = domChildren[domIndex];
      if (domChild && domChild.nodeType === Node.TEXT_NODE) {
        hydrateTextGroup(textNodes, domChild as Text, ctx);
        domIndex++;
      }
    } else if (childNode.kind === 'element') {
      const domChild = domChildren[domIndex];
      if (domChild && domChild.nodeType === Node.ELEMENT_NODE) {
        hydrate(childNode, domChild, ctx);
        domIndex++;
      }
    } else if (childNode.kind === 'if') {
      // For if nodes, evaluate condition to check if DOM exists
      const ifNode = childNode as CompiledIfNode;
      const initialCondition = evaluate(ifNode.condition, {
        state: ctx.state,
        locals: ctx.locals,
        ...(ctx.imports && { imports: ctx.imports }),
        ...(ctx.route && { route: ctx.route }),
      });
      const hasDomForIf = Boolean(initialCondition) || Boolean(ifNode.else);

      const domChild = domChildren[domIndex];
      if (hasDomForIf && domChild) {
        // DOM exists - hydrate normally
        hydrate(childNode, domChild, ctx);
        domIndex++;
      } else {
        // No DOM - create effect to render when condition becomes true
        hydrateIfWithoutDom(ifNode, parent, domChildren[domIndex] || null, ctx);
      }
    } else if (childNode.kind === 'each') {
      // For each nodes, count how many items are rendered
      const items = evaluate((childNode as CompiledEachNode).items, {
        state: ctx.state,
        locals: ctx.locals,
        ...(ctx.imports && { imports: ctx.imports }),
        ...(ctx.route && { route: ctx.route }),
      }) as unknown[];
      const itemCount = Array.isArray(items) ? items.length : 0;

      if (itemCount > 0) {
        const firstDomChild = domChildren[domIndex];
        if (firstDomChild) {
          hydrate(childNode, firstDomChild, ctx);
          domIndex += itemCount;
        }
      }
    } else {
      // markdown, code, etc.
      const domChild = domChildren[domIndex];
      if (domChild) {
        hydrate(childNode, domChild, ctx);
        domIndex++;
      }
    }
  }
}

/**
 * Hydrates a group of consecutive text nodes that are merged into a single DOM text node
 */
function hydrateTextGroup(
  nodes: CompiledTextNode[],
  textNode: Text,
  ctx: HydrateContext
): void {
  const cleanup = createEffect(() => {
    // Concatenate all text node values
    let combinedText = '';
    for (const node of nodes) {
      const value = evaluate(node.value, {
        state: ctx.state,
        locals: ctx.locals,
        ...(ctx.imports && { imports: ctx.imports }),
        ...(ctx.route && { route: ctx.route }),
      });
      combinedText += formatValue(value);
    }
    textNode.textContent = combinedText;
  });
  ctx.cleanups.push(cleanup);
}

/**
 * Applies a prop value to an element
 */
function applyProp(el: HTMLElement, propName: string, value: unknown): void {
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

/**
 * Hydrates a text node with reactive updates
 */
function hydrateText(
  node: CompiledTextNode,
  textNode: Text,
  ctx: HydrateContext
): void {
  const cleanup = createEffect(() => {
    const value = evaluate(node.value, {
      state: ctx.state,
      locals: ctx.locals,
      ...(ctx.imports && { imports: ctx.imports }),
      ...(ctx.route && { route: ctx.route }),
    });
    textNode.textContent = formatValue(value);
  });
  ctx.cleanups.push(cleanup);
}

/**
 * Format a value for text content
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

/**
 * Hydrates an if node with conditional rendering
 */
function hydrateIf(
  node: CompiledIfNode,
  initialDomNode: Node,
  ctx: HydrateContext
): void {
  // Create an anchor comment for the if node
  const anchor = document.createComment('if');
  const parent = initialDomNode.parentNode;
  if (!parent) return;

  // Insert anchor before the initial node
  parent.insertBefore(anchor, initialDomNode);

  let currentNode: Node | null = initialDomNode;
  let currentBranch: 'then' | 'else' | 'none' = 'none';
  let branchCleanups: (() => void)[] = [];

  // Track if this is the first run of the effect
  let isFirstRun = true;

  // Determine initial branch
  const initialCondition = evaluate(node.condition, {
    state: ctx.state,
    locals: ctx.locals,
    ...(ctx.imports && { imports: ctx.imports }),
    ...(ctx.route && { route: ctx.route }),
  });
  currentBranch = Boolean(initialCondition) ? 'then' : node.else ? 'else' : 'none';

  // Hydrate initial branch if showing
  if (currentBranch === 'then') {
    const localCleanups: (() => void)[] = [];
    const branchCtx: HydrateContext = { ...ctx, cleanups: localCleanups };
    hydrate(node.then, currentNode, branchCtx);
    branchCleanups = localCleanups;
  } else if (currentBranch === 'else' && node.else) {
    const localCleanups: (() => void)[] = [];
    const branchCtx: HydrateContext = { ...ctx, cleanups: localCleanups };
    hydrate(node.else, currentNode, branchCtx);
    branchCleanups = localCleanups;
  }

  const effectCleanup = createEffect(() => {
    // Read state to track dependencies
    const condition = evaluate(node.condition, {
      state: ctx.state,
      locals: ctx.locals,
      ...(ctx.imports && { imports: ctx.imports }),
      ...(ctx.route && { route: ctx.route }),
    });
    const shouldShowThen = Boolean(condition);
    const newBranch = shouldShowThen ? 'then' : node.else ? 'else' : 'none';

    // Skip the first run - initial hydration already done above
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }

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
      const branchCtx: RenderContext = {
        state: ctx.state,
        actions: ctx.actions,
        locals: ctx.locals,
        cleanups: localCleanups,
        ...(ctx.imports && { imports: ctx.imports }),
      };

      // Render new branch (create fresh DOM)
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
  ctx.cleanups.push(effectCleanup);

  // Cleanup branch effects when the if node is destroyed
  ctx.cleanups.push(() => {
    for (const cleanup of branchCleanups) {
      cleanup();
    }
  });
}

/**
 * Hydrates an if node when there is no initial DOM (condition was initially false)
 * Creates an anchor and effect to render when condition becomes true
 */
function hydrateIfWithoutDom(
  node: CompiledIfNode,
  parent: HTMLElement,
  nextSibling: Node | null,
  ctx: HydrateContext
): void {
  // Create an anchor comment for the if node
  const anchor = document.createComment('if');
  if (nextSibling) {
    parent.insertBefore(anchor, nextSibling);
  } else {
    parent.appendChild(anchor);
  }

  let currentNode: Node | null = null;
  let currentBranch: 'then' | 'else' | 'none' = 'none';
  let branchCleanups: (() => void)[] = [];

  const effectCleanup = createEffect(() => {
    // Read state to track dependencies
    const condition = evaluate(node.condition, {
      state: ctx.state,
      locals: ctx.locals,
      ...(ctx.imports && { imports: ctx.imports }),
      ...(ctx.route && { route: ctx.route }),
    });
    const shouldShowThen = Boolean(condition);
    const newBranch = shouldShowThen ? 'then' : node.else ? 'else' : 'none';

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
      const branchCtx: RenderContext = {
        state: ctx.state,
        actions: ctx.actions,
        locals: ctx.locals,
        cleanups: localCleanups,
        ...(ctx.imports && { imports: ctx.imports }),
        ...(ctx.route && { route: ctx.route }),
      };

      // Render new branch (create fresh DOM)
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
  ctx.cleanups.push(effectCleanup);

  // Cleanup branch effects when the if node is destroyed
  ctx.cleanups.push(() => {
    for (const cleanup of branchCleanups) {
      cleanup();
    }
  });
}

/**
 * Hydrates an each node with list rendering
 */
function hydrateEach(
  node: CompiledEachNode,
  firstItemDomNode: Node,
  ctx: HydrateContext
): void {
  const parent = firstItemDomNode.parentNode;
  if (!parent) return;

  // Create an anchor comment for the each node
  const anchor = document.createComment('each');
  parent.insertBefore(anchor, firstItemDomNode);

  const hasKey = !!node.key;

  // For keyed rendering
  let itemStateMap = new Map<unknown, HydrateItemState>();

  // For non-keyed rendering
  let currentNodes: Node[] = [];
  let itemCleanups: (() => void)[] = [];

  // Get initial items
  const initialItems = evaluate(node.items, {
    state: ctx.state,
    locals: ctx.locals,
    ...(ctx.imports && { imports: ctx.imports }),
    ...(ctx.route && { route: ctx.route }),
  }) as unknown[];

  // Track if this is the first run of the effect
  let isFirstRun = true;

  // Hydrate existing items
  if (Array.isArray(initialItems) && initialItems.length > 0) {
    let domNode: Node | null = firstItemDomNode;

    if (hasKey && node.key) {
      // Key-based hydration: create signals for each item
      const seenKeys = new Set<unknown>();

      initialItems.forEach((item, index) => {
        if (!domNode) return;

        // Evaluate key for this item
        const tempLocals: Record<string, unknown> = {
          ...ctx.locals,
          [node.as]: item,
          ...(node.index ? { [node.index]: index } : {}),
        };
        const keyValue = evaluate(node.key!, {
          state: ctx.state,
          locals: tempLocals,
          ...(ctx.imports && { imports: ctx.imports }),
          ...(ctx.route && { route: ctx.route }),
        });

        // Duplicate key warning
        if (seenKeys.has(keyValue)) {
          if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production') {
            console.warn(`Duplicate key "${keyValue}" in each loop. Keys should be unique.`);
          }
        }
        seenKeys.add(keyValue);

        // Create signals for reactive updates
        const itemSignal = createSignal<unknown>(item);
        const indexSignal = createSignal<number>(index);

        // Create reactive locals using proxy
        const reactiveLocals = createReactiveLocals(
          ctx.locals,
          itemSignal,
          indexSignal,
          node.as,
          node.index
        );

        const localCleanups: (() => void)[] = [];
        const itemCtx: HydrateContext = {
          ...ctx,
          locals: reactiveLocals,
          cleanups: localCleanups,
        };

        hydrate(node.body, domNode, itemCtx);

        // Store item state
        const itemState: HydrateItemState = {
          key: keyValue,
          node: domNode,
          cleanups: localCleanups,
          itemSignal,
          indexSignal,
        };
        itemStateMap.set(keyValue, itemState);
        currentNodes.push(domNode);

        // Move to next sibling for the next item
        domNode = domNode.nextSibling;
        // Skip comment nodes
        while (domNode && domNode.nodeType === Node.COMMENT_NODE) {
          domNode = domNode.nextSibling;
        }
      });

      // Collect all cleanups
      for (const state of itemStateMap.values()) {
        itemCleanups.push(...state.cleanups);
      }
    } else {
      // Non-keyed hydration: current behavior
      initialItems.forEach((item, index) => {
        if (!domNode) return;

        currentNodes.push(domNode);

        const itemLocals: Record<string, unknown> = {
          ...ctx.locals,
          [node.as]: item,
        };
        if (node.index) {
          itemLocals[node.index] = index;
        }

        const localCleanups: (() => void)[] = [];
        const itemCtx: HydrateContext = {
          ...ctx,
          locals: itemLocals,
          cleanups: localCleanups,
        };

        hydrate(node.body, domNode, itemCtx);
        itemCleanups.push(...localCleanups);

        // Move to next sibling for the next item
        domNode = domNode.nextSibling;
        // Skip comment nodes
        while (domNode && domNode.nodeType === Node.COMMENT_NODE) {
          domNode = domNode.nextSibling;
        }
      });
    }
  }

  const effectCleanup = createEffect(() => {
    // Read state to track dependencies
    const items = evaluate(node.items, {
      state: ctx.state,
      locals: ctx.locals,
      ...(ctx.imports && { imports: ctx.imports }),
      ...(ctx.route && { route: ctx.route }),
    }) as unknown[];

    // Skip the first run - initial hydration already done above
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }

    if (!hasKey || !node.key) {
      // Non-keyed: re-render all (current behavior)
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

          const localCleanups: (() => void)[] = [];
          const itemCtx: RenderContext = {
            state: ctx.state,
            actions: ctx.actions,
            locals: itemLocals,
            cleanups: localCleanups,
            ...(ctx.imports && { imports: ctx.imports }),
          };

          const itemNode = render(node.body, itemCtx);
          currentNodes.push(itemNode);
          itemCleanups.push(...localCleanups);

          // Insert after anchor or last item
          if (anchor.parentNode) {
            let refNode: Node | null = anchor.nextSibling;
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
    const newItemStateMap = new Map<unknown, HydrateItemState>();
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
          ...(ctx.route && { route: ctx.route }),
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
            itemSignal,
            indexSignal,
            node.as,
            node.index
          );

          const localCleanups: (() => void)[] = [];
          const itemCtx: RenderContext = {
            state: ctx.state,
            actions: ctx.actions,
            locals: reactiveLocals,
            cleanups: localCleanups,
            ...(ctx.imports && { imports: ctx.imports }),
          };

          const itemNode = render(node.body, itemCtx);
          const newState: HydrateItemState = {
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
  ctx.cleanups.push(effectCleanup);

  // Cleanup item effects when the each node is destroyed
  ctx.cleanups.push(() => {
    for (const cleanup of itemCleanups) {
      cleanup();
    }
  });
}

// ==================== Copy Button Initialization ====================

const COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>';

/**
 * Initialize copy buttons within a container
 */
function initCopyButtons(container: HTMLElement): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>('.constela-copy-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      // Find the parent .constela-code wrapper and get the code content from it
      const codeWrapper = btn.closest('.constela-code');
      const code = codeWrapper?.getAttribute('data-code-content') || '';
      try {
        await navigator.clipboard.writeText(code);
        btn.innerHTML = CHECK_ICON;
        setTimeout(() => {
          btn.innerHTML = COPY_ICON;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });
}
