/**
 * Test module for transformLayoutPass Component Param Substitution.
 *
 * Coverage:
 * - Basic component param substitution with literal values
 * - Component param substitution with var expressions (inside each loop)
 * - Component param with path combining
 * - Nested component params (outer -> inner)
 * - Layout-level params (should be preserved for later resolution)
 * - Mixed params (component params substituted, layout params preserved)
 * - Component with each loop using param for items
 *
 * TDD Red Phase: These tests verify that the transformLayoutPass correctly
 * substitutes component params with their prop values.
 *
 * Bug Summary:
 * The `transformExpression` function in `transform-layout.ts` doesn't accept
 * a context parameter, so it can't check `ctx.currentParams` to substitute
 * component-level params. This means params inside layout components are
 * NEVER substituted with their prop values.
 *
 * Compare with `transform.ts` where `transformExpression(expr, ctx)` correctly
 * handles param substitution via `ctx.currentParams`.
 */

import { describe, it, expect } from 'vitest';
import { transformLayoutPass } from '../transform-layout.js';
import type { LayoutProgram, ViewNode, ComponentDef, Expression } from '@constela/core';
import type { LayoutAnalysisContext, AnalysisContext } from '../analyze.js';
import type { CompiledNode, CompiledLocalStateNode } from '../transform.js';

