/**
 * Transform Pass Tests for @constela/compiler
 *
 * Coverage:
 * - AST to CompiledProgram transformation
 * - Element node transformation
 * - Text node transformation
 * - If node transformation
 * - Each node transformation
 * - Markdown node transformation
 * - Code node transformation
 * - Expression transformation
 * - Action transformation to Map/Record
 *
 * TDD Red Phase: These tests will FAIL because implementation does not exist.
 */

import { describe, it, expect } from 'vitest';

// Import from the module that doesn't exist yet
import {
  transformPass,
  type TransformPassResult,
  type CompiledProgram,
  type CompiledNode,
  type CompiledElementNode,
  type CompiledTextNode,
  type CompiledIfNode,
  type CompiledEachNode,
  type CompiledExpression,
} from '../../src/passes/transform.js';
import type { Program, AnalysisContext } from '../../src/passes/analyze.js';

// ==================== Compiled Node Types for TDD (to be exported from transform.ts) ====================

/**
 * CompiledMarkdownNode - Compiled markdown node type
 * This type should be added to transform.ts when implementing the feature.
 */
interface CompiledMarkdownNode {
  kind: 'markdown';
  content: CompiledExpression;
}

/**
 * CompiledCodeNode - Compiled code node type
 * This type should be added to transform.ts when implementing the feature.
 */
interface CompiledCodeNode {
  kind: 'code';
  language: CompiledExpression;
  content: CompiledExpression;
}

// ==================== Helper to create AST ====================

function createAst(overrides: Partial<Program> = {}): Program {
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

// ==================== Basic Transformation ====================

describe('transformPass - Basic Transformation', () => {
  it('should return a CompiledProgram', () => {
    const ast = createAst();
    const context = createContext();

    const result = transformPass(ast, context);

    expect(result).toBeDefined();
    expect(result.version).toBe('1.0');
  });

  it('should preserve version in compiled program', () => {
    const ast = createAst({ version: '1.0' });
    const context = createContext();

    const result = transformPass(ast, context);

    expect(result.version).toBe('1.0');
  });

  it('should transform state into Record format', () => {
    const ast = createAst({
      state: {
        count: { type: 'number', initial: 0 },
        name: { type: 'string', initial: '' },
      },
    });
    const context = createContext({ stateNames: new Set(['count', 'name']) });

    const result = transformPass(ast, context);

    expect(result.state).toBeDefined();
    expect(result.state['count']).toEqual({ type: 'number', initial: 0 });
    expect(result.state['name']).toEqual({ type: 'string', initial: '' });
  });

  it('should transform actions into Map or Record for efficient lookup', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'increment',
          steps: [{ do: 'update', target: 'count', operation: 'increment' }],
        },
        {
          name: 'decrement',
          steps: [{ do: 'update', target: 'count', operation: 'decrement' }],
        },
      ],
    });
    const context = createContext({
      stateNames: new Set(['count']),
      actionNames: new Set(['increment', 'decrement']),
    });

    const result = transformPass(ast, context);

    expect(result.actions).toBeDefined();

    // Actions should be accessible by name
    const incrementAction =
      result.actions instanceof Map
        ? result.actions.get('increment')
        : result.actions['increment'];

    expect(incrementAction).toBeDefined();
    expect(incrementAction?.name).toBe('increment');
    expect(incrementAction?.steps).toHaveLength(1);
  });
});

// ==================== Element Node Transformation ====================

