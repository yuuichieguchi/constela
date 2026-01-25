/**
 * DSL Validator
 *
 * Validates AI-generated DSL against security rules to prevent XSS,
 * script injection, and other malicious content.
 */

import {
  isForbiddenTag,
  isForbiddenAction,
  isRestrictedAction,
} from './security/whitelist';
import { validateUrl, isForbiddenScheme } from './security/url-validator';

/**
 * Security options for validation context
 */
export interface SecurityOptions {
  allowedTags?: string[];
  allowedActions?: string[];
  allowedUrlPatterns?: string[];
  maxNestingDepth?: number;
}

/**
 * Validation context for DSL validation
 */
export interface ValidationContext {
  security?: SecurityOptions;
  path?: string;
}

/**
 * Validation error with optional path and code
 */
export interface ValidationError {
  message: string;
  path?: string;
  code?: string;
}

/**
 * Result of DSL validation
 */
export interface DslValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Default maximum nesting depth */
const DEFAULT_MAX_NESTING_DEPTH = 32;

/**
 * DSL Node type
 */
interface DslNode {
  type?: string;
  props?: Record<string, unknown>;
  children?: DslNode[];
  actions?: DslAction[];
}

/**
 * DSL Action type
 */
interface DslAction {
  type?: string;
  payload?: Record<string, unknown>;
}

/**
 * Validate a complete DSL structure
 */
