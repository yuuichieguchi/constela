/**
 * AST Validator for Constela
 *
 * This module provides validation for Constela AST structures using
 * custom validation and semantic validation.
 */

import {
  ConstelaError,
  createSchemaError,
  createUndefinedStateError,
  createUndefinedActionError,
  createDuplicateActionError,
  createUnsupportedVersionError,
  findSimilarNames,
} from '../types/error.js';
import type { Program } from '../types/ast.js';
import { BINARY_OPERATORS, UPDATE_OPERATIONS, HTTP_METHODS } from '../types/ast.js';

// ==================== Result Types ====================

export interface ValidationSuccess {
  ok: true;
  ast: Program;
}

export interface ValidationFailure {
  ok: false;
  error: ConstelaError;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ==================== Helper Functions ====================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ==================== Recursive Validation ====================

const VALID_VIEW_KINDS = ['element', 'text', 'if', 'each', 'component', 'slot', 'markdown', 'code', 'portal'];
const VALID_EXPR_TYPES = ['lit', 'state', 'var', 'bin', 'not', 'param', 'cond', 'get', 'style', 'validity', 'index', 'call', 'lambda', 'array'];
const VALID_PARAM_TYPES = ['string', 'number', 'boolean', 'json'];
const VALID_ACTION_TYPES = ['set', 'update', 'setPath', 'fetch', 'delay', 'interval', 'clearTimer', 'focus', 'if'];
const VALID_STATE_TYPES = ['number', 'string', 'list', 'boolean', 'object'];
// Use constants from ast.ts to avoid duplication
const VALID_BIN_OPS: readonly string[] = BINARY_OPERATORS;
const VALID_UPDATE_OPS: readonly string[] = UPDATE_OPERATIONS;
const VALID_HTTP_METHODS: readonly string[] = HTTP_METHODS;

interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validates a ViewNode and returns the first error found
 */
function validateViewNode(node: unknown, path: string): ValidationError | null {
  if (!isObject(node)) {
    return { path, message: 'must be an object' };
  }

  const kind = node['kind'];
  if (typeof kind !== 'string') {
    return { path: path + '/kind', message: 'kind is required' };
  }

  if (!VALID_VIEW_KINDS.includes(kind)) {
    return { path: path + '/kind', message: 'must be one of: element, text, if, each, component, slot, markdown, code, portal' };
  }

  // Check based on kind
  switch (kind) {
    case 'element':
      if (typeof node['tag'] !== 'string') {
        return { path: path + '/tag', message: 'tag is required' };
      }
      // Check props
      if (node['props'] !== undefined && isObject(node['props'])) {
        for (const [propName, propValue] of Object.entries(node['props'])) {
          // Props can be Expression or EventHandler
          if (isObject(propValue) && 'event' in propValue) {
            // EventHandler - skip for now
          } else {
            const error = validateExpression(propValue, path + '/props/' + propName);
            if (error) return error;
          }
        }
      }
      // Check children
      if (Array.isArray(node['children'])) {
        for (let i = 0; i < node['children'].length; i++) {
          const error = validateViewNode(node['children'][i], path + '/children/' + i);
          if (error) return error;
        }
      }
      break;

    case 'text':
      if (!('value' in node)) {
        return { path: path + '/value', message: 'value is required' };
      }
      return validateExpression(node['value'], path + '/value');

    case 'if':
      if (!('condition' in node)) {
        return { path: path + '/condition', message: 'condition is required' };
      }
      if (!('then' in node)) {
        return { path: path + '/then', message: 'then is required' };
      }
      {
        const condError = validateExpression(node['condition'], path + '/condition');
        if (condError) return condError;
        const thenError = validateViewNode(node['then'], path + '/then');
        if (thenError) return thenError;
        if ('else' in node) {
          const elseError = validateViewNode(node['else'], path + '/else');
          if (elseError) return elseError;
        }
      }
      break;

    case 'each':
      if (!('items' in node)) {
        return { path: path + '/items', message: 'items is required' };
      }
      if (typeof node['as'] !== 'string') {
        return { path: path + '/as', message: 'as is required' };
      }
      if (!('body' in node)) {
        return { path: path + '/body', message: 'body is required' };
      }
      {
        const itemsError = validateExpression(node['items'], path + '/items');
        if (itemsError) return itemsError;
        const bodyError = validateViewNode(node['body'], path + '/body');
        if (bodyError) return bodyError;
      }
      break;

    case 'component':
      if (typeof node['name'] !== 'string') {
        return { path: path + '/name', message: 'name is required' };
      }
      // Check props
      if (node['props'] !== undefined && isObject(node['props'])) {
        for (const [propName, propValue] of Object.entries(node['props'])) {
          const error = validateExpression(propValue, path + '/props/' + propName);
          if (error) return error;
        }
      }
      // Check children
      if (Array.isArray(node['children'])) {
        for (let i = 0; i < node['children'].length; i++) {
          const error = validateViewNode(node['children'][i], path + '/children/' + i);
          if (error) return error;
        }
      }
      break;

    case 'slot':
      // Slot has no required fields, it's just a placeholder
      break;

    case 'markdown':
      if (!('content' in node)) {
        return { path: path + '/content', message: 'content is required' };
      }
      return validateExpression(node['content'], path + '/content');

    case 'code':
      if (!('language' in node)) {
        return { path: path + '/language', message: 'language is required' };
      }
      if (!('content' in node)) {
        return { path: path + '/content', message: 'content is required' };
      }
      {
        const langError = validateExpression(node['language'], path + '/language');
        if (langError) return langError;
        return validateExpression(node['content'], path + '/content');
      }

    case 'portal':
      if (typeof node['target'] !== 'string') {
        return { path: path + '/target', message: 'target is required' };
      }
      // Check children
      if (Array.isArray(node['children'])) {
        for (let i = 0; i < node['children'].length; i++) {
          const error = validateViewNode(node['children'][i], path + '/children/' + i);
          if (error) return error;
        }
      }
      break;
  }

  return null;
}

/**
 * Validates an Expression and returns the first error found
 */
function validateExpression(expr: unknown, path: string): ValidationError | null {
  if (!isObject(expr)) {
    return { path, message: 'must be an object' };
  }

  const exprType = expr['expr'];
  if (typeof exprType !== 'string') {
    return { path: path + '/expr', message: 'expr is required' };
  }

  if (!VALID_EXPR_TYPES.includes(exprType)) {
    return { path: path + '/expr', message: `must be one of: ${VALID_EXPR_TYPES.join(', ')}` };
  }

  switch (exprType) {
    case 'lit':
      if (!('value' in expr)) {
        return { path: path + '/value', message: 'value is required' };
      }
      break;

    case 'state':
    case 'var':
      if (typeof expr['name'] !== 'string') {
        return { path: path + '/name', message: 'name is required' };
      }
      break;

    case 'bin':
      if (!('op' in expr)) {
        return { path: path + '/op', message: 'op is required' };
      }
      if (!VALID_BIN_OPS.includes(expr['op'] as string)) {
        return { path: path + '/op', message: 'must be a valid operator' };
      }
      if (!('left' in expr)) {
        return { path: path + '/left', message: 'left is required' };
      }
      if (!('right' in expr)) {
        return { path: path + '/right', message: 'right is required' };
      }
      {
        const leftError = validateExpression(expr['left'], path + '/left');
        if (leftError) return leftError;
        const rightError = validateExpression(expr['right'], path + '/right');
        if (rightError) return rightError;
      }
      break;

    case 'not':
      if (!('operand' in expr)) {
        return { path: path + '/operand', message: 'operand is required' };
      }
      return validateExpression(expr['operand'], path + '/operand');

    case 'param':
      if (typeof expr['name'] !== 'string') {
        return { path: path + '/name', message: 'name is required' };
      }
      // path is optional, but if present must be a string
      if ('path' in expr && typeof expr['path'] !== 'string') {
        return { path: path + '/path', message: 'path must be a string' };
      }
      break;

    case 'cond':
      if (!('if' in expr)) {
        return { path: path + '/if', message: 'if is required' };
      }
      if (!('then' in expr)) {
        return { path: path + '/then', message: 'then is required' };
      }
      if (!('else' in expr)) {
        return { path: path + '/else', message: 'else is required' };
      }
      {
        const ifError = validateExpression(expr['if'], path + '/if');
        if (ifError) return ifError;
        const thenError = validateExpression(expr['then'], path + '/then');
        if (thenError) return thenError;
        const elseError = validateExpression(expr['else'], path + '/else');
        if (elseError) return elseError;
      }
      break;

    case 'get':
      if (!('base' in expr)) {
        return { path: path + '/base', message: 'base is required' };
      }
      if (typeof expr['path'] !== 'string') {
        return { path: path + '/path', message: 'path is required' };
      }
      return validateExpression(expr['base'], path + '/base');

    case 'style':
      if (typeof expr['name'] !== 'string') {
        return { path: path + '/name', message: 'name is required' };
      }
      // Validate variants if present - each variant value must be an Expression
      if ('variants' in expr && expr['variants'] !== undefined) {
        if (!isObject(expr['variants'])) {
          return { path: path + '/variants', message: 'variants must be an object' };
        }
        for (const [variantKey, variantValue] of Object.entries(expr['variants'])) {
          const error = validateExpression(variantValue, path + '/variants/' + variantKey);
          if (error) return error;
        }
      }
      break;

    case 'validity':
      if (typeof expr['ref'] !== 'string') {
        return { path: path + '/ref', message: 'ref is required' };
      }
      break;

    case 'index':
      if (!('base' in expr)) {
        return { path: path + '/base', message: 'base is required' };
      }
      if (!('key' in expr)) {
        return { path: path + '/key', message: 'key is required' };
      }
      {
        const baseError = validateExpression(expr['base'], path + '/base');
        if (baseError) return baseError;
        const keyError = validateExpression(expr['key'], path + '/key');
        if (keyError) return keyError;
      }
      break;

    case 'call':
      if (!('target' in expr)) {
        return { path: path + '/target', message: 'target is required' };
      }
      if (typeof expr['method'] !== 'string') {
        return { path: path + '/method', message: 'method is required' };
      }
      {
        const targetError = validateExpression(expr['target'], path + '/target');
        if (targetError) return targetError;
        if ('args' in expr && expr['args'] !== undefined) {
          if (!Array.isArray(expr['args'])) {
            return { path: path + '/args', message: 'args must be an array' };
          }
          for (let i = 0; i < expr['args'].length; i++) {
            const argError = validateExpression(expr['args'][i], path + '/args/' + i);
            if (argError) return argError;
          }
        }
      }
      break;

    case 'lambda':
      if (typeof expr['param'] !== 'string') {
        return { path: path + '/param', message: 'param is required' };
      }
      // index is optional, but if present must be a string
      if ('index' in expr && typeof expr['index'] !== 'string') {
        return { path: path + '/index', message: 'index must be a string' };
      }
      if (!('body' in expr)) {
        return { path: path + '/body', message: 'body is required' };
      }
      {
        const bodyError = validateExpression(expr['body'], path + '/body');
        if (bodyError) return bodyError;
      }
      break;

    case 'array':
      if (!('elements' in expr)) {
        return { path: path + '/elements', message: 'elements is required' };
      }
      if (!Array.isArray(expr['elements'])) {
        return { path: path + '/elements', message: 'elements must be an array' };
      }
      for (let i = 0; i < expr['elements'].length; i++) {
        const elemError = validateExpression(expr['elements'][i], path + '/elements/' + i);
        if (elemError) return elemError;
      }
      break;
  }

  return null;
}

/**
 * Validates an ActionStep and returns the first error found
 */
function validateActionStep(step: unknown, path: string): ValidationError | null {
  if (!isObject(step)) {
    return { path, message: 'must be an object' };
  }

  const doType = step['do'];
  if (typeof doType !== 'string') {
    return { path: path + '/do', message: 'do is required' };
  }

  if (!VALID_ACTION_TYPES.includes(doType)) {
    return { path: path + '/do', message: `must be one of: ${VALID_ACTION_TYPES.join(', ')}` };
  }

  switch (doType) {
    case 'set':
      if (typeof step['target'] !== 'string') {
        return { path: path + '/target', message: 'target is required' };
      }
      if (!('value' in step)) {
        return { path: path + '/value', message: 'value is required' };
      }
      return validateExpression(step['value'], path + '/value');

    case 'update':
      if (typeof step['target'] !== 'string') {
        return { path: path + '/target', message: 'target is required' };
      }
      if (!('operation' in step)) {
        return { path: path + '/operation', message: 'operation is required' };
      }
      if (!VALID_UPDATE_OPS.includes(step['operation'] as string)) {
        return { path: path + '/operation', message: 'must be a valid operation' };
      }
      if ('value' in step) {
        return validateExpression(step['value'], path + '/value');
      }
      break;

    case 'setPath':
      if (typeof step['target'] !== 'string') {
        return { path: path + '/target', message: 'target is required' };
      }
      if (!('path' in step)) {
        return { path: path + '/path', message: 'path is required' };
      }
      {
        const pathError = validateExpression(step['path'], path + '/path');
        if (pathError) return pathError;
      }
      if (!('value' in step)) {
        return { path: path + '/value', message: 'value is required' };
      }
      return validateExpression(step['value'], path + '/value');

    case 'fetch':
      if (!('url' in step)) {
        return { path: path + '/url', message: 'url is required' };
      }
      {
        const urlError = validateExpression(step['url'], path + '/url');
        if (urlError) return urlError;
      }
      if ('method' in step) {
        if (!VALID_HTTP_METHODS.includes(step['method'] as string)) {
          return { path: path + '/method', message: 'must be a valid HTTP method' };
        }
      }
      if ('body' in step) {
        const bodyError = validateExpression(step['body'], path + '/body');
        if (bodyError) return bodyError;
      }
      break;

    case 'delay':
      if (!('ms' in step)) {
        return { path: path + '/ms', message: 'ms is required' };
      }
      if (!('then' in step)) {
        return { path: path + '/then', message: 'then is required' };
      }
      {
        const msError = validateExpression(step['ms'], path + '/ms');
        if (msError) return msError;
        if (!Array.isArray(step['then'])) {
          return { path: path + '/then', message: 'then must be an array' };
        }
        for (let i = 0; i < step['then'].length; i++) {
          const thenError = validateActionStep(step['then'][i], path + '/then/' + i);
          if (thenError) return thenError;
        }
      }
      break;

    case 'interval':
      if (!('ms' in step)) {
        return { path: path + '/ms', message: 'ms is required' };
      }
      if (typeof step['action'] !== 'string') {
        return { path: path + '/action', message: 'action is required' };
      }
      {
        const msError = validateExpression(step['ms'], path + '/ms');
        if (msError) return msError;
      }
      break;

    case 'clearTimer':
      if (!('target' in step)) {
        return { path: path + '/target', message: 'target is required' };
      }
      return validateExpression(step['target'], path + '/target');

    case 'focus':
      if (!('target' in step)) {
        return { path: path + '/target', message: 'target is required' };
      }
      if (typeof step['operation'] !== 'string') {
        return { path: path + '/operation', message: 'operation is required' };
      }
      return validateExpression(step['target'], path + '/target');

    case 'if':
      if (!('condition' in step)) {
        return { path: path + '/condition', message: 'condition is required' };
      }
      if (!('then' in step)) {
        return { path: path + '/then', message: 'then is required' };
      }
      {
        const condError = validateExpression(step['condition'], path + '/condition');
        if (condError) return condError;
        if (!Array.isArray(step['then'])) {
          return { path: path + '/then', message: 'then must be an array' };
        }
        for (let i = 0; i < step['then'].length; i++) {
          const thenError = validateActionStep(step['then'][i], path + '/then/' + i);
          if (thenError) return thenError;
        }
        if ('else' in step) {
          if (!Array.isArray(step['else'])) {
            return { path: path + '/else', message: 'else must be an array' };
          }
          for (let i = 0; i < step['else'].length; i++) {
            const elseError = validateActionStep(step['else'][i], path + '/else/' + i);
            if (elseError) return elseError;
          }
        }
      }
      break;
  }

  return null;
}

/**
 * Validates a StateField and returns the first error found
 */
function validateStateField(field: unknown, path: string): ValidationError | null {
  if (!isObject(field)) {
    return { path, message: 'must be an object' };
  }

  const fieldType = field['type'];
  if (typeof fieldType !== 'string') {
    return { path: path + '/type', message: 'type is required' };
  }

  if (!VALID_STATE_TYPES.includes(fieldType)) {
    return { path: path + '/type', message: 'must be one of: number, string, list' };
  }

  if (!('initial' in field)) {
    return { path: path + '/initial', message: 'initial is required' };
  }

  // Validate initial value matches type
  switch (fieldType) {
    case 'number':
      if (typeof field['initial'] !== 'number') {
        return { path: path + '/initial', message: 'must be a number' };
      }
      break;
    case 'string':
      if (typeof field['initial'] !== 'string') {
        return { path: path + '/initial', message: 'must be a string' };
      }
      break;
    case 'list':
      if (!Array.isArray(field['initial'])) {
        return { path: path + '/initial', message: 'must be an array' };
      }
      break;
    case 'boolean':
      if (typeof field['initial'] !== 'boolean') {
        return { path: path + '/initial', message: 'must be a boolean' };
      }
      break;
    case 'object':
      if (!isObject(field['initial'])) {
        return { path: path + '/initial', message: 'must be an object' };
      }
      break;
  }

  return null;
}

/**
 * Validates a ParamDef and returns the first error found
 */
function validateParamDef(param: unknown, path: string): ValidationError | null {
  if (!isObject(param)) {
    return { path, message: 'must be an object' };
  }

  const paramType = param['type'];
  if (typeof paramType !== 'string') {
    return { path: path + '/type', message: 'type is required' };
  }

  if (!VALID_PARAM_TYPES.includes(paramType)) {
    return { path: path + '/type', message: 'must be one of: string, number, boolean, json' };
  }

  // required is optional, but if present must be a boolean
  if ('required' in param && typeof param['required'] !== 'boolean') {
    return { path: path + '/required', message: 'required must be a boolean' };
  }

  return null;
}

/**
 * Validates a ComponentDef and returns the first error found
 */
function validateComponentDef(def: unknown, path: string): ValidationError | null {
  if (!isObject(def)) {
    return { path, message: 'must be an object' };
  }

  // view is required
  if (!('view' in def)) {
    return { path: path + '/view', message: 'view is required' };
  }

  // Validate params if present
  if ('params' in def && isObject(def['params'])) {
    for (const [paramName, paramDef] of Object.entries(def['params'])) {
      const error = validateParamDef(paramDef, path + '/params/' + paramName);
      if (error) return error;
    }
  }

  // Validate view
  const viewError = validateViewNode(def['view'], path + '/view');
  if (viewError) return viewError;

  return null;
}

/**
 * Validates a StylePreset and returns the first error found
 */
function validateStylePreset(preset: unknown, path: string): ValidationError | null {
  if (!isObject(preset)) {
    return { path, message: 'must be an object' };
  }

  // base is required and must be a string
  if (!('base' in preset)) {
    return { path: path + '/base', message: 'base is required' };
  }
  if (typeof preset['base'] !== 'string') {
    return { path: path + '/base', message: 'base must be a string' };
  }

  // Validate variants if present
  if ('variants' in preset && preset['variants'] !== undefined) {
    if (!isObject(preset['variants'])) {
      return { path: path + '/variants', message: 'variants must be an object' };
    }
    for (const [variantKey, variantOptions] of Object.entries(preset['variants'])) {
      if (!isObject(variantOptions)) {
        return { path: path + '/variants/' + variantKey, message: 'variant options must be an object' };
      }
      for (const [optionKey, optionValue] of Object.entries(variantOptions)) {
        if (typeof optionValue !== 'string') {
          return { path: path + '/variants/' + variantKey + '/' + optionKey, message: 'variant value must be a string' };
        }
      }
    }
  }

  // Validate defaultVariants if present
  if ('defaultVariants' in preset && preset['defaultVariants'] !== undefined) {
    if (!isObject(preset['defaultVariants'])) {
      return { path: path + '/defaultVariants', message: 'defaultVariants must be an object' };
    }
    // Get variant keys for validation
    const variantKeys = isObject(preset['variants']) ? Object.keys(preset['variants']) : [];
    for (const [key, value] of Object.entries(preset['defaultVariants'])) {
      if (typeof value !== 'string') {
        return { path: path + '/defaultVariants/' + key, message: 'default variant value must be a string' };
      }
      // Check if the key exists in variants
      if (!variantKeys.includes(key)) {
        return { path: path + '/defaultVariants/' + key, message: `'${key}' is not a defined variant` };
      }
    }
  }

  // Validate compoundVariants if present
  if ('compoundVariants' in preset && preset['compoundVariants'] !== undefined) {
    if (!Array.isArray(preset['compoundVariants'])) {
      return { path: path + '/compoundVariants', message: 'compoundVariants must be an array' };
    }
    for (let i = 0; i < preset['compoundVariants'].length; i++) {
      const compound = preset['compoundVariants'][i];
      if (!isObject(compound)) {
        return { path: path + '/compoundVariants/' + i, message: 'compound variant must be an object' };
      }
      if (typeof compound['class'] !== 'string') {
        return { path: path + '/compoundVariants/' + i + '/class', message: 'class is required' };
      }
    }
  }

  return null;
}

/**
 * Custom validation for the entire AST
 */
function customValidateAst(input: Record<string, unknown>): ValidationError | null {
  // Validate state fields
  if (isObject(input['state'])) {
    for (const [name, field] of Object.entries(input['state'])) {
      const error = validateStateField(field, '/state/' + name);
      if (error) return error;
    }
  }

  // Validate styles
  if ('styles' in input && isObject(input['styles'])) {
    for (const [name, preset] of Object.entries(input['styles'])) {
      const error = validateStylePreset(preset, '/styles/' + name);
      if (error) return error;
    }
  }

  // Validate actions
  if (Array.isArray(input['actions'])) {
    for (let i = 0; i < input['actions'].length; i++) {
      const action = input['actions'][i];
      if (isObject(action) && Array.isArray(action['steps'])) {
        for (let j = 0; j < action['steps'].length; j++) {
          const error = validateActionStep(action['steps'][j], '/actions/' + i + '/steps/' + j);
          if (error) return error;
        }
      }
    }
  }

  // Validate view
  if ('view' in input) {
    const error = validateViewNode(input['view'], '/view');
    if (error) return error;
  }

  // Validate components
  if ('components' in input && isObject(input['components'])) {
    for (const [name, def] of Object.entries(input['components'])) {
      const error = validateComponentDef(def, '/components/' + name);
      if (error) return error;
    }
  }

  return null;
}

// ==================== Semantic Validation ====================

interface SemanticContext {
  stateNames: Set<string>;
  actionNames: Set<string>;
}

/**
 * Creates error options with suggestion and available names
 */
function createErrorOptionsWithSuggestion(
  name: string,
  availableNames: Set<string>
): { suggestion: string | undefined; context: { availableNames: string[] } } {
  const availableNamesArray = Array.from(availableNames);
  const similarNames = findSimilarNames(name, availableNames);
  const suggestion = similarNames.length > 0 ? `Did you mean '${similarNames[0]}'?` : undefined;
  return {
    suggestion,
    context: { availableNames: availableNamesArray },
  };
}

function collectSemanticContext(ast: Record<string, unknown>): SemanticContext {
  const stateNames = new Set<string>();
  const actionNames = new Set<string>();

  // Collect state names
  if (isObject(ast['state'])) {
    for (const name of Object.keys(ast['state'])) {
      stateNames.add(name);
    }
  }

  // Collect action names
  if (Array.isArray(ast['actions'])) {
    for (const action of ast['actions']) {
      if (isObject(action) && typeof action['name'] === 'string') {
        actionNames.add(action['name']);
      }
    }
  }

  return { stateNames, actionNames };
}

function validateStateReferences(
  node: unknown,
  path: string,
  stateNames: Set<string>
): ConstelaError | null {
  if (!isObject(node)) return null;

  // Check state expressions
  if (node['expr'] === 'state' && typeof node['name'] === 'string') {
    if (!stateNames.has(node['name'])) {
      const errorOptions = createErrorOptionsWithSuggestion(node['name'], stateNames);
      return createUndefinedStateError(node['name'], path + '/' + node['name'], errorOptions);
    }
  }

  // Recursively check children
  for (const [key, value] of Object.entries(node)) {
    if (isObject(value)) {
      const error = validateStateReferences(value, path + '/' + key, stateNames);
      if (error) return error;
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const error = validateStateReferences(value[i], path + '/' + key + '/' + i, stateNames);
        if (error) return error;
      }
    }
  }

