/**
 * Test module for WebSocket Action Step Executor.
 *
 * Coverage:
 * - Send step execution ({ do: 'send', connection, data })
 * - Close step execution ({ do: 'close', connection })
 * - Expression evaluation for data
 * - Integration with ConnectionManager
 *
 * TDD Red Phase: These tests verify the runtime execution of WebSocket action steps
 * that will be added to support real-time communication in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';
import {
  createConnectionManager,
  type ConnectionManager,
} from '../../connection/websocket.js';

// ==================== Mock WebSocket ====================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSING;
  });

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
  }
}

// ==================== Test Setup ====================

describe('executeAction with WebSocket Steps', () => {
  let mockWebSocketInstance: MockWebSocket | null = null;
  let originalWebSocket: typeof WebSocket;
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = globalThis.WebSocket;
    mockWebSocketInstance = null;

    // Mock WebSocket constructor
    globalThis.WebSocket = vi.fn((url: string) => {
      mockWebSocketInstance = new MockWebSocket(url);
      return mockWebSocketInstance;
    }) as unknown as typeof WebSocket;

    // Copy static constants
    (globalThis.WebSocket as unknown as typeof MockWebSocket).CONNECTING = MockWebSocket.CONNECTING;
    (globalThis.WebSocket as unknown as typeof MockWebSocket).OPEN = MockWebSocket.OPEN;
    (globalThis.WebSocket as unknown as typeof MockWebSocket).CLOSING = MockWebSocket.CLOSING;
    (globalThis.WebSocket as unknown as typeof MockWebSocket).CLOSED = MockWebSocket.CLOSED;

    // Create fresh connection manager for each test
    connectionManager = createConnectionManager();
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    connectionManager.closeAll();
    vi.restoreAllMocks();
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }>,
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {}
  ): ActionContext & { connections: ConnectionManager } {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
      connections: connectionManager,
    };
  }

  // ==================== Send Step ====================

  describe('send step', () => {
    it('should send data to named connection with literal value', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendMessage',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: 'Hello, World!' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('Hello, World!');
    });

    it('should send data from state', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendMessage',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'state', name: 'inputText' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        inputText: { type: 'string', initial: 'Message from state' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('Message from state');
    });

    it('should send JSON object data', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendMessage',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: { type: 'message', text: 'Hello' } },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'message', text: 'Hello' })
      );
    });

    it('should send data with computed expression', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendGreeting',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: 'Hello, ' },
              right: { expr: 'state', name: 'username' },
            },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        username: { type: 'string', initial: 'Alice' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('Hello, Alice');
    });

    it('should send data from locals (var expression)', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendFromLocal',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'var', name: 'messageData' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({}, {}, { messageData: { id: 1, text: 'Local message' } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(
        JSON.stringify({ id: 1, text: 'Local message' })
      );
    });

    it('should throw error when connection not found', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'sendMessage',
        steps: [
          {
            do: 'send',
            connection: 'nonexistent',
            data: { expr: 'lit', value: 'test' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).rejects.toThrow(
        'Connection "nonexistent" not found'
      );
    });
  });

  // ==================== Close Step ====================

  describe('close step', () => {
    it('should close named connection', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'disconnect',
        steps: [
          {
            do: 'close',
            connection: 'chat',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.close).toHaveBeenCalled();
    });

    it('should not throw when closing non-existent connection', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'disconnect',
        steps: [
          {
            do: 'close',
            connection: 'nonexistent',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should remove connection from manager after close', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'disconnect',
        steps: [
          {
            do: 'close',
            connection: 'chat',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(connectionManager.get('chat')).toBeUndefined();
    });
  });

  // ==================== Mixed Steps ====================

  describe('mixed WebSocket and other steps', () => {
    it('should execute send step with set steps', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendAndUpdate',
        steps: [
          { do: 'set', target: 'sending', value: { expr: 'lit', value: true } },
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'state', name: 'message' },
          } as CompiledActionStep,
          { do: 'set', target: 'sending', value: { expr: 'lit', value: false } },
          { do: 'set', target: 'message', value: { expr: 'lit', value: '' } },
        ],
      };
      const context = createContext({
        sending: { type: 'boolean', initial: false },
        message: { type: 'string', initial: 'Test message' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('Test message');
      expect(context.state.get('sending')).toBe(false);
      expect(context.state.get('message')).toBe('');
    });

    it('should execute close step after send', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendAndClose',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: 'Goodbye!' },
          } as CompiledActionStep,
          {
            do: 'close',
            connection: 'chat',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('Goodbye!');
      expect(mockWebSocketInstance?.close).toHaveBeenCalled();
    });
  });

  // ==================== Conditional Send ====================

  describe('conditional send', () => {
    it('should send only when condition is true', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'conditionalSend',
        steps: [
          {
            do: 'if',
            condition: { expr: 'state', name: 'isConnected' },
            then: [
              {
                do: 'send',
                connection: 'chat',
                data: { expr: 'lit', value: 'Connected message' },
              } as CompiledActionStep,
            ],
            else: [],
          },
        ],
      };
      const context = createContext({
        isConnected: { type: 'boolean', initial: true },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('Connected message');
    });

    it('should not send when condition is false', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'conditionalSend',
        steps: [
          {
            do: 'if',
            condition: { expr: 'state', name: 'isConnected' },
            then: [
              {
                do: 'send',
                connection: 'chat',
                data: { expr: 'lit', value: 'Connected message' },
              } as CompiledActionStep,
            ],
            else: [],
          },
        ],
      };
      const context = createContext({
        isConnected: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).not.toHaveBeenCalled();
    });
  });

  // ==================== Multiple Connections ====================

  describe('multiple connections', () => {
    it('should send to different connections', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://chat.example.com/ws', {});
      const chatWs = mockWebSocketInstance;
      chatWs?.simulateOpen();

      connectionManager.create('notifications', 'wss://notifications.example.com/ws', {});
      const notifWs = mockWebSocketInstance;
      notifWs?.simulateOpen();

      const action: CompiledAction = {
        name: 'broadcast',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: 'Chat message' },
          } as CompiledActionStep,
          {
            do: 'send',
            connection: 'notifications',
            data: { expr: 'lit', value: 'Notification' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(chatWs?.send).toHaveBeenCalledWith('Chat message');
      expect(notifWs?.send).toHaveBeenCalledWith('Notification');
    });

    it('should close specific connection while keeping others open', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://chat.example.com/ws', {});
      const chatWs = mockWebSocketInstance;
      chatWs?.simulateOpen();

      connectionManager.create('notifications', 'wss://notifications.example.com/ws', {});
      const notifWs = mockWebSocketInstance;
      notifWs?.simulateOpen();

      const action: CompiledAction = {
        name: 'closeChat',
        steps: [
          {
            do: 'close',
            connection: 'chat',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(chatWs?.close).toHaveBeenCalled();
      expect(notifWs?.close).not.toHaveBeenCalled();
      expect(connectionManager.get('chat')).toBeUndefined();
      expect(connectionManager.get('notifications')).toBeDefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty string data', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendEmpty',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: '' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('');
    });

    it('should handle null data', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendNull',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: null },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('null');
    });

    it('should handle array data', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendArray',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: [1, 2, 3] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(JSON.stringify([1, 2, 3]));
    });

    it('should handle numeric data', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendNumber',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: 42 },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('42');
    });

    it('should handle boolean data', async () => {
      // Arrange
      connectionManager.create('chat', 'wss://api.example.com/ws', {});
      mockWebSocketInstance?.simulateOpen();

      const action: CompiledAction = {
        name: 'sendBoolean',
        steps: [
          {
            do: 'send',
            connection: 'chat',
            data: { expr: 'lit', value: true },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('true');
    });
  });
});
