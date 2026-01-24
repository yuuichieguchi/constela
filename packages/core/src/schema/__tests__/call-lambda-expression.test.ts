/**
 * Test module for Call and Lambda Expression schema validation.
 *
 * Coverage:
 * - CallExpr schema validation
 * - LambdaExpr schema validation
 * - Nested call/lambda expressions
 * - Error handling for invalid structures
 *
 * TDD Red Phase: These tests verify the call and lambda expression types
 * that will be added to support method chaining (e.g., array.filter, map)
 * in Constela DSL.
 *
 * Expected: All tests should FAIL initially because:
 * - 'call' and 'lambda' are not yet in VALID_EXPR_TYPES
 * - validateExpression does not handle these expression types
 */

import { describe, it, expect } from 'vitest';

import { validateAst } from '../../index.js';

// ==================== Helper: Create minimal valid AST ====================

/**
 * Creates a minimal valid AST with a custom expression in view/text/value
 */
function createAstWithExpression(expression: unknown) {
  return {
    version: '1.0',
    state: { items: { type: 'list', initial: [1, 2, 3] } },
    actions: [],
    view: {
      kind: 'text',
      value: expression,
    },
  };
}

/**
 * Creates a minimal valid AST with a custom expression in element props
 */
function createAstWithPropExpression(expression: unknown) {
  return {
    version: '1.0',
    state: { items: { type: 'list', initial: [1, 2, 3] } },
    actions: [],
    view: {
      kind: 'element',
      tag: 'div',
      props: {
        className: expression,
      },
    },
  };
}

// ==================== CallExpr Validation Tests ====================

