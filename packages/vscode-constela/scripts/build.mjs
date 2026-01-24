#!/usr/bin/env node
/**
 * Build script for vscode-constela extension
 *
 * This script:
 * 1. Bundles the language server with all dependencies
 * 2. Bundles the extension client with all dependencies
 *
 * All code is bundled into self-contained files so the .vsix works standalone.
 */

import * as esbuild from 'esbuild';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Paths to language server source
const languageServerDir = join(rootDir, '..', 'constela-language-server');
const languageServerEntry = join(languageServerDir, 'src', 'index.ts');

console.log('🔨 Building Constela VSCode Extension...\n');

// Step 1: Clean dist directory
console.log('1. Cleaning dist directory...');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

// Step 2: Bundle the language server with all dependencies
console.log('2. Bundling language server...');
await esbuild.build({
  entryPoints: [languageServerEntry],
  bundle: true,
  outfile: join(distDir, 'server', 'index.js'),
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  minify: true,
  external: [],
  // Ensure all workspace dependencies are bundled
  packages: 'bundle',
});

// Step 3: Bundle the extension client
console.log('3. Bundling extension client...');
await esbuild.build({
  entryPoints: [join(rootDir, 'src', 'extension.ts')],
  bundle: true,
  outfile: join(distDir, 'extension.js'),
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  minify: true,
  external: ['vscode'],
  // Ensure all dependencies are bundled
  packages: 'bundle',
});

console.log('\n✅ Build complete!');
console.log(`   Extension: ${join(distDir, 'extension.js')}`);
console.log(`   Server: ${join(distDir, 'server', 'index.js')}`);
