/**
 * Test module for the unified evaluate() function.
 *
 * Coverage:
 * - lit: literal values (string, number, boolean, null)
 * - state: reads from state with optional path
 * - local: reads from locals
 * - var: locals, dot notation, path, fallback to globals, function binding, prototype pollution
 * - bin: all operators (+, -, *, /, %, ==, !=, <, <=, >, >=, &&, ||), short-circuit
 * - not: negation
 * - cond: conditional (if/then/else)
 * - get: property access, prototype pollution prevention
 * - route: param, query, path sources
 * - import: basic and with path
 * - data: basic and with path
 * - ref: delegates to env.resolveRef
 * - index: dynamic property access, prototype pollution prevention
 * - param: always returns undefined
 * - style: delegates to evaluateStyle
 * - concat: joins items as strings
 * - validity: delegates to env.resolveValidity
 * - call: global function, array methods, string methods, Math, Date, env.callFunction
 * - lambda: returns undefined when evaluated directly
 * - array: evaluates elements
 * - obj: evaluates props
 *
 * TDD Red Phase: ALL tests MUST FAIL because the module does not exist yet.
 */

import { describe, it, expect, vi } from 'vitest';

import type { CoreEvaluationContext, EnvironmentAdapter, StateReader } from '../index.js';
import { evaluate, SAFE_ARRAY_METHODS, SAFE_STRING_METHODS, SAFE_MATH_METHODS, SAFE_DATE_STATIC_METHODS, SAFE_DATE_INSTANCE_METHODS, FORBIDDEN_KEYS } from '../index.js';

// ==================== Test Helpers ====================

function makeCtx(overrides?: Partial<CoreEvaluationContext>): CoreEvaluationContext {
  const stateMap = new Map<string, unknown>();
  return {
    state: { get: (name: string) => stateMap.get(name) },
    locals: {},
    env: {
      resolveRef: () => null,
      resolveValidity: () => false,
      resolveGlobal: () => undefined,
    },
    ...overrides,
  };
}

function makeStateReader(entries: Record<string, unknown>): StateReader {
  const map = new Map<string, unknown>(Object.entries(entries));
  return { get: (name: string) => map.get(name) };
}

// ==================== Constants ====================

describe('exported constants', () => {
  it('should export SAFE_ARRAY_METHODS as a Set', () => {
    expect(SAFE_ARRAY_METHODS).toBeInstanceOf(Set);
    expect(SAFE_ARRAY_METHODS.has('map')).toBe(true);
    expect(SAFE_ARRAY_METHODS.has('filter')).toBe(true);
    expect(SAFE_ARRAY_METHODS.has('splice')).toBe(false);
  });

  it('should export SAFE_STRING_METHODS as a Set', () => {
    expect(SAFE_STRING_METHODS).toBeInstanceOf(Set);
    expect(SAFE_STRING_METHODS.has('trim')).toBe(true);
    expect(SAFE_STRING_METHODS.has('eval')).toBe(false);
  });

  it('should export SAFE_MATH_METHODS as a Set', () => {
    expect(SAFE_MATH_METHODS).toBeInstanceOf(Set);
    expect(SAFE_MATH_METHODS.has('round')).toBe(true);
  });

  it('should export SAFE_DATE_STATIC_METHODS as a Set', () => {
    expect(SAFE_DATE_STATIC_METHODS).toBeInstanceOf(Set);
    expect(SAFE_DATE_STATIC_METHODS.has('now')).toBe(true);
    expect(SAFE_DATE_STATIC_METHODS.has('parse')).toBe(true);
  });

  it('should export SAFE_DATE_INSTANCE_METHODS as a Set', () => {
    expect(SAFE_DATE_INSTANCE_METHODS).toBeInstanceOf(Set);
    expect(SAFE_DATE_INSTANCE_METHODS.has('getFullYear')).toBe(true);
    expect(SAFE_DATE_INSTANCE_METHODS.has('toISOString')).toBe(true);
  });

  it('should export FORBIDDEN_KEYS as a Set', () => {
    expect(FORBIDDEN_KEYS).toBeInstanceOf(Set);
    expect(FORBIDDEN_KEYS.has('__proto__')).toBe(true);
    expect(FORBIDDEN_KEYS.has('constructor')).toBe(true);
    expect(FORBIDDEN_KEYS.has('prototype')).toBe(true);
  });
});