  return null;
}

function validateActionTargets(
  ast: Record<string, unknown>,
  stateNames: Set<string>
): ConstelaError | null {
  if (!Array.isArray(ast['actions'])) return null;

  for (let i = 0; i < ast['actions'].length; i++) {
    const action = ast['actions'][i];
    if (!isObject(action) || !Array.isArray(action['steps'])) continue;

    for (let j = 0; j < action['steps'].length; j++) {
      const step = action['steps'][j];
      if (!isObject(step)) continue;

      // Check set and update targets
      if ((step['do'] === 'set' || step['do'] === 'update') && typeof step['target'] === 'string') {
        if (!stateNames.has(step['target'])) {
          const errorOptions = createErrorOptionsWithSuggestion(step['target'], stateNames);
          return createUndefinedStateError(step['target'], '/actions/' + i + '/steps/' + j + '/target', errorOptions);
        }
      }
    }
  }

  return null;
}

function validateActionReferences(
  node: unknown,
  path: string,
  actionNames: Set<string>
): ConstelaError | null {
  if (!isObject(node)) return null;

  // Check event handlers in props
  if (isObject(node['props'])) {
    for (const [propName, propValue] of Object.entries(node['props'])) {
      if (isObject(propValue) && 'event' in propValue && 'action' in propValue) {
        const actionName = propValue['action'];
        if (typeof actionName === 'string' && !actionNames.has(actionName)) {
          const errorOptions = createErrorOptionsWithSuggestion(actionName, actionNames);
          return createUndefinedActionError(actionName, path + '/props/' + propName, errorOptions);
        }
      }
    }
  }

  // Recursively check children
  if (Array.isArray(node['children'])) {
    for (let i = 0; i < node['children'].length; i++) {
      const error = validateActionReferences(
        node['children'][i],
        path + '/children/' + i,
        actionNames
      );
      if (error) return error;
    }
  }

  // Check then/else branches for if nodes
  if (isObject(node['then'])) {
    const error = validateActionReferences(node['then'], path + '/then', actionNames);
    if (error) return error;
  }
  if (isObject(node['else'])) {
    const error = validateActionReferences(node['else'], path + '/else', actionNames);
    if (error) return error;
  }

  // Check body for each nodes
  if (isObject(node['body'])) {
    const error = validateActionReferences(node['body'], path + '/body', actionNames);
    if (error) return error;
  }

  return null;
}

