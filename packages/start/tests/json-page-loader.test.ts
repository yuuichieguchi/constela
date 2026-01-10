/**
 * Test module for JsonPageLoader page widgets support and data source pattern normalization.
 *
 * Coverage:
 * - Page without widgets: PageInfo.widgets should be empty array
 * - Page with one widget: Should load and compile the widget
 * - Page with multiple widgets: Should load and compile all widgets
 * - Widget file not found: Should throw error with clear message
 * - Widget compilation: Widget program should have correct state, actions, view
 * - Data source pattern normalization: Relative glob patterns should be resolved from page directory
 * - loadJsonPage with relative data sources: Should correctly load data with relative patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonPageLoader, loadJsonPage, normalizeDataSourcePatterns } from '../src/json-page-loader.js';
import type { PageInfo, CompiledWidget } from '../src/json-page-loader.js';
import type { DataSource } from '@constela/core';

// ==================== Test Fixtures ====================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

// ==================== JsonPageLoader Widgets Tests ====================

describe('JsonPageLoader', () => {
  let loader: JsonPageLoader;

  beforeEach(() => {
    loader = new JsonPageLoader(FIXTURES_DIR);
  });

  // ==================== Page Without Widgets ====================

  describe('page without widgets', () => {
    it('should return PageInfo with empty widgets array when page has no widgets', async () => {
      // Arrange
      const pagePath = 'pages/page-without-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo).toHaveProperty('widgets');
      expect(pageInfo.widgets).toEqual([]);
    });

    it('should return PageInfo with empty widgets array when widgets field is undefined', async () => {
      // Arrange
      // Using a page that doesn't have widgets field at all
      const pagePath = 'pages-layout/index.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo).toHaveProperty('widgets');
      expect(pageInfo.widgets).toEqual([]);
    });
  });

  // ==================== Page With One Widget ====================

  describe('page with one widget', () => {
    it('should load and compile a single widget', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.widgets).toHaveLength(1);
      expect(pageInfo.widgets[0]).toHaveProperty('id', 'counter-widget');
      expect(pageInfo.widgets[0]).toHaveProperty('program');
    });

    it('should compile widget with correct version', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.version).toBe('1.0');
    });

    it('should compile widget with correct state', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.state).toHaveProperty('count');
      expect(widget.program.state.count).toEqual({
        type: 'number',
        initial: 0,
      });
    });

    it('should compile widget with correct actions', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.actions).toHaveProperty('increment');
      expect(widget.program.actions.increment.name).toBe('increment');
      expect(widget.program.actions.increment.steps).toHaveLength(1);
    });

    it('should compile widget with correct view', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.view).toHaveProperty('kind', 'element');
      expect(widget.program.view).toHaveProperty('tag', 'div');
    });
  });

  // ==================== Page With Multiple Widgets ====================

  describe('page with multiple widgets', () => {
    it('should load and compile all widgets', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.widgets).toHaveLength(2);
    });

    it('should preserve widget order from page definition', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.widgets[0].id).toBe('counter-widget');
      expect(pageInfo.widgets[1].id).toBe('timer-widget');
    });

    it('should compile each widget independently', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      // Counter widget should have 'count' state
      expect(pageInfo.widgets[0].program.state).toHaveProperty('count');
      expect(pageInfo.widgets[0].program.actions).toHaveProperty('increment');

      // Timer widget should have 'seconds' and 'running' state
      expect(pageInfo.widgets[1].program.state).toHaveProperty('seconds');
      expect(pageInfo.widgets[1].program.state).toHaveProperty('running');
      expect(pageInfo.widgets[1].program.actions).toHaveProperty('start');
      expect(pageInfo.widgets[1].program.actions).toHaveProperty('stop');
    });

    it('should compile all widgets with correct versions', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      for (const widget of pageInfo.widgets) {
        expect(widget.program.version).toBe('1.0');
      }
    });
  });

  // ==================== Widget File Not Found ====================

  describe('widget file not found', () => {
    it('should throw error when widget file does not exist', async () => {
      // Arrange
      const pagePath = 'pages/page-with-missing-widget.json';

      // Act & Assert
      await expect(loader.loadPage(pagePath)).rejects.toThrow();
    });

    it('should include widget src path in error message', async () => {
      // Arrange
      const pagePath = 'pages/page-with-missing-widget.json';

      // Act & Assert
      await expect(loader.loadPage(pagePath)).rejects.toThrow(/nonexistent/);
    });

    it('should include widget id in error message', async () => {
      // Arrange
      const pagePath = 'pages/page-with-missing-widget.json';

      // Act & Assert
      await expect(loader.loadPage(pagePath)).rejects.toThrow(
        /nonexistent-widget|Widget.*not found/i
      );
    });
  });

  // ==================== CompiledWidget Interface ====================

  describe('CompiledWidget interface', () => {
    it('should have id property matching widget definition', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget).toHaveProperty('id');
      expect(typeof widget.id).toBe('string');
      expect(widget.id).toBe('counter-widget');
    });

    it('should have program property of type CompiledProgram', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget).toHaveProperty('program');
      expect(widget.program).toHaveProperty('version');
      expect(widget.program).toHaveProperty('state');
      expect(widget.program).toHaveProperty('actions');
      expect(widget.program).toHaveProperty('view');
    });
  });

  // ==================== PageInfo.widgets Type ====================

  describe('PageInfo.widgets type', () => {
    it('should be an array type', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(Array.isArray(pageInfo.widgets)).toBe(true);
    });

    it('should contain CompiledWidget objects', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      for (const widget of pageInfo.widgets) {
        expect(widget).toHaveProperty('id');
        expect(widget).toHaveProperty('program');
      }
    });
  });
});

// ==================== normalizeDataSourcePatterns Tests ====================

describe('normalizeDataSourcePatterns', () => {
  // Test cases for normalizing relative glob patterns in data sources.
  //
  // The issue: When a page file at pages/docs/[slug].json has a data source
  // with pattern "../../content/docs/{star}{star}/{star}.mdx", the pattern is relative to
  // the page file's directory. However, DataLoader interprets patterns relative
  // to the project root, causing files not to be found.
  //
  // The solution: normalizeDataSourcePatterns should resolve relative patterns
  // (those starting with ../ or ./) from the page directory to absolute paths
  // or project-root-relative paths that DataLoader can use correctly.

  // ==================== Relative Pattern Normalization ====================

  describe('relative pattern normalization', () => {
    it('should normalize relative glob patterns from page directory to project root', () => {
      // Given: A page at pages-data/page-with-relative-data.json with data source
      //        pattern "../content/\*\*\/\*.mdx"
      // When: normalizeDataSourcePatterns is called
      // Then: The pattern should be normalized to "content/\*\*\/\*.mdx"
      //       (relative to project root)
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        docs: {
          type: 'glob',
          pattern: '../content/**/*.mdx',
          transform: 'mdx',
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      // The pattern "../content/**/*.mdx" from pages-data/ should become "content/**/*.mdx"
      expect(normalized.docs.pattern).toBe('content/**/*.mdx');
    });

    it('should normalize single dot relative patterns from page directory', () => {
      // Given: A page at pages-data/index.json with pattern "./data/\*.json"
      // When: normalizeDataSourcePatterns is called
      // Then: The pattern should be normalized to "pages-data/data/\*.json"
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        localData: {
          type: 'glob',
          pattern: './local/*.json',
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      expect(normalized.localData.pattern).toBe('pages-data/local/*.json');
    });

    it('should not modify absolute patterns (not starting with . or ..)', () => {
      // Given: A pattern that is already relative to project root (no ./ or ../)
      // When: normalizeDataSourcePatterns is called
      // Then: The pattern should remain unchanged
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        allContent: {
          type: 'glob',
          pattern: 'content/**/*.mdx',
          transform: 'mdx',
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      expect(normalized.allContent.pattern).toBe('content/**/*.mdx');
    });

    it('should handle multiple data sources with mixed patterns', () => {
      // Given: Multiple data sources, some with relative patterns, some without
      // When: normalizeDataSourcePatterns is called
      // Then: Only relative patterns should be normalized
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        docs: {
          type: 'glob',
          pattern: '../content/**/*.mdx',
          transform: 'mdx',
        } as DataSource,
        globalConfig: {
          type: 'file',
          path: 'config.json',
        } as DataSource,
        localData: {
          type: 'glob',
          pattern: './data/*.yaml',
          transform: 'yaml',
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      expect(normalized.docs.pattern).toBe('content/**/*.mdx');
      expect(normalized.globalConfig.path).toBe('config.json'); // file paths unchanged
      expect(normalized.localData.pattern).toBe('pages-data/data/*.yaml');
    });

    it('should handle deeply nested page directories', () => {
      // Given: A page at pages/blog/2024/01/post.json with pattern "../../../content/\*.mdx"
      // When: normalizeDataSourcePatterns is called
      // Then: The pattern should be normalized correctly
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages', 'blog', '2024', '01');
      const dataSources: Record<string, DataSource> = {
        posts: {
          type: 'glob',
          pattern: '../../../../content/*.mdx',
          transform: 'mdx',
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      expect(normalized.posts.pattern).toBe('content/*.mdx');
    });

    it('should preserve other data source properties when normalizing', () => {
      // Given: A data source with pattern and other properties like transform and components
      // When: normalizeDataSourcePatterns is called
      // Then: All properties except pattern should be preserved
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        docs: {
          type: 'glob',
          pattern: '../content/**/*.mdx',
          transform: 'mdx',
          components: { expr: 'import', name: 'mdxComponents' },
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      expect(normalized.docs.type).toBe('glob');
      expect(normalized.docs.transform).toBe('mdx');
      expect(normalized.docs.components).toEqual({ expr: 'import', name: 'mdxComponents' });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should return empty object when dataSources is undefined', () => {
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, undefined);

      // Assert
      expect(normalized).toEqual({});
    });

    it('should return empty object when dataSources is empty', () => {
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, {});

      // Assert
      expect(normalized).toEqual({});
    });

    it('should handle patterns that traverse outside project root', () => {
      // Given: A pattern that tries to traverse outside the project root
      // When: normalizeDataSourcePatterns is called
      // Then: It should throw an error or handle gracefully
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        outside: {
          type: 'glob',
          pattern: '../../../../../outside/**/*.mdx',
        } as DataSource,
      };

      // Act & Assert
      // Should throw or return a path that indicates traversal outside root
      expect(() => {
        normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);
      }).toThrow(/outside.*project.*root|path.*traversal/i);
    });

    it('should handle file type data sources with relative paths', () => {
      // Given: A file data source with a relative path
      // When: normalizeDataSourcePatterns is called
      // Then: The path should be normalized correctly
      // Arrange
      const projectRoot = FIXTURES_DIR;
      const pageDir = join(FIXTURES_DIR, 'pages-data');
      const dataSources: Record<string, DataSource> = {
        config: {
          type: 'file',
          path: '../layouts/main.json',
        } as DataSource,
      };

      // Act
      const normalized = normalizeDataSourcePatterns(projectRoot, pageDir, dataSources);

      // Assert
      expect(normalized.config.path).toBe('layouts/main.json');
    });
  });
});