// ==================== lit ====================

describe('evaluate - lit', () => {
  it('should return a string literal', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'lit', value: 'hello' }, ctx)).toBe('hello');
  });

  it('should return a number literal', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'lit', value: 42 }, ctx)).toBe(42);
  });

  it('should return a boolean literal', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'lit', value: true }, ctx)).toBe(true);
    expect(evaluate({ expr: 'lit', value: false }, ctx)).toBe(false);
  });

  it('should return null literal', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'lit', value: null }, ctx)).toBeNull();
  });
});

// ==================== state ====================

describe('evaluate - state', () => {
  it('should read a value from state', () => {
    const ctx = makeCtx({ state: makeStateReader({ count: 10 }) });
    expect(evaluate({ expr: 'state', name: 'count' }, ctx)).toBe(10);
  });

  it('should return undefined for missing state', () => {
    const ctx = makeCtx({ state: makeStateReader({}) });
    expect(evaluate({ expr: 'state', name: 'missing' }, ctx)).toBeUndefined();
  });

  it('should access nested state via path', () => {
    const ctx = makeCtx({
      state: makeStateReader({ user: { name: 'Alice', address: { city: 'Tokyo' } } }),
    });
    expect(evaluate({ expr: 'state', name: 'user', path: 'name' }, ctx)).toBe('Alice');
    expect(evaluate({ expr: 'state', name: 'user', path: 'address.city' }, ctx)).toBe('Tokyo');
  });
});

// ==================== local ====================

describe('evaluate - local', () => {
  it('should read a value from locals', () => {
    const ctx = makeCtx({ locals: { item: 'apple' } });
    expect(evaluate({ expr: 'local', name: 'item' }, ctx)).toBe('apple');
  });

  it('should return undefined for missing local', () => {
    const ctx = makeCtx({ locals: {} });
    expect(evaluate({ expr: 'local', name: 'missing' }, ctx)).toBeUndefined();
  });
});

// ==================== var ====================

describe('evaluate - var', () => {
  it('should read a value from locals', () => {
    const ctx = makeCtx({ locals: { x: 42 } });
    expect(evaluate({ expr: 'var', name: 'x' }, ctx)).toBe(42);
  });

  it('should handle dot notation in name', () => {
    const ctx = makeCtx({ locals: { user: { name: 'Bob' } } });
    expect(evaluate({ expr: 'var', name: 'user.name' }, ctx)).toBe('Bob');
  });

  it('should handle explicit path property', () => {
    const ctx = makeCtx({ locals: { user: { address: { city: 'Osaka' } } } });
    expect(evaluate({ expr: 'var', name: 'user', path: 'address.city' }, ctx)).toBe('Osaka');
  });

  it('should combine dot notation and path', () => {
    const ctx = makeCtx({ locals: { a: { b: { c: { d: 'deep' } } } } });
    expect(evaluate({ expr: 'var', name: 'a.b', path: 'c.d' }, ctx)).toBe('deep');
  });

  it('should fallback to globals via env.resolveGlobal', () => {
    const ctx = makeCtx({
      locals: {},
      env: {
        resolveRef: () => null,
        resolveValidity: () => false,
        resolveGlobal: (name: string) => (name === 'Math' ? Math : undefined),
      },
    });
    expect(evaluate({ expr: 'var', name: 'Math' }, ctx)).toBe(Math);
  });

  it('should bind functions via env.bindFunction when traversing path', () => {
    const obj = {
      greet: function () {
        return `hello from ${(this as { name: string }).name}`;
      },
      name: 'world',
    };
    const bindFn = vi.fn((fn: Function, parent: unknown) => fn.bind(parent));
    const ctx = makeCtx({
      locals: { obj },
      env: {
        resolveRef: () => null,
        resolveValidity: () => false,
        resolveGlobal: () => undefined,
        bindFunction: bindFn,
      },
    });
    const result = evaluate({ expr: 'var', name: 'obj.greet' }, ctx);
    expect(typeof result).toBe('function');
    expect(bindFn).toHaveBeenCalled();
  });

  it('should prevent prototype pollution', () => {
    const ctx = makeCtx({ locals: { obj: {} } });
    expect(evaluate({ expr: 'var', name: 'obj.__proto__' }, ctx)).toBeUndefined();
    expect(evaluate({ expr: 'var', name: 'obj.constructor' }, ctx)).toBeUndefined();
    expect(evaluate({ expr: 'var', name: 'obj.prototype' }, ctx)).toBeUndefined();
  });
});

