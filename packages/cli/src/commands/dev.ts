/**
 * Dev command for @constela/cli
 *
 * Starts a development server with HMR support.
 *
 * Usage:
 *   constela dev [options]
 *
 * Options:
 *   -p, --port <number>  Port number (default: 3000)
 *   --host <string>      Host address
 */

import { createDevServer } from '@constela/start';

export interface DevOptions {
  port?: string;
  host?: string;
}

/**
 * Execute the dev command
 *
 * @param options - Command options
 */
export async function devCommand(options: DevOptions): Promise<void> {
  const port = options.port ? parseInt(options.port, 10) : 3000;
  if (Number.isNaN(port)) {
    console.error('Error: Invalid port number');
    process.exit(1);
  }
  const host = options.host ?? 'localhost';

  try {
    const server = await createDevServer({ port, host });
    await server.listen();

    console.log(`Development server running at http://${host}:${server.port}`);

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });
  } catch (err) {
    const error = err as Error;
    console.error(`Error: Failed to start development server - ${error.message}`);
    process.exit(1);
  }
}
