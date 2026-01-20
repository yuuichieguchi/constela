/**
 * Test module for SEO lang attribute feature.
 *
 * Coverage:
 * - wrapHtml lang attribute when lang option is provided
 * - wrapHtml no lang attribute when lang is not provided
 * - wrapHtml combines lang attribute with dark theme class
 * - ConstelaConfigFile accepts seo.lang option (type-level test)
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { wrapHtml } from '../../src/runtime/entry-server.js';
import type { ConstelaConfigFile } from '../../src/config/config-loader.js';

// ==================== Test Fixtures ====================

const SAMPLE_CONTENT = '<div>Hello World</div>';
const SAMPLE_HYDRATION_SCRIPT = 'console.log("hydrate");';
const SAMPLE_HEAD = '<title>Test Page</title>';

// ==================== Tests ====================

describe('SEO lang attribute', () => {
  // ==================== wrapHtml lang option ====================

  describe('wrapHtml', () => {
    describe('lang attribute support', () => {
      it('should output html tag with lang="ja" when lang option is "ja"', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = { lang: 'ja' };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="ja"/);
      });

      it('should output html tag with lang="en" when lang option is "en"', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = { lang: 'en' };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="en"/);
      });

      it('should output html tag with lang="zh-CN" when lang option is "zh-CN"', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = { lang: 'zh-CN' };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="zh-CN"/);
      });

      it('should output html tag without lang attribute when lang is not provided', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

        // Act
        const result = wrapHtml(content, hydrationScript);

        // Assert
        // Should have <html> or <html class="..."> but NOT <html lang="...">
        expect(result).not.toMatch(/<html[^>]*lang="/);
      });

      it('should output html tag without lang attribute when options is empty object', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = {};

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).not.toMatch(/<html[^>]*lang="/);
      });

      it('should output html tag without lang attribute when options is undefined', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, undefined);

        // Assert
        expect(result).not.toMatch(/<html[^>]*lang="/);
      });
    });

    describe('lang attribute combined with dark theme', () => {
      it('should output html tag with both lang and class attributes when lang and dark theme are set', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = { lang: 'ja', theme: 'dark' as const };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        // Should contain both lang="ja" and class="dark" in the html tag
        expect(result).toMatch(/<html[^>]*lang="ja"/);
        expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
      });

      it('should output html tag with both lang and class attributes when lang and defaultTheme dark are set', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = { lang: 'en', defaultTheme: 'dark' as const };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="en"/);
        expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
      });

      it('should output html tag with only lang attribute when lang is set but theme is light', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = { lang: 'ja', theme: 'light' as const };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="ja"/);
        expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
      });
    });

    describe('integration with other options', () => {
      it('should work with head content and lang option', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const head = SAMPLE_HEAD;
        const options = { lang: 'ja' };

        // Act
        const result = wrapHtml(content, hydrationScript, head, options);

        // Assert
        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toMatch(/<html[^>]*lang="ja"/);
        expect(result).toContain(head);
        expect(result).toContain(content);
        expect(result).toContain(hydrationScript);
      });

      it('should work with importMap and lang option', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = {
          lang: 'ja',
          importMap: { '@constela/runtime': '/runtime.js' },
        };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="ja"/);
        expect(result).toContain('importmap');
      });

      it('should work with themeStorageKey and lang option', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const options = {
          lang: 'ja',
          themeStorageKey: 'theme',
        };

        // Act
        const result = wrapHtml(content, hydrationScript, undefined, options);

        // Assert
        expect(result).toMatch(/<html[^>]*lang="ja"/);
        expect(result).toContain('localStorage');
      });

      it('should work with all options combined', () => {
        // Arrange
        const content = SAMPLE_CONTENT;
        const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
        const head = SAMPLE_HEAD;
        const options = {
          lang: 'ja',
          theme: 'dark' as const,
          themeStorageKey: 'theme',
          importMap: { '@constela/runtime': '/runtime.js' },
        };

        // Act
        const result = wrapHtml(content, hydrationScript, head, options);

        // Assert
        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toMatch(/<html[^>]*lang="ja"/);
        expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
        expect(result).toContain(head);
        expect(result).toContain('localStorage');
        expect(result).toContain('importmap');
      });
    });
  });

  // ==================== ConstelaConfigFile type test ====================

  describe('ConstelaConfigFile', () => {
    it('should accept seo.lang option (type-level test)', () => {
      // This test verifies that ConstelaConfigFile type accepts seo.lang option.
      // If the type doesn't support seo.lang, this will cause a TypeScript compile error.

      // Arrange & Act
      const config: ConstelaConfigFile = {
        css: 'styles.css',
        seo: {
          lang: 'ja',
        },
      };

      // Assert
      // Type-level test: if this compiles, the test passes
      expect(config.seo?.lang).toBe('ja');
    });

    it('should accept seo object with only lang property', () => {
      // Arrange & Act
      const config: ConstelaConfigFile = {
        seo: {
          lang: 'en',
        },
      };

      // Assert
      expect(config.seo?.lang).toBe('en');
    });

    it('should accept config without seo option', () => {
      // Arrange & Act
      const config: ConstelaConfigFile = {
        css: 'styles.css',
      };

      // Assert
      expect(config.seo).toBeUndefined();
    });
  });

  describe('security', () => {
    it('should reject lang value with special characters (XSS prevention)', () => {
      expect(() => wrapHtml('', '', undefined, { lang: 'en" onclick="alert(1)' })).toThrow('Invalid lang');
    });

    it('should reject lang value with angle brackets', () => {
      expect(() => wrapHtml('', '', undefined, { lang: '<script>' })).toThrow('Invalid lang');
    });

    it('should reject lang value with ampersand', () => {
      expect(() => wrapHtml('', '', undefined, { lang: 'en&amp;' })).toThrow('Invalid lang');
    });

    it('should accept valid BCP 47 language tags', () => {
      expect(() => wrapHtml('', '', undefined, { lang: 'ja' })).not.toThrow();
      expect(() => wrapHtml('', '', undefined, { lang: 'en-US' })).not.toThrow();
      expect(() => wrapHtml('', '', undefined, { lang: 'zh-Hans' })).not.toThrow();
      expect(() => wrapHtml('', '', undefined, { lang: 'zh-Hans-CN' })).not.toThrow();
      expect(() => wrapHtml('', '', undefined, { lang: 'pt-BR' })).not.toThrow();
    });
  });
});
