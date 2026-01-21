/**
 * Interactive prompts module for create-constela.
 *
 * This module provides interactive prompt functions using @inquirer/prompts
 * to gather user input when options are not provided via CLI arguments.
 */

import { input, select } from '@inquirer/prompts';
import type { CliOptions } from './cli.js';

/**
 * Result of running all prompts.
 */
export interface PromptResult {
  projectName: string;
  template?: string | undefined;
  example?: string | undefined;
  packageManager: 'npm' | 'yarn' | 'pnpm';
}

/**
 * Prompt the user for a project name.
 *
 * @returns The project name entered by the user
 */
export async function promptProjectName(): Promise<string> {
  return input({
    message: 'What is your project name?',
    default: 'my-constela-app',
  });
}

/**
 * Prompt the user to select a template from available options.
 *
 * @param templates - Array of available template names
 * @returns The selected template name
 */
export async function promptTemplate(templates: string[]): Promise<string> {
  return select({
    message: 'Which template would you like to use?',
    choices: templates.map((name) => ({ value: name })),
  });
}

/**
 * Prompt the user to select an example from available options.
 *
 * @param examples - Array of available example names
 * @returns The selected example name
 */
export async function promptExample(examples: string[]): Promise<string> {
  return select({
    message: 'Which example would you like to use?',
    choices: examples.map((name) => ({ value: name })),
  });
}

/**
 * Prompt the user to select a package manager.
 *
 * @returns The selected package manager
 */
export async function promptPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
  return select({
    message: 'Which package manager would you like to use?',
    choices: [
      { value: 'npm' as const },
      { value: 'yarn' as const },
      { value: 'pnpm' as const },
    ],
  });
}

/**
 * Run all necessary prompts based on provided CLI options.
 *
 * Skips prompts for values that are already provided in options.
 *
 * @param options - CLI options from argument parsing
 * @param templates - Array of available template names
 * @param examples - Array of available example names
 * @returns Complete prompt result with all required values
 */
export async function runPrompts(
  options: CliOptions,
  templates: string[],
  examples: string[],
): Promise<PromptResult> {
  // Get project name - prompt if not provided
  const projectName = options.projectName ?? (await promptProjectName());

  // Determine template vs example
  // If example is provided, use it and ignore template
  let template: string | undefined;
  let example: string | undefined;

  if (options.example) {
    example = options.example;
    template = undefined;
  } else if (options.template !== 'default') {
    // Template was explicitly set to something other than default
    template = options.template;
    example = undefined;
  } else {
    // Use default template
    template = options.template;
    example = undefined;
  }

  // Get package manager - prompt if not provided
  const packageManager =
    options.packageManager ?? (await promptPackageManager());

  return {
    projectName,
    template,
    example,
    packageManager,
  };
}
