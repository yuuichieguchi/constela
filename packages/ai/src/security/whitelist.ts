/**
 * Security whitelist definitions for DSL validation
 *
 * Defines forbidden tags and actions that should never appear in AI-generated DSL.
 */

export const FORBIDDEN_TAGS = Object.freeze([
  'script',
  'iframe',
  'object',
  'embed',
  'form',
] as const);

export const FORBIDDEN_ACTIONS = Object.freeze([
  'import',
  'call',
  'dom',
] as const);

export const RESTRICTED_ACTIONS = Object.freeze([
  'fetch',
] as const);

export type ForbiddenTag = (typeof FORBIDDEN_TAGS)[number];
export type ForbiddenAction = (typeof FORBIDDEN_ACTIONS)[number];
export type RestrictedAction = (typeof RESTRICTED_ACTIONS)[number];

/**
 * Type guard to check if a tag is forbidden.
 * Case-sensitive: only lowercase tags are forbidden.
 */
export function isForbiddenTag(tag: unknown): tag is ForbiddenTag {
  if (typeof tag !== 'string') {
    return false;
  }
  return (FORBIDDEN_TAGS as readonly string[]).includes(tag);
}

/**
 * Type guard to check if an action is forbidden.
 * Case-sensitive: only lowercase actions are forbidden.
 */
export function isForbiddenAction(action: unknown): action is ForbiddenAction {
  if (typeof action !== 'string') {
    return false;
  }
  return (FORBIDDEN_ACTIONS as readonly string[]).includes(action);
}

/**
 * Type guard to check if an action is restricted (requires explicit whitelist).
 * Case-sensitive: only lowercase actions are restricted.
 */
export function isRestrictedAction(action: unknown): action is RestrictedAction {
  if (typeof action !== 'string') {
    return false;
  }
  return (RESTRICTED_ACTIONS as readonly string[]).includes(action);
}
