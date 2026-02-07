/**
 * Shared SSR utilities
 *
 * Provides the SSR environment adapter, context converter,
 * and common helpers shared between renderer.ts and streaming.ts.
 */

import { callGlobalFunction, GLOBAL_FUNCTIONS } from '@constela/core';
import type { EnvironmentAdapter, CoreEvaluationContext, StylePreset } from '@constela/core';

// ==================== SSR Context ====================

export interface SSRContext {
  state: Map<string, unknown>;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  } | undefined;
  imports?: Record<string, unknown> | undefined;
  styles?: Record<string, StylePreset> | undefined;
}

// ==================== SSR Environment Adapter ====================

/**
 * Environment adapter for SSR context.
 *
 * In SSR:
 * - DOM refs don't exist -> resolveRef returns null
 * - Validity checks can't be performed -> resolveValidity returns false
 * - Global objects and helper functions are available via resolveGlobal
 */
export const ssrAdapter: EnvironmentAdapter = {
  resolveRef: () => null,
  resolveValidity: () => false,
  resolveGlobal(name: string): unknown {
    const safeGlobals: Record<string, unknown> = {
      JSON, Math, Date, Object, Array, String, Number, Boolean, console,
      ...GLOBAL_FUNCTIONS,
    };
    return safeGlobals[name];
  },
};

// ==================== Context Converter ====================

/**
 * Converts an SSR context to a CoreEvaluationContext.
 *
 * Map<string, unknown> satisfies StateReader since Map has a get() method.
 * StreamingContext extends SSRContext, so this works for both.
 */
export function toCoreContext(ctx: SSRContext): CoreEvaluationContext {
  return {
    state: ctx.state,
    locals: ctx.locals,
    route: ctx.route,
    imports: ctx.imports,
    styles: ctx.styles,
    env: ssrAdapter,
  };
}

// ==================== Constants ====================

/**
 * HTML void elements that should be self-closing
 */
export const VOID_ELEMENTS = new Set([
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

// ==================== Value Formatting ====================

/**
 * Formats a value as a string for text content
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
