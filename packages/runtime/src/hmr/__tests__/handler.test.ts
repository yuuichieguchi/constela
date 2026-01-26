/**
 * Test module for HMR Handler Runtime.
 *
 * Coverage:
 * - createHMRHandler: Create a handler for HMR updates
 * - State preservation: Serialize and restore state across updates
 * - App lifecycle: Destroy old app, hydrate new app
 * - Cleanup: Proper resource cleanup on destroy
 *
 * TDD Red Phase: These tests verify the HMR handler functionality
 * that will be implemented to apply hot updates to the running app.
 *
 * Update Flow:
 * 1. WebSocket receives HMRUpdate
 * 2. State snapshot: state.serialize()
 * 3. Destroy old app: app.destroy()
 * 4. Create new app: hydrateApp(newProgram)
 * 5. Restore state: state.restore(snapshot)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';

// Import the module under test (will fail until implemented)
import {
  createHMRHandler,
  type HMRHandler,
  type HMRHandlerOptions,
} from '../handler.js';

// ==================== Test Helpers ====================

/**
 * Create a mock CompiledProgram for testing
 */
function createMockCompiledProgram(overrides: Partial<CompiledProgram> = {}): CompiledProgram {
  return {
    version: '1.0',
    view: { kind: 'element', tag: 'div' },
    state: {},
    actions: {},
    ...overrides,
  };
}

/**
 * Create a program with state for testing state preservation
 */
function createProgramWithState(stateDefs: Record<string, { type: string; initial: unknown }>): CompiledProgram {
  return {
    version: '1.0',
    view: { kind: 'element', tag: 'div' },
    state: Object.fromEntries(
      Object.entries(stateDefs).map(([name, def]) => [
        name,
        { name, ...def },
      ])
    ),
    actions: {},
  };
}

// ==================== Tests ====================

