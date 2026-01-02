/**
 * Compile Command Tests for @constela/cli
 *
 * Coverage:
 * - Successful compilation of valid input
 * - Output file generation (default and custom path)
 * - Pretty-print option
 * - Error handling (non-existent file, invalid JSON, compilation errors)
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
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
      count: { type: 'number', initial: 0 },
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
    ],
    view: {
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'text',
          value: { expr: 'state', name: 'count' },
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
 * Creates a program with semantic error (undefined state reference)
 */
function createSemanticErrorProgram(): object {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: {
      kind: 'text',
      value: { expr: 'state', name: 'undefinedState' },
    },
  };
}

// ==================== Test Suite ====================

describe('constela compile', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== Happy Path ====================

  describe('successful compilation', () => {
    it('should compile valid input file successfully', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.status).toBe(0);
    });

    it('should create output file with default naming convention', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const expectedOutputPath = join(tempDir, 'app.compiled.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      runCompile([inputPath]);

      // Assert
      expect(existsSync(expectedOutputPath)).toBe(true);
    });

    it('should output valid compiled program JSON', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const outputPath = join(tempDir, 'app.compiled.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      runCompile([inputPath]);

      // Assert
      const output = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(output).toHaveProperty('state');
      expect(output).toHaveProperty('actions');
      expect(output).toHaveProperty('view');
    });

    it('should display success message after compilation', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.stdout).toContain('Compiled');
    });
  });

  // ==================== Output Path Option ====================

  describe('--out option', () => {
    it('should use custom output path with --out option', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const customOutputPath = join(tempDir, 'custom', 'output.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--out', customOutputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(existsSync(customOutputPath)).toBe(true);
    });

    it('should use custom output path with -o short option', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const customOutputPath = join(tempDir, 'output.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '-o', customOutputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(existsSync(customOutputPath)).toBe(true);
    });

    it('should create parent directories for output path if needed', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const customOutputPath = join(tempDir, 'nested', 'deep', 'output.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runCompile([inputPath, '--out', customOutputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(existsSync(customOutputPath)).toBe(true);
    });
  });

  // ==================== Pretty Print Option ====================

  describe('--pretty option', () => {
    it('should output formatted JSON with --pretty option', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const outputPath = join(tempDir, 'app.compiled.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      runCompile([inputPath, '--pretty']);

      // Assert
      const output = readFileSync(outputPath, 'utf-8');
      // Pretty-printed JSON should have newlines and indentation
      expect(output).toContain('\n');
      expect(output).toMatch(/^\{\n/);
    });

    it('should output compact JSON without --pretty option', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const outputPath = join(tempDir, 'app.compiled.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      runCompile([inputPath]);

      // Assert
      const output = readFileSync(outputPath, 'utf-8');
      // Compact JSON should not have leading newlines after brace
      expect(output).not.toMatch(/^\{\n/);
    });
  });

  // ==================== Error Handling: File Not Found ====================

  describe('non-existent input file', () => {
    it('should exit with non-zero status for non-existent file', () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'does-not-exist.json');

      // Act
      const result = runCompile([nonExistentPath]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display error message for non-existent file', () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'does-not-exist.json');

      // Act
      const result = runCompile([nonExistentPath]);

      // Assert
      expect(result.stderr).toContain('does-not-exist.json');
    });

    it('should indicate file not found in error message', () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'missing.json');

      // Act
      const result = runCompile([nonExistentPath]);

      // Assert
      expect(result.stderr.toLowerCase()).toMatch(/not found|no such file|enoent/);
    });
  });

  // ==================== Error Handling: Invalid JSON ====================

  describe('invalid JSON input', () => {
    it('should exit with non-zero status for invalid JSON', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, '{ invalid json }');

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display JSON parse error message', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, '{ "unclosed": ');

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.stderr.toLowerCase()).toMatch(/json|parse|syntax/);
    });
  });

  // ==================== Error Handling: Validation Errors ====================

  describe('compilation errors', () => {
    it('should exit with non-zero status for invalid program structure', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid-program.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display validation error details', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid-program.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.stderr).toContain('state');
    });

    it('should exit with non-zero status for semantic errors', () => {
      // Arrange
      const inputPath = join(tempDir, 'semantic-error.json');
      writeFileSync(inputPath, JSON.stringify(createSemanticErrorProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display semantic error with path information', () => {
      // Arrange
      const inputPath = join(tempDir, 'semantic-error.json');
      writeFileSync(inputPath, JSON.stringify(createSemanticErrorProgram()));

      // Act
      const result = runCompile([inputPath]);

      // Assert
      expect(result.stderr).toContain('undefinedState');
    });
  });

  // ==================== Error Handling: Missing Arguments ====================

  describe('missing arguments', () => {
    it('should exit with error when input file is not provided', () => {
      // Act
      const result = runCompile([]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display usage hint when input file is not provided', () => {
      // Act
      const result = runCompile([]);

      // Assert
      expect(result.stderr + result.stdout).toMatch(/usage|input|argument/i);
    });
  });

  // ==================== Help ====================

  describe('compile --help', () => {
    it('should display compile command help', () => {
      // Act
      const result = runCompile(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('compile');
      expect(result.stdout).toContain('--out');
      expect(result.stdout).toContain('--pretty');
    });
  });
});
