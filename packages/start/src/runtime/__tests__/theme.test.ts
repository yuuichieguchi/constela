/**
 * Test suite for SSR theme utilities
 *
 * Coverage:
 * - generateThemeCss: CSS variable generation for :root and .dark
 * - generateThemeScript: FOUC prevention script generation
 * - getHtmlThemeClass: HTML class determination for theme
 */

import { describe, it, expect } from 'vitest';
import type { ThemeConfig, ColorScheme, ThemeColors, ThemeFonts } from '@constela/core';
import {
  generateThemeCss,
  generateThemeScript,
  getHtmlThemeClass,
  type SSRThemeOptions,
} from '../theme.js';

// ==================== Test Fixtures ====================

function createMinimalConfig(): ThemeConfig {
  return {
    mode: 'light',
  };
}

function createColorsOnlyConfig(): ThemeConfig {
  return {
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      foreground: '#0f172a',
    },
  };
}

function createFullConfig(): ThemeConfig {
  return {
    mode: 'dark',
    colors: {
      primary: '#3b82f6',
      'primary-foreground': '#ffffff',
      background: '#ffffff',
      foreground: '#0f172a',
      border: '#e2e8f0',
    },
    darkColors: {
      primary: '#60a5fa',
      'primary-foreground': '#0f172a',
      background: '#0f172a',
      foreground: '#f8fafc',
      border: '#334155',
    },
    fonts: {
      sans: 'Inter, sans-serif',
      mono: 'Fira Code, monospace',
    },
    cssPrefix: 'theme',
  };
}

function createFontsOnlyConfig(): ThemeConfig {
  return {
    fonts: {
      sans: 'Inter, sans-serif',
      serif: 'Merriweather, serif',
      mono: 'Fira Code, monospace',
    },
  };
}

// ==================== Tests: generateThemeCss ====================

describe('generateThemeCss', () => {
  // ==================== Happy Path ====================

  describe('when no config provided', () => {
    it('should return empty string when no config provided', () => {
      /**
       * Given: No theme configuration
       * When: generateThemeCss is called without options
       * Then: Returns empty string (no CSS to generate)
       */
      // Arrange
      const options: SSRThemeOptions = {};

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toBe('');
    });

    it('should return empty string when config is undefined', () => {
      /**
       * Given: Config is explicitly undefined
       * When: generateThemeCss is called
       * Then: Returns empty string
       */
      // Arrange
      const options: SSRThemeOptions = { config: undefined };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toBe('');
    });
  });

  describe('when colors are provided', () => {
    it('should generate :root CSS variables from colors', () => {
      /**
       * Given: ThemeConfig with colors
       * When: generateThemeCss is called
       * Then: Returns CSS with :root selector containing CSS variables
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: createColorsOnlyConfig(),
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain(':root');
      expect(css).toContain('--primary: #3b82f6');
      expect(css).toContain('--background: #ffffff');
      expect(css).toContain('--foreground: #0f172a');
    });

    it('should generate .dark CSS variables from darkColors', () => {
      /**
       * Given: ThemeConfig with darkColors
       * When: generateThemeCss is called
       * Then: Returns CSS with .dark selector containing dark mode CSS variables
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: createFullConfig(),
      };

      // Act
      const css = generateThemeCss(options);

      // Assert - note: createFullConfig has cssPrefix: 'theme'
      expect(css).toContain('.dark');
      expect(css).toContain('--theme-primary: #60a5fa');
      expect(css).toContain('--theme-background: #0f172a');
      expect(css).toContain('--theme-foreground: #f8fafc');
    });
  });

  describe('when fonts are provided', () => {
    it('should generate font CSS variables', () => {
      /**
       * Given: ThemeConfig with fonts
       * When: generateThemeCss is called
       * Then: Returns CSS with font-family CSS variables
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: createFontsOnlyConfig(),
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain(':root');
      expect(css).toContain('--font-sans: Inter, sans-serif');
      expect(css).toContain('--font-serif: Merriweather, serif');
      expect(css).toContain('--font-mono: Fira Code, monospace');
    });
  });

  describe('when cssPrefix is provided', () => {
    it('should apply cssPrefix to variable names', () => {
      /**
       * Given: ThemeConfig with cssPrefix
       * When: generateThemeCss is called
       * Then: CSS variables are prefixed with the provided prefix
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: {
          colors: { primary: '#3b82f6' },
          cssPrefix: 'my-app',
        },
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain('--my-app-primary: #3b82f6');
    });

    it('should apply cssPrefix from options over config', () => {
      /**
       * Given: cssPrefix in both options and config
       * When: generateThemeCss is called
       * Then: Options cssPrefix takes precedence
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: {
          colors: { primary: '#3b82f6' },
          cssPrefix: 'config-prefix',
        },
        cssPrefix: 'options-prefix',
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain('--options-prefix-primary: #3b82f6');
      expect(css).not.toContain('--config-prefix-primary');
    });
  });

  describe('when complete config provided', () => {
    it('should handle complete config with all options', () => {
      /**
       * Given: Complete ThemeConfig with colors, darkColors, fonts, and cssPrefix
       * When: generateThemeCss is called
       * Then: Returns complete CSS with all variables
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: createFullConfig(),
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      // Light mode colors in :root
      expect(css).toContain(':root');
      expect(css).toContain('--theme-primary: #3b82f6');
      expect(css).toContain('--theme-background: #ffffff');

      // Dark mode colors in .dark
      expect(css).toContain('.dark');
      expect(css).toContain('--theme-primary: #60a5fa');
      expect(css).toContain('--theme-background: #0f172a');

      // Fonts
      expect(css).toContain('--theme-font-sans: Inter, sans-serif');
      expect(css).toContain('--theme-font-mono: Fira Code, monospace');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should escape special characters in color values', () => {
      /**
       * Given: Color values with special characters (e.g., url(), calc())
       * When: generateThemeCss is called
       * Then: Values are properly escaped/included in CSS
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: {
          colors: {
            // CSS value that could break if not handled properly
            gradient: 'linear-gradient(180deg, #fff 0%, #000 100%)',
          },
        },
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain('--gradient: linear-gradient(180deg, #fff 0%, #000 100%)');
    });

    it('should handle hyphenated color names correctly', () => {
      /**
       * Given: Color names with hyphens (e.g., primary-foreground)
       * When: generateThemeCss is called
       * Then: Hyphenated names are preserved in CSS variables
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: {
          colors: {
            'primary-foreground': '#ffffff',
            'muted-foreground': '#64748b',
          },
        },
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain('--primary-foreground: #ffffff');
      expect(css).toContain('--muted-foreground: #64748b');
    });

    it('should skip undefined color values', () => {
      /**
       * Given: ThemeColors with some undefined values
       * When: generateThemeCss is called
       * Then: Undefined values are not included in CSS
       */
      // Arrange
      const options: SSRThemeOptions = {
        config: {
          colors: {
            primary: '#3b82f6',
            secondary: undefined,
          },
        },
      };

      // Act
      const css = generateThemeCss(options);

      // Assert
      expect(css).toContain('--primary: #3b82f6');
      expect(css).not.toContain('--secondary');
    });
  });
});

