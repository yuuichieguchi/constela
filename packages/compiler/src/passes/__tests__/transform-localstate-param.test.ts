/**
 * Test module for localState param substitution in field.initial.
 *
 * Coverage:
 * - call expression with param args in localState initial should be transformed
 * - cond expression with param in localState initial should be transformed
 * - Literal initial values remain unchanged (regression guard)
 *
 * Bug under test: transformLocalState copies field.initial as-is, so any
 * { expr: "param", name: "..." } inside an expression-based initial value
 * is NOT replaced with the actual prop value from the component invocation.
 *
 * TDD Red Phase: These tests MUST FAIL until transformLocalState is fixed
 * to walk expression trees and substitute param references.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program, ComponentDef } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledLocalStateNode,
} from '../../index.js';

describe('transformPass: localState param substitution in field.initial', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(options: {
    stateNames?: string[];
    actionNames?: string[];
    componentNames?: string[];
  } = {}): AnalysisContext {
    return {
      stateNames: new Set<string>(options.stateNames ?? []),
      actionNames: new Set<string>(options.actionNames ?? []),
      componentNames: new Set<string>(options.componentNames ?? []),
      routeParams: new Set<string>(),
      importNames: new Set<string>(),
      dataNames: new Set<string>(),
      refNames: new Set<string>(),
      styleNames: new Set<string>(),
    };
  }

  /**
   * Creates a minimal Program with a single component invocation for testing
   * localState param substitution.
   */
  function createProgramWithComponent(
    componentDef: ComponentDef & {
      localState?: Record<string, { type: string; initial: unknown }>;
      localActions?: Array<{ name: string; steps: unknown[] }>;
    },
    invocationProps: Record<string, unknown>,
    componentName: string = 'TestComponent'
  ): Program {
    return {
      version: '1.0',
      state: {},
      actions: [],
      view: {
        kind: 'component',
        name: componentName,
        props: invocationProps,
      },
      components: {
        [componentName]: componentDef,
      },
    } as unknown as Program;
  }

  /**
   * Type guard to check if a node is CompiledLocalStateNode
   */
  function isCompiledLocalStateNode(node: CompiledNode): node is CompiledLocalStateNode {
    return node.kind === 'localState';
  }

  // ==================== call expression with param args ====================

  describe('call expression with param args in localState initial', () => {
    it('should replace param references in call args with actual prop values', () => {
      // Arrange
      const program = createProgramWithComponent(
        {
          params: {
            values: { type: 'list' },
            minY: { type: 'number' },
            maxY: { type: 'number' },
          },
          localState: {
            _bounds: {
              type: 'object',
              initial: {
                expr: 'call',
                target: null,
                method: 'getChartBounds',
                args: [
                  { expr: 'param', name: 'values' },
                  { expr: 'param', name: 'minY' },
                  { expr: 'param', name: 'maxY' },
                ],
              },
            },
          },
          view: { kind: 'element', tag: 'div' },
        },
        {
          values: { expr: 'lit', value: [10, 20, 30] },
          minY: { expr: 'lit', value: 0 },
          maxY: { expr: 'lit', value: 100 },
        }
      );
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (!isCompiledLocalStateNode(result.view)) return;

      const boundsState = result.view.state['_bounds'];
      expect(boundsState).toBeDefined();
      expect(boundsState.type).toBe('object');

      // The initial value should be a transformed call expression
      const initial = boundsState.initial as {
        expr: string;
        target: unknown;
        method: string;
        args: Array<{ expr: string; value?: unknown; name?: string }>;
      };

      expect(initial.expr).toBe('call');
      expect(initial.target).toBeNull();
      expect(initial.method).toBe('getChartBounds');
      expect(initial.args).toHaveLength(3);

      // args[0] should be substituted: { expr: "param", name: "values" } -> { expr: "lit", value: [10, 20, 30] }
      expect(initial.args[0]).toEqual({ expr: 'lit', value: [10, 20, 30] });
      // args[1] should be substituted: { expr: "param", name: "minY" } -> { expr: "lit", value: 0 }
      expect(initial.args[1]).toEqual({ expr: 'lit', value: 0 });
      // args[2] should be substituted: { expr: "param", name: "maxY" } -> { expr: "lit", value: 100 }
      expect(initial.args[2]).toEqual({ expr: 'lit', value: 100 });
    });
  });

  // ==================== cond expression with param ====================

  describe('cond expression with param in localState initial', () => {
    it('should replace param reference in cond.if with actual prop value', () => {
      // Arrange
      const program = createProgramWithComponent(
        {
          params: {
            showDefault: { type: 'boolean' },
          },
          localState: {
            label: {
              type: 'string',
              initial: {
                expr: 'cond',
                if: { expr: 'param', name: 'showDefault' },
                then: { expr: 'lit', value: 'Default' },
                else: { expr: 'lit', value: 'Custom' },
              },
            },
          },
          view: { kind: 'element', tag: 'div' },
        },
        {
          showDefault: { expr: 'lit', value: true },
        }
      );
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (!isCompiledLocalStateNode(result.view)) return;

      const labelState = result.view.state['label'];
      expect(labelState).toBeDefined();
      expect(labelState.type).toBe('string');

      const initial = labelState.initial as {
        expr: string;
        if: { expr: string; value?: unknown; name?: string };
        then: { expr: string; value?: unknown };
        else: { expr: string; value?: unknown };
      };

      expect(initial.expr).toBe('cond');
      // The if condition should be substituted: { expr: "param", name: "showDefault" } -> { expr: "lit", value: true }
      expect(initial.if).toEqual({ expr: 'lit', value: true });
      expect(initial.then).toEqual({ expr: 'lit', value: 'Default' });
      expect(initial.else).toEqual({ expr: 'lit', value: 'Custom' });
    });
  });

  // ==================== Literal initial values (regression) ====================

  describe('literal initial values remain unchanged', () => {
    it('should preserve literal initial values without modification', () => {
      // Arrange
      const program = createProgramWithComponent(
        {
          params: {
            unused: { type: 'string' },
          },
          localState: {
            count: { type: 'number', initial: 42 },
            name: { type: 'string', initial: 'hello' },
          },
          view: { kind: 'element', tag: 'div' },
        },
        {
          unused: { expr: 'lit', value: 'test' },
        }
      );
      const context = createContext({
        componentNames: ['TestComponent'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(isCompiledLocalStateNode(result.view)).toBe(true);
      if (!isCompiledLocalStateNode(result.view)) return;

      expect(result.view.state['count']).toEqual({
        type: 'number',
        initial: 42,
      });
      expect(result.view.state['name']).toEqual({
        type: 'string',
        initial: 'hello',
      });
    });
  });
});
