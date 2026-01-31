/**
 * AST Type Definitions for Constela UI Framework
 *
 * This module defines the complete Abstract Syntax Tree (AST) types
 * for representing Constela UI applications.
 */

import type { ThemeConfig } from './theme.js';

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

// ==================== Storage Operations ====================

export const STORAGE_OPERATIONS = ['get', 'set', 'remove'] as const;
export type StorageOperation = (typeof STORAGE_OPERATIONS)[number];

export const STORAGE_TYPES = ['local', 'session'] as const;
export type StorageType = (typeof STORAGE_TYPES)[number];

// ==================== Clipboard Operations ====================

export const CLIPBOARD_OPERATIONS = ['write', 'read'] as const;
export type ClipboardOperation = (typeof CLIPBOARD_OPERATIONS)[number];

// ==================== Focus Operations ====================

export const FOCUS_OPERATIONS = ['focus', 'blur', 'select'] as const;
export type FocusOperation = (typeof FOCUS_OPERATIONS)[number];

// ==================== Validity Properties ====================

export const VALIDITY_PROPERTIES = [
  'valid', 'valueMissing', 'typeMismatch', 'patternMismatch',
  'tooLong', 'tooShort', 'rangeUnderflow', 'rangeOverflow',
  'customError', 'message'
] as const;
export type ValidityProperty = (typeof VALIDITY_PROPERTIES)[number];

// ==================== Navigate Targets ====================

export const NAVIGATE_TARGETS = ['_self', '_blank'] as const;
export type NavigateTarget = (typeof NAVIGATE_TARGETS)[number];

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
  path?: string;  // e.g., "setValue" for accessing state.editor.setValue
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

/**
 * Route expression - references route parameters
 */
export interface RouteExpr {
  expr: 'route';
  name: string;
  source?: 'param' | 'query' | 'path';  // defaults to 'param'
}

/**
 * Import expression - references imported external data
 */
export interface ImportExpr {
  expr: 'import';
  name: string;        // The import name defined in imports field
  path?: string;       // Optional path for nested access (e.g., "items.0.title")
}

/**
 * Data expression - references loaded data from data sources
 */
export interface DataExpr {
  expr: 'data';
  name: string;        // The data source name defined in data field
  path?: string;       // Optional path for nested access (e.g., "settings.theme")
}

/**
 * Ref expression - references a DOM element by ref name
 */
export interface RefExpr {
  expr: 'ref';
  name: string;  // ref attribute name from view definition
}

/**
 * Index expression - dynamic property/array access
 */
export interface IndexExpr {
  expr: 'index';
  base: Expression;
  key: Expression;
}

/**
 * Style expression - references a style preset with optional variant values
 */
export interface StyleExpr {
  expr: 'style';
  name: string;
  variants?: Record<string, Expression>;
}

/**
 * Concat expression - concatenates multiple expressions into a string
 */
export interface ConcatExpr {
  expr: 'concat';
  items: Expression[];
}

/**
 * Validity expression - gets form element validation state
 */
export interface ValidityExpr {
  expr: 'validity';
  ref: string;
  property?: ValidityProperty;
}

/**
 * Call expression - calls a method on a target
 */
export interface CallExpr {
  expr: 'call';
  target: Expression;      // 対象 (配列、文字列、Math等)
  method: string;          // メソッド名
  args?: Expression[];     // 引数リスト
}

/**
 * Lambda expression - anonymous function for array methods
 */
export interface LambdaExpr {
  expr: 'lambda';
  param: string;           // パラメータ名 (e.g., "item")
  index?: string;          // インデックス名 (optional)
  body: Expression;        // 本体式
}

/**
 * Array expression - constructs an array from expressions
 */
export interface ArrayExpr {
  expr: 'array';
  elements: Expression[];
}

export type Expression = LitExpr | StateExpr | VarExpr | BinExpr | NotExpr | ParamExpr | CondExpr | GetExpr | RouteExpr | ImportExpr | DataExpr | RefExpr | IndexExpr | StyleExpr | ConcatExpr | ValidityExpr | CallExpr | LambdaExpr | ArrayExpr;

// ==================== State Fields ====================

/**
 * Cookie expression for state initial value
 */
