/**
 * Theme System Types for Constela UI Framework
 */

// Color scheme values
export const COLOR_SCHEMES = ['light', 'dark', 'system'] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

// Semantic color tokens (shadcn/ui compatible)
export interface ThemeColors {
  primary?: string;
  'primary-foreground'?: string;
  secondary?: string;
  'secondary-foreground'?: string;
  destructive?: string;
  'destructive-foreground'?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  'muted-foreground'?: string;
  accent?: string;
  'accent-foreground'?: string;
  popover?: string;
  'popover-foreground'?: string;
  card?: string;
  'card-foreground'?: string;
  border?: string;
  input?: string;
  ring?: string;
  [key: string]: string | undefined;
}

// Font families
export interface ThemeFonts {
  sans?: string;
  serif?: string;
  mono?: string;
  [key: string]: string | undefined;
}

// Complete theme configuration
export interface ThemeConfig {
  mode?: ColorScheme;
  colors?: ThemeColors;
  darkColors?: ThemeColors;
  fonts?: ThemeFonts;
  cssPrefix?: string;
}

// Helper function (same pattern as guards.ts)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guards
export function isColorScheme(value: unknown): value is ColorScheme {
  return typeof value === 'string' && COLOR_SCHEMES.includes(value as ColorScheme);
}

export function isThemeColors(value: unknown): value is ThemeColors {
  if (!isObject(value)) return false;
  // All values must be string or undefined
  for (const val of Object.values(value)) {
    if (val !== undefined && typeof val !== 'string') {
      return false;
    }
  }
  return true;
}

export function isThemeFonts(value: unknown): value is ThemeFonts {
  if (!isObject(value)) return false;
  // All values must be string or undefined
  for (const val of Object.values(value)) {
    if (val !== undefined && typeof val !== 'string') {
      return false;
    }
  }
  return true;
}

export function isThemeConfig(value: unknown): value is ThemeConfig {
  if (!isObject(value)) return false;
  
  // Validate mode if present
  if ('mode' in value && value['mode'] !== undefined) {
    if (!isColorScheme(value['mode'])) return false;
  }
  
  // Validate colors if present
  if ('colors' in value && value['colors'] !== undefined) {
    if (!isThemeColors(value['colors'])) return false;
  }
  
  // Validate darkColors if present
  if ('darkColors' in value && value['darkColors'] !== undefined) {
    if (!isThemeColors(value['darkColors'])) return false;
  }
  
  // Validate fonts if present
  if ('fonts' in value && value['fonts'] !== undefined) {
    if (!isThemeFonts(value['fonts'])) return false;
  }
  
  // Validate cssPrefix if present
  if ('cssPrefix' in value && value['cssPrefix'] !== undefined) {
    if (typeof value['cssPrefix'] !== 'string') return false;
  }
  
  return true;
}
