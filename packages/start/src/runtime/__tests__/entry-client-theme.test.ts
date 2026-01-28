/**
 * Test suite for entry-client.ts theme integration
 *
 * Coverage:
 * - ThemeProvider initialization when program has theme config
 * - CSS variables application to :root
 * - Theme state synchronization with ThemeProvider
 * - Skip ThemeProvider when no theme config
 * - Cleanup on destroy
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';
import type { ThemeConfig } from '@constela/core';

// ==================== Mock Setup ====================

// Mock @constela/runtime
const mockHydrateApp = vi.fn();
const mockSubscribe = vi.fn();
const mockGetState = vi.fn();
const mockSetState = vi.fn();
const mockDestroy = vi.fn();

vi.mock('@constela/runtime', () => ({
  hydrateApp: (options: unknown) => {
    mockHydrateApp(options);
    return {
      subscribe: mockSubscribe,
      getState: mockGetState,
      setState: mockSetState,
      destroy: mockDestroy,
    };
  },
  createHMRClient: vi.fn(),
  createHMRHandler: vi.fn(),
  createErrorOverlay: vi.fn(() => ({ show: vi.fn(), hide: vi.fn() })),
}));

// Mock ThemeProvider
const mockThemeProviderInit = vi.fn();
const mockThemeProviderSetMode = vi.fn();
const mockThemeProviderDestroy = vi.fn();
const mockThemeProviderApplyCss = vi.fn();

vi.mock('../theme-provider.js', () => ({
  ThemeProvider: {
    init: mockThemeProviderInit,
    setMode: mockThemeProviderSetMode,
    destroy: mockThemeProviderDestroy,
    applyCssVariables: mockThemeProviderApplyCss,
  },
}));

// ==================== Test Fixtures ====================

function createMinimalProgram(): CompiledProgram {
  return {
    view: {
      node: 'element',
      tag: 'div',
      children: [{ node: 'text', value: 'Hello' }],
    },
    state: {},
    actions: {},
  } as CompiledProgram;
}

function createProgramWithTheme(theme: ThemeConfig): CompiledProgram {
  return {
    view: {
      node: 'element',
      tag: 'div',
      children: [{ node: 'text', value: 'Hello' }],
    },
    state: {
      theme: { initial: theme.mode ?? 'light' },
    },
    actions: {},
    theme,
  } as CompiledProgram & { theme: ThemeConfig };
}

function createMockContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'app';
  return container;
}

// ==================== Tests ====================

describe('initClient theme integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = createMockContainer();
    document.body.appendChild(container);

    // Setup default mock return values
    mockSubscribe.mockReturnValue(() => {});
    mockGetState.mockReturnValue('light');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ==================== Happy Path ====================

  it('should initialize ThemeProvider when program has theme config', async () => {
    /**
     * Given: program with theme property containing ThemeConfig
     * When: initClient is called
     * Then: ThemeProvider should be initialized with the theme config
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      mode: 'light',
      colors: { primary: '#3b82f6' },
    };
    const program = createProgramWithTheme(themeConfig);

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Assert
    expect(mockThemeProviderInit).toHaveBeenCalledWith(
      expect.objectContaining({
        colors: { primary: '#3b82f6' },
      })
    );
  });

  it('should apply initial theme CSS variables', async () => {
    /**
     * Given: program with theme config containing colors
     * When: initClient is called
     * Then: CSS variables should be applied to :root
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
      },
    };
    const program = createProgramWithTheme(themeConfig);

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Assert
    expect(mockThemeProviderApplyCss).toHaveBeenCalled();
    // Verify CSS variables are applied to document.documentElement
    // This will fail in Red phase since implementation doesn't exist yet
  });

  it('should sync theme state with ThemeProvider', async () => {
    /**
     * Given: program with theme state
     * When: program.state.theme changes
     * Then: ThemeProvider should update accordingly
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      mode: 'light',
      colors: { primary: '#3b82f6' },
    };
    const program = createProgramWithTheme(themeConfig);

    // Capture the subscribe callback
    let themeSubscribeCallback: ((value: unknown) => void) | null = null;
    mockSubscribe.mockImplementation((name: string, fn: (value: unknown) => void) => {
      if (name === 'theme') {
        themeSubscribeCallback = fn;
      }
      return () => {};
    });

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Simulate theme state change
    if (themeSubscribeCallback) {
      themeSubscribeCallback('dark');
    }

    // Assert
    expect(mockThemeProviderSetMode).toHaveBeenCalledWith('dark');
  });

  // ==================== Edge Cases ====================

  it('should not initialize ThemeProvider when no theme config', async () => {
    /**
     * Given: program without theme property
     * When: initClient is called
     * Then: ThemeProvider should NOT be initialized
     */
    // Arrange
    const program = createMinimalProgram();

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Assert
    expect(mockThemeProviderInit).not.toHaveBeenCalled();
  });

  it('should cleanup ThemeProvider on destroy', async () => {
    /**
     * Given: initClient was called with theme config
     * When: app.destroy() is called
     * Then: ThemeProvider.destroy should be called
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      mode: 'light',
      colors: { primary: '#3b82f6' },
    };
    const program = createProgramWithTheme(themeConfig);

    // Act
    const { initClient } = await import('../entry-client.js');
    const app = initClient({ program, container });
    app.destroy();

    // Assert
    expect(mockThemeProviderDestroy).toHaveBeenCalled();
  });

  it('should handle theme config with cssPrefix', async () => {
    /**
     * Given: program with theme config containing cssPrefix
     * When: initClient is called
     * Then: ThemeProvider should use the cssPrefix
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      colors: { primary: '#3b82f6' },
      cssPrefix: 'myapp',
    };
    const program = createProgramWithTheme(themeConfig);

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Assert
    expect(mockThemeProviderInit).toHaveBeenCalledWith(
      expect.objectContaining({
        cssPrefix: 'myapp',
      })
    );
  });

  it('should subscribe to theme state changes when theme state exists', async () => {
    /**
     * Given: program with theme state defined
     * When: initClient is called
     * Then: Should subscribe to 'theme' state changes
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      mode: 'light',
      colors: { primary: '#3b82f6' },
    };
    const program = createProgramWithTheme(themeConfig);

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Assert
    // Should have subscribed to 'theme' state
    expect(mockSubscribe).toHaveBeenCalledWith('theme', expect.any(Function));
  });

  it('should apply dark class to documentElement when theme is dark', async () => {
    /**
     * Given: program with theme mode 'dark'
     * When: initClient is called
     * Then: document.documentElement should have 'dark' class
     */
    // Arrange
    const themeConfig: ThemeConfig = {
      mode: 'dark',
      colors: { primary: '#3b82f6' },
    };
    const program = createProgramWithTheme(themeConfig);
    mockGetState.mockReturnValue('dark');

    // Act
    const { initClient } = await import('../entry-client.js');
    initClient({ program, container });

    // Assert
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
