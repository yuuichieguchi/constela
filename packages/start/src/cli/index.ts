import { Command } from 'commander';
import { createDevServer } from '../dev/server.js';
import { build } from '../build/index.js';

// ==================== Handler Type Definitions ====================

type DevHandler = (options: { port: string; host?: string; css?: string }) => Promise<{ port: number }>;
type BuildHandler = (options: { outDir?: string }) => Promise<void>;
type StartHandler = (options: { port: string }) => Promise<{ port: number }>;

// ==================== Handler Storage ====================

let devHandler: DevHandler = async (options) => {
  const port = parseInt(options.port, 10);
  const host = options.host ?? 'localhost';
  const server = await createDevServer({
    port,
    host,
    ...(options.css ? { css: options.css } : {}),
  });
  await server.listen();
  console.log(`Development server running at http://${host}:${server.port}`);

  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.close();
    process.exit(0);
  });

  return { port: server.port };
};

let buildHandler: BuildHandler = async (options) => {
  console.log('Building for production...');
  await build(options.outDir ? { outDir: options.outDir } : {});
  console.log('Build complete');
};

let startHandler: StartHandler = async (options) => {
  const port = parseInt(options.port, 10);
  const server = await createDevServer({ port, host: '0.0.0.0' });
  await server.listen();
  console.log(`Production server running at http://0.0.0.0:${server.port}`);

  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.close();
    process.exit(0);
  });

  return { port: server.port };
};

// ==================== Handler Injection Functions ====================

/**
 * Set custom dev handler (for testing)
 */
export function setDevHandler(handler: DevHandler): void {
  devHandler = handler;
}

/**
 * Set custom build handler (for testing)
 */
export function setBuildHandler(handler: BuildHandler): void {
  buildHandler = handler;
}

/**
 * Set custom start handler (for testing)
 */
export function setStartHandler(handler: StartHandler): void {
  startHandler = handler;
}

// ==================== CLI Creation ====================

/**
 * Creates and configures the CLI program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('constela-start')
    .version('0.1.0')
    .description('Meta-framework for Constela applications');

  // Dev command - Start development server
  program
    .command('dev')
    .description('Start development server')
    .option('-p, --port <port>', 'Port number', '3000')
    .option('-h, --host <host>', 'Host address')
    .option('-c, --css <path>', 'CSS entry point for Vite processing')
    .action(async (options: { port: string; host?: string; css?: string }) => {
      await devHandler(options);
    });

  // Build command - Build for production
  program
    .command('build')
    .description('Build for production')
    .option('-o, --outDir <outDir>', 'Output directory')
    .action(async (options: { outDir?: string }) => {
      await buildHandler(options);
    });

  // Start command - Start production server
  program
    .command('start')
    .description('Start production server')
    .option('-p, --port <port>', 'Port number', '3000')
    .action(async (options: { port: string }) => {
      await startHandler(options);
    });

  return program;
}

// ==================== Entry Point ====================

/**
 * Main CLI entry point
 */
export function main(): void {
  const program = createCLI();
  program.parse();
}
