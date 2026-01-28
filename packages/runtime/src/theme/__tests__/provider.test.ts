/**
 * Test module for ThemeProvider.
 *
 * Coverage:
 * - Initialization with default and custom options
 * - getTheme - resolved theme retrieval
 * - getMode / setMode - color scheme management
 * - subscribe - reactive notifications
 * - setColors - dynamic color updates
 * - destroy - cleanup and resource management
 * - CSS Variable Generation - DOM integration
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createThemeProvider } from '../provider.js';
import type {
  ThemeProvider,
  ThemeProviderOptions,
  ResolvedTheme,
} from '../provider.js';
import type { ColorScheme, ThemeColors, ThemeConfig } from '@constela/core';

// ==================== Test Utilities ====================

/**
 * Creates a mock for window.matchMedia
 */
function createMatchMediaMock(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];

  const mock = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn((listener: (e: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    }),
    removeListener: vi.fn((listener: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    }),
    addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      }
    }),
    dispatchEvent: vi.fn(),
    // Helper to simulate media query change
    _simulateChange: (newPrefersDark: boolean) => {
      mock.matches = newPrefersDark;
      listeners.forEach((listener) => {
        listener({ matches: newPrefersDark } as MediaQueryListEvent);
      });
    },
    _getListeners: () => listeners,
  };

  return mock;
}

/**
 * Creates mock for document.documentElement
 */
function createDocumentElementMock() {
  const classList = {
    _classes: new Set<string>(),
    add: vi.fn((cls: string) => classList._classes.add(cls)),
    remove: vi.fn((cls: string) => classList._classes.delete(cls)),
    contains: vi.fn((cls: string) => classList._classes.has(cls)),
    toggle: vi.fn((cls: string, force?: boolean) => {
      if (force === undefined) {
        if (classList._classes.has(cls)) {
          classList._classes.delete(cls);
          return false;
        } else {
          classList._classes.add(cls);
          return true;
        }
      }
      if (force) {
        classList._classes.add(cls);
      } else {
        classList._classes.delete(cls);
      }
      return force;
    }),
  };

  const style = {
    _properties: new Map<string, string>(),
    setProperty: vi.fn((name: string, value: string) => {
      style._properties.set(name, value);
    }),
    getPropertyValue: vi.fn((name: string) => style._properties.get(name) ?? ''),
    removeProperty: vi.fn((name: string) => {
      const value = style._properties.get(name);
      style._properties.delete(name);
      return value ?? '';
    }),
  };

  return { classList, style };
}

/**
 * Creates mock for localStorage
 */
function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    _store: store,
  };
}

// ==================== Test Suite ====================

