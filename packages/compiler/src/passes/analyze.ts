/**
 * Analyze Pass - Static analysis for semantic validation
 *
 * This pass performs semantic analysis on the validated AST:
 * - Collects state and action names
 * - Validates state references
 * - Validates action references
 * - Validates variable scopes in each loops
 * - Detects duplicate action names
 */

import type {
  Program,
  ConstelaError,
  ViewNode,
  Expression,
  ActionStep,
} from '@constela/core';
import {
  createUndefinedStateError,
  createUndefinedActionError,
  createUndefinedVarError,
  createDuplicateActionError,
  isEventHandler,
} from '@constela/core';

// ==================== Types ====================

export interface AnalysisContext {
  stateNames: Set<string>;
  actionNames: Set<string>;
}

export interface AnalyzePassSuccess {
  ok: true;
  ast: Program;
  context: AnalysisContext;
}

export interface AnalyzePassFailure {
  ok: false;
  errors: ConstelaError[];
}

export type AnalyzePassResult = AnalyzePassSuccess | AnalyzePassFailure;

// Re-export for convenience
export type { Program };

// ==================== Helper Functions ====================

/**
 * Builds a JSON Pointer path from segments
 */
function buildPath(base: string, ...segments: (string | number)[]): string {
  return segments.reduce<string>((p, s) => `${p}/${s}`, base);
}

// ==================== Context Collection ====================

/**
 * Collects state and action names from the AST
 */
function collectContext(ast: Program): AnalysisContext {
  const stateNames = new Set<string>(Object.keys(ast.state));
  const actionNames = new Set<string>(ast.actions.map((a) => a.name));

  return { stateNames, actionNames };
}

// ==================== Duplicate Action Detection ====================

/**
 * Checks for duplicate action names
 */
function checkDuplicateActions(ast: Program): ConstelaError[] {
  const errors: ConstelaError[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < ast.actions.length; i++) {
    const action = ast.actions[i];
    if (action === undefined) continue;
    if (seenNames.has(action.name)) {
      errors.push(createDuplicateActionError(action.name, `/actions/${i}`));
    }
    seenNames.add(action.name);
  }

  return errors;
}

// ==================== Expression Validation ====================

/**
 * Validates an expression for state and variable references
 */
function validateExpression(
  expr: Expression,
  path: string,
  context: AnalysisContext,
  scope: Set<string>
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (expr.expr) {
    case 'state':
      if (!context.stateNames.has(expr.name)) {
        errors.push(createUndefinedStateError(expr.name, path));
      }
      break;

    case 'var':
      if (!scope.has(expr.name)) {
        errors.push(createUndefinedVarError(expr.name, path));
      }
      break;

    case 'bin':
      errors.push(...validateExpression(expr.left, buildPath(path, 'left'), context, scope));
      errors.push(...validateExpression(expr.right, buildPath(path, 'right'), context, scope));
      break;

    case 'not':
      errors.push(...validateExpression(expr.operand, buildPath(path, 'operand'), context, scope));
      break;

    case 'lit':
      // Literals are always valid
      break;
  }

  return errors;
}

// ==================== Action Step Validation ====================

/**
 * Validates action steps for state references
 *
 * Note: Variable references (expr: 'var') in action steps are NOT validated
 * because they are runtime-provided (from event payloads or action invocation context).
 */
function validateActionStep(
  step: ActionStep,
  path: string,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (step.do) {
    case 'set':
      if (!context.stateNames.has(step.target)) {
        errors.push(createUndefinedStateError(step.target, buildPath(path, 'target')));
      }
      // Validate state references only (skip var validation - runtime provided)
      errors.push(
        ...validateExpressionStateOnly(step.value, buildPath(path, 'value'), context)
      );
      break;

    case 'update':
      if (!context.stateNames.has(step.target)) {
        errors.push(createUndefinedStateError(step.target, buildPath(path, 'target')));
      }
      if (step.value) {
        errors.push(
          ...validateExpressionStateOnly(step.value, buildPath(path, 'value'), context)
        );
      }
      break;

    case 'fetch':
      errors.push(
        ...validateExpressionStateOnly(step.url, buildPath(path, 'url'), context)
      );
      if (step.body) {
        errors.push(
          ...validateExpressionStateOnly(step.body, buildPath(path, 'body'), context)
        );
      }
      // Validate onSuccess and onError callbacks
      if (step.onSuccess) {
        for (let i = 0; i < step.onSuccess.length; i++) {
          const successStep = step.onSuccess[i];
          if (successStep === undefined) continue;
          errors.push(
            ...validateActionStep(successStep, buildPath(path, 'onSuccess', i), context)
          );
        }
      }
      if (step.onError) {
        for (let i = 0; i < step.onError.length; i++) {
          const errorStep = step.onError[i];
          if (errorStep === undefined) continue;
          errors.push(
            ...validateActionStep(errorStep, buildPath(path, 'onError', i), context)
          );
        }
      }
      break;
  }

  return errors;
}

/**
 * Validates an expression for state references only (ignores var references)
 * Used in action steps where var references are runtime-provided
 */
function validateExpressionStateOnly(
  expr: Expression,
  path: string,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (expr.expr) {
    case 'state':
      if (!context.stateNames.has(expr.name)) {
        errors.push(createUndefinedStateError(expr.name, path));
      }
      break;

    case 'var':
      // Skip var validation - these are runtime-provided in actions
      break;

    case 'bin':
      errors.push(...validateExpressionStateOnly(expr.left, buildPath(path, 'left'), context));
      errors.push(...validateExpressionStateOnly(expr.right, buildPath(path, 'right'), context));
      break;

    case 'not':
      errors.push(
        ...validateExpressionStateOnly(expr.operand, buildPath(path, 'operand'), context)
      );
      break;

    case 'lit':
      // Literals are always valid
      break;
  }

  return errors;
}

