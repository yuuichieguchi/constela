/**
 * HMR (Hot Module Replacement) Server for Constela Start.
 *
 * Provides a WebSocket server that broadcasts file changes and compilation errors
 * to connected clients for live reloading during development.
 *
 * WebSocket Protocol:
 * - Server -> Client: 'connected' on connection
 * - Server -> Client: 'update' when file changes (with compiled program)
 * - Server -> Client: 'error' when compilation fails (with errors)
 */

import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { CompiledProgram } from '@constela/compiler';
import type { ConstelaError } from '@constela/core';

// ==================== Types ====================

/**
 * Message types for HMR protocol
 */
export interface HMRConnectedMessage {
  type: 'connected';
}

export interface HMRUpdateMessage {
  type: 'update';
  file: string;
  program: CompiledProgram;
}

export interface HMRErrorMessage {
  type: 'error';
  file: string;
  errors: ReturnType<ConstelaError['toJSON']>[];
}

export type HMRMessage = HMRConnectedMessage | HMRUpdateMessage | HMRErrorMessage;

/**
 * HMR Server interface
 */
export interface HMRServer {
  /** The port number the server is listening on */
  port: number;
  /** Number of currently connected clients */
  connectedClients: number;
  /** Broadcast an update message to all connected clients */
  broadcastUpdate(file: string, program: CompiledProgram): void;
  /** Broadcast an error message to all connected clients */
  broadcastError(file: string, errors: ConstelaError[]): void;
  /** Close the server and disconnect all clients */
  close(): Promise<void>;
}

/**
 * Options for creating an HMR server
 */
export interface HMRServerOptions {
  /** Port to listen on (use 0 for random available port) */
  port: number;
}

// ==================== Implementation ====================

/**
 * Creates an HMR WebSocket server.
 *
 * @param options - Server configuration options
 * @returns Promise resolving to HMRServer instance
 */
export function createHMRServer(options: HMRServerOptions): Promise<HMRServer> {
  return new Promise((resolve, reject) => {
    const { port } = options;

    // Create HTTP server for WebSocket to attach to
    const httpServer: Server = createServer();

    // Create WebSocket server attached to HTTP server
    const wss = new WebSocketServer({ server: httpServer });

    // Track connected clients
    const clients = new Set<WebSocket>();

    // Track if server has been closed
    let isClosed = false;

    // Handle new connections
    wss.on('connection', (ws) => {
      clients.add(ws);

      // Send connected message
      const connectedMessage: HMRConnectedMessage = { type: 'connected' };
      ws.send(JSON.stringify(connectedMessage));

      // Handle client disconnect
      ws.on('close', () => {
        clients.delete(ws);
      });

      // Handle errors
      ws.on('error', () => {
        clients.delete(ws);
      });
    });

    // Handle server error
    httpServer.on('error', (error) => {
      reject(error);
    });

    // Start listening
    httpServer.listen(port, () => {
      const address = httpServer.address() as AddressInfo;
      const actualPort = address.port;

      const server: HMRServer = {
        get port(): number {
          return actualPort;
        },

        get connectedClients(): number {
          return clients.size;
        },

        broadcastUpdate(file: string, program: CompiledProgram): void {
          if (clients.size === 0) {
            return;
          }

          const message: HMRUpdateMessage = {
            type: 'update',
            file,
            program,
          };
          const data = JSON.stringify(message);

          for (const client of clients) {
            if (client.readyState === client.OPEN) {
              client.send(data);
            }
          }
        },

        broadcastError(file: string, errors: ConstelaError[]): void {
          if (clients.size === 0) {
            return;
          }

          const message: HMRErrorMessage = {
            type: 'error',
            file,
            errors: errors.map((error) => error.toJSON()),
          };
          const data = JSON.stringify(message);

          for (const client of clients) {
            if (client.readyState === client.OPEN) {
              client.send(data);
            }
          }
        },

        close(): Promise<void> {
          return new Promise((resolveClose) => {
            // Prevent double-close
            if (isClosed) {
              resolveClose();
              return;
            }
            isClosed = true;

            // Close all client connections
            for (const client of clients) {
              client.close();
            }
            clients.clear();

            // Close WebSocket server
            wss.close(() => {
              // Close HTTP server
              httpServer.close(() => {
                resolveClose();
              });
            });
          });
        },
      };

      resolve(server);
    });
  });
}
