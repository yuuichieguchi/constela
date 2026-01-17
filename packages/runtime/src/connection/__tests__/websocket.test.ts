/**
 * Test module for WebSocket Connection Management.
 *
 * Coverage:
 * - Connection creation and URL handling
 * - Connection lifecycle events (open, close, error)
 * - Message sending and receiving
 * - Connection state management
 * - ConnectionManager for named connections
 *
 * TDD Red Phase: These tests verify the WebSocket connection functionality
 * that will be added to support real-time data updates in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createWebSocketConnection,
  createConnectionManager,
  type WebSocketConnection,
  type WebSocketHandlers,
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

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this.onmessage?.(event);
  }

  simulateRawMessage(data: string) {
    const event = new MessageEvent('message', { data });
    this.onmessage?.(event);
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// ==================== Test Setup ====================

describe('WebSocket Connection', () => {
  let mockWebSocketInstance: MockWebSocket | null = null;
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
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
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  // ==================== createWebSocketConnection Tests ====================

  describe('createWebSocketConnection', () => {
    // ==================== Connection Creation ====================

    describe('connection creation', () => {
      it('should create WebSocket connection with correct URL', () => {
        // Arrange
        const url = 'wss://api.example.com/ws';
        const handlers: WebSocketHandlers = {};

        // Act
        const connection = createWebSocketConnection(url, handlers);

        // Assert
        expect(globalThis.WebSocket).toHaveBeenCalledWith(url);
        expect(connection).toBeDefined();
        expect(mockWebSocketInstance?.url).toBe(url);
      });

      it('should return WebSocketConnection interface', () => {
        // Arrange
        const url = 'wss://api.example.com/ws';
        const handlers: WebSocketHandlers = {};

        // Act
        const connection = createWebSocketConnection(url, handlers);

        // Assert
        expect(typeof connection.send).toBe('function');
        expect(typeof connection.close).toBe('function');
        expect(typeof connection.getState).toBe('function');
      });
    });

    // ==================== Connection Open Event ====================

    describe('connection open event', () => {
      it('should call onOpen handler when connection opens', async () => {
        // Arrange
        const onOpen = vi.fn();
        const handlers: WebSocketHandlers = { onOpen };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Assert
        await vi.waitFor(() => {
          expect(onOpen).toHaveBeenCalledTimes(1);
        });
      });

      it('should not throw if onOpen is not provided', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};

        // Act & Assert
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        expect(() => mockWebSocketInstance?.simulateOpen()).not.toThrow();
      });
    });

    // ==================== Connection Close Event ====================

    describe('connection close event', () => {
      it('should call onClose handler when connection closes', async () => {
        // Arrange
        const onClose = vi.fn();
        const handlers: WebSocketHandlers = { onClose };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();
        mockWebSocketInstance?.simulateClose(1000, 'Normal closure');

        // Assert
        await vi.waitFor(() => {
          expect(onClose).toHaveBeenCalledWith(1000, 'Normal closure');
        });
      });

      it('should call onClose with default values when not provided', async () => {
        // Arrange
        const onClose = vi.fn();
        const handlers: WebSocketHandlers = { onClose };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateClose();

        // Assert
        await vi.waitFor(() => {
          expect(onClose).toHaveBeenCalledWith(1000, '');
        });
      });
    });

    // ==================== Connection Error Event ====================

    describe('connection error event', () => {
      it('should call onError handler when error occurs', async () => {
        // Arrange
        const onError = vi.fn();
        const handlers: WebSocketHandlers = { onError };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateError();

        // Assert
        await vi.waitFor(() => {
          expect(onError).toHaveBeenCalledTimes(1);
          expect(onError).toHaveBeenCalledWith(expect.any(Event));
        });
      });
    });

    // ==================== Message Receiving ====================

    describe('message receiving', () => {
      it('should call onMessage handler when message received', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: WebSocketHandlers = { onMessage };
        const messageData = { type: 'chat', text: 'Hello' };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();
        mockWebSocketInstance?.simulateMessage(messageData);

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(messageData);
        });
      });

      it('should parse JSON message data', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: WebSocketHandlers = { onMessage };
        const messageData = { id: 1, items: ['a', 'b'] };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateMessage(messageData);

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(messageData);
        });
      });

      it('should pass raw string if JSON parsing fails', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: WebSocketHandlers = { onMessage };
        const rawMessage = 'not valid json';

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateRawMessage(rawMessage);

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(rawMessage);
        });
      });

      it('should handle empty message', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: WebSocketHandlers = { onMessage };

        // Act
        createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateRawMessage('');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith('');
        });
      });
    });

    // ==================== Message Sending ====================

    describe('message sending', () => {
      it('should send string data as-is', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        connection.send('hello');

        // Assert
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('hello');
      });

      it('should JSON stringify object data', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();
        const data = { type: 'message', content: 'Hello' };

        // Act
        connection.send(data);

        // Assert
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(JSON.stringify(data));
      });

      it('should JSON stringify array data', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();
        const data = [1, 2, 3];

        // Act
        connection.send(data);

        // Assert
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(JSON.stringify(data));
      });

      it('should convert number to string', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        connection.send(42);

        // Assert
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('42');
      });

      it('should convert boolean to string', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        connection.send(true);

        // Assert
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith('true');
      });
    });

    // ==================== Connection Close ====================

    describe('connection close', () => {
      it('should call WebSocket.close()', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        connection.close();

        // Assert
        expect(mockWebSocketInstance?.close).toHaveBeenCalled();
      });
    });

    // ==================== Connection State ====================

    describe('connection state', () => {
      it('should return "connecting" when WebSocket is connecting', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('connecting');
      });

      it('should return "open" when WebSocket is open', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('open');
      });

      it('should return "closing" when WebSocket is closing', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();
        connection.close();

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('closing');
      });

      it('should return "closed" when WebSocket is closed', () => {
        // Arrange
        const handlers: WebSocketHandlers = {};
        const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();
        mockWebSocketInstance?.simulateClose();

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('closed');
      });
    });
  });

  // ==================== ConnectionManager Tests ====================

  describe('createConnectionManager', () => {
    // ==================== Manager Creation ====================

    describe('manager creation', () => {
      it('should create a ConnectionManager instance', () => {
        // Act
        const manager = createConnectionManager();

        // Assert
        expect(manager).toBeDefined();
        expect(typeof manager.create).toBe('function');
        expect(typeof manager.get).toBe('function');
        expect(typeof manager.send).toBe('function');
        expect(typeof manager.close).toBe('function');
        expect(typeof manager.closeAll).toBe('function');
      });
    });

    // ==================== Connection Management ====================

    describe('connection management', () => {
      it('should create and store named connection', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};

        // Act
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        const connection = manager.get('chat');

        // Assert
        expect(connection).toBeDefined();
      });

      it('should return undefined for non-existent connection', () => {
        // Arrange
        const manager = createConnectionManager();

        // Act
        const connection = manager.get('nonexistent');

        // Assert
        expect(connection).toBeUndefined();
      });

      it('should close existing connection when creating with same name', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};

        // Act
        manager.create('chat', 'wss://api.example.com/ws1', handlers);
        const firstInstance = mockWebSocketInstance;
        manager.create('chat', 'wss://api.example.com/ws2', handlers);

        // Assert
        expect(firstInstance?.close).toHaveBeenCalled();
      });
    });

    // ==================== Named Connection Operations ====================

    describe('named connection operations', () => {
      it('should send data to named connection', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        manager.send('chat', { type: 'message', text: 'Hello' });

        // Assert
        expect(mockWebSocketInstance?.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'message', text: 'Hello' })
        );
      });

      it('should throw error when sending to non-existent connection', () => {
        // Arrange
        const manager = createConnectionManager();

        // Act & Assert
        expect(() => manager.send('nonexistent', 'data')).toThrow(
          'Connection "nonexistent" not found'
        );
      });

      it('should close named connection', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Act
        manager.close('chat');

        // Assert
        expect(mockWebSocketInstance?.close).toHaveBeenCalled();
      });

      it('should not throw when closing non-existent connection', () => {
        // Arrange
        const manager = createConnectionManager();

        // Act & Assert
        expect(() => manager.close('nonexistent')).not.toThrow();
      });

      it('should remove connection from manager after close', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};
        manager.create('chat', 'wss://api.example.com/ws', handlers);

        // Act
        manager.close('chat');
        const connection = manager.get('chat');

        // Assert
        expect(connection).toBeUndefined();
      });
    });

    // ==================== Close All Connections ====================

    describe('closeAll', () => {
      it('should close all connections', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};

        manager.create('chat1', 'wss://api.example.com/ws1', handlers);
        const ws1 = mockWebSocketInstance;
        manager.create('chat2', 'wss://api.example.com/ws2', handlers);
        const ws2 = mockWebSocketInstance;

        // Act
        manager.closeAll();

        // Assert
        expect(ws1?.close).toHaveBeenCalled();
        expect(ws2?.close).toHaveBeenCalled();
      });

      it('should clear all connections from manager', () => {
        // Arrange
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = {};

        manager.create('chat1', 'wss://api.example.com/ws1', handlers);
        manager.create('chat2', 'wss://api.example.com/ws2', handlers);

        // Act
        manager.closeAll();

        // Assert
        expect(manager.get('chat1')).toBeUndefined();
        expect(manager.get('chat2')).toBeUndefined();
      });
    });

    // ==================== Event Handler Integration ====================

    describe('event handler integration', () => {
      it('should wire up onOpen handler for named connection', async () => {
        // Arrange
        const onOpen = vi.fn();
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = { onOpen };

        // Act
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateOpen();

        // Assert
        await vi.waitFor(() => {
          expect(onOpen).toHaveBeenCalledTimes(1);
        });
      });

      it('should wire up onMessage handler for named connection', async () => {
        // Arrange
        const onMessage = vi.fn();
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = { onMessage };

        // Act
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateMessage({ text: 'Hello' });

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith({ text: 'Hello' });
        });
      });

      it('should wire up onClose handler for named connection', async () => {
        // Arrange
        const onClose = vi.fn();
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = { onClose };

        // Act
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateClose(1001, 'Going away');

        // Assert
        await vi.waitFor(() => {
          expect(onClose).toHaveBeenCalledWith(1001, 'Going away');
        });
      });

      it('should wire up onError handler for named connection', async () => {
        // Arrange
        const onError = vi.fn();
        const manager = createConnectionManager();
        const handlers: WebSocketHandlers = { onError };

        // Act
        manager.create('chat', 'wss://api.example.com/ws', handlers);
        mockWebSocketInstance?.simulateError();

        // Assert
        await vi.waitFor(() => {
          expect(onError).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle multiple messages in sequence', async () => {
      // Arrange
      const onMessage = vi.fn();
      const handlers: WebSocketHandlers = { onMessage };
      createWebSocketConnection('wss://api.example.com/ws', handlers);
      mockWebSocketInstance?.simulateOpen();

      // Act
      mockWebSocketInstance?.simulateMessage({ id: 1 });
      mockWebSocketInstance?.simulateMessage({ id: 2 });
      mockWebSocketInstance?.simulateMessage({ id: 3 });

      // Assert
      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledTimes(3);
        expect(onMessage).toHaveBeenNthCalledWith(1, { id: 1 });
        expect(onMessage).toHaveBeenNthCalledWith(2, { id: 2 });
        expect(onMessage).toHaveBeenNthCalledWith(3, { id: 3 });
      });
    });

    it('should handle connection closing before open', () => {
      // Arrange
      const onClose = vi.fn();
      const handlers: WebSocketHandlers = { onClose };
      const connection = createWebSocketConnection('wss://api.example.com/ws', handlers);

      // Act
      connection.close();
      mockWebSocketInstance?.simulateClose(1006, 'Abnormal closure');

      // Assert - should not throw and should call onClose
      expect(onClose).toHaveBeenCalledWith(1006, 'Abnormal closure');
    });

    it('should handle null message data', async () => {
      // Arrange
      const onMessage = vi.fn();
      const handlers: WebSocketHandlers = { onMessage };
      createWebSocketConnection('wss://api.example.com/ws', handlers);

      // Act
      mockWebSocketInstance?.simulateRawMessage('null');

      // Assert
      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(null);
      });
    });
  });
});
