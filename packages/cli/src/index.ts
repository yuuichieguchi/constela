#!/usr/bin/env node
/**
 * @constela/cli - CLI tools for Constela UI framework
 *
 * Entry point for the constela CLI.
 *
 * Commands:
 * - compile <input> [options] - Compile a Constela program
 * - dev [options] - Start development server
 * - build [options] - Build for production
 * - start [options] - Start production server
 */

import { Command } from 'commander';
import { compileCommand } from './commands/compile.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { startCommand } from './commands/start.js';

const program = new Command();

program
  .name('constela')
  .description('Constela UI framework CLI')
  .version('0.1.0');

program
  .command('compile <input>')
  .description('Compile a Constela DSL file')
  .option('-o, --out <path>', 'Output file path')
  .option('--pretty', 'Pretty-print JSON output')
  .action(compileCommand);

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <number>', 'Port number (default: 3000)')
  .option('--host <string>', 'Host address')
  .action(devCommand);

program
  .command('build')
  .description('Build for production')
  .option('-o, --outDir <path>', 'Output directory (default: dist)')
  .action(buildCommand);

program
  .command('start')
  .description('Start production server')
  .option('-p, --port <number>', 'Port number (default: 3000)')
  .action(startCommand);

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
