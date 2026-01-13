/**
 * Compile Watch Mode Tests for @constela/cli
 *
 * Phase 2.2: Watch Mode for compile command
 *
 * Coverage:
 * - Initial compilation behavior
 * - File change detection
 * - Error handling in watch mode
 * - Help display for --watch option
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ==================== Constants ====================

const CLI_PATH = join(__dirname, '..', '..', 'dist', 'index.js');
const PKG_DIR = join(__dirname, '..', '..');

/**
 * Default timeout for watch mode detection (ms)
 * Keep short for fast tests, but long enough for file system events
 */
const WATCH_DETECTION_TIMEOUT = 2000;

/**
 * Delay before modifying file to ensure watcher is ready (ms)
 */
const WATCHER_READY_DELAY = 500;

// ==================== Types ====================

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}


// ==================== Helper Functions ====================

/**
 * Runs the CLI compile command synchronously with given arguments
 */
function runCompileSync(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'compile', ...args],
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
 * Spawns the CLI compile command in watch mode and returns control to test
 */
function spawnCompileWatch(
  args: string[],
  cwd?: string
): ChildProcess {
  return spawn('node', [CLI_PATH, 'compile', ...args], {
    cwd: cwd ?? PKG_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/**
 * Waits for specific output pattern in process stdout/stderr
 */
async function waitForOutput(
  proc: ChildProcess,
  pattern: RegExp | string,
  timeout: number = WATCH_DETECTION_TIMEOUT
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Timeout waiting for pattern: ${pattern}\nStdout: ${stdout}\nStderr: ${stderr}`));
      }
    }, timeout);

    const check = (): void => {
      if (resolved) return;
      const combined = stdout + stderr;
      const matches = typeof pattern === 'string'
        ? combined.includes(pattern)
        : pattern.test(combined);

      if (matches) {
        resolved = true;
        clearTimeout(timer);
        resolve({ stdout, stderr });
      }
    };

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');
      check();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString('utf-8');
      check();
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    proc.on('exit', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`Process exited before pattern matched\nStdout: ${stdout}\nStderr: ${stderr}`));
      }
    });
  });
}

/**
 * Collects all output from a process for a duration
 */
async function collectOutput(
  proc: ChildProcess,
  duration: number
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString('utf-8');
    });

    setTimeout(() => {
      resolve({ stdout, stderr });
    }, duration);
  });
}

/**
 * Kills a process gracefully with SIGINT (Ctrl+C)
 * Returns immediately if process has already exited
 */
async function killProcess(proc: ChildProcess, signal: NodeJS.Signals = 'SIGINT'): Promise<void> {
  // If process already exited, return immediately
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Force kill if graceful shutdown takes too long
      proc.kill('SIGKILL');
      resolve();
    }, 1000);

    proc.on('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    proc.kill(signal);
  });
}

/**
 * Small delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a valid Constela program JSON
 */
function createValidProgram(counterValue: number = 0): object {
  return {
    version: '1.0',
    state: {
      counter: { type: 'number', initial: counterValue },
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

// ==================== Test Suite ====================

describe('constela compile --watch', () => {
  let tempDir: string;
  let watchProcess: ChildProcess | null = null;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-watch-test-'));
  });

  afterEach(async () => {
    // Clean up watch process if still running
    if (watchProcess) {
      await killProcess(watchProcess);
      watchProcess = null;
    }
    rmSync(tempDir, { recursive: true, force: true });
  }, 15000); // Increase timeout for cleanup

  // ==================== Initial Behavior ====================

  describe('initial compilation', () => {
    it('should perform initial compilation when --watch is specified', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      const { stdout } = await waitForOutput(watchProcess, /Compiled|compiled/);

      // Assert
      expect(stdout).toMatch(/Compiled|compiled/i);
    });

    it('should show initial compilation result', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      const { stdout } = await waitForOutput(watchProcess, /app\.compiled\.json/);

      // Assert
      expect(stdout).toContain('app.compiled.json');
    });

    it('should display "[Watching for changes...]" message after initial compile', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      const { stdout } = await waitForOutput(watchProcess, /Watching for changes/i);

      // Assert
      expect(stdout).toMatch(/\[?Watching for changes\.{0,3}\]?/i);
    });
  });

  // ==================== File Change Detection ====================

  describe('file change detection', () => {
    it('should re-compile when input file is modified', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram(0)));

      // Start watcher and wait for initial compile
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);

      // Wait for watcher to be fully ready
      await delay(WATCHER_READY_DELAY);

      // Act - modify the file
      writeFileSync(inputPath, JSON.stringify(createValidProgram(42)));

      // Wait for re-compile
      const { stdout } = await waitForOutput(watchProcess, /Compiled.*app\.json|Re-?compiled/i, WATCH_DETECTION_TIMEOUT);

      // Assert - should show compilation happened again
      // Count occurrences of "Compiled" - should be at least 2 (initial + after change)
      const compileMatches = stdout.match(/Compiled|compiled/gi);
      expect(compileMatches?.length ?? 0).toBeGreaterThanOrEqual(2);
    });

    it('should show compilation result after re-compile', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram(0)));

      // Start watcher and wait for initial compile
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);
      await delay(WATCHER_READY_DELAY);

      // Act - modify the file
      writeFileSync(inputPath, JSON.stringify(createValidProgram(100)));

      // Wait for re-compile
      const { stdout } = await waitForOutput(
        watchProcess,
        /Compiled.*app\.compiled\.json/,
        WATCH_DETECTION_TIMEOUT
      );

      // Assert
      expect(stdout).toContain('app.compiled.json');
    });

    it('should handle multiple consecutive file changes', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram(0)));

      // Start watcher and wait for initial compile
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);
      await delay(WATCHER_READY_DELAY);

      // Act - make multiple changes with sufficient delay to avoid debouncing
      writeFileSync(inputPath, JSON.stringify(createValidProgram(1)));
      await delay(600); // Longer delay to ensure watcher processes each change
      writeFileSync(inputPath, JSON.stringify(createValidProgram(2)));

      // Wait and collect output
      const { stdout } = await collectOutput(watchProcess, WATCH_DETECTION_TIMEOUT);

      // Assert - should have compiled multiple times (initial + at least 1 more after changes)
      // Note: File watchers may debounce rapid changes, so we verify at least 2 compilations
      const compileMatches = stdout.match(/Compiled|compiled/gi);
      expect(compileMatches?.length ?? 0).toBeGreaterThanOrEqual(2);
    });
  });

  // ==================== Error Handling in Watch Mode ====================

  describe('error handling in watch mode', () => {
    it('should display errors when file becomes invalid', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Start watcher and wait for initial compile
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);
      await delay(WATCHER_READY_DELAY);

      // Act - make file invalid
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));

      // Wait for error output
      const { stdout, stderr } = await waitForOutput(
        watchProcess,
        /error|Error|state/i,
        WATCH_DETECTION_TIMEOUT
      );

      // Assert - should show error about missing state
      const combined = stdout + stderr;
      expect(combined.toLowerCase()).toMatch(/error|state/i);
    });

    it('should continue watching after error (not exit)', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Start watcher and wait for initial compile
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);
      await delay(WATCHER_READY_DELAY);

      // Act - make file invalid
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));
      await delay(WATCH_DETECTION_TIMEOUT);

      // Assert - process should still be running
      expect(watchProcess.killed).toBe(false);
      expect(watchProcess.exitCode).toBeNull();
    });

    it('should re-compile successfully after error is fixed', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Start watcher and wait for initial compile
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);
      await delay(WATCHER_READY_DELAY);

      // Make file invalid
      writeFileSync(inputPath, JSON.stringify(createInvalidProgram()));
      await delay(WATCHER_READY_DELAY);

      // Act - fix the file
      writeFileSync(inputPath, JSON.stringify(createValidProgram(999)));

      // Wait for successful re-compile
      const { stdout } = await waitForOutput(
        watchProcess,
        /Compiled.*app\.json|✓/,
        WATCH_DETECTION_TIMEOUT
      );

      // Assert - should show successful compilation
      expect(stdout).toMatch(/Compiled|✓/i);
    });
  });

  // ==================== Process Termination ====================

  describe('process termination', () => {
    it('should exit gracefully on SIGINT (Ctrl+C)', async () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Start watcher
      watchProcess = spawnCompileWatch([inputPath, '--watch']);
      await waitForOutput(watchProcess, /Watching for changes/i);

      // Act - send SIGINT
      const exitPromise = new Promise<number | null>((resolve) => {
        watchProcess!.on('exit', (code) => resolve(code));
      });
      watchProcess.kill('SIGINT');

      // Assert - should exit with code 0 or null (killed)
      const exitCode = await exitPromise;
      expect(exitCode === 0 || exitCode === null).toBe(true);
    });
  });

  // ==================== Help Display ====================

  describe('--watch option in help', () => {
    it('should display --watch option in compile --help', () => {
      // Act
      const result = runCompileSync(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('--watch');
    });

    it('should display -w short option in compile --help', () => {
      // Act
      const result = runCompileSync(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/-w[,\s]|--watch/);
    });

    it('should show watch mode description in help', () => {
      // Act
      const result = runCompileSync(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/watch|Watch/);
    });
  });
});
