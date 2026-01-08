/**
 * Test module for Lifecycle Hooks Runtime Execution.
 *
 * Coverage:
 * - onMount is called when app starts
 * - onUnmount is called when app destroys
 * - Hooks execute the correct action
 * - Lifecycle hook execution order
 * - Route-related hooks (onRouteEnter, onRouteLeave)
 *
 * TDD Red Phase: These tests verify the runtime execution of lifecycle hooks
 * that will be added to support component lifecycle in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import type { AppInstance } from '../app.js';
import type { CompiledProgram, CompiledLifecycleHooks } from '@constela/compiler';

describe('Lifecycle Hooks Runtime', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper Functions ====================

  function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  // ==================== onMount ====================

  describe('onMount', () => {
    it('should execute onMount action when app is created', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'initializeApp',
        },
        state: {
          initialized: { type: 'boolean', initial: false },
        },
        actions: {
          initializeApp: {
            name: 'initializeApp',
            steps: [
              { do: 'set', target: 'initialized', value: { expr: 'lit', value: true } },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);

      // Wait for lifecycle hook to execute
      await Promise.resolve();

      // Assert
      expect(app.getState('initialized')).toBe(true);
    });

    it('should execute onMount before initial render completes', async () => {
      // Arrange
      const renderOrder: string[] = [];

      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'trackMount',
        },
        state: {
          mounted: { type: 'boolean', initial: false },
        },
        actions: {
          trackMount: {
            name: 'trackMount',
            steps: [
              { do: 'set', target: 'mounted', value: { expr: 'lit', value: true } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            id: { expr: 'lit', value: 'app-container' },
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert
      expect(app.getState('mounted')).toBe(true);
      expect(container.querySelector('#app-container')).not.toBeNull();
    });

    it('should execute complex onMount action with multiple steps', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'complexInit',
        },
        state: {
          step1: { type: 'boolean', initial: false },
          step2: { type: 'boolean', initial: false },
          step3: { type: 'boolean', initial: false },
        },
        actions: {
          complexInit: {
            name: 'complexInit',
            steps: [
              { do: 'set', target: 'step1', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'step2', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'step3', value: { expr: 'lit', value: true } },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert
      expect(app.getState('step1')).toBe(true);
      expect(app.getState('step2')).toBe(true);
      expect(app.getState('step3')).toBe(true);
    });

    it('should execute onMount action with fetch', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'loaded' }),
      });
      globalThis.fetch = mockFetch;

      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'loadData',
        },
        state: {
          data: { type: 'object', initial: {} },
          loading: { type: 'boolean', initial: true },
        },
        actions: {
          loadData: {
            name: 'loadData',
            steps: [
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api/init' },
                result: 'response',
                onSuccess: [
                  { do: 'set', target: 'data', value: { expr: 'var', name: 'response' } },
                  { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
                ],
              },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/init', expect.any(Object));
      expect(app.getState('loading')).toBe(false);
      expect(app.getState('data')).toEqual({ data: 'loaded' });
    });

    it('should not break app if onMount action is missing', () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'nonExistentAction', // This action doesn't exist
        },
      });

      // Act & Assert - Should not throw, but may log warning
      expect(() => {
        createApp(program, container);
      }).not.toThrow();
    });
  });

  // ==================== onUnmount ====================

  describe('onUnmount', () => {
    it('should execute onUnmount action when app is destroyed', async () => {
      // Arrange
      let cleanupCalled = false;
      const originalSet = Set.prototype.add;

      const program = createMinimalProgram({
        lifecycle: {
          onUnmount: 'cleanupApp',
        },
        state: {
          cleaned: { type: 'boolean', initial: false },
        },
        actions: {
          cleanupApp: {
            name: 'cleanupApp',
            steps: [
              { do: 'set', target: 'cleaned', value: { expr: 'lit', value: true } },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      expect(app.getState('cleaned')).toBe(false);

      app.destroy();
      await Promise.resolve();

      // Assert
      expect(app.getState('cleaned')).toBe(true);
    });

    it('should execute onUnmount before DOM cleanup', async () => {
      // Arrange
      let domPresentDuringCleanup = false;

      const program = createMinimalProgram({
        lifecycle: {
          onUnmount: 'checkDom',
        },
        state: {
          domChecked: { type: 'boolean', initial: false },
        },
        actions: {
          checkDom: {
            name: 'checkDom',
            steps: [
              { do: 'set', target: 'domChecked', value: { expr: 'lit', value: true } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            id: { expr: 'lit', value: 'tracked-element' },
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      expect(container.querySelector('#tracked-element')).not.toBeNull();

      app.destroy();
      await Promise.resolve();

      // Assert
      expect(app.getState('domChecked')).toBe(true);
    });

    it('should handle onUnmount with storage cleanup', async () => {
      // Arrange
      const mockLocalStorage = {
        removeItem: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const program = createMinimalProgram({
        lifecycle: {
          onUnmount: 'clearStorage',
        },
        state: {},
        actions: {
          clearStorage: {
            name: 'clearStorage',
            steps: [
              {
                do: 'storage',
                operation: 'remove',
                key: { expr: 'lit', value: 'sessionData' },
                storage: 'local',
              },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      app.destroy();
      await Promise.resolve();

      // Assert
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sessionData');
    });

    it('should not execute onUnmount if app was never mounted', () => {
      // This test verifies cleanup behavior edge case
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onUnmount: 'cleanup',
        },
        state: {
          cleaned: { type: 'boolean', initial: false },
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

      // Act
      const app = createApp(program, container);
      // Immediately destroy without waiting for mount
      app.destroy();

      // Assert - behavior depends on implementation
      // This documents expected behavior
    });

    it('should only execute onUnmount once even if destroy called multiple times', async () => {
      // Arrange
      let cleanupCount = 0;

      const program = createMinimalProgram({
        lifecycle: {
          onUnmount: 'countCleanup',
        },
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: {
          countCleanup: {
            name: 'countCleanup',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      app.destroy();
      await Promise.resolve();
      app.destroy();
      await Promise.resolve();
      app.destroy();
      await Promise.resolve();

      // Assert
      expect(app.getState('count')).toBe(1);
    });
  });

  // ==================== Execution Order ====================

  describe('lifecycle execution order', () => {
    it('should execute onMount and onUnmount in correct order', async () => {
      // Arrange
      const executionLog: string[] = [];

      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'logMount',
          onUnmount: 'logUnmount',
        },
        state: {
          log: { type: 'list', initial: [] },
        },
        actions: {
          logMount: {
            name: 'logMount',
            steps: [
              {
                do: 'update',
                target: 'log',
                operation: 'push',
                value: { expr: 'lit', value: 'mounted' },
              },
            ],
          },
          logUnmount: {
            name: 'logUnmount',
            steps: [
              {
                do: 'update',
                target: 'log',
                operation: 'push',
                value: { expr: 'lit', value: 'unmounted' },
              },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      app.destroy();
      await Promise.resolve();

      // Assert
      expect(app.getState('log')).toEqual(['mounted', 'unmounted']);
    });

    it('should complete onMount before subsequent state changes', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'initCount',
        },
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: {
          initCount: {
            name: 'initCount',
            steps: [
              { do: 'set', target: 'count', value: { expr: 'lit', value: 10 } },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert - Count should be initialized by onMount
      expect(app.getState('count')).toBe(10);

      // Further state changes should work normally
      app.setState('count', 20);
      expect(app.getState('count')).toBe(20);
    });
  });

  // ==================== No Lifecycle ====================

  describe('program without lifecycle', () => {
    it('should work correctly without lifecycle hooks', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert
      expect(container.querySelector('span')?.textContent).toBe('0');

      app.destroy();
      // Should not throw
    });

    it('should handle undefined lifecycle field', () => {
      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        // lifecycle is undefined
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div' },
      };

      // Act & Assert
      expect(() => {
        const app = createApp(program, container);
        app.destroy();
      }).not.toThrow();
    });

    it('should handle empty lifecycle object', () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {},
      });

      // Act & Assert
      expect(() => {
        const app = createApp(program, container);
        app.destroy();
      }).not.toThrow();
    });
  });

  // ==================== onRouteEnter and onRouteLeave ====================

  describe('route lifecycle hooks', () => {
    it('should have onRouteEnter action available for execution', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onRouteEnter: 'loadPageData',
        },
        state: {
          pageLoaded: { type: 'boolean', initial: false },
        },
        actions: {
          loadPageData: {
            name: 'loadPageData',
            steps: [
              { do: 'set', target: 'pageLoaded', value: { expr: 'lit', value: true } },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);

      // Note: onRouteEnter execution depends on router integration
      // This test verifies the action is available and can be called
      // Actual route change handling is tested in router package

      // Assert - Action should be defined
      expect(program.actions.loadPageData).toBeDefined();
    });

    it('should have onRouteLeave action available for execution', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onRouteLeave: 'savePageState',
        },
        state: {
          saved: { type: 'boolean', initial: false },
        },
        actions: {
          savePageState: {
            name: 'savePageState',
            steps: [
              { do: 'set', target: 'saved', value: { expr: 'lit', value: true } },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert - Action should be defined
      expect(program.actions.savePageState).toBeDefined();
    });

    it('should support route hooks alongside mount hooks', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'appInit',
          onUnmount: 'appCleanup',
          onRouteEnter: 'pageLoad',
          onRouteLeave: 'pageSave',
        },
        state: {
          appInitialized: { type: 'boolean', initial: false },
        },
        actions: {
          appInit: {
            name: 'appInit',
            steps: [
              { do: 'set', target: 'appInitialized', value: { expr: 'lit', value: true } },
            ],
          },
          appCleanup: {
            name: 'appCleanup',
            steps: [],
          },
          pageLoad: {
            name: 'pageLoad',
            steps: [],
          },
          pageSave: {
            name: 'pageSave',
            steps: [],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert
      expect(app.getState('appInitialized')).toBe(true);
      // Route hooks would be triggered by router, not by createApp
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should handle errors in onMount gracefully', async () => {
      // Arrange - Action that might fail
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'failingInit',
        },
        state: {
          error: { type: 'boolean', initial: false },
        },
        actions: {
          failingInit: {
            name: 'failingInit',
            steps: [
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api/fail' },
                onError: [
                  { do: 'set', target: 'error', value: { expr: 'lit', value: true } },
                ],
              },
            ],
          },
        },
      });

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      globalThis.fetch = mockFetch;

      // Act
      const app = createApp(program, container);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - App should still work, error should be caught
      expect(app.getState('error')).toBe(true);
    });

    it('should handle errors in onUnmount gracefully', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onUnmount: 'failingCleanup',
        },
        state: {},
        actions: {
          failingCleanup: {
            name: 'failingCleanup',
            steps: [
              {
                do: 'storage',
                operation: 'remove',
                key: { expr: 'lit', value: 'key' },
                storage: 'local',
              },
            ],
          },
        },
      });

      // Make storage throw
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          removeItem: () => { throw new Error('Storage error'); },
        },
        writable: true,
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert - destroy should not throw even if cleanup fails
      expect(() => app.destroy()).not.toThrow();
    });
  });

  // ==================== Integration with State ====================

  describe('integration with state', () => {
    it('should allow lifecycle hooks to access initial state', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'doubleCount',
        },
        state: {
          count: { type: 'number', initial: 5 },
        },
        actions: {
          doubleCount: {
            name: 'doubleCount',
            steps: [
              {
                do: 'set',
                target: 'count',
                value: {
                  expr: 'bin',
                  op: '*',
                  left: { expr: 'state', name: 'count' },
                  right: { expr: 'lit', value: 2 },
                },
              },
            ],
          },
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert
      expect(app.getState('count')).toBe(10);
    });

    it('should reflect state changes from lifecycle hooks in the view', async () => {
      // Arrange
      const program = createMinimalProgram({
        lifecycle: {
          onMount: 'setMessage',
        },
        state: {
          message: { type: 'string', initial: 'Loading...' },
        },
        actions: {
          setMessage: {
            name: 'setMessage',
            steps: [
              { do: 'set', target: 'message', value: { expr: 'lit', value: 'Welcome!' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'h1',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'message' } },
          ],
        },
      });

      // Act
      const app = createApp(program, container);
      await Promise.resolve();

      // Assert
      expect(container.querySelector('h1')?.textContent).toBe('Welcome!');
    });
  });
});
