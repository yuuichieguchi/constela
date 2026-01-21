/**
 * Test module for create-constela templates management.
 *
 * Coverage:
 * - getTemplatesDir: Returns path to templates directory
 * - getAvailableTemplates: Returns list of template names
 * - getAvailableExamples: Returns list of example names
 * - getTemplatePath: Returns full path to specific template
 * - getExamplePath: Returns full path to specific example
 * - templateExists: Check if template exists
 * - exampleExists: Check if example exists
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock the fs module
vi.mock('node:fs');

// Import the module under test (will fail until implemented)
import {
  getTemplatesDir,
  getAvailableTemplates,
  getAvailableExamples,
  getTemplatePath,
  getExamplePath,
  templateExists,
  exampleExists,
} from '../src/templates.js';

// ==================== Test Fixtures ====================

/**
 * Helper to create a mock Dirent object for readdirSync
 */
function createMockDirent(name: string, isDirectory: boolean): fs.Dirent {
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

describe('templates module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== getTemplatesDir ====================

  describe('getTemplatesDir', () => {
    it('should return a path ending with /templates', () => {
      /**
       * Given: The templates module is loaded
       * When: getTemplatesDir is called
       * Then: The returned path should end with /templates
       */
      // Act
      const result = getTemplatesDir();

      // Assert
      expect(result).toMatch(/\/templates$/);
    });

    it('should return an absolute path', () => {
      /**
       * Given: The templates module is loaded
       * When: getTemplatesDir is called
       * Then: The returned path should be absolute
       */
      // Act
      const result = getTemplatesDir();

      // Assert
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  // ==================== getAvailableTemplates ====================

  describe('getAvailableTemplates', () => {
    it('should return array containing "default" when default template exists', () => {
      /**
       * Given: The templates directory contains a "default" subdirectory
       * When: getAvailableTemplates is called
       * Then: The returned array should contain "default"
       */
      // Arrange
      const mockDirents = [
        createMockDirent('default', true),
        createMockDirent('examples', true),
        createMockDirent('README.md', false),
      ];
      vi.mocked(fs.readdirSync).mockReturnValue(mockDirents);

      // Act
      const result = getAvailableTemplates();

      // Assert
      expect(result).toContain('default');
    });

    it('should return only directories (excluding examples)', () => {
      /**
       * Given: The templates directory contains mixed files and directories
       * When: getAvailableTemplates is called
       * Then: The returned array should only contain directories except "examples"
       */
      // Arrange
      const mockDirents = [
        createMockDirent('default', true),
        createMockDirent('minimal', true),
        createMockDirent('examples', true),
        createMockDirent('README.md', false),
        createMockDirent('.gitkeep', false),
      ];
      vi.mocked(fs.readdirSync).mockReturnValue(mockDirents);

      // Act
      const result = getAvailableTemplates();

      // Assert
      expect(result).toEqual(['default', 'minimal']);
      expect(result).not.toContain('examples');
      expect(result).not.toContain('README.md');
      expect(result).not.toContain('.gitkeep');
    });

    it('should return empty array when no templates exist', () => {
      /**
       * Given: The templates directory contains only files and examples
       * When: getAvailableTemplates is called
       * Then: The returned array should be empty
       */
      // Arrange
      const mockDirents = [
        createMockDirent('examples', true),
        createMockDirent('README.md', false),
      ];
      vi.mocked(fs.readdirSync).mockReturnValue(mockDirents);

      // Act
      const result = getAvailableTemplates();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==================== getAvailableExamples ====================

  describe('getAvailableExamples', () => {
    it('should return array of example names when examples exist', () => {
      /**
       * Given: The examples directory contains subdirectories
       * When: getAvailableExamples is called
       * Then: The returned array should contain the example names
       */
      // Arrange
      const mockDirents = [
        createMockDirent('counter', true),
        createMockDirent('todo', true),
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(mockDirents);

      // Act
      const result = getAvailableExamples();

      // Assert
      expect(result).toEqual(['counter', 'todo']);
    });

    it('should return empty array when examples directory does not exist', () => {
      /**
       * Given: The examples directory does not exist
       * When: getAvailableExamples is called
       * Then: The returned array should be empty
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = getAvailableExamples();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return only directories from examples', () => {
      /**
       * Given: The examples directory contains files and directories
       * When: getAvailableExamples is called
       * Then: The returned array should only contain directory names
       */
      // Arrange
      const mockDirents = [
        createMockDirent('counter', true),
        createMockDirent('README.md', false),
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(mockDirents);

      // Act
      const result = getAvailableExamples();

      // Assert
      expect(result).toEqual(['counter']);
      expect(result).not.toContain('README.md');
    });
  });

  // ==================== getTemplatePath ====================

  describe('getTemplatePath', () => {
    it('should return path ending with /templates/default for "default" template', () => {
      /**
       * Given: Template name is "default"
       * When: getTemplatePath is called
       * Then: The returned path should end with /templates/default
       */
      // Act
      const result = getTemplatePath('default');

      // Assert
      expect(result).toMatch(/\/templates\/default$/);
    });

    it('should return path ending with /templates/minimal for "minimal" template', () => {
      /**
       * Given: Template name is "minimal"
       * When: getTemplatePath is called
       * Then: The returned path should end with /templates/minimal
       */
      // Act
      const result = getTemplatePath('minimal');

      // Assert
      expect(result).toMatch(/\/templates\/minimal$/);
    });

    it('should return an absolute path', () => {
      /**
       * Given: A valid template name
       * When: getTemplatePath is called
       * Then: The returned path should be absolute
       */
      // Act
      const result = getTemplatePath('default');

      // Assert
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  // ==================== getExamplePath ====================

  describe('getExamplePath', () => {
    it('should return path ending with /templates/examples/counter for "counter" example', () => {
      /**
       * Given: Example name is "counter"
       * When: getExamplePath is called
       * Then: The returned path should end with /templates/examples/counter
       */
      // Act
      const result = getExamplePath('counter');

      // Assert
      expect(result).toMatch(/\/templates\/examples\/counter$/);
    });

    it('should return path ending with /templates/examples/todo for "todo" example', () => {
      /**
       * Given: Example name is "todo"
       * When: getExamplePath is called
       * Then: The returned path should end with /templates/examples/todo
       */
      // Act
      const result = getExamplePath('todo');

      // Assert
      expect(result).toMatch(/\/templates\/examples\/todo$/);
    });

    it('should return an absolute path', () => {
      /**
       * Given: A valid example name
       * When: getExamplePath is called
       * Then: The returned path should be absolute
       */
      // Act
      const result = getExamplePath('counter');

      // Assert
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  // ==================== templateExists ====================

  describe('templateExists', () => {
    it('should return true when template directory exists', () => {
      /**
       * Given: The template directory exists
       * When: templateExists is called with "default"
       * Then: It should return true
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      const result = templateExists('default');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when template directory does not exist', () => {
      /**
       * Given: The template directory does not exist
       * When: templateExists is called with "nonexistent"
       * Then: It should return false
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = templateExists('nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('should check the correct path for template', () => {
      /**
       * Given: A template name
       * When: templateExists is called
       * Then: It should check existence at /templates/{name} path
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      templateExists('default');

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringMatching(/\/templates\/default$/)
      );
    });
  });

  // ==================== exampleExists ====================

  describe('exampleExists', () => {
    it('should return true when example directory exists', () => {
      /**
       * Given: The example directory exists
       * When: exampleExists is called with "counter"
       * Then: It should return true
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      const result = exampleExists('counter');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when example directory does not exist', () => {
      /**
       * Given: The example directory does not exist
       * When: exampleExists is called with "nonexistent"
       * Then: It should return false
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = exampleExists('nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('should check the correct path for example', () => {
      /**
       * Given: An example name
       * When: exampleExists is called
       * Then: It should check existence at /templates/examples/{name} path
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      exampleExists('counter');

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringMatching(/\/templates\/examples\/counter$/)
      );
    });
  });

  // ==================== Security - Path Traversal Prevention ====================

  describe('Security - Path Traversal Prevention', () => {
    // getTemplatePath should reject path traversal attempts
    it('getTemplatePath should reject path traversal with ../', () => {
      /**
       * Given: A malicious template name with path traversal
       * When: getTemplatePath is called
       * Then: It should throw an error
       */
      expect(() => getTemplatePath('../../../etc/passwd')).toThrow();
    });

    it('getTemplatePath should reject path traversal with absolute path', () => {
      /**
       * Given: An absolute path as template name
       * When: getTemplatePath is called
       * Then: It should throw an error
       */
      expect(() => getTemplatePath('/etc/passwd')).toThrow();
    });

    // getExamplePath should reject path traversal attempts
    it('getExamplePath should reject path traversal with ../', () => {
      /**
       * Given: A malicious example name with path traversal
       * When: getExamplePath is called
       * Then: It should throw an error
       */
      expect(() => getExamplePath('../../../etc/passwd')).toThrow();
    });

    it('getExamplePath should reject path traversal with absolute path', () => {
      /**
       * Given: An absolute path as example name
       * When: getExamplePath is called
       * Then: It should throw an error
       */
      expect(() => getExamplePath('/etc/passwd')).toThrow();
    });

    // templateExists should return false for traversal attempts (not throw)
    it('templateExists should return false for path traversal attempts', () => {
      /**
       * Given: A malicious template name with path traversal
       * When: templateExists is called
       * Then: It should return false (safe failure)
       */
      expect(templateExists('../../../etc/passwd')).toBe(false);
    });

    // exampleExists should return false for traversal attempts
    it('exampleExists should return false for path traversal attempts', () => {
      /**
       * Given: A malicious example name with path traversal
       * When: exampleExists is called
       * Then: It should return false (safe failure)
       */
      expect(exampleExists('../../../etc/passwd')).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle template names with special characters', () => {
      /**
       * Given: Template name contains special characters
       * When: getTemplatePath is called
       * Then: The path should be constructed correctly
       */
      // Act
      const result = getTemplatePath('my-template_v2');

      // Assert
      expect(result).toMatch(/\/templates\/my-template_v2$/);
    });

    it('should handle empty template name', () => {
      /**
       * Given: Empty template name
       * When: getTemplatePath is called
       * Then: The path should still be valid (ending with /templates/)
       */
      // Act
      const result = getTemplatePath('');

      // Assert
      expect(result).toMatch(/\/templates\/$/);
    });

    it('should handle template names with dots', () => {
      /**
       * Given: Template name contains dots
       * When: getTemplatePath is called
       * Then: The path should be constructed correctly
       */
      // Act
      const result = getTemplatePath('template.v1');

      // Assert
      expect(result).toMatch(/\/templates\/template\.v1$/);
    });
  });
});
