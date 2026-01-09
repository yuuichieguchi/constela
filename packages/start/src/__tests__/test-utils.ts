/**
 * Test utilities for MDX and component testing.
 *
 * Provides:
 * - Common type definitions
 * - Re-exports of MDX functions for testing
 * - Helper functions for creating test fixtures
 */

import type {
  CompiledNode,
  CompiledExpression,
  CompiledElementNode,
  CompiledTextNode,
  CompiledEachNode,
  CompiledIfNode,
} from '@constela/compiler';

// Re-export MDX functions for testing
export {
  substituteExpression,
  substituteInNode,
  mdxToConstela,
  mdxContentToNode,
} from '../build/mdx.js';

export type { ComponentDef, MDXToConstelaOptions } from '../build/mdx.js';

// Re-export types for convenience
export type {
  CompiledNode,
  CompiledExpression,
  CompiledElementNode,
  CompiledTextNode,
  CompiledEachNode,
  CompiledIfNode,
};

// ==================== Type Definitions ====================

/**
 * SlotNode for component children placeholder
 */
export interface SlotNode {
  kind: 'slot';
  name?: string;
}

/**
 * Extended CompiledNode that includes slot
 */
export type ExtendedCompiledNode = CompiledNode | SlotNode;

// ==================== Helper Functions ====================

/**
 * Creates a literal expression
 */
export function lit(value: string | number | boolean | null | unknown[]): CompiledExpression {
  return { expr: 'lit', value };
}

/**
 * Creates a param expression (for testing component views)
 */
export function param(name: string, path?: string): CompiledExpression {
  const expr: { expr: 'param'; name: string; path?: string } = { expr: 'param', name };
  if (path) {
    expr.path = path;
  }
  return expr as unknown as CompiledExpression;
}

/**
 * Creates a text node
 */
export function textNode(value: CompiledExpression | string): CompiledTextNode {
  return {
    kind: 'text',
    value: typeof value === 'string' ? lit(value) : value,
  };
}

/**
 * Creates an element node
 */
export function elementNode(
  tag: string,
  props?: Record<string, CompiledExpression>,
  children?: CompiledNode[]
): CompiledElementNode {
  const node: CompiledElementNode = { kind: 'element', tag };
  if (props && Object.keys(props).length > 0) {
    node.props = props;
  }
  if (children && children.length > 0) {
    node.children = children;
  }
  return node;
}

/**
 * Creates an each node
 */
export function eachNode(
  items: CompiledExpression,
  as: string,
  body: CompiledNode,
  options?: { index?: string; key?: CompiledExpression }
): CompiledEachNode {
  const node: CompiledEachNode = {
    kind: 'each',
    items,
    as,
    body,
  };
  if (options?.index) {
    node.index = options.index;
  }
  if (options?.key) {
    node.key = options.key;
  }
  return node;
}

/**
 * Creates an if node
 */
export function ifNode(
  condition: CompiledExpression,
  then: CompiledNode,
  elseNode?: CompiledNode
): CompiledIfNode {
  const node: CompiledIfNode = {
    kind: 'if',
    condition,
    then,
  };
  if (elseNode) {
    node.else = elseNode;
  }
  return node;
}

/**
 * Creates a slot node
 */
export function slotNode(name?: string): SlotNode {
  const node: SlotNode = { kind: 'slot' };
  if (name) {
    node.name = name;
  }
  return node;
}

/**
 * Creates a binary expression
 */
export function binExpr(
  op: string,
  left: CompiledExpression,
  right: CompiledExpression
): CompiledExpression {
  return {
    expr: 'bin',
    op,
    left,
    right,
  } as unknown as CompiledExpression;
}

/**
 * Creates a conditional expression
 */
export function condExpr(
  ifExpr: CompiledExpression,
  thenExpr: CompiledExpression,
  elseExpr: CompiledExpression
): CompiledExpression {
  return {
    expr: 'cond',
    if: ifExpr,
    then: thenExpr,
    else: elseExpr,
  } as unknown as CompiledExpression;
}

/**
 * Creates a not expression
 */
export function notExpr(operand: CompiledExpression): CompiledExpression {
  return {
    expr: 'not',
    operand,
  } as unknown as CompiledExpression;
}

/**
 * Creates a var expression
 */
export function varExpr(name: string, path?: string): CompiledExpression {
  const expr: { expr: 'var'; name: string; path?: string } = { expr: 'var', name };
  if (path) {
    expr.path = path;
  }
  return expr as unknown as CompiledExpression;
}
