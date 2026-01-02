/**
 * Test module for Action Executor.
 *
 * Coverage:
 * - Set step updates state
 * - Update increment/decrement works
 * - Update push/pop/remove works for arrays
 * - Fetch step makes HTTP request (mock fetch)
 * - Fetch onSuccess/onError handlers work
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../../src/action/executor.js';
import type { ActionContext } from '../../src/action/executor.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';

describe('executeAction', () => {
  // ==================== Setup ====================

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }>,
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {}
  ): ActionContext {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
    };
  }

  // ==================== Set Step ====================

  describe('set step', () => {
    it('should update number state with literal value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setCount',
        steps: [
          {
            do: 'set',
            target: 'count',
            value: { expr: 'lit', value: 42 },
          },
        ],
      };
      const context = createContext({ count: { type: 'number', initial: 0 } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('count')).toBe(42);
    });

    it('should update string state with literal value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setMessage',
        steps: [
          {
            do: 'set',
            target: 'message',
            value: { expr: 'lit', value: 'Hello World' },
          },
        ],
      };
      const context = createContext({ message: { type: 'string', initial: '' } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('message')).toBe('Hello World');
    });

    it('should update state with computed value from another state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'copyValue',
        steps: [
          {
            do: 'set',
            target: 'target',
            value: { expr: 'state', name: 'source' },
          },
        ],
      };
      const context = createContext({
        source: { type: 'number', initial: 100 },
        target: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('target')).toBe(100);
    });

    it('should update state with computed expression', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'computeDouble',
        steps: [
          {
            do: 'set',
            target: 'result',
            value: {
              expr: 'bin',
              op: '*',
              left: { expr: 'state', name: 'value' },
              right: { expr: 'lit', value: 2 },
            },
          },
        ],
      };
      const context = createContext({
        value: { type: 'number', initial: 5 },
        result: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('result')).toBe(10);
    });

    it('should execute multiple set steps in order', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'multipleSteps',
        steps: [
          { do: 'set', target: 'a', value: { expr: 'lit', value: 1 } },
          { do: 'set', target: 'b', value: { expr: 'state', name: 'a' } },
          { do: 'set', target: 'c', value: { expr: 'state', name: 'b' } },
        ],
      };
      const context = createContext({
        a: { type: 'number', initial: 0 },
        b: { type: 'number', initial: 0 },
        c: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('a')).toBe(1);
      expect(context.state.get('b')).toBe(1);
      expect(context.state.get('c')).toBe(1);
    });
  });

  // ==================== Update Step - Increment/Decrement ====================

  describe('update step - increment/decrement', () => {
    it('should increment number by 1 (default)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'increment',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'increment',
          },
        ],
      };
      const context = createContext({ count: { type: 'number', initial: 5 } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('count')).toBe(6);
    });

    it('should increment number by specified value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'incrementBy',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'increment',
            value: { expr: 'lit', value: 10 },
          },
        ],
      };
      const context = createContext({ count: { type: 'number', initial: 5 } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('count')).toBe(15);
    });

    it('should decrement number by 1 (default)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'decrement',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'decrement',
          },
        ],
      };
      const context = createContext({ count: { type: 'number', initial: 5 } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('count')).toBe(4);
    });

    it('should decrement number by specified value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'decrementBy',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'decrement',
            value: { expr: 'lit', value: 3 },
          },
        ],
      };
      const context = createContext({ count: { type: 'number', initial: 10 } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('count')).toBe(7);
    });

    it('should handle negative increment values', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'incrementNegative',
        steps: [
          {
            do: 'update',
            target: 'count',
            operation: 'increment',
            value: { expr: 'lit', value: -5 },
          },
        ],
      };
      const context = createContext({ count: { type: 'number', initial: 10 } });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('count')).toBe(5);
    });
  });

  // ==================== Update Step - Array Operations ====================

  describe('update step - array operations', () => {
    it('should push item to array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'pushItem',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'push',
            value: { expr: 'lit', value: 'new item' },
          },
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'b', 'new item']);
    });

    it('should push number to array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'pushNumber',
        steps: [
          {
            do: 'update',
            target: 'numbers',
            operation: 'push',
            value: { expr: 'lit', value: 4 },
          },
        ],
      };
      const context = createContext({
        numbers: { type: 'list', initial: [1, 2, 3] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('numbers')).toEqual([1, 2, 3, 4]);
    });

    it('should pop item from array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'popItem',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'pop',
          },
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'b']);
    });

    it('should handle pop on empty array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'popEmpty',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'pop',
          },
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual([]);
    });

    it('should remove item from array by value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'removeItem',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'remove',
            value: { expr: 'lit', value: 'b' },
          },
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'c']);
    });

    it('should remove item from array by index (if value is number)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'removeByIndex',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'remove',
            value: { expr: 'lit', value: 1 },
          },
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      // Depending on implementation, this might remove by index or by value
      // The test documents expected behavior
      expect(context.state.get('items')).toEqual(['a', 'c']);
    });

    it('should handle remove for non-existent item', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'removeNonExistent',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'remove',
            value: { expr: 'lit', value: 'x' },
          },
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert - array should be unchanged
      expect(context.state.get('items')).toEqual(['a', 'b', 'c']);
    });
  });

  // ==================== Fetch Step ====================

  describe('fetch step', () => {
    it('should make GET request to URL', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchData',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/data' },
          },
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with body', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'postData',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/submit' },
            method: 'POST',
            body: { expr: 'lit', value: '{"name":"test"}' },
          },
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/submit',
        expect.objectContaining({
          method: 'POST',
          body: '{"name":"test"}',
        })
      );
    });

    it('should store result in specified variable', async () => {
      // Arrange
      const responseData = { id: 123, name: 'Test Item' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseData),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchWithResult',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/item' },
            result: 'fetchedData',
          },
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert - result should be available in context.locals
      expect(context.locals['fetchedData']).toEqual(responseData);
    });

    it('should execute onSuccess steps when request succeeds', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: 100 }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchWithSuccess',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/data' },
            result: 'response',
            onSuccess: [
              {
                do: 'set',
                target: 'loaded',
                value: { expr: 'lit', value: true },
              },
            ],
          },
        ],
      };
      const context = createContext({
        loaded: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('loaded')).toBe(true);
    });

    it('should execute onError steps when request fails', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchWithError',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/notfound' },
            onError: [
              {
                do: 'set',
                target: 'error',
                value: { expr: 'lit', value: 'Failed to load' },
              },
            ],
          },
        ],
      };
      const context = createContext({
        error: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('error')).toBe('Failed to load');
    });

    it('should execute onError steps when fetch throws', async () => {
      // Arrange
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchNetworkError',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/data' },
            onError: [
              {
                do: 'set',
                target: 'hasError',
                value: { expr: 'lit', value: true },
              },
            ],
          },
        ],
      };
      const context = createContext({
        hasError: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('hasError')).toBe(true);
    });

    it('should use dynamic URL from state', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchDynamicUrl',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'state', name: 'apiUrl' },
          },
        ],
      };
      const context = createContext({
        apiUrl: { type: 'string', initial: 'https://dynamic.example.com/api' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dynamic.example.com/api',
        expect.any(Object)
      );
    });

    it('should support PUT method', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'putData',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/item/1' },
            method: 'PUT',
            body: { expr: 'lit', value: '{"name":"updated"}' },
          },
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/item/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should support DELETE method', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'deleteData',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/item/1' },
            method: 'DELETE',
          },
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/item/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ==================== Mixed Steps ====================

  describe('mixed steps', () => {
    it('should execute set and update steps in order', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mixedSteps',
        steps: [
          { do: 'set', target: 'count', value: { expr: 'lit', value: 10 } },
          { do: 'update', target: 'count', operation: 'increment', value: { expr: 'lit', value: 5 } },
          { do: 'update', target: 'count', operation: 'decrement' },
        ],
      };
      const context = createContext({
        count: { type: 'number', initial: 0 },
      });

      // Act
      await executeAction(action, context);

      // Assert - 10 + 5 - 1 = 14
      expect(context.state.get('count')).toBe(14);
    });

    it('should execute fetch followed by set steps', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 42 }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchThenSet',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/count' },
            result: 'data',
            onSuccess: [
              { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
            ],
          },
          { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
        ],
      };
      const context = createContext({
        loading: { type: 'number', initial: 1 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('loading')).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty action (no steps)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'emptyAction',
        steps: [],
      };
      const context = createContext({ count: { type: 'number', initial: 5 } });

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
      expect(context.state.get('count')).toBe(5);
    });

    it('should handle setting state to null', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setNull',
        steps: [
          {
            do: 'set',
            target: 'value',
            value: { expr: 'lit', value: null },
          },
        ],
      };
      const context = createContext({
        value: { type: 'string', initial: 'something' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('value')).toBeNull();
    });
  });
});