export function validateDsl(
  dsl: unknown,
  context?: ValidationContext
): DslValidationResult {
  const errors: ValidationError[] = [];
  const basePath = context?.path ?? 'root';

  // Validate input is an object
  if (!isPlainObject(dsl)) {
    errors.push({
      message: 'DSL must be a non-null object',
      path: basePath,
      code: 'INVALID_DSL',
    });
    return { valid: false, errors };
  }

  // Validate the node tree recursively
  const nodeErrors = validateNodeRecursive(
    dsl as DslNode,
    { ...context, path: basePath },
    0
  );
  errors.push(...nodeErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single DSL node
 */
export function validateNode(
  node: unknown,
  context?: ValidationContext
): ValidationError[] {
  if (!isPlainObject(node)) {
    return [];
  }

  const errors: ValidationError[] = [];
  const path = context?.path ?? 'node';
  const dslNode = node as DslNode;

  // Check forbidden tags
  if (dslNode.type && isForbiddenTag(dslNode.type)) {
    errors.push({
      message: 'Forbidden tag: ' + dslNode.type,
      path,
      code: 'FORBIDDEN_TAG',
    });
  }

  // Check allowed tags whitelist (if specified)
  if (
    context?.security?.allowedTags &&
    context.security.allowedTags.length > 0 &&
    dslNode.type
  ) {
    if (!context.security.allowedTags.includes(dslNode.type)) {
      errors.push({
        message: 'Tag not in allowed list: ' + dslNode.type,
        path,
        code: 'TAG_NOT_ALLOWED',
      });
    }
  }

  // Validate actions on this node
  if (dslNode.actions) {
    const actionErrors = validateActions(dslNode.actions, {
      ...context,
      path: path + '.actions',
    });
    errors.push(...actionErrors);
  }

  return errors;
}

/**
 * Validate an array of actions
 */
export function validateActions(
  actions: unknown,
  context?: ValidationContext
): ValidationError[] {
  // Handle null/undefined/non-array gracefully
  if (actions === null || actions === undefined) {
    return [];
  }

  if (!Array.isArray(actions)) {
    return [];
  }

  const errors: ValidationError[] = [];
  const basePath = context?.path ?? 'actions';
  const allowedActions = context?.security?.allowedActions ?? [];
  const allowedUrlPatterns = context?.security?.allowedUrlPatterns ?? [];

  actions.forEach((action, index) => {
    if (!isPlainObject(action)) {
      return;
    }

    const actionPath = basePath + '[' + index + ']';
    const dslAction = action as DslAction;
    const actionType = dslAction.type;

    if (!actionType) {
      return;
    }

    // Check forbidden actions
    if (isForbiddenAction(actionType)) {
      errors.push({
        message: 'Forbidden action: ' + actionType,
        path: actionPath,
        code: 'FORBIDDEN_ACTION',
      });
      return;
    }

    // Check restricted actions
    if (isRestrictedAction(actionType)) {
      if (!allowedActions.includes(actionType)) {
        errors.push({
          message: 'Restricted action requires explicit whitelist: ' + actionType,
          path: actionPath,
          code: 'RESTRICTED_ACTION',
        });
        return;
      }

      // For fetch action, validate URL against patterns
      if (actionType === 'fetch' && dslAction.payload?.['url']) {
        const url = String(dslAction.payload['url']);
        const urlValidation = validateActionUrl(url, allowedUrlPatterns);
        if (!urlValidation.valid) {
          errors.push({
            message: urlValidation.reason ?? 'Invalid URL',
            path: actionPath + '.payload.url',
            code: 'INVALID_URL',
          });
        }
      }
    }

    // Check allowed actions whitelist (for non-standard actions)
    if (
      context?.security?.allowedActions &&
      !isStandardAction(actionType) &&
      !allowedActions.includes(actionType)
    ) {
      errors.push({
        message: 'Action not in allowed list: ' + actionType,
        path: actionPath,
        code: 'ACTION_NOT_ALLOWED',
      });
    }

    // Validate URLs in navigate action
    if (actionType === 'navigate' && dslAction.payload) {
      const url = dslAction.payload['url'] ?? dslAction.payload['path'];
      if (url && typeof url === 'string') {
        const urlResult = validateUrl(url);
        if (!urlResult.valid) {
          errors.push({
            message: urlResult.reason ?? 'Invalid navigation URL',
            path: actionPath + '.payload.url',
            code: 'INVALID_URL',
          });
        }
      }
    }
  });

  return errors;
}

/**
 * Standard actions that do not require explicit whitelisting
 */
const STANDARD_ACTIONS = ['navigate', 'setState', 'emit', 'submit'];

function isStandardAction(action: string): boolean {
  return STANDARD_ACTIONS.includes(action);
}

/**
 * Recursively validate a node and its children
 */
function validateNodeRecursive(
  node: DslNode,
  context: ValidationContext,
  depth: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = context.path ?? 'root';
  const maxDepth =
    context.security?.maxNestingDepth ?? DEFAULT_MAX_NESTING_DEPTH;

  // Check nesting depth
  if (depth > maxDepth) {
    errors.push({
      message: 'Maximum nesting depth exceeded: ' + depth + ' > ' + maxDepth,
      path,
      code: 'MAX_DEPTH_EXCEEDED',
    });
    return errors;
  }

  // Validate the current node
  const nodeErrors = validateNode(node, context);
  errors.push(...nodeErrors);

  // Recursively validate children
  if (Array.isArray(node.children)) {
    node.children.forEach((child, index) => {
      if (isPlainObject(child)) {
        const childErrors = validateNodeRecursive(
          child as DslNode,
          { ...context, path: path + '.children[' + index + ']' },
          depth + 1
        );
        errors.push(...childErrors);
      }
    });
  }

  return errors;
}

/**
 * Validate a URL against allowed patterns
 */
function validateActionUrl(
  url: string,
  allowedPatterns: string[]
): { valid: boolean; reason?: string } {
  // Check forbidden schemes first
  if (isForbiddenScheme(url)) {
    const scheme = url.toLowerCase().split(':')[0];
    return { valid: false, reason: 'Forbidden URL scheme: ' + scheme };
  }

  // If no patterns specified, allow the URL
  if (allowedPatterns.length === 0) {
    return { valid: true };
  }

  // Check if URL matches any allowed pattern
  for (const pattern of allowedPatterns) {
    if (matchUrlPattern(url, pattern)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: 'URL does not match allowed patterns: ' + url };
}

/**
 * Simple URL pattern matching (supports * wildcard)
 */
function matchUrlPattern(url: string, pattern: string): boolean {
  // Escape special regex chars except *
  let regexPattern = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!;
    if (char === '*') {
      regexPattern += '.*';
    } else if ('.+?^${}()|[]\\'.includes(char)) {
      regexPattern += '\\' + char;
    } else {
      regexPattern += char;
    }
  }

  const regex = new RegExp('^' + regexPattern + '$');
  return regex.test(url);
}

/**
 * Check if a value is a plain object (not array, not null)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
