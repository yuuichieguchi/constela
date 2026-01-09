/**
 * Test module for MDX Component Substitution.
 *
 * Coverage:
 * - substituteExpression function for param substitution in expressions
 * - substituteInNode function for node-level substitution (each, text, element)
 * - Integration tests for PropsTable and Callout component scenarios
 *
 * TDD Red Phase: These tests verify the MDX component substitution functionality
 * that needs to be extended to handle kind: 'each' nodes and expr: 'param' expressions.
 */

import { describe, it, expect } from 'vitest';
import type {
  CompiledNode,
  CompiledExpression,
  CompiledElementNode,
  CompiledEachNode,
  CompiledTextNode,
} from '@constela/compiler';

// ==================== Type Definitions ====================

/**
 * SlotNode for component children placeholder
 */
interface SlotNode {
  kind: 'slot';
  name?: string;
}

/**
 * ComponentDef for MDX components
 */
interface ComponentDef {
  params?: Record<string, { type: string; required?: boolean }>;
  view: CompiledNode | SlotNode;
}

// ==================== substituteExpression Tests ====================

describe('substituteExpression', () => {
  // ==================== Param Expression Substitution ====================

  describe('param expression substitution', () => {
    it('should substitute { expr: "param", name: "type" } with actual prop value', async () => {
      // Arrange
      const paramExpr: CompiledExpression = { expr: 'param', name: 'type' } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        type: { expr: 'lit', value: 'warning' },
      };

      // Act
      // substituteExpression is an internal function in mdx.ts
      // We need to test it through the public API or export it for testing
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(paramExpr, props);

      // Assert
      expect(result).toEqual({ expr: 'lit', value: 'warning' });
    });

    it('should return original expression when param is not found in props', async () => {
      // Arrange
      const paramExpr: CompiledExpression = { expr: 'param', name: 'missing' } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        type: { expr: 'lit', value: 'info' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(paramExpr, props);

      // Assert
      // Should return null literal or the original param expression
      expect(result.expr).toBe('lit');
      expect((result as { expr: 'lit'; value: null }).value).toBe(null);
    });

    it('should handle param with path property', async () => {
      // Arrange
      const paramExpr = { expr: 'param', name: 'item', path: 'name' } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        item: { expr: 'var', name: 'row' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(paramExpr, props);

      // Assert
      // Should combine var with path
      expect(result.expr).toBe('var');
      expect((result as { expr: 'var'; name: string; path: string }).name).toBe('row');
      expect((result as { expr: 'var'; name: string; path: string }).path).toBe('name');
    });
  });

  // ==================== Binary Expression Substitution ====================

  describe('binary expression with param substitution', () => {
    it('should substitute param in binary expression left operand', async () => {
      // Arrange
      const binExpr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'param', name: 'prefix' } as unknown as CompiledExpression,
        right: { expr: 'lit', value: '-suffix' },
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        prefix: { expr: 'lit', value: 'callout' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(binExpr, props);

      // Assert
      expect(result.expr).toBe('bin');
      const binResult = result as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(binResult.left).toEqual({ expr: 'lit', value: 'callout' });
      expect(binResult.right).toEqual({ expr: 'lit', value: '-suffix' });
    });

    it('should substitute param in binary expression right operand', async () => {
      // Arrange
      const binExpr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 'class-' },
        right: { expr: 'param', name: 'variant' } as unknown as CompiledExpression,
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        variant: { expr: 'lit', value: 'primary' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(binExpr, props);

      // Assert
      expect(result.expr).toBe('bin');
      const binResult = result as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(binResult.left).toEqual({ expr: 'lit', value: 'class-' });
      expect(binResult.right).toEqual({ expr: 'lit', value: 'primary' });
    });

    it('should substitute params in both operands of binary expression', async () => {
      // Arrange
      const binExpr: CompiledExpression = {
        expr: 'bin',
        op: '+',
        left: { expr: 'param', name: 'base' } as unknown as CompiledExpression,
        right: { expr: 'param', name: 'modifier' } as unknown as CompiledExpression,
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        base: { expr: 'lit', value: 'btn' },
        modifier: { expr: 'lit', value: '-lg' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(binExpr, props);

      // Assert
      const binResult = result as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(binResult.left).toEqual({ expr: 'lit', value: 'btn' });
      expect(binResult.right).toEqual({ expr: 'lit', value: '-lg' });
    });
  });

  // ==================== Conditional Expression Substitution ====================

  describe('conditional expression with param substitution', () => {
    it('should substitute param in cond.if expression', async () => {
      // Arrange
      const condExpr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'param', name: 'isActive' } as unknown as CompiledExpression,
        then: { expr: 'lit', value: 'active' },
        else: { expr: 'lit', value: 'inactive' },
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        isActive: { expr: 'lit', value: true },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(condExpr, props);

      // Assert
      expect(result.expr).toBe('cond');
      const condResult = result as { expr: 'cond'; if: CompiledExpression; then: CompiledExpression; else: CompiledExpression };
      expect(condResult.if).toEqual({ expr: 'lit', value: true });
    });

    it('should substitute param in cond.then expression', async () => {
      // Arrange
      const condExpr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'lit', value: true },
        then: { expr: 'param', name: 'activeClass' } as unknown as CompiledExpression,
        else: { expr: 'lit', value: 'default' },
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        activeClass: { expr: 'lit', value: 'highlighted' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(condExpr, props);

      // Assert
      const condResult = result as { expr: 'cond'; if: CompiledExpression; then: CompiledExpression; else: CompiledExpression };
      expect(condResult.then).toEqual({ expr: 'lit', value: 'highlighted' });
    });

    it('should substitute param in cond.else expression', async () => {
      // Arrange
      const condExpr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'lit', value: false },
        then: { expr: 'lit', value: 'yes' },
        else: { expr: 'param', name: 'fallback' } as unknown as CompiledExpression,
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        fallback: { expr: 'lit', value: 'no' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(condExpr, props);

      // Assert
      const condResult = result as { expr: 'cond'; if: CompiledExpression; then: CompiledExpression; else: CompiledExpression };
      expect(condResult.else).toEqual({ expr: 'lit', value: 'no' });
    });

    it('should substitute params in all parts of conditional expression', async () => {
      // Arrange
      const condExpr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'param', name: 'condition' } as unknown as CompiledExpression,
        then: { expr: 'param', name: 'trueValue' } as unknown as CompiledExpression,
        else: { expr: 'param', name: 'falseValue' } as unknown as CompiledExpression,
      } as unknown as CompiledExpression;
      const props: Record<string, CompiledExpression> = {
        condition: { expr: 'lit', value: true },
        trueValue: { expr: 'lit', value: 'success' },
        falseValue: { expr: 'lit', value: 'failure' },
      };

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(condExpr, props);

      // Assert
      const condResult = result as { expr: 'cond'; if: CompiledExpression; then: CompiledExpression; else: CompiledExpression };
      expect(condResult.if).toEqual({ expr: 'lit', value: true });
      expect(condResult.then).toEqual({ expr: 'lit', value: 'success' });
      expect(condResult.else).toEqual({ expr: 'lit', value: 'failure' });
    });
  });

  // ==================== Non-param Expression Passthrough ====================

  describe('non-param expression passthrough', () => {
    it('should return literal expression unchanged', async () => {
      // Arrange
      const litExpr: CompiledExpression = { expr: 'lit', value: 'unchanged' };
      const props: Record<string, CompiledExpression> = {};

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(litExpr, props);

      // Assert
      expect(result).toEqual({ expr: 'lit', value: 'unchanged' });
    });

    it('should return state expression unchanged', async () => {
      // Arrange
      const stateExpr: CompiledExpression = { expr: 'state', name: 'count' };
      const props: Record<string, CompiledExpression> = {};

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(stateExpr, props);

      // Assert
      expect(result).toEqual({ expr: 'state', name: 'count' });
    });

    it('should return var expression unchanged', async () => {
      // Arrange
      const varExpr: CompiledExpression = { expr: 'var', name: 'item', path: 'title' };
      const props: Record<string, CompiledExpression> = {};

      // Act
      const { substituteExpression } = await import('../build/mdx.js');
      const result = substituteExpression(varExpr, props);

      // Assert
      expect(result).toEqual({ expr: 'var', name: 'item', path: 'title' });
    });
  });
});

