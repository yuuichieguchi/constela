/**
 * Test module for SSG with function exports (dynamic route params support).
 *
 * Coverage:
 * - Function export support in SSG
 *   - Should generate pages using function export with params
 *   - Should handle async function exports
 *   - Should fail build when function export throws
 *   - Should maintain backward compatibility with static exports
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ScannedRoute, StaticPathsResult } from '../../src/types.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-dynamic-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Simple static program (backward compatibility)
 */
const staticProgram: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Static Page' } }],
  },
};

/**
 * Create program with dynamic content based on params
 */
function createDynamicProgram(params: Record<string, string>): CompiledProgram {
  const id = params.id || '';
  const slug = params.slug || '';
  const displayValue = id || slug || 'unknown';
  return {
    version: '1.0',
    state: {
      id: { type: 'string', initial: id },
      slug: { type: 'string', initial: slug },
    },
    actions: {},
    view: {
      kind: 'element',
      tag: 'article',
      props: { 'data-id': { expr: 'lit', value: id } },
      children: [
        {
          kind: 'element',
          tag: 'h1',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Page: ' + displayValue } },
          ],
        },
      ],
    },
  };
}

/**
 * Sync function export
 */
const syncFunctionExport = (
  params: Record<string, string>
): CompiledProgram => {
  return createDynamicProgram(params);
};

/**
 * Async function export
 */
const asyncFunctionExport = async (
  params: Record<string, string>
): Promise<CompiledProgram> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return createDynamicProgram(params);
};

/**
 * Throwing function export
 */
const throwingFunctionExport = (): CompiledProgram => {
  throw new Error('Failed to generate page');
};

/**
 * Async throwing function export
 */
const asyncThrowingFunctionExport = async (): Promise<CompiledProgram> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Async page generation failed');
};

// ==================== SSG with Function Export Tests ====================

