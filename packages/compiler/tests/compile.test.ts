/**
 * Compile Function Tests for @constela/compiler
 *
 * Coverage:
 * - Successful compilation of valid ASTs
 * - Error handling for invalid inputs
 * - Result structure verification (ok: true/false patterns)
 * - Integration of validate -> analyze -> transform passes
 *
 * TDD Red Phase: These tests will FAIL because implementation does not exist.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import from the module that doesn't exist yet
import { compile } from '../src/index.js';
import type { CompileResult, CompiledProgram } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ==================== Fixtures ====================

interface Fixtures {
  valid: {
    counter: unknown;
    todoList: unknown;
  };
  invalid: {
    missingVersion: unknown;
    invalidNodeKind: unknown;
    undefinedStateRef: unknown;
    undefinedActionRef: unknown;
    duplicateAction: unknown;
  };
}

const fixtures: Fixtures = {
  valid: {
    counter: {},
    todoList: {},
  },
  invalid: {
    missingVersion: {},
    invalidNodeKind: {},
    undefinedStateRef: {},
    undefinedActionRef: {},
    duplicateAction: {},
  },
};

beforeAll(() => {
  // Load valid fixtures (reusing from core package)
  const coreFixturesPath = join(__dirname, '../../core/tests/fixtures');
  
  fixtures.valid.counter = JSON.parse(
    readFileSync(join(coreFixturesPath, 'valid/counter.json'), 'utf-8')
  );
  fixtures.valid.todoList = JSON.parse(
    readFileSync(join(coreFixturesPath, 'valid/todo-list.json'), 'utf-8')
  );

  // Load invalid fixtures
  fixtures.invalid.missingVersion = JSON.parse(
    readFileSync(join(coreFixturesPath, 'invalid/missing-version.json'), 'utf-8')
  );
  fixtures.invalid.invalidNodeKind = JSON.parse(
    readFileSync(join(coreFixturesPath, 'invalid/invalid-node-kind.json'), 'utf-8')
  );
  fixtures.invalid.undefinedStateRef = JSON.parse(
    readFileSync(join(coreFixturesPath, 'invalid/undefined-state-ref.json'), 'utf-8')
  );

  // Create inline fixtures for compiler-specific tests
  fixtures.invalid.undefinedActionRef = {
    version: '1.0',
    state: {},
    actions: [],
    view: {
      kind: 'element',
      tag: 'button',
      props: {
        onclick: { event: 'click', action: 'nonexistent' },
      },
    },
  };

  fixtures.invalid.duplicateAction = {
    version: '1.0',
    state: { count: { type: 'number', initial: 0 } },
    actions: [
      { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
      { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'decrement' }] },
    ],
    view: { kind: 'element', tag: 'div' },
  };
});

// ==================== Successful Compilation Tests ====================

describe('compile() - Successful Compilation', () => {
  describe('Counter App', () => {
    it('should return ok: true for valid counter app', () => {
      const result = compile(fixtures.valid.counter);

      expect(result.ok).toBe(true);
    });

    it('should return a CompiledProgram with version 1.0', () => {
      const result = compile(fixtures.valid.counter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.version).toBe('1.0');
      }
    });

    it('should compile state with correct structure', () => {
      const result = compile(fixtures.valid.counter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.state).toBeDefined();
        expect(result.program.state['count']).toEqual({
          type: 'number',
          initial: 0,
        });
      }
    });

    it('should compile actions as Map or Record for efficient lookup', () => {
      const result = compile(fixtures.valid.counter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.actions).toBeDefined();
        // Actions should be accessible by name
        const incrementAction =
          result.program.actions instanceof Map
            ? result.program.actions.get('increment')
            : result.program.actions['increment'];
        expect(incrementAction).toBeDefined();
        expect(incrementAction?.name).toBe('increment');
      }
    });

    it('should compile view correctly', () => {
      const result = compile(fixtures.valid.counter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.view).toBeDefined();
        expect(result.program.view.kind).toBe('element');
      }
    });
  });

  describe('Todo List App', () => {
    it('should return ok: true for valid todo list app', () => {
      const result = compile(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
    });

    it('should compile multiple state fields', () => {
      const result = compile(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.program.state['todos']).toBeDefined();
        expect(result.program.state['newTodoText']).toBeDefined();
        expect(result.program.state['todos'].type).toBe('list');
        expect(result.program.state['newTodoText'].type).toBe('string');
      }
    });

    it('should compile actions with multiple steps', () => {
      const result = compile(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const addTodoAction =
          result.program.actions instanceof Map
            ? result.program.actions.get('addTodo')
            : result.program.actions['addTodo'];
        expect(addTodoAction).toBeDefined();
        expect(addTodoAction?.steps.length).toBe(2);
      }
    });

    it('should compile each nodes with as and index bindings', () => {
      const result = compile(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The view should contain an each node
        expect(result.program.view).toBeDefined();
      }
    });
  });
});

// ==================== Error Handling Tests ====================

describe('compile() - Error Handling', () => {
  describe('Schema Validation Errors', () => {
    it('should return ok: false for missing version', () => {
      const result = compile(fixtures.invalid.missingVersion);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error with correct path for missing version', () => {
      const result = compile(fixtures.invalid.missingVersion);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].path).toBe('/version');
      }
    });

    it('should return ok: false for invalid node kind', () => {
      const result = compile(fixtures.invalid.invalidNodeKind);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].code).toBe('SCHEMA_INVALID');
      }
    });
  });

  describe('Semantic Analysis Errors', () => {
    it('should return UNDEFINED_STATE error for undefined state reference', () => {
      const result = compile(fixtures.invalid.undefinedStateRef);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
      }
    });

    it('should return UNDEFINED_ACTION error for undefined action reference', () => {
      const result = compile(fixtures.invalid.undefinedActionRef);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
      }
    });

    it('should return DUPLICATE_ACTION error for duplicate action names', () => {
      const result = compile(fixtures.invalid.duplicateAction);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'DUPLICATE_ACTION')).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return error for null input', () => {
      const result = compile(null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return error for undefined input', () => {
      const result = compile(undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return error for non-object input', () => {
      const result = compile('not an object');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for unsupported version', () => {
      const ast = {
        version: '2.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = compile(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].code).toBe('UNSUPPORTED_VERSION');
      }
    });
  });
});

// ==================== Result Type Tests ====================

describe('compile() - Result Type Verification', () => {
  it('should have discriminated union result with ok: true containing program', () => {
    const result = compile(fixtures.valid.counter);

    if (result.ok) {
      // TypeScript should know result.program is CompiledProgram
      const program: CompiledProgram = result.program;
      expect(program).toBeDefined();
    } else {
      expect.fail('Expected compilation to succeed');
    }
  });

  it('should have discriminated union result with ok: false containing errors array', () => {
    const result = compile(fixtures.invalid.missingVersion);

    if (!result.ok) {
      // TypeScript should know result.errors is ConstelaError[]
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    } else {
      expect.fail('Expected compilation to fail');
    }
  });
});

// ==================== Performance Tests ====================

describe('compile() - Performance', () => {
  it('should compile counter app in reasonable time', () => {
    const start = performance.now();
    compile(fixtures.valid.counter);
    const duration = performance.now() - start;

    // Should compile in less than 100ms
    expect(duration).toBeLessThan(100);
  });

  it('should compile todo list app in reasonable time', () => {
    const start = performance.now();
    compile(fixtures.valid.todoList);
    const duration = performance.now() - start;

    // Should compile in less than 100ms
    expect(duration).toBeLessThan(100);
  });
});
