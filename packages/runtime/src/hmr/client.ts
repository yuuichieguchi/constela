/**
 * HMR Client - WebSocket client for Hot Module Replacement
 *
 * This module provides a client-side WebSocket connection for receiving
 * HMR updates from the development server.
 *
 * WebSocket Protocol:
 * - Server -> Client: 'connected' on connection
 * - Server -> Client: 'update' when file changes (file: string, program: CompiledProgram)
 * - Server -> Client: 'error' when compilation fails (file: string, errors: unknown[])
 */

import type { CompiledProgram } from '@constela/compiler';

/**
 * Options for creating an HMR client
 */
export interface HMRClientOptions {
  /** WebSocket server URL (e.g., 'ws://localhost:3001') */
  url: string;
  /** Called when a file update is received */
  onUpdate: (file: string, program: CompiledProgram) => void;
  /** Called when a compilation error is received */
  onError: (file: string, errors: unknown[]) => void;
  /** Called when connection is established */
  onConnect?: () => void;
  /** Called when connection is lost */
  onDisconnect?: () => void;
  /** Initial reconnect delay in milliseconds (default: 1000) */
  initialReconnectDelay?: number;
  /** Maximum reconnect delay in milliseconds (default: 30000) */
  maxReconnectDelay?: number;
}

/**
 * HMR Client interface
 */
export interface HMRClient {
  /** Establish WebSocket connection */
  connect(): void;
  /** Close WebSocket connection */
  disconnect(): void;
  /** Check if currently connected */
  isConnected(): boolean;
}

/**
 * WebSocket message types received from the server
 */
interface HMRMessage {
  type: 'connected' | 'update' | 'error';
  file?: string;
  program?: CompiledProgram;
  errors?: unknown[];
}

/** Default initial reconnect delay in milliseconds */
const DEFAULT_INITIAL_RECONNECT_DELAY = 1000;

/** Default maximum reconnect delay in milliseconds */
const DEFAULT_MAX_RECONNECT_DELAY = 30000;

/**
 * Creates an HMR client for receiving hot updates from the development server.
 *
 * Features:
 * - WebSocket connection management
 * - JSON message parsing
 * - Auto-reconnect with exponential backoff
 * - Connection state tracking
 *
 * @param options - Client configuration options
 * @returns HMRClient interface for managing the connection
 */
export function createHMRClient(options: HMRClientOptions): HMRClient {
  const {
    url,
    onUpdate,
    onError,
    onConnect,
    onDisconnect,
    initialReconnectDelay = DEFAULT_INITIAL_RECONNECT_DELAY,
    maxReconnectDelay = DEFAULT_MAX_RECONNECT_DELAY,
  } = options;

  let ws: WebSocket | null = null;
  let isManualDisconnect = false;
  let reconnectDelay = initialReconnectDelay;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data as string) as HMRMessage;

      switch (message.type) {
        case 'connected':
          // Server acknowledged connection - nothing to do
          break;

        case 'update':
          if (message.file && message.program) {
            onUpdate(message.file, message.program);
          }
          break;

        case 'error':
          if (message.file && message.errors) {
            onError(message.file, message.errors);
          }
          break;

        default:
          // Unknown message type - ignore
          break;
      }
    } catch {
      // Malformed JSON - ignore
    }
  }

  /**
   * Handle WebSocket open event
   */
  function handleOpen(): void {
    // Reset reconnect delay on successful connection
    reconnectDelay = initialReconnectDelay;
    onConnect?.();
  }

  /**
   * Handle WebSocket close event
   */
  function handleClose(): void {
    onDisconnect?.();

    // Attempt reconnect if not manually disconnected
    if (!isManualDisconnect) {
      scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  function handleError(): void {
    // Error event is usually followed by close event
    // Let close handler deal with reconnection
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  function scheduleReconnect(): void {
    if (reconnectTimeoutId !== null) {
      return; // Already scheduled
    }

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      if (!isManualDisconnect) {
        // Clear the old ws reference before creating new connection
        ws = null;
        createConnection();
        // Increase delay for next attempt (exponential backoff)
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      }
    }, reconnectDelay);
  }

  /**
   * Create a new WebSocket connection
   */
  function createConnection(): void {
    ws = new WebSocket(url);
    ws.onopen = handleOpen;
    ws.onclose = handleClose;
    ws.onerror = handleError;
    ws.onmessage = handleMessage;
  }

  return {
    connect(): void {
      // Don't create multiple connections
      if (ws && ws.readyState === WebSocket.OPEN) {
        return;
      }

      // Reset manual disconnect flag
      isManualDisconnect = false;

      // Clear any pending reconnect
      if (reconnectTimeoutId !== null) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }

      createConnection();
    },

    disconnect(): void {
      // Set flag before closing to prevent reconnection
      isManualDisconnect = true;

      // Clear any pending reconnect
      if (reconnectTimeoutId !== null) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }

      if (ws) {
        ws.close();
        ws = null;
      }
    },

    isConnected(): boolean {
      return ws !== null && ws.readyState === WebSocket.OPEN;
    },
  };
}