describe('transformPass - Element Node Transformation', () => {
  it('should transform element node with tag', () => {
    const ast = createAst({
      view: { kind: 'element', tag: 'div' },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('element');
    expect((result.view as CompiledElementNode).tag).toBe('div');
  });

  it('should transform element node with props', () => {
    const ast = createAst({
      view: {
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'container' },
          id: { expr: 'lit', value: 'main' },
        },
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    const view = result.view as CompiledElementNode;
    expect(view.props).toBeDefined();
    expect(view.props?.['class']).toBeDefined();
    expect(view.props?.['id']).toBeDefined();
  });

  it('should transform element node with event handler props', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'handleClick',
          steps: [{ do: 'update', target: 'count', operation: 'increment' }],
        },
      ],
      view: {
        kind: 'element',
        tag: 'button',
        props: {
          onclick: { event: 'click', action: 'handleClick' },
        },
      },
    });
    const context = createContext({
      stateNames: new Set(['count']),
      actionNames: new Set(['handleClick']),
    });

    const result = transformPass(ast, context);

    const view = result.view as CompiledElementNode;
    expect(view.props?.['onclick']).toBeDefined();
    expect(view.props?.['onclick'].event).toBe('click');
    expect(view.props?.['onclick'].action).toBe('handleClick');
  });

  it('should transform element node with children', () => {
    const ast = createAst({
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'span' },
          { kind: 'element', tag: 'p' },
        ],
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    const view = result.view as CompiledElementNode;
    expect(view.children).toBeDefined();
    expect(view.children).toHaveLength(2);
    expect((view.children?.[0] as CompiledElementNode).tag).toBe('span');
    expect((view.children?.[1] as CompiledElementNode).tag).toBe('p');
  });

  it('should transform deeply nested element nodes', () => {
    const ast = createAst({
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'ul',
            children: [
              {
                kind: 'element',
                tag: 'li',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Item' } }],
              },
            ],
          },
        ],
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    const div = result.view as CompiledElementNode;
    const ul = div.children?.[0] as CompiledElementNode;
    const li = ul.children?.[0] as CompiledElementNode;
    const text = li.children?.[0] as CompiledTextNode;

    expect(div.tag).toBe('div');
    expect(ul.tag).toBe('ul');
    expect(li.tag).toBe('li');
    expect(text.kind).toBe('text');
  });
});

// ==================== Text Node Transformation ====================

