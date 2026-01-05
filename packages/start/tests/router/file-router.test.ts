/**
 * Test module for file-based routing functions.
 *
 * Coverage:
 * - filePathToPattern: Convert file paths to URL patterns
 *   - Basic conversion (index.ts, about.ts)
 *   - Dynamic parameters ([id].ts)
 *   - Catch-all routes ([...slug].ts)
 *   - Extension handling (.ts, .tsx, .js, .jsx)
 * - scanRoutes: Scan directory for route files
 *   - Route discovery and classification
 *   - Route type determination (page, api, middleware)
 *   - Parameter extraction
 *   - Route sorting by specificity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { filePathToPattern, scanRoutes } from '../../src/router/file-router.js';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-file-router-test-';

async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), `${TEST_DIR_PREFIX}${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function createRouteFile(baseDir: string, filePath: string): Promise<void> {
  const fullPath = join(baseDir, filePath);
  const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
  if (dirPath !== baseDir) {
    await mkdir(dirPath, { recursive: true });
  }
  await writeFile(fullPath, '// route file\nexport default {};\n');
}

// ==================== filePathToPattern Tests ====================

describe('filePathToPattern', () => {
  // ==================== Basic Conversion ====================

  describe('basic conversion', () => {
    it('should convert index.ts to root path "/"', () => {
      // Arrange
      const filePath = 'index.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/');
    });

    it('should convert about.ts to "/about"', () => {
      // Arrange
      const filePath = 'about.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/about');
    });

    it('should convert users/index.ts to "/users"', () => {
      // Arrange
      const filePath = 'users/index.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/users');
    });

    it('should convert users/profile.ts to "/users/profile"', () => {
      // Arrange
      const filePath = 'users/profile.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/users/profile');
    });

    it('should convert deeply nested path api/v1/users/settings.ts to "/api/v1/users/settings"', () => {
      // Arrange
      const filePath = 'api/v1/users/settings.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/api/v1/users/settings');
    });
  });

  // ==================== Dynamic Parameters ====================

  describe('dynamic parameters', () => {
    it('should convert users/[id].ts to "/users/:id"', () => {
      // Arrange
      const filePath = 'users/[id].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/users/:id');
    });

    it('should convert users/[id]/posts.ts to "/users/:id/posts"', () => {
      // Arrange
      const filePath = 'users/[id]/posts.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/users/:id/posts');
    });

    it('should convert posts/[year]/[month].ts to "/posts/:year/:month"', () => {
      // Arrange
      const filePath = 'posts/[year]/[month].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/posts/:year/:month');
    });

    it('should convert [category]/[id].ts to "/:category/:id"', () => {
      // Arrange
      const filePath = '[category]/[id].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/:category/:id');
    });

    it('should convert users/[userId]/posts/[postId]/comments.ts correctly', () => {
      // Arrange
      const filePath = 'users/[userId]/posts/[postId]/comments.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/users/:userId/posts/:postId/comments');
    });
  });

  // ==================== Catch-all Routes ====================

  describe('catch-all routes', () => {
    it('should convert blog/[...slug].ts to "/blog/*"', () => {
      // Arrange
      const filePath = 'blog/[...slug].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/blog/*');
    });

    it('should convert docs/[...path].ts to "/docs/*"', () => {
      // Arrange
      const filePath = 'docs/[...path].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/docs/*');
    });

    it('should convert [...all].ts to "/*"', () => {
      // Arrange
      const filePath = '[...all].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/*');
    });

    it('should convert api/v1/[...rest].ts to "/api/v1/*"', () => {
      // Arrange
      const filePath = 'api/v1/[...rest].ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/api/v1/*');
    });
  });

  // ==================== Extension Handling ====================

  describe('extension handling', () => {
    it('should remove .ts extension', () => {
      // Arrange
      const filePath = 'about.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/about');
    });

    it('should remove .tsx extension', () => {
      // Arrange
      const filePath = 'dashboard.tsx';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/dashboard');
    });

    it('should remove .js extension', () => {
      // Arrange
      const filePath = 'settings.js';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/settings');
    });

    it('should remove .jsx extension', () => {
      // Arrange
      const filePath = 'contact.jsx';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/contact');
    });

    it('should handle nested paths with various extensions', () => {
      // Arrange
      const filePath = 'admin/users/[id].tsx';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/admin/users/:id');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle nested index files correctly', () => {
      // Arrange
      const filePath = 'admin/dashboard/index.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/admin/dashboard');
    });

    it('should handle dynamic segment with index.ts', () => {
      // Arrange
      const filePath = 'users/[id]/index.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/users/:id');
    });

    it('should handle file names with multiple dots', () => {
      // Arrange
      const filePath = 'api/v1.0/users.ts';
      const routesDir = '/routes';

      // Act
      const result = filePathToPattern(filePath, routesDir);

      // Assert
      expect(result).toBe('/api/v1.0/users');
    });
  });
});

// ==================== scanRoutes Tests ====================

describe('scanRoutes', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== Route Discovery ====================

  describe('route discovery', () => {
    it('should scan single route file', async () => {
      // Arrange
      await createRouteFile(tempDir, 'index.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        pattern: '/',
        type: 'page',
        params: [],
      });
    });

    it('should scan multiple route files', async () => {
      // Arrange
      await createRouteFile(tempDir, 'index.ts');
      await createRouteFile(tempDir, 'about.ts');
      await createRouteFile(tempDir, 'contact.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(3);
      const patterns = routes.map((r) => r.pattern);
      expect(patterns).toContain('/');
      expect(patterns).toContain('/about');
      expect(patterns).toContain('/contact');
    });

    it('should scan nested route files recursively', async () => {
      // Arrange
      await createRouteFile(tempDir, 'index.ts');
      await createRouteFile(tempDir, 'users/index.ts');
      await createRouteFile(tempDir, 'users/profile.ts');
      await createRouteFile(tempDir, 'users/settings/index.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(4);
      const patterns = routes.map((r) => r.pattern);
      expect(patterns).toContain('/');
      expect(patterns).toContain('/users');
      expect(patterns).toContain('/users/profile');
      expect(patterns).toContain('/users/settings');
    });

    it('should include file path in route', async () => {
      // Arrange
      await createRouteFile(tempDir, 'users/[id].ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.file).toContain('users/[id].ts');
    });
  });

  // ==================== Route Type Determination ====================

  describe('route type determination', () => {
    it('should classify api/ routes as "api"', async () => {
      // Arrange
      await createRouteFile(tempDir, 'api/users.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        pattern: '/api/users',
        type: 'api',
      });
    });

    it('should classify nested api routes as "api"', async () => {
      // Arrange
      await createRouteFile(tempDir, 'api/users/[id].ts');
      await createRouteFile(tempDir, 'api/posts/index.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(2);
      routes.forEach((route) => {
        expect(route.type).toBe('api');
      });
    });

    it('should classify _middleware.ts as "middleware"', async () => {
      // Arrange
      await createRouteFile(tempDir, '_middleware.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        type: 'middleware',
      });
    });

    it('should classify nested _middleware.ts as "middleware"', async () => {
      // Arrange
      await createRouteFile(tempDir, 'admin/_middleware.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        type: 'middleware',
      });
    });

    it('should classify regular routes as "page"', async () => {
      // Arrange
      await createRouteFile(tempDir, 'about.ts');
      await createRouteFile(tempDir, 'users/profile.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(2);
      routes.forEach((route) => {
        expect(route.type).toBe('page');
      });
    });
  });

  // ==================== Parameter Extraction ====================

  describe('parameter extraction', () => {
    it('should extract single parameter from [id].ts', async () => {
      // Arrange
      await createRouteFile(tempDir, 'users/[id].ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.params).toEqual(['id']);
    });

    it('should extract multiple parameters from nested dynamic segments', async () => {
      // Arrange
      await createRouteFile(tempDir, 'posts/[year]/[month].ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.params).toEqual(['year', 'month']);
    });

    it('should extract parameter from catch-all route', async () => {
      // Arrange
      await createRouteFile(tempDir, 'blog/[...slug].ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.params).toEqual(['slug']);
    });

    it('should return empty params for static routes', async () => {
      // Arrange
      await createRouteFile(tempDir, 'about.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.params).toEqual([]);
    });

    it('should extract params in correct order for complex paths', async () => {
      // Arrange
      await createRouteFile(tempDir, 'users/[userId]/posts/[postId]/comments.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.params).toEqual(['userId', 'postId']);
    });
  });

  // ==================== Route Sorting ====================

  describe('route sorting (specificity)', () => {
    it('should sort static routes before dynamic routes', async () => {
      // Arrange
      await createRouteFile(tempDir, 'users/[id].ts');
      await createRouteFile(tempDir, 'users/profile.ts');
      await createRouteFile(tempDir, 'users/settings.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(3);
      // Static routes should come first
      expect(routes[0]?.pattern).toBe('/users/profile');
      expect(routes[1]?.pattern).toBe('/users/settings');
      expect(routes[2]?.pattern).toBe('/users/:id');
    });

    it('should sort more specific routes before less specific', async () => {
      // Arrange
      await createRouteFile(tempDir, 'blog/[...slug].ts');
      await createRouteFile(tempDir, 'blog/[id].ts');
      await createRouteFile(tempDir, 'blog/featured.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(3);
      // Static > dynamic > catch-all
      expect(routes[0]?.pattern).toBe('/blog/featured');
      expect(routes[1]?.pattern).toBe('/blog/:id');
      expect(routes[2]?.pattern).toBe('/blog/*');
    });

    it('should sort index routes correctly', async () => {
      // Arrange
      await createRouteFile(tempDir, 'users/index.ts');
      await createRouteFile(tempDir, 'users/[id].ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(2);
      // /users should come before /users/:id
      expect(routes[0]?.pattern).toBe('/users');
      expect(routes[1]?.pattern).toBe('/users/:id');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should return empty array for empty directory', async () => {
      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toEqual([]);
    });

    it('should ignore non-route files (e.g., .css, .json)', async () => {
      // Arrange
      await createRouteFile(tempDir, 'index.ts');
      await writeFile(join(tempDir, 'styles.css'), '/* styles */');
      await writeFile(join(tempDir, 'data.json'), '{}');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.pattern).toBe('/');
    });

    it('should ignore files starting with _ (except _middleware)', async () => {
      // Arrange
      await createRouteFile(tempDir, '_middleware.ts');
      await createRouteFile(tempDir, '_utils.ts');
      await createRouteFile(tempDir, '_helpers.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.type).toBe('middleware');
    });

    it('should handle deeply nested routes', async () => {
      // Arrange
      await createRouteFile(tempDir, 'a/b/c/d/e/f/index.ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.pattern).toBe('/a/b/c/d/e/f');
    });

    it('should handle mixed route types in one scan', async () => {
      // Arrange
      await createRouteFile(tempDir, 'index.ts');
      await createRouteFile(tempDir, '_middleware.ts');
      await createRouteFile(tempDir, 'api/users.ts');
      await createRouteFile(tempDir, 'users/[id].ts');
      await createRouteFile(tempDir, 'blog/[...slug].ts');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(5);
      const types = routes.map((r) => r.type);
      expect(types).toContain('page');
      expect(types).toContain('middleware');
      expect(types).toContain('api');
    });

    it('should handle .tsx files', async () => {
      // Arrange
      await createRouteFile(tempDir, 'dashboard.tsx');

      // Act
      const routes = await scanRoutes(tempDir);

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0]?.pattern).toBe('/dashboard');
    });
  });
});
