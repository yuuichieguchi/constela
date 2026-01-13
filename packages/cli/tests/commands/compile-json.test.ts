/**
 * Compile Command JSON Output and Colored Output Tests for @constela/cli
 *
 * Phase 1.4: CLI JSON Output and Colored Output
 *
 * Coverage:
 * - JSON output mode (--json flag)
 * - Success output format in JSON mode
 * - Error output format in JSON mode
 * - Colored output in default mode
 * - ANSI codes presence/absence
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

// ANSI escape code pattern to detect colored output
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*m/;

// ==================== Types ====================

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface JsonSuccessOutput {
  success: true;
  inputFile: string;
  outputFile: string;
  diagnostics: {
    duration: number;
  };
}

interface JsonErrorOutput {
  success: false;
  errors: Array<{
    code: string;
    message: string;
    path?: string;
    suggestion?: string;
    context?: Record<string, unknown>;
  }>;
  diagnostics: {
    duration: number;
  };
}

type JsonOutput = JsonSuccessOutput | JsonErrorOutput;

// ==================== Helper Functions ====================

/**
 * Runs the CLI compile command with given arguments
 */
function runCompile(args: string[], env?: Record<string, string>): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'compile', ...args],
    {
      cwd: PKG_DIR,
      encoding: 'buffer',
      env: {
        ...process.env,
        // Force color output even in non-TTY environment
        FORCE_COLOR: '1',
        ...env,
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
 * Runs the CLI compile command without color forcing (for JSON mode tests)
 */
function runCompileNoColor(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'compile', ...args],
    {
      cwd: PKG_DIR,
      encoding: 'buffer',
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
 * Creates a valid Constela program JSON
 */
function createValidProgram(): object {
  return {
    version: '1.0',
    state: {
      counter: { type: 'number', initial: 0 },
    },
    actions: [
      {
        name: 'increment',
        steps: [
          {
            do: 'update',
            target: 'counter',
            operation: 'increment',
          },
        ],
      },
    ],
    view: {
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'text',
          value: { expr: 'state', name: 'counter' },
        },
      ],
    },
  };
}

/**
 * Creates a program with semantic error (undefined state reference)
 * This should trigger an UNDEFINED_STATE error with suggestion
 */
function createUndefinedStateProgram(): object {
  return {
    version: '1.0',
    state: {
      counter: { type: 'number', initial: 0 },
    },
    actions: [],
    view: {
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'text',
          // Reference 'count' instead of 'counter' - should suggest 'counter'
          value: { expr: 'state', name: 'count' },
        },
      ],
    },
  };
}