// ==================== bin ====================

describe('evaluate - bin', () => {
  // ==================== Arithmetic ====================

  it('should add two numbers', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '+' as const,
      left: { expr: 'lit' as const, value: 3 },
      right: { expr: 'lit' as const, value: 4 },
    };
    expect(evaluate(expr, ctx)).toBe(7);
  });

  it('should concatenate strings with +', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '+' as const,
      left: { expr: 'lit' as const, value: 'hello' },
      right: { expr: 'lit' as const, value: ' world' },
    };
    expect(evaluate(expr, ctx)).toBe('hello world');
  });

  it('should subtract two numbers', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '-' as const,
      left: { expr: 'lit' as const, value: 10 },
      right: { expr: 'lit' as const, value: 3 },
    };
    expect(evaluate(expr, ctx)).toBe(7);
  });

  it('should multiply two numbers', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '*' as const,
      left: { expr: 'lit' as const, value: 5 },
      right: { expr: 'lit' as const, value: 6 },
    };
    expect(evaluate(expr, ctx)).toBe(30);
  });

  it('should divide two numbers', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '/' as const,
      left: { expr: 'lit' as const, value: 10 },
      right: { expr: 'lit' as const, value: 2 },
    };
    expect(evaluate(expr, ctx)).toBe(5);
  });

  it('should handle division by zero', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '/' as const,
      left: { expr: 'lit' as const, value: 10 },
      right: { expr: 'lit' as const, value: 0 },
    };
    expect(evaluate(expr, ctx)).toBe(Infinity);
  });

  it('should compute modulo', () => {
    const ctx = makeCtx();
    const expr = {
      expr: 'bin' as const,
      op: '%' as const,
      left: { expr: 'lit' as const, value: 7 },
      right: { expr: 'lit' as const, value: 3 },
    };
    expect(evaluate(expr, ctx)).toBe(1);
  });

  // ==================== Comparison ====================

  it('should evaluate == (strict equality)', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        { expr: 'bin', op: '==', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 5 } },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluate(
        { expr: 'bin', op: '==', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: '5' } },
        ctx,
      ),
    ).toBe(false);
  });

  it('should evaluate != (strict inequality)', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        { expr: 'bin', op: '!=', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 3 } },
        ctx,
      ),
    ).toBe(true);
  });

  it('should evaluate < <= > >=', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        { expr: 'bin', op: '<', left: { expr: 'lit', value: 3 }, right: { expr: 'lit', value: 5 } },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluate(
        { expr: 'bin', op: '<=', left: { expr: 'lit', value: 5 }, right: { expr: 'lit', value: 5 } },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluate(
        { expr: 'bin', op: '>', left: { expr: 'lit', value: 7 }, right: { expr: 'lit', value: 3 } },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluate(
        { expr: 'bin', op: '>=', left: { expr: 'lit', value: 7 }, right: { expr: 'lit', value: 7 } },
        ctx,
      ),
    ).toBe(true);
  });

  // ==================== Logical ====================

  it('should evaluate && with short-circuit', () => {
    const ctx = makeCtx();
    // falsy left => returns left value, does NOT evaluate right
    expect(
      evaluate(
        { expr: 'bin', op: '&&', left: { expr: 'lit', value: false }, right: { expr: 'lit', value: 'never' } },
        ctx,
      ),
    ).toBe(false);
    // truthy left => returns right value
    expect(
      evaluate(
        { expr: 'bin', op: '&&', left: { expr: 'lit', value: 'a' }, right: { expr: 'lit', value: 'b' } },
        ctx,
      ),
    ).toBe('b');
  });

  it('should evaluate || with short-circuit', () => {
    const ctx = makeCtx();
    // truthy left => returns left value, does NOT evaluate right
    expect(
      evaluate(
        { expr: 'bin', op: '||', left: { expr: 'lit', value: 'a' }, right: { expr: 'lit', value: 'b' } },
        ctx,
      ),
    ).toBe('a');
    // falsy left => returns right value
    expect(
      evaluate(
        { expr: 'bin', op: '||', left: { expr: 'lit', value: '' }, right: { expr: 'lit', value: 'fallback' } },
        ctx,
      ),
    ).toBe('fallback');
  });
});

