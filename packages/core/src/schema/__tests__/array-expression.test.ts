/**
 * Test module for Array Expression schema validation.
 *
 * Coverage:
 * - ArrayExpr schema validation
 * - Empty array expressions
 * - Array with literal elements
 * - Array with variable elements
 * - Array with function call results
 * - Nested array expressions
 * - Error handling for invalid structures
 *
 * TDD Red Phase: These tests verify the array expression type
 * that will be added to support dynamic array construction (e.g., [basicSetup, json()])
 * in Constela DSL.
 *
 * Expected: All tests should FAIL initially because:
 * - 'array' is not yet in VALID_EXPR_TYPES
 * - validateExpression does not handle this expression type
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
    state: { items: { type: 'list', initial: [] } },
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
    state: { items: { type: 'list', initial: [] } },
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

// ==================== ArrayExpr Validation Tests ====================

describe('ArrayExpr Schema Validation', () => {
  // ==================== Happy Path ====================

  describe('Valid array expressions', () => {
    it('should accept empty array expression', () => {
      /**
       * Given: A valid array expression with empty elements
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: []
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept array expression with literal elements', () => {
      /**
       * Given: A valid array expression with literal values
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: [1, 2, "hello"]
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 2 },
          { expr: 'lit', value: 'hello' },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept array expression with variable elements', () => {
      /**
       * Given: A valid array expression with variable references
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: [basicSetup, myVar]
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'var', name: 'basicSetup' },
          { expr: 'var', name: 'myVar' },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept array expression with function call results', () => {
      /**
       * Given: A valid array expression with function call results
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: [basicSetup, json()] - CodeMirror pattern
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'var', name: 'basicSetup' },
          {
            expr: 'call',
            target: { expr: 'var', name: 'json' },
            method: 'apply',
            args: [],
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept array expression with state values', () => {
      /**
       * Given: A valid array expression with state references
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: [state.items, state.count]
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'state', name: 'items' },
          { expr: 'lit', value: 10 },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept nested array expressions', () => {
      /**
       * Given: A valid array expression containing another array expression
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: [[1, 2], [3, 4]]
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          {
            expr: 'array',
            elements: [
              { expr: 'lit', value: 1 },
              { expr: 'lit', value: 2 },
            ],
          },
          {
            expr: 'array',
            elements: [
              { expr: 'lit', value: 3 },
              { expr: 'lit', value: 4 },
            ],
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept array expression with mixed element types', () => {
      /**
       * Given: A valid array expression with various expression types
       * When: The AST is validated
       * Then: Validation should succeed
       *
       * Example: [1, "text", state.value, someVar, condition ? a : b]
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 'text' },
          { expr: 'state', name: 'items' },
          { expr: 'var', name: 'someVar' },
          {
            expr: 'cond',
            if: { expr: 'lit', value: true },
            then: { expr: 'lit', value: 'a' },
            else: { expr: 'lit', value: 'b' },
          },
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Error Cases ====================

  describe('Invalid array expressions', () => {
    it('should return error for array expression missing elements', () => {
      /**
       * Given: An array expression without elements field
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'array',
        // missing elements
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/elements');
      }
    });

    it('should return error for array expression with non-array elements', () => {
      /**
       * Given: An array expression with elements that is not an array
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: { expr: 'lit', value: 1 }, // should be array
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/elements');
      }
    });

    it('should return error for array expression with invalid element expression', () => {
      /**
       * Given: An array expression with invalid element expression
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          { expr: 'invalid-expr' }, // invalid expression type
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/value/elements/1/expr');
      }
    });

    it('should return error for array expression with non-object element', () => {
      /**
       * Given: An array expression with a non-object element
       * When: The AST is validated
       * Then: Validation should fail with appropriate error
       */
      const ast = createAstWithExpression({
        expr: 'array',
        elements: [
          { expr: 'lit', value: 1 },
          'not-an-expression', // should be an object
        ],
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });
  });
});

// ==================== Array Expression in Element Props ====================

describe('Array Expression in Element Props', () => {
  it('should validate array expression in element prop', () => {
    /**
     * Given: An array expression used as element prop value
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * Example: <div extensions={[basicSetup, json()]} />
     */
    const ast = createAstWithPropExpression({
      expr: 'array',
      elements: [
        { expr: 'var', name: 'basicSetup' },
        { expr: 'lit', value: 'extension1' },
      ],
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });
});

// ==================== Array Expression in Each Node ====================

describe('Array Expression in Each Node', () => {
  it('should validate array expression as items in each node', () => {
    /**
     * Given: An each node with array expression as items
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * Example: each [1, 2, 3] as item
     */
    const ast = {
      version: '1.0',
      state: { items: { type: 'list', initial: [] } },
      actions: [],
      view: {
        kind: 'each',
        items: {
          expr: 'array',
          elements: [
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 2 },
            { expr: 'lit', value: 3 },
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

// ==================== Array Expression with Call Expressions ====================

describe('Array Expression with Call Expressions', () => {
  it('should validate array expression containing call results', () => {
    /**
     * Given: An array expression with call expression elements
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * This represents the CodeMirror extensions pattern:
     * extensions: [basicSetup, json()]
     */
    const ast = createAstWithExpression({
      expr: 'array',
      elements: [
        { expr: 'var', name: 'basicSetup' },
        {
          expr: 'call',
          target: { expr: 'var', name: 'json' },
          method: 'apply',
          args: [],
        },
        {
          expr: 'call',
          target: { expr: 'var', name: 'EditorView' },
          method: 'updateListener',
          args: [
            {
              expr: 'lambda',
              param: 'v',
              body: { expr: 'lit', value: true },
            },
          ],
        },
      ],
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });
});
