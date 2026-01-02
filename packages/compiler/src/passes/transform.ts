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
} from '@constela/core';
import { isEventHandler } from '@constela/core';
import type { AnalysisContext } from './analyze.js';

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
function transformExpression(expr: Expression): CompiledExpression {
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
        left: transformExpression(expr.left),
        right: transformExpression(expr.right),
      };

    case 'not':
      return {
        expr: 'not',
        operand: transformExpression(expr.operand),
      };
  }
}

// ==================== Event Handler Transformation ====================

/**
 * Transforms an AST EventHandler into a CompiledEventHandler
 */
function transformEventHandler(handler: EventHandler): CompiledEventHandler {
  const result: CompiledEventHandler = {
    event: handler.event,
    action: handler.action,
  };

  if (handler.payload) {
    result.payload = transformExpression(handler.payload);
  }

  return result;
}

// ==================== Action Step Transformation ====================

/**
 * Transforms an AST ActionStep into a CompiledActionStep
 */
function transformActionStep(step: ActionStep): CompiledActionStep {
  switch (step.do) {
    case 'set':
      return {
        do: 'set',
        target: step.target,
        value: transformExpression(step.value),
      };

    case 'update': {
      const updateStep: CompiledUpdateStep = {
        do: 'update',
        target: step.target,
        operation: step.operation,
      };
      if (step.value) {
        updateStep.value = transformExpression(step.value);
      }
      return updateStep;
    }

    case 'fetch': {
      const fetchStep: CompiledFetchStep = {
        do: 'fetch',
        url: transformExpression(step.url),
      };
      if (step.method) {
        fetchStep.method = step.method;
      }
      if (step.body) {
        fetchStep.body = transformExpression(step.body);
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
 * Transforms an AST ViewNode into a CompiledNode
 */
function transformViewNode(node: ViewNode): CompiledNode {
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
            compiledElement.props[propName] = transformEventHandler(propValue);
          } else {
            compiledElement.props[propName] = transformExpression(propValue as Expression);
          }
        }
      }

      if (node.children && node.children.length > 0) {
        compiledElement.children = node.children.map(transformViewNode);
      }

      return compiledElement;
    }

    case 'text':
      return {
        kind: 'text',
        value: transformExpression(node.value),
      };

    case 'if': {
      const compiledIf: CompiledIfNode = {
        kind: 'if',
        condition: transformExpression(node.condition),
        then: transformViewNode(node.then),
      };

      if (node.else) {
        compiledIf.else = transformViewNode(node.else);
      }

      return compiledIf;
    }

    case 'each': {
      const compiledEach: CompiledEachNode = {
        kind: 'each',
        items: transformExpression(node.items),
        as: node.as,
        body: transformViewNode(node.body),
      };

      if (node.index) {
        compiledEach.index = node.index;
      }

      if (node.key) {
        compiledEach.key = transformExpression(node.key);
      }

      return compiledEach;
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
  return {
    version: '1.0',
    state: transformState(ast.state),
    actions: transformActions(ast.actions),
    view: transformViewNode(ast.view),
  };
}
