/**
 * Build command for @constela/cli
 *
 * Builds the application for production.
 *
 * Usage:
 *   constela build [options]
 *
 * Options:
 *   -o, --outDir <path>       Output directory (default: dist)
 *   --routesDir <path>        Routes directory
 *   --publicDir <path>        Public directory
 *   --layoutsDir <path>       Layouts directory
 */

import { build, loadConfig, resolveConfig } from '@constela/start';

export interface BuildCommandOptions {
  outDir?: string;
  routesDir?: string;
  publicDir?: string;
  layoutsDir?: string;
}

/**
 * Execute the build command
 *
 * @param options - Command options
 */
export async function buildCommand(options: BuildCommandOptions): Promise<void> {
  try {
    console.log('Building for production...');

    // Load config from file and merge with CLI options
    const fileConfig = await loadConfig(process.cwd());
    const resolvedConfig = await resolveConfig(fileConfig, {
      outDir: options.outDir,
      routesDir: options.routesDir,
      publicDir: options.publicDir,
      layoutsDir: options.layoutsDir,
    });

    const result = await build({
      outDir: resolvedConfig.build?.outDir ?? options.outDir ?? 'dist',
      routesDir: resolvedConfig.routesDir,
      publicDir: resolvedConfig.publicDir,
      layoutsDir: resolvedConfig.layoutsDir,
      css: resolvedConfig.css,
    });

    console.log('Build completed: ' + result.outDir);
    if (result.routes.length > 0) {
      console.log('Routes: ' + result.routes.join(', '));
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error: Build failed - ' + error.message);
    process.exit(1);
  }
}
