/**
 * Test module for Timer Action Steps Executor.
 *
 * Coverage:
 * - delay step execution (setTimeout equivalent)
 * - interval step execution (setInterval equivalent)
 * - clearTimer step execution (clearTimeout/clearInterval equivalent)
 * - Integration with other action steps
 * - Cleanup on unmount (via ctx.cleanups)
 *
 * TDD Red Phase: These tests verify the runtime execution of timer action steps
 * that will be added to support timing-based operations in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';

describe('executeAction with Timer Steps', () => {
  // ==================== Setup ====================

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }>,
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {},
    options: { cleanups?: (() => void)[] } = {}
  ): ActionContext {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
      ...(options.cleanups && { cleanups: options.cleanups }),
    };
  }

  // ==================== Delay Step ====================

  describe('delay step', () => {
    it('should execute then steps after specified delay', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'delayedAction',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 1000 },
            then: [
              { do: 'set', target: 'message', value: { expr: 'lit', value: 'Delayed!' } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        message: { type: 'string', initial: '' },
      });

      // Act
      const promise = executeAction(action, context);

      // Assert - before delay
      expect(context.state.get('message')).toBe('');

      // Advance time by 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      // Assert - after delay
      expect(context.state.get('message')).toBe('Delayed!');
    });

    it('should evaluate ms expression dynamically from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'dynamicDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'state', name: 'delayMs' },
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        delayMs: { type: 'number', initial: 500 },
        executed: { type: 'boolean', initial: false },
      });

      // Act
      const promise = executeAction(action, context);

      // Assert - not executed before 500ms
      await vi.advanceTimersByTimeAsync(400);
      expect(context.state.get('executed')).toBe(false);

      // Advance to 500ms
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // Assert - executed after 500ms
      expect(context.state.get('executed')).toBe(true);
    });

    it('should provide access to outer context in then steps', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'contextAccess',
        steps: [
          { do: 'set', target: 'counter', value: { expr: 'lit', value: 10 } },
          {
            do: 'delay',
            ms: { expr: 'lit', value: 100 },
            then: [
              {
                do: 'set',
                target: 'result',
                value: {
                  expr: 'bin',
                  op: '+',
                  left: { expr: 'state', name: 'counter' },
                  right: { expr: 'lit', value: 5 },
                },
              },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        counter: { type: 'number', initial: 0 },
        result: { type: 'number', initial: 0 },
      });

      // Act
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // Assert
      expect(context.state.get('result')).toBe(15);
    });

    it('should handle nested delay steps', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'nestedDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 100 },
            then: [
              { do: 'set', target: 'step', value: { expr: 'lit', value: 1 } },
              {
                do: 'delay',
                ms: { expr: 'lit', value: 200 },
                then: [
                  { do: 'set', target: 'step', value: { expr: 'lit', value: 2 } },
                ],
              } as CompiledActionStep,
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        step: { type: 'number', initial: 0 },
      });

      // Act
      const promise = executeAction(action, context);

      // Assert - initial state
      expect(context.state.get('step')).toBe(0);

      // After first delay
      await vi.advanceTimersByTimeAsync(100);
      expect(context.state.get('step')).toBe(1);

      // After nested delay
      await vi.advanceTimersByTimeAsync(200);
      await promise;
      expect(context.state.get('step')).toBe(2);
    });

    it('should execute multiple then steps in sequence', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'multipleSteps',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 100 },
            then: [
              { do: 'set', target: 'step1', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'step2', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'step3', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        step1: { type: 'boolean', initial: false },
        step2: { type: 'boolean', initial: false },
        step3: { type: 'boolean', initial: false },
      });

      // Act
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // Assert
      expect(context.state.get('step1')).toBe(true);
      expect(context.state.get('step2')).toBe(true);
      expect(context.state.get('step3')).toBe(true);
    });

    it('should register cleanup for delay timer', async () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const action: CompiledAction = {
        name: 'cleanupDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 5000 },
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { executed: { type: 'boolean', initial: false } },
        {},
        {},
        { cleanups }
      );

      // Act
      executeAction(action, context);

      // Assert - cleanup should be registered
      expect(cleanups.length).toBeGreaterThan(0);

      // Execute cleanup (simulates component unmount)
      cleanups.forEach((cleanup) => cleanup());

      // Advance time - should NOT execute after cleanup
      await vi.advanceTimersByTimeAsync(5000);
      expect(context.state.get('executed')).toBe(false);
    });
  });

  // ==================== Interval Step ====================

  describe('interval step', () => {
    it('should execute action repeatedly at specified interval', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment', value: { expr: 'lit', value: 1 } },
        ],
      };
      const action: CompiledAction = {
        name: 'startInterval',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction }
      );

      // Act
      executeAction(action, context);

      // Assert - initial
      expect(context.state.get('count')).toBe(0);

      // After 1st interval
      await vi.advanceTimersByTimeAsync(100);
      expect(context.state.get('count')).toBe(1);

      // After 2nd interval
      await vi.advanceTimersByTimeAsync(100);
      expect(context.state.get('count')).toBe(2);

      // After 3rd interval
      await vi.advanceTimersByTimeAsync(100);
      expect(context.state.get('count')).toBe(3);
    });

    it('should store timer ID in result variable if specified', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'startInterval',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
            result: 'timerId',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.locals['timerId']).toBeDefined();
      expect(typeof context.locals['timerId']).toBe('number');
    });

    it('should evaluate ms expression dynamically', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'dynamicInterval',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'state', name: 'intervalMs' },
            action: 'increment',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        {
          intervalMs: { type: 'number', initial: 250 },
          count: { type: 'number', initial: 0 },
        },
        { increment: incrementAction }
      );

      // Act
      executeAction(action, context);

      // Assert - should fire at 250ms intervals
      await vi.advanceTimersByTimeAsync(200);
      expect(context.state.get('count')).toBe(0);

      await vi.advanceTimersByTimeAsync(50);
      expect(context.state.get('count')).toBe(1);

      await vi.advanceTimersByTimeAsync(250);
      expect(context.state.get('count')).toBe(2);
    });

    it('should continue executing until cleared', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'startInterval',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 50 },
            action: 'increment',
            result: 'timerId',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction }
      );

      // Act
      await executeAction(action, context);

      // Let it run for 10 intervals
      await vi.advanceTimersByTimeAsync(500);
      expect(context.state.get('count')).toBe(10);

      // Clear the interval
      const timerId = context.locals['timerId'] as number;
      clearInterval(timerId);

      // Advance more time - should NOT increment
      await vi.advanceTimersByTimeAsync(200);
      expect(context.state.get('count')).toBe(10);
    });

    it('should register cleanup for interval timer', async () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'cleanupInterval',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction },
        {},
        { cleanups }
      );

      // Act
      executeAction(action, context);

      // Let it run once
      await vi.advanceTimersByTimeAsync(100);
      expect(context.state.get('count')).toBe(1);

      // Cleanup should be registered
      expect(cleanups.length).toBeGreaterThan(0);

      // Execute cleanup
      cleanups.forEach((cleanup) => cleanup());

      // Advance time - should NOT increment after cleanup
      await vi.advanceTimersByTimeAsync(500);
      expect(context.state.get('count')).toBe(1);
    });
  });

  // ==================== ClearTimer Step ====================

  describe('clearTimer step', () => {
    it('should clear a delay timer', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'clearDelayAction',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 1000 },
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
            result: 'delayId',
          } as CompiledActionStep,
          {
            do: 'clearTimer',
            target: { expr: 'var', name: 'delayId' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        executed: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Advance time past the delay
      await vi.advanceTimersByTimeAsync(2000);

      // Assert - should NOT have executed because timer was cleared
      expect(context.state.get('executed')).toBe(false);
    });

    it('should clear an interval timer', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const startAction: CompiledAction = {
        name: 'start',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
            result: 'intervalId',
          } as CompiledActionStep,
        ],
      };
      const stopAction: CompiledAction = {
        name: 'stop',
        steps: [
          {
            do: 'clearTimer',
            target: { expr: 'var', name: 'intervalId' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction, start: startAction, stop: stopAction }
      );

      // Start the interval
      await executeAction(startAction, context);

      // Let it run a few times
      await vi.advanceTimersByTimeAsync(300);
      expect(context.state.get('count')).toBe(3);

      // Clear the interval
      await executeAction(stopAction, context);

      // Advance time - should NOT increment
      await vi.advanceTimersByTimeAsync(500);
      expect(context.state.get('count')).toBe(3);
    });

    it('should handle clearing non-existent timer gracefully', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'clearNonExistent',
        steps: [
          {
            do: 'clearTimer',
            target: { expr: 'lit', value: 99999 }, // Non-existent timer ID
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should evaluate target expression dynamically', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'dynamicClear',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
            result: 'timer1',
          } as CompiledActionStep,
          { do: 'set', target: 'currentTimer', value: { expr: 'var', name: 'timer1' } },
          {
            do: 'clearTimer',
            target: { expr: 'state', name: 'currentTimer' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        {
          count: { type: 'number', initial: 0 },
          currentTimer: { type: 'number', initial: 0 },
        },
        { increment: incrementAction }
      );

      // Act
      await executeAction(action, context);

      // Advance time - should NOT increment because timer was cleared
      await vi.advanceTimersByTimeAsync(500);
      expect(context.state.get('count')).toBe(0);
    });

    it('should handle clearing undefined timer gracefully', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'clearUndefined',
        steps: [
          {
            do: 'clearTimer',
            target: { expr: 'var', name: 'nonExistentVar' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });
  });

  // ==================== Integration Tests ====================

  describe('integration with other action steps', () => {
    it('should work with set and fetch steps', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'loaded' }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'delayedFetch',
        steps: [
          { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
          {
            do: 'delay',
            ms: { expr: 'lit', value: 500 },
            then: [
              {
                do: 'fetch',
                url: { expr: 'lit', value: 'https://api.example.com/data' },
                result: 'response',
                onSuccess: [
                  { do: 'set', target: 'data', value: { expr: 'var', name: 'response.data' } },
                  { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
                ],
              },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        loading: { type: 'boolean', initial: false },
        data: { type: 'string', initial: '' },
      });

      // Act
      const promise = executeAction(action, context);

      // Assert - loading starts true
      expect(context.state.get('loading')).toBe(true);

      // Advance time
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      // Assert - fetch completed
      expect(mockFetch).toHaveBeenCalled();
      expect(context.state.get('data')).toBe('loaded');
      expect(context.state.get('loading')).toBe(false);
    });

    it('should work with if step inside delay then', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'conditionalDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 100 },
            then: [
              {
                do: 'if',
                condition: { expr: 'state', name: 'shouldExecute' },
                then: [
                  { do: 'set', target: 'result', value: { expr: 'lit', value: 'executed' } },
                ],
                else: [
                  { do: 'set', target: 'result', value: { expr: 'lit', value: 'skipped' } },
                ],
              } as CompiledActionStep,
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        shouldExecute: { type: 'boolean', initial: true },
        result: { type: 'string', initial: '' },
      });

      // Act
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // Assert
      expect(context.state.get('result')).toBe('executed');
    });

    it('should handle interval with storage step in action', async () => {
      // Arrange
      const mockLocalStorage = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: vi.fn((key: string) => mockLocalStorage.get(key) ?? null),
          setItem: vi.fn((key: string, value: string) => mockLocalStorage.set(key, value)),
          removeItem: vi.fn((key: string) => mockLocalStorage.delete(key)),
          clear: vi.fn(() => mockLocalStorage.clear()),
          length: 0,
          key: vi.fn(() => null),
        },
        writable: true,
      });

      const saveAction: CompiledAction = {
        name: 'save',
        steps: [
          { do: 'update', target: 'saveCount', operation: 'increment' },
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'lastSave' },
            value: { expr: 'state', name: 'saveCount' },
            storage: 'local',
          } as CompiledActionStep,
        ],
      };
      const action: CompiledAction = {
        name: 'autoSave',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 1000 },
            action: 'save',
            result: 'autoSaveTimer',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { saveCount: { type: 'number', initial: 0 } },
        { save: saveAction }
      );

      // Act
      executeAction(action, context);

      // Let it auto-save 3 times
      await vi.advanceTimersByTimeAsync(3000);

      // Assert
      expect(context.state.get('saveCount')).toBe(3);
      expect(globalThis.localStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple timers simultaneously', async () => {
      // Arrange
      const fastIncrement: CompiledAction = {
        name: 'fastIncrement',
        steps: [
          { do: 'update', target: 'fast', operation: 'increment' },
        ],
      };
      const slowIncrement: CompiledAction = {
        name: 'slowIncrement',
        steps: [
          { do: 'update', target: 'slow', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'multipleTimers',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'fastIncrement',
            result: 'fastTimer',
          } as CompiledActionStep,
          {
            do: 'interval',
            ms: { expr: 'lit', value: 300 },
            action: 'slowIncrement',
            result: 'slowTimer',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        {
          fast: { type: 'number', initial: 0 },
          slow: { type: 'number', initial: 0 },
        },
        { fastIncrement, slowIncrement }
      );

      // Act
      await executeAction(action, context);

      // Advance time by 600ms
      await vi.advanceTimersByTimeAsync(600);

      // Assert
      // Fast: 100, 200, 300, 400, 500, 600 = 6 times
      expect(context.state.get('fast')).toBe(6);
      // Slow: 300, 600 = 2 times
      expect(context.state.get('slow')).toBe(2);
    });

    it('should handle delay inside interval action', async () => {
      // Arrange
      const delayedAction: CompiledAction = {
        name: 'delayedIncrement',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 50 },
            then: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          } as CompiledActionStep,
        ],
      };
      const action: CompiledAction = {
        name: 'intervalWithDelay',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'delayedIncrement',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { delayedIncrement: delayedAction }
      );

      // Act
      executeAction(action, context);

      // After 100ms: interval fires, 50ms delay starts
      await vi.advanceTimersByTimeAsync(100);
      expect(context.state.get('count')).toBe(0);

      // After 150ms: first delay completes
      await vi.advanceTimersByTimeAsync(50);
      expect(context.state.get('count')).toBe(1);

      // After 200ms: second interval fires, another 50ms delay starts
      await vi.advanceTimersByTimeAsync(50);
      expect(context.state.get('count')).toBe(1);

      // After 250ms: second delay completes
      await vi.advanceTimersByTimeAsync(50);
      expect(context.state.get('count')).toBe(2);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle zero delay', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'zeroDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 0 },
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        executed: { type: 'boolean', initial: false },
      });

      // Act
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(0);
      await promise;

      // Assert
      expect(context.state.get('executed')).toBe(true);
    });

    it('should handle empty then steps in delay', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'emptyThen',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 100 },
            then: [],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(100);
      await expect(promise).resolves.not.toThrow();
    });

    it('should handle non-existent action in interval', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'nonExistentAction',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'doesNotExist',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({}, {});

      // Act & Assert - should not throw, but also should not execute anything
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(500);
      await expect(promise).resolves.not.toThrow();
    });

    it('should handle negative delay gracefully', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'negativeDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: -100 },
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        executed: { type: 'boolean', initial: false },
      });

      // Act - negative delay should be treated as 0 (browser behavior)
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(0);
      await promise;

      // Assert
      expect(context.state.get('executed')).toBe(true);
    });

    it('should handle NaN ms value gracefully', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'nanDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: NaN },
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        executed: { type: 'boolean', initial: false },
      });

      // Act & Assert - should handle gracefully (NaN -> 0 in browser)
      const promise = executeAction(action, context);
      await vi.advanceTimersByTimeAsync(0);
      await expect(promise).resolves.not.toThrow();
    });

    it('should handle very large delay values', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'largeDelay',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 2147483647 }, // Max 32-bit signed int
            then: [
              { do: 'set', target: 'executed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        executed: { type: 'boolean', initial: false },
      });

      // Act
      executeAction(action, context);

      // Assert - should not execute immediately
      await vi.advanceTimersByTimeAsync(1000);
      expect(context.state.get('executed')).toBe(false);
    });
  });

  // ==================== Cleanup Tests ====================

  describe('cleanup behavior', () => {
    it('should properly cleanup all timers on component unmount', async () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'setupTimers',
        steps: [
          {
            do: 'delay',
            ms: { expr: 'lit', value: 1000 },
            then: [
              { do: 'set', target: 'delayed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
          } as CompiledActionStep,
        ],
      };
      const context = createContext(
        {
          delayed: { type: 'boolean', initial: false },
          count: { type: 'number', initial: 0 },
        },
        { increment: incrementAction },
        {},
        { cleanups }
      );

      // Act
      executeAction(action, context);

      // Let interval run a few times
      await vi.advanceTimersByTimeAsync(300);
      expect(context.state.get('count')).toBe(3);

      // Cleanup (simulates unmount)
      cleanups.forEach((cleanup) => cleanup());

      // Advance past all timers
      await vi.advanceTimersByTimeAsync(2000);

      // Assert - no more changes after cleanup
      expect(context.state.get('delayed')).toBe(false);
      expect(context.state.get('count')).toBe(3);
    });

    it('should not add to cleanups if cleanups array is not provided', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };
      const action: CompiledAction = {
        name: 'noCleanup',
        steps: [
          {
            do: 'interval',
            ms: { expr: 'lit', value: 100 },
            action: 'increment',
          } as CompiledActionStep,
        ],
      };
      // Context without cleanups array
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction }
      );

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();

      // Timer should still work
      await vi.advanceTimersByTimeAsync(300);
      expect(context.state.get('count')).toBe(3);
    });
  });
});
