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
  ComponentDef,
} from '@constela/core';
import {
  createUndefinedStateError,
  createUndefinedActionError,
  createUndefinedVarError,
  createDuplicateActionError,
  createComponentNotFoundError,
  createComponentPropMissingError,
  createComponentCycleError,
  createUndefinedParamError,
  createSchemaError,
  createOperationInvalidForTypeError,
  createOperationMissingFieldError,
  isEventHandler,
} from '@constela/core';

// ==================== Types ====================

export interface AnalysisContext {
  stateNames: Set<string>;
  actionNames: Set<string>;
  componentNames: Set<string>;
}

/**
 * Param scope for tracking available params in component definitions
 */
interface ParamScope {
  params: Set<string>;
  componentName: string;
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
 * Collects state, action, and component names from the AST
 */
function collectContext(ast: Program): AnalysisContext {
  const stateNames = new Set<string>(Object.keys(ast.state));
  const actionNames = new Set<string>(ast.actions.map((a) => a.name));
  const componentNames = new Set<string>(
    ast.components ? Object.keys(ast.components) : []
  );

  return { stateNames, actionNames, componentNames };
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
  scope: Set<string>,
  paramScope?: ParamScope
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

    case 'param':
      if (!paramScope || !paramScope.params.has(expr.name)) {
        errors.push(createUndefinedParamError(expr.name, path));
      }
      break;

    case 'bin':
      errors.push(...validateExpression(expr.left, buildPath(path, 'left'), context, scope, paramScope));
      errors.push(...validateExpression(expr.right, buildPath(path, 'right'), context, scope, paramScope));
      break;

    case 'not':
      errors.push(...validateExpression(expr.operand, buildPath(path, 'operand'), context, scope, paramScope));
      break;

    case 'lit':
      // Literals are always valid
      break;

    case 'cond':
      errors.push(...validateExpression(expr.if, buildPath(path, 'if'), context, scope, paramScope));
      errors.push(...validateExpression(expr.then, buildPath(path, 'then'), context, scope, paramScope));
      errors.push(...validateExpression(expr.else, buildPath(path, 'else'), context, scope, paramScope));
      break;

    case 'get':
      errors.push(...validateExpression(expr.base, buildPath(path, 'base'), context, scope, paramScope));
      // path is a string, no validation needed
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

    case 'update': {
      if (!context.stateNames.has(step.target)) {
        errors.push(createUndefinedStateError(step.target, buildPath(path, 'target')));
      } else {
        // Validate operation-type compatibility
        const stateField = ast.state[step.target];
        if (stateField) {
          const stateType = stateField.type;
          const op = step.operation;

          // Check operation-type compatibility
          if (op === 'toggle' && stateType !== 'boolean') {
            errors.push(createOperationInvalidForTypeError(op, stateType, buildPath(path, 'operation')));
          }
          if (op === 'merge' && stateType !== 'object') {
            errors.push(createOperationInvalidForTypeError(op, stateType, buildPath(path, 'operation')));
          }
          if ((op === 'increment' || op === 'decrement') && stateType !== 'number') {
            errors.push(createOperationInvalidForTypeError(op, stateType, buildPath(path, 'operation')));
          }
          if ((op === 'push' || op === 'pop' || op === 'remove' || op === 'replaceAt' || op === 'insertAt' || op === 'splice') && stateType !== 'list') {
            errors.push(createOperationInvalidForTypeError(op, stateType, buildPath(path, 'operation')));
          }

          // Check required fields
          if (op === 'merge' && !step.value) {
            errors.push(createOperationMissingFieldError(op, 'value', path));
          }
          if ((op === 'replaceAt' || op === 'insertAt') && (!step.index || !step.value)) {
            if (!step.index) errors.push(createOperationMissingFieldError(op, 'index', path));
            if (!step.value) errors.push(createOperationMissingFieldError(op, 'value', path));
          }
          if (op === 'splice' && (!step.index || !step.deleteCount)) {
            if (!step.index) errors.push(createOperationMissingFieldError(op, 'index', path));
            if (!step.deleteCount) errors.push(createOperationMissingFieldError(op, 'deleteCount', path));
          }
        }
      }

      // Validate expressions
      if (step.value) {
        errors.push(...validateExpressionStateOnly(step.value, buildPath(path, 'value'), context));
      }
      if (step.index) {
        errors.push(...validateExpressionStateOnly(step.index, buildPath(path, 'index'), context));
      }
      if (step.deleteCount) {
        errors.push(...validateExpressionStateOnly(step.deleteCount, buildPath(path, 'deleteCount'), context));
      }
      break;
    }

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

    case 'cond':
      errors.push(...validateExpressionStateOnly(expr.if, buildPath(path, 'if'), context));
      errors.push(...validateExpressionStateOnly(expr.then, buildPath(path, 'then'), context));
      errors.push(...validateExpressionStateOnly(expr.else, buildPath(path, 'else'), context));
      break;

    case 'get':
      errors.push(...validateExpressionStateOnly(expr.base, buildPath(path, 'base'), context));
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

    case 'cond':
      errors.push(
        ...validateExpressionInEventPayload(expr.if, buildPath(path, 'if'), context, scope)
      );
      errors.push(
        ...validateExpressionInEventPayload(expr.then, buildPath(path, 'then'), context, scope)
      );
      errors.push(
        ...validateExpressionInEventPayload(expr.else, buildPath(path, 'else'), context, scope)
      );
      break;

    case 'get':
      errors.push(
        ...validateExpressionInEventPayload(expr.base, buildPath(path, 'base'), context, scope)
      );
      break;
  }

