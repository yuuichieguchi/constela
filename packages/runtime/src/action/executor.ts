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
  CompiledSetPathStep,
  CompiledStorageStep,
  CompiledClipboardStep,
  CompiledNavigateStep,
  CompiledImportStep,
  CompiledCallStep,
  CompiledSubscribeStep,
  CompiledDisposeStep,
  CompiledDomStep,
  CompiledSendStep,
  CompiledCloseStep,
  CompiledDelayStep,
  CompiledIntervalStep,
  CompiledClearTimerStep,
  CompiledFocusStep,
} from '@constela/compiler';
import type { ConnectionManager } from '../connection/websocket.js';
import { evaluate } from '../expression/evaluator.js';

/**
 * Local state store interface for component-level state
 */
interface LocalStateStore {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
}

/**
 * Extended action type with local action metadata
 */
interface ExtendedAction extends CompiledAction {
  _isLocalAction?: boolean;
  _localStore?: LocalStateStore;
}

export interface ActionContext {
  state: StateStore;
  actions: Record<string, CompiledAction>;
  locals: Record<string, unknown>;
  eventPayload?: unknown;
  refs?: Record<string, Element>;          // DOM element refs
  subscriptions?: (() => void)[];          // Collected subscriptions for auto-disposal
  cleanups?: (() => void)[];               // Cleanup functions for timers (delay, interval)
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
  imports?: Record<string, unknown>;
  connections?: ConnectionManager;          // WebSocket connection manager
}

/**
 * Creates an evaluation context from ActionContext
 * Ensures consistent context creation across all step execution functions
 */
function createEvalContext(ctx: ActionContext) {
  return {
    state: ctx.state,
    locals: ctx.locals,
    ...(ctx.refs && { refs: ctx.refs }),
    ...(ctx.route && { route: ctx.route }),
    ...(ctx.imports && { imports: ctx.imports }),
  };
}

export async function executeAction(
  action: CompiledAction | ExtendedAction,
  ctx: ActionContext
): Promise<void> {
  // Check if this is a local action
  const extAction = action as ExtendedAction;
  const isLocal = extAction._isLocalAction && extAction._localStore;
  const localStore = extAction._localStore;

  // Collect delay promises to await at the end
  const delayPromises: Promise<void>[] = [];

  for (const step of action.steps) {
    // Use synchronous execution for set/update/setPath steps to ensure
    // all state changes complete before returning
    if (step.do === 'set' || step.do === 'update' || step.do === 'setPath') {
      executeStepSync(step, ctx, isLocal ? localStore : undefined);
    } else if (step.do === 'if') {
      // If steps need special handling to support both sync and async nested steps
      await executeIfStep(step, ctx, isLocal ? localStore : undefined);
    } else if (step.do === 'delay') {
      // Fire-and-forget delay, but collect promise to await at the end
      const delayPromise = executeDelayStep(step as CompiledDelayStep, ctx);
      delayPromises.push(delayPromise);
    } else if (step.do === 'interval') {
      // Interval is fire-and-forget, no promise to await
      await executeIntervalStep(step as CompiledIntervalStep, ctx);
    } else {
      await executeStep(step, ctx);
    }
  }

  // Wait for all delay timers to complete
  if (delayPromises.length > 0) {
    await Promise.all(delayPromises);
  }
}

/**
 * Synchronously execute set/update steps for immediate state changes
 */
function executeStepSync(
  step: CompiledActionStep,
  ctx: ActionContext,
  localStore?: LocalStateStore
): void {
  switch (step.do) {
    case 'set':
      if (localStore) {
        executeLocalSetStepSync(step.target, step.value, ctx, localStore);
      } else {
        executeSetStepSync(step.target, step.value, ctx);
      }
      break;
    case 'update':
      if (localStore) {
        executeLocalUpdateStepSync(step, ctx, localStore);
      } else {
        executeUpdateStepSync(step, ctx);
      }
      break;
    case 'setPath':
      executeSetPathStepSync(step, ctx);
      break;
  }
}

/**
 * Execute if step - handles both sync and async nested steps
 *
 * For sync steps (set, update, if): executes immediately
 * For async steps (fetch, call, etc.): queues for async execution
 */
