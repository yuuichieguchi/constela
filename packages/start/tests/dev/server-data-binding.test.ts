/**
 * Test module for dev server frontmatter data binding.
 *
 * Coverage:
 * - Data expression resolution with matched MDX item in dev server
 * - extractMdxContentSlotWithData should return matched item for data binding
 * - Data expression `{ expr: "data", name: "docs", path: "frontmatter.title" }` resolution
 *
 * TDD Red Phase: These tests verify the bug fix for frontmatter data binding issue
 * in dev server.
 *
 * Bug:
 * - Build process: After finding matching item, replaces `docs` array with single item
 *   so `docs` = `{ frontmatter: {...}, content: {...}, slug: "..." }`
 * - Dev server: `docs` = `[{item1}, {item2}, ...]` (array of all items)
 *   Data expression `frontmatter.title` fails because `docs` is an array
 *
 * Solution:
 * - extractMdxContentSlot should also return the matched item for data binding
 * - Or create new function extractMdxContentSlotWithData
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompiledProgram, CompiledNode } from '@constela/compiler';
import type { ViewNode } from '@constela/core';

// ==================== Test Fixtures ====================

/**
 * Mock MDX content for testing
 */
const createMockMdxContent = (title: string): CompiledNode => ({
  kind: 'element',
  tag: 'article',
  children: [
    {
      kind: 'element',
      tag: 'h1',
      children: [{ kind: 'text', value: { expr: 'lit', value: title } }],
    },
    {
      kind: 'element',
      tag: 'p',
      children: [{ kind: 'text', value: { expr: 'lit', value: `Content for ${title}` } }],
    },
  ],
} as CompiledNode);

/**
 * Mock loaded data with multiple MDX items
 */
const createMockLoadedData = () => ({
  docs: [
    {
      slug: 'intro',
      frontmatter: { title: 'Introduction', description: 'Getting started guide' },
      content: createMockMdxContent('Introduction'),
      file: 'content/docs/intro.mdx',
    },
    {
      slug: 'core',
      frontmatter: { title: 'Core Concepts', description: 'Understanding the basics' },
      content: createMockMdxContent('Core Concepts'),
      file: 'content/docs/core.mdx',
    },
    {
      slug: 'advanced',
      frontmatter: { title: 'Advanced Usage', description: 'Deep dive into features' },
      content: createMockMdxContent('Advanced Usage'),
      file: 'content/docs/advanced.mdx',
    },
  ],
});

// ==================== extractMdxContentSlotWithData Tests ====================

describe('extractMdxContentSlotWithData', () => {
  /**
   * This test verifies that the function returns both:
   * 1. The MDX content slot (for layout composition)
   * 2. The full matched item (for data expression binding)
   */
  describe('returns matched item for data binding along with content slot', () => {
    it('should return matched item when slug matches route param', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'core' };
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result).toBeDefined();
      expect(result?.slot).toBeDefined();
      expect(result?.slot['mdx-content']).toBeDefined();
      expect(result?.matchedItem).toBeDefined();
      expect(result?.matchedItem).toEqual({
        slug: 'core',
        frontmatter: { title: 'Core Concepts', description: 'Understanding the basics' },
        content: expect.any(Object),
        file: 'content/docs/core.mdx',
      });
    });

    it('should return matchedItem.frontmatter accessible for data binding', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result?.matchedItem?.frontmatter).toBeDefined();
      expect(result?.matchedItem?.frontmatter.title).toBe('Introduction');
      expect(result?.matchedItem?.frontmatter.description).toBe('Getting started guide');
    });

    it('should return undefined when no item matches the slug', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'nonexistent' };
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when data source does not exist', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'nonexistent';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when loadedData is empty', async () => {
      // Arrange
      const loadedData = {};
      const routeParams = { slug: 'intro' };
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('handles index slug for root routes', () => {
    it('should default to index slug when slug param is empty', async () => {
      // Arrange
      const loadedData = {
        docs: [
          {
            slug: 'index',
            frontmatter: { title: 'Documentation Index' },
            content: createMockMdxContent('Documentation Index'),
          },
          {
            slug: 'guide',
            frontmatter: { title: 'Guide' },
            content: createMockMdxContent('Guide'),
          },
        ],
      };
      const routeParams = { slug: '' };
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result?.matchedItem?.frontmatter.title).toBe('Documentation Index');
    });

    it('should default to index slug when slug param is undefined', async () => {
      // Arrange
      const loadedData = {
        docs: [
          {
            slug: 'index',
            frontmatter: { title: 'Documentation Index' },
            content: createMockMdxContent('Documentation Index'),
          },
        ],
      };
      const routeParams = {} as Record<string, string>;
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result?.matchedItem?.frontmatter.title).toBe('Documentation Index');
    });
  });

  describe('handles nested frontmatter paths', () => {
    it('should preserve nested frontmatter structure for deep path access', async () => {
      // Arrange
      const loadedData = {
        docs: [
          {
            slug: 'test',
            frontmatter: {
              title: 'Test Title',
              meta: {
                author: 'John Doe',
                tags: ['typescript', 'testing'],
                published: { year: 2024, month: 1 },
              },
            },
            content: createMockMdxContent('Test'),
          },
        ],
      };
      const routeParams = { slug: 'test' };
      const dataSourceName = 'docs';

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, dataSourceName, routeParams);

      // Assert
      expect(result?.matchedItem?.frontmatter.meta.author).toBe('John Doe');
      expect(result?.matchedItem?.frontmatter.meta.tags).toEqual(['typescript', 'testing']);
      expect(result?.matchedItem?.frontmatter.meta.published.year).toBe(2024);
    });
  });
});

