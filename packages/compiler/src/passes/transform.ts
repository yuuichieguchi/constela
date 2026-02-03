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
  LocalActionDefinition,
  CallExpr,
  LambdaExpr,
  ArrayExpr,
  IslandStrategy,
  IslandStrategyOptions,
  IslandNode,
  SuspenseNode,
  ErrorBoundaryNode,
} from '@constela/core';
import { isEventHandler } from '@constela/core';
import type { AnalysisContext } from './analyze.js';

// ==================== Transform Context ====================

interface TransformContext {
  components: Record<string, ComponentDef>;
  currentParams?: Record<string, CompiledExpression | CompiledEventHandler>; // Current component's param values
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
  /** Canonical URL for SEO */
  canonical?: CompiledExpression;
  /** JSON-LD structured data for SEO */
  jsonLd?: CompiledJsonLdDefinition;
}

/**
 * Compiled JSON-LD structured data definition
 */
export interface CompiledJsonLdDefinition {
  /** Schema.org type (e.g., "Article", "WebPage", "Organization") */
  type: string;
  /** Compiled properties for the JSON-LD object */
  properties: Record<string, CompiledExpression>;
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
  | CompiledSetPathStep
  | CompiledFetchStep
  | CompiledStorageStep
  | CompiledClipboardStep
  | CompiledNavigateStep
  | CompiledImportStep
  | CompiledCallStep
  | CompiledSubscribeStep
  | CompiledDisposeStep
  | CompiledDomStep
  | CompiledIfStep
  | CompiledSendStep
  | CompiledCloseStep
  | CompiledDelayStep
  | CompiledIntervalStep
  | CompiledClearTimerStep
  | CompiledFocusStep
  | CompiledGenerateStep
  | CompiledSSEConnectStep
  | CompiledSSECloseStep
  | CompiledOptimisticStep
  | CompiledConfirmStep
  | CompiledRejectStep
  | CompiledBindStep
  | CompiledUnbindStep;

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

export interface CompiledSetPathStep {
  do: 'setPath';
  target: string;
  path: CompiledExpression;
  value: CompiledExpression;
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

/**
 * Compiled send step - sends data through a named WebSocket connection
 */
export interface CompiledSendStep {
  do: 'send';
  connection: string;
  data: CompiledExpression;
}

/**
 * Compiled close step - closes a named WebSocket connection
 */
export interface CompiledCloseStep {
  do: 'close';
  connection: string;
}

/**
 * Compiled delay step - executes steps after a delay (setTimeout equivalent)
 */
export interface CompiledDelayStep {
  do: 'delay';
  ms: CompiledExpression;
  then: CompiledActionStep[];
  result?: string;
}

/**
 * Compiled interval step - executes an action repeatedly (setInterval equivalent)
 */
export interface CompiledIntervalStep {
  do: 'interval';
  ms: CompiledExpression;
  action: string;
  result?: string;
}

/**
 * Compiled clearTimer step - clears a timer (clearTimeout/clearInterval equivalent)
 */
export interface CompiledClearTimerStep {
  do: 'clearTimer';
  target: CompiledExpression;
}

/**
 * Compiled focus step - manages form element focus
 */
export interface CompiledFocusStep {
  do: 'focus';
  target: CompiledExpression;
  operation: 'focus' | 'blur' | 'select';
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

/**
 * Compiled generate step for AI generation
 */
export interface CompiledGenerateStep {
  do: 'generate';
  provider: 'anthropic' | 'openai';
  prompt: CompiledExpression;
  output: 'component' | 'view';
  result: string;
  model?: string;
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

// ==================== Compiled Realtime Steps ====================

/**
 * Compiled SSE connect step
 */
export interface CompiledSSEConnectStep {
  do: 'sseConnect';
  connection: string;
  url: CompiledExpression;
  eventTypes?: string[];
  reconnect?: { enabled: boolean; strategy: string; maxRetries: number; baseDelay: number; maxDelay?: number };
  onOpen?: CompiledActionStep[];
  onMessage?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

/**
 * Compiled SSE close step
 */
export interface CompiledSSECloseStep {
  do: 'sseClose';
  connection: string;
}

/**
 * Compiled optimistic step
 */
export interface CompiledOptimisticStep {
  do: 'optimistic';
  target: string;
  path?: CompiledExpression;
  value: CompiledExpression;
  result?: string;
  timeout?: number;
}

/**
 * Compiled confirm step
 */
export interface CompiledConfirmStep {
  do: 'confirm';
  id: CompiledExpression;
}

/**
 * Compiled reject step
 */
export interface CompiledRejectStep {
  do: 'reject';
  id: CompiledExpression;
}

/**
 * Compiled bind step
 */
export interface CompiledBindStep {
  do: 'bind';
  connection: string;
  eventType?: string;
  target: string;
  path?: CompiledExpression;
  transform?: CompiledExpression;
  patch?: boolean;
}

/**
 * Compiled unbind step
 */
export interface CompiledUnbindStep {
  do: 'unbind';
  connection: string;
  target: string;
}

// ==================== Compiled Local State Types ====================

/**
 * Compiled local action
 */
export interface CompiledLocalAction {
  name: string;
  steps: CompiledActionStep[];
}

/**
 * Compiled local state node - wraps component with local state
 */
export interface CompiledLocalStateNode {
  kind: 'localState';
  state: Record<string, { type: string; initial: unknown }>;
  actions: Record<string, CompiledLocalAction>;
  child: CompiledNode;
}

/**
 * Compiled island node - represents an interactive island in the Islands Architecture
 */
export interface CompiledIslandNode {
  kind: 'island';
  id: string;
  strategy: IslandStrategy;
  strategyOptions?: IslandStrategyOptions;
  content: CompiledNode;
  state?: Record<string, { type: string; initial: unknown }>;
  actions?: Record<string, CompiledAction>;
}

/**
 * Compiled suspense node - represents an async boundary with fallback
 */
export interface CompiledSuspenseNode {
  kind: 'suspense';
  id: string;
  fallback: CompiledNode;
  content: CompiledNode;
}

/**
 * Compiled error boundary node - represents an error handling boundary
 */
export interface CompiledErrorBoundaryNode {
  kind: 'errorBoundary';
  fallback: CompiledNode;
  content: CompiledNode;
}

// ==================== Compiled View Node Types ====================

export type CompiledNode =
  | CompiledElementNode
  | CompiledTextNode
  | CompiledIfNode
  | CompiledEachNode
  | CompiledMarkdownNode
  | CompiledCodeNode
  | CompiledSlotNode
  | CompiledPortalNode
  | CompiledLocalStateNode
  | CompiledIslandNode
  | CompiledSuspenseNode
  | CompiledErrorBoundaryNode;

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

export interface CompiledPortalNode {
  kind: 'portal';
  target: 'body' | 'head' | string;
  children: CompiledNode[];
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
  | CompiledParamExpr
  | CompiledStyleExpr
  | CompiledConcatExpr
  | CompiledValidityExpr
  | CompiledCallExpr
  | CompiledLambdaExpr
  | CompiledArrayExpr;

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

export interface CompiledStyleExpr {
  expr: 'style';
  name: string;
  variants?: Record<string, CompiledExpression>;
}

export interface CompiledConcatExpr {
  expr: 'concat';
  items: CompiledExpression[];
}

export interface CompiledValidityExpr {
  expr: 'validity';
  ref: string;
  property?: string;
}

export interface CompiledCallExpr {
  expr: 'call';
  target: CompiledExpression | null;
  method: string;
  args?: CompiledExpression[];
}

export interface CompiledLambdaExpr {
  expr: 'lambda';
  param: string;
  index?: string;
  body: CompiledExpression;
}

export interface CompiledArrayExpr {
  expr: 'array';
  elements: CompiledExpression[];
}

// ==================== Compiled Event Handler ====================

/**
 * Compiled event handler options for special events like intersect
 */
export interface CompiledEventHandlerOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export interface CompiledEventHandler {
  event: string;
  action: string;
  payload?: CompiledExpression | Record<string, CompiledExpression>;
  debounce?: number;
  throttle?: number;
  options?: CompiledEventHandlerOptions;
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
        // EventHandlers are passed through as-is (they don't have path handling)
        // This happens when a component prop is an EventHandler (e.g., onClick)
        if ('event' in paramValue) {
          // Type assertion needed: EventHandlers in params are valid when used in prop position
          return paramValue as unknown as CompiledExpression;
        }

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

