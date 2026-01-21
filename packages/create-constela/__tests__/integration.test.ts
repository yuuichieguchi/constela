/**
 * Integration tests for create-constela main module.
 *
 * Coverage:
 * - run function: Main CLI orchestration
 * - --list option: Display available templates and examples
 * - Basic project creation: Copy template to destination
 * - With example: Use example template instead of default
 * - --no-git option: Skip git initialization
 * - --no-install option: Skip dependency installation
 * - Full flow: Parse args, prompts, copy, git init, install, success message
 *
 * TDD Red Phase: These tests MUST FAIL until implementation exists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ==================== Mocks ====================

// Mock cli module
vi.mock('../src/cli.js', () => ({
  parseArgs: vi.fn(),
}));

// Mock prompts module
vi.mock('../src/prompts.js', () => ({
  runPrompts: vi.fn(),
}));

// Mock templates module
vi.mock('../src/templates.js', () => ({
  getAvailableTemplates: vi.fn(),
  getAvailableExamples: vi.fn(),
  getTemplatePath: vi.fn(),
  getExamplePath: vi.fn(),
  templateExists: vi.fn(),
  exampleExists: vi.fn(),
}));

// Mock copier module
vi.mock('../src/copier.js', () => ({
  copyTemplate: vi.fn(),
}));

// Mock helpers module
vi.mock('../src/helpers/index.js', () => ({
  initGit: vi.fn(),
  installDependencies: vi.fn(),
  detectPackageManager: vi.fn(),
}));

// Mock console methods - will be re-initialized in beforeEach
let mockConsoleLog: ReturnType<typeof vi.spyOn>;
let mockConsoleError: ReturnType<typeof vi.spyOn>;

// Import mocked modules
import { parseArgs } from '../src/cli.js';
import { runPrompts } from '../src/prompts.js';
import {
  getAvailableTemplates,
  getAvailableExamples,
  getTemplatePath,
  getExamplePath,
  templateExists,
  exampleExists,
} from '../src/templates.js';
import { copyTemplate } from '../src/copier.js';
import {
  initGit,
  installDependencies,
  detectPackageManager,
} from '../src/helpers/index.js';

// Import the module under test (will fail until implemented)
import { run, type CreateOptions } from '../src/index.js';

// ==================== Test Fixtures ====================

const MOCK_TEMPLATES = ['default', 'minimal'];
const MOCK_EXAMPLES = ['counter', 'todo'];
const MOCK_TEMPLATE_PATH = '/mock/templates/default';
const MOCK_EXAMPLE_PATH = '/mock/templates/examples/counter';

// ==================== Tests ====================

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-initialize console mocks (restored by afterEach)
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock implementations
    vi.mocked(getAvailableTemplates).mockReturnValue(MOCK_TEMPLATES);
    vi.mocked(getAvailableExamples).mockReturnValue(MOCK_EXAMPLES);
    vi.mocked(getTemplatePath).mockReturnValue(MOCK_TEMPLATE_PATH);
    vi.mocked(getExamplePath).mockReturnValue(MOCK_EXAMPLE_PATH);
    vi.mocked(templateExists).mockReturnValue(true);
    vi.mocked(exampleExists).mockReturnValue(true);
    vi.mocked(copyTemplate).mockResolvedValue(undefined);
    vi.mocked(initGit).mockResolvedValue(true);
    vi.mocked(installDependencies).mockResolvedValue(true);
    vi.mocked(detectPackageManager).mockReturnValue('npm');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== --list Option ====================

  describe('when --list option is provided', () => {
    it('should display available templates and examples', async () => {
      /**
       * Given: CLI args with --list flag
       * When: run is called
       * Then: Available templates and examples should be displayed
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: undefined,
        example: undefined,
        template: 'default',
        list: true,
        git: true,
        install: true,
        packageManager: undefined,
      });

      // Act
      await run(['--list']);

      // Assert
      expect(parseArgs).toHaveBeenCalledWith(['--list']);
      expect(getAvailableTemplates).toHaveBeenCalled();
      expect(getAvailableExamples).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should not create a project when --list is provided', async () => {
      /**
       * Given: CLI args with --list flag
       * When: run is called
       * Then: No project should be created
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: undefined,
        example: undefined,
        template: 'default',
        list: true,
        git: true,
        install: true,
        packageManager: undefined,
      });

      // Act
      await run(['--list']);

      // Assert
      expect(copyTemplate).not.toHaveBeenCalled();
      expect(runPrompts).not.toHaveBeenCalled();
      expect(initGit).not.toHaveBeenCalled();
      expect(installDependencies).not.toHaveBeenCalled();
    });
  });

  // ==================== Basic Project Creation ====================

  describe('when creating a basic project', () => {
    it('should copy template to destination directory', async () => {
      /**
       * Given: CLI args with project name
       * When: run is called
       * Then: Template should be copied to project directory
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app']);

      // Assert
      expect(getTemplatePath).toHaveBeenCalledWith('default');
      expect(copyTemplate).toHaveBeenCalledWith(
        MOCK_TEMPLATE_PATH,
        expect.stringContaining('my-app'),
        expect.objectContaining({ projectName: 'my-app' })
      );
    });

    it('should create project directory with correct name', async () => {
      /**
       * Given: CLI args with project name
       * When: run is called
       * Then: Project directory should be created with that name
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-new-project',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-new-project',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-new-project']);

      // Assert
      expect(copyTemplate).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('my-new-project'),
        expect.any(Object)
      );
    });
  });

  // ==================== With Example ====================

  describe('when creating a project with example', () => {
    it('should use example template instead of default', async () => {
      /**
       * Given: CLI args with --example flag
       * When: run is called
       * Then: Example template should be used instead of default
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: 'counter',
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: undefined,
        example: 'counter',
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '--example', 'counter']);

      // Assert
      expect(getExamplePath).toHaveBeenCalledWith('counter');
      expect(copyTemplate).toHaveBeenCalledWith(
        MOCK_EXAMPLE_PATH,
        expect.stringContaining('my-app'),
        expect.objectContaining({ projectName: 'my-app' })
      );
    });

    it('should not use default template when example is specified', async () => {
      /**
       * Given: CLI args with --example flag
       * When: run is called
       * Then: getTemplatePath should not be called for default template
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: 'todo',
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: undefined,
        example: 'todo',
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '-e', 'todo']);

      // Assert
      expect(getExamplePath).toHaveBeenCalledWith('todo');
      // Template path should not be called when using example
      expect(copyTemplate).toHaveBeenCalledWith(
        MOCK_EXAMPLE_PATH,
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ==================== --no-git Option ====================

  describe('when --no-git option is provided', () => {
    it('should skip git initialization', async () => {
      /**
       * Given: CLI args with --no-git flag
       * When: run is called
       * Then: Git should not be initialized
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: false,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '--no-git']);

      // Assert
      expect(initGit).not.toHaveBeenCalled();
    });

    it('should still copy template when --no-git is provided', async () => {
      /**
       * Given: CLI args with --no-git flag
       * When: run is called
       * Then: Template should still be copied
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: false,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '--no-git']);

      // Assert
      expect(copyTemplate).toHaveBeenCalled();
    });
  });

  // ==================== --no-install Option ====================

  describe('when --no-install option is provided', () => {
    it('should skip dependency installation', async () => {
      /**
       * Given: CLI args with --no-install flag
       * When: run is called
       * Then: Dependencies should not be installed
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: false,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '--no-install']);

      // Assert
      expect(installDependencies).not.toHaveBeenCalled();
    });

    it('should still initialize git when --no-install is provided', async () => {
      /**
       * Given: CLI args with --no-install flag (git enabled)
       * When: run is called
       * Then: Git should still be initialized
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: false,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '--no-install']);

      // Assert
      expect(initGit).toHaveBeenCalled();
    });
  });

  // ==================== Full Flow ====================

  describe('when running full flow', () => {
    it('should parse args as first step', async () => {
      /**
       * Given: CLI args
       * When: run is called
       * Then: parseArgs should be called with the provided args
       */
      // Arrange
      const argv = ['my-app', '--package-manager', 'pnpm'];
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'pnpm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'pnpm',
      });

      // Act
      await run(argv);

      // Assert
      expect(parseArgs).toHaveBeenCalledWith(argv);
    });

    it('should run prompts if project name is not provided', async () => {
      /**
       * Given: CLI args without project name
       * When: run is called
       * Then: runPrompts should be called to get missing information
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: undefined,
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: undefined,
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'prompted-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run([]);

      // Assert
      expect(runPrompts).toHaveBeenCalled();
    });

    it('should copy template after prompts', async () => {
      /**
       * Given: CLI args with project name
       * When: run is called
       * Then: Template should be copied after args/prompts are processed
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app']);

      // Assert
      expect(copyTemplate).toHaveBeenCalled();
    });

    it('should initialize git after copying template', async () => {
      /**
       * Given: CLI args with git enabled (default)
       * When: run is called
       * Then: Git should be initialized after template is copied
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app']);

      // Assert
      expect(initGit).toHaveBeenCalledWith(expect.stringContaining('my-app'));
    });

    it('should install dependencies after git initialization', async () => {
      /**
       * Given: CLI args with install enabled (default)
       * When: run is called
       * Then: Dependencies should be installed after git initialization
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app']);

      // Assert
      expect(installDependencies).toHaveBeenCalledWith(
        expect.stringContaining('my-app'),
        'npm'
      );
    });

    it('should show success message after completion', async () => {
      /**
       * Given: CLI args for a complete project creation
       * When: run is called
       * Then: Success message should be displayed
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app']);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
      // At least one log call should contain success-related message
      const logCalls = mockConsoleLog.mock.calls.flat();
      expect(logCalls.some((msg) => typeof msg === 'string')).toBe(true);
    });

    it('should use specified package manager for installation', async () => {
      /**
       * Given: CLI args with --package-manager pnpm
       * When: run is called
       * Then: pnpm should be used for dependency installation
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'pnpm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'pnpm',
      });

      // Act
      await run(['my-app', '--package-manager', 'pnpm']);

      // Assert
      expect(installDependencies).toHaveBeenCalledWith(
        expect.any(String),
        'pnpm'
      );
    });

    it('should execute all steps in correct order', async () => {
      /**
       * Given: CLI args for full project creation
       * When: run is called
       * Then: All steps should execute in order: parse -> prompts -> copy -> git -> install
       */
      // Arrange
      const callOrder: string[] = [];

      vi.mocked(parseArgs).mockImplementation(() => {
        callOrder.push('parseArgs');
        return {
          projectName: 'my-app',
          example: undefined,
          template: 'default',
          list: false,
          git: true,
          install: true,
          packageManager: 'npm',
        };
      });
      vi.mocked(runPrompts).mockImplementation(async () => {
        callOrder.push('runPrompts');
        return {
          projectName: 'my-app',
          template: 'default',
          example: undefined,
          packageManager: 'npm',
        };
      });
      vi.mocked(copyTemplate).mockImplementation(async () => {
        callOrder.push('copyTemplate');
      });
      vi.mocked(initGit).mockImplementation(async () => {
        callOrder.push('initGit');
        return true;
      });
      vi.mocked(installDependencies).mockImplementation(async () => {
        callOrder.push('installDependencies');
        return true;
      });

      // Act
      await run(['my-app']);

      // Assert
      expect(callOrder).toEqual([
        'parseArgs',
        'runPrompts',
        'copyTemplate',
        'initGit',
        'installDependencies',
      ]);
    });
  });

  // ==================== Combined Options ====================

  describe('when using combined options', () => {
    it('should handle --no-git and --no-install together', async () => {
      /**
       * Given: CLI args with both --no-git and --no-install
       * When: run is called
       * Then: Neither git nor install should be executed
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: false,
        install: false,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });

      // Act
      await run(['my-app', '--no-git', '--no-install']);

      // Assert
      expect(copyTemplate).toHaveBeenCalled();
      expect(initGit).not.toHaveBeenCalled();
      expect(installDependencies).not.toHaveBeenCalled();
    });

    it('should handle example with custom package manager', async () => {
      /**
       * Given: CLI args with example and package manager
       * When: run is called
       * Then: Example should be copied and package manager should be used
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: 'counter',
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'yarn',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: undefined,
        example: 'counter',
        packageManager: 'yarn',
      });

      // Act
      await run(['my-app', '-e', 'counter', '--package-manager', 'yarn']);

      // Assert
      expect(getExamplePath).toHaveBeenCalledWith('counter');
      expect(installDependencies).toHaveBeenCalledWith(
        expect.any(String),
        'yarn'
      );
    });
  });

  // ==================== Edge Cases ====================

  describe('when handling edge cases', () => {
    it('should use default argv when not provided', async () => {
      /**
       * Given: run is called without argv argument
       * When: run is called
       * Then: Should use process.argv by default
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: undefined,
        example: undefined,
        template: 'default',
        list: true,
        git: true,
        install: true,
        packageManager: undefined,
      });

      // Act
      await run();

      // Assert
      expect(parseArgs).toHaveBeenCalled();
    });

    it('should handle template that does not exist', async () => {
      /**
       * Given: CLI args with non-existent template
       * When: run is called
       * Then: Should throw or handle error appropriately
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'nonexistent',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'nonexistent',
        example: undefined,
        packageManager: 'npm',
      });
      vi.mocked(templateExists).mockReturnValue(false);

      // Act & Assert
      await expect(run(['my-app', '-t', 'nonexistent'])).rejects.toThrow();
    });

    it('should handle example that does not exist', async () => {
      /**
       * Given: CLI args with non-existent example
       * When: run is called
       * Then: Should throw or handle error appropriately
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: 'nonexistent',
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: undefined,
        example: 'nonexistent',
        packageManager: 'npm',
      });
      vi.mocked(exampleExists).mockReturnValue(false);

      // Act & Assert
      await expect(run(['my-app', '-e', 'nonexistent'])).rejects.toThrow();
    });

    it('should handle git initialization failure gracefully', async () => {
      /**
       * Given: Git initialization fails
       * When: run is called
       * Then: Should continue without throwing (git init is optional)
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });
      vi.mocked(initGit).mockResolvedValue(false);

      // Act
      await run(['my-app']);

      // Assert - should not throw, process continues
      expect(initGit).toHaveBeenCalled();
      expect(installDependencies).toHaveBeenCalled();
    });

    it('should handle install failure gracefully', async () => {
      /**
       * Given: Dependency installation fails
       * When: run is called
       * Then: Should continue or report error appropriately
       */
      // Arrange
      vi.mocked(parseArgs).mockReturnValue({
        projectName: 'my-app',
        example: undefined,
        template: 'default',
        list: false,
        git: true,
        install: true,
        packageManager: 'npm',
      });
      vi.mocked(runPrompts).mockResolvedValue({
        projectName: 'my-app',
        template: 'default',
        example: undefined,
        packageManager: 'npm',
      });
      vi.mocked(installDependencies).mockResolvedValue(false);

      // Act
      await run(['my-app']);

      // Assert - should not throw, process continues
      expect(installDependencies).toHaveBeenCalled();
    });
  });
});