describe('CallExpr Schema Validation', () => {
  // ==================== Happy Path ====================

  describe('Valid call expressions', () => {
    it('should accept call expression with target, method, and args', () => {
      /**
       * Given: A valid call expression with all required fields
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: items.filter(fn) -> { expr: 'call', target: state('items'), method: 'filter', args: [lambda] }
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'item' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept call expression without args (for methods like length)', () => {
      /**
       * Given: A valid call expression without args
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: items.length -> technically a property, but "toString()" would be a no-arg call
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'toString',
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept call expression with literal args', () => {
      /**
       * Given: A call expression with literal arguments
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: str.substring(0, 5)
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'slice',
        args: [
          { expr: 'lit', value: 0 },
          { expr: 'lit', value: 3 },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept chained call expressions', () => {
      /**
       * Given: Chained call expressions (e.g., items.filter().map())
       * When: The AST is validated
       * Then: Validation should succeed
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: {
          expr: 'call',
          target: { expr: 'state', name: 'items' },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 0 },
              },
            },
          ],
        },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '*',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept call expression on Math object', () => {
      /**
       * Given: A call expression targeting Math methods
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: Math.floor(value)
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'lit', value: 'Math' },
        method: 'floor',
        args: [{ expr: 'state', name: 'items' }],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Error Cases ====================

  describe('Invalid call expressions', () => {
    it('should return error for call expression missing target', () => {
      /**
       * Given: A call expression without target
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        // missing target
        method: 'filter',
        args: [],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/target');
      }
    });

    it('should return error for call expression missing method', () => {
      /**
       * Given: A call expression without method
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        // missing method
        args: [],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/method');
      }
    });

    it('should return error for call expression with non-string method', () => {
      /**
       * Given: A call expression with method that is not a string
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 123, // should be string
        args: [],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/method');
      }
    });

    it('should return error for call expression with non-array args', () => {
      /**
       * Given: A call expression with args that is not an array
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: { expr: 'lit', value: 1 }, // should be array
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args');
      }
    });

    it('should return error for call expression with invalid target expression', () => {
      /**
       * Given: A call expression with invalid target expression
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'invalid-expr' }, // invalid expression type
        method: 'filter',
        args: [],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/target/expr');
      }
    });

    it('should return error for call expression with invalid arg expression', () => {
      /**
       * Given: A call expression with invalid argument expression
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [{ expr: 'invalid-arg' }], // invalid expression in args
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args/0/expr');
      }
    });
  });
});

// ==================== LambdaExpr Validation Tests ====================

describe('LambdaExpr Schema Validation', () => {
  // ==================== Happy Path ====================

  describe('Valid lambda expressions', () => {
    it('should accept lambda expression with param and body', () => {
      /**
       * Given: A valid lambda expression with required fields
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: (item) => item > 0
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'item' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept lambda expression with optional index parameter', () => {
      /**
       * Given: A lambda expression with index parameter
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: (item, index) => index > 0
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            index: 'i',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'i' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept lambda with complex body expression', () => {
      /**
       * Given: A lambda expression with complex nested body
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: (item) => item.value > 0 && item.active
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'bin',
              op: '&&',
              left: {
                expr: 'bin',
                op: '>',
                left: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'value' },
                right: { expr: 'lit', value: 0 },
              },
              right: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'active' },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept lambda returning literal value', () => {
      /**
       * Given: A lambda that returns a literal (e.g., for constant mapping)
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: (item) => 1
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: { expr: 'lit', value: 1 },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Error Cases ====================

  describe('Invalid lambda expressions', () => {
    it('should return error for lambda expression missing param', () => {
      /**
       * Given: A lambda expression without param
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            // missing param
            body: { expr: 'lit', value: true },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args/0/param');
      }
    });

    it('should return error for lambda expression missing body', () => {
      /**
       * Given: A lambda expression without body
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            // missing body
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args/0/body');
      }
    });

    it('should return error for lambda expression with non-string param', () => {
      /**
       * Given: A lambda expression with param that is not a string
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 123, // should be string
            body: { expr: 'lit', value: true },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args/0/param');
      }
    });

    it('should return error for lambda expression with non-string index', () => {
      /**
       * Given: A lambda expression with index that is not a string
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            index: 123, // should be string
            body: { expr: 'lit', value: true },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args/0/index');
      }
    });

    it('should return error for lambda expression with invalid body expression', () => {
      /**
       * Given: A lambda expression with invalid body expression
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: { expr: 'invalid-body' }, // invalid expression type
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/args/0/body/expr');
      }
    });
  });
});

// ==================== Nested Expression Tests ====================

describe('Nested Call and Lambda Expressions', () => {
  describe('call with lambda in args', () => {
    it('should validate call expression containing lambda in args', () => {
      /**
       * Given: A call expression with lambda as argument
       * When: The AST is validated
       * Then: Both call and lambda should be validated
       *
       * Example: items.filter((x) => x > 0)
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '>',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 0 },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate multiple lambdas in call args', () => {
      /**
       * Given: A call expression with multiple lambda arguments
       * When: The AST is validated
       * Then: All lambdas should be validated
       *
       * Example: items.reduce((acc, item) => acc + item, 0) - conceptually
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'reduce',
        args: [
          {
            expr: 'lambda',
            param: 'acc',
            index: 'item',
            body: {
              expr: 'bin',
              op: '+',
              left: { expr: 'var', name: 'acc' },
              right: { expr: 'var', name: 'item' },
            },
          },
          { expr: 'lit', value: 0 },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('lambda body containing call', () => {
    it('should validate lambda with call expression in body', () => {
      /**
       * Given: A lambda expression with a call in its body
       * When: The AST is validated
       * Then: Both lambda and nested call should be validated
       *
       * Example: items.map((item) => item.values.filter((v) => v > 0))
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: { expr: 'state', name: 'items' },
        method: 'map',
        args: [
          {
            expr: 'lambda',
            param: 'item',
            body: {
              expr: 'call',
              target: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'values' },
              method: 'filter',
              args: [
                {
                  expr: 'lambda',
                  param: 'v',
                  body: {
                    expr: 'bin',
                    op: '>',
                    left: { expr: 'var', name: 'v' },
                    right: { expr: 'lit', value: 0 },
                  },
                },
              ],
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('deeply nested structures', () => {
    it('should validate deeply nested call and lambda expressions', () => {
      /**
       * Given: Multiple levels of nested call and lambda expressions
       * When: The AST is validated
       * Then: All nested structures should be validated
       *
       * Example: items.filter(...).map(...).filter(...)
       */
      const ast = createAstWithExpression({
        expr: 'call',
        target: {
          expr: 'call',
          target: {
            expr: 'call',
            target: { expr: 'state', name: 'items' },
            method: 'filter',
            args: [
              {
                expr: 'lambda',
                param: 'x',
                body: {
                  expr: 'bin',
                  op: '>',
                  left: { expr: 'var', name: 'x' },
                  right: { expr: 'lit', value: 0 },
                },
              },
            ],
          },
          method: 'map',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: {
                expr: 'bin',
                op: '*',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 2 },
              },
            },
          ],
        },
        method: 'filter',
        args: [
          {
            expr: 'lambda',
            param: 'x',
            body: {
              expr: 'bin',
              op: '<',
              left: { expr: 'var', name: 'x' },
              right: { expr: 'lit', value: 100 },
            },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Call/Lambda in Element Props ====================

describe('Call and Lambda in Element Props', () => {
  it('should validate call expression in element className prop', () => {
    /**
     * Given: A call expression used as element prop value
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * Example: <div className={items.join(' ')} />
     */
    const ast = createAstWithPropExpression({
      expr: 'call',
      target: { expr: 'state', name: 'items' },
      method: 'join',
      args: [{ expr: 'lit', value: ' ' }],
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });
});

// ==================== Call Expression in Each Node ====================

describe('Call Expression in Each Node', () => {
  it('should validate call expression as items in each node', () => {
    /**
     * Given: An each node with call expression as items
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * Example: each items.filter((x) => x > 0) as item
     */
    const ast = {
      version: '1.0',
      state: { items: { type: 'list', initial: [1, 2, 3] } },
      actions: [],
      view: {
        kind: 'each',
        items: {
          expr: 'call',
          target: { expr: 'state', name: 'items' },
          method: 'filter',
          args: [
            {
              expr: 'lambda',
              param: 'x',
              body: {
                expr: 'bin',
                op: '>',
                left: { expr: 'var', name: 'x' },
                right: { expr: 'lit', value: 0 },
              },
            },
          ],
        },
        as: 'item',
        body: {
          kind: 'text',
          value: { expr: 'var', name: 'item' },
        },
      },
    };

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });
});