/**
 * Validates an expression in event handler payloads
 * - State references are validated
 * - Loop variables (from each scope) are validated
 * - Other variables (like event.target.value) are allowed as runtime-provided
 */
function validateExpressionInEventPayload(
  expr: Expression,
  path: string,
  context: AnalysisContext,
  scope: Set<string>
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (expr.expr) {
    case 'state':
      if (!context.stateNames.has(expr.name)) {
        errors.push(createUndefinedStateError(expr.name, path));
      }
      break;

    case 'var':
      // In event payloads, we allow:
      // 1. Variables in scope (from each loops)
      // 2. Any other variables (runtime-provided like event.target.value)
      // So we only validate if it looks like a simple scope variable
      // and is NOT in scope. Runtime variables like "event.target.value" are allowed.
      // For simplicity, we skip var validation in event payloads entirely
      // since they can reference both scope variables and DOM event properties.
      break;

    case 'bin':
      errors.push(
        ...validateExpressionInEventPayload(expr.left, buildPath(path, 'left'), context, scope)
      );
      errors.push(
        ...validateExpressionInEventPayload(expr.right, buildPath(path, 'right'), context, scope)
      );
      break;

    case 'not':
      errors.push(
        ...validateExpressionInEventPayload(
          expr.operand,
          buildPath(path, 'operand'),
          context,
          scope
        )
      );
      break;

    case 'lit':
      // Literals are always valid
      break;
  }

  return errors;
}

// ==================== View Node Validation ====================

/**
 * Validates a view node for state, action, and variable references
 */
function validateViewNode(
  node: ViewNode,
  path: string,
  context: AnalysisContext,
  scope: Set<string>
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (node.kind) {
    case 'element':
      // Validate props
      if (node.props) {
        for (const [propName, propValue] of Object.entries(node.props)) {
          const propPath = buildPath(path, 'props', propName);
          if (isEventHandler(propValue)) {
            // Check action reference
            if (!context.actionNames.has(propValue.action)) {
              errors.push(createUndefinedActionError(propValue.action, propPath));
            }
            // Check payload expression if present
            // Note: Event handler payloads can reference DOM event properties (e.g., event.target.value)
            // which are runtime-provided, so we validate state refs only in payloads
            if (propValue.payload) {
              errors.push(
                ...validateExpressionInEventPayload(
                  propValue.payload as Expression,
                  buildPath(propPath, 'payload'),
                  context,
                  scope
                )
              );
            }
          } else {
            // It's an expression
            errors.push(...validateExpression(propValue as Expression, propPath, context, scope));
          }
        }
      }
      // Validate children
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child === undefined) continue;
          errors.push(
            ...validateViewNode(child, buildPath(path, 'children', i), context, scope)
          );
        }
      }
      break;

    case 'text':
      errors.push(...validateExpression(node.value, buildPath(path, 'value'), context, scope));
      break;

    case 'if':
      errors.push(
        ...validateExpression(node.condition, buildPath(path, 'condition'), context, scope)
      );
      errors.push(...validateViewNode(node.then, buildPath(path, 'then'), context, scope));
      if (node.else) {
        errors.push(...validateViewNode(node.else, buildPath(path, 'else'), context, scope));
      }
      break;

    case 'each':
      // Validate items expression with current scope
      errors.push(...validateExpression(node.items, buildPath(path, 'items'), context, scope));

      // Create new scope for body with 'as' and optional 'index' variables
      const bodyScope = new Set(scope);
      bodyScope.add(node.as);
      if (node.index) {
        bodyScope.add(node.index);
      }

      // Validate key expression if present (uses the new scope)
      if (node.key) {
        errors.push(...validateExpression(node.key, buildPath(path, 'key'), context, bodyScope));
      }

      // Validate body with new scope
      errors.push(...validateViewNode(node.body, buildPath(path, 'body'), context, bodyScope));
      break;
  }

  return errors;
}

// ==================== Action Validation ====================

/**
 * Validates all actions for state references
 */
function validateActions(ast: Program, context: AnalysisContext): ConstelaError[] {
  const errors: ConstelaError[] = [];

  for (let i = 0; i < ast.actions.length; i++) {
    const action = ast.actions[i];
    if (action === undefined) continue;
    for (let j = 0; j < action.steps.length; j++) {
      const step = action.steps[j];
      if (step === undefined) continue;
      errors.push(
        ...validateActionStep(step, buildPath('', 'actions', i, 'steps', j), context)
      );
    }
  }

  return errors;
}

// ==================== Main Analyze Function ====================

/**
 * Performs static analysis on the validated AST
 *
 * - Collects state names
 * - Collects action names
 * - Validates state references
 * - Validates action references
 * - Validates variable scopes
 *
 * @param ast - Validated AST from validate pass
 * @returns AnalyzePassResult
 */
export function analyzePass(ast: Program): AnalyzePassResult {
  const context = collectContext(ast);
  const errors: ConstelaError[] = [];

  // Check for duplicate action names
  errors.push(...checkDuplicateActions(ast));

  // Validate actions
  errors.push(...validateActions(ast, context));

  // Validate view with empty initial scope
  errors.push(...validateViewNode(ast.view, '/view', context, new Set<string>()));

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    ast,
    context,
  };
}
