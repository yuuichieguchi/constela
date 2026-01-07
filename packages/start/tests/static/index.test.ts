/**
 * Test module for static file serving utilities.
 *
 * Coverage:
 * - isPathSafe: Validate pathname security against path traversal attacks
 * - getMimeType: Determine MIME type from file extension
 * - resolveStaticFile: Resolve pathname to absolute file path with security checks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import from static module (will fail until implementation exists - TDD Red phase)
import {
  isPathSafe,
  getMimeType,
  resolveStaticFile,
  type StaticFileResult,
} from '../../src/static/index.js';

// ==================== Test Fixtures ====================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'public');

// ==================== isPathSafe Tests ====================

describe('isPathSafe', () => {
  // ==================== Valid Paths ====================

  describe('valid paths', () => {
    it('should accept simple file path /favicon.ico', () => {
      // Arrange
      const pathname = '/favicon.ico';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept nested path /images/logo.png', () => {
      // Arrange
      const pathname = '/images/logo.png';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept deeply nested path /assets/images/icons/arrow.svg', () => {
      // Arrange
      const pathname = '/assets/images/icons/arrow.svg';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept path with hyphen /my-image.png', () => {
      // Arrange
      const pathname = '/my-image.png';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept path with underscore /my_file.js', () => {
      // Arrange
      const pathname = '/my_file.js';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept path with numbers /image123.png', () => {
      // Arrange
      const pathname = '/image123.png';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== Path Traversal Attacks ====================

  describe('path traversal attacks', () => {
    it('should reject /../etc/passwd', () => {
      // Arrange
      const pathname = '/../etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject /../../etc/passwd', () => {
      // Arrange
      const pathname = '/../../etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject URL-encoded traversal /%2e%2e/etc/passwd', () => {
      // Arrange
      const pathname = '/%2e%2e/etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject double URL-encoded traversal /%252e%252e/etc/passwd', () => {
      // Arrange
      const pathname = '/%252e%252e/etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject double slash //etc/passwd', () => {
      // Arrange
      const pathname = '//etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject path with .. segment /images/../../../etc/passwd', () => {
      // Arrange
      const pathname = '/images/../../../etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==================== Null Byte Injection ====================

  describe('null byte injection', () => {
    it('should reject path with null byte /file.png\\x00.txt', () => {
      // Arrange
      const pathname = '/file.png\x00.txt';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject path with URL-encoded null byte /file.png%00.txt', () => {
      // Arrange
      const pathname = '/file.png%00.txt';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==================== Backslash Attacks ====================

  describe('backslash attacks', () => {
    it('should reject backslash traversal /..\\..\\etc\\passwd', () => {
      // Arrange
      const pathname = '/..\\..\\etc\\passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject mixed traversal /..\\../etc/passwd', () => {
      // Arrange
      const pathname = '/..\\../etc/passwd';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject path with backslash /images\\logo.png', () => {
      // Arrange
      const pathname = '/images\\logo.png';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should accept root path /', () => {
      // Arrange
      const pathname = '/';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject empty path', () => {
      // Arrange
      const pathname = '';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject path not starting with /', () => {
      // Arrange
      const pathname = 'favicon.ico';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should accept path with single dot /file.name.ext', () => {
      // Arrange
      const pathname = '/file.name.ext';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject hidden files starting with dot /.htaccess', () => {
      // Arrange
      const pathname = '/.htaccess';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject hidden files in subdirectories /config/.env', () => {
      // Arrange
      const pathname = '/config/.env';

      // Act
      const result = isPathSafe(pathname);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// ==================== getMimeType Tests ====================

describe('getMimeType', () => {
  // ==================== Image Types ====================

  describe('image types', () => {
    it('should return image/x-icon for .ico files', () => {
      // Arrange
      const filePath = '/path/to/favicon.ico';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/x-icon');
    });

    it('should return image/png for .png files', () => {
      // Arrange
      const filePath = '/path/to/logo.png';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/png');
    });

    it('should return image/jpeg for .jpg files', () => {
      // Arrange
      const filePath = '/path/to/photo.jpg';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/jpeg');
    });

    it('should return image/jpeg for .jpeg files', () => {
      // Arrange
      const filePath = '/path/to/photo.jpeg';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/jpeg');
    });

    it('should return image/gif for .gif files', () => {
      // Arrange
      const filePath = '/path/to/animation.gif';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/gif');
    });

    it('should return image/svg+xml for .svg files', () => {
      // Arrange
      const filePath = '/path/to/icon.svg';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/svg+xml');
    });

    it('should return image/webp for .webp files', () => {
      // Arrange
      const filePath = '/path/to/image.webp';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/webp');
    });
  });

  // ==================== Web Assets ====================

  describe('web assets', () => {
    it('should return text/css for .css files', () => {
      // Arrange
      const filePath = '/path/to/styles.css';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('text/css');
    });

    it('should return text/javascript for .js files', () => {
      // Arrange
      const filePath = '/path/to/script.js';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('text/javascript');
    });

    it('should return application/json for .json files', () => {
      // Arrange
      const filePath = '/path/to/data.json';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('application/json');
    });

    it('should return text/html for .html files', () => {
      // Arrange
      const filePath = '/path/to/page.html';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('text/html');
    });

    it('should return text/plain for .txt files', () => {
      // Arrange
      const filePath = '/path/to/readme.txt';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('text/plain');
    });

    it('should return application/xml for .xml files', () => {
      // Arrange
      const filePath = '/path/to/data.xml';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('application/xml');
    });
  });

  // ==================== Font Types ====================

  describe('font types', () => {
    it('should return font/woff for .woff files', () => {
      // Arrange
      const filePath = '/path/to/font.woff';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('font/woff');
    });

    it('should return font/woff2 for .woff2 files', () => {
      // Arrange
      const filePath = '/path/to/font.woff2';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('font/woff2');
    });

    it('should return font/ttf for .ttf files', () => {
      // Arrange
      const filePath = '/path/to/font.ttf';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('font/ttf');
    });
  });

  // ==================== Case Insensitivity ====================

  describe('case insensitivity', () => {
    it('should handle uppercase extension .PNG', () => {
      // Arrange
      const filePath = '/path/to/image.PNG';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/png');
    });

    it('should handle mixed case extension .JpEg', () => {
      // Arrange
      const filePath = '/path/to/photo.JpEg';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/jpeg');
    });

    it('should handle uppercase extension .CSS', () => {
      // Arrange
      const filePath = '/path/to/styles.CSS';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('text/css');
    });

    it('should handle mixed case extension .SvG', () => {
      // Arrange
      const filePath = '/path/to/icon.SvG';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/svg+xml');
    });
  });

  // ==================== Unknown Extensions ====================

  describe('unknown extensions', () => {
    it('should return application/octet-stream for unknown extension .xyz', () => {
      // Arrange
      const filePath = '/path/to/file.xyz';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('application/octet-stream');
    });

    it('should return application/octet-stream for unknown extension .custom', () => {
      // Arrange
      const filePath = '/path/to/file.custom';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('application/octet-stream');
    });
  });

  // ==================== Files Without Extension ====================

  describe('files without extension', () => {
    it('should return application/octet-stream for file without extension (LICENSE)', () => {
      // Arrange
      const filePath = '/path/to/LICENSE';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('application/octet-stream');
    });

    it('should return application/octet-stream for file without extension (Makefile)', () => {
      // Arrange
      const filePath = '/path/to/Makefile';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('application/octet-stream');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle multiple dots in filename /path/to/file.min.js', () => {
      // Arrange
      const filePath = '/path/to/file.min.js';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('text/javascript');
    });

    it('should handle path with dots /path.to/file.png', () => {
      // Arrange
      const filePath = '/path.to/file.png';

      // Act
      const result = getMimeType(filePath);

      // Assert
      expect(result).toBe('image/png');
    });
  });
});

// ==================== resolveStaticFile Tests ====================

describe('resolveStaticFile', () => {
  // ==================== Path Resolution ====================

  describe('path resolution', () => {
    it('should resolve /favicon.ico to publicDir/favicon.ico', () => {
      // Arrange
      const pathname = '/favicon.ico';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.filePath).toBe('/project/public/favicon.ico');
    });

    it('should resolve /images/logo.png to publicDir/images/logo.png', () => {
      // Arrange
      const pathname = '/images/logo.png';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.filePath).toBe('/project/public/images/logo.png');
    });

    it('should resolve deeply nested path correctly', () => {
      // Arrange
      const pathname = '/assets/icons/social/twitter.svg';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.filePath).toBe('/project/public/assets/icons/social/twitter.svg');
    });
  });

  // ==================== Security Validation ====================

  describe('security validation', () => {
    it('should reject path traversal attack /../etc/passwd', () => {
      // Arrange
      const pathname = '/../etc/passwd';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.filePath).toBeNull();
      expect(result.mimeType).toBeNull();
      expect(result.error).toBe('path_traversal');
    });

    it('should reject URL-encoded path traversal /%2e%2e/etc/passwd', () => {
      // Arrange
      const pathname = '/%2e%2e/etc/passwd';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.error).toBe('path_traversal');
    });

    it('should reject paths escaping publicDir', () => {
      // Arrange
      const pathname = '/images/../../secret.txt';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.error).toBe('outside_public');
    });

    it('should reject backslash traversal /..\\..\\etc\\passwd', () => {
      // Arrange
      const pathname = '/..\\..\\etc\\passwd';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.error).toBe('path_traversal');
    });

    it('should reject null byte injection /file.png\\x00.txt', () => {
      // Arrange
      const pathname = '/file.png\x00.txt';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.error).toBe('path_traversal');
    });
  });

  // ==================== MIME Type Assignment ====================

  describe('MIME type assignment', () => {
    it('should assign correct MIME type for .png files', () => {
      // Arrange
      const pathname = '/logo.png';
      const publicDir = FIXTURES_DIR;

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      // Note: mimeType should be set regardless of file existence
      expect(result.mimeType).toBe('image/png');
    });

    it('should assign correct MIME type for .ico files', () => {
      // Arrange
      const pathname = '/favicon.ico';
      const publicDir = FIXTURES_DIR;

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.mimeType).toBe('image/x-icon');
    });

    it('should assign correct MIME type for .svg files', () => {
      // Arrange
      const pathname = '/icon.svg';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.mimeType).toBe('image/svg+xml');
    });

    it('should assign application/octet-stream for unknown extensions', () => {
      // Arrange
      const pathname = '/file.xyz';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  // ==================== File Existence Check ====================

  describe('file existence check', () => {
    it('should set exists=true for existing files', () => {
      // Arrange
      const pathname = '/favicon.ico';
      const publicDir = FIXTURES_DIR;

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(true);
      expect(result.filePath).toContain('favicon.ico');
    });

    it('should set exists=false for non-existing files', () => {
      // Arrange
      const pathname = '/nonexistent.png';
      const publicDir = FIXTURES_DIR;

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(false);
    });

    it('should set exists=true for nested existing files', () => {
      // Arrange
      const pathname = '/images/logo.png';
      const publicDir = FIXTURES_DIR;

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result.exists).toBe(true);
    });
  });

  // ==================== Return Type Validation ====================

  describe('return type validation', () => {
    it('should return StaticFileResult with all properties', () => {
      // Arrange
      const pathname = '/favicon.ico';
      const publicDir = FIXTURES_DIR;

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('mimeType');
      expect(typeof result.exists).toBe('boolean');
    });

    it('should include error property when path is unsafe', () => {
      // Arrange
      const pathname = '/../etc/passwd';
      const publicDir = '/project/public';

      // Act
      const result = resolveStaticFile(pathname, publicDir);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('path_traversal');
    });
  });
});
