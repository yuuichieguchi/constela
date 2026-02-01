/**
 * Island Compilation Tests for @constela/compiler
 *
 * Coverage:
 * - IslandNode schema validation
 * - Island ID uniqueness across program
 * - Strategy-specific strategyOptions validation
 * - Island analysis (boundaries, cross-Island state references)
 * - Island transformation to CompiledIslandNode
 *
 * TDD Red Phase: These tests will FAIL because implementation does not exist.
 */

import { describe, it, expect } from 'vitest';

import { validatePass, type ValidatePassResult } from '../passes/validate.js';
import { analyzePass, type AnalyzePassResult, type AnalysisContext } from '../passes/analyze.js';
import {
  transformPass,
  type CompiledProgram,
  type CompiledNode,
} from '../passes/transform.js';
import type { Program, IslandNode, IslandStrategy, IslandStrategyOptions, ViewNode, StateField, ActionDefinition } from '@constela/core';

// ==================== Test Helpers ====================

/**
 * Creates a minimal valid AST with optional overrides
 */
function createAst(overrides: Partial<Program> = {}): Program {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  } as Program;
}

/**
 * Creates a minimal Island node with optional overrides
 */
function createIslandNode(overrides: Partial<IslandNode> = {}): IslandNode {
  return {
    kind: 'island',
    id: 'test-island',
    strategy: 'load',
    content: { kind: 'element', tag: 'div' },
    ...overrides,
  } as IslandNode;
}

/**
 * Creates an analysis context for transform tests
 */
function createContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return {
    stateNames: new Set(),
    actionNames: new Set(),
    componentNames: new Set(),
    routeParams: new Set(),
    importNames: new Set(),
    dataNames: new Set(),
    refNames: new Set(),
    styleNames: new Set(),
    islandIds: new Set(),
    ...overrides,
  };
}

// ==================== Validation Tests ====================

describe('Island Validation - validatePass', () => {
  describe('Valid IslandNode Schema', () => {
    it('should validate minimal Island with required fields (id, strategy, content)', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'my-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'button' },
        }),
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate Island with all supported strategies', () => {
      const strategies: IslandStrategy[] = ['load', 'idle', 'visible', 'interaction', 'media', 'never'];

      for (const strategy of strategies) {
        const ast = createAst({
          view: createIslandNode({
            id: `island-${strategy}`,
            strategy,
            content: { kind: 'element', tag: 'div' },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(true);
      }
    });

    it('should validate Island with strategyOptions', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'visible-island',
          strategy: 'visible',
          strategyOptions: { threshold: 0.5, rootMargin: '10px' },
          content: { kind: 'element', tag: 'div' },
        }),
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate Island with internal state', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'stateful-island',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'state', name: 'count' } },
          state: {
            count: { type: 'number', initial: 0 },
          },
        }),
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate Island with internal actions', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'interactive-island',
          strategy: 'interaction',
          content: {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'increment' },
            },
          },
          state: {
            count: { type: 'number', initial: 0 },
          },
          actions: [
            {
              name: 'increment',
              steps: [{ do: 'update', target: 'count', operation: 'increment' }],
            },
          ],
        }),
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should validate nested Islands', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'outer-island',
          strategy: 'load',
          content: createIslandNode({
            id: 'inner-island',
            strategy: 'visible',
            content: { kind: 'element', tag: 'div' },
          }),
        }),
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('Invalid IslandNode Schema', () => {
    it('should return error for missing id', () => {
      const ast = createAst({
        view: {
          kind: 'island',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
        } as unknown as ViewNode,
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toContain('/view');
      }
    });

    it('should return error for missing strategy', () => {
      const ast = createAst({
        view: {
          kind: 'island',
          id: 'test-island',
          content: { kind: 'element', tag: 'div' },
        } as unknown as ViewNode,
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for missing content', () => {
      const ast = createAst({
        view: {
          kind: 'island',
          id: 'test-island',
          strategy: 'load',
        } as unknown as ViewNode,
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for invalid strategy value', () => {
      const ast = createAst({
        view: {
          kind: 'island',
          id: 'test-island',
          strategy: 'invalid-strategy',
          content: { kind: 'element', tag: 'div' },
        } as unknown as ViewNode,
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toContain('strategy');
      }
    });

    it('should return error for invalid strategyOptions type', () => {
      const ast = createAst({
        view: {
          kind: 'island',
          id: 'test-island',
          strategy: 'visible',
          strategyOptions: 'invalid',
          content: { kind: 'element', tag: 'div' },
        } as unknown as ViewNode,
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });

    it('should return error for invalid content kind', () => {
      const ast = createAst({
        view: {
          kind: 'island',
          id: 'test-island',
          strategy: 'load',
          content: { kind: 'invalid-kind' },
        } as unknown as ViewNode,
      });

      const result = validatePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });
  });

  describe('StrategyOptions Validation', () => {
    describe('visible strategy options', () => {
      it('should accept valid threshold (0-1)', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'visible',
            strategyOptions: { threshold: 0.5 },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(true);
      });

      it('should reject threshold below 0', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'visible',
            strategyOptions: { threshold: -0.1 },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('SCHEMA_INVALID');
        }
      });

      it('should reject threshold above 1', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'visible',
            strategyOptions: { threshold: 1.5 },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('SCHEMA_INVALID');
        }
      });

      it('should accept valid rootMargin string', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'visible',
            strategyOptions: { rootMargin: '10px 20px' },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(true);
      });

      it('should reject non-string rootMargin', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'visible',
            strategyOptions: { rootMargin: 10 } as unknown as IslandStrategyOptions,
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(false);
      });
    });

    describe('media strategy options', () => {
      it('should accept valid media query string', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'media',
            strategyOptions: { media: '(min-width: 768px)' },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(true);
      });

      it('should reject non-string media', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'media',
            strategyOptions: { media: 768 } as unknown as IslandStrategyOptions,
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(false);
      });
    });

    describe('idle strategy options', () => {
      it('should accept valid timeout (>= 0)', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'idle',
            strategyOptions: { timeout: 1000 },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(true);
      });

      it('should accept zero timeout', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'idle',
            strategyOptions: { timeout: 0 },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(true);
      });

      it('should reject negative timeout', () => {
        const ast = createAst({
          view: createIslandNode({
            strategy: 'idle',
            strategyOptions: { timeout: -100 },
          }),
        });

        const result = validatePass(ast);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('SCHEMA_INVALID');
        }
      });
    });
  });
});