    case 'style': {
      const styleExpr: CompiledStyleExpr = {
        expr: 'style',
        name: expr.name,
      };
      if (expr.variants) {
        styleExpr.variants = {};
        for (const [key, value] of Object.entries(expr.variants)) {
          styleExpr.variants[key] = transformExpression(value, ctx);
        }
      }
      return styleExpr;
    }

    case 'concat':
      return {
        expr: 'concat',
        items: expr.items.map(item => transformExpression(item, ctx)),
      };

    case 'validity': {
      const validityExpr: CompiledValidityExpr = {
        expr: 'validity',
        ref: expr.ref,
      };
      if (expr.property) {
        validityExpr.property = expr.property;
      }
      return validityExpr;
    }

    case 'call': {
      const callExpr = expr as CallExpr;
      const result: CompiledCallExpr = {
        expr: 'call',
        target: callExpr.target === null ? null : transformExpression(callExpr.target, ctx),
        method: callExpr.method,
      };
      if (callExpr.args && callExpr.args.length > 0) {
        result.args = callExpr.args.map(arg => transformExpression(arg, ctx));
      }
      return result;
    }

    case 'lambda': {
      const lambdaExpr = expr as LambdaExpr;
      const result: CompiledLambdaExpr = {
        expr: 'lambda',
        param: lambdaExpr.param,
        body: transformExpression(lambdaExpr.body, ctx),
      };
      if (lambdaExpr.index) {
        result.index = lambdaExpr.index;
      }
      return result;
    }

