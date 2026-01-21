/**
 * Test module for create-constela CLI argument parsing.
 *
 * Coverage:
 * - parseArgs: Parse command-line arguments
 * - Happy path: project name, options with default values
 * - Options: --example/-e, --template/-t, --list, --no-git, --no-install, --package-manager
 * - Edge cases: empty args, missing values, invalid values
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect } from 'vitest';

// Import the module under test (will fail until implemented)
import { parseArgs, type CliOptions } from '../src/cli.js';

// ==================== Test Fixtures ====================

const DEFAULT_OPTIONS: CliOptions = {
  projectName: undefined,
  example: undefined,
  template: 'default',
  list: false,
  git: true,
  install: true,
  packageManager: undefined,
};

// ==================== Tests ====================

describe('parseArgs', () => {
  // ==================== Happy Path ====================

  describe('when parsing project name', () => {
    it('should extract project name from first positional argument', () => {
      /**
       * Given: CLI args with project name as first positional argument
       * When: parseArgs is called
       * Then: projectName should be set to the provided value
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
    });

    it('should return default options with project name', () => {
      /**
       * Given: CLI args with only project name
       * When: parseArgs is called
       * Then: All options should have default values except projectName
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result).toEqual({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: undefined,
      });
    });

    it('should handle project name with hyphens', () => {
      /**
       * Given: CLI args with hyphenated project name
       * When: parseArgs is called
       * Then: projectName should preserve hyphens
       */
      // Arrange
      const argv = ['my-awesome-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-awesome-app');
    });

    it('should handle project name with path', () => {
      /**
       * Given: CLI args with project name as relative path
       * When: parseArgs is called
       * Then: projectName should preserve the path
       */
      // Arrange
      const argv = ['./projects/my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('./projects/my-app');
    });
  });

  // ==================== --example / -e Option ====================

  describe('when parsing --example option', () => {
    it('should parse --example option with value', () => {
      /**
       * Given: CLI args with --example flag and value
       * When: parseArgs is called
       * Then: example should be set to the provided value
       */
      // Arrange
      const argv = ['my-app', '--example', 'counter'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.example).toBe('counter');
    });

    it('should parse -e short option with value', () => {
      /**
       * Given: CLI args with -e short flag and value
       * When: parseArgs is called
       * Then: example should be set to the provided value
       */
      // Arrange
      const argv = ['my-app', '-e', 'counter'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.example).toBe('counter');
    });

    it('should handle example before project name', () => {
      /**
       * Given: CLI args with -e flag before project name
       * When: parseArgs is called
       * Then: Both example and projectName should be correctly parsed
       */
      // Arrange
      const argv = ['-e', 'todo', 'my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.example).toBe('todo');
    });
  });

  // ==================== --template / -t Option ====================

  describe('when parsing --template option', () => {
    it('should parse --template option with value', () => {
      /**
       * Given: CLI args with --template flag and value
       * When: parseArgs is called
       * Then: template should be set to the provided value
       */
      // Arrange
      const argv = ['my-app', '--template', 'minimal'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.template).toBe('minimal');
    });

    it('should parse -t short option with value', () => {
      /**
       * Given: CLI args with -t short flag and value
       * When: parseArgs is called
       * Then: template should be set to the provided value
       */
      // Arrange
      const argv = ['my-app', '-t', 'full'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.template).toBe('full');
    });

    it('should default template to "default" when not specified', () => {
      /**
       * Given: CLI args without --template flag
       * When: parseArgs is called
       * Then: template should default to "default"
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.template).toBe('default');
    });
  });

  // ==================== --list Option ====================

  describe('when parsing --list option', () => {
    it('should set list to true when --list flag is provided', () => {
      /**
       * Given: CLI args with --list flag
       * When: parseArgs is called
       * Then: list should be true
       */
      // Arrange
      const argv = ['--list'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.list).toBe(true);
    });

    it('should not require project name when --list is provided', () => {
      /**
       * Given: CLI args with only --list flag
       * When: parseArgs is called
       * Then: projectName should be undefined and list should be true
       */
      // Arrange
      const argv = ['--list'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBeUndefined();
      expect(result.list).toBe(true);
    });

    it('should default list to false when not specified', () => {
      /**
       * Given: CLI args without --list flag
       * When: parseArgs is called
       * Then: list should default to false
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.list).toBe(false);
    });
  });

  // ==================== --no-git Option ====================

  describe('when parsing --no-git option', () => {
    it('should set git to false when --no-git flag is provided', () => {
      /**
       * Given: CLI args with --no-git flag
       * When: parseArgs is called
       * Then: git should be false
       */
      // Arrange
      const argv = ['my-app', '--no-git'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.git).toBe(false);
    });

    it('should default git to true when not specified', () => {
      /**
       * Given: CLI args without --no-git flag
       * When: parseArgs is called
       * Then: git should default to true
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.git).toBe(true);
    });
  });

  // ==================== --no-install Option ====================

  describe('when parsing --no-install option', () => {
    it('should set install to false when --no-install flag is provided', () => {
      /**
       * Given: CLI args with --no-install flag
       * When: parseArgs is called
       * Then: install should be false
       */
      // Arrange
      const argv = ['my-app', '--no-install'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.install).toBe(false);
    });

    it('should default install to true when not specified', () => {
      /**
       * Given: CLI args without --no-install flag
       * When: parseArgs is called
       * Then: install should default to true
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.install).toBe(true);
    });
  });

  // ==================== --package-manager Option ====================

  describe('when parsing --package-manager option', () => {
    it('should parse --package-manager npm', () => {
      /**
       * Given: CLI args with --package-manager npm
       * When: parseArgs is called
       * Then: packageManager should be "npm"
       */
      // Arrange
      const argv = ['my-app', '--package-manager', 'npm'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.packageManager).toBe('npm');
    });

    it('should parse --package-manager yarn', () => {
      /**
       * Given: CLI args with --package-manager yarn
       * When: parseArgs is called
       * Then: packageManager should be "yarn"
       */
      // Arrange
      const argv = ['my-app', '--package-manager', 'yarn'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.packageManager).toBe('yarn');
    });

    it('should parse --package-manager pnpm', () => {
      /**
       * Given: CLI args with --package-manager pnpm
       * When: parseArgs is called
       * Then: packageManager should be "pnpm"
       */
      // Arrange
      const argv = ['my-app', '--package-manager', 'pnpm'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.packageManager).toBe('pnpm');
    });

    it('should default packageManager to undefined when not specified', () => {
      /**
       * Given: CLI args without --package-manager flag
       * When: parseArgs is called
       * Then: packageManager should be undefined
       */
      // Arrange
      const argv = ['my-app'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.packageManager).toBeUndefined();
    });
  });

  // ==================== Combined Options ====================

  describe('when parsing multiple options together', () => {
    it('should parse all options: --no-git and --no-install', () => {
      /**
       * Given: CLI args with --no-git and --no-install flags
       * When: parseArgs is called
       * Then: Both git and install should be false
       */
      // Arrange
      const argv = ['my-app', '--no-git', '--no-install'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.git).toBe(false);
      expect(result.install).toBe(false);
    });

    it('should parse all options: -e, -t, --package-manager', () => {
      /**
       * Given: CLI args with multiple options
       * When: parseArgs is called
       * Then: All options should be correctly parsed
       */
      // Arrange
      const argv = ['my-app', '-e', 'counter', '-t', 'minimal', '--package-manager', 'pnpm'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      expect(result.example).toBe('counter');
      expect(result.template).toBe('minimal');
      expect(result.packageManager).toBe('pnpm');
    });

    it('should parse full set of options', () => {
      /**
       * Given: CLI args with all possible options
       * When: parseArgs is called
       * Then: All options should be correctly parsed
       */
      // Arrange
      const argv = [
        'my-app',
        '--example',
        'todo',
        '--template',
        'full',
        '--no-git',
        '--no-install',
        '--package-manager',
        'yarn',
      ];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result).toEqual({
        projectName: 'my-app',
        example: 'todo',
        template: 'full',
        list: false,
        git: false,
        install: false,
        packageManager: 'yarn',
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('when parsing edge cases', () => {
    it('should return default options when argv is empty', () => {
      /**
       * Given: Empty CLI args
       * When: parseArgs is called
       * Then: All options should have default values
       */
      // Arrange
      const argv: string[] = [];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result).toEqual(DEFAULT_OPTIONS);
    });

    it('should handle project name "." for current directory', () => {
      /**
       * Given: CLI args with "." as project name
       * When: parseArgs is called
       * Then: projectName should be "."
       */
      // Arrange
      const argv = ['.'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('.');
    });

    it('should ignore unknown options', () => {
      /**
       * Given: CLI args with unknown option
       * When: parseArgs is called
       * Then: Unknown option should be ignored
       */
      // Arrange
      const argv = ['my-app', '--unknown-option', 'value'];

      // Act
      const result = parseArgs(argv);

      // Assert
      expect(result.projectName).toBe('my-app');
      // Should not throw and should return valid options
      expect(result.template).toBe('default');
    });
  });
});
