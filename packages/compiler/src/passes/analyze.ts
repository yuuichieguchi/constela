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
  RouteDefinition,
  DataSource,
  StaticPathsDefinition,
  LifecycleHooks,
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
  createUndefinedRouteParamError,
  createRouteNotDefinedError,
  createUndefinedImportError,
  createImportsNotDefinedError,
  createInvalidDataSourceError,
  createUndefinedDataSourceError,
  createDataNotDefinedError,
  createUndefinedDataError,
  createInvalidStorageOperationError,
  createInvalidStorageTypeError,
  createStorageSetMissingValueError,
  createInvalidClipboardOperationError,
  createClipboardWriteMissingValueError,
  createInvalidNavigateTargetError,
  createUndefinedRefError,
  createUndefinedStyleError,
  createUndefinedVariantError,
  findSimilarNames,
  isEventHandler,
  isDataSource,
  isStyleExpr,
  DATA_SOURCE_TYPES,
  DATA_TRANSFORMS,
  STORAGE_OPERATIONS,
  STORAGE_TYPES,
  CLIPBOARD_OPERATIONS,
  NAVIGATE_TARGETS,
  type ImportStep,
  type CallStep,
  type SubscribeStep,
  type DisposeStep,
  type StylePreset,
} from '@constela/core';

// ==================== Types ====================

export interface AnalysisContext {
  stateNames: Set<string>;
  actionNames: Set<string>;
  componentNames: Set<string>;
  routeParams: Set<string>;
  importNames: Set<string>;
  dataNames: Set<string>;
  refNames: Set<string>;
  styleNames: Set<string>;
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

/**
 * Extracts route params from a path pattern
 * e.g., "/users/:id/posts/:postId" -> ["id", "postId"]
 */
function extractRouteParams(path: string): string[] {
  const params: string[] = [];
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      params.push(segment.slice(1));
    }
  }
  return params;
}

// ==================== Context Collection ====================

/**
 * Collects all ref names from the view tree
 */
function collectRefs(node: ViewNode): Set<string> {
  const refs = new Set<string>();

  switch (node.kind) {
    case 'element':
      if (node.ref) {
        refs.add(node.ref);
      }
      if (node.children) {
        for (const child of node.children) {
          for (const ref of collectRefs(child)) {
            refs.add(ref);
          }
        }
      }
      break;
    case 'if':
      for (const ref of collectRefs(node.then)) {
        refs.add(ref);
      }
      if (node.else) {
        for (const ref of collectRefs(node.else)) {
          refs.add(ref);
        }
      }
      break;
    case 'each':
      for (const ref of collectRefs(node.body)) {
        refs.add(ref);
      }
      break;
    case 'component':
      // Component children are slot content, also collect refs from them
      if (node.children) {
        for (const child of node.children) {
          for (const ref of collectRefs(child)) {
            refs.add(ref);
          }
        }
      }
      break;
    case 'text':
    case 'slot':
      // No refs in text or slot nodes
      break;
  }

  return refs;
}

/**
 * Collects state, action, component names, route params, import names, data names, ref names, and style names from the AST
 */
function collectContext(programAst: Program): AnalysisContext {
  const stateNames = new Set<string>(Object.keys(programAst.state));
  const actionNames = new Set<string>(programAst.actions.map((a) => a.name));
  const componentNames = new Set<string>(
    programAst.components ? Object.keys(programAst.components) : []
  );
  const routeParams = new Set<string>(
    programAst.route ? extractRouteParams(programAst.route.path) : []
  );
  const importNames = new Set<string>(
    programAst.imports ? Object.keys(programAst.imports) : []
  );
  const dataNames = new Set<string>(
    programAst.data ? Object.keys(programAst.data) : []
  );
  const refNames = collectRefs(programAst.view);
  const styleNames = new Set<string>(
    programAst.styles ? Object.keys(programAst.styles) : []
  );

  return { stateNames, actionNames, componentNames, routeParams, importNames, dataNames, refNames, styleNames };
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
        const errorOptions = createErrorOptionsWithSuggestion(expr.name, context.stateNames);
        errors.push(createUndefinedStateError(expr.name, path, errorOptions));
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

    case 'route': {
      // Check if route is defined in the program
      if (!hasRoute) {
        errors.push(createRouteNotDefinedError(path));
      } else {
        // For 'param' source (default), validate that the param is defined in the route path
        // For 'query' and 'path' sources, no validation needed (runtime values)
        const source = expr.source ?? 'param';
        if (source === 'param' && !context.routeParams.has(expr.name)) {
          errors.push(createUndefinedRouteParamError(expr.name, path));
        }
      }
      break;
    }

    case 'import': {
      // Check if imports are defined in the program
      if (!hasImports) {
        errors.push(createImportsNotDefinedError(path));
      } else if (!context.importNames.has(expr.name)) {
        // Check if the import name is defined
        errors.push(createUndefinedImportError(expr.name, path));
      }
      break;
    }

    case 'data': {
      // Check if data is defined in the program
      if (!hasData) {
        errors.push(createDataNotDefinedError(path));
      } else if (!context.dataNames.has(expr.name)) {
        // Check if the data name is defined
        errors.push(createUndefinedDataError(expr.name, path));
      }
      break;
    }

    case 'ref': {
      if (!context.refNames.has(expr.name)) {
        errors.push(createUndefinedRefError(expr.name, path));
      }
      break;
    }

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

    case 'style':
      errors.push(...validateStyleExpression(expr, path, context, scope, paramScope));
      break;
  }

  return errors;
}

