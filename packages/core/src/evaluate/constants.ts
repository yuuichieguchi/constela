/**
 * Constants for the unified evaluate module.
 *
 * Extracted from runtime/evaluator.ts, server/renderer.ts, server/streaming.ts
 */

export const SAFE_ARRAY_METHODS = new Set([
  'length', 'at', 'includes', 'slice', 'indexOf', 'join',
  'filter', 'map', 'find', 'findIndex', 'some', 'every',
]);

export const SAFE_STRING_METHODS = new Set([
  'length', 'charAt', 'substring', 'slice', 'split',
  'trim', 'toUpperCase', 'toLowerCase', 'replace',
  'includes', 'startsWith', 'endsWith', 'indexOf',
]);

export const SAFE_MATH_METHODS = new Set([
  'min', 'max', 'round', 'floor', 'ceil', 'abs',
  'sqrt', 'pow', 'random', 'sin', 'cos', 'tan',
]);

export const SAFE_DATE_STATIC_METHODS = new Set([
  'now', 'parse',
]);

export const SAFE_DATE_INSTANCE_METHODS = new Set([
  'toISOString', 'toDateString', 'toTimeString',
  'getTime', 'getFullYear', 'getMonth', 'getDate',
  'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
]);

export const FORBIDDEN_KEYS = new Set([
  '__proto__', 'constructor', 'prototype',
]);
