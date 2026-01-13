/**
 * Analyze Pass Tests - Suggestion Feature for @constela/compiler
 *
 * Phase 1.3: Tests for "Did you mean...?" suggestions
 *
 * Coverage:
 * - Undefined state with similar name suggestion
 * - Undefined state with no similar names (availableNames only)
 * - Undefined action with similar name suggestion
 * - Undefined action with no similar names
 * - Undefined component with similar name suggestion
 * - Multiple similar names (closest match selection)
 *
 * TDD Red Phase: These tests will FAIL because suggestion feature is not implemented.
 */

import { describe, it, expect } from 'vitest';

// Import compile function to trigger full pipeline including analyze pass
import { compile } from '../../src/index.js';

// ==================== Helper to create minimal valid AST ====================

interface MinimalAST {
  version: string;
  state: Record<string, { type: string; initial: unknown }>;
  actions: Array<{ name: string; steps: unknown[] }>;
  view: unknown;
  components?: Record<string, { view: unknown; params?: Record<string, { type: string }> }>;
}

function createAst(overrides: Partial<MinimalAST> = {}): MinimalAST {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  };
}

// ==================== State Reference Suggestions ====================

describe('analyzePass - State Reference Suggestions', () => {
  describe('Undefined State with suggestion', () => {
    it('should include suggestion "Did you mean \'counter\'?" when \'count\' referenced but \'counter\' defined', () => {
      // Arrange: State 'counter' defined, but 'count' referenced (Levenshtein distance = 2)
      const ast = createAst({
        state: { counter: { type: 'number', initial: 0 } },
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'count' },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
        expect(stateError).toBeDefined();
        expect(stateError?.suggestion).toBe("Did you mean 'counter'?");
      }
    });

    it('should include context.availableNames with defined state names', () => {
      // Arrange: State 'counter' defined, but 'count' referenced
      const ast = createAst({
        state: { counter: { type: 'number', initial: 0 } },
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'count' },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
        expect(stateError).toBeDefined();
        expect(stateError?.context).toBeDefined();
        expect(stateError?.context?.availableNames).toContain('counter');
      }
    });
  });

  describe('Undefined State with no similar names', () => {
    it('should NOT include suggestion when no similar names exist', () => {
      // Arrange: State 'items' defined, but 'xyz' referenced (Levenshtein distance > 2)
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'xyz' },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
        expect(stateError).toBeDefined();
        // No suggestion because 'xyz' is too different from 'items'
        expect(stateError?.suggestion).toBeUndefined();
      }
    });

    it('should still include context.availableNames even without suggestion', () => {
      // Arrange: State 'items' defined, but 'xyz' referenced
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'xyz' },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
        expect(stateError).toBeDefined();
        expect(stateError?.context).toBeDefined();
        expect(stateError?.context?.availableNames).toContain('items');
      }
    });
  });
});

// ==================== Action Reference Suggestions ====================

describe('analyzePass - Action Reference Suggestions', () => {
  describe('Undefined Action with suggestion', () => {
    it('should include suggestion "Did you mean \'increment\'?" when \'incr\' referenced but \'increment\' defined', () => {
      // Arrange: Action 'increment' defined, but 'incr' referenced (Levenshtein distance = 5, but prefix match)
      const ast = createAst({
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
        ],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'incr' },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
        expect(actionError).toBeDefined();
        expect(actionError?.suggestion).toBe("Did you mean 'increment'?");
      }
    });

    it('should include context.availableNames with defined action names', () => {
      // Arrange: Action 'increment' defined, but 'incr' referenced
      const ast = createAst({
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          { name: 'increment', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
        ],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'incr' },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
        expect(actionError).toBeDefined();
        expect(actionError?.context).toBeDefined();
        expect(actionError?.context?.availableNames).toContain('increment');
      }
    });
  });

  describe('Undefined Action with no similar names', () => {
    it('should NOT include suggestion when no similar names exist', () => {
      // Arrange: Action 'fetchData' defined, but 'xyz' referenced
      const ast = createAst({
        actions: [{ name: 'fetchData', steps: [] }],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'xyz' },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
        expect(actionError).toBeDefined();
        expect(actionError?.suggestion).toBeUndefined();
      }
    });

    it('should include context.availableNames even without suggestion', () => {
      // Arrange: Action 'fetchData' defined, but 'xyz' referenced
      const ast = createAst({
        actions: [{ name: 'fetchData', steps: [] }],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'xyz' },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
        expect(actionError).toBeDefined();
        expect(actionError?.context).toBeDefined();
        expect(actionError?.context?.availableNames).toContain('fetchData');
      }
    });
  });
});

// ==================== Component Reference Suggestions ====================

