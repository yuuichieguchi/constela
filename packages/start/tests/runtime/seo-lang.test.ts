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

  // ==================== Extended BCP 47 Language Tag Support ====================
  // These tests verify support for extended BCP 47 language tags beyond basic format.
  // Reference: https://www.rfc-editor.org/rfc/rfc5646.html

  describe('extended language subtags (extlang)', () => {
    /**
     * Extended language subtags (extlang) are 3-letter codes that follow
     * the primary language subtag to provide more specific language identification.
     * Format: language-extlang (e.g., zh-cmn for Mandarin Chinese)
     */

    it('should accept extended language subtag: zh-cmn (Mandarin Chinese)', () => {
      // Arrange
      const lang = 'zh-cmn';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="zh-cmn"/);
    });

    it('should accept extended language subtag with script: zh-cmn-Hans (Simplified Mandarin)', () => {
      // Arrange
      const lang = 'zh-cmn-Hans';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="zh-cmn-Hans"/);
    });

    it('should accept extended language subtag with script and region: zh-cmn-Hans-CN', () => {
      // Arrange
      const lang = 'zh-cmn-Hans-CN';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="zh-cmn-Hans-CN"/);
    });

    it('should accept extended language subtag: zh-yue (Cantonese)', () => {
      // Arrange
      const lang = 'zh-yue';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="zh-yue"/);
    });

    it('should accept extended language subtag: zh-gan (Gan Chinese)', () => {
      // Arrange
      const lang = 'zh-gan';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="zh-gan"/);
    });
  });

  describe('variant subtags', () => {
    /**
     * Variant subtags indicate dialects, orthographies, or other variations.
     * Format: language-variant or language-region-variant
     * Variants are 5-8 alphanumeric characters (or 4 characters starting with a digit).
     */

    it('should accept variant subtag: sl-rozaj (Resian dialect of Slovenian)', () => {
      // Arrange
      const lang = 'sl-rozaj';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="sl-rozaj"/);
    });

    it('should accept multiple variant subtags: sl-rozaj-biske (San Giorgio dialect of Resian)', () => {
      // Arrange
      const lang = 'sl-rozaj-biske';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="sl-rozaj-biske"/);
    });

    it('should accept variant subtag: de-CH-1901 (German, Swiss, traditional orthography)', () => {
      // Arrange - variant starting with digit (4 chars)
      const lang = 'de-CH-1901';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="de-CH-1901"/);
    });

    it('should accept variant subtag: de-1996 (German, new orthography)', () => {
      // Arrange - variant without region
      const lang = 'de-1996';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="de-1996"/);
    });

    it('should accept variant subtag: en-scotland (Scottish Standard English)', () => {
      // Arrange - variant with 8 characters
      const lang = 'en-scotland';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="en-scotland"/);
    });
  });

  describe('extension subtags', () => {
    /**
     * Extension subtags provide additional information about the language tag.
     * Format: language-extension where extension starts with a singleton letter
     * followed by subtags (e.g., -u- for Unicode locale extensions).
     */

    it('should accept Unicode locale extension: de-DE-u-co-phonebk (German with phonebook collation)', () => {
      // Arrange
      const lang = 'de-DE-u-co-phonebk';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="de-DE-u-co-phonebk"/);
    });

    it('should accept Unicode locale extension: ja-u-ca-japanese (Japanese with Japanese calendar)', () => {
      // Arrange
      const lang = 'ja-u-ca-japanese';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="ja-u-ca-japanese"/);
    });

    it('should accept Unicode locale extension: en-US-u-hc-h12 (US English with 12-hour time)', () => {
      // Arrange
      const lang = 'en-US-u-hc-h12';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="en-US-u-hc-h12"/);
    });

    it('should accept transformed extension: ja-t-it (Japanese transliterated from Italian)', () => {
      // Arrange - t singleton for transformed content
      const lang = 'ja-t-it';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="ja-t-it"/);
    });

    it('should accept multiple extension subtags: zh-Hans-CN-u-co-pinyin-nu-latn', () => {
      // Arrange - multiple Unicode extension keys
      const lang = 'zh-Hans-CN-u-co-pinyin-nu-latn';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="zh-Hans-CN-u-co-pinyin-nu-latn"/);
    });
  });

  describe('complex BCP 47 language tags', () => {
    /**
     * Complex tags combining multiple subtag types.
     */

    it('should accept complex tag with extlang, script, region, and variant', () => {
      // Arrange - sr-Latn-RS-ijekavsk (Serbian, Latin, Serbia, Ijekavian pronunciation)
      const lang = 'sr-Latn-RS-ijekavsk';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="sr-Latn-RS-ijekavsk"/);
    });

    it('should accept private use subtag: en-x-custom', () => {
      // Arrange - x singleton for private use
      const lang = 'en-x-custom';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="en-x-custom"/);
    });

    it('should accept grandfathered tag: i-klingon', () => {
      // Arrange - grandfathered irregular tag
      const lang = 'i-klingon';

      // Act & Assert
      expect(() => wrapHtml('', '', undefined, { lang })).not.toThrow();
      const result = wrapHtml('', '', undefined, { lang });
      expect(result).toMatch(/<html[^>]*lang="i-klingon"/);
    });
  });
});