// ==================== not ====================

describe('evaluate - not', () => {
  it('should negate a truthy value', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'not', operand: { expr: 'lit', value: true } }, ctx)).toBe(false);
  });

  it('should negate a falsy value', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'not', operand: { expr: 'lit', value: '' } }, ctx)).toBe(true);
    expect(evaluate({ expr: 'not', operand: { expr: 'lit', value: 0 } }, ctx)).toBe(true);
  });
});

// ==================== cond ====================

describe('evaluate - cond', () => {
  it('should return then branch when condition is truthy', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        {
          expr: 'cond',
          if: { expr: 'lit', value: true },
          then: { expr: 'lit', value: 'yes' },
          else: { expr: 'lit', value: 'no' },
        },
        ctx,
      ),
    ).toBe('yes');
  });

  it('should return else branch when condition is falsy', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        {
          expr: 'cond',
          if: { expr: 'lit', value: false },
          then: { expr: 'lit', value: 'yes' },
          else: { expr: 'lit', value: 'no' },
        },
        ctx,
      ),
    ).toBe('no');
  });
});

// ==================== get ====================

describe('evaluate - get', () => {
  it('should access a property from an evaluated base', () => {
    const ctx = makeCtx({ locals: { user: { name: 'Charlie' } } });
    expect(
      evaluate({ expr: 'get', base: { expr: 'local', name: 'user' }, path: 'name' }, ctx),
    ).toBe('Charlie');
  });

  it('should access nested property via dot path', () => {
    const ctx = makeCtx({ locals: { data: { a: { b: { c: 99 } } } } });
    expect(
      evaluate({ expr: 'get', base: { expr: 'local', name: 'data' }, path: 'a.b.c' }, ctx),
    ).toBe(99);
  });

  it('should return undefined when base is null', () => {
    const ctx = makeCtx();
    expect(
      evaluate({ expr: 'get', base: { expr: 'lit', value: null }, path: 'x' }, ctx),
    ).toBeUndefined();
  });

  it('should prevent prototype pollution', () => {
    const ctx = makeCtx({ locals: { obj: {} } });
    expect(
      evaluate({ expr: 'get', base: { expr: 'local', name: 'obj' }, path: '__proto__' }, ctx),
    ).toBeUndefined();
    expect(
      evaluate({ expr: 'get', base: { expr: 'local', name: 'obj' }, path: 'constructor' }, ctx),
    ).toBeUndefined();
  });
});

// ==================== route ====================