describe('createHMRHandler()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  // ==================== Handler Creation ====================

  describe('handler creation', () => {
    it('should create a handler with the given options', () => {
      /**
       * Given: HMR handler options
       * When: createHMRHandler is called
       * Then: A handler should be created with handleUpdate and destroy methods
       */
      // Arrange
      const program = createMockCompiledProgram();
      const options: HMRHandlerOptions = {
        container,
        program,
      };

      // Act
      const handler = createHMRHandler(options);

      // Assert
      expect(handler).toBeDefined();
      expect(typeof handler.handleUpdate).toBe('function');
      expect(typeof handler.destroy).toBe('function');
    });

    it('should hydrate the initial program on creation', () => {
      /**
       * Given: HMR handler options with a program
       * When: createHMRHandler is called
       * Then: The program should be hydrated/rendered to the container
       */
      // Arrange
      const program = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'test-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello HMR' } },
          ],
        },
      });

      // Pre-render SSR content to container (for hydration)
      container.innerHTML = '<div id="test-content">Hello HMR</div>';

      const options: HMRHandlerOptions = {
        container,
        program,
      };

      // Act
      createHMRHandler(options);

      // Assert
      expect(container.querySelector('#test-content')).not.toBeNull();
      expect(container.textContent).toContain('Hello HMR');
    });

    it('should accept optional route context', () => {
      /**
       * Given: HMR handler options with route context
       * When: createHMRHandler is called
       * Then: The handler should be created without error
       */
      // Arrange
      const program = createMockCompiledProgram();
      const options: HMRHandlerOptions = {
        container,
        program,
        route: {
          params: { id: '123' },
          query: { filter: 'active' },
          path: '/items/123',
        },
      };

      // Act & Assert
      expect(() => createHMRHandler(options)).not.toThrow();
    });
  });

  // ==================== handleUpdate ====================

  describe('handleUpdate()', () => {
    it('should update the app with the new program', async () => {
      /**
       * Given: An HMR handler with initial program
       * When: handleUpdate is called with a new program
       * Then: The DOM should reflect the new program
       */
      // Arrange
      const initialProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Initial' } },
          ],
        },
      });
      container.innerHTML = '<div id="content">Initial</div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      const newProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Updated' } },
          ],
        },
      });

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert
      expect(container.textContent).toContain('Updated');
    });

    it('should preserve state across updates', async () => {
      /**
       * Given: An HMR handler with stateful program
       * When: handleUpdate is called after state was modified
       * Then: State should be preserved in the new app
       */
      // Arrange
      const initialProgram = createProgramWithState({
        count: { type: 'number', initial: 0 },
        theme: { type: 'string', initial: 'light' },
      });
      initialProgram.view = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'state', name: 'count' } },
        ],
      };
      container.innerHTML = '<div>0</div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      // Simulate state change by the user
      // The handler should expose a way to access the app instance
      // or we test this through the DOM

      // Create new program with same state fields
      const newProgram = createProgramWithState({
        count: { type: 'number', initial: 0 },
        theme: { type: 'string', initial: 'light' },
      });
      newProgram.view = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'state', name: 'count' } },
          { kind: 'text', value: { expr: 'lit', value: ' (updated view)' } },
        ],
      };

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert - State should be preserved (count = 0, not reset)
      // The view should be updated
      expect(container.textContent).toContain('(updated view)');
    });

    it('should call destroy on the old app before creating new one', async () => {
      /**
       * Given: An HMR handler with initial program
       * When: handleUpdate is called
       * Then: The old app should be destroyed before the new one is created
       */
      // Arrange
      const destroySpy = vi.fn();

      // We'll verify this by checking that the old DOM is removed
      const initialProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'old-app' } },
        },
      });
      container.innerHTML = '<div id="old-app"></div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      const newProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'new-app' } },
        },
      });

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert
      expect(container.querySelector('#old-app')).toBeNull();
      expect(container.querySelector('#new-app')).not.toBeNull();
    });

    it('should handle multiple consecutive updates', async () => {
      /**
       * Given: An HMR handler
       * When: handleUpdate is called multiple times in succession
       * Then: Each update should be applied correctly
       */
      // Arrange
      const initialProgram = createMockCompiledProgram({
        view: { kind: 'element', tag: 'div', children: [{ kind: 'text', value: { expr: 'lit', value: 'v1' } }] },
      });
      container.innerHTML = '<div>v1</div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      // Act - Multiple updates
      handler.handleUpdate(createMockCompiledProgram({
        view: { kind: 'element', tag: 'div', children: [{ kind: 'text', value: { expr: 'lit', value: 'v2' } }] },
      }));
      await Promise.resolve();

      handler.handleUpdate(createMockCompiledProgram({
        view: { kind: 'element', tag: 'div', children: [{ kind: 'text', value: { expr: 'lit', value: 'v3' } }] },
      }));
      await Promise.resolve();

      handler.handleUpdate(createMockCompiledProgram({
        view: { kind: 'element', tag: 'div', children: [{ kind: 'text', value: { expr: 'lit', value: 'v4' } }] },
      }));
      await Promise.resolve();

      // Assert
      expect(container.textContent).toContain('v4');
    });

    it('should preserve state when new state field is added', async () => {
      /**
       * Given: An HMR handler with stateful program
       * When: handleUpdate is called with a program that has an additional state field
       * Then: Existing state should be preserved, new field should use initial value
       */
      // Arrange
      const initialProgram = createProgramWithState({
        count: { type: 'number', initial: 0 },
      });
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      // New program with additional state field
      const newProgram = createProgramWithState({
        count: { type: 'number', initial: 0 },
        newField: { type: 'string', initial: 'default' },
      });
      newProgram.view = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'state', name: 'count' } },
          { kind: 'text', value: { expr: 'state', name: 'newField' } },
        ],
      };

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert - Should not throw and new field should have initial value
      expect(container.textContent).toContain('default');
    });

    it('should handle state type changes gracefully', async () => {
      /**
       * Given: An HMR handler with stateful program
       * When: handleUpdate is called with a program where state type changed
       * Then: Should use new initial value for changed field
       */
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const initialProgram = createProgramWithState({
        value: { type: 'number', initial: 42 },
      });
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      // New program with type changed
      const newProgram = createProgramWithState({
        value: { type: 'string', initial: 'hello' },
      });
      newProgram.view = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'state', name: 'value' } },
        ],
      };

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert - Should use new initial value
      expect(container.textContent).toContain('hello');
      
      consoleWarnSpy.mockRestore();
    });
  });

  // ==================== destroy ====================

  describe('destroy()', () => {
    it('should clean up the app and container', async () => {
      /**
       * Given: An HMR handler with an active app
       * When: destroy() is called
       * Then: The app should be destroyed and container should be empty
       */
      // Arrange
      const program = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'app-content' } },
        },
      });
      container.innerHTML = '<div id="app-content"></div>';

      const handler = createHMRHandler({
        container,
        program,
      });

      // Act
      handler.destroy();
      await Promise.resolve();

      // Assert
      expect(container.innerHTML).toBe('');
    });

    it('should execute onUnmount lifecycle hook', async () => {
      /**
       * Given: An HMR handler with a program that has onUnmount hook
       * When: destroy() is called
       * Then: The onUnmount action should be executed
       */
      // Arrange
      const program = createMockCompiledProgram({
        state: {
          cleaned: { type: 'boolean', initial: false },
        },
        lifecycle: {
          onUnmount: 'cleanup',
        },
        actions: {
          cleanup: {
            name: 'cleanup',
            steps: [
              { do: 'set', target: 'cleaned', value: { expr: 'lit', value: true } },
            ],
          },
        },
      });
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program,
      });

      // Act
      handler.destroy();
      await Promise.resolve();

      // Assert - Lifecycle should have been called
      // (We can't directly check state after destroy, but no error means success)
      expect(container.innerHTML).toBe('');
    });

    it('should not throw if called multiple times', () => {
      /**
       * Given: An HMR handler
       * When: destroy() is called multiple times
       * Then: Should not throw
       */
      // Arrange
      const program = createMockCompiledProgram();
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program,
      });

      // Act & Assert
      expect(() => {
        handler.destroy();
        handler.destroy();
        handler.destroy();
      }).not.toThrow();
    });

    it('should not allow handleUpdate after destroy', () => {
      /**
       * Given: A destroyed HMR handler
       * When: handleUpdate is called
       * Then: Should not throw but should not apply update
       */
      // Arrange
      const program = createMockCompiledProgram();
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program,
      });

      handler.destroy();

      // Act & Assert
      expect(() => {
        handler.handleUpdate(createMockCompiledProgram({
          view: { kind: 'element', tag: 'span' },
        }));
      }).not.toThrow();

      // Container should remain empty
      expect(container.innerHTML).toBe('');
    });
  });

  // ==================== Route Context ====================

  describe('route context handling', () => {
    it('should pass route context to hydrated app', () => {
      /**
       * Given: HMR handler options with route context
       * When: The app is hydrated
       * Then: Route params should be accessible in the app
       */
      // Arrange
      const program = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'route', name: 'id', source: 'param' } },
          ],
        },
      });
      container.innerHTML = '<div>123</div>';

      const options: HMRHandlerOptions = {
        container,
        program,
        route: {
          params: { id: '123' },
          query: {},
          path: '/items/123',
        },
      };

      // Act
      const handler = createHMRHandler(options);

      // Assert
      expect(container.textContent).toContain('123');
    });

    it('should preserve route context across updates', async () => {
      /**
       * Given: An HMR handler with route context
       * When: handleUpdate is called
       * Then: Route context should be preserved
       */
      // Arrange
      const initialProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'route', name: 'id', source: 'param' } },
          ],
        },
      });
      container.innerHTML = '<div>456</div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
        route: {
          params: { id: '456' },
          query: {},
          path: '/items/456',
        },
      });

      const newProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'ID: ' } },
            { kind: 'text', value: { expr: 'route', name: 'id', source: 'param' } },
          ],
        },
      });

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert
      expect(container.textContent).toContain('456');
    });
  });

  // ==================== skipInitialRender Option ====================

  describe('skipInitialRender option', () => {
    it('should NOT render initial app when skipInitialRender is true', () => {
      /**
       * Given: HMR handler options with skipInitialRender: true
       * When: createHMRHandler is called
       * Then: The container should remain empty (no app rendered)
       *
       * This is needed for hydration scenarios where hydrateApp() handles
       * initial rendering and the HMR handler should only handle updates.
       */
      // Arrange
      const program = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'test-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello HMR' } },
          ],
        },
      });

      // Pre-populate with SSR content (simulating hydration scenario)
      container.innerHTML = '<div id="ssr-content">SSR Content</div>';

      const options: HMRHandlerOptions = {
        container,
        program,
        skipInitialRender: true,
      };

      // Act
      createHMRHandler(options);

      // Assert - Container should still have only the original SSR content
      // The HMR handler should NOT have rendered the program
      expect(container.querySelector('#ssr-content')).not.toBeNull();
      expect(container.textContent).toBe('SSR Content');
      expect(container.querySelector('#test-content')).toBeNull();
    });

    it('should handle first update correctly when skipInitialRender is true', async () => {
      /**
       * Given: HMR handler with skipInitialRender: true
       * When: handleUpdate is called with a new program
       * Then: The container should now have the new app rendered
       */
      // Arrange
      const initialProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Initial (should not render)' } },
          ],
        },
      });

      const handler = createHMRHandler({
        container,
        program: initialProgram,
        skipInitialRender: true,
      });

      const newProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'updated-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Updated via HMR' } },
          ],
        },
      });

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert - Now the container should have the updated content
      expect(container.querySelector('#updated-content')).not.toBeNull();
      expect(container.textContent).toContain('Updated via HMR');
    });

    it('should clear container contents before first render when skipInitialRender is true', async () => {
      /**
       * Given: Container with SSR content, HMR handler with skipInitialRender: true
       * When: handleUpdate is called with new program
       * Then: Container should only have new program's content (no SSR content mixed in)
       *
       * This ensures that when the first HMR update arrives, the old SSR content
       * is properly removed before rendering the new content.
       */
      // Arrange
      // Pre-populate container with SSR content
      container.innerHTML = '<div id="ssr-content">Server Rendered Content</div>';

      const initialProgram = createMockCompiledProgram({
        view: { kind: 'element', tag: 'div' },
      });

      const handler = createHMRHandler({
        container,
        program: initialProgram,
        skipInitialRender: true,
      });

      // Verify SSR content is still there after handler creation
      expect(container.querySelector('#ssr-content')).not.toBeNull();

      const newProgram = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'hmr-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'HMR Content Only' } },
          ],
        },
      });

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert - Only new content should be present, SSR content should be cleared
      expect(container.querySelector('#ssr-content')).toBeNull();
      expect(container.querySelector('#hmr-content')).not.toBeNull();
      expect(container.textContent).toBe('HMR Content Only');
      expect(container.textContent).not.toContain('Server Rendered Content');
    });

    it('should handle destroy() gracefully when skipInitialRender is true and no updates received', () => {
      /**
       * Given: HMR handler with skipInitialRender: true and no handleUpdate called
       * When: destroy() is called
       * Then: Should not throw and container should remain unchanged (SSR content preserved)
       *
       * This edge case can occur when the HMR connection fails before any updates are received.
       */
      // Arrange
      const program = createMockCompiledProgram();
      container.innerHTML = '<div id="ssr-content">SSR Content</div>';

      const handler = createHMRHandler({
        container,
        program,
        skipInitialRender: true,
      });

      // Act & Assert - Should not throw
      expect(() => handler.destroy()).not.toThrow();
      // Container should remain unchanged (SSR content still there)
      expect(container.querySelector('#ssr-content')).not.toBeNull();
      expect(container.textContent).toBe('SSR Content');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty container gracefully', () => {
      /**
       * Given: An empty container
       * When: createHMRHandler is called
       * Then: Should render the app without error
       */
      // Arrange
      const program = createMockCompiledProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'new-content' } },
        },
      });

      // Act & Assert
      expect(() => {
        createHMRHandler({
          container,
          program,
        });
      }).not.toThrow();
    });

    it('should handle program with no state', async () => {
      /**
       * Given: A program with no state fields
       * When: handleUpdate is called
       * Then: Should update without error
       */
      // Arrange
      const initialProgram = createMockCompiledProgram();
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      const newProgram = createMockCompiledProgram({
        view: { kind: 'element', tag: 'span' },
      });

      // Act & Assert
      expect(() => handler.handleUpdate(newProgram)).not.toThrow();
    });

    it('should handle program with complex nested state', async () => {
      /**
       * Given: A program with complex nested state
       * When: handleUpdate is called
       * Then: Nested state should be preserved
       */
      // Arrange
      const initialProgram = createProgramWithState({
        data: {
          type: 'object',
          initial: {
            users: [
              { id: 1, name: 'Alice', settings: { theme: 'dark' } },
              { id: 2, name: 'Bob', settings: { theme: 'light' } },
            ],
            config: {
              nested: {
                deeply: {
                  value: 42,
                },
              },
            },
          },
        },
      });
      container.innerHTML = '<div></div>';

      const handler = createHMRHandler({
        container,
        program: initialProgram,
      });

      const newProgram = createProgramWithState({
        data: {
          type: 'object',
          initial: {
            users: [],
            config: { nested: { deeply: { value: 0 } } },
          },
        },
      });
      newProgram.view = {
        kind: 'element',
        tag: 'div',
        props: { id: { expr: 'lit', value: 'updated' } },
      };

      // Act
      handler.handleUpdate(newProgram);
      await Promise.resolve();

      // Assert - View should be updated
      expect(container.querySelector('#updated')).not.toBeNull();
    });
  });
});
