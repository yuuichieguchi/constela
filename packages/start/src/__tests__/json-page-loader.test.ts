/**
 * Test module for JSON Page Loader.
 *
 * Coverage:
 * - loadJsonPage: Load and parse JSON page files
 * - resolveImports: Resolve import references from other JSON files
 * - loadPageData: Load data sources using DataLoader
 * - generateStaticPathsFromPage: Generate static paths from page config
 * - convertToCompiledProgram: Convert page to CompiledProgram
 * - Error handling: file not found, invalid JSON, missing required fields
 *
 * TDD Red Phase: These tests verify the JSON page loading functionality
 * that will be implemented to support JSON-based page definitions in Constela Start.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';

// Import the module under test (will fail until implemented)
import {
  loadJsonPage,
  resolveImports,
  loadPageData,
  generateStaticPathsFromPage,
  convertToCompiledProgram,
  JsonPageLoader,
} from '../json-page-loader.js';

import type { CompiledProgram } from '@constela/compiler';
import type { Program, DataSource, StaticPathsDefinition, ViewNode } from '@constela/core';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

// ==================== Type Definitions ====================

/**
 * JSON Page definition structure
 */
interface JsonPage {
  version: '1.0';
  route?: {
    path: string;
    layout?: string;
    layoutProps?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  };
  imports?: Record<string, string>;
  data?: Record<string, DataSource>;
  getStaticPaths?: StaticPathsDefinition;
  state?: Record<string, unknown>;
  actions?: unknown[];
  view: ViewNode;
  components?: Record<string, unknown>;
}

/**
 * Resolved page info returned by loadJsonPage
 */
interface PageInfo {
  filePath: string;
  page: JsonPage;
  resolvedImports: Record<string, unknown>;
  loadedData: Record<string, unknown>;
}

/**
 * Static path result
 */
interface StaticPathResult {
  params: Record<string, string>;
  data?: unknown;
}

// ==================== Test Fixtures ====================

const SIMPLE_PAGE_JSON: JsonPage = {
  version: '1.0',
  route: {
    path: '/',
    layout: 'main',
    meta: {
      title: 'Home Page',
      description: 'Welcome to our site',
    },
  },
  view: {
    kind: 'element',
    tag: 'div',
    children: [
      { kind: 'text', value: { expr: 'lit', value: 'Hello World' } },
    ],
  },
};

const PAGE_WITH_IMPORTS_JSON: JsonPage = {
  version: '1.0',
  route: {
    path: '/docs',
  },
  imports: {
    nav: '../../data/navigation.json',
    config: '../../data/config.json',
  },
  view: {
    kind: 'element',
    tag: 'div',
  },
};

const PAGE_WITH_DATA_JSON: JsonPage = {
  version: '1.0',
  route: {
    path: '/blog/:slug',
  },
  data: {
    posts: {
      type: 'glob',
      pattern: '../../content/blog/*.mdx',
      transform: 'mdx',
    },
    config: {
      type: 'file',
      path: '../../data/site-config.json',
    },
  },
  view: {
    kind: 'element',
    tag: 'article',
  },
};

const PAGE_WITH_STATIC_PATHS_JSON: JsonPage = {
  version: '1.0',
  route: {
    path: '/docs/:slug*',
    layout: 'docs',
  },
  imports: {
    mdxComponents: '../../data/mdx-components.json',
  },
  data: {
    docs: {
      type: 'glob',
      pattern: '../../content/docs/**/*.mdx',
      transform: 'mdx',
      components: { expr: 'import', name: 'mdxComponents' },
    },
  },
  getStaticPaths: {
    source: 'docs',
    params: {
      slug: { expr: 'var', name: 'item', path: 'slug' },
    },
  },
  view: {
    kind: 'element',
    tag: 'div',
  },
};

// ==================== Tests ====================