function validateDuplicateActions(ast: Record<string, unknown>): ConstelaError | null {
  if (!Array.isArray(ast['actions'])) return null;

  const seenNames = new Set<string>();
  for (let i = 0; i < ast['actions'].length; i++) {
    const action = ast['actions'][i];
    if (!isObject(action) || typeof action['name'] !== 'string') continue;

    const name = action['name'];
    if (seenNames.has(name)) {
      return createDuplicateActionError(name, '/actions/' + i);
    }
    seenNames.add(name);
  }

  return null;
}

function performSemanticValidation(ast: Record<string, unknown>): ConstelaError | null {
  const { stateNames, actionNames } = collectSemanticContext(ast);

  // Check for duplicate action names
  const duplicateError = validateDuplicateActions(ast);
  if (duplicateError) return duplicateError;

  // Check state references in view
  if (isObject(ast['view'])) {
    const stateRefError = validateStateReferences(ast['view'], '/view', stateNames);
    if (stateRefError) return stateRefError;
  }

  // Check action targets in action steps
  const actionTargetError = validateActionTargets(ast, stateNames);
  if (actionTargetError) return actionTargetError;

  // Check action references in event handlers
  if (isObject(ast['view'])) {
    const actionRefError = validateActionReferences(ast['view'], '/view', actionNames);
    if (actionRefError) return actionRefError;
  }

  return null;
}

