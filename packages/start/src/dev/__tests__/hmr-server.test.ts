/**
 * Test module for HMR (Hot Module Replacement) Server.
 *
 * Coverage:
 * - createHMRServer: Create a WebSocket server for HMR
 * - Server lifecycle: Start, send messages, close
 * - Client connections: Handle single and multiple clients
 * - Message broadcasting: 'connected', 'update', 'error' messages
 *
 * TDD Red Phase: These tests verify the HMR server functionality
 * that will be implemented to support live reloading in Constela Start.
 *
 * WebSocket Protocol:
 * - Server -> Client: 'connected' on connection
 * - Server -> Client: 'update' when file changes
 * - Server -> Client: 'error' when compilation fails
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import type { CompiledProgram } from '@constela/compiler';
import type { ConstelaError } from '@constela/core';

// Import the module under test (will fail until implemented)
import {
  createHMRServer,
  type HMRServer,
  type HMRMessage,
  type HMRConnectedMessage,
  type HMRUpdateMessage,
  type HMRErrorMessage,
} from '../hmr-server.js';

// ==================== Test Helpers ====================

/**
 * Wait for a WebSocket message with timeout
 */
function waitForMessage<T = HMRMessage>(
  ws: WebSocket,
  timeoutMs: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for message'));
    }, timeoutMs);

    ws.once('message', (data) => {
      clearTimeout(timeout);
      try {
        const message = JSON.parse(data.toString()) as T;
        resolve(message);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Wait for WebSocket to open with timeout
 */
function waitForOpen(ws: WebSocket, timeoutMs: number = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for connection'));
    }, timeoutMs);

    ws.once('open', () => {
      clearTimeout(timeout);
      resolve();
    });

    ws.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Create a mock CompiledProgram for testing
 */
function createMockCompiledProgram(overrides: Partial<CompiledProgram> = {}): CompiledProgram {
  return {
    view: [],
    state: {},
    actions: {},
    ...overrides,
  };
}

/**
 * Create a mock ConstelaError for testing
 */
function createMockConstelaError(
  message: string = 'Test error',
  code: string = 'SCHEMA_INVALID'
): ConstelaError {
  // ConstelaError is a class, so we create an instance-like object
  return {
    name: 'ConstelaError',
    message,
    code,
    path: '/test',
    severity: 'error',
    suggestion: undefined,
    expected: undefined,
    actual: undefined,
    context: undefined,
    toJSON: () => ({
      code,
      message,
      path: '/test',
      severity: 'error',
      suggestion: undefined,
      expected: undefined,
      actual: undefined,
      context: undefined,
    }),
  } as unknown as ConstelaError;
}

// ==================== Tests ====================

describe('createHMRServer()', () => {
  let server: HMRServer | null = null;
  let clients: WebSocket[] = [];

  beforeEach(() => {
    clients = [];
  });

  afterEach(async () => {
    // Close all test clients
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients = [];

    // Close server
    if (server) {
      await server.close();
      server = null;
    }
  });

  // ==================== Server Creation ====================

  describe('server creation', () => {
    it('should create a WebSocket server on the specified port', async () => {
      /**
       * Given: A port number
       * When: createHMRServer is called
       * Then: A WebSocket server should be created and listening on that port
       */
      // Arrange
      const port = 3001;

      // Act
      server = await createHMRServer({ port });

      // Assert
      expect(server).toBeDefined();
      expect(server.port).toBe(port);
    });

    it('should use a random available port when port is 0', async () => {
      /**
       * Given: Port set to 0
       * When: createHMRServer is called
       * Then: Server should use a random available port
       */
      // Arrange & Act
      server = await createHMRServer({ port: 0 });

      // Assert
      expect(server.port).toBeGreaterThan(0);
    });

    it('should be able to accept WebSocket connections', async () => {
      /**
       * Given: A running HMR server
       * When: A WebSocket client connects
       * Then: Connection should be established
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);

      // Act & Assert
      await expect(waitForOpen(client)).resolves.toBeUndefined();
      expect(client.readyState).toBe(WebSocket.OPEN);
    });
  });

  // ==================== Connected Message ====================

  describe('connected message', () => {
    it('should send "connected" message when client connects', async () => {
      /**
       * Given: A running HMR server
       * When: A WebSocket client connects
       * Then: Server should send { type: 'connected' } message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);

      // Act
      const message = await waitForMessage<HMRConnectedMessage>(client);

      // Assert
      expect(message.type).toBe('connected');
    });

    it('should send connected message to each new client', async () => {
      /**
       * Given: A running HMR server with one connected client
       * When: A second client connects
       * Then: Second client should also receive 'connected' message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1);
      await waitForMessage(client1); // Consume first connected message

      // Act
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client2);
      const message = await waitForMessage<HMRConnectedMessage>(client2);

      // Assert
      expect(message.type).toBe('connected');
    });
  });

  // ==================== Update Message Broadcasting ====================

  describe('update message broadcasting', () => {
    it('should broadcast "update" message to connected client', async () => {
      /**
       * Given: A running HMR server with a connected client
       * When: broadcastUpdate is called with file and program
       * Then: Client should receive { type: 'update', file, program } message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);
      await waitForMessage(client); // Consume connected message

      const testFile = '/src/pages/index.json';
      const testProgram = createMockCompiledProgram({
        view: [{ type: 'text', value: 'Hello' }],
      });

      // Act
      server.broadcastUpdate(testFile, testProgram);
      const message = await waitForMessage<HMRUpdateMessage>(client);

      // Assert
      expect(message.type).toBe('update');
      expect(message.file).toBe(testFile);
      expect(message.program).toBeDefined();
      expect(message.program.view).toEqual(testProgram.view);
    });

    it('should broadcast "update" message to all connected clients', async () => {
      /**
       * Given: A running HMR server with multiple connected clients
       * When: broadcastUpdate is called
       * Then: All clients should receive the update message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      const client3 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1, client2, client3);

      // Consume connected messages
      await Promise.all([
        waitForMessage(client1),
        waitForMessage(client2),
        waitForMessage(client3),
      ]);

      const testFile = '/src/pages/about.json';
      const testProgram = createMockCompiledProgram();

      // Act
      server.broadcastUpdate(testFile, testProgram);

      // Assert - all clients should receive update
      const [msg1, msg2, msg3] = await Promise.all([
        waitForMessage<HMRUpdateMessage>(client1),
        waitForMessage<HMRUpdateMessage>(client2),
        waitForMessage<HMRUpdateMessage>(client3),
      ]);

      expect(msg1.type).toBe('update');
      expect(msg2.type).toBe('update');
      expect(msg3.type).toBe('update');
      expect(msg1.file).toBe(testFile);
      expect(msg2.file).toBe(testFile);
      expect(msg3.file).toBe(testFile);
    });

    it('should not throw when broadcasting to no connected clients', async () => {
      /**
       * Given: A running HMR server with no connected clients
       * When: broadcastUpdate is called
       * Then: No error should be thrown
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      // Act & Assert - should not throw
      expect(() => {
        server!.broadcastUpdate('/test.json', createMockCompiledProgram());
      }).not.toThrow();
    });
  });

  // ==================== Error Message Broadcasting ====================

  describe('error message broadcasting', () => {
    it('should broadcast "error" message when compilation fails', async () => {
      /**
       * Given: A running HMR server with a connected client
       * When: broadcastError is called with file and errors
       * Then: Client should receive { type: 'error', file, errors } message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);
      await waitForMessage(client); // Consume connected message

      const testFile = '/src/pages/broken.json';
      const testErrors = [
        createMockConstelaError('Undefined state reference', 'UNDEFINED_STATE'),
      ];

      // Act
      server.broadcastError(testFile, testErrors);
      const message = await waitForMessage<HMRErrorMessage>(client);

      // Assert
      expect(message.type).toBe('error');
      expect(message.file).toBe(testFile);
      expect(message.errors).toBeDefined();
      expect(message.errors.length).toBe(1);
      expect(message.errors[0].message).toBe('Undefined state reference');
    });

    it('should broadcast multiple errors', async () => {
      /**
       * Given: A running HMR server with a connected client
       * When: broadcastError is called with multiple errors
       * Then: Client should receive all errors in the message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);
      await waitForMessage(client);

      const testFile = '/src/pages/multiple-errors.json';
      const testErrors = [
        createMockConstelaError('Error 1', 'UNDEFINED_STATE'),
        createMockConstelaError('Error 2', 'UNDEFINED_ACTION'),
        createMockConstelaError('Error 3', 'SCHEMA_INVALID'),
      ];

      // Act
      server.broadcastError(testFile, testErrors);
      const message = await waitForMessage<HMRErrorMessage>(client);

      // Assert
      expect(message.errors.length).toBe(3);
    });

    it('should broadcast "error" message to all connected clients', async () => {
      /**
       * Given: A running HMR server with multiple connected clients
       * When: broadcastError is called
       * Then: All clients should receive the error message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1, client2);

      await Promise.all([waitForMessage(client1), waitForMessage(client2)]);

      const testFile = '/src/pages/error.json';
      const testErrors = [createMockConstelaError('Test error')];

      // Act
      server.broadcastError(testFile, testErrors);

      // Assert
      const [msg1, msg2] = await Promise.all([
        waitForMessage<HMRErrorMessage>(client1),
        waitForMessage<HMRErrorMessage>(client2),
      ]);

      expect(msg1.type).toBe('error');
      expect(msg2.type).toBe('error');
    });
  });

  // ==================== Multiple Client Handling ====================

  describe('multiple client handling', () => {
    it('should track connected clients count', async () => {
      /**
       * Given: A running HMR server
       * When: Multiple clients connect
       * Then: connectedClients should reflect the count
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      // Assert initial state
      expect(server.connectedClients).toBe(0);

      // Act - connect first client
      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1);
      await waitForMessage(client1);

      // Assert
      expect(server.connectedClients).toBe(1);

      // Act - connect second client
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client2);
      await waitForMessage(client2);

      // Assert
      expect(server.connectedClients).toBe(2);
    });

    it('should handle client disconnection', async () => {
      /**
       * Given: A running HMR server with connected clients
       * When: A client disconnects
       * Then: connectedClients should decrease
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1, client2);

      await Promise.all([waitForMessage(client1), waitForMessage(client2)]);
      expect(server.connectedClients).toBe(2);

      // Act - disconnect one client
      client1.close();

      // Wait a bit for disconnect to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(server.connectedClients).toBe(1);
    });

    it('should continue broadcasting to remaining clients after one disconnects', async () => {
      /**
       * Given: A running HMR server with multiple clients, one disconnected
       * When: broadcastUpdate is called
       * Then: Remaining clients should receive the message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1, client2);

      await Promise.all([waitForMessage(client1), waitForMessage(client2)]);

      // Disconnect first client
      client1.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act
      server.broadcastUpdate('/test.json', createMockCompiledProgram());
      const message = await waitForMessage<HMRUpdateMessage>(client2);

      // Assert
      expect(message.type).toBe('update');
    });
  });

  // ==================== Server Shutdown ====================

  describe('server shutdown', () => {
    it('should close the server properly', async () => {
      /**
       * Given: A running HMR server
       * When: close() is called
       * Then: Server should stop accepting new connections
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const port = server.port;

      // Act
      await server.close();

      // Assert - trying to connect should fail
      const client = new WebSocket(`ws://localhost:${port}`);
      clients.push(client);

      await expect(
        waitForOpen(client, 500)
      ).rejects.toThrow();
    });

    it('should disconnect all connected clients on close', async () => {
      /**
       * Given: A running HMR server with connected clients
       * When: close() is called
       * Then: All clients should be disconnected
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      const client1 = new WebSocket(`ws://localhost:${server.port}`);
      const client2 = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client1, client2);

      await Promise.all([waitForMessage(client1), waitForMessage(client2)]);

      // Set up close listeners
      const closePromise1 = new Promise<void>((resolve) => {
        client1.on('close', () => resolve());
      });
      const closePromise2 = new Promise<void>((resolve) => {
        client2.on('close', () => resolve());
      });

      // Act
      await server.close();

      // Assert - clients should receive close event
      await expect(
        Promise.race([
          Promise.all([closePromise1, closePromise2]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 1000)
          ),
        ])
      ).resolves.toBeDefined();
    });

    it('should handle close when no clients are connected', async () => {
      /**
       * Given: A running HMR server with no clients
       * When: close() is called
       * Then: Server should close without error
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      // Act & Assert - should not throw
      await expect(server.close()).resolves.toBeUndefined();
    });

    it('should handle multiple close calls gracefully', async () => {
      /**
       * Given: A running HMR server
       * When: close() is called multiple times
       * Then: Should not throw error
       */
      // Arrange
      server = await createHMRServer({ port: 0 });

      // Act & Assert
      await server.close();
      await expect(server.close()).resolves.toBeUndefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle large programs in update messages', async () => {
      /**
       * Given: A running HMR server with a connected client
       * When: broadcastUpdate is called with a large program
       * Then: Client should receive the complete message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);
      await waitForMessage(client);

      // Create a large program with many view nodes
      const largeView = Array.from({ length: 1000 }, (_, i) => ({
        type: 'text' as const,
        value: `Node ${i}`,
      }));
      const largeProgram = createMockCompiledProgram({ view: largeView });

      // Act
      server.broadcastUpdate('/large.json', largeProgram);
      const message = await waitForMessage<HMRUpdateMessage>(client, 5000);

      // Assert
      expect(message.type).toBe('update');
      expect(message.program.view.length).toBe(1000);
    });

    it('should handle special characters in file paths', async () => {
      /**
       * Given: A running HMR server with a connected client
       * When: broadcastUpdate is called with a file path containing special characters
       * Then: Client should receive the correct file path
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);
      await waitForMessage(client);

      const specialPath = '/src/pages/[slug]/[...rest].json';

      // Act
      server.broadcastUpdate(specialPath, createMockCompiledProgram());
      const message = await waitForMessage<HMRUpdateMessage>(client);

      // Assert
      expect(message.file).toBe(specialPath);
    });

    it('should handle Unicode in error messages', async () => {
      /**
       * Given: A running HMR server with a connected client
       * When: broadcastError is called with Unicode characters
       * Then: Client should receive the correct error message
       */
      // Arrange
      server = await createHMRServer({ port: 0 });
      const client = new WebSocket(`ws://localhost:${server.port}`);
      clients.push(client);
      await waitForMessage(client);

      const unicodeMessage = 'エラー: 状態が未定義です';
      const testErrors = [createMockConstelaError(unicodeMessage)];

      // Act
      server.broadcastError('/test.json', testErrors);
      const message = await waitForMessage<HMRErrorMessage>(client);

      // Assert
      expect(message.errors[0].message).toBe(unicodeMessage);
    });
  });
});
