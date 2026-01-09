/**
 * Action Executor - Executes compiled action steps
 *
 * Supports:
 * - set: Update state with value
 * - update: Increment/decrement numbers, push/pop/remove for arrays
 * - fetch: Make HTTP requests with onSuccess/onError handlers
 * - storage: localStorage/sessionStorage operations
 * - clipboard: Clipboard API operations
 * - navigate: Page navigation
 */

import type { StateStore } from '../state/store.js';
import type {
  CompiledAction,
  CompiledActionStep,
  CompiledExpression,
  CompiledUpdateStep,
  CompiledStorageStep,
  CompiledClipboardStep,
  CompiledNavigateStep,
  CompiledImportStep,
  CompiledCallStep,
  CompiledSubscribeStep,
  CompiledDisposeStep,
} from '@constela/compiler';
import { evaluate } from '../expression/evaluator.js';

export interface ActionContext {
  state: StateStore;
  actions: Record<string, CompiledAction>;
  locals: Record<string, unknown>;
  eventPayload?: unknown;
  refs?: Record<string, Element>;          // DOM element refs
  subscriptions?: (() => void)[];          // Collected subscriptions for auto-disposal
}

export async function executeAction(
  action: CompiledAction,
  ctx: ActionContext
): Promise<void> {
  for (const step of action.steps) {
    // Use synchronous execution for set/update steps to ensure
    // all state changes complete before returning
    if (step.do === 'set' || step.do === 'update') {
      executeStepSync(step, ctx);
    } else {
      await executeStep(step, ctx);
    }
  }
}

/**
 * Synchronously execute set/update steps for immediate state changes
 */
function executeStepSync(
  step: CompiledActionStep,
  ctx: ActionContext
): void {
  switch (step.do) {
    case 'set':
      executeSetStepSync(step.target, step.value, ctx);
      break;
    case 'update':
      executeUpdateStepSync(step, ctx);
      break;
  }
}

function executeSetStepSync(
  target: string,
  value: CompiledExpression,
  ctx: ActionContext
): void {
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const newValue = evaluate(value, evalCtx);
  ctx.state.set(target, newValue);
}

function executeUpdateStepSync(
  step: CompiledUpdateStep,
  ctx: ActionContext
): void {
  const { target, operation, value } = step;
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const currentValue = ctx.state.get(target);

  switch (operation) {
    case 'increment': {
      const evalResult = value ? evaluate(value, evalCtx) : 1;
      const amount = typeof evalResult === 'number' ? evalResult : 1;
      const current = typeof currentValue === 'number' ? currentValue : 0;
      ctx.state.set(target, current + amount);
      break;
    }

    case 'decrement': {
      const evalResult = value ? evaluate(value, evalCtx) : 1;
      const amount = typeof evalResult === 'number' ? evalResult : 1;
      const current = typeof currentValue === 'number' ? currentValue : 0;
      ctx.state.set(target, current - amount);
      break;
    }

    case 'push': {
      const item = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? currentValue : [];
      ctx.state.set(target, [...arr, item]);
      break;
    }

    case 'pop': {
      const arr = Array.isArray(currentValue) ? currentValue : [];
      ctx.state.set(target, arr.slice(0, -1));
      break;
    }

    case 'remove': {
      const removeValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? currentValue : [];
      if (typeof removeValue === 'number') {
        ctx.state.set(target, arr.filter((_, i) => i !== removeValue));
      } else {
        ctx.state.set(target, arr.filter((x) => x !== removeValue));
      }
      break;
    }

    case 'toggle': {
      const current = typeof currentValue === 'boolean' ? currentValue : false;
      ctx.state.set(target, !current);
      break;
    }

    case 'merge': {
      const evalResult = value ? evaluate(value, evalCtx) : {};
      const mergeValue = typeof evalResult === 'object' && evalResult !== null
        ? evalResult as Record<string, unknown>
        : {};
      const current = typeof currentValue === 'object' && currentValue !== null
        ? currentValue as Record<string, unknown>
        : {};
      ctx.state.set(target, { ...current, ...mergeValue });
      break;
    }

    case 'replaceAt': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const newValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && idx >= 0 && idx < arr.length) {
        arr[idx] = newValue;
      }
      ctx.state.set(target, arr);
      break;
    }

    case 'insertAt': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const newValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && idx >= 0) {
        arr.splice(idx, 0, newValue);
      }
      ctx.state.set(target, arr);
      break;
    }

    case 'splice': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const delCount = step.deleteCount ? evaluate(step.deleteCount, evalCtx) : 0;
      const items = value ? evaluate(value, evalCtx) : [];
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && typeof delCount === 'number') {
        const insertItems = Array.isArray(items) ? items : [];
        arr.splice(idx, delCount, ...insertItems);
      }
      ctx.state.set(target, arr);
      break;
    }
  }
}

