/**
 * WebSocket Connection Module - Interface Stubs for TDD
 *
 * This file provides the interface definitions and stub implementations
 * for WebSocket connection management in Constela runtime.
 *
 * TDD Red Phase: These stubs will fail tests until properly implemented.
 */

// ==================== Type Definitions ====================

/**
 * WebSocket connection interface for sending/receiving data
 */
export interface WebSocketConnection {
  /**
   * Send data through the WebSocket connection
   * Objects and arrays are JSON stringified
   * @param data - The data to send
   */
  send(data: unknown): void;

  /**
   * Close the WebSocket connection
   */
  close(): void;

  /**
   * Get the current connection state
   * @returns The connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed';
}

/**
 * Event handlers for WebSocket connection events
 */
export interface WebSocketHandlers {
  /** Called when connection is established */
  onOpen?: () => Promise<void> | void;
  /** Called when connection is closed */
  onClose?: (code: number, reason: string) => Promise<void> | void;
  /** Called when an error occurs */
  onError?: (error: Event) => Promise<void> | void;
  /** Called when a message is received (JSON parsed if possible) */
  onMessage?: (data: unknown) => Promise<void> | void;
}

/**
 * Connection manager for named WebSocket connections
 */
export interface ConnectionManager {
  /**
   * Create a new named WebSocket connection
   * If a connection with the same name exists, it will be closed first
   */
  create(name: string, url: string, handlers: WebSocketHandlers): void;

  /**
   * Get a connection by name
   * @returns The connection or undefined if not found
   */
  get(name: string): WebSocketConnection | undefined;

  /**
   * Send data to a named connection
   * @throws Error if connection not found
   */
  send(name: string, data: unknown): void;

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
 * Create a WebSocket connection with event handlers
 *
 * @param url - The WebSocket URL (e.g., "wss://api.example.com/ws")
 * @param handlers - Event handlers for connection lifecycle
 * @returns A WebSocketConnection interface for sending/closing
 */
export function createWebSocketConnection(
  url: string,
  handlers: WebSocketHandlers
): WebSocketConnection {
  const ws = new WebSocket(url);

  ws.onopen = () => {
    handlers.onOpen?.();
  };

  ws.onclose = (event: CloseEvent) => {
    handlers.onClose?.(event.code, event.reason);
  };

  ws.onerror = (event: Event) => {
    handlers.onError?.(event);
  };

  ws.onmessage = (event: MessageEvent) => {
    let data: unknown = event.data;
    // Try to parse JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // Keep as string if not valid JSON
      }
    }
    handlers.onMessage?.(data);
  };

  return {
    send(data: unknown): void {
      if (ws.readyState === WebSocket.OPEN) {
        let message: string;
        if (typeof data === 'string') {
          message = data;
        } else {
          message = JSON.stringify(data);
        }
        ws.send(message);
      }
    },

    close(): void {
      ws.close();
    },

    getState(): 'connecting' | 'open' | 'closing' | 'closed' {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return 'connecting';
        case WebSocket.OPEN:
          return 'open';
        case WebSocket.CLOSING:
          return 'closing';
        case WebSocket.CLOSED:
          return 'closed';
        default:
          return 'closed';
      }
    },
  };
}

/**
 * Create a connection manager for managing multiple named connections
 *
 * @returns A ConnectionManager interface
 */
export function createConnectionManager(): ConnectionManager {
  const connections = new Map<string, WebSocketConnection>();

  return {
    create(name: string, url: string, handlers: WebSocketHandlers): void {
      // Close existing connection with the same name if exists
      const existing = connections.get(name);
      if (existing) {
        existing.close();
      }

      const conn = createWebSocketConnection(url, handlers);
      connections.set(name, conn);
    },

    get(name: string): WebSocketConnection | undefined {
      return connections.get(name);
    },

    send(name: string, data: unknown): void {
      const conn = connections.get(name);
      if (!conn) {
        throw new Error(`Connection "${name}" not found`);
      }
      conn.send(data);
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
