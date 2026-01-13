/**
 * Compile Debug Flag Tests for @constela/cli
 *
 * Phase 5: Debug Tools - --debug flag for compile command
 *
 * Coverage:
 * - [DEBUG] prefix output
 * - Input file size information
 * - Timing information for each pass
 * - Node counts during processing
 * - State/action count information
 * - Help display for --debug option
 * - Combination with --verbose and --json
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ==================== Constants ====================

const CLI_PATH = join(__dirname, '..', '..', 'dist', 'index.js');
const PKG_DIR = join(__dirname, '..', '..');

// ==================== Types ====================

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface JsonDebugOutput {
  success: boolean;
  debug?: {
    inputFile: string;
    inputSize: number;
    parseTime: number;
    validateTime: number;
    analyzeTime: number;
    transformTime: number;
    nodesValidated: number;
    stateCount: number;
    actionCount: number;
    viewNodeCount: number;
    outputSize: number;
  };
  diagnostics: {
    duration: number;
  };
}

// ==================== Helper Functions ====================

/**
 * Runs the CLI compile command with given arguments
 */
function runCompile(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'compile', ...args],
    {
      cwd: PKG_DIR,
      encoding: 'buffer',
      timeout: 10000,
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
    }
  );

  return {
    status: result.status,
    stdout: result.stdout?.toString('utf-8') ?? '',
    stderr: result.stderr?.toString('utf-8') ?? '',
  };
}

/**
 * Creates a valid Constela program JSON with multiple states and actions
 */
function createValidProgram(): object {
  return {
    version: '1.0',
    state: {
      count: { type: 'number', initial: 0 },
      items: { type: 'list', initial: [] },
    },
    actions: [
      {
        name: 'increment',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'increment',
          },
        ],
      },
      {
        name: 'addItem',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'push',
            value: { expr: 'lit', value: 'item' },
          },
        ],
      },
    ],
    view: {
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'element',
          tag: 'span',
          children: [
            {
              kind: 'text',
              value: { expr: 'state', name: 'count' },
            },
          ],
        },
        {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: { event: 'click', action: 'increment' },
          },
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: '+' },
            },
          ],
        },
      ],
    },
  };
}

// ==================== Test Suite ====================

describe('constela compile --debug', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-debug-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== Debug Prefix ====================

  describe('[DEBUG] prefix in output', () => {
    it('should show [DEBUG] prefix in output with --debug flag', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--debug']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('[DEBUG]');
    });
  });

  // ==================== Input File Information ====================

  describe('input file size information', () => {
    it('should show input file path and size in bytes', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const content = JSON.stringify(createValidProgram());
      writeFileSync(inputPath, content);

      // Act
      const result = runCompile([inputPath, '--debug']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[DEBUG\].*Input file.*app\.json/i);
      expect(result.stdout).toMatch(/\[DEBUG\].*\d+\s*bytes/i);
    });
  });

  // ==================== Timing Information ====================

  describe('timing information', () => {
    it('should show parse time in debug output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--debug']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[DEBUG\].*Parse time.*\d+ms/i);
    });
  });

  // ==================== Node Counts ====================

  describe('node counts during processing', () => {
    it('should show number of validated nodes', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--debug']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[DEBUG\].*Validate pass.*\d+\s*nodes validated/i);
    });
  });

  // ==================== State/Action Counts ====================

  describe('state and action counts', () => {
    it('should show state and action counts in analyze pass', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--debug']);

      // Assert
      expect(result.status).toBe(0);
      // Should show "2 states, 2 actions, N views"
      expect(result.stdout).toMatch(/\[DEBUG\].*Analyze pass.*2\s*states.*2\s*actions/i);
    });
  });

  // ==================== Help Display ====================

  describe('--debug option in compile --help', () => {
    it('should display --debug option in compile help', () => {
      // Act
      const result = runCompile(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('--debug');
    });
  });

  // ==================== Combination with --verbose ====================

  describe('--debug with --verbose combination', () => {
    it('should work together with --verbose flag', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--debug', '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Should show both verbose phase info and debug info
      expect(result.stdout).toContain('[DEBUG]');
      expect(result.stdout).toMatch(/\[1\/3\]/); // Verbose output
      expect(result.stdout).toMatch(/\[2\/3\]/);
      expect(result.stdout).toMatch(/\[3\/3\]/);
    });
  });

  // ==================== JSON Output with Debug ====================

  describe('--debug with --json combination', () => {
    it('should include debug information in JSON output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--debug', '--json']);

      // Assert
      expect(result.status).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();

      const output: JsonDebugOutput = JSON.parse(result.stdout);
      expect(output.debug).toBeDefined();
      expect(output.debug?.inputSize).toBeGreaterThan(0);
      expect(output.debug?.parseTime).toBeGreaterThanOrEqual(0);
      expect(output.debug?.stateCount).toBe(2);
      expect(output.debug?.actionCount).toBe(2);
      expect(output.debug?.outputSize).toBeGreaterThan(0);
    });
  });
});