describe('loadJsonPage', () => {
  // ==================== Basic Loading ====================

  describe('basic page loading', () => {
    beforeEach(async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should load a simple JSON page file and return page info', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/index.json';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(SIMPLE_PAGE_JSON));

      // Act
      const result = await loadJsonPage(baseDir, pagePath);

      // Assert
      expect(result).toBeDefined();
      expect(result.filePath).toBe(join(baseDir, pagePath));
      expect(result.page).toEqual(SIMPLE_PAGE_JSON);
      expect(result.page.version).toBe('1.0');
      expect(result.page.route?.path).toBe('/');
    });

    it('should extract route information from JSON page', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/index.json';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(SIMPLE_PAGE_JSON));

      // Act
      const result = await loadJsonPage(baseDir, pagePath);

      // Assert
      expect(result.page.route).toBeDefined();
      expect(result.page.route?.layout).toBe('main');
      expect(result.page.route?.meta).toEqual({
        title: 'Home Page',
        description: 'Welcome to our site',
      });
    });

    it('should handle page without route definition', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/component.json';
      const pageWithoutRoute: JsonPage = {
        version: '1.0',
        view: {
          kind: 'element',
          tag: 'div',
        },
      };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(pageWithoutRoute));

      // Act
      const result = await loadJsonPage(baseDir, pagePath);

      // Assert
      expect(result.page.route).toBeUndefined();
      expect(result.page.view).toBeDefined();
    });

    it('should preserve view node structure', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/index.json';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(SIMPLE_PAGE_JSON));

      // Act
      const result = await loadJsonPage(baseDir, pagePath);

      // Assert
      expect(result.page.view.kind).toBe('element');
      expect((result.page.view as { tag: string }).tag).toBe('div');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw error when file does not exist', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/nonexistent.json';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      await expect(loadJsonPage(baseDir, pagePath)).rejects.toThrow(/file not found/i);
    });

    it('should throw error for invalid JSON', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/invalid.json';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      // Act & Assert
      await expect(loadJsonPage(baseDir, pagePath)).rejects.toThrow(/invalid json/i);
    });

    it('should throw error when version is missing', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/no-version.json';
      const invalidPage = { view: { kind: 'element', tag: 'div' } };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidPage));

      // Act & Assert
      await expect(loadJsonPage(baseDir, pagePath)).rejects.toThrow(/missing required field.*version/i);
    });

    it('should throw error when view is missing', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/no-view.json';
      const invalidPage = { version: '1.0' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidPage));

      // Act & Assert
      await expect(loadJsonPage(baseDir, pagePath)).rejects.toThrow(/missing required field.*view/i);
    });

    it('should throw error for unsupported version', async () => {
      // Arrange
      const baseDir = '/project';
      const pagePath = 'src/pages/wrong-version.json';
      const invalidPage = { version: '2.0', view: { kind: 'element', tag: 'div' } };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidPage));

      // Act & Assert
      await expect(loadJsonPage(baseDir, pagePath)).rejects.toThrow(/unsupported version/i);
    });
  });
});

describe('resolveImports', () => {
  // ==================== Import Resolution ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('basic import resolution', () => {
    it('should resolve single import from JSON file', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = { nav: '../../data/navigation.json' };
      const navData = { items: [{ title: 'Home', href: '/' }] };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(navData));

      // Act
      const result = await resolveImports(baseDir, imports);

      // Assert
      expect(result.nav).toEqual(navData);
    });

    it('should resolve multiple imports', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = {
        nav: '../../data/navigation.json',
        config: '../../data/config.json',
      };
      const navData = { items: [] };
      const configData = { siteName: 'My Site' };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(navData))
        .mockReturnValueOnce(JSON.stringify(configData));

      // Act
      const result = await resolveImports(baseDir, imports);

      // Assert
      expect(result.nav).toEqual(navData);
      expect(result.config).toEqual(configData);
    });

    it('should return empty object when no imports defined', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = undefined;

      // Act
      const result = await resolveImports(baseDir, imports);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle nested data in imported JSON', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = { components: '../../data/mdx-components.json' };
      const componentsData = {
        Alert: {
          params: { type: { type: 'string' } },
          view: { kind: 'element', tag: 'div' },
        },
        Card: {
          view: { kind: 'element', tag: 'section' },
        },
      };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(componentsData));

      // Act
      const result = await resolveImports(baseDir, imports);

      // Assert
      expect(result.components).toEqual(componentsData);
      expect((result.components as Record<string, unknown>).Alert).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when imported file does not exist', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = { missing: '../../data/nonexistent.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      await expect(resolveImports(baseDir, imports)).rejects.toThrow(/import.*not found/i);
    });

    it('should throw error for invalid JSON in imported file', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = { invalid: '../../data/broken.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

      // Act & Assert
      await expect(resolveImports(baseDir, imports)).rejects.toThrow(/invalid json.*import/i);
    });

    it('should include import name in error message', async () => {
      // Arrange
      const baseDir = '/project/src/pages';
      const imports = { myImport: '../../data/missing.json' };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      try {
        await resolveImports(baseDir, imports);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('myImport');
      }
    });
  });
});

