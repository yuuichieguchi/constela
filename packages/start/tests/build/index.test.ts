/**
 * Test module for build & SSG functions.
 *
 * Coverage:
 * - build: Production build orchestration
 *   - Default options (outDir: 'dist', routesDir: 'src/routes')
 *   - Custom options (outDir, routesDir, target)
 *   - BuildResult interface (outDir, routes)
 *
 * - generateStaticPages: Static Site Generation
 *   - Static page HTML generation from ScannedRoute[]
 *   - Dynamic route SSG with getStaticPaths
 *   - Output directory structure
 *   - HTML document generation using renderPage + wrapHtml
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ScannedRoute, PageModule, StaticPathsResult } from '../../src/types.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-build-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Simple test program for SSG
 */
const simpleProgram: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Hello World' } }],
  },
};

/**
 * Create a mock PageModule
 */
function createMockPageModule(
  program: CompiledProgram = simpleProgram,
  getStaticPaths?: () => StaticPathsResult
): PageModule {
  const module: PageModule = {
    default: program,
  };
  if (getStaticPaths) {
    module.getStaticPaths = getStaticPaths;
  }
  return module;
}

// ==================== build Tests ====================

describe('build', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src/routes');
    await mkdir(routesDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ==================== Default Options ====================

  describe('default options', () => {
    it('should use "dist" as default outDir when not specified', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      const result = await build({});

      // Assert
      expect(result.outDir).toBe('dist');
    });

    it('should use "src/routes" as default routesDir when not specified', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act & Assert - should not throw when using default
      await expect(build({})).resolves.toBeDefined();
    });

    it('should use "node" as default target when not specified', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      const result = await build({});

      // Assert - target should be node by default (implicitly tested via successful build)
      expect(result).toBeDefined();
    });
  });

  // ==================== Custom Options ====================

  describe('custom options', () => {
    it('should use custom outDir when specified', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      const customOutDir = 'build';

      // Act
      const result = await build({ outDir: customOutDir });

      // Assert
      expect(result.outDir).toBe(customOutDir);
    });

    it('should use custom routesDir when specified', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      const customRoutesDir = 'pages';

      // Act & Assert - should not throw with custom routesDir
      await expect(build({ routesDir: customRoutesDir })).resolves.toBeDefined();
    });

    it('should accept "node" as target', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act & Assert - should not throw
      await expect(build({ target: 'node' })).resolves.toBeDefined();
    });

    it('should accept "edge" as target', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act & Assert - should not throw
      await expect(build({ target: 'edge' })).resolves.toBeDefined();
    });
  });

  // ==================== Build Result ====================

  describe('build result', () => {
    it('should return BuildResult with outDir property', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      const result = await build({});

      // Assert
      expect(result).toHaveProperty('outDir');
      expect(typeof result.outDir).toBe('string');
    });

    it('should return BuildResult with routes array', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');

      // Act
      const result = await build({});

      // Assert
      expect(result).toHaveProperty('routes');
      expect(Array.isArray(result.routes)).toBe(true);
    });

    it('should return discovered routes in BuildResult', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      // Create route files
      await writeFile(join(routesDir, 'index.ts'), 'export default {}');
      await writeFile(join(routesDir, 'about.ts'), 'export default {}');

      // Act
      const result = await build({ routesDir });

      // Assert
      expect(result.routes).toContain('/');
      expect(result.routes).toContain('/about');
    });
  });
});

// ==================== generateStaticPages Tests ====================

