/**
 * Test module for create-constela interactive prompts.
 *
 * Coverage:
 * - promptProjectName: Ask for project name if not provided
 * - promptTemplate: Show template selection
 * - promptExample: Show example selection
 * - promptPackageManager: Ask for package manager preference
 * - runPrompts: Main function that orchestrates all prompts
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @inquirer/prompts before importing the module under test
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
}));

// Import mocked modules
import { input, select } from '@inquirer/prompts';

// Import the module under test (will fail until implemented)
import {
  promptProjectName,
  promptTemplate,
  promptExample,
  promptPackageManager,
  runPrompts,
  type PromptResult,
} from '../src/prompts.js';

import type { CliOptions } from '../src/cli.js';

// ==================== Test Fixtures ====================

const MOCK_TEMPLATES = ['default', 'minimal', 'full'];
const MOCK_EXAMPLES = ['counter', 'todo', 'blog'];

const DEFAULT_CLI_OPTIONS: CliOptions = {
  projectName: undefined,
  example: undefined,
  template: 'default',
  list: false,
  git: true,
  install: true,
  packageManager: undefined,
};

// ==================== Tests ====================

describe('prompts module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== promptProjectName ====================

  describe('promptProjectName', () => {
    it('should return user input when user enters a project name', async () => {
      /**
       * Given: User enters "my-awesome-project" when prompted
       * When: promptProjectName is called
       * Then: It should return "my-awesome-project"
       */
      // Arrange
      vi.mocked(input).mockResolvedValue('my-awesome-project');

      // Act
      const result = await promptProjectName();

      // Assert
      expect(result).toBe('my-awesome-project');
    });

    it('should call input with correct message', async () => {
      /**
       * Given: promptProjectName is called
       * When: The input prompt is invoked
       * Then: It should ask for the project name with appropriate message
       */
      // Arrange
      vi.mocked(input).mockResolvedValue('test-project');

      // Act
      await promptProjectName();

      // Assert
      expect(input).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/project name/i),
        })
      );
    });

    it('should suggest "my-constela-app" as default value', async () => {
      /**
       * Given: promptProjectName is called
       * When: The input prompt is invoked
       * Then: It should have a default suggestion
       */
      // Arrange
      vi.mocked(input).mockResolvedValue('my-constela-app');

      // Act
      await promptProjectName();

      // Assert
      expect(input).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'my-constela-app',
        })
      );
    });

    it('should handle project name with path', async () => {
      /**
       * Given: User enters a path as project name
       * When: promptProjectName is called
       * Then: It should return the full path
       */
      // Arrange
      vi.mocked(input).mockResolvedValue('./projects/my-app');

      // Act
      const result = await promptProjectName();

      // Assert
      expect(result).toBe('./projects/my-app');
    });

    it('should handle project name with "." for current directory', async () => {
      /**
       * Given: User enters "." as project name
       * When: promptProjectName is called
       * Then: It should return "."
       */
      // Arrange
      vi.mocked(input).mockResolvedValue('.');

      // Act
      const result = await promptProjectName();

      // Assert
      expect(result).toBe('.');
    });
  });

  // ==================== promptTemplate ====================

  describe('promptTemplate', () => {
    it('should return selected template', async () => {
      /**
       * Given: User selects "minimal" template
       * When: promptTemplate is called with available templates
       * Then: It should return "minimal"
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('minimal');

      // Act
      const result = await promptTemplate(MOCK_TEMPLATES);

      // Assert
      expect(result).toBe('minimal');
    });

    it('should show all available templates as choices', async () => {
      /**
       * Given: Available templates are ["default", "minimal", "full"]
       * When: promptTemplate is called
       * Then: The select prompt should include all templates as choices
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('default');

      // Act
      await promptTemplate(MOCK_TEMPLATES);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'default' }),
            expect.objectContaining({ value: 'minimal' }),
            expect.objectContaining({ value: 'full' }),
          ]),
        })
      );
    });

    it('should call select with correct message', async () => {
      /**
       * Given: promptTemplate is called
       * When: The select prompt is invoked
       * Then: It should ask to select a template
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('default');

      // Act
      await promptTemplate(MOCK_TEMPLATES);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/template/i),
        })
      );
    });

    it('should handle single template option', async () => {
      /**
       * Given: Only one template is available
       * When: promptTemplate is called
       * Then: It should show the single template as a choice
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('default');

      // Act
      const result = await promptTemplate(['default']);

      // Assert
      expect(result).toBe('default');
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'default' }),
          ]),
        })
      );
    });
  });

  // ==================== promptExample ====================

  describe('promptExample', () => {
    it('should return selected example', async () => {
      /**
       * Given: User selects "counter" example
       * When: promptExample is called with available examples
       * Then: It should return "counter"
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('counter');

      // Act
      const result = await promptExample(MOCK_EXAMPLES);

      // Assert
      expect(result).toBe('counter');
    });

    it('should show all available examples as choices', async () => {
      /**
       * Given: Available examples are ["counter", "todo", "blog"]
       * When: promptExample is called
       * Then: The select prompt should include all examples as choices
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('counter');

      // Act
      await promptExample(MOCK_EXAMPLES);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'counter' }),
            expect.objectContaining({ value: 'todo' }),
            expect.objectContaining({ value: 'blog' }),
          ]),
        })
      );
    });

    it('should call select with correct message', async () => {
      /**
       * Given: promptExample is called
       * When: The select prompt is invoked
       * Then: It should ask to select an example
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('todo');

      // Act
      await promptExample(MOCK_EXAMPLES);

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/example/i),
        })
      );
    });

    it('should handle single example option', async () => {
      /**
       * Given: Only one example is available
       * When: promptExample is called
       * Then: It should show the single example as a choice
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('counter');

      // Act
      const result = await promptExample(['counter']);

      // Assert
      expect(result).toBe('counter');
    });
  });

  // ==================== promptPackageManager ====================

  describe('promptPackageManager', () => {
    it('should return npm when user selects npm', async () => {
      /**
       * Given: User selects "npm" as package manager
       * When: promptPackageManager is called
       * Then: It should return "npm"
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('npm');

      // Act
      const result = await promptPackageManager();

      // Assert
      expect(result).toBe('npm');
    });

    it('should return yarn when user selects yarn', async () => {
      /**
       * Given: User selects "yarn" as package manager
       * When: promptPackageManager is called
       * Then: It should return "yarn"
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('yarn');

      // Act
      const result = await promptPackageManager();

      // Assert
      expect(result).toBe('yarn');
    });

    it('should return pnpm when user selects pnpm', async () => {
      /**
       * Given: User selects "pnpm" as package manager
       * When: promptPackageManager is called
       * Then: It should return "pnpm"
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('pnpm');

      // Act
      const result = await promptPackageManager();

      // Assert
      expect(result).toBe('pnpm');
    });

    it('should show npm, yarn, and pnpm as choices', async () => {
      /**
       * Given: promptPackageManager is called
       * When: The select prompt is invoked
       * Then: It should show npm, yarn, and pnpm as choices
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('npm');

      // Act
      await promptPackageManager();

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'npm' }),
            expect.objectContaining({ value: 'yarn' }),
            expect.objectContaining({ value: 'pnpm' }),
          ]),
        })
      );
    });

    it('should call select with correct message', async () => {
      /**
       * Given: promptPackageManager is called
       * When: The select prompt is invoked
       * Then: It should ask to select a package manager
       */
      // Arrange
      vi.mocked(select).mockResolvedValue('npm');

      // Act
      await promptPackageManager();

      // Assert
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/package manager/i),
        })
      );
    });
  });

  // ==================== runPrompts ====================

  describe('runPrompts', () => {
    describe('when all values are provided in options', () => {
      it('should skip all prompts and return provided values', async () => {
        /**
         * Given: CLI options with all values provided
         * When: runPrompts is called
         * Then: No prompts should be shown and provided values should be returned
         */
        // Arrange
        const options: CliOptions = {
          projectName: 'my-app',
          example: undefined,
          template: 'minimal',
          list: false,
          git: true,
          install: true,
          packageManager: 'pnpm',
        };

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(input).not.toHaveBeenCalled();
        expect(select).not.toHaveBeenCalled();
        expect(result).toEqual({
          projectName: 'my-app',
          template: 'minimal',
          example: undefined,
          packageManager: 'pnpm',
        });
      });

      it('should use example instead of template when example is provided', async () => {
        /**
         * Given: CLI options with example provided
         * When: runPrompts is called
         * Then: It should use example and ignore template
         */
        // Arrange
        const options: CliOptions = {
          projectName: 'my-app',
          example: 'counter',
          template: 'default',
          list: false,
          git: true,
          install: true,
          packageManager: 'npm',
        };

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(result).toEqual({
          projectName: 'my-app',
          template: undefined,
          example: 'counter',
          packageManager: 'npm',
        });
      });
    });

    describe('when no values are provided', () => {
      it('should prompt for project name when not provided', async () => {
        /**
         * Given: CLI options without project name
         * When: runPrompts is called
         * Then: It should prompt for project name
         */
        // Arrange
        const options: CliOptions = {
          ...DEFAULT_CLI_OPTIONS,
          packageManager: 'npm', // Provide to avoid packageManager prompt
        };
        vi.mocked(input).mockResolvedValue('prompted-project');

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(input).toHaveBeenCalled();
        expect(result.projectName).toBe('prompted-project');
      });

      it('should prompt for package manager when not provided', async () => {
        /**
         * Given: CLI options without package manager
         * When: runPrompts is called
         * Then: It should prompt for package manager
         */
        // Arrange
        const options: CliOptions = {
          ...DEFAULT_CLI_OPTIONS,
          projectName: 'my-app', // Provide to avoid projectName prompt
        };
        vi.mocked(select).mockResolvedValue('yarn');

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(select).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(/package manager/i),
          })
        );
        expect(result.packageManager).toBe('yarn');
      });

      it('should prompt for all missing values', async () => {
        /**
         * Given: CLI options with no values (except defaults)
         * When: runPrompts is called
         * Then: It should prompt for project name and package manager
         */
        // Arrange
        const options: CliOptions = { ...DEFAULT_CLI_OPTIONS };
        vi.mocked(input).mockResolvedValue('my-new-app');
        vi.mocked(select).mockResolvedValue('pnpm');

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(input).toHaveBeenCalled(); // For project name
        expect(select).toHaveBeenCalled(); // For package manager
        expect(result.projectName).toBe('my-new-app');
        expect(result.packageManager).toBe('pnpm');
      });
    });

    describe('when partial values are provided', () => {
      it('should only prompt for missing project name', async () => {
        /**
         * Given: CLI options with package manager but no project name
         * When: runPrompts is called
         * Then: It should only prompt for project name
         */
        // Arrange
        const options: CliOptions = {
          ...DEFAULT_CLI_OPTIONS,
          packageManager: 'npm',
        };
        vi.mocked(input).mockResolvedValue('prompted-name');

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(input).toHaveBeenCalledTimes(1);
        expect(result.projectName).toBe('prompted-name');
        expect(result.packageManager).toBe('npm');
      });

      it('should only prompt for missing package manager', async () => {
        /**
         * Given: CLI options with project name but no package manager
         * When: runPrompts is called
         * Then: It should only prompt for package manager
         */
        // Arrange
        const options: CliOptions = {
          ...DEFAULT_CLI_OPTIONS,
          projectName: 'my-provided-app',
        };
        vi.mocked(select).mockResolvedValue('yarn');

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(input).not.toHaveBeenCalled();
        expect(select).toHaveBeenCalled();
        expect(result.projectName).toBe('my-provided-app');
        expect(result.packageManager).toBe('yarn');
      });
    });

    describe('return type', () => {
      it('should return PromptResult with all required fields', async () => {
        /**
         * Given: Complete CLI options
         * When: runPrompts is called
         * Then: It should return a valid PromptResult
         */
        // Arrange
        const options: CliOptions = {
          projectName: 'test-app',
          example: undefined,
          template: 'default',
          list: false,
          git: true,
          install: true,
          packageManager: 'npm',
        };

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(result).toHaveProperty('projectName');
        expect(result).toHaveProperty('packageManager');
        expect(result).toHaveProperty('template');
        expect(typeof result.projectName).toBe('string');
        expect(['npm', 'yarn', 'pnpm']).toContain(result.packageManager);
      });

      it('should return template as undefined when example is set', async () => {
        /**
         * Given: CLI options with example
         * When: runPrompts is called
         * Then: template should be undefined in result
         */
        // Arrange
        const options: CliOptions = {
          projectName: 'test-app',
          example: 'counter',
          template: 'default',
          list: false,
          git: true,
          install: true,
          packageManager: 'npm',
        };

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(result.example).toBe('counter');
        expect(result.template).toBeUndefined();
      });

      it('should return example as undefined when template is used', async () => {
        /**
         * Given: CLI options with template but no example
         * When: runPrompts is called
         * Then: example should be undefined in result
         */
        // Arrange
        const options: CliOptions = {
          projectName: 'test-app',
          example: undefined,
          template: 'minimal',
          list: false,
          git: true,
          install: true,
          packageManager: 'npm',
        };

        // Act
        const result = await runPrompts(options, MOCK_TEMPLATES, MOCK_EXAMPLES);

        // Assert
        expect(result.template).toBe('minimal');
        expect(result.example).toBeUndefined();
      });
    });
  });
});
