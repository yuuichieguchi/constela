/**
 * Runtime bundler module for Constela applications.
 *
 * Bundles @constela/runtime exports (hydrateApp, createApp) into a single
 * browser-ready ESM file using esbuild.
 */

import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname, isAbsolute } from 'node:path';
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

/**
 * Options for bundling CSS.
 */
export interface BundleCSSOptions {
  /** Output directory where the bundled CSS will be written */
  outDir: string;
  /** CSS entry point(s) - paths relative to process.cwd() */
  css: string | string[];
  /** Whether to minify the output (default: true) */
  minify?: boolean;
}

/**
 * Bundle CSS files for production.
 *
 * Creates a bundled CSS file at {outDir}/_constela/styles.css that combines
 * all input CSS files.
 *
 * @param options - Bundle options
 * @returns The relative path for HTML link reference (always "/_constela/styles.css")
 * @throws Error if the output directory cannot be created, CSS files don't exist, or bundling fails
 */
export async function bundleCSS(options: BundleCSSOptions): Promise<string> {
  const cssFiles = Array.isArray(options.css) ? options.css : [options.css];
  const outFile = join(options.outDir, '_constela', 'styles.css');

  // Ensure output directory exists
  await mkdir(dirname(outFile), { recursive: true });

  // Resolve CSS file paths (handle both absolute and relative paths)
  const resolvedCssFiles = cssFiles.map((f) => isAbsolute(f) ? f : join(process.cwd(), f));

  // Validate CSS files exist
  for (const fullPath of resolvedCssFiles) {
    if (!existsSync(fullPath)) {
      throw new Error(`CSS file not found: ${fullPath}`);
    }
  }

  // Bundle with esbuild
  // For multiple CSS files, create a virtual entry that imports all of them
  try {
    if (resolvedCssFiles.length === 1) {
      // Single file: use entryPoints directly
      await esbuild.build({
        entryPoints: resolvedCssFiles,
        bundle: true,
        outfile: outFile,
        minify: options.minify ?? true,
        loader: { '.css': 'css' },
        conditions: ['style'],
      });
    } else {
      // Multiple files: create a virtual entry that imports all CSS files
      const virtualEntry = resolvedCssFiles
        .map((f) => `@import "${f}";`)
        .join('\n');

      await esbuild.build({
        stdin: {
          contents: virtualEntry,
          loader: 'css',
          resolveDir: process.cwd(),
        },
        bundle: true,
        outfile: outFile,
        minify: options.minify ?? true,
        conditions: ['style'],
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bundle CSS to ${outFile}: ${message}`);
  }

  // Return relative path for HTML reference
  return '/_constela/styles.css';
}
