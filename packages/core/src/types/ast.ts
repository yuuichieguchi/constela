/**
 * AST Type Definitions for Constela UI Framework
 *
 * This module defines the complete Abstract Syntax Tree (AST) types
 * for representing Constela UI applications.
 */

// ==================== Binary Operators ====================

export const BINARY_OPERATORS = [
  '+',
  '-',
  '*',
  '/',
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  '&&',
  '||',
] as const;

export type BinaryOperator = (typeof BINARY_OPERATORS)[number];

// ==================== Update Operations ====================

export const UPDATE_OPERATIONS = [
  'increment',
  'decrement',
  'push',
  'pop',
  'remove',
] as const;

export type UpdateOperation = (typeof UPDATE_OPERATIONS)[number];

// ==================== HTTP Methods ====================

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

// ==================== Expressions ====================

/**
 * Literal expression - represents a constant value
 */
export interface LitExpr {
  expr: 'lit';
  value: string | number | boolean | null | unknown[];
}

/**
 * State expression - references a state field
 */
export interface StateExpr {
  expr: 'state';
  name: string;
}

/**
 * Variable expression - references a loop variable or event data
 */
export interface VarExpr {
  expr: 'var';
  name: string;
  path?: string;  // e.g., "name" or "address.city"
}

/**
 * Binary expression - arithmetic, comparison, or logical operation
 */
export interface BinExpr {
  expr: 'bin';
  op: BinaryOperator;
  left: Expression;
  right: Expression;
}

/**
 * Not expression - logical negation
 */
export interface NotExpr {
  expr: 'not';
  operand: Expression;
}

export type Expression = LitExpr | StateExpr | VarExpr | BinExpr | NotExpr;

// ==================== State Fields ====================

/**
 * Number state field
 */
export interface NumberField {
  type: 'number';
  initial: number;
}

/**
 * String state field
 */
export interface StringField {
  type: 'string';
  initial: string;
}

/**
 * List state field
 */
export interface ListField {
  type: 'list';
  initial: unknown[];
}

export type StateField = NumberField | StringField | ListField;

// ==================== Action Steps ====================

/**
 * Set step - sets a state field to a new value
 */
export interface SetStep {
  do: 'set';
  target: string;
  value: Expression;
}

/**
 * Update step - performs an operation on a state field
 */
export interface UpdateStep {
  do: 'update';
  target: string;
  operation: UpdateOperation;
  value?: Expression;
}

/**
 * Fetch step - makes an HTTP request
 */
export interface FetchStep {
  do: 'fetch';
  url: Expression;
  method?: HttpMethod;
  body?: Expression;
  result?: string;
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

export type ActionStep = SetStep | UpdateStep | FetchStep;

// ==================== Event Handler ====================

/**
 * Event handler - binds an event to an action
 */
export interface EventHandler {
  event: string;
  action: string;
  payload?: Expression;
}

// ==================== Action Definition ====================

/**
 * Action definition - a named sequence of steps
 */
export interface ActionDefinition {
  name: string;
  steps: ActionStep[];
}

// ==================== View Nodes ====================

/**
 * Element node - represents an HTML element
 */
export interface ElementNode {
  kind: 'element';
  tag: string;
  props?: Record<string, Expression | EventHandler>;
  children?: ViewNode[];
}

/**
 * Text node - represents text content
 */
export interface TextNode {
  kind: 'text';
  value: Expression;
}

/**
 * If node - conditional rendering
 */
export interface IfNode {
  kind: 'if';
  condition: Expression;
  then: ViewNode;
  else?: ViewNode;
}

/**
 * Each node - list rendering
 */
export interface EachNode {
  kind: 'each';
  items: Expression;
  as: string;
  index?: string;
  key?: Expression;
  body: ViewNode;
}

export type ViewNode = ElementNode | TextNode | IfNode | EachNode;

// ==================== Program (Root) ====================

/**
 * Program - the root of a Constela AST
 */
export interface Program {
  version: '1.0';
  state: Record<string, StateField>;
  actions: ActionDefinition[];
  view: ViewNode;
}

// Re-export for convenience
export type ConstelaAst = Program;
