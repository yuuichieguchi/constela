/**
 * Reconnection Manager Module
 *
 * Provides automatic reconnection logic for WebSocket and SSE connections
 * with configurable backoff strategies (exponential, linear, or none).
 *
 * Features:
 * - Exponential backoff: delay = min(baseDelay * 2^attempt, maxDelay)
 * - Linear backoff: delay = min(baseDelay * (attempt + 1), maxDelay)
 * - Max retries limit with callback
 * - Retry count reset on successful reconnection
 * - Manual trigger reconnection
 * - Timer cleanup on dispose
 */

// ==================== Type Definitions ====================

/**
 * Reconnection policy configuration
 */
export interface ReconnectionPolicy {
  /** Whether automatic reconnection is enabled */
  enabled: boolean;
  /** Backoff strategy: 'exponential' doubles delay, 'linear' adds baseDelay, 'none' disables */
  strategy: 'exponential' | 'linear' | 'none';
  /** Maximum number of reconnection attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  baseDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
}

/**
 * Interface for reconnectable connections (WebSocket, SSE)
 */
export interface Reconnectable {
  /** Get current connection state */
  getState(): string;
  /** Close the connection */
  close(): void;
}

/**
 * Reconnection manager interface
 */
export interface ReconnectionManager {
  /**
   * Wrap a connection with automatic reconnection logic
   * @param connection - The connection to wrap
   * @param reconnectFn - Function that creates a new connection
   * @param policy - Reconnection policy configuration
   * @param onReconnect - Optional callback when reconnection succeeds
   * @param onMaxRetriesReached - Optional callback when max retries reached
   * @returns The wrapped connection
   */
  wrap<T extends Reconnectable>(
    connection: T,
    reconnectFn: () => T,
    policy: ReconnectionPolicy,
    onReconnect?: () => void,
    onMaxRetriesReached?: () => void
  ): T;

  /**
   * Manually trigger reconnection for a connection
   * @param connection - The connection to reconnect
   */
  triggerReconnect(connection: Reconnectable): void;

  /**
   * Stop reconnection attempts and cleanup for a specific connection
   * @param connection - The connection to dispose
   */
  dispose(connection: Reconnectable): void;