/**
 * Validates a style expression for style name and variant key references
 */
function validateStyleExpression(
  expr: { expr: 'style'; name: string; variants?: Record<string, Expression> },
  path: string,
  context: AnalysisContext,
  scope: Set<string>,
  paramScope?: ParamScope
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  // Check if style name exists
  if (!context.styleNames.has(expr.name)) {
    const errorOptions = createErrorOptionsWithSuggestion(expr.name, context.styleNames);
    errors.push(createUndefinedStyleError(expr.name, path, errorOptions));
    // Don't validate variants if style doesn't exist
    return errors;
  }

  // Validate variant keys if present
  if (expr.variants) {
    const stylePreset = ast.styles?.[expr.name] as StylePreset | undefined;
    const availableVariants = new Set<string>(
      stylePreset?.variants ? Object.keys(stylePreset.variants) : []
    );

    for (const [variantKey, variantValue] of Object.entries(expr.variants)) {
      const variantPath = buildPath(path, 'variants', variantKey);

      // Check if variant key exists in the style preset
      if (!availableVariants.has(variantKey)) {
        const errorOptions = createErrorOptionsWithSuggestion(variantKey, availableVariants);
        errors.push(createUndefinedVariantError(variantKey, expr.name, variantPath, errorOptions));
      }

      // Validate the variant value expression
      errors.push(...validateExpression(variantValue, variantPath, context, scope, paramScope));
    }
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
        const errorOptions = createErrorOptionsWithSuggestion(step.target, context.stateNames);
        errors.push(createUndefinedStateError(step.target, buildPath(path, 'target'), errorOptions));
      }
      // Validate state references only (skip var validation - runtime provided)
      errors.push(
        ...validateExpressionStateOnly(step.value, buildPath(path, 'value'), context)
      );
      break;

    case 'update': {
      if (!context.stateNames.has(step.target)) {
        const errorOptions = createErrorOptionsWithSuggestion(step.target, context.stateNames);
        errors.push(createUndefinedStateError(step.target, buildPath(path, 'target'), errorOptions));
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

    case 'storage': {
      const storageStep = step as import('@constela/core').StorageStep;
      // Validate operation
      if (!STORAGE_OPERATIONS.includes(storageStep.operation as typeof STORAGE_OPERATIONS[number])) {
        errors.push(createInvalidStorageOperationError(storageStep.operation, path));
      }
      // Validate storage type
      if (!STORAGE_TYPES.includes(storageStep.storage as typeof STORAGE_TYPES[number])) {
        errors.push(createInvalidStorageTypeError(storageStep.storage, path));
      }
      // Validate key expression
      errors.push(
        ...validateExpressionStateOnly(storageStep.key, buildPath(path, 'key'), context)
      );
      // set operation requires value
      if (storageStep.operation === 'set' && !storageStep.value) {
        errors.push(createStorageSetMissingValueError(path));
      }
      // Validate value expression if present
      if (storageStep.value) {
        errors.push(
          ...validateExpressionStateOnly(storageStep.value, buildPath(path, 'value'), context)
        );
      }
      // Validate onSuccess and onError callbacks
      if (storageStep.onSuccess) {
        for (let i = 0; i < storageStep.onSuccess.length; i++) {
          const successStep = storageStep.onSuccess[i];
          if (successStep === undefined) continue;
          errors.push(
            ...validateActionStep(successStep, buildPath(path, 'onSuccess', i), context)
          );
        }
      }
      if (storageStep.onError) {
        for (let i = 0; i < storageStep.onError.length; i++) {
          const errorStep = storageStep.onError[i];
          if (errorStep === undefined) continue;
          errors.push(
            ...validateActionStep(errorStep, buildPath(path, 'onError', i), context)
          );
        }
      }
      break;
    }

    case 'clipboard': {
      const clipboardStep = step as import('@constela/core').ClipboardStep;
      // Validate operation
      if (!CLIPBOARD_OPERATIONS.includes(clipboardStep.operation as typeof CLIPBOARD_OPERATIONS[number])) {
        errors.push(createInvalidClipboardOperationError(clipboardStep.operation, path));
      }
      // write operation requires value
      if (clipboardStep.operation === 'write' && !clipboardStep.value) {
        errors.push(createClipboardWriteMissingValueError(path));
      }
      // Validate value expression if present
      if (clipboardStep.value) {
        errors.push(
          ...validateExpressionStateOnly(clipboardStep.value, buildPath(path, 'value'), context)
        );
      }
      // Validate onSuccess and onError callbacks
      if (clipboardStep.onSuccess) {
        for (let i = 0; i < clipboardStep.onSuccess.length; i++) {
          const successStep = clipboardStep.onSuccess[i];
          if (successStep === undefined) continue;
          errors.push(
            ...validateActionStep(successStep, buildPath(path, 'onSuccess', i), context)
          );
        }
      }
      if (clipboardStep.onError) {
        for (let i = 0; i < clipboardStep.onError.length; i++) {
          const errorStep = clipboardStep.onError[i];
          if (errorStep === undefined) continue;
          errors.push(
            ...validateActionStep(errorStep, buildPath(path, 'onError', i), context)
          );
        }
      }
      break;
    }

    case 'navigate': {
      const navigateStep = step as import('@constela/core').NavigateStep;
      // Validate url expression
      errors.push(
        ...validateExpressionStateOnly(navigateStep.url, buildPath(path, 'url'), context)
      );
      // Validate target if present
      if (navigateStep.target !== undefined && !NAVIGATE_TARGETS.includes(navigateStep.target as typeof NAVIGATE_TARGETS[number])) {
        errors.push(createInvalidNavigateTargetError(navigateStep.target, path));
      }
      break;
    }

    case 'import': {
      const importStep = step as ImportStep;
      // Validate onSuccess and onError callbacks
      if (importStep.onSuccess) {
        for (let i = 0; i < importStep.onSuccess.length; i++) {
          const successStep = importStep.onSuccess[i];
          if (successStep === undefined) continue;
          errors.push(
            ...validateActionStep(successStep, buildPath(path, 'onSuccess', i), context)
          );
        }
      }
      if (importStep.onError) {
        for (let i = 0; i < importStep.onError.length; i++) {
          const errorStep = importStep.onError[i];
          if (errorStep === undefined) continue;
          errors.push(
            ...validateActionStep(errorStep, buildPath(path, 'onError', i), context)
          );
        }
      }
      break;
    }

    case 'call': {
      const callStep = step as CallStep;
      // Validate target expression
      errors.push(
        ...validateExpressionStateOnly(callStep.target, buildPath(path, 'target'), context)
      );
      // Validate args expressions
      if (callStep.args) {
        for (let i = 0; i < callStep.args.length; i++) {
          const arg = callStep.args[i];
          if (arg === undefined) continue;
          errors.push(
            ...validateExpressionStateOnly(arg, buildPath(path, 'args', i), context)
          );
        }
      }
      // Validate onSuccess and onError callbacks
      if (callStep.onSuccess) {
        for (let i = 0; i < callStep.onSuccess.length; i++) {
          const successStep = callStep.onSuccess[i];
          if (successStep === undefined) continue;
          errors.push(
            ...validateActionStep(successStep, buildPath(path, 'onSuccess', i), context)
          );
        }
      }
      if (callStep.onError) {
        for (let i = 0; i < callStep.onError.length; i++) {
          const errorStep = callStep.onError[i];
          if (errorStep === undefined) continue;
          errors.push(
            ...validateActionStep(errorStep, buildPath(path, 'onError', i), context)
          );
        }
      }
      break;
    }

    case 'subscribe': {
      const subscribeStep = step as SubscribeStep;
      // Validate target expression
      errors.push(
        ...validateExpressionStateOnly(subscribeStep.target, buildPath(path, 'target'), context)
      );
      // Validate action reference
      if (!context.actionNames.has(subscribeStep.action)) {
        const errorOptions = createErrorOptionsWithSuggestion(subscribeStep.action, context.actionNames);
        errors.push(createUndefinedActionError(subscribeStep.action, buildPath(path, 'action'), errorOptions));
      }
      break;
    }

    case 'dispose': {
      const disposeStep = step as DisposeStep;
      // Validate target expression
      errors.push(
        ...validateExpressionStateOnly(disposeStep.target, buildPath(path, 'target'), context)
      );
      break;
    }
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
        const errorOptions = createErrorOptionsWithSuggestion(expr.name, context.stateNames);
        errors.push(createUndefinedStateError(expr.name, path, errorOptions));
      }
      break;

    case 'var':
      // Skip var validation - these are runtime-provided in actions
      break;

    case 'route': {
      // Route expressions in actions need route definition validation
      if (!hasRoute) {
        errors.push(createRouteNotDefinedError(path));
      } else {
        const source = expr.source ?? 'param';
        if (source === 'param' && !context.routeParams.has(expr.name)) {
          errors.push(createUndefinedRouteParamError(expr.name, path));
        }
      }
      break;
    }

    case 'import': {
      // Import expressions in actions need import definition validation
      if (!hasImports) {
        errors.push(createImportsNotDefinedError(path));
      } else if (!context.importNames.has(expr.name)) {
        errors.push(createUndefinedImportError(expr.name, path));
      }
      break;
    }

    case 'data': {
      // Data expressions in actions need data definition validation
      if (!hasData) {
        errors.push(createDataNotDefinedError(path));
      } else if (!context.dataNames.has(expr.name)) {
        errors.push(createUndefinedDataError(expr.name, path));
      }
      break;
    }

    case 'ref': {
      if (!context.refNames.has(expr.name)) {
        errors.push(createUndefinedRefError(expr.name, path));
      }
      break;
    }

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

    case 'style':
      errors.push(...validateStyleExpressionStateOnly(expr, path, context));
      break;
  }

  return errors;
}

