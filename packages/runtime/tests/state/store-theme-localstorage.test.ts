/**
 * Test module for StateStore theme localStorage initialization.
 *
 * Coverage:
 * - Theme state initialization from localStorage
 * - JSON-serialized value parsing from localStorage
 * - Fallback to definition initial when localStorage is empty
 * - Non-theme state fields should NOT read from localStorage
 *
 * TDD Red Phase: These tests are expected to FAIL with current implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStateStore } from '../../src/state/store.js';

describe('createStateStore - theme localStorage initialization', () => {
  const THEME_STORAGE_KEY = 'theme';

  // ==================== Setup / Teardown ====================

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==================== Theme state from localStorage ====================

  describe('when localStorage has theme value', () => {
    it('should use localStorage value "light" as initial value instead of definition initial "dark"', () => {
      // Arrange
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      const stateDefinitions = {
        theme: { type: 'string', initial: 'dark' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('theme')).toBe('light');
    });

    it('should parse JSON-serialized value from localStorage', () => {
      // Arrange
      localStorage.setItem(THEME_STORAGE_KEY, '"light"');
      const stateDefinitions = {
        theme: { type: 'string', initial: 'dark' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('theme')).toBe('light');
    });

    it('should handle "dark" value from localStorage', () => {
      // Arrange
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      const stateDefinitions = {
        theme: { type: 'string', initial: 'light' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('theme')).toBe('dark');
    });

    it('should handle "system" value from localStorage', () => {
      // Arrange
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
      const stateDefinitions = {
        theme: { type: 'string', initial: 'dark' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('theme')).toBe('system');
    });
  });

  // ==================== Fallback to definition initial ====================

  describe('when localStorage is empty', () => {
    it('should use definition initial value when localStorage has no theme', () => {
      // Arrange
      // localStorage is empty (cleared in beforeEach)
      const stateDefinitions = {
        theme: { type: 'string', initial: 'dark' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('theme')).toBe('dark');
    });
  });

  // ==================== Non-theme state should not read localStorage ====================

  describe('non-theme state fields', () => {
    it('should NOT read localStorage for count state field', () => {
      // Arrange
      localStorage.setItem('constela:count', '100');
      const stateDefinitions = {
        count: { type: 'number', initial: 0 },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      // count should use definition initial, NOT localStorage
      expect(store.get('count')).toBe(0);
    });

    it('should NOT read localStorage for name state field', () => {
      // Arrange
      localStorage.setItem('constela:name', '"cached-name"');
      const stateDefinitions = {
        name: { type: 'string', initial: 'default' },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('name')).toBe('default');
    });

    it('should only read localStorage for theme while ignoring other state fields', () => {
      // Arrange
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      localStorage.setItem('constela:count', '999');
      const stateDefinitions = {
        theme: { type: 'string', initial: 'dark' },
        count: { type: 'number', initial: 0 },
      };

      // Act
      const store = createStateStore(stateDefinitions);

      // Assert
      expect(store.get('theme')).toBe('light');
      expect(store.get('count')).toBe(0);
    });
  });
});
