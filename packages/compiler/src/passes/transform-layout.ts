/**
 * Layout Transform Pass - Layout to CompiledProgram transformation and composition
 *
 * This pass transforms layout programs and composes them with page programs.
 */

import type {
  LayoutProgram,
  ViewNode,
  ActionDefinition,
  ActionStep,
  StateField,
  ComponentDef,
  Expression,
  ComponentNode,
  LocalActionDefinition,
  IslandNode,
  SuspenseNode,
  ErrorBoundaryNode,
} from '@constela/core';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledAction,
  CompiledActionStep,
  CompiledRouteDefinition,
  CompiledExpression,
  CompiledSetStep,
  CompiledUpdateStep,
  CompiledFetchStep,
  CompiledStorageStep,
  CompiledClipboardStep,
  CompiledNavigateStep,
  CompiledImportStep,
  CompiledCallStep,
  CompiledSubscribeStep,
  CompiledDisposeStep,
  CompiledDomStep,
  CompiledLocalAction,
  CompiledLocalStateNode,
  CompiledVarExpr,
  CompiledStateExpr,
  CompiledImportExpr,
  CompiledIslandNode,
  CompiledSuspenseNode,
  CompiledErrorBoundaryNode,
} from './transform.js';
import type { LayoutAnalysisContext } from './analyze-layout.js';

// ==================== Compiled Layout Program Type ====================

export interface CompiledLayoutProgram {
  version: '1.0';
  type: 'layout';
  state: Record<string, { type: string; initial: unknown }>;
  actions: CompiledAction[];
  view: CompiledNode;
  components?: Record<string, ComponentDef> | undefined;
  importData?: Record<string, unknown>;
}

// ==================== Transform Context ====================

interface TransformContext {
  components: Record<string, ComponentDef>;
  currentParams?: Record<string, CompiledExpression>;
  currentChildren?: CompiledNode[];
}

// ==================== State Transformation ====================

function transformState(
  state?: Record<string, StateField>
): Record<string, { type: string; initial: unknown }> {
  if (!state) return {};
  const result: Record<string, { type: string; initial: unknown }> = {};
  for (const [name, field] of Object.entries(state)) {
    result[name] = {
      type: field.type,
      initial: field.initial,
    };
  }
  return result;
}

// ==================== Expression Transformation ====================

/**
 * Transforms an AST Expression into a CompiledExpression
 */