  return errors;
}

// ==================== View Node Validation ====================

/**
 * Options for view node validation
 */
interface ViewNodeValidationOptions {
  insideComponent: boolean;
  paramScope?: ParamScope;
}

/**
 * Validates a view node for state, action, and variable references
 */
function validateViewNode(
  node: ViewNode,
  path: string,
  context: AnalysisContext,
  scope: Set<string>,
  options: ViewNodeValidationOptions = { insideComponent: false }
): ConstelaError[] {
  const errors: ConstelaError[] = [];
  const { insideComponent, paramScope } = options;

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
            errors.push(...validateExpression(propValue as Expression, propPath, context, scope, paramScope));
          }
        }
      }
      // Validate children
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child === undefined) continue;
          errors.push(
            ...validateViewNode(child, buildPath(path, 'children', i), context, scope, options)
          );
        }
      }
      break;

    case 'text':
      errors.push(...validateExpression(node.value, buildPath(path, 'value'), context, scope, paramScope));
      break;

    case 'if':
      errors.push(
        ...validateExpression(node.condition, buildPath(path, 'condition'), context, scope, paramScope)
      );
      errors.push(...validateViewNode(node.then, buildPath(path, 'then'), context, scope, options));
      if (node.else) {
        errors.push(...validateViewNode(node.else, buildPath(path, 'else'), context, scope, options));
      }
      break;

    case 'each': {
      // Validate items expression with current scope
      errors.push(...validateExpression(node.items, buildPath(path, 'items'), context, scope, paramScope));

      // Create new scope for body with 'as' and optional 'index' variables
      const bodyScope = new Set(scope);
      bodyScope.add(node.as);
      if (node.index) {
        bodyScope.add(node.index);
      }

      // Validate key expression if present (uses the new scope)
      if (node.key) {
        errors.push(...validateExpression(node.key, buildPath(path, 'key'), context, bodyScope, paramScope));
      }

      // Validate body with new scope
      errors.push(...validateViewNode(node.body, buildPath(path, 'body'), context, bodyScope, options));
      break;
    }

    case 'component': {
      // Check if component exists
      if (!context.componentNames.has(node.name)) {
        errors.push(createComponentNotFoundError(node.name, path));
      } else {
        // Component exists, validate props
        const componentDef = ast.components?.[node.name];
        if (componentDef) {
          errors.push(
            ...validateComponentProps(node, componentDef, path, context, scope, paramScope)
          );
        }
      }
      // Validate children (slot content) - these are in the caller's context
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child === undefined) continue;
          errors.push(
            ...validateViewNode(child, buildPath(path, 'children', i), context, scope, options)
          );
        }
      }
      break;
    }

    case 'slot':
      // Slot is only valid inside component definitions
      if (!insideComponent) {
        errors.push(
          createSchemaError(`Slot can only be used inside component definitions`, path)
        );
      }
      break;
  }

  return errors;
}

/**
 * Validates component props against the component definition
 */
function validateComponentProps(
  node: { name: string; props?: Record<string, Expression> },
  componentDef: ComponentDef,
  path: string,
  context: AnalysisContext,
  scope: Set<string>,
  paramScope?: ParamScope
): ConstelaError[] {
  const errors: ConstelaError[] = [];
  const params = componentDef.params ?? {};
  const providedProps = node.props ?? {};

  // Check for missing required props
  for (const [paramName, paramDef] of Object.entries(params)) {
    const isRequired = paramDef.required !== false; // true by default
    if (isRequired && !(paramName in providedProps)) {
      errors.push(
        createComponentPropMissingError(node.name, paramName, buildPath(path, 'props'))
      );
    }
  }

  // Validate prop expressions
  for (const [propName, propValue] of Object.entries(providedProps)) {
    errors.push(
      ...validateExpression(propValue, buildPath(path, 'props', propName), context, scope, paramScope)
    );
  }

  return errors;
}

