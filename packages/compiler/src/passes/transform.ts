/**
 * Transform Pass - AST to CompiledProgram transformation
 *
 * This pass transforms the validated and analyzed AST into a CompiledProgram
 * that is optimized for runtime execution.
 */

import type {
  Program,
  Expression,
  ViewNode,
  ActionDefinition,
  ActionStep,
  StateField,
  EventHandler,
  ComponentDef,
  LifecycleHooks,
} from '@constela/core';
import { isEventHandler } from '@constela/core';
import type { AnalysisContext } from './analyze.js';

// ==================== Transform Context ====================

interface TransformContext {
  components: Record<string, ComponentDef>;
  currentParams?: Record<string, CompiledExpression>; // Current component's param values
  currentChildren?: CompiledNode[]; // Current component's children for slot
}

// ==================== Compiled Program Types ====================

export interface CompiledRouteDefinition {
  path: string;
  params: string[];
  title?: CompiledExpression;
  layout?: string;
  layoutParams?: Record<string, Expression>;
  meta?: Record<string, CompiledExpression>;
}

export interface CompiledLifecycleHooks {
  onMount?: string;
  onUnmount?: string;
  onRouteEnter?: string;
  onRouteLeave?: string;
}

export interface CompiledProgram {
  version: '1.0';
  route?: CompiledRouteDefinition;
  lifecycle?: CompiledLifecycleHooks;
  state: Record<string, { type: string; initial: unknown }>;
  actions: Record<string, CompiledAction>;
  view: CompiledNode;
  importData?: Record<string, unknown>;  // Resolved import data
}

export interface CompiledAction {
  name: string;
  steps: CompiledActionStep[];
}

export type CompiledActionStep =
  | CompiledSetStep
  | CompiledUpdateStep
  | CompiledFetchStep
  | CompiledStorageStep
  | CompiledClipboardStep
  | CompiledNavigateStep
  | CompiledImportStep
  | CompiledCallStep
  | CompiledSubscribeStep
  | CompiledDisposeStep
  | CompiledDomStep
  | CompiledIfStep;

export interface CompiledSetStep {
  do: 'set';
  target: string;
  value: CompiledExpression;
}

export interface CompiledUpdateStep {
  do: 'update';
  target: string;
  operation: string;
  value?: CompiledExpression;
  index?: CompiledExpression;       // for replaceAt, insertAt, splice
  deleteCount?: CompiledExpression; // for splice
}

