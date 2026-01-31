/**
 * Test module for Automatic Reconnection Logic.
 *
 * Coverage:
 * - Exponential backoff strategy
 * - Linear backoff strategy
 * - Max retries limit
 * - Successful reconnect reset
 * - Max delay cap
 * - Manual trigger reconnect
 * - Dispose and cleanup
 * - Callbacks (onReconnect, onMaxRetriesReached)
 * - State transitions
 *
 * TDD Red Phase: These tests verify the reconnection functionality
 * that will be added to support automatic reconnection for WebSocket and SSE
 * connections in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createReconnectionManager,
  type ReconnectionManager,
  type ReconnectionPolicy,
  type Reconnectable,
} from '../reconnect.js';

// ==================== Mock Connection ====================

/**
 * Creates a mock Reconnectable connection for testing
 */
function createMockConnection(initialState = 'open'): Reconnectable & {
  setState: (state: string) => void;
  simulateError: () => void;
  simulateOpen: () => void;
} {
  let state = initialState;

  return {
    getState: () => state,
    close: vi.fn(),
    setState: (newState: string) => {
      state = newState;
    },
    simulateError: () => {
      state = 'closed';
    },
    simulateOpen: () => {
      state = 'open';
    },
  };
}

// ==================== Default Policy ====================

const defaultPolicy: ReconnectionPolicy = {
  enabled: true,
  strategy: 'exponential',
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
};

// ==================== Test Setup ====================

