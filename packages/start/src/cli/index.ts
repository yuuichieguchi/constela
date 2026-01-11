import { Command } from 'commander';
import { createDevServer } from '../dev/server.js';
import { build } from '../build/index.js';
import { loadConfig, resolveConfig } from '../config/config-loader.js';

// ==================== Handler Type Definitions ====================

type DevHandler = (options: { port: string; host?: string | undefined; css?: string | undefined; layoutsDir?: string | undefined }) => Promise<{ port: number }>;
type BuildHandler = (options: {
  outDir?: string | undefined;
  css?: string | undefined;
  cssContent?: string[] | undefined;
  layoutsDir?: string | undefined
}) => Promise<void>;
type StartHandler = (options: {
  port: string;
  host?: string | undefined;
  css?: string | undefined;
  layoutsDir?: string | undefined
}) => Promise<{ port: number }>;

// ==================== Handler Storage ====================

let devHandler: DevHandler = async (options) => {
  const port = parseInt(options.port, 10);
  const host = options.host ?? 'localhost';
  const server = await createDevServer({
    port,
    host,
    ...(options.css ? { css: options.css } : {}),
    ...(options.layoutsDir ? { layoutsDir: options.layoutsDir } : {}),
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
  await build({
    outDir: options.outDir,
    layoutsDir: options.layoutsDir,
    css: options.css,
    cssContent: options.cssContent,
  });
  console.log('Build complete');
};

let startHandler: StartHandler = async (options) => {
  const port = parseInt(options.port, 10);
  const host = options.host ?? '0.0.0.0';

  const server = await createDevServer({
    port,
    host,
    ...(options.css ? { css: options.css } : {}),
    ...(options.layoutsDir ? { layoutsDir: options.layoutsDir } : {}),
  });
  await server.listen();
  console.log(`Production server running at http://${host}:${server.port}`);

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
    .option('-l, --layoutsDir <path>', 'Layouts directory for layout composition')
    .action(async (options: { port: string; host?: string; css?: string; layoutsDir?: string }) => {
      await devHandler(options);
    });

  // Build command - Build for production
  program
    .command('build')
    .description('Build for production')
    .option('-o, --outDir <outDir>', 'Output directory')
    .option('-c, --css <path>', 'CSS entry point for Vite processing')
    .option('--cssContent <paths>', 'Content paths for Tailwind CSS class scanning (comma-separated)')
    .option('-l, --layoutsDir <path>', 'Layouts directory for layout composition')
    .action(async (options: { outDir?: string; css?: string; cssContent?: string; layoutsDir?: string }) => {
      const fileConfig = await loadConfig(process.cwd());
      const resolved = await resolveConfig(fileConfig, {
        outDir: options.outDir,
        css: options.css,
        cssContent: options.cssContent,
        layoutsDir: options.layoutsDir,
      });

      const mergedOptions: {
        outDir?: string | undefined;
        css?: string | undefined;
        cssContent?: string[] | undefined;
        layoutsDir?: string | undefined;
      } = {};

      const outDirValue = options.outDir ?? resolved.build?.outDir;
      if (outDirValue !== undefined) mergedOptions.outDir = outDirValue;

      const cssValue = options.css ?? (typeof resolved.css === 'string' ? resolved.css : resolved.css?.[0]);
      if (cssValue !== undefined) mergedOptions.css = cssValue;

      const cssContentValue = resolved.cssContent;
      if (cssContentValue !== undefined) mergedOptions.cssContent = cssContentValue;

      const layoutsDirValue = options.layoutsDir ?? resolved.layoutsDir;
      if (layoutsDirValue !== undefined) mergedOptions.layoutsDir = layoutsDirValue;

      await buildHandler(mergedOptions);
    });

  // Start command - Start production server
  program
    .command('start')
    .description('Start production server')
    .option('-p, --port <port>', 'Port number', '3000')
    .option('-h, --host <host>', 'Host address')
    .option('-c, --css <path>', 'CSS entry point for Vite processing')
    .option('-l, --layoutsDir <path>', 'Layouts directory for layout composition')
    .action(async (options: { port: string; host?: string; css?: string; layoutsDir?: string }) => {
      const fileConfig = await loadConfig(process.cwd());
      const resolved = await resolveConfig(fileConfig, {
        port: options.port ? parseInt(options.port, 10) : undefined,
        host: options.host,
        css: options.css,
        layoutsDir: options.layoutsDir,
      });

      const mergedOptions: {
        port: string;
        host?: string | undefined;
        css?: string | undefined;
        layoutsDir?: string | undefined;
      } = {
        port: options.port ?? (resolved.dev?.port ? String(resolved.dev.port) : '3000'),
      };

      const hostValue = options.host ?? resolved.dev?.host;
      if (hostValue !== undefined) mergedOptions.host = hostValue;

      const cssValue = options.css ?? (typeof resolved.css === 'string' ? resolved.css : resolved.css?.[0]);
      if (cssValue !== undefined) mergedOptions.css = cssValue;

      const layoutsDirValue = options.layoutsDir ?? resolved.layoutsDir;
      if (layoutsDirValue !== undefined) mergedOptions.layoutsDir = layoutsDirValue;

      await startHandler(mergedOptions);
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