// ==================== Tests: generateThemeScript ====================

describe('generateThemeScript', () => {
  // ==================== Happy Path ====================

  describe('when storageKey is not provided', () => {
    it('should use default storageKey "theme" when not provided', () => {
      /**
       * Given: No storageKey provided
       * When: generateThemeScript is called
       * Then: Script uses 'theme' as the default key
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain("'theme'");
    });
  });

  describe('when storageKey is provided', () => {
    it('should use custom storageKey when provided', () => {
      /**
       * Given: Custom storageKey 'my-app-theme'
       * When: generateThemeScript is called
       * Then: Script uses the custom key
       */
      // Arrange
      const storageKey = 'my-app-theme';

      // Act
      const script = generateThemeScript(storageKey);

      // Assert
      expect(script).toContain("'my-app-theme'");
    });
  });

  describe('script behavior', () => {
    it('should generate script that reads from localStorage', () => {
      /**
       * Given: Default configuration
       * When: generateThemeScript is called
       * Then: Script includes localStorage.getItem call
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain('localStorage');
      expect(script).toContain('getItem');
    });

    it('should generate script that reads from cookie', () => {
      /**
       * Given: Default configuration
       * When: generateThemeScript is called
       * Then: Script includes document.cookie access
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain('document.cookie');
    });

    it('should generate script that applies "dark" class when theme is dark', () => {
      /**
       * Given: Default configuration
       * When: generateThemeScript is called
       * Then: Script adds 'dark' class when theme value is 'dark'
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain("classList.add('dark')");
    });

    it('should generate script that removes "dark" class when theme is light', () => {
      /**
       * Given: Default configuration
       * When: generateThemeScript is called
       * Then: Script removes 'dark' class when theme value is 'light'
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain("classList.remove('dark')");
    });

    it('should generate script wrapped in IIFE for isolation', () => {
      /**
       * Given: Default configuration
       * When: generateThemeScript is called
       * Then: Script is wrapped in IIFE to avoid global scope pollution
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain('(function()');
      expect(script).toContain('})()');
    });

    it('should generate script with try-catch for error handling', () => {
      /**
       * Given: Default configuration
       * When: generateThemeScript is called
       * Then: Script includes try-catch to handle storage access errors
       */
      // Arrange & Act
      const script = generateThemeScript();

      // Assert
      expect(script).toContain('try');
      expect(script).toContain('catch');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should escape special characters in storageKey', () => {
      /**
       * Given: storageKey with special characters
       * When: generateThemeScript is called
       * Then: Key is properly escaped to prevent XSS
       */
      // Arrange
      const storageKey = "theme';</script><script>alert('xss')//";

      // Act
      const script = generateThemeScript(storageKey);

      // Assert
      // Should not contain unescaped script tags
      expect(script).not.toContain("</script><script>");
    });

    it('should handle empty string storageKey by using default', () => {
      /**
       * Given: Empty string storageKey
       * When: generateThemeScript is called
       * Then: Falls back to default 'theme' key
       */
      // Arrange & Act
      const script = generateThemeScript('');

      // Assert
      expect(script).toContain("'theme'");
    });
  });
});

