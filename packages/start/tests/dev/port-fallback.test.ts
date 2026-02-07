/**
 * Test module for dev server port auto-fallback feature.
 *
 * Coverage:
 * - Falls back to next port when requested port is in use
 * - Falls back across multiple occupied ports
 * - Throws when all fallback ports are exhausted (10 attempts max)
 * - Uses the requested port when it is available
 *
 * Strategy:
 * Uses raw `net.createServer()` to occupy ports, then verifies
 * that `createDevServer` picks the next available port automatically.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createServer as createTcpServer, type Server as TcpServer } from 'node:net';
import { createDevServer, type DevServer } from '../../src/dev/server.js';

// ==================== Helpers ====================

/**
 * Generate a random base port in a high range to avoid conflicts
 * with other services or parallel test runs.
 */
function randomBasePort(): number {
  return 50000 + Math.floor(Math.random() * 10000);
}

/**
 * Occupy a TCP port by binding a dummy server.
 * Returns the server so it can be closed during cleanup.
 */
function occupyPort(port: number, host = 'localhost'): Promise<TcpServer> {
  return new Promise((resolve, reject) => {
    const srv = createTcpServer();
    srv.on('error', reject);
    srv.listen(port, host, () => {
      resolve(srv);
    });
  });
}

/**
 * Close a TCP server, ignoring errors if already closed.
 */
function closeTcpServer(srv: TcpServer): Promise<void> {
  return new Promise((resolve) => {
    srv.close(() => resolve());
  });
}

// ==================== Tests ====================

describe('Dev Server port auto-fallback', () => {
  const blockers: TcpServer[] = [];
  let devServer: DevServer | null = null;

  afterEach(async () => {
    // Close dev server first (may fail if listen() never succeeded)
    if (devServer) {
      try {
        await devServer.close();
      } catch {
        // Server was never started — safe to ignore
      }
      devServer = null;
    }

    // Close all blocking TCP servers
    await Promise.all(blockers.map(closeTcpServer));
    blockers.length = 0;
  });

  // ==================== Happy Path ====================

  it('should use the requested port when it is available', async () => {
    /**
     * Given: A port that is NOT occupied
     * When: createDevServer is called with that port and listen() is invoked
     * Then: server.port should equal the requested port
     */
    // Arrange
    const port = randomBasePort();
    devServer = await createDevServer({
      port,
      routesDir: '/tmp/nonexistent-routes-dir-for-test',
    });

    // Act
    await devServer.listen();

    // Assert
    expect(devServer.port).toBe(port);
  });

  // ==================== Single Port Fallback ====================

  it('should fall back to the next port when the requested port is in use', async () => {
    /**
     * Given: Port N is occupied by a TCP server
     * When: createDevServer is called with port N and listen() is invoked
     * Then: server.port should be N+1 (the next available port)
     */
    // Arrange
    const basePort = randomBasePort();
    const blocker = await occupyPort(basePort);
    blockers.push(blocker);

    devServer = await createDevServer({
      port: basePort,
      routesDir: '/tmp/nonexistent-routes-dir-for-test',
    });

    // Act
    await devServer.listen();

    // Assert
    expect(devServer.port).toBe(basePort + 1);
  });

  // ==================== Multiple Port Fallback ====================

  it('should fall back across multiple occupied ports', async () => {
    /**
     * Given: Ports N and N+1 are both occupied
     * When: createDevServer is called with port N and listen() is invoked
     * Then: server.port should be N+2
     */
    // Arrange
    const basePort = randomBasePort();
    const blocker0 = await occupyPort(basePort);
    const blocker1 = await occupyPort(basePort + 1);
    blockers.push(blocker0, blocker1);

    devServer = await createDevServer({
      port: basePort,
      routesDir: '/tmp/nonexistent-routes-dir-for-test',
    });

    // Act
    await devServer.listen();

    // Assert
    expect(devServer.port).toBe(basePort + 2);
  });

  // ==================== Exhaustion ====================

  it('should throw when all 10 fallback ports are exhausted', async () => {
    /**
     * Given: Ports N through N+9 are all occupied (10 ports)
     * When: createDevServer is called with port N and listen() is invoked
     * Then: listen() should reject with an error
     */
    // Arrange
    const basePort = randomBasePort();

    for (let i = 0; i < 10; i++) {
      const blocker = await occupyPort(basePort + i);
      blockers.push(blocker);
    }

    devServer = await createDevServer({
      port: basePort,
      routesDir: '/tmp/nonexistent-routes-dir-for-test',
    });

    // Act & Assert
    await expect(devServer.listen()).rejects.toThrow();

    // Clean up: devServer failed to listen, so set to null to skip close() in afterEach
    devServer = null;
  });

  // ==================== Edge: Falls back to exactly port+9 ====================

  it('should succeed when only the last fallback port (N+9) is available', async () => {
    /**
     * Given: Ports N through N+8 are occupied (9 ports), but N+9 is free
     * When: createDevServer is called with port N and listen() is invoked
     * Then: server.port should be N+9 (the 10th attempt succeeds)
     */
    // Arrange
    const basePort = randomBasePort();

    for (let i = 0; i < 9; i++) {
      const blocker = await occupyPort(basePort + i);
      blockers.push(blocker);
    }

    devServer = await createDevServer({
      port: basePort,
      routesDir: '/tmp/nonexistent-routes-dir-for-test',
    });

    // Act
    await devServer.listen();

    // Assert
    expect(devServer.port).toBe(basePort + 9);
  });
});
