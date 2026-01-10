/**
 * Test module for External Library Action Executor.
 *
 * Coverage:
 * - ImportStep execution (dynamic import with onSuccess/onError)
 * - CallStep execution (external function calls with args)
 * - SubscribeStep execution (event subscription on target object)
 * - DisposeStep execution (resource cleanup)
 * - Error variable injection in onError callbacks
 *
 * TDD Red Phase: These tests verify the runtime execution of external library
 * integration steps that will be added to support dynamic imports, external
 * function calls, event subscriptions, and resource cleanup in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';

describe('executeAction with External Library Steps', () => {
  // ==================== Setup ====================

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
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

  // ==================== ImportStep Execution ====================

  describe('executeAction - ImportStep', () => {
    it('should execute import step and store result in locals', async () => {
      // Arrange
      // Dynamic import of a real module that Vitest can resolve
      const action: CompiledAction = {
        name: 'importLibrary',
        steps: [
          {
            do: 'import',
            module: 'vitest',
            result: 'lib',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert - module should be stored in locals
      expect(context.locals['lib']).toBeDefined();
      expect(typeof context.locals['lib']).toBe('object');
    });

    it('should execute onSuccess after successful import', async () => {
      // Arrange
      // Use a real module that can be imported
      const action: CompiledAction = {
        name: 'importWithSuccess',
        steps: [
          {
            do: 'import',
            module: 'vitest',
            result: 'vitest',
            onSuccess: [
              { do: 'set', target: 'loaded', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        loaded: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('loaded')).toBe(true);
    });

    it('should execute onError and inject error variable on import failure', async () => {
      // Arrange
      // Use a non-existent module to trigger error
      const action: CompiledAction = {
        name: 'importWithError',
        steps: [
          {
            do: 'import',
            module: 'non-existent-module-12345',
            result: 'lib',
            onError: [
              { do: 'set', target: 'hasError', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        hasError: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('hasError')).toBe(true);
    });

    it('should provide error.message and error.name in onError', async () => {
      // Arrange
      // Use a non-existent module to trigger error
      const action: CompiledAction = {
        name: 'importWithErrorDetails',
        steps: [
          {
            do: 'import',
            module: 'bad-module-xyz-12345',
            result: 'lib',
            onError: [
              { do: 'set', target: 'errorMessage', value: { expr: 'var', name: 'error', path: 'message' } },
              { do: 'set', target: 'errorName', value: { expr: 'var', name: 'error', path: 'name' } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        errorMessage: { type: 'string', initial: '' },
        errorName: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      // Error message contains module name and indicates it failed to load
      expect(context.state.get('errorMessage')).toContain('bad-module-xyz-12345');
      // The actual error type depends on the bundler/environment
      expect(typeof context.state.get('errorName')).toBe('string');
      expect(context.state.get('errorName')).toBeTruthy();
    });
  });

  // ==================== CallStep Execution ====================

  describe('executeAction - CallStep', () => {
    it('should call target function with args', async () => {
      // Arrange
      const mockFn = vi.fn().mockReturnValue('result');
      const context = createContext({});
      context.locals['lib'] = { doSomething: mockFn };

      const action: CompiledAction = {
        name: 'callFunction',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'doSomething' },
            args: [
              { expr: 'lit', value: 'arg1' },
              { expr: 'lit', value: 42 },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFn).toHaveBeenCalledWith('arg1', 42);
    });

    it('should store result in locals if result is specified', async () => {
      // Arrange
      const mockResult = { id: 123, name: 'test' };
      const mockFn = vi.fn().mockReturnValue(mockResult);
      const context = createContext({});
      context.locals['lib'] = { create: mockFn };

      const action: CompiledAction = {
        name: 'callWithResult',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'create' },
            args: [{ expr: 'lit', value: { config: true } }],
            result: 'instance',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.locals['instance']).toBe(mockResult);
    });

    it('should execute onSuccess after successful call', async () => {
      // Arrange
      const mockFn = vi.fn().mockReturnValue('success');
      const context = createContext({
        callCompleted: { type: 'boolean', initial: false },
      });
      context.locals['api'] = { request: mockFn };

      const action: CompiledAction = {
        name: 'callWithSuccess',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'api', path: 'request' },
            onSuccess: [
              { do: 'set', target: 'callCompleted', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('callCompleted')).toBe(true);
    });

    it('should execute onError and inject error variable on call failure', async () => {
      // Arrange
      const callError = new Error('Call failed');
      const mockFn = vi.fn().mockImplementation(() => {
        throw callError;
      });
      const context = createContext({
        errorMessage: { type: 'string', initial: '' },
      });
      context.locals['lib'] = { brokenMethod: mockFn };

      const action: CompiledAction = {
        name: 'callWithError',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'brokenMethod' },
            onError: [
              { do: 'set', target: 'errorMessage', value: { expr: 'var', name: 'error', path: 'message' } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('errorMessage')).toBe('Call failed');
    });

    it('should work with refs in args', async () => {
      // Arrange
      const mockElement = document.createElement('div');
      const mockFn = vi.fn();
      const context = createContext({});
      context.locals['monaco'] = { editor: { create: mockFn } };
      // refs should be set on context.refs, not context.locals
      context.refs = { editorContainer: mockElement };

      const action: CompiledAction = {
        name: 'callWithRef',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'monaco', path: 'editor.create' },
            args: [
              { expr: 'ref', name: 'editorContainer' },
              { expr: 'lit', value: { language: 'typescript' } },
            ],
            result: 'editorInstance',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert - the first argument should be the DOM element from the ref
      expect(mockFn).toHaveBeenCalledWith(
        mockElement,
        { language: 'typescript' }
      );
    });
  });

  // ==================== SubscribeStep Execution ====================

  describe('executeAction - SubscribeStep', () => {
    it('should subscribe to event on target object', async () => {
      // Arrange
      const mockSubscribeFn = vi.fn().mockReturnValue({ dispose: vi.fn() });
      const mockInstance = {
        onDidChangeModelContent: mockSubscribeFn,
      };
      const context = createContext(
        { editorInstance: { type: 'object', initial: {} } },
        { handleChange: { name: 'handleChange', steps: [] } }
      );
      context.state.set('editorInstance', mockInstance);

      const action: CompiledAction = {
        name: 'subscribeToEvent',
        steps: [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'editorInstance' },
            event: 'onDidChangeModelContent',
            action: 'handleChange',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockSubscribeFn).toHaveBeenCalled();
    });

    it('should execute action when event fires', async () => {
      // Arrange
      let eventCallback: ((event: unknown) => void) | null = null;
      const mockSubscribeFn = vi.fn().mockImplementation((callback) => {
        eventCallback = callback;
        return { dispose: vi.fn() };
      });
      const mockInstance = {
        onChange: mockSubscribeFn,
      };

      const handleChangeAction: CompiledAction = {
        name: 'handleChange',
        steps: [
          { do: 'set', target: 'changeCount', value: { expr: 'lit', value: 1 } },
        ],
      };

      const context = createContext(
        {
          instance: { type: 'object', initial: {} },
          changeCount: { type: 'number', initial: 0 },
        },
        { handleChange: handleChangeAction }
      );
      context.state.set('instance', mockInstance);

      const action: CompiledAction = {
        name: 'subscribeAction',
        steps: [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'instance' },
            event: 'onChange',
            action: 'handleChange',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);
      // Simulate event firing
      if (eventCallback) {
        eventCallback({ data: 'test' });
      }

      // Assert
      expect(context.state.get('changeCount')).toBe(1);
    });

    it('should collect subscription for auto-disposal', async () => {
      // Arrange
      const mockDispose = vi.fn();
      const mockSubscribeFn = vi.fn().mockReturnValue({ dispose: mockDispose });
      const mockInstance = {
        onUpdate: mockSubscribeFn,
      };
      const context = createContext(
        { instance: { type: 'object', initial: {} } },
        { handleUpdate: { name: 'handleUpdate', steps: [] } }
      );
      context.state.set('instance', mockInstance);
      // Create subscriptions array to collect disposables (as functions that call dispose)
      context.subscriptions = [];

      const action: CompiledAction = {
        name: 'subscribeForAutoDisposal',
        steps: [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'instance' },
            event: 'onUpdate',
            action: 'handleUpdate',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert - subscription should be collected as a function
      expect(context.subscriptions!.length).toBe(1);
      expect(typeof context.subscriptions![0]).toBe('function');
      // When the subscription function is called, it should call dispose
      context.subscriptions![0]!();
      expect(mockDispose).toHaveBeenCalled();
    });
  });

  // ==================== DisposeStep Execution ====================

  describe('executeAction - DisposeStep', () => {
    it('should call dispose on target object', async () => {
      // Arrange
      const mockDispose = vi.fn();
      const mockInstance = { dispose: mockDispose };
      const context = createContext({
        editorInstance: { type: 'object', initial: {} },
      });
      context.state.set('editorInstance', mockInstance);

      const action: CompiledAction = {
        name: 'disposeInstance',
        steps: [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'editorInstance' },
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockDispose).toHaveBeenCalled();
    });

    it('should handle target without dispose method gracefully', async () => {
      // Arrange
      const mockInstance = { someMethod: vi.fn() }; // No dispose method
      const context = createContext({
        instance: { type: 'object', initial: {} },
      });
      context.state.set('instance', mockInstance);

      const action: CompiledAction = {
        name: 'disposeWithoutMethod',
        steps: [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'instance' },
          } as CompiledActionStep,
        ],
      };

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should call destroy method if dispose is not available', async () => {
      // Arrange - some libraries use destroy() instead of dispose()
      const mockDestroy = vi.fn();
      const mockInstance = { destroy: mockDestroy };
      const context = createContext({
        chartInstance: { type: 'object', initial: {} },
      });
      context.state.set('chartInstance', mockInstance);

      const action: CompiledAction = {
        name: 'destroyChart',
        steps: [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'chartInstance' },
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert - should try destroy as fallback
      expect(mockDestroy).toHaveBeenCalled();
    });

    it('should dispose target from locals', async () => {
      // Arrange
      const mockDispose = vi.fn();
      const context = createContext({});
      context.locals['subscription'] = { dispose: mockDispose };

      const action: CompiledAction = {
        name: 'disposeLocal',
        steps: [
          {
            do: 'dispose',
            target: { expr: 'var', name: 'subscription' },
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockDispose).toHaveBeenCalled();
    });
  });

  // ==================== Error Variable Injection ====================

  describe('error variable injection', () => {
    it('should inject error in FetchStep onError', async () => {
      // Arrange
      const fetchError = new Error('Network request failed');
      const mockFetch = vi.fn().mockRejectedValue(fetchError);
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchWithErrorInjection',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/data' },
            result: 'data',
            onError: [
              { do: 'set', target: 'fetchError', value: { expr: 'var', name: 'error', path: 'message' } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        fetchError: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('fetchError')).toBe('Network request failed');
    });

    it('should inject error in StorageStep onError', async () => {
      // Arrange
      const storageError = new Error('QuotaExceededError');
      vi.stubGlobal('localStorage', {
        setItem: vi.fn().mockImplementation(() => {
          throw storageError;
        }),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const action: CompiledAction = {
        name: 'storageWithErrorInjection',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'largeData' },
            value: { expr: 'lit', value: 'x'.repeat(10000000) },
            storage: 'local',
            onError: [
              { do: 'set', target: 'storageError', value: { expr: 'var', name: 'error', path: 'message' } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        storageError: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('storageError')).toBe('QuotaExceededError');
    });

    it('should inject error in ClipboardStep onError', async () => {
      // Arrange
      const clipboardError = new Error('Clipboard access denied');
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(clipboardError),
          readText: vi.fn().mockRejectedValue(clipboardError),
        },
      });

      const action: CompiledAction = {
        name: 'clipboardWithErrorInjection',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'text to copy' },
            onError: [
              { do: 'set', target: 'clipboardError', value: { expr: 'var', name: 'error', path: 'message' } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        clipboardError: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('clipboardError')).toBe('Clipboard access denied');
    });

    it('should inject error with message and name properties', async () => {
      // Arrange
      const customError = new TypeError('Invalid argument type');
      const mockFn = vi.fn().mockImplementation(() => {
        throw customError;
      });
      const context = createContext({
        errorMessage: { type: 'string', initial: '' },
        errorName: { type: 'string', initial: '' },
      });
      context.locals['lib'] = { validateInput: mockFn };

      const action: CompiledAction = {
        name: 'callWithFullErrorInfo',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'validateInput' },
            args: [{ expr: 'lit', value: null }],
            onError: [
              { do: 'set', target: 'errorMessage', value: { expr: 'var', name: 'error', path: 'message' } },
              { do: 'set', target: 'errorName', value: { expr: 'var', name: 'error', path: 'name' } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('errorMessage')).toBe('Invalid argument type');
      expect(context.state.get('errorName')).toBe('TypeError');
    });

    it('should make error available as object with message and name in onError', async () => {
      // Arrange
      const customError = new TypeError('Detailed error');
      const mockFn = vi.fn().mockImplementation(() => {
        throw customError;
      });
      const context = createContext({
        capturedError: { type: 'object', initial: {} },
      });
      context.locals['api'] = { request: mockFn };

      const action: CompiledAction = {
        name: 'captureFullError',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'api', path: 'request' },
            onError: [
              { do: 'set', target: 'capturedError', value: { expr: 'var', name: 'error' } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert - error is stored as { message, name } object
      const capturedError = context.state.get('capturedError') as { message: string; name: string };
      expect(capturedError.message).toBe('Detailed error');
      expect(capturedError.name).toBe('TypeError');
    });
  });

  // ==================== Integration Scenarios ====================

  describe('integration scenarios', () => {
    it('should execute library initialization workflow with call and subscribe', async () => {
      // Arrange - test call and subscribe workflow without mocking import
      const mockEditor = {
        getValue: vi.fn().mockReturnValue('initial code'),
        onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };
      const mockLibrary = {
        editor: {
          create: vi.fn().mockReturnValue(mockEditor),
        },
      };

      const mockContainer = document.createElement('div');
      const handleChangeAction: CompiledAction = {
        name: 'handleEditorChange',
        steps: [
          { do: 'set', target: 'code', value: { expr: 'var', name: 'event' } },
        ],
      };

      const context = createContext(
        {
          editorReady: { type: 'boolean', initial: false },
          code: { type: 'string', initial: '' },
        },
        { handleEditorChange: handleChangeAction }
      );
      context.locals['library'] = mockLibrary;
      context.refs = { editorContainer: mockContainer };

      const initAction: CompiledAction = {
        name: 'initEditor',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'library', path: 'editor.create' },
            args: [
              { expr: 'ref', name: 'editorContainer' },
              { expr: 'lit', value: { language: 'typescript', theme: 'vs-dark' } },
            ],
            result: 'editorInstance',
            onSuccess: [
              { do: 'set', target: 'editorReady', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
          {
            do: 'subscribe',
            target: { expr: 'var', name: 'editorInstance' },
            event: 'onDidChangeModelContent',
            action: 'handleEditorChange',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(initAction, context);

      // Assert
      expect(context.state.get('editorReady')).toBe(true);
      expect(context.locals['editorInstance']).toBe(mockEditor);
      expect(mockLibrary.editor.create).toHaveBeenCalledWith(
        mockContainer,
        { language: 'typescript', theme: 'vs-dark' }
      );
    });

    it('should execute cleanup on dispose', async () => {
      // Arrange
      const mockDispose = vi.fn();
      const mockEditor = { dispose: mockDispose };
      const context = createContext({
        editorInstance: { type: 'object', initial: {} },
      });
      context.state.set('editorInstance', mockEditor);

      const disposeAction: CompiledAction = {
        name: 'disposeEditor',
        steps: [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'editorInstance' },
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(disposeAction, context);

      // Assert
      expect(mockDispose).toHaveBeenCalled();
    });

    it('should handle async call results', async () => {
      // Arrange
      const asyncResult = { data: 'fetched data' };
      const mockAsyncFn = vi.fn().mockResolvedValue(asyncResult);
      const context = createContext({
        result: { type: 'object', initial: {} },
      });
      context.locals['api'] = { fetchData: mockAsyncFn };

      const action: CompiledAction = {
        name: 'asyncCall',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'api', path: 'fetchData' },
            result: 'fetchResult',
            onSuccess: [
              { do: 'set', target: 'result', value: { expr: 'var', name: 'fetchResult' } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.locals['fetchResult']).toEqual(asyncResult);
      expect(context.state.get('result')).toEqual(asyncResult);
    });
  });

  // ==================== Non-Throwing Result Objects ====================

  describe('call step with non-throwing result objects', () => {
    /**
     * Test Case 1: call step with function returning {ok: false, error: {...}}
     *
     * This verifies that:
     * - Functions that return error objects (instead of throwing) execute onSuccess
     * - The result object is correctly stored in ctx.locals
     *
     * This is the expected behavior: onSuccess means "the call completed without exception",
     * not "the result indicates success".
     */
    it('should execute onSuccess when function returns {ok: false, error: {...}} without throwing', async () => {
      // Arrange
      const validationResult = { ok: false, error: { message: 'Invalid syntax', line: 5 } };
      const mockValidateFn = vi.fn().mockReturnValue(validationResult);
      const context = createContext({
        onSuccessCalled: { type: 'boolean', initial: false },
        onErrorCalled: { type: 'boolean', initial: false },
      });
      context.locals['validator'] = { validateAst: mockValidateFn };

      const action: CompiledAction = {
        name: 'validateCode',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'validator', path: 'validateAst' },
            args: [{ expr: 'lit', value: 'some code' }],
            result: 'validationResult',
            onSuccess: [
              { do: 'set', target: 'onSuccessCalled', value: { expr: 'lit', value: true } },
            ],
            onError: [
              { do: 'set', target: 'onErrorCalled', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      // onSuccess should be called because the function returned without throwing
      expect(context.state.get('onSuccessCalled')).toBe(true);
      // onError should NOT be called because no exception was thrown
      expect(context.state.get('onErrorCalled')).toBe(false);
      // The result object should be stored in locals
      expect(context.locals['validationResult']).toEqual(validationResult);
      expect((context.locals['validationResult'] as { ok: boolean }).ok).toBe(false);
    });

    /**
     * Test Case 2: if step checking result.ok and executing else branch
     *
     * This verifies that:
     * - The if step can access nested properties of locals using path notation
     * - When result.ok is false, the else branch is executed
     *
     * This is the pattern needed for handling validation results like validateAst
     * which returns {ok: boolean, error?: ConstelaError}.
     */
    it('should execute else branch in if step when result.ok is false', async () => {
      // Arrange
      const validationResult = { ok: false, error: { message: 'Parse error', code: 'E001' } };
      const mockValidateFn = vi.fn().mockReturnValue(validationResult);
      const context = createContext({
        isValid: { type: 'boolean', initial: true },
        errorMessage: { type: 'string', initial: '' },
      });
      context.locals['validator'] = { validateAst: mockValidateFn };

      const action: CompiledAction = {
        name: 'validateAndBranch',
        steps: [
          // Step 1: Call validator, store result
          {
            do: 'call',
            target: { expr: 'var', name: 'validator', path: 'validateAst' },
            args: [{ expr: 'lit', value: 'invalid code' }],
            result: 'validationResult',
          } as CompiledActionStep,
          // Step 2: Check result.ok and branch
          {
            do: 'if',
            condition: { expr: 'var', name: 'validationResult', path: 'ok' },
            then: [
              { do: 'set', target: 'isValid', value: { expr: 'lit', value: true } },
            ],
            else: [
              { do: 'set', target: 'isValid', value: { expr: 'lit', value: false } },
              { do: 'set', target: 'errorMessage', value: { expr: 'var', name: 'validationResult', path: 'error.message' } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      // Since result.ok is false, else branch should be executed
      expect(context.state.get('isValid')).toBe(false);
      expect(context.state.get('errorMessage')).toBe('Parse error');
    });

    /**
     * Test Case 3: if step with result.ok === true should execute then branch
     *
     * This is the complementary test to verify the then branch works correctly
     * when the validation succeeds.
     */
    it('should execute then branch in if step when result.ok is true', async () => {
      // Arrange
      const validationResult = { ok: true, data: { ast: { type: 'Program' } } };
      const mockValidateFn = vi.fn().mockReturnValue(validationResult);
      const context = createContext({
        isValid: { type: 'boolean', initial: false },
        successMessage: { type: 'string', initial: '' },
      });
      context.locals['validator'] = { validateAst: mockValidateFn };

      const action: CompiledAction = {
        name: 'validateAndBranchSuccess',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'validator', path: 'validateAst' },
            args: [{ expr: 'lit', value: 'valid code' }],
            result: 'validationResult',
          } as CompiledActionStep,
          {
            do: 'if',
            condition: { expr: 'var', name: 'validationResult', path: 'ok' },
            then: [
              { do: 'set', target: 'isValid', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'successMessage', value: { expr: 'lit', value: 'Validation passed!' } },
            ],
            else: [
              { do: 'set', target: 'isValid', value: { expr: 'lit', value: false } },
            ],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      // Since result.ok is true, then branch should be executed
      expect(context.state.get('isValid')).toBe(true);
      expect(context.state.get('successMessage')).toBe('Validation passed!');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle import step without onSuccess/onError', async () => {
      // Arrange - use a real module that can be imported
      const action: CompiledAction = {
        name: 'simpleImport',
        steps: [
          {
            do: 'import',
            module: 'vitest',
            result: 'lib',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
      expect(context.locals['lib']).toBeDefined();
    });

    it('should handle call step without args', async () => {
      // Arrange
      const mockFn = vi.fn().mockReturnValue('no args result');
      const context = createContext({});
      context.locals['lib'] = { noArgsMethod: mockFn };

      const action: CompiledAction = {
        name: 'callNoArgs',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'noArgsMethod' },
            result: 'result',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFn).toHaveBeenCalledWith();
      expect(context.locals['result']).toBe('no args result');
    });

    it('should handle call step without result', async () => {
      // Arrange
      const mockFn = vi.fn();
      const context = createContext({});
      context.locals['lib'] = { sideEffectMethod: mockFn };

      const action: CompiledAction = {
        name: 'callNoResult',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'sideEffectMethod' },
            args: [{ expr: 'lit', value: 'data' }],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFn).toHaveBeenCalledWith('data');
    });

    it('should handle null target in dispose step', async () => {
      // Arrange
      const context = createContext({
        instance: { type: 'object', initial: null },
      });

      const action: CompiledAction = {
        name: 'disposeNull',
        steps: [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'instance' },
          } as CompiledActionStep,
        ],
      };

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should handle nested path in call target', async () => {
      // Arrange
      const mockFn = vi.fn().mockReturnValue('nested result');
      const context = createContext({});
      context.locals['lib'] = {
        module: {
          submodule: {
            deepMethod: mockFn,
          },
        },
      };

      const action: CompiledAction = {
        name: 'callNestedPath',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'module.submodule.deepMethod' },
            result: 'result',
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFn).toHaveBeenCalled();
      expect(context.locals['result']).toBe('nested result');
    });

    it('should handle state expression in call args', async () => {
      // Arrange
      const mockFn = vi.fn();
      const context = createContext({
        config: { type: 'object', initial: { debug: true, level: 'info' } },
      });
      context.locals['lib'] = { configure: mockFn };

      const action: CompiledAction = {
        name: 'callWithStateArg',
        steps: [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'configure' },
            args: [{ expr: 'state', name: 'config' }],
          } as CompiledActionStep,
        ],
      };

      // Act
      await executeAction(action, context);

      // Assert
      expect(mockFn).toHaveBeenCalledWith({ debug: true, level: 'info' });
    });
  });
});
