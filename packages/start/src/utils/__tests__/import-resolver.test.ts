/**
 * Test module for Import Resolver utility.
 *
 * Coverage:
 * - resolveImports: Resolve import references from external JSON files
 * - Happy path: single import, multiple imports, nested data
 * - Edge cases: undefined imports, empty imports object
 * - Error handling: file not found, invalid JSON, path traversal attacks
 *
 * TDD Red Phase: These tests verify the import resolution functionality
 * that will be extracted from json-page-loader.ts into a shared utility module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';

// Import the module under test (will fail until implemented)
import { resolveImports } from '../import-resolver.js';

// Mock node:fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// ==================== Test Fixtures ====================

const NAVIGATION_DATA = {
  items: [
    { title: 'Home', href: '/' },
    { title: 'About', href: '/about' },
    { title: 'Contact', href: '/contact' },
  ],
};

const CONFIG_DATA = {
  siteName: 'My Site',
  theme: 'dark',
  features: {
    analytics: true,
    newsletter: false,
  },
};

const MDX_COMPONENTS_DATA = {
  Alert: {
    params: { type: { type: 'string' } },
    view: { kind: 'element', tag: 'div', props: { class: 'alert' } },
  },
  Card: {
    params: { title: { type: 'string' } },
    view: { kind: 'element', tag: 'section', props: { class: 'card' } },
  },
  CodeBlock: {
    params: { language: { type: 'string' }, code: { type: 'string' } },
    view: { kind: 'element', tag: 'pre' },
  },
};

// ==================== Tests ====================

describe('resolveImports', () => {
  // ==================== Setup ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Happy Path ====================

  describe('when resolving single import', () => {
    it('should resolve single import from JSON file', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { nav: '../../data/navigation.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(NAVIGATION_DATA));

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result.nav).toEqual(NAVIGATION_DATA);
      expect(result.nav).toHaveProperty('items');
      expect((result.nav as typeof NAVIGATION_DATA).items).toHaveLength(3);
    });

    it('should read file from correct resolved path', async () => {
      // Arrange
      const pageDir = '/project/src/pages/docs';
      const imports = { config: '../data/site-config.json' };
      const expectedPath = join(pageDir, '../data/site-config.json');

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('{"key": "value"}');

      // Act
      await resolveImports(pageDir, imports);

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });
  });

  describe('when resolving multiple imports', () => {
    it('should resolve multiple imports from different JSON files', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = {
        nav: '../../data/navigation.json',
        config: '../../data/config.json',
      };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(NAVIGATION_DATA))
        .mockReturnValueOnce(JSON.stringify(CONFIG_DATA));

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result.nav).toEqual(NAVIGATION_DATA);
      expect(result.config).toEqual(CONFIG_DATA);
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should preserve import names as keys in result object', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = {
        myNavigation: '../../data/nav.json',
        siteSettings: '../../data/settings.json',
        footerData: '../../data/footer.json',
      };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('{}');

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result).toHaveProperty('myNavigation');
      expect(result).toHaveProperty('siteSettings');
      expect(result).toHaveProperty('footerData');
    });
  });

  // ==================== Edge Cases ====================

  describe('when imports parameter is undefined or empty', () => {
    it('should return empty object when imports is undefined', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = undefined;

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return empty object when imports is empty object', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = {};

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should not attempt to read any files when imports is empty', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = {};

      const fs = await import('node:fs');

      // Act
      await resolveImports(pageDir, imports);

      // Assert
      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('when handling nested data structures', () => {
    it('should handle nested data in imported JSON', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { components: '../../data/mdx-components.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(MDX_COMPONENTS_DATA));

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result.components).toEqual(MDX_COMPONENTS_DATA);
      
      const components = result.components as typeof MDX_COMPONENTS_DATA;
      expect(components.Alert).toBeDefined();
      expect(components.Alert.params.type.type).toBe('string');
      expect(components.Card.view.kind).toBe('element');
      expect(components.CodeBlock.params.language.type).toBe('string');
    });

    it('should handle deeply nested objects and arrays', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { data: '../../data/complex.json' };
      const complexData = {
        level1: {
          level2: {
            level3: {
              items: [
                { id: 1, nested: { value: 'deep' } },
                { id: 2, nested: { value: 'deeper' } },
              ],
            },
          },
        },
      };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(complexData));

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result.data).toEqual(complexData);
      
      const data = result.data as typeof complexData;
      expect(data.level1.level2.level3.items[0]?.nested.value).toBe('deep');
    });

    it('should handle arrays at root level of imported JSON', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { items: '../../data/list.json' };
      const arrayData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(arrayData));

      // Act
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(3);
    });
  });

  // ==================== Error Handling ====================

  describe('when imported file does not exist', () => {
    it('should throw error when imported file does not exist', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { missing: '../../data/nonexistent.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      await expect(resolveImports(pageDir, imports)).rejects.toThrow(/not found/i);
    });

    it('should include file path in error message when file not found', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { config: '../../data/missing-config.json' };
      const expectedPath = join(pageDir, '../../data/missing-config.json');

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      try {
        await resolveImports(pageDir, imports);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain(expectedPath);
      }
    });
  });

  describe('when imported file contains invalid JSON', () => {
    it('should throw error for invalid JSON in imported file', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { broken: '../../data/broken.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json content }');

      // Act & Assert
      await expect(resolveImports(pageDir, imports)).rejects.toThrow(/invalid json/i);
    });

    it('should throw error for malformed JSON syntax', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { malformed: '../../data/malformed.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"key": "value",}'); // trailing comma

      // Act & Assert
      await expect(resolveImports(pageDir, imports)).rejects.toThrow(/invalid json/i);
    });

    it('should throw error for empty file content', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { empty: '../../data/empty.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('');

      // Act & Assert
      await expect(resolveImports(pageDir, imports)).rejects.toThrow(/invalid json/i);
    });
  });

  describe('when error messages include import name', () => {
    it('should include import name in error message when file not found', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { mySpecialImport: '../../data/missing.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      try {
        await resolveImports(pageDir, imports);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('mySpecialImport');
      }
    });

    it('should include import name in error message when JSON is invalid', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { configSettings: '../../data/broken-config.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('not json');

      // Act & Assert
      try {
        await resolveImports(pageDir, imports);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('configSettings');
      }
    });
  });

  // ==================== Security: Path Traversal Prevention ====================

  describe('when projectRoot is provided for path traversal prevention', () => {
    it('should prevent path traversal attacks when projectRoot is provided', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const projectRoot = '/project';
      const imports = { malicious: '../../../../etc/passwd' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act & Assert
      await expect(
        resolveImports(pageDir, imports, projectRoot)
      ).rejects.toThrow(/path traversal/i);
    });

    it('should reject paths that resolve outside projectRoot', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const projectRoot = '/project';
      const imports = { escape: '../../../outside/secret.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act & Assert
      await expect(
        resolveImports(pageDir, imports, projectRoot)
      ).rejects.toThrow(/path traversal/i);
    });

    it('should include import name in path traversal error message', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const projectRoot = '/project';
      const imports = { attackVector: '../../../../etc/passwd' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act & Assert
      try {
        await resolveImports(pageDir, imports, projectRoot);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('attackVector');
      }
    });

    it('should allow valid paths within projectRoot', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const projectRoot = '/project';
      const imports = { validData: '../../data/valid.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"valid": true}');

      // Act
      const result = await resolveImports(pageDir, imports, projectRoot);

      // Assert
      expect(result.validData).toEqual({ valid: true });
    });

    it('should allow paths at projectRoot level', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const projectRoot = '/project';
      const imports = { rootData: '../../root-config.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"root": true}');

      // Act
      const result = await resolveImports(pageDir, imports, projectRoot);

      // Assert
      expect(result.rootData).toEqual({ root: true });
    });

    it('should not validate path traversal when projectRoot is not provided', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      // projectRoot is undefined - no path traversal check
      const imports = { data: '../../../../some/path.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"data": "value"}');

      // Act - should not throw because projectRoot is not provided
      const result = await resolveImports(pageDir, imports);

      // Assert
      expect(result.data).toEqual({ data: 'value' });
    });
  });

  // ==================== File Read Error Handling ====================

  describe('when file read fails', () => {
    it('should throw error when file read fails', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { unreadable: '../../data/locked.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act & Assert
      await expect(resolveImports(pageDir, imports)).rejects.toThrow(/failed to read/i);
    });

    it('should include import name in read error message', async () => {
      // Arrange
      const pageDir = '/project/src/pages';
      const imports = { protectedFile: '../../data/protected.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act & Assert
      try {
        await resolveImports(pageDir, imports);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('protectedFile');
      }
    });
  });
});
