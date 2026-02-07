/**
 * Expression Evaluator - CSR wrapper around unified @constela/core evaluate
 *
 * Delegates all expression evaluation to the core module,
 * providing a CSR-specific EnvironmentAdapter for DOM refs, validity, and globals.
 */

import type { StateStore } from '../state/store.js';
import type { CompiledExpression } from '@constela/compiler';
import { evaluate as coreEvaluate, evaluateStyle as coreEvaluateStyle, GLOBAL_FUNCTIONS } from '@constela/core';
import type { EnvironmentAdapter, CoreEvaluationContext } from '@constela/core';

/**
 * Style preset definition - matches @constela/core StylePreset
 */
export interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<Record<string, string> & { class: string }>;
}

/**
 * Creates a CSR-specific EnvironmentAdapter for browser DOM evaluation
 */
function createCSRAdapter(refs?: Record<string, Element>): EnvironmentAdapter {
  return {
    resolveRef: (name: string) => refs?.[name] ?? null,
    resolveValidity(ref: string, property?: string) {
      const element = refs?.[ref];
      if (!element) return null;
      const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!formElement.validity) return null;
      const validity = formElement.validity;
      const prop = property || 'valid';
      if (prop === 'message') {
        return formElement.validationMessage || '';
      }
      return validity[prop as keyof ValidityState] ?? null;
    },
    resolveGlobal(name: string) {
      const safeGlobals: Record<string, unknown> = {
        JSON, Math, Date, Object, Array, String, Number, Boolean, console,
        ...GLOBAL_FUNCTIONS,
      };
      return safeGlobals[name];
    },
    bindFunction: (fn: Function, parent: unknown) => fn.bind(parent),
    callFunction: (fn: Function, args: unknown[]) => fn(...args),
  };
}

/**
 * Converts CSR EvaluationContext to CoreEvaluationContext
 */
function toCoreContext(ctx: EvaluationContext): CoreEvaluationContext {
  const core: CoreEvaluationContext = {
    state: ctx.state,  // StateStore has get(), satisfies StateReader
    locals: ctx.locals,
    env: createCSRAdapter(ctx.refs),
  };
  if (ctx.route !== undefined) core.route = ctx.route;
  if (ctx.imports !== undefined) core.imports = ctx.imports;
  if (ctx.styles !== undefined) core.styles = ctx.styles;
  return core;
}

export interface EvaluationContext {
  state: StateStore;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
  imports?: Record<string, unknown>;
  refs?: Record<string, Element>;  // DOM element refs
  styles?: Record<string, StylePreset>;  // Style presets for style expressions
}

export function evaluate(expr: CompiledExpression, ctx: EvaluationContext): unknown {
  return coreEvaluate(expr, toCoreContext(ctx));
}

/**
 * Type guard to check if a value is a CompiledExpression
 * Uses hasOwnProperty to avoid prototype chain issues
 */
function isExpression(value: unknown): value is CompiledExpression {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'expr') &&
    typeof (value as { expr: unknown }).expr === 'string'
  );
}

/**
 * Evaluates a payload that can be either a single expression or an object with expression fields
 */
export function evaluatePayload(
  payload: CompiledExpression | Record<string, CompiledExpression>,
  ctx: EvaluationContext
): unknown {
  // Single expression case
  if (isExpression(payload)) {
    return evaluate(payload, ctx);
  }

  // Object payload case - evaluate each field recursively
  if (typeof payload === 'object' && payload !== null) {
    const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (forbiddenKeys.has(key)) continue;

      if (isExpression(value)) {
        result[key] = evaluate(value, ctx);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return payload;
}

/**
 * Style expression type for evaluateStyle
 */
interface StyleExprInput {
  expr: 'style';
  name: string;
  variants?: Record<string, CompiledExpression>;
}

/**
 * Evaluates a style expression to produce CSS class names
 *
 * CSR wrapper: delegates to core evaluateStyle, converting '' to undefined
 * for backward compatibility (core returns '' when preset not found,
 * CSR returns undefined).
 *
 * @param expr - The style expression to evaluate
 * @param ctx - The evaluation context containing styles presets
 * @returns The computed CSS class string, or undefined if preset not found
 */
export function evaluateStyle(
  expr: StyleExprInput,
  ctx: EvaluationContext
): string | undefined {
  // CSR returns undefined when preset is not found (core returns '')
  const preset = ctx.styles?.[expr.name];
  if (!preset) return undefined;

  return coreEvaluateStyle(expr, toCoreContext(ctx));
}
