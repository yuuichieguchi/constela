/**
 * @constela/builder - Type-safe builders for constructing Constela AST programmatically
 *
 * This package provides a functional composition API for building Constela AST nodes.
 * All builders return strongly-typed AST structures from @constela/core.
 */

import type {
  // Constants
  BinaryOperator,
  UpdateOperation,
  HttpMethod,
  NavigateTarget,
  // Expressions
  Expression,
  LitExpr,
  StateExpr,
  VarExpr,
  BinExpr,
  NotExpr,
  CondExpr,
  GetExpr,
  // State Fields
  StateField,
  NumberField,
  StringField,
  ListField,
  BooleanField,
  ObjectField,
  // Action Steps
  ActionStep,
  SetStep,
  UpdateStep,
  FetchStep,
  NavigateStep,
  // Action Definition
  ActionDefinition,
  // View Nodes
  ViewNode,
  ElementNode,
  TextNode,
  IfNode,
  EachNode,
  ComponentNode,
  SlotNode,
  // Event Handler
  EventHandler,
  // Route Definition
  RouteDefinition,
  // Component Definition
  ComponentDef,
  // Program
  Program,
} from '@constela/core';

// Re-export types from core for convenience
export type {
  // Constants
  BinaryOperator,
  UpdateOperation,
  HttpMethod,
  NavigateTarget,
  // Expressions
  Expression,
  LitExpr,
  StateExpr,
  VarExpr,
  BinExpr,
  NotExpr,
  CondExpr,
  GetExpr,
  // State Fields
  StateField,
  NumberField,
  StringField,
  ListField,
  BooleanField,
  ObjectField,
  // Action Steps
  ActionStep,
  SetStep,
  UpdateStep,
  FetchStep,
  NavigateStep,
  // Action Definition
  ActionDefinition,
  // View Nodes
  ViewNode,
  ElementNode,
  TextNode,
  IfNode,
  EachNode,
  ComponentNode,
  SlotNode,
  // Event Handler
  EventHandler,
  // Program
  Program,
} from '@constela/core';

// ==================== Expression Builders ====================

/**
 * Creates a literal expression
 */
export function lit(value: string | number | boolean | null | unknown[]): LitExpr {
  return { expr: 'lit', value };
}

/**
 * Creates a state expression
 */
export function state(name: string, path?: string): StateExpr {
  const result: StateExpr = { expr: 'state', name };
  if (path !== undefined) {
    result.path = path;
  }
  return result;
}

/**
 * Creates a variable expression
 */
export function variable(name: string, path?: string): VarExpr {
  const result: VarExpr = { expr: 'var', name };
  if (path !== undefined) {
    result.path = path;
  }
  return result;
}

/**
 * Creates a binary expression
 */
export function bin(op: BinaryOperator, left: Expression, right: Expression): BinExpr {
  return { expr: 'bin', op, left, right };
}

// Binary operator shorthands - Arithmetic
export const add = (left: Expression, right: Expression): BinExpr => bin('+', left, right);
export const sub = (left: Expression, right: Expression): BinExpr => bin('-', left, right);
export const mul = (left: Expression, right: Expression): BinExpr => bin('*', left, right);
export const divide = (left: Expression, right: Expression): BinExpr => bin('/', left, right);

// Binary operator shorthands - Comparison
export const eq = (left: Expression, right: Expression): BinExpr => bin('==', left, right);
export const neq = (left: Expression, right: Expression): BinExpr => bin('!=', left, right);
export const lt = (left: Expression, right: Expression): BinExpr => bin('<', left, right);
export const lte = (left: Expression, right: Expression): BinExpr => bin('<=', left, right);
export const gt = (left: Expression, right: Expression): BinExpr => bin('>', left, right);
export const gte = (left: Expression, right: Expression): BinExpr => bin('>=', left, right);

// Binary operator shorthands - Logical
export const and = (left: Expression, right: Expression): BinExpr => bin('&&', left, right);
export const or = (left: Expression, right: Expression): BinExpr => bin('||', left, right);

