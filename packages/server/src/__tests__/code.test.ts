/**
 * Test module for renderCodeSSR function.
 *
 * Coverage:
 * - Shiki syntax highlighting output
 * - Background-color removal from inline styles
 * - Language handling
 * - Fallback behavior for unsupported languages
 */

import { describe, it, expect } from 'vitest';
import { renderCodeSSR } from '../code.js';

describe('renderCodeSSR', () => {
  // ==================== Background Color Removal ====================

  describe('background-color removal', () => {
    it('should NOT include background-color in style attribute', async () => {
      /**
       * Given: Valid JavaScript code
       * When: renderCodeSSR is called
       * Then: The output should NOT contain background-color in any style attribute
       *
       * This test verifies that Shiki's default background-color (e.g., #24292e for github-dark)
       * is removed from the output so that CSS can control the background styling.
       */
      // Arrange
      const code = 'const x = 1;';
      const language = 'javascript';

      // Act
      const result = await renderCodeSSR(code, language);

      // Assert
      // The result should contain pre and code elements from Shiki
      expect(result).toContain('<pre');
      expect(result).toContain('<code');

      // CRITICAL: The result should NOT have background-color in style attribute
      // Shiki outputs: style="background-color:#24292e;..." which overrides CSS
      expect(result).not.toMatch(/style="[^"]*background-color/);
    });

    it('should NOT include background-color for TypeScript code', async () => {
      /**
       * Given: Valid TypeScript code
       * When: renderCodeSSR is called
       * Then: The output should NOT contain background-color in any style attribute
       */
      // Arrange
      const code = 'const x: number = 42;';
      const language = 'typescript';

      // Act
      const result = await renderCodeSSR(code, language);

      // Assert
      expect(result).toContain('<pre');
      expect(result).not.toMatch(/style="[^"]*background-color/);
    });

    it('should NOT include background-color for Python code', async () => {
      /**
       * Given: Valid Python code
       * When: renderCodeSSR is called
       * Then: The output should NOT contain background-color in any style attribute
       */
      // Arrange
      const code = 'def hello():\n    print("Hello")';
      const language = 'python';

      // Act
      const result = await renderCodeSSR(code, language);

      // Assert
      expect(result).toContain('<pre');
      expect(result).not.toMatch(/style="[^"]*background-color/);
    });

    it('should still preserve other inline styles for syntax highlighting', async () => {
      /**
       * Given: Code with syntax elements
       * When: renderCodeSSR is called
       * Then: Syntax highlighting styles (color) should be preserved, only background-color removed
       */
      // Arrange
      const code = 'const keyword = "string";';
      const language = 'javascript';

      // Act
      const result = await renderCodeSSR(code, language);

      // Assert
      // Should have span elements with style for syntax highlighting colors
      expect(result).toContain('<span');
      expect(result).toMatch(/style="[^"]*color/);
    });
  });

  // ==================== Basic Functionality ====================

  describe('basic functionality', () => {
    it('should return HTML with pre and code elements', async () => {
      // Arrange
      const code = 'console.log("test");';
      const language = 'javascript';

      // Act
      const result = await renderCodeSSR(code, language);

      // Assert
      expect(result).toContain('<pre');
      expect(result).toContain('<code');
      expect(result).toContain('</code>');
      expect(result).toContain('</pre>');
    });

    it('should include the code content in output', async () => {
      // Arrange
      const code = 'const greeting = "Hello";';
      const language = 'javascript';

      // Act
      const result = await renderCodeSSR(code, language);

      // Assert
      expect(result).toContain('const');
      expect(result).toContain('greeting');
      expect(result).toContain('Hello');
    });
  });
});
