/**
 * CLI argument parser module for create-constela.
 *
 * Uses commander to parse command-line arguments for the create-constela CLI tool.
 */

import { Command } from 'commander';

/**
 * CLI options interface.
 */
export interface CliOptions {
  projectName: string | undefined;
  example: string | undefined;
  template: string;
  list: boolean;
  git: boolean;
  install: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | undefined;
}

/**
 * Parse CLI arguments and return structured options.
 *
 * @param argv - Array of command-line arguments (without node and script path)
 * @returns Parsed CLI options
 */
export function parseArgs(argv: string[]): CliOptions {
  const program = new Command();

  program
    .name('create-constela')
    .description('Create Constela applications with one command')
    .argument('[project-name]', 'Name of the project to create')
    .option('-e, --example <name>', 'Use an example template')
    .option('-t, --template <name>', 'Use a specific template', 'default')
    .option('--list', 'List available templates and examples', false)
    .option('--no-git', 'Skip git initialization')
    .option('--no-install', 'Skip package installation')
    .option(
      '--package-manager <pm>',
      'Package manager to use (npm, yarn, pnpm)',
    )
    .allowUnknownOption(true);

  program.parse(argv, { from: 'user' });

  const opts = program.opts();
  const args = program.args;

  return {
    projectName: args[0],
    example: opts['example'] as string | undefined,
    template: opts['template'] as string,
    list: opts['list'] as boolean,
    git: opts['git'] as boolean,
    install: opts['install'] as boolean,
    packageManager: opts['packageManager'] as 'npm' | 'yarn' | 'pnpm' | undefined,
  };
}
