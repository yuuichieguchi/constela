/**
 * ThemeProvider wrapper for @constela/start
 *
 * Provides a static interface to the runtime ThemeProvider for use in entry-client.
 * This allows a singleton pattern for managing theme state across the application.
 */

import { createThemeProvider, type ThemeProvider as RuntimeThemeProvider } from '@constela/runtime';
import type { ThemeConfig, ColorScheme } from '@constela/core';

let instance: RuntimeThemeProvider | null = null;

/**
 * Static ThemeProvider interface for entry-client integration.
 */
export const ThemeProvider = {
  /**
   * Initializes the ThemeProvider with the given configuration.
   * Creates a new instance if one doesn't exist.
   */
  init(config: ThemeConfig): void {
    if (instance) {
      // Already initialized, destroy and recreate
      instance.destroy();
    }
    instance = createThemeProvider({ config });
  },

  /**
   * Sets the color scheme mode.
   */
  setMode(mode: ColorScheme): void {
    if (instance) {
      instance.setMode(mode);
    }
  },

  /**
   * Applies CSS variables to the document.
   * Called internally by init, but can be called manually if needed.
   */
  applyCssVariables(): void {
    // The runtime ThemeProvider applies CSS variables automatically on init and setMode
    // This method exists for explicit calls if needed
    if (instance) {
      // Re-apply by getting and setting the current mode
      const currentMode = instance.getMode();
      instance.setMode(currentMode);
    }
  },

  /**
   * Destroys the ThemeProvider instance and cleans up resources.
   */
  destroy(): void {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  },

  /**
   * Gets the underlying ThemeProvider instance.
   * Returns null if not initialized.
   */
  getInstance(): RuntimeThemeProvider | null {
    return instance;
  },
};
