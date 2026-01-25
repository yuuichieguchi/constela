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
import { validateCommand } from './commands/validate.js';
import { inspectCommand } from './commands/inspect.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { startCommand } from './commands/start.js';
import { suggestCommand } from './commands/suggest.js';

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
  .option('--json', 'Output results as JSON')
  .option('-w, --watch', 'Watch input file for changes and recompile')
  .option('-v, --verbose', 'Show detailed progress during compilation')
  .option('--debug', 'Show internal debug information')
  .action(compileCommand);

program
  .command('validate [input]')
  .description('Validate Constela JSON files without compilation')
  .option('-a, --all', 'Validate all JSON files in directory recursively')
  .option('--json', 'Output results as JSON')
  .action(validateCommand);

program
  .command('inspect <input>')
  .description('Inspect Constela program structure')
  .option('--state', 'Show only state')
  .option('--actions', 'Show only actions')
  .option('--components', 'Show only components')
  .option('--view', 'Show only view tree')
  .option('--json', 'Output as JSON')
  .action(inspectCommand);

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <number>', 'Port number (default: 3000)')
  .option('--host <string>', 'Host address')
  .option('--routesDir <path>', 'Routes directory')
  .option('--publicDir <path>', 'Public directory')
  .option('--layoutsDir <path>', 'Layouts directory')
  .action(devCommand);

program
  .command('build')
  .description('Build for production')
  .option('-o, --outDir <path>', 'Output directory (default: dist)')
  .option('--routesDir <path>', 'Routes directory')
  .option('--publicDir <path>', 'Public directory')
  .option('--layoutsDir <path>', 'Layouts directory')
  .action(buildCommand);

program
  .command('start')
  .description('Start production server')
  .option('-p, --port <number>', 'Port number (default: 3000)')
  .action(startCommand);

program
  .command('suggest <input>')
  .description('Get AI-powered suggestions for Constela DSL')
  .option('--aspect <type>', 'Aspect to analyze: accessibility, performance, security, ux')
  .option('--provider <name>', 'AI provider: anthropic, openai (default: anthropic)')
  .option('--json', 'Output results as JSON')
  .action(suggestCommand);

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