describe('loadPageData', () => {
  // ==================== Data Loading ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('basic data loading', () => {
    it('should load glob data source', async () => {
      // Arrange
      const baseDir = '/project';
      const dataSources: Record<string, DataSource> = {
        posts: {
          type: 'glob',
          pattern: 'content/blog/*.mdx',
          transform: 'mdx',
        },
      };

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/blog/post1.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('---\ntitle: Post 1\n---\n# Content');

      // Act
      const result = await loadPageData(baseDir, dataSources);

      // Assert
      expect(result.posts).toBeDefined();
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it('should load file data source', async () => {
      // Arrange
      const baseDir = '/project';
      const dataSources: Record<string, DataSource> = {
        config: {
          type: 'file',
          path: 'data/config.json',
        },
      };
      const configData = { siteName: 'My Site', theme: 'dark' };

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configData));

      // Act
      const result = await loadPageData(baseDir, dataSources);

      // Assert
      expect(result.config).toEqual(configData);
    });

    it('should load multiple data sources', async () => {
      // Arrange
      const baseDir = '/project';
      const dataSources: Record<string, DataSource> = {
        posts: {
          type: 'glob',
          pattern: 'content/*.mdx',
          transform: 'mdx',
        },
        config: {
          type: 'file',
          path: 'data/config.json',
        },
      };

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/post.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('---\ntitle: Post\n---\n# Hello')
        .mockReturnValueOnce('{"siteName": "Test"}');

      // Act
      const result = await loadPageData(baseDir, dataSources);

      // Assert
      expect(result.posts).toBeDefined();
      expect(result.config).toBeDefined();
    });

    it('should return empty object when no data sources defined', async () => {
      // Arrange
      const baseDir = '/project';
      const dataSources = undefined;

      // Act
      const result = await loadPageData(baseDir, dataSources);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('data loading with imports context', () => {
    it('should resolve component references from imports', async () => {
      // Arrange
      const baseDir = '/project';
      const dataSources: Record<string, DataSource> = {
        docs: {
          type: 'glob',
          pattern: 'content/docs/*.mdx',
          transform: 'mdx',
          components: { expr: 'import', name: 'mdxComponents' } as unknown as string,
        },
      };
      const importsContext = {
        mdxComponents: {
          Alert: { view: { kind: 'element', tag: 'div' } },
        },
      };

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/docs/intro.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('---\ntitle: Intro\n---\n# Getting Started');

      // Act
      const result = await loadPageData(baseDir, dataSources, { imports: importsContext });

      // Assert
      expect(result.docs).toBeDefined();
    });
  });
});

describe('generateStaticPathsFromPage', () => {
  // ==================== Static Paths Generation ====================

  describe('basic static path generation', () => {
    it('should generate static paths from page config', async () => {
      // Arrange
      const pageConfig: JsonPage = PAGE_WITH_STATIC_PATHS_JSON;
      const loadedData = {
        docs: [
          { slug: 'getting-started', frontmatter: { title: 'Getting Started' } },
          { slug: 'installation', frontmatter: { title: 'Installation' } },
          { slug: 'configuration', frontmatter: { title: 'Configuration' } },
        ],
      };

      // Act
      const paths = await generateStaticPathsFromPage(pageConfig, loadedData);

      // Assert
      expect(paths).toHaveLength(3);
      expect(paths[0]?.params.slug).toBe('getting-started');
      expect(paths[1]?.params.slug).toBe('installation');
      expect(paths[2]?.params.slug).toBe('configuration');
    });

    it('should include original data item in path result', async () => {
      // Arrange
      const pageConfig: JsonPage = PAGE_WITH_STATIC_PATHS_JSON;
      const loadedData = {
        docs: [
          { slug: 'intro', frontmatter: { title: 'Introduction' }, content: { kind: 'element', tag: 'div' } },
        ],
      };

      // Act
      const paths = await generateStaticPathsFromPage(pageConfig, loadedData);

      // Assert
      expect(paths[0]?.data).toBeDefined();
      expect((paths[0]?.data as Record<string, unknown>).frontmatter).toEqual({ title: 'Introduction' });
    });

    it('should return empty array when no getStaticPaths defined', async () => {
      // Arrange
      const pageConfig: JsonPage = SIMPLE_PAGE_JSON;
      const loadedData = {};

      // Act
      const paths = await generateStaticPathsFromPage(pageConfig, loadedData);

      // Assert
      expect(paths).toHaveLength(0);
    });

    it('should return empty array when source data is empty', async () => {
      // Arrange
      const pageConfig: JsonPage = PAGE_WITH_STATIC_PATHS_JSON;
      const loadedData = { docs: [] };

      // Act
      const paths = await generateStaticPathsFromPage(pageConfig, loadedData);

      // Assert
      expect(paths).toHaveLength(0);
    });

    it('should handle multiple params in static paths', async () => {
      // Arrange
      const pageConfig: JsonPage = {
        version: '1.0',
        data: {
          posts: { type: 'glob', pattern: 'content/**/*.mdx' },
        },
        getStaticPaths: {
          source: 'posts',
          params: {
            year: { expr: 'var', name: 'item', path: 'year' },
            slug: { expr: 'var', name: 'item', path: 'slug' },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };
      const loadedData = {
        posts: [
          { year: '2024', slug: 'post-1' },
          { year: '2024', slug: 'post-2' },
          { year: '2023', slug: 'post-3' },
        ],
      };

      // Act
      const paths = await generateStaticPathsFromPage(pageConfig, loadedData);

      // Assert
      expect(paths).toHaveLength(3);
      expect(paths[0]?.params).toEqual({ year: '2024', slug: 'post-1' });
      expect(paths[2]?.params).toEqual({ year: '2023', slug: 'post-3' });
    });

    it('should handle nested path expressions', async () => {
      // Arrange
      const pageConfig: JsonPage = {
        version: '1.0',
        data: {
          items: { type: 'glob', pattern: 'content/*.mdx', transform: 'mdx' },
        },
        getStaticPaths: {
          source: 'items',
          params: {
            slug: { expr: 'var', name: 'item', path: 'frontmatter.slug' },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };
      const loadedData = {
        items: [
          { frontmatter: { slug: 'nested-slug-1', title: 'Title 1' } },
          { frontmatter: { slug: 'nested-slug-2', title: 'Title 2' } },
        ],
      };

      // Act
      const paths = await generateStaticPathsFromPage(pageConfig, loadedData);

      // Assert
      expect(paths[0]?.params.slug).toBe('nested-slug-1');
      expect(paths[1]?.params.slug).toBe('nested-slug-2');
    });
  });

  describe('error handling', () => {
    it('should throw error when source data is not found', async () => {
      // Arrange
      const pageConfig: JsonPage = PAGE_WITH_STATIC_PATHS_JSON;
      const loadedData = { wrongKey: [] };

      // Act & Assert
      await expect(generateStaticPathsFromPage(pageConfig, loadedData)).rejects.toThrow(
        /data source.*docs.*not found/i
      );
    });

    it('should throw error when source data is not an array', async () => {
      // Arrange
      const pageConfig: JsonPage = PAGE_WITH_STATIC_PATHS_JSON;
      const loadedData = { docs: { notAnArray: true } };

      // Act & Assert
      await expect(generateStaticPathsFromPage(pageConfig, loadedData)).rejects.toThrow(
        /data source.*must be an array/i
      );
    });
  });
});

describe('convertToCompiledProgram', () => {
  // ==================== Program Conversion ====================

  describe('basic conversion', () => {
    it('should convert simple JSON page to CompiledProgram', async () => {
      // Arrange
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/index.json',
        page: SIMPLE_PAGE_JSON,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program).toBeDefined();
      expect(program.version).toBe('1.0');
      expect(program.view).toBeDefined();
    });

    it('should include route definition in CompiledProgram', async () => {
      // Arrange
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/index.json',
        page: SIMPLE_PAGE_JSON,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.route).toBeDefined();
      expect(program.route?.path).toBe('/');
      expect(program.route?.layout).toBe('main');
    });

    it('should include importData in CompiledProgram when imports exist', async () => {
      // Arrange
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/docs.json',
        page: PAGE_WITH_IMPORTS_JSON,
        resolvedImports: {
          nav: { items: [{ title: 'Home' }] },
          config: { theme: 'dark' },
        },
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.importData).toBeDefined();
      expect(program.importData?.nav).toEqual({ items: [{ title: 'Home' }] });
      expect(program.importData?.config).toEqual({ theme: 'dark' });
    });

    it('should compile view node to CompiledNode', async () => {
      // Arrange
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/index.json',
        page: SIMPLE_PAGE_JSON,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.view).toHaveProperty('kind');
      expect(program.view.kind).toBe('element');
    });

    it('should initialize empty state when not defined', async () => {
      // Arrange
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/index.json',
        page: SIMPLE_PAGE_JSON,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.state).toBeDefined();
      expect(program.state).toEqual({});
    });

    it('should initialize empty actions when not defined', async () => {
      // Arrange
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/index.json',
        page: SIMPLE_PAGE_JSON,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.actions).toBeDefined();
      expect(program.actions).toEqual({});
    });
  });

  describe('with state and actions', () => {
    it('should convert state fields to compiled format', async () => {
      // Arrange
      const pageWithState: JsonPage = {
        version: '1.0',
        state: {
          count: { type: 'number', initial: 0 },
          name: { type: 'string', initial: 'Guest' },
        },
        view: { kind: 'element', tag: 'div' },
      };
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/counter.json',
        page: pageWithState,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.state.count).toEqual({ type: 'number', initial: 0 });
      expect(program.state.name).toEqual({ type: 'string', initial: 'Guest' });
    });

    it('should convert actions to compiled format', async () => {
      // Arrange
      const pageWithActions: JsonPage = {
        version: '1.0',
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: [
          {
            name: 'increment',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/counter.json',
        page: pageWithActions,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      expect(program.actions.increment).toBeDefined();
      expect(program.actions.increment.name).toBe('increment');
      expect(program.actions.increment.steps).toHaveLength(1);
    });
  });

  describe('with components', () => {
    it('should include component definitions', async () => {
      // Arrange
      const pageWithComponents: JsonPage = {
        version: '1.0',
        components: {
          Button: {
            params: { label: { type: 'string' } },
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: { kind: 'component', name: 'Button' },
      };
      const pageInfo: PageInfo = {
        filePath: '/project/src/pages/index.json',
        page: pageWithComponents,
        resolvedImports: {},
        loadedData: {},
      };

      // Act
      const program = await convertToCompiledProgram(pageInfo);

      // Assert
      // Note: Components may be handled separately, but importData should be available
      expect(program).toBeDefined();
    });
  });
});

describe('JsonPageLoader class', () => {
  // ==================== JsonPageLoader Class ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('initialization', () => {
    it('should initialize with project root', () => {
      // Arrange & Act
      const loader = new JsonPageLoader('/project');

      // Assert
      expect(loader).toBeDefined();
    });
  });

  describe('loadPage', () => {
    it('should load complete page with imports and data', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/post.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(PAGE_WITH_DATA_JSON))  // page file
        .mockReturnValueOnce('---\ntitle: Post\n---\n# Content')   // mdx file
        .mockReturnValueOnce('{"siteName": "Test"}');              // config file

      const loader = new JsonPageLoader('/project');

      // Act
      const result = await loader.loadPage('src/pages/blog.json');

      // Assert
      expect(result.page).toBeDefined();
      expect(result.loadedData).toBeDefined();
    });
  });

  describe('getStaticPaths', () => {
    it('should return static paths for a page', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/docs/intro.mdx', 'content/docs/guide.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(PAGE_WITH_STATIC_PATHS_JSON))
        .mockReturnValueOnce(JSON.stringify({ Alert: { view: { kind: 'element', tag: 'div' } } }))
        .mockReturnValueOnce('---\nslug: intro\n---\n# Intro')
        .mockReturnValueOnce('---\nslug: guide\n---\n# Guide');

      const loader = new JsonPageLoader('/project');

      // Act
      const paths = await loader.getStaticPaths('src/pages/docs.json');

      // Assert
      expect(paths).toHaveLength(2);
      expect(paths[0]?.params.slug).toBe('intro');
      expect(paths[1]?.params.slug).toBe('guide');
    });

    it('should return empty array for pages without getStaticPaths', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(SIMPLE_PAGE_JSON));

      const loader = new JsonPageLoader('/project');

      // Act
      const paths = await loader.getStaticPaths('src/pages/index.json');

      // Assert
      expect(paths).toHaveLength(0);
    });
  });

  describe('compile', () => {
    it('should compile page to CompiledProgram', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(SIMPLE_PAGE_JSON));

      const loader = new JsonPageLoader('/project');

      // Act
      const program = await loader.compile('src/pages/index.json');

      // Assert
      expect(program).toBeDefined();
      expect(program.version).toBe('1.0');
      expect(program.view).toBeDefined();
    });

    it('should compile page with specific route params', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/docs/intro.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(PAGE_WITH_STATIC_PATHS_JSON))
        .mockReturnValueOnce(JSON.stringify({ Alert: { view: { kind: 'element', tag: 'div' } } }))
        .mockReturnValueOnce('---\nslug: intro\ntitle: Introduction\n---\n# Getting Started');

      const loader = new JsonPageLoader('/project');

      // Act
      const program = await loader.compile('src/pages/docs.json', { params: { slug: 'intro' } });

      // Assert
      expect(program).toBeDefined();
      expect(program.route?.path).toBe('/docs/:slug*');
    });
  });

  describe('caching', () => {
    it('should cache loaded pages', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(SIMPLE_PAGE_JSON));

      const loader = new JsonPageLoader('/project');

      // Act
      await loader.loadPage('src/pages/index.json');
      await loader.loadPage('src/pages/index.json');

      // Assert - should only read file once due to caching
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should allow cache invalidation', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(SIMPLE_PAGE_JSON))
        .mockReturnValueOnce(JSON.stringify({ ...SIMPLE_PAGE_JSON, route: { path: '/updated' } }));

      const loader = new JsonPageLoader('/project');

      // Act
      const result1 = await loader.loadPage('src/pages/index.json');
      loader.clearCache('src/pages/index.json');
      const result2 = await loader.loadPage('src/pages/index.json');

      // Assert
      expect(result1.page.route?.path).toBe('/');
      expect(result2.page.route?.path).toBe('/updated');
    });
  });
});