describe('evaluate - route', () => {
  const routeCtx = makeCtx({
    route: { params: { id: '123' }, query: { q: 'search' }, path: '/users/123' },
  });

  it('should return route param', () => {
    expect(evaluate({ expr: 'route', name: 'id', source: 'param' }, routeCtx)).toBe('123');
  });

  it('should default source to param', () => {
    expect(evaluate({ expr: 'route', name: 'id' }, routeCtx)).toBe('123');
  });

  it('should return route query', () => {
    expect(evaluate({ expr: 'route', name: 'q', source: 'query' }, routeCtx)).toBe('search');
  });

  it('should return route path', () => {
    expect(evaluate({ expr: 'route', name: '', source: 'path' }, routeCtx)).toBe('/users/123');
  });

  it('should return empty string when no route context', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'route', name: 'id', source: 'param' }, ctx)).toBe('');
  });
});

// ==================== import ====================

describe('evaluate - import', () => {
  it('should return import value', () => {
    const ctx = makeCtx({ imports: { icons: { home: '<svg/>' } } });
    expect(evaluate({ expr: 'import', name: 'icons' }, ctx)).toEqual({ home: '<svg/>' });
  });

  it('should access import with path', () => {
    const ctx = makeCtx({ imports: { icons: { home: '<svg/>' } } });
    expect(evaluate({ expr: 'import', name: 'icons', path: 'home' }, ctx)).toBe('<svg/>');
  });

  it('should return undefined for missing import', () => {
    const ctx = makeCtx({ imports: {} });
    expect(evaluate({ expr: 'import', name: 'missing' }, ctx)).toBeUndefined();
  });
});

// ==================== data ====================

describe('evaluate - data', () => {
  it('should return data value from imports', () => {
    const ctx = makeCtx({ imports: { users: [{ name: 'Alice' }] } });
    expect(evaluate({ expr: 'data', name: 'users' }, ctx)).toEqual([{ name: 'Alice' }]);
  });

  it('should access data with path', () => {
    const ctx = makeCtx({ imports: { config: { theme: { color: 'blue' } } } });
    expect(evaluate({ expr: 'data', name: 'config', path: 'theme.color' }, ctx)).toBe('blue');
  });
});

// ==================== ref ====================

describe('evaluate - ref', () => {
  it('should delegate to env.resolveRef', () => {
    const mockElement = { tagName: 'INPUT' };
    const ctx = makeCtx({
      env: {
        resolveRef: (name: string) => (name === 'myInput' ? mockElement : null),
        resolveValidity: () => false,
        resolveGlobal: () => undefined,
      },
    });
    expect(evaluate({ expr: 'ref', name: 'myInput' }, ctx)).toBe(mockElement);
    expect(evaluate({ expr: 'ref', name: 'missing' }, ctx)).toBeNull();
  });
});

// ==================== index ====================

describe('evaluate - index', () => {
  it('should access array element by index', () => {
    const ctx = makeCtx({ locals: { arr: ['a', 'b', 'c'] } });
    expect(
      evaluate(
        { expr: 'index', base: { expr: 'local', name: 'arr' }, key: { expr: 'lit', value: 1 } },
        ctx,
      ),
    ).toBe('b');
  });

  it('should access object property by string key', () => {
    const ctx = makeCtx({ locals: { obj: { x: 10 } } });
    expect(
      evaluate(
        { expr: 'index', base: { expr: 'local', name: 'obj' }, key: { expr: 'lit', value: 'x' } },
        ctx,
      ),
    ).toBe(10);
  });

  it('should return undefined when base is null', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        { expr: 'index', base: { expr: 'lit', value: null }, key: { expr: 'lit', value: 0 } },
        ctx,
      ),
    ).toBeUndefined();
  });

  it('should prevent prototype pollution via index', () => {
    const ctx = makeCtx({ locals: { obj: {} } });
    expect(
      evaluate(
        {
          expr: 'index',
          base: { expr: 'local', name: 'obj' },
          key: { expr: 'lit', value: '__proto__' },
        },
        ctx,
      ),
    ).toBeUndefined();
  });
});