describe('transformLayoutPass Component Param Substitution', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(): AnalysisContext {
    return {
      stateNames: new Set<string>(),
      actionNames: new Set<string>(),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(),
      importNames: new Set<string>(),
    };
  }

  /**
   * Creates a LayoutAnalysisContext for testing
   */
  function createLayoutContext(): LayoutAnalysisContext {
    return {
      ...createContext(),
      slotNames: new Set<string>(),
      hasDefaultSlot: true,
    };
  }

  /**
   * Creates a LayoutProgram with components for testing
   */
  function createLayoutWithComponents(
    view: ViewNode,
    components: Record<string, ComponentDef>
  ): LayoutProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view,
      components,
    } as unknown as LayoutProgram;
  }

  /**
   * Type guard to check if a node is CompiledLocalStateNode
   */
  function isCompiledLocalStateNode(node: CompiledNode): node is CompiledLocalStateNode {
    return node.kind === 'localState';
  }

  /**
   * Helper to extract the actual node from a potentially wrapped localState node
   */
  function unwrapLocalState(node: CompiledNode): CompiledNode {
    if (isCompiledLocalStateNode(node)) {
      return node.child;
    }
    return node;
  }

  // ==================== Test Case 1: Basic Component Param Substitution ====================

  describe('basic component param substitution', () => {
    it('should substitute param with literal value passed as prop', () => {
      /**
       * Given: Component with prop { category: { expr: "lit", value: "Books" } }
       * And: Component view uses { expr: "param", name: "category" }
       * When: transformLayoutPass is called
       * Then: The param should be substituted with the literal value
       *
       * Bug: The param expression is preserved as-is instead of being
       *      substituted with { expr: "lit", value: "Books" }
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        CategoryLabel: {
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'category' },
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'CategoryLabel',
              props: {
                category: { expr: 'lit', value: 'Books' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      expect(viewChildren).toBeDefined();

      // The first child should be the expanded CategoryLabel (text node)
      const labelNode = unwrapLocalState(viewChildren![0]!);
      expect(labelNode.kind).toBe('text');

      // The value should be the literal "Books", not a param expression
      const textValue = (labelNode as { value: unknown }).value;
      expect(textValue).toEqual({ expr: 'lit', value: 'Books' });
    });

    it('should substitute param in element props', () => {
      /**
       * Given: Component prop { title: { expr: "lit", value: "Welcome" } }
       * And: Component view has element with prop using { expr: "param", name: "title" }
       * When: transformLayoutPass is called
       * Then: The param in element prop should be substituted
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        Header: {
          view: {
            kind: 'element',
            tag: 'h1',
            props: {
              title: { expr: 'param', name: 'title' },
            },
            children: [
              { kind: 'text', value: { expr: 'param', name: 'title' } },
            ],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'Header',
              props: {
                title: { expr: 'lit', value: 'Welcome' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const headerNode = unwrapLocalState(viewChildren![0]!) as {
        kind: string;
        tag: string;
        props?: Record<string, unknown>;
        children?: CompiledNode[];
      };

      expect(headerNode.kind).toBe('element');
      expect(headerNode.tag).toBe('h1');

      // Props should have substituted param
      expect(headerNode.props?.title).toEqual({ expr: 'lit', value: 'Welcome' });

      // Children text should also have substituted param
      const textChild = headerNode.children?.[0] as { value: unknown };
      expect(textChild.value).toEqual({ expr: 'lit', value: 'Welcome' });
    });
  });

  // ==================== Test Case 2: Component Param with Var Expression ====================

  describe('component param with var expression', () => {
    it('should substitute param with var expression from each loop', () => {
      /**
       * Given: Inside each loop, component prop is { category: { expr: "var", name: "item" } }
       * And: Component view uses { expr: "param", name: "category" }
       * When: transformLayoutPass is called
       * Then: The param should be substituted with the var expression
       *
       * Use case: Rendering a list where each item is rendered by a component
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ItemCard: {
          view: {
            kind: 'element',
            tag: 'div',
            props: {
              className: { expr: 'lit', value: 'card' },
            },
            children: [
              { kind: 'text', value: { expr: 'param', name: 'item' } },
            ],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'component',
                name: 'ItemCard',
                props: {
                  item: { expr: 'var', name: 'item' },
                },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const eachNode = viewChildren![0] as { kind: string; body: CompiledNode };
      expect(eachNode.kind).toBe('each');

      // The body should be the expanded ItemCard
      const cardNode = unwrapLocalState(eachNode.body) as {
        kind: string;
        children?: CompiledNode[];
      };
      expect(cardNode.kind).toBe('element');

      // The text child should have var expression (substituted from param)
      const textChild = cardNode.children?.[0] as { value: unknown };
      expect(textChild.value).toEqual({ expr: 'var', name: 'item' });
    });
  });

  // ==================== Test Case 3: Component Param with Path ====================

  describe('component param with path', () => {
    it('should combine param path with var expression path', () => {
      /**
       * Given: Component prop is { title: { expr: "var", name: "item" } }
       * And: Component view uses { expr: "param", name: "title", path: "name" }
       * When: transformLayoutPass is called
       * Then: The result should be { expr: "var", name: "item", path: "name" }
       *
       * This tests that when a param has a path, it's correctly combined with
       * the underlying expression.
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        TitleDisplay: {
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'data', path: 'title' },
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'component',
                name: 'TitleDisplay',
                props: {
                  data: { expr: 'var', name: 'item' },
                },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const eachNode = viewChildren![0] as { kind: string; body: CompiledNode };

      const textNode = unwrapLocalState(eachNode.body) as { kind: string; value: unknown };
      expect(textNode.kind).toBe('text');

      // Should be var with combined path
      expect(textNode.value).toEqual({ expr: 'var', name: 'item', path: 'title' });
    });

    it('should append param path to existing var path', () => {
      /**
       * Given: Component prop is { data: { expr: "var", name: "item", path: "details" } }
       * And: Component view uses { expr: "param", name: "data", path: "name" }
       * When: transformLayoutPass is called
       * Then: The result should be { expr: "var", name: "item", path: "details.name" }
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        NestedDisplay: {
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'nested', path: 'value' },
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'component',
                name: 'NestedDisplay',
                props: {
                  nested: { expr: 'var', name: 'item', path: 'data' },
                },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const eachNode = viewChildren![0] as { kind: string; body: CompiledNode };

      const textNode = unwrapLocalState(eachNode.body) as { kind: string; value: unknown };
      expect(textNode.kind).toBe('text');

      // Should be var with combined paths: data.value
      expect(textNode.value).toEqual({ expr: 'var', name: 'item', path: 'data.value' });
    });
  });

  // ==================== Test Case 4: Nested Component Params ====================

  describe('nested component params', () => {
    it('should substitute params at each nesting level', () => {
      /**
       * Given: Outer component passes param to inner component
       * And: Inner component uses that param
       * When: transformLayoutPass is called
       * Then: Params should be substituted at each level
       *
       * Layout uses OuterComponent with { title: "Hello" }
       * OuterComponent uses InnerComponent with { text: param.title }
       * InnerComponent displays { param.text }
       * Result: "Hello" should appear in final output
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        InnerComponent: {
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'text' },
          },
        } as ComponentDef,
        OuterComponent: {
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              {
                kind: 'component',
                name: 'InnerComponent',
                props: {
                  text: { expr: 'param', name: 'title' },
                },
              },
            ],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'OuterComponent',
              props: {
                title: { expr: 'lit', value: 'Hello World' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const outerNode = unwrapLocalState(viewChildren![0]!) as {
        kind: string;
        children?: CompiledNode[];
      };

      expect(outerNode.kind).toBe('element');

      // Find the inner text node
      const innerNode = unwrapLocalState(outerNode.children![0]!) as {
        kind: string;
        value: unknown;
      };

      expect(innerNode.kind).toBe('text');
      // The param should be fully resolved to the literal
      expect(innerNode.value).toEqual({ expr: 'lit', value: 'Hello World' });
    });
  });

  // ==================== Test Case 5: Layout-Level Param Preservation ====================

  describe('layout-level param preservation', () => {
    it('should preserve param expressions in layout view (not in component context)', () => {
      /**
       * Given: Layout view directly uses { expr: "param", name: "navItems" }
       * And: This is NOT inside a component context
       * When: transformLayoutPass is called
       * Then: The param should be PRESERVED (not substituted)
       *       because it will be resolved later in composeLayoutWithPage
       *
       * Note: Layout-level params are different from component params.
       * They are resolved during layout composition, not during transformation.
       */
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'nav',
          children: [
            {
              kind: 'each',
              items: { expr: 'param', name: 'navItems' },
              as: 'item',
              body: {
                kind: 'text',
                value: { expr: 'var', name: 'item', path: 'label' },
              },
            },
            { kind: 'slot' },
          ],
        },
        components: {},
      } as unknown as LayoutProgram;

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const eachNode = viewChildren![0] as { kind: string; items: unknown };

      expect(eachNode.kind).toBe('each');
      // Layout-level param should be preserved
      expect(eachNode.items).toEqual({ expr: 'param', name: 'navItems' });
    });
  });

  // ==================== Test Case 6: Mixed Params ====================

  describe('mixed params (component and layout level)', () => {
    it('should substitute component params while preserving layout params', () => {
      /**
       * Given: Layout has a component that uses component-level param
       * And: Layout view also uses layout-level param
       * When: transformLayoutPass is called
       * Then: Component params should be substituted
       * And: Layout params should be preserved
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        MenuItem: {
          view: {
            kind: 'element',
            tag: 'a',
            props: {
              href: { expr: 'param', name: 'url' },
            },
            children: [
              { kind: 'text', value: { expr: 'param', name: 'label' } },
            ],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            // Layout-level param (should be preserved)
            {
              kind: 'text',
              value: { expr: 'param', name: 'siteTitle' },
            },
            // Component with component-level params (should be substituted)
            {
              kind: 'component',
              name: 'MenuItem',
              props: {
                url: { expr: 'lit', value: '/home' },
                label: { expr: 'lit', value: 'Home' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;

      // First child: layout-level param should be preserved
      const siteTitleNode = viewChildren![0] as { kind: string; value: unknown };
      expect(siteTitleNode.kind).toBe('text');
      expect(siteTitleNode.value).toEqual({ expr: 'param', name: 'siteTitle' });

      // Second child: component params should be substituted
      const menuItemNode = unwrapLocalState(viewChildren![1]!) as {
        kind: string;
        tag: string;
        props?: Record<string, unknown>;
        children?: CompiledNode[];
      };

      expect(menuItemNode.kind).toBe('element');
      expect(menuItemNode.tag).toBe('a');
      expect(menuItemNode.props?.href).toEqual({ expr: 'lit', value: '/home' });

      const labelNode = menuItemNode.children?.[0] as { value: unknown };
      expect(labelNode.value).toEqual({ expr: 'lit', value: 'Home' });
    });
  });

  // ==================== Test Case 7: Component with Each Loop Using Param ====================

  describe('component with each loop using param for items', () => {
    it('should substitute param in each items expression', () => {
      /**
       * Given: Component view contains each loop
       * And: Loop uses param for items: { expr: "param", name: "list" }
       * And: Component is called with { list: { expr: "state", name: "menuItems" } }
       * When: transformLayoutPass is called
       * Then: The each items should be substituted with state expression
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        MenuList: {
          view: {
            kind: 'element',
            tag: 'ul',
            children: [
              {
                kind: 'each',
                items: { expr: 'param', name: 'list' },
                as: 'menuItem',
                body: {
                  kind: 'element',
                  tag: 'li',
                  children: [
                    { kind: 'text', value: { expr: 'var', name: 'menuItem', path: 'name' } },
                  ],
                },
              },
            ],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'nav',
          children: [
            {
              kind: 'component',
              name: 'MenuList',
              props: {
                list: { expr: 'state', name: 'menuItems' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const menuListNode = unwrapLocalState(viewChildren![0]!) as {
        kind: string;
        children?: CompiledNode[];
      };

      expect(menuListNode.kind).toBe('element');

      // Find the each node
      const eachNode = menuListNode.children?.[0] as {
        kind: string;
        items: unknown;
        as: string;
      };

      expect(eachNode.kind).toBe('each');
      expect(eachNode.as).toBe('menuItem');

      // The items should be substituted with state expression
      expect(eachNode.items).toEqual({ expr: 'state', name: 'menuItems' });
    });

    it('should handle param substitution in each body expressions', () => {
      /**
       * Given: Component view contains each loop with body using param
       * And: Loop body uses { expr: "param", name: "formatter" }
       * When: transformLayoutPass is called
       * Then: Params in body should also be substituted
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        FormattedList: {
          view: {
            kind: 'element',
            tag: 'ul',
            children: [
              {
                kind: 'each',
                items: { expr: 'param', name: 'items' },
                as: 'item',
                body: {
                  kind: 'element',
                  tag: 'li',
                  props: {
                    className: { expr: 'param', name: 'itemClass' },
                  },
                  children: [
                    { kind: 'text', value: { expr: 'var', name: 'item' } },
                  ],
                },
              },
            ],
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'FormattedList',
              props: {
                items: { expr: 'state', name: 'dataList' },
                itemClass: { expr: 'lit', value: 'list-item' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const listNode = unwrapLocalState(viewChildren![0]!) as {
        kind: string;
        children?: CompiledNode[];
      };

      const eachNode = listNode.children?.[0] as {
        kind: string;
        items: unknown;
        body: { kind: string; props?: Record<string, unknown> };
      };

      expect(eachNode.kind).toBe('each');
      // Items should be substituted
      expect(eachNode.items).toEqual({ expr: 'state', name: 'dataList' });

      // Body's className prop should be substituted
      expect(eachNode.body.props?.className).toEqual({ expr: 'lit', value: 'list-item' });
    });
  });

  // ==================== Additional Edge Cases ====================

  describe('edge cases', () => {
    it('should handle missing param gracefully (return null literal)', () => {
      /**
       * Given: Component view uses a param that was not passed as prop
       * When: transformLayoutPass is called
       * Then: The param should become null literal (as per transform.ts behavior)
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        OptionalDisplay: {
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'optionalValue' },
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'OptionalDisplay',
              props: {
                // Note: 'optionalValue' is NOT provided
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const textNode = unwrapLocalState(viewChildren![0]!) as { kind: string; value: unknown };

      expect(textNode.kind).toBe('text');
      // Missing param should become null literal
      expect(textNode.value).toEqual({ expr: 'lit', value: null });
    });

    it('should substitute param in conditional expressions', () => {
      /**
       * Given: Component view has if node with condition using param
       * When: transformLayoutPass is called
       * Then: The param in condition should be substituted
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ConditionalDisplay: {
          view: {
            kind: 'if',
            condition: { expr: 'param', name: 'showContent' },
            then: { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
            else: { kind: 'text', value: { expr: 'lit', value: 'Hidden' } },
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ConditionalDisplay',
              props: {
                showContent: { expr: 'state', name: 'isVisible' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const ifNode = unwrapLocalState(viewChildren![0]!) as {
        kind: string;
        condition: unknown;
      };

      expect(ifNode.kind).toBe('if');
      // Condition param should be substituted with state expression
      expect(ifNode.condition).toEqual({ expr: 'state', name: 'isVisible' });
    });

    it('should substitute param in binary expressions', () => {
      /**
       * Given: Component view has binary expression with param operand
       * When: transformLayoutPass is called
       * Then: The param in binary expression should be substituted
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        ComparisonDisplay: {
          view: {
            kind: 'if',
            condition: {
              expr: 'bin',
              op: '>',
              left: { expr: 'param', name: 'count' },
              right: { expr: 'lit', value: 0 },
            },
            then: { kind: 'text', value: { expr: 'lit', value: 'Has items' } },
          },
        } as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'ComparisonDisplay',
              props: {
                count: { expr: 'state', name: 'itemCount' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;
      const ifNode = unwrapLocalState(viewChildren![0]!) as {
        kind: string;
        condition: { expr: string; left: unknown; right: unknown };
      };

      expect(ifNode.kind).toBe('if');
      expect(ifNode.condition.expr).toBe('bin');
      // Left operand (param) should be substituted
      expect(ifNode.condition.left).toEqual({ expr: 'state', name: 'itemCount' });
      // Right operand should remain as-is
      expect(ifNode.condition.right).toEqual({ expr: 'lit', value: 0 });
    });

    it('should handle component with localState and params together', () => {
      /**
       * Given: Component has localState AND uses params
       * When: transformLayoutPass is called
       * Then: Both localState wrapping and param substitution should work
       */
      // Arrange
      const components: Record<string, ComponentDef> = {
        StatefulComponent: {
          localState: {
            isActive: { type: 'boolean', initial: false },
          },
          localActions: [
            { name: 'activate', steps: [{ do: 'update', target: 'isActive', operation: 'toggle' }] },
          ],
          view: {
            kind: 'element',
            tag: 'div',
            props: {
              className: { expr: 'param', name: 'containerClass' },
            },
            children: [
              { kind: 'text', value: { expr: 'param', name: 'label' } },
            ],
          },
        } as unknown as ComponentDef,
      };

      const layout = createLayoutWithComponents(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'component',
              name: 'StatefulComponent',
              props: {
                containerClass: { expr: 'lit', value: 'my-container' },
                label: { expr: 'lit', value: 'Click me' },
              },
            },
            { kind: 'slot' },
          ],
        } as ViewNode,
        components
      );

      const context = createLayoutContext();

      // Act
      const result = transformLayoutPass(layout, context);

      // Assert
      const viewChildren = (result.view as { children?: CompiledNode[] }).children;

      // Should be wrapped with localState
      const wrappedNode = viewChildren![0] as CompiledLocalStateNode;
      expect(isCompiledLocalStateNode(wrappedNode)).toBe(true);
      expect(wrappedNode.state['isActive']).toBeDefined();
      expect(wrappedNode.actions['activate']).toBeDefined();

      // The child should have substituted params
      const childNode = wrappedNode.child as {
        kind: string;
        props?: Record<string, unknown>;
        children?: CompiledNode[];
      };

      expect(childNode.kind).toBe('element');
      expect(childNode.props?.className).toEqual({ expr: 'lit', value: 'my-container' });

      const textNode = childNode.children?.[0] as { value: unknown };
      expect(textNode.value).toEqual({ expr: 'lit', value: 'Click me' });
    });
  });
});