/**
 * Creates a program with validation error (missing required field)
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

// ==================== Test Suite ====================

describe('constela compile --json', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-json-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== JSON Output Mode: Success ====================

  describe('JSON output mode on success', () => {
    it('should produce valid JSON on stdout when --json flag is used', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);

      // Assert
      expect(result.status).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should include success: true in JSON output on successful compilation', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output: JsonOutput = JSON.parse(result.stdout);

      // Assert
      expect(output.success).toBe(true);
    });

    it('should include inputFile in JSON success output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonSuccessOutput;

      // Assert
      expect(output.inputFile).toBe('app.json');
    });

    it('should include outputFile in JSON success output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonSuccessOutput;

      // Assert
      expect(output.outputFile).toBe('app.compiled.json');
    });

    it('should include diagnostics.duration in JSON success output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonSuccessOutput;

      // Assert
      expect(output.diagnostics).toBeDefined();
      expect(typeof output.diagnostics.duration).toBe('number');
      expect(output.diagnostics.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== JSON Output Mode: Error ====================

  describe('JSON output mode on error', () => {
    it('should produce valid JSON on stdout when compilation fails', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);

      // Assert
      // Note: exit status may be non-zero for errors, but JSON should still be valid
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should include success: false in JSON output on compilation error', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output: JsonOutput = JSON.parse(result.stdout);

      // Assert
      expect(output.success).toBe(false);
    });

    it('should include errors array in JSON error output', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      expect(Array.isArray(output.errors)).toBe(true);
      expect(output.errors.length).toBeGreaterThan(0);
    });

    it('should include error code in each error object', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      expect(output.errors[0].code).toBeDefined();
      expect(typeof output.errors[0].code).toBe('string');
    });

    it('should include error message in each error object', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      expect(output.errors[0].message).toBeDefined();
      expect(typeof output.errors[0].message).toBe('string');
    });

    it('should include error path in error object when available', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      // The undefined state error should have a path pointing to the view location
      const errorWithPath = output.errors.find((e) => e.path !== undefined);
      expect(errorWithPath).toBeDefined();
      expect(errorWithPath?.path).toContain('view');
    });

    it('should include suggestion in error object for typo-like errors', () => {
      // Arrange - 'count' is a typo for 'counter'
      const inputPath = join(tempDir, 'typo.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      const errorWithSuggestion = output.errors.find(
        (e) => e.suggestion !== undefined
      );
      expect(errorWithSuggestion).toBeDefined();
      expect(errorWithSuggestion?.suggestion).toContain('counter');
    });

    it('should include context in error object with available names', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      const errorWithContext = output.errors.find(
        (e) => e.context !== undefined
      );
      expect(errorWithContext).toBeDefined();
      expect(errorWithContext?.context?.availableNames).toBeDefined();
    });

    it('should include diagnostics.duration in JSON error output', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonErrorOutput;

      // Assert
      expect(output.diagnostics).toBeDefined();
      expect(typeof output.diagnostics.duration).toBe('number');
    });
  });

  // ==================== JSON Mode Disables Colors ====================

  describe('JSON mode disables colored output', () => {
    it('should not contain ANSI escape codes in JSON output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act - use runCompile with FORCE_COLOR to test that --json overrides it
      const result = runCompile([inputPath, '--json'], { FORCE_COLOR: '1' });

      // Assert
      expect(result.stdout).not.toMatch(ANSI_ESCAPE_REGEX);
      expect(result.stderr).not.toMatch(ANSI_ESCAPE_REGEX);
    });

    it('should not contain ANSI escape codes in JSON error output', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompile([inputPath, '--json'], { FORCE_COLOR: '1' });

      // Assert
      expect(result.stdout).not.toMatch(ANSI_ESCAPE_REGEX);
      expect(result.stderr).not.toMatch(ANSI_ESCAPE_REGEX);
    });
  });
});

// ==================== Colored Output Tests ====================

describe('constela compile colored output', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-color-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== Default Mode: Colored Output ====================

  describe('default mode (non-JSON) colored output', () => {
    it('should contain ANSI escape codes in error output by default', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act - force color to ensure ANSI codes are present
      const result = runCompile([inputPath], { FORCE_COLOR: '1' });

      // Assert
      expect(result.stderr).toMatch(ANSI_ESCAPE_REGEX);
    });

    it('should display error code in red color', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompile([inputPath], { FORCE_COLOR: '1' });

      // Assert
      // Red ANSI code is typically \x1b[31m or similar
      // Check that output contains red color and error code
      expect(result.stderr).toMatch(/\x1b\[3[1-9]m.*UNDEFINED_STATE/);
    });

    it('should display success message in green color', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath], { FORCE_COLOR: '1' });

      // Assert
      // Green ANSI code is typically \x1b[32m
      expect(result.stdout).toMatch(/\x1b\[32m/);
    });

    it('should display suggestion in yellow color', () => {
      // Arrange
      const inputPath = join(tempDir, 'typo.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompile([inputPath], { FORCE_COLOR: '1' });

      // Assert
      // Yellow ANSI code is typically \x1b[33m
      // Check that suggestion "Did you mean" is in yellow
      expect(result.stderr).toMatch(/\x1b\[33m.*counter/);
    });

    it('should include suggestion text in error output', () => {
      // Arrange
      const inputPath = join(tempDir, 'typo.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompile([inputPath], { FORCE_COLOR: '1' });

      // Assert
      expect(result.stderr).toMatch(/did you mean|suggestion/i);
      expect(result.stderr).toContain('counter');
    });
  });

  // ==================== NO_COLOR Environment Variable ====================

  describe('NO_COLOR environment variable', () => {
    it('should respect NO_COLOR environment variable', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runCompileNoColor([inputPath]);

      // Assert
      expect(result.stderr).not.toMatch(ANSI_ESCAPE_REGEX);
    });
  });
});

// ==================== Help Flag Tests ====================

describe('constela compile --json --help', () => {
  it('should show --json option in help output', () => {
    // Act
    const result = spawnSync('node', [CLI_PATH, 'compile', '--help'], {
      cwd: PKG_DIR,
      encoding: 'utf-8',
    });

    // Assert
    expect(result.stdout).toContain('--json');
  });
});
