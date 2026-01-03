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

export interface CompiledProgram {
  version: '1.0';
  state: Record<string, { type: string; initial: unknown }>;
  actions: Record<string, CompiledAction>;
  view: CompiledNode;
}

export interface CompiledAction {
  name: string;
  steps: CompiledActionStep[];
}

export type CompiledActionStep = CompiledSetStep | CompiledUpdateStep | CompiledFetchStep;

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

// ==================== Compiled View Node Types ====================

export type CompiledNode =
  | CompiledElementNode
  | CompiledTextNode
  | CompiledIfNode
  | CompiledEachNode;

export interface CompiledElementNode {
  kind: 'element';
  tag: string;
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

// ==================== Compiled Expression Types ====================

export type CompiledExpression =
  | CompiledLitExpr
  | CompiledStateExpr
  | CompiledVarExpr
  | CompiledBinExpr
  | CompiledNotExpr;

export interface CompiledLitExpr {
  expr: 'lit';
  value: string | number | boolean | null | unknown[];
}

export interface CompiledStateExpr {
  expr: 'state';
  name: string;
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

    case 'state':
      return {
        expr: 'state',
        name: expr.name,
      };

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

// ==================== Main Transform Function ====================

/**
 * Transforms the validated and analyzed AST into a CompiledProgram
 *
 * @param ast - Validated AST from validate pass
 * @param _context - Analysis context from analyze pass (unused in current implementation)
 * @returns CompiledProgram
 */
export function transformPass(ast: Program, _context: AnalysisContext): CompiledProgram {
  const ctx: TransformContext = {
    components: ast.components || {},
  };

  return {
    version: '1.0',
    state: transformState(ast.state),
    actions: transformActions(ast.actions),
    view: transformViewNode(ast.view, ctx),
  };
}
