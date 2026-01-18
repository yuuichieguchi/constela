/**
 * Test module for HMR Client Runtime.
 *
 * Coverage:
 * - createHMRClient: Create a WebSocket client for HMR
 * - Connection lifecycle: connect, disconnect, reconnect
 * - Message handling: onUpdate, onError, onConnect, onDisconnect
 * - Connection state management
 *
 * TDD Red Phase: These tests verify the HMR client functionality
 * that will be implemented to support live reloading in the browser.
 *
 * WebSocket Protocol:
 * - Server -> Client: 'connected' on connection
 * - Server -> Client: 'update' when file changes (file: string, program: CompiledProgram)
 * - Server -> Client: 'error' when compilation fails (file: string, errors: unknown[])
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';

// Import the module under test (will fail until implemented)
import {
  createHMRClient,
  type HMRClient,
  type HMRClientOptions,
} from '../client.js';

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

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

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

// ==================== Tests ====================

describe('createHMRClient()', () => {
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
    vi.useRealTimers();
  });

  // ==================== Client Creation ====================

  describe('client creation', () => {
    it('should create a client with the specified URL', () => {
      /**
       * Given: HMR client options with a URL
       * When: createHMRClient is called
       * Then: A client should be created that can connect to that URL
       */
      // Arrange
      const url = 'ws://localhost:3001';
      const options: HMRClientOptions = {
        url,
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };

      // Act
      const client = createHMRClient(options);

      // Assert
      expect(client).toBeDefined();
      expect(typeof client.connect).toBe('function');
      expect(typeof client.disconnect).toBe('function');
      expect(typeof client.isConnected).toBe('function');
    });

    it('should not connect automatically on creation', () => {
      /**
       * Given: HMR client options
       * When: createHMRClient is called
       * Then: WebSocket should NOT be created until connect() is called
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };

      // Act
      createHMRClient(options);

      // Assert
      expect(globalThis.WebSocket).not.toHaveBeenCalled();
    });
  });

  // ==================== Connection ====================

  describe('connect()', () => {
    it('should create WebSocket connection when connect() is called', () => {
      /**
       * Given: An HMR client
       * When: connect() is called
       * Then: A WebSocket connection should be established
       */
      // Arrange
      const url = 'ws://localhost:3001';
      const options: HMRClientOptions = {
        url,
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act
      client.connect();

      // Assert
      expect(globalThis.WebSocket).toHaveBeenCalledWith(url);
      expect(mockWebSocketInstance?.url).toBe(url);
    });

    it('should call onConnect callback when connection is established', async () => {
      /**
       * Given: An HMR client with onConnect callback
       * When: WebSocket connection opens
       * Then: onConnect should be called
       */
      // Arrange
      const onConnect = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
        onConnect,
      };
      const client = createHMRClient(options);

      // Act
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Assert
      await vi.waitFor(() => {
        expect(onConnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should not create multiple connections if connect() is called multiple times', () => {
      /**
       * Given: An already connected HMR client
       * When: connect() is called again
       * Then: Should not create a new WebSocket connection
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act
      client.connect();
      mockWebSocketInstance?.simulateOpen();
      client.connect(); // Second call

      // Assert
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== Message Handling ====================

  describe('message handling', () => {
    it('should call onUpdate when receiving "update" message', async () => {
      /**
       * Given: A connected HMR client
       * When: Server sends { type: 'update', file, program }
       * Then: onUpdate should be called with file and program
       */
      // Arrange
      const onUpdate = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate,
        onError: vi.fn(),
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      const testFile = '/src/pages/index.json';
      const testProgram = createMockCompiledProgram({
        view: { kind: 'element', tag: 'div', children: [] },
      });

      // Act
      mockWebSocketInstance?.simulateMessage({
        type: 'update',
        file: testFile,
        program: testProgram,
      });

      // Assert
      await vi.waitFor(() => {
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(testFile, testProgram);
      });
    });

    it('should call onError when receiving "error" message', async () => {
      /**
       * Given: A connected HMR client
       * When: Server sends { type: 'error', file, errors }
       * Then: onError should be called with file and errors
       */
      // Arrange
      const onError = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError,
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      const testFile = '/src/pages/broken.json';
      const testErrors = [{ code: 'UNDEFINED_STATE', message: 'State not found' }];

      // Act
      mockWebSocketInstance?.simulateMessage({
        type: 'error',
        file: testFile,
        errors: testErrors,
      });

      // Assert
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(testFile, testErrors);
      });
    });

    it('should ignore "connected" message without calling callbacks', async () => {
      /**
       * Given: A connected HMR client
       * When: Server sends { type: 'connected' }
       * Then: onUpdate and onError should NOT be called
       */
      // Arrange
      const onUpdate = vi.fn();
      const onError = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate,
        onError,
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act
      mockWebSocketInstance?.simulateMessage({ type: 'connected' });

      // Wait a tick to ensure no callbacks are called
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(onUpdate).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      /**
       * Given: A connected HMR client
       * When: Server sends invalid JSON
       * Then: Should not throw and should not call callbacks
       */
      // Arrange
      const onUpdate = vi.fn();
      const onError = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate,
        onError,
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act - Send malformed JSON directly
      const event = new MessageEvent('message', { data: 'not valid json' });
      mockWebSocketInstance?.onmessage?.(event);

      // Wait a tick
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should not throw and callbacks should not be called
      expect(onUpdate).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  // ==================== Disconnection ====================

  describe('disconnect()', () => {
    it('should close the WebSocket connection', () => {
      /**
       * Given: A connected HMR client
       * When: disconnect() is called
       * Then: WebSocket.close() should be called
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act
      client.disconnect();

      // Assert
      expect(mockWebSocketInstance?.close).toHaveBeenCalled();
    });

    it('should call onDisconnect when connection is lost', async () => {
      /**
       * Given: A connected HMR client with onDisconnect callback
       * When: WebSocket connection closes
       * Then: onDisconnect should be called
       */
      // Arrange
      const onDisconnect = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
        onDisconnect,
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act
      mockWebSocketInstance?.simulateClose(1000, 'Normal closure');

      // Assert
      await vi.waitFor(() => {
        expect(onDisconnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should not throw if disconnect() is called when not connected', () => {
      /**
       * Given: An HMR client that is not connected
       * When: disconnect() is called
       * Then: Should not throw
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act & Assert
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  // ==================== Connection State ====================

  describe('isConnected()', () => {
    it('should return false when not connected', () => {
      /**
       * Given: An HMR client that has not connected
       * When: isConnected() is called
       * Then: Should return false
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act & Assert
      expect(client.isConnected()).toBe(false);
    });

    it('should return false when connecting (not yet open)', () => {
      /**
       * Given: An HMR client that is connecting
       * When: isConnected() is called before connection opens
       * Then: Should return false
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act
      client.connect();
      // Don't simulate open yet

      // Assert
      expect(client.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      /**
       * Given: An HMR client that is connected
       * When: isConnected() is called
       * Then: Should return true
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Assert
      expect(client.isConnected()).toBe(true);
    });

    it('should return false after disconnection', () => {
      /**
       * Given: An HMR client that was connected and then disconnected
       * When: isConnected() is called
       * Then: Should return false
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act
      client.connect();
      mockWebSocketInstance?.simulateOpen();
      mockWebSocketInstance?.simulateClose();

      // Assert
      expect(client.isConnected()).toBe(false);
    });
  });

  // ==================== Reconnection ====================

  describe('reconnection', () => {
    it('should attempt to reconnect on unexpected disconnect', async () => {
      /**
       * Given: A connected HMR client
       * When: Connection is lost unexpectedly
       * Then: Should attempt to reconnect after delay
       */
      // Arrange
      vi.useFakeTimers();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act - Simulate unexpected close
      mockWebSocketInstance?.simulateClose(1006, 'Connection lost');

      // Wait for reconnect delay (typically 1-3 seconds)
      vi.advanceTimersByTime(3000);

      // Assert
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should not attempt to reconnect after manual disconnect()', async () => {
      /**
       * Given: A connected HMR client
       * When: disconnect() is called manually
       * Then: Should NOT attempt to reconnect
       */
      // Arrange
      vi.useFakeTimers();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act - Manual disconnect
      client.disconnect();
      mockWebSocketInstance?.simulateClose(1000, 'Normal closure');

      // Wait for potential reconnect delay
      vi.advanceTimersByTime(5000);

      // Assert
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should call onConnect after successful reconnection', async () => {
      /**
       * Given: A connected HMR client that lost connection
       * When: Reconnection is successful
       * Then: onConnect should be called again
       */
      // Arrange
      vi.useFakeTimers();
      const onConnect = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
        onConnect,
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();
      expect(onConnect).toHaveBeenCalledTimes(1);

      // Act - Lose connection and reconnect
      const firstInstance = mockWebSocketInstance;
      firstInstance?.simulateClose(1006, 'Connection lost');
      vi.advanceTimersByTime(3000);

      // New connection is created
      mockWebSocketInstance?.simulateOpen();

      // Assert
      expect(onConnect).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle WebSocket error event', async () => {
      /**
       * Given: A connecting HMR client
       * When: WebSocket error occurs
       * Then: Should handle gracefully and attempt reconnect
       */
      // Arrange
      vi.useFakeTimers();
      const onDisconnect = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
        onDisconnect,
      };
      const client = createHMRClient(options);
      client.connect();

      // Act
      mockWebSocketInstance?.simulateError();
      mockWebSocketInstance?.simulateClose(1006, 'Error');

      // Wait for reconnect attempt
      vi.advanceTimersByTime(3000);

      // Assert - Should have attempted reconnect
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid connect/disconnect cycles', () => {
      /**
       * Given: An HMR client
       * When: connect() and disconnect() are called rapidly
       * Then: Should not throw and should maintain consistent state
       */
      // Arrange
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate: vi.fn(),
        onError: vi.fn(),
      };
      const client = createHMRClient(options);

      // Act & Assert - Should not throw
      expect(() => {
        client.connect();
        client.disconnect();
        client.connect();
        client.disconnect();
        client.connect();
      }).not.toThrow();
    });

    it('should continue working after receiving unknown message type', async () => {
      /**
       * Given: A connected HMR client
       * When: Server sends an unknown message type
       * Then: Should ignore and continue working
       */
      // Arrange
      const onUpdate = vi.fn();
      const options: HMRClientOptions = {
        url: 'ws://localhost:3001',
        onUpdate,
        onError: vi.fn(),
      };
      const client = createHMRClient(options);
      client.connect();
      mockWebSocketInstance?.simulateOpen();

      // Act - Send unknown type
      mockWebSocketInstance?.simulateMessage({ type: 'unknown-type', data: {} });

      // Then send valid update
      const testFile = '/src/test.json';
      const testProgram = createMockCompiledProgram();
      mockWebSocketInstance?.simulateMessage({
        type: 'update',
        file: testFile,
        program: testProgram,
      });

      // Assert
      await vi.waitFor(() => {
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(testFile, testProgram);
      });
    });
  });
});
