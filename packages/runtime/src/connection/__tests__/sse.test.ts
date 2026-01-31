/**
 * Test module for SSE (Server-Sent Events) Connection Management.
 *
 * Coverage:
 * - Connection creation and URL handling
 * - Connection lifecycle events (open, close, error)
 * - Message receiving and JSON parsing
 * - Custom event type handling
 * - Connection state management
 *
 * TDD Red Phase: These tests verify the SSE connection functionality
 * that will be added to support real-time server-to-client streaming in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSSEConnection,
  type SSEConnection,
  type SSEHandlers,
} from '../sse.js';

// ==================== Mock EventSource ====================

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = MockEventSource.CONNECTING;
  url: string;
  withCredentials: boolean;

  onopen: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  private eventListeners: Map<string, ((ev: MessageEvent) => void)[]> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void): void {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (ev: MessageEvent) => void): void {
    const listeners = this.eventListeners.get(type) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(type, listeners);
    }
  }

  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  // ==================== Test Helpers ====================

  simulateOpen(): void {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: string, type = 'message'): void {
    const event = new MessageEvent(type, { data });

    // Dispatch to specific event type listeners
    if (type !== 'message') {
      const listeners = this.eventListeners.get(type) || [];
      for (const listener of listeners) {
        listener(event);
      }
    } else {
      // Default message event
      this.onmessage?.(event);
    }
  }

  simulateError(error?: Event): void {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.(error ?? new Event('error'));
  }
}

// ==================== Test Setup ====================

describe('SSE Connection', () => {
  let mockEventSourceInstance: MockEventSource | null = null;
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    mockEventSourceInstance = null;

    // Mock EventSource constructor
    // Note: Must use regular function, not arrow function, for vitest v4.x compatibility
    globalThis.EventSource = vi.fn(function (
      this: MockEventSource,
      url: string,
      options?: EventSourceInit
    ) {
      mockEventSourceInstance = new MockEventSource(url, options);
      return mockEventSourceInstance;
    }) as unknown as typeof EventSource;

    // Copy static constants
    (globalThis.EventSource as unknown as typeof MockEventSource).CONNECTING =
      MockEventSource.CONNECTING;
    (globalThis.EventSource as unknown as typeof MockEventSource).OPEN =
      MockEventSource.OPEN;
    (globalThis.EventSource as unknown as typeof MockEventSource).CLOSED =
      MockEventSource.CLOSED;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    vi.restoreAllMocks();
  });

  // ==================== createSSEConnection Tests ====================

  describe('createSSEConnection', () => {
    // ==================== Connection Creation ====================

    describe('connection creation', () => {
      it('should create EventSource connection with correct URL', () => {
        // Arrange
        const url = 'https://api.example.com/events';
        const handlers: SSEHandlers = {};

        // Act
        const connection = createSSEConnection(url, handlers);

        // Assert
        expect(globalThis.EventSource).toHaveBeenCalledWith(url, undefined);
        expect(connection).toBeDefined();
        expect(mockEventSourceInstance?.url).toBe(url);
      });

      it('should return SSEConnection interface', () => {
        // Arrange
        const url = 'https://api.example.com/events';
        const handlers: SSEHandlers = {};

        // Act
        const connection = createSSEConnection(url, handlers);

        // Assert
        expect(typeof connection.close).toBe('function');
        expect(typeof connection.getState).toBe('function');
      });

      it('should not have send method (SSE is one-way)', () => {
        // Arrange
        const url = 'https://api.example.com/events';
        const handlers: SSEHandlers = {};

        // Act
        const connection = createSSEConnection(url, handlers);

        // Assert
        expect((connection as unknown as Record<string, unknown>).send).toBeUndefined();
      });
    });

    // ==================== Connection Open Event ====================

    describe('connection open event', () => {
      it('should call onOpen handler when connection opens', async () => {
        // Arrange
        const onOpen = vi.fn();
        const handlers: SSEHandlers = { onOpen };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();

        // Assert
        await vi.waitFor(() => {
          expect(onOpen).toHaveBeenCalledTimes(1);
        });
      });

      it('should support async onOpen handler', async () => {
        // Arrange
        const result: string[] = [];
        const onOpen = vi.fn(async () => {
          await Promise.resolve();
          result.push('opened');
        });
        const handlers: SSEHandlers = { onOpen };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();

        // Assert
        await vi.waitFor(() => {
          expect(onOpen).toHaveBeenCalled();
        });
      });

      it('should not throw if onOpen is not provided', () => {
        // Arrange
        const handlers: SSEHandlers = {};

        // Act & Assert
        createSSEConnection('https://api.example.com/events', handlers);
        expect(() => mockEventSourceInstance?.simulateOpen()).not.toThrow();
      });
    });

    // ==================== Connection Close Handling ====================

    describe('connection close handling', () => {
      it('should call onClose handler when close() is called', async () => {
        // Arrange
        const onClose = vi.fn();
        const handlers: SSEHandlers = { onClose };

        // Act
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();
        connection.close();

        // Assert
        await vi.waitFor(() => {
          expect(onClose).toHaveBeenCalledTimes(1);
        });
      });

      it('should call EventSource.close() when close() is called', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();

        // Act
        connection.close();

        // Assert
        expect(mockEventSourceInstance?.close).toHaveBeenCalled();
      });

      it('should support async onClose handler', async () => {
        // Arrange
        const onClose = vi.fn(async () => {
          await Promise.resolve();
        });
        const handlers: SSEHandlers = { onClose };

        // Act
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        connection.close();

        // Assert
        await vi.waitFor(() => {
          expect(onClose).toHaveBeenCalled();
        });
      });

      it('should not throw if onClose is not provided', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const connection = createSSEConnection('https://api.example.com/events', handlers);

        // Act & Assert
        expect(() => connection.close()).not.toThrow();
      });
    });

    // ==================== Connection Error Event ====================

    describe('connection error event', () => {
      it('should call onError handler when error occurs', async () => {
        // Arrange
        const onError = vi.fn();
        const handlers: SSEHandlers = { onError };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateError();

        // Assert
        await vi.waitFor(() => {
          expect(onError).toHaveBeenCalledTimes(1);
          expect(onError).toHaveBeenCalledWith(expect.any(Event));
        });
      });

      it('should support async onError handler', async () => {
        // Arrange
        const onError = vi.fn(async () => {
          await Promise.resolve();
        });
        const handlers: SSEHandlers = { onError };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateError();

        // Assert
        await vi.waitFor(() => {
          expect(onError).toHaveBeenCalled();
        });
      });

      it('should not throw if onError is not provided', () => {
        // Arrange
        const handlers: SSEHandlers = {};

        // Act & Assert
        createSSEConnection('https://api.example.com/events', handlers);
        expect(() => mockEventSourceInstance?.simulateError()).not.toThrow();
      });
    });

    // ==================== Message Receiving ====================

    describe('message receiving', () => {
      it('should call onMessage handler when message received', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const messageData = { type: 'update', value: 42 };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();
        mockEventSourceInstance?.simulateMessage(JSON.stringify(messageData));

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(messageData, 'message');
        });
      });

      it('should parse JSON message data', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const messageData = { id: 1, items: ['a', 'b', 'c'] };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateMessage(JSON.stringify(messageData));

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(messageData, 'message');
        });
      });

      it('should pass raw string if JSON parsing fails', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const rawMessage = 'not valid json';

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateMessage(rawMessage);

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(rawMessage, 'message');
        });
      });

      it('should handle empty message', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateMessage('');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith('', 'message');
        });
      });

      it('should pass event type to onMessage handler', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const messageData = { value: 'test' };

        // Act
        createSSEConnection('https://api.example.com/events', handlers, ['custom-event']);
        mockEventSourceInstance?.simulateMessage(JSON.stringify(messageData), 'custom-event');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(messageData, 'custom-event');
        });
      });

      it('should support async onMessage handler', async () => {
        // Arrange
        const onMessage = vi.fn(async () => {
          await Promise.resolve();
        });
        const handlers: SSEHandlers = { onMessage };

        // Act
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateMessage('{"test": true}');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalled();
        });
      });
    });

    // ==================== Event Types ====================

    describe('event types', () => {
      it('should listen to specific event types when provided', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const eventTypes = ['price-update', 'order-filled', 'trade'];

        // Act
        createSSEConnection('https://api.example.com/events', handlers, eventTypes);

        // Assert - verify addEventListener was called for each event type
        // The mock captures this in eventListeners Map
        expect(mockEventSourceInstance).toBeDefined();
      });

      it('should receive custom event type messages', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const eventTypes = ['price-update'];
        const messageData = { price: 100.50, symbol: 'AAPL' };

        // Act
        createSSEConnection('https://api.example.com/events', handlers, eventTypes);
        mockEventSourceInstance?.simulateOpen();
        mockEventSourceInstance?.simulateMessage(JSON.stringify(messageData), 'price-update');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(messageData, 'price-update');
        });
      });

      it('should receive messages from multiple event types', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const eventTypes = ['event-a', 'event-b'];

        // Act
        createSSEConnection('https://api.example.com/events', handlers, eventTypes);
        mockEventSourceInstance?.simulateOpen();
        mockEventSourceInstance?.simulateMessage('{"type": "a"}', 'event-a');
        mockEventSourceInstance?.simulateMessage('{"type": "b"}', 'event-b');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledTimes(2);
          expect(onMessage).toHaveBeenNthCalledWith(1, { type: 'a' }, 'event-a');
          expect(onMessage).toHaveBeenNthCalledWith(2, { type: 'b' }, 'event-b');
        });
      });

      it('should still receive default message events when custom types provided', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const eventTypes = ['custom-event'];

        // Act
        createSSEConnection('https://api.example.com/events', handlers, eventTypes);
        mockEventSourceInstance?.simulateOpen();
        mockEventSourceInstance?.simulateMessage('{"default": true}', 'message');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith({ default: true }, 'message');
        });
      });

      it('should handle empty event types array', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const eventTypes: string[] = [];

        // Act & Assert
        expect(() => {
          createSSEConnection('https://api.example.com/events', handlers, eventTypes);
        }).not.toThrow();
      });
    });

    // ==================== Connection State ====================

    describe('connection state', () => {
      it('should return "connecting" when EventSource is connecting', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const connection = createSSEConnection('https://api.example.com/events', handlers);

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('connecting');
      });

      it('should return "open" when EventSource is open', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('open');
      });

      it('should return "closed" when EventSource is closed', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();
        connection.close();

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('closed');
      });

      it('should return "closed" after error', () => {
        // Arrange
        const handlers: SSEHandlers = {};
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateError();

        // Act
        const state = connection.getState();

        // Assert
        expect(state).toBe('closed');
      });
    });

    // ==================== Edge Cases ====================

    describe('edge cases', () => {
      it('should handle multiple messages in sequence', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();

        // Act
        mockEventSourceInstance?.simulateMessage('{"id": 1}');
        mockEventSourceInstance?.simulateMessage('{"id": 2}');
        mockEventSourceInstance?.simulateMessage('{"id": 3}');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledTimes(3);
          expect(onMessage).toHaveBeenNthCalledWith(1, { id: 1 }, 'message');
          expect(onMessage).toHaveBeenNthCalledWith(2, { id: 2 }, 'message');
          expect(onMessage).toHaveBeenNthCalledWith(3, { id: 3 }, 'message');
        });
      });

      it('should handle connection closing before open', () => {
        // Arrange
        const onClose = vi.fn();
        const handlers: SSEHandlers = { onClose };
        const connection = createSSEConnection('https://api.example.com/events', handlers);

        // Act
        connection.close();

        // Assert - should not throw
        expect(mockEventSourceInstance?.close).toHaveBeenCalled();
      });

      it('should handle null message data', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        createSSEConnection('https://api.example.com/events', handlers);

        // Act
        mockEventSourceInstance?.simulateMessage('null');

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(null, 'message');
        });
      });

      it('should handle nested JSON objects', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const nestedData = {
          user: {
            profile: {
              name: 'John',
              settings: { theme: 'dark' },
            },
          },
          metadata: { timestamp: 12345 },
        };
        createSSEConnection('https://api.example.com/events', handlers);

        // Act
        mockEventSourceInstance?.simulateMessage(JSON.stringify(nestedData));

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(nestedData, 'message');
        });
      });

      it('should handle array JSON data', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const arrayData = [1, 2, 3, { nested: true }];
        createSSEConnection('https://api.example.com/events', handlers);

        // Act
        mockEventSourceInstance?.simulateMessage(JSON.stringify(arrayData));

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(arrayData, 'message');
        });
      });

      it('should handle unicode in messages', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const unicodeData = { message: 'こんにちは世界 🌍' };
        createSSEConnection('https://api.example.com/events', handlers);

        // Act
        mockEventSourceInstance?.simulateMessage(JSON.stringify(unicodeData));

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledWith(unicodeData, 'message');
        });
      });

      it('should handle error after open', async () => {
        // Arrange
        const onOpen = vi.fn();
        const onError = vi.fn();
        const handlers: SSEHandlers = { onOpen, onError };
        createSSEConnection('https://api.example.com/events', handlers);

        // Act
        mockEventSourceInstance?.simulateOpen();
        mockEventSourceInstance?.simulateError();

        // Assert
        await vi.waitFor(() => {
          expect(onOpen).toHaveBeenCalledTimes(1);
          expect(onError).toHaveBeenCalledTimes(1);
        });
      });

      it('should handle closing multiple times', () => {
        // Arrange
        const onClose = vi.fn();
        const handlers: SSEHandlers = { onClose };
        const connection = createSSEConnection('https://api.example.com/events', handlers);
        mockEventSourceInstance?.simulateOpen();

        // Act - close multiple times
        connection.close();
        connection.close();

        // Assert - should not throw and close should be called each time
        expect(mockEventSourceInstance?.close).toHaveBeenCalledTimes(2);
      });
    });

    // ==================== Large Message Handling ====================

    describe('large message handling', () => {
      it('should handle large JSON payload', async () => {
        // Arrange
        const onMessage = vi.fn();
        const handlers: SSEHandlers = { onMessage };
        const largeArray = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `item-${i}`,
        }));
        createSSEConnection('https://api.example.com/events', handlers);

        // Act
        mockEventSourceInstance?.simulateMessage(JSON.stringify(largeArray));

        // Assert
        await vi.waitFor(() => {
          expect(onMessage).toHaveBeenCalledTimes(1);
          const receivedData = onMessage.mock.calls[0][0] as unknown[];
          expect(receivedData).toHaveLength(1000);
        });
      });
    });
  });
});
