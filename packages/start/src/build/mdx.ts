/**
 * MDX to Constela AST Pipeline
 *
 * Transforms MDX content into CompiledProgram for Constela runtime.
 * Uses unified/remark for parsing and gray-matter for frontmatter.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import matter from 'gray-matter';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledElementNode,
  CompiledTextNode,
  CompiledCodeNode,
  CompiledExpression,
  CompiledEachNode,
  CompiledIfNode,
  CompiledBinExpr,
  CompiledNotExpr,
  CompiledCondExpr,
  CompiledGetExpr,
} from '@constela/compiler';

// Internal expression type for param (used during component substitution, not in final output)
interface CompiledParamExpr {
  expr: 'param';
  name: string;
  path?: string;
}
import type { Root, Content, PhrasingContent } from 'mdast';

// ==================== Type Definitions ====================

/**
 * Component definition for custom MDX components
 */
export interface ComponentDef {
  params?: Record<string, { type: string; required?: boolean }>;
  view: CompiledNode;
}

/**
 * Options for MDX to Constela transformation
 */
export interface MDXToConstelaOptions {
  components?: Record<string, ComponentDef>;
}

// MDX JSX types (not fully typed in mdast)
interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | MdxJsxAttributeValueExpression | null;
}

interface MdxJsxAttributeValueExpression {
  type: 'mdxJsxAttributeValueExpression';
  value: string;
}

interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string | null;
  attributes: MdxJsxAttribute[];
  children: Content[];
}

interface MdxJsxTextElement {
  type: 'mdxJsxTextElement';
  name: string | null;
  attributes: MdxJsxAttribute[];
  children: PhrasingContent[];
}

interface MdxFlowExpression {
  type: 'mdxFlowExpression';
  value: string;
}

interface MdxTextExpression {
  type: 'mdxTextExpression';
  value: string;
}

// ==================== Helper Functions ====================

/**
 * Creates a literal expression
 */
function lit(value: string | number | boolean | null | unknown[]): CompiledExpression {
  return { expr: 'lit', value };
}

/**
 * Creates a text node
 */
function textNode(value: string): CompiledTextNode {
  return { kind: 'text', value: lit(value) };
}

/**
 * Creates an element node
 */