describe('transformPass - Text Node Transformation', () => {
  it('should transform text node with literal expression', () => {
    const ast = createAst({
      view: {
        kind: 'text',
        value: { expr: 'lit', value: 'Hello, World!' },
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('text');
    const text = result.view as CompiledTextNode;
    expect(text.value.expr).toBe('lit');
    expect(text.value.value).toBe('Hello, World!');
  });

  it('should transform text node with state expression', () => {
    const ast = createAst({
      state: { message: { type: 'string', initial: '' } },
      view: {
        kind: 'text',
        value: { expr: 'state', name: 'message' },
      },
    });
    const context = createContext({ stateNames: new Set(['message']) });

    const result = transformPass(ast, context);

    const text = result.view as CompiledTextNode;
    expect(text.value.expr).toBe('state');
    expect(text.value.name).toBe('message');
  });

  it('should transform text node with binary expression', () => {
    const ast = createAst({
      state: {
        a: { type: 'number', initial: 1 },
        b: { type: 'number', initial: 2 },
      },
      view: {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '+',
          left: { expr: 'state', name: 'a' },
          right: { expr: 'state', name: 'b' },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['a', 'b']) });

    const result = transformPass(ast, context);

    const text = result.view as CompiledTextNode;
    expect(text.value.expr).toBe('bin');
    expect(text.value.op).toBe('+');
    expect(text.value.left.expr).toBe('state');
    expect(text.value.right.expr).toBe('state');
  });

  it('should transform text node with not expression', () => {
    const ast = createAst({
      state: { visible: { type: 'number', initial: 1 } },
      view: {
        kind: 'text',
        value: {
          expr: 'not',
          operand: { expr: 'state', name: 'visible' },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['visible']) });

    const result = transformPass(ast, context);

    const text = result.view as CompiledTextNode;
    expect(text.value.expr).toBe('not');
    expect(text.value.operand.expr).toBe('state');
  });
});

// ==================== If Node Transformation ====================

describe('transformPass - If Node Transformation', () => {
  it('should transform if node with condition and then', () => {
    const ast = createAst({
      state: { show: { type: 'number', initial: 1 } },
      view: {
        kind: 'if',
        condition: { expr: 'state', name: 'show' },
        then: { kind: 'element', tag: 'div' },
      },
    });
    const context = createContext({ stateNames: new Set(['show']) });

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('if');
    const ifNode = result.view as CompiledIfNode;
    expect(ifNode.condition.expr).toBe('state');
    expect(ifNode.condition.name).toBe('show');
    expect(ifNode.then.kind).toBe('element');
  });

  it('should transform if node with else branch', () => {
    const ast = createAst({
      state: { loggedIn: { type: 'number', initial: 0 } },
      view: {
        kind: 'if',
        condition: { expr: 'state', name: 'loggedIn' },
        then: { kind: 'text', value: { expr: 'lit', value: 'Welcome!' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Please log in' } },
      },
    });
    const context = createContext({ stateNames: new Set(['loggedIn']) });

    const result = transformPass(ast, context);

    const ifNode = result.view as CompiledIfNode;
    expect(ifNode.else).toBeDefined();
    expect(ifNode.else?.kind).toBe('text');
  });

  it('should transform nested if nodes', () => {
    const ast = createAst({
      state: {
        a: { type: 'number', initial: 1 },
        b: { type: 'number', initial: 1 },
      },
      view: {
        kind: 'if',
        condition: { expr: 'state', name: 'a' },
        then: {
          kind: 'if',
          condition: { expr: 'state', name: 'b' },
          then: { kind: 'element', tag: 'div' },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['a', 'b']) });

    const result = transformPass(ast, context);

    const outerIf = result.view as CompiledIfNode;
    expect(outerIf.then.kind).toBe('if');
    const innerIf = outerIf.then as CompiledIfNode;
    expect(innerIf.condition.name).toBe('b');
  });

  it('should transform complex condition expression', () => {
    const ast = createAst({
      state: {
        x: { type: 'number', initial: 5 },
        y: { type: 'number', initial: 10 },
      },
      view: {
        kind: 'if',
        condition: {
          expr: 'bin',
          op: '&&',
          left: {
            expr: 'bin',
            op: '>',
            left: { expr: 'state', name: 'x' },
            right: { expr: 'lit', value: 0 },
          },
          right: {
            expr: 'bin',
            op: '<',
            left: { expr: 'state', name: 'y' },
            right: { expr: 'lit', value: 20 },
          },
        },
        then: { kind: 'element', tag: 'div' },
      },
    });
    const context = createContext({ stateNames: new Set(['x', 'y']) });

    const result = transformPass(ast, context);

    const ifNode = result.view as CompiledIfNode;
    expect(ifNode.condition.expr).toBe('bin');
    expect(ifNode.condition.op).toBe('&&');
  });
});

// ==================== Each Node Transformation ====================

describe('transformPass - Each Node Transformation', () => {
  it('should transform each node with items, as, and body', () => {
    const ast = createAst({
      state: { items: { type: 'list', initial: [] } },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: { kind: 'element', tag: 'li' },
      },
    });
    const context = createContext({ stateNames: new Set(['items']) });

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('each');
    const eachNode = result.view as CompiledEachNode;
    expect(eachNode.items.expr).toBe('state');
    expect(eachNode.items.name).toBe('items');
    expect(eachNode.as).toBe('item');
    expect(eachNode.body.kind).toBe('element');
  });

  it('should transform each node with index binding', () => {
    const ast = createAst({
      state: { items: { type: 'list', initial: [] } },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'idx',
        body: { kind: 'element', tag: 'li' },
      },
    });
    const context = createContext({ stateNames: new Set(['items']) });

    const result = transformPass(ast, context);

    const eachNode = result.view as CompiledEachNode;
    expect(eachNode.index).toBe('idx');
  });

  it('should transform each node with key expression', () => {
    const ast = createAst({
      state: { items: { type: 'list', initial: [] } },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'idx',
        key: { expr: 'var', name: 'idx' },
        body: { kind: 'element', tag: 'li' },
      },
    });
    const context = createContext({ stateNames: new Set(['items']) });

    const result = transformPass(ast, context);

    const eachNode = result.view as CompiledEachNode;
    expect(eachNode.key).toBeDefined();
    expect(eachNode.key?.expr).toBe('var');
    expect(eachNode.key?.name).toBe('idx');
  });

  it('should transform each body with variable references', () => {
    const ast = createAst({
      state: { items: { type: 'list', initial: [] } },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: {
          kind: 'text',
          value: { expr: 'var', name: 'item' },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['items']) });

    const result = transformPass(ast, context);

    const eachNode = result.view as CompiledEachNode;
    const bodyText = eachNode.body as CompiledTextNode;
    expect(bodyText.value.expr).toBe('var');
    expect(bodyText.value.name).toBe('item');
  });

  it('should transform nested each nodes', () => {
    const ast = createAst({
      state: { matrix: { type: 'list', initial: [] } },
      view: {
        kind: 'each',
        items: { expr: 'state', name: 'matrix' },
        as: 'row',
        body: {
          kind: 'each',
          items: { expr: 'var', name: 'row' },
          as: 'cell',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'cell' },
          },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['matrix']) });

    const result = transformPass(ast, context);

    const outerEach = result.view as CompiledEachNode;
    expect(outerEach.as).toBe('row');
    const innerEach = outerEach.body as CompiledEachNode;
    expect(innerEach.as).toBe('cell');
    expect(innerEach.items.expr).toBe('var');
    expect(innerEach.items.name).toBe('row');
  });
});

// ==================== Expression Transformation ====================

describe('transformPass - Expression Transformation', () => {
  it('should transform literal expressions with all value types', () => {
    const createTextWithLit = (value: unknown) =>
      createAst({
        view: { kind: 'text', value: { expr: 'lit', value } },
      });

    const context = createContext();

    // String
    const strResult = transformPass(createTextWithLit('hello'), context);
    expect((strResult.view as CompiledTextNode).value.value).toBe('hello');

    // Number
    const numResult = transformPass(createTextWithLit(42), context);
    expect((numResult.view as CompiledTextNode).value.value).toBe(42);

    // Boolean
    const boolResult = transformPass(createTextWithLit(true), context);
    expect((boolResult.view as CompiledTextNode).value.value).toBe(true);

    // Null
    const nullResult = transformPass(createTextWithLit(null), context);
    expect((nullResult.view as CompiledTextNode).value.value).toBe(null);
  });

  it('should transform all comparison operators', () => {
    const ops = ['==', '!=', '<', '<=', '>', '>='] as const;
    const context = createContext({ stateNames: new Set(['a', 'b']) });

    for (const op of ops) {
      const ast = createAst({
        state: { a: { type: 'number', initial: 1 }, b: { type: 'number', initial: 2 } },
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op,
            left: { expr: 'state', name: 'a' },
            right: { expr: 'state', name: 'b' },
          },
        },
      });

      const result = transformPass(ast, context);
      const text = result.view as CompiledTextNode;
      expect(text.value.op).toBe(op);
    }
  });

  it('should transform all arithmetic operators', () => {
    const ops = ['+', '-', '*', '/'] as const;
    const context = createContext({ stateNames: new Set(['a', 'b']) });

    for (const op of ops) {
      const ast = createAst({
        state: { a: { type: 'number', initial: 1 }, b: { type: 'number', initial: 2 } },
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op,
            left: { expr: 'state', name: 'a' },
            right: { expr: 'state', name: 'b' },
          },
        },
      });

      const result = transformPass(ast, context);
      const text = result.view as CompiledTextNode;
      expect(text.value.op).toBe(op);
    }
  });

  it('should transform logical operators', () => {
    const ops = ['&&', '||'] as const;
    const context = createContext({ stateNames: new Set(['a', 'b']) });

    for (const op of ops) {
      const ast = createAst({
        state: { a: { type: 'number', initial: 1 }, b: { type: 'number', initial: 2 } },
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op,
            left: { expr: 'state', name: 'a' },
            right: { expr: 'state', name: 'b' },
          },
        },
      });

      const result = transformPass(ast, context);
      const text = result.view as CompiledTextNode;
      expect(text.value.op).toBe(op);
    }
  });

  it('should transform nested binary expressions', () => {
    const ast = createAst({
      state: { a: { type: 'number', initial: 1 } },
      view: {
        kind: 'text',
        value: {
          expr: 'bin',
          op: '+',
          left: {
            expr: 'bin',
            op: '*',
            left: { expr: 'state', name: 'a' },
            right: { expr: 'lit', value: 2 },
          },
          right: { expr: 'lit', value: 3 },
        },
      },
    });
    const context = createContext({ stateNames: new Set(['a']) });

    const result = transformPass(ast, context);
    const text = result.view as CompiledTextNode;

    expect(text.value.expr).toBe('bin');
    expect(text.value.op).toBe('+');
    expect(text.value.left.expr).toBe('bin');
    expect(text.value.left.op).toBe('*');
  });
});

