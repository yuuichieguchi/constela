/**
 * Test module for the Constela Plugin System.
 *
 * Coverage:
 * - registerPlugin: registering plugins with name and globalFunctions
 * - getRegisteredPlugins: retrieving all registered plugins
 * - clearPlugins: removing all registered plugins
 * - Plugin name duplication detection
 * - Integration with callGlobalFunction for plugin-provided functions
 *
 * TDD Red Phase: All tests MUST FAIL because the plugin module does not exist yet.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerPlugin, getRegisteredPlugins, clearPlugins } from '../index.js';
import type { ConstelaPlugin } from '../index.js';
import { callGlobalFunction } from '../../helpers/global-functions.js';

// ==================== Test Fixtures ====================

/**
 * A minimal plugin with only a name (no globalFunctions).
 */
const minimalPlugin: ConstelaPlugin = {
  name: 'minimal-plugin',
};

/**
 * A plugin that provides custom global functions.
 */
const mathPlugin: ConstelaPlugin = {
  name: 'math-plugin',
  globalFunctions: {
    double: (x: unknown) => (typeof x === 'number' ? x * 2 : undefined),
    triple: (x: unknown) => (typeof x === 'number' ? x * 3 : undefined),
  },
};

/**
 * Another plugin with a different set of global functions.
 */
const stringPlugin: ConstelaPlugin = {
  name: 'string-plugin',
  globalFunctions: {
    shout: (s: unknown) => (typeof s === 'string' ? s.toUpperCase() + '!' : undefined),
  },
};

// ==================== Tests ====================

describe('Plugin Registry', () => {
  beforeEach(() => {
    clearPlugins();
  });

  // ==================== registerPlugin basics ====================

  describe('registerPlugin', () => {
    it('should register a plugin with name and globalFunctions', () => {
      // Arrange & Act
      registerPlugin(mathPlugin);

      // Assert
      const plugins = getRegisteredPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0]!.name).toBe('math-plugin');
    });

    it('should register a plugin with name only (no globalFunctions)', () => {
      // Arrange & Act
      registerPlugin(minimalPlugin);

      // Assert
      const plugins = getRegisteredPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0]!.name).toBe('minimal-plugin');
    });

    it('should register multiple plugins', () => {
      // Arrange & Act
      registerPlugin(mathPlugin);
      registerPlugin(stringPlugin);

      // Assert
      const plugins = getRegisteredPlugins();
      expect(plugins).toHaveLength(2);
    });
  });

  // ==================== getRegisteredPlugins ====================

  describe('getRegisteredPlugins', () => {
    it('should return an empty array when no plugins are registered', () => {
      // Act
      const plugins = getRegisteredPlugins();

      // Assert
      expect(plugins).toEqual([]);
    });

    it('should return all registered plugins in registration order', () => {
      // Arrange
      registerPlugin(minimalPlugin);
      registerPlugin(mathPlugin);
      registerPlugin(stringPlugin);

      // Act
      const plugins = getRegisteredPlugins();

      // Assert
      expect(plugins).toHaveLength(3);
      expect(plugins[0]!.name).toBe('minimal-plugin');
      expect(plugins[1]!.name).toBe('math-plugin');
      expect(plugins[2]!.name).toBe('string-plugin');
    });
  });

  // ==================== Plugin name duplication ====================

  describe('duplicate name detection', () => {
    it('should throw Error when registering a plugin with a duplicate name', () => {
      // Arrange
      registerPlugin(mathPlugin);

      // Act & Assert
      const duplicatePlugin: ConstelaPlugin = {
        name: 'math-plugin',
        globalFunctions: {
          quad: (x: unknown) => (typeof x === 'number' ? x * 4 : undefined),
        },
      };

      expect(() => registerPlugin(duplicatePlugin)).toThrow();
    });

    it('should throw an error message that includes the duplicate plugin name', () => {
      // Arrange
      registerPlugin(mathPlugin);

      // Act & Assert
      const duplicatePlugin: ConstelaPlugin = { name: 'math-plugin' };

      expect(() => registerPlugin(duplicatePlugin)).toThrow(/math-plugin/);
    });
  });

  // ==================== clearPlugins ====================

  describe('clearPlugins', () => {
    it('should clear all registered plugins', () => {
      // Arrange
      registerPlugin(mathPlugin);
      registerPlugin(stringPlugin);
      expect(getRegisteredPlugins()).toHaveLength(2);

      // Act
      clearPlugins();

      // Assert
      expect(getRegisteredPlugins()).toHaveLength(0);
    });

    it('should allow registering a plugin with the same name after clearing', () => {
      // Arrange
      registerPlugin(mathPlugin);
      clearPlugins();

      // Act & Assert - should not throw
      expect(() => registerPlugin(mathPlugin)).not.toThrow();
      expect(getRegisteredPlugins()).toHaveLength(1);
    });
  });

  // ==================== Global function registration via plugins ====================

  describe('global function registration', () => {
    it('should make plugin globalFunctions callable via callGlobalFunction', () => {
      // Arrange
      registerPlugin(mathPlugin);

      // Act
      const result = callGlobalFunction('double', [5]);

      // Assert
      expect(result).toBe(10);
    });

    it('should register all globalFunctions from a plugin', () => {
      // Arrange
      registerPlugin(mathPlugin);

      // Act
      const doubleResult = callGlobalFunction('double', [7]);
      const tripleResult = callGlobalFunction('triple', [7]);

      // Assert
      expect(doubleResult).toBe(14);
      expect(tripleResult).toBe(21);
    });

    it('should register globalFunctions from multiple plugins', () => {
      // Arrange
      registerPlugin(mathPlugin);
      registerPlugin(stringPlugin);

      // Act
      const doubleResult = callGlobalFunction('double', [4]);
      const shoutResult = callGlobalFunction('shout', ['hello']);

      // Assert
      expect(doubleResult).toBe(8);
      expect(shoutResult).toBe('HELLO!');
    });

    it('should remove plugin functions after clearPlugins', () => {
      // Arrange
      registerPlugin(mathPlugin);
      expect(callGlobalFunction('double', [5])).toBe(10);

      // Act
      clearPlugins();

      // Assert
      const result = callGlobalFunction('double', [5]);
      expect(result).toBeUndefined();
    });

    it('should not affect built-in global functions after clearPlugins', () => {
      // Arrange
      registerPlugin(mathPlugin);

      // Act
      clearPlugins();

      // Assert - built-in 'min' should still work
      const result = callGlobalFunction('min', [3, 1, 2]);
      expect(result).toBe(1);
    });
  });
});