/**
 * Validates a style expression for state references only (ignores var references)
 * Used in action steps where var references are runtime-provided
 */
function validateStyleExpressionStateOnly(
  expr: { expr: 'style'; name: string; variants?: Record<string, Expression> },
  path: string,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  // Check if style name exists
  if (!context.styleNames.has(expr.name)) {
    const errorOptions = createErrorOptionsWithSuggestion(expr.name, context.styleNames);
    errors.push(createUndefinedStyleError(expr.name, path, errorOptions));
    // Don't validate variants if style doesn't exist
    return errors;
  }

  // Validate variant keys if present
  if (expr.variants) {
    const stylePreset = ast.styles?.[expr.name] as StylePreset | undefined;
    const availableVariants = new Set<string>(
      stylePreset?.variants ? Object.keys(stylePreset.variants) : []
    );

    for (const [variantKey, variantValue] of Object.entries(expr.variants)) {
      const variantPath = buildPath(path, 'variants', variantKey);

      // Check if variant key exists in the style preset
      if (!availableVariants.has(variantKey)) {
        const errorOptions = createErrorOptionsWithSuggestion(variantKey, availableVariants);
        errors.push(createUndefinedVariantError(variantKey, expr.name, variantPath, errorOptions));
      }

      // Validate the variant value expression (state refs only)
      errors.push(...validateExpressionStateOnly(variantValue, variantPath, context));
    }
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
        const errorOptions = createErrorOptionsWithSuggestion(expr.name, context.stateNames);
        errors.push(createUndefinedStateError(expr.name, path, errorOptions));
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

    case 'route': {
      // Route expressions in event payloads need route definition validation
      if (!hasRoute) {
        errors.push(createRouteNotDefinedError(path));
      } else {
        const source = expr.source ?? 'param';
        if (source === 'param' && !context.routeParams.has(expr.name)) {
          errors.push(createUndefinedRouteParamError(expr.name, path));
        }
      }
      break;
    }

    case 'import': {
      // Import expressions in event payloads need import definition validation
      if (!hasImports) {
        errors.push(createImportsNotDefinedError(path));
      } else if (!context.importNames.has(expr.name)) {
        errors.push(createUndefinedImportError(expr.name, path));
      }
      break;
    }

    case 'data': {
      // Data expressions in event payloads need data definition validation
      if (!hasData) {
        errors.push(createDataNotDefinedError(path));
      } else if (!context.dataNames.has(expr.name)) {
        errors.push(createUndefinedDataError(expr.name, path));
      }
      break;
    }

    case 'ref': {
      if (!context.refNames.has(expr.name)) {
        errors.push(createUndefinedRefError(expr.name, path));
      }
      break;
    }

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

    case 'style':
      errors.push(...validateStyleExpressionInEventPayload(expr, path, context, scope));
      break;
  }

  return errors;
}