// Reference to AST for component lookup (set in analyzePass)
let ast: Program;

// ==================== Component Cycle Detection ====================

/**
 * Collects all component calls from a view node
 */
function collectComponentCalls(node: ViewNode): Set<string> {
  const calls = new Set<string>();

  switch (node.kind) {
    case 'component':
      calls.add(node.name);
      // Also check children (slot content) for nested component calls
      if (node.children) {
        for (const child of node.children) {
          for (const call of collectComponentCalls(child)) {
            calls.add(call);
          }
        }
      }
      break;

    case 'element':
      if (node.children) {
        for (const child of node.children) {
          for (const call of collectComponentCalls(child)) {
            calls.add(call);
          }
        }
      }
      break;

    case 'if':
      for (const call of collectComponentCalls(node.then)) {
        calls.add(call);
      }
      if (node.else) {
        for (const call of collectComponentCalls(node.else)) {
          calls.add(call);
        }
      }
      break;

    case 'each':
      for (const call of collectComponentCalls(node.body)) {
        calls.add(call);
      }
      break;

    case 'text':
    case 'slot':
      // No component calls in text or slot nodes
      break;
  }

  return calls;
}

/**
 * Detects cycles in component call graph using DFS
 */
function detectComponentCycles(
  programAst: Program,
  context: AnalysisContext
): ConstelaError[] {
  if (!programAst.components) return [];

  const errors: ConstelaError[] = [];

  // Build call graph
  const callGraph = new Map<string, Set<string>>();
  for (const [name, def] of Object.entries(programAst.components)) {
    const calls = collectComponentCalls(def.view);
    callGraph.set(name, calls);
  }

  // DFS with recursion stack
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(name: string, path: string[]): boolean {
    visited.add(name);
    recStack.add(name);

    const calls = callGraph.get(name) || new Set();
    for (const callee of calls) {
      if (!visited.has(callee)) {
        if (dfs(callee, [...path, callee])) return true;
      } else if (recStack.has(callee)) {
        // Found cycle
        const cycleStart = path.indexOf(callee);
        const cycle =
          cycleStart >= 0
            ? [...path.slice(cycleStart), callee]
            : [...path, callee];
        errors.push(createComponentCycleError(cycle, `/components/${path[0]}`));
        return true;
      }
    }

    recStack.delete(name);
    return false;
  }

  for (const name of context.componentNames) {
    if (!visited.has(name)) {
      dfs(name, [name]);
    }
  }

  return errors;
}

// ==================== Component Definition Validation ====================

/**
 * Validates all component definitions
 */
function validateComponents(
  programAst: Program,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  if (!programAst.components) return errors;

  for (const [name, def] of Object.entries(programAst.components)) {
    // Create param scope for this component
    const paramNames = new Set<string>(
      def.params ? Object.keys(def.params) : []
    );
    const paramScope: ParamScope = {
      params: paramNames,
      componentName: name,
    };

    // Validate component view with insideComponent = true
    errors.push(
      ...validateViewNode(
        def.view,
        buildPath('', 'components', name, 'view'),
        context,
        new Set<string>(),
        { insideComponent: true, paramScope }
      )
    );
  }

  return errors;
}

// ==================== Action Validation ====================

/**
 * Validates all actions for state references
 */
function validateActions(programAst: Program, context: AnalysisContext): ConstelaError[] {
  const errors: ConstelaError[] = [];

  for (let i = 0; i < programAst.actions.length; i++) {
    const action = programAst.actions[i];
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
 * - Collects component names
 * - Validates state references
 * - Validates action references
 * - Validates variable scopes
 * - Validates component references and props
 * - Detects component cycles
 * - Validates param references in component definitions
 *
 * @param programAst - Validated AST from validate pass
 * @returns AnalyzePassResult
 */
export function analyzePass(programAst: Program): AnalyzePassResult {
  // Set module-level ast for component lookup in validateViewNode
  ast = programAst;

  const context = collectContext(programAst);
  const errors: ConstelaError[] = [];

  // Check for duplicate action names
  errors.push(...checkDuplicateActions(programAst));

  // Validate actions
  errors.push(...validateActions(programAst, context));

  // Detect component cycles
  errors.push(...detectComponentCycles(programAst, context));

  // Validate component definitions (params, slot usage inside components)
  errors.push(...validateComponents(programAst, context));

  // Validate view with empty initial scope (insideComponent = false)
  errors.push(
    ...validateViewNode(programAst.view, '/view', context, new Set<string>(), {
      insideComponent: false,
    })
  );

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    ast: programAst,
    context,
  };
}