// ==================== param ====================

describe('evaluate - param', () => {
  it('should always return undefined', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'param', name: 'anything' }, ctx)).toBeUndefined();
  });
});

// ==================== concat ====================

describe('evaluate - concat', () => {
  it('should join items as strings', () => {
    const ctx = makeCtx({ locals: { name: 'World' } });
    expect(
      evaluate(
        {
          expr: 'concat',
          items: [
            { expr: 'lit', value: 'Hello, ' },
            { expr: 'local', name: 'name' },
            { expr: 'lit', value: '!' },
          ],
        },
        ctx,
      ),
    ).toBe('Hello, World!');
  });

  it('should convert null/undefined to empty string', () => {
    const ctx = makeCtx();
    expect(
      evaluate(
        {
          expr: 'concat',
          items: [
            { expr: 'lit', value: 'a' },
            { expr: 'lit', value: null },
            { expr: 'lit', value: 'b' },
          ],
        },
        ctx,
      ),
    ).toBe('ab');
  });
});

// ==================== validity ====================

describe('evaluate - validity', () => {
  it('should delegate to env.resolveValidity', () => {
    const ctx = makeCtx({
      env: {
        resolveRef: () => null,
        resolveValidity: (ref: string, property?: string) => {
          if (ref === 'email' && property === 'valid') return true;
          return false;
        },
        resolveGlobal: () => undefined,
      },
    });
    expect(evaluate({ expr: 'validity', ref: 'email', property: 'valid' }, ctx)).toBe(true);
    expect(evaluate({ expr: 'validity', ref: 'email', property: 'valueMissing' }, ctx)).toBe(false);
  });
});

// ==================== call ====================