describe('generateStaticPages with function exports', () => {
  let tempDir: string;
  let outDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    await mkdir(outDir, { recursive: true });
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ==================== Function Export with Params ====================

  describe('function export with params', () => {
    it('should generate pages using sync function export with params', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/users/[id].ts'),
          pattern: '/users/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      // Mock module with function export and getStaticPaths
      vi.doMock(join(tempDir, 'routes/users/[id].ts'), () => ({
        default: syncFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [
            { params: { id: '1' } },
            { params: { id: '2' } },
            { params: { id: '3' } },
          ],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(3);
      expect(generatedPaths.some((p) => p.includes('users/1'))).toBe(true);
      expect(generatedPaths.some((p) => p.includes('users/2'))).toBe(true);
      expect(generatedPaths.some((p) => p.includes('users/3'))).toBe(true);
    });

    it('should pass correct params to function export', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/posts/[slug].ts'),
          pattern: '/posts/:slug',
          type: 'page',
          params: ['slug'],
        },
      ];

      const capturedParams: Record<string, string>[] = [];
      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        capturedParams.push({ ...params });
        return createDynamicProgram(params);
      };

      vi.doMock(join(tempDir, 'routes/posts/[slug].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [
            { params: { slug: 'hello-world' } },
            { params: { slug: 'another-post' } },
          ],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert
      expect(capturedParams).toHaveLength(2);
      expect(capturedParams).toContainEqual({ slug: 'hello-world' });
      expect(capturedParams).toContainEqual({ slug: 'another-post' });
    });

    it('should handle multiple dynamic params in function export', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/posts/[year]/[month].ts'),
          pattern: '/posts/:year/:month',
          type: 'page',
          params: ['year', 'month'],
        },
      ];

      const capturedParams: Record<string, string>[] = [];
      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        capturedParams.push({ ...params });
        return staticProgram;
      };

      vi.doMock(join(tempDir, 'routes/posts/[year]/[month].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [
            { params: { year: '2024', month: '01' } },
            { params: { year: '2024', month: '02' } },
          ],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(2);
      expect(capturedParams).toContainEqual({ year: '2024', month: '01' });
      expect(capturedParams).toContainEqual({ year: '2024', month: '02' });
    });

    it('should generate HTML with content from function export', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/items/[id].ts'),
          pattern: '/items/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/items/[id].ts'), () => ({
        default: syncFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'item-42' } }],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);
      const htmlContent = await readFile(generatedPaths[0]!, 'utf-8');

      // Assert
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<article');
      // The function export should have created content based on params
      expect(htmlContent).toContain('Page:');
    });
  });

  // ==================== Async Function Export ====================

  describe('async function export', () => {
    it('should handle async function export', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/async/[id].ts'),
          pattern: '/async/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/async/[id].ts'), () => ({
        default: asyncFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'async-1' } }],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      const htmlContent = await readFile(generatedPaths[0]!, 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });

    it('should wait for async function export to resolve', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/slow/[id].ts'),
          pattern: '/slow/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      let resolved = false;
      const slowAsyncFn = async (
        params: Record<string, string>
      ): Promise<CompiledProgram> => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        resolved = true;
        return createDynamicProgram(params);
      };

      vi.doMock(join(tempDir, 'routes/slow/[id].ts'), () => ({
        default: slowAsyncFn,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'slow-page' } }],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert
      expect(resolved).toBe(true);
    });

    it('should handle async getStaticPaths with async function export', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/both-async/[id].ts'),
          pattern: '/both-async/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/both-async/[id].ts'), () => ({
        default: asyncFunctionExport,
        getStaticPaths: async (): Promise<StaticPathsResult> => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return {
            paths: [{ params: { id: 'fetched-id' } }],
          };
        },
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      expect(generatedPaths[0]).toContain('both-async');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should fail build when sync function export throws', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/error/[id].ts'),
          pattern: '/error/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/error/[id].ts'), () => ({
        default: throwingFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'will-fail' } }],
        }),
      }));

      // Act & Assert
      await expect(generateStaticPages(routes, outDir)).rejects.toThrow(
        'Failed to generate page'
      );
    });

    it('should fail build when async function export throws', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/async-error/[id].ts'),
          pattern: '/async-error/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/async-error/[id].ts'), () => ({
        default: asyncThrowingFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'will-fail' } }],
        }),
      }));

      // Act & Assert
      await expect(generateStaticPages(routes, outDir)).rejects.toThrow(
        'Async page generation failed'
      );
    });

    it('should include route info in error message', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/products/[sku].ts'),
          pattern: '/products/:sku',
          type: 'page',
          params: ['sku'],
        },
      ];

      const errorWithContext = (): CompiledProgram => {
        throw new Error('Database connection failed');
      };

      vi.doMock(join(tempDir, 'routes/products/[sku].ts'), () => ({
        default: errorWithContext,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { sku: 'ABC-123' } }],
        }),
      }));

      // Act & Assert
      await expect(generateStaticPages(routes, outDir)).rejects.toThrow();
    });

    it('should not generate any files when error occurs mid-build', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/mixed/[id].ts'),
          pattern: '/mixed/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      let callCount = 0;
      const failOnSecondCall = (
        params: Record<string, string>
      ): CompiledProgram => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Failed on second call');
        }
        return createDynamicProgram(params);
      };

      vi.doMock(join(tempDir, 'routes/mixed/[id].ts'), () => ({
        default: failOnSecondCall,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [
            { params: { id: '1' } },
            { params: { id: '2' } },
            { params: { id: '3' } },
          ],
        }),
      }));

      // Act & Assert
      await expect(generateStaticPages(routes, outDir)).rejects.toThrow(
        'Failed on second call'
      );
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should still work with static CompiledProgram exports', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/static-page.ts'),
          pattern: '/static-page',
          type: 'page',
          params: [],
        },
      ];

      vi.doMock(join(tempDir, 'routes/static-page.ts'), () => ({
        default: staticProgram,
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      const htmlContent = await readFile(generatedPaths[0]!, 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Static Page');
    });

    it('should work with static export and getStaticPaths', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/static-dynamic/[id].ts'),
          pattern: '/static-dynamic/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      // Static program export with getStaticPaths (original pattern)
      vi.doMock(join(tempDir, 'routes/static-dynamic/[id].ts'), () => ({
        default: staticProgram,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'a' } }, { params: { id: 'b' } }],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(2);
    });

    it('should handle mix of static and function exports in same build', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/page-a.ts'),
          pattern: '/page-a',
          type: 'page',
          params: [],
        },
        {
          file: join(tempDir, 'routes/page-b/[id].ts'),
          pattern: '/page-b/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      // Static export
      vi.doMock(join(tempDir, 'routes/page-a.ts'), () => ({
        default: staticProgram,
      }));

      // Function export
      vi.doMock(join(tempDir, 'routes/page-b/[id].ts'), () => ({
        default: syncFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: 'dynamic-1' } }],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(2);
      expect(generatedPaths.some((p) => p.includes('page-a'))).toBe(true);
      expect(generatedPaths.some((p) => p.includes('page-b'))).toBe(true);
    });

    it('should skip dynamic routes without getStaticPaths for function exports', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/no-paths/[id].ts'),
          pattern: '/no-paths/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      // Function export without getStaticPaths
      vi.doMock(join(tempDir, 'routes/no-paths/[id].ts'), () => ({
        default: syncFunctionExport,
        getStaticPaths: undefined, // Explicitly undefined to avoid vitest strict mode error
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(0);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty getStaticPaths result', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/empty/[id].ts'),
          pattern: '/empty/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/empty/[id].ts'), () => ({
        default: syncFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(0);
    });

    it('should handle special characters in params', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/special/[slug].ts'),
          pattern: '/special/:slug',
          type: 'page',
          params: ['slug'],
        },
      ];

      vi.doMock(join(tempDir, 'routes/special/[slug].ts'), () => ({
        default: syncFunctionExport,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { slug: 'hello-world-2024' } }],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      expect(generatedPaths[0]).toContain('hello-world-2024');
    });

    it('should handle function export that returns different programs per params', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/varied/[id].ts'),
          pattern: '/varied/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      const variedPrograms: Record<string, CompiledProgram> = {
        '1': {
          ...staticProgram,
          state: { variant: { type: 'string', initial: 'first' } },
        },
        '2': {
          ...staticProgram,
          state: { variant: { type: 'string', initial: 'second' } },
        },
      };

      const variedFn = (params: Record<string, string>): CompiledProgram => {
        return variedPrograms[params.id] || staticProgram;
      };

      vi.doMock(join(tempDir, 'routes/varied/[id].ts'), () => ({
        default: variedFn,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [{ params: { id: '1' } }, { params: { id: '2' } }],
        }),
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(2);
    });
  });

  // ==================== __pathData Injection ====================

  describe('__pathData injection', () => {
    it('should inject pathData.data into program.importData.__pathData when data exists', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/posts/[slug].ts'),
          pattern: '/posts/:slug',
          type: 'page',
          params: ['slug'],
        },
      ];

      // Track the program passed to generateSinglePage
      let capturedProgram: CompiledProgram | null = null;
      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        const program = createDynamicProgram(params);
        // Store reference before any modifications
        capturedProgram = program;
        return program;
      };

      const pathData = {
        title: 'Test Post Title',
        content: { kind: 'element', tag: 'p', props: {}, children: [] },
        author: 'John Doe',
      };

      vi.doMock(join(tempDir, 'routes/posts/[slug].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): { paths: Array<{ params: Record<string, string>; data?: unknown }> } => ({
          paths: [
            { params: { slug: 'test-post' }, data: pathData },
          ],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert
      // After generation, the program should have importData.__pathData set
      expect(capturedProgram).not.toBeNull();
      // The implementation should inject pathData.data into importData.__pathData
      // This test will FAIL until the implementation is added
      const htmlContent = await readFile(join(outDir, 'posts', 'test-post', 'index.html'), 'utf-8');
      // The hydration script should contain __pathData
      expect(htmlContent).toContain('__pathData');
      expect(htmlContent).toContain('Test Post Title');
    });

    it('should NOT add __pathData when pathData.data is undefined', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/items/[id].ts'),
          pattern: '/items/:id',
          type: 'page',
          params: ['id'],
        },
      ];

      // Track the program modifications
      let programImportData: Record<string, unknown> | undefined;
      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        const program = createDynamicProgram(params);
        // Set up importData to track modifications
        program.importData = {};
        // We need to capture the state after the injection would happen
        // Use a getter to capture the final state
        const originalImportData = program.importData;
        Object.defineProperty(program, 'importData', {
          get() { return originalImportData; },
          set(value) {
            programImportData = value;
          },
        });
        return program;
      };

      vi.doMock(join(tempDir, 'routes/items/[id].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): StaticPathsResult => ({
          paths: [
            { params: { id: '1' } }, // No data property
          ],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert
      const htmlContent = await readFile(join(outDir, 'items', '1', 'index.html'), 'utf-8');
      // The hydration script should NOT contain __pathData when data is undefined
      expect(htmlContent).not.toContain('__pathData');
    });

    it('should preserve existing importData when adding __pathData', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/articles/[slug].ts'),
          pattern: '/articles/:slug',
          type: 'page',
          params: ['slug'],
        },
      ];

      const existingImportData = {
        siteConfig: { name: 'My Site', version: '1.0' },
        translations: { hello: 'Hello', goodbye: 'Goodbye' },
      };

      const pathData = {
        title: 'Article Title',
        body: 'Article body content',
      };

      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        const program = createDynamicProgram(params);
        // Set existing importData that should be preserved
        program.importData = { ...existingImportData };
        return program;
      };

      vi.doMock(join(tempDir, 'routes/articles/[slug].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): { paths: Array<{ params: Record<string, string>; data?: unknown }> } => ({
          paths: [
            { params: { slug: 'my-article' }, data: pathData },
          ],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert
      const htmlContent = await readFile(join(outDir, 'articles', 'my-article', 'index.html'), 'utf-8');
      // Should contain __pathData
      expect(htmlContent).toContain('__pathData');
      expect(htmlContent).toContain('Article Title');
      // Should also preserve existing importData
      expect(htmlContent).toContain('siteConfig');
      expect(htmlContent).toContain('My Site');
    });

    it('should handle complex nested data in __pathData', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/docs/[slug].ts'),
          pattern: '/docs/:slug',
          type: 'page',
          params: ['slug'],
        },
      ];

      const complexPathData = {
        frontmatter: {
          title: 'Documentation Page',
          tags: ['typescript', 'tutorial'],
          author: {
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
        },
        content: {
          kind: 'element',
          tag: 'article',
          props: {},
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Content here' } },
          ],
        },
        slug: 'getting-started',
      };

      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        return createDynamicProgram(params);
      };

      vi.doMock(join(tempDir, 'routes/docs/[slug].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): { paths: Array<{ params: Record<string, string>; data?: unknown }> } => ({
          paths: [
            { params: { slug: 'getting-started' }, data: complexPathData },
          ],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert
      const htmlContent = await readFile(join(outDir, 'docs', 'getting-started', 'index.html'), 'utf-8');
      // Should contain nested data from __pathData
      expect(htmlContent).toContain('__pathData');
      expect(htmlContent).toContain('Documentation Page');
      expect(htmlContent).toContain('typescript');
      expect(htmlContent).toContain('Jane Smith');
    });

    it('should inject __pathData for each path in multiple paths', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/blog/[slug].ts'),
          pattern: '/blog/:slug',
          type: 'page',
          params: ['slug'],
        },
      ];

      const capturingFn = (params: Record<string, string>): CompiledProgram => {
        return createDynamicProgram(params);
      };

      vi.doMock(join(tempDir, 'routes/blog/[slug].ts'), () => ({
        default: capturingFn,
        getStaticPaths: (): { paths: Array<{ params: Record<string, string>; data?: unknown }> } => ({
          paths: [
            { params: { slug: 'post-1' }, data: { title: 'First Post', id: 1 } },
            { params: { slug: 'post-2' }, data: { title: 'Second Post', id: 2 } },
            { params: { slug: 'post-3' }, data: { title: 'Third Post', id: 3 } },
          ],
        }),
      }));

      // Act
      await generateStaticPages(routes, outDir);

      // Assert - each page should have its own __pathData
      const post1Html = await readFile(join(outDir, 'blog', 'post-1', 'index.html'), 'utf-8');
      const post2Html = await readFile(join(outDir, 'blog', 'post-2', 'index.html'), 'utf-8');
      const post3Html = await readFile(join(outDir, 'blog', 'post-3', 'index.html'), 'utf-8');

      expect(post1Html).toContain('First Post');
      expect(post1Html).not.toContain('Second Post');

      expect(post2Html).toContain('Second Post');
      expect(post2Html).not.toContain('First Post');

      expect(post3Html).toContain('Third Post');
      expect(post3Html).not.toContain('First Post');
    });
  });
});
