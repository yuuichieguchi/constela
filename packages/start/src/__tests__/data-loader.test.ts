/**
 * Test module for Data Loader.
 *
 * Coverage:
 * - Glob file loading
 * - Single file loading
 * - API fetching (mock)
 * - MDX/YAML/CSV transformations
 * - Static path generation
 * - DataLoader class
 *
 * TDD Red Phase: These tests verify the data loading functionality
 * that will be added to support build-time content loading in Constela Start.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import {
  loadGlob,
  loadFile,
  loadApi,
  transformMdx,
  transformYaml,
  transformCsv,
  generateStaticPaths,
  DataLoader,
} from '../data/loader.js';
import type { DataSource, StaticPathsDefinition } from '@constela/core';

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

// Mock fetch for API tests
global.fetch = vi.fn();

describe('loadGlob', () => {
  // ==================== Glob File Loading ====================

  describe('glob file loading', () => {
    beforeEach(async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should load files matching glob pattern', async () => {
      // Arrange
      const baseDir = '/project';
      const pattern = 'content/blog/*.mdx';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'content/blog/post1.mdx',
        'content/blog/post2.mdx',
      ]);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('---\ntitle: Post 1\n---\nContent 1')
        .mockReturnValueOnce('---\ntitle: Post 2\n---\nContent 2');

      // Act
      const result = await loadGlob(baseDir, pattern);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.file).toBe('content/blog/post1.mdx');
      expect(result[1]?.file).toBe('content/blog/post2.mdx');
    });

    it('should return empty array when no files match', async () => {
      // Arrange
      const baseDir = '/project';
      const pattern = 'content/nonexistent/*.mdx';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([]);

      // Act
      const result = await loadGlob(baseDir, pattern);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should include file path and raw content in result', async () => {
      // Arrange
      const baseDir = '/project';
      const pattern = 'content/*.json';
      const content = '{"title": "Test"}';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/test.json']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(content);

      // Act
      const result = await loadGlob(baseDir, pattern);

      // Assert
      expect(result[0]?.file).toBe('content/test.json');
      expect(result[0]?.raw).toBe(content);
    });

    it('should handle deeply nested glob patterns', async () => {
      // Arrange
      const baseDir = '/project';
      const pattern = 'content/**/*.mdx';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue([
        'content/blog/2024/post1.mdx',
        'content/blog/2024/01/post2.mdx',
        'content/docs/guide.mdx',
      ]);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('content');

      // Act
      const result = await loadGlob(baseDir, pattern);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should apply mdx transform when specified', async () => {
      // Arrange
      const baseDir = '/project';
      const pattern = 'content/*.mdx';
      const mdxContent = '---\ntitle: Test Post\nslug: test\n---\n\n# Hello World';

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/test.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(mdxContent);

      // Act
      const result = await loadGlob(baseDir, pattern, 'mdx');

      // Assert
      expect(result[0]?.frontmatter).toBeDefined();
      expect(result[0]?.frontmatter.title).toBe('Test Post');
      expect(result[0]?.content).toBeDefined();
    });
  });
});

describe('loadFile', () => {
  // ==================== Single File Loading ====================

  describe('single file loading', () => {
    beforeEach(async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should load JSON file and parse content', async () => {
      // Arrange
      const baseDir = '/project';
      const filePath = 'data/config.json';
      const jsonContent = '{"title": "My Site", "version": "1.0"}';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(jsonContent);

      // Act
      const result = await loadFile(baseDir, filePath);

      // Assert
      expect(result.title).toBe('My Site');
      expect(result.version).toBe('1.0');
    });

    it('should throw error when file does not exist', async () => {
      // Arrange
      const baseDir = '/project';
      const filePath = 'data/nonexistent.json';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      await expect(loadFile(baseDir, filePath)).rejects.toThrow(
        /file not found/i
      );
    });

    it('should apply yaml transform when specified', async () => {
      // Arrange
      const baseDir = '/project';
      const filePath = 'data/config.yaml';
      const yamlContent = 'title: My Site\nversion: 1.0';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

      // Act
      const result = await loadFile(baseDir, filePath, 'yaml');

      // Assert
      expect(result.title).toBe('My Site');
      expect(result.version).toBe(1.0);
    });

    it('should apply csv transform when specified', async () => {
      // Arrange
      const baseDir = '/project';
      const filePath = 'data/products.csv';
      const csvContent = 'name,price\nProduct A,100\nProduct B,200';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(csvContent);

      // Act
      const result = await loadFile(baseDir, filePath, 'csv');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('Product A');
      expect(result[0]?.price).toBe('100');
    });

    it('should return raw content for non-JSON files without transform', async () => {
      // Arrange
      const baseDir = '/project';
      const filePath = 'data/readme.txt';
      const textContent = 'This is a readme file.';

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(textContent);

      // Act
      const result = await loadFile(baseDir, filePath);

      // Assert
      expect(result).toBe(textContent);
    });
  });
});