// ==================== Action Transformation ====================

describe('transformPass - Action Transformation', () => {
  it('should transform set step correctly', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'reset',
          steps: [
            {
              do: 'set',
              target: 'count',
              value: { expr: 'lit', value: 0 },
            },
          ],
        },
      ],
    });
    const context = createContext({
      stateNames: new Set(['count']),
      actionNames: new Set(['reset']),
    });

    const result = transformPass(ast, context);
    const action =
      result.actions instanceof Map
        ? result.actions.get('reset')
        : result.actions['reset'];

    expect(action).toBeDefined();
    expect(action?.steps[0].do).toBe('set');
    expect(action?.steps[0].target).toBe('count');
    expect(action?.steps[0].value.expr).toBe('lit');
  });

  it('should transform update step correctly', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'increment',
          steps: [
            {
              do: 'update',
              target: 'count',
              operation: 'increment',
            },
          ],
        },
      ],
    });
    const context = createContext({
      stateNames: new Set(['count']),
      actionNames: new Set(['increment']),
    });

    const result = transformPass(ast, context);
    const action =
      result.actions instanceof Map
        ? result.actions.get('increment')
        : result.actions['increment'];

    expect(action).toBeDefined();
    expect(action?.steps[0].do).toBe('update');
    expect(action?.steps[0].operation).toBe('increment');
  });

  it('should transform update step with value', () => {
    const ast = createAst({
      state: { items: { type: 'list', initial: [] } },
      actions: [
        {
          name: 'addItem',
          steps: [
            {
              do: 'update',
              target: 'items',
              operation: 'push',
              value: { expr: 'lit', value: 'new item' },
            },
          ],
        },
      ],
    });
    const context = createContext({
      stateNames: new Set(['items']),
      actionNames: new Set(['addItem']),
    });

    const result = transformPass(ast, context);
    const action =
      result.actions instanceof Map
        ? result.actions.get('addItem')
        : result.actions['addItem'];

    expect(action).toBeDefined();
    expect(action?.steps[0].operation).toBe('push');
    expect(action?.steps[0].value?.expr).toBe('lit');
  });

  it('should transform fetch step correctly', () => {
    const ast = createAst({
      actions: [
        {
          name: 'loadData',
          steps: [
            {
              do: 'fetch',
              url: { expr: 'lit', value: '/api/data' },
              method: 'GET',
            },
          ],
        },
      ],
    });
    const context = createContext({ actionNames: new Set(['loadData']) });

    const result = transformPass(ast, context);
    const action =
      result.actions instanceof Map
        ? result.actions.get('loadData')
        : result.actions['loadData'];

    expect(action).toBeDefined();
    expect(action?.steps[0].do).toBe('fetch');
    expect(action?.steps[0].url.expr).toBe('lit');
    expect(action?.steps[0].method).toBe('GET');
  });

  it('should transform fetch step with body and callbacks', () => {
    const ast = createAst({
      state: { data: { type: 'string', initial: '' } },
      actions: [
        {
          name: 'postData',
          steps: [
            {
              do: 'fetch',
              url: { expr: 'lit', value: '/api/submit' },
              method: 'POST',
              body: { expr: 'state', name: 'data' },
              result: 'response',
              onSuccess: [
                {
                  do: 'set',
                  target: 'data',
                  value: { expr: 'var', name: 'response' },
                },
              ],
              onError: [],
            },
          ],
        },
      ],
    });
    const context = createContext({
      stateNames: new Set(['data']),
      actionNames: new Set(['postData']),
    });

    const result = transformPass(ast, context);
    const action =
      result.actions instanceof Map
        ? result.actions.get('postData')
        : result.actions['postData'];

    expect(action).toBeDefined();
    expect(action?.steps[0].method).toBe('POST');
    expect(action?.steps[0].body?.expr).toBe('state');
    expect(action?.steps[0].result).toBe('response');
    expect(action?.steps[0].onSuccess).toHaveLength(1);
  });

  it('should transform multiple action steps', () => {
    const ast = createAst({
      state: {
        items: { type: 'list', initial: [] },
        input: { type: 'string', initial: '' },
      },
      actions: [
        {
          name: 'addAndClear',
          steps: [
            {
              do: 'update',
              target: 'items',
              operation: 'push',
              value: { expr: 'state', name: 'input' },
            },
            {
              do: 'set',
              target: 'input',
              value: { expr: 'lit', value: '' },
            },
          ],
        },
      ],
    });
    const context = createContext({
      stateNames: new Set(['items', 'input']),
      actionNames: new Set(['addAndClear']),
    });

    const result = transformPass(ast, context);
    const action =
      result.actions instanceof Map
        ? result.actions.get('addAndClear')
        : result.actions['addAndClear'];

    expect(action).toBeDefined();
    expect(action?.steps).toHaveLength(2);
    expect(action?.steps[0].do).toBe('update');
    expect(action?.steps[1].do).toBe('set');
  });
});

