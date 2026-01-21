/**
 * Main entry point for create-constela CLI.
 *
 * This module orchestrates the CLI workflow:
 * 1. Parse CLI arguments
 * 2. If --list, display templates and examples
 * 3. Run prompts for missing values
 * 4. Validate template/example exists
 * 5. Copy template to destination
 * 6. Initialize git if enabled
 * 7. Install dependencies if enabled
 * 8. Show success message
 */

import { join } from 'node:path';
import { parseArgs } from './cli.js';
import { runPrompts } from './prompts.js';
import {
  getAvailableTemplates,
  getAvailableExamples,
  getTemplatePath,
  getExamplePath,
  templateExists,
  exampleExists,
} from './templates.js';
import { copyTemplate } from './copier.js';
import { initGit, installDependencies } from './helpers/index.js';

/**
 * Options for creating a new Constela project.
 */
export interface CreateOptions {
  projectName: string;
  template?: string;
  example?: string;
  git: boolean;
  install: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm';
}

/**
 * Display available templates and examples to the console.
 */
function displayTemplateList(): void {
  const templates = getAvailableTemplates();
  const examples = getAvailableExamples();

  console.log('\nAvailable templates:');
  for (const template of templates) {
    console.log(`  - ${template}`);
  }

  console.log('\nAvailable examples:');
  for (const example of examples) {
    console.log(`  - ${example}`);
  }

  console.log('');
}

/**
 * Main CLI entry point.
 *
 * @param argv - Command-line arguments (defaults to process.argv.slice(2))
 */
export async function run(argv?: string[]): Promise<void> {
  // Step 1: Parse CLI arguments
  const args = argv ?? process.argv.slice(2);
  const options = parseArgs(args);

  // Step 2: If --list option, display templates and examples
  if (options.list) {
    displayTemplateList();
    return;
  }

  // Step 3: Run prompts for missing values
  const templates = getAvailableTemplates();
  const examples = getAvailableExamples();
  const promptResult = await runPrompts(options, templates, examples);

  // Step 4: Validate template/example exists
  const { projectName, template, example, packageManager } = promptResult;

  let sourcePath: string;

  if (example) {
    // Using an example
    if (!exampleExists(example)) {
      throw new Error(`Example "${example}" does not exist.`);
    }
    sourcePath = getExamplePath(example);
  } else {
    // Using a template
    const templateName = template ?? 'default';
    if (!templateExists(templateName)) {
      throw new Error(`Template "${templateName}" does not exist.`);
    }
    sourcePath = getTemplatePath(templateName);
  }

  // Step 5: Copy template to destination
  const destPath = join(process.cwd(), projectName);
  await copyTemplate(sourcePath, destPath, { projectName });

  // Step 6: Initialize git if enabled
  if (options.git) {
    await initGit(destPath);
  }

  // Step 7: Install dependencies if enabled
  if (options.install) {
    await installDependencies(destPath, packageManager);
  }

  // Step 8: Show success message
  console.log(`\nSuccess! Created ${projectName} at ${destPath}`);
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  if (!options.install) {
    console.log(`  ${packageManager} install`);
  }
  console.log(`  ${packageManager} run dev`);
  console.log('');
}
