/**
 * Dev command for @constela/cli
 *
 * Starts a development server with HMR support.
 *
 * Usage:
 *   constela dev [options]
 *
 * Options:
 *   -p, --port <number>       Port number (default: 3000)
 *   --host <string>           Host address
 *   --routesDir <path>        Routes directory
 *   --publicDir <path>        Public directory
 *   --layoutsDir <path>       Layouts directory
 */

import { createDevServer, loadConfig, resolveConfig } from '@constela/start';

export interface DevOptions {
  port?: string;
  host?: string;
  routesDir?: string;
  publicDir?: string;
  layoutsDir?: string;
}

/**
 * Execute the dev command
 *
 * @param options - Command options
 */
export async function devCommand(options: DevOptions): Promise<void> {
  const port = options.port ? parseInt(options.port, 10) : undefined;
  if (options.port !== undefined && Number.isNaN(port)) {
    console.error('Error: Invalid port number');
    process.exit(1);
  }

  try {
    // Load config from file and merge with CLI options
    const fileConfig = await loadConfig(process.cwd());
    const resolvedConfig = await resolveConfig(fileConfig, {
      port,
      host: options.host,
      routesDir: options.routesDir,
      publicDir: options.publicDir,
      layoutsDir: options.layoutsDir,
    });

    const serverPort = resolvedConfig.dev?.port ?? port ?? 3000;
    const serverHost = resolvedConfig.dev?.host ?? options.host ?? 'localhost';

    const server = await createDevServer({
      port: serverPort,
      host: serverHost,
      ...(resolvedConfig.routesDir && { routesDir: resolvedConfig.routesDir }),
      ...(resolvedConfig.publicDir && { publicDir: resolvedConfig.publicDir }),
      ...(resolvedConfig.layoutsDir && { layoutsDir: resolvedConfig.layoutsDir }),
      ...(resolvedConfig.css && { css: resolvedConfig.css }),
    });
    await server.listen();

    console.log(`Development server running at http://${serverHost}:${server.port}`);

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
