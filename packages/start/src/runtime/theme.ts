/**
 * Theme utilities for SSR in Constela applications
 */

import type { ThemeConfig, ColorScheme } from '@constela/core';

export interface SSRThemeOptions {
  config?: ThemeConfig;
  cookieMode?: ColorScheme;
  cssPrefix?: string;
}

/**
 * Escapes a string for safe embedding in CSS.
 */
function escapeCssValue(value: string): string {
  // Remove any CSS injection attempts
  return value.replace(/[;<>{}]/g, '');
}

/**
 * Escapes a string for safe embedding in JavaScript string literals.
 */
function escapeJsString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/<\/script>/gi, '<\\/script>');
}

/**
 * Generates CSS variables for theme configuration.
 * Creates :root variables for light mode colors and fonts,
 * and .dark selector variables for dark mode colors.
 */
export function generateThemeCss(options: SSRThemeOptions): string {
  const { config, cssPrefix: optionsPrefix } = options;

  if (!config) {
    return '';
  }

  const { colors, darkColors, fonts, cssPrefix: configPrefix } = config;
  const prefix = optionsPrefix ?? configPrefix ?? '';

  // Check if there's anything to generate
  const hasColors = colors && Object.keys(colors).length > 0;
  const hasDarkColors = darkColors && Object.keys(darkColors).length > 0;
  const hasFonts = fonts && Object.keys(fonts).length > 0;

  if (!hasColors && !hasDarkColors && !hasFonts) {
    return '';
  }

  const lines: string[] = [];

  // Generate :root variables
  const rootVars: string[] = [];

  // Determine separator: add hyphen if prefix exists and doesn't end with '-'
  const separator = prefix && !prefix.endsWith('-') ? '-' : '';

  if (colors) {
    for (const [key, value] of Object.entries(colors)) {
      if (value !== undefined) {
        rootVars.push(`  --${prefix}${separator}${key}: ${escapeCssValue(value)};`);
      }
    }
  }

  if (fonts) {
    for (const [key, value] of Object.entries(fonts)) {
      if (value !== undefined) {
        rootVars.push(`  --${prefix}${separator}font-${key}: ${escapeCssValue(value)};`);
      }
    }
  }

  if (rootVars.length > 0) {
    lines.push(':root {');
    lines.push(...rootVars);
    lines.push('}');
  }

  // Generate .dark variables
  if (darkColors) {
    const darkVars: string[] = [];
    for (const [key, value] of Object.entries(darkColors)) {
      if (value !== undefined) {
        darkVars.push(`  --${prefix}${separator}${key}: ${escapeCssValue(value)};`);
      }
    }

    if (darkVars.length > 0) {
      lines.push('.dark {');
      lines.push(...darkVars);
      lines.push('}');
    }
  }

  return lines.join('\n');
}

/**
 * Generates an inline script to prevent Flash of Unstyled Content (FOUC).
 */
export function generateThemeScript(storageKey: string = 'theme'): string {
  // Handle empty string
  if (storageKey === '') {
    storageKey = 'theme';
  }

  const escapedKey = escapeJsString(storageKey);

  return `(function() {
  try {
    var theme;
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.indexOf('${escapedKey}=') === 0) {
        theme = decodeURIComponent(cookie.substring('${escapedKey}='.length));
        break;
      }
    }
    if (!theme) {
      theme = localStorage.getItem('${escapedKey}');
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();`;
}

/**
 * Determines the HTML class to apply based on theme configuration and cookie.
 */
export function getHtmlThemeClass(config?: ThemeConfig, cookieMode?: ColorScheme): string {
  // Cookie takes precedence
  if (cookieMode === 'dark') {
    return 'dark';
  }
  if (cookieMode === 'light' || cookieMode === 'system') {
    return '';
  }

  // Fall back to config.mode
  if (config?.mode === 'dark') {
    return 'dark';
  }

  // 'light', 'system', or undefined -> empty string
  return '';
}
