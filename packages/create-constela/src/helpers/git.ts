/**
 * Git initialization helper for create-constela.
 *
 * This module provides functions to initialize a git repository
 * in the newly created project directory.
 */

import { execSync } from 'node:child_process';

/**
 * Initialize a git repository in the specified directory.
 *
 * @param projectPath - The path to the project directory
 * @returns true on success, false on failure
 */
export async function initGit(projectPath: string): Promise<boolean> {
  try {
    execSync('git init', { cwd: projectPath, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