function transformExpression(expr: Expression, ctx?: TransformContext): CompiledExpression {
  switch (expr.expr) {
    case 'lit':
      return { expr: 'lit', value: expr.value };
    case 'state': {
      const stateExpr: CompiledExpression = { expr: 'state', name: expr.name };
      if (expr.path) {
        (stateExpr as { path?: string }).path = expr.path;
      }
      return stateExpr;
    }
    case 'var': {
      const varExpr: CompiledExpression = { expr: 'var', name: expr.name };
      if (expr.path) {
        (varExpr as { path?: string }).path = expr.path;
      }
      return varExpr;
    }
    case 'bin':
      return {
        expr: 'bin',
        op: expr.op,
        left: transformExpression(expr.left, ctx),
        right: transformExpression(expr.right, ctx),
      };
    case 'not':
      return {
        expr: 'not',
        operand: transformExpression(expr.operand, ctx),
      };
    case 'cond':
      return {
        expr: 'cond',
        if: transformExpression(expr.if, ctx),
        then: transformExpression(expr.then, ctx),
        else: transformExpression(expr.else, ctx),
      };
    case 'get':
      return {
        expr: 'get',
        base: transformExpression(expr.base, ctx),
        path: expr.path,
      };
    case 'route':
      return {
        expr: 'route',
        name: expr.name,
        source: expr.source ?? 'param',
      };
    case 'import': {
      const importExpr: CompiledExpression = { expr: 'import', name: expr.name };
      if (expr.path) {
        (importExpr as { path?: string }).path = expr.path;
      }
      return importExpr;
    }
    case 'data': {
      const dataExpr: CompiledExpression = { expr: 'import', name: expr.name };
      if (expr.path) {
        (dataExpr as { path?: string }).path = expr.path;
      }
      return dataExpr;
    }
    case 'param': {
      // Check if we're inside a component expansion (currentParams is defined)
      if (ctx?.currentParams !== undefined) {
        // We're inside a component - param must be a component param
        const paramValue = ctx.currentParams[expr.name];
        if (paramValue !== undefined) {
          // Substitute with the prop value
          if (expr.path) {
            // Handle var expressions - combine paths
            if (paramValue.expr === 'var') {
              const varExpr = paramValue as CompiledVarExpr;
              const existingPath = varExpr.path;
              const resultPath = existingPath
                ? `${existingPath}.${expr.path}`
                : expr.path;
              return {
                expr: 'var',
                name: varExpr.name,
                path: resultPath,
              };
            }
            // Handle state expressions
            if (paramValue.expr === 'state') {
              const stateExpr = paramValue as CompiledStateExpr;
              const existingPath = stateExpr.path;
              const resultPath = existingPath
                ? `${existingPath}.${expr.path}`
                : expr.path;
              return {
                expr: 'state',
                name: stateExpr.name,
                path: resultPath,
              };
            }
            // Handle import expressions
            if (paramValue.expr === 'import') {
              const importExpr = paramValue as CompiledImportExpr;
              const existingPath = importExpr.path;
              const resultPath = existingPath
                ? `${existingPath}.${expr.path}`
                : expr.path;
              return {
                expr: 'import',
                name: importExpr.name,
                path: resultPath,
              };
            }
            // Handle data expressions
            if (paramValue.expr === 'data') {
              const dataExpr = paramValue as { expr: 'data'; name: string; path?: string };
              const existingPath = dataExpr.path;
              const resultPath = existingPath
                ? `${existingPath}.${expr.path}`
                : expr.path;
              return {
                expr: 'data',
                name: dataExpr.name,
                path: resultPath,
              } as CompiledExpression;
            }
            // For literal or other expressions, wrap with get expression
            return {
              expr: 'get',
              base: paramValue,
              path: expr.path,
            } as CompiledExpression;
          }
          return paramValue;
        }
        // Param was not provided - return null literal (as per transform.ts behavior)
        return { expr: 'lit', value: null };
      }
      // Not inside a component - preserve for layout-level param resolution
      const paramExpr: CompiledExpression = { expr: 'param', name: expr.name };
      if (expr.path) {
        (paramExpr as { path?: string }).path = expr.path;
      }
      return paramExpr;
    }
    case 'ref':
      return { expr: 'ref', name: expr.name };
    case 'call': {
      const callExpr = expr as { expr: 'call'; target: Expression; method: string; args?: Expression[] };
      const result: CompiledExpression = {
        expr: 'call',
        target: transformExpression(callExpr.target, ctx),
        method: callExpr.method,
      } as CompiledExpression;
      if (callExpr.args && callExpr.args.length > 0) {
        (result as { args?: CompiledExpression[] }).args = callExpr.args.map(arg => transformExpression(arg, ctx));
      }
      return result;
    }
    case 'lambda': {
      const lambdaExpr = expr as { expr: 'lambda'; param: string; index?: string; body: Expression };
      const result: CompiledExpression = {
        expr: 'lambda',
        param: lambdaExpr.param,
        body: transformExpression(lambdaExpr.body, ctx),
      } as CompiledExpression;
      if (lambdaExpr.index) {
        (result as { index?: string }).index = lambdaExpr.index;
      }
      return result;
    }
    case 'array': {
      const arrayExpr = expr as { expr: 'array'; elements: Expression[] };
      return {
        expr: 'array',
        elements: arrayExpr.elements.map(elem => transformExpression(elem, ctx)),
      } as CompiledExpression;
    }
    case 'concat': {
      const concatExpr = expr as { expr: 'concat'; items: Expression[] };
      return {
        expr: 'concat',
        items: concatExpr.items.map(item => transformExpression(item, ctx)),
      } as CompiledExpression;
    }
    default:
      return { expr: 'lit', value: null };
  }
}

// ==================== Action Step Transformation ====================

/**
 * Transforms an AST ActionStep into a CompiledActionStep
 */