describe('Integration: Full JSON page workflow', () => {
  // ==================== Integration Tests ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it('should complete full workflow: load -> resolve imports -> load data -> generate paths -> compile', async () => {
    // Arrange
    const pageJson: JsonPage = {
      version: '1.0',
      route: {
        path: '/docs/:slug',
        layout: 'docs',
        meta: { title: 'Documentation' },
      },
      imports: {
        nav: '../../data/nav.json',
      },
      data: {
        docs: {
          type: 'glob',
          pattern: '../../content/docs/*.mdx',
          transform: 'mdx',
        },
      },
      getStaticPaths: {
        source: 'docs',
        params: {
          slug: { expr: 'var', name: 'item', path: 'slug' },
        },
      },
      view: {
        kind: 'element',
        tag: 'article',
        children: [
          { kind: 'text', value: { expr: 'data', name: 'docs', path: 'frontmatter.title' } },
        ],
      },
    };

    const navData = {
      items: [
        { title: 'Getting Started', href: '/docs/getting-started' },
        { title: 'API', href: '/docs/api' },
      ],
    };

    const fg = await import('fast-glob');
    vi.mocked(fg.default).mockResolvedValue([
      '../../content/docs/getting-started.mdx',
      '../../content/docs/api.mdx',
    ]);

    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(JSON.stringify(pageJson))           // Page file
      .mockReturnValueOnce(JSON.stringify(navData))            // Nav import
      .mockReturnValueOnce('---\nslug: getting-started\ntitle: Getting Started\n---\n# Getting Started')
      .mockReturnValueOnce('---\nslug: api\ntitle: API Reference\n---\n# API');

    const loader = new JsonPageLoader('/project');

    // Act - Load page
    const pageInfo = await loader.loadPage('src/pages/docs/[slug].json');

    // Assert - Page loaded correctly
    expect(pageInfo.page.version).toBe('1.0');
    expect(pageInfo.resolvedImports.nav).toEqual(navData);
    expect(pageInfo.loadedData.docs).toHaveLength(2);

    // Act - Generate static paths
    const paths = await loader.getStaticPaths('src/pages/docs/[slug].json');

    // Assert - Paths generated
    expect(paths).toHaveLength(2);
    expect(paths.map((p: StaticPathResult) => p.params.slug)).toContain('getting-started');
    expect(paths.map((p: StaticPathResult) => p.params.slug)).toContain('api');

    // Act - Compile for specific path
    const program = await loader.compile('src/pages/docs/[slug].json', {
      params: { slug: 'getting-started' },
    });

    // Assert - Program compiled
    expect(program.version).toBe('1.0');
    expect(program.route?.path).toBe('/docs/:slug');
    expect(program.importData?.nav).toEqual(navData);
  });
});

// Cleanup
afterEach(() => {
  vi.clearAllMocks();
});