// ==================== Analysis Tests ====================

describe('Island Analysis - analyzePass', () => {
  describe('Island ID Uniqueness', () => {
    it('should pass when all Island IDs are unique', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'island-1' }),
            createIslandNode({ id: 'island-2' }),
            createIslandNode({ id: 'island-3' }),
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return DUPLICATE_ISLAND_ID error for duplicate Island IDs', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'duplicate-id' }),
            createIslandNode({ id: 'duplicate-id' }),
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'DUPLICATE_ISLAND_ID')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('duplicate-id'))).toBe(true);
      }
    });

    it('should detect duplicate IDs across nested Islands', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'outer-island',
          content: {
            kind: 'element',
            tag: 'div',
            children: [
              createIslandNode({ id: 'outer-island' }), // Duplicates parent
            ],
          },
        }),
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'DUPLICATE_ISLAND_ID')).toBe(true);
      }
    });

    it('should return error with correct path for duplicate Island ID', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'dup' }),
            {
              kind: 'element',
              tag: 'div',
              children: [createIslandNode({ id: 'dup' })],
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const dupError = result.errors.find((e) => e.code === 'DUPLICATE_ISLAND_ID');
        expect(dupError).toBeDefined();
        expect(dupError?.path).toContain('/view');
      }
    });
  });

  describe('Island State Reference Validation', () => {
    it('should pass when Island references its own state', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'stateful-island',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'state', name: 'count' } },
          state: {
            count: { type: 'number', initial: 0 },
          },
        }),
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return error when Island references undefined internal state', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'stateful-island',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'state', name: 'undefined_state' } },
          state: {
            count: { type: 'number', initial: 0 },
          },
        }),
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
      }
    });
  });

  describe('Cross-Island State Reference Warning', () => {
    it('should warn when Island content references global state', () => {
      const ast = createAst({
        state: {
          globalCount: { type: 'number', initial: 0 },
        },
        view: createIslandNode({
          id: 'island-with-global-ref',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'state', name: 'globalCount' } },
        }),
      });

      const result = analyzePass(ast);

      // This may pass but should produce a warning
      // Depending on implementation, this could be an error or warning
      if (!result.ok) {
        expect(result.errors.some((e) => 
          e.code === 'CROSS_ISLAND_STATE_REF' || 
          e.code === 'ISLAND_GLOBAL_STATE_WARNING'
        )).toBe(true);
      }
    });

    it('should warn when one Island references another Island\'s state', () => {
      // This test checks if we detect cross-island dependencies
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({
              id: 'island-a',
              strategy: 'load',
              content: { kind: 'element', tag: 'div' },
              state: { sharedData: { type: 'string', initial: '' } },
            }),
            createIslandNode({
              id: 'island-b',
              strategy: 'visible',
              content: { 
                kind: 'text', 
                // Attempting to reference island-a's state (which shouldn't be possible)
                value: { expr: 'state', name: 'sharedData' } 
              },
            }),
          ],
        },
      });

      const result = analyzePass(ast);

      // Should fail because sharedData is not in island-b's scope
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
      }
    });
  });

  describe('Island Action Reference Validation', () => {
    it('should pass when Island references its own action', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'interactive-island',
          strategy: 'interaction',
          content: {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'handleClick' },
            },
          },
          state: {},
          actions: [
            { name: 'handleClick', steps: [] },
          ],
        }),
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return error when Island references undefined internal action', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'interactive-island',
          strategy: 'interaction',
          content: {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'undefined_action' },
            },
          },
          state: {},
          actions: [
            { name: 'handleClick', steps: [] },
          ],
        }),
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
      }
    });
  });

  describe('Island Boundary Tracking', () => {
    it('should track Island boundaries in analysis context', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'first-island' }),
            createIslandNode({ id: 'second-island' }),
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context).toBeDefined();
        // The context should have tracked island IDs
        expect((result.context as AnalysisContext & { islandIds?: Set<string> }).islandIds).toBeDefined();
        expect((result.context as AnalysisContext & { islandIds?: Set<string> }).islandIds?.has('first-island')).toBe(true);
        expect((result.context as AnalysisContext & { islandIds?: Set<string> }).islandIds?.has('second-island')).toBe(true);
      }
    });
  });
});

