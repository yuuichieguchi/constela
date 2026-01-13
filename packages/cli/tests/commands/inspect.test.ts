/**
 * Inspect Command Tests for @constela/cli
 *
 * Phase 5: Debug Tools - inspect command
 *
 * Coverage:
 * - AST information display (state, actions, components, view tree)
 * - Filter options (--state, --actions, --components, --view)
 * - JSON output mode (--json flag)
 * - Styles information display
 * - Error handling (non-existent file, invalid JSON)
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

interface InspectJsonOutput {
  state?: Record<string, {
    type: string;
    initial: unknown;
  }>;
  actions?: Array<{
    name: string;
    stepSummary: string;
  }>;
  components?: Array<{
    name: string;
    params: Array<{
      name: string;
      type: string;
    }>;
  }>;
  styles?: Record<string, unknown>;
  viewTree?: {
    kind: string;
    tag?: string;
    children?: unknown[];
  };
}

// ==================== Helper Functions ====================

/**
 * Runs the CLI inspect command with given arguments
 */
function runInspect(args: string[]): RunResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    'node',
    [CLI_PATH, 'inspect', ...args],
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
 * Creates a valid Constela program JSON with state, actions, components
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
    components: [
      {
        name: 'Button',
        params: [
          { name: 'label', type: 'string' },
        ],
        view: {
          kind: 'element',
          tag: 'button',
          children: [
            {
              kind: 'text',
              value: { expr: 'param', name: 'label' },
            },
          ],
        },
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

/**
 * Creates a program with styles
 */
function createProgramWithStyles(): object {
  return {
    version: '1.0',
    state: {
      count: { type: 'number', initial: 0 },
    },
    actions: [],
    styles: {
      container: {
        display: 'flex',
        padding: '16px',
      },
      button: {
        backgroundColor: 'blue',
        color: 'white',
      },
    },
    view: {
      kind: 'element',
      tag: 'div',
      style: 'container',
      children: [
        {
          kind: 'text',
          value: { expr: 'state', name: 'count' },
        },
      ],
    },
  };
}

// ==================== Test Suite ====================

describe('constela inspect', () => {
  let tempDir: string;

  // ==================== Setup/Teardown ====================

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'constela-cli-inspect-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ==================== State Information ====================

  describe('state information', () => {
    it('should show state fields with types and initial values', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/State.*2.*field|State.*\(2\)/i);
      expect(result.stdout).toContain('count');
      expect(result.stdout).toContain('number');
      expect(result.stdout).toContain('items');
      expect(result.stdout).toContain('list');
    });
  });

  // ==================== Action Information ====================

  describe('action information', () => {
    it('should show action names with step summaries', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Actions.*2|Actions.*\(2\)/i);
      expect(result.stdout).toContain('increment');
      expect(result.stdout).toContain('addItem');
      // Should show step summaries like "update count" or "push to items"
      expect(result.stdout).toMatch(/update.*count|increment/i);
      expect(result.stdout).toMatch(/push.*items|addItem/i);
    });
  });

  // ==================== Component Information ====================

  describe('component information', () => {
    it('should show component names with params', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Components.*1|Components.*\(1\)/i);
      expect(result.stdout).toContain('Button');
      expect(result.stdout).toContain('label');
      expect(result.stdout).toContain('string');
    });
  });

  // ==================== View Tree Structure ====================

  describe('view tree structure', () => {
    it('should show view tree with element hierarchy', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/View Tree|view/i);
      expect(result.stdout).toContain('div');
      expect(result.stdout).toContain('button');
      expect(result.stdout).toMatch(/state\.count|count/);
      expect(result.stdout).toMatch(/onClick.*increment|increment/i);
    });
  });

  // ==================== Filter Options ====================

  describe('--state filter option', () => {
    it('should filter output to show only state information', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath, '--state']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('count');
      expect(result.stdout).toContain('items');
      // Should NOT show actions, components, or view tree
      expect(result.stdout).not.toMatch(/Actions.*\(2\)|Actions \(2\)/i);
      expect(result.stdout).not.toMatch(/Components.*\(1\)|Components \(1\)/i);
      expect(result.stdout).not.toMatch(/View Tree/i);
    });
  });

  describe('--actions filter option', () => {
    it('should filter output to show only action information', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath, '--actions']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('increment');
      expect(result.stdout).toContain('addItem');
      // Should NOT show state, components, or view tree
      expect(result.stdout).not.toMatch(/State.*\(2.*field\)|State \(2 fields\)/i);
      expect(result.stdout).not.toMatch(/Components.*\(1\)|Components \(1\)/i);
      expect(result.stdout).not.toMatch(/View Tree/i);
    });
  });

  // ==================== JSON Output Mode ====================

  describe('--json output option', () => {
    it('should output valid JSON with all AST information', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createValidProgram()));

      // Act
      const result = runInspect([inputPath, '--json']);

      // Assert
      expect(result.status).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();

      const output: InspectJsonOutput = JSON.parse(result.stdout);
      expect(output.state).toBeDefined();
      expect(output.actions).toBeDefined();
      expect(output.components).toBeDefined();
      expect(output.viewTree).toBeDefined();
    });
  });

  // ==================== Help Display ====================

  describe('inspect --help', () => {
    it('should display inspect command help with all options', () => {
      // Act
      const result = runInspect(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('inspect');
      expect(result.stdout).toContain('--state');
      expect(result.stdout).toContain('--actions');
      expect(result.stdout).toContain('--components');
      expect(result.stdout).toContain('--view');
      expect(result.stdout).toContain('--json');
    });
  });

  // ==================== Error Handling ====================

  describe('non-existent file error', () => {
    it('should show error for non-existent file', () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'nonexistent.json');

      // Act
      const result = runInspect([nonExistentPath]);

      // Assert
      expect(result.status).not.toBe(0);
      expect(result.stderr.toLowerCase()).toMatch(/not found|no such file|enoent/);
    });
  });

  describe('invalid JSON error', () => {
    it('should show parse error for invalid JSON', () => {
      // Arrange
      const inputPath = join(tempDir, 'invalid.json');
      writeFileSync(inputPath, '{ invalid json }');

      // Act
      const result = runInspect([inputPath]);

      // Assert
      expect(result.status).not.toBe(0);
      expect(result.stderr.toLowerCase()).toMatch(/json|parse|syntax/);
    });
  });

  // ==================== Styles Information ====================

  describe('styles information', () => {
    it('should show styles information when present', () => {
      // Arrange
      const inputPath = join(tempDir, 'app.json');
      writeFileSync(inputPath, JSON.stringify(createProgramWithStyles()));

      // Act
      const result = runInspect([inputPath]);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Styles|styles/i);
      expect(result.stdout).toContain('container');
      expect(result.stdout).toContain('button');
    });
  });

  // ==================== Main CLI Help Lists inspect Command ====================

  describe('main CLI help includes inspect', () => {
    it('should list inspect command in main help output', () => {
      // Act
      const result = runCli(['--help']);

      // Assert
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('inspect');
    });
  });
});
