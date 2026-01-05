import { Command } from 'commander';

// ==================== Handler Type Definitions ====================

type DevHandler = (options: { port: string; host?: string }) => Promise<{ port: number }>;
type BuildHandler = (options: { outDir?: string }) => Promise<void>;
type StartHandler = (options: { port: string }) => Promise<{ port: number }>;

// ==================== Handler Storage ====================

let devHandler: DevHandler = async (options) => {
  console.log('Development server not yet implemented');
  return { port: Number(options.port) };
};

let buildHandler: BuildHandler = async () => {
  console.log('Build not yet implemented');
};

let startHandler: StartHandler = async (options) => {
  console.log('Production server not yet implemented');
  return { port: Number(options.port) };
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
    .action(async (options: { port: string; host?: string }) => {
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