// ==================== substituteInNode Tests ====================

describe('substituteInNode', () => {
  // ==================== Each Node Substitution ====================

  describe('each node substitution', () => {
    it('should substitute param expression in each.items', async () => {
      // Arrange
      const eachNode: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'param', name: 'rows' } as unknown as CompiledExpression,
        as: 'row',
        body: {
          kind: 'element',
          tag: 'tr',
          children: [
            { kind: 'text', value: { expr: 'var', name: 'row', path: 'name' } },
          ],
        },
      };
      const props: Record<string, CompiledExpression> = {
        rows: { expr: 'lit', value: [{ name: 'foo' }, { name: 'bar' }] },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(eachNode as CompiledNode, props, children);

      // Assert
      expect(result.kind).toBe('each');
      const eachResult = result as CompiledEachNode;
      expect(eachResult.items).toEqual({
        expr: 'lit',
        value: [{ name: 'foo' }, { name: 'bar' }],
      });
    });

    it('should substitute param expression in each.key', async () => {
      // Arrange
      const eachNode: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: [1, 2, 3] },
        as: 'item',
        key: { expr: 'param', name: 'keyField' } as unknown as CompiledExpression,
        body: { kind: 'text', value: { expr: 'var', name: 'item' } },
      };
      const props: Record<string, CompiledExpression> = {
        keyField: { expr: 'var', name: 'item', path: 'id' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(eachNode as CompiledNode, props, children);

      // Assert
      const eachResult = result as CompiledEachNode;
      expect(eachResult.key).toEqual({ expr: 'var', name: 'item', path: 'id' });
    });

    it('should recursively substitute in each.body', async () => {
      // Arrange
      const eachNode: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: ['a', 'b'] },
        as: 'letter',
        body: {
          kind: 'element',
          tag: 'span',
          props: {
            className: { expr: 'param', name: 'itemClass' } as unknown as CompiledExpression,
          },
        },
      };
      const props: Record<string, CompiledExpression> = {
        itemClass: { expr: 'lit', value: 'list-item' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(eachNode as CompiledNode, props, children);

      // Assert
      const eachResult = result as CompiledEachNode;
      const bodyElement = eachResult.body as CompiledElementNode;
      expect(bodyElement.props?.className).toEqual({ expr: 'lit', value: 'list-item' });
    });
  });

  // ==================== Text Node Substitution ====================

  describe('text node substitution', () => {
    it('should substitute param expression in text.value', async () => {
      // Arrange
      const textNode: CompiledTextNode = {
        kind: 'text',
        value: { expr: 'param', name: 'label' } as unknown as CompiledExpression,
      };
      const props: Record<string, CompiledExpression> = {
        label: { expr: 'lit', value: 'Hello World' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(textNode as CompiledNode, props, children);

      // Assert
      expect(result.kind).toBe('text');
      const textResult = result as CompiledTextNode;
      expect(textResult.value).toEqual({ expr: 'lit', value: 'Hello World' });
    });

    it('should substitute binary expression with param in text.value', async () => {
      // Arrange
      const textNode: CompiledTextNode = {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 'Status: ' },
          right: { expr: 'param', name: 'status' } as unknown as CompiledExpression,
        } as unknown as CompiledExpression,
      };
      const props: Record<string, CompiledExpression> = {
        status: { expr: 'lit', value: 'active' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(textNode as CompiledNode, props, children);

      // Assert
      const textResult = result as CompiledTextNode;
      expect(textResult.value.expr).toBe('bin');
      const binValue = textResult.value as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(binValue.right).toEqual({ expr: 'lit', value: 'active' });
    });
  });

  // ==================== Element Node Substitution ====================

  describe('element node substitution', () => {
    it('should substitute param expression in element props', async () => {
      // Arrange
      const elementNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: { expr: 'param', name: 'cssClass' } as unknown as CompiledExpression,
          id: { expr: 'lit', value: 'container' },
        },
      };
      const props: Record<string, CompiledExpression> = {
        cssClass: { expr: 'lit', value: 'my-component' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(elementNode as CompiledNode, props, children);

      // Assert
      const elemResult = result as CompiledElementNode;
      expect(elemResult.props?.className).toEqual({ expr: 'lit', value: 'my-component' });
      expect(elemResult.props?.id).toEqual({ expr: 'lit', value: 'container' });
    });

    it('should substitute binary expression with param in element props', async () => {
      // Arrange - Callout-style class concatenation
      const elementNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 'callout callout-' },
            right: { expr: 'param', name: 'type' } as unknown as CompiledExpression,
          } as unknown as CompiledExpression,
        },
      };
      const props: Record<string, CompiledExpression> = {
        type: { expr: 'lit', value: 'warning' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(elementNode as CompiledNode, props, children);

      // Assert
      const elemResult = result as CompiledElementNode;
      const classExpr = elemResult.props?.className as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(classExpr.expr).toBe('bin');
      expect(classExpr.right).toEqual({ expr: 'lit', value: 'warning' });
    });

    it('should recursively substitute in element children', async () => {
      // Arrange
      const elementNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'span',
            props: {
              title: { expr: 'param', name: 'tooltip' } as unknown as CompiledExpression,
            },
          },
        ],
      };
      const props: Record<string, CompiledExpression> = {
        tooltip: { expr: 'lit', value: 'Click here' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(elementNode as CompiledNode, props, children);

      // Assert
      const elemResult = result as CompiledElementNode;
      const childElem = elemResult.children?.[0] as CompiledElementNode;
      expect(childElem.props?.title).toEqual({ expr: 'lit', value: 'Click here' });
    });

    it('should replace slot with provided children', async () => {
      // Arrange
      const elementNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot' } as unknown as CompiledNode,
        ],
      };
      const props: Record<string, CompiledExpression> = {};
      const children: CompiledNode[] = [
        { kind: 'text', value: { expr: 'lit', value: 'Slot content' } },
      ];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(elementNode as CompiledNode, props, children);

      // Assert
      const elemResult = result as CompiledElementNode;
      expect(elemResult.children).toHaveLength(1);
      expect(elemResult.children?.[0]?.kind).toBe('text');
    });
  });

  // ==================== If Node Substitution ====================

  describe('if node substitution', () => {
    it('should substitute param in if.condition', async () => {
      // Arrange
      const ifNode = {
        kind: 'if',
        condition: { expr: 'param', name: 'showContent' } as unknown as CompiledExpression,
        then: { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
      };
      const props: Record<string, CompiledExpression> = {
        showContent: { expr: 'lit', value: true },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(ifNode as CompiledNode, props, children);

      // Assert
      expect(result.kind).toBe('if');
      const ifResult = result as { kind: 'if'; condition: CompiledExpression; then: CompiledNode };
      expect(ifResult.condition).toEqual({ expr: 'lit', value: true });
    });

    it('should recursively substitute in if.then and if.else', async () => {
      // Arrange
      const ifNode = {
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'element',
          tag: 'span',
          props: { className: { expr: 'param', name: 'activeClass' } as unknown as CompiledExpression },
        },
        else: {
          kind: 'element',
          tag: 'span',
          props: { className: { expr: 'param', name: 'inactiveClass' } as unknown as CompiledExpression },
        },
      };
      const props: Record<string, CompiledExpression> = {
        activeClass: { expr: 'lit', value: 'active' },
        inactiveClass: { expr: 'lit', value: 'inactive' },
      };
      const children: CompiledNode[] = [];

      // Act
      const { substituteInNode } = await import('../build/mdx.js');
      const result = substituteInNode(ifNode as CompiledNode, props, children);

      // Assert
      const ifResult = result as { kind: 'if'; condition: CompiledExpression; then: CompiledElementNode; else: CompiledElementNode };
      expect(ifResult.then.props?.className).toEqual({ expr: 'lit', value: 'active' });
      expect(ifResult.else?.props?.className).toEqual({ expr: 'lit', value: 'inactive' });
    });
  });
});

