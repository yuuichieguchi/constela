/**
 * Templates module for create-constela.
 *
 * This module provides functions to work with project templates and examples
 * used by the create-constela CLI to scaffold new projects.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the directory containing the current module file.
 * Uses import.meta.url to resolve the path correctly in ESM.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The absolute path to the templates directory.
 * Templates are stored relative to the dist output at ../templates
 */
const TEMPLATES_DIR = resolve(__dirname, '..', 'templates');

/**
 * The name of the examples subdirectory within templates.
 */
const EXAMPLES_DIR_NAME = 'examples';

/**
 * Validates that a resolved path stays within the allowed base directory.
 * Prevents path traversal attacks.
 *
 * @param basePath - The base directory that the target must be within
 * @param targetPath - The resolved target path to validate
 * @returns true if the target path is safely within the base path
 */
function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedPath = resolve(basePath, targetPath);
  return resolvedPath.startsWith(basePath + '/') || resolvedPath === basePath;
}

/**
 * Validates that a path name does not contain path traversal sequences.
 * Throws an error if the name is unsafe.
 *
 * @param name - The path name to validate
 * @param type - The type of path (for error messages)
 * @throws Error if the name contains path traversal sequences or is absolute
 */
function validatePathName(name: string, type: 'template' | 'example'): void {
  // Check for absolute paths
  if (name.startsWith('/')) {
    throw new Error(`Invalid ${type} name: absolute paths are not allowed`);
  }

  // Check for path traversal sequences
  if (name.includes('..')) {
    throw new Error(`Invalid ${type} name: path traversal is not allowed`);
  }
}

/**
 * Returns the absolute path to the templates directory.
 */
export function getTemplatesDir(): string {
  return TEMPLATES_DIR;
}

/**
 * Returns an array of available template names.
 * Templates are subdirectories of the templates directory,
 * excluding the special 'examples' directory.
 */
export function getAvailableTemplates(): string[] {
  const entries = readdirSync(TEMPLATES_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== EXAMPLES_DIR_NAME)
    .map((entry) => entry.name);
}

/**
 * Returns an array of available example names.
 * Examples are subdirectories of the templates/examples directory.
 */
export function getAvailableExamples(): string[] {
  const examplesDir = join(TEMPLATES_DIR, EXAMPLES_DIR_NAME);

  if (!existsSync(examplesDir)) {
    return [];
  }

  const entries = readdirSync(examplesDir, { withFileTypes: true });

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

/**
 * Returns the absolute path to a specific template.
 *
 * @param name - The name of the template
 * @throws Error if the name contains path traversal sequences or is absolute
 */
export function getTemplatePath(name: string): string {
  // path.join normalizes away empty strings, so we need to handle this case
  // to ensure the path ends with a trailing slash when name is empty
  if (name === '') {
    return `${TEMPLATES_DIR}/`;
  }

  // Validate for path traversal attacks
  validatePathName(name, 'template');

  const resolvedPath = join(TEMPLATES_DIR, name);

  // Double-check that the resolved path is within TEMPLATES_DIR
  if (!isPathSafe(TEMPLATES_DIR, name)) {
    throw new Error('Invalid template name: path traversal is not allowed');
  }

  return resolvedPath;
}

/**
 * Returns the absolute path to a specific example.
 *
 * @param name - The name of the example
 * @throws Error if the name contains path traversal sequences or is absolute
 */
export function getExamplePath(name: string): string {
  // Validate for path traversal attacks
  validatePathName(name, 'example');

  const examplesDir = join(TEMPLATES_DIR, EXAMPLES_DIR_NAME);
  const resolvedPath = join(examplesDir, name);

  // Double-check that the resolved path is within the examples directory
  if (!isPathSafe(examplesDir, name)) {
    throw new Error('Invalid example name: path traversal is not allowed');
  }

  return resolvedPath;
}

/**
 * Checks whether a template with the given name exists.
 * Returns false for path traversal attempts (safe failure).
 *
 * @param name - The name of the template to check
 */
export function templateExists(name: string): boolean {
  try {
    return existsSync(getTemplatePath(name));
  } catch {
    // Return false for invalid paths (path traversal attempts)
    return false;
  }
}

/**
 * Checks whether an example with the given name exists.
 * Returns false for path traversal attempts (safe failure).
 *
 * @param name - The name of the example to check
 */
export function exampleExists(name: string): boolean {
  try {
    return existsSync(getExamplePath(name));
  } catch {
    // Return false for invalid paths (path traversal attempts)
    return false;
  }
}