/**
 * Creates a not expression
 */
export function not(operand: Expression): NotExpr {
  return { expr: 'not', operand };
}

/**
 * Creates a conditional expression
 */
export function cond(condition: Expression, thenExpr: Expression, elseExpr: Expression): CondExpr {
  return { expr: 'cond', if: condition, then: thenExpr, else: elseExpr };
}

/**
 * Creates a get expression for property access
 */
export function get(base: Expression, path: string): GetExpr {
  return { expr: 'get', base, path };
}

// ==================== State Builders ====================

/**
 * Creates a number field
 */
export function numberField(initial: number): NumberField {
  return { type: 'number', initial };
}

/**
 * Creates a string field
 */
export function stringField(initial: string): StringField {
  return { type: 'string', initial };
}

/**
 * Creates a list field
 */
export function listField<T>(initial: T[] = []): ListField {
  return { type: 'list', initial };
}

/**
 * Creates a boolean field
 */
export function booleanField(initial: boolean): BooleanField {
  return { type: 'boolean', initial };
}

/**
 * Creates an object field
 */
export function objectField<T extends Record<string, unknown>>(initial: T): ObjectField {
  return { type: 'object', initial };
}

// ==================== Action Builders ====================

/**
 * Creates an action definition
 */
export function action(name: string, steps: ActionStep[]): ActionDefinition {
  return { name, steps };
}

/**
 * Creates a set step
 */
export function set(target: string, value: Expression): SetStep {
  return { do: 'set', target, value };
}

/**
 * Creates an update step
 */
export function update(target: string, operation: UpdateOperation, value?: Expression): UpdateStep {
  const result: UpdateStep = { do: 'update', target, operation };
  if (value !== undefined) {
    result.value = value;
  }
  return result;
}

// Update operation shorthands
export const increment = (target: string, value?: Expression): UpdateStep =>
  value !== undefined
    ? { do: 'update', target, operation: 'increment', value }
    : { do: 'update', target, operation: 'increment' };

export const decrement = (target: string, value?: Expression): UpdateStep =>
  value !== undefined
    ? { do: 'update', target, operation: 'decrement', value }
    : { do: 'update', target, operation: 'decrement' };

export const push = (target: string, value: Expression): UpdateStep =>
  ({ do: 'update', target, operation: 'push', value });

export const pop = (target: string): UpdateStep =>
  ({ do: 'update', target, operation: 'pop' });

export const toggle = (target: string): UpdateStep =>
  ({ do: 'update', target, operation: 'toggle' });

/**
 * Fetch step options
 */