export interface CompiledFetchStep {
  do: 'fetch';
  url: CompiledExpression;
  method?: string;
  body?: CompiledExpression;
  result?: string;
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

export interface CompiledStorageStep {
  do: 'storage';
  operation: 'get' | 'set' | 'remove';
  key: CompiledExpression;
  value?: CompiledExpression;      // Required for 'set'
  storage: 'local' | 'session';
  result?: string;                 // Variable name for 'get' result
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

export interface CompiledClipboardStep {
  do: 'clipboard';
  operation: 'write' | 'read';
  value?: CompiledExpression;      // Required for 'write'
  result?: string;                 // Variable name for 'read' result
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

export interface CompiledNavigateStep {
  do: 'navigate';
  url: CompiledExpression;
  target?: '_self' | '_blank';     // Default: '_self'
  replace?: boolean;               // Use history.replaceState
}

/**
 * Compiled ref expression
 */
export interface CompiledRefExpr {
  expr: 'ref';
  name: string;
}

/**
 * Compiled import step
 */
export interface CompiledImportStep {
  do: 'import';
  module: string;
  result: string;
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

/**
 * Compiled call step
 */
export interface CompiledCallStep {
  do: 'call';
  target: CompiledExpression;
  args?: CompiledExpression[];
  result?: string;
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

/**
 * Compiled subscribe step
 */
export interface CompiledSubscribeStep {
  do: 'subscribe';
  target: CompiledExpression;
  event: string;
  action: string;
}

/**
 * Compiled dispose step
 */
export interface CompiledDisposeStep {
  do: 'dispose';
  target: CompiledExpression;
}

/**
 * Compiled DOM manipulation step
 */
export interface CompiledDomStep {
  do: 'dom';
  operation: 'addClass' | 'removeClass' | 'toggleClass' | 'setAttribute' | 'removeAttribute';
  selector: CompiledExpression;  // CSS selector or 'html', 'body'
  value?: CompiledExpression;    // class name or attribute value
  attribute?: string;            // for setAttribute/removeAttribute
}

export interface CompiledIfStep {
  do: 'if';
  condition: CompiledExpression;
  then: CompiledActionStep[];
  else?: CompiledActionStep[];
}

// ==================== Compiled View Node Types ====================

export type CompiledNode =
  | CompiledElementNode
  | CompiledTextNode
  | CompiledIfNode
  | CompiledEachNode
  | CompiledMarkdownNode
  | CompiledCodeNode
  | CompiledSlotNode;

export interface CompiledElementNode {
  kind: 'element';
  tag: string;
  ref?: string;
  props?: Record<string, CompiledExpression | CompiledEventHandler>;
  children?: CompiledNode[];
}

export interface CompiledTextNode {
  kind: 'text';
  value: CompiledExpression;
}

export interface CompiledIfNode {
  kind: 'if';
  condition: CompiledExpression;
  then: CompiledNode;
  else?: CompiledNode;
}

export interface CompiledEachNode {
  kind: 'each';
  items: CompiledExpression;
  as: string;
  index?: string;
  key?: CompiledExpression;
  body: CompiledNode;
}

export interface CompiledMarkdownNode {
  kind: 'markdown';
  content: CompiledExpression;
}

export interface CompiledCodeNode {
  kind: 'code';
  language: CompiledExpression;
  content: CompiledExpression;
}

export interface CompiledSlotNode {
  kind: 'slot';
  name?: string;
}

// ==================== Compiled Expression Types ====================

export type CompiledExpression =
  | CompiledLitExpr
  | CompiledStateExpr
  | CompiledVarExpr
  | CompiledBinExpr
  | CompiledNotExpr
  | CompiledCondExpr
  | CompiledGetExpr
  | CompiledRouteExpr
  | CompiledImportExpr
  | CompiledDataExpr
  | CompiledRefExpr
  | CompiledIndexExpr
  | CompiledParamExpr;

export interface CompiledLitExpr {
  expr: 'lit';
  value: string | number | boolean | null | unknown[];
}

export interface CompiledStateExpr {
  expr: 'state';
  name: string;
  path?: string;
}

export interface CompiledVarExpr {
  expr: 'var';
  name: string;
  path?: string;
}

export interface CompiledBinExpr {
  expr: 'bin';
  op: string;
  left: CompiledExpression;
  right: CompiledExpression;
}

export interface CompiledNotExpr {
  expr: 'not';
  operand: CompiledExpression;
}

export interface CompiledCondExpr {
  expr: 'cond';
  if: CompiledExpression;
  then: CompiledExpression;
  else: CompiledExpression;
}

export interface CompiledGetExpr {
  expr: 'get';
  base: CompiledExpression;
  path: string;
}

export interface CompiledRouteExpr {
  expr: 'route';
  name: string;
  source: 'param' | 'query' | 'path';
}

export interface CompiledImportExpr {
  expr: 'import';
  name: string;
  path?: string;
}

export interface CompiledDataExpr {
  expr: 'data';
  name: string;
  path?: string;
}

export interface CompiledIndexExpr {
  expr: 'index';
  base: CompiledExpression;
  key: CompiledExpression;
}

export interface CompiledParamExpr {
  expr: 'param';
  name: string;
  path?: string;
}

// ==================== Compiled Event Handler ====================

export interface CompiledEventHandler {
  event: string;
  action: string;
  payload?: CompiledExpression;
}

// ==================== Transform Pass Result ====================

export type TransformPassResult = CompiledProgram;

// Re-export for convenience
export type { Program, AnalysisContext };

// ==================== Expression Transformation ====================

/**
 * Transforms an AST Expression into a CompiledExpression
 */
function transformExpression(expr: Expression, ctx: TransformContext): CompiledExpression {
  switch (expr.expr) {
    case 'lit':
      return {
        expr: 'lit',
        value: expr.value,
      };

    case 'state': {
      const stateExpr: CompiledStateExpr = {
        expr: 'state',
        name: expr.name,
      };
      if (expr.path) {
        stateExpr.path = expr.path;
      }
      return stateExpr;
    }

    case 'var': {
      const varExpr: CompiledVarExpr = {
        expr: 'var',
        name: expr.name,
      };
      if (expr.path) {
        varExpr.path = expr.path;
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

    case 'param': {
      // Substitute param with the value from currentParams
      const paramValue = ctx.currentParams?.[expr.name];
      if (paramValue !== undefined) {
        // If param has a path, we need to add it to the resulting expression
        if (expr.path) {
          // If the param value is a var or state expression, add the path
          if (paramValue.expr === 'var') {
            const existingPath = (paramValue as CompiledVarExpr).path;
            const resultPath = existingPath
              ? `${existingPath}.${expr.path}`
              : expr.path;
            return {
              expr: 'var',
              name: (paramValue as CompiledVarExpr).name,
              path: resultPath,
            };
          }
          if (paramValue.expr === 'state') {
            // State expressions don't have path, so we convert to var-like access
            // For now, return the original param value with path as a var
            return {
              expr: 'var',
              name: (paramValue as CompiledStateExpr).name,
              path: expr.path,
            };
          }
          // For other expression types with path, return as-is for now
          return paramValue;
        }
        return paramValue;
      }
      // Should not happen if analyze pass is correct, return undefined literal
      return { expr: 'lit', value: null };
    }

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
      const importExpr: CompiledImportExpr = {
        expr: 'import',
        name: expr.name,
      };
      if (expr.path) {
        importExpr.path = expr.path;
      }
      return importExpr;
    }

    case 'data': {
      // Data expressions are similar to import expressions
      // They are resolved at build time and treated like imports
      const dataExpr: CompiledImportExpr = {
        expr: 'import',
        name: expr.name,
      };
      if (expr.path) {
        dataExpr.path = expr.path;
      }
      return dataExpr;
    }

    case 'ref':
      return { expr: 'ref', name: expr.name };

    case 'index':
      return {
        expr: 'index',
        base: transformExpression(expr.base, ctx),
        key: transformExpression(expr.key, ctx),
      };
  }
}

// ==================== Event Handler Transformation ====================

/**
 * Transforms an AST EventHandler into a CompiledEventHandler
 */
function transformEventHandler(handler: EventHandler, ctx: TransformContext): CompiledEventHandler {
  const result: CompiledEventHandler = {
    event: handler.event,
    action: handler.action,
  };

  if (handler.payload) {
    result.payload = transformExpression(handler.payload, ctx);
  }

  return result;
}

// ==================== Action Step Transformation ====================

/**
 * Transforms an AST ActionStep into a CompiledActionStep
 */
const emptyContext: TransformContext = { components: {} };

function transformActionStep(step: ActionStep): CompiledActionStep {
  switch (step.do) {
    case 'set':
      return {
        do: 'set',
        target: step.target,
        value: transformExpression(step.value, emptyContext),
      };

    case 'update': {
      const updateStep: CompiledUpdateStep = {
        do: 'update',
        target: step.target,
        operation: step.operation,
      };
      if (step.value) {
        updateStep.value = transformExpression(step.value, emptyContext);
      }
      if (step.index) {
        updateStep.index = transformExpression(step.index, emptyContext);
      }
      if (step.deleteCount) {
        updateStep.deleteCount = transformExpression(step.deleteCount, emptyContext);
      }
      return updateStep;
    }

    case 'fetch': {
      const fetchStep: CompiledFetchStep = {
        do: 'fetch',
        url: transformExpression(step.url, emptyContext),
      };
      if (step.method) {
        fetchStep.method = step.method;
      }
      if (step.body) {
        fetchStep.body = transformExpression(step.body, emptyContext);
      }
      if (step.result) {
        fetchStep.result = step.result;
      }
      if (step.onSuccess) {
        fetchStep.onSuccess = step.onSuccess.map(transformActionStep);
      }
      if (step.onError) {
        fetchStep.onError = step.onError.map(transformActionStep);
      }
      return fetchStep;
    }

    case 'storage': {
      const storageStep = step as import('@constela/core').StorageStep;
      const compiledStorageStep: CompiledStorageStep = {
        do: 'storage',
        operation: storageStep.operation,
        key: transformExpression(storageStep.key, emptyContext),
        storage: storageStep.storage,
      };
      if (storageStep.value) {
        compiledStorageStep.value = transformExpression(storageStep.value, emptyContext);
      }
      if (storageStep.result) {
        compiledStorageStep.result = storageStep.result;
      }
      if (storageStep.onSuccess) {
        compiledStorageStep.onSuccess = storageStep.onSuccess.map(transformActionStep);
      }
      if (storageStep.onError) {
        compiledStorageStep.onError = storageStep.onError.map(transformActionStep);
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
        compiledClipboardStep.value = transformExpression(clipboardStep.value, emptyContext);
      }
      if (clipboardStep.result) {
        compiledClipboardStep.result = clipboardStep.result;
      }
      if (clipboardStep.onSuccess) {
        compiledClipboardStep.onSuccess = clipboardStep.onSuccess.map(transformActionStep);
      }
      if (clipboardStep.onError) {
        compiledClipboardStep.onError = clipboardStep.onError.map(transformActionStep);
      }
      return compiledClipboardStep;
    }

    case 'navigate': {
      const navigateStep = step as import('@constela/core').NavigateStep;
      const compiledNavigateStep: CompiledNavigateStep = {
        do: 'navigate',
        url: transformExpression(navigateStep.url, emptyContext),
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
        compiledImportStep.onSuccess = importStep.onSuccess.map(transformActionStep);
      }
      if (importStep.onError) {
        compiledImportStep.onError = importStep.onError.map(transformActionStep);
      }
      return compiledImportStep;
    }

    case 'call': {
      const callStep = step as import('@constela/core').CallStep;
      const compiledCallStep: CompiledCallStep = {
        do: 'call',
        target: transformExpression(callStep.target, emptyContext),
      };
      if (callStep.args) {
        compiledCallStep.args = callStep.args.map(arg => transformExpression(arg, emptyContext));
      }
      if (callStep.result) {
        compiledCallStep.result = callStep.result;
      }
      if (callStep.onSuccess) {
        compiledCallStep.onSuccess = callStep.onSuccess.map(transformActionStep);
      }
      if (callStep.onError) {
        compiledCallStep.onError = callStep.onError.map(transformActionStep);
      }
      return compiledCallStep;
    }

    case 'subscribe': {
      const subscribeStep = step as import('@constela/core').SubscribeStep;
      return {
        do: 'subscribe',
        target: transformExpression(subscribeStep.target, emptyContext),
        event: subscribeStep.event,
        action: subscribeStep.action,
      } as CompiledSubscribeStep;
    }

    case 'dispose': {
      const disposeStep = step as import('@constela/core').DisposeStep;
      return {
        do: 'dispose',
        target: transformExpression(disposeStep.target, emptyContext),
      } as CompiledDisposeStep;
    }

    case 'dom': {
      const domStep = step as import('@constela/core').DomStep;
      return {
        do: 'dom',
        operation: domStep.operation,
        selector: transformExpression(domStep.selector, emptyContext),
        ...(domStep.value && { value: transformExpression(domStep.value, emptyContext) }),
        ...(domStep.attribute && { attribute: domStep.attribute }),
      } as CompiledDomStep;
    }
  }
}

// ==================== View Node Transformation ====================

/**
 * Helper to flatten children when slot expands to multiple nodes
 */
function flattenSlotChildren(
  children: ViewNode[],
  ctx: TransformContext
): CompiledNode[] {
  const result: CompiledNode[] = [];
  for (const child of children) {
    if (child.kind === 'slot') {
      // Slot should be replaced with currentChildren
      if (ctx.currentChildren && ctx.currentChildren.length > 0) {
        result.push(...ctx.currentChildren);
      }
      // If no children, slot produces nothing
    } else {
      result.push(transformViewNode(child, ctx));
    }
  }
  return result;
}

/**
 * Transforms an AST ViewNode into a CompiledNode
 */
function transformViewNode(node: ViewNode, ctx: TransformContext): CompiledNode {
  switch (node.kind) {
    case 'element': {
      const compiledElement: CompiledElementNode = {
        kind: 'element',
        tag: node.tag,
      };

      if (node.ref) {
        compiledElement.ref = node.ref;
      }

      if (node.props) {
        compiledElement.props = {};
        for (const [propName, propValue] of Object.entries(node.props)) {
          if (isEventHandler(propValue)) {
            compiledElement.props[propName] = transformEventHandler(propValue, ctx);
          } else {
            compiledElement.props[propName] = transformExpression(propValue as Expression, ctx);
          }
        }
      }

      if (node.children && node.children.length > 0) {
        const flattenedChildren = flattenSlotChildren(node.children, ctx);
        if (flattenedChildren.length > 0) {
          compiledElement.children = flattenedChildren;
        }
      }

      return compiledElement;
    }

    case 'text':
      return {
        kind: 'text',
        value: transformExpression(node.value, ctx),
      };

    case 'if': {
      const compiledIf: CompiledIfNode = {
        kind: 'if',
        condition: transformExpression(node.condition, ctx),
        then: transformViewNode(node.then, ctx),
      };

      if (node.else) {
        compiledIf.else = transformViewNode(node.else, ctx);
      }

      return compiledIf;
    }

    case 'each': {
      const compiledEach: CompiledEachNode = {
        kind: 'each',
        items: transformExpression(node.items, ctx),
        as: node.as,
        body: transformViewNode(node.body, ctx),
      };

      if (node.index) {
        compiledEach.index = node.index;
      }

      if (node.key) {
        compiledEach.key = transformExpression(node.key, ctx);
      }

      return compiledEach;
    }

    case 'component': {
      const def = ctx.components[node.name];
      if (!def) {
        // Component not found - should not happen if analyze pass is correct
        // Return an empty element as fallback
        return { kind: 'element', tag: 'div' };
      }

      // Transform props to CompiledExpressions
      const params: Record<string, CompiledExpression> = {};
      if (node.props) {
        for (const [name, expr] of Object.entries(node.props)) {
          params[name] = transformExpression(expr, ctx);
        }
      }

      // Transform children for slot content
      const children: CompiledNode[] = [];
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
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
      return transformViewNode(def.view, newCtx);
    }

    case 'markdown':
      return {
        kind: 'markdown',
        content: transformExpression(node.content, ctx),
      };

    case 'code':
      return {
        kind: 'code',
        language: transformExpression(node.language, ctx),
        content: transformExpression(node.content, ctx),
      };

    case 'slot': {
      // If currentChildren exists and has items, return them
      if (ctx.currentChildren && ctx.currentChildren.length > 0) {
        if (ctx.currentChildren.length === 1) {
          // Single child, return it directly
          const child = ctx.currentChildren[0];
          if (child) return child;
        }
        // Multiple children - wrap in a span element
        return {
          kind: 'element',
          tag: 'span',
          children: ctx.currentChildren,
        };
      }
      // No children - return an empty text node
      return { kind: 'text', value: { expr: 'lit', value: '' } };
    }
  }
}

// ==================== State Transformation ====================

/**
 * Transforms AST state into compiled state format
 */
function transformState(
  state: Record<string, StateField>
): Record<string, { type: string; initial: unknown }> {
  const compiledState: Record<string, { type: string; initial: unknown }> = {};

  for (const [name, field] of Object.entries(state)) {
    compiledState[name] = {
      type: field.type,
      initial: field.initial,
    };
  }

  return compiledState;
}

// ==================== Actions Transformation ====================

/**
 * Transforms AST actions into a Record for efficient lookup
 */
function transformActions(actions: ActionDefinition[]): Record<string, CompiledAction> {
  const compiledActions: Record<string, CompiledAction> = {};

  for (const action of actions) {
    compiledActions[action.name] = {
      name: action.name,
      steps: action.steps.map(transformActionStep),
    };
  }

  return compiledActions;
}

// ==================== Route Definition Transformation ====================

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

/**
 * Transforms AST RouteDefinition into CompiledRouteDefinition
 */
function transformRouteDefinition(
  route: { path: string; title?: Expression; layout?: string; layoutParams?: Record<string, Expression>; meta?: Record<string, Expression> },
  ctx: TransformContext
): CompiledRouteDefinition {
  const compiled: CompiledRouteDefinition = {
    path: route.path,
    params: extractRouteParams(route.path),
  };

  if (route.title) {
    compiled.title = transformExpression(route.title, ctx);
  }

  if (route.layout) {
    compiled.layout = route.layout;
  }

  // layoutParams are passed through as-is (not transformed)
  // They will be resolved during layout composition
  if (route.layoutParams) {
    compiled.layoutParams = route.layoutParams;
  }

  if (route.meta) {
    compiled.meta = {};
    for (const [key, value] of Object.entries(route.meta)) {
      compiled.meta[key] = transformExpression(value, ctx);
    }
  }

  return compiled;
}

// ==================== Lifecycle Hooks Transformation ====================

/**
 * Transforms AST LifecycleHooks into CompiledLifecycleHooks
 */
function transformLifecycleHooks(
  lifecycle: LifecycleHooks | undefined
): CompiledLifecycleHooks | undefined {
  if (!lifecycle) return undefined;

  // Check if all hooks are undefined - return undefined for empty object
  const hasAnyHook = lifecycle.onMount || lifecycle.onUnmount ||
                     lifecycle.onRouteEnter || lifecycle.onRouteLeave;
  if (!hasAnyHook) return undefined;

  const result: CompiledLifecycleHooks = {};

  if (lifecycle.onMount) {
    result.onMount = lifecycle.onMount;
  }
  if (lifecycle.onUnmount) {
    result.onUnmount = lifecycle.onUnmount;
  }
  if (lifecycle.onRouteEnter) {
    result.onRouteEnter = lifecycle.onRouteEnter;
  }
  if (lifecycle.onRouteLeave) {
    result.onRouteLeave = lifecycle.onRouteLeave;
  }

  return result;
}

// ==================== Main Transform Function ====================

/**
 * Transforms the validated and analyzed AST into a CompiledProgram
 *
 * @param ast - Validated AST from validate pass
 * @param _context - Analysis context from analyze pass (unused in current implementation)
 * @param importData - Optional resolved import data to include in the compiled program
 * @returns CompiledProgram
 */
export function transformPass(
  ast: Program,
  _context: AnalysisContext,
  importData?: Record<string, unknown>
): CompiledProgram {
  const ctx: TransformContext = {
    components: ast.components || {},
  };

  const result: CompiledProgram = {
    version: '1.0',
    state: transformState(ast.state),
    actions: transformActions(ast.actions),
    view: transformViewNode(ast.view, ctx),
  };

  if (ast.route) {
    result.route = transformRouteDefinition(ast.route, ctx);
  }

  // Transform lifecycle hooks
  const lifecycle = transformLifecycleHooks(ast.lifecycle);
  if (lifecycle) {
    result.lifecycle = lifecycle;
  }

  // Include import data if provided and non-empty
  if (importData && Object.keys(importData).length > 0) {
    result.importData = importData;
  }

  return result;
}
