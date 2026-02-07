/**
 * Test module for SSR/CSR parity of the unified evaluate() function.
 *
 * Ensures that the same expression produces the same output regardless
 * of whether the adapter is configured for SSR or CSR contexts.
 *
 * Coverage:
 * - lit, state, local, var, bin, not, cond, get, route
 * - import, data, index, concat
 * - call (array methods, string methods, Math, Date)
 * - style
 *
 * TDD Red Phase: ALL tests MUST FAIL because the module does not exist yet.
 */

import { describe, it, expect } from 'vitest';

import type { CoreEvaluationContext, EnvironmentAdapter, StateReader } from '../index.js';
import { evaluate, evaluateStyle } from '../index.js';
import { GLOBAL_FUNCTIONS } from '../../helpers/global-functions.js';

// ==================== Adapter Helpers ====================

const ssrAdapter: EnvironmentAdapter = {
  resolveRef: () => null,
  resolveValidity: () => false,
  resolveGlobal: (name: string) => {
    const safeGlobals: Record<string, unknown> = {
      JSON,
      Math,
      Date,
      Object,
      Array,
      String,
      Number,
      Boolean,
      console,
      ...GLOBAL_FUNCTIONS,
    };
    return safeGlobals[name];
  },
  bindFunction: (fn: Function, parent: unknown) => fn.bind(parent),
};

/**
 * CSR adapter with refs simulation and function binding.
 */
const refs: Record<string, unknown> = {
  myInput: { tagName: 'INPUT', value: 'test' },
};

const csrAdapter: EnvironmentAdapter = {
  resolveRef: (name: string) => refs[name] ?? null,
  resolveValidity: () => false, // simplified for unit test
  resolveGlobal: (name: string) => {
    const safeGlobals: Record<string, unknown> = {
      JSON,
      Math,
      Date,
      Object,
      Array,
      String,
      Number,
      Boolean,
      console,
      ...GLOBAL_FUNCTIONS,
    };
    return safeGlobals[name];
  },
  bindFunction: (fn: Function, parent: unknown) => fn.bind(parent),
  callFunction: (fn: Function, args: unknown[]) => fn(...args),
};

// ==================== Context Helpers ====================

function makeStateReader(entries: Record<string, unknown>): StateReader {
  const map = new Map<string, unknown>(Object.entries(entries));
  return { get: (name: string) => map.get(name) };
}

function makeCtx(
  adapter: EnvironmentAdapter,
  overrides?: Partial<Omit<CoreEvaluationContext, 'env'>>,
): CoreEvaluationContext {
  return {
    state: makeStateReader({}),
    locals: {},
    env: adapter,
    ...overrides,
  };
}

// ==================== Parity Tests ====================

