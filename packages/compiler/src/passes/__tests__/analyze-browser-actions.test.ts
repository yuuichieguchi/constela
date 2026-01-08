/**
 * Test module for Browser Actions analysis.
 *
 * Coverage:
 * - Storage step validation (operation, key, value requirements)
 * - Clipboard step validation
 * - Navigate step validation
 * - Error for invalid operations
 * - Expression validation within browser action steps
 *
 * TDD Red Phase: These tests verify the semantic analysis of browser action steps
 * that will be added to support browser APIs in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program } from '@constela/core';

describe('analyzePass with Browser Actions', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program for testing browser action analysis
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

  // ==================== Storage Step Validation ====================

  describe('storage step validation', () => {
    describe('valid storage steps', () => {
      it('should accept storage get step with valid key and result', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage set step with key and value', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'settings' },
            value: { expr: 'lit', value: '{"theme":"dark"}' },
            storage: 'local',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage remove step with valid key', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'remove',
            key: { expr: 'lit', value: 'cachedData' },
            storage: 'session',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage step with sessionStorage', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'tempData' },
            value: { expr: 'lit', value: 'temporary' },
            storage: 'session',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage step with dynamic key from state', () => {
        // Arrange
        const program = createProgramWithAction(
          [
            {
              do: 'storage',
              operation: 'get',
              key: { expr: 'state', name: 'storageKey' },
              storage: 'local',
              result: 'data',
            },
          ],
          { storageKey: { type: 'string', initial: 'myKey' } }
        );

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage step with dynamic value from state', () => {
        // Arrange
        const program = createProgramWithAction(
          [
            {
              do: 'storage',
              operation: 'set',
              key: { expr: 'lit', value: 'userData' },
              value: { expr: 'state', name: 'user' },
              storage: 'local',
            },
          ],
          { user: { type: 'object', initial: {} } }
        );

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage step with onSuccess callbacks', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept storage step with onError callbacks', () => {
        // Arrange
        const program = createProgramWithAction(
          [
            {
              do: 'storage',
              operation: 'get',
              key: { expr: 'lit', value: 'token' },
              storage: 'local',
              result: 'authToken',
              onError: [
                { do: 'set', target: 'hasError', value: { expr: 'lit', value: true } },
              ],
            },
          ],
          { hasError: { type: 'boolean', initial: false } }
        );

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });
    });

    describe('invalid storage steps', () => {
      it('should reject storage step with invalid operation', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'clear', // Invalid: only get, set, remove allowed
            key: { expr: 'lit', value: 'key' },
            storage: 'local',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('INVALID_STORAGE_OPERATION');
        }
      });

      it('should reject storage step with invalid storage type', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'key' },
            storage: 'memory', // Invalid: only local or session allowed
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('INVALID_STORAGE_TYPE');
        }
      });

      it('should reject storage set step without value', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'key' },
            storage: 'local',
            // Missing value field for set operation
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('STORAGE_SET_MISSING_VALUE');
        }
      });

      it('should reject storage step with undefined state reference in key', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'state', name: 'undefinedKey' },
            storage: 'local',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        }
      });

      it('should reject storage step with undefined state reference in value', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'set',
            key: { expr: 'lit', value: 'key' },
            value: { expr: 'state', name: 'undefinedValue' },
            storage: 'local',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        }
      });

      it('should reject storage step with invalid state reference in onSuccess', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'key' },
            storage: 'local',
            onSuccess: [
              { do: 'set', target: 'undefinedState', value: { expr: 'lit', value: true } },
            ],
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        }
      });

      it('should provide meaningful error path for invalid storage step', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'storage',
            operation: 'invalid',
            key: { expr: 'lit', value: 'key' },
            storage: 'local',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
        }
      });
    });
  });

  // ==================== Clipboard Step Validation ====================

  describe('clipboard step validation', () => {
    describe('valid clipboard steps', () => {
      it('should accept clipboard write step with value', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'text to copy' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept clipboard read step with result', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'read',
            result: 'pastedContent',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept clipboard write step with state value', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept clipboard step with onSuccess callbacks', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept clipboard step with onError callbacks', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept clipboard write with binary expression value', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });
    });

    describe('invalid clipboard steps', () => {
      it('should reject clipboard step with invalid operation', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'copy', // Invalid: only write or read allowed
            value: { expr: 'lit', value: 'text' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('INVALID_CLIPBOARD_OPERATION');
        }
      });

      it('should reject clipboard write step without value', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'write',
            // Missing value field for write operation
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('CLIPBOARD_WRITE_MISSING_VALUE');
        }
      });

      it('should reject clipboard step with undefined state reference', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'state', name: 'undefinedText' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        }
      });

      it('should reject clipboard step with invalid state in onSuccess', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'write',
            value: { expr: 'lit', value: 'text' },
            onSuccess: [
              { do: 'set', target: 'undefinedState', value: { expr: 'lit', value: true } },
            ],
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        }
      });

      it('should provide meaningful error path for invalid clipboard step', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'clipboard',
            operation: 'invalid',
            value: { expr: 'lit', value: 'text' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
        }
      });
    });
  });

  // ==================== Navigate Step Validation ====================

  describe('navigate step validation', () => {
    describe('valid navigate steps', () => {
      it('should accept navigate step with literal url', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/dashboard' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with external url', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: 'https://example.com' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with _self target', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/page' },
            target: '_self',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with _blank target', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: 'https://external.com' },
            target: '_blank',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with replace option', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/new-page' },
            replace: true,
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with dynamic url from state', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with binary expression url', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });

      it('should accept navigate step with route expression url', () => {
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

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      });
    });

    describe('invalid navigate steps', () => {
      it('should reject navigate step with invalid target', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/page' },
            target: '_parent', // Invalid: only _self or _blank allowed
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('INVALID_NAVIGATE_TARGET');
        }
      });

      it('should reject navigate step with undefined state reference in url', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'state', name: 'undefinedUrl' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
        }
      });

      it('should reject navigate step with invalid route reference', () => {
        // Arrange - No route defined but using route expression
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'route', name: 'id' },
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.code).toBe('ROUTE_NOT_DEFINED');
        }
      });

      it('should provide meaningful error path for invalid navigate step', () => {
        // Arrange
        const program = createProgramWithAction([
          {
            do: 'navigate',
            url: { expr: 'lit', value: '/page' },
            target: 'invalid',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
        }
      });
    });
  });

  // ==================== Mixed Browser Actions ====================

  describe('mixed browser actions with existing step types', () => {
    it('should accept action with storage, clipboard, and navigate steps', () => {
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

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept action with browser actions and existing step types', () => {
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
            onSuccess: [
              { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
              {
                do: 'storage',
                operation: 'set',
                key: { expr: 'lit', value: 'cachedData' },
                value: { expr: 'var', name: 'response' },
                storage: 'local',
              },
            ],
          },
        ],
        { loading: { type: 'boolean', initial: false } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should collect multiple errors from different browser action steps', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'storage',
          operation: 'invalid',
          key: { expr: 'lit', value: 'key' },
          storage: 'local',
        },
        {
          do: 'clipboard',
          operation: 'invalid',
          value: { expr: 'lit', value: 'text' },
        },
        {
          do: 'navigate',
          url: { expr: 'state', name: 'undefinedUrl' },
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle nested browser actions in onSuccess callbacks', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'storage',
            operation: 'get',
            key: { expr: 'lit', value: 'settings' },
            storage: 'local',
            result: 'settings',
            onSuccess: [
              {
                do: 'clipboard',
                operation: 'write',
                value: { expr: 'var', name: 'settings' },
              },
            ],
          },
        ],
        {}
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle deeply nested browser actions', () => {
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
                onSuccess: [
                  {
                    do: 'navigate',
                    url: { expr: 'lit', value: '/dashboard' },
                  },
                ],
              },
            ],
          },
        ],
        {}
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle browser action in fetch onError callback', () => {
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

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});
