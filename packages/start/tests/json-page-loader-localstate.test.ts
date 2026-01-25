/**
 * Test module for JsonPageLoader component localState handling.
 *
 * BUG: In json-page-loader.ts, the convertViewNode function's case 'component':
 * does not wrap expanded components with localState node when the component
 * definition has localState.
 *
 * Coverage:
 * - Component without localState: Should expand normally without wrapping
 * - Component with localState: Should wrap expanded view with localState node
 * - Component with localState and localActions: Should include both state and actions
 * - Nested component with localState: Parent and child should both be wrapped
 * - Multiple instances of same component: Each instance should have own localState wrapper
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonPageLoader, loadJsonPage, convertToCompiledProgram } from '../src/json-page-loader.js';
import type { CompiledProgram } from '@constela/compiler';

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

// Type guard for localState node
function isLocalStateNode(node: unknown): node is LocalStateNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'kind' in node &&
    (node as { kind: string }).kind === 'localState'
  );
}

// ==================== Component LocalState Tests ====================

describe('JsonPageLoader component localState handling', () => {
  let loader: JsonPageLoader;

  beforeEach(() => {
    loader = new JsonPageLoader(FIXTURES_DIR);
  });

  // ==================== Test Case 1: Component without localState ====================

  describe('component without localState', () => {
    it('should expand component normally without localState wrapper', async () => {
      // Given: A page with a component that has NO localState defined
      // When: The page is compiled
      // Then: The expanded view should NOT be wrapped with localState node
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-no-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      // The view should be an element node (button), not wrapped in localState
      expect(program.view.kind).toBe('element');
      expect((program.view as { tag?: string }).tag).toBe('button');
      expect(isLocalStateNode(program.view)).toBe(false);
    });

    it('should preserve component view structure when no localState', async () => {
      // Given: A SimpleButton component with param substitution
      // When: Compiled
      // Then: The param should be substituted and view structure preserved
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-no-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as { kind: string; tag: string; children?: unknown[] };
      expect(view.kind).toBe('element');
      expect(view.tag).toBe('button');
      expect(view.children).toBeDefined();
      expect(view.children).toHaveLength(1);
    });
  });

  // ==================== Test Case 2: Component with localState ====================

  describe('component with localState', () => {
    it('should wrap expanded view with localState node', async () => {
      // Given: A page with a Counter component that has localState: { count: number }
      // When: The page is compiled
      // Then: The view should be wrapped with kind: 'localState'
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(isLocalStateNode(program.view)).toBe(true);
      expect(program.view.kind).toBe('localState');
    });

    it('should include state definition in localState wrapper', async () => {
      // Given: A Counter component with localState: { count: { type: "number", initial: 0 } }
      // When: Compiled
      // Then: The localState wrapper should have state.count with type and initial
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      expect(view.state).toBeDefined();
      expect(view.state.count).toEqual({
        type: 'number',
        initial: 0,
      });
    });

    it('should have empty actions when localActions not defined', async () => {
      // Given: A Counter component with localState but NO localActions
      // When: Compiled
      // Then: The localState wrapper should have actions as empty object
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      expect(view.actions).toBeDefined();
      expect(view.actions).toEqual({});
    });

    it('should have child containing the expanded component view', async () => {
      // Given: A Counter component with view: { kind: "element", tag: "div", ... }
      // When: Compiled
      // Then: The localState.child should contain the expanded element
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      expect(view.child).toBeDefined();
      const child = view.child as { kind: string; tag?: string };
      expect(child.kind).toBe('element');
      expect(child.tag).toBe('div');
    });
  });

  // ==================== Test Case 3: Component with localState and localActions ====================

  describe('component with localState and localActions', () => {
    it('should include both state and actions in localState wrapper', async () => {
      // Given: A Counter component with localState and localActions (increment, decrement)
      // When: Compiled
      // Then: The localState wrapper should have both state and actions populated
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate-and-actions.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(isLocalStateNode(program.view)).toBe(true);
      const view = program.view as LocalStateNode;
      expect(view.state).toBeDefined();
      expect(view.actions).toBeDefined();
    });

    it('should compile localActions into actions record', async () => {
      // Given: A Counter component with localActions: [increment, decrement]
      // When: Compiled
      // Then: The actions should be keyed by name with steps
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate-and-actions.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      expect(view.actions.increment).toBeDefined();
      expect(view.actions.increment.name).toBe('increment');
      expect(view.actions.increment.steps).toHaveLength(1);

      expect(view.actions.decrement).toBeDefined();
      expect(view.actions.decrement.name).toBe('decrement');
      expect(view.actions.decrement.steps).toHaveLength(1);
    });

    it('should preserve action step structure', async () => {
      // Given: An increment action with step: { do: "set", target: "count", value: ... }
      // When: Compiled
      // Then: The step structure should be preserved
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-component-localstate-and-actions.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const view = program.view as LocalStateNode;
      const incrementStep = view.actions.increment.steps[0] as { do: string; target: string };
      expect(incrementStep.do).toBe('set');
      expect(incrementStep.target).toBe('count');
    });
  });

  // ==================== Test Case 4: Nested components with localState ====================

  describe('nested components with localState', () => {
    it('should wrap outer component with localState', async () => {
      // Given: OuterContainer (with localState) containing InnerCounter (with localState)
      // When: Compiled
      // Then: The outer view should be wrapped with localState
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-nested-components-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(isLocalStateNode(program.view)).toBe(true);
      const outerView = program.view as LocalStateNode;
      expect(outerView.state.outerCount).toBeDefined();
      expect(outerView.state.outerCount.initial).toBe(100);
    });

    it('should wrap inner component with its own localState', async () => {
      // Given: OuterContainer containing InnerCounter (both with localState)
      // When: Compiled
      // Then: The inner component within outer's child should also be wrapped
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-nested-components-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      // Navigate: view (localState) -> child (element div) -> children[1] (localState for inner)
      const outerView = program.view as LocalStateNode;
      const outerChild = outerView.child as { kind: string; children?: unknown[] };
      expect(outerChild.kind).toBe('element');
      expect(outerChild.children).toHaveLength(2);

      // The second child should be the InnerCounter wrapped in localState
      const innerComponent = outerChild.children?.[1];
      expect(isLocalStateNode(innerComponent)).toBe(true);
      const innerView = innerComponent as LocalStateNode;
      expect(innerView.state.innerCount).toBeDefined();
      expect(innerView.state.innerCount.initial).toBe(10);
    });

    it('should maintain separate state scopes for nested components', async () => {
      // Given: Nested components each with their own localState
      // When: Compiled
      // Then: Each should have its own state scope (outerCount vs innerCount)
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-nested-components-localstate.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const outerView = program.view as LocalStateNode;
      expect(Object.keys(outerView.state)).toEqual(['outerCount']);

      const outerChild = outerView.child as { children?: unknown[] };
      const innerView = outerChild.children?.[1] as LocalStateNode;
      expect(Object.keys(innerView.state)).toEqual(['innerCount']);
    });
  });

  // ==================== Test Case 5: Multiple instances of same component ====================

  describe('multiple instances of same component', () => {
    it('should wrap each instance with its own localState', async () => {
      // Given: Three instances of Counter component in a single view
      // When: Compiled
      // Then: Each instance should have its own localState wrapper
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-multiple-instances.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      // The root view should be an element (div) containing 3 children
      const rootView = program.view as { kind: string; children?: unknown[] };
      expect(rootView.kind).toBe('element');
      expect(rootView.children).toHaveLength(3);

      // Each child should be wrapped in localState
      for (let i = 0; i < 3; i++) {
        expect(isLocalStateNode(rootView.children?.[i])).toBe(true);
      }
    });

    it('should each instance have independent state definition', async () => {
      // Given: Three Counter instances
      // When: Compiled
      // Then: Each localState wrapper should have its own state object
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-multiple-instances.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const rootView = program.view as { children?: unknown[] };
      const instances = rootView.children as LocalStateNode[];

      // Each instance should have count state with initial 0
      for (const instance of instances) {
        expect(instance.state.count).toEqual({
          type: 'number',
          initial: 0,
        });
      }
    });

    it('should preserve unique props for each instance', async () => {
      // Given: Three Counter instances with different labels
      // When: Compiled
      // Then: Each expanded child should have its substituted label
      // Arrange
      const pagePath = 'pages-component-localstate/page-with-multiple-instances.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      const rootView = program.view as { children?: unknown[] };
      const instances = rootView.children as LocalStateNode[];

      // Extract the first text child's value from each instance
      const labels = instances.map((instance) => {
        const child = instance.child as { children?: unknown[] };
        const textNode = child.children?.[0] as { value?: { value?: string } };
        return textNode.value?.value;
      });

      expect(labels).toEqual(['Counter A', 'Counter B', 'Counter C']);
    });
  });
});