async function executeIfStep(
  step: { do: 'if'; condition: CompiledExpression; then: CompiledActionStep[]; else?: CompiledActionStep[] },
  ctx: ActionContext,
  localStore?: LocalStateStore
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const condition = evaluate(step.condition, evalCtx);

  const stepsToExecute = condition ? step.then : (step.else || []);

  for (const nestedStep of stepsToExecute) {
    if (nestedStep.do === 'set' || nestedStep.do === 'update' || nestedStep.do === 'setPath') {
      executeStepSync(nestedStep, ctx, localStore);
    } else if (nestedStep.do === 'if') {
      await executeIfStep(nestedStep as typeof step, ctx, localStore);
    } else {
      await executeStep(nestedStep, ctx);
    }
  }
}

function executeSetStepSync(
  target: string,
  value: CompiledExpression,
  ctx: ActionContext
): void {
  const evalCtx = createEvalContext(ctx);
  const newValue = evaluate(value, evalCtx);
  ctx.state.set(target, newValue);
}

function executeUpdateStepSync(
  step: CompiledUpdateStep,
  ctx: ActionContext
): void {
  const { target, operation, value } = step;
  const evalCtx = createEvalContext(ctx);
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

// ==================== Local State Step Execution ====================

/**
 * Executes a set step for local state
 */
function executeLocalSetStepSync(
  target: string,
  value: CompiledExpression,
  ctx: ActionContext,
  localStore: LocalStateStore
): void {
  const evalCtx = createEvalContext(ctx);
  const newValue = evaluate(value, evalCtx);
  localStore.set(target, newValue);
}

/**
 * Executes an update step for local state
 */
function executeLocalUpdateStepSync(
  step: CompiledUpdateStep,
  ctx: ActionContext,
  localStore: LocalStateStore
): void {
  const { target, operation, value } = step;
  const evalCtx = createEvalContext(ctx);
  const currentValue = localStore.get(target);

  switch (operation) {
    case 'toggle': {
      const current = typeof currentValue === 'boolean' ? currentValue : false;
      localStore.set(target, !current);
      break;
    }

    case 'increment': {
      const evalResult = value ? evaluate(value, evalCtx) : 1;
      const amount = typeof evalResult === 'number' ? evalResult : 1;
      const current = typeof currentValue === 'number' ? currentValue : 0;
      localStore.set(target, current + amount);
      break;
    }

    case 'decrement': {
      const evalResult = value ? evaluate(value, evalCtx) : 1;
      const amount = typeof evalResult === 'number' ? evalResult : 1;
      const current = typeof currentValue === 'number' ? currentValue : 0;
      localStore.set(target, current - amount);
      break;
    }

    case 'push': {
      const item = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? currentValue : [];
      localStore.set(target, [...arr, item]);
      break;
    }

    case 'pop': {
      const arr = Array.isArray(currentValue) ? currentValue : [];
      localStore.set(target, arr.slice(0, -1));
      break;
    }

    case 'remove': {
      const removeValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? currentValue : [];
      if (typeof removeValue === 'number') {
        localStore.set(target, arr.filter((_, i) => i !== removeValue));
      } else {
        localStore.set(target, arr.filter((x) => x !== removeValue));
      }
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
      localStore.set(target, { ...current, ...mergeValue });
      break;
    }

    case 'replaceAt': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const newValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && idx >= 0 && idx < arr.length) {
        arr[idx] = newValue;
      }
      localStore.set(target, arr);
      break;
    }

    case 'insertAt': {
      const idx = step.index ? evaluate(step.index, evalCtx) : 0;
      const newValue = value ? evaluate(value, evalCtx) : undefined;
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      if (typeof idx === 'number' && idx >= 0) {
        arr.splice(idx, 0, newValue);
      }
      localStore.set(target, arr);
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
      localStore.set(target, arr);
      break;
    }
  }
}

function executeSetPathStepSync(
  step: CompiledSetPathStep,
  ctx: ActionContext
): void {
  const evalCtx = createEvalContext(ctx);

  // Evaluate the path expression - can be string or array
  const pathValue = evaluate(step.path, evalCtx);

  // Normalize path to array format
  let path: (string | number)[];
  if (typeof pathValue === 'string') {
    path = pathValue.split('.').map(segment => {
      const num = parseInt(segment, 10);
      return isNaN(num) ? segment : num;
    });
  } else if (Array.isArray(pathValue)) {
    // Evaluate any expressions within the path array
    path = pathValue.map(item => {
      if (typeof item === 'object' && item !== null && 'expr' in item) {
        return evaluate(item as CompiledExpression, evalCtx) as string | number;
      }
      return item as string | number;
    });
  } else {
    // Single value path
    path = [pathValue as string | number];
  }

  // Evaluate the value to set
  const newValue = evaluate(step.value, evalCtx);

  // Use the StateStore's setPath method
  ctx.state.setPath(step.target, path, newValue);
}

