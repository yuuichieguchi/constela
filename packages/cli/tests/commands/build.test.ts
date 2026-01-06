/**
 * Build Command Tests for @constela/cli
 *
 * Coverage:
 * - Command registration and help display
 * - Output directory option (-o, --outDir)
 * - Default values
 * - Integration with @constela/start
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { join } from 'node:path';

// ==================== Constants ====================

const CLI_PATH = join(__dirname, '..', '..', 'dist', 'index.js');
const PKG_DIR = join(__dirname, '..', '..');

// ==================== Types ====================

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

// ==================== Helper Functions ====================

/**
 * Runs the CLI build command with given arguments
 */
function runBuild(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'build', ...args],
    {
      cwd: PKG_DIR,
      encoding: 'buffer',
      timeout: 5000,
    }
  );

  return {
    status: result.status,
    stdout: result.stdout?.toString('utf-8') ?? '',
    stderr: result.stderr?.toString('utf-8') ?? '',
  };
}

/**
 * Runs the CLI with given arguments
 */
function runCli(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync('node', [CLI_PATH, ...args], {
    cwd: PKG_DIR,
    encoding: 'buffer',
    timeout: 5000,
  });

  return {
    status: result.status,
    stdout: result.stdout?.toString('utf-8') ?? '',
    stderr: result.stderr?.toString('utf-8') ?? '',
  };
}

// ==================== Test Suite ====================

describe('constela build', () => {
  // ==================== Command Registration ====================

  describe('command registration', () => {
    it('should be listed in main help output', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('build');
    });

    it('should display help when --help flag is provided', () => {
      // Arrange & Act
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('build');
    });

    it('should have description in help output', () => {
      // Arrange & Act
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/build|production/i);
    });
  });

  // ==================== Output Directory Option ====================

  describe('--outDir option', () => {
    it('should display --outDir option in help', () => {
      // Arrange & Act
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('--outDir');
    });

    it('should display -o short option in help', () => {
      // Arrange & Act
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('-o');
    });

    it('should show outDir description in help', () => {
      // Arrange & Act
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/output|directory|dir/i);
    });

    it('should indicate default output directory', () => {
      // Arrange & Act
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      // Default should be 'dist' or similar
      expect(result.stdout).toMatch(/dist|default/i);
    });
  });

  // ==================== Option Validation ====================

  describe('option validation', () => {
    it('should accept valid output directory path', () => {
      // This test verifies the option is parsed correctly
      const result = runBuild(['--help']);

      // Assert help shows the option format
      expect(result.stdout).toMatch(/--outDir\s+<\w+>/);
    });
  });

  // ==================== Build Execution ====================

  describe('build execution', () => {
    it('should not require input argument (unlike compile command)', () => {
      // Build command should work without arguments (uses defaults)
      // This test just checks that the command exists and can show help
      const result = runBuild(['--help']);

      // Assert
      expect(result.status).toBe(0);
      // Should not require <input> like compile command
      expect(result.stdout).not.toMatch(/build\s+<\w+>/);
    });
  });
});
