/**
 * Unified evaluate module - barrel export
 */

export type { StateReader, EnvironmentAdapter, CoreEvaluationContext } from './types.js';
export { evaluate, evaluateStyle } from './evaluate.js';
export {
  SAFE_ARRAY_METHODS,
  SAFE_STRING_METHODS,
  SAFE_MATH_METHODS,
  SAFE_DATE_STATIC_METHODS,
  SAFE_DATE_INSTANCE_METHODS,
  FORBIDDEN_KEYS,
} from './constants.js';