async function executeStep(
  step: CompiledActionStep,
  ctx: ActionContext
): Promise<void> {
  switch (step.do) {
    case 'set':
      await executeSetStep(step.target, step.value, ctx);
      break;

    case 'update':
      await executeUpdateStep(step, ctx);
      break;

    case 'fetch':
      await executeFetchStep(step, ctx);
      break;

    case 'storage':
      await executeStorageStep(step, ctx);
      break;

    case 'clipboard':
      await executeClipboardStep(step, ctx);
      break;

    case 'navigate':
      await executeNavigateStep(step, ctx);
      break;

    case 'import':
      await executeImportStep(step, ctx);
      break;

    case 'call':
      await executeCallStep(step, ctx);
      break;

    case 'subscribe':
      await executeSubscribeStep(step, ctx);
      break;

    case 'dispose':
      await executeDisposeStep(step, ctx);
      break;
  }
}

async function executeSetStep(
  target: string,
  value: CompiledExpression,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const newValue = evaluate(value, evalCtx);
  ctx.state.set(target, newValue);
}

async function executeUpdateStep(
  step: CompiledUpdateStep,
  ctx: ActionContext
): Promise<void> {
  const { target, operation, value } = step;
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const currentValue = ctx.state.get(target);

  switch (operation) {
    case 'increment': {
      const evalResult = value ? evaluate(value, evalCtx) : 1;
      const amount = typeof evalResult === 'number' ? evalResult : 1;
      const current = typeof currentValue === 'number' ? currentValue : 0;
      ctx.state.set(target, current + amount);
      break;
    }

    case 'decrement': {
      const evalResult = value ? evaluate(value, evalCtx) : 1;
      const amount = typeof evalResult === 'number' ? evalResult : 1;
      const current = typeof currentValue === 'number' ? currentValue : 0;
      ctx.state.set(target, current - amount);
      break;
    }

    case 'push': {
      const item = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? currentValue : [];
      ctx.state.set(target, [...arr, item]);
      break;
    }

    case 'pop': {
      const arr = Array.isArray(currentValue) ? currentValue : [];
      ctx.state.set(target, arr.slice(0, -1));
      break;
    }

    case 'remove': {
      const removeValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? currentValue : [];
      if (typeof removeValue === 'number') {
        // Remove by index
        ctx.state.set(target, arr.filter((_, i) => i !== removeValue));
      } else {
        // Remove by value
        ctx.state.set(target, arr.filter((x) => x !== removeValue));
      }
      break;
    }

    case 'toggle': {
      const current = typeof currentValue === 'boolean' ? currentValue : false;
      ctx.state.set(target, !current);
      break;
    }

    case 'merge': {
      const evalResult = value ? evaluate(value, evalCtx) : {};
      const mergeValue = typeof evalResult === 'object' && evalResult !== null
        ? evalResult as Record<string, unknown>
        : {};
      const current = typeof currentValue === 'object' && currentValue !== null
        ? currentValue as Record<string, unknown>
        : {};
      ctx.state.set(target, { ...current, ...mergeValue });
      break;
    }

    case 'replaceAt': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const newValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && idx >= 0 && idx < arr.length) {
        arr[idx] = newValue;
      }
      ctx.state.set(target, arr);
      break;
    }

    case 'insertAt': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const newValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && idx >= 0) {
        arr.splice(idx, 0, newValue);
      }
      ctx.state.set(target, arr);
      break;
    }

    case 'splice': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const delCount = step.deleteCount ? evaluate(step.deleteCount, evalCtx) : 0;
      const items = value ? evaluate(value, evalCtx) : [];
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && typeof delCount === 'number') {
        const insertItems = Array.isArray(items) ? items : [];
        arr.splice(idx, delCount, ...insertItems);
      }
      ctx.state.set(target, arr);
      break;
    }
  }
}