export interface CookieInitialExpr {
  expr: 'cookie';
  key: string;
  default: string;
}

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
  initial: string | CookieInitialExpr;
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
 * SetPath step - sets a value at a specific path within a state field
 *
 * This enables fine-grained state updates like `posts[5].liked = true`
 * without re-creating the entire state.
 *
 * @property target - The state field name (e.g., "posts")
 * @property path - The path within the state field (Expression that evaluates to string or array)
 * @property value - The value to set at the path
 */
export interface SetPathStep {
  do: 'setPath';
  target: string;
  path: Expression;
  value: Expression;
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

/**
 * Storage step - localStorage/sessionStorage operations
 */
export interface StorageStep {
  do: 'storage';
  operation: StorageOperation;
  key: Expression;
  value?: Expression;      // Required for 'set'
  storage: StorageType;
  result?: string;         // Variable name for 'get' result
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * Clipboard step - clipboard API operations
 */
export interface ClipboardStep {
  do: 'clipboard';
  operation: ClipboardOperation;
  value?: Expression;      // Required for 'write'
  result?: string;         // Variable name for 'read' result
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * Navigate step - page navigation
 */
export interface NavigateStep {
  do: 'navigate';
  url: Expression;
  target?: NavigateTarget;  // Default: '_self'
  replace?: boolean;        // Use history.replaceState
}

/**
 * Import step - dynamically imports an external module
 * Module name must be a static string for bundler optimization
 */
export interface ImportStep {
  do: 'import';
  module: string;        // Static string only (e.g., "monaco-editor")
  result: string;        // Variable name for imported module
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * Call step - calls a function on an external library
 */
export interface CallStep {
  do: 'call';
  target: Expression;    // e.g., { expr: 'var', name: 'monaco', path: 'editor.create' }
  args?: Expression[];
  result?: string;       // Optional: store return value
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * Subscribe step - subscribes to an event on an object
 * Subscription is auto-collected and disposed on lifecycle.onUnmount
 */
export interface SubscribeStep {
  do: 'subscribe';
  target: Expression;    // Object to subscribe to
  event: string;         // Event method name (e.g., "onDidChangeModelContent")
  action: string;        // Action name to execute when event fires
}

/**
 * Dispose step - manually disposes a resource
 */
export interface DisposeStep {
  do: 'dispose';
  target: Expression;    // Object with dispose() method
}

/**
 * DOM step - manipulate DOM elements (add/remove classes, attributes)
 */
export interface DomStep {
  do: 'dom';
  operation: 'addClass' | 'removeClass' | 'toggleClass' | 'setAttribute' | 'removeAttribute';
  selector: Expression;  // CSS selector or 'html', 'body'
  value?: Expression;    // class name or attribute value
  attribute?: string;    // for setAttribute/removeAttribute
}

/**
 * Send step - sends data through a named WebSocket connection
 */
export interface SendStep {
  do: 'send';
  connection: string;
  data: Expression;
}

/**
 * Close step - closes a named WebSocket connection
 */
export interface CloseStep {
  do: 'close';
  connection: string;
}

/**
 * Delay step - executes steps after a delay (setTimeout equivalent)
 */
export interface DelayStep {
  do: 'delay';
  ms: Expression;           // delay time in milliseconds
  then: ActionStep[];       // steps to execute after delay
  result?: string;          // optional: store timeout ID
}

/**
 * Interval step - executes an action repeatedly (setInterval equivalent)
 */
export interface IntervalStep {
  do: 'interval';
  ms: Expression;           // interval time in milliseconds
  action: string;           // action name to execute
  result?: string;          // optional: store interval ID
}

/**
 * ClearTimer step - clears a timer (clearTimeout/clearInterval equivalent)
 */
export interface ClearTimerStep {
  do: 'clearTimer';
  target: Expression;       // timer ID to clear
}

/**
 * Focus step - manages form element focus
 */
export interface FocusStep {
  do: 'focus';
  target: Expression;  // ref name
  operation: FocusOperation;
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * If step - conditional action execution
 */
export interface IfStep {
  do: 'if';
  condition: Expression;
  then: ActionStep[];
  else?: ActionStep[];
}

/**
 * Generate step - generates DSL using AI at runtime
 */
export interface GenerateStep {
  do: 'generate';
  provider: AiProviderType;
  prompt: Expression;
  output: AiOutputType;
  result: string;
  model?: string;
  onSuccess?: ActionStep[];
  onError?: ActionStep[];
}

// ==================== Realtime Connection Steps ====================

/**
 * Reconnection configuration for SSE and WebSocket
 */
export interface ReconnectConfig {
  enabled: boolean;
  strategy: 'exponential' | 'linear' | 'none';
  maxRetries: number;
  baseDelay: number;  // ms
  maxDelay?: number;  // ms
}

/**
 * SSE connect step - establishes a Server-Sent Events connection
 */
export interface SSEConnectStep {
  do: 'sseConnect';
  connection: string;
  url: Expression;
  eventTypes?: string[];
  reconnect?: ReconnectConfig;
  onOpen?: ActionStep[];
  onMessage?: ActionStep[];
  onError?: ActionStep[];
}

/**
 * SSE close step - closes a named SSE connection
 */
export interface SSECloseStep {
  do: 'sseClose';
  connection: string;
}

// ==================== Optimistic Update Steps ====================

/**
 * Optimistic step - applies optimistic UI update
 */
export interface OptimisticStep {
  do: 'optimistic';
  target: string;
  path?: Expression;
  value: Expression;
  result?: string;  // stores update ID
  timeout?: number; // auto-rollback timeout in ms
}

/**
 * Confirm step - confirms an optimistic update
 */
export interface ConfirmStep {
  do: 'confirm';
  id: Expression;
}

/**
 * Reject step - rejects an optimistic update and rolls back
 */
export interface RejectStep {
  do: 'reject';
  id: Expression;
}

// ==================== Realtime Binding Steps ====================

/**
 * Bind step - binds connection messages to state
 */
export interface BindStep {
  do: 'bind';
  connection: string;
  eventType?: string;
  target: string;
  path?: Expression;
  transform?: Expression;
  patch?: boolean;  // JSON Patch mode
}

/**
 * Unbind step - removes a binding
 */
export interface UnbindStep {
  do: 'unbind';
  connection: string;
  target: string;
}

export type ActionStep = SetStep | UpdateStep | SetPathStep | FetchStep | StorageStep | ClipboardStep | NavigateStep | ImportStep | CallStep | SubscribeStep | DisposeStep | DomStep | SendStep | CloseStep | DelayStep | IntervalStep | ClearTimerStep | FocusStep | IfStep | GenerateStep | SSEConnectStep | SSECloseStep | OptimisticStep | ConfirmStep | RejectStep | BindStep | UnbindStep;

// LocalActionStep - only set, update, setPath allowed for local actions
export type LocalActionStep = SetStep | UpdateStep | SetPathStep;

// ==================== Event Handler ====================

/**
 * Event handler options for special events like intersect
 */
export interface EventHandlerOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Event handler - binds an event to an action
 */
export interface EventHandler {
  event: string;
  action: string;
  payload?: Expression | Record<string, Expression>;
  debounce?: number;
  throttle?: number;
  options?: EventHandlerOptions;
}

// ==================== Action Definition ====================

/**
 * Action definition - a named sequence of steps
 */
export interface ActionDefinition {
  name: string;
  steps: ActionStep[];
}

/**
 * Local action definition - a named sequence of local steps
 * Only set, update, and setPath steps are allowed
 */
export interface LocalActionDefinition {
  name: string;
  steps: LocalActionStep[];
}

// ==================== View Nodes ====================

/**
 * Element node - represents an HTML element
 */
export interface ElementNode {
  kind: 'element';
  tag: string;
  ref?: string;  // DOM element reference name
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
 * For layouts, can have an optional name for named slots
 */
export interface SlotNode {
  kind: 'slot';
  name?: string;  // Optional: for named slots like "header", "sidebar"
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

/**
 * Portal node - renders children to a different DOM location
 */
export interface PortalNode {
  kind: 'portal';
  target: 'body' | 'head' | string;
  children: ViewNode[];
}

export type ViewNode = ElementNode | TextNode | IfNode | EachNode | ComponentNode | SlotNode | MarkdownNode | CodeNode | PortalNode;

// ==================== Component Definition ====================

export interface ComponentDef {
  params?: Record<string, ParamDef>;
  localState?: Record<string, StateField>;
  localActions?: LocalActionDefinition[];
  view: ViewNode;
}

// ==================== Style Preset ====================

/**
 * Compound variant - applies additional classes when multiple variants match
 */
export interface CompoundVariant {
  [key: string]: string;
  class: string;
}

/**
 * Style preset - defines a reusable style with variants (CVA-like pattern)
 */
export interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: CompoundVariant[];
}

// ==================== Data Source Types ====================

/**
 * Data transform types for build-time content loading
 */
export const DATA_TRANSFORMS = ['mdx', 'yaml', 'csv'] as const;
export type DataTransform = (typeof DATA_TRANSFORMS)[number];

/**
 * Data source types
 */
export const DATA_SOURCE_TYPES = ['glob', 'file', 'api', 'ai'] as const;
export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

/**
 * Reference to imported components for MDX transformation
 */
export interface ComponentsRef {
  expr: 'import';
  name: string;
}

/**
 * Data source for build-time content loading
 */
export interface DataSource {
  type: DataSourceType;
  pattern?: string;    // For glob: "content/blog/*.mdx"
  path?: string;       // For file: "data/config.json"
  url?: string;        // For api: "https://api.example.com/posts"
  transform?: DataTransform;
  components?: string | ComponentsRef;  // For MDX: component mapping
}

/**
 * AI provider types for AI data source
 */
export const AI_PROVIDER_TYPES = ['anthropic', 'openai'] as const;
export type AiProviderType = (typeof AI_PROVIDER_TYPES)[number];

/**
 * AI output types for AI data source
 */
export const AI_OUTPUT_TYPES = ['component', 'view'] as const;
export type AiOutputType = (typeof AI_OUTPUT_TYPES)[number];

/**
 * AI data source for AI-generated content at build time
 */
export interface AiDataSource {
  type: 'ai';
  provider: AiProviderType;
  prompt: string;
  output: AiOutputType;
  model?: string;
}

/**
 * Static paths definition for SSG
 */
export interface StaticPathsDefinition {
  source: string;      // Reference to data source name
  params: Record<string, Expression>;
}

// ==================== JSON-LD Definition ====================

/**
 * JSON-LD structured data definition for SEO
 */
export interface JsonLdDefinition {
  /** Schema.org type (e.g., "Article", "WebPage", "Organization") */
  type: string;
  /** Properties to include in the JSON-LD object */
  properties: Record<string, Expression>;
}

// ==================== Route Definition ====================

/**
 * Route definition for a page
 */
export interface RouteDefinition {
  path: string;
  title?: Expression;
  layout?: string;
  layoutParams?: Record<string, Expression>;
  meta?: Record<string, Expression>;
  getStaticPaths?: StaticPathsDefinition;
  /** Canonical URL for SEO (supports expressions for dynamic routes) */
  canonical?: Expression;
  /** JSON-LD structured data for SEO */
  jsonLd?: JsonLdDefinition;
}

// ==================== Lifecycle Hooks ====================

/**
 * Lifecycle hooks for component/page lifecycle events
 */
export interface LifecycleHooks {
  onMount?: string;       // Action name to run when component mounts
  onUnmount?: string;     // Action name to run when component unmounts
  onRouteEnter?: string;  // Action name to run when route is entered
  onRouteLeave?: string;  // Action name to run when leaving route
}

// ==================== Program (Root) ====================

/**
 * Program - the root of a Constela AST
 */
export interface Program {
  version: '1.0';
  route?: RouteDefinition;
  imports?: Record<string, string>;  // External data references (e.g., { "navigation": "./data/nav.json" })
  data?: Record<string, DataSource>; // Build-time data sources
  styles?: Record<string, StylePreset>;  // Style presets (CVA-like pattern)
  lifecycle?: LifecycleHooks;        // Lifecycle hooks for component/page events
  theme?: ThemeConfig;               // Theme configuration
  state: Record<string, StateField>;
  actions: ActionDefinition[];
  view: ViewNode;
  components?: Record<string, ComponentDef>;
}

// Re-export for convenience
export type ConstelaAst = Program;

// ==================== Layout Program ====================

/**
 * Layout program - a special type of program that wraps page content
 * Must contain at least one SlotNode in the view tree
 */
export interface LayoutProgram {
  version: '1.0';
  type: 'layout';
  imports?: Record<string, string>;        // External data references (e.g., { "navigation": "./data/nav.json" })
  importData?: Record<string, unknown>;    // Resolved import data (populated at load time)
  state?: Record<string, StateField>;
  actions?: ActionDefinition[];
  view: ViewNode;  // Must contain at least one SlotNode
  components?: Record<string, ComponentDef>;
}

/**
 * Union type for both regular Program and LayoutProgram
 */
export type ConstelaProgram = Program | LayoutProgram;
