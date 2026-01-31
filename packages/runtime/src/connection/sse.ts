/**
 * SSE (Server-Sent Events) Connection Module
 *
 * This file provides the interface definitions and implementations
 * for SSE connection management in Constela runtime.
 *
 * SSE is a one-way communication protocol from server to client,
 * making it ideal for real-time updates, notifications, and streaming data.
 */

// ==================== Type Definitions ====================

/**
 * SSE connection interface for managing server-sent events
 * Note: SSE is one-way (server to client), so there is no send method
 */
export interface SSEConnection {
  /**
   * Close the SSE connection
   */
  close(): void;

  /**
   * Get the current connection state
   * @returns The connection state
   */
  getState(): 'connecting' | 'open' | 'closed';
}

/**
 * Event handlers for SSE connection events
 */
export interface SSEHandlers {
  /** Called when connection is established */
  onOpen?: () => Promise<void> | void;
  /** Called when connection is closed */
  onClose?: () => Promise<void> | void;
  /** Called when an error occurs */
  onError?: (error: Event) => Promise<void> | void;
  /** Called when a message is received (JSON parsed if possible) */
  onMessage?: (data: unknown, eventType: string) => Promise<void> | void;
}

/**
 * SSE Connection manager for named connections
 */
export interface SSEConnectionManager {
  /**
   * Create a new named SSE connection
   * If a connection with the same name exists, it will be closed first
   */
  create(name: string, url: string, handlers: SSEHandlers, eventTypes?: string[]): void;

  /**
   * Get a connection by name
   * @returns The connection or undefined if not found
   */
  get(name: string): SSEConnection | undefined;

  /**
   * Close a named connection
   * No-op if connection not found
   */
  close(name: string): void;

  /**
   * Close all connections
   */
  closeAll(): void;
}

// ==================== Implementations ====================

/**
 * Parse message data, attempting JSON parse first
 * @param data - Raw message data string
 * @returns Parsed data or original string if JSON parsing fails
 */
function parseMessageData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    // Keep as string if not valid JSON
    return data;
  }
}

/**
 * Create an SSE connection with event handlers
 *
 * @param url - The SSE endpoint URL (e.g., "https://api.example.com/events")
 * @param handlers - Event handlers for connection lifecycle
 * @param eventTypes - Optional array of custom event types to listen for
 * @returns An SSEConnection interface for managing the connection
 */
export function createSSEConnection(
  url: string,
  handlers: SSEHandlers,
  eventTypes?: string[]
): SSEConnection {
  const eventSource = new EventSource(url, undefined);

  eventSource.onopen = () => {
    handlers.onOpen?.();
  };

  eventSource.onerror = (event: Event) => {
    handlers.onError?.(event);
  };

  // Default message handler
  eventSource.onmessage = (event: MessageEvent) => {
    const data = parseMessageData(event.data);
    handlers.onMessage?.(data, 'message');
  };

  // Register custom event type listeners
  if (eventTypes && eventTypes.length > 0) {
    for (const eventType of eventTypes) {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        const data = parseMessageData(event.data);
        handlers.onMessage?.(data, eventType);
      });
    }
  }

  return {
    close(): void {
      eventSource.close();
      handlers.onClose?.();
    },

    getState(): 'connecting' | 'open' | 'closed' {
      switch (eventSource.readyState) {
        case EventSource.CONNECTING:
          return 'connecting';
        case EventSource.OPEN:
          return 'open';
        case EventSource.CLOSED:
          return 'closed';
        default:
          return 'closed';
      }
    },
  };
}

/**
 * Create an SSE connection manager for managing multiple named connections
 *
 * @returns An SSEConnectionManager interface
 */
export function createSSEConnectionManager(): SSEConnectionManager {
  const connections = new Map<string, SSEConnection>();

  return {
    create(name: string, url: string, handlers: SSEHandlers, eventTypes?: string[]): void {
      // Close existing connection with the same name if exists
      const existing = connections.get(name);
      if (existing) {
        existing.close();
      }

      const conn = createSSEConnection(url, handlers, eventTypes);
      connections.set(name, conn);
    },

    get(name: string): SSEConnection | undefined {
      return connections.get(name);
    },

    close(name: string): void {
      const conn = connections.get(name);
      if (conn) {
        conn.close();
        connections.delete(name);
      }
    },

    closeAll(): void {
      for (const conn of connections.values()) {
        conn.close();
      }
      connections.clear();
    },
  };
}