function elementNode(
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
 * Creates a code node
 */
function codeNode(language: string, content: string): CompiledCodeNode {
  return {
    kind: 'code',
    language: lit(language),
    content: lit(content),
  };
}

/**
 * Wraps multiple nodes in a div if needed
 */
function wrapNodes(nodes: CompiledNode[]): CompiledNode {
  if (nodes.length === 0) {
    return elementNode('div');
  }
  if (nodes.length === 1 && nodes[0]) {
    return nodes[0];
  }
  return elementNode('div', undefined, nodes);
}

/**
 * Check if a tag name is a custom component (PascalCase)
 */
function isCustomComponent(name: string | null): boolean {
  if (!name) return false;
  return /^[A-Z]/.test(name);
}

/**
 * Patterns that are disallowed in JavaScript literal evaluation for security.
 * These patterns could potentially execute arbitrary code.
 */
const DISALLOWED_PATTERNS = [
  /\bfunction\b/i,
  /\b(eval|Function|setTimeout|setInterval)\b/,
  /\bimport\b/,
  /\brequire\b/,
  /\bfetch\b/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\bglobal\b/,
  /\bprocess\b/,
  /\b__proto__\b/,
  /\bconstructor\b/,
  /\bprototype\b/,
];

/**
 * Check if a string contains only safe literal syntax (no code execution)
 */
function isSafeLiteral(value: string): boolean {
  return !DISALLOWED_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Safely evaluate JavaScript literal expressions (arrays/objects)
 * Only allows simple literal values, no function calls or side effects
 *
 * @param value - The string to evaluate as a JavaScript literal
 * @returns The parsed value, or null if parsing fails or value is unsafe
 */
function safeEvalLiteral(value: string): unknown {
  // First try JSON parsing (fastest and safest)
  try {
    return JSON.parse(value);
  } catch {
    // Not valid JSON, continue
  }

  // Security check: reject potentially dangerous patterns
  if (!isSafeLiteral(value)) {
    return null;
  }

  // For JavaScript object literal syntax (unquoted keys), use Function constructor
  // This is safer than eval() as it doesn't have access to local scope
  try {
    // Wrap in parentheses to handle object literals correctly
    const fn = new Function(`return (${value});`);
    return fn();
  } catch {
    return null;
  }
}

/**
 * Parse JSX attribute value
 */
function parseAttributeValue(
  attr: MdxJsxAttribute
): CompiledExpression {
  if (attr.value === null) {
    // Boolean attribute like <Button disabled />
    return lit(true);
  }
  if (typeof attr.value === 'string') {
    return lit(attr.value);
  }
  // Expression value like {42} or {true}
  if (attr.value.type === 'mdxJsxAttributeValueExpression') {
    const exprValue = attr.value.value.trim();
    // Try to parse as literal
    if (exprValue === 'true') return lit(true);
    if (exprValue === 'false') return lit(false);
    if (exprValue === 'null') return lit(null);
    const num = Number(exprValue);
    if (!Number.isNaN(num)) return lit(num);
    // Try to parse as JavaScript literal (arrays/objects)
    if (exprValue.startsWith('[') || exprValue.startsWith('{')) {
      const parsed = safeEvalLiteral(exprValue);
      if (parsed !== null && parsed !== undefined) {
        return lit(parsed as string | number | boolean | null | unknown[]);
      }
    }
    // For now, treat as string
    return lit(exprValue);
  }
  return lit(null);
}

// ==================== Transform Context ====================

interface TransformContext {
  components: Record<string, ComponentDef>;
}

// ==================== MDAST to Constela Transformation ====================

/**
 * Transform MDAST node to CompiledNode
 */
function transformNode(
  node: Content | MdxJsxFlowElement | MdxJsxTextElement | MdxFlowExpression | MdxTextExpression,
  ctx: TransformContext
): CompiledNode | CompiledNode[] | null {
  switch (node.type) {
    case 'heading':
      return elementNode(
        `h${node.depth}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
        undefined,
        transformChildren(node.children, ctx)
      );

    case 'paragraph':
      return elementNode('p', undefined, transformChildren(node.children, ctx));

    case 'text':
      return textNode(node.value);

    case 'emphasis':
      return elementNode('em', undefined, transformChildren(node.children, ctx));

    case 'strong':
      return elementNode('strong', undefined, transformChildren(node.children, ctx));

    case 'link': {
      const props: Record<string, CompiledExpression> = {
        href: lit(node.url),
      };
      if (node['title']) {
        props['title'] = lit(node['title']);
      }
      return elementNode('a', props, transformChildren(node.children, ctx));
    }

    case 'inlineCode':
      return elementNode('code', undefined, [textNode(node.value)]);

    case 'code': {
      const lang = node.lang || 'text';
      return codeNode(lang, node.value);
    }

    case 'blockquote':
      return elementNode('blockquote', undefined, transformChildren(node.children, ctx));

    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const props: Record<string, CompiledExpression> | undefined =
        node.ordered && node.start != null && node.start !== 1
          ? { start: lit(node.start) }
          : undefined;
      return elementNode(tag, props, transformChildren(node.children, ctx));
    }

    case 'listItem': {
      // List item children are usually paragraphs, but we want direct content
      const children: CompiledNode[] = [];
      for (const child of node.children) {
        if (child.type === 'paragraph') {
          // Unwrap paragraph content for list items with simple text
          children.push(...transformChildren(child.children, ctx));
        } else {
          const transformed = transformNode(child, ctx);
          if (transformed) {
            if (Array.isArray(transformed)) {
              children.push(...transformed);
            } else {
              children.push(transformed);
            }
          }
        }
      }
      return elementNode('li', undefined, children);
    }

    case 'thematicBreak':
      return elementNode('hr');

    case 'break':
      return elementNode('br');

    case 'image': {
      const props: Record<string, CompiledExpression> = {
        src: lit(node.url),
      };
      if (node['alt']) {
        props['alt'] = lit(node['alt']);
      }
      if (node['title']) {
        props['title'] = lit(node['title']);
      }
      return elementNode('img', props);
    }

    case 'html':
      // Raw HTML - for safety, treat as text
      return textNode(node.value);

    // MDX JSX elements
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return transformJsxElement(node as MdxJsxFlowElement | MdxJsxTextElement, ctx);

    // MDX expressions
    case 'mdxFlowExpression':
    case 'mdxTextExpression': {
      const exprNode = node as MdxFlowExpression | MdxTextExpression;
      // Simple expression like {42}
      const value = exprNode.value.trim();
      if (value === '') return null;
      // Try to parse as literal
      if (value === 'true') return textNode('true');
      if (value === 'false') return textNode('false');
      if (value === 'null') return textNode('null');
      const num = Number(value);
      if (!Number.isNaN(num)) return textNode(String(num));
      return textNode(value);
    }

    // GFM extensions
    case 'table': {
      const rows = node.children as Array<{ type: 'tableRow'; children: Array<{ type: 'tableCell'; children: PhrasingContent[] }> }>;
      if (!rows || rows.length === 0) {
        return elementNode('table', undefined, []);
      }

      // First row is header
      const headerRow = rows[0]!;
      const headerCells = headerRow.children.map(cell =>
        elementNode('th', undefined, transformChildren(cell.children, ctx))
      );
      const thead = elementNode('thead', undefined, [
        elementNode('tr', undefined, headerCells)
      ]);

      // Remaining rows are body
      const bodyRows = rows.slice(1).map(row => {
        const cells = row.children.map(cell =>
          elementNode('td', undefined, transformChildren(cell.children, ctx))
        );
        return elementNode('tr', undefined, cells);
      });
      const tbody = bodyRows.length > 0
        ? elementNode('tbody', undefined, bodyRows)
        : null;

      const tableChildren: CompiledNode[] = [thead];
      if (tbody) {
        tableChildren.push(tbody);
      }
      return elementNode('table', undefined, tableChildren);
    }

    // tableRow and tableCell are handled within the 'table' case above

    case 'delete':
      return elementNode('del', undefined, transformChildren(node.children, ctx));

    default:
      // Unknown node type - skip
      return null;
  }
}

/**
 * Transform JSX element (custom component or HTML element)
 */
function transformJsxElement(
  node: MdxJsxFlowElement | MdxJsxTextElement,
  ctx: TransformContext
): CompiledNode {
  const name = node.name;

  if (!name) {
    // Fragment - return children wrapped
    const children = transformChildren(node.children, ctx);
    return wrapNodes(children);
  }

  // Check if it's a custom component
  if (isCustomComponent(name)) {
    const def = ctx.components[name];
    if (!def) {
      throw new Error(`Undefined component: ${name}`);
    }

    // For custom components, we substitute the component's view
    // with props and children applied

    // Extract props from attributes
    const props: Record<string, CompiledExpression> = {};
    for (const attr of node.attributes) {
      if (attr.type === 'mdxJsxAttribute') {
        props[attr.name] = parseAttributeValue(attr);
      }
    }

    // Transform children
    const children = transformChildren(node.children, ctx);

    // Apply component view transformation
    return applyComponentView(def.view, props, children);
  }

  // Regular HTML element
  const props: Record<string, CompiledExpression> = {};
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxAttribute') {
      props[attr.name] = parseAttributeValue(attr);
    }
  }

  const children = transformChildren(node.children, ctx);
  return elementNode(name, props, children);
}

/**
 * Substitutes param expressions with actual prop values in a compiled expression.
 * Recursively handles binary, conditional, not, and get expressions.
 *
 * @param expr - The compiled expression to substitute
 * @param props - Map of param names to their actual values
 * @returns The expression with all param references substituted
 *
 * @example
 * const expr = { expr: 'param', name: 'type' };
 * const props = { type: { expr: 'lit', value: 'warning' } };
 * substituteExpression(expr, props); // { expr: 'lit', value: 'warning' }
 *
 * @example
 * // Binary expression with param
 * const expr = { expr: 'bin', op: '+', left: { expr: 'lit', value: 'callout-' }, right: { expr: 'param', name: 'type' } };
 * const props = { type: { expr: 'lit', value: 'warning' } };
 * substituteExpression(expr, props); // { expr: 'bin', op: '+', left: { expr: 'lit', value: 'callout-' }, right: { expr: 'lit', value: 'warning' } }
 */
export function substituteExpression(
  expr: CompiledExpression,
  props: Record<string, CompiledExpression>
): CompiledExpression {
  // Handle param expressions (cast to unknown first as 'param' is not in CompiledExpression type)
  const exprAny = expr as unknown as { expr: string };
  if (exprAny.expr === 'param') {
    const paramExpr = expr as unknown as CompiledParamExpr;
    const propValue = props[paramExpr.name];

    if (!propValue) {
      // Return null literal when param is not found
      return { expr: 'lit', value: null };
    }

    // If param has a path, combine with the prop value
    if (paramExpr.path && propValue.expr === 'var') {
      const varExpr = propValue as { expr: 'var'; name: string; path?: string };
      return {
        expr: 'var',
        name: varExpr.name,
        path: paramExpr.path,
      };
    }

    return propValue;
  }

  // Handle binary expressions
  if (expr.expr === 'bin') {
    const binExpr = expr as CompiledBinExpr;
    return {
      expr: 'bin',
      op: binExpr.op,
      left: substituteExpression(binExpr.left, props),
      right: substituteExpression(binExpr.right, props),
    };
  }

  // Handle not expressions
  if (expr.expr === 'not') {
    const notExpr = expr as CompiledNotExpr;
    return {
      expr: 'not',
      operand: substituteExpression(notExpr.operand, props),
    };
  }

  // Handle conditional expressions
  if (expr.expr === 'cond') {
    const condExpr = expr as CompiledCondExpr;
    return {
      expr: 'cond',
      if: substituteExpression(condExpr.if, props),
      then: substituteExpression(condExpr.then, props),
      else: substituteExpression(condExpr.else, props),
    };
  }

  // Handle get expressions
  if (expr.expr === 'get') {
    const getExpr = expr as CompiledGetExpr;
    return {
      expr: 'get',
      base: substituteExpression(getExpr.base, props),
      path: getExpr.path,
    } as CompiledGetExpr as unknown as CompiledExpression;
  }

  // For other expression types (lit, state, var, route, import, ref), return as-is
  return expr;
}

/**
 * Apply component view with props and children
 */
function applyComponentView(
  view: CompiledNode,
  props: Record<string, CompiledExpression>,
  children: CompiledNode[]
): CompiledNode {
  // Deep clone and substitute
  return substituteInNode(view, props, children);
}

/**
 * Substitutes props and slot in a compiled node.
 * Recursively processes element, text, each, and if nodes.
 *
 * @param node - The compiled node to process
 * @param props - Map of param names to their actual expression values
 * @param children - Child nodes to insert at slot positions
 * @returns The node with all param references substituted and slots replaced
 *
 * @example
 * // Element with param in props
 * const node = {
 *   kind: 'element',
 *   tag: 'div',
 *   props: { class: { expr: 'param', name: 'type' } }
 * };
 * const props = { type: { expr: 'lit', value: 'warning' } };
 * substituteInNode(node, props, []);
 * // { kind: 'element', tag: 'div', props: { class: { expr: 'lit', value: 'warning' } } }
 *
 * @example
 * // Each node with items param
 * const node = {
 *   kind: 'each',
 *   items: { expr: 'param', name: 'items' },
 *   as: 'item',
 *   body: { kind: 'element', tag: 'li' }
 * };
 * const props = { items: { expr: 'lit', value: ['a', 'b'] } };
 * substituteInNode(node, props, []);
 * // { kind: 'each', items: { expr: 'lit', value: ['a', 'b'] }, as: 'item', body: ... }
 */
export function substituteInNode(
  node: CompiledNode,
  props: Record<string, CompiledExpression>,
  children: CompiledNode[]
): CompiledNode {
  switch (node.kind) {
    case 'each': {
      const eachNode = node as CompiledEachNode;
      const result: CompiledEachNode = {
        kind: 'each',
        items: substituteExpression(eachNode.items, props),
        as: eachNode.as,
        body: substituteInNode(eachNode.body, props, children),
      };
      if (eachNode.index) {
        result.index = eachNode.index;
      }
      if (eachNode.key) {
        result.key = substituteExpression(eachNode.key, props);
      }
      return result;
    }

    case 'text': {
      const textNode = node as CompiledTextNode;
      return {
        kind: 'text',
        value: substituteExpression(textNode.value, props),
      };
    }

    case 'if': {
      const ifNode = node as CompiledIfNode;
      const result: CompiledIfNode = {
        kind: 'if',
        condition: substituteExpression(ifNode.condition, props),
        then: substituteInNode(ifNode.then, props, children),
      };
      if (ifNode.else) {
        result.else = substituteInNode(ifNode.else, props, children);
      }
      return result;
    }

    case 'element': {
      const elem = node as CompiledElementNode;

      // Substitute expressions in existing props
      const newProps: Record<string, CompiledExpression> = {};
      if (elem.props) {
        for (const [key, value] of Object.entries(elem.props)) {
          newProps[key] = substituteExpression(value as CompiledExpression, props);
        }
      }

      // Process children, replacing slots
      let newChildren: CompiledNode[] | undefined;
      if (elem.children) {
        newChildren = [];
        for (const child of elem.children) {
          if ((child as { kind: string }).kind === 'slot') {
            // Replace slot with provided children
            newChildren.push(...children);
          } else {
            newChildren.push(substituteInNode(child, props, children));
          }
        }
      }

      return elementNode(
        elem.tag,
        Object.keys(newProps).length > 0 ? newProps : undefined,
        newChildren && newChildren.length > 0 ? newChildren : undefined
      );
    }

    case 'markdown':
    case 'code':
      // These node types don't contain param expressions, return as-is
      return node;

    default:
      // Unknown node type - return as-is for forward compatibility
      return node;
  }
}

/**
 * Transform array of children nodes
 */
function transformChildren(
  children: (Content | PhrasingContent)[],
  ctx: TransformContext
): CompiledNode[] {
  const result: CompiledNode[] = [];
  for (const child of children) {
    const transformed = transformNode(child as Content, ctx);
    if (transformed) {
      if (Array.isArray(transformed)) {
        result.push(...transformed);
      } else {
        result.push(transformed);
      }
    }
  }
  return result;
}

/**
 * Transform root MDAST to CompiledNode
 */
function transformRoot(root: Root, ctx: TransformContext): CompiledNode {
  const nodes = transformChildren(root.children, ctx);
  return wrapNodes(nodes);
}

// ==================== Main Export ====================

/**
 * Transform MDX source to CompiledProgram
 *
 * @param source - MDX source string
 * @param options - Transformation options
 * @returns CompiledProgram
 */
export async function mdxToConstela(
  source: string,
  options?: MDXToConstelaOptions
): Promise<CompiledProgram> {
  // Parse frontmatter
  const { content, data: _frontmatter } = matter(source);

  // Create unified processor
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdx);

  // Parse MDX to MDAST
  const tree = processor.parse(content);

  // Create transform context
  const ctx: TransformContext = {
    components: options?.components ?? {},
  };

  // Transform to CompiledProgram
  const view = transformRoot(tree as Root, ctx);

  return {
    version: '1.0',
    state: {},
    actions: {},
    view,
  };
}

/**
 * Transform MDX content (without frontmatter) to CompiledNode
 * For use when frontmatter has already been extracted
 *
 * @param content - MDX content string (frontmatter already removed)
 * @param options - Transformation options
 * @returns CompiledNode
 */
export async function mdxContentToNode(
  content: string,
  options?: MDXToConstelaOptions
): Promise<CompiledNode> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdx);

  const tree = processor.parse(content);

  const ctx: TransformContext = {
    components: options?.components ?? {},
  };

  return transformRoot(tree as Root, ctx);
}