describe('analyzePass - Component Reference Suggestions', () => {
  describe('Undefined Component with suggestion', () => {
    it('should include suggestion "Did you mean \'Button\'?" when \'Buton\' referenced but \'Button\' defined', () => {
      // Arrange: Component 'Button' defined, but 'Buton' referenced (typo, Levenshtein distance = 1)
      const ast = createAst({
        components: {
          Button: {
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: {
          kind: 'component',
          name: 'Buton',
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const componentError = result.errors.find((e) => e.code === 'COMPONENT_NOT_FOUND');
        expect(componentError).toBeDefined();
        expect(componentError?.suggestion).toBe("Did you mean 'Button'?");
      }
    });

    it('should include context.availableNames with defined component names', () => {
      // Arrange: Component 'Button' defined, but 'Buton' referenced
      const ast = createAst({
        components: {
          Button: {
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: {
          kind: 'component',
          name: 'Buton',
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const componentError = result.errors.find((e) => e.code === 'COMPONENT_NOT_FOUND');
        expect(componentError).toBeDefined();
        expect(componentError?.context).toBeDefined();
        expect(componentError?.context?.availableNames).toContain('Button');
      }
    });
  });

  describe('Undefined Component with no similar names', () => {
    it('should NOT include suggestion when no similar component names exist', () => {
      // Arrange: Component 'Card' defined, but 'xyz' referenced
      const ast = createAst({
        components: {
          Card: {
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: {
          kind: 'component',
          name: 'xyz',
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const componentError = result.errors.find((e) => e.code === 'COMPONENT_NOT_FOUND');
        expect(componentError).toBeDefined();
        expect(componentError?.suggestion).toBeUndefined();
      }
    });
  });
});

// ==================== Multiple Similar Names ====================

describe('analyzePass - Multiple Similar Names', () => {
  it('should suggest the closest match when multiple similar names exist', () => {
    // Arrange: States 'count', 'counter', 'counts' defined, 'cont' referenced
    // Levenshtein distances: cont -> count (1), cont -> counter (3), cont -> counts (2)
    // Should suggest 'count' as it has the smallest distance
    const ast = createAst({
      state: {
        count: { type: 'number', initial: 0 },
        counter: { type: 'number', initial: 0 },
        counts: { type: 'list', initial: [] },
      },
      view: {
        kind: 'text',
        value: { expr: 'state', name: 'cont' },
      },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
      expect(stateError).toBeDefined();
      // Should suggest the closest match
      expect(stateError?.suggestion).toBe("Did you mean 'count'?");
    }
  });

  it('should include all available names in context.availableNames', () => {
    // Arrange: States 'count', 'counter', 'counts' defined
    const ast = createAst({
      state: {
        count: { type: 'number', initial: 0 },
        counter: { type: 'number', initial: 0 },
        counts: { type: 'list', initial: [] },
      },
      view: {
        kind: 'text',
        value: { expr: 'state', name: 'cont' },
      },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
      expect(stateError).toBeDefined();
      expect(stateError?.context?.availableNames).toBeDefined();
      expect(stateError?.context?.availableNames).toContain('count');
      expect(stateError?.context?.availableNames).toContain('counter');
      expect(stateError?.context?.availableNames).toContain('counts');
    }
  });
});

// ==================== Action Target Suggestions (in action steps) ====================

describe('analyzePass - Action Step Target Suggestions', () => {
  it('should include suggestion for undefined state in action set step target', () => {
    // Arrange: State 'counter' defined, but 'count' used as target in set step
    const ast = createAst({
      state: { counter: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'reset',
          steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }],
        },
      ],
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
      expect(stateError).toBeDefined();
      expect(stateError?.suggestion).toBe("Did you mean 'counter'?");
    }
  });

  it('should include suggestion for undefined state in action update step target', () => {
    // Arrange: State 'counter' defined, but 'count' used as target in update step
    const ast = createAst({
      state: { counter: { type: 'number', initial: 0 } },
      actions: [
        {
          name: 'increment',
          steps: [{ do: 'update', target: 'count', operation: 'increment' }],
        },
      ],
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
      expect(stateError).toBeDefined();
      expect(stateError?.suggestion).toBe("Did you mean 'counter'?");
    }
  });
});

// ==================== Lifecycle Hook Suggestions ====================

describe('analyzePass - Lifecycle Hook Action Suggestions', () => {
  it('should include suggestion for undefined action in lifecycle onMount', () => {
    // Arrange: Action 'initialize' defined, but 'init' used in onMount
    const ast = {
      version: '1.0',
      state: {},
      actions: [{ name: 'initialize', steps: [] }],
      view: { kind: 'element', tag: 'div' },
      lifecycle: {
        onMount: 'init',
      },
    };

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
      expect(actionError).toBeDefined();
      expect(actionError?.suggestion).toBe("Did you mean 'initialize'?");
    }
  });
});

// ==================== Edge Cases ====================

describe('analyzePass - Suggestion Edge Cases', () => {
  it('should handle empty state when referencing undefined state', () => {
    // Arrange: No state defined, but 'count' referenced
    const ast = createAst({
      state: {},
      view: {
        kind: 'text',
        value: { expr: 'state', name: 'count' },
      },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
      expect(stateError).toBeDefined();
      // No suggestion because no states exist
      expect(stateError?.suggestion).toBeUndefined();
      // availableNames should be empty
      expect(stateError?.context?.availableNames).toEqual([]);
    }
  });

  it('should handle empty actions when referencing undefined action', () => {
    // Arrange: No actions defined, but 'handleClick' referenced
    const ast = createAst({
      actions: [],
      view: {
        kind: 'element',
        tag: 'button',
        props: {
          onclick: { event: 'click', action: 'handleClick' },
        },
      },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const actionError = result.errors.find((e) => e.code === 'UNDEFINED_ACTION');
      expect(actionError).toBeDefined();
      expect(actionError?.suggestion).toBeUndefined();
      expect(actionError?.context?.availableNames).toEqual([]);
    }
  });

  it('should handle case-sensitive suggestions', () => {
    // Arrange: State 'Count' defined (capital C), but 'count' referenced (lowercase)
    const ast = createAst({
      state: { Count: { type: 'number', initial: 0 } },
      view: {
        kind: 'text',
        value: { expr: 'state', name: 'count' },
      },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const stateError = result.errors.find((e) => e.code === 'UNDEFINED_STATE');
      expect(stateError).toBeDefined();
      // 'count' vs 'Count' has Levenshtein distance of 1 (case difference)
      expect(stateError?.suggestion).toBe("Did you mean 'Count'?");
    }
  });
});
