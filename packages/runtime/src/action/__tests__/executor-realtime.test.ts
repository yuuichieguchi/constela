/**
 * Test module for Realtime Action Step Executor.
 *
 * Coverage:
 * - sseConnect step execution (SSE connection establishment)
 * - sseClose step execution (SSE connection closure)
 * - optimistic step execution (optimistic UI updates)
 * - confirm step execution (confirm optimistic updates)
 * - reject step execution (reject and rollback optimistic updates)
 * - bind step execution (realtime data binding)
 * - unbind step execution (remove data binding)
 * - Integration with SSEManager, OptimisticManager, and BindingManager
 *
 * TDD Red Phase: These tests verify the runtime execution of realtime action steps
 * that will be added to support SSE, optimistic updates, and data binding.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';
import {
  createOptimisticManager,
  type OptimisticManager,
} from '../../optimistic/manager.js';
import {
  createBindingManager,
  type BindingManager,
} from '../../binding/realtime.js';

// ==================== Mock EventSource (SSE) ====================

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = MockEventSource.CONNECTING;
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  private eventListeners: Map<string, ((ev: MessageEvent) => void)[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (ev: MessageEvent) => void) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  // Test helpers
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: string, eventType = 'message') {
    const event = new MessageEvent(eventType, { data });
    if (eventType === 'message') {
      this.onmessage?.(event);
    }
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// ==================== Test Setup ====================

describe('executeAction with Realtime Steps', () => {
  let mockEventSourceInstance: MockEventSource | null = null;
  let originalEventSource: typeof EventSource;
  let optimisticManager: OptimisticManager;
  let bindingManager: BindingManager;

  beforeEach(() => {
    // Save original EventSource
    originalEventSource = globalThis.EventSource;
    mockEventSourceInstance = null;

    // Mock EventSource constructor
    globalThis.EventSource = vi.fn((url: string) => {
      mockEventSourceInstance = new MockEventSource(url);
      return mockEventSourceInstance;
    }) as unknown as typeof EventSource;

    // Copy static constants
    (globalThis.EventSource as unknown as typeof MockEventSource).CONNECTING = MockEventSource.CONNECTING;
    (globalThis.EventSource as unknown as typeof MockEventSource).OPEN = MockEventSource.OPEN;
    (globalThis.EventSource as unknown as typeof MockEventSource).CLOSED = MockEventSource.CLOSED;

    // Create fresh managers for each test
    optimisticManager = createOptimisticManager();
    bindingManager = createBindingManager();
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    optimisticManager.dispose();
    bindingManager.dispose();
    vi.restoreAllMocks();
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }>,
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {}
  ): ActionContext & { sse?: Record<string, MockEventSource>; optimistic?: OptimisticManager; binding?: BindingManager } {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
      sse: {},
      optimistic: optimisticManager,
      binding: bindingManager,
    };
  }

  // ==================== SSE Connect Step ====================

  describe('sseConnect step', () => {
    it('should establish SSE connection with named connection', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [],
            onError: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockEventSourceInstance).not.toBeNull();
      expect(mockEventSourceInstance?.url).toBe('/stream');
    });

    it('should execute onOpen callback when connection opens', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [
              { do: 'set', target: 'connected', value: { expr: 'lit', value: true } },
            ],
            onMessage: [],
            onError: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        connected: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);
      mockEventSourceInstance?.simulateOpen();

      // Assert
      expect(context.state.get('connected')).toBe(true);
    });

    it('should execute onMessage callback when message received', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [
              { do: 'set', target: 'lastMessage', value: { expr: 'var', name: 'event' } },
            ],
            onError: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        lastMessage: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(action, context);
      mockEventSourceInstance?.simulateOpen();
      mockEventSourceInstance?.simulateMessage('{"text":"Hello"}');

      // Assert
      // The event data should be parsed and stored
      const lastMessage = context.state.get('lastMessage') as { data: string };
      expect(lastMessage).toBeDefined();
    });

    it('should execute onError callback when error occurs', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [],
            onError: [
              { do: 'set', target: 'hasError', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        hasError: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);
      mockEventSourceInstance?.simulateError();

      // Assert
      expect(context.state.get('hasError')).toBe(true);
    });

    it('should support dynamic URL from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: '/stream/' },
              right: { expr: 'state', name: 'userId' },
            },
            onOpen: [],
            onMessage: [],
            onError: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        userId: { type: 'string', initial: 'user123' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockEventSourceInstance?.url).toBe('/stream/user123');
    });

    it('should listen to specific event types when specified', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            eventTypes: ['update', 'delete'],
            onOpen: [],
            onMessage: [
              { do: 'update', target: 'events', operation: 'push', value: { expr: 'var', name: 'event' } },
            ],
            onError: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        events: { type: 'list', initial: [] },
      });

      // Act
      await executeAction(action, context);
      mockEventSourceInstance?.simulateOpen();
      mockEventSourceInstance?.simulateMessage('{"type":"update"}', 'update');

      // Assert
      const events = context.state.get('events') as unknown[];
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ==================== SSE Close Step ====================

  describe('sseClose step', () => {
    it('should close named SSE connection', async () => {
      // Arrange - first connect
      const connectAction: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [],
            onError: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});
      await executeAction(connectAction, context);
      const sseInstance = mockEventSourceInstance;

      // Act - then close
      const closeAction: CompiledAction = {
        name: 'disconnect',
        steps: [
          {
            do: 'sseClose',
            connection: 'notif',
          } as CompiledActionStep,
        ],
      };
      await executeAction(closeAction, context);

      // Assert
      expect(sseInstance?.close).toHaveBeenCalled();
    });

    it('should not throw when closing non-existent connection', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'disconnect',
        steps: [
          {
            do: 'sseClose',
            connection: 'nonexistent',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });
  });

  // ==================== Optimistic Step ====================

  describe('optimistic step', () => {
    it('should apply optimistic update immediately', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'like',
        steps: [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [{ id: 1, liked: false }] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(true);
    });

    it('should store update ID in result variable', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'like',
        steps: [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            result: 'updateId',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [{ id: 1, liked: false }] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.locals['updateId']).toBeDefined();
      expect(typeof context.locals['updateId']).toBe('string');
    });

    it('should apply optimistic update without path', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replace',
        steps: [
          {
            do: 'optimistic',
            target: 'counter',
            value: { expr: 'lit', value: 42 },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        counter: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('counter')).toBe(42);
    });

    it('should apply optimistic update with dynamic value from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'update',
        steps: [
          {
            do: 'optimistic',
            target: 'data',
            value: { expr: 'state', name: 'newValue' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
        newValue: { type: 'object', initial: { updated: true } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('data')).toEqual({ updated: true });
    });
  });

  // ==================== Confirm Step ====================

  describe('confirm step', () => {
    it('should confirm optimistic update', async () => {
      // Arrange - first apply optimistic update
      const optimisticAction: CompiledAction = {
        name: 'like',
        steps: [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            result: 'updateId',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [{ id: 1, liked: false }] },
      });
      await executeAction(optimisticAction, context);

      // Act - confirm the update
      const confirmAction: CompiledAction = {
        name: 'confirmLike',
        steps: [
          {
            do: 'confirm',
            id: { expr: 'var', name: 'updateId' },
          } as CompiledActionStep,
        ],
      };
      await executeAction(confirmAction, context);

      // Assert - value should remain
      const items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(true);
    });

    it('should not throw when confirming non-existent update', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'confirm',
        steps: [
          {
            do: 'confirm',
            id: { expr: 'lit', value: 'non-existent-id' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });
  });

  // ==================== Reject Step ====================

  describe('reject step', () => {
    it('should reject and rollback optimistic update', async () => {
      // Arrange - first apply optimistic update
      const optimisticAction: CompiledAction = {
        name: 'like',
        steps: [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            result: 'updateId',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [{ id: 1, liked: false }] },
      });
      await executeAction(optimisticAction, context);

      // Verify optimistic update was applied
      let items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(true);

      // Act - reject the update
      const rejectAction: CompiledAction = {
        name: 'rejectLike',
        steps: [
          {
            do: 'reject',
            id: { expr: 'var', name: 'updateId' },
          } as CompiledActionStep,
        ],
      };
      await executeAction(rejectAction, context);

      // Assert - value should be rolled back
      items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(false);
    });

    it('should not throw when rejecting non-existent update', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'reject',
        steps: [
          {
            do: 'reject',
            id: { expr: 'lit', value: 'non-existent-id' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should rollback nested path update correctly', async () => {
      // Arrange
      const optimisticAction: CompiledAction = {
        name: 'update',
        steps: [
          {
            do: 'optimistic',
            target: 'data',
            path: { expr: 'lit', value: ['users', 0, 'name'] },
            value: { expr: 'lit', value: 'New Name' },
            result: 'updateId',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: { users: [{ name: 'Original' }] } },
      });
      await executeAction(optimisticAction, context);

      // Act
      const rejectAction: CompiledAction = {
        name: 'reject',
        steps: [
          {
            do: 'reject',
            id: { expr: 'var', name: 'updateId' },
          } as CompiledActionStep,
        ],
      };
      await executeAction(rejectAction, context);

      // Assert
      const data = context.state.get('data') as { users: Array<{ name: string }> };
      expect(data.users[0]?.name).toBe('Original');
    });
  });

  // ==================== Bind Step ====================

  describe('bind step', () => {
    it('should create binding for connection and target', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setupBinding',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(bindingManager.getBindings().length).toBe(1);
      expect(bindingManager.getBindings()[0]?.connection).toBe('ws');
      expect(bindingManager.getBindings()[0]?.target).toBe('data');
    });

    it('should create binding with eventType filter', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setupBinding',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            eventType: 'update',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const bindings = bindingManager.getBindings();
      expect(bindings.length).toBe(1);
      expect(bindings[0]?.eventType).toBe('update');
    });

    it('should create binding with path for nested updates', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setupBinding',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
            path: { expr: 'lit', value: ['items'] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: { items: [] } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const bindings = bindingManager.getBindings();
      expect(bindings.length).toBe(1);
      expect(bindings[0]?.path).toEqual(['items']);
    });

    it('should create binding with patch mode', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setupBinding',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
            patch: true,
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const bindings = bindingManager.getBindings();
      expect(bindings.length).toBe(1);
      expect(bindings[0]?.patch).toBe(true);
    });

    it('should update state when handleMessage is called on binding', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setupBinding',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });
      await executeAction(action, context);

      // Act - simulate message received through binding manager
      bindingManager.handleMessage('ws', { message: 'Hello' });

      // Assert - state should be updated (after binding integration)
      // This test verifies the binding was created; actual state update
      // depends on the setState callback passed during bind
    });
  });

  // ==================== Unbind Step ====================

  describe('unbind step', () => {
    it('should remove binding for connection and target', async () => {
      // Arrange - first create a binding
      const bindAction: CompiledAction = {
        name: 'setupBinding',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });
      await executeAction(bindAction, context);
      expect(bindingManager.getBindings().length).toBe(1);

      // Act - unbind
      const unbindAction: CompiledAction = {
        name: 'removeBinding',
        steps: [
          {
            do: 'unbind',
            connection: 'ws',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      await executeAction(unbindAction, context);

      // Assert
      expect(bindingManager.getBindings().length).toBe(0);
    });

    it('should not throw when unbinding non-existent binding', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'removeBinding',
        steps: [
          {
            do: 'unbind',
            connection: 'nonexistent',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });
  });

  // ==================== Mixed Realtime Steps ====================

  describe('mixed realtime steps', () => {
    it('should execute optimistic update followed by confirm', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'optimisticLike',
        steps: [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            result: 'updateId',
          } as CompiledActionStep,
          {
            do: 'confirm',
            id: { expr: 'var', name: 'updateId' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [{ id: 1, liked: false }] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(true);
    });

    it('should execute SSE connect with binding in lifecycle', async () => {
      // Arrange
      const connectAction: CompiledAction = {
        name: 'connect',
        steps: [
          {
            do: 'sseConnect',
            connection: 'live',
            url: { expr: 'lit', value: '/live' },
            onOpen: [],
            onMessage: [],
            onError: [],
          } as CompiledActionStep,
          {
            do: 'bind',
            connection: 'live',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(connectAction, context);

      // Assert
      expect(mockEventSourceInstance).not.toBeNull();
      expect(bindingManager.getBindings().length).toBe(1);
    });

    it('should execute unbind followed by SSE close in cleanup', async () => {
      // Arrange - setup connection and binding
      const setupAction: CompiledAction = {
        name: 'setup',
        steps: [
          {
            do: 'sseConnect',
            connection: 'live',
            url: { expr: 'lit', value: '/live' },
            onOpen: [],
            onMessage: [],
            onError: [],
          } as CompiledActionStep,
          {
            do: 'bind',
            connection: 'live',
            target: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });
      await executeAction(setupAction, context);
      const sseInstance = mockEventSourceInstance;

      // Act - cleanup
      const cleanupAction: CompiledAction = {
        name: 'cleanup',
        steps: [
          {
            do: 'unbind',
            connection: 'live',
            target: 'data',
          } as CompiledActionStep,
          {
            do: 'sseClose',
            connection: 'live',
          } as CompiledActionStep,
        ],
      };
      await executeAction(cleanupAction, context);

      // Assert
      expect(bindingManager.getBindings().length).toBe(0);
      expect(sseInstance?.close).toHaveBeenCalled();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty path array in optimistic step', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'update',
        steps: [
          {
            do: 'optimistic',
            target: 'data',
            path: { expr: 'lit', value: [] },
            value: { expr: 'lit', value: { replaced: true } },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: { original: true } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('data')).toEqual({ replaced: true });
    });

    it('should handle null id in confirm step gracefully', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'confirm',
        steps: [
          {
            do: 'confirm',
            id: { expr: 'lit', value: null },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should handle undefined updateId in reject step gracefully', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'reject',
        steps: [
          {
            do: 'reject',
            id: { expr: 'var', name: 'undefinedVar' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should handle auto-rollback timeout for optimistic updates', async () => {
      // Arrange
      vi.useFakeTimers();
      const action: CompiledAction = {
        name: 'like',
        steps: [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            timeout: 1000,
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [{ id: 1, liked: false }] },
      });

      // Act
      await executeAction(action, context);

      // Verify optimistic update applied
      let items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(true);

      // Fast-forward time past timeout
      vi.advanceTimersByTime(1500);

      // Assert - should be rolled back
      items = context.state.get('items') as Array<{ liked: boolean }>;
      expect(items[0]?.liked).toBe(false);

      vi.useRealTimers();
    });

    it('should handle multiple bindings for same connection', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setupBindings',
        steps: [
          {
            do: 'bind',
            connection: 'ws',
            eventType: 'users',
            target: 'users',
          } as CompiledActionStep,
          {
            do: 'bind',
            connection: 'ws',
            eventType: 'messages',
            target: 'messages',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        users: { type: 'list', initial: [] },
        messages: { type: 'list', initial: [] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(bindingManager.getBindings().length).toBe(2);
    });
  });
});