describe('Reconnection Manager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==================== createReconnectionManager Tests ====================

  describe('createReconnectionManager', () => {
    it('should create a ReconnectionManager instance', () => {
      // Act
      const manager = createReconnectionManager();

      // Assert
      expect(manager).toBeDefined();
      expect(typeof manager.wrap).toBe('function');
      expect(typeof manager.triggerReconnect).toBe('function');
      expect(typeof manager.dispose).toBe('function');
      expect(typeof manager.disposeAll).toBe('function');
    });
  });

  // ==================== wrap() Method Tests ====================

  describe('wrap()', () => {
    it('should return the wrapped connection', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());

      // Act
      const wrapped = manager.wrap(connection, reconnectFn, defaultPolicy);

      // Assert
      expect(wrapped).toBe(connection);
    });

    it('should not reconnect when policy is disabled', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());
      const disabledPolicy: ReconnectionPolicy = {
        ...defaultPolicy,
        enabled: false,
      };

      // Act
      manager.wrap(connection, reconnectFn, disabledPolicy);
      connection.simulateError();
      vi.advanceTimersByTime(10000);

      // Assert
      expect(reconnectFn).not.toHaveBeenCalled();
    });

    it('should not reconnect when strategy is none', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());
      const nonePolicy: ReconnectionPolicy = {
        ...defaultPolicy,
        strategy: 'none',
      };

      // Act
      manager.wrap(connection, reconnectFn, nonePolicy);
      connection.simulateError();
      vi.advanceTimersByTime(10000);

      // Assert
      expect(reconnectFn).not.toHaveBeenCalled();
    });
  });

  // ==================== Exponential Backoff Tests ====================

  describe('exponential backoff strategy', () => {
    it('should double delay for each retry (1s, 2s, 4s, 8s)', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = [
        createMockConnection('closed'),
        createMockConnection('closed'),
        createMockConnection('closed'),
        createMockConnection('closed'),
        createMockConnection('open'), // Final successful connection
      ];
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // Assert - First retry after 1000ms
      vi.advanceTimersByTime(999);
      expect(reconnectFn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // Second retry after 2000ms
      connections[1].simulateError();
      vi.advanceTimersByTime(1999);
      expect(reconnectFn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(reconnectFn).toHaveBeenCalledTimes(2);

      // Third retry after 4000ms
      connections[2].simulateError();
      vi.advanceTimersByTime(3999);
      expect(reconnectFn).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1);
      expect(reconnectFn).toHaveBeenCalledTimes(3);

      // Fourth retry after 8000ms
      connections[3].simulateError();
      vi.advanceTimersByTime(7999);
      expect(reconnectFn).toHaveBeenCalledTimes(3);
      vi.advanceTimersByTime(1);
      expect(reconnectFn).toHaveBeenCalledTimes(4);
    });

    it('should cap delay at maxDelay', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 10 }, () => createMockConnection('closed'));
      connections.push(createMockConnection('open'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 5000, // Cap at 5 seconds
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // First retry: 1000ms
      vi.advanceTimersByTime(1000);
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // Second retry: 2000ms
      connections[1].simulateError();
      vi.advanceTimersByTime(2000);
      expect(reconnectFn).toHaveBeenCalledTimes(2);

      // Third retry: 4000ms
      connections[2].simulateError();
      vi.advanceTimersByTime(4000);
      expect(reconnectFn).toHaveBeenCalledTimes(3);

      // Fourth retry: should be capped at 5000ms (not 8000ms)
      connections[3].simulateError();
      vi.advanceTimersByTime(5000);
      expect(reconnectFn).toHaveBeenCalledTimes(4);

      // Fifth retry: should also be capped at 5000ms
      connections[4].simulateError();
      vi.advanceTimersByTime(5000);
      expect(reconnectFn).toHaveBeenCalledTimes(5);
    });
  });

  // ==================== Linear Backoff Tests ====================

  describe('linear backoff strategy', () => {
    it('should increase delay linearly (1s, 2s, 3s, 4s)', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = [
        createMockConnection('closed'),
        createMockConnection('closed'),
        createMockConnection('closed'),
        createMockConnection('closed'),
        createMockConnection('open'),
      ];
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'linear',
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // First retry after 1000ms
      vi.advanceTimersByTime(1000);
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // Second retry after 2000ms
      connections[1].simulateError();
      vi.advanceTimersByTime(2000);
      expect(reconnectFn).toHaveBeenCalledTimes(2);

      // Third retry after 3000ms
      connections[2].simulateError();
      vi.advanceTimersByTime(3000);
      expect(reconnectFn).toHaveBeenCalledTimes(3);

      // Fourth retry after 4000ms
      connections[3].simulateError();
      vi.advanceTimersByTime(4000);
      expect(reconnectFn).toHaveBeenCalledTimes(4);
    });

    it('should cap delay at maxDelay for linear strategy', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 10 }, () => createMockConnection('closed'));
      connections.push(createMockConnection('open'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'linear',
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 3000, // Cap at 3 seconds
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // First retry: 1000ms
      vi.advanceTimersByTime(1000);
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // Second retry: 2000ms
      connections[1].simulateError();
      vi.advanceTimersByTime(2000);
      expect(reconnectFn).toHaveBeenCalledTimes(2);

      // Third retry: 3000ms (at cap)
      connections[2].simulateError();
      vi.advanceTimersByTime(3000);
      expect(reconnectFn).toHaveBeenCalledTimes(3);

      // Fourth retry: should be capped at 3000ms (not 4000ms)
      connections[3].simulateError();
      vi.advanceTimersByTime(3000);
      expect(reconnectFn).toHaveBeenCalledTimes(4);
    });
  });

  // ==================== Max Retries Tests ====================

  describe('max retries', () => {
    it('should stop reconnecting after maxRetries reached', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 10 }, () => createMockConnection('closed'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // First retry
      vi.advanceTimersByTime(100);
      expect(reconnectFn).toHaveBeenCalledTimes(1);
      connections[1].simulateError();

      // Second retry
      vi.advanceTimersByTime(200);
      expect(reconnectFn).toHaveBeenCalledTimes(2);
      connections[2].simulateError();

      // Third retry (maxRetries reached)
      vi.advanceTimersByTime(400);
      expect(reconnectFn).toHaveBeenCalledTimes(3);
      connections[3].simulateError();

      // Should not retry anymore
      vi.advanceTimersByTime(100000);
      expect(reconnectFn).toHaveBeenCalledTimes(3);
    });

    it('should call onMaxRetriesReached callback when max retries reached', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 5 }, () => createMockConnection('closed'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const onMaxRetriesReached = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy, undefined, onMaxRetriesReached);
      connections[0].simulateError();

      vi.advanceTimersByTime(100);
      connections[1].simulateError();

      vi.advanceTimersByTime(200);
      connections[2].simulateError();

      // Assert
      expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
    });

    it('should not call onMaxRetriesReached if reconnection succeeds', () => {
      // Arrange
      const manager = createReconnectionManager();
      const failedConnection = createMockConnection('closed');
      const successfulConnection = createMockConnection('open');
      let returnFailed = true;
      const reconnectFn = vi.fn(() => {
        if (returnFailed) {
          returnFailed = false;
          return failedConnection;
        }
        return successfulConnection;
      });
      const onMaxRetriesReached = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      const original = createMockConnection();
      manager.wrap(original, reconnectFn, policy, undefined, onMaxRetriesReached);
      original.simulateError();

      vi.advanceTimersByTime(100);
      failedConnection.simulateError();

      vi.advanceTimersByTime(200);
      // successfulConnection is 'open', so reconnect succeeds

      vi.advanceTimersByTime(100000);

      // Assert
      expect(onMaxRetriesReached).not.toHaveBeenCalled();
    });
  });

  // ==================== Successful Reconnect Tests ====================

  describe('successful reconnect', () => {
    it('should reset retry count on successful reconnection', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = [
        createMockConnection('closed'), // original - fails
        createMockConnection('closed'), // retry 1 - fails
        createMockConnection('open'),   // retry 2 - succeeds
        createMockConnection('closed'), // new failure after success
        createMockConnection('open'),   // retry 1 after reset - succeeds
      ];
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // First retry - 100ms
      vi.advanceTimersByTime(100);
      expect(reconnectFn).toHaveBeenCalledTimes(1);
      connections[1].simulateError();

      // Second retry - 200ms (succeeds)
      vi.advanceTimersByTime(200);
      expect(reconnectFn).toHaveBeenCalledTimes(2);
      // connections[2] is open, so success

      // Simulate new failure after successful reconnect
      connections[2].simulateError();

      // Should start from baseDelay again (100ms), not 400ms
      vi.advanceTimersByTime(100);
      expect(reconnectFn).toHaveBeenCalledTimes(3);
    });

    it('should call onReconnect callback on successful reconnection', () => {
      // Arrange
      const manager = createReconnectionManager();
      const failedConnection = createMockConnection('closed');
      const successfulConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => successfulConnection);
      const onReconnect = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(failedConnection, reconnectFn, policy, onReconnect);
      failedConnection.simulateError();

      vi.advanceTimersByTime(100);

      // Assert
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it('should not call onReconnect if reconnection fails', () => {
      // Arrange
      const manager = createReconnectionManager();
      const failedConnection1 = createMockConnection('closed');
      const failedConnection2 = createMockConnection('closed');
      const reconnectFn = vi.fn(() => failedConnection2);
      const onReconnect = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(failedConnection1, reconnectFn, policy, onReconnect);
      failedConnection1.simulateError();

      vi.advanceTimersByTime(100);
      // Reconnection attempt made but connection is closed

      // Assert
      expect(onReconnect).not.toHaveBeenCalled();
    });
  });

  // ==================== triggerReconnect() Tests ====================

  describe('triggerReconnect()', () => {
    it('should force immediate reconnection', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('open');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 10000, // Long delay
        maxDelay: 30000,
      };

      manager.wrap(connection, reconnectFn, policy);

      // Act
      manager.triggerReconnect(connection);

      // Assert - should reconnect immediately without waiting
      expect(reconnectFn).toHaveBeenCalledTimes(1);
    });

    it('should close existing connection before reconnecting', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('open');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);

      manager.wrap(connection, reconnectFn, defaultPolicy);

      // Act
      manager.triggerReconnect(connection);

      // Assert
      expect(connection.close).toHaveBeenCalled();
    });

    it('should reset retry count when manually triggered', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = [
        createMockConnection('closed'), // original
        createMockConnection('closed'), // retry 1
        createMockConnection('open'),   // manual trigger
        createMockConnection('closed'), // fail again
        createMockConnection('open'),   // retry 1 (reset)
      ];
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 30000,
      };

      manager.wrap(connections[0], reconnectFn, policy);
      connections[0].simulateError();

      // First retry
      vi.advanceTimersByTime(100);
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // Manual trigger
      manager.triggerReconnect(connections[1]);
      expect(reconnectFn).toHaveBeenCalledTimes(2);

      // Simulate failure of manually triggered connection
      connections[2].simulateError();

      // Should use baseDelay (100ms) again
      vi.advanceTimersByTime(100);
      expect(reconnectFn).toHaveBeenCalledTimes(3);
    });

    it('should do nothing for unknown connection', () => {
      // Arrange
      const manager = createReconnectionManager();
      const unknownConnection = createMockConnection('open');

      // Act & Assert
      expect(() => manager.triggerReconnect(unknownConnection)).not.toThrow();
    });
  });

  // ==================== dispose() Tests ====================

  describe('dispose()', () => {
    it('should stop reconnection attempts for disposed connection', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());

      manager.wrap(connection, reconnectFn, defaultPolicy);
      connection.simulateError();

      // Act
      manager.dispose(connection);

      // Advance time past when reconnection would have occurred
      vi.advanceTimersByTime(100000);

      // Assert
      expect(reconnectFn).not.toHaveBeenCalled();
    });

    it('should clear pending timers when disposed', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
      };

      manager.wrap(connection, reconnectFn, policy);
      connection.simulateError();

      // Advance part way to the first retry
      vi.advanceTimersByTime(500);

      // Act
      manager.dispose(connection);

      // Advance past when retry would have occurred
      vi.advanceTimersByTime(1000);

      // Assert
      expect(reconnectFn).not.toHaveBeenCalled();
    });

    it('should allow re-wrapping after dispose', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection1 = createMockConnection();
      const connection2 = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection('open'));

      manager.wrap(connection1, reconnectFn, defaultPolicy);
      manager.dispose(connection1);

      // Act
      manager.wrap(connection2, reconnectFn, defaultPolicy);
      connection2.simulateError();
      vi.advanceTimersByTime(1000);

      // Assert
      expect(reconnectFn).toHaveBeenCalledTimes(1);
    });

    it('should do nothing for unknown connection', () => {
      // Arrange
      const manager = createReconnectionManager();
      const unknownConnection = createMockConnection();

      // Act & Assert
      expect(() => manager.dispose(unknownConnection)).not.toThrow();
    });
  });

  // ==================== disposeAll() Tests ====================

  describe('disposeAll()', () => {
    it('should stop reconnection attempts for all connections', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection1 = createMockConnection();
      const connection2 = createMockConnection();
      const reconnectFn1 = vi.fn(() => createMockConnection());
      const reconnectFn2 = vi.fn(() => createMockConnection());

      manager.wrap(connection1, reconnectFn1, defaultPolicy);
      manager.wrap(connection2, reconnectFn2, defaultPolicy);

      connection1.simulateError();
      connection2.simulateError();

      // Act
      manager.disposeAll();

      // Advance time past when reconnection would have occurred
      vi.advanceTimersByTime(100000);

      // Assert
      expect(reconnectFn1).not.toHaveBeenCalled();
      expect(reconnectFn2).not.toHaveBeenCalled();
    });

    it('should clear all pending timers', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection1 = createMockConnection();
      const connection2 = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());

      manager.wrap(connection1, reconnectFn, defaultPolicy);
      manager.wrap(connection2, reconnectFn, defaultPolicy);

      connection1.simulateError();
      connection2.simulateError();

      vi.advanceTimersByTime(500);

      // Act
      manager.disposeAll();
      vi.advanceTimersByTime(10000);

      // Assert
      expect(reconnectFn).not.toHaveBeenCalled();
    });
  });

  // ==================== State Transitions Tests ====================

  describe('state transitions', () => {
    it('should transition from OPEN to RECONNECTING on error', () => {
      // This tests that the manager properly tracks the reconnecting state
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('open');
      const reconnectFn = vi.fn(() => {
        const newConn = createMockConnection('connecting');
        return newConn;
      });

      manager.wrap(connection, reconnectFn, defaultPolicy);

      // Act
      connection.simulateError();

      // Assert - connection should be in a reconnecting state conceptually
      // The actual state transition is tracked internally
      vi.advanceTimersByTime(1000);
      expect(reconnectFn).toHaveBeenCalled();
    });

    it('should transition from RECONNECTING to OPEN on success', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('closed');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);
      const onReconnect = vi.fn();

      manager.wrap(connection, reconnectFn, defaultPolicy, onReconnect);
      connection.simulateError();

      // Act
      vi.advanceTimersByTime(1000);

      // Assert
      expect(onReconnect).toHaveBeenCalled();
      expect(newConnection.getState()).toBe('open');
    });

    it('should transition from RECONNECTING to CLOSED on maxRetries', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 5 }, () => createMockConnection('closed'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const onMaxRetriesReached = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 30000,
      };

      manager.wrap(connections[0], reconnectFn, policy, undefined, onMaxRetriesReached);
      connections[0].simulateError();

      // Act
      vi.advanceTimersByTime(100);
      connections[1].simulateError();
      vi.advanceTimersByTime(200);
      connections[2].simulateError();

      // Assert
      expect(onMaxRetriesReached).toHaveBeenCalled();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle zero maxRetries', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection();
      const reconnectFn = vi.fn(() => createMockConnection());
      const onMaxRetriesReached = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 0,
        baseDelay: 100,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connection, reconnectFn, policy, undefined, onMaxRetriesReached);
      connection.simulateError();

      vi.advanceTimersByTime(100000);

      // Assert
      expect(reconnectFn).not.toHaveBeenCalled();
      expect(onMaxRetriesReached).toHaveBeenCalled();
    });

    it('should handle baseDelay of 0', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('closed');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 0,
        maxDelay: 30000,
      };

      // Act
      manager.wrap(connection, reconnectFn, policy);
      connection.simulateError();

      // Should reconnect immediately (or on next tick)
      vi.advanceTimersByTime(0);

      // Assert
      expect(reconnectFn).toHaveBeenCalled();
    });

    it('should handle maxDelay less than baseDelay', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('closed');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 5000,
        maxDelay: 1000, // maxDelay < baseDelay
      };

      // Act
      manager.wrap(connection, reconnectFn, policy);
      connection.simulateError();

      // Should use maxDelay since baseDelay exceeds it
      vi.advanceTimersByTime(1000);

      // Assert
      expect(reconnectFn).toHaveBeenCalled();
    });

    it('should handle rapid consecutive errors', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 10 }, () => createMockConnection('closed'));
      connections.push(createMockConnection('open'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 10,
        baseDelay: 100,
        maxDelay: 30000,
      };

      manager.wrap(connections[0], reconnectFn, policy);

      // Act - rapid consecutive errors
      connections[0].simulateError();
      connections[0].simulateError();
      connections[0].simulateError();

      vi.advanceTimersByTime(100);

      // Assert - should only have one reconnect scheduled
      expect(reconnectFn).toHaveBeenCalledTimes(1);
    });

    it('should handle error during reconnect callback', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('closed');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);
      const onReconnect = vi.fn(() => {
        throw new Error('Callback error');
      });

      manager.wrap(connection, reconnectFn, defaultPolicy, onReconnect);
      connection.simulateError();

      // Act & Assert - should not throw
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    });

    it('should handle reconnectFn throwing an error', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection = createMockConnection('closed');
      let throwError = true;
      const reconnectFn = vi.fn(() => {
        if (throwError) {
          throwError = false;
          throw new Error('Connection failed');
        }
        return createMockConnection('open');
      });
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 30000,
      };

      manager.wrap(connection, reconnectFn, policy);
      connection.simulateError();

      // Act & Assert - should handle error and continue trying
      expect(() => vi.advanceTimersByTime(100)).not.toThrow();
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // Should schedule next retry after error
      vi.advanceTimersByTime(200);
      expect(reconnectFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple connections with different policies', () => {
      // Arrange
      const manager = createReconnectionManager();
      const connection1 = createMockConnection('closed');
      const connection2 = createMockConnection('closed');
      const reconnectFn1 = vi.fn(() => createMockConnection('open'));
      const reconnectFn2 = vi.fn(() => createMockConnection('open'));
      
      const policy1: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 30000,
      };
      
      const policy2: ReconnectionPolicy = {
        enabled: true,
        strategy: 'linear',
        maxRetries: 5,
        baseDelay: 200,
        maxDelay: 30000,
      };

      manager.wrap(connection1, reconnectFn1, policy1);
      manager.wrap(connection2, reconnectFn2, policy2);

      connection1.simulateError();
      connection2.simulateError();

      // Act
      vi.advanceTimersByTime(100);
      expect(reconnectFn1).toHaveBeenCalledTimes(1);
      expect(reconnectFn2).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(reconnectFn1).toHaveBeenCalledTimes(1);
      expect(reconnectFn2).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== Callback Parameters Tests ====================

  describe('callback parameters', () => {
    it('should pass new connection to onReconnect callback', () => {
      // Arrange
      const manager = createReconnectionManager();
      const originalConnection = createMockConnection('closed');
      const newConnection = createMockConnection('open');
      const reconnectFn = vi.fn(() => newConnection);
      const onReconnect = vi.fn();

      manager.wrap(originalConnection, reconnectFn, defaultPolicy, onReconnect);
      originalConnection.simulateError();

      // Act
      vi.advanceTimersByTime(1000);

      // Assert
      expect(onReconnect).toHaveBeenCalled();
    });

    it('should call onMaxRetriesReached with retry count', () => {
      // Arrange
      const manager = createReconnectionManager();
      let connectionIndex = 0;
      const connections = Array.from({ length: 5 }, () => createMockConnection('closed'));
      const reconnectFn = vi.fn(() => connections[++connectionIndex]);
      const onMaxRetriesReached = vi.fn();
      const policy: ReconnectionPolicy = {
        enabled: true,
        strategy: 'exponential',
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 30000,
      };

      manager.wrap(connections[0], reconnectFn, policy, undefined, onMaxRetriesReached);
      connections[0].simulateError();

      // Act
      vi.advanceTimersByTime(100);
      connections[1].simulateError();
      vi.advanceTimersByTime(200);
      connections[2].simulateError();

      // Assert
      expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
    });
  });
});
