/**
 * Validate Command Tests for @constela/cli
 *
 * Phase 2.1: Validate Command
 *
 * Coverage:
 * - Single file validation (valid and invalid files)
 * - Directory validation with --all flag
 * - JSON output mode (--json flag)
 * - File not found error handling
 * - Help display
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
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

interface JsonValidationSuccess {
  success: true;
  file?: string;
  files?: string[];
  validatedCount: number;
  diagnostics: {
    duration: number;
  };
}

interface ValidationError {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
  context?: Record<string, unknown>;
}

interface FileValidationError {
  file: string;
  errors: ValidationError[];
}

interface JsonValidationError {
  success: false;
  file?: string;
  files?: FileValidationError[];
  errors?: ValidationError[];
  diagnostics: {
    duration: number;
  };
}

type JsonValidationOutput = JsonValidationSuccess | JsonValidationError;

// ==================== Helper Functions ====================

/**
 * Runs the CLI validate command with given arguments
 */
function runValidate(args: string[], env?: Record<string, string>): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'validate', ...args],
    {
      cwd: PKG_DIR,
      encoding: 'buffer',
      env: {
        ...process.env,
        NO_COLOR: '1',
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
 * Runs the CLI with given arguments (for help tests)
 */
function runCli(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, ...args],
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
          // 'count' is a typo for 'counter'
          value: { expr: 'state', name: 'count' },
        },
      ],
    },
  };
}

// ==================== Test Suite ====================