// ==================== Markdown Node Transformation ====================

describe('transformPass - Markdown Node Transformation', () => {
  it('should transform markdown node with literal content', () => {
    const ast = createAst({
      view: {
        kind: 'markdown',
        content: { expr: 'lit', value: '# Hello World\n\nThis is **bold** text.' },
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('markdown');
    expect((result.view as CompiledMarkdownNode).content.expr).toBe('lit');
    expect((result.view as CompiledMarkdownNode).content.value).toBe(
      '# Hello World\n\nThis is **bold** text.'
    );
  });

  it('should transform markdown node with state expression', () => {
    const ast = createAst({
      state: { markdownContent: { type: 'string', initial: '' } },
      view: {
        kind: 'markdown',
        content: { expr: 'state', name: 'markdownContent' },
      },
    });
    const context = createContext({ stateNames: new Set(['markdownContent']) });

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('markdown');
    const markdownNode = result.view as CompiledMarkdownNode;
    expect(markdownNode.content.expr).toBe('state');
    expect(markdownNode.content.name).toBe('markdownContent');
  });

  it('should transform markdown node as child of element', () => {
    const ast = createAst({
      state: { readme: { type: 'string', initial: '' } },
      view: {
        kind: 'element',
        tag: 'article',
        children: [
          {
            kind: 'markdown',
            content: { expr: 'state', name: 'readme' },
          },
        ],
      },
    });
    const context = createContext({ stateNames: new Set(['readme']) });

    const result = transformPass(ast, context);

    const article = result.view as CompiledElementNode;
    expect(article.tag).toBe('article');
    expect(article.children).toHaveLength(1);
    expect(article.children?.[0].kind).toBe('markdown');
    const markdownChild = article.children?.[0] as CompiledMarkdownNode;
    expect(markdownChild.content.expr).toBe('state');
    expect(markdownChild.content.name).toBe('readme');
  });
});

// ==================== Code Node Transformation ====================

describe('transformPass - Code Node Transformation', () => {
  it('should transform code node with literal language and content', () => {
    const ast = createAst({
      view: {
        kind: 'code',
        language: { expr: 'lit', value: 'typescript' },
        content: { expr: 'lit', value: 'const x: number = 42;' },
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('code');
    const codeNode = result.view as CompiledCodeNode;
    expect(codeNode.language.expr).toBe('lit');
    expect(codeNode.language.value).toBe('typescript');
    expect(codeNode.content.expr).toBe('lit');
    expect(codeNode.content.value).toBe('const x: number = 42;');
  });

  it('should transform code node with state expressions', () => {
    const ast = createAst({
      state: {
        lang: { type: 'string', initial: 'javascript' },
        snippet: { type: 'string', initial: '' },
      },
      view: {
        kind: 'code',
        language: { expr: 'state', name: 'lang' },
        content: { expr: 'state', name: 'snippet' },
      },
    });
    const context = createContext({ stateNames: new Set(['lang', 'snippet']) });

    const result = transformPass(ast, context);

    expect(result.view.kind).toBe('code');
    const codeNode = result.view as CompiledCodeNode;
    expect(codeNode.language.expr).toBe('state');
    expect(codeNode.language.name).toBe('lang');
    expect(codeNode.content.expr).toBe('state');
    expect(codeNode.content.name).toBe('snippet');
  });

  it('should transform code node as child of element', () => {
    const ast = createAst({
      view: {
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'code-container' },
        },
        children: [
          {
            kind: 'code',
            language: { expr: 'lit', value: 'python' },
            content: { expr: 'lit', value: 'print("Hello")' },
          },
        ],
      },
    });
    const context = createContext();

    const result = transformPass(ast, context);

    const div = result.view as CompiledElementNode;
    expect(div.tag).toBe('div');
    expect(div.children).toHaveLength(1);
    expect(div.children?.[0].kind).toBe('code');
    const codeChild = div.children?.[0] as CompiledCodeNode;
    expect(codeChild.language.value).toBe('python');
    expect(codeChild.content.value).toBe('print("Hello")');
  });
});

// ==================== Idempotency ====================

describe('transformPass - Idempotency', () => {
  it('should produce consistent output for same input', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'increment',
          steps: [{ do: 'update', target: 'count', operation: 'increment' }],
        },
      ],
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'state', name: 'count' } },
        ],
      },
    });
    const context = createContext({
      stateNames: new Set(['count']),
      actionNames: new Set(['increment']),
    });

    const result1 = transformPass(ast, context);
    const result2 = transformPass(ast, context);

    // Results should be structurally equal
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });
});