/**
 * Validates a style expression in event handler payloads
 */
function validateStyleExpressionInEventPayload(
  expr: { expr: 'style'; name: string; variants?: Record<string, Expression> },
  path: string,
  context: AnalysisContext,
  scope: Set<string>
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  // Check if style name exists
  if (!context.styleNames.has(expr.name)) {
    const errorOptions = createErrorOptionsWithSuggestion(expr.name, context.styleNames);
    errors.push(createUndefinedStyleError(expr.name, path, errorOptions));
    // Don't validate variants if style doesn't exist
    return errors;
  }

  // Validate variant keys if present
  if (expr.variants) {
    const stylePreset = ast.styles?.[expr.name] as StylePreset | undefined;
    const availableVariants = new Set<string>(
      stylePreset?.variants ? Object.keys(stylePreset.variants) : []
    );

    for (const [variantKey, variantValue] of Object.entries(expr.variants)) {
      const variantPath = buildPath(path, 'variants', variantKey);

      // Check if variant key exists in the style preset
      if (!availableVariants.has(variantKey)) {
        const errorOptions = createErrorOptionsWithSuggestion(variantKey, availableVariants);
        errors.push(createUndefinedVariantError(variantKey, expr.name, variantPath, errorOptions));
      }

      // Validate the variant value expression
      errors.push(...validateExpressionInEventPayload(variantValue, variantPath, context, scope));
    }
  }

  return errors;
}

