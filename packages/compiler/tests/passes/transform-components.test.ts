/**
 * Transform Pass Tests - Component Inline Expansion
 *
 * Coverage:
 * - Basic component expansion with param substitution
 * - Slot expansion with single/multiple children
 * - Empty slot handling
 * - Nested component expansion
 * - Complex param expressions (state, var, bin)
 * - Components without params
 * - Components without slots
 * - Deeply nested component expansion
 *
 * TDD Red Phase: These tests will FAIL because component expansion is not implemented.
 */

import { describe, it, expect } from 'vitest';

import {
  transformPass,
  type CompiledProgram,
  type CompiledNode,
  type CompiledElementNode,
  type CompiledTextNode,
} from '../../src/passes/transform.js';
import type { Program, AnalysisContext } from '../../src/passes/analyze.js';
import type { ComponentDef, ViewNode, Expression } from '@constela/core';

// ==================== Helper Functions ====================

function createProgram(overrides: Partial<Program> = {}): Program {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  } as Program;
}

function createContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return {
    stateNames: new Set(),
    actionNames: new Set(),
    ...overrides,
  };
}

// ==================== Basic Component Expansion ====================

describe('transformPass - Basic Component Expansion', () => {
  it('should expand component node into its view definition', () => {
    // Arrange
    const program = createProgram({
      components: {
        Button: {
          params: { label: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'button',
            children: [
              { kind: 'text', value: { expr: 'param', name: 'label' } },
            ],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Button',
        props: { label: { expr: 'lit', value: 'Click me' } },
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    // Component should be expanded to its view
    expect(result.view.kind).toBe('element');
    const button = result.view as CompiledElementNode;
    expect(button.tag).toBe('button');
    // Param reference should be substituted with prop value
    expect(button.children).toHaveLength(1);
    const text = button.children![0] as CompiledTextNode;
    expect(text.kind).toBe('text');
    expect(text.value.expr).toBe('lit');
    expect(text.value.value).toBe('Click me');
  });

  it('should substitute all param references in component view', () => {
    // Arrange
    const program = createProgram({
      components: {
        Card: {
          params: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
          },
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'param', name: 'title' } },
              { kind: 'text', value: { expr: 'param', name: 'subtitle' } },
            ],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Card',
        props: {
          title: { expr: 'lit', value: 'Hello' },
          subtitle: { expr: 'lit', value: 'World' },
        },
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.children).toHaveLength(2);
    expect((div.children![0] as CompiledTextNode).value.value).toBe('Hello');
    expect((div.children![1] as CompiledTextNode).value.value).toBe('World');
  });

  it('should handle component with no params', () => {
    // Arrange
    const program = createProgram({
      components: {
        Divider: {
          view: { kind: 'element', tag: 'hr' },
        },
      },
      view: {
        kind: 'component',
        name: 'Divider',
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    expect(result.view.kind).toBe('element');
    expect((result.view as CompiledElementNode).tag).toBe('hr');
  });
});

// ==================== Slot Expansion ====================

describe('transformPass - Slot Expansion', () => {
  it('should replace slot with component children (single child)', () => {
    // Arrange
    const program = createProgram({
      components: {
        Container: {
          view: {
            kind: 'element',
            tag: 'div',
            props: { class: { expr: 'lit', value: 'container' } },
            children: [{ kind: 'slot' }],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Container',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Content' } },
        ],
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    expect(div.children).toHaveLength(1);
    const text = div.children![0] as CompiledTextNode;
    expect(text.kind).toBe('text');
    expect(text.value.value).toBe('Content');
  });

  it('should replace slot with multiple children', () => {
    // Arrange
    const program = createProgram({
      components: {
        List: {
          view: {
            kind: 'element',
            tag: 'ul',
            children: [{ kind: 'slot' }],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'List',
        children: [
          { kind: 'element', tag: 'li', children: [{ kind: 'text', value: { expr: 'lit', value: 'Item 1' } }] },
          { kind: 'element', tag: 'li', children: [{ kind: 'text', value: { expr: 'lit', value: 'Item 2' } }] },
          { kind: 'element', tag: 'li', children: [{ kind: 'text', value: { expr: 'lit', value: 'Item 3' } }] },
        ],
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const ul = result.view as CompiledElementNode;
    expect(ul.tag).toBe('ul');
    // All children should be inserted in place of slot
    expect(ul.children).toHaveLength(3);
    expect((ul.children![0] as CompiledElementNode).tag).toBe('li');
    expect((ul.children![1] as CompiledElementNode).tag).toBe('li');
    expect((ul.children![2] as CompiledElementNode).tag).toBe('li');
  });

  it('should handle empty slot (no children provided)', () => {
    // Arrange
    const program = createProgram({
      components: {
        Box: {
          view: {
            kind: 'element',
            tag: 'div',
            children: [{ kind: 'slot' }],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Box',
        // No children provided
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    // Empty slot should result in no children or empty array
    expect(div.children === undefined || div.children.length === 0).toBe(true);
  });

  it('should handle component with no slot in its view', () => {
    // Arrange
    const program = createProgram({
      components: {
        Icon: {
          params: { name: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'i',
            props: { class: { expr: 'param', name: 'name' } },
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Icon',
        props: { name: { expr: 'lit', value: 'star' } },
        children: [
          // Children provided but component has no slot - should be ignored
          { kind: 'text', value: { expr: 'lit', value: 'Ignored' } },
        ],
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const icon = result.view as CompiledElementNode;
    expect(icon.tag).toBe('i');
    expect(icon.props?.class).toBeDefined();
    expect(icon.props?.class.value).toBe('star');
    // No children since component has no slot
    expect(icon.children).toBeUndefined();
  });

  it('should preserve sibling nodes around slot', () => {
    // Arrange
    const program = createProgram({
      components: {
        Panel: {
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'element', tag: 'header', children: [{ kind: 'text', value: { expr: 'lit', value: 'Header' } }] },
              { kind: 'slot' },
              { kind: 'element', tag: 'footer', children: [{ kind: 'text', value: { expr: 'lit', value: 'Footer' } }] },
            ],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Panel',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Body Content' } },
        ],
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.children).toHaveLength(3);
    expect((div.children![0] as CompiledElementNode).tag).toBe('header');
    expect((div.children![1] as CompiledTextNode).value.value).toBe('Body Content');
    expect((div.children![2] as CompiledElementNode).tag).toBe('footer');
  });
});

// ==================== Nested Component Expansion ====================

describe('transformPass - Nested Component Expansion', () => {
  it('should expand nested components (component uses another component)', () => {
    // Arrange
    const program = createProgram({
      components: {
        InnerButton: {
          params: { text: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'button',
            children: [{ kind: 'text', value: { expr: 'param', name: 'text' } }],
          },
        },
        OuterCard: {
          params: { buttonLabel: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              {
                kind: 'component',
                name: 'InnerButton',
                props: { text: { expr: 'param', name: 'buttonLabel' } },
              },
            ],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'OuterCard',
        props: { buttonLabel: { expr: 'lit', value: 'Submit' } },
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    // OuterCard should be expanded to div
    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    // InnerButton should also be expanded to button
    expect(div.children).toHaveLength(1);
    const button = div.children![0] as CompiledElementNode;
    expect(button.tag).toBe('button');
    // Param should be fully substituted
    const text = button.children![0] as CompiledTextNode;
    expect(text.value.value).toBe('Submit');
  });

  it('should expand deeply nested components (3 levels)', () => {
    // Arrange
    const program = createProgram({
      components: {
        Level3: {
          params: { msg: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'span',
            children: [{ kind: 'text', value: { expr: 'param', name: 'msg' } }],
          },
        },
        Level2: {
          params: { text: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'p',
            children: [
              {
                kind: 'component',
                name: 'Level3',
                props: { msg: { expr: 'param', name: 'text' } },
              },
            ],
          },
        },
        Level1: {
          params: { content: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              {
                kind: 'component',
                name: 'Level2',
                props: { text: { expr: 'param', name: 'content' } },
              },
            ],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Level1',
        props: { content: { expr: 'lit', value: 'Deep Value' } },
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    // Level1 -> div
    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    // Level2 -> p
    const p = div.children![0] as CompiledElementNode;
    expect(p.tag).toBe('p');
    // Level3 -> span
    const span = p.children![0] as CompiledElementNode;
    expect(span.tag).toBe('span');
    // Final text with substituted value
    const text = span.children![0] as CompiledTextNode;
    expect(text.value.value).toBe('Deep Value');
  });

  it('should expand component inside component children (slot content)', () => {
    // Arrange
    const program = createProgram({
      components: {
        Badge: {
          params: { label: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'span',
            props: { class: { expr: 'lit', value: 'badge' } },
            children: [{ kind: 'text', value: { expr: 'param', name: 'label' } }],
          },
        },
        Card: {
          view: {
            kind: 'element',
            tag: 'div',
            children: [{ kind: 'slot' }],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Card',
        children: [
          {
            kind: 'component',
            name: 'Badge',
            props: { label: { expr: 'lit', value: 'New' } },
          },
        ],
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    // Card -> div
    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    // Badge in slot should be expanded to span
    const span = div.children![0] as CompiledElementNode;
    expect(span.tag).toBe('span');
    expect(span.props?.class.value).toBe('badge');
    const text = span.children![0] as CompiledTextNode;
    expect(text.value.value).toBe('New');
  });
});

// ==================== Complex Param Expressions ====================

describe('transformPass - Complex Param Expressions', () => {
  it('should substitute param with state expression', () => {
    // Arrange
    const program = createProgram({
      state: { userName: { type: 'string', initial: '' } },
      components: {
        Greeting: {
          params: { name: { type: 'string' } },
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'name' },
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Greeting',
        props: { name: { expr: 'state', name: 'userName' } },
      },
    });
    const context = createContext({ stateNames: new Set(['userName']) });

    // Act
    const result = transformPass(program, context);

    // Assert
    const text = result.view as CompiledTextNode;
    expect(text.kind).toBe('text');
    // Param should be replaced with state expression
    expect(text.value.expr).toBe('state');
    expect(text.value.name).toBe('userName');
  });

  it('should substitute param with var expression', () => {
    // Arrange
    const program = createProgram({
      state: { items: { type: 'list', initial: [] } },
      components: {
        ListItem: {
          params: { item: { type: 'json' } },
          view: {
            kind: 'element',
            tag: 'li',
            children: [{ kind: 'text', value: { expr: 'param', name: 'item' } }],
          },
        },
      },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'currentItem',
        body: {
          kind: 'component',
          name: 'ListItem',
          props: { item: { expr: 'var', name: 'currentItem' } },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['items']) });

    // Act
    const result = transformPass(program, context);

    // Assert
    expect(result.view.kind).toBe('each');
    const eachNode = result.view as { kind: 'each'; body: CompiledNode };
    // Body should be expanded component
    const li = eachNode.body as CompiledElementNode;
    expect(li.tag).toBe('li');
    const text = li.children![0] as CompiledTextNode;
    // Param replaced with var
    expect(text.value.expr).toBe('var');
    expect(text.value.name).toBe('currentItem');
  });

  it('should substitute param with binary expression', () => {
    // Arrange
    const program = createProgram({
      state: {
        x: { type: 'number', initial: 10 },
        y: { type: 'number', initial: 20 },
      },
      components: {
        Display: {
          params: { value: { type: 'number' } },
          view: {
            kind: 'text',
            value: { expr: 'param', name: 'value' },
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Display',
        props: {
          value: {
            expr: 'bin',
            op: '+',
            left: { expr: 'state', name: 'x' },
            right: { expr: 'state', name: 'y' },
          },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['x', 'y']) });

    // Act
    const result = transformPass(program, context);

    // Assert
    const text = result.view as CompiledTextNode;
    expect(text.kind).toBe('text');
    // Param replaced with binary expression
    expect(text.value.expr).toBe('bin');
    expect(text.value.op).toBe('+');
    expect(text.value.left.expr).toBe('state');
    expect(text.value.left.name).toBe('x');
    expect(text.value.right.expr).toBe('state');
    expect(text.value.right.name).toBe('y');
  });

  it('should handle param with path', () => {
    // Arrange
    const program = createProgram({
      components: {
        UserCard: {
          params: { user: { type: 'json' } },
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'param', name: 'user', path: 'name' } },
              { kind: 'text', value: { expr: 'param', name: 'user', path: 'email' } },
            ],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'UserCard',
        props: {
          user: { expr: 'var', name: 'currentUser' },
        },
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.children).toHaveLength(2);
    // When param has path, the resulting expression should access that path
    const nameText = div.children![0] as CompiledTextNode;
    expect(nameText.value.expr).toBe('var');
    expect(nameText.value.name).toBe('currentUser');
    expect(nameText.value.path).toBe('name');

    const emailText = div.children![1] as CompiledTextNode;
    expect(emailText.value.path).toBe('email');
  });
});

// ==================== Component in Conditional and Loop ====================

describe('transformPass - Component in Control Structures', () => {
  it('should expand component inside if-then branch', () => {
    // Arrange
    const program = createProgram({
      state: { showButton: { type: 'number', initial: 1 } },
      components: {
        Button: {
          params: { label: { type: 'string' } },
          view: {
            kind: 'element',
            tag: 'button',
            children: [{ kind: 'text', value: { expr: 'param', name: 'label' } }],
          },
        },
      },
      view: {
        kind: 'if',
        condition: { expr: 'state', name: 'showButton' },
        then: {
          kind: 'component',
          name: 'Button',
          props: { label: { expr: 'lit', value: 'Show' } },
        },
        else: {
          kind: 'text',
          value: { expr: 'lit', value: 'Hidden' },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['showButton']) });

    // Act
    const result = transformPass(program, context);

    // Assert
    expect(result.view.kind).toBe('if');
    const ifNode = result.view as { kind: 'if'; then: CompiledNode; else?: CompiledNode };
    // Then branch should be expanded component
    const button = ifNode.then as CompiledElementNode;
    expect(button.tag).toBe('button');
    const text = button.children![0] as CompiledTextNode;
    expect(text.value.value).toBe('Show');
  });

  it('should expand component inside each body', () => {
    // Arrange
    const program = createProgram({
      state: { todos: { type: 'list', initial: [] } },
      components: {
        TodoItem: {
          params: { todo: { type: 'json' } },
          view: {
            kind: 'element',
            tag: 'li',
            children: [{ kind: 'text', value: { expr: 'param', name: 'todo', path: 'text' } }],
          },
        },
      },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        as: 'item',
        body: {
          kind: 'component',
          name: 'TodoItem',
          props: { todo: { expr: 'var', name: 'item' } },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['todos']) });

    // Act
    const result = transformPass(program, context);

    // Assert
    expect(result.view.kind).toBe('each');
    const eachNode = result.view as { kind: 'each'; body: CompiledNode };
    // Body should be expanded to li element
    const li = eachNode.body as CompiledElementNode;
    expect(li.tag).toBe('li');
    const text = li.children![0] as CompiledTextNode;
    expect(text.value.expr).toBe('var');
    expect(text.value.name).toBe('item');
    expect(text.value.path).toBe('text');
  });
});

// ==================== Edge Cases ====================

describe('transformPass - Component Expansion Edge Cases', () => {
  it('should handle component with empty children array', () => {
    // Arrange
    const program = createProgram({
      components: {
        Wrapper: {
          view: {
            kind: 'element',
            tag: 'div',
            children: [{ kind: 'slot' }],
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Wrapper',
        children: [], // Explicitly empty
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    // Should handle empty children gracefully
    expect(div.children === undefined || div.children.length === 0).toBe(true);
  });

  it('should expand multiple components at same level', () => {
    // Arrange
    const program = createProgram({
      components: {
        A: {
          view: { kind: 'element', tag: 'span', children: [{ kind: 'text', value: { expr: 'lit', value: 'A' } }] },
        },
        B: {
          view: { kind: 'element', tag: 'span', children: [{ kind: 'text', value: { expr: 'lit', value: 'B' } }] },
        },
      },
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'component', name: 'A' },
          { kind: 'component', name: 'B' },
        ],
      },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    const div = result.view as CompiledElementNode;
    expect(div.children).toHaveLength(2);
    const spanA = div.children![0] as CompiledElementNode;
    const spanB = div.children![1] as CompiledElementNode;
    expect(spanA.tag).toBe('span');
    expect(spanB.tag).toBe('span');
    expect((spanA.children![0] as CompiledTextNode).value.value).toBe('A');
    expect((spanB.children![0] as CompiledTextNode).value.value).toBe('B');
  });

  it('should not include component definitions in compiled output', () => {
    // Arrange
    const program = createProgram({
      components: {
        Button: {
          view: { kind: 'element', tag: 'button' },
        },
      },
      view: { kind: 'component', name: 'Button' },
    });
    const context = createContext();

    // Act
    const result = transformPass(program, context);

    // Assert
    // CompiledProgram should not have components field (they are inlined)
    expect((result as Record<string, unknown>).components).toBeUndefined();
  });
});