async function executeSetPathStep(
  step: CompiledSetPathStep,
  ctx: ActionContext
): Promise<void> {
  executeSetPathStepSync(step, ctx);
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

    case 'setPath':
      await executeSetPathStep(step, ctx);
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

    case 'dom':
      await executeDomStep(step, ctx);
      break;

    case 'if':
      await executeIfStep(step, ctx);
      break;

    case 'send':
      await executeSendStep(step, ctx);
      break;

    case 'close':
      await executeCloseStep(step, ctx);
      break;

    case 'delay':
      await executeDelayStep(step, ctx);
      break;

    case 'interval':
      await executeIntervalStep(step, ctx);
      break;

    case 'clearTimer':
      await executeClearTimerStep(step, ctx);
      break;

    case 'focus':
      await executeFocusStep(step, ctx);
      break;
  }
}

async function executeSetStep(
  target: string,
  value: CompiledExpression,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const newValue = evaluate(value, evalCtx);
  ctx.state.set(target, newValue);
}

async function executeUpdateStep(
  step: CompiledUpdateStep,
  ctx: ActionContext
): Promise<void> {
  const { target, operation, value } = step;
  const evalCtx = createEvalContext(ctx);
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
  const evalCtx = createEvalContext(ctx);
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
  const evalCtx = createEvalContext(ctx);
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
  const evalCtx = createEvalContext(ctx);

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
  const evalCtx = createEvalContext(ctx);
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
  const evalCtx = createEvalContext(ctx);

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
  const evalCtx = createEvalContext(ctx);
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
  const evalCtx = createEvalContext(ctx);
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


/**
 * Executes a DOM manipulation step
 */
async function executeDomStep(
  step: CompiledDomStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const selectorValue = evaluate(step.selector, evalCtx);
  const selector = String(selectorValue);

  // Get target element
  let element: Element | null = null;
  if (selector === "html") {
    element = document.documentElement;
  } else if (selector === "body") {
    element = document.body;
  } else {
    element = document.querySelector(selector);
  }

  if (!element) return;

  const value = step.value ? String(evaluate(step.value, evalCtx)) : "";

  switch (step.operation) {
    case "addClass":
      if (value) element.classList.add(value);
      break;
    case "removeClass":
      if (value) element.classList.remove(value);
      break;
    case "toggleClass":
      if (value) element.classList.toggle(value);
      break;
    case "setAttribute":
      if (step.attribute && value) element.setAttribute(step.attribute, value);
      break;
    case "removeAttribute":
      if (step.attribute) element.removeAttribute(step.attribute);
      break;
  }
}

/**
 * Executes a send step (WebSocket message send)
 */
async function executeSendStep(
  step: CompiledSendStep,
  ctx: ActionContext
): Promise<void> {
  if (!ctx.connections) {
    throw new Error(`Connection "${step.connection}" not found`);
  }

  const evalCtx = createEvalContext(ctx);
  const data = evaluate(step.data, evalCtx);
  ctx.connections.send(step.connection, data);
}

/**
 * Executes a close step (WebSocket connection close)
 */
async function executeCloseStep(
  step: CompiledCloseStep,
  ctx: ActionContext
): Promise<void> {
  if (!ctx.connections) return;
  ctx.connections.close(step.connection);
}

/**
 * Executes a delay step (setTimeout equivalent)
 * Schedules execution of 'then' steps after the specified delay.
 * Registers cleanup function in ctx.cleanups if provided.
 *
 * Note: The timer ID is stored as a number for browser compatibility,
 * but clearTimeout/clearInterval work with both number and Timeout objects.
 *
 * The delay step returns a Promise that resolves when the timer fires
 * OR when the timer is cleared (to prevent hanging awaits).
 */
async function executeDelayStep(
  step: CompiledDelayStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const msValue = evaluate(step.ms, evalCtx);

  // Convert to number, handle edge cases (NaN, negative values are treated as 0 by browser)
  const ms = typeof msValue === 'number' ? Math.max(0, msValue) : 0;

  return new Promise<void>((resolve) => {
    let resolved = false;

    const timeoutId = setTimeout(async () => {
      if (resolved) return;
      resolved = true;

      // Execute 'then' steps sequentially
      for (const thenStep of step.then) {
        if (thenStep.do === 'set' || thenStep.do === 'update' || thenStep.do === 'setPath') {
          executeStepSync(thenStep, ctx);
        } else if (thenStep.do === 'if') {
          await executeIfStep(thenStep as { do: 'if'; condition: CompiledExpression; then: CompiledActionStep[]; else?: CompiledActionStep[] }, ctx);
        } else {
          await executeStep(thenStep, ctx);
        }
      }
      resolve();
    }, ms);

    // Store timeout ID in result variable if specified (convert to number for consistency)
    const numericId = typeof timeoutId === 'number' ? timeoutId : Number(timeoutId);
    if (step.result) {
      ctx.locals[step.result] = numericId;
    }

    // Store a map of timer IDs to their resolve functions for clearTimer to use
    if (!ctx.locals['_timerResolvers']) {
      ctx.locals['_timerResolvers'] = new Map<number, () => void>();
    }
    (ctx.locals['_timerResolvers'] as Map<number, () => void>).set(numericId, () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve();
      }
    });

    // Register cleanup function
    if (ctx.cleanups) {
      ctx.cleanups.push(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve();
        }
      });
    }
  });
}

