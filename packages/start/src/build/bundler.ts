/**
 * Runtime bundler module for Constela applications.
 *
 * Bundles @constela/runtime exports (hydrateApp, createApp) into a single
 * browser-ready ESM file using esbuild.
 */

import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of this module for resolving workspace packages
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Options for bundling the runtime.
 */
export interface BundleRuntimeOptions {
  /** Output directory where the bundled runtime will be written */
  outDir: string;
  /** Whether to minify the output (default: true) */
  minify?: boolean;
}

/**
 * Bundle the Constela runtime for browser usage.
 *
 * Creates a bundled ESM file at {outDir}/_constela/runtime.js that exports
 * hydrateApp and createApp from @constela/runtime.
 *
 * @param options - Bundle options
 * @returns The relative path for HTML script reference (always "/_constela/runtime.js")
 * @throws Error if the output directory cannot be created or bundling fails
 */
export async function bundleRuntime(options: BundleRuntimeOptions): Promise<string> {
  // Virtual entry point that re-exports from @constela/runtime
  const entryContent = `
    export { hydrateApp, createApp } from '@constela/runtime';
  `;

  // Output path: {outDir}/_constela/runtime.js
  const outFile = join(options.outDir, '_constela', 'runtime.js');

  // Ensure output directory exists
  await mkdir(dirname(outFile), { recursive: true });

  // Bundle with esbuild
  // Use __dirname as resolveDir to ensure workspace packages can be resolved
  // even when build() is called from a different directory (e.g., in tests)
  try {
    await esbuild.build({
      stdin: {
        contents: entryContent,
        resolveDir: __dirname,
        loader: 'ts',
      },
      bundle: true,
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      outfile: outFile,
      minify: options.minify ?? true,
      treeShaking: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bundle runtime to ${outFile}: ${message}`);
  }

  // Return relative path for HTML reference
  return '/_constela/runtime.js';
}