function transformActionStep(step: ActionStep, ctx?: TransformContext): CompiledActionStep {
  switch (step.do) {
    case 'set':
      return {
        do: 'set',
        target: step.target,
        value: transformExpression(step.value, ctx),
      } as CompiledSetStep;

    case 'update': {
      const updateStep: CompiledUpdateStep = {
        do: 'update',
        target: step.target,
        operation: step.operation,
      };
      if (step.value) {
        updateStep.value = transformExpression(step.value, ctx);
      }
      if (step.index) {
        updateStep.index = transformExpression(step.index, ctx);
      }
      if (step.deleteCount) {
        updateStep.deleteCount = transformExpression(step.deleteCount, ctx);
      }
      return updateStep;
    }

    case 'fetch': {
      const fetchStep: CompiledFetchStep = {
        do: 'fetch',
        url: transformExpression(step.url, ctx),
      };
      if (step.method) {
        fetchStep.method = step.method;
      }
      if (step.body) {
        fetchStep.body = transformExpression(step.body, ctx);
      }
      if (step.result) {
        fetchStep.result = step.result;
      }
      if (step.onSuccess) {
        fetchStep.onSuccess = step.onSuccess.map(s => transformActionStep(s, ctx));
      }
      if (step.onError) {
        fetchStep.onError = step.onError.map(s => transformActionStep(s, ctx));
      }
      return fetchStep;
    }

    case 'storage': {
      const storageStep = step as import('@constela/core').StorageStep;
      const compiledStorageStep: CompiledStorageStep = {
        do: 'storage',
        operation: storageStep.operation,
        key: transformExpression(storageStep.key, ctx),
        storage: storageStep.storage,
      };
      if (storageStep.value) {
        compiledStorageStep.value = transformExpression(storageStep.value, ctx);
      }
      if (storageStep.result) {
        compiledStorageStep.result = storageStep.result;
      }
      if (storageStep.onSuccess) {
        compiledStorageStep.onSuccess = storageStep.onSuccess.map(s => transformActionStep(s, ctx));
      }
      if (storageStep.onError) {
        compiledStorageStep.onError = storageStep.onError.map(s => transformActionStep(s, ctx));
      }
      return compiledStorageStep;
    }

    case 'clipboard': {
      const clipboardStep = step as import('@constela/core').ClipboardStep;
      const compiledClipboardStep: CompiledClipboardStep = {
        do: 'clipboard',
        operation: clipboardStep.operation,
      };
      if (clipboardStep.value) {
        compiledClipboardStep.value = transformExpression(clipboardStep.value, ctx);
      }
      if (clipboardStep.result) {
        compiledClipboardStep.result = clipboardStep.result;
      }
      if (clipboardStep.onSuccess) {
        compiledClipboardStep.onSuccess = clipboardStep.onSuccess.map(s => transformActionStep(s, ctx));
      }
      if (clipboardStep.onError) {
        compiledClipboardStep.onError = clipboardStep.onError.map(s => transformActionStep(s, ctx));
      }
      return compiledClipboardStep;
    }

    case 'navigate': {
      const navigateStep = step as import('@constela/core').NavigateStep;
      const compiledNavigateStep: CompiledNavigateStep = {
        do: 'navigate',
        url: transformExpression(navigateStep.url, ctx),
      };
      if (navigateStep.target) {
        compiledNavigateStep.target = navigateStep.target;
      }
      if (navigateStep.replace !== undefined) {
        compiledNavigateStep.replace = navigateStep.replace;
      }
      return compiledNavigateStep;
    }

    case 'import': {
      const importStep = step as import('@constela/core').ImportStep;
      const compiledImportStep: CompiledImportStep = {
        do: 'import',
        module: importStep.module,
        result: importStep.result,
      };
      if (importStep.onSuccess) {
        compiledImportStep.onSuccess = importStep.onSuccess.map(s => transformActionStep(s, ctx));
      }
      if (importStep.onError) {
        compiledImportStep.onError = importStep.onError.map(s => transformActionStep(s, ctx));
      }
      return compiledImportStep;
    }

    case 'call': {
      const callStep = step as import('@constela/core').CallStep;
      const compiledCallStep: CompiledCallStep = {
        do: 'call',
        target: transformExpression(callStep.target, ctx),
      };
      if (callStep.args) {
        compiledCallStep.args = callStep.args.map(arg => transformExpression(arg, ctx));
      }
      if (callStep.result) {
        compiledCallStep.result = callStep.result;
      }
      if (callStep.onSuccess) {
        compiledCallStep.onSuccess = callStep.onSuccess.map(s => transformActionStep(s, ctx));
      }
      if (callStep.onError) {
        compiledCallStep.onError = callStep.onError.map(s => transformActionStep(s, ctx));
      }
      return compiledCallStep;
    }

    case 'subscribe': {
      const subscribeStep = step as import('@constela/core').SubscribeStep;
      return {
        do: 'subscribe',
        target: transformExpression(subscribeStep.target, ctx),
        event: subscribeStep.event,
        action: subscribeStep.action,
      } as CompiledSubscribeStep;
    }

    case 'dispose': {
      const disposeStep = step as import('@constela/core').DisposeStep;
      return {
        do: 'dispose',
        target: transformExpression(disposeStep.target, ctx),
      } as CompiledDisposeStep;
    }

    case 'dom': {
      const domStep = step as { do: 'dom'; operation: string; selector: Expression; value?: Expression; attribute?: string };
      return {
        do: 'dom',
        operation: domStep.operation,
        selector: transformExpression(domStep.selector, ctx),
        ...(domStep.value && { value: transformExpression(domStep.value, ctx) }),
        ...(domStep.attribute && { attribute: domStep.attribute }),
      } as CompiledDomStep;
    }

    default:
      // Fallback for unknown action types - return a minimal set step
      return {
        do: 'set',
        target: '_unknown',
        value: { expr: 'lit', value: null },
      } as CompiledSetStep;
  }
}