// ==================== Dev Server Data Binding Integration Tests ====================

describe('Dev Server Data Binding Integration', () => {
  /**
   * This tests that the dev server properly binds matched item data
   * so that data expressions like `{ expr: "data", name: "docs", path: "frontmatter.title" }`
   * resolve correctly.
   */
  describe('data expression resolution with matched item', () => {
    it('should resolve frontmatter.title from matched item', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'core' };

      // The data expression that needs to resolve
      const dataExpression = {
        expr: 'data' as const,
        name: 'docs',
        path: 'frontmatter.title',
      };

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, 'docs', routeParams);

      // Simulate what the dev server should do:
      // Replace the array with the single matched item for data expression resolution
      const boundData = result?.matchedItem ?? loadedData['docs'];

      // Access the path from the bound data
      const resolvedValue = getNestedValue(boundData, dataExpression.path);

      // Assert
      expect(resolvedValue).toBe('Core Concepts');
    });

    it('should resolve frontmatter.description from matched item', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'advanced' };
      const dataExpression = {
        expr: 'data' as const,
        name: 'docs',
        path: 'frontmatter.description',
      };

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, 'docs', routeParams);
      const boundData = result?.matchedItem;
      const resolvedValue = getNestedValue(boundData, dataExpression.path);

      // Assert
      expect(resolvedValue).toBe('Deep dive into features');
    });

    it('should resolve slug from matched item', async () => {
      // Arrange
      const loadedData = createMockLoadedData();
      const routeParams = { slug: 'intro' };
      const dataExpression = {
        expr: 'data' as const,
        name: 'docs',
        path: 'slug',
      };

      // Act
      const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
      const result = extractMdxContentSlotWithData(loadedData, 'docs', routeParams);
      const boundData = result?.matchedItem;
      const resolvedValue = getNestedValue(boundData, dataExpression.path);

      // Assert
      expect(resolvedValue).toBe('intro');
    });
  });
});

// ==================== Regression Test ====================

describe('Regression: Dev Server vs Build Data Binding Parity', () => {
  /**
   * This test verifies that the dev server produces the same data binding behavior
   * as the build process for dynamic MDX routes.
   *
   * Build process behavior (correct):
   * - getStaticPaths returns paths with `data: matchedItem`
   * - program.importData.__pathData = matchedItem
   * - OR data source is replaced with single item
   *
   * Dev server behavior (should match):
   * - extractMdxContentSlotWithData returns matchedItem
   * - dev server should bind matchedItem to data source for expression resolution
   */
  it('should bind single matched item (not array) to data source in dev server', async () => {
    // Arrange
    const loadedData = createMockLoadedData();
    const routeParams = { slug: 'core' };

    // Act
    const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
    const result = extractMdxContentSlotWithData(loadedData, 'docs', routeParams);

    // Assert - matchedItem should be a single object, not an array
    expect(result?.matchedItem).toBeDefined();
    expect(Array.isArray(result?.matchedItem)).toBe(false);
    expect(typeof result?.matchedItem).toBe('object');
    expect(result?.matchedItem).toHaveProperty('frontmatter');
    expect(result?.matchedItem).toHaveProperty('content');
    expect(result?.matchedItem).toHaveProperty('slug');
  });

  it('should provide matchedItem in same structure as build __pathData', async () => {
    // Arrange - simulating build process __pathData structure
    const loadedData = createMockLoadedData();
    const routeParams = { slug: 'intro' };

    // Act
    const { extractMdxContentSlotWithData } = await import('../../src/dev/server.js');
    const result = extractMdxContentSlotWithData(loadedData, 'docs', routeParams);

    // Assert - structure should match what build puts in __pathData
    const matchedItem = result?.matchedItem;
    expect(matchedItem).toMatchObject({
      slug: 'intro',
      frontmatter: {
        title: 'Introduction',
        description: 'Getting started guide',
      },
      content: expect.any(Object),
    });
  });
});

// ==================== Helper Functions ====================

/**
 * Get a nested value from an object using dot notation
 * This mimics how data expressions resolve paths
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