describe('loadApi', () => {
  // ==================== API Fetching ====================

  describe('API fetching', () => {
    beforeEach(() => {
      vi.mocked(global.fetch).mockReset();
    });

    it('should fetch data from API endpoint', async () => {
      // Arrange
      const url = 'https://api.example.com/posts';
      const mockData = [
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response);

      // Act
      const result = await loadApi(url);

      // Assert
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(url);
    });

    it('should throw error when API request fails', async () => {
      // Arrange
      const url = 'https://api.example.com/posts';

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      // Act & Assert
      await expect(loadApi(url)).rejects.toThrow(/api request failed/i);
    });

    it('should throw error when network fails', async () => {
      // Arrange
      const url = 'https://api.example.com/posts';

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(loadApi(url)).rejects.toThrow(/network error/i);
    });

    it('should apply csv transform to API response', async () => {
      // Arrange
      const url = 'https://api.example.com/data.csv';
      const csvContent = 'name,value\nItem A,100\nItem B,200';

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => csvContent,
      } as Response);

      // Act
      const result = await loadApi(url, 'csv');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('Item A');
    });
  });
});

describe('transformMdx', () => {
  // ==================== MDX Transformation ====================

  describe('MDX transformation', () => {
    it('should parse frontmatter from MDX content', async () => {
      // Arrange
      const content = '---\ntitle: Test Post\nauthor: John\n---\n\n# Hello';

      // Act
      const result = await transformMdx(content, 'test.mdx');

      // Assert
      expect(result.frontmatter.title).toBe('Test Post');
      expect(result.frontmatter.author).toBe('John');
    });

    it('should compile content to CompiledNode', async () => {
      // Arrange
      const content = '---\ntitle: Test\n---\n\n# Hello World\n\nParagraph text.';

      // Act
      const result = await transformMdx(content, 'test.mdx');

      // Assert
      expect(result.content).toHaveProperty('kind');
      expect(result.content.kind).toBe('element');
    });

    it('should handle content without frontmatter', async () => {
      // Arrange
      const content = '# No Frontmatter\n\nJust content.';

      // Act
      const result = await transformMdx(content, 'test.mdx');

      // Assert
      expect(result.frontmatter).toEqual({});
      expect(result.content).toHaveProperty('kind');
    });

    it('should handle complex frontmatter with arrays and objects', async () => {
      // Arrange
      const content = `---
title: Complex Post
tags:
  - javascript
  - typescript
author:
  name: John Doe
  email: john@example.com
---

# Content`;

      // Act
      const result = await transformMdx(content, 'test.mdx');

      // Assert
      expect(result.frontmatter.tags).toEqual(['javascript', 'typescript']);
      expect((result.frontmatter.author as Record<string, string>).name).toBe('John Doe');
    });

    it('should generate slug from filename', async () => {
      // Arrange
      const content = '---\ntitle: Test\n---\n\n# Hello';

      // Act
      const result = await transformMdx(content, 'my-post.mdx');

      // Assert
      expect(result.slug).toBe('my-post');
    });

    it('should use frontmatter slug when present', async () => {
      // Arrange
      const content = '---\ntitle: Test\nslug: custom-slug\n---\n\n# Hello';

      // Act
      const result = await transformMdx(content, 'my-post.mdx');

      // Assert
      expect(result.slug).toBe('custom-slug');
    });
  });
});

describe('transformYaml', () => {
  // ==================== YAML Transformation ====================

  describe('YAML transformation', () => {
    it('should parse YAML content', () => {
      // Arrange
      const content = 'title: My Site\nversion: 1.0\nenabled: true';

      // Act
      const result = transformYaml(content);

      // Assert
      expect(result.title).toBe('My Site');
      expect(result.version).toBe(1.0);
      expect(result.enabled).toBe(true);
    });

    it('should handle nested YAML structures', () => {
      // Arrange
      const content = `
database:
  host: localhost
  port: 5432
  credentials:
    user: admin
    password: secret
`;

      // Act
      const result = transformYaml(content);

      // Assert
      expect(result.database.host).toBe('localhost');
      expect(result.database.credentials.user).toBe('admin');
    });

    it('should handle YAML arrays', () => {
      // Arrange
      const content = `
items:
  - name: Item 1
    price: 100
  - name: Item 2
    price: 200
`;

      // Act
      const result = transformYaml(content);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.name).toBe('Item 1');
    });
  });
});

