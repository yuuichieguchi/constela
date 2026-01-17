/**
 * Test module for terminal utility functions.
 *
 * Coverage:
 * - hyperlink: Generate OSC 8 hyperlink escape sequences
 * - URL only: URL is used as both link and display text
 * - URL + text: Custom display text is shown
 * - Format validation: Correct OSC 8 escape sequence structure
 *
 * TDD Red Phase: Tests will fail until hyperlink function is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import the module under test (will fail until implemented)
import { hyperlink } from '../terminal.js';

// ==================== Tests ====================

describe('hyperlink', () => {
  // ==================== Happy Path ====================

  describe('when called with URL only', () => {
    it('should use URL as display text when text parameter is omitted', () => {
      // Arrange
      const url = 'http://localhost:3000';

      // Act
      const result = hyperlink(url);

      // Assert
      // Format: \x1b]8;;URL\x1b\TEXT\x1b]8;;\x1b\
      expect(result).toBe('\x1b]8;;http://localhost:3000\x1b\\http://localhost:3000\x1b]8;;\x1b\\');
    });

    it('should handle https URLs correctly', () => {
      // Arrange
      const url = 'https://example.com/path?query=value';

      // Act
      const result = hyperlink(url);

      // Assert
      expect(result).toContain(url);
      expect(result).toBe(`\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`);
    });
  });

  describe('when called with URL and custom text', () => {
    it('should use custom text as display text', () => {
      // Arrange
      const url = 'http://localhost:3000';
      const text = 'Click here';

      // Act
      const result = hyperlink(url, text);

      // Assert
      expect(result).toBe('\x1b]8;;http://localhost:3000\x1b\\Click here\x1b]8;;\x1b\\');
    });

    it('should display custom text instead of URL', () => {
      // Arrange
      const url = 'https://very-long-domain.example.com/extremely/long/path/to/resource';
      const text = 'Open Link';

      // Act
      const result = hyperlink(url, text);

      // Assert
      expect(result).toContain('Open Link');
      expect(result).toContain(url);
      expect(result).toBe(`\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`);
    });
  });

  // ==================== OSC 8 Format Validation ====================

  describe('OSC 8 escape sequence format', () => {
    it('should start with OSC 8 opening sequence', () => {
      // Arrange
      const url = 'http://localhost:3000';

      // Act
      const result = hyperlink(url);

      // Assert
      // OSC 8 opening: \x1b]8;;
      expect(result.startsWith('\x1b]8;;')).toBe(true);
    });

    it('should end with OSC 8 closing sequence', () => {
      // Arrange
      const url = 'http://localhost:3000';

      // Act
      const result = hyperlink(url);

      // Assert
      // OSC 8 closing: \x1b]8;;\x1b\
      expect(result.endsWith('\x1b]8;;\x1b\\')).toBe(true);
    });

    it('should have correct structure: opening + URL + ST + text + closing', () => {
      // Arrange
      const url = 'http://test.com';
      const text = 'Test';

      // Act
      const result = hyperlink(url, text);

      // Assert
      // Full format: \x1b]8;;URL\x1b\TEXT\x1b]8;;\x1b\
      const expectedParts = [
        '\x1b]8;;',      // OSC 8 start with empty params
        url,             // URL
        '\x1b\\',        // String Terminator (ST)
        text,            // Display text
        '\x1b]8;;',      // OSC 8 start (to close link)
        '\x1b\\',        // String Terminator (ST)
      ];
      expect(result).toBe(expectedParts.join(''));
    });
  });

  // ==================== NO_COLOR Environment Variable ====================

  describe('when NO_COLOR is set', () => {
    const originalNoColor = process.env.NO_COLOR;

    beforeEach(() => {
      process.env.NO_COLOR = '1';
    });

    afterEach(() => {
      if (originalNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = originalNoColor;
      }
    });

    it('should return plain text without escape sequences when NO_COLOR is set', () => {
      // Arrange
      const url = 'http://localhost:3000';

      // Act
      const result = hyperlink(url);

      // Assert
      expect(result).toBe(url);
      expect(result).not.toContain('\x1b');
    });

    it('should return custom text without escape sequences when NO_COLOR is set', () => {
      // Arrange
      const url = 'http://localhost:3000';
      const text = 'Click here';

      // Act
      const result = hyperlink(url, text);

      // Assert
      expect(result).toBe(text);
      expect(result).not.toContain('\x1b');
    });
  });
});
