/**
 * Test module for AppInstance.subscribe() method.
 *
 * Coverage:
 * - hydrateApp should return subscribe method
 * - hydrateApp subscribe should call callback when state changes
 * - hydrateApp subscribe should return unsubscribe function
 * - hydrateApp subscribe should not call callback after unsubscribe
 * - createApp should return subscribe method
 * - createApp subscribe should call callback when state changes
 *
 * TDD Red Phase: These tests verify that subscribe() is exposed on AppInstance
 * returned by hydrateApp() and createApp(), delegating to StateStore.subscribe().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hydrateApp } from '../hydrate.js';
import { createApp } from '../app.js';
import type { CompiledProgram } from '@constela/compiler';

describe('AppInstance.subscribe()', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper Functions ====================

  function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  /**
   * Sets up container with SSR-rendered HTML to match the program structure
   */
  function setupSSRContent(html: string): void {
    container.innerHTML = html;
  }

  // ==================== hydrateApp.subscribe ====================

  describe('hydrateApp', () => {
    it('should return subscribe method', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });
      setupSSRContent('<div></div>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(app.subscribe).toBeDefined();
      expect(typeof app.subscribe).toBe('function');

      app.destroy();
    });

    it('should call callback when state changes', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });
      setupSSRContent('<div></div>');
      const app = hydrateApp({ program, container });

      const callback = vi.fn();

      // Act
      app.subscribe('count', callback);
      app.setState('count', 5);
      await Promise.resolve();

      // Assert
      expect(callback).toHaveBeenCalledWith(5);

      app.destroy();
    });

    it('should return unsubscribe function', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          message: { type: 'string', initial: 'hello' },
        },
      });
      setupSSRContent('<div></div>');
      const app = hydrateApp({ program, container });

      const callback = vi.fn();

      // Act
      const unsubscribe = app.subscribe('message', callback);

      // Assert
      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');

      app.destroy();
    });

    it('should not call callback after unsubscribe', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });
      setupSSRContent('<div></div>');
      const app = hydrateApp({ program, container });

      const callback = vi.fn();

      // Act
      const unsubscribe = app.subscribe('count', callback);
      app.setState('count', 1);
      await Promise.resolve();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);

      // Unsubscribe
      unsubscribe();

      // Change state again
      app.setState('count', 2);
      await Promise.resolve();

      // Assert - callback should NOT have been called again
      expect(callback).toHaveBeenCalledTimes(1);

      app.destroy();
    });

    it('should support multiple subscribers for the same state', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          value: { type: 'string', initial: '' },
        },
      });
      setupSSRContent('<div></div>');
      const app = hydrateApp({ program, container });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Act
      app.subscribe('value', callback1);
      app.subscribe('value', callback2);
      app.setState('value', 'updated');
      await Promise.resolve();

      // Assert
      expect(callback1).toHaveBeenCalledWith('updated');
      expect(callback2).toHaveBeenCalledWith('updated');

      app.destroy();
    });

    it('should throw error when subscribing to non-existent state', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          exists: { type: 'boolean', initial: true },
        },
      });
      setupSSRContent('<div></div>');
      const app = hydrateApp({ program, container });

      // Act & Assert
      expect(() => {
        app.subscribe('nonExistent', vi.fn());
      }).toThrow('State field "nonExistent" does not exist');

      app.destroy();
    });
  });

  // ==================== createApp.subscribe ====================

  describe('createApp', () => {
    it('should return subscribe method', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(app.subscribe).toBeDefined();
      expect(typeof app.subscribe).toBe('function');

      app.destroy();
    });

    it('should call callback when state changes', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          counter: { type: 'number', initial: 10 },
        },
      });
      const app = createApp(program, container);

      const callback = vi.fn();

      // Act
      app.subscribe('counter', callback);
      app.setState('counter', 20);
      await Promise.resolve();

      // Assert
      expect(callback).toHaveBeenCalledWith(20);

      app.destroy();
    });

    it('should return unsubscribe function', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          flag: { type: 'boolean', initial: false },
        },
      });
      const app = createApp(program, container);

      const callback = vi.fn();

      // Act
      const unsubscribe = app.subscribe('flag', callback);

      // Assert
      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');

      app.destroy();
    });

    it('should not call callback after unsubscribe', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: [] },
        },
      });
      const app = createApp(program, container);

      const callback = vi.fn();

      // Act
      const unsubscribe = app.subscribe('items', callback);
      app.setState('items', ['a']);
      await Promise.resolve();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(['a']);

      // Unsubscribe
      unsubscribe();

      // Change state again
      app.setState('items', ['a', 'b']);
      await Promise.resolve();

      // Assert - callback should NOT have been called again
      expect(callback).toHaveBeenCalledTimes(1);

      app.destroy();
    });

    it('should support multiple subscribers for the same state', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          data: { type: 'object', initial: {} },
        },
      });
      const app = createApp(program, container);

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      // Act
      app.subscribe('data', callback1);
      app.subscribe('data', callback2);
      app.subscribe('data', callback3);
      app.setState('data', { key: 'value' });
      await Promise.resolve();

      // Assert
      expect(callback1).toHaveBeenCalledWith({ key: 'value' });
      expect(callback2).toHaveBeenCalledWith({ key: 'value' });
      expect(callback3).toHaveBeenCalledWith({ key: 'value' });

      app.destroy();
    });

    it('should throw error when subscribing to non-existent state', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          real: { type: 'string', initial: 'exists' },
        },
      });
      const app = createApp(program, container);

      // Act & Assert
      expect(() => {
        app.subscribe('fake', vi.fn());
      }).toThrow('State field "fake" does not exist');

      app.destroy();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle subscribe after destroy (hydrateApp)', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });
      setupSSRContent('<div></div>');
      const app = hydrateApp({ program, container });

      // Act
      app.destroy();

      // Assert - Should not throw, but behavior after destroy is undefined
      // The subscription may or may not work depending on implementation
      // This test documents expected behavior
      const callback = vi.fn();
      // Implementation should either work or throw gracefully
      try {
        app.subscribe('count', callback);
      } catch (e) {
        // Acceptable to throw after destroy
        expect(e).toBeDefined();
      }
    });

    it('should handle subscribe after destroy (createApp)', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });
      const app = createApp(program, container);

      // Act
      app.destroy();

      // Assert
      const callback = vi.fn();
      try {
        app.subscribe('count', callback);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle unsubscribe called multiple times', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          value: { type: 'number', initial: 0 },
        },
      });
      const app = createApp(program, container);

      const callback = vi.fn();
      const unsubscribe = app.subscribe('value', callback);

      // Act - Call unsubscribe multiple times
      unsubscribe();
      unsubscribe();
      unsubscribe();

      // Change state
      app.setState('value', 100);
      await Promise.resolve();

      // Assert - Should not throw and callback should not be called
      expect(callback).not.toHaveBeenCalled();

      app.destroy();
    });

    it('should notify subscriber with correct value after multiple state changes', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
      });
      const app = createApp(program, container);

      const values: number[] = [];
      app.subscribe('count', (value) => {
        values.push(value as number);
      });

      // Act
      app.setState('count', 1);
      app.setState('count', 2);
      app.setState('count', 3);
      await Promise.resolve();

      // Assert
      expect(values).toEqual([1, 2, 3]);

      app.destroy();
    });
  });
});
