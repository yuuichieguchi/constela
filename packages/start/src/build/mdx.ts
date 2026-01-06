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
} from '@constela/compiler';
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
function lit(value: string | number | boolean | null): CompiledExpression {
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
      if (node.title) {
        props.title = lit(node.title);
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
      return elementNode(tag, undefined, transformChildren(node.children, ctx));
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
      if (node.alt) {
        props.alt = lit(node.alt);
      }
      if (node.title) {
        props.title = lit(node.title);
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
    case 'table':
      return elementNode('table', undefined, transformChildren(node.children, ctx));

    case 'tableRow':
      return elementNode('tr', undefined, transformChildren(node.children, ctx));

    case 'tableCell':
      return elementNode('td', undefined, transformChildren(node.children, ctx));

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
 * Substitute props and slot in a compiled node
 */
function substituteInNode(
  node: CompiledNode,
  props: Record<string, CompiledExpression>,
  children: CompiledNode[]
): CompiledNode {
  if (node.kind === 'element') {
    const elem = node as CompiledElementNode;

    // Merge props
    const newProps = elem.props ? { ...elem.props } : {};
    for (const [key, value] of Object.entries(props)) {
      if (!(key in newProps)) {
        newProps[key] = value;
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

  // For other node types, return as-is
  return node;
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