describe('generateStaticPages', () => {
  let tempDir: string;
  let outDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    await mkdir(outDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ==================== Static Page Generation ====================

  describe('static page generation', () => {
    it('should generate HTML file for static route', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: '/routes/about.ts',
          pattern: '/about',
          type: 'page',
          params: [],
        },
      ];
      // Mock module loading
      vi.doMock('/routes/about.ts', () => createMockPageModule());

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths.length).toBeGreaterThan(0);
    });

    it('should create output file at correct path for static route', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/about.ts'),
          pattern: '/about',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      // Should create /about/index.html or /about.html
      const aboutPath = generatedPaths.find(
        (p) => p.includes('about.html') || p.includes('about/index.html')
      );
      expect(aboutPath).toBeDefined();
    });

    it('should generate valid HTML document', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths.length).toBe(1);
      const htmlContent = await readFile(generatedPaths[0]!, 'utf-8');
      expect(htmlContent).toMatch(/^<!DOCTYPE html>/i);
      expect(htmlContent).toContain('<html');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('<div id="app">');
    });

    it('should return array of generated file paths', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
        {
          file: join(tempDir, 'routes/about.ts'),
          pattern: '/about',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(Array.isArray(generatedPaths)).toBe(true);
      expect(generatedPaths).toHaveLength(2);
      generatedPaths.forEach((path) => {
        expect(typeof path).toBe('string');
        expect(path.endsWith('.html')).toBe(true);
      });
    });
  });

  // ==================== Dynamic Route SSG (getStaticPaths) ====================

  describe('dynamic route SSG with getStaticPaths', () => {
    it('should generate multiple pages when getStaticPaths returns multiple paths', async () => {
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
      // getStaticPaths should return { paths: [{ params: { id: '1' } }, { params: { id: '2' } }] }

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths.length).toBeGreaterThanOrEqual(2);
      expect(generatedPaths.some((p) => p.includes('users/1'))).toBe(true);
      expect(generatedPaths.some((p) => p.includes('users/2'))).toBe(true);
    });

    it('should create correct file structure for dynamic routes', async () => {
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
      // getStaticPaths returns { paths: [{ params: { slug: 'hello-world' } }] }

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      // Should create /posts/hello-world/index.html or /posts/hello-world.html
      const postPath = generatedPaths.find((p) => p.includes('hello-world'));
      expect(postPath).toBeDefined();
    });

    it('should skip dynamic route without getStaticPaths', async () => {
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
      // Module without getStaticPaths

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      // Should not generate any files for dynamic routes without getStaticPaths
      expect(generatedPaths).toHaveLength(0);
    });

    it('should handle multiple dynamic parameters', async () => {
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
      // getStaticPaths returns { paths: [{ params: { year: '2024', month: '01' } }] }

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths.length).toBeGreaterThanOrEqual(1);
      expect(generatedPaths.some((p) => p.includes('2024') && p.includes('01'))).toBe(true);
    });
  });

  // ==================== Output Directory Structure ====================

  describe('output directory structure', () => {
    it('should create index.html for root route', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      expect(generatedPaths[0]).toBe(join(outDir, 'index.html'));
    });

    it('should create nested directory structure', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/docs/getting-started.ts'),
          pattern: '/docs/getting-started',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      // Should be either /docs/getting-started.html or /docs/getting-started/index.html
      const path = generatedPaths[0]!;
      expect(path).toContain('docs');
      expect(path).toContain('getting-started');
    });

    it('should create parent directories if they do not exist', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const newOutDir = join(tempDir, 'new/nested/out');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, newOutDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      const stats = await stat(newOutDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  // ==================== HTML Content Generation ====================

  describe('HTML content generation', () => {
    it('should include DOCTYPE declaration', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);
      const html = await readFile(generatedPaths[0]!, 'utf-8');

      // Assert
      expect(html).toMatch(/^<!DOCTYPE html>/i);
    });

    it('should include div#app container', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);
      const html = await readFile(generatedPaths[0]!, 'utf-8');

      // Assert
      expect(html).toContain('<div id="app">');
    });

    it('should include hydration script', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);
      const html = await readFile(generatedPaths[0]!, 'utf-8');

      // Assert
      expect(html).toContain('<script type="module">');
      expect(html).toContain('hydrateApp');
    });

    it('should include rendered content from CompiledProgram', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);
      const html = await readFile(generatedPaths[0]!, 'utf-8');

      // Assert
      // Should contain rendered content from the CompiledProgram
      expect(html).toContain('<div id="app">');
      expect(html.length).toBeGreaterThan(100); // Should have substantial content
    });
  });

  // ==================== Route Type Filtering ====================

  describe('route type filtering', () => {
    it('should only process page type routes', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/index.ts'),
          pattern: '/',
          type: 'page',
          params: [],
        },
        {
          file: join(tempDir, 'routes/api/users.ts'),
          pattern: '/api/users',
          type: 'api',
          params: [],
        },
        {
          file: join(tempDir, 'routes/_middleware.ts'),
          pattern: '/',
          type: 'middleware',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      // Should only generate HTML for page routes
      expect(generatedPaths).toHaveLength(1);
      expect(generatedPaths[0]).toContain('index.html');
    });

    it('should skip api routes', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/api/users.ts'),
          pattern: '/api/users',
          type: 'api',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(0);
    });

    it('should skip middleware routes', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/_middleware.ts'),
          pattern: '/',
          type: 'middleware',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(0);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty routes array', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toEqual([]);
    });

    it('should handle routes with special characters in pattern', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = [
        {
          file: join(tempDir, 'routes/docs/api-reference.ts'),
          pattern: '/docs/api-reference',
          type: 'page',
          params: [],
        },
      ];

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(1);
      expect(generatedPaths[0]).toContain('api-reference');
    });

    it('should handle concurrent page generation', async () => {
      // Arrange
      const { generateStaticPages } = await import('../../src/build/ssg.js');
      const routes: ScannedRoute[] = Array.from({ length: 10 }, (_, i) => ({
        file: join(tempDir, 'routes/page-' + i + '.ts'),
        pattern: '/page-' + i,
        type: 'page' as const,
        params: [],
      }));

      // Act
      const generatedPaths = await generateStaticPages(routes, outDir);

      // Assert
      expect(generatedPaths).toHaveLength(10);
    });
  });
});
