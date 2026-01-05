/**
 * Test module for HTML Escape Utility.
 *
 * Coverage:
 * - Individual character escaping (< > & " ')
 * - Combined character escaping
 * - Edge cases (empty string, no escaping needed)
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../utils/escape.js';

describe('escapeHtml', () => {
  // ==================== Individual Character Escaping ====================

  describe('individual character escaping', () => {
    it('should escape < to &lt;', () => {
      // Arrange
      const input = '<';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&lt;');
    });

    it('should escape > to &gt;', () => {
      // Arrange
      const input = '>';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&gt;');
    });

    it('should escape & to &amp;', () => {
      // Arrange
      const input = '&';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&amp;');
    });

    it('should escape " to &quot;', () => {
      // Arrange
      const input = '"';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&quot;');
    });

    it("should escape ' to &#39;", () => {
      // Arrange
      const input = "'";

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&#39;');
    });
  });

  // ==================== Multiple Character Escaping ====================

  describe('multiple character escaping', () => {
    it('should escape multiple < characters', () => {
      // Arrange
      const input = '<<<';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&lt;&lt;&lt;');
    });

    it('should escape multiple different characters', () => {
      // Arrange
      const input = '<>&"\'';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('&lt;&gt;&amp;&quot;&#39;');
    });
  });

  // ==================== Complex Cases ====================

  describe('complex cases', () => {
    it('should escape XSS attack pattern', () => {
      // Arrange
      const input = '<script>alert("XSS")</script>';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
    });

    it('should escape HTML attributes with quotes', () => {
      // Arrange
      const input = '<div class="test" data-value=\'foo\'>';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe(
        '&lt;div class=&quot;test&quot; data-value=&#39;foo&#39;&gt;'
      );
    });

    it('should escape text with ampersands', () => {
      // Arrange
      const input = 'foo & bar && baz';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('foo &amp; bar &amp;&amp; baz');
    });

    it('should handle mixed content with special and normal characters', () => {
      // Arrange
      const input = 'Hello <World> & "Friends" \'Everyone\'!';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe(
        'Hello &lt;World&gt; &amp; &quot;Friends&quot; &#39;Everyone&#39;!'
      );
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should return empty string for empty input', () => {
      // Arrange
      const input = '';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('');
    });

    it('should return same string when no escaping needed', () => {
      // Arrange
      const input = 'Hello World 123';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('Hello World 123');
    });

    it('should handle string with only whitespace', () => {
      // Arrange
      const input = '   \t\n  ';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('   \t\n  ');
    });

    it('should handle unicode characters without escaping', () => {
      // Arrange
      const input = 'Hello World';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('Hello World');
    });

    it('should handle newlines correctly', () => {
      // Arrange
      const input = 'Line 1\nLine 2\nLine 3';

      // Act
      const result = escapeHtml(input);

      // Assert
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });
});