describe('constela validate', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-validate-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== Single File Validation: Happy Path ====================

  describe('single file validation', () => {
    it('should return exit code 0 for valid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath]);

      // Assert
      expect(result.status).toBe(0);
    });

    it('should display success message for valid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath]);

      // Assert
      expect(result.stdout.toLowerCase()).toMatch(/valid|success|ok/);
    });

    it('should NOT produce compiled output file (validation only)', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      const wouldBeOutputPath = join(tempDir, 'app.compiled.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      runValidate([inputPath]);

      // Assert
      const { existsSync } = require('node:fs');
      expect(existsSync(wouldBeOutputPath)).toBe(false);
    });
  });

  // ==================== Single File Validation: Error Cases ====================

  describe('single file validation with errors', () => {
    it('should return non-zero exit code for invalid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runValidate([inputPath]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display validation errors for invalid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runValidate([inputPath]);

      // Assert
      expect(result.stderr).toContain('state');
    });

    it('should display suggestion for typo-like errors', () => {
      // Arrange
      const inputPath = join(tempDir, 'typo.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runValidate([inputPath]);

      // Assert
      expect(result.stderr.toLowerCase()).toMatch(/did you mean|suggestion/);
      expect(result.stderr).toContain('counter');
    });
  });

  // ==================== Single File: File Not Found ====================

  describe('file not found error', () => {
    it('should return non-zero exit code for nonexistent file', () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'nonexistent.json');

      // Act
      const result = runValidate([nonExistentPath]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should display file not found error message', () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'nonexistent.json');

      // Act
      const result = runValidate([nonExistentPath]);

      // Assert
      expect(result.stderr.toLowerCase()).toMatch(/not found|no such file|enoent/);
    });
  });

  // ==================== Single File: JSON Output Mode ====================

  describe('single file with --json flag', () => {
    it('should produce valid JSON on stdout for valid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);

      // Assert
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should include success: true in JSON output for valid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output: JsonValidationOutput = JSON.parse(result.stdout);

      // Assert
      expect(output.success).toBe(true);
    });

    it('should include file name in JSON success output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationSuccess;

      // Assert
      expect(output.file).toBe('app.json');
    });

    it('should include validatedCount: 1 in JSON success output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationSuccess;

      // Assert
      expect(output.validatedCount).toBe(1);
    });

    it('should include diagnostics.duration in JSON output', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationSuccess;

      // Assert
      expect(output.diagnostics).toBeDefined();
      expect(typeof output.diagnostics.duration).toBe('number');
      expect(output.diagnostics.duration).toBeGreaterThanOrEqual(0);
    });

    it('should produce valid JSON on stdout for invalid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);

      // Assert
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should include success: false in JSON output for invalid file', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output: JsonValidationOutput = JSON.parse(result.stdout);

      // Assert
      expect(output.success).toBe(false);
    });

    it('should include errors array in JSON error output', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationError;

      // Assert
      expect(Array.isArray(output.errors)).toBe(true);
      expect(output.errors!.length).toBeGreaterThan(0);
    });

    it('should include suggestion in JSON error output for typo-like errors', () => {
      // Arrange
      const inputPath = join(tempDir, 'typo.json');
      writeFileSync(inputPath, JSON.stringify(createUndefinedStateProgram()));

      // Act
      const result = runValidate([inputPath, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationError;

      // Assert
      const errorWithSuggestion = output.errors!.find(
        (e) => e.suggestion !== undefined
      );
      expect(errorWithSuggestion).toBeDefined();
      expect(errorWithSuggestion?.suggestion).toContain('counter');
    });
  });

  // ==================== Directory Validation with --all Flag ====================

  describe('directory validation with --all flag', () => {
    it('should validate all JSON files in directory', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'page1.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'page2.json'),
        JSON.stringify(createValidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir]);

      // Assert
      expect(result.status).toBe(0);
    });

    it('should display count of validated files', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'page1.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'page2.json'),
        JSON.stringify(createValidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir]);

      // Assert
      expect(result.stdout).toMatch(/2.*file|files.*2/i);
    });

    it('should return non-zero exit code when any file has errors', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'valid.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'invalid.json'),
        JSON.stringify(createInvalidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir]);

      // Assert
      expect(result.status).not.toBe(0);
    });

    it('should report errors from multiple files', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'invalid1.json'),
        JSON.stringify(createInvalidProgram())
      );
      writeFileSync(
        join(srcDir, 'invalid2.json'),
        JSON.stringify(createUndefinedStateProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir]);

      // Assert
      expect(result.stderr).toContain('invalid1.json');
      expect(result.stderr).toContain('invalid2.json');
    });

    it('should skip non-JSON files in directory', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'app.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(join(srcDir, 'README.md'), '# Readme');
      writeFileSync(join(srcDir, 'script.ts'), 'export const x = 1;');

      // Act
      const result = runValidate(['--all', srcDir]);

      // Assert
      expect(result.status).toBe(0);
      // Should only validate 1 file (app.json)
      expect(result.stdout).toMatch(/1.*file|file.*1/i);
    });

    it('should recursively validate nested directories', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      const nestedDir = join(srcDir, 'routes', 'nested');
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'app.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(nestedDir, 'page.json'),
        JSON.stringify(createValidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/2.*file|files.*2/i);
    });
  });

  // ==================== Directory Validation: JSON Output Mode ====================

  describe('directory validation with --all and --json flags', () => {
    it('should produce valid JSON for directory validation', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'page1.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'page2.json'),
        JSON.stringify(createValidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir, '--json']);

      // Assert
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should include files array in JSON success output for directory', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'page1.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'page2.json'),
        JSON.stringify(createValidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationSuccess;

      // Assert
      expect(output.success).toBe(true);
      expect(Array.isArray(output.files)).toBe(true);
      expect(output.files!.length).toBe(2);
    });

    it('should include validatedCount in JSON output for directory', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'page1.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'page2.json'),
        JSON.stringify(createValidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationSuccess;

      // Assert
      expect(output.validatedCount).toBe(2);
    });

    it('should include files array with errors in JSON error output for directory', () => {
      // Arrange
      const srcDir = join(tempDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'valid.json'),
        JSON.stringify(createValidProgram())
      );
      writeFileSync(
        join(srcDir, 'invalid.json'),
        JSON.stringify(createInvalidProgram())
      );

      // Act
      const result = runValidate(['--all', srcDir, '--json']);
      const output = JSON.parse(result.stdout) as JsonValidationError;

      // Assert
      expect(output.success).toBe(false);
      expect(Array.isArray(output.files)).toBe(true);
      const invalidFile = output.files!.find((f) => f.file.includes('invalid.json'));
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.errors.length).toBeGreaterThan(0);
    });
  });

  // ==================== Help Display ====================

  describe('validate --help', () => {
    it('should display validate command help', () => {
      // Act
      const result = runValidate(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('validate');
    });

    it('should show --all option in help', () => {
      // Act
      const result = runValidate(['--help']);

      // Assert
      expect(result.stdout).toContain('--all');
    });

    it('should show --json option in help', () => {
      // Act
      const result = runValidate(['--help']);

      // Assert
      expect(result.stdout).toContain('--json');
    });

    it('should describe validation purpose in help', () => {
      // Act
      const result = runValidate(['--help']);

      // Assert
      expect(result.stdout.toLowerCase()).toMatch(/valid/);
    });
  });

  // ==================== Main CLI Help Lists validate Command ====================

  describe('main CLI help includes validate', () => {
    it('should list validate command in main help output', () => {
      // Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('validate');
    });
  });
});
