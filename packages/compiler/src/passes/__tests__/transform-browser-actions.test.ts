/**
 * Test module for Browser Actions transformation.
 *
 * Coverage:
 * - StorageStep transforms to CompiledStorageStep
 * - ClipboardStep transforms to CompiledClipboardStep
 * - NavigateStep transforms to CompiledNavigateStep
 * - Expression transformation within browser action steps
 *
 * TDD Red Phase: These tests verify the transformation of browser action steps
 * that will be added to support browser APIs in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';

describe('transformPass with Browser Actions', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(options: {
    stateNames?: string[];
    actionNames?: string[];
    routeParams?: string[];
  } = {}): AnalysisContext {
    return {
      stateNames: new Set<string>(options.stateNames ?? []),
      actionNames: new Set<string>(options.actionNames ?? []),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(options.routeParams ?? []),
      importNames: new Set<string>(),
      dataNames: new Set<string>(),
    };
  }

  /**
   * Creates a minimal Program for testing browser action transformation
   */
  function createProgramWithAction(
    steps: unknown[],
    state: Record<string, unknown> = {}
  ): Program {
    return {
      version: '1.0',
      state,
      actions: [
        {
          name: 'testAction',
          steps,
        },
      ],
      view: { kind: 'element', tag: 'div' },
    } as unknown as Program;
  }

  // ==================== Storage Step Transformation ====================

  describe('StorageStep transformation', () => {
    it('should transform storage get step to CompiledStorageStep', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'storage',
          operation: 'get',
          key: { expr: 'lit', value: 'userToken' },
          storage: 'local',
          result: 'token',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'userToken' },
        storage: 'local',
        result: 'token',
      });
    });

    it('should transform storage set step with value expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'settings' },
            value: { expr: 'state', name: 'userSettings' },
            storage: 'local',
          },
        ],
        { userSettings: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['userSettings'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        do: string;
        operation: string;
        key: { expr: string };
        value: { expr: string; name: string };
      };
      expect(step.do).toBe('storage');
      expect(step.operation).toBe('set');
      expect(step.value.expr).toBe('state');
      expect(step.value.name).toBe('userSettings');
    });

    it('should transform storage step with binary expression key', () => {
      // Arrange
      const program = createProgramWithAction(
        [
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
          },
        ],
        { userId: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['userId'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        key: { expr: string; op: string; left: { expr: string }; right: { expr: string } };
      };
      expect(step.key.expr).toBe('bin');
      expect(step.key.op).toBe('+');
      expect(step.key.left.expr).toBe('lit');
      expect(step.key.right.expr).toBe('state');
    });

    it('should transform storage remove step', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'storage',
          operation: 'remove',
          key: { expr: 'lit', value: 'cachedData' },
          storage: 'session',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'storage',
        operation: 'remove',
        key: { expr: 'lit', value: 'cachedData' },
        storage: 'session',
      });
    });

    it('should transform storage step with onSuccess callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'token' },
            storage: 'local',
            result: 'authToken',
            onSuccess: [
              { do: 'set', target: 'isAuthenticated', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        { isAuthenticated: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['isAuthenticated'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onSuccess?: Array<{ do: string; target: string }>;
      };
      expect(step.onSuccess).toBeDefined();
      expect(step.onSuccess?.length).toBe(1);
      expect(step.onSuccess?.[0]?.do).toBe('set');
      expect(step.onSuccess?.[0]?.target).toBe('isAuthenticated');
    });

    it('should transform storage step with onError callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'token' },
            storage: 'local',
            onError: [
              { do: 'set', target: 'hasError', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        { hasError: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['hasError'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onError?: Array<{ do: string; target: string }>;
      };
      expect(step.onError).toBeDefined();
      expect(step.onError?.length).toBe(1);
      expect(step.onError?.[0]?.do).toBe('set');
    });
  });

  // ==================== Clipboard Step Transformation ====================

  describe('ClipboardStep transformation', () => {
    it('should transform clipboard write step to CompiledClipboardStep', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'clipboard',
          operation: 'write',
          value: { expr: 'lit', value: 'text to copy' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'lit', value: 'text to copy' },
      });
    });

    it('should transform clipboard read step', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'clipboard',
          operation: 'read',
          result: 'pastedContent',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'clipboard',
        operation: 'read',
        result: 'pastedContent',
      });
    });

    it('should transform clipboard write step with state value', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'state', name: 'shareUrl' },
          },
        ],
        { shareUrl: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['shareUrl'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        value: { expr: string; name: string };
      };
      expect(step.value.expr).toBe('state');
      expect(step.value.name).toBe('shareUrl');
    });

    it('should transform clipboard step with binary expression value', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'clipboard',
            operation: 'write',
            value: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: 'Link: ' },
              right: { expr: 'state', name: 'currentUrl' },
            },
          },
        ],
        { currentUrl: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['currentUrl'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        value: { expr: string; op: string };
      };
      expect(step.value.expr).toBe('bin');
      expect(step.value.op).toBe('+');
    });

    it('should transform clipboard step with onSuccess callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'copied!' },
            onSuccess: [
              { do: 'set', target: 'copied', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        { copied: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['copied'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onSuccess?: Array<{ do: string }>;
      };
      expect(step.onSuccess).toBeDefined();
      expect(step.onSuccess?.length).toBe(1);
    });

    it('should transform clipboard step with onError callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'text' },
            onError: [
              { do: 'set', target: 'copyFailed', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        { copyFailed: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['copyFailed'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onError?: Array<{ do: string }>;
      };
      expect(step.onError).toBeDefined();
      expect(step.onError?.length).toBe(1);
    });
  });

  // ==================== Navigate Step Transformation ====================

  describe('NavigateStep transformation', () => {
    it('should transform navigate step to CompiledNavigateStep', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'navigate',
          url: { expr: 'lit', value: '/dashboard' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'navigate',
        url: { expr: 'lit', value: '/dashboard' },
      });
    });

    it('should transform navigate step with target', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'navigate',
          url: { expr: 'lit', value: 'https://external.com' },
          target: '_blank',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'navigate',
        url: { expr: 'lit', value: 'https://external.com' },
        target: '_blank',
      });
    });

    it('should transform navigate step with replace option', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'navigate',
          url: { expr: 'lit', value: '/new-page' },
          replace: true,
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as { replace: boolean };
      expect(step.replace).toBe(true);
    });

    it('should transform navigate step with dynamic url from state', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'navigate',
            url: { expr: 'state', name: 'nextPage' },
          },
        ],
        { nextPage: { type: 'string', initial: '/home' } }
      );

      const context = createContext({ stateNames: ['nextPage'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        url: { expr: string; name: string };
      };
      expect(step.url.expr).toBe('state');
      expect(step.url.name).toBe('nextPage');
    });

    it('should transform navigate step with binary expression url', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'navigate',
            url: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: '/users/' },
              right: { expr: 'state', name: 'userId' },
            },
          },
        ],
        { userId: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['userId'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        url: { expr: string; op: string };
      };
      expect(step.url.expr).toBe('bin');
      expect(step.url.op).toBe('+');
    });

    it('should transform navigate step with route expression url', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: { path: '/users/:id' },
        state: {},
        actions: [
          {
            name: 'navigateToProfile',
            steps: [
              {
                do: 'navigate',
                url: {
                  expr: 'bin',
                  op: '+',
                  left: { expr: 'lit', value: '/profile/' },
                  right: { expr: 'route', name: 'id' },
                },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      const context = createContext({ routeParams: ['id'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['navigateToProfile'];
      const step = action?.steps[0] as {
        url: { right: { expr: string; name: string } };
      };
      expect(step.url.right.expr).toBe('route');
      expect(step.url.right.name).toBe('id');
    });
  });

  // ==================== Mixed Browser Actions Transformation ====================

  describe('mixed browser actions transformation', () => {
    it('should transform action with multiple browser action steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'token' },
            storage: 'local',
            result: 'authToken',
          },
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'state', name: 'shareUrl' },
          },
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/success' },
          },
        ],
        { shareUrl: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['shareUrl'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps.length).toBe(3);

      const step1 = action?.steps[0] as { do: string };
      const step2 = action?.steps[1] as { do: string };
      const step3 = action?.steps[2] as { do: string };

      expect(step1.do).toBe('storage');
      expect(step2.do).toBe('clipboard');
      expect(step3.do).toBe('navigate');
    });

    it('should transform action with browser actions and existing step types', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'cachedData' },
            storage: 'local',
            result: 'cached',
          },
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com/data' },
          },
        ],
        { loading: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['loading'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps.length).toBe(3);

      const step1 = action?.steps[0] as { do: string };
      const step2 = action?.steps[1] as { do: string };
      const step3 = action?.steps[2] as { do: string };

      expect(step1.do).toBe('set');
      expect(step2.do).toBe('storage');
      expect(step3.do).toBe('fetch');
    });

    it('should transform nested browser actions in onSuccess callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com' },
            onSuccess: [
              {
                do: 'storage',
                operation: 'set',
                key: { expr: 'lit', value: 'data' },
                value: { expr: 'var', name: 'response' },
                storage: 'local',
              },
              {
                do: 'navigate',
                url: { expr: 'lit', value: '/dashboard' },
              },
            ],
          },
        ],
        {}
      );

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const fetchStep = action?.steps[0] as {
        onSuccess?: Array<{ do: string }>;
      };
      expect(fetchStep.onSuccess?.length).toBe(2);
      expect(fetchStep.onSuccess?.[0]?.do).toBe('storage');
      expect(fetchStep.onSuccess?.[1]?.do).toBe('navigate');
    });

    it('should transform nested browser actions in onError callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'fetch',
            url: { expr: 'lit', value: 'https://api.example.com' },
            onError: [
              {
                do: 'storage',
                operation: 'get',
                key: { expr: 'lit', value: 'fallbackData' },
                storage: 'local',
                result: 'fallback',
              },
            ],
          },
        ],
        {}
      );

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const fetchStep = action?.steps[0] as {
        onError?: Array<{ do: string }>;
      };
      expect(fetchStep.onError?.length).toBe(1);
      expect(fetchStep.onError?.[0]?.do).toBe('storage');
    });
  });

  // ==================== CompiledProgram Type ====================

  describe('CompiledProgram type with browser actions', () => {
    it('should have correct CompiledStorageStep structure', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'storage',
          operation: 'set',
          key: { expr: 'lit', value: 'token' },
          value: { expr: 'lit', value: 'abc123' },
          storage: 'local',
          onSuccess: [
            { do: 'set', target: 'saved', value: { expr: 'lit', value: true } },
          ],
          onError: [
            { do: 'set', target: 'error', value: { expr: 'lit', value: 'Failed' } },
          ],
        },
      ], {
        saved: { type: 'boolean', initial: false },
        error: { type: 'string', initial: '' },
      });

      const context = createContext({ stateNames: ['saved', 'error'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'storage',
        operation: 'set',
        key: { expr: 'lit', value: 'token' },
        value: { expr: 'lit', value: 'abc123' },
        storage: 'local',
      });
    });

    it('should have correct CompiledClipboardStep structure', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'clipboard',
          operation: 'write',
          value: { expr: 'lit', value: 'copied text' },
          onSuccess: [
            { do: 'set', target: 'copied', value: { expr: 'lit', value: true } },
          ],
        },
      ], { copied: { type: 'boolean', initial: false } });

      const context = createContext({ stateNames: ['copied'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'lit', value: 'copied text' },
      });
    });

    it('should have correct CompiledNavigateStep structure', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'navigate',
          url: { expr: 'lit', value: '/dashboard' },
          target: '_self',
          replace: false,
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'navigate',
        url: { expr: 'lit', value: '/dashboard' },
        target: '_self',
        replace: false,
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should preserve storage step properties during transformation', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'storage',
          operation: 'get',
          key: { expr: 'lit', value: 'key' },
          storage: 'session',
          result: 'value',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        do: string;
        operation: string;
        storage: string;
        result: string;
      };
      expect(step.do).toBe('storage');
      expect(step.operation).toBe('get');
      expect(step.storage).toBe('session');
      expect(step.result).toBe('value');
    });

    it('should preserve clipboard step properties during transformation', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'clipboard',
          operation: 'read',
          result: 'clipboardContent',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        do: string;
        operation: string;
        result: string;
      };
      expect(step.do).toBe('clipboard');
      expect(step.operation).toBe('read');
      expect(step.result).toBe('clipboardContent');
    });

    it('should preserve navigate step properties during transformation', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'navigate',
          url: { expr: 'lit', value: '/page' },
          target: '_blank',
          replace: true,
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        do: string;
        target: string;
        replace: boolean;
      };
      expect(step.do).toBe('navigate');
      expect(step.target).toBe('_blank');
      expect(step.replace).toBe(true);
    });

    it('should handle empty onSuccess and onError callbacks', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'storage',
          operation: 'get',
          key: { expr: 'lit', value: 'key' },
          storage: 'local',
          onSuccess: [],
          onError: [],
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        onSuccess?: unknown[];
        onError?: unknown[];
      };
      expect(step.onSuccess).toEqual([]);
      expect(step.onError).toEqual([]);
    });
  });
});
