/**
 * Schema Validation Tests for Constela AST
 *
 * Coverage:
 * - Valid AST validation (counter, todo-list)
 * - Invalid schema detection
 * - Error reporting with paths
 * - Semantic validation (undefined state references)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAst, ValidationResult } from '../src/index.js';

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
  },
};

beforeAll(() => {
  // Load valid fixtures
  fixtures.valid.counter = JSON.parse(
    readFileSync(join(__dirname, 'fixtures/valid/counter.json'), 'utf-8')
  );
  fixtures.valid.todoList = JSON.parse(
    readFileSync(join(__dirname, 'fixtures/valid/todo-list.json'), 'utf-8')
  );

  // Load invalid fixtures
  fixtures.invalid.missingVersion = JSON.parse(
    readFileSync(join(__dirname, 'fixtures/invalid/missing-version.json'), 'utf-8')
  );
  fixtures.invalid.invalidNodeKind = JSON.parse(
    readFileSync(join(__dirname, 'fixtures/invalid/invalid-node-kind.json'), 'utf-8')
  );
  fixtures.invalid.undefinedStateRef = JSON.parse(
    readFileSync(join(__dirname, 'fixtures/invalid/undefined-state-ref.json'), 'utf-8')
  );
});

// ==================== Valid AST Tests ====================

describe('validateAst - Valid Inputs', () => {
  describe('Counter App', () => {
    it('should return ok: true for valid counter app', () => {
      const result = validateAst(fixtures.valid.counter);

      expect(result.ok).toBe(true);
    });

    it('should not return any errors for valid counter app', () => {
      const result = validateAst(fixtures.valid.counter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ast).toBeDefined();
      }
    });
  });

  describe('Todo List App', () => {
    it('should return ok: true for valid todo list app', () => {
      const result = validateAst(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
    });

    it('should parse complex view structures', () => {
      const result = validateAst(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ast).toBeDefined();
        expect(result.ast.view).toBeDefined();
      }
    });

    it('should validate each nodes with index and key', () => {
      const result = validateAst(fixtures.valid.todoList);

      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Invalid Schema Tests ====================

describe('validateAst - Invalid Schema', () => {
  describe('Missing Required Fields', () => {
    it('should return error for missing version field', () => {
      const result = validateAst(fixtures.invalid.missingVersion);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/version');
      }
    });

    it('should return error for missing state field', () => {
      const ast = {
        version: '1.0',
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state');
      }
    });

    it('should return error for missing actions field', () => {
      const ast = {
        version: '1.0',
        state: {},
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions');
      }
    });

    it('should return error for missing view field', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view');
      }
    });
  });

  describe('Invalid Node Kinds', () => {
    it('should return error for invalid view node kind', () => {
      const result = validateAst(fixtures.invalid.invalidNodeKind);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/kind');
      }
    });

    it('should return error for invalid nested node kind', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'invalid-kind' }],
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/children/0/kind');
      }
    });
  });

  describe('Invalid Expressions', () => {
    it('should return error for invalid expression type', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'invalid-expr', value: 'test' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/expr');
      }
    });

    it('should return error for missing expression value in lit', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'lit' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/value');
      }
    });

    it('should return error for missing name in state expression', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'state' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/name');
      }
    });

    it('should return error for invalid binary operator', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'bin',
            op: '**',
            left: { expr: 'lit', value: 1 },
            right: { expr: 'lit', value: 2 },
          },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/op');
      }
    });
  });

  describe('Invalid Action Steps', () => {
    it('should return error for invalid action step type', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'test',
            steps: [{ do: 'invalid-step', target: 'count' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/do');
      }
    });

    it('should return error for missing target in set step', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'test',
            steps: [{ do: 'set', value: { expr: 'lit', value: 0 } }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/target');
      }
    });

    it('should return error for invalid update operation', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'test',
            steps: [{ do: 'update', target: 'count', operation: 'multiply' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/operation');
      }
    });

    it('should return error for invalid fetch method', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'test',
            steps: [
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api' },
                method: 'PATCH',
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/method');
      }
    });
  });

  describe('Invalid State Fields', () => {
    it('should return error for invalid state field type', () => {
      const ast = {
        version: '1.0',
        state: {
          data: { type: 'object', initial: {} },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/data/type');
      }
    });

    it('should return error for mismatched initial value type (number field with string)', () => {
      const ast = {
        version: '1.0',
        state: {
          count: { type: 'number', initial: 'not a number' },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/count/initial');
      }
    });

    it('should return error for mismatched initial value type (list field with object)', () => {
      const ast = {
        version: '1.0',
        state: {
          items: { type: 'list', initial: {} },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/items/initial');
      }
    });
  });
});

// ==================== Semantic Validation Tests ====================

describe('validateAst - Semantic Validation', () => {
  describe('Undefined State References', () => {
    it('should return error for referencing undefined state in view', () => {
      const result = validateAst(fixtures.invalid.undefinedStateRef);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNDEFINED_STATE');
        expect(result.error.path).toContain('undefinedState');
      }
    });

    it('should return error for referencing undefined state in action target', () => {
      const ast = {
        version: '1.0',
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
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNDEFINED_STATE');
        expect(result.error.message).toContain('nonexistent');
      }
    });

    it('should return error for referencing undefined action in event handler', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'nonexistentAction' },
          },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNDEFINED_ACTION');
        expect(result.error.message).toContain('nonexistentAction');
      }
    });
  });

  describe('Duplicate Names', () => {
    it('should return error for duplicate action names', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'increment',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
          {
            name: 'increment',
            steps: [{ do: 'update', target: 'count', operation: 'decrement' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DUPLICATE_ACTION');
        expect(result.error.message).toContain('increment');
      }
    });
  });
});

// ==================== Edge Cases ====================

describe('validateAst - Edge Cases', () => {
  it('should return error for null input', () => {
    const result = validateAst(null);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_INVALID');
    }
  });

  it('should return error for undefined input', () => {
    const result = validateAst(undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_INVALID');
    }
  });

  it('should return error for array input', () => {
    const result = validateAst([]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_INVALID');
    }
  });

  it('should return error for string input', () => {
    const result = validateAst('not an ast');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_INVALID');
    }
  });

  it('should return error for invalid version format', () => {
    const ast = {
      version: '2.0',
      state: {},
      actions: [],
      view: { kind: 'element', tag: 'div' },
    };

    const result = validateAst(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNSUPPORTED_VERSION');
    }
  });

  it('should handle deeply nested view structures', () => {
    const createNestedElement = (depth: number): unknown => {
      if (depth === 0) {
        return { kind: 'text', value: { expr: 'lit', value: 'deep' } };
      }
      return {
        kind: 'element',
        tag: 'div',
        children: [createNestedElement(depth - 1)],
      };
    };

    const ast = {
      version: '1.0',
      state: {},
      actions: [],
      view: createNestedElement(10),
    };

    const result = validateAst(ast);
    expect(result.ok).toBe(true);
  });

  it('should validate empty state and actions', () => {
    const ast = {
      version: '1.0',
      state: {},
      actions: [],
      view: { kind: 'element', tag: 'div' },
    };

    const result = validateAst(ast);
    expect(result.ok).toBe(true);
  });
});

// ==================== Type Inference Tests ====================

describe('validateAst - Type Narrowing', () => {
  it('should narrow result type on success', () => {
    const result = validateAst(fixtures.valid.counter);

    if (result.ok) {
      // TypeScript should know result.ast is ConstelaAst
      expect(result.ast.version).toBe('1.0');
      expect(result.ast.state).toBeDefined();
      expect(result.ast.actions).toBeDefined();
      expect(result.ast.view).toBeDefined();
    } else {
      // Should not reach here
      expect.fail('Expected validation to succeed');
    }
  });

  it('should narrow result type on failure', () => {
    const result = validateAst(fixtures.invalid.missingVersion);

    if (!result.ok) {
      // TypeScript should know result.error is ConstelaError
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toBeDefined();
      expect(result.error.path).toBeDefined();
    } else {
      // Should not reach here
      expect.fail('Expected validation to fail');
    }
  });
});

// ==================== Component Schema Validation Tests ====================

describe('validateAst - Component Definitions', () => {
  describe('Valid Component Definitions', () => {
    it('should accept program with valid component definition', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Button: {
            params: {
              label: { type: 'string', required: true },
            },
            view: {
              kind: 'element',
              tag: 'button',
              children: [
                { kind: 'text', value: { expr: 'param', name: 'label' } },
              ],
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept component with only view (no params)', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Divider: {
            view: { kind: 'element', tag: 'hr' },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept component with multiple param types', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Card: {
            params: {
              title: { type: 'string', required: true },
              count: { type: 'number', required: false },
              visible: { type: 'boolean', required: false },
              data: { type: 'json', required: false },
            },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept component with slot in view', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Container: {
            view: {
              kind: 'element',
              tag: 'div',
              children: [{ kind: 'slot' }],
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept empty components object', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {},
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  describe('Valid Component Invocation', () => {
    it('should accept component node in view', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Button: {
            params: { label: { type: 'string', required: true } },
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: {
          kind: 'component',
          name: 'Button',
          props: {
            label: { expr: 'lit', value: 'Click me' },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept component node with children', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Container: {
            view: {
              kind: 'element',
              tag: 'div',
              children: [{ kind: 'slot' }],
            },
          },
        },
        view: {
          kind: 'component',
          name: 'Container',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Child content' } },
          ],
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept nested component invocations', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Icon: {
            params: { name: { type: 'string', required: true } },
            view: { kind: 'element', tag: 'i' },
          },
          Button: {
            params: { icon: { type: 'string', required: false } },
            view: {
              kind: 'element',
              tag: 'button',
              children: [
                {
                  kind: 'component',
                  name: 'Icon',
                  props: { name: { expr: 'param', name: 'icon' } },
                },
              ],
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  describe('Valid Param Expression', () => {
    it('should accept param expression in component view', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Greeting: {
            params: { name: { type: 'string', required: true } },
            view: {
              kind: 'text',
              value: { expr: 'param', name: 'name' },
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept param expression with path', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          UserCard: {
            params: { user: { type: 'json', required: true } },
            view: {
              kind: 'text',
              value: { expr: 'param', name: 'user', path: 'name' },
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });
});

describe('validateAst - Invalid Component Schema', () => {
  describe('Invalid Component Definition', () => {
    it('should return error for component without view', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Invalid: {
            params: { label: { type: 'string' } },
            // missing view
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/components/Invalid/view');
      }
    });

    it('should return error for invalid param type', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Invalid: {
            params: {
              data: { type: 'object', required: true }, // 'object' is not valid
            },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/components/Invalid/params/data/type');
      }
    });

    it('should return error for param missing type', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Invalid: {
            params: {
              label: { required: true }, // missing type
            },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/components/Invalid/params/label/type');
      }
    });
  });

  describe('Invalid Component Node', () => {
    it('should return error for component node without name', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Button: {
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: {
          kind: 'component',
          // missing name
          props: {},
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/name');
      }
    });

    it('should return error for component node with non-string name', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {},
        view: {
          kind: 'component',
          name: 123, // should be string
          props: {},
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/name');
      }
    });
  });

  // NOTE: Slot validation (slot outside component definition) is semantic validation,
  // which is implemented in @constela/compiler analyze pass, not in the core validator.
  describe.skip('Invalid Slot Node', () => {
    it('should return error for slot outside of component definition', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'slot' }, // slot at top level is invalid
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });
  });

  describe('Invalid Param Expression', () => {
    it('should return error for param expression without name', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Invalid: {
            params: { title: { type: 'string' } },
            view: {
              kind: 'text',
              value: { expr: 'param' }, // missing name
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/components/Invalid/view/value/name');
      }
    });

    it('should return error for param expression with non-string name', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Invalid: {
            params: { title: { type: 'string' } },
            view: {
              kind: 'text',
              value: { expr: 'param', name: 123 }, // name should be string
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/components/Invalid/view/value/name');
      }
    });

    it('should return error for param expression with non-string path', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Invalid: {
            params: { data: { type: 'json' } },
            view: {
              kind: 'text',
              value: { expr: 'param', name: 'data', path: 123 }, // path should be string
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/components/Invalid/view/value/path');
      }
    });
  });
});

// NOTE: Component semantic validation (COMPONENT_NOT_FOUND, COMPONENT_PROP_MISSING,
// COMPONENT_CYCLE, PARAM_UNDEFINED) is implemented in @constela/compiler analyze pass,
// not in the core validator. These tests are skipped here and will be tested in the compiler package.
describe.skip('validateAst - Component Semantic Validation', () => {
  describe('Component Not Found', () => {
    it('should return error for referencing undefined component', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {},
        view: {
          kind: 'component',
          name: 'NonexistentComponent',
          props: {},
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('COMPONENT_NOT_FOUND');
        expect(result.error.message).toContain('NonexistentComponent');
      }
    });
  });

  describe('Required Prop Missing', () => {
    it('should return error for missing required prop', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Button: {
            params: {
              label: { type: 'string', required: true },
            },
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: {
          kind: 'component',
          name: 'Button',
          props: {}, // missing required 'label' prop
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('COMPONENT_PROP_MISSING');
        expect(result.error.message).toContain('Button');
        expect(result.error.message).toContain('label');
      }
    });
  });

  describe('Component Cycle Detection', () => {
    it('should return error for self-referencing component', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Recursive: {
            view: {
              kind: 'component',
              name: 'Recursive', // self-reference
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('COMPONENT_CYCLE');
      }
    });

    it('should return error for circular component dependency', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          A: {
            view: { kind: 'component', name: 'B' },
          },
          B: {
            view: { kind: 'component', name: 'C' },
          },
          C: {
            view: { kind: 'component', name: 'A' }, // cycle: A -> B -> C -> A
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('COMPONENT_CYCLE');
      }
    });
  });

  describe('Undefined Param Reference', () => {
    it('should return error for referencing undefined param', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Card: {
            params: {
              title: { type: 'string', required: true },
            },
            view: {
              kind: 'text',
              value: { expr: 'param', name: 'nonexistent' }, // not defined in params
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PARAM_UNDEFINED');
        expect(result.error.message).toContain('nonexistent');
      }
    });
  });
});
