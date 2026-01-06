/**
 * Build command for @constela/cli
 *
 * Builds the application for production.
 *
 * Usage:
 *   constela build [options]
 *
 * Options:
 *   -o, --outDir <path>  Output directory (default: dist)
 */

import { build } from '@constela/start';

export interface BuildCommandOptions {
  outDir?: string;
}

/**
 * Execute the build command
 *
 * @param options - Command options
 */
export async function buildCommand(options: BuildCommandOptions): Promise<void> {
  const outDir = options.outDir ?? 'dist';

  try {
    console.log('Building for production...');

    const result = await build({ outDir });

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