  /**
   * Stop all reconnection attempts and cleanup all connections
   */
  disposeAll(): void;
}

// ==================== Internal Types ====================

/**
 * Internal state for tracking a managed connection
 */
interface ManagedConnection<T extends Reconnectable = Reconnectable> {
  /** Current connection instance */
  connection: T;
  /** Function to create a new connection */
  reconnectFn: () => T;
  /** Reconnection policy */
  policy: ReconnectionPolicy;
  /** Callback on successful reconnection */
  onReconnect: (() => void) | undefined;
  /** Callback when max retries reached */
  onMaxRetriesReached: (() => void) | undefined;
  /** Current retry attempt count */
  retryCount: number;
  /** Pending reconnection timer */
  timerId: ReturnType<typeof setTimeout> | null;
  /** Whether reconnection is already scheduled */
  isReconnecting: boolean;
  /** Whether max retries callback has been called */
  maxRetriesReached: boolean;
}

// ==================== Helper Functions ====================

/**
 * Calculate delay based on strategy and attempt number
 */
function calculateDelay(
  strategy: ReconnectionPolicy['strategy'],
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  let delay: number;

  if (strategy === 'exponential') {
    // delay = baseDelay * 2^attempt
    delay = baseDelay * Math.pow(2, attempt);
  } else if (strategy === 'linear') {
    // delay = baseDelay * (attempt + 1)
    delay = baseDelay * (attempt + 1);
  } else {
    // 'none' strategy - no delay calculation needed
    return 0;
  }

  // Cap at maxDelay
  return Math.min(delay, maxDelay);
}

// ==================== Implementation ====================

/**
 * Create a reconnection manager that handles automatic reconnection
 * for WebSocket and SSE connections with configurable backoff strategies.
 */
export function createReconnectionManager(): ReconnectionManager {
  // Map to track all managed connections
  const managedConnections = new Map<Reconnectable, ManagedConnection>();

  /**
   * Check if reconnection should be attempted
   */
  function shouldReconnect(policy: ReconnectionPolicy): boolean {
    return policy.enabled && policy.strategy !== 'none';
  }

  /**
   * Clear pending timer for a managed connection
   */
  function clearTimer(managed: ManagedConnection): void {
    if (managed.timerId !== null) {
      clearTimeout(managed.timerId);
      managed.timerId = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  function scheduleReconnect(managed: ManagedConnection): void {
    // Check if already reconnecting to prevent duplicate schedules
    if (managed.isReconnecting) {
      return;
    }

    const { policy, retryCount } = managed;

    // Check if max retries reached
    if (retryCount >= policy.maxRetries) {
      managed.isReconnecting = false;
      // Only call callback once
      if (!managed.maxRetriesReached) {
        managed.maxRetriesReached = true;
        try {
          managed.onMaxRetriesReached?.();
        } catch {
          // Ignore callback errors
        }
      }
      return;
    }

    managed.isReconnecting = true;

    // Calculate delay for this attempt
    const delay = calculateDelay(
      policy.strategy,
      retryCount,
      policy.baseDelay,
      policy.maxDelay
    );

    // Schedule reconnection
    managed.timerId = setTimeout(() => {
      managed.timerId = null;
      managed.isReconnecting = false;
      attemptReconnect(managed);
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  function attemptReconnect(managed: ManagedConnection): void {
    // Remove old connection from map
    managedConnections.delete(managed.connection);

    let newConnection: Reconnectable;
    try {
      // Call reconnect function to get new connection
      newConnection = managed.reconnectFn();
    } catch {
      // reconnectFn threw an error, treat as failed attempt
      managed.retryCount++;
      // Re-add to map with current connection
      managedConnections.set(managed.connection, managed);
      // Schedule next retry
      scheduleReconnect(managed);
      return;
    }

    // Increment retry count
    managed.retryCount++;

    // Update managed state with new connection
    managed.connection = newConnection;

    // Add new connection to map
    managedConnections.set(newConnection, managed);

    // Set up monitoring for the new connection
    if (shouldReconnect(managed.policy)) {
      monitorConnection(newConnection, () => {
        handleConnectionError(managed);
      });
    }

    // Check if reconnection was successful
    if (newConnection.getState() === 'open') {
      // Reset retry count and max retries flag on success
      managed.retryCount = 0;
      managed.maxRetriesReached = false;
      // Call success callback
      try {
        managed.onReconnect?.();
      } catch {
        // Ignore callback errors
      }
    } else {
      // Connection not open, schedule another retry
      scheduleReconnect(managed);
    }
  }

  /**
   * Handle connection state change (error/close)
   */
  function handleConnectionError(managed: ManagedConnection): void {
    if (!shouldReconnect(managed.policy)) {
      return;
    }
    scheduleReconnect(managed);
  }

  /**
   * Wrap all methods on the connection to detect state changes
   * and trigger reconnection when state becomes 'closed'
   */
  function monitorConnection<T extends Reconnectable>(
    connection: T,
    onError: () => void
  ): void {
    // Store original getState
    const originalGetState = connection.getState.bind(connection);

    /**
     * Check if current state is closed and trigger reconnection
     * This is called after any method that might change state
     */
    function checkForError(): void {
      const currentState = originalGetState();
      if (currentState === 'closed') {
        onError();
      }
    }

    // Wrap all enumerable methods on the connection object
    const proto = Object.getPrototypeOf(connection);
    const allKeys = new Set([
      ...Object.keys(connection),
      ...(proto ? Object.keys(proto) : []),
    ]);

    for (const key of allKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(connection, key) ||
                         Object.getOwnPropertyDescriptor(proto, key);

      if (descriptor && typeof descriptor.value === 'function' && key !== 'getState' && key !== 'close') {
        const originalMethod = (connection as Record<string, unknown>)[key] as (...args: unknown[]) => unknown;
        (connection as Record<string, unknown>)[key] = function (...args: unknown[]) {
          const result = originalMethod.apply(connection, args);
          checkForError();
          return result;
        };
      }
    }
  }

  return {
    wrap<T extends Reconnectable>(
      connection: T,
      reconnectFn: () => T,
      policy: ReconnectionPolicy,
      onReconnect?: () => void,
      onMaxRetriesReached?: () => void
    ): T {
      // Create managed connection state
      const managed: ManagedConnection<T> = {
        connection,
        reconnectFn,
        policy,
        onReconnect,
        onMaxRetriesReached,
        retryCount: 0,
        timerId: null,
        isReconnecting: false,
        maxRetriesReached: false,
      };

      // Store in map
      managedConnections.set(connection, managed);

      // Set up state monitoring if reconnection is enabled
      if (shouldReconnect(policy)) {
        monitorConnection(connection, () => {
          handleConnectionError(managed);
        });
      }

      return connection;
    },

    triggerReconnect(connection: Reconnectable): void {
      const managed = managedConnections.get(connection);
      if (!managed) {
        return;
      }

      // Clear any pending timer
      clearTimer(managed);
      managed.isReconnecting = false;

      // Reset retry count and max retries flag for manual trigger
      managed.retryCount = 0;
      managed.maxRetriesReached = false;

      // Close existing connection
      connection.close();

      // Immediately attempt reconnection
      attemptReconnect(managed);
    },

    dispose(connection: Reconnectable): void {
      const managed = managedConnections.get(connection);
      if (!managed) {
        return;
      }

      // Clear timer
      clearTimer(managed);

      // Remove from map
      managedConnections.delete(connection);
    },

    disposeAll(): void {
      // Clear all timers and remove all connections
      for (const managed of managedConnections.values()) {
        clearTimer(managed);
      }
      managedConnections.clear();
    },
  };
}
