/**
 * Test module for Transition Directive - Schema Validation and Transform Pass.
 *
 * Coverage:
 * - Schema validation of transition directive on if/each nodes
 * - Valid transition configs pass validation
 * - Invalid transition configs fail validation with proper errors
 * - Transform pass preserves transition on CompiledIfNode and CompiledEachNode
 * - If/each nodes without transition remain unchanged
 *
 * TDD Red Phase: These tests MUST FAIL because:
 * - The `transition` field does not exist on IfNode or EachNode in the AST types
 * - The validator does not recognize or validate `transition` on view nodes
 * - The transform pass does not propagate `transition` to compiled nodes
 */

import { describe, it, expect } from 'vitest';
import { validateAst } from '@constela/core';
import { compile } from '../../compile.js';

// ==================== Helper Functions ====================

/**
 * Creates a minimal AST with an if node containing a transition directive.
 */
function createIfWithTransition(transition: unknown) {
  return {
    version: '1.0',
    state: { visible: { type: 'boolean', initial: true } },
    actions: [],
    view: {
      kind: 'if',
      condition: { expr: 'state', name: 'visible' },
      transition,
      then: { kind: 'element', tag: 'div' },
    },
  };
}

/**
 * Creates a minimal AST with an each node containing a transition directive.
 */
function createEachWithTransition(transition: unknown) {
  return {
    version: '1.0',
    state: { items: { type: 'list', initial: [] } },
    actions: [],
    view: {
      kind: 'each',
      items: { expr: 'state', name: 'items' },
      as: 'item',
      transition,
      body: {
        kind: 'element',
        tag: 'div',
      },
    },
  };
}

// ==================== Schema Validation Tests ====================

describe('Transition Directive - Schema Validation', () => {
  // ==================== Valid Transition Configs ====================

  describe('valid transition configs', () => {
    it('should pass validation with full transition config on if node', () => {
      /**
       * Given: An if node with a complete transition config
       *        (enter, enterActive, exit, exitActive, duration)
       * When: The AST is validated
       * Then: Validation should succeed
       */
      const ast = createIfWithTransition({
        enter: 'fade-enter',
        enterActive: 'fade-enter-active',
        exit: 'fade-exit',
        exitActive: 'fade-exit-active',
        duration: 300,
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });

    it('should pass validation with only enter/exit classes (no duration)', () => {
      /**
       * Given: An if node with transition that omits duration
       * When: The AST is validated
       * Then: Validation should succeed (duration defaults to 300)
       */
      const ast = createIfWithTransition({
        enter: 'slide-enter',
        enterActive: 'slide-enter-active',
        exit: 'slide-exit',
        exitActive: 'slide-exit-active',
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(true);
    });
  });

  // ==================== Invalid Transition Configs ====================

  describe('invalid transition configs', () => {
    it('should fail validation when enter is missing', () => {
      /**
       * Given: A transition config missing the required `enter` field
       * When: The AST is validated
       * Then: Validation should fail with an error about missing enter
       */
      const ast = createIfWithTransition({
        enterActive: 'fade-enter-active',
        exit: 'fade-exit',
        exitActive: 'fade-exit-active',
        duration: 300,
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/enter/i);
      }
    });

    it('should fail validation when enter is not a string', () => {
      /**
       * Given: A transition config where `enter` is a number instead of string
       * When: The AST is validated
       * Then: Validation should fail
       */
      const ast = createIfWithTransition({
        enter: 123,
        enterActive: 'fade-enter-active',
        exit: 'fade-exit',
        exitActive: 'fade-exit-active',
        duration: 300,
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/string/i);
      }
    });

    it('should fail validation when duration is negative', () => {
      /**
       * Given: A transition config with a negative duration
       * When: The AST is validated
       * Then: Validation should fail with an error about duration
       */
      const ast = createIfWithTransition({
        enter: 'fade-enter',
        enterActive: 'fade-enter-active',
        exit: 'fade-exit',
        exitActive: 'fade-exit-active',
        duration: -100,
      });

      const result = validateAst(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/duration/i);
      }
    });
  });
});

// ==================== Transform Pass Tests ====================

describe('Transition Directive - Transform Pass', () => {
  it('should pass transition through to CompiledIfNode', () => {
    /**
     * Given: A valid AST with a transition on an if node
     * When: The AST is compiled
     * Then: The compiled program's view should have a `transition` field
     */
    const ast = createIfWithTransition({
      enter: 'fade-enter',
      enterActive: 'fade-enter-active',
      exit: 'fade-exit',
      exitActive: 'fade-exit-active',
      duration: 300,
    });

    const result = compile(ast);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const view = result.program.view as Record<string, unknown>;
      expect(view.kind).toBe('if');
      expect(view.transition).toBeDefined();
      expect(view.transition).toEqual({
        enter: 'fade-enter',
        enterActive: 'fade-enter-active',
        exit: 'fade-exit',
        exitActive: 'fade-exit-active',
        duration: 300,
      });
    }
  });

  it('should pass transition through to CompiledEachNode', () => {
    /**
     * Given: A valid AST with a transition on an each node
     * When: The AST is compiled
     * Then: The compiled program's view should have a `transition` field
     */
    const ast = createEachWithTransition({
      enter: 'list-enter',
      enterActive: 'list-enter-active',
      exit: 'list-exit',
      exitActive: 'list-exit-active',
      duration: 500,
    });

    const result = compile(ast);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const view = result.program.view as Record<string, unknown>;
      expect(view.kind).toBe('each');
      expect(view.transition).toBeDefined();
      expect(view.transition).toEqual({
        enter: 'list-enter',
        enterActive: 'list-enter-active',
        exit: 'list-exit',
        exitActive: 'list-exit-active',
        duration: 500,
      });
    }
  });

  it('should compile if node without transition as before', () => {
    /**
     * Given: A valid AST with an if node that has no transition
     * When: The AST is compiled
     * Then: The compiled program's if node should NOT have a transition field
     */
    const ast = {
      version: '1.0',
      state: { visible: { type: 'boolean', initial: true } },
      actions: [],
      view: {
        kind: 'if',
        condition: { expr: 'state', name: 'visible' },
        then: { kind: 'element', tag: 'div' },
      },
    };

    const result = compile(ast);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const view = result.program.view as Record<string, unknown>;
      expect(view.kind).toBe('if');
      expect(view.transition).toBeUndefined();
    }
  });
});
