/**
 * Test module for matchRoute function.
 *
 * Coverage:
 * - Static route matching (/, /about, /users/list)
 * - Dynamic route matching (/users/:id, /users/:userId/posts/:postId)
 * - Non-matching routes
 * - Trailing slash normalization
 * - URL decoding in params
 */

import { describe, it, expect } from 'vitest';
import { matchRoute, parseParams } from '../src/matcher.js';

describe('matchRoute', () => {
  // ==================== Static Routes ====================

  describe('static route matching', () => {
    it('should match root path "/"', () => {
      // Arrange
      const pattern = '/';
      const path = '/';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should match simple static route "/about"', () => {
      // Arrange
      const pattern = '/about';
      const path = '/about';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should match nested static route "/users/list"', () => {
      // Arrange
      const pattern = '/users/list';
      const path = '/users/list';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should match deeply nested static route "/api/v1/users/settings"', () => {
      // Arrange
      const pattern = '/api/v1/users/settings';
      const path = '/api/v1/users/settings';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });
  });

  // ==================== Dynamic Routes ====================

  describe('dynamic route matching', () => {
    it('should match single dynamic segment "/users/:id"', () => {
      // Arrange
      const pattern = '/users/:id';
      const path = '/users/123';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ id: '123' });
    });

    it('should match dynamic segment with string value', () => {
      // Arrange
      const pattern = '/users/:username';
      const path = '/users/john-doe';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ username: 'john-doe' });
    });

    it('should match multiple dynamic segments "/users/:userId/posts/:postId"', () => {
      // Arrange
      const pattern = '/users/:userId/posts/:postId';
      const path = '/users/42/posts/99';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ userId: '42', postId: '99' });
    });

    it('should match mixed static and dynamic segments', () => {
      // Arrange
      const pattern = '/blog/:year/:month/archive';
      const path = '/blog/2024/12/archive';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ year: '2024', month: '12' });
    });

    it('should match dynamic segment at the end "/posts/:id"', () => {
      // Arrange
      const pattern = '/posts/:id';
      const path = '/posts/hello-world';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ id: 'hello-world' });
    });
  });

  // ==================== Non-Matching Routes ====================

  describe('non-matching routes', () => {
    it('should return null when path does not match pattern', () => {
      // Arrange
      const pattern = '/about';
      const path = '/contact';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when path has extra segments', () => {
      // Arrange
      const pattern = '/users';
      const path = '/users/123';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when path has fewer segments', () => {
      // Arrange
      const pattern = '/users/:id';
      const path = '/users';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when static segment does not match', () => {
      // Arrange
      const pattern = '/users/:id/posts';
      const path = '/users/123/comments';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for completely different path', () => {
      // Arrange
      const pattern = '/api/v1/users';
      const path = '/blog/posts/list';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==================== Trailing Slash Normalization ====================

  describe('trailing slash normalization', () => {
    it('should match path with trailing slash against pattern without', () => {
      // Arrange
      const pattern = '/about';
      const path = '/about/';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should match path without trailing slash against pattern with', () => {
      // Arrange
      const pattern = '/users/';
      const path = '/users';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should match dynamic route with trailing slash', () => {
      // Arrange
      const pattern = '/users/:id';
      const path = '/users/123/';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ id: '123' });
    });

    it('should match root path with trailing slash', () => {
      // Arrange
      const pattern = '/';
      const path = '/';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
    });
  });

  // ==================== URL Decoding in Params ====================

  describe('URL decoding in params', () => {
    it('should decode URL-encoded param values', () => {
      // Arrange
      const pattern = '/search/:query';
      const path = '/search/hello%20world';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ query: 'hello world' });
    });

    it('should decode special characters in params', () => {
      // Arrange
      const pattern = '/users/:name';
      const path = '/users/John%26Jane';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ name: 'John&Jane' });
    });

    it('should decode Japanese characters in params', () => {
      // Arrange
      const pattern = '/articles/:title';
      const path = '/articles/%E3%83%86%E3%82%B9%E3%83%88';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ title: 'テスト' });
    });

    it('should decode slash encoded as %2F in params', () => {
      // Arrange
      const pattern = '/files/:path';
      const path = '/files/folder%2Ffile.txt';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ path: 'folder/file.txt' });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty param value', () => {
      // Arrange
      const pattern = '/users/:id';
      const path = '/users/';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      // Empty param should not match (empty string is not a valid param)
      expect(result).toBeNull();
    });

    it('should handle param with only numbers', () => {
      // Arrange
      const pattern = '/items/:sku';
      const path = '/items/12345678';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ sku: '12345678' });
    });

    it('should handle param with dashes and underscores', () => {
      // Arrange
      const pattern = '/posts/:slug';
      const path = '/posts/my-awesome_post';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ slug: 'my-awesome_post' });
    });
  });

  // ==================== Additional Edge Cases ====================

  describe('additional edge cases', () => {
    it('should normalize double slashes in path: /users//123 -> /users/123', () => {
      // Arrange
      const pattern = '/users/:id';
      const path = '/users//123';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      // Double slashes are normalized via split('/').filter(Boolean)
      // which removes empty segments, effectively treating //123 as /123
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ id: '123' });
    });

    it('should handle very long paths with many segments (10+ segments)', () => {
      // Arrange
      const pattern = '/a/b/c/d/e/f/g/h/i/j/:id';
      const path = '/a/b/c/d/e/f/g/h/i/j/123';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ id: '123' });
    });

    it('should match routes with numeric-only segments like /123/456/789', () => {
      // Arrange
      const pattern = '/123/456/789';
      const path = '/123/456/789';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      // Numeric segments are treated as static segments when not prefixed with :
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should be case-sensitive: /Users should not match /users', () => {
      // Arrange
      const pattern = '/users/:id';
      const pathUppercase = '/Users/123';
      const pathLowercase = '/users/123';

      // Act
      const resultUppercase = matchRoute(pattern, pathUppercase);
      const resultLowercase = matchRoute(pattern, pathLowercase);

      // Assert
      // Routes are case-sensitive due to strict equality comparison
      expect(resultUppercase).toBeNull();
      expect(resultLowercase).not.toBeNull();
      expect(resultLowercase?.params).toEqual({ id: '123' });
    });

    it('should handle paths with empty segments like /users//posts correctly', () => {
      // Arrange
      const pattern = '/users/posts';
      const pathWithEmptySegment = '/users//posts';

      // Act
      const result = matchRoute(pattern, pathWithEmptySegment);

      // Assert
      // Empty segments are filtered out via filter(Boolean), so
      // /users//posts becomes equivalent to /users/posts
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });

    it('should handle multiple consecutive slashes in path', () => {
      // Arrange
      const pattern = '/api/v1/users';
      const path = '/api///v1//users';

      // Act
      const result = matchRoute(pattern, path);

      // Assert
      // Multiple consecutive slashes are normalized to single slashes
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({});
    });
  });
});

// ==================== parseParams ====================

describe('parseParams', () => {
  it('should return params object for matching route', () => {
    // Arrange
    const pattern = '/users/:id';
    const path = '/users/42';

    // Act
    const params = parseParams(pattern, path);

    // Assert
    expect(params).toEqual({ id: '42' });
  });

  it('should return empty object for non-matching route', () => {
    // Arrange
    const pattern = '/users/:id';
    const path = '/posts/42';

    // Act
    const params = parseParams(pattern, path);

    // Assert
    expect(params).toEqual({});
  });

  it('should return empty object for static routes', () => {
    // Arrange
    const pattern = '/about';
    const path = '/about';

    // Act
    const params = parseParams(pattern, path);

    // Assert
    expect(params).toEqual({});
  });
});
