/**
 * Package manager detection helper for create-constela.
 *
 * This module provides functions to detect the preferred package manager
 * based on lock files or environment variables.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detect the package manager to use based on lock files or environment.
 *
 * Priority:
 * 1. Lock files (pnpm-lock.yaml > yarn.lock > package-lock.json)
 * 2. npm_config_user_agent environment variable
 * 3. Default to npm
 *
 * @returns The detected package manager
 */
export function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
  const cwd = process.cwd();

  // Check lock files
  try {
    if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
    if (existsSync(join(cwd, 'package-lock.json'))) return 'npm';
  } catch {
    // Ignore errors from existsSync
  }

  // Check npm_config_user_agent (case insensitive)
  const userAgent = (process.env['npm_config_user_agent'] ?? '').toLowerCase();
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('npm')) return 'npm';

  // Default
  return 'npm';
}
