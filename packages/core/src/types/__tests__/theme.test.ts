/**
 * Test module for Theme types.
 *
 * Coverage:
 * - ColorScheme type ('light' | 'dark' | 'system')
 * - ThemeColors interface (shadcn/ui compatible)
 * - ThemeFonts interface
 * - ThemeConfig interface
 * - isColorScheme type guard
 * - isThemeColors type guard
 * - isThemeFonts type guard
 * - isThemeConfig type guard
 *
 * TDD Red Phase: These tests verify the theme types
 * that will be added to support theming in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type {
  ColorScheme,
  ThemeColors,
  ThemeFonts,
  ThemeConfig,
} from '../theme.js';
import {
  isColorScheme,
  isThemeColors,
  isThemeFonts,
  isThemeConfig,
} from '../theme.js';

// ==================== ColorScheme Tests ====================

describe('ColorScheme', () => {
  describe('type structure', () => {
    it('should accept "light" as valid ColorScheme', () => {
      // Arrange
      const scheme: ColorScheme = 'light';

      // Assert
      expect(scheme).toBe('light');
    });

    it('should accept "dark" as valid ColorScheme', () => {
      // Arrange
      const scheme: ColorScheme = 'dark';

      // Assert
      expect(scheme).toBe('dark');
    });

    it('should accept "system" as valid ColorScheme', () => {
      // Arrange
      const scheme: ColorScheme = 'system';

      // Assert
      expect(scheme).toBe('system');
    });
  });

  describe('isColorScheme type guard', () => {
    it('should return true for "light"', () => {
      expect(isColorScheme('light')).toBe(true);
    });

    it('should return true for "dark"', () => {
      expect(isColorScheme('dark')).toBe(true);
    });

    it('should return true for "system"', () => {
      expect(isColorScheme('system')).toBe(true);
    });

    it('should return false for invalid string "invalid"', () => {
      expect(isColorScheme('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isColorScheme('')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isColorScheme(123)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isColorScheme(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isColorScheme(undefined)).toBe(false);
    });

    it('should return false for object', () => {
      expect(isColorScheme({ mode: 'light' })).toBe(false);
    });

    it('should return false for array', () => {
      expect(isColorScheme(['light', 'dark'])).toBe(false);
    });

    it('should return false for boolean', () => {
      expect(isColorScheme(true)).toBe(false);
    });
  });
});

// ==================== ThemeColors Tests ====================

describe('ThemeColors', () => {
  describe('type structure', () => {
    it('should accept empty object (all properties optional)', () => {
      // Arrange
      const colors: ThemeColors = {};

      // Assert
      expect(colors).toEqual({});
    });

    it('should accept object with primary color', () => {
      // Arrange
      const colors: ThemeColors = {
        primary: 'hsl(220, 90%, 56%)',
      };

      // Assert
      expect(colors.primary).toBe('hsl(220, 90%, 56%)');
    });

    it('should accept object with primary and primary-foreground', () => {
      // Arrange
      const colors: ThemeColors = {
        primary: 'hsl(220, 90%, 56%)',
        'primary-foreground': 'hsl(0, 0%, 100%)',
      };

      // Assert
      expect(colors['primary-foreground']).toBe('hsl(0, 0%, 100%)');
    });

    it('should accept object with all standard shadcn/ui color tokens', () => {
      // Arrange
      const colors: ThemeColors = {
        primary: 'hsl(220, 90%, 56%)',
        'primary-foreground': 'hsl(0, 0%, 100%)',
        secondary: 'hsl(220, 14%, 96%)',
        'secondary-foreground': 'hsl(220, 9%, 46%)',
        destructive: 'hsl(0, 84%, 60%)',
        'destructive-foreground': 'hsl(0, 0%, 100%)',
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(220, 9%, 46%)',
        muted: 'hsl(220, 14%, 96%)',
        'muted-foreground': 'hsl(220, 9%, 46%)',
        accent: 'hsl(220, 14%, 96%)',
        'accent-foreground': 'hsl(220, 9%, 46%)',
        popover: 'hsl(0, 0%, 100%)',
        'popover-foreground': 'hsl(220, 9%, 46%)',
        card: 'hsl(0, 0%, 100%)',
        'card-foreground': 'hsl(220, 9%, 46%)',
        border: 'hsl(220, 13%, 91%)',
        input: 'hsl(220, 13%, 91%)',
        ring: 'hsl(220, 90%, 56%)',
      };

      // Assert
      expect(colors.primary).toBeDefined();
      expect(colors.border).toBeDefined();
      expect(colors.ring).toBeDefined();
    });

    it('should accept object with custom color properties', () => {
      // Arrange
      const colors: ThemeColors = {
        primary: 'hsl(220, 90%, 56%)',
        'brand-blue': 'hsl(210, 100%, 50%)',
        'custom-accent': 'hsl(300, 80%, 60%)',
      };

      // Assert
      expect(colors['brand-blue']).toBe('hsl(210, 100%, 50%)');
      expect(colors['custom-accent']).toBe('hsl(300, 80%, 60%)');
    });
  });

  describe('isThemeColors type guard', () => {
    it('should return true for empty object (all optional)', () => {
      expect(isThemeColors({})).toBe(true);
    });

    it('should return true for object with valid color properties', () => {
      // Arrange
      const colors = {
        primary: 'hsl(220, 90%, 56%)',
        background: 'hsl(0, 0%, 100%)',
      };

      // Assert
      expect(isThemeColors(colors)).toBe(true);
    });

    it('should return true for object with custom color properties', () => {
      // Arrange
      const colors = {
        'brand-primary': 'hsl(220, 90%, 56%)',
        'custom-color': '#ff0000',
      };

      // Assert
      expect(isThemeColors(colors)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isThemeColors(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isThemeColors(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isThemeColors('colors')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isThemeColors(123)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isThemeColors(['red', 'blue'])).toBe(false);
    });

    it('should return false for object with non-string values', () => {
      // Arrange
      const colors = {
        primary: 123,
        background: 'white',
      };

      // Assert
      expect(isThemeColors(colors)).toBe(false);
    });

    it('should return false for object with object values', () => {
      // Arrange
      const colors = {
        primary: { light: 'white', dark: 'black' },
      };

      // Assert
      expect(isThemeColors(colors)).toBe(false);
    });

    it('should return false for object with array values', () => {
      // Arrange
      const colors = {
        primary: ['red', 'blue'],
      };

      // Assert
      expect(isThemeColors(colors)).toBe(false);
    });

    it('should return false for object with null values', () => {
      // Arrange
      const colors = {
        primary: null,
      };

      // Assert
      expect(isThemeColors(colors)).toBe(false);
    });

    it('should return true for object with undefined values (optional properties)', () => {
      // Arrange
      const colors = {
        primary: 'blue',
        secondary: undefined,
      };

      // Assert
      expect(isThemeColors(colors)).toBe(true);
    });
  });
});

// ==================== ThemeFonts Tests ====================

describe('ThemeFonts', () => {
  describe('type structure', () => {
    it('should accept empty object (all properties optional)', () => {
      // Arrange
      const fonts: ThemeFonts = {};

      // Assert
      expect(fonts).toEqual({});
    });

    it('should accept object with sans font', () => {
      // Arrange
      const fonts: ThemeFonts = {
        sans: 'Inter, system-ui, sans-serif',
      };

      // Assert
      expect(fonts.sans).toBe('Inter, system-ui, sans-serif');
    });

    it('should accept object with serif font', () => {
      // Arrange
      const fonts: ThemeFonts = {
        serif: 'Georgia, serif',
      };

      // Assert
      expect(fonts.serif).toBe('Georgia, serif');
    });

    it('should accept object with mono font', () => {
      // Arrange
      const fonts: ThemeFonts = {
        mono: 'JetBrains Mono, monospace',
      };

      // Assert
      expect(fonts.mono).toBe('JetBrains Mono, monospace');
    });

    it('should accept object with all standard font families', () => {
      // Arrange
      const fonts: ThemeFonts = {
        sans: 'Inter, system-ui, sans-serif',
        serif: 'Georgia, serif',
        mono: 'JetBrains Mono, monospace',
      };

      // Assert
      expect(fonts.sans).toBeDefined();
      expect(fonts.serif).toBeDefined();
      expect(fonts.mono).toBeDefined();
    });

    it('should accept object with custom font families', () => {
      // Arrange
      const fonts: ThemeFonts = {
        sans: 'Inter, sans-serif',
        heading: 'Poppins, sans-serif',
        code: 'Fira Code, monospace',
      };

      // Assert
      expect(fonts.heading).toBe('Poppins, sans-serif');
      expect(fonts.code).toBe('Fira Code, monospace');
    });
  });

  describe('isThemeFonts type guard', () => {
    it('should return true for empty object (all optional)', () => {
      expect(isThemeFonts({})).toBe(true);
    });

    it('should return true for object with valid font properties', () => {
      // Arrange
      const fonts = {
        sans: 'Inter, sans-serif',
        mono: 'JetBrains Mono, monospace',
      };

      // Assert
      expect(isThemeFonts(fonts)).toBe(true);
    });

    it('should return true for object with custom font families', () => {
      // Arrange
      const fonts = {
        heading: 'Poppins, sans-serif',
        body: 'Open Sans, sans-serif',
      };

      // Assert
      expect(isThemeFonts(fonts)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isThemeFonts(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isThemeFonts(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isThemeFonts('Inter, sans-serif')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isThemeFonts(123)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isThemeFonts(['Inter', 'sans-serif'])).toBe(false);
    });

    it('should return false for object with non-string values', () => {
      // Arrange
      const fonts = {
        sans: 123,
      };

      // Assert
      expect(isThemeFonts(fonts)).toBe(false);
    });

    it('should return false for object with object values', () => {
      // Arrange
      const fonts = {
        sans: { family: 'Inter', weight: 400 },
      };

      // Assert
      expect(isThemeFonts(fonts)).toBe(false);
    });

    it('should return false for object with array values', () => {
      // Arrange
      const fonts = {
        sans: ['Inter', 'sans-serif'],
      };

      // Assert
      expect(isThemeFonts(fonts)).toBe(false);
    });

    it('should return true for object with undefined values (optional properties)', () => {
      // Arrange
      const fonts = {
        sans: 'Inter, sans-serif',
        serif: undefined,
      };

      // Assert
      expect(isThemeFonts(fonts)).toBe(true);
    });
  });
});

// ==================== ThemeConfig Tests ====================

describe('ThemeConfig', () => {
  describe('type structure', () => {
    it('should accept empty object (all properties optional)', () => {
      // Arrange
      const config: ThemeConfig = {};

      // Assert
      expect(config).toEqual({});
    });

    it('should accept object with mode only', () => {
      // Arrange
      const config: ThemeConfig = {
        mode: 'light',
      };

      // Assert
      expect(config.mode).toBe('light');
    });

    it('should accept object with colors only', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: 'hsl(220, 90%, 56%)',
          background: 'hsl(0, 0%, 100%)',
        },
      };

      // Assert
      expect(config.colors?.primary).toBe('hsl(220, 90%, 56%)');
    });

    it('should accept object with darkColors only', () => {
      // Arrange
      const config: ThemeConfig = {
        darkColors: {
          primary: 'hsl(220, 90%, 70%)',
          background: 'hsl(220, 15%, 10%)',
        },
      };

      // Assert
      expect(config.darkColors?.primary).toBe('hsl(220, 90%, 70%)');
    });

    it('should accept object with fonts only', () => {
      // Arrange
      const config: ThemeConfig = {
        fonts: {
          sans: 'Inter, sans-serif',
          mono: 'JetBrains Mono, monospace',
        },
      };

      // Assert
      expect(config.fonts?.sans).toBe('Inter, sans-serif');
    });

    it('should accept object with cssPrefix only', () => {
      // Arrange
      const config: ThemeConfig = {
        cssPrefix: '--my-app-',
      };

      // Assert
      expect(config.cssPrefix).toBe('--my-app-');
    });

    it('should accept complete theme config', () => {
      // Arrange
      const config: ThemeConfig = {
        mode: 'system',
        colors: {
          primary: 'hsl(220, 90%, 56%)',
          background: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(220, 9%, 15%)',
        },
        darkColors: {
          primary: 'hsl(220, 90%, 70%)',
          background: 'hsl(220, 15%, 10%)',
          foreground: 'hsl(0, 0%, 95%)',
        },
        fonts: {
          sans: 'Inter, system-ui, sans-serif',
          serif: 'Georgia, serif',
          mono: 'JetBrains Mono, monospace',
        },
        cssPrefix: '--constela-',
      };

      // Assert
      expect(config.mode).toBe('system');
      expect(config.colors?.primary).toBeDefined();
      expect(config.darkColors?.primary).toBeDefined();
      expect(config.fonts?.sans).toBeDefined();
      expect(config.cssPrefix).toBe('--constela-');
    });

    it('should accept config with colors and darkColors for light/dark mode support', () => {
      // Arrange
      const config: ThemeConfig = {
        mode: 'system',
        colors: {
          primary: 'hsl(220, 90%, 56%)',
          secondary: 'hsl(220, 14%, 96%)',
          background: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(220, 9%, 15%)',
        },
        darkColors: {
          primary: 'hsl(220, 90%, 70%)',
          secondary: 'hsl(220, 14%, 20%)',
          background: 'hsl(220, 15%, 10%)',
          foreground: 'hsl(0, 0%, 95%)',
        },
      };

      // Assert
      expect(config.mode).toBe('system');
      expect(config.colors).toBeDefined();
      expect(config.darkColors).toBeDefined();
    });
  });

  describe('isThemeConfig type guard', () => {
    it('should return true for empty object (all optional)', () => {
      expect(isThemeConfig({})).toBe(true);
    });

    it('should return true for object with mode only', () => {
      // Arrange
      const config = {
        mode: 'dark',
      };

      // Assert
      expect(isThemeConfig(config)).toBe(true);
    });

    it('should return true for object with colors only', () => {
      // Arrange
      const config = {
        colors: {
          primary: 'blue',
        },
      };

      // Assert
      expect(isThemeConfig(config)).toBe(true);
    });

    it('should return true for object with darkColors only', () => {
      // Arrange
      const config = {
        darkColors: {
          primary: 'lightblue',
        },
      };

      // Assert
      expect(isThemeConfig(config)).toBe(true);
    });

    it('should return true for object with fonts only', () => {
      // Arrange
      const config = {
        fonts: {
          sans: 'Inter',
        },
      };

      // Assert
      expect(isThemeConfig(config)).toBe(true);
    });

    it('should return true for object with cssPrefix only', () => {
      // Arrange
      const config = {
        cssPrefix: '--app-',
      };

      // Assert
      expect(isThemeConfig(config)).toBe(true);
    });

    it('should return true for complete config', () => {
      // Arrange
      const config = {
        mode: 'system',
        colors: {
          primary: 'blue',
          background: 'white',
        },
        darkColors: {
          primary: 'lightblue',
          background: 'black',
        },
        fonts: {
          sans: 'Inter',
          mono: 'JetBrains Mono',
        },
        cssPrefix: '--constela-',
      };

      // Assert
      expect(isThemeConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isThemeConfig(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isThemeConfig(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isThemeConfig('config')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isThemeConfig(123)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isThemeConfig(['light', 'dark'])).toBe(false);
    });

    it('should return false for object with invalid mode', () => {
      // Arrange
      const config = {
        mode: 'invalid',
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with mode as number', () => {
      // Arrange
      const config = {
        mode: 123,
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with invalid colors', () => {
      // Arrange
      const config = {
        colors: 'red',
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with colors containing non-string values', () => {
      // Arrange
      const config = {
        colors: {
          primary: 123,
        },
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with invalid darkColors', () => {
      // Arrange
      const config = {
        darkColors: ['red', 'blue'],
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with invalid fonts', () => {
      // Arrange
      const config = {
        fonts: 'Inter',
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with fonts containing non-string values', () => {
      // Arrange
      const config = {
        fonts: {
          sans: { family: 'Inter' },
        },
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with cssPrefix as number', () => {
      // Arrange
      const config = {
        cssPrefix: 123,
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });

    it('should return false for object with cssPrefix as object', () => {
      // Arrange
      const config = {
        cssPrefix: { prefix: '--app-' },
      };

      // Assert
      expect(isThemeConfig(config)).toBe(false);
    });
  });
});
