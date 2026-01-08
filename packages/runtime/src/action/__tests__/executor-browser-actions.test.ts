/**
 * Test module for Browser Actions Executor.
 *
 * Coverage:
 * - Storage step execution (mock localStorage/sessionStorage)
 * - Clipboard step execution (mock clipboard API)
 * - Navigate step execution (mock window.open, location)
 * - onSuccess/onError callbacks
 *
 * TDD Red Phase: These tests verify the runtime execution of browser action steps
 * that will be added to support browser APIs in Constela DSL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';

describe('executeAction with Browser Actions', () => {
  // ==================== Setup ====================

  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;
  let originalClipboard: Clipboard;
  let originalLocation: Location;
  let originalOpen: typeof window.open;

  let mockLocalStorage: Map<string, string>;
  let mockSessionStorage: Map<string, string>;
  let mockClipboardContent: string;

  beforeEach(() => {
    // Save originals
    originalLocalStorage = globalThis.localStorage;
    originalSessionStorage = globalThis.sessionStorage;
    originalClipboard = globalThis.navigator?.clipboard;
    originalLocation = globalThis.location;
    originalOpen = globalThis.open;

    // Mock localStorage
    mockLocalStorage = new Map<string, string>();
    const mockLocalStorageObj = {
      getItem: vi.fn((key: string) => mockLocalStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => mockLocalStorage.set(key, value)),
      removeItem: vi.fn((key: string) => mockLocalStorage.delete(key)),
      clear: vi.fn(() => mockLocalStorage.clear()),
      length: 0,
      key: vi.fn(() => null),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorageObj,
      writable: true,
    });

    // Mock sessionStorage
    mockSessionStorage = new Map<string, string>();
    const mockSessionStorageObj = {
      getItem: vi.fn((key: string) => mockSessionStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => mockSessionStorage.set(key, value)),
      removeItem: vi.fn((key: string) => mockSessionStorage.delete(key)),
      clear: vi.fn(() => mockSessionStorage.clear()),
      length: 0,
      key: vi.fn(() => null),
    };
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorageObj,
      writable: true,
    });

    // Mock clipboard
    mockClipboardContent = '';
    const mockClipboard = {
      writeText: vi.fn(async (text: string) => {
        mockClipboardContent = text;
      }),
      readText: vi.fn(async () => mockClipboardContent),
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: mockClipboard },
      writable: true,
    });

    // Mock location
    const mockLocation = {
      href: 'http://localhost:3000/',
      assign: vi.fn(),
      replace: vi.fn(),
    };
    Object.defineProperty(globalThis, 'location', {
      value: mockLocation,
      writable: true,
    });

    // Mock window.open
    Object.defineProperty(globalThis, 'open', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
    if (originalClipboard) {
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
      });
    }
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      writable: true,
    });
    Object.defineProperty(globalThis, 'open', {
      value: originalOpen,
      writable: true,
    });

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

  // ==================== Storage Step - Get ====================

  describe('storage step - get', () => {
    it('should get value from localStorage', async () => {
      // Arrange
      mockLocalStorage.set('userToken', '"abc123"');
      const action: CompiledAction = {
        name: 'getToken',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'userToken' },
            storage: 'local',
            result: 'token',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.getItem).toHaveBeenCalledWith('userToken');
      expect(context.locals['token']).toBe('abc123');
    });

    it('should get value from sessionStorage', async () => {
      // Arrange
      mockSessionStorage.set('tempData', '"session-value"');
      const action: CompiledAction = {
        name: 'getTempData',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'tempData' },
            storage: 'session',
            result: 'data',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.sessionStorage.getItem).toHaveBeenCalledWith('tempData');
      expect(context.locals['data']).toBe('session-value');
    });

    it('should handle null value (key not found)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'getMissing',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'nonexistent' },
            storage: 'local',
            result: 'value',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.locals['value']).toBeNull();
    });

    it('should use dynamic key from state', async () => {
      // Arrange
      mockLocalStorage.set('user_123', '{"name":"John"}');
      const action: CompiledAction = {
        name: 'getDynamicKey',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: 'user_' },
              right: { expr: 'state', name: 'userId' },
            },
            storage: 'local',
            result: 'userData',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        userId: { type: 'string', initial: '123' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.getItem).toHaveBeenCalledWith('user_123');
      expect(context.locals['userData']).toEqual({ name: 'John' });
    });

    it('should execute onSuccess callbacks after successful get', async () => {
      // Arrange
      mockLocalStorage.set('token', '"valid-token"');
      const action: CompiledAction = {
        name: 'getWithSuccess',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'token' },
            storage: 'local',
            result: 'authToken',
            onSuccess: [
              { do: 'set', target: 'isAuthenticated', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        isAuthenticated: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('isAuthenticated')).toBe(true);
    });

    it('should execute onError callbacks when storage access fails', async () => {
      // Arrange - Make getItem throw an error
      vi.mocked(globalThis.localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const action: CompiledAction = {
        name: 'getWithError',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'token' },
            storage: 'local',
            result: 'authToken',
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
  });

  // ==================== Storage Step - Set ====================

  describe('storage step - set', () => {
    it('should set value in localStorage', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setToken',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'userToken' },
            value: { expr: 'lit', value: 'new-token-123' },
            storage: 'local',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'userToken',
        '"new-token-123"'
      );
    });

    it('should set value in sessionStorage', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setTempData',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'tempData' },
            value: { expr: 'lit', value: 'temporary-value' },
            storage: 'session',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.sessionStorage.setItem).toHaveBeenCalledWith(
        'tempData',
        '"temporary-value"'
      );
    });

    it('should set object value (serialized as JSON)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setUserData',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'userData' },
            value: { expr: 'lit', value: { name: 'John', age: 30 } },
            storage: 'local',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'userData',
        '{"name":"John","age":30}'
      );
    });

    it('should set value from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromState',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'settings' },
            value: { expr: 'state', name: 'userSettings' },
            storage: 'local',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        userSettings: { type: 'object', initial: { theme: 'dark', lang: 'en' } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'settings',
        '{"theme":"dark","lang":"en"}'
      );
    });

    it('should execute onSuccess callbacks after successful set', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setWithSuccess',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'data' },
            value: { expr: 'lit', value: 'value' },
            storage: 'local',
            onSuccess: [
              { do: 'set', target: 'saved', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        saved: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('saved')).toBe(true);
    });

    it('should execute onError callbacks when storage set fails', async () => {
      // Arrange - Make setItem throw an error (e.g., quota exceeded)
      vi.mocked(globalThis.localStorage.setItem).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const action: CompiledAction = {
        name: 'setWithError',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'data' },
            value: { expr: 'lit', value: 'value' },
            storage: 'local',
            onError: [
              { do: 'set', target: 'saveError', value: { expr: 'lit', value: 'Storage full' } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        saveError: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('saveError')).toBe('Storage full');
    });
  });

  // ==================== Storage Step - Remove ====================

  describe('storage step - remove', () => {
    it('should remove value from localStorage', async () => {
      // Arrange
      mockLocalStorage.set('oldToken', 'value');
      const action: CompiledAction = {
        name: 'removeToken',
        steps: [
          {
            do: 'storage',
            operation: 'remove',
            key: { expr: 'lit', value: 'oldToken' },
            storage: 'local',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith('oldToken');
    });

    it('should remove value from sessionStorage', async () => {
      // Arrange
      mockSessionStorage.set('tempToken', 'value');
      const action: CompiledAction = {
        name: 'removeTempToken',
        steps: [
          {
            do: 'storage',
            operation: 'remove',
            key: { expr: 'lit', value: 'tempToken' },
            storage: 'session',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.sessionStorage.removeItem).toHaveBeenCalledWith('tempToken');
    });

    it('should execute onSuccess callbacks after successful remove', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'removeWithSuccess',
        steps: [
          {
            do: 'storage',
            operation: 'remove',
            key: { expr: 'lit', value: 'token' },
            storage: 'local',
            onSuccess: [
              { do: 'set', target: 'loggedOut', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        loggedOut: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('loggedOut')).toBe(true);
    });
  });

  // ==================== Clipboard Step - Write ====================

  describe('clipboard step - write', () => {
    it('should write text to clipboard', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'copyText',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'Text to copy' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('Text to copy');
      expect(mockClipboardContent).toBe('Text to copy');
    });

    it('should write state value to clipboard', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'copyShareUrl',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'state', name: 'shareUrl' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        shareUrl: { type: 'string', initial: 'https://example.com/share/123' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/share/123'
      );
    });

    it('should write computed value to clipboard', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'copyComputedUrl',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: 'URL: ' },
              right: { expr: 'state', name: 'pageUrl' },
            },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        pageUrl: { type: 'string', initial: 'https://example.com' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
        'URL: https://example.com'
      );
    });

    it('should execute onSuccess callbacks after successful write', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'copyWithSuccess',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'copied!' },
            onSuccess: [
              { do: 'set', target: 'copied', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        copied: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('copied')).toBe(true);
    });

    it('should execute onError callbacks when clipboard write fails', async () => {
      // Arrange - Make writeText throw an error
      vi.mocked(globalThis.navigator.clipboard.writeText).mockRejectedValue(
        new Error('Clipboard access denied')
      );

      const action: CompiledAction = {
        name: 'copyWithError',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'text' },
            onError: [
              { do: 'set', target: 'copyFailed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        copyFailed: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('copyFailed')).toBe(true);
    });
  });

  // ==================== Clipboard Step - Read ====================

  describe('clipboard step - read', () => {
    it('should read text from clipboard', async () => {
      // Arrange
      mockClipboardContent = 'Clipboard content';
      const action: CompiledAction = {
        name: 'pasteText',
        steps: [
          {
            do: 'clipboard',
            operation: 'read',
            result: 'pastedText',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.navigator.clipboard.readText).toHaveBeenCalled();
      expect(context.locals['pastedText']).toBe('Clipboard content');
    });

    it('should execute onSuccess callbacks after successful read', async () => {
      // Arrange
      mockClipboardContent = 'pasted data';
      const action: CompiledAction = {
        name: 'pasteWithSuccess',
        steps: [
          {
            do: 'clipboard',
            operation: 'read',
            result: 'content',
            onSuccess: [
              { do: 'set', target: 'hasPasted', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        hasPasted: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('hasPasted')).toBe(true);
    });

    it('should execute onError callbacks when clipboard read fails', async () => {
      // Arrange - Make readText throw an error
      vi.mocked(globalThis.navigator.clipboard.readText).mockRejectedValue(
        new Error('Clipboard access denied')
      );

      const action: CompiledAction = {
        name: 'pasteWithError',
        steps: [
          {
            do: 'clipboard',
            operation: 'read',
            result: 'content',
            onError: [
              { do: 'set', target: 'pasteFailed', value: { expr: 'lit', value: true } },
            ],
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        pasteFailed: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('pasteFailed')).toBe(true);
    });
  });

  // ==================== Navigate Step ====================

  describe('navigate step', () => {
    it('should navigate to internal URL using location.assign', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'goToDashboard',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/dashboard' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.location.assign).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to external URL using location.assign', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'goToExternal',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'lit', value: 'https://example.com' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.location.assign).toHaveBeenCalledWith('https://example.com');
    });

    it('should navigate with _self target (same as default)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'goToPage',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/page' },
            target: '_self',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.location.assign).toHaveBeenCalledWith('/page');
    });

    it('should open new tab with _blank target', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'openNewTab',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'lit', value: 'https://external.com' },
            target: '_blank',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.open).toHaveBeenCalledWith('https://external.com', '_blank');
    });

    it('should use location.replace when replace option is true', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'replaceNavigation',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/new-page' },
            replace: true,
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.location.replace).toHaveBeenCalledWith('/new-page');
    });

    it('should navigate with dynamic URL from state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'dynamicNavigate',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'state', name: 'nextPage' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        nextPage: { type: 'string', initial: '/profile' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.location.assign).toHaveBeenCalledWith('/profile');
    });

    it('should navigate with computed URL', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'computedNavigate',
        steps: [
          {
            do: 'navigate',
            url: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: '/users/' },
              right: { expr: 'state', name: 'userId' },
            },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({
        userId: { type: 'string', initial: '42' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.location.assign).toHaveBeenCalledWith('/users/42');
    });
  });

  // ==================== Mixed Browser Actions ====================

  describe('mixed browser actions', () => {
    it('should execute storage, clipboard, and navigate steps in sequence', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mixedActions',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'shareUrl' },
            storage: 'local',
            result: 'url',
          } as CompiledActionStep,
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'var', name: 'url' },
          } as CompiledActionStep,
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/shared' },
          } as CompiledActionStep,
        ],
      };

      mockLocalStorage.set('shareUrl', '"https://example.com/share"');
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.getItem).toHaveBeenCalledWith('shareUrl');
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/share'
      );
      expect(globalThis.location.assign).toHaveBeenCalledWith('/shared');
    });

    it('should execute browser actions with existing step types', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'fetched' }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'mixedWithFetch',
        steps: [
          { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'cachedData' },
            storage: 'local',
            result: 'cached',
          } as CompiledActionStep,
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/data' },
            result: 'apiData',
          },
          { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
        ],
      };
      const context = createContext({
        loading: { type: 'boolean', initial: false },
      });

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('loading')).toBe(false);
      expect(globalThis.localStorage.getItem).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle browser action in fetch onSuccess callback', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'new-token' }),
      });
      globalThis.fetch = mockFetch;

      const action: CompiledAction = {
        name: 'fetchAndStore',
        steps: [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/auth' },
            result: 'response',
            onSuccess: [
              {
                do: 'storage',
                operation: 'set',
                key: { expr: 'lit', value: 'authToken' },
                value: { expr: 'var', name: 'response' },
                storage: 'local',
              } as CompiledActionStep,
            ],
          },
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'authToken',
        '{"token":"new-token"}'
      );
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle storage step without result field', async () => {
      // Arrange
      mockLocalStorage.set('key', '"value"');
      const action: CompiledAction = {
        name: 'getWithoutResult',
        steps: [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'key' },
            storage: 'local',
            // No result field
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should handle clipboard read step without result field', async () => {
      // Arrange
      mockClipboardContent = 'content';
      const action: CompiledAction = {
        name: 'readWithoutResult',
        steps: [
          {
            do: 'clipboard',
            operation: 'read',
            // No result field
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should handle navigate step with empty onSuccess/onError callbacks', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'navigateEmpty',
        steps: [
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/page' },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act & Assert - should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should serialize non-string values for storage', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setNumber',
        steps: [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'count' },
            value: { expr: 'lit', value: 42 },
            storage: 'local',
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('count', '42');
    });

    it('should convert non-string clipboard values to string', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'copyNumber',
        steps: [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 12345 },
          } as CompiledActionStep,
        ],
      };
      const context = createContext({});

      // Act
      await executeAction(action, context);

      // Assert
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith('12345');
    });
  });
});