describe('transformCsv', () => {
  // ==================== CSV Transformation ====================

  describe('CSV transformation', () => {
    it('should parse CSV content with headers', () => {
      // Arrange
      const content = 'name,age,city\nJohn,30,NYC\nJane,25,LA';

      // Act
      const result = transformCsv(content);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('John');
      expect(result[0]?.age).toBe('30');
      expect(result[1]?.city).toBe('LA');
    });

    it('should handle quoted values with commas', () => {
      // Arrange
      const content = 'name,description\nProduct A,"Description, with comma"\nProduct B,"Normal"';

      // Act
      const result = transformCsv(content);

      // Assert
      expect(result[0]?.description).toBe('Description, with comma');
    });

    it('should handle empty CSV', () => {
      // Arrange
      const content = 'name,value';

      // Act
      const result = transformCsv(content);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from values', () => {
      // Arrange
      const content = 'name,value\n  John  ,  100  ';

      // Act
      const result = transformCsv(content);

      // Assert
      expect(result[0]?.name).toBe('John');
      expect(result[0]?.value).toBe('100');
    });
  });
});

describe('generateStaticPaths', () => {
  // ==================== Static Path Generation ====================

  describe('static path generation', () => {
    it('should generate paths from data items', async () => {
      // Arrange
      const data = [
        { slug: 'post-1', title: 'Post 1' },
        { slug: 'post-2', title: 'Post 2' },
      ];

      const staticPathsDef: StaticPathsDefinition = {
        source: 'posts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
        },
      } as unknown as StaticPathsDefinition;

      // Act
      const paths = await generateStaticPaths(data, staticPathsDef);

      // Assert
      expect(paths).toHaveLength(2);
      expect(paths[0]?.params.slug).toBe('post-1');
      expect(paths[1]?.params.slug).toBe('post-2');
    });

    it('should handle multiple params', async () => {
      // Arrange
      const data = [
        { year: '2024', slug: 'post-1' },
        { year: '2024', slug: 'post-2' },
        { year: '2023', slug: 'post-3' },
      ];

      const staticPathsDef: StaticPathsDefinition = {
        source: 'posts',
        params: {
          year: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'year' },
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
        },
      } as unknown as StaticPathsDefinition;

      // Act
      const paths = await generateStaticPaths(data, staticPathsDef);

      // Assert
      expect(paths).toHaveLength(3);
      expect(paths[0]?.params).toEqual({ year: '2024', slug: 'post-1' });
      expect(paths[2]?.params).toEqual({ year: '2023', slug: 'post-3' });
    });

    it('should handle nested data paths', async () => {
      // Arrange
      const data = [
        { metadata: { slug: 'post-1' }, content: 'Content 1' },
        { metadata: { slug: 'post-2' }, content: 'Content 2' },
      ];

      const staticPathsDef: StaticPathsDefinition = {
        source: 'posts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'metadata.slug' },
        },
      } as unknown as StaticPathsDefinition;

      // Act
      const paths = await generateStaticPaths(data, staticPathsDef);

      // Assert
      expect(paths[0]?.params.slug).toBe('post-1');
    });

    it('should return empty array for empty data', async () => {
      // Arrange
      const data: unknown[] = [];

      const staticPathsDef: StaticPathsDefinition = {
        source: 'posts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
        },
      } as unknown as StaticPathsDefinition;

      // Act
      const paths = await generateStaticPaths(data, staticPathsDef);

      // Assert
      expect(paths).toHaveLength(0);
    });

    it('should include original data item in path object', async () => {
      // Arrange
      const data = [
        { slug: 'post-1', title: 'Post 1', content: 'Full content' },
      ];

      const staticPathsDef: StaticPathsDefinition = {
        source: 'posts',
        params: {
          slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
        },
      } as unknown as StaticPathsDefinition;

      // Act
      const paths = await generateStaticPaths(data, staticPathsDef);

      // Assert
      expect(paths[0]?.data).toEqual(data[0]);
    });
  });
});