// ==================== View Node Validation ====================

/**
 * Options for view node validation
 */
interface ViewNodeValidationOptions {
  insideComponent: boolean;
  insideLayout?: boolean;  // If true, slots are allowed at any level
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
  const { insideComponent, insideLayout, paramScope } = options;

  switch (node.kind) {
    case 'element':
      // Validate props
      if (node.props) {
        for (const [propName, propValue] of Object.entries(node.props)) {
          const propPath = buildPath(path, 'props', propName);
          if (isEventHandler(propValue)) {
            // Check action reference
            if (!context.actionNames.has(propValue.action)) {
              const errorOptions = createErrorOptionsWithSuggestion(propValue.action, context.actionNames);
              errors.push(createUndefinedActionError(propValue.action, propPath, errorOptions));
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
        const errorOptions = createErrorOptionsWithSuggestion(node.name, context.componentNames);
        errors.push(createComponentNotFoundError(node.name, path, errorOptions));
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
      // Slot is valid inside component definitions or layouts
      if (!insideComponent && !insideLayout) {
        errors.push(
          createSchemaError(`Slot can only be used inside component definitions or layouts`, path)
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

// Flag indicating whether route is defined (set in analyzePass)
let hasRoute: boolean;

// Flag indicating whether imports are defined (set in analyzePass)
let hasImports: boolean;

// Flag indicating whether data is defined (set in analyzePass)
let hasData: boolean;

// ==================== Route Definition Validation ====================

/**
 * Validates expressions in route definition (title, meta)
 */
function validateRouteDefinition(
  route: RouteDefinition,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];
  const emptyScope = new Set<string>();

  // Validate title expression if present
  if (route.title) {
    errors.push(
      ...validateExpression(route.title, '/route/title', context, emptyScope)
    );
  }

  // Validate meta expressions if present
  if (route.meta) {
    for (const [key, value] of Object.entries(route.meta)) {
      errors.push(
        ...validateExpression(value, `/route/meta/${key}`, context, emptyScope)
      );
    }
  }

  return errors;
}

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

// ==================== Lifecycle Hooks Validation ====================

/**
 * Validates lifecycle hooks reference valid actions
 */
function validateLifecycleHooks(
  lifecycle: LifecycleHooks | undefined,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  if (!lifecycle) return errors;

  const hooks = ['onMount', 'onUnmount', 'onRouteEnter', 'onRouteLeave'] as const;
  for (const hook of hooks) {
    const actionName = lifecycle[hook];
    if (actionName && !context.actionNames.has(actionName)) {
      const errorOptions = createErrorOptionsWithSuggestion(actionName, context.actionNames);
      errors.push(createUndefinedActionError(actionName, `/lifecycle/${hook}`, errorOptions));
    }
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

// ==================== Data Source Validation ====================

/**
 * Validates data sources in the program
 */
function validateDataSources(programAst: Program, context: AnalysisContext): ConstelaError[] {
  const errors: ConstelaError[] = [];

  if (!programAst.data) return errors;

  for (const [name, source] of Object.entries(programAst.data)) {
    const path = `/data/${name}`;

    // Validate type field
    if (!DATA_SOURCE_TYPES.includes(source.type as typeof DATA_SOURCE_TYPES[number])) {
      errors.push(createInvalidDataSourceError(name, `invalid type '${source.type}'`, path));
      continue;
    }

    // Validate transform field if present
    if (source.transform !== undefined) {
      if (!DATA_TRANSFORMS.includes(source.transform as typeof DATA_TRANSFORMS[number])) {
        errors.push(createInvalidDataSourceError(name, `invalid transform '${source.transform}'`, path));
      }
    }

    // Type-specific validation
    switch (source.type) {
      case 'glob':
        if (typeof source.pattern !== 'string') {
          errors.push(createInvalidDataSourceError(name, `glob type requires 'pattern' field`, path));
        }
        break;
      case 'file':
        if (typeof source.path !== 'string') {
          errors.push(createInvalidDataSourceError(name, `file type requires 'path' field`, path));
        }
        break;
      case 'api':
        if (typeof source.url !== 'string') {
          errors.push(createInvalidDataSourceError(name, `api type requires 'url' field`, path));
        }
        break;
    }
  }

  return errors;
}

/**
 * Validates getStaticPaths in the route definition
 */
function validateGetStaticPaths(
  programAst: Program,
  context: AnalysisContext
): ConstelaError[] {
  const errors: ConstelaError[] = [];
  const getStaticPaths = programAst.route?.getStaticPaths;

  if (!getStaticPaths) return errors;

  const path = '/route/getStaticPaths';

  // Check if data is defined when getStaticPaths is used
  if (!programAst.data) {
    errors.push(createDataNotDefinedError(path));
    return errors;
  }

  // Check if the source is defined in data
  if (!context.dataNames.has(getStaticPaths.source)) {
    errors.push(createUndefinedDataSourceError(getStaticPaths.source, path));
  }

  // Validate param expressions
  for (const [paramName, paramExpr] of Object.entries(getStaticPaths.params)) {
    errors.push(
      ...validateExpressionStateOnly(paramExpr, `${path}/params/${paramName}`, context)
    );
  }

  return errors;
}

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
 * - Validates data sources and getStaticPaths
 *
 * @param programAst - Validated AST from validate pass
 * @returns AnalyzePassResult
 */
export function analyzePass(programAst: Program): AnalyzePassResult {
  // Set module-level ast for component lookup in validateViewNode
  ast = programAst;

  // Set module-level hasRoute flag for route expression validation
  hasRoute = !!programAst.route;

  // Set module-level hasImports flag for import expression validation
  hasImports = !!programAst.imports;

  // Set module-level hasData flag for data expression validation
  hasData = !!programAst.data;

  // Check if this is a layout program (has type: 'layout')
  const isLayout = (programAst as unknown as { type?: string }).type === 'layout';

  const context = collectContext(programAst);
  const errors: ConstelaError[] = [];

  // Check for duplicate action names
  errors.push(...checkDuplicateActions(programAst));

  // Validate data sources
  errors.push(...validateDataSources(programAst, context));

  // Validate getStaticPaths
  errors.push(...validateGetStaticPaths(programAst, context));

  // Validate actions
  errors.push(...validateActions(programAst, context));

  // Validate lifecycle hooks
  errors.push(...validateLifecycleHooks(programAst.lifecycle, context));

  // Detect component cycles
  errors.push(...detectComponentCycles(programAst, context));

  // Validate component definitions (params, slot usage inside components)
  errors.push(...validateComponents(programAst, context));

  // Validate route definition expressions (title, meta)
  if (programAst.route) {
    errors.push(...validateRouteDefinition(programAst.route, context));
  }

  // Validate view with empty initial scope
  // For layouts, slots are allowed at any level
  errors.push(
    ...validateViewNode(programAst.view, '/view', context, new Set<string>(), {
      insideComponent: false,
      insideLayout: isLayout,
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
