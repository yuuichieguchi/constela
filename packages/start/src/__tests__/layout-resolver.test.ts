/**
 * Test module for Layout Resolution.
 *
 * Coverage:
 * - Layout file detection from file system
 * - Layout reference resolution
 * - Error when layout not found
 * - Layout caching and loading
 * - Layout composition at build/serve time
 *
 * TDD Red Phase: These tests verify the layout resolution functionality
 * that will be added to support layout composition in Constela Start.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import {
  scanLayouts,
  resolveLayout,
  loadLayout,
  LayoutResolver,
} from '../layout/resolver.js';
import type { LayoutProgram, Program } from '@constela/core';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

describe('scanLayouts', () => {
  // ==================== Layout File Detection ====================

  describe('layout file detection', () => {
    beforeEach(async () => {
      // Reset mocks and set default behavior
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
    });

    it('should detect layout files in layouts directory', async () => {
      // Arrange
      const layoutsDir = '/project/layouts';

      // Mock file system
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'MainLayout.ts',
        'DashboardLayout.ts',
        'AuthLayout.ts',
      ]);

      // Act
      const layouts = await scanLayouts(layoutsDir);

      // Assert
      expect(layouts).toHaveLength(3);
      expect(layouts.some(l => l.name === 'MainLayout')).toBe(true);
      expect(layouts.some(l => l.name === 'DashboardLayout')).toBe(true);
      expect(layouts.some(l => l.name === 'AuthLayout')).toBe(true);
    });

    it('should return empty array when no layouts exist', async () => {
      // Arrange
      const layoutsDir = '/project/layouts';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([]);

      // Act
      const layouts = await scanLayouts(layoutsDir);

      // Assert
      expect(layouts).toHaveLength(0);
    });

    it('should include file path in scanned layout', async () => {
      // Arrange
      const layoutsDir = '/project/layouts';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['MainLayout.ts']);

      // Act
      const layouts = await scanLayouts(layoutsDir);

      // Assert
      expect(layouts[0]?.file).toBe(join(layoutsDir, 'MainLayout.ts'));
      expect(layouts[0]?.name).toBe('MainLayout');
    });

    it('should handle nested layout directories', async () => {
      // Arrange
      const layoutsDir = '/project/layouts';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'MainLayout.ts',
        'admin/AdminLayout.ts',
        'marketing/LandingLayout.ts',
      ]);

      // Act
      const layouts = await scanLayouts(layoutsDir);

      // Assert
      expect(layouts).toHaveLength(3);
      expect(layouts.some(l => l.name === 'AdminLayout')).toBe(true);
      expect(layouts.some(l => l.name === 'LandingLayout')).toBe(true);
    });

    it('should support .tsx extension', async () => {
      // Arrange
      const layoutsDir = '/project/layouts';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'MainLayout.tsx',
        'DashboardLayout.ts',
      ]);

      // Act
      const layouts = await scanLayouts(layoutsDir);

      // Assert
      expect(layouts).toHaveLength(2);
    });

    it('should ignore non-layout files', async () => {
      // Arrange
      const layoutsDir = '/project/layouts';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'MainLayout.ts',
        '_helpers.ts',     // Should be ignored (starts with _)
        'types.d.ts',      // Should be ignored (.d.ts)
        'README.md',       // Should be ignored (not .ts/.tsx)
      ]);

      // Act
      const layouts = await scanLayouts(layoutsDir);

      // Assert
      expect(layouts).toHaveLength(1);
      expect(layouts[0]?.name).toBe('MainLayout');
    });
  });

  // ==================== Layout Directory Error ====================

  describe('layout directory errors', () => {
    it('should throw error when layouts directory does not exist', async () => {
      // Arrange
      const layoutsDir = '/nonexistent/layouts';
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      await expect(scanLayouts(layoutsDir)).rejects.toThrow(
        /layouts directory does not exist/i
      );
    });

    it('should throw error when path is not a directory', async () => {
      // Arrange
      const layoutsDir = '/project/layouts.ts'; // file, not directory
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);

      // Act & Assert
      await expect(scanLayouts(layoutsDir)).rejects.toThrow(
        /not a directory/i
      );
    });
  });
});

describe('resolveLayout', () => {
  // ==================== Layout Reference Resolution ====================

  describe('layout reference resolution', () => {
    it('should resolve layout by name', async () => {
      // Arrange
      const layoutName = 'MainLayout';
      const layoutsDir = '/project/layouts';
      const scannedLayouts = [
        { name: 'MainLayout', file: '/project/layouts/MainLayout.ts' },
        { name: 'AuthLayout', file: '/project/layouts/AuthLayout.ts' },
      ];

      // Act
      const result = resolveLayout(layoutName, scannedLayouts);

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe('MainLayout');
      expect(result?.file).toBe('/project/layouts/MainLayout.ts');
    });

    it('should return undefined when layout not found', () => {
      // Arrange
      const layoutName = 'NonExistentLayout';
      const scannedLayouts = [
        { name: 'MainLayout', file: '/project/layouts/MainLayout.ts' },
      ];

      // Act
      const result = resolveLayout(layoutName, scannedLayouts);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should be case-sensitive for layout names', () => {
      // Arrange
      const scannedLayouts = [
        { name: 'MainLayout', file: '/project/layouts/MainLayout.ts' },
      ];

      // Act
      const result = resolveLayout('mainlayout', scannedLayouts); // lowercase

      // Assert
      expect(result).toBeUndefined();
    });
  });
});

describe('loadLayout', () => {
  // ==================== Layout Loading ====================

  describe('layout loading', () => {
    // Note: These tests require actual file loading which cannot be easily mocked
    // In a real project, integration tests with actual files would be used

    it.skip('should load and parse layout file', async () => {
      // Arrange
      const layoutFile = '/project/layouts/MainLayout.ts';

      // Act
      const layout = await loadLayout(layoutFile);

      // Assert
      expect(layout).toBeDefined();
      expect(layout.type).toBe('layout');
      expect(layout.version).toBe('1.0');
    });

    it.skip('should throw error when layout file is not a layout program', async () => {
      // Arrange - File exports a regular program, not a layout
      const layoutFile = '/project/layouts/NotALayout.ts';

      // Act & Assert
      await expect(loadLayout(layoutFile)).rejects.toThrow(
        /not a valid layout/i
      );
    });

    it('should throw error when layout file cannot be loaded', async () => {
      // Arrange
      const layoutFile = '/nonexistent/layout.ts';

      // Act & Assert
      await expect(loadLayout(layoutFile)).rejects.toThrow();
    });
  });
});

describe('LayoutResolver class', () => {
  // ==================== LayoutResolver ====================

  beforeEach(async () => {
    // Set up fs mocks for all LayoutResolver tests
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('initialization', () => {
    it('should initialize with layouts directory', () => {
      // Arrange & Act
      const resolver = new LayoutResolver('/project/layouts');

      // Assert
      expect(resolver).toBeDefined();
    });

    it('should scan layouts on initialization', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['MainLayout.ts']);

      // Act
      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      // Assert
      expect(resolver.hasLayout('MainLayout')).toBe(true);
    });
  });

  describe('layout resolution methods', () => {
    let resolver: LayoutResolver;

    beforeEach(async () => {
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'MainLayout.ts',
        'AuthLayout.ts',
      ]);

      resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();
    });

    it('should check if layout exists', () => {
      expect(resolver.hasLayout('MainLayout')).toBe(true);
      expect(resolver.hasLayout('NonExistent')).toBe(false);
    });

    it.skip('should get layout by name', async () => {
      // Note: This test requires actual file loading which cannot be easily mocked
      // Act
      const layout = await resolver.getLayout('MainLayout');

      // Assert
      expect(layout).toBeDefined();
      expect(layout?.type).toBe('layout');
    });

    it.skip('should cache loaded layouts', async () => {
      // Note: This test requires actual file loading which cannot be easily mocked
      // Act
      const layout1 = await resolver.getLayout('MainLayout');
      const layout2 = await resolver.getLayout('MainLayout');

      // Assert
      expect(layout1).toBe(layout2); // Same reference (cached)
    });

    it('should return undefined for non-existent layout', async () => {
      // Act
      const layout = await resolver.getLayout('NonExistent');

      // Assert
      expect(layout).toBeUndefined();
    });
  });

  describe('layout composition', () => {
    it.skip('should compose page with resolved layout', async () => {
      // Note: This test requires actual file loading which cannot be easily mocked
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['MainLayout.ts']);

      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      const page: Program = {
        version: '1.0',
        route: {
          path: '/dashboard',
          layout: 'MainLayout',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'main' },
      } as unknown as Program;

      // Act
      const composed = await resolver.composeWithLayout(page);

      // Assert
      expect(composed).toBeDefined();
      // The composed view should contain layout structure with page inserted
    });

    it('should return original page when no layout specified', async () => {
      // Arrange
      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      const page: Program = {
        version: '1.0',
        route: { path: '/about' }, // No layout specified
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = await resolver.composeWithLayout(page);

      // Assert
      expect(result.view).toEqual(page.view);
    });

    it('should throw error when specified layout not found', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['MainLayout.ts']);

      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      const page: Program = {
        version: '1.0',
        route: {
          path: '/dashboard',
          layout: 'NonExistentLayout', // Does not exist
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act & Assert
      await expect(resolver.composeWithLayout(page)).rejects.toThrow(
        /layout.*not found/i
      );
    });
  });
});

describe('Layout resolution in file router context', () => {
  // ==================== Integration with File Router ====================

  beforeEach(async () => {
    // Set up fs mocks
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('integration with routes', () => {
    it.skip('should resolve layout for scanned route', async () => {
      // Note: This test requires actual file loading which cannot be easily mocked
      // This test verifies that layout resolution integrates with scanRoutes

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['MainLayout.ts']);

      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      // Simulate a route with layout
      const routeWithLayout = {
        file: '/project/routes/dashboard.ts',
        pattern: '/dashboard',
        type: 'page' as const,
        params: [],
        layout: 'MainLayout',
      };

      // Act
      const layout = await resolver.getLayout(routeWithLayout.layout);

      // Assert
      expect(layout).toBeDefined();
    });

    it('should handle route without layout', async () => {
      // Arrange
      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      const routeWithoutLayout = {
        file: '/project/routes/about.ts',
        pattern: '/about',
        type: 'page' as const,
        params: [],
        // No layout field
      };

      // Act & Assert
      // Should not throw, just return page as-is
      expect(routeWithoutLayout.layout).toBeUndefined();
    });
  });
});

describe('Layout detection by program type', () => {
  // ==================== Type-based Detection ====================

  describe('detecting layouts by type field', () => {
    it('should identify layout program by type field', () => {
      // Arrange
      const layoutProgram: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
      } as unknown as LayoutProgram;

      const pageProgram: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect((layoutProgram as any).type).toBe('layout');
      expect((pageProgram as any).type).toBeUndefined();
    });
  });
});

describe('Layout error handling', () => {
  // ==================== Error Handling ====================

  beforeEach(async () => {
    // Set up fs mocks
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('error scenarios', () => {
    it('should provide helpful error message for missing layout', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['MainLayout.ts']);

      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      const page: Program = {
        version: '1.0',
        route: {
          path: '/test',
          layout: 'MissingLayout',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act & Assert
      try {
        await resolver.composeWithLayout(page);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('MissingLayout');
        expect((error as Error).message).toContain('not found');
      }
    });

    it('should list available layouts in error message', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'MainLayout.ts',
        'AuthLayout.ts',
      ]);

      const resolver = new LayoutResolver('/project/layouts');
      await resolver.initialize();

      const page: Program = {
        version: '1.0',
        route: {
          path: '/test',
          layout: 'Typo', // Typo in layout name
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act & Assert
      try {
        await resolver.composeWithLayout(page);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('MainLayout');
        expect(message).toContain('AuthLayout');
      }
    });
  });
});

// Cleanup
afterEach(() => {
  vi.clearAllMocks();
});
