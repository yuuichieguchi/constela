/**
 * CLI Entry Point Tests for @constela/cli
 *
 * Coverage:
 * - Help display (--help)
 * - Version display (--version)
 * - Unknown command handling
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { join } from 'node:path';

// ==================== Constants ====================

const CLI_PATH = join(__dirname, '..', 'dist', 'index.js');
const PKG_DIR = join(__dirname, '..');

// ==================== Helper Functions ====================

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs the CLI with given arguments
 */
function runCli(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync('node', [CLI_PATH, ...args], {
    cwd: PKG_DIR,
    encoding: 'buffer',
  });

  return {
    status: result.status,
    stdout: result.stdout?.toString('utf-8') ?? '',
    stderr: result.stderr?.toString('utf-8') ?? '',
  };
}

// ==================== Test Suite ====================

describe('constela CLI', () => {
  // ==================== Help Display ====================

  describe('--help', () => {
    it('should display help message when --help flag is provided', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('constela');
    });

    it('should display help message when -h flag is provided', () => {
      // Arrange & Act
      const result = runCli(['-h']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    it('should list available commands in help output', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('compile');
    });

    it('should list dev command in help output', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('dev');
    });

    it('should list build command in help output', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('build');
    });

    it('should list start command in help output', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('start');
    });
  });

  // ==================== Version Display ====================

  describe('--version', () => {
    it('should display version when --version flag is provided', () => {
      // Arrange & Act
      const result = runCli(['--version']);

      // Assert
      expect(result.status).toBe(0);
      // Version should match package.json version
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display version when -V flag is provided', () => {
      // Arrange & Act
      const result = runCli(['-V']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  // ==================== Unknown Command Handling ====================

  describe('unknown command', () => {
    it('should exit with error for unknown command', () => {
      // Arrange & Act
      const result = runCli(['unknown-command']);

      // Assert
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('unknown');
    });

    it('should suggest available commands when unknown command is used', () => {
      // Arrange & Act
      const result = runCli(['compil']); // Typo of 'compile'

      // Assert
      expect(result.status).not.toBe(0);
      // Should suggest 'compile' or show available commands
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  // ==================== No Arguments ====================

  describe('no arguments', () => {
    it('should display help when no arguments provided', () => {
      // Arrange & Act
      const result = runCli([]);

      // Assert
      // Should either show help or exit with non-zero status
      expect(result.stdout + result.stderr).toContain('Usage');
    });
  });
});
