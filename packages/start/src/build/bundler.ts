/**
 * Runtime bundler module for Constela applications.
 *
 * Bundles @constela/runtime exports (hydrateApp, createApp) into a single
 * browser-ready ESM file using esbuild.
 */

import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, dirname, isAbsolute, relative } from 'node:path';
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
  /** Content paths for Tailwind CSS class scanning (enables PostCSS processing) */
  content?: string[];
}

/**
 * Bundle CSS files for production.
 *
 * Creates a bundled CSS file at {outDir}/_constela/styles.css that combines
 * all input CSS files.
 *
 * When the `content` option is provided, PostCSS processing with Tailwind CSS v4
 * is enabled. The content paths are used to scan for class usage and generate
 * only the required utility classes.
 *
 * **Limitation**: When multiple CSS files are provided with the `content` option,
 * the first CSS file's directory is used as the base for all path resolutions.
 * For complex multi-file CSS setups, consider using a single entry CSS file
 * that imports other CSS files.
 *
 * @param options - Bundle options
 * @returns The relative path for HTML link reference (always "/_constela/styles.css")
 * @throws Error if the output directory cannot be created, CSS files don't exist, or bundling fails
 */
export async function bundleCSS(options: BundleCSSOptions): Promise<string> {
  const cssFiles = Array.isArray(options.css) ? options.css : [options.css];
  const outFile = join(options.outDir, '_constela', 'styles.css');
  const shouldMinify = options.minify ?? true;

  // Ensure output directory exists
  await mkdir(dirname(outFile), { recursive: true });

  // Resolve CSS file paths (handle both absolute and relative paths)
  const resolvedCssFiles = cssFiles.map((f) => (isAbsolute(f) ? f : join(process.cwd(), f)));

  // Validate CSS files exist
  for (const fullPath of resolvedCssFiles) {
    if (!existsSync(fullPath)) {
      throw new Error(`CSS file not found: ${fullPath}`);
    }
  }

  // PostCSS processing when content option is provided
  if (options.content !== undefined) {
    // Read CSS content
    const firstCssFile = resolvedCssFiles[0];
    if (!firstCssFile) {
      throw new Error('No CSS files provided');
    }

    let cssContent: string;
    if (resolvedCssFiles.length === 1) {
      cssContent = await readFile(firstCssFile, 'utf-8');
    } else {
      cssContent = resolvedCssFiles.map((f) => `@import "${f}";`).join('\n');
    }

    // Resolve tailwindcss CSS entry point for temp directory compatibility (CRITICAL-1)
    // When CSS files are in temp directories, `from` points to the CSS file's directory
    // which may not have access to node_modules. Use createRequire to resolve from this module.
    // IMPORTANT: We must resolve 'tailwindcss/index.css' (the CSS entry point), NOT 'tailwindcss'
    // which would resolve to the JavaScript entry point (lib.js) and cause "Invalid declaration" errors.
    const require = createRequire(import.meta.url);
    try {
      const tailwindcssCssPath = require.resolve('tailwindcss/index.css');
      cssContent = cssContent.replace(
        /@import\s+["']tailwindcss["']/g,
        `@import "${tailwindcssCssPath}"`
      );
    } catch {
      // tailwindcss not installed, continue without replacement
      // The error will be caught later if the @import is actually used
    }

    // Validate content files exist (at least one match required for non-empty content)
    if (options.content.length > 0) {
      const fg = (await import('fast-glob')).default;
      const resolvedContentPaths = options.content.map((p) =>
        isAbsolute(p) ? p : join(process.cwd(), p)
      );
      const matchedFiles = await fg(resolvedContentPaths, { onlyFiles: true });
      if (matchedFiles.length === 0) {
        throw new Error(
          `No content files matched the provided patterns: ${options.content.join(', ')}`
        );
      }
    }

    // Prepend @source directives for Tailwind CSS v4 content scanning
    // These directives tell Tailwind where to scan for class usage
    const sourceDir = dirname(firstCssFile);
    const sourceDirectives = options.content
      .map((contentPath) => {
        // Convert to relative path from CSS file directory
        const absolutePath = isAbsolute(contentPath) ? contentPath : join(process.cwd(), contentPath);
        // Convert glob patterns to directory-level sources (WARNING-2)
        // Glob patterns like `**/*.tsx` should be converted to directory paths
        const srcPath = absolutePath.includes('*')
          ? dirname(absolutePath.split('*')[0] ?? absolutePath)
          : absolutePath;
        const relativePath = relative(sourceDir, srcPath);
        return `@source "${relativePath}";`;
      })
      .join('\n');

    // Combine @source directives with original CSS content
    const processedCssInput = sourceDirectives + '\n' + cssContent;

    // Process with PostCSS + Tailwind CSS v4
    const postcss = (await import('postcss')).default;

    // Import @tailwindcss/postcss with explicit error handling (WARNING-3)
    type TailwindPostcssPlugin = import('postcss').PluginCreator<{ base?: string; optimize?: boolean }>;
    let tailwindPostcss: TailwindPostcssPlugin;
    try {
      tailwindPostcss = (await import('@tailwindcss/postcss')).default as TailwindPostcssPlugin;
    } catch {
      throw new Error(
        'PostCSS processing requires @tailwindcss/postcss. Please install it: npm install @tailwindcss/postcss'
      );
    }

    // Process CSS with Tailwind PostCSS plugin
    // - 'base' must be the CSS file's directory for correct path resolution
    // - 'from' must point to the actual CSS file for @plugin/@source resolution
    try {
      const result = await postcss([
        tailwindPostcss({
          // base determines where to look for source files and resolve paths
          base: sourceDir,
          optimize: shouldMinify,
        }),
      ]).process(processedCssInput, {
        // from must be the actual CSS file path for correct package resolution
        from: firstCssFile,
      });

      // Write processed CSS with esbuild for final bundling and @import resolution
      await esbuild.build({
        stdin: {
          contents: result.css,
          loader: 'css',
          resolveDir: sourceDir,
        },
        bundle: true,
        outfile: outFile,
        minify: shouldMinify,
        conditions: ['style'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process CSS with PostCSS/Tailwind: ${message}`);
    }
  } else {
    // Existing esbuild-only path (backward compatibility)
    // Bundle with esbuild
    // For multiple CSS files, create a virtual entry that imports all of them
    try {
      if (resolvedCssFiles.length === 1) {
        // Single file: use entryPoints directly
        await esbuild.build({
          entryPoints: resolvedCssFiles,
          bundle: true,
          outfile: outFile,
          minify: shouldMinify,
          loader: { '.css': 'css' },
          conditions: ['style'],
        });
      } else {
        // Multiple files: create a virtual entry that imports all CSS files
        const virtualEntry = resolvedCssFiles.map((f) => `@import "${f}";`).join('\n');

        await esbuild.build({
          stdin: {
            contents: virtualEntry,
            loader: 'css',
            resolveDir: process.cwd(),
          },
          bundle: true,
          outfile: outFile,
          minify: shouldMinify,
          conditions: ['style'],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bundle CSS to ${outFile}: ${message}`);
    }
  }

  // Return relative path for HTML reference
  return '/_constela/styles.css';
}