describe('evaluate - call', () => {
  // ==================== Global Function ====================

  describe('global function (target=null)', () => {
    it('should call a global helper function', () => {
      // callGlobalFunction is used when target is null
      const ctx = makeCtx();
      // We test with a known global function; the result depends on implementation
      // For now, ensure the call expression path works
      const result = evaluate(
        {
          expr: 'call',
          target: null,
          method: 'getWeekDays',
          args: [],
        },
        ctx,
      );
      // getWeekDays returns an array of 7 strings
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== Array Methods ====================

  describe('array methods', () => {
    it('should call array.map with lambda', () => {
      const ctx = makeCtx({ locals: { nums: [1, 2, 3] } });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'nums' },
          method: 'map',
          args: [
            {
              expr: 'lambda',
              param: 'n',
              body: {
                expr: 'bin',
                op: '*',
                left: { expr: 'var', name: 'n' },
                right: { expr: 'lit', value: 2 },
              },
            },
          ],
        },
        ctx,
      );
      expect(result).toEqual([2, 4, 6]);
    });

    it('should call array.filter with lambda', () => {
      const ctx = makeCtx({ locals: { nums: [1, 2, 3, 4, 5] } });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'nums' },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'n',
              body: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'n' },
                right: { expr: 'lit', value: 3 },
              },
            },
          ],
        },
        ctx,
      );
      expect(result).toEqual([4, 5]);
    });

    it('should call array.find with lambda', () => {
      const ctx = makeCtx({ locals: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] } });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'items' },
          method: 'find',
          args: [
            {
              expr: 'lambda',
              param: 'item',
              body: {
                expr: 'bin',
                op: '==',
                left: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'id' },
                right: { expr: 'lit', value: 2 },
              },
            },
          ],
        },
        ctx,
      );
      expect(result).toEqual({ id: 2 });
    });

    it('should call array.findIndex with lambda', () => {
      const ctx = makeCtx({ locals: { items: ['a', 'b', 'c'] } });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'items' },
          method: 'findIndex',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: {
                expr: 'bin',
                op: '==',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 'b' },
              },
            },
          ],
        },
        ctx,
      );
      expect(result).toBe(1);
    });

    it('should call array.some with lambda', () => {
      const ctx = makeCtx({ locals: { nums: [1, 2, 3] } });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'nums' },
          method: 'some',
          args: [
            {
              expr: 'lambda',
              param: 'n',
              body: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'n' },
                right: { expr: 'lit', value: 2 },
              },
            },
          ],
        },
        ctx,
      );
      expect(result).toBe(true);
    });

    it('should call array.every with lambda', () => {
      const ctx = makeCtx({ locals: { nums: [2, 4, 6] } });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'nums' },
          method: 'every',
          args: [
            {
              expr: 'lambda',
              param: 'n',
              body: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'n' },
                right: { expr: 'lit', value: 0 },
              },
            },
          ],
        },
        ctx,
      );
      expect(result).toBe(true);
    });

    it('should call array.includes', () => {
      const ctx = makeCtx({ locals: { arr: [1, 2, 3] } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'arr' },
            method: 'includes',
            args: [{ expr: 'lit', value: 2 }],
          },
          ctx,
        ),
      ).toBe(true);
    });

    it('should call array.slice', () => {
      const ctx = makeCtx({ locals: { arr: [1, 2, 3, 4, 5] } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'arr' },
            method: 'slice',
            args: [{ expr: 'lit', value: 1 }, { expr: 'lit', value: 3 }],
          },
          ctx,
        ),
      ).toEqual([2, 3]);
    });

    it('should call array.indexOf', () => {
      const ctx = makeCtx({ locals: { arr: ['a', 'b', 'c'] } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'arr' },
            method: 'indexOf',
            args: [{ expr: 'lit', value: 'b' }],
          },
          ctx,
        ),
      ).toBe(1);
    });

    it('should call array.join', () => {
      const ctx = makeCtx({ locals: { arr: ['a', 'b', 'c'] } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'arr' },
            method: 'join',
            args: [{ expr: 'lit', value: '-' }],
          },
          ctx,
        ),
      ).toBe('a-b-c');
    });

    it('should call array.at', () => {
      const ctx = makeCtx({ locals: { arr: ['a', 'b', 'c'] } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'arr' },
            method: 'at',
            args: [{ expr: 'lit', value: -1 }],
          },
          ctx,
        ),
      ).toBe('c');
    });

    it('should call array.length', () => {
      const ctx = makeCtx({ locals: { arr: [1, 2, 3] } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'arr' },
            method: 'length',
            args: [],
          },
          ctx,
        ),
      ).toBe(3);
    });
  });

  // ==================== String Methods ====================

  describe('string methods', () => {
    it('should call string.toUpperCase', () => {
      const ctx = makeCtx({ locals: { s: 'hello' } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 's' },
            method: 'toUpperCase',
            args: [],
          },
          ctx,
        ),
      ).toBe('HELLO');
    });

    it('should call string.includes', () => {
      const ctx = makeCtx({ locals: { s: 'hello world' } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 's' },
            method: 'includes',
            args: [{ expr: 'lit', value: 'world' }],
          },
          ctx,
        ),
      ).toBe(true);
    });

    it('should call string.split', () => {
      const ctx = makeCtx({ locals: { s: 'a,b,c' } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 's' },
            method: 'split',
            args: [{ expr: 'lit', value: ',' }],
          },
          ctx,
        ),
      ).toEqual(['a', 'b', 'c']);
    });
  });

  // ==================== Math Methods ====================

  describe('Math methods', () => {
    it('should call Math.round', () => {
      const ctx = makeCtx({
        env: {
          resolveRef: () => null,
          resolveValidity: () => false,
          resolveGlobal: (name: string) => (name === 'Math' ? Math : undefined),
        },
      });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'var', name: 'Math' },
            method: 'round',
            args: [{ expr: 'lit', value: 4.7 }],
          },
          ctx,
        ),
      ).toBe(5);
    });

    it('should call Math.max', () => {
      const ctx = makeCtx({
        env: {
          resolveRef: () => null,
          resolveValidity: () => false,
          resolveGlobal: (name: string) => (name === 'Math' ? Math : undefined),
        },
      });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'var', name: 'Math' },
            method: 'max',
            args: [{ expr: 'lit', value: 3 }, { expr: 'lit', value: 7 }, { expr: 'lit', value: 1 }],
          },
          ctx,
        ),
      ).toBe(7);
    });
  });

  // ==================== Date Methods ====================

  describe('Date methods', () => {
    it('should call Date.now', () => {
      const ctx = makeCtx({
        env: {
          resolveRef: () => null,
          resolveValidity: () => false,
          resolveGlobal: (name: string) => (name === 'Date' ? Date : undefined),
        },
      });
      const before = Date.now();
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'var', name: 'Date' },
          method: 'now',
          args: [],
        },
        ctx,
      );
      const after = Date.now();
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThanOrEqual(before);
      expect(result as number).toBeLessThanOrEqual(after);
    });

    it('should call Date instance method getFullYear', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const ctx = makeCtx({ locals: { d: date } });
      expect(
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 'd' },
            method: 'getFullYear',
            args: [],
          },
          ctx,
        ),
      ).toBe(2024);
    });
  });

  // ==================== env.callFunction ====================

  describe('function call via env.callFunction', () => {
    it('should use env.callFunction when available', () => {
      const myFn = vi.fn((...args: unknown[]) => args.reduce((a: number, b) => a + (b as number), 0));
      const callFn = vi.fn((fn: Function, args: unknown[]) => fn(...args));
      const ctx = makeCtx({
        locals: { myFn },
        env: {
          resolveRef: () => null,
          resolveValidity: () => false,
          resolveGlobal: () => undefined,
          callFunction: callFn,
        },
      });
      const result = evaluate(
        {
          expr: 'call',
          target: { expr: 'local', name: 'myFn' },
          method: 'call',
          args: [{ expr: 'lit', value: 1 }, { expr: 'lit', value: 2 }],
        },
        ctx,
      );
      expect(result).toBe(3);
      expect(callFn).toHaveBeenCalled();
    });
  });
});

