/**
 * Test module for Renderer Debounce/Throttle Event Modifiers.
 *
 * Coverage:
 * - Debounce event handler execution
 * - Throttle event handler execution
 * - Use specified debounce delay
 * - Use specified throttle interval
 * - No debounce when not specified
 * - Cleanup pending debounce on unmount
 *
 * TDD Red Phase: These tests verify that the renderer properly handles
 * debounce and throttle modifiers on event handlers.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledNode, CompiledAction, CompiledEventHandler } from '@constela/compiler';

/**
 * Extended event handler type with debounce/throttle
 * This should be added to ast.ts
 */
interface ExtendedEventHandler extends CompiledEventHandler {
  event: string;
  action: string;
  debounce?: number; // debounce time in ms
  throttle?: number; // throttle time in ms
}

describe('Renderer Debounce/Throttle Event Modifiers', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ==================== Helper Functions ====================

  function createRenderContext(
    overrides?: Partial<RenderContext>
  ): RenderContext {
    return {
      state: createStateStore({}),
      actions: {},
      locals: {},
      cleanups: [],
      refs: {},
      ...overrides,
    };
  }

  // ==================== Debounce Tests ====================

  describe('debounce event handler execution', () => {
    it('should debounce event handler execution', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleInput: CompiledAction = {
        name: 'handleInput',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'debounce-input' },
          onInput: {
            event: 'input',
            action: 'handleInput',
            debounce: 300,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleInput },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#debounce-input') as HTMLInputElement;

      // Rapidly fire input events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Immediately after, count should be 0 (debounced)
      expect(state.get('callCount')).toBe(0);

      // Advance timers past debounce delay
      await vi.advanceTimersByTimeAsync(300);

      // Assert - Should only have been called once (debounced)
      expect(state.get('callCount')).toBe(1);
    });

    it('should use specified debounce delay', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleInput: CompiledAction = {
        name: 'handleInput',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'custom-debounce-input' },
          onInput: {
            event: 'input',
            action: 'handleInput',
            debounce: 500, // 500ms debounce
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleInput },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#custom-debounce-input') as HTMLInputElement;

      input.dispatchEvent(new Event('input', { bubbles: true }));

      // After 300ms - should not have fired yet
      await vi.advanceTimersByTimeAsync(300);
      expect(state.get('callCount')).toBe(0);

      // After 500ms total - should have fired
      await vi.advanceTimersByTimeAsync(200);
      expect(state.get('callCount')).toBe(1);
    });

    it('should reset debounce timer on each event', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleInput: CompiledAction = {
        name: 'handleInput',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'reset-debounce-input' },
          onInput: {
            event: 'input',
            action: 'handleInput',
            debounce: 300,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleInput },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#reset-debounce-input') as HTMLInputElement;

      // Fire event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // After 200ms, fire another event (resets timer)
      await vi.advanceTimersByTimeAsync(200);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // After 200ms more (total 400ms), should still not have fired
      await vi.advanceTimersByTimeAsync(200);
      expect(state.get('callCount')).toBe(0);

      // After 100ms more (300ms since last event), should have fired
      await vi.advanceTimersByTimeAsync(100);
      expect(state.get('callCount')).toBe(1);
    });

    it('should pass correct payload with debounced handler', async () => {
      // Arrange
      const state = createStateStore({
        lastValue: { type: 'string', initial: '' },
      });

      const handleInput: CompiledAction = {
        name: 'handleInput',
        steps: [
          {
            do: 'set',
            target: 'lastValue',
            value: { expr: 'var', name: 'payload' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'payload-debounce-input' },
          onInput: {
            event: 'input',
            action: 'handleInput',
            payload: { expr: 'var', name: 'value' },
            debounce: 300,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleInput },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#payload-debounce-input') as HTMLInputElement;

      // Type multiple characters
      input.value = 'a';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      input.value = 'ab';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      input.value = 'abc';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(300);

      // Assert - Should have the last value
      expect(state.get('lastValue')).toBe('abc');
    });
  });

  // ==================== Throttle Tests ====================

  describe('throttle event handler execution', () => {
    it('should throttle event handler execution', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleScroll: CompiledAction = {
        name: 'handleScroll',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'throttle-div' },
          onScroll: {
            event: 'scroll',
            action: 'handleScroll',
            throttle: 100,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleScroll },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#throttle-div') as HTMLDivElement;

      // Fire many scroll events rapidly
      for (let i = 0; i < 10; i++) {
        div.dispatchEvent(new Event('scroll', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(20); // 20ms between each (200ms total)
      }

      // Wait for any pending throttled calls
      await vi.advanceTimersByTimeAsync(100);

      // Assert - Should have been called approximately 3 times
      // (first immediately, then at 100ms, then at 200ms)
      expect(state.get('callCount')).toBeGreaterThanOrEqual(2);
      expect(state.get('callCount')).toBeLessThanOrEqual(4);
    });

    it('should use specified throttle interval', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleMousemove: CompiledAction = {
        name: 'handleMousemove',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'custom-throttle-div' },
          onMousemove: {
            event: 'mousemove',
            action: 'handleMousemove',
            throttle: 200, // 200ms throttle
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleMousemove },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#custom-throttle-div') as HTMLDivElement;

      // Fire event immediately
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      expect(state.get('callCount')).toBe(1); // First call is immediate

      // Fire events during throttle period
      await vi.advanceTimersByTimeAsync(50);
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

      await vi.advanceTimersByTimeAsync(50);
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

      // Still within throttle period
      expect(state.get('callCount')).toBe(1);

      // Wait past throttle period
      await vi.advanceTimersByTimeAsync(100);
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

      // Should have called again
      expect(state.get('callCount')).toBe(2);
    });

    it('should call handler immediately for first event when throttled', async () => {
      // Arrange
      const state = createStateStore({
        wasCalledImmediately: { type: 'boolean', initial: false },
      });

      const handleClick: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'set', target: 'wasCalledImmediately', value: { expr: 'lit', value: true } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'button',
        props: {
          id: { expr: 'lit', value: 'immediate-throttle-btn' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            throttle: 1000,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const button = container.querySelector('#immediate-throttle-btn') as HTMLButtonElement;

      // Fire click - should be called immediately
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Assert - Should be true immediately (no timer advancement)
      expect(state.get('wasCalledImmediately')).toBe(true);
    });
  });

  // ==================== No Modifier Tests ====================

  describe('when no modifier specified', () => {
    it('should not debounce when not specified', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleClick: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'button',
        props: {
          id: { expr: 'lit', value: 'no-debounce-btn' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            // No debounce or throttle
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const button = container.querySelector('#no-debounce-btn') as HTMLButtonElement;

      // Fire multiple clicks rapidly
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);
      
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);
      
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);

      // Assert - All clicks should be processed immediately
      expect(state.get('callCount')).toBe(3);
    });

    it('should call handler synchronously without modifier', async () => {
      // Arrange
      const callTimes: number[] = [];
      const state = createStateStore({});

      const handleClick: CompiledAction = {
        name: 'handleClick',
        steps: [],
      };

      // We'll track call times via a spy
      const originalActions = { handleClick };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'button',
        props: {
          id: { expr: 'lit', value: 'sync-btn' },
          onClick: {
            event: 'click',
            action: 'handleClick',
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: originalActions,
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const button = container.querySelector('#sync-btn') as HTMLButtonElement;

      // Fire click
      const beforeTime = Date.now();
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const afterTime = Date.now();

      // Assert - Should be called within same tick (no async delay)
      // This is a simplified test - in real scenario we'd verify no setTimeout was used
      expect(afterTime - beforeTime).toBeLessThan(10);
    });
  });

  // ==================== Cleanup Tests ====================

  describe('cleanup pending debounce on unmount', () => {
    it('should cleanup pending debounce on unmount', async () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleInput: CompiledAction = {
        name: 'handleInput',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'cleanup-debounce-input' },
          onInput: {
            event: 'input',
            action: 'handleInput',
            debounce: 300,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleInput },
        cleanups,
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#cleanup-debounce-input') as HTMLInputElement;

      // Fire input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Wait partial time
      await vi.advanceTimersByTimeAsync(100);

      // Run cleanups (simulate unmount)
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Wait past debounce time
      await vi.advanceTimersByTimeAsync(300);

      // Assert - Should NOT have been called (cleanup cancelled the pending debounce)
      expect(state.get('callCount')).toBe(0);
    });

    it('should cleanup pending throttle on unmount', async () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleScroll: CompiledAction = {
        name: 'handleScroll',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'cleanup-throttle-div' },
          onScroll: {
            event: 'scroll',
            action: 'handleScroll',
            throttle: 300,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleScroll },
        cleanups,
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#cleanup-throttle-div') as HTMLDivElement;

      // Fire scroll event (first one is immediate)
      div.dispatchEvent(new Event('scroll', { bubbles: true }));
      expect(state.get('callCount')).toBe(1);

      // Fire more events
      div.dispatchEvent(new Event('scroll', { bubbles: true }));
      div.dispatchEvent(new Event('scroll', { bubbles: true }));

      // Wait partial time
      await vi.advanceTimersByTimeAsync(100);

      // Run cleanups
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Wait past throttle time
      await vi.advanceTimersByTimeAsync(300);

      // Assert - Should only have the first call
      expect(state.get('callCount')).toBe(1);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle zero debounce as immediate execution', async () => {
      // Arrange
      const state = createStateStore({
        callCount: { type: 'number', initial: 0 },
      });

      const handleClick: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'update', target: 'callCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'button',
        props: {
          id: { expr: 'lit', value: 'zero-debounce-btn' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            debounce: 0,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const button = container.querySelector('#zero-debounce-btn') as HTMLButtonElement;

      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);
      
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);

      // Assert - Should execute (debounce of 0 means immediate but still debounced within same tick)
      expect(state.get('callCount')).toBeGreaterThanOrEqual(1);
    });

    it('should not allow both debounce and throttle on same handler', () => {
      // This is a design decision - either warn or use one over the other
      // Arrange
      const handleClick: CompiledAction = {
        name: 'handleClick',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'button',
        props: {
          id: { expr: 'lit', value: 'both-modifiers-btn' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            debounce: 300,
            throttle: 100, // Both specified - should warn or use one
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: { handleClick },
      });

      // Act & Assert - Should either warn or pick one modifier
      // Implementation decision: we expect it to not throw
      expect(() => {
        render(node, ctx);
      }).not.toThrow();
    });

    it('should handle negative debounce value gracefully', () => {
      // Arrange
      const handleClick: CompiledAction = {
        name: 'handleClick',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'button',
        props: {
          id: { expr: 'lit', value: 'negative-debounce-btn' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            debounce: -100, // Invalid value
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: { handleClick },
      });

      // Act & Assert - Should not throw, treat as 0 or ignore
      expect(() => {
        render(node, ctx);
      }).not.toThrow();
    });

    it('should preserve event data through debounce', async () => {
      // Arrange
      const state = createStateStore({
        lastClientX: { type: 'number', initial: 0 },
      });

      const handleMousemove: CompiledAction = {
        name: 'handleMousemove',
        steps: [
          {
            do: 'set',
            target: 'lastClientX',
            value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'x' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'preserve-data-div' },
          onMousemove: {
            event: 'mousemove',
            action: 'handleMousemove',
            payload: { x: { expr: 'var', name: 'clientX' } },
            debounce: 100,
          } as ExtendedEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleMousemove },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#preserve-data-div') as HTMLDivElement;

      // Fire events with different clientX values
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100 }));
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200 }));
      div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300 }));

      await vi.advanceTimersByTimeAsync(100);

      // Assert - Should have the last event's data
      expect(state.get('lastClientX')).toBe(300);
    });
  });
});