describe('SSR/CSR Parity', () => {
  const adapters = [
    { name: 'SSR', adapter: ssrAdapter },
    { name: 'CSR', adapter: csrAdapter },
  ] as const;

  // ==================== lit ====================

  describe('lit expressions', () => {
    const cases = [
      { value: 'hello', label: 'string' },
      { value: 42, label: 'number' },
      { value: true, label: 'boolean' },
      { value: null, label: 'null' },
    ];

    for (const { value, label } of cases) {
      it(`should produce identical result for lit (${label})`, () => {
        const results = adapters.map(({ adapter }) =>
          evaluate({ expr: 'lit', value }, makeCtx(adapter)),
        );
        expect(results[0]).toEqual(results[1]);
        expect(results[0]).toEqual(value);
      });
    }
  });

  // ==================== state ====================

  describe('state expressions', () => {
    it('should produce identical result for state read', () => {
      const state = makeStateReader({ count: 5 });
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'state', name: 'count' }, makeCtx(adapter, { state })),
      );
      expect(results[0]).toBe(5);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for state with path', () => {
      const state = makeStateReader({ user: { name: 'Alice' } });
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'state', name: 'user', path: 'name' }, makeCtx(adapter, { state })),
      );
      expect(results[0]).toBe('Alice');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== local ====================

  describe('local expressions', () => {
    it('should produce identical result for local read', () => {
      const locals = { item: 'banana' };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'local', name: 'item' }, makeCtx(adapter, { locals })),
      );
      expect(results[0]).toBe('banana');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== var ====================

  describe('var expressions', () => {
    it('should produce identical result for var from locals', () => {
      const locals = { x: 100 };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'var', name: 'x' }, makeCtx(adapter, { locals })),
      );
      expect(results[0]).toBe(100);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for var with dot notation', () => {
      const locals = { obj: { nested: { val: 'deep' } } };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'var', name: 'obj.nested.val' }, makeCtx(adapter, { locals })),
      );
      expect(results[0]).toBe('deep');
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for var fallback to global', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'var', name: 'Math' }, makeCtx(adapter)),
      );
      expect(results[0]).toBe(Math);
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== bin ====================

  describe('bin expressions', () => {
    const binCases = [
      { op: '+', left: 3, right: 4, expected: 7 },
      { op: '-', left: 10, right: 3, expected: 7 },
      { op: '*', left: 5, right: 6, expected: 30 },
      { op: '/', left: 10, right: 2, expected: 5 },
      { op: '%', left: 7, right: 3, expected: 1 },
      { op: '==', left: 5, right: 5, expected: true },
      { op: '!=', left: 5, right: 3, expected: true },
      { op: '<', left: 3, right: 5, expected: true },
      { op: '<=', left: 5, right: 5, expected: true },
      { op: '>', left: 7, right: 3, expected: true },
      { op: '>=', left: 7, right: 7, expected: true },
    ] as const;

    for (const { op, left, right, expected } of binCases) {
      it(`should produce identical result for bin ${op}`, () => {
        const results = adapters.map(({ adapter }) =>
          evaluate(
            {
              expr: 'bin',
              op,
              left: { expr: 'lit', value: left },
              right: { expr: 'lit', value: right },
            },
            makeCtx(adapter),
          ),
        );
        expect(results[0]).toBe(expected);
        expect(results[0]).toEqual(results[1]);
      });
    }

    it('should produce identical result for && short-circuit', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'bin',
            op: '&&',
            left: { expr: 'lit', value: false },
            right: { expr: 'lit', value: 'never' },
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe(false);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for || short-circuit', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'bin',
            op: '||',
            left: { expr: 'lit', value: '' },
            right: { expr: 'lit', value: 'fallback' },
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe('fallback');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== not ====================

  describe('not expressions', () => {
    it('should produce identical result for not', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'not', operand: { expr: 'lit', value: true } }, makeCtx(adapter)),
      );
      expect(results[0]).toBe(false);
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== cond ====================

  describe('cond expressions', () => {
    it('should produce identical result for cond (truthy)', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'cond',
            if: { expr: 'lit', value: true },
            then: { expr: 'lit', value: 'yes' },
            else: { expr: 'lit', value: 'no' },
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe('yes');
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for cond (falsy)', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'cond',
            if: { expr: 'lit', value: false },
            then: { expr: 'lit', value: 'yes' },
            else: { expr: 'lit', value: 'no' },
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe('no');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== get ====================

  describe('get expressions', () => {
    it('should produce identical result for get', () => {
      const locals = { user: { name: 'Bob', address: { city: 'Tokyo' } } };
      const results = adapters.map(({ adapter }) =>
        evaluate(
          { expr: 'get', base: { expr: 'local', name: 'user' }, path: 'address.city' },
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toBe('Tokyo');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== route ====================

  describe('route expressions', () => {
    it('should produce identical result for route param', () => {
      const route = { params: { id: '42' }, query: { q: 'test' }, path: '/users/42' };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'route', name: 'id', source: 'param' }, makeCtx(adapter, { route })),
      );
      expect(results[0]).toBe('42');
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for route query', () => {
      const route = { params: {}, query: { q: 'test' }, path: '/search' };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'route', name: 'q', source: 'query' }, makeCtx(adapter, { route })),
      );
      expect(results[0]).toBe('test');
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for route path', () => {
      const route = { params: {}, query: {}, path: '/about' };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'route', name: '', source: 'path' }, makeCtx(adapter, { route })),
      );
      expect(results[0]).toBe('/about');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== import ====================

  describe('import expressions', () => {
    it('should produce identical result for import', () => {
      const imports = { config: { theme: 'dark' } };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'import', name: 'config', path: 'theme' }, makeCtx(adapter, { imports })),
      );
      expect(results[0]).toBe('dark');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== data ====================

  describe('data expressions', () => {
    it('should produce identical result for data', () => {
      const imports = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
      const results = adapters.map(({ adapter }) =>
        evaluate({ expr: 'data', name: 'users' }, makeCtx(adapter, { imports })),
      );
      expect(results[0]).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== index ====================

  describe('index expressions', () => {
    it('should produce identical result for index access', () => {
      const locals = { arr: ['a', 'b', 'c'] };
      const results = adapters.map(({ adapter }) =>
        evaluate(
          { expr: 'index', base: { expr: 'local', name: 'arr' }, key: { expr: 'lit', value: 1 } },
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toBe('b');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== concat ====================

  describe('concat expressions', () => {
    it('should produce identical result for concat', () => {
      const locals = { name: 'World' };
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'concat',
            items: [
              { expr: 'lit', value: 'Hello, ' },
              { expr: 'local', name: 'name' },
            ],
          },
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toBe('Hello, World');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== call ====================

  describe('call expressions', () => {
    it('should produce identical result for array.map', () => {
      const locals = { nums: [1, 2, 3] };
      const results = adapters.map(({ adapter }) =>
        evaluate(
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
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toEqual([2, 4, 6]);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for array.filter', () => {
      const locals = { nums: [1, 2, 3, 4, 5] };
      const results = adapters.map(({ adapter }) =>
        evaluate(
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
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toEqual([4, 5]);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for string.toUpperCase', () => {
      const locals = { s: 'hello' };
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 's' },
            method: 'toUpperCase',
            args: [],
          },
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toBe('HELLO');
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for string.split', () => {
      const locals = { s: 'a,b,c' };
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'call',
            target: { expr: 'local', name: 's' },
            method: 'split',
            args: [{ expr: 'lit', value: ',' }],
          },
          makeCtx(adapter, { locals }),
        ),
      );
      expect(results[0]).toEqual(['a', 'b', 'c']);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for Math.round', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'call',
            target: { expr: 'var', name: 'Math' },
            method: 'round',
            args: [{ expr: 'lit', value: 4.7 }],
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe(5);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for Math.max', () => {
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'call',
            target: { expr: 'var', name: 'Math' },
            method: 'max',
            args: [
              { expr: 'lit', value: 3 },
              { expr: 'lit', value: 7 },
              { expr: 'lit', value: 1 },
            ],
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe(7);
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for Date.parse', () => {
      const dateStr = '2024-01-15T00:00:00Z';
      const results = adapters.map(({ adapter }) =>
        evaluate(
          {
            expr: 'call',
            target: { expr: 'var', name: 'Date' },
            method: 'parse',
            args: [{ expr: 'lit', value: dateStr }],
          },
          makeCtx(adapter),
        ),
      );
      expect(results[0]).toBe(Date.parse(dateStr));
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== style ====================

  describe('style expressions', () => {
    it('should produce identical result for style', () => {
      const styles = {
        button: {
          base: 'btn',
          variants: {
            size: { sm: 'text-sm', md: 'text-md', lg: 'text-lg' },
          },
          defaultVariants: { size: 'md' },
        },
      };
      const results = adapters.map(({ adapter }) =>
        evaluateStyle(
          {
            expr: 'style',
            name: 'button',
            variants: { size: { expr: 'lit', value: 'lg' } },
          },
          makeCtx(adapter, { styles }),
        ),
      );
      expect(results[0]).toBe('btn text-lg');
      expect(results[0]).toEqual(results[1]);
    });

    it('should produce identical result for style with defaults', () => {
      const styles = {
        button: {
          base: 'btn',
          variants: {
            size: { sm: 'text-sm', md: 'text-md' },
          },
          defaultVariants: { size: 'sm' },
        },
      };
      const results = adapters.map(({ adapter }) =>
        evaluateStyle(
          { expr: 'style', name: 'button' },
          makeCtx(adapter, { styles }),
        ),
      );
      expect(results[0]).toBe('btn text-sm');
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==================== function binding via var expressions ====================

  describe('function binding via var expressions', () => {
    it('should bind method to parent object when accessed via var dot notation', () => {
      const locals = {
        obj: {
          greet() {
            return this.name;
          },
          name: 'Alice',
        },
      };

      const results = adapters.map(({ adapter }) => {
        const fn = evaluate(
          { expr: 'var', name: 'obj.greet' },
          makeCtx(adapter, { locals }),
        );
        expect(typeof fn).toBe('function');
        return (fn as Function)();
      });

      // Both adapters should return 'Alice' — the bound this.name
      expect(results[0]).toBe('Alice');
      expect(results[1]).toBe('Alice');
      expect(results[0]).toEqual(results[1]);
    });

    it('should bind nested method to correct parent', () => {
      const locals = {
        a: {
          b: {
            getName() {
              return this.value;
            },
            value: 42,
          },
        },
      };

      const results = adapters.map(({ adapter }) => {
        const fn = evaluate(
          { expr: 'var', name: 'a.b.getName' },
          makeCtx(adapter, { locals }),
        );
        expect(typeof fn).toBe('function');
        return (fn as Function)();
      });

      // Both adapters should return 42 — the bound this.value
      expect(results[0]).toBe(42);
      expect(results[1]).toBe(42);
      expect(results[0]).toEqual(results[1]);
    });
  });
});
