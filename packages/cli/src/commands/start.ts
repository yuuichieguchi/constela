/**
 * Start command for @constela/cli
 *
 * Starts a production server.
 *
 * Usage:
 *   constela start [options]
 *
 * Options:
 *   -p, --port <number>  Port number (default: 3000)
 */

import { createDevServer, hyperlink } from '@constela/start';

export interface StartOptions {
  port?: string;
}

/**
 * Execute the start command
 *
 * @param options - Command options
 */
export async function startCommand(options: StartOptions): Promise<void> {
  const port = options.port ? parseInt(options.port, 10) : 3000;
  if (Number.isNaN(port)) {
    console.error('Error: Invalid port number');
    process.exit(1);
  }

  try {
    const startTime = performance.now();

    // For now, use the same server as dev mode
    // In production, this would use a different, optimized server
    const server = await createDevServer({ port, host: '0.0.0.0' });
    await server.listen();

    const elapsed = Math.round(performance.now() - startTime);
    const url = `http://0.0.0.0:${server.port}`;
    console.log(`\nConstela Production Server\n- Local: ${hyperlink(url)}\n\nReady in ${elapsed}ms (Ctrl+Click to open)`);

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
    console.error(`Error: Failed to start production server - ${error.message}`);
    process.exit(1);
  }
}
