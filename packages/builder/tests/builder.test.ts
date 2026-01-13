/**
 * Test suite for @constela/builder
 *
 * Coverage:
 * - Expression builders (lit, state, variable, bin, not, cond, get)
 * - State builders (numberField, stringField, listField, booleanField, objectField)
 * - Action builders (action, set, update, increment, push, fetch, navigate)
 * - View builders (element, div, button, input, text, ifNode, each, component, slot)
 * - Event builders (onClick, onInput)
 * - Program builder (createProgram)
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation.
 */

import { describe, it, expect } from 'vitest';
import type {
  LitExpr,
  StateExpr,
  VarExpr,
  BinExpr,
  NotExpr,
  CondExpr,
  GetExpr,
  NumberField,
  StringField,
  ListField,
  BooleanField,
  ObjectField,
  ActionDefinition,
  SetStep,
  UpdateStep,
  FetchStep,
  NavigateStep,
  ElementNode,
  TextNode,
  IfNode,
  EachNode,
  ComponentNode,
  SlotNode,
  EventHandler,
  Program,
  Expression,
} from '@constela/core';

// Import builders - these will fail until implemented
import {
  // Expression builders
  lit,
  state,
  variable,
  bin,
  add,
  sub,
  mul,
  divide,
  eq,
  neq,
  lt,
  lte,
  gt,
  gte,
  and,
  or,
  not,
  cond,
  get,
  // State builders
  numberField,
  stringField,
  listField,
  booleanField,
  objectField,
  // Action builders
  action,
  set,
  update,
  increment,
  decrement,
  push,
  pop,
  toggle,
  fetch,
  navigate,
  // View builders
  element,
  div,
  span,
  button,
  input,
  text,
  ifNode,
  each,
  component,
  slot,
  // Event builders
  onClick,
  onInput,
  onChange,
  onSubmit,
  // Program builder
  createProgram,
} from '../src/index.js';

// ==================== Expression Builders ====================

