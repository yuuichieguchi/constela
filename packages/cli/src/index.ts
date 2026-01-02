#!/usr/bin/env node
/**
 * @constela/cli - CLI tools for Constela UI framework
 *
 * Entry point for the constela CLI.
 *
 * Commands:
 * - compile <input> [options] - Compile a Constela program
 */

import { Command } from 'commander';
import { compileCommand } from './commands/compile.js';

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

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
