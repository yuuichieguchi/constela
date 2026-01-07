import { createServer, type Server } from 'node:http';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { DevServerOptions } from '../types.js';
import { resolveStaticFile } from '../static/index.js';

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
const DEFAULT_PUBLIC_DIR = 'public';

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
    publicDir = join(process.cwd(), DEFAULT_PUBLIC_DIR),
  } = options;

  let httpServer: Server | null = null;
  let actualPort = port;

  const devServer: DevServer = {
    get port(): number {
      return actualPort;
    },

    async listen(): Promise<void> {
      return new Promise((resolve, reject) => {
        httpServer = createServer((req, res) => {
          // Parse URL pathname
          const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
          const pathname = url.pathname;

          // Try to serve static file
          const staticResult = resolveStaticFile(pathname, publicDir);

          // If security error detected (path_traversal or outside_public), return 403
          if (staticResult.error === 'path_traversal' || staticResult.error === 'outside_public') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }

          // If file exists, stream it
          if (staticResult.exists && staticResult.filePath && staticResult.mimeType) {
            res.writeHead(200, { 'Content-Type': staticResult.mimeType });
            const stream = createReadStream(staticResult.filePath);
            stream.pipe(res);
            stream.on('error', () => {
              // Only send error response if headers haven't been sent yet
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
              }
              res.end('Internal Server Error');
            });
            return;
          }

          // If file doesn't exist but static path was attempted, return 404
          if (staticResult.filePath && !staticResult.exists) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }

          // Basic placeholder response for non-static routes
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