// ==================== Main Validator ====================

/**
 * Validates a Constela AST
 *
 * @param input - The input to validate
 * @returns A validation result with either the valid AST or an error
 */
export function validateAst(input: unknown): ValidationResult {
  // Check for null, undefined, or non-object
  if (!isObject(input)) {
    return {
      ok: false,
      error: createSchemaError('Input must be an object', '/'),
    };
  }

  // Check version first for unsupported version error
  if ('version' in input && input['version'] !== '1.0') {
    if (typeof input['version'] === 'string') {
      return {
        ok: false,
        error: createUnsupportedVersionError(input['version']),
      };
    }
  }

  // Check required top-level fields
  if (!('version' in input)) {
    return {
      ok: false,
      error: createSchemaError("must have required property 'version'", '/version'),
    };
  }

  if (!('state' in input)) {
    return {
      ok: false,
      error: createSchemaError("must have required property 'state'", '/state'),
    };
  }

  if (!('actions' in input)) {
    return {
      ok: false,
      error: createSchemaError("must have required property 'actions'", '/actions'),
    };
  }

  if (!('view' in input)) {
    return {
      ok: false,
      error: createSchemaError("must have required property 'view'", '/view'),
    };
  }

  // Run custom validation for detailed error paths
  const customError = customValidateAst(input);
  if (customError) {
    return {
      ok: false,
      error: createSchemaError(customError.message, customError.path),
    };
  }

  // Run semantic validation
  const semanticError = performSemanticValidation(input);
  if (semanticError) {
    return {
      ok: false,
      error: semanticError,
    };
  }

  return {
    ok: true,
    ast: input as unknown as Program,
  };
}