// ==================== loadJsonPage with relative data sources ====================

describe('loadJsonPage with relative data sources', () => {
  // Integration tests for loading JSON pages that have data sources
  // with relative glob patterns.

  describe('loading page with relative data source patterns', () => {
    it('should correctly load data sources with relative patterns', async () => {
      // Given: A page file at pages-data/page-with-relative-data.json with
      //        data source pattern "../../content/\*\*/\*.mdx"
      // When: loadJsonPage is called
      // Then: The data should be loaded correctly from content/ directory
      // Arrange
      const pagePath = 'pages-data/page-with-relative-data.json';

      // Act
      const pageInfo = await loadJsonPage(FIXTURES_DIR, pagePath);

      // Assert
      expect(pageInfo.loadedData).toHaveProperty('docs');
      expect(Array.isArray(pageInfo.loadedData.docs)).toBe(true);
      // Should find the test.mdx file in content/
      const docs = pageInfo.loadedData.docs as Array<{ frontmatter: { title: string } }>;
      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0].frontmatter.title).toBe('Test Document');
    });

    it('should correctly resolve page directory from page path', async () => {
      // Given: A page at a nested path
      // When: loadJsonPage is called
      // Then: Relative patterns should be resolved from that page's directory
      // Arrange
      const pagePath = 'pages-data/page-with-relative-data.json';
      const expectedPageDir = join(FIXTURES_DIR, 'pages-data');

      // Act
      const pageInfo = await loadJsonPage(FIXTURES_DIR, pagePath);

      // Assert
      const actualPageDir = dirname(pageInfo.filePath);
      expect(actualPageDir).toBe(expectedPageDir);
    });
  });

  describe('JsonPageLoader.loadPage with relative data sources', () => {
    it('should load page with relative data source patterns correctly', async () => {
      // Given: Using JsonPageLoader class to load a page with relative patterns
      // When: loadPage is called
      // Then: Data should be loaded correctly
      // Arrange
      const loader = new JsonPageLoader(FIXTURES_DIR);
      const pagePath = 'pages-data/page-with-relative-data.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.loadedData).toHaveProperty('docs');
      const docs = pageInfo.loadedData.docs as Array<{ frontmatter: { slug: string } }>;
      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0].frontmatter.slug).toBe('test-doc');
    });
  });
});
