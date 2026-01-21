/**
 * Test module for create-constela copier functionality.
 *
 * Coverage:
 * - copyTemplate: Copy template files to destination with variable substitution
 * - Variable substitution in .template files (e.g., {{projectName}} → actual value)
 * - Rename gitignore to .gitignore
 * - Skip .template extension in output
 * - Directory structure preservation
 * - Error handling
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';

// Mock the fs modules
vi.mock('node:fs/promises');
vi.mock('node:fs');

// Import the module under test (will fail until implemented)
import { copyTemplate, type CopyOptions } from '../src/copier.js';

// ==================== Test Fixtures ====================

const TEMPLATE_PATH = '/mock/templates/default';
const DEST_PATH = '/mock/projects/my-app';

const DEFAULT_OPTIONS: CopyOptions = {
  projectName: 'my-app',
};

/**
 * Helper to create a mock Dirent object
 */
function createMockDirent(name: string, isDirectory: boolean): fsSync.Dirent {
  return {
    name,
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: '',
    parentPath: '',
  };
}

// ==================== Tests ====================

describe('copyTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.copyFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Basic Copy ====================

  describe('basic copy functionality', () => {
    it('should copy files from template to destination', async () => {
      /**
       * Given: A template directory with files
       * When: copyTemplate is called
       * Then: Files should be copied to destination
       */
      // Arrange
      const mockDirents = [
        createMockDirent('README.md', false),
        createMockDirent('src', true),
      ];
      vi.mocked(fs.readdir).mockResolvedValue(mockDirents as unknown as fsSync.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue('# README content');
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(DEST_PATH, { recursive: true });
    });

    it('should preserve directory structure', async () => {
      /**
       * Given: A template with nested directories
       * When: copyTemplate is called
       * Then: The directory structure should be preserved
       */
      // Arrange
      // First call returns root contents
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce([
          createMockDirent('src', true),
        ] as unknown as fsSync.Dirent[])
        // Second call returns src contents
        .mockResolvedValueOnce([
          createMockDirent('index.ts', false),
        ] as unknown as fsSync.Dirent[]);

      vi.mocked(fsSync.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as fsSync.Stats)
        .mockReturnValueOnce({ isDirectory: () => false } as fsSync.Stats);

      vi.mocked(fs.readFile).mockResolvedValue('export default {}');

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'src'),
        { recursive: true }
      );
    });

    it('should create destination directory if it does not exist', async () => {
      /**
       * Given: Destination directory does not exist
       * When: copyTemplate is called
       * Then: The destination directory should be created
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([] as unknown as fsSync.Dirent[]);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(DEST_PATH, { recursive: true });
    });
  });

  // ==================== Template Substitution ====================

  describe('template substitution', () => {
    it('should replace {{projectName}} with actual project name in .template files', async () => {
      /**
       * Given: A .template file containing {{projectName}}
       * When: copyTemplate is called
       * Then: {{projectName}} should be replaced with the actual project name
       */
      // Arrange
      const templateContent = JSON.stringify({
        name: '{{projectName}}',
        version: '1.0.0',
      });
      const expectedContent = JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('package.json.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'package.json'),
        expectedContent
      );
    });

    it('should rename .template files by removing the extension', async () => {
      /**
       * Given: A file named package.json.template
       * When: copyTemplate is called
       * Then: The output file should be named package.json
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('package.json.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue('{"name": "test"}');

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'package.json'),
        expect.any(String)
      );
    });

    it('should replace multiple occurrences of {{projectName}}', async () => {
      /**
       * Given: A .template file with multiple {{projectName}} occurrences
       * When: copyTemplate is called
       * Then: All occurrences should be replaced
       */
      // Arrange
      const templateContent = `
# {{projectName}}
Welcome to {{projectName}}!
Run: npm start to start {{projectName}}
      `;
      const expectedContent = `
# my-app
Welcome to my-app!
Run: npm start to start my-app
      `;

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('README.md.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'README.md'),
        expectedContent
      );
    });

    it('should support custom variables in addition to projectName', async () => {
      /**
       * Given: A .template file with custom variables like {{author}}
       * When: copyTemplate is called with custom options
       * Then: All variables should be replaced
       */
      // Arrange
      const templateContent = '{"name": "{{projectName}}", "author": "{{author}}"}';
      const expectedContent = '{"name": "my-app", "author": "John Doe"}';

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('package.json.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);

      const options: CopyOptions = {
        projectName: 'my-app',
        author: 'John Doe',
      };

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, options);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'package.json'),
        expectedContent
      );
    });
  });

  // ==================== gitignore Handling ====================

  describe('gitignore handling', () => {
    it('should rename gitignore to .gitignore', async () => {
      /**
       * Given: A template contains a file named "gitignore"
       * When: copyTemplate is called
       * Then: The file should be copied as ".gitignore"
       */
      // Arrange
      const gitignoreContent = 'node_modules/\ndist/\n.env';

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('gitignore', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(gitignoreContent);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, '.gitignore'),
        gitignoreContent
      );
    });

    it('should handle gitignore in nested directories', async () => {
      /**
       * Given: A template contains gitignore in a subdirectory
       * When: copyTemplate is called
       * Then: The file should be copied as .gitignore in the subdirectory
       */
      // Arrange
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce([
          createMockDirent('subdir', true),
        ] as unknown as fsSync.Dirent[])
        .mockResolvedValueOnce([
          createMockDirent('gitignore', false),
        ] as unknown as fsSync.Dirent[]);

      vi.mocked(fsSync.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as fsSync.Stats)
        .mockReturnValueOnce({ isDirectory: () => false } as fsSync.Stats);

      vi.mocked(fs.readFile).mockResolvedValue('*.log');

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'subdir', '.gitignore'),
        '*.log'
      );
    });
  });

  // ==================== Directory Creation ====================

  describe('directory creation', () => {
    it('should create nested directories if they do not exist', async () => {
      /**
       * Given: A template with deeply nested directories
       * When: copyTemplate is called
       * Then: All directories should be created recursively
       */
      // Arrange
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce([
          createMockDirent('src', true),
        ] as unknown as fsSync.Dirent[])
        .mockResolvedValueOnce([
          createMockDirent('components', true),
        ] as unknown as fsSync.Dirent[])
        .mockResolvedValueOnce([
          createMockDirent('Button.tsx', false),
        ] as unknown as fsSync.Dirent[]);

      vi.mocked(fsSync.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as fsSync.Stats)
        .mockReturnValueOnce({ isDirectory: () => true } as fsSync.Stats)
        .mockReturnValueOnce({ isDirectory: () => false } as fsSync.Stats);

      vi.mocked(fs.readFile).mockResolvedValue('export const Button = () => {}');

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'src'),
        { recursive: true }
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'src', 'components'),
        { recursive: true }
      );
    });

    it('should use recursive: true when creating directories', async () => {
      /**
       * Given: A template directory
       * When: copyTemplate is called
       * Then: mkdir should be called with recursive: true
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([] as unknown as fsSync.Dirent[]);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(
        DEST_PATH,
        expect.objectContaining({ recursive: true })
      );
    });
  });

  // ==================== Preserve Non-Template Files ====================

  describe('preserve non-template files', () => {
    it('should copy files without .template extension as-is', async () => {
      /**
       * Given: A template with regular files (not .template)
       * When: copyTemplate is called
       * Then: Files should be copied without modification
       */
      // Arrange
      const fileContent = '# My Static Content';

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('README.md', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(fileContent);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.copyFile).toHaveBeenCalledWith(
        path.join(TEMPLATE_PATH, 'README.md'),
        path.join(DEST_PATH, 'README.md')
      );
    });

    it('should preserve binary files without modification', async () => {
      /**
       * Given: A template with binary files (e.g., images)
       * When: copyTemplate is called
       * Then: Binary files should be copied as-is
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('logo.png', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.copyFile).toHaveBeenCalledWith(
        path.join(TEMPLATE_PATH, 'logo.png'),
        path.join(DEST_PATH, 'logo.png')
      );
    });

    it('should handle mix of template and non-template files', async () => {
      /**
       * Given: A template with both .template and regular files
       * When: copyTemplate is called
       * Then: Each file type should be handled appropriately
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('package.json.template', false),
        createMockDirent('README.md', false),
        createMockDirent('logo.png', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue('{"name": "{{projectName}}"}');

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      // .template file should be processed and written
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'package.json'),
        expect.any(String)
      );
      // Regular files should be copied
      expect(fs.copyFile).toHaveBeenCalledWith(
        path.join(TEMPLATE_PATH, 'README.md'),
        path.join(DEST_PATH, 'README.md')
      );
      expect(fs.copyFile).toHaveBeenCalledWith(
        path.join(TEMPLATE_PATH, 'logo.png'),
        path.join(DEST_PATH, 'logo.png')
      );
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw error when template path does not exist', async () => {
      /**
       * Given: Template path does not exist
       * When: copyTemplate is called
       * Then: An error should be thrown
       */
      // Arrange
      const error = new Error('ENOENT: no such file or directory');
      vi.mocked(fs.readdir).mockRejectedValue(error);

      // Act & Assert
      await expect(
        copyTemplate('/nonexistent/path', DEST_PATH, DEFAULT_OPTIONS)
      ).rejects.toThrow();
    });

    it('should throw error when destination is not writable', async () => {
      /**
       * Given: Destination directory is not writable
       * When: copyTemplate is called
       * Then: An error should be thrown
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([] as unknown as fsSync.Dirent[]);
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('EACCES: permission denied'));

      // Act & Assert
      await expect(
        copyTemplate(TEMPLATE_PATH, '/readonly/path', DEFAULT_OPTIONS)
      ).rejects.toThrow();
    });

    it('should throw error when file write fails', async () => {
      /**
       * Given: A file write operation fails
       * When: copyTemplate is called
       * Then: An error should be thrown
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('file.txt.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue('content');
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('ENOSPC: no space left on device'));

      // Act & Assert
      await expect(
        copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS)
      ).rejects.toThrow();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty template directory', async () => {
      /**
       * Given: Template directory is empty
       * When: copyTemplate is called
       * Then: Only destination directory should be created
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([] as unknown as fsSync.Dirent[]);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(DEST_PATH, { recursive: true });
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    it('should handle template variable that does not exist in options', async () => {
      /**
       * Given: A .template file contains {{unknownVar}}
       * When: copyTemplate is called without that variable
       * Then: The placeholder should remain unchanged
       */
      // Arrange
      const templateContent = '{{unknownVar}} - {{projectName}}';

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('file.txt.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'file.txt'),
        '{{unknownVar}} - my-app'
      );
    });

    it('should handle file names with multiple dots', async () => {
      /**
       * Given: A file named config.prod.json.template
       * When: copyTemplate is called
       * Then: Output should be config.prod.json
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('config.prod.json.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue('{}');

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'config.prod.json'),
        '{}'
      );
    });

    it('should handle project name with special characters', async () => {
      /**
       * Given: Project name contains hyphens and underscores
       * When: copyTemplate is called
       * Then: The project name should be substituted correctly
       */
      // Arrange
      const templateContent = '{{projectName}}';
      const options: CopyOptions = {
        projectName: 'my-awesome_app-v2',
      };

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('name.txt.template', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, options);

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(DEST_PATH, 'name.txt'),
        'my-awesome_app-v2'
      );
    });

    it('should skip hidden files starting with .', async () => {
      /**
       * Given: Template contains hidden files like .DS_Store
       * When: copyTemplate is called
       * Then: Hidden files except for special cases should be skipped
       */
      // Arrange
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('.DS_Store', false),
        createMockDirent('.npmrc', false),
        createMockDirent('package.json', false),
      ] as unknown as fsSync.Dirent[]);
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as fsSync.Stats);

      // Act
      await copyTemplate(TEMPLATE_PATH, DEST_PATH, DEFAULT_OPTIONS);

      // Assert
      // .DS_Store should be skipped
      expect(fs.copyFile).not.toHaveBeenCalledWith(
        path.join(TEMPLATE_PATH, '.DS_Store'),
        expect.any(String)
      );
    });
  });
});