async function executeFetchStep(
  step: {
    do: 'fetch';
    url: CompiledExpression;
    method?: string;
    body?: CompiledExpression;
    result?: string;
    onSuccess?: CompiledActionStep[];
    onError?: CompiledActionStep[];
  },
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const url = evaluate(step.url, evalCtx) as string;
  const method = step.method ?? 'GET';
  
  const fetchOptions: RequestInit = {
    method,
  };

  if (step.body) {
    fetchOptions.body = evaluate(step.body, evalCtx) as string;
  }

  try {
    const response = await fetch(url, fetchOptions);
    
    if (response.ok) {
      const data = await response.json();
      
      // Store result in locals if specified
      if (step.result) {
        ctx.locals[step.result] = data;
      }

      // Execute onSuccess steps
      if (step.onSuccess) {
        for (const successStep of step.onSuccess) {
          await executeStep(successStep, ctx);
        }
      }
    } else {
      // Inject error variable for non-ok response
      ctx.locals['error'] = {
        message: `HTTP error: ${response.status} ${response.statusText}`,
        name: 'HTTPError',
      };
      // Execute onError steps for non-ok response
      if (step.onError) {
        for (const errorStep of step.onError) {
          await executeStep(errorStep, ctx);
        }
      }
    }
  } catch (err) {
    // Inject error variable for network errors
    ctx.locals['error'] = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : 'Error',
    };
    // Execute onError steps for network errors
    if (step.onError) {
      for (const errorStep of step.onError) {
        await executeStep(errorStep, ctx);
      }
    }
  }
}

/**
 * Executes a storage step (localStorage/sessionStorage operations)
 */
async function executeStorageStep(
  step: CompiledStorageStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const key = evaluate(step.key, evalCtx) as string;

  // Get the appropriate storage object
  const storage = step.storage === 'local' ? localStorage : sessionStorage;

  try {
    switch (step.operation) {
      case 'get': {
        const value = storage.getItem(key);
        if (step.result) {
          // Try to parse as JSON, otherwise use raw value
          try {
            ctx.locals[step.result] = value !== null ? JSON.parse(value) : null;
          } catch {
            ctx.locals[step.result] = value;
          }
        }
        break;
      }

      case 'set': {
        const setValue = step.value ? evaluate(step.value, evalCtx) : undefined;
        // Always serialize as JSON for consistent read/write behavior
        const valueToStore = JSON.stringify(setValue);
        storage.setItem(key, valueToStore);
        break;
      }

      case 'remove': {
        storage.removeItem(key);
        break;
      }
    }

    // Execute onSuccess steps
    if (step.onSuccess) {
      for (const successStep of step.onSuccess) {
        await executeStep(successStep, ctx);
      }
    }
  } catch (err) {
    // Inject error variable for storage errors
    ctx.locals['error'] = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : 'Error',
    };
    // Execute onError steps for storage errors
    if (step.onError) {
      for (const errorStep of step.onError) {
        await executeStep(errorStep, ctx);
      }
    }
  }
}

/**
 * Executes a clipboard step (Clipboard API operations)
 */
async function executeClipboardStep(
  step: CompiledClipboardStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals };

  try {
    switch (step.operation) {
      case 'write': {
        const value = step.value ? evaluate(step.value, evalCtx) : '';
        // Convert non-string values to string
        const text = typeof value === 'string' ? value : String(value);
        await navigator.clipboard.writeText(text);
        break;
      }

      case 'read': {
        const readText = await navigator.clipboard.readText();
        if (step.result) {
          ctx.locals[step.result] = readText;
        }
        break;
      }
    }

    // Execute onSuccess steps
    if (step.onSuccess) {
      for (const successStep of step.onSuccess) {
        await executeStep(successStep, ctx);
      }
    }
  } catch (err) {
    // Inject error variable for clipboard errors
    ctx.locals['error'] = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : 'Error',
    };
    // Execute onError steps for clipboard errors
    if (step.onError) {
      for (const errorStep of step.onError) {
        await executeStep(errorStep, ctx);
      }
    }
  }
}

