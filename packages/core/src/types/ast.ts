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
  'toggle',
  'merge',
  'replaceAt',
  'insertAt',
  'splice',
] as const;

export type UpdateOperation = (typeof UPDATE_OPERATIONS)[number];

// ==================== HTTP Methods ====================

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

// ==================== Param Types ====================

export const PARAM_TYPES = ['string', 'number', 'boolean', 'json'] as const;
export type ParamType = (typeof PARAM_TYPES)[number];

// ==================== Param Definition ====================

export interface ParamDef {
  type: ParamType;
  required?: boolean;  // defaults to true when checking
}

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

/**
 * Param expression - references a component parameter
 */
export interface ParamExpr {
  expr: 'param';
  name: string;
  path?: string;  // for json params: "user.name"
}

/**
 * Cond expression - conditional if/then/else
 */
export interface CondExpr {
  expr: 'cond';
  if: Expression;
  then: Expression;
  else: Expression;
}

/**
 * Get expression - property access
 */
export interface GetExpr {
  expr: 'get';
  base: Expression;
  path: string;
}

export type Expression = LitExpr | StateExpr | VarExpr | BinExpr | NotExpr | ParamExpr | CondExpr | GetExpr;

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

/**
 * Boolean state field
 */
export interface BooleanField {
  type: 'boolean';
  initial: boolean;
}

/**
 * Object state field
 */
export interface ObjectField {
  type: 'object';
  initial: Record<string, unknown>;
}

export type StateField = NumberField | StringField | ListField | BooleanField | ObjectField;

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
 *
 * Operations and their required fields:
 * - increment/decrement: Numeric operations. Optional `value` for amount (default: 1)
 * - push: Add item to array. Requires `value`
 * - pop: Remove last item from array. No additional fields
 * - remove: Remove item from array by value or index. Requires `value`
 * - toggle: Flip boolean value. No additional fields
 * - merge: Shallow merge object. Requires `value` (object)
 * - replaceAt: Replace array item at index. Requires `index` and `value`
 * - insertAt: Insert item at array index. Requires `index` and `value`
 * - splice: Delete and/or insert items. Requires `index` and `deleteCount`, optional `value` (array)
 *
 * @property target - The state field name to update
 * @property operation - The update operation to perform
 * @property value - Value for push/merge/replaceAt/insertAt/splice operations
 * @property index - Array index for replaceAt/insertAt/splice operations
 * @property deleteCount - Number of items to delete for splice operation
 */
export interface UpdateStep {
  do: 'update';
  target: string;
  operation: UpdateOperation;
  value?: Expression;
  index?: Expression;
  deleteCount?: Expression;
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

/**
 * Component node - invokes a defined component
 */
export interface ComponentNode {
  kind: 'component';
  name: string;
  props?: Record<string, Expression>;
  children?: ViewNode[];  // slot content
}

/**
 * Slot node - placeholder for children in component definition
 */
export interface SlotNode {
  kind: 'slot';
}

/**
 * Markdown node - renders markdown content
 */
export interface MarkdownNode {
  kind: 'markdown';
  content: Expression;
}

/**
 * Code node - renders syntax-highlighted code
 */
export interface CodeNode {
  kind: 'code';
  language: Expression;
  content: Expression;
}

export type ViewNode = ElementNode | TextNode | IfNode | EachNode | ComponentNode | SlotNode | MarkdownNode | CodeNode;

// ==================== Component Definition ====================

export interface ComponentDef {
  params?: Record<string, ParamDef>;
  view: ViewNode;
}

// ==================== Program (Root) ====================

/**
 * Program - the root of a Constela AST
 */
export interface Program {
  version: '1.0';
  state: Record<string, StateField>;
  actions: ActionDefinition[];
  view: ViewNode;
  components?: Record<string, ComponentDef>;
}

// Re-export for convenience
export type ConstelaAst = Program;
