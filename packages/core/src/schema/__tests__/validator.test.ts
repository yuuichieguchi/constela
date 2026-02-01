/**
 * Test module for Validator bug fixes.
 *
 * Coverage:
 * - Bug 1: Missing action types in VALID_ACTION_TYPES (sseConnect, sseClose, optimistic, confirm, reject)
 * - Bug 2: Component node EventHandler props not being skipped (causes "expr is required" error)
 *
 * TDD Red Phase: These tests MUST FAIL initially because:
 * - VALID_ACTION_TYPES does not include sseConnect, sseClose, optimistic, confirm, reject
 * - validateViewNode for 'component' does not skip EventHandler props
 */

import { describe, it, expect } from 'vitest';

import { validateAst } from '../../index.js';

// ==================== Helper: Create minimal valid AST ====================

/**
 * Creates a minimal valid AST with a custom action step
 */
function createAstWithActionStep(step: unknown) {
  return {
    version: '1.0',
    state: {
      items: { type: 'list', initial: [] },
      count: { type: 'number', initial: 0 },
    },
    actions: [
      {
        name: 'testAction',
        steps: [step],
      },
    ],
    view: {
      kind: 'text',
      value: { expr: 'lit', value: 'test' },
    },
  };
}

/**
 * Creates a minimal valid AST with a component node
 */
function createAstWithComponentNode(componentNode: unknown) {
  return {
    version: '1.0',
    state: {
      items: { type: 'list', initial: [] },
    },
    actions: [
      {
        name: 'sortData',
        steps: [{ do: 'set', target: 'items', value: { expr: 'lit', value: [] } }],
      },
    ],
    view: componentNode,
  };
}

// ==================== Bug 1: Missing action types in VALID_ACTION_TYPES ====================

describe('Bug 1: Missing action types in VALID_ACTION_TYPES', () => {
  // ==================== SSE Actions ====================

  describe('SSE action types', () => {
    it('should accept sseConnect action type', () => {
      /**
       * Given: A valid sseConnect action step
       * When: The AST is validated
       * Then: Validation should succeed (no error about invalid action type)
       *
       * Currently FAILS because 'sseConnect' is not in VALID_ACTION_TYPES
       */
      const ast = createAstWithActionStep({
        do: 'sseConnect',
        connection: 'events',
        url: { expr: 'lit', value: '/api/events' },
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept sseClose action type', () => {
      /**
       * Given: A valid sseClose action step
       * When: The AST is validated
       * Then: Validation should succeed (no error about invalid action type)
       *
       * Currently FAILS because 'sseClose' is not in VALID_ACTION_TYPES
       */
      const ast = createAstWithActionStep({
        do: 'sseClose',
        connection: 'events',
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Optimistic Update Actions ====================

  describe('Optimistic update action types', () => {
    it('should accept optimistic action type', () => {
      /**
       * Given: A valid optimistic action step
       * When: The AST is validated
       * Then: Validation should succeed (no error about invalid action type)
       *
       * Currently FAILS because 'optimistic' is not in VALID_ACTION_TYPES
       */
      const ast = createAstWithActionStep({
        do: 'optimistic',
        target: 'items',
        value: { expr: 'lit', value: [{ id: 1, name: 'test' }] },
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept confirm action type', () => {
      /**
       * Given: A valid confirm action step
       * When: The AST is validated
       * Then: Validation should succeed (no error about invalid action type)
       *
       * Currently FAILS because 'confirm' is not in VALID_ACTION_TYPES
       */
      const ast = createAstWithActionStep({
        do: 'confirm',
        id: { expr: 'var', name: 'updateId' },
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should accept reject action type', () => {
      /**
       * Given: A valid reject action step
       * When: The AST is validated
       * Then: Validation should succeed (no error about invalid action type)
       *
       * Currently FAILS because 'reject' is not in VALID_ACTION_TYPES
       */
      const ast = createAstWithActionStep({
        do: 'reject',
        id: { expr: 'var', name: 'updateId' },
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Bug 2: Component node EventHandler props not being skipped ====================

describe('Bug 2: Component node EventHandler props not being skipped', () => {
  it('should accept component node with EventHandler props', () => {
    /**
     * Given: A component node with props containing an EventHandler (has 'event' key)
     * When: The AST is validated
     * Then: Validation should succeed (EventHandler props should be skipped, not treated as Expression)
     *
     * Currently FAILS because validateViewNode for 'component' kind does not skip EventHandler props,
     * causing "expr is required" error when EventHandler is passed to validateExpression
     */
    const ast = createAstWithComponentNode({
      kind: 'component',
      name: 'DataTable',
      props: {
        data: { expr: 'state', name: 'items' },
        onSort: { event: 'click', action: 'sortData' },
      },
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });

  it('should accept component node with multiple EventHandler props', () => {
    /**
     * Given: A component node with multiple EventHandler props
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * Currently FAILS for same reason as above
     */
    const ast = createAstWithComponentNode({
      kind: 'component',
      name: 'DataGrid',
      props: {
        items: { expr: 'state', name: 'items' },
        onRowClick: { event: 'click', action: 'sortData' },
        onHeaderClick: { event: 'click', action: 'sortData' },
        className: { expr: 'lit', value: 'grid' },
      },
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });

  it('should accept component node with EventHandler having options', () => {
    /**
     * Given: A component node with EventHandler that has event options
     * When: The AST is validated
     * Then: Validation should succeed
     *
     * Currently FAILS for same reason as above
     */
    const ast = createAstWithComponentNode({
      kind: 'component',
      name: 'InfiniteScroll',
      props: {
        items: { expr: 'state', name: 'items' },
        onIntersect: {
          event: 'intersect',
          action: 'sortData',
          options: { threshold: 0.5 },
        },
      },
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });

  it('should still validate Expression props correctly in component node', () => {
    /**
     * Given: A component node with only Expression props (no EventHandler)
     * When: The AST is validated
     * Then: Validation should succeed (existing behavior)
     *
     * This test ensures the fix does not break existing Expression prop validation
     */
    const ast = createAstWithComponentNode({
      kind: 'component',
      name: 'Button',
      props: {
        label: { expr: 'lit', value: 'Click me' },
        disabled: { expr: 'state', name: 'items' },
      },
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(true);
  });

  it('should still reject invalid Expression props in component node', () => {
    /**
     * Given: A component node with invalid Expression prop (missing expr)
     * When: The AST is validated
     * Then: Validation should fail with "expr is required" error
     *
     * This test ensures the fix does not accidentally skip invalid props
     */
    const ast = createAstWithComponentNode({
      kind: 'component',
      name: 'Button',
      props: {
        label: { value: 'Click me' }, // missing 'expr', not an EventHandler (no 'event')
      },
    });

    const result = validateAst(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SCHEMA_INVALID');
      expect(result.error.message).toContain('expr is required');
    }
  });
});
