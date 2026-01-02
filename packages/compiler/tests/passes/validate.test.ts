/**
 * Validate Pass Tests for @constela/compiler
 *
 * Coverage:
 * - Schema validation via @constela/core validateAst
 * - Error code and path reporting
 * - Pass integration with analyze pass
 *
 * TDD Red Phase: These tests will FAIL because implementation does not exist.
 */

import { describe, it, expect } from 'vitest';

// Import from the module that doesn't exist yet
import { validatePass, type ValidatePassResult } from '../../src/passes/validate.js';

// ==================== Schema Validation Tests ====================

describe('validatePass - Schema Validation', () => {
  describe('Valid Inputs', () => {
    it('should return ok: true for valid minimal AST', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return validated AST on success', () => {
      const ast = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ast.version).toBe('1.0');
        expect(result.ast.state['count']).toBeDefined();
      }
    });
  });

  describe('Invalid Schema', () => {
    it('should return SCHEMA_INVALID error for missing version', () => {
      const ast = {
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/version');
      }
    });

    it('should return SCHEMA_INVALID error for missing state', () => {
      const ast = {
        version: '1.0',
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state');
      }
    });

    it('should return SCHEMA_INVALID error for missing actions', () => {
      const ast = {
        version: '1.0',
        state: {},
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions');
      }
    });

    it('should return SCHEMA_INVALID error for missing view', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view');
      }
    });
  });

  describe('Invalid Node Kinds', () => {
    it('should return error with correct path for invalid view node kind', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'invalid-kind', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/kind');
      }
    });

    it('should return error with correct path for nested invalid node kind', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'not-valid' }],
        },
      };

      const result = validatePass(ast);

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
          value: { expr: 'unknown-expr', value: 'test' },
        },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/expr');
      }
    });

    it('should return error for missing required expression fields', () => {
      const ast = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'state' }, // missing 'name'
        },
      };

      const result = validatePass(ast);

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

      const result = validatePass(ast);

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

      const result = validatePass(ast);

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

      const result = validatePass(ast);

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

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/actions/0/steps/0/operation');
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

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/data/type');
      }
    });

    it('should return error for type mismatch in initial value', () => {
      const ast = {
        version: '1.0',
        state: {
          count: { type: 'number', initial: 'not a number' },
        },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/state/count/initial');
      }
    });
  });

  describe('Version Validation', () => {
    it('should return UNSUPPORTED_VERSION error for version 2.0', () => {
      const ast = {
        version: '2.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNSUPPORTED_VERSION');
        expect(result.error.path).toBe('/version');
      }
    });

    it('should return UNSUPPORTED_VERSION error for invalid version string', () => {
      const ast = {
        version: '0.5',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNSUPPORTED_VERSION');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return error for null input', () => {
      const result = validatePass(null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for undefined input', () => {
      const result = validatePass(undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for array input', () => {
      const result = validatePass([]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for primitive input', () => {
      const result = validatePass('string');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });
  });
});