    case 'array': {
      const arrayExpr = expr as ArrayExpr;
      return {
        expr: 'array',
        elements: arrayExpr.elements.map(elem => transformExpression(elem, ctx)),
      };
    }
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
    // Check if payload is a single Expression (has 'expr' property)
    if ('expr' in handler.payload) {
      result.payload = transformExpression(handler.payload as Expression, ctx);
    } else {
      // Object payload - transform each field
      const objectPayload: Record<string, CompiledExpression> = {};
      for (const [key, value] of Object.entries(handler.payload)) {
        objectPayload[key] = transformExpression(value as Expression, ctx);
      }
      result.payload = objectPayload;
    }
  }

  if (handler.debounce !== undefined) {
    result.debounce = handler.debounce;
  }

  if (handler.throttle !== undefined) {
    result.throttle = handler.throttle;
  }

  if (handler.options) {
    result.options = {};
    if (handler.options.threshold !== undefined) {
      result.options.threshold = handler.options.threshold;
    }
    if (handler.options.rootMargin !== undefined) {
      result.options.rootMargin = handler.options.rootMargin;
    }
    if (handler.options.once !== undefined) {
      result.options.once = handler.options.once;
    }
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

    case 'setPath': {
      const setPathStep = step as import('@constela/core').SetPathStep;
      return {
        do: 'setPath',
        target: setPathStep.target,
        path: transformExpression(setPathStep.path, emptyContext),
        value: transformExpression(setPathStep.value, emptyContext),
      } as CompiledSetPathStep;
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

    case 'send': {
      const sendStep = step as import('@constela/core').SendStep;
      return {
        do: 'send',
        connection: sendStep.connection,
        data: transformExpression(sendStep.data, emptyContext),
      } as CompiledSendStep;
    }

    case 'close': {
      const closeStep = step as import('@constela/core').CloseStep;
      return {
        do: 'close',
        connection: closeStep.connection,
      } as CompiledCloseStep;
    }

    case 'delay': {
      const delayStep = step as import('@constela/core').DelayStep;
      const compiledDelayStep: CompiledDelayStep = {
        do: 'delay',
        ms: transformExpression(delayStep.ms, emptyContext),
        then: delayStep.then.map(transformActionStep),
      };
      if (delayStep.result) {
        compiledDelayStep.result = delayStep.result;
      }
      return compiledDelayStep;
    }

    case 'interval': {
      const intervalStep = step as import('@constela/core').IntervalStep;
      const compiledIntervalStep: CompiledIntervalStep = {
        do: 'interval',
        ms: transformExpression(intervalStep.ms, emptyContext),
        action: intervalStep.action,
      };
      if (intervalStep.result) {
        compiledIntervalStep.result = intervalStep.result;
      }
      return compiledIntervalStep;
    }

    case 'clearTimer': {
      const clearTimerStep = step as import('@constela/core').ClearTimerStep;
      return {
        do: 'clearTimer',
        target: transformExpression(clearTimerStep.target, emptyContext),
      } as CompiledClearTimerStep;
    }

    case 'focus': {
      const focusStep = step as import('@constela/core').FocusStep;
      const compiledFocusStep: CompiledFocusStep = {
        do: 'focus',
        target: transformExpression(focusStep.target, emptyContext),
        operation: focusStep.operation,
      };
      if (focusStep.onSuccess) {
        compiledFocusStep.onSuccess = focusStep.onSuccess.map(transformActionStep);
      }
      if (focusStep.onError) {
        compiledFocusStep.onError = focusStep.onError.map(transformActionStep);
      }
      return compiledFocusStep;
    }

    case 'if': {
      const ifStep = step as import('@constela/core').IfStep;
      const compiledIfStep: CompiledIfStep = {
        do: 'if',
        condition: transformExpression(ifStep.condition, emptyContext),
        then: ifStep.then.map(transformActionStep),
      };
      if (ifStep.else) {
        compiledIfStep.else = ifStep.else.map(transformActionStep);
      }
      return compiledIfStep;
    }

    case 'generate': {
      const generateStep = step as import('@constela/core').GenerateStep;
      const compiledGenerateStep: CompiledGenerateStep = {
        do: 'generate',
        provider: generateStep.provider,
        prompt: transformExpression(generateStep.prompt, emptyContext),
        output: generateStep.output,
        result: generateStep.result,
      };
      if (generateStep.model) {
        compiledGenerateStep.model = generateStep.model;
      }
      if (generateStep.onSuccess) {
        compiledGenerateStep.onSuccess = generateStep.onSuccess.map(transformActionStep);
      }
      if (generateStep.onError) {
        compiledGenerateStep.onError = generateStep.onError.map(transformActionStep);
      }
      return compiledGenerateStep;
    }

    // ==================== Realtime Steps ====================

    case 'sseConnect': {
      const sseStep = step as import('@constela/core').SSEConnectStep;
      const compiled: CompiledSSEConnectStep = {
        do: 'sseConnect',
        connection: sseStep.connection,
        url: transformExpression(sseStep.url, emptyContext),
      };
      if (sseStep.eventTypes) compiled.eventTypes = sseStep.eventTypes;
      if (sseStep.reconnect) compiled.reconnect = sseStep.reconnect;
      if (sseStep.onOpen) compiled.onOpen = sseStep.onOpen.map(transformActionStep);
      if (sseStep.onMessage) compiled.onMessage = sseStep.onMessage.map(transformActionStep);
      if (sseStep.onError) compiled.onError = sseStep.onError.map(transformActionStep);
      return compiled;
    }

    case 'sseClose': {
      const sseCloseStep = step as import('@constela/core').SSECloseStep;
      return { do: 'sseClose', connection: sseCloseStep.connection } as CompiledSSECloseStep;
    }

    case 'optimistic': {
      const optStep = step as import('@constela/core').OptimisticStep;
      const compiled: CompiledOptimisticStep = {
        do: 'optimistic',
        target: optStep.target,
        value: transformExpression(optStep.value, emptyContext),
      };
      if (optStep.path) compiled.path = transformExpression(optStep.path, emptyContext);
      if (optStep.result) compiled.result = optStep.result;
      if (optStep.timeout) compiled.timeout = optStep.timeout;
      return compiled;
    }

    case 'confirm': {
      const confirmStep = step as import('@constela/core').ConfirmStep;
      return { do: 'confirm', id: transformExpression(confirmStep.id, emptyContext) } as CompiledConfirmStep;
    }

    case 'reject': {
      const rejectStep = step as import('@constela/core').RejectStep;
      return { do: 'reject', id: transformExpression(rejectStep.id, emptyContext) } as CompiledRejectStep;
    }

    case 'bind': {
      const bindStep = step as import('@constela/core').BindStep;
      const compiled: CompiledBindStep = {
        do: 'bind',
        connection: bindStep.connection,
        target: bindStep.target,
      };
      if (bindStep.eventType) compiled.eventType = bindStep.eventType;
      if (bindStep.path) compiled.path = transformExpression(bindStep.path, emptyContext);
      if (bindStep.transform) compiled.transform = transformExpression(bindStep.transform, emptyContext);
      if (bindStep.patch) compiled.patch = bindStep.patch;
      return compiled;
    }

    case 'unbind': {
      const unbindStep = step as import('@constela/core').UnbindStep;
      return { do: 'unbind', connection: unbindStep.connection, target: unbindStep.target } as CompiledUnbindStep;
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

      // Transform props to CompiledExpressions or CompiledEventHandlers
      const params: Record<string, CompiledExpression | CompiledEventHandler> = {};
      if (node.props) {
        for (const [name, propValue] of Object.entries(node.props)) {
          if (isEventHandler(propValue)) {
            params[name] = transformEventHandler(propValue, ctx);
          } else {
            params[name] = transformExpression(propValue as Expression, ctx);
          }
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
      const expandedView = transformViewNode(def.view, newCtx);

      // Wrap with localState if present
      if (def.localState && Object.keys(def.localState).length > 0) {
        return {
          kind: 'localState',
          state: transformLocalState(def.localState),
          actions: transformLocalActions(def.localActions ?? []),
          child: expandedView,
        };
      }

      return expandedView;
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

    case 'portal': {
      const portalNode = node as import('@constela/core').PortalNode;
      const compiledChildren: CompiledNode[] = [];
      for (const child of portalNode.children) {
        compiledChildren.push(transformViewNode(child, ctx));
      }
      return {
        kind: 'portal',
        target: portalNode.target,
        children: compiledChildren,
      } as CompiledPortalNode;
    }

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
        compiledIsland.state = transformState(islandNode.state);
      }

      if (islandNode.actions && islandNode.actions.length > 0) {
        compiledIsland.actions = transformActions(islandNode.actions);
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

// ==================== Local State Transformation ====================

/**
 * Transforms local state definitions
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
 * Transforms local actions
 */
function transformLocalActions(
  localActions: LocalActionDefinition[]
): Record<string, CompiledLocalAction> {
  const result: Record<string, CompiledLocalAction> = {};
  for (const action of localActions) {
    result[action.name] = {
      name: action.name,
      steps: action.steps.map(transformActionStep),
    };
  }
  return result;
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
  route: { path: string; title?: Expression; layout?: string; layoutParams?: Record<string, Expression>; meta?: Record<string, Expression>; canonical?: Expression; jsonLd?: { type: string; properties: Record<string, Expression> } },
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

  if (route.canonical) {
    compiled.canonical = transformExpression(route.canonical, ctx);
  }

  if (route.jsonLd) {
    const compiledProperties: Record<string, CompiledExpression> = {};
    for (const [key, value] of Object.entries(route.jsonLd.properties)) {
      compiledProperties[key] = transformExpression(value, ctx);
    }
    compiled.jsonLd = {
      type: route.jsonLd.type,
      properties: compiledProperties,
    };
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