describe('DataLoader class', () => {
  // ==================== DataLoader ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(global.fetch).mockReset();
  });

  describe('initialization', () => {
    it('should initialize with project root', () => {
      // Arrange & Act
      const loader = new DataLoader('/project');

      // Assert
      expect(loader).toBeDefined();
    });
  });

  describe('loadDataSource', () => {
    it('should load glob data source', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/post.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('---\ntitle: Test\n---\nContent');

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'glob',
        pattern: 'content/*.mdx',
        transform: 'mdx',
      } as DataSource;

      // Act
      const result = await loader.loadDataSource('posts', dataSource);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it('should load file data source', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('{"title": "Config"}');

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'file',
        path: 'data/config.json',
      } as DataSource;

      // Act
      const result = await loader.loadDataSource('config', dataSource);

      // Assert
      expect(result.title).toBe('Config');
    });

    it('should load api data source', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1, title: 'Post' }],
      } as Response);

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'api',
        url: 'https://api.example.com/posts',
      } as DataSource;

      // Act
      const result = await loader.loadDataSource('external', dataSource);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should throw error for unknown data source type', async () => {
      // Arrange
      const loader = new DataLoader('/project');
      const dataSource = {
        type: 'unknown',
      } as unknown as DataSource;

      // Act & Assert
      await expect(loader.loadDataSource('invalid', dataSource)).rejects.toThrow(
        /unknown data source type/i
      );
    });
  });

  describe('loadAllDataSources', () => {
    it('should load multiple data sources', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/post.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('---\ntitle: Post\n---\nContent')
        .mockReturnValueOnce('{"version": "1.0"}');

      const loader = new DataLoader('/project');
      const dataSources: Record<string, DataSource> = {
        posts: {
          type: 'glob',
          pattern: 'content/*.mdx',
          transform: 'mdx',
        } as DataSource,
        config: {
          type: 'file',
          path: 'data/config.json',
        } as DataSource,
      };

      // Act
      const result = await loader.loadAllDataSources(dataSources);

      // Assert
      expect(result.posts).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.config.version).toBe('1.0');
    });

    it('should return empty object when no data sources', async () => {
      // Arrange
      const loader = new DataLoader('/project');

      // Act
      const result = await loader.loadAllDataSources({});

      // Assert
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('caching', () => {
    it('should cache loaded data sources', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('{"title": "Cached"}');

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'file',
        path: 'data/config.json',
      } as DataSource;

      // Act
      const result1 = await loader.loadDataSource('config', dataSource);
      const result2 = await loader.loadDataSource('config', dataSource);

      // Assert - should be same reference (cached)
      expect(result1).toBe(result2);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should allow cache invalidation', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('{"title": "First"}')
        .mockReturnValueOnce('{"title": "Second"}');

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'file',
        path: 'data/config.json',
      } as DataSource;

      // Act
      const result1 = await loader.loadDataSource('config', dataSource);
      loader.clearCache('config');
      const result2 = await loader.loadDataSource('config', dataSource);

      // Assert
      expect(result1.title).toBe('First');
      expect(result2.title).toBe('Second');
    });

    it('should clear all cache', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('{"title": "Test"}');

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'file',
        path: 'data/config.json',
      } as DataSource;

      // Act
      await loader.loadDataSource('config', dataSource);
      loader.clearAllCache();

      // Assert - cache should be empty
      expect(loader.getCacheSize()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error for file not found', async () => {
      // Arrange
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'file',
        path: 'nonexistent.json',
      } as DataSource;

      // Act & Assert
      try {
        await loader.loadDataSource('missing', dataSource);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('nonexistent.json');
        expect((error as Error).message).toContain('not found');
      }
    });

    it('should provide helpful error for API failure', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const loader = new DataLoader('/project');
      const dataSource: DataSource = {
        type: 'api',
        url: 'https://api.example.com/fail',
      } as DataSource;

      // Act & Assert
      try {
        await loader.loadDataSource('failing', dataSource);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('api');
        expect((error as Error).message).toMatch(/500|failed/i);
      }
    });
  });
});

describe('Integration: Full SSG workflow', () => {
  // ==================== Integration Tests ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(global.fetch).mockReset();
  });

  it('should complete full SSG workflow: load -> transform -> generate paths', async () => {
    // Arrange
    const fg = await import('fast-glob');
    vi.mocked(fg.default).mockResolvedValue([
      'content/blog/post-1.mdx',
      'content/blog/post-2.mdx',
    ]);

    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('---\nslug: post-1\ntitle: First Post\n---\n# First')
      .mockReturnValueOnce('---\nslug: post-2\ntitle: Second Post\n---\n# Second');

    const loader = new DataLoader('/project');

    // Load data
    const dataSource: DataSource = {
      type: 'glob',
      pattern: 'content/blog/*.mdx',
      transform: 'mdx',
    } as DataSource;

    const posts = await loader.loadDataSource('posts', dataSource);

    // Generate static paths
    const staticPathsDef: StaticPathsDefinition = {
      source: 'posts',
      params: {
        slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'frontmatter.slug' },
      },
    } as unknown as StaticPathsDefinition;

    const paths = await generateStaticPaths(posts as unknown[], staticPathsDef);

    // Assert
    expect(paths).toHaveLength(2);
    expect(paths[0]?.params.slug).toBe('post-1');
    expect(paths[1]?.params.slug).toBe('post-2');
    expect(paths[0]?.data.frontmatter.title).toBe('First Post');
  });
});

// Cleanup
afterEach(() => {
  vi.clearAllMocks();
});