// ==================== Transform Tests ====================

/**
 * CompiledIslandNode - Expected type for transformed Island nodes
 * This interface defines the structure that the transform pass should produce.
 */
interface CompiledIslandNode {
  kind: 'island';
  id: string;
  strategy: IslandStrategy;
  strategyOptions?: IslandStrategyOptions;
  content: CompiledNode;
  state?: Record<string, { type: string; initial: unknown }>;
  actions?: Record<string, { name: string; steps: unknown[] }>;
}

describe('Island Transformation - transformPass', () => {
  describe('Basic Island Transformation', () => {
    it('should transform Island node with kind, id, strategy, and content', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'test-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'button' },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      expect(result.view.kind).toBe('island');
      const island = result.view as unknown as CompiledIslandNode;
      expect(island.id).toBe('test-island');
      expect(island.strategy).toBe('load');
      expect(island.content.kind).toBe('element');
    });

    it('should transform Island with strategyOptions', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'visible-island',
          strategy: 'visible',
          strategyOptions: { threshold: 0.75, rootMargin: '20px' },
          content: { kind: 'element', tag: 'div' },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      expect(island.strategyOptions).toBeDefined();
      expect(island.strategyOptions?.threshold).toBe(0.75);
      expect(island.strategyOptions?.rootMargin).toBe('20px');
    });

    it('should transform all strategy types correctly', () => {
      const strategies: IslandStrategy[] = ['load', 'idle', 'visible', 'interaction', 'media', 'never'];
      const context = createContext();

      for (const strategy of strategies) {
        const ast = createAst({
          view: createIslandNode({
            id: `island-${strategy}`,
            strategy,
            content: { kind: 'element', tag: 'span' },
          }),
        });

        const result = transformPass(ast, context);

        const island = result.view as unknown as CompiledIslandNode;
        expect(island.strategy).toBe(strategy);
      }
    });
  });

  describe('Island State Transformation', () => {
    it('should transform Island state into Record format', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'stateful-island',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'state', name: 'count' } },
          state: {
            count: { type: 'number', initial: 0 },
            name: { type: 'string', initial: 'default' },
          },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      expect(island.state).toBeDefined();
      expect(island.state?.['count']).toEqual({ type: 'number', initial: 0 });
      expect(island.state?.['name']).toEqual({ type: 'string', initial: 'default' });
    });

    it('should transform Island with all state field types', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'multi-type-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
          state: {
            num: { type: 'number', initial: 42 },
            str: { type: 'string', initial: 'hello' },
            bool: { type: 'boolean', initial: true },
            list: { type: 'list', initial: [1, 2, 3] },
            obj: { type: 'object', initial: { key: 'value' } },
          },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      expect(island.state?.['num'].type).toBe('number');
      expect(island.state?.['str'].type).toBe('string');
      expect(island.state?.['bool'].type).toBe('boolean');
      expect(island.state?.['list'].type).toBe('list');
      expect(island.state?.['obj'].type).toBe('object');
    });
  });

  describe('Island Actions Transformation', () => {
    it('should transform Island actions into Record format', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'actionable-island',
          strategy: 'interaction',
          content: { kind: 'element', tag: 'button' },
          state: { count: { type: 'number', initial: 0 } },
          actions: [
            {
              name: 'increment',
              steps: [{ do: 'update', target: 'count', operation: 'increment' }],
            },
            {
              name: 'reset',
              steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }],
            },
          ],
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      expect(island.actions).toBeDefined();
      expect(island.actions?.['increment']).toBeDefined();
      expect(island.actions?.['increment'].name).toBe('increment');
      expect(island.actions?.['reset']).toBeDefined();
    });

    it('should transform Island action steps correctly', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'step-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
          state: { value: { type: 'number', initial: 0 } },
          actions: [
            {
              name: 'setToTen',
              steps: [
                { do: 'set', target: 'value', value: { expr: 'lit', value: 10 } },
              ],
            },
          ],
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      const action = island.actions?.['setToTen'];
      expect(action?.steps).toHaveLength(1);
      expect((action?.steps[0] as { do: string }).do).toBe('set');
    });
  });

  describe('Island Content Transformation', () => {
    it('should transform complex Island content (element with children)', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'complex-content-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'div',
            props: {
              class: { expr: 'lit', value: 'island-container' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
              { kind: 'element', tag: 'span' },
            ],
          },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      expect(island.content.kind).toBe('element');
      const content = island.content as { kind: string; children?: CompiledNode[] };
      expect(content.children).toHaveLength(2);
    });

    it('should transform Island with if/each content nodes', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'conditional-island',
          strategy: 'load',
          content: {
            kind: 'if',
            condition: { expr: 'state', name: 'show' },
            then: { kind: 'element', tag: 'div' },
            else: { kind: 'element', tag: 'span' },
          },
          state: { show: { type: 'boolean', initial: true } },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      expect(island.content.kind).toBe('if');
    });

    it('should transform state expressions within Island content', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'expr-island',
          strategy: 'load',
          content: {
            kind: 'text',
            value: { expr: 'state', name: 'message' },
          },
          state: { message: { type: 'string', initial: 'Hello' } },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const island = result.view as unknown as CompiledIslandNode;
      const textNode = island.content as { kind: string; value: { expr: string; name: string } };
      expect(textNode.value.expr).toBe('state');
      expect(textNode.value.name).toBe('message');
    });
  });

  describe('Nested Island Transformation', () => {
    it('should transform nested Islands correctly', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'parent-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'div',
            children: [
              createIslandNode({
                id: 'child-island',
                strategy: 'visible',
                content: { kind: 'element', tag: 'button' },
              }),
            ],
          },
        }),
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const parentIsland = result.view as unknown as CompiledIslandNode;
      expect(parentIsland.id).toBe('parent-island');
      
      const content = parentIsland.content as { kind: string; children?: CompiledNode[] };
      expect(content.children).toHaveLength(1);
      
      const childIsland = content.children?.[0] as unknown as CompiledIslandNode;
      expect(childIsland.kind).toBe('island');
      expect(childIsland.id).toBe('child-island');
      expect(childIsland.strategy).toBe('visible');
    });
  });

  describe('Island as Child of Other Nodes', () => {
    it('should transform Island within element children', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'main',
          children: [
            { kind: 'element', tag: 'header' },
            createIslandNode({ id: 'content-island', content: { kind: 'element', tag: 'article' } }),
            { kind: 'element', tag: 'footer' },
          ],
        },
      });
      const context = createContext();

      const result = transformPass(ast, context);

      const main = result.view as { kind: string; children?: CompiledNode[] };
      expect(main.children).toHaveLength(3);
      expect(main.children?.[1].kind).toBe('island');
    });

    it('should transform Island within if branch', () => {
      const ast = createAst({
        state: { showIsland: { type: 'boolean', initial: true } },
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showIsland' },
          then: createIslandNode({ id: 'conditional-island' }),
          else: { kind: 'element', tag: 'div' },
        },
      });
      const context = createContext({ stateNames: new Set(['showIsland']) });

      const result = transformPass(ast, context);

      expect(result.view.kind).toBe('if');
      const ifNode = result.view as { kind: string; then: CompiledNode; else?: CompiledNode };
      expect(ifNode.then.kind).toBe('island');
    });

    it('should transform Island within each body', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: createIslandNode({ id: 'list-item-island' }),
        },
      });
      const context = createContext({ stateNames: new Set(['items']) });

      const result = transformPass(ast, context);

      expect(result.view.kind).toBe('each');
      const eachNode = result.view as { kind: string; body: CompiledNode };
      expect(eachNode.body.kind).toBe('island');
    });
  });

  describe('Transform Idempotency', () => {
    it('should produce consistent output for same Island input', () => {
      const ast = createAst({
        view: createIslandNode({
          id: 'consistent-island',
          strategy: 'visible',
          strategyOptions: { threshold: 0.5 },
          content: { kind: 'element', tag: 'div' },
          state: { count: { type: 'number', initial: 0 } },
          actions: [
            { name: 'inc', steps: [{ do: 'update', target: 'count', operation: 'increment' }] },
          ],
        }),
      });
      const context = createContext();

      const result1 = transformPass(ast, context);
      const result2 = transformPass(ast, context);

      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });
  });
});

