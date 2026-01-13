/**
 * Compile Verbose Mode Tests for @constela/cli
 *
 * Phase 2.3: Verbose Mode for compile command
 *
 * Coverage:
 * - Phase progress output ([1/3], [2/3], [3/3])
 * - Timing information for each phase
 * - Summary information (state/action/view node counts)
 * - Verbose with errors (shows phase progress before error)
 * - Help display for --verbose option
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
        name: 'decrement',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'decrement',
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
        {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: { event: 'click', action: 'decrement' },
          },
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: '-' },
            },
          ],
        },
      ],
    },
  };
}

/**
 * Creates an invalid Constela program JSON (missing required field)
 */
function createInvalidProgram(): object {
  return {
    version: '1.0',
    // Missing 'state' field
    actions: [],
    view: {
      kind: 'element',
      tag: 'div',
    },
  };
}

/**
 * Creates a program with semantic error (undefined component reference)
 * This error is caught in analyze pass (phase 2), not validate pass (phase 1)
 */
function createSemanticErrorProgram(): object {
  return {
    version: '1.0',
    state: {
      count: { type: 'number', initial: 0 },
    },
    actions: [],
    view: {
      kind: 'component',
      name: 'UndefinedComponent',
    },
  };
}

// ==================== Test Suite ====================

describe('constela compile --verbose', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-verbose-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== Phase Progress Output ====================

  describe('phase progress output', () => {
    it('should show "[1/3] Validating schema..." message with --verbose', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[1\/3\].*Validating schema/i);
    });

    it('should show "[2/3] Analyzing semantics..." message with --verbose', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[2\/3\].*Analyzing semantics/i);
    });

    it('should show "[3/3] Transforming AST..." message with --verbose', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[3\/3\].*Transforming AST/i);
    });

    it('should show phases in correct order with --verbose', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      const stdout = result.stdout;
      const phase1Index = stdout.indexOf('[1/3]');
      const phase2Index = stdout.indexOf('[2/3]');
      const phase3Index = stdout.indexOf('[3/3]');

      expect(phase1Index).toBeGreaterThan(-1);
      expect(phase2Index).toBeGreaterThan(phase1Index);
      expect(phase3Index).toBeGreaterThan(phase2Index);
    });
  });

  // ==================== Timing Information ====================

  describe('timing information', () => {
    it('should show timing for schema validation phase', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Match "OK (Xms)" pattern near phase 1
      expect(result.stdout).toMatch(/\[1\/3\].*OK\s*\(\d+ms\)/i);
    });

    it('should show timing for semantic analysis phase', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Match "OK (Xms)" pattern near phase 2
      expect(result.stdout).toMatch(/\[2\/3\].*OK\s*\(\d+ms\)/i);
    });

    it('should show timing for AST transformation phase', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Match "OK (Xms)" pattern near phase 3
      expect(result.stdout).toMatch(/\[3\/3\].*OK\s*\(\d+ms\)/i);
    });

    it('should show total compilation time in summary', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Match "Compilation successful (Xms total)" pattern
      expect(result.stdout).toMatch(/Compilation successful\s*\(\d+ms total\)/i);
    });
  });

  // ==================== Summary Information ====================

  describe('summary information', () => {
    it('should show state count in summary', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Should show "States: 2" (count, items)
      expect(result.stdout).toMatch(/States:\s*2/i);
    });

    it('should show action count in summary', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Should show "Actions: 2" (increment, decrement)
      expect(result.stdout).toMatch(/Actions:\s*2/i);
    });

    it('should show view node count in summary', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Should show "View nodes: N" where N is the total node count
      expect(result.stdout).toMatch(/View nodes:\s*\d+/i);
    });

    it('should show "Summary:" header before counts', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Summary:/i);
    });
  });

  // ==================== Semantic Analysis Details ====================

  describe('semantic analysis details', () => {
    it('should show collected state names in verbose output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Should show "Collecting state names: count, items"
      expect(result.stdout).toMatch(/Collecting state names.*count.*items|count.*items/i);
    });

    it('should show collected action names in verbose output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      // Should show "Collecting action names: increment, decrement"
      expect(result.stdout).toMatch(/Collecting action names.*increment.*decrement|increment.*decrement/i);
    });

    it('should show view tree validation step in verbose output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Validating view tree/i);
    });
  });

  // ==================== Verbose with Errors ====================

  describe('verbose with errors', () => {
    it('should show phase 1 progress before schema validation error', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).not.toBe(0);
      // Should show phase 1 starting
      expect(result.stdout + result.stderr).toMatch(/\[1\/3\].*Validating schema/i);
    });

    it('should show phase 2 progress before semantic error', () => {
      // Arrange
      const inputPath = join(tempDir, 'semantic-error.json');
      writeFileSync(inputPath, JSON.stringify(createSemanticErrorProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).not.toBe(0);
      // Should show phase 1 completed and phase 2 starting
      expect(result.stdout + result.stderr).toMatch(/\[1\/3\].*OK/i);
      expect(result.stdout + result.stderr).toMatch(/\[2\/3\].*Analyzing semantics/i);
    });

    it('should indicate which phase failed', () => {
      // Arrange
      const inputPath = join(tempDir, 'semantic-error.json');
      writeFileSync(inputPath, JSON.stringify(createSemanticErrorProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).not.toBe(0);
      // Should show FAILED indicator for phase 2
      expect(result.stdout + result.stderr).toMatch(/\[2\/3\].*FAILED|\[2\/3\].*Error/i);
    });

    it('should not show phase 3 when phase 2 fails', () => {
      // Arrange
      const inputPath = join(tempDir, 'semantic-error.json');
      writeFileSync(inputPath, JSON.stringify(createSemanticErrorProgram()));

      // Act
      const result = runCompile([inputPath, '--verbose']);

      // Assert
      expect(result.status).not.toBe(0);
      // Should NOT show phase 3
      expect(result.stdout + result.stderr).not.toMatch(/\[3\/3\]/);
    });
  });

  // ==================== Short Option ====================

  describe('short option -v', () => {
    it('should work with -v short option', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '-v']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\[1\/3\]/);
      expect(result.stdout).toMatch(/\[2\/3\]/);
      expect(result.stdout).toMatch(/\[3\/3\]/);
    });
  });

  // ==================== Help Display ====================

  describe('--verbose option in help', () => {
    it('should display --verbose option in compile --help', () => {
      // Act
      const result = runCompile(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('--verbose');
    });

    it('should display -v short option in compile --help', () => {
      // Act
      const result = runCompile(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/-v[,\s]|--verbose/);
    });

    it('should show verbose mode description in help', () => {
      // Act
      const result = runCompile(['--help']);

      // Assert
      expect(result.status).toBe(0);
      // Should describe what verbose mode does
      expect(result.stdout).toMatch(/verbose|detailed|progress/i);
    });
  });

  // ==================== Non-Verbose Mode (Regression) ====================

  describe('non-verbose mode (regression)', () => {
    it('should NOT show phase progress without --verbose', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).not.toMatch(/\[1\/3\]/);
      expect(result.stdout).not.toMatch(/\[2\/3\]/);
      expect(result.stdout).not.toMatch(/\[3\/3\]/);
    });

    it('should NOT show summary counts without --verbose', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).not.toMatch(/Summary:/i);
      expect(result.stdout).not.toMatch(/States:/i);
      expect(result.stdout).not.toMatch(/Actions:/i);
    });
  });
});