// ==================== lambda ====================

describe('evaluate - lambda', () => {
  it('should return undefined when evaluated directly', () => {
    const ctx = makeCtx();
    expect(
      evaluate({ expr: 'lambda', param: 'x', body: { expr: 'var', name: 'x' } }, ctx),
    ).toBeUndefined();
  });
});

// ==================== array ====================

describe('evaluate - array', () => {
  it('should evaluate all elements', () => {
    const ctx = makeCtx({ locals: { x: 10 } });
    const result = evaluate(
      {
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          { expr: 'local', name: 'x' },
          { expr: 'lit', value: 'hello' },
        ],
      },
      ctx,
    );
    expect(result).toEqual([1, 10, 'hello']);
  });

  it('should return empty array for no elements', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'array', elements: [] }, ctx)).toEqual([]);
  });
});

// ==================== obj ====================

describe('evaluate - obj', () => {
  it('should evaluate all property values', () => {
    const ctx = makeCtx({ locals: { name: 'Alice' } });
    const result = evaluate(
      {
        expr: 'obj',
        props: {
          greeting: { expr: 'lit', value: 'hello' },
          person: { expr: 'local', name: 'name' },
          count: { expr: 'lit', value: 42 },
        },
      },
      ctx,
    );
    expect(result).toEqual({ greeting: 'hello', person: 'Alice', count: 42 });
  });

  it('should return empty object for no props', () => {
    const ctx = makeCtx();
    expect(evaluate({ expr: 'obj', props: {} }, ctx)).toEqual({});
  });
});