// ==================== Integration Tests ====================

describe('Island Compilation - Full Pipeline', () => {
  it('should compile valid Island through all passes', () => {
    const input = {
      version: '1.0',
      state: {},
      actions: [],
      view: {
        kind: 'island',
        id: 'full-pipeline-island',
        strategy: 'visible',
        strategyOptions: { threshold: 0.5 },
        content: {
          kind: 'element',
          tag: 'button',
          props: {
            onclick: { event: 'click', action: 'increment' },
          },
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
        state: { count: { type: 'number', initial: 0 } },
        actions: [
          {
            name: 'increment',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        ],
      },
    };

    // Validate
    const validateResult = validatePass(input);
    expect(validateResult.ok).toBe(true);

    if (!validateResult.ok) return;

    // Analyze
    const analyzeResult = analyzePass(validateResult.ast);
    expect(analyzeResult.ok).toBe(true);

    if (!analyzeResult.ok) return;

    // Transform
    const compiled = transformPass(analyzeResult.ast, analyzeResult.context);

    expect(compiled.version).toBe('1.0');
    expect(compiled.view.kind).toBe('island');

    const island = compiled.view as unknown as CompiledIslandNode;
    expect(island.id).toBe('full-pipeline-island');
    expect(island.strategy).toBe('visible');
    expect(island.strategyOptions?.threshold).toBe(0.5);
    expect(island.state?.['count']).toBeDefined();
    expect(island.actions?.['increment']).toBeDefined();
  });

  it('should reject invalid Island at validation phase', () => {
    const input = {
      version: '1.0',
      state: {},
      actions: [],
      view: {
        kind: 'island',
        // Missing id
        strategy: 'invalid-strategy',
        content: { kind: 'element', tag: 'div' },
      },
    };

    const validateResult = validatePass(input);

    expect(validateResult.ok).toBe(false);
  });

  it('should detect Island ID conflicts at analysis phase', () => {
    const input = {
      version: '1.0',
      state: {},
      actions: [],
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'island',
            id: 'duplicate-id',
            strategy: 'load',
            content: { kind: 'element', tag: 'div' },
          },
          {
            kind: 'island',
            id: 'duplicate-id',
            strategy: 'visible',
            content: { kind: 'element', tag: 'span' },
          },
        ],
      },
    };

    const validateResult = validatePass(input);
    expect(validateResult.ok).toBe(true);

    if (!validateResult.ok) return;

    const analyzeResult = analyzePass(validateResult.ast);

    expect(analyzeResult.ok).toBe(false);
    if (!analyzeResult.ok) {
      expect(analyzeResult.errors.some((e) => e.code === 'DUPLICATE_ISLAND_ID')).toBe(true);
    }
  });
});
