/**
 * Test module for entry-server.ts wrapHtml dark mode support.
 *
 * Coverage:
 * - wrapHtml dark class when theme is 'dark'
 * - wrapHtml no dark class when theme is 'light'
 * - wrapHtml backward compatibility without theme option
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { wrapHtml } from '../../src/runtime/entry-server.js';

// ==================== Test Fixtures ====================

const SAMPLE_CONTENT = '<div>Hello World</div>';
const SAMPLE_HYDRATION_SCRIPT = 'console.log("hydrate");';
const SAMPLE_HEAD = '<title>Test Page</title>';

// ==================== Tests ====================

describe('wrapHtml', () => {
  // ==================== Dark Mode Support ====================

  describe('dark mode class support', () => {
    it('should add dark class to html element when theme is dark', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { theme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when theme is light', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { theme: 'light' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when theme option is not provided', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when options is undefined', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, undefined);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when options is empty object', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = {};

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should generate valid HTML without theme option (3 args)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;

      // Act
      const result = wrapHtml(content, hydrationScript, head);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain(head);
      expect(result).toContain('<body>');
      expect(result).toContain(content);
      expect(result).toContain(hydrationScript);
    });

    it('should generate valid HTML without head and theme option (2 args)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<body>');
      expect(result).toContain(content);
    });

    it('should include meta charset and viewport tags', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<meta charset="utf-8">');
      expect(result).toContain('<meta name="viewport"');
    });

    it('should wrap content in div#app', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain(`<div id="app">${content}</div>`);
    });

    it('should include hydration script in module script tag', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<script type="module">');
      expect(result).toContain(hydrationScript);
      expect(result).toContain('</script>');
    });
  });

  // ==================== Integration ====================

  describe('integration with theme option', () => {
    it('should work with head content and dark theme', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;
      const options = { theme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, head, options);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
      expect(result).toContain(head);
      expect(result).toContain(content);
      expect(result).toContain(hydrationScript);
    });

    it('should work with head content and light theme', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;
      const options = { theme: 'light' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, head, options);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
      expect(result).toContain(head);
      expect(result).toContain(content);
    });
  });
});