export interface FetchOptions {
  method?: HttpMethod;
  body?: Expression;
  result?: string;
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * Creates a fetch step
 */
export function fetch(url: Expression, options?: FetchOptions): FetchStep {
  const result: FetchStep = { do: 'fetch', url };
  if (options) {
    if (options.method !== undefined) result.method = options.method;
    if (options.body !== undefined) result.body = options.body;
    if (options.result !== undefined) result.result = options.result;
    if (options.onSuccess !== undefined) result.onSuccess = options.onSuccess;
    if (options.onError !== undefined) result.onError = options.onError;
  }
  return result;
}

/**
 * Navigate step options
 */
export interface NavigateOptions {
  target?: NavigateTarget;
  replace?: boolean;
}

/**
 * Creates a navigate step
 */
export function navigate(url: Expression, options?: NavigateOptions): NavigateStep {
  const result: NavigateStep = { do: 'navigate', url };
  if (options) {
    if (options.target !== undefined) result.target = options.target;
    if (options.replace !== undefined) result.replace = options.replace;
  }
  return result;
}

// ==================== View Builders ====================

/**
 * Creates an element node
 */
export function element(
  tag: string,
  props?: Record<string, Expression | EventHandler>,
  children?: ViewNode[]
): ElementNode {
  const result: ElementNode = { kind: 'element', tag };
  if (props !== undefined && Object.keys(props).length > 0) {
    result.props = props;
  }
  if (children !== undefined && children.length > 0) {
    result.children = children;
  }
  return result;
}

// Element shorthands
export const div = (
  props?: Record<string, Expression | EventHandler>,
  children?: ViewNode[]
): ElementNode => element('div', props, children);

export const span = (
  props?: Record<string, Expression | EventHandler>,
  children?: ViewNode[]
): ElementNode => element('span', props, children);

export const button = (
  props?: Record<string, Expression | EventHandler>,
  children?: ViewNode[]
): ElementNode => element('button', props, children);

export const input = (
  props?: Record<string, Expression | EventHandler>,
  children?: ViewNode[]
): ElementNode => element('input', props, children);

/**
 * Creates a text node
 */
export function text(value: Expression): TextNode {
  return { kind: 'text', value };
}

/**
 * Creates an if node for conditional rendering
 */
export function ifNode(condition: Expression, then: ViewNode, elseNode?: ViewNode): IfNode {
  const result: IfNode = { kind: 'if', condition, then };
  if (elseNode !== undefined) {
    result.else = elseNode;
  }
  return result;
}

/**
 * Each node options
 */
export interface EachOptions {
  index?: string;
  key?: Expression;
}

/**
 * Creates an each node for list rendering
 */
export function each(
  items: Expression,
  as: string,
  body: ViewNode,
  options?: EachOptions
): EachNode {
  const result: EachNode = { kind: 'each', items, as, body };
  if (options) {
    if (options.index !== undefined) result.index = options.index;
    if (options.key !== undefined) result.key = options.key;
  }
  return result;
}

/**
 * Creates a component node
 */
export function component(
  name: string,
  props?: Record<string, Expression>,
  children?: ViewNode[]
): ComponentNode {
  const result: ComponentNode = { kind: 'component', name };
  if (props !== undefined && Object.keys(props).length > 0) {
    result.props = props;
  }
  if (children !== undefined && children.length > 0) {
    result.children = children;
  }
  return result;
}

/**
 * Creates a slot node
 */
export function slot(name?: string): SlotNode {
  const result: SlotNode = { kind: 'slot' };
  if (name !== undefined) {
    result.name = name;
  }
  return result;
}

// ==================== Event Builders ====================

/**
 * Creates an onClick event handler
 */
export function onClick(action: string, payload?: Expression): EventHandler {
  const result: EventHandler = { event: 'click', action };
  if (payload !== undefined) {
    result.payload = payload;
  }
  return result;
}

/**
 * Creates an onInput event handler with default payload
 */
export function onInput(action: string, payload?: Expression): EventHandler {
  return {
    event: 'input',
    action,
    payload: payload ?? { expr: 'var', name: 'event', path: 'target.value' },
  };
}

/**
 * Creates an onChange event handler with default payload
 */
export function onChange(action: string, payload?: Expression): EventHandler {
  return {
    event: 'change',
    action,
    payload: payload ?? { expr: 'var', name: 'event', path: 'target.value' },
  };
}

/**
 * Creates an onSubmit event handler
 */
export function onSubmit(action: string, payload?: Expression): EventHandler {
  const result: EventHandler = { event: 'submit', action };
  if (payload !== undefined) {
    result.payload = payload;
  }
  return result;
}

// ==================== Program Builder ====================

/**
 * Program builder options
 */
export interface ProgramOptions {
  route?: RouteDefinition;
  state: Record<string, StateField>;
  actions: ActionDefinition[];
  view: ViewNode;
  components?: Record<string, ComponentDef>;
}

/**
 * Creates a program
 */
export function createProgram(options: ProgramOptions): Program {
  const result: Program = {
    version: '1.0',
    state: options.state,
    actions: options.actions,
    view: options.view,
  };
  if (options.route !== undefined) {
    result.route = options.route;
  }
  if (options.components !== undefined) {
    result.components = options.components;
  }
  return result;
}