// ==================== Event Handler Payload Transformation ====================

describe('transformPass - Event Handler Payload', () => {
  it('should transform object payload in event handler', () => {
    const ast = createAst({
      state: { currentPage: { type: 'string', initial: 'home' } },
      actions: [
        {
          name: 'navigate',
          steps: [{ do: 'set', target: 'currentPage', value: { expr: 'var', name: 'payload', path: 'page' } }],
        },
      ],
      view: {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'navigate',
            payload: { page: { expr: 'lit', value: 'about' } },
          },
        },
      },
    });
    const context = createContext({
      stateNames: new Set(['currentPage']),
      actionNames: new Set(['navigate']),
    });

    const result = transformPass(ast, context);

    const button = result.view as CompiledElementNode;
    const onClick = button.props?.['onClick'] as { event: string; action: string; payload?: unknown };

    expect(onClick.event).toBe('click');
    expect(onClick.action).toBe('navigate');
    expect(onClick.payload).toEqual({ page: { expr: 'lit', value: 'about' } });
  });

  it('should transform single expression payload in event handler', () => {
    const ast = createAst({
      state: { value: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'setValue',
          steps: [{ do: 'set', target: 'value', value: { expr: 'var', name: 'payload' } }],
        },
      ],
      view: {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'setValue',
            payload: { expr: 'lit', value: 42 },
          },
        },
      },
    });
    const context = createContext({
      stateNames: new Set(['value']),
      actionNames: new Set(['setValue']),
    });

    const result = transformPass(ast, context);

    const button = result.view as CompiledElementNode;
    const onClick = button.props?.['onClick'] as { event: string; action: string; payload?: unknown };

    expect(onClick.event).toBe('click');
    expect(onClick.action).toBe('setValue');
    expect(onClick.payload).toEqual({ expr: 'lit', value: 42 });
  });
});
