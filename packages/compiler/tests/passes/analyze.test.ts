/**
 * Analyze Pass Tests for @constela/compiler
 *
 * Coverage:
 * - State reference validation (UNDEFINED_STATE)
 * - Action reference validation (UNDEFINED_ACTION)
 * - Duplicate action detection (DUPLICATE_ACTION)
 * - Variable scope validation in each/if nodes
 * - Comprehensive path reporting for all errors
 *
 * TDD Red Phase: These tests will FAIL because implementation does not exist.
 */

import { describe, it, expect } from 'vitest';

// Import from the module that doesn't exist yet
import { analyzePass, type AnalyzePassResult, type AnalysisContext } from '../../src/passes/analyze.js';
import type { Program } from '@constela/core';

// ==================== Helper to create minimal valid AST ====================

function createAst(overrides: Partial<Program> = {}): Program {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  } as Program;
}

// ==================== State Reference Validation ====================

describe('analyzePass - State Reference Validation', () => {
  describe('Valid State References', () => {
    it('should return ok: true when all state references are valid', () => {
      const ast = createAst({
        state: { count: { type: 'number', initial: 0 } },
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'count' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate state references in nested expressions', () => {
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

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate state references in action steps', () => {
      const ast = createAst({
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'increment',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        ],
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('Undefined State References', () => {
    it('should return UNDEFINED_STATE error for undefined state in view expression', () => {
      const ast = createAst({
        state: { count: { type: 'number', initial: 0 } },
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'undefinedState' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('undefinedState'))).toBe(true);
      }
    });

    it('should return UNDEFINED_STATE error with correct path', () => {
      const ast = createAst({
        state: {},
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'missing' },
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
        expect(stateError).toBeDefined();
        expect(stateError?.path).toContain('/view/children/0');
      }
    });

    it('should return UNDEFINED_STATE error for undefined state in action target', () => {
      const ast = createAst({
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'test',
            steps: [
              {
                do: 'set',
                target: 'nonexistent',
                value: { expr: 'lit', value: 1 },
              },
            ],
          },
        ],
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('nonexistent'))).toBe(true);
      }
    });

    it('should return UNDEFINED_STATE error for undefined state in update step', () => {
      const ast = createAst({
        state: {},
        actions: [
          {
            name: 'test',
            steps: [{ do: 'update', target: 'missing', operation: 'increment' }],
          },
        ],
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
      }
    });

    it('should return UNDEFINED_STATE error for undefined state in if condition', () => {
      const ast = createAst({
        state: {},
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showContent' },
          then: { kind: 'element', tag: 'div' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('showContent'))).toBe(true);
      }
    });

    it('should return UNDEFINED_STATE error for undefined state in each items', () => {
      const ast = createAst({
        state: {},
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'missingList' },
          as: 'item',
          body: { kind: 'element', tag: 'li' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('missingList'))).toBe(true);
      }
    });
  });
});

// ==================== Action Reference Validation ====================

describe('analyzePass - Action Reference Validation', () => {
  describe('Valid Action References', () => {
    it('should return ok: true when all action references are valid', () => {
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
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'increment' },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate multiple action references', () => {
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
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: { onclick: { event: 'click', action: 'increment' } },
            },
            {
              kind: 'element',
              tag: 'button',
              props: { onclick: { event: 'click', action: 'decrement' } },
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('Undefined Action References', () => {
    it('should return UNDEFINED_ACTION error for undefined action', () => {
      const ast = createAst({
        actions: [],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'nonexistent' },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('nonexistent'))).toBe(true);
      }
    });

    it('should return UNDEFINED_ACTION error with correct path', () => {
      const ast = createAst({
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                onclick: { event: 'click', action: 'missing' },
              },
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
        expect(actionError).toBeDefined();
        expect(actionError?.path).toContain('/view/children/0/props/onclick');
      }
    });

    it('should return UNDEFINED_ACTION error for action in nested each body', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'removeItem' },
            },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
      }
    });

    it('should return UNDEFINED_ACTION error for action in if branch', () => {
      const ast = createAst({
        state: { showButton: { type: 'number', initial: 1 } },
        actions: [],
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showButton' },
          then: {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'handleClick' },
            },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
      }
    });
  });
});

// ==================== Duplicate Action Detection ====================