/**
 * Executes an interval step (setInterval equivalent)
 * Executes the specified action repeatedly at the given interval.
 * Registers cleanup function in ctx.cleanups if provided.
 *
 * Note: The timer ID is stored as a number for browser compatibility.
 */
async function executeIntervalStep(
  step: CompiledIntervalStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const msValue = evaluate(step.ms, evalCtx);

  // Convert to number, handle edge cases
  const ms = typeof msValue === 'number' ? Math.max(0, msValue) : 0;

  const intervalId = setInterval(async () => {
    const action = ctx.actions[step.action];
    if (action) {
      await executeAction(action, ctx);
    }
  }, ms);

  // Store interval ID in result variable if specified (convert to number for consistency)
  const numericId = typeof intervalId === 'number' ? intervalId : Number(intervalId);
  if (step.result) {
    ctx.locals[step.result] = numericId;
  }

  // Register cleanup function
  if (ctx.cleanups) {
    ctx.cleanups.push(() => clearInterval(intervalId));
  }
}

/**
 * Executes a clearTimer step (clearTimeout/clearInterval equivalent)
 * Clears the timer with the specified ID.
 *
 * For delay timers, this also resolves the pending Promise to prevent hanging awaits.
 */
async function executeClearTimerStep(
  step: CompiledClearTimerStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const timerId = evaluate(step.target, evalCtx);

  // Handle undefined or invalid timer ID gracefully
  if (timerId == null) {
    return;
  }

  const numericId = typeof timerId === 'number' ? timerId : Number(timerId);

  // Check if there's a resolver for this timer (for delay timers)
  const timerResolvers = ctx.locals['_timerResolvers'] as Map<number, () => void> | undefined;
  if (timerResolvers?.has(numericId)) {
    const resolver = timerResolvers.get(numericId);
    if (resolver) {
      resolver();
    }
    timerResolvers.delete(numericId);
  }

  // Both clearTimeout and clearInterval work for both types in browsers
  clearTimeout(timerId as ReturnType<typeof setTimeout>);
  clearInterval(timerId as ReturnType<typeof setInterval>);
}

/**
 * Executes a focus step (focus/blur/select operations on form elements)
 */
async function executeFocusStep(
  step: CompiledFocusStep,
  ctx: ActionContext
): Promise<void> {
  const evalCtx = createEvalContext(ctx);
  const targetValue = evaluate(step.target, evalCtx);

  // Determine the element: either directly from evaluation (ref expr returns Element)
  // or by looking up a string ref name
  let element: Element | null | undefined;
  if (targetValue instanceof Element) {
    element = targetValue;
  } else if (typeof targetValue === 'string') {
    element = ctx.refs?.[targetValue];
  }

  try {
    if (!element) {
      const refName = typeof targetValue === 'string' ? targetValue : 'unknown';
      throw new Error(`Ref "${refName}" not found`);
    }

    switch (step.operation) {
      case 'focus':
        if (typeof (element as HTMLElement).focus === 'function') {
          (element as HTMLElement).focus();
        }
        break;
      case 'blur':
        if (typeof (element as HTMLElement).blur === 'function') {
          (element as HTMLElement).blur();
        }
        break;
      case 'select':
        if (typeof (element as HTMLInputElement).select === 'function') {
          (element as HTMLInputElement).select();
        } else {
          throw new Error(`Element does not support select operation`);
        }
        break;
    }

    if (step.onSuccess) {
      for (const successStep of step.onSuccess) {
        await executeStep(successStep, ctx);
      }
    }
  } catch (err) {
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
