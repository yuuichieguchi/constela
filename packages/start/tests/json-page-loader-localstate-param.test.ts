/**
 * Test module for JsonPageLoader localState param substitution in initial expressions.
 *
 * BUG: In json-page-loader.ts, the convertViewNode function's case 'component':
 * calls convertLocalState(componentDef.localState) using the ORIGINAL localState
 * definition, without substituting param expressions with the actual prop values.
 * When a localState field's initial value contains { expr: "param", name: "..." }
 * references (e.g., inside a call expression's args), those param references are
 * never replaced with the prop values passed to the component instance.
 *
 * Coverage:
 * - Call expression initial with param args: params should be substituted with prop values
 * - Regression: literal initial values should remain unchanged even when component has params
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonPageLoader, convertToCompiledProgram } from '../src/json-page-loader.js';

// ==================== Test Fixtures ====================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

// Helper type for localState node
interface LocalStateNode {
  kind: 'localState';
  state: Record<string, { type: string; initial: unknown }>;
  actions: Record<string, { name: string; steps: unknown[] }>;
  child: unknown;
}

// Helper type for call expression
interface CallExpression {
  expr: 'call';
  target: unknown;
  method: string;
  args: unknown[];
}

// Type guard for localState node
function isLocalStateNode(node: unknown): node is LocalStateNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'kind' in node &&
    (node as { kind: string }).kind === 'localState'
  );
}

// Type guard for call expression
function isCallExpression(expr: unknown): expr is CallExpression {
  return (
    typeof expr === 'object' &&
    expr !== null &&
    'expr' in expr &&
    (expr as { expr: string }).expr === 'call'
  );
}

// ==================== LocalState Param Substitution Tests ====================

describe('JsonPageLoader localState param substitution', () => {
  let loader: JsonPageLoader;

  beforeEach(() => {
    loader = new JsonPageLoader(FIXTURES_DIR);
  });

  // ==================== Test Case 1: Call expression initial with param args ====================

  describe('convertLocalState should substitute param expressions in call expression initial', () => {
    it('should replace param references in call args with actual prop values', async () => {
      // Given: A ChartLike component with localState._bounds whose initial is a call
      //        expression with args referencing params (values, minY, maxY)
      // When: The page is compiled with props { values: [10,20,30], minY: 0, maxY: 100 }
      // Then: The localState._bounds.initial.args should contain the substituted lit values,
      //       NOT the original param references

      // Arrange
      const pagePath = 'pages-component-localstate/page-with-localstate-param.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert: The view should be a localState node
      expect(isLocalStateNode(program.view)).toBe(true);
      const view = program.view as LocalStateNode;

      // Assert: _bounds state field should exist
      expect(view.state._bounds).toBeDefined();
      expect(view.state._bounds.type).toBe('object');

      // Assert: initial should be a call expression
      const initial = view.state._bounds.initial;
      expect(isCallExpression(initial)).toBe(true);
      const callExpr = initial as CallExpression;

      // Assert: method and target should be preserved
      expect(callExpr.method).toBe('getChartBounds');
      expect(callExpr.target).toBeNull();

      // Assert: args should be substituted with prop values (NOT param references)
      expect(callExpr.args).toHaveLength(3);

      // args[0] should be { expr: "lit", value: [10, 20, 30] } (substituted from "values" param)
      expect(callExpr.args[0]).toEqual({ expr: 'lit', value: [10, 20, 30] });

      // args[1] should be { expr: "lit", value: 0 } (substituted from "minY" param)
      expect(callExpr.args[1]).toEqual({ expr: 'lit', value: 0 });

      // args[2] should be { expr: "lit", value: 100 } (substituted from "maxY" param)
      expect(callExpr.args[2]).toEqual({ expr: 'lit', value: 100 });
    });

    it('should NOT leave param expressions unsubstituted in call args', async () => {
      // Given: Same fixture as above
      // When: Compiled
      // Then: None of the args should still be { expr: "param", ... }
      //       This is the inverse check to make the failure message crystal clear

      // Arrange
      const pagePath = 'pages-component-localstate/page-with-localstate-param.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      const initial = view.state._bounds.initial as CallExpression;

      for (const arg of initial.args) {
        const argObj = arg as { expr?: string; name?: string };
        expect(argObj.expr).not.toBe('param');
      }
    });
  });

  // ==================== Test Case 2: Regression - literal initial should remain unchanged ====================

  describe('literal initial values in localState should remain unchanged when component has params', () => {
    it('should preserve the type field of localState correctly', async () => {
      // Given: A ChartLike component with localState._bounds of type "object"
      // When: Compiled
      // Then: The type should be preserved as "object"
      //       This is a regression test to ensure param substitution doesn't
      //       accidentally corrupt non-expression fields

      // Arrange
      const pagePath = 'pages-component-localstate/page-with-localstate-param.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      expect(view.state._bounds.type).toBe('object');
    });
  });
});