describe('analyzePass - Duplicate Action Detection', () => {
  it('should return ok: true when all action names are unique', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
        { name: 'decrement', steps: [{ do: 'update', target: 'count', operation: 'decrement' }] },
        { name: 'reset', steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }] },
      ],
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(true);
  });

  it('should return DUPLICATE_ACTION error for duplicate action names', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
        { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'decrement' }] },
      ],
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === 'DUPLICATE_ACTION')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('increment'))).toBe(true);
    }
  });

  it('should return DUPLICATE_ACTION error with correct path', () => {
    const ast = createAst({
      state: {},
      actions: [
        { name: 'test', steps: [] },
        { name: 'test', steps: [] },
      ],
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dupError = result.errors.find((e) => e.code === 'DUPLICATE_ACTION');
      expect(dupError).toBeDefined();
      expect(dupError?.path).toContain('/actions/1');
    }
  });

  it('should detect multiple duplicates', () => {
    const ast = createAst({
      state: {},
      actions: [
        { name: 'foo', steps: [] },
        { name: 'foo', steps: [] },
        { name: 'bar', steps: [] },
        { name: 'bar', steps: [] },
      ],
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dupErrors = result.errors.filter((e) => e.code === 'DUPLICATE_ACTION');
      expect(dupErrors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ==================== Variable Scope Validation ====================

describe('analyzePass - Variable Scope Validation', () => {
  describe('Valid Variable References', () => {
    it('should allow "as" variable reference inside each body', () => {
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

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should allow "index" variable reference inside each body', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          index: 'idx',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'idx' },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should allow both as and index variables in same scope', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          index: 'i',
          body: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'item' } },
              { kind: 'text', value: { expr: 'var', name: 'i' } },
            ],
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should allow nested each with different variable names', () => {
      const ast = createAst({
        state: { matrix: { type: 'list', initial: [] } },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'matrix' },
          as: 'row',
          index: 'i',
          body: {
            kind: 'each',
            items: { expr: 'var', name: 'row' },
            as: 'cell',
            index: 'j',
            body: {
              kind: 'text',
              value: { expr: 'var', name: 'cell' },
            },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('Invalid Variable References', () => {
    it('should return VAR_UNDEFINED error for variable reference outside each scope', () => {
      const ast = createAst({
        view: {
          kind: 'text',
          value: { expr: 'var', name: 'undefinedVar' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'VAR_UNDEFINED')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('undefinedVar'))).toBe(true);
      }
    });

    it('should return VAR_UNDEFINED error with correct path', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'var', name: 'noSuchVar' },
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const varError = result.errors.find((e) => e.code === 'VAR_UNDEFINED');
        expect(varError).toBeDefined();
        expect(varError?.path).toContain('/view/children/0/value');
      }
    });

    it('should return error for variable reference after each scope ends', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: { kind: 'element', tag: 'li' },
            },
            {
              kind: 'text',
              value: { expr: 'var', name: 'item' }, // 'item' is out of scope here
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'VAR_UNDEFINED')).toBe(true);
      }
    });

    it('should return error for referencing wrong variable name in each', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'text',
            value: { expr: 'var', name: 'wrongName' },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'VAR_UNDEFINED')).toBe(true);
      }
    });

    it('should return error for referencing parent scope variable when shadowed', () => {
      const ast = createAst({
        state: { outer: { type: 'list', initial: [] } },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'outer' },
          as: 'item',
          body: {
            kind: 'each',
            items: { expr: 'var', name: 'item' },
            as: 'item', // shadows outer 'item'
            body: {
              kind: 'text',
              value: { expr: 'var', name: 'item' }, // refers to inner 'item'
            },
          },
        },
      });

      // This should still be valid - inner 'item' shadows outer 'item'
      const result = analyzePass(ast);
      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Analysis Context ====================

describe('analyzePass - Analysis Context', () => {
  it('should return context with collected state names', () => {
    const ast = createAst({
      state: {
        count: { type: 'number', initial: 0 },
        name: { type: 'string', initial: '' },
      },
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context).toBeDefined();
      expect(result.context.stateNames).toContain('count');
      expect(result.context.stateNames).toContain('name');
    }
  });

  it('should return context with collected action names', () => {
    const ast = createAst({
      state: { count: { type: 'number', initial: 0 } },
      actions: [
        { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
        { name: 'reset', steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }] },
      ],
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context).toBeDefined();
      expect(result.context.actionNames).toContain('increment');
      expect(result.context.actionNames).toContain('reset');
    }
  });
});

// ==================== Multiple Errors ====================

describe('analyzePass - Multiple Error Collection', () => {
  it('should collect all errors, not just the first one', () => {
    const ast = createAst({
      state: {},
      actions: [
        { name: 'dup', steps: [] },
        { name: 'dup', steps: [] },
      ],
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'text',
            value: { expr: 'state', name: 'undefinedState1' },
          },
          {
            kind: 'text',
            value: { expr: 'state', name: 'undefinedState2' },
          },
          {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'undefinedAction' },
            },
          },
        ],
      },
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });
});