describe('Expression Builders', () => {
  // -------------------- Test 1: lit(42) --------------------
  describe('lit', () => {
    it('should return correct LitExpr for number', () => {
      // Arrange
      const expected: LitExpr = { expr: 'lit', value: 42 };

      // Act
      const result = lit(42);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should return correct LitExpr for string', () => {
      const expected: LitExpr = { expr: 'lit', value: 'hello' };
      const result = lit('hello');
      expect(result).toEqual(expected);
    });

    it('should return correct LitExpr for boolean', () => {
      const expected: LitExpr = { expr: 'lit', value: true };
      const result = lit(true);
      expect(result).toEqual(expected);
    });

    it('should return correct LitExpr for null', () => {
      const expected: LitExpr = { expr: 'lit', value: null };
      const result = lit(null);
      expect(result).toEqual(expected);
    });

    it('should return correct LitExpr for array', () => {
      const expected: LitExpr = { expr: 'lit', value: [1, 2, 3] };
      const result = lit([1, 2, 3]);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 2: state('count') --------------------
  describe('state', () => {
    it('should return correct StateExpr', () => {
      const expected: StateExpr = { expr: 'state', name: 'count' };
      const result = state('count');
      expect(result).toEqual(expected);
    });

    it('should return StateExpr with path', () => {
      const expected: StateExpr = { expr: 'state', name: 'user', path: 'name' };
      const result = state('user', 'name');
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 3: variable('item') --------------------
  describe('variable', () => {
    it('should return correct VarExpr', () => {
      const expected: VarExpr = { expr: 'var', name: 'item' };
      const result = variable('item');
      expect(result).toEqual(expected);
    });

    it('should return VarExpr with path', () => {
      const expected: VarExpr = { expr: 'var', name: 'item', path: 'id' };
      const result = variable('item', 'id');
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 4: bin('+', left, right) --------------------
  describe('bin', () => {
    it('should return correct BinExpr for addition', () => {
      const left = lit(1);
      const right = lit(2);
      const expected: BinExpr = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 1 },
        right: { expr: 'lit', value: 2 },
      };
      const result = bin('+', left, right);
      expect(result).toEqual(expected);
    });

    it('should return correct BinExpr for comparison', () => {
      const left = state('count');
      const right = lit(10);
      const expected: BinExpr = {
        expr: 'bin',
        op: '>',
        left: { expr: 'state', name: 'count' },
        right: { expr: 'lit', value: 10 },
      };
      const result = bin('>', left, right);
      expect(result).toEqual(expected);
    });

    it('should return correct BinExpr for logical operators', () => {
      const left = lit(true);
      const right = lit(false);
      const expected: BinExpr = {
        expr: 'bin',
        op: '&&',
        left: { expr: 'lit', value: true },
        right: { expr: 'lit', value: false },
      };
      const result = bin('&&', left, right);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 5: add(left, right) shorthand --------------------
  describe('add', () => {
    it('should be shorthand for bin(\'+\')', () => {
      const left = lit(1);
      const right = lit(2);
      const expected: BinExpr = {
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 1 },
        right: { expr: 'lit', value: 2 },
      };
      const result = add(left, right);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 6: eq(left, right) shorthand --------------------
  describe('eq', () => {
    it('should be shorthand for bin(\'==\')', () => {
      const left = state('count');
      const right = lit(0);
      const expected: BinExpr = {
        expr: 'bin',
        op: '==',
        left: { expr: 'state', name: 'count' },
        right: { expr: 'lit', value: 0 },
      };
      const result = eq(left, right);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 7: not(expr) --------------------
  describe('not', () => {
    it('should return correct NotExpr', () => {
      const operand = state('isActive');
      const expected: NotExpr = {
        expr: 'not',
        operand: { expr: 'state', name: 'isActive' },
      };
      const result = not(operand);
      expect(result).toEqual(expected);
    });

    it('should handle nested not expressions', () => {
      const inner = not(lit(true));
      const expected: NotExpr = {
        expr: 'not',
        operand: {
          expr: 'not',
          operand: { expr: 'lit', value: true },
        },
      };
      const result = not(inner);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 8: cond(if, then, else) --------------------
  describe('cond', () => {
    it('should return correct CondExpr', () => {
      const condition = state('isVisible');
      const thenExpr = lit('shown');
      const elseExpr = lit('hidden');
      const expected: CondExpr = {
        expr: 'cond',
        if: { expr: 'state', name: 'isVisible' },
        then: { expr: 'lit', value: 'shown' },
        else: { expr: 'lit', value: 'hidden' },
      };
      const result = cond(condition, thenExpr, elseExpr);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 9: get(base, 'path') --------------------
  describe('get', () => {
    it('should return correct GetExpr', () => {
      const base = state('user');
      const expected: GetExpr = {
        expr: 'get',
        base: { expr: 'state', name: 'user' },
        path: 'name',
      };
      const result = get(base, 'name');
      expect(result).toEqual(expected);
    });

    it('should handle nested paths', () => {
      const base = variable('item');
      const expected: GetExpr = {
        expr: 'get',
        base: { expr: 'var', name: 'item' },
        path: 'address.city',
      };
      const result = get(base, 'address.city');
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 10: and(left, right) chains properly --------------------
  describe('and', () => {
    it('should chain properly', () => {
      const a = lit(true);
      const b = state('isValid');
      const c = not(state('isDisabled'));
      
      // (a && b) && c
      const result = and(and(a, b), c);
      
      const expected: BinExpr = {
        expr: 'bin',
        op: '&&',
        left: {
          expr: 'bin',
          op: '&&',
          left: { expr: 'lit', value: true },
          right: { expr: 'state', name: 'isValid' },
        },
        right: {
          expr: 'not',
          operand: { expr: 'state', name: 'isDisabled' },
        },
      };
      expect(result).toEqual(expected);
    });
  });

  // Additional shorthand tests
  describe('arithmetic shorthands', () => {
    it('sub should be shorthand for bin(\'-\')', () => {
      const result = sub(lit(5), lit(3));
      expect(result).toEqual({
        expr: 'bin',
        op: '-',
        left: { expr: 'lit', value: 5 },
        right: { expr: 'lit', value: 3 },
      });
    });

    it('mul should be shorthand for bin(\'*\')', () => {
      const result = mul(lit(2), lit(3));
      expect(result).toEqual({
        expr: 'bin',
        op: '*',
        left: { expr: 'lit', value: 2 },
        right: { expr: 'lit', value: 3 },
      });
    });

    it('divide should be shorthand for bin(\'/\')', () => {
      const result = divide(lit(10), lit(2));
      expect(result).toEqual({
        expr: 'bin',
        op: '/',
        left: { expr: 'lit', value: 10 },
        right: { expr: 'lit', value: 2 },
      });
    });
  });

  describe('comparison shorthands', () => {
    it('neq should be shorthand for bin(\'!=\')', () => {
      const result = neq(state('x'), lit(0));
      expect(result).toEqual({
        expr: 'bin',
        op: '!=',
        left: { expr: 'state', name: 'x' },
        right: { expr: 'lit', value: 0 },
      });
    });

    it('lt should be shorthand for bin(\'<\')', () => {
      const result = lt(state('count'), lit(10));
      expect(result).toEqual({
        expr: 'bin',
        op: '<',
        left: { expr: 'state', name: 'count' },
        right: { expr: 'lit', value: 10 },
      });
    });

    it('lte should be shorthand for bin(\'<=\')', () => {
      const result = lte(state('count'), lit(10));
      expect(result).toEqual({
        expr: 'bin',
        op: '<=',
        left: { expr: 'state', name: 'count' },
        right: { expr: 'lit', value: 10 },
      });
    });

    it('gt should be shorthand for bin(\'>\')', () => {
      const result = gt(state('count'), lit(0));
      expect(result).toEqual({
        expr: 'bin',
        op: '>',
        left: { expr: 'state', name: 'count' },
        right: { expr: 'lit', value: 0 },
      });
    });

    it('gte should be shorthand for bin(\'>=\')', () => {
      const result = gte(state('count'), lit(0));
      expect(result).toEqual({
        expr: 'bin',
        op: '>=',
        left: { expr: 'state', name: 'count' },
        right: { expr: 'lit', value: 0 },
      });
    });

    it('or should be shorthand for bin(\'||\')', () => {
      const result = or(state('a'), state('b'));
      expect(result).toEqual({
        expr: 'bin',
        op: '||',
        left: { expr: 'state', name: 'a' },
        right: { expr: 'state', name: 'b' },
      });
    });
  });
});

// ==================== State Builders ====================

describe('State Builders', () => {
  // -------------------- Test 11: numberField(0) --------------------
  describe('numberField', () => {
    it('should return correct NumberField', () => {
      const expected: NumberField = { type: 'number', initial: 0 };
      const result = numberField(0);
      expect(result).toEqual(expected);
    });

    it('should handle negative numbers', () => {
      const expected: NumberField = { type: 'number', initial: -10 };
      const result = numberField(-10);
      expect(result).toEqual(expected);
    });

    it('should handle floating point numbers', () => {
      const expected: NumberField = { type: 'number', initial: 3.14 };
      const result = numberField(3.14);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 12: stringField('') --------------------
  describe('stringField', () => {
    it('should return correct StringField', () => {
      const expected: StringField = { type: 'string', initial: '' };
      const result = stringField('');
      expect(result).toEqual(expected);
    });

    it('should handle non-empty strings', () => {
      const expected: StringField = { type: 'string', initial: 'hello world' };
      const result = stringField('hello world');
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 13: listField([]) --------------------
  describe('listField', () => {
    it('should return correct ListField with empty array', () => {
      const expected: ListField = { type: 'list', initial: [] };
      const result = listField([]);
      expect(result).toEqual(expected);
    });

    it('should handle arrays with initial items', () => {
      const expected: ListField = { type: 'list', initial: ['a', 'b', 'c'] };
      const result = listField(['a', 'b', 'c']);
      expect(result).toEqual(expected);
    });

    it('should handle arrays with mixed types', () => {
      const expected: ListField = { type: 'list', initial: [1, 'two', { three: 3 }] };
      const result = listField([1, 'two', { three: 3 }]);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 14: booleanField(true) --------------------
  describe('booleanField', () => {
    it('should return correct BooleanField with true', () => {
      const expected: BooleanField = { type: 'boolean', initial: true };
      const result = booleanField(true);
      expect(result).toEqual(expected);
    });

    it('should return correct BooleanField with false', () => {
      const expected: BooleanField = { type: 'boolean', initial: false };
      const result = booleanField(false);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 15: objectField({}) --------------------
  describe('objectField', () => {
    it('should return correct ObjectField with empty object', () => {
      const expected: ObjectField = { type: 'object', initial: {} };
      const result = objectField({});
      expect(result).toEqual(expected);
    });

    it('should handle objects with properties', () => {
      const expected: ObjectField = {
        type: 'object',
        initial: { name: 'John', age: 30 },
      };
      const result = objectField({ name: 'John', age: 30 });
      expect(result).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const expected: ObjectField = {
        type: 'object',
        initial: { user: { name: 'John', address: { city: 'NYC' } } },
      };
      const result = objectField({ user: { name: 'John', address: { city: 'NYC' } } });
      expect(result).toEqual(expected);
    });
  });
});

// ==================== Action Builders ====================

describe('Action Builders', () => {
  // -------------------- Test 16: action('name', steps) --------------------
  describe('action', () => {
    it('should return correct ActionDefinition', () => {
      const steps: SetStep[] = [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }];
      const expected: ActionDefinition = {
        name: 'reset',
        steps,
      };
      const result = action('reset', steps);
      expect(result).toEqual(expected);
    });

    it('should handle empty steps array', () => {
      const expected: ActionDefinition = {
        name: 'noop',
        steps: [],
      };
      const result = action('noop', []);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 17: set('target', value) --------------------
  describe('set', () => {
    it('should return correct SetStep', () => {
      const value = lit(0);
      const expected: SetStep = {
        do: 'set',
        target: 'count',
        value: { expr: 'lit', value: 0 },
      };
      const result = set('count', value);
      expect(result).toEqual(expected);
    });

    it('should handle state expression as value', () => {
      const value = state('defaultValue');
      const expected: SetStep = {
        do: 'set',
        target: 'current',
        value: { expr: 'state', name: 'defaultValue' },
      };
      const result = set('current', value);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 18: update('target', 'increment') --------------------
  describe('update', () => {
    it('should return correct UpdateStep', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'count',
        operation: 'increment',
      };
      const result = update('count', 'increment');
      expect(result).toEqual(expected);
    });

    it('should handle update with value', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'todos',
        operation: 'push',
        value: { expr: 'lit', value: 'new item' },
      };
      const result = update('todos', 'push', lit('new item'));
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 19: increment('target') shorthand --------------------
  describe('increment', () => {
    it('should be shorthand for update with increment operation', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'count',
        operation: 'increment',
      };
      const result = increment('count');
      expect(result).toEqual(expected);
    });

    it('should handle increment with custom value', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'count',
        operation: 'increment',
        value: { expr: 'lit', value: 5 },
      };
      const result = increment('count', lit(5));
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 20: push('target', value) shorthand --------------------
  describe('push', () => {
    it('should be shorthand for update with push operation', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'items',
        operation: 'push',
        value: { expr: 'lit', value: 'new item' },
      };
      const result = push('items', lit('new item'));
      expect(result).toEqual(expected);
    });
  });

  // Additional action shorthands
  describe('decrement', () => {
    it('should be shorthand for update with decrement operation', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'count',
        operation: 'decrement',
      };
      const result = decrement('count');
      expect(result).toEqual(expected);
    });
  });

  describe('pop', () => {
    it('should be shorthand for update with pop operation', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'items',
        operation: 'pop',
      };
      const result = pop('items');
      expect(result).toEqual(expected);
    });
  });

  describe('toggle', () => {
    it('should be shorthand for update with toggle operation', () => {
      const expected: UpdateStep = {
        do: 'update',
        target: 'isVisible',
        operation: 'toggle',
      };
      const result = toggle('isVisible');
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 21: fetch(url) --------------------
  describe('fetch', () => {
    it('should return correct FetchStep with minimal options', () => {
      const expected: FetchStep = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
      };
      const result = fetch(lit('/api/data'));
      expect(result).toEqual(expected);
    });

    it('should handle fetch with all options', () => {
      const expected: FetchStep = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
        method: 'POST',
        body: { expr: 'state', name: 'formData' },
        result: 'response',
        onSuccess: [{ do: 'set', target: 'data', value: { expr: 'var', name: 'result' } }],
        onError: [{ do: 'set', target: 'error', value: { expr: 'var', name: 'error' } }],
      };
      const result = fetch(lit('/api/data'), {
        method: 'POST',
        body: state('formData'),
        result: 'response',
        onSuccess: [set('data', variable('result'))],
        onError: [set('error', variable('error'))],
      });
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 22: navigate(url) --------------------
  describe('navigate', () => {
    it('should return correct NavigateStep', () => {
      const expected: NavigateStep = {
        do: 'navigate',
        url: { expr: 'lit', value: '/home' },
      };
      const result = navigate(lit('/home'));
      expect(result).toEqual(expected);
    });

    it('should handle navigate with target', () => {
      const expected: NavigateStep = {
        do: 'navigate',
        url: { expr: 'lit', value: '/external' },
        target: '_blank',
      };
      const result = navigate(lit('/external'), { target: '_blank' });
      expect(result).toEqual(expected);
    });

    it('should handle navigate with replace', () => {
      const expected: NavigateStep = {
        do: 'navigate',
        url: { expr: 'lit', value: '/new-page' },
        replace: true,
      };
      const result = navigate(lit('/new-page'), { replace: true });
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 23: Complex action with multiple steps --------------------
  describe('complex action', () => {
    it('should handle multiple steps', () => {
      const expected: ActionDefinition = {
        name: 'submitForm',
        steps: [
          { do: 'set', target: 'isLoading', value: { expr: 'lit', value: true } },
          {
            do: 'fetch',
            url: { expr: 'lit', value: '/api/submit' },
            method: 'POST',
            body: { expr: 'state', name: 'formData' },
          },
          { do: 'set', target: 'isLoading', value: { expr: 'lit', value: false } },
        ],
      };
      const result = action('submitForm', [
        set('isLoading', lit(true)),
        fetch(lit('/api/submit'), { method: 'POST', body: state('formData') }),
        set('isLoading', lit(false)),
      ]);
      expect(result).toEqual(expected);
    });
  });
});

// ==================== View Builders ====================

describe('View Builders', () => {
  // -------------------- Test 24: element('div', props, children) --------------------
  describe('element', () => {
    it('should return correct ElementNode', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'div',
      };
      const result = element('div');
      expect(result).toEqual(expected);
    });

    it('should handle element with props', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          class: { expr: 'lit', value: 'container' },
        },
      };
      const result = element('div', { class: lit('container') });
      expect(result).toEqual(expected);
    });

    it('should handle element with children', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
        ],
      };
      const result = element('div', {}, [text(lit('Hello'))]);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 25: div(props, children) shorthand --------------------
  describe('div', () => {
    it('should be shorthand for element(\'div\')', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'wrapper' } },
      };
      const result = div({ class: lit('wrapper') });
      expect(result).toEqual(expected);
    });
  });

  describe('span', () => {
    it('should be shorthand for element(\'span\')', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'span',
        children: [{ kind: 'text', value: { expr: 'lit', value: 'text' } }],
      };
      const result = span({}, [text(lit('text'))]);
      expect(result).toEqual(expected);
    });
  });

  describe('button', () => {
    it('should be shorthand for element(\'button\')', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'button',
        props: { type: { expr: 'lit', value: 'submit' } },
      };
      const result = button({ type: lit('submit') });
      expect(result).toEqual(expected);
    });
  });

  describe('input', () => {
    it('should be shorthand for element(\'input\')', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' },
          value: { expr: 'state', name: 'inputValue' },
        },
      };
      const result = input({ type: lit('text'), value: state('inputValue') });
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 26: text(expr) --------------------
  describe('text', () => {
    it('should return correct TextNode', () => {
      const expected: TextNode = {
        kind: 'text',
        value: { expr: 'lit', value: 'Hello World' },
      };
      const result = text(lit('Hello World'));
      expect(result).toEqual(expected);
    });

    it('should handle state expression', () => {
      const expected: TextNode = {
        kind: 'text',
        value: { expr: 'state', name: 'message' },
      };
      const result = text(state('message'));
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 27: ifNode(cond, then, else) --------------------
  describe('ifNode', () => {
    it('should return correct IfNode', () => {
      const expected: IfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'isVisible' },
        then: { kind: 'element', tag: 'div' },
      };
      const result = ifNode(state('isVisible'), element('div'));
      expect(result).toEqual(expected);
    });

    it('should handle else branch', () => {
      const expected: IfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'isVisible' },
        then: { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Hidden' } },
      };
      const result = ifNode(
        state('isVisible'),
        text(lit('Visible')),
        text(lit('Hidden'))
      );
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 28: each(items, 'item', body) --------------------
  describe('each', () => {
    it('should return correct EachNode', () => {
      const expected: EachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        as: 'todo',
        body: { kind: 'element', tag: 'li' },
      };
      const result = each(state('todos'), 'todo', element('li'));
      expect(result).toEqual(expected);
    });

    it('should handle index parameter', () => {
      const expected: EachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'idx',
        body: { kind: 'element', tag: 'div' },
      };
      const result = each(state('items'), 'item', element('div'), { index: 'idx' });
      expect(result).toEqual(expected);
    });

    it('should handle key expression', () => {
      const expected: EachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'users' },
        as: 'user',
        key: { expr: 'var', name: 'user', path: 'id' },
        body: { kind: 'element', tag: 'div' },
      };
      const result = each(state('users'), 'user', element('div'), {
        key: variable('user', 'id'),
      });
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 29: component('Name', props) --------------------
  describe('component', () => {
    it('should return correct ComponentNode', () => {
      const expected: ComponentNode = {
        kind: 'component',
        name: 'Button',
      };
      const result = component('Button');
      expect(result).toEqual(expected);
    });

    it('should handle component with props', () => {
      const expected: ComponentNode = {
        kind: 'component',
        name: 'Card',
        props: { title: { expr: 'lit', value: 'Hello' } },
      };
      const result = component('Card', { title: lit('Hello') });
      expect(result).toEqual(expected);
    });

    it('should handle component with children', () => {
      const expected: ComponentNode = {
        kind: 'component',
        name: 'Layout',
        children: [{ kind: 'element', tag: 'div' }],
      };
      const result = component('Layout', {}, [element('div')]);
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 30: slot('name') --------------------
  describe('slot', () => {
    it('should return correct SlotNode', () => {
      const expected: SlotNode = { kind: 'slot' };
      const result = slot();
      expect(result).toEqual(expected);
    });

    it('should handle named slot', () => {
      const expected: SlotNode = { kind: 'slot', name: 'header' };
      const result = slot('header');
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 31: Nested view tree construction --------------------
  describe('nested view tree', () => {
    it('should construct nested view tree correctly', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'container' } },
        children: [
          {
            kind: 'element',
            tag: 'h1',
            children: [{ kind: 'text', value: { expr: 'state', name: 'title' } }],
          },
          {
            kind: 'element',
            tag: 'ul',
            children: [
              {
                kind: 'each',
                items: { expr: 'state', name: 'items' },
                as: 'item',
                body: {
                  kind: 'element',
                  tag: 'li',
                  children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
                },
              },
            ],
          },
        ],
      };

      const result = div(
        { class: lit('container') },
        [
          element('h1', {}, [text(state('title'))]),
          element('ul', {}, [
            each(state('items'), 'item', element('li', {}, [text(variable('item'))])),
          ]),
        ]
      );
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 32: Props with expressions --------------------
  describe('props with expressions', () => {
    it('should handle dynamic class', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          class: {
            expr: 'cond',
            if: { expr: 'state', name: 'isActive' },
            then: { expr: 'lit', value: 'active' },
            else: { expr: 'lit', value: 'inactive' },
          },
        },
      };
      const result = div({
        class: cond(state('isActive'), lit('active'), lit('inactive')),
      });
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 33: Props with event handlers --------------------
  describe('props with event handlers', () => {
    it('should handle event handler props', () => {
      const expected: ElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: { event: 'click', action: 'handleClick' },
        },
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Click me' } }],
      };
      const result = button(
        { onClick: onClick('handleClick') },
        [text(lit('Click me'))]
      );
      expect(result).toEqual(expected);
    });
  });
});

// ==================== Event Builders ====================

describe('Event Builders', () => {
  // -------------------- Test 34: onClick('action') --------------------
  describe('onClick', () => {
    it('should return correct EventHandler', () => {
      const expected: EventHandler = {
        event: 'click',
        action: 'handleClick',
      };
      const result = onClick('handleClick');
      expect(result).toEqual(expected);
    });

    it('should handle onClick with payload', () => {
      const expected: EventHandler = {
        event: 'click',
        action: 'selectItem',
        payload: { expr: 'var', name: 'item', path: 'id' },
      };
      const result = onClick('selectItem', variable('item', 'id'));
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 35: onInput('action') with default payload --------------------
  describe('onInput', () => {
    it('should include default payload', () => {
      const expected: EventHandler = {
        event: 'input',
        action: 'updateText',
        payload: { expr: 'var', name: 'event', path: 'target.value' },
      };
      const result = onInput('updateText');
      expect(result).toEqual(expected);
    });

    it('should allow custom payload override', () => {
      const expected: EventHandler = {
        event: 'input',
        action: 'updateValue',
        payload: { expr: 'lit', value: 'custom' },
      };
      const result = onInput('updateValue', lit('custom'));
      expect(result).toEqual(expected);
    });
  });

  // -------------------- Test 36: Event with custom payload --------------------
  describe('onChange', () => {
    it('should return correct EventHandler', () => {
      const expected: EventHandler = {
        event: 'change',
        action: 'handleChange',
        payload: { expr: 'var', name: 'event', path: 'target.value' },
      };
      const result = onChange('handleChange');
      expect(result).toEqual(expected);
    });
  });

  describe('onSubmit', () => {
    it('should return correct EventHandler', () => {
      const expected: EventHandler = {
        event: 'submit',
        action: 'handleSubmit',
      };
      const result = onSubmit('handleSubmit');
      expect(result).toEqual(expected);
    });
  });
});

// ==================== Program Builder ====================

describe('Program Builder', () => {
  // -------------------- Test 37: createProgram(options) --------------------
  describe('createProgram', () => {
    it('should return valid Program', () => {
      const result = createProgram({
        state: { count: numberField(0) },
        actions: [],
        view: text(lit('Hello')),
      });
      expect(result.version).toBe('1.0');
      expect(result.state).toEqual({ count: { type: 'number', initial: 0 } });
      expect(result.actions).toEqual([]);
      expect(result.view).toEqual({ kind: 'text', value: { expr: 'lit', value: 'Hello' } });
    });

    // -------------------- Test 38: Program with all fields --------------------
    it('should handle program with all fields', () => {
      const program = createProgram({
        route: {
          path: '/counter',
          title: lit('Counter App'),
        },
        state: {
          count: numberField(0),
          message: stringField(''),
        },
        actions: [
          action('increment', [increment('count')]),
          action('reset', [set('count', lit(0))]),
        ],
        view: div({}, [
          text(state('count')),
          button({ onClick: onClick('increment') }, [text(lit('+'))]),
        ]),
        components: {
          Display: {
            params: { value: { type: 'number', required: true } },
            view: text(lit('display')),
          },
        },
      });

      expect(program.version).toBe('1.0');
      expect(program.route).toEqual({
        path: '/counter',
        title: { expr: 'lit', value: 'Counter App' },
      });
      expect(program.state).toHaveProperty('count');
      expect(program.state).toHaveProperty('message');
      expect(program.actions).toHaveLength(2);
      expect(program.components).toHaveProperty('Display');
    });

    // -------------------- Test 39: Program output matches JSON structure --------------------
    it('should output match JSON structure', () => {
      const program = createProgram({
        state: { value: numberField(42) },
        actions: [action('setValue', [set('value', lit(100))])],
        view: text(state('value')),
      });

      // Verify the structure is JSON-serializable and matches expected format
      const json = JSON.stringify(program);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({
        version: '1.0',
        state: { value: { type: 'number', initial: 42 } },
        actions: [
          {
            name: 'setValue',
            steps: [{ do: 'set', target: 'value', value: { expr: 'lit', value: 100 } }],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      });
    });

    // -------------------- Test 40: Built program compiles successfully --------------------
    it('should create structurally valid program', () => {
      const program = createProgram({
        state: {
          items: listField([]),
          input: stringField(''),
        },
        actions: [
          action('addItem', [
            push('items', state('input')),
            set('input', lit('')),
          ]),
        ],
        view: div({}, [
          input({
            value: state('input'),
            onInput: onInput('updateInput'),
          }),
          button({ onClick: onClick('addItem') }, [text(lit('Add'))]),
          each(state('items'), 'item', element('li', {}, [text(variable('item'))])),
        ]),
      });

      // Verify required fields exist
      expect(program.version).toBe('1.0');
      expect(program.state).toBeDefined();
      expect(program.actions).toBeDefined();
      expect(program.view).toBeDefined();
      
      // Verify types
      expect(typeof program.state).toBe('object');
      expect(Array.isArray(program.actions)).toBe(true);
      expect(typeof program.view).toBe('object');
    });

    // -------------------- Test 41: Counter example --------------------
    it('should build counter example with correct structure', () => {
      const counter = createProgram({
        state: { count: numberField(0) },
        actions: [
          action('increment', [increment('count')]),
          action('decrement', [decrement('count')]),
          action('reset', [set('count', lit(0))]),
        ],
        view: div({ class: lit('counter') }, [
          text(state('count')),
          div({ class: lit('buttons') }, [
            button({ onClick: onClick('decrement') }, [text(lit('-'))]),
            button({ onClick: onClick('reset') }, [text(lit('Reset'))]),
            button({ onClick: onClick('increment') }, [text(lit('+'))]),
          ]),
        ]),
      });

      // Verify the counter program structure
      expect(counter.version).toBe('1.0');
      expect(counter.state.count).toEqual({ type: 'number', initial: 0 });
      expect(counter.actions).toHaveLength(3);
      expect(counter.actions.map(a => a.name)).toEqual(['increment', 'decrement', 'reset']);
      
      // Verify view structure
      expect(counter.view.kind).toBe('element');
      expect((counter.view as ElementNode).tag).toBe('div');
      expect((counter.view as ElementNode).children).toHaveLength(2);
    });
  });
});