/**
 * Executes a navigate step (page navigation)
 */
async function executeNavigateStep(
  step: CompiledNavigateStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals };
  const url = evaluate(step.url, evalCtx) as string;
  const target = step.target ?? '_self';

  if (target === '_blank') {
    window.open(url, '_blank');
  } else if (step.replace) {
    window.location.replace(url);
  } else {
    window.location.assign(url);
  }
}

/**
 * Executes an import step (dynamic module import)
 */
async function executeImportStep(
  step: CompiledImportStep,
  ctx: ActionContext
): Promise<void> {
  try {
    const module = await import(/* @vite-ignore */ step.module);
    ctx.locals[step.result] = module;

    if (step.onSuccess) {
      for (const successStep of step.onSuccess) {
        await executeStep(successStep, ctx);
      }
    }
  } catch (err) {
    // Inject error variable for import errors
    ctx.locals['error'] = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : 'Error',
    };

    if (step.onError) {
      for (const errorStep of step.onError) {
        await executeStep(errorStep, ctx);
      }
    }
  }
}

/**
 * Executes a call step (external function call)
 */
async function executeCallStep(
  step: CompiledCallStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals, ...(ctx.refs && { refs: ctx.refs }) };

  try {
    const target = evaluate(step.target, evalCtx);
    const args = step.args?.map(arg => evaluate(arg, evalCtx)) ?? [];

    if (typeof target === 'function') {
      const result = await target(...args);
      if (step.result) {
        ctx.locals[step.result] = result;
      }
    } else {
      throw new Error(`Target is not callable: received ${typeof target}`);
    }

    if (step.onSuccess) {
      for (const successStep of step.onSuccess) {
        await executeStep(successStep, ctx);
      }
    }
  } catch (err) {
    // Inject error variable for call errors
    ctx.locals['error'] = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : 'Error',
    };

    if (step.onError) {
      for (const errorStep of step.onError) {
        await executeStep(errorStep, ctx);
      }
    }
  }
}

/**
 * Executes a subscribe step (event subscription)
 *
 * The subscription is collected in ctx.subscriptions for automatic disposal
 * during component unmount (via lifecycle.onUnmount). The collected function
 * handles both disposable objects ({ dispose: () => void }) and direct
 * unsubscribe functions (() => void).
 */
async function executeSubscribeStep(
  step: CompiledSubscribeStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals, ...(ctx.refs && { refs: ctx.refs }) };
  const target = evaluate(step.target, evalCtx);

  if (target && typeof target === 'object' && step.event in target) {
    const eventMethod = (target as Record<string, unknown>)[step.event];
    if (typeof eventMethod === 'function') {
      const disposable = eventMethod.call(target, async (eventData: unknown) => {
        const action = ctx.actions[step.action];
        if (action) {
          const subscriptionCtx: ActionContext = {
            ...ctx,
            locals: { ...ctx.locals, event: eventData },
          };
          await executeAction(action, subscriptionCtx);
        }
      });

      // Collect subscription for auto-disposal
      if (ctx.subscriptions) {
        if (disposable && typeof disposable === 'object' && 'dispose' in disposable && typeof disposable.dispose === 'function') {
          ctx.subscriptions.push(() => (disposable as { dispose: () => void }).dispose());
        } else if (typeof disposable === 'function') {
          ctx.subscriptions.push(disposable as () => void);
        }
      }
    }
  }
}

/**
 * Executes a dispose step (resource cleanup)
 */
async function executeDisposeStep(
  step: CompiledDisposeStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = { state: ctx.state, locals: ctx.locals, ...(ctx.refs && { refs: ctx.refs }) };
  const target = evaluate(step.target, evalCtx);

  if (target && typeof target === 'object') {
    const obj = target as Record<string, unknown>;
    // Priority: dispose() is standard, destroy() is fallback for libraries like Chart.js
    if (typeof obj['dispose'] === 'function') {
      obj['dispose']();
    } else if (typeof obj['destroy'] === 'function') {
      obj['destroy']();
    }
  }
}