// ==================== Integration Tests ====================

describe('MDX Component Substitution Integration', () => {
  // ==================== PropsTable Component ====================

  describe('PropsTable component', () => {
    it('should transform MDX with PropsTable items iteration', async () => {
      // Arrange - PropsTable component definition
      const propsTableDef: ComponentDef = {
        params: {
          items: { type: 'json', required: true },
        },
        view: {
          kind: 'element',
          tag: 'table',
          props: { className: { expr: 'lit', value: 'props-table' } },
          children: [
            {
              kind: 'element',
              tag: 'tbody',
              children: [
                {
                  kind: 'each',
                  items: { expr: 'param', name: 'items' } as unknown as CompiledExpression,
                  as: 'prop',
                  body: {
                    kind: 'element',
                    tag: 'tr',
                    children: [
                      {
                        kind: 'element',
                        tag: 'td',
                        children: [{ kind: 'text', value: { expr: 'var', name: 'prop', path: 'name' } }],
                      },
                      {
                        kind: 'element',
                        tag: 'td',
                        children: [{ kind: 'text', value: { expr: 'var', name: 'prop', path: 'type' } }],
                      },
                    ],
                  },
                } as unknown as CompiledNode,
              ],
            },
          ],
        } as CompiledNode,
      };

      // MDX source with PropsTable
      const mdxSource = `---
title: Component Docs
---

<PropsTable items={[{ name: "foo", type: "string" }, { name: "bar", type: "number" }]} />
`;

      // Act
      const { mdxToConstela } = await import('../build/mdx.js');
      const result = await mdxToConstela(mdxSource, {
        components: { PropsTable: propsTableDef as unknown as ComponentDef },
      });

      // Assert - The PropsTable should be expanded with items substituted
      expect(result.view).toBeDefined();
      expect(result.view.kind).toBe('element');

      // Find the table element
      const findTable = (node: CompiledNode): CompiledElementNode | null => {
        if (node.kind === 'element') {
          if (node.tag === 'table') return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findTable(child);
              if (found) return found;
            }
          }
        }
        return null;
      };

      const table = findTable(result.view);
      expect(table).not.toBeNull();
      expect(table?.props?.className).toEqual({ expr: 'lit', value: 'props-table' });

      // Find the each node
      const findEach = (node: CompiledNode): CompiledEachNode | null => {
        if (node.kind === 'each') return node;
        if (node.kind === 'element' && node.children) {
          for (const child of node.children) {
            const found = findEach(child);
            if (found) return found;
          }
        }
        return null;
      };

      const eachNode = findEach(result.view);
      expect(eachNode).not.toBeNull();
      // The items should be substituted with the literal array
      expect(eachNode?.items.expr).toBe('lit');
      expect((eachNode?.items as { expr: 'lit'; value: unknown[] }).value).toEqual([
        { name: 'foo', type: 'string' },
        { name: 'bar', type: 'number' },
      ]);
    });
  });

  // ==================== Callout Component ====================

  describe('Callout component', () => {
    it('should transform MDX with Callout type styling', async () => {
      // Arrange - Callout component with dynamic class based on type
      const calloutDef: ComponentDef = {
        params: {
          type: { type: 'string', required: true },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            className: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: 'callout callout-' },
              right: { expr: 'param', name: 'type' } as unknown as CompiledExpression,
            } as unknown as CompiledExpression,
          },
          children: [{ kind: 'slot' } as unknown as CompiledNode],
        } as CompiledNode,
      };

      // MDX source with Callout
      const mdxSource = `---
title: Alert Example
---

<Callout type="warning">
  This is a warning message.
</Callout>
`;

      // Act
      const { mdxToConstela } = await import('../build/mdx.js');
      const result = await mdxToConstela(mdxSource, {
        components: { Callout: calloutDef as unknown as ComponentDef },
      });

      // Assert
      expect(result.view).toBeDefined();

      // Find the callout div
      const findCallout = (node: CompiledNode): CompiledElementNode | null => {
        if (node.kind === 'element') {
          const classExpr = node.props?.className;
          if (classExpr && classExpr.expr === 'bin') {
            const binExpr = classExpr as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
            const leftLit = binExpr.left as { expr: 'lit'; value: string };
            if (leftLit.expr === 'lit' && leftLit.value === 'callout callout-') {
              return node;
            }
          }
          if (node.children) {
            for (const child of node.children) {
              const found = findCallout(child);
              if (found) return found;
            }
          }
        }
        return null;
      };

      const callout = findCallout(result.view);
      expect(callout).not.toBeNull();

      // The type param should be substituted
      const classExpr = callout?.props?.className as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(classExpr.right).toEqual({ expr: 'lit', value: 'warning' });

      // The slot should be replaced with children
      expect(callout?.children).toBeDefined();
      expect(callout?.children?.length).toBeGreaterThan(0);
    });

    it('should handle Callout with different type values', async () => {
      // Arrange
      const calloutDef: ComponentDef = {
        params: {
          type: { type: 'string', required: true },
        },
        view: {
          kind: 'element',
          tag: 'aside',
          props: {
            className: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: 'alert alert-' },
              right: { expr: 'param', name: 'type' } as unknown as CompiledExpression,
            } as unknown as CompiledExpression,
            role: { expr: 'lit', value: 'alert' },
          },
          children: [{ kind: 'slot' } as unknown as CompiledNode],
        } as CompiledNode,
      };

      const mdxSource = `<Callout type="info">Info message</Callout>`;

      // Act
      const { mdxContentToNode } = await import('../build/mdx.js');
      const result = await mdxContentToNode(mdxSource, {
        components: { Callout: calloutDef as unknown as ComponentDef },
      });

      // Assert
      expect(result).toBeDefined();

      // Find the aside element
      const findAside = (node: CompiledNode): CompiledElementNode | null => {
        if (node.kind === 'element' && node.tag === 'aside') return node;
        if (node.kind === 'element' && node.children) {
          for (const child of node.children) {
            const found = findAside(child);
            if (found) return found;
          }
        }
        return null;
      };

      const aside = findAside(result);
      expect(aside).not.toBeNull();
      expect(aside?.props?.role).toEqual({ expr: 'lit', value: 'alert' });

      const classExpr = aside?.props?.className as { expr: 'bin'; op: string; left: CompiledExpression; right: CompiledExpression };
      expect(classExpr.right).toEqual({ expr: 'lit', value: 'info' });
    });
  });

  // ==================== Combined Components ====================

  describe('combined component scenarios', () => {
    it('should handle nested components with param substitution', async () => {
      // Arrange
      const cardDef: ComponentDef = {
        params: {
          title: { type: 'string', required: true },
        },
        view: {
          kind: 'element',
          tag: 'article',
          props: { className: { expr: 'lit', value: 'card' } },
          children: [
            {
              kind: 'element',
              tag: 'h3',
              children: [{ kind: 'text', value: { expr: 'param', name: 'title' } as unknown as CompiledExpression }],
            },
            { kind: 'slot' } as unknown as CompiledNode,
          ],
        } as CompiledNode,
      };

      const mdxSource = `<Card title="My Card">Card content here</Card>`;

      // Act
      const { mdxContentToNode } = await import('../build/mdx.js');
      const result = await mdxContentToNode(mdxSource, {
        components: { Card: cardDef as unknown as ComponentDef },
      });

      // Assert
      const findArticle = (node: CompiledNode): CompiledElementNode | null => {
        if (node.kind === 'element' && node.tag === 'article') return node;
        if (node.kind === 'element' && node.children) {
          for (const child of node.children) {
            const found = findArticle(child);
            if (found) return found;
          }
        }
        return null;
      };

      const article = findArticle(result);
      expect(article).not.toBeNull();

      // Find h3 with title
      const h3 = article?.children?.find(c => c.kind === 'element' && (c as CompiledElementNode).tag === 'h3') as CompiledElementNode;
      expect(h3).toBeDefined();

      // The title param should be substituted
      const titleText = h3?.children?.[0] as CompiledTextNode;
      expect(titleText?.value).toEqual({ expr: 'lit', value: 'My Card' });
    });
  });
});
