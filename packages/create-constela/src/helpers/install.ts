/**
 * Package installation helper for create-constela.
 *
 * This module provides functions to install dependencies
 * using the specified package manager.
 */

import { execSync } from 'node:child_process';

/**
 * Install dependencies using the specified package manager.
 *
 * @param projectPath - The path to the project directory
 * @param packageManager - The package manager to use ('npm' | 'yarn' | 'pnpm')
 * @returns true on success, false on failure
 */
export async function installDependencies(
  projectPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm',
): Promise<boolean> {
  const commands: Record<'npm' | 'yarn' | 'pnpm', string> = {
    npm: 'npm install',
    yarn: 'yarn',
    pnpm: 'pnpm install',
  };

  try {
    execSync(commands[packageManager], { cwd: projectPath, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}
