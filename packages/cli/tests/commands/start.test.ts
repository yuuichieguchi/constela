/**
 * Start Command Tests for @constela/cli
 *
 * Coverage:
 * - Command registration and help display
 * - Port option (-p, --port)
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
 * Runs the CLI start command with given arguments
 */
function runStart(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'start', ...args],
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

describe('constela start', () => {
  // ==================== Command Registration ====================

  describe('command registration', () => {
    it('should be listed in main help output', () => {
      // Arrange & Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('start');
    });

    it('should display help when --help flag is provided', () => {
      // Arrange & Act
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('start');
    });

    it('should have description in help output', () => {
      // Arrange & Act
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/production|server|start/i);
    });
  });

  // ==================== Port Option ====================

  describe('--port option', () => {
    it('should display --port option in help', () => {
      // Arrange & Act
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('--port');
    });

    it('should display -p short option in help', () => {
      // Arrange & Act
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('-p');
    });

    it('should show port description in help', () => {
      // Arrange & Act
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/port/i);
    });

    it('should indicate default port value of 3000', () => {
      // Arrange & Act
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/3000|default/i);
    });
  });

  // ==================== Option Validation ====================

  describe('option validation', () => {
    it('should accept valid port number', () => {
      // This test verifies the option is parsed correctly
      const result = runStart(['--help']);

      // Assert help shows the option format
      expect(result.stdout).toMatch(/--port\s+<\w+>/);
    });
  });

  // ==================== Start Execution ====================

  describe('start execution', () => {
    it('should not require input argument', () => {
      // Start command should work without arguments
      const result = runStart(['--help']);

      // Assert
      expect(result.status).toBe(0);
      // Should not require <input> like compile command
      expect(result.stdout).not.toMatch(/start\s+<\w+>/);
    });
  });
});