// ==================== Local State Transformation ====================

/**
 * Transforms local state for components
 */
function transformLocalState(
  localState: Record<string, StateField>
): Record<string, { type: string; initial: unknown }> {
  const result: Record<string, { type: string; initial: unknown }> = {};
  for (const [name, field] of Object.entries(localState)) {
    result[name] = { type: field.type, initial: field.initial };
  }
  return result;
}

/**
 * Transforms local actions for components
 */
function transformLocalActions(
  localActions: LocalActionDefinition[],
  ctx?: TransformContext
): Record<string, CompiledLocalAction> {
  const result: Record<string, CompiledLocalAction> = {};
  for (const action of localActions) {
    result[action.name] = {
      name: action.name,
      steps: action.steps.map(s => transformActionStep(s, ctx)),
    };
  }
  return result;
}

// ==================== Actions Transformation ====================

function transformActions(actions?: ActionDefinition[]): CompiledAction[] {
  if (!actions) return [];
  return actions.map(action => ({
    name: action.name,
    steps: action.steps.map(s => transformActionStep(s)),
  }));
}

// ==================== View Node Transformation ====================

function transformViewNode(node: ViewNode, ctx: TransformContext): CompiledNode {
  switch (node.kind) {
    case 'element': {
      const result: CompiledNode = {
        kind: 'element',
        tag: node.tag,
      };
      if (node.props) {
        (result as { props?: Record<string, unknown> }).props = {};
        for (const [key, value] of Object.entries(node.props)) {
          if ('event' in value) {
            // Event handler
            (result as { props: Record<string, unknown> }).props[key] = {
              event: value.event,
              action: value.action,
            };
          } else {
            // Expression - transform to handle params
            (result as { props: Record<string, unknown> }).props[key] = transformExpression(value as Expression, ctx);
          }
        }
      }
      if (node.children && node.children.length > 0) {
        (result as { children?: CompiledNode[] }).children = node.children.map(
          child => transformViewNode(child, ctx)
        );
      }
      return result;
    }

    case 'text':
      return {
        kind: 'text',
        value: transformExpression(node.value as Expression, ctx),
      } as CompiledNode;

    case 'if': {
      const result: CompiledNode = {
        kind: 'if',
        condition: transformExpression(node.condition as Expression, ctx),
        then: transformViewNode(node.then, ctx),
      } as CompiledNode;
      if (node.else) {
        (result as { else?: CompiledNode }).else = transformViewNode(node.else, ctx);
      }
      return result;
    }

    case 'each':
      return {
        kind: 'each',
        items: transformExpression(node.items as Expression, ctx),
        as: node.as,
        body: transformViewNode(node.body, ctx),
      } as CompiledNode;

    case 'slot':
      // Slots remain as-is in layout transformation
      // They will be replaced during composition
      return {
        kind: 'slot',
        name: (node as ViewNode & { name?: string }).name,
      } as unknown as CompiledNode;

    case 'component': {
      const componentNode = node as ComponentNode;
      const def = ctx.components[componentNode.name];
      if (!def) {
        // Component not found - return empty element as fallback
        return { kind: 'element', tag: 'div' } as CompiledNode;
      }

      // Transform props to CompiledExpressions
      const params: Record<string, CompiledExpression> = {};
      if (componentNode.props) {
        for (const [name, expr] of Object.entries(componentNode.props)) {
          params[name] = transformExpression(expr, ctx);
        }
      }

      // Transform children for slot content
      const children: CompiledNode[] = [];
      if (componentNode.children && componentNode.children.length > 0) {
        for (const child of componentNode.children) {
          children.push(transformViewNode(child, ctx));
        }
      }

      // Create new context with currentParams and currentChildren
      const newCtx: TransformContext = {
        ...ctx,
        currentParams: params,
        currentChildren: children,
      };

      // Expand component view with the new context
      const expandedView = transformViewNode(def.view, newCtx);

      // Wrap with localState if present
      if (def.localState && Object.keys(def.localState).length > 0) {
        return {
          kind: 'localState',
          state: transformLocalState(def.localState),
          actions: transformLocalActions(def.localActions ?? [], newCtx),
          child: expandedView,
        } as CompiledLocalStateNode;
      }

      return expandedView;
    }

    case 'markdown':
      return {
        kind: 'markdown',
        content: node.content,
      } as CompiledNode;

    case 'code':
      return {
        kind: 'code',
        language: node.language,
        content: node.content,
      } as CompiledNode;

    case 'portal':
      return {
        kind: 'portal',
        target: (node as ViewNode & { target: string }).target,
        children: ((node as ViewNode & { children: ViewNode[] }).children ?? []).map(
          child => transformViewNode(child, ctx)
        ),
      } as CompiledNode;

    case 'island': {
      const islandNode = node as IslandNode;
      const compiledIsland: CompiledIslandNode = {
        kind: 'island',
        id: islandNode.id,
        strategy: islandNode.strategy,
        content: transformViewNode(islandNode.content, ctx),
      };

      if (islandNode.strategyOptions) {
        compiledIsland.strategyOptions = islandNode.strategyOptions;
      }

      if (islandNode.state) {
        compiledIsland.state = transformLocalState(islandNode.state);
      }

      if (islandNode.actions && islandNode.actions.length > 0) {
        compiledIsland.actions = {};
        for (const action of islandNode.actions) {
          compiledIsland.actions[action.name] = {
            name: action.name,
            steps: action.steps.map(s => transformActionStep(s)),
          };
        }
      }

      return compiledIsland;
    }

    case 'suspense': {
      const suspenseNode = node as SuspenseNode;
      return {
        kind: 'suspense',
        id: suspenseNode.id,
        fallback: transformViewNode(suspenseNode.fallback, ctx),
        content: transformViewNode(suspenseNode.content, ctx),
      } as CompiledSuspenseNode;
    }

    case 'errorBoundary': {
      const errorBoundaryNode = node as ErrorBoundaryNode;
      return {
        kind: 'errorBoundary',
        fallback: transformViewNode(errorBoundaryNode.fallback, ctx),
        content: transformViewNode(errorBoundaryNode.content, ctx),
      } as CompiledErrorBoundaryNode;
    }

    default: {
      const _exhaustiveCheck: never = node;
      throw new Error(`Unknown node kind: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

// ==================== Main Transform Function ====================

/**
 * Transforms a layout program into a compiled layout
 */
export function transformLayoutPass(
  layout: LayoutProgram,
  _context: LayoutAnalysisContext
): CompiledLayoutProgram {
  const ctx: TransformContext = {
    components: layout.components || {},
  };

  const result: CompiledLayoutProgram = {
    version: '1.0',
    type: 'layout',
    state: transformState(layout.state),
    actions: transformActions(layout.actions),
    view: transformViewNode(layout.view, ctx),
    components: layout.components,
  };

  // Preserve importData if present
  if (layout.importData && Object.keys(layout.importData).length > 0) {
    result.importData = layout.importData;
  }

  return result;
}

// ==================== Layout Composition ====================

/**
 * Deep clones a compiled node
 */
function deepCloneNode(node: CompiledNode): CompiledNode {
  return JSON.parse(JSON.stringify(node));
}

// ==================== Param Expression Resolution ====================

/**
 * Type guard to check if a value is a param expression
 */
function isParamExpression(value: unknown): value is { expr: 'param'; name: string; path?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { expr?: string }).expr === 'param' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

/**
 * Resolves a param expression to its corresponding value from layoutParams
 * If the param has a path, creates a get expression to access the path on the resolved value
 */
function resolveParamExpression(
  paramExpr: { expr: 'param'; name: string; path?: string },
  layoutParams: Record<string, Expression>
): Expression {
  const resolvedValue = layoutParams[paramExpr.name];

  if (!resolvedValue) {
    // Param not found, return null literal
    return { expr: 'lit', value: null };
  }

  if (paramExpr.path) {
    // Param has a path, create a get expression
    return {
      expr: 'get',
      base: resolvedValue,
      path: paramExpr.path,
    };
  }

  // No path, return the resolved value directly
  return resolvedValue;
}

/**
 * Resolves param expressions in an expression value
 */
function resolveExpressionValue(
  value: unknown,
  layoutParams: Record<string, Expression>
): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (isParamExpression(value)) {
    return resolveParamExpression(value, layoutParams);
  }

  // Handle nested expressions in objects
  if (Array.isArray(value)) {
    return value.map(item => resolveExpressionValue(item, layoutParams));
  }

  // Check for expression types that may contain nested expressions
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    result[key] = resolveExpressionValue(val, layoutParams);
  }

  return result;
}

/**
 * Resolves param expressions in props
 */
function resolvePropsParams(
  props: Record<string, unknown>,
  layoutParams: Record<string, Expression>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = resolveExpressionValue(value, layoutParams);
  }
  return result;
}

/**
 * Recursively resolves param expressions in a view node tree
 */
function resolveParamExpressions(
  node: CompiledNode,
  layoutParams: Record<string, Expression>
): CompiledNode {
  switch (node.kind) {
    case 'element': {
      const elementNode = node as {
        kind: 'element';
        tag: string;
        props?: Record<string, unknown>;
        children?: CompiledNode[];
      };

      const result: CompiledNode = {
        kind: 'element',
        tag: elementNode.tag,
      };

      if (elementNode.props) {
        (result as { props?: Record<string, unknown> }).props = resolvePropsParams(
          elementNode.props,
          layoutParams
        );
      }

      if (elementNode.children && elementNode.children.length > 0) {
        (result as { children?: CompiledNode[] }).children = elementNode.children.map(
          child => resolveParamExpressions(child, layoutParams)
        );
      }

      return result;
    }

    case 'text': {
      const textNode = node as { kind: 'text'; value: unknown };
      return {
        kind: 'text',
        value: resolveExpressionValue(textNode.value, layoutParams),
      } as CompiledNode;
    }

    case 'if': {
      const ifNode = node as {
        kind: 'if';
        condition: unknown;
        then: CompiledNode;
        else?: CompiledNode;
      };

      const result = {
        kind: 'if',
        condition: resolveExpressionValue(ifNode.condition, layoutParams),
        then: resolveParamExpressions(ifNode.then, layoutParams),
      } as CompiledNode;

      if (ifNode.else) {
        (result as { else?: CompiledNode }).else = resolveParamExpressions(
          ifNode.else,
          layoutParams
        );
      }

      return result;
    }

    case 'each': {
      const eachNode = node as {
        kind: 'each';
        items: unknown;
        as: string;
        body: CompiledNode;
      };

      return {
        kind: 'each',
        items: resolveExpressionValue(eachNode.items, layoutParams),
        as: eachNode.as,
        body: resolveParamExpressions(eachNode.body, layoutParams),
      } as CompiledNode;
    }

    default:
      // For other node kinds (slot, markdown, code, component), return as-is
      // Slots will be handled separately by replaceSlots
      return node;
  }
}

/**
 * Processes only named slots in a node tree, skipping default slots.
 * This is used to process named slots within page content that was inserted
 * into a layout's default slot, without causing infinite recursion.
 */
function processNamedSlotsOnly(
  node: CompiledNode,
  namedContent: Record<string, CompiledNode>
): CompiledNode {
  // Check if this is a slot node
  if ((node as unknown as { kind: string }).kind === 'slot') {
    const slotName = (node as unknown as { name?: string }).name;
    // Only process named slots, leave default slots as-is
    if (slotName && namedContent[slotName]) {
      return deepCloneNode(namedContent[slotName]);
    }
    // Default slot (no name) - return as-is
    return node;
  }

  // Handle element nodes with children
  if (node.kind === 'element') {
    const children = (node as { children?: CompiledNode[] }).children;
    if (children && children.length > 0) {
      const newChildren = children.map(child => processNamedSlotsOnly(child, namedContent));
      return {
        ...node,
        children: newChildren,
      };
    }
    return node;
  }

  // Handle if nodes
  if (node.kind === 'if') {
    const ifNode = node as { then: CompiledNode; else?: CompiledNode };
    const result = {
      ...node,
      then: processNamedSlotsOnly(ifNode.then, namedContent),
    };
    if (ifNode.else) {
      (result as { else?: CompiledNode }).else = processNamedSlotsOnly(ifNode.else, namedContent);
    }
    return result as CompiledNode;
  }

  // Handle each nodes
  if (node.kind === 'each') {
    const eachNode = node as { body: CompiledNode };
    return {
      ...node,
      body: processNamedSlotsOnly(eachNode.body, namedContent),
    } as CompiledNode;
  }

  return node;
}

/**
 * Expands a component node with localState wrapping if applicable
 */
function expandComponentNode(
  node: CompiledNode,
  components: Record<string, ComponentDef>,
  defaultContent: CompiledNode,
  namedContent?: Record<string, CompiledNode>,
  parentCtx?: TransformContext
): CompiledNode {
  const componentNode = node as unknown as ComponentNode;
  const def = components[componentNode.name];

  if (!def) {
    // Component not found - return empty element as fallback
    return { kind: 'element', tag: 'div' } as CompiledNode;
  }

  // Create base context for transforming props
  const baseCtx: TransformContext = parentCtx ?? { components };

  // Transform props to CompiledExpressions
  const params: Record<string, CompiledExpression> = {};
  if (componentNode.props) {
    for (const [name, expr] of Object.entries(componentNode.props)) {
      params[name] = transformExpression(expr, baseCtx);
    }
  }

  // Transform children for slot content
  const children: CompiledNode[] = [];
  if (componentNode.children && componentNode.children.length > 0) {
    for (const child of componentNode.children) {
      // Recursively process children through replaceSlots
      const transformedChild = transformViewNode(child, baseCtx);
      children.push(replaceSlots(transformedChild, defaultContent, namedContent, components));
    }
  }

  // Create new context with currentParams and currentChildren
  const newCtx: TransformContext = {
    components,
    currentParams: params,
    currentChildren: children,
  };

  // Expand component view with the new context
  const expandedView = transformViewNode(def.view, newCtx);

  // Recursively process the expanded view to handle nested components
  const processedView = replaceSlots(expandedView, defaultContent, namedContent, components);

  // Wrap with localState if present
  if (def.localState && Object.keys(def.localState).length > 0) {
    return {
      kind: 'localState',
      state: transformLocalState(def.localState),
      actions: transformLocalActions(def.localActions ?? [], newCtx),
      child: processedView,
    } as CompiledLocalStateNode;
  }

  return processedView;
}

/**
 * Replaces slot nodes with content in a compiled node tree
 */
function replaceSlots(
  node: CompiledNode,
  defaultContent: CompiledNode,
  namedContent?: Record<string, CompiledNode>,
  components?: Record<string, ComponentDef>
): CompiledNode {
  // Check if this is a slot node
  if ((node as unknown as { kind: string }).kind === 'slot') {
    const slotName = (node as unknown as { name?: string }).name;
    if (slotName && namedContent?.[slotName]) {
      return deepCloneNode(namedContent[slotName]);
    }
    // Clone the default content
    const clonedDefault = deepCloneNode(defaultContent);
    // If there are named slots, process them in the cloned content too
    if (namedContent && Object.keys(namedContent).length > 0) {
      return processNamedSlotsOnly(clonedDefault, namedContent);
    }
    return clonedDefault;
  }

  // Handle component nodes - expand them with localState wrapping
  if ((node as unknown as { kind: string }).kind === 'component' && components) {
    return expandComponentNode(node, components, defaultContent, namedContent);
  }

  // Handle element nodes with children
  if (node.kind === 'element') {
    const children = (node as { children?: CompiledNode[] }).children;
    if (children && children.length > 0) {
      const newChildren = children.map(child => replaceSlots(child, defaultContent, namedContent, components));
      return {
        ...node,
        children: newChildren,
      };
    }
    return node;
  }

  // Handle if nodes
  if (node.kind === 'if') {
    const ifNode = node as { then: CompiledNode; else?: CompiledNode };
    const result = {
      ...node,
      then: replaceSlots(ifNode.then, defaultContent, namedContent, components),
    };
    if (ifNode.else) {
      (result as { else?: CompiledNode }).else = replaceSlots(ifNode.else, defaultContent, namedContent, components);
    }
    return result as CompiledNode;
  }

  // Handle each nodes
  if (node.kind === 'each') {
    const eachNode = node as { body: CompiledNode };
    return {
      ...node,
      body: replaceSlots(eachNode.body, defaultContent, namedContent, components),
    } as CompiledNode;
  }

  return node;
}

/**
 * Extracts MDX content from importData as named slots.
 * Looks for arrays in importData that contain items with a `content` property (ViewNode).
 *
 * @param importData - The page's importData
 * @returns Record with 'mdx-content' slot if found, undefined otherwise
 */
function extractMdxSlotsFromImportData(
  importData: Record<string, unknown> | undefined
): Record<string, CompiledNode> | undefined {
  if (!importData) return undefined;

  for (const [, dataSource] of Object.entries(importData)) {
    if (!Array.isArray(dataSource)) continue;

    // Find the first item with a content property
    for (const item of dataSource) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'content' in item &&
        typeof (item as { content: unknown }).content === 'object'
      ) {
        const content = (item as { content: ViewNode }).content;
        return { 'mdx-content': content as unknown as CompiledNode };
      }
    }
  }

  return undefined;
}

/**
 * Composes a layout with a page, inserting page content into slots
 */
export function composeLayoutWithPage(
  layout: CompiledProgram,
  page: CompiledProgram,
  layoutParams?: Record<string, Expression>,
  slots?: Record<string, ViewNode>
): CompiledProgram {
  // Clone layout view for modification
  let layoutView = deepCloneNode(layout.view);

  // Resolve param expressions in layout view if layoutParams provided
  // If layoutParams is undefined, still resolve params to null literals
  const resolvedParams = layoutParams ?? {};
  layoutView = resolveParamExpressions(layoutView, resolvedParams);

  // Convert ViewNode slots to CompiledNode if provided
  // If no slots provided, try to extract MDX content from page.importData
  let namedContent: Record<string, CompiledNode> | undefined;
  if (slots) {
    namedContent = Object.fromEntries(
      Object.entries(slots).map(([name, node]) => [name, node as unknown as CompiledNode])
    );
  } else {
    // Auto-extract MDX content from importData
    namedContent = extractMdxSlotsFromImportData(page.importData);
  }

  // Merge components from layout and page (needed for component expansion)
  const mergedComponents = {
    ...((layout as unknown as { components?: Record<string, ComponentDef> }).components || {}),
    ...((page as unknown as { components?: Record<string, ComponentDef> }).components || {}),
  };

  // Replace slots with page content and expand components with localState
  const composedView = replaceSlots(layoutView, page.view, namedContent, mergedComponents);

  // Merge state (prefix layout state if conflicts)
  const mergedState: Record<string, { type: string; initial: unknown }> = {};
  
  // Add page state first
  for (const [name, field] of Object.entries(page.state)) {
    mergedState[name] = field;
  }
  
  // Add layout state, prefixing if conflicts
  for (const [name, field] of Object.entries(layout.state)) {
    if (name in mergedState) {
      mergedState[`$layout.${name}`] = field;
    } else {
      mergedState[name] = field;
    }
  }

  // Merge actions (prefix layout actions if conflicts)
  // Handle both array and Record formats for actions
  const getActionsArray = (actions: unknown): CompiledAction[] => {
    if (Array.isArray(actions)) return actions;
    if (typeof actions === 'object' && actions !== null) {
      return Object.values(actions as Record<string, CompiledAction>);
    }
    return [];
  };

  const pageActions = getActionsArray(page.actions);
  const layoutActions = getActionsArray(layout.actions);
  const pageActionNames = new Set(pageActions.map(a => a.name));

  const mergedActions: Record<string, CompiledAction> = {};
  for (const action of pageActions) {
    mergedActions[action.name] = action;
  }
  for (const action of layoutActions) {
    if (pageActionNames.has(action.name)) {
      const prefixedName = `$layout.${action.name}`;
      mergedActions[prefixedName] = { ...action, name: prefixedName };
    } else {
      mergedActions[action.name] = action;
    }
  }

  const result: CompiledProgram = {
    version: '1.0',
    state: mergedState,
    actions: mergedActions,
    view: composedView,
  };

  // Preserve page route
  if (page.route) {
    result.route = page.route;
  }

  // Add components if any
  if (Object.keys(mergedComponents).length > 0) {
    (result as unknown as { components: Record<string, ComponentDef> }).components = mergedComponents;
  }

  // Merge importData from layout and page (page takes precedence on conflicts)
  const mergedImportData = {
    ...(layout.importData || {}),
    ...(page.importData || {}),
  };

  if (Object.keys(mergedImportData).length > 0) {
    result.importData = mergedImportData;
  }

  // Preserve page lifecycle
  if (page.lifecycle) {
    result.lifecycle = page.lifecycle;
  }

  return result;
}
