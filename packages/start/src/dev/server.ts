import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { DevServerOptions } from '../types.js';

// ==================== Types ====================

/**
 * Development server interface
 */
export interface DevServer {
  /** Start listening for connections */
  listen(): Promise<void>;
  /** Stop the server and close all connections */
  close(): Promise<void>;
  /** The port number the server is listening on */
  port: number;
}

// ==================== Constants ====================

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';

// ==================== DevServer Implementation ====================

/**
 * Creates a development server with HMR support.
 *
 * The server uses:
 * - Node.js http module for the base server
 * - Vite middleware mode for HMR (future enhancement)
 * - Hono for request handling (future enhancement)
 *
 * @param options - Server configuration options
 * @returns Promise that resolves to a DevServer instance
 */
export async function createDevServer(
  options: DevServerOptions = {}
): Promise<DevServer> {
  const {
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    routesDir: _routesDir = 'src/routes',
  } = options;

  let httpServer: Server | null = null;
  let actualPort = port;

  const devServer: DevServer = {
    get port(): number {
      return actualPort;
    },

    async listen(): Promise<void> {
      return new Promise((resolve, reject) => {
        httpServer = createServer((_req, res) => {
          // Basic placeholder response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body>Constela Dev Server</body></html>');
        });

        httpServer.on('error', (err) => {
          reject(err);
        });

        httpServer.listen(port, host, () => {
          // Get the actual port (important when port is 0)
          const address = httpServer?.address() as AddressInfo | null;
          if (address) {
            actualPort = address.port;
          }
          resolve();
        });
      });
    },

    async close(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!httpServer) {
          resolve();
          return;
        }

        httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            httpServer = null;
            resolve();
          }
        });
      });
    },
  };

  return devServer;
}
