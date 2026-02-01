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

    // ==================== Cond and Get Expressions ====================

    describe('Cond and Get Expressions', () => {
      // ==================== Cond Expression Tests ====================

      describe('Cond Expression', () => {
        it('should accept valid cond expression', () => {
          const ast = {
            version: '1.0',
            state: { isLoggedIn: { type: 'boolean', initial: false } },
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'cond',
                if: { expr: 'state', name: 'isLoggedIn' },
                then: { expr: 'lit', value: 'Welcome!' },
                else: { expr: 'lit', value: 'Please log in' },
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(true);
        });

        it('should return error for cond expression missing if', () => {
          const ast = {
            version: '1.0',
            state: {},
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'cond',
                // missing 'if'
                then: { expr: 'lit', value: 'yes' },
                else: { expr: 'lit', value: 'no' },
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe('SCHEMA_INVALID');
            expect(result.error.path).toBe('/view/value/if');
          }
        });

        it('should return error for cond expression missing then', () => {
          const ast = {
            version: '1.0',
            state: {},
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'cond',
                if: { expr: 'lit', value: true },
                // missing 'then'
                else: { expr: 'lit', value: 'no' },
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe('SCHEMA_INVALID');
            expect(result.error.path).toBe('/view/value/then');
          }
        });

        it('should return error for cond expression missing else', () => {
          const ast = {
            version: '1.0',
            state: {},
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'cond',
                if: { expr: 'lit', value: true },
                then: { expr: 'lit', value: 'yes' },
                // missing 'else'
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe('SCHEMA_INVALID');
            expect(result.error.path).toBe('/view/value/else');
          }
        });

        it('should validate nested expressions in cond', () => {
          const ast = {
            version: '1.0',
            state: {},
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'cond',
                if: { expr: 'invalid-expr' }, // invalid nested expression
                then: { expr: 'lit', value: 'yes' },
                else: { expr: 'lit', value: 'no' },
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe('SCHEMA_INVALID');
            expect(result.error.path).toBe('/view/value/if/expr');
          }
        });
      });

      // ==================== Get Expression Tests ====================

      describe('Get Expression', () => {
        it('should accept valid get expression', () => {
          const ast = {
            version: '1.0',
            state: { user: { type: 'object', initial: { name: 'John' } } },
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'get',
                base: { expr: 'state', name: 'user' },
                path: 'name',
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(true);
        });

        it('should return error for get expression missing base', () => {
          const ast = {
            version: '1.0',
            state: {},
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'get',
                // missing 'base'
                path: 'name',
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe('SCHEMA_INVALID');
            expect(result.error.path).toBe('/view/value/base');
          }
        });

        it('should return error for get expression missing path', () => {
          const ast = {
            version: '1.0',
            state: { user: { type: 'object', initial: {} } },
            actions: [],
            view: {
              kind: 'text',
              value: {
                expr: 'get',
                base: { expr: 'state', name: 'user' },
                // missing 'path'
              },
            },
          };

          const result = validateAst(ast);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe('SCHEMA_INVALID');
            expect(result.error.path).toBe('/view/value/path');
          }
        });
      });
    });

    // ==================== Concat Expression Tests ====================

    describe('Concat Expression', () => {
      it('should accept valid concat expression', () => {
        const ast = {
          version: '1.0',
          state: { name: { type: 'string', initial: 'World' } },
          actions: [],
          view: {
            kind: 'text',
            value: {
              expr: 'concat',
              items: [
                { expr: 'lit', value: 'Hello, ' },
                { expr: 'state', name: 'name' },
              ],
            },
          },
        };

        const result = validateAst(ast);

        expect(result.ok).toBe(true);
      });

      it('should accept concat expression with empty items', () => {
        const ast = {
          version: '1.0',
          state: {},
          actions: [],
          view: {
            kind: 'text',
            value: {
              expr: 'concat',
              items: [],
            },
          },
        };

        const result = validateAst(ast);

        expect(result.ok).toBe(true);
      });

      it('should return error for concat expression missing items', () => {
        const ast = {
          version: '1.0',
          state: {},
          actions: [],
          view: {
            kind: 'text',
            value: {
              expr: 'concat',
              // missing items
            },
          },
        };

        const result = validateAst(ast);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('SCHEMA_INVALID');
          expect(result.error.path).toBe('/view/value/items');
        }
      });

      it('should return error for concat expression with non-array items', () => {
        const ast = {
          version: '1.0',
          state: {},
          actions: [],
          view: {
            kind: 'text',
            value: {
              expr: 'concat',
              items: 'not an array',
            },
          },
        };

        const result = validateAst(ast);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('SCHEMA_INVALID');
          expect(result.error.path).toBe('/view/value/items');
        }
      });

      it('should return error for concat expression with invalid item', () => {
        const ast = {
          version: '1.0',
          state: {},
          actions: [],
          view: {
            kind: 'text',
            value: {
              expr: 'concat',
              items: [
                { expr: 'lit', value: 'Hello' },
                { expr: 'invalid-expr' },
              ],
            },
          },
        };

        const result = validateAst(ast);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('SCHEMA_INVALID');
          expect(result.error.path).toBe('/view/value/items/1/expr');
        }
      });
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

  // ==================== Storage Action Validation ====================

  describe('Storage Action Validation', () => {
    it('should accept valid storage set action', () => {
      const ast = {
        version: '1.0',
        state: { value: { type: 'string', initial: '' } },
        actions: [
          {
            name: 'save',
            steps: [
              {
                do: 'storage',
                operation: 'set',
                key: { expr: 'lit', value: 'myKey' },
                value: { expr: 'state', name: 'value' },
                storage: 'local',
              },
            ],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept valid storage get action', () => {
      const ast = {
        version: '1.0',
        state: { value: { type: 'string', initial: '' } },
        actions: [
          {
            name: 'load',
            steps: [
              {
                do: 'storage',
                operation: 'get',
                key: { expr: 'lit', value: 'myKey' },
                result: 'storedValue',
              },
            ],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept valid storage remove action', () => {
      const ast = {
        version: '1.0',
        state: { value: { type: 'string', initial: '' } },
        actions: [
          {
            name: 'clear',
            steps: [
              {
                do: 'storage',
                operation: 'remove',
                key: { expr: 'lit', value: 'myKey' },
              },
            ],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should return error for storage action without operation', () => {
      const ast = {
        version: '1.0',
        state: { value: { type: 'string', initial: '' } },
        actions: [
          {
            name: 'save',
            steps: [
              {
                do: 'storage',
                // missing operation
                key: { expr: 'lit', value: 'myKey' },
                value: { expr: 'state', name: 'value' },
              },
            ],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/operation');
        expect(result.error.message).toContain('operation is required');
      }
    });

    it('should return error for storage action with invalid operation', () => {
      const ast = {
        version: '1.0',
        state: { value: { type: 'string', initial: '' } },
        actions: [
          {
            name: 'save',
            steps: [
              {
                do: 'storage',
                operation: 'invalid',
                key: { expr: 'lit', value: 'myKey' },
              },
            ],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/operation');
      }
    });

    it('should return error for storage action without key', () => {
      const ast = {
        version: '1.0',
        state: { value: { type: 'string', initial: '' } },
        actions: [
          {
            name: 'save',
            steps: [
              {
                do: 'storage',
                operation: 'set',
                // missing key
                value: { expr: 'state', name: 'value' },
              },
            ],
          },
        ],
        view: { kind: 'text', value: { expr: 'state', name: 'value' } },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/key');
      }
    });
  });

  // ==================== DOM Action Validation ====================

  describe('DOM Action Validation', () => {
    it('should accept valid dom addClass action', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'enableDarkMode',
            steps: [
              {
                do: 'dom',
                operation: 'addClass',
                selector: { expr: 'lit', value: 'html' },
                value: { expr: 'lit', value: 'dark' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept valid dom setAttribute action', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'setTheme',
            steps: [
              {
                do: 'dom',
                operation: 'setAttribute',
                selector: { expr: 'lit', value: 'html' },
                attribute: { expr: 'lit', value: 'data-theme' },
                value: { expr: 'lit', value: 'dark' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should return error for dom action without operation', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'test',
            steps: [
              {
                do: 'dom',
                // missing operation
                selector: { expr: 'lit', value: 'html' },
                value: { expr: 'lit', value: 'dark' },
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
        expect(result.error.path).toBe('/actions/0/steps/0/operation');
      }
    });

    it('should return error for dom action with invalid operation', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'test',
            steps: [
              {
                do: 'dom',
                operation: 'invalid',
                selector: { expr: 'lit', value: 'html' },
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
        expect(result.error.path).toBe('/actions/0/steps/0/operation');
      }
    });

    it('should return error for dom action without selector', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'test',
            steps: [
              {
                do: 'dom',
                operation: 'addClass',
                // missing selector
                value: { expr: 'lit', value: 'dark' },
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
        expect(result.error.path).toBe('/actions/0/steps/0/selector');
      }
    });
  });

  describe('Invalid State Fields', () => {
    it('should return error for invalid state field type', () => {
      const ast = {
        version: '1.0',
        state: {
          data: { type: 'unknown', initial: null },
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

  describe('Cookie Expression Initial Values', () => {
    it('should accept plain string initial value for string type', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: { type: 'string', initial: 'hello' },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept valid cookie expression for string type', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should return error for cookie expression missing key', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', default: 'light' },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/theme/initial/key');
      }
    });

    it('should return error for cookie expression missing default', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme' },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/theme/initial/default');
      }
    });

    it('should return error for cookie expression missing expr', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { key: 'theme', default: 'light' },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/theme/initial');
        expect(result.error.message).toContain('must be a string or a valid cookie expression');
      }
    });

    it('should return error for wrong expr value in cookie expression', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'state', key: 'theme', default: 'light' },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/theme/initial');
      }
    });

    it('should return error for non-string key in cookie expression', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 123, default: 'light' },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/theme/initial/key');
      }
    });

    it('should return error for non-string default in cookie expression', () => {
      const ast = {
        version: '1.0',
        state: {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 123 },
          },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/theme/initial/default');
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

// ==================== Markdown and Code Node Validation Tests ====================

describe('validateAst - Markdown and Code Nodes', () => {
  describe('Valid Markdown Node', () => {
    it('should accept valid markdown node with literal content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'markdown',
          content: { expr: 'lit', value: '# Hello World\n\nThis is **bold** text.' },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept markdown node with state expression', () => {
      const ast = {
        version: '1.0',
        state: { markdownContent: { type: 'string', initial: '# Title' } },
        actions: [],
        view: {
          kind: 'markdown',
          content: { expr: 'state', name: 'markdownContent' },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept markdown node nested in element', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'markdown',
              content: { expr: 'lit', value: '## Section Title' },
            },
          ],
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept markdown node with binary expression content', () => {
      const ast = {
        version: '1.0',
        state: { title: { type: 'string', initial: 'Hello' } },
        actions: [],
        view: {
          kind: 'markdown',
          content: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: '# ' },
            right: { expr: 'state', name: 'title' },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  describe('Invalid Markdown Node', () => {
    it('should return error for markdown node missing content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'markdown',
          // missing content
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/content');
      }
    });

    it('should return error for markdown node with non-expression content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'markdown',
          content: '# Hello World', // should be Expression object
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/content');
      }
    });

    it('should return error for markdown node with invalid expression', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'markdown',
          content: { expr: 'invalid-expr', value: 'test' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/content/expr');
      }
    });

    it('should return error for nested markdown with missing content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'markdown',
              // missing content
            },
          ],
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/children/0/content');
      }
    });
  });

  describe('Valid Code Node', () => {
    it('should accept valid code node with literal values', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'lit', value: 'const x = 1;' },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept code node with state expressions', () => {
      const ast = {
        version: '1.0',
        state: {
          selectedLanguage: { type: 'string', initial: 'python' },
          codeSnippet: { type: 'string', initial: 'print("hello")' },
        },
        actions: [],
        view: {
          kind: 'code',
          language: { expr: 'state', name: 'selectedLanguage' },
          content: { expr: 'state', name: 'codeSnippet' },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept code node nested in element', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'article',
          children: [
            {
              kind: 'code',
              language: { expr: 'lit', value: 'typescript' },
              content: { expr: 'lit', value: 'const greeting: string = "Hello";' },
            },
          ],
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept code node with conditional expression', () => {
      const ast = {
        version: '1.0',
        state: { useTypeScript: { type: 'boolean', initial: true } },
        actions: [],
        view: {
          kind: 'code',
          language: {
            expr: 'cond',
            if: { expr: 'state', name: 'useTypeScript' },
            then: { expr: 'lit', value: 'typescript' },
            else: { expr: 'lit', value: 'javascript' },
          },
          content: { expr: 'lit', value: 'const x = 1;' },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  describe('Invalid Code Node', () => {
    it('should return error for code node missing language', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          // missing language
          content: { expr: 'lit', value: 'const x = 1;' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/language');
      }
    });

    it('should return error for code node missing content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          // missing content
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/content');
      }
    });

    it('should return error for code node with non-expression language', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          language: 'javascript', // should be Expression object
          content: { expr: 'lit', value: 'const x = 1;' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/language');
      }
    });

    it('should return error for code node with non-expression content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: 'const x = 1;', // should be Expression object
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/content');
      }
    });

    it('should return error for code node with invalid language expression', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          language: { expr: 'invalid-expr', value: 'js' },
          content: { expr: 'lit', value: 'const x = 1;' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/language/expr');
      }
    });

    it('should return error for code node with invalid content expression', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'code',
          language: { expr: 'lit', value: 'javascript' },
          content: { expr: 'invalid-expr', value: 'test' },
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/content/expr');
      }
    });

    it('should return error for nested code node with missing language', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'code',
              // missing language
              content: { expr: 'lit', value: 'const x = 1;' },
            },
          ],
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/children/0/language');
      }
    });

    it('should return error for nested code node with missing content', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'code',
              language: { expr: 'lit', value: 'javascript' },
              // missing content
            },
          ],
        },
      };

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/children/0/content');
      }
    });
  });

  describe('Markdown and Code in Each Node', () => {
    it('should validate markdown node in each body', () => {
      const ast = {
        version: '1.0',
        state: { docs: { type: 'list', initial: [] } },
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'docs' },
          as: 'doc',
          body: {
            kind: 'markdown',
            content: { expr: 'var', name: 'doc', path: 'content' },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should validate code node in each body', () => {
      const ast = {
        version: '1.0',
        state: { snippets: { type: 'list', initial: [] } },
        actions: [],
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'snippets' },
          as: 'snippet',
          body: {
            kind: 'code',
            language: { expr: 'var', name: 'snippet', path: 'lang' },
            content: { expr: 'var', name: 'snippet', path: 'code' },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  describe('Markdown and Code in If Node', () => {
    it('should validate markdown node in if then/else', () => {
      const ast = {
        version: '1.0',
        state: { showMarkdown: { type: 'boolean', initial: true } },
        actions: [],
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showMarkdown' },
          then: {
            kind: 'markdown',
            content: { expr: 'lit', value: '# Visible' },
          },
          else: {
            kind: 'text',
            value: { expr: 'lit', value: 'Hidden' },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should validate code node in if then/else', () => {
      const ast = {
        version: '1.0',
        state: { showCode: { type: 'boolean', initial: true } },
        actions: [],
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showCode' },
          then: {
            kind: 'code',
            language: { expr: 'lit', value: 'javascript' },
            content: { expr: 'lit', value: 'console.log("visible")' },
          },
          else: {
            kind: 'code',
            language: { expr: 'lit', value: 'javascript' },
            content: { expr: 'lit', value: 'console.log("hidden")' },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
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

// ==================== Whitelist Coverage Tests ====================
// These tests verify that all valid kinds, expression types, and action types
// are accepted by the validator. Currently, some items are missing from the whitelist.

describe('validateAst - Whitelist Coverage (TDD Red Phase)', () => {
  // ==================== Portal View Node ====================

  describe('Portal View Node', () => {
    it('should accept valid portal node with target', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'portal',
          target: 'modal-root',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Portal content' } },
          ],
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept portal node inside element children', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'portal',
              target: 'tooltip-container',
              children: [
                { kind: 'element', tag: 'span' },
              ],
            },
          ],
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Validity Expression ====================

  describe('Validity Expression', () => {
    it('should accept valid validity expression with ref', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'validity',
            ref: 'emailInput',
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Index Expression ====================

  describe('Index Expression', () => {
    it('should accept valid index expression with base and key', () => {
      const ast = {
        version: '1.0',
        state: { items: { type: 'list', initial: ['a', 'b', 'c'] } },
        actions: [],
        view: {
          kind: 'text',
          value: {
            expr: 'index',
            base: { expr: 'state', name: 'items' },
            key: { expr: 'lit', value: 0 },
          },
        },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Delay Action ====================

  describe('Delay Action', () => {
    it('should accept valid delay action with ms and then', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'delayedIncrement',
            steps: [
              {
                do: 'delay',
                ms: { expr: 'lit', value: 1000 },
                then: [
                  { do: 'update', target: 'count', operation: 'increment' },
                ],
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Interval Action ====================

  describe('Interval Action', () => {
    it('should accept valid interval action with ms and action', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'startCounter',
            steps: [
              {
                do: 'interval',
                ms: { expr: 'lit', value: 1000 },
                action: 'incrementCount',
              },
            ],
          },
          {
            name: 'incrementCount',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== ClearTimer Action ====================

  describe('ClearTimer Action', () => {
    it('should accept valid clearTimer action with target', () => {
      const ast = {
        version: '1.0',
        state: { timerId: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'stopCounter',
            steps: [
              { do: 'clearTimer', target: { expr: 'state', name: 'timerId' } },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Focus Action ====================

  describe('Focus Action', () => {
    it('should accept valid focus action with target and operation', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'focusInput',
            steps: [
              {
                do: 'focus',
                target: { expr: 'lit', value: 'emailInput' },
                operation: 'focus',
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });
  });

  // ==================== If Action ====================

  describe('If Action', () => {
    it('should accept valid if action with condition and then', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'conditionalIncrement',
            steps: [
              {
                do: 'if',
                condition: {
                  expr: 'bin',
                  op: '<',
                  left: { expr: 'state', name: 'count' },
                  right: { expr: 'lit', value: 10 },
                },
                then: [
                  { do: 'update', target: 'count', operation: 'increment' },
                ],
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
    });

    it('should accept if action with else branch', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'conditionalAction',
            steps: [
              {
                do: 'if',
                condition: { expr: 'state', name: 'count' },
                then: [
                  { do: 'update', target: 'count', operation: 'increment' },
                ],
                else: [
                  { do: 'update', target: 'count', operation: 'decrement' },
                ],
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validateAst(ast);
      expect(result.ok).toBe(true);
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
