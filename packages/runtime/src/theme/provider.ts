/**
 * ThemeProvider - Runtime theme management for Constela UI
 *
 * Provides reactive theme state management with:
 * - System theme detection via prefers-color-scheme
 * - CSS variable application to :root
 * - Dark class management on document.documentElement
 * - Persistence via localStorage (optional cookies)
 * - Subscription-based notifications
 */

import type { ColorScheme, ThemeColors, ThemeFonts, ThemeConfig } from '@constela/core';

export interface ThemeProviderOptions {
  config?: ThemeConfig;
  storageKey?: string;
  useCookies?: boolean;
  defaultMode?: ColorScheme;
}

export interface ResolvedTheme {
  resolvedMode: 'light' | 'dark';
  selectedMode: ColorScheme;
  colors: ThemeColors;
  fonts: ThemeFonts;
}

export interface ThemeProvider {
  getTheme(): ResolvedTheme;
  getMode(): ColorScheme;
  setMode(mode: ColorScheme): void;
  subscribe(fn: (theme: ResolvedTheme) => void): () => void;
  setColors(colors: ThemeColors, mode?: 'light' | 'dark'): void;
  destroy(): void;
}

// Default empty values
const DEFAULT_COLORS: ThemeColors = {};
const DEFAULT_FONTS: ThemeFonts = {};
const DEFAULT_STORAGE_KEY = 'constela-theme-mode';

/**
 * Creates a ThemeProvider instance for managing application theme state.
 */
export function createThemeProvider(options?: ThemeProviderOptions): ThemeProvider {
  const config = options?.config ?? {};
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;
  const useCookies = options?.useCookies ?? false;
  const defaultMode = options?.defaultMode ?? 'system';

  // State
  let lightColors: ThemeColors = { ...DEFAULT_COLORS, ...config.colors };
  let darkColors: ThemeColors = { ...DEFAULT_COLORS, ...config.darkColors };
  const fonts: ThemeFonts = { ...DEFAULT_FONTS, ...config.fonts };
  const cssPrefix = config.cssPrefix ?? '';

  // Load persisted mode or use config.mode or use default
  let selectedMode: ColorScheme = loadPersistedMode() ?? config.mode ?? defaultMode;

  // Subscribers for theme changes
  const subscribers = new Set<(theme: ResolvedTheme) => void>();

  // Track destroyed state
  let destroyed = false;

  // Media query for system preference detection
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  /**
   * Handles system color scheme changes
   */
  function handleMediaChange(event: MediaQueryListEvent): void {
    if (destroyed) return;
    if (selectedMode === 'system') {
      applyTheme();
      notifySubscribers();
    }
  }

  // Add media query listener
  if (mediaQuery) {
    mediaQuery.addEventListener('change', handleMediaChange);
  }

  /**
   * Loads persisted mode from storage
   */
  function loadPersistedMode(): ColorScheme | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // localStorage may not be available
    }
    return null;
  }

  /**
   * Persists mode to storage
   */
  function persistMode(mode: ColorScheme): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // localStorage may not be available
    }

    if (useCookies && typeof document !== 'undefined') {
      document.cookie = `${storageKey}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }

  /**
   * Resolves system mode to light or dark based on media query
   */
  function resolveMode(): 'light' | 'dark' {
    if (selectedMode === 'light' || selectedMode === 'dark') {
      return selectedMode;
    }
    // System mode - check media query
    if (mediaQuery) {
      return mediaQuery.matches ? 'dark' : 'light';
    }
    return 'light';
  }

  /**
   * Gets the current colors based on resolved mode
   */
  function getCurrentColors(): ThemeColors {
    const resolved = resolveMode();
    if (resolved === 'dark') {
      // Use darkColors if available, otherwise fall back to lightColors
      return Object.keys(darkColors).length > 0
        ? { ...lightColors, ...darkColors }
        : lightColors;
    }
    return lightColors;
  }

  /**
   * Applies CSS variables to :root
   */
  function applyCSSVariables(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const colors = getCurrentColors();
    const prefix = cssPrefix ? `${cssPrefix}-` : '';

    // Apply color variables
    for (const [key, value] of Object.entries(colors)) {
      if (value !== undefined) {
        root.style.setProperty(`--${prefix}${key}`, value);
      }
    }

    // Apply font variables
    for (const [key, value] of Object.entries(fonts)) {
      if (value !== undefined) {
        root.style.setProperty(`--font-${key}`, value);
      }
    }
  }

  /**
   * Applies dark class to document element
   */
  function applyDarkClass(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (!root) return;

    const resolved = resolveMode();

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  /**
   * Applies all theme changes to DOM
   */
  function applyTheme(): void {
    applyCSSVariables();
    applyDarkClass();
  }

  /**
   * Notifies all subscribers of theme change
   */
  function notifySubscribers(): void {
    if (destroyed) return;
    const theme = getTheme();
    for (const fn of subscribers) {
      fn(theme);
    }
  }

  /**
   * Gets the current resolved theme
   */
  function getTheme(): ResolvedTheme {
    return {
      resolvedMode: resolveMode(),
      selectedMode,
      colors: getCurrentColors(),
      fonts,
    };
  }

  /**
   * Gets the current selected mode
   */
  function getMode(): ColorScheme {
    return selectedMode;
  }

  /**
   * Sets the color scheme mode
   */
  function setMode(mode: ColorScheme): void {
    if (destroyed) return;
    if (mode === selectedMode) return;

    selectedMode = mode;
    persistMode(mode);
    applyTheme();
    notifySubscribers();
  }

  /**
   * Subscribes to theme changes
   */
  function subscribe(fn: (theme: ResolvedTheme) => void): () => void {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }

  /**
   * Updates colors for a specific mode
   */
  function setColors(colors: ThemeColors, mode?: 'light' | 'dark'): void {
    if (destroyed) return;

    const targetMode = mode ?? 'light';

    if (targetMode === 'dark') {
      darkColors = { ...darkColors, ...colors };
    } else {
      lightColors = { ...lightColors, ...colors };
    }

    applyTheme();
    notifySubscribers();
  }

  /**
   * Destroys the provider and cleans up resources
   */
  function destroy(): void {
    destroyed = true;
    subscribers.clear();

    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }

  // Initial theme application
  applyTheme();

  return {
    getTheme,
    getMode,
    setMode,
    subscribe,
    setColors,
    destroy,
  };
}
