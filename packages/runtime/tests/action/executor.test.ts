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

  // ==================== Update Step - Toggle (Boolean) ====================

  describe('update step - toggle', () => {
    it('should toggle boolean from false to true', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'toggle',
        steps: [
          {
            do: 'update',
            target: 'isOpen',
            operation: 'toggle',
          },
        ],
      };
      const context = createContext({
        isOpen: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('isOpen')).toBe(true);
    });

    it('should toggle boolean from true to false', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'toggle',
        steps: [
          {
            do: 'update',
            target: 'isOpen',
            operation: 'toggle',
          },
        ],
      };
      const context = createContext({
        isOpen: { type: 'boolean', initial: true },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('isOpen')).toBe(false);
    });

    it('should toggle multiple times correctly', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'toggleMultiple',
        steps: [
          { do: 'update', target: 'isOpen', operation: 'toggle' },
          { do: 'update', target: 'isOpen', operation: 'toggle' },
          { do: 'update', target: 'isOpen', operation: 'toggle' },
        ],
      };
      const context = createContext({
        isOpen: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert - 3 toggles: false -> true -> false -> true
      expect(context.state.get('isOpen')).toBe(true);
    });

    it('should treat non-boolean falsy value as false and toggle to true', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'toggleNull',
        steps: [
          {
            do: 'update',
            target: 'value',
            operation: 'toggle',
          },
        ],
      };
      const context = createContext({
        value: { type: 'boolean', initial: null as unknown as boolean },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('value')).toBe(true);
    });
  });

  // ==================== Update Step - Merge (Object) ====================

  describe('update step - merge', () => {
    it('should merge object with new properties', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mergeForm',
        steps: [
          {
            do: 'update',
            target: 'form',
            operation: 'merge',
            value: { expr: 'lit', value: { lastName: 'Smith' } },
          },
        ],
      };
      const context = createContext({
        form: { type: 'object', initial: { firstName: 'John' } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('form')).toEqual({
        firstName: 'John',
        lastName: 'Smith',
      });
    });

    it('should overwrite existing properties during merge', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mergeOverwrite',
        steps: [
          {
            do: 'update',
            target: 'form',
            operation: 'merge',
            value: { expr: 'lit', value: { firstName: 'Jane', age: 30 } },
          },
        ],
      };
      const context = createContext({
        form: { type: 'object', initial: { firstName: 'John', email: 'john@example.com' } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('form')).toEqual({
        firstName: 'Jane',
        email: 'john@example.com',
        age: 30,
      });
    });

    it('should perform shallow merge only (nested objects replaced, not merged)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'shallowMerge',
        steps: [
          {
            do: 'update',
            target: 'data',
            operation: 'merge',
            value: { expr: 'lit', value: { nested: { b: 2 } } },
          },
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: { nested: { a: 1 }, other: 'value' } },
      });

      // Act
      await executeAction(action, context);

      // Assert - nested object is replaced, not merged
      expect(context.state.get('data')).toEqual({
        nested: { b: 2 },
        other: 'value',
      });
    });

    it('should not mutate the original object', async () => {
      // Arrange
      const originalForm = { firstName: 'John' };
      const action: CompiledAction = {
        name: 'mergeImmutable',
        steps: [
          {
            do: 'update',
            target: 'form',
            operation: 'merge',
            value: { expr: 'lit', value: { lastName: 'Smith' } },
          },
        ],
      };
      const context = createContext({
        form: { type: 'object', initial: originalForm },
      });

      // Act
      await executeAction(action, context);

      // Assert - original object should not be mutated
      expect(originalForm).toEqual({ firstName: 'John' });
      expect(context.state.get('form')).toEqual({
        firstName: 'John',
        lastName: 'Smith',
      });
      expect(context.state.get('form')).not.toBe(originalForm);
    });

    it('should handle merge with empty object', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mergeEmpty',
        steps: [
          {
            do: 'update',
            target: 'form',
            operation: 'merge',
            value: { expr: 'lit', value: {} },
          },
        ],
      };
      const context = createContext({
        form: { type: 'object', initial: { name: 'Test' } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('form')).toEqual({ name: 'Test' });
    });

    it('should handle merge on null target by creating new object', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mergeOnNull',
        steps: [
          {
            do: 'update',
            target: 'form',
            operation: 'merge',
            value: { expr: 'lit', value: { name: 'Test' } },
          },
        ],
      };
      const context = createContext({
        form: { type: 'object', initial: null },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('form')).toEqual({ name: 'Test' });
    });
  });

  // ==================== Update Step - ReplaceAt (Array) ====================

  describe('update step - replaceAt', () => {
    it('should replace item at specified index', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceAt',
        steps: [
          {
            do: 'update',
            target: 'todos',
            operation: 'replaceAt',
            index: { expr: 'lit', value: 1 },
            value: { expr: 'lit', value: { id: 2, text: 'Updated' } },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        todos: {
          type: 'list',
          initial: [
            { id: 1, text: 'First' },
            { id: 2, text: 'Second' },
            { id: 3, text: 'Third' },
          ],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('todos')).toEqual([
        { id: 1, text: 'First' },
        { id: 2, text: 'Updated' },
        { id: 3, text: 'Third' },
      ]);
    });

    it('should replace first item (index 0)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceFirst',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'replaceAt',
            index: { expr: 'lit', value: 0 },
            value: { expr: 'lit', value: 'new first' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['first', 'second', 'third'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['new first', 'second', 'third']);
    });

    it('should replace last item', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceLast',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'replaceAt',
            index: { expr: 'lit', value: 2 },
            value: { expr: 'lit', value: 'new third' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['first', 'second', 'third'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['first', 'second', 'new third']);
    });

    it('should not mutate original array', async () => {
      // Arrange
      const originalItems = ['a', 'b', 'c'];
      const action: CompiledAction = {
        name: 'replaceImmutable',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'replaceAt',
            index: { expr: 'lit', value: 1 },
            value: { expr: 'lit', value: 'x' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: originalItems },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(originalItems).toEqual(['a', 'b', 'c']);
      expect(context.state.get('items')).toEqual(['a', 'x', 'c']);
      expect(context.state.get('items')).not.toBe(originalItems);
    });

    it('should handle out-of-bounds index by doing nothing', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceOutOfBounds',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'replaceAt',
            index: { expr: 'lit', value: 10 },
            value: { expr: 'lit', value: 'x' },
          } as CompiledActionStep,
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

    it('should handle negative index by doing nothing', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceNegative',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'replaceAt',
            index: { expr: 'lit', value: -1 },
            value: { expr: 'lit', value: 'x' },
          } as CompiledActionStep,
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

    it('should handle dynamic index from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceDynamicIndex',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'replaceAt',
            index: { expr: 'state', name: 'selectedIndex' },
            value: { expr: 'lit', value: 'replaced' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
        selectedIndex: { type: 'number', initial: 1 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'replaced', 'c']);
    });
  });

  // ==================== Update Step - InsertAt (Array) ====================

  describe('update step - insertAt', () => {
    it('should insert item at specified index', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'insertAt',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'insertAt',
            index: { expr: 'lit', value: 1 },
            value: { expr: 'lit', value: 'inserted' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'inserted', 'b', 'c']);
    });

    it('should insert at beginning (index 0)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'insertFirst',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'insertAt',
            index: { expr: 'lit', value: 0 },
            value: { expr: 'lit', value: 'first' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['first', 'a', 'b']);
    });

    it('should insert at end when index equals array length', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'insertEnd',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'insertAt',
            index: { expr: 'lit', value: 3 },
            value: { expr: 'lit', value: 'last' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'b', 'c', 'last']);
    });

    it('should insert object into array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'insertObject',
        steps: [
          {
            do: 'update',
            target: 'todos',
            operation: 'insertAt',
            index: { expr: 'lit', value: 1 },
            value: { expr: 'lit', value: { id: 4, text: 'New Todo' } },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        todos: {
          type: 'list',
          initial: [
            { id: 1, text: 'First' },
            { id: 2, text: 'Second' },
          ],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('todos')).toEqual([
        { id: 1, text: 'First' },
        { id: 4, text: 'New Todo' },
        { id: 2, text: 'Second' },
      ]);
    });

    it('should not mutate original array', async () => {
      // Arrange
      const originalItems = ['a', 'b', 'c'];
      const action: CompiledAction = {
        name: 'insertImmutable',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'insertAt',
            index: { expr: 'lit', value: 1 },
            value: { expr: 'lit', value: 'x' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: originalItems },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(originalItems).toEqual(['a', 'b', 'c']);
      expect(context.state.get('items')).toEqual(['a', 'x', 'b', 'c']);
      expect(context.state.get('items')).not.toBe(originalItems);
    });

    it('should insert into empty array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'insertIntoEmpty',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'insertAt',
            index: { expr: 'lit', value: 0 },
            value: { expr: 'lit', value: 'first' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['first']);
    });

    it('should clamp out-of-bounds index to array length', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'insertOutOfBounds',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'insertAt',
            index: { expr: 'lit', value: 100 },
            value: { expr: 'lit', value: 'last' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b'] },
      });

      // Act
      await executeAction(action, context);

      // Assert - should insert at end
      expect(context.state.get('items')).toEqual(['a', 'b', 'last']);
    });
  });

  // ==================== Update Step - Splice (Array) ====================

  describe('update step - splice', () => {
    it('should delete items at specified index', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceDelete',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 1 },
            deleteCount: { expr: 'lit', value: 2 },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c', 'd', 'e'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'd', 'e']);
    });

    it('should delete and insert items', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceDeleteAndInsert',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 1 },
            deleteCount: { expr: 'lit', value: 2 },
            value: { expr: 'lit', value: ['x', 'y', 'z'] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c', 'd'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'x', 'y', 'z', 'd']);
    });

    it('should insert items without deleting (deleteCount 0)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceInsertOnly',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 1 },
            deleteCount: { expr: 'lit', value: 0 },
            value: { expr: 'lit', value: ['x', 'y'] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'x', 'y', 'b', 'c']);
    });

    it('should delete from start (index 0)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceFromStart',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 0 },
            deleteCount: { expr: 'lit', value: 2 },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c', 'd'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['c', 'd']);
    });

    it('should handle deleteCount greater than remaining items', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceDeleteExcess',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 2 },
            deleteCount: { expr: 'lit', value: 100 },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c', 'd', 'e'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'b']);
    });

    it('should not mutate original array', async () => {
      // Arrange
      const originalItems = ['a', 'b', 'c', 'd'];
      const action: CompiledAction = {
        name: 'spliceImmutable',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 1 },
            deleteCount: { expr: 'lit', value: 2 },
            value: { expr: 'lit', value: ['x'] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: originalItems },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(originalItems).toEqual(['a', 'b', 'c', 'd']);
      expect(context.state.get('items')).toEqual(['a', 'x', 'd']);
      expect(context.state.get('items')).not.toBe(originalItems);
    });

    it('should handle empty array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceEmpty',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 0 },
            deleteCount: { expr: 'lit', value: 0 },
            value: { expr: 'lit', value: ['a', 'b'] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: [] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'b']);
    });

    it('should handle dynamic index and deleteCount from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceDynamic',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'state', name: 'startIndex' },
            deleteCount: { expr: 'state', name: 'count' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c', 'd', 'e'] },
        startIndex: { type: 'number', initial: 1 },
        count: { type: 'number', initial: 3 },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['a', 'e']);
    });

    it('should replace all items when deleting all and inserting new ones', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceReplaceAll',
        steps: [
          {
            do: 'update',
            target: 'items',
            operation: 'splice',
            index: { expr: 'lit', value: 0 },
            deleteCount: { expr: 'lit', value: 3 },
            value: { expr: 'lit', value: ['x', 'y'] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: { type: 'list', initial: ['a', 'b', 'c'] },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('items')).toEqual(['x', 'y']);
    });

    it('should handle splice with objects in array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'spliceObjects',
        steps: [
          {
            do: 'update',
            target: 'todos',
            operation: 'splice',
            index: { expr: 'lit', value: 1 },
            deleteCount: { expr: 'lit', value: 1 },
            value: { expr: 'lit', value: [{ id: 10, text: 'New' }, { id: 11, text: 'Another' }] },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        todos: {
          type: 'list',
          initial: [
            { id: 1, text: 'First' },
            { id: 2, text: 'Second' },
            { id: 3, text: 'Third' },
          ],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('todos')).toEqual([
        { id: 1, text: 'First' },
        { id: 10, text: 'New' },
        { id: 11, text: 'Another' },
        { id: 3, text: 'Third' },
      ]);
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
