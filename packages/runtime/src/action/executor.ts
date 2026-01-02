/**
 * Action Executor - Executes compiled action steps
 * 
 * Supports:
 * - set: Update state with value
 * - update: Increment/decrement numbers, push/pop/remove for arrays
 * - fetch: Make HTTP requests with onSuccess/onError handlers
 */

import type { StateStore } from '../state/store.js';
import type { CompiledAction, CompiledActionStep, CompiledExpression } from '@constela/compiler';
import { evaluate } from '../expression/evaluator.js';

export interface ActionContext {
  state: StateStore;
  actions: Record<string, CompiledAction>;
  locals: Record<string, unknown>;
  eventPayload?: unknown;
}

export async function executeAction(
  action: CompiledAction,
  ctx: ActionContext
): Promise<void> {
  for (const step of action.steps) {
    await executeStep(step, ctx);
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
      await executeUpdateStep(step.target, step.operation, step.value, ctx);
      break;

    case 'fetch':
      await executeFetchStep(step, ctx);
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
  target: string,
  operation: string,
  value: CompiledExpression | undefined,
  ctx: ActionContext
): Promise<void> {
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
      // Execute onError steps for non-ok response
      if (step.onError) {
        for (const errorStep of step.onError) {
          await executeStep(errorStep, ctx);
        }
      }
    }
  } catch (_error) {
    // Execute onError steps for network errors
    if (step.onError) {
      for (const errorStep of step.onError) {
        await executeStep(errorStep, ctx);
      }
    }
  }
}
