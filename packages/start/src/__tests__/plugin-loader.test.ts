/**
 * Test module for the plugin loader (dynamic import).
 *
 * Coverage:
 * - loadPlugins with empty array: resolves successfully
 * - loadPlugins with valid plugin path: mock dynamic import with default export
 * - loadPlugins with missing module: throws when module not found
 * - loadPlugins with invalid plugin (no name): throws when plugin has no name field
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearPlugins } from '@constela/core';

// ==================== Tests ====================

describe('loadPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    clearPlugins();
  });

  // ==================== Happy Path ====================

  describe('when given an empty array', () => {
    it('should resolve successfully with no plugins registered', async () => {
      // Arrange
      const { loadPlugins } = await import('../plugin-loader.js');

      // Act & Assert - should not throw
      await expect(loadPlugins([])).resolves.not.toThrow();
    });
  });

  describe('when given a valid plugin path', () => {
    it('should dynamically import the module and register its default export', async () => {
      // Arrange: create a temporary module that exports a valid plugin
      const { loadPlugins } = await import('../plugin-loader.js');
      const { callGlobalFunction } = await import('@constela/core');

      // Create a data URI module that exports a valid plugin
      const pluginCode = `export default { name: 'test-plugin', globalFunctions: { testFn: () => 42 } };`;
      const dataUri = `data:text/javascript;base64,${Buffer.from(pluginCode).toString('base64')}`;

      // Act
      await loadPlugins([dataUri]);

      // Assert - the plugin's function should be callable
      const result = callGlobalFunction('testFn', []);
      expect(result).toBe(42);
    });
  });

  // ==================== Error Handling ====================

  describe('when given a missing module path', () => {
    it('should throw when module is not found', async () => {
      // Arrange
      const { loadPlugins } = await import('../plugin-loader.js');

      // Act & Assert
      await expect(
        loadPlugins(['@constela/nonexistent-plugin-xyz'])
      ).rejects.toThrow();
    });
  });

  describe('when given an invalid plugin (no name field)', () => {
    it('should throw when the loaded module has no name field', async () => {
      // Arrange
      const { loadPlugins } = await import('../plugin-loader.js');

      // Create a data URI module that exports an object without a name field
      const pluginCode = `export default { version: '1.0' };`;
      const dataUri = `data:text/javascript;base64,${Buffer.from(pluginCode).toString('base64')}`;

      // Act & Assert
      await expect(
        loadPlugins([dataUri])
      ).rejects.toThrow(/name/);
    });
  });
});