// ==================== Tests: getHtmlThemeClass ====================

describe('getHtmlThemeClass', () => {
  // ==================== Happy Path ====================

  describe('when no config and no cookie', () => {
    it('should return empty string when no config and no cookie', () => {
      /**
       * Given: No config and no cookieMode
       * When: getHtmlThemeClass is called
       * Then: Returns empty string (default light mode, no class needed)
       */
      // Arrange & Act
      const result = getHtmlThemeClass();

      // Assert
      expect(result).toBe('');
    });

    it('should return empty string when config is undefined', () => {
      /**
       * Given: Explicitly undefined config
       * When: getHtmlThemeClass is called
       * Then: Returns empty string
       */
      // Arrange & Act
      const result = getHtmlThemeClass(undefined, undefined);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('when cookieMode is provided', () => {
    it('should return "dark" when cookieMode is "dark"', () => {
      /**
       * Given: cookieMode is 'dark'
       * When: getHtmlThemeClass is called
       * Then: Returns 'dark' for the class attribute
       */
      // Arrange
      const cookieMode: ColorScheme = 'dark';

      // Act
      const result = getHtmlThemeClass(undefined, cookieMode);

      // Assert
      expect(result).toBe('dark');
    });

    it('should return empty string when cookieMode is "light"', () => {
      /**
       * Given: cookieMode is 'light'
       * When: getHtmlThemeClass is called
       * Then: Returns empty string (light mode doesn't need class)
       */
      // Arrange
      const cookieMode: ColorScheme = 'light';

      // Act
      const result = getHtmlThemeClass(undefined, cookieMode);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('when config.mode is provided', () => {
    it('should return "dark" when config.mode is "dark" and no cookie', () => {
      /**
       * Given: config.mode is 'dark' and no cookieMode
       * When: getHtmlThemeClass is called
       * Then: Returns 'dark'
       */
      // Arrange
      const config: ThemeConfig = { mode: 'dark' };

      // Act
      const result = getHtmlThemeClass(config);

      // Assert
      expect(result).toBe('dark');
    });

    it('should return empty string when config.mode is "light"', () => {
      /**
       * Given: config.mode is 'light'
       * When: getHtmlThemeClass is called
       * Then: Returns empty string
       */
      // Arrange
      const config: ThemeConfig = { mode: 'light' };

      // Act
      const result = getHtmlThemeClass(config);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('when both config and cookie are provided', () => {
    it('should give cookie precedence over config.mode', () => {
      /**
       * Given: config.mode is 'light' but cookieMode is 'dark'
       * When: getHtmlThemeClass is called
       * Then: Returns 'dark' (cookie takes precedence)
       */
      // Arrange
      const config: ThemeConfig = { mode: 'light' };
      const cookieMode: ColorScheme = 'dark';

      // Act
      const result = getHtmlThemeClass(config, cookieMode);

      // Assert
      expect(result).toBe('dark');
    });

    it('should give cookie precedence over config.mode (reverse)', () => {
      /**
       * Given: config.mode is 'dark' but cookieMode is 'light'
       * When: getHtmlThemeClass is called
       * Then: Returns empty string (cookie takes precedence)
       */
      // Arrange
      const config: ThemeConfig = { mode: 'dark' };
      const cookieMode: ColorScheme = 'light';

      // Act
      const result = getHtmlThemeClass(config, cookieMode);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('when mode is "system"', () => {
    it('should return empty string when mode is "system" (client-side detection needed)', () => {
      /**
       * Given: config.mode is 'system'
       * When: getHtmlThemeClass is called
       * Then: Returns empty string (system preference requires client-side detection)
       */
      // Arrange
      const config: ThemeConfig = { mode: 'system' };

      // Act
      const result = getHtmlThemeClass(config);

      // Assert
      expect(result).toBe('');
    });

    it('should return empty string when cookieMode is "system"', () => {
      /**
       * Given: cookieMode is 'system'
       * When: getHtmlThemeClass is called
       * Then: Returns empty string (system preference requires client-side detection)
       */
      // Arrange
      const cookieMode: ColorScheme = 'system';

      // Act
      const result = getHtmlThemeClass(undefined, cookieMode);

      // Assert
      expect(result).toBe('');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle config with only colors (no mode)', () => {
      /**
       * Given: Config with colors but no mode
       * When: getHtmlThemeClass is called
       * Then: Returns empty string (defaults to light)
       */
      // Arrange
      const config: ThemeConfig = {
        colors: { primary: '#3b82f6' },
      };

      // Act
      const result = getHtmlThemeClass(config);

      // Assert
      expect(result).toBe('');
    });
  });
});