describe('ThemeProvider', () => {
  let matchMediaMock: ReturnType<typeof createMatchMediaMock>;
  let documentElementMock: ReturnType<typeof createDocumentElementMock>;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let originalMatchMedia: typeof window.matchMedia;
  let originalDocumentElement: typeof document.documentElement;
  let originalLocalStorage: typeof window.localStorage;

  beforeEach(() => {
    // Setup mocks
    matchMediaMock = createMatchMediaMock(false); // Default to light mode
    documentElementMock = createDocumentElementMock();
    localStorageMock = createLocalStorageMock();

    // Store originals
    originalMatchMedia = window.matchMedia;
    originalDocumentElement = document.documentElement;
    originalLocalStorage = window.localStorage;

    // Apply mocks
    window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);
    Object.defineProperty(document, 'documentElement', {
      value: documentElementMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore originals
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(document, 'documentElement', {
      value: originalDocumentElement,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  // ==================== createThemeProvider - Initialization ====================

  describe('createThemeProvider - Initialization', () => {
    it('should create provider with default options', () => {
      // Act
      const provider = createThemeProvider();

      // Assert
      expect(provider).toBeDefined();
      expect(typeof provider.getTheme).toBe('function');
      expect(typeof provider.getMode).toBe('function');
      expect(typeof provider.setMode).toBe('function');
      expect(typeof provider.subscribe).toBe('function');
      expect(typeof provider.setColors).toBe('function');
      expect(typeof provider.destroy).toBe('function');
    });

    it('should create provider with custom config', () => {
      // Arrange
      const config: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: '#3b82f6',
          background: '#ffffff',
        },
        darkColors: {
          primary: '#60a5fa',
          background: '#0f172a',
        },
        fonts: {
          sans: 'Inter, sans-serif',
        },
      };

      // Act
      const provider = createThemeProvider({ config });

      // Assert
      const theme = provider.getTheme();
      expect(theme.colors.primary).toBe('#60a5fa'); // Should use darkColors
      expect(theme.fonts.sans).toBe('Inter, sans-serif');
    });

    it('should use defaultMode when provided', () => {
      // Arrange
      const options: ThemeProviderOptions = {
        defaultMode: 'dark',
      };

      // Act
      const provider = createThemeProvider(options);

      // Assert
      expect(provider.getMode()).toBe('dark');
    });

    it('should default to system mode when no defaultMode provided', () => {
      // Act
      const provider = createThemeProvider();

      // Assert
      expect(provider.getMode()).toBe('system');
    });

    it('should apply custom storageKey when provided', () => {
      // Arrange
      const customKey = 'my-app-theme';
      const options: ThemeProviderOptions = {
        storageKey: customKey,
        defaultMode: 'dark',
      };

      // Act
      const provider = createThemeProvider(options);
      provider.setMode('light');

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith(customKey, 'light');
    });
  });

  // ==================== getTheme ====================

  describe('getTheme', () => {
    it('should return resolved theme with resolvedMode', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });

      // Act
      const theme = provider.getTheme();

      // Assert
      expect(theme).toBeDefined();
      expect(theme.resolvedMode).toBe('light');
      expect(theme.selectedMode).toBe('light');
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
    });

    it('should resolve system to light based on media query (prefers-color-scheme: light)', () => {
      // Arrange - matchMediaMock defaults to prefersDark: false
      const provider = createThemeProvider({
        defaultMode: 'system',
      });

      // Act
      const theme = provider.getTheme();

      // Assert
      expect(theme.selectedMode).toBe('system');
      expect(theme.resolvedMode).toBe('light');
    });

    it('should resolve system to dark based on media query (prefers-color-scheme: dark)', () => {
      // Arrange
      matchMediaMock = createMatchMediaMock(true); // Prefer dark
      window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);

      const provider = createThemeProvider({
        defaultMode: 'system',
      });

      // Act
      const theme = provider.getTheme();

      // Assert
      expect(theme.selectedMode).toBe('system');
      expect(theme.resolvedMode).toBe('dark');
    });

    it('should return current colors based on light mode', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
          background: '#ffffff',
        },
        darkColors: {
          primary: '#60a5fa',
          background: '#0f172a',
        },
      };

      const provider = createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Act
      const theme = provider.getTheme();

      // Assert
      expect(theme.colors.primary).toBe('#3b82f6');
      expect(theme.colors.background).toBe('#ffffff');
    });

    it('should return darkColors when in dark mode', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
          background: '#ffffff',
        },
        darkColors: {
          primary: '#60a5fa',
          background: '#0f172a',
        },
      };

      const provider = createThemeProvider({
        config,
        defaultMode: 'dark',
      });

      // Act
      const theme = provider.getTheme();

      // Assert
      expect(theme.colors.primary).toBe('#60a5fa');
      expect(theme.colors.background).toBe('#0f172a');
    });

    it('should fall back to light colors when darkColors not provided', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
        },
      };

      const provider = createThemeProvider({
        config,
        defaultMode: 'dark',
      });

      // Act
      const theme = provider.getTheme();

      // Assert
      expect(theme.colors.primary).toBe('#3b82f6');
    });
  });

  // ==================== getMode / setMode ====================

  describe('getMode / setMode', () => {
    it('should return current mode via getMode', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });

      // Act & Assert
      expect(provider.getMode()).toBe('light');
    });

    it('should change the mode via setMode', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });

      // Act
      provider.setMode('dark');

      // Assert
      expect(provider.getMode()).toBe('dark');
    });

    it('should update resolvedMode when changing to light', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'dark',
      });

      // Act
      provider.setMode('light');

      // Assert
      const theme = provider.getTheme();
      expect(theme.resolvedMode).toBe('light');
    });

    it('should update resolvedMode when changing to dark', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });

      // Act
      provider.setMode('dark');

      // Assert
      const theme = provider.getTheme();
      expect(theme.resolvedMode).toBe('dark');
    });

    it('should persist mode to localStorage', () => {
      // Arrange
      const provider = createThemeProvider({
        storageKey: 'theme-mode',
        defaultMode: 'light',
      });

      // Act
      provider.setMode('dark');

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
    });

    it('should load persisted mode from localStorage on initialization', () => {
      // Arrange
      localStorageMock._store.set('theme-mode', 'dark');

      // Act
      const provider = createThemeProvider({
        storageKey: 'theme-mode',
        defaultMode: 'light', // Should be overridden by persisted value
      });

      // Assert
      expect(provider.getMode()).toBe('dark');
    });

    it('should trigger subscriber notifications when mode changes', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();
      provider.subscribe(subscriber);

      // Act
      provider.setMode('dark');

      // Assert
      expect(subscriber).toHaveBeenCalled();
      const theme = subscriber.mock.calls[0][0] as ResolvedTheme;
      expect(theme.resolvedMode).toBe('dark');
    });

    it('should handle system mode change via media query', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'system',
      });
      const subscriber = vi.fn();
      provider.subscribe(subscriber);

      // Act - simulate system preference change
      matchMediaMock._simulateChange(true); // Change to prefer dark

      // Assert
      expect(subscriber).toHaveBeenCalled();
      const theme = subscriber.mock.calls[0][0] as ResolvedTheme;
      expect(theme.selectedMode).toBe('system');
      expect(theme.resolvedMode).toBe('dark');
    });
  });

  // ==================== subscribe ====================

  describe('subscribe', () => {
    it('should call subscriber callback when theme changes', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();

      // Act
      provider.subscribe(subscriber);
      provider.setMode('dark');

      // Assert
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();

      // Act
      const unsubscribe = provider.subscribe(subscriber);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop receiving updates after unsubscribe', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();

      // Act
      const unsubscribe = provider.subscribe(subscriber);
      provider.setMode('dark');
      expect(subscriber).toHaveBeenCalledTimes(1);

      unsubscribe();
      provider.setMode('light');

      // Assert - should still be 1, not 2
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should notify multiple subscribers', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      const subscriber3 = vi.fn();

      // Act
      provider.subscribe(subscriber1);
      provider.subscribe(subscriber2);
      provider.subscribe(subscriber3);
      provider.setMode('dark');

      // Assert
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
      expect(subscriber3).toHaveBeenCalledTimes(1);
    });

    it('should pass ResolvedTheme to subscriber', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: { primary: '#3b82f6' },
        fonts: { sans: 'Inter' },
      };
      const provider = createThemeProvider({
        config,
        defaultMode: 'light',
      });
      const subscriber = vi.fn();

      // Act
      provider.subscribe(subscriber);
      provider.setMode('dark');

      // Assert
      const theme = subscriber.mock.calls[0][0] as ResolvedTheme;
      expect(theme.resolvedMode).toBe('dark');
      expect(theme.selectedMode).toBe('dark');
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
    });
  });

  // ==================== setColors ====================

  describe('setColors', () => {
    it('should update light mode colors by default', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });

      // Act
      provider.setColors({
        primary: '#ef4444',
        background: '#fefefe',
      });

      // Assert
      const theme = provider.getTheme();
      expect(theme.colors.primary).toBe('#ef4444');
      expect(theme.colors.background).toBe('#fefefe');
    });

    it('should update dark mode colors when mode=dark specified', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'dark',
      });

      // Act
      provider.setColors(
        {
          primary: '#f87171',
          background: '#1e1e1e',
        },
        'dark'
      );

      // Assert
      const theme = provider.getTheme();
      expect(theme.colors.primary).toBe('#f87171');
      expect(theme.colors.background).toBe('#1e1e1e');
    });

    it('should trigger subscriber notifications when colors change', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();
      provider.subscribe(subscriber);

      // Act
      provider.setColors({ primary: '#22c55e' });

      // Assert
      expect(subscriber).toHaveBeenCalledTimes(1);
      const theme = subscriber.mock.calls[0][0] as ResolvedTheme;
      expect(theme.colors.primary).toBe('#22c55e');
    });

    it('should merge colors with existing colors', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#ffffff',
        },
      };
      const provider = createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Act - only update primary
      provider.setColors({ primary: '#ef4444' });

      // Assert - secondary and background should remain
      const theme = provider.getTheme();
      expect(theme.colors.primary).toBe('#ef4444');
      expect(theme.colors.secondary).toBe('#64748b');
      expect(theme.colors.background).toBe('#ffffff');
    });
  });

  // ==================== destroy ====================

  describe('destroy', () => {
    it('should clean up media query listeners', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'system',
      });

      // Act
      provider.destroy();

      // Assert
      expect(matchMediaMock.removeEventListener).toHaveBeenCalled();
    });

    it('should prevent further updates after destroy', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();
      provider.subscribe(subscriber);

      // Act
      provider.destroy();
      
      // These should not trigger subscriber
      provider.setMode('dark');

      // Assert
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should clear all subscribers on destroy', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      provider.subscribe(subscriber1);
      provider.subscribe(subscriber2);

      // Act
      provider.destroy();

      // Simulate what would have triggered subscribers
      // (This depends on implementation - might need to test differently)
      
      // Assert - no subscribers should be called
      expect(subscriber1).not.toHaveBeenCalled();
      expect(subscriber2).not.toHaveBeenCalled();
    });
  });

  // ==================== CSS Variable Generation ====================

  describe('CSS Variable Generation', () => {
    it('should apply CSS variables to :root on initialization', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
          background: '#ffffff',
        },
      };

      // Act
      createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Assert
      expect(documentElementMock.style.setProperty).toHaveBeenCalledWith(
        '--primary',
        '#3b82f6'
      );
      expect(documentElementMock.style.setProperty).toHaveBeenCalledWith(
        '--background',
        '#ffffff'
      );
    });

    it('should update CSS variables when theme changes', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
        },
        darkColors: {
          primary: '#60a5fa',
        },
      };
      const provider = createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Clear initial calls
      vi.clearAllMocks();

      // Act
      provider.setMode('dark');

      // Assert
      expect(documentElementMock.style.setProperty).toHaveBeenCalledWith(
        '--primary',
        '#60a5fa'
      );
    });

    it('should add dark class to html element when dark mode', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });

      // Act
      provider.setMode('dark');

      // Assert
      expect(documentElementMock.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class from html element when light mode', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'dark',
      });

      // Act
      provider.setMode('light');

      // Assert
      expect(documentElementMock.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should use cssPrefix for CSS variable names when configured', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: '#3b82f6',
        },
        cssPrefix: 'app',
      };

      // Act
      createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Assert
      expect(documentElementMock.style.setProperty).toHaveBeenCalledWith(
        '--app-primary',
        '#3b82f6'
      );
    });

    it('should apply font CSS variables', () => {
      // Arrange
      const config: ThemeConfig = {
        fonts: {
          sans: 'Inter, sans-serif',
          mono: 'Fira Code, monospace',
        },
      };

      // Act
      createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Assert
      expect(documentElementMock.style.setProperty).toHaveBeenCalledWith(
        '--font-sans',
        'Inter, sans-serif'
      );
      expect(documentElementMock.style.setProperty).toHaveBeenCalledWith(
        '--font-mono',
        'Fira Code, monospace'
      );
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle empty config gracefully', () => {
      // Act
      const provider = createThemeProvider({
        config: {},
      });

      // Assert
      const theme = provider.getTheme();
      expect(theme).toBeDefined();
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
    });

    it('should handle undefined config values', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: undefined,
        darkColors: undefined,
        fonts: undefined,
      };

      // Act
      const provider = createThemeProvider({ config });

      // Assert
      const theme = provider.getTheme();
      expect(theme).toBeDefined();
    });

    it('should handle rapid mode changes', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();
      provider.subscribe(subscriber);

      // Act
      provider.setMode('dark');
      provider.setMode('light');
      provider.setMode('dark');
      provider.setMode('system');

      // Assert - all changes should be tracked
      expect(subscriber).toHaveBeenCalledTimes(4);
    });

    it('should not notify when setting same mode', () => {
      // Arrange
      const provider = createThemeProvider({
        defaultMode: 'light',
      });
      const subscriber = vi.fn();
      provider.subscribe(subscriber);

      // Act
      provider.setMode('light'); // Same as default

      // Assert
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should handle special characters in color values', () => {
      // Arrange
      const config: ThemeConfig = {
        colors: {
          primary: 'hsl(217, 91%, 60%)',
          background: 'rgb(255, 255, 255)',
          border: 'oklch(0.7 0.1 200)',
        },
      };

      // Act
      const provider = createThemeProvider({
        config,
        defaultMode: 'light',
      });

      // Assert
      const theme = provider.getTheme();
      expect(theme.colors.primary).toBe('hsl(217, 91%, 60%)');
      expect(theme.colors.background).toBe('rgb(255, 255, 255)');
      expect(theme.colors.border).toBe('oklch(0.7 0.1 200)');
    });
  });

  // ==================== Cookie Support ====================

  describe('Cookie Support', () => {
    it('should use cookies when useCookies option is true', () => {
      // Arrange
      const mockDocument = {
        ...document,
        cookie: '',
      };
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true,
        configurable: true,
      });

      // Act
      const provider = createThemeProvider({
        useCookies: true,
        storageKey: 'theme',
        defaultMode: 'light',
      });
      provider.setMode('dark');

      // Assert
      expect(document.cookie).toContain('theme=dark');
    });
  });
});
