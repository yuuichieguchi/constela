/**
 * Test module for Lifecycle Hooks analysis.
 *
 * Coverage:
 * - Lifecycle hooks reference valid actions
 * - Error when hook references undefined action
 * - All hooks validated (onMount, onUnmount, onRouteEnter, onRouteLeave)
 *
 * TDD Red Phase: These tests verify the semantic analysis of lifecycle hooks
 * that will be added to support component lifecycle in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program } from '@constela/core';

describe('analyzePass with Lifecycle Hooks', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program for testing lifecycle hook analysis
   */
  function createProgramWithLifecycle(
    lifecycle: Record<string, string> | undefined,
    actions: Array<{ name: string; steps?: unknown[] }> = [],
    state: Record<string, unknown> = {}
  ): Program {
    return {
      version: '1.0',
      lifecycle,
      state,
      actions: actions.map((a) => ({
        name: a.name,
        steps: a.steps ?? [],
      })),
      view: { kind: 'element', tag: 'div' },
    } as unknown as Program;
  }

  // ==================== Valid Lifecycle Hooks ====================

  describe('valid lifecycle hooks', () => {
    it('should accept onMount referencing valid action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'initializeApp' },
        [{ name: 'initializeApp' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept onUnmount referencing valid action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onUnmount: 'cleanupApp' },
        [{ name: 'cleanupApp' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept onRouteEnter referencing valid action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteEnter: 'loadPageData' },
        [{ name: 'loadPageData' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept onRouteLeave referencing valid action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteLeave: 'saveUnsavedChanges' },
        [{ name: 'saveUnsavedChanges' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept all lifecycle hooks referencing valid actions', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'init',
          onUnmount: 'cleanup',
          onRouteEnter: 'load',
          onRouteLeave: 'save',
        },
        [
          { name: 'init' },
          { name: 'cleanup' },
          { name: 'load' },
          { name: 'save' },
        ]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept empty lifecycle object', () => {
      // Arrange
      const program = createProgramWithLifecycle({}, []);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept program without lifecycle field', () => {
      // Arrange
      const program = createProgramWithLifecycle(undefined, []);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept multiple hooks referencing the same action', () => {
      // Arrange - Same action for mount and route enter
      const program = createProgramWithLifecycle(
        {
          onMount: 'initializeData',
          onRouteEnter: 'initializeData',
        },
        [{ name: 'initializeData' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept lifecycle hooks with complex actions', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'complexInit' },
        [
          {
            name: 'complexInit',
            steps: [
              { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api/init' },
                result: 'response',
                onSuccess: [
                  { do: 'set', target: 'data', value: { expr: 'var', name: 'response' } },
                  { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
                ],
              },
            ],
          },
        ],
        {
          loading: { type: 'boolean', initial: false },
          data: { type: 'object', initial: {} },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Invalid Lifecycle Hooks ====================

  describe('invalid lifecycle hooks', () => {
    it('should reject onMount referencing undefined action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'nonExistentAction' },
        [] // No actions defined
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
        expect(result.errors[0]?.message).toContain('nonExistentAction');
      }
    });

    it('should reject onUnmount referencing undefined action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onUnmount: 'missingCleanup' },
        [{ name: 'otherAction' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
        expect(result.errors[0]?.message).toContain('missingCleanup');
      }
    });

    it('should reject onRouteEnter referencing undefined action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteEnter: 'missingLoader' },
        []
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
        expect(result.errors[0]?.message).toContain('missingLoader');
      }
    });

    it('should reject onRouteLeave referencing undefined action', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteLeave: 'missingSaver' },
        []
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
        expect(result.errors[0]?.message).toContain('missingSaver');
      }
    });

    it('should collect errors for multiple invalid hooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'missingInit',
          onUnmount: 'missingCleanup',
          onRouteEnter: 'missingLoader',
          onRouteLeave: 'missingSaver',
        },
        [] // No actions defined
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBe(4);
        expect(result.errors.every((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
      }
    });

    it('should provide meaningful error path for invalid onMount hook', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'missingAction' },
        []
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/lifecycle/onMount');
      }
    });

    it('should provide meaningful error path for invalid onUnmount hook', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onUnmount: 'missingAction' },
        []
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/lifecycle/onUnmount');
      }
    });

    it('should provide meaningful error path for invalid onRouteEnter hook', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteEnter: 'missingAction' },
        []
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/lifecycle/onRouteEnter');
      }
    });

    it('should provide meaningful error path for invalid onRouteLeave hook', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteLeave: 'missingAction' },
        []
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/lifecycle/onRouteLeave');
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle lifecycle hooks with route definition', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        lifecycle: {
          onRouteEnter: 'loadUser',
          onRouteLeave: 'clearUser',
        },
        state: {
          user: { type: 'object', initial: {} },
        },
        actions: [
          {
            name: 'loadUser',
            steps: [
              {
                do: 'fetch',
                url: {
                  expr: 'bin',
                  op: '+',
                  left: { expr: 'lit', value: '/api/users/' },
                  right: { expr: 'route', name: 'id' },
                },
              },
            ],
          },
          {
            name: 'clearUser',
            steps: [
              { do: 'set', target: 'user', value: { expr: 'lit', value: {} } },
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

    it('should handle partial lifecycle hooks (some valid, some invalid)', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'validInit', // Valid
          onUnmount: 'invalidCleanup', // Invalid
        },
        [{ name: 'validInit' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBe(1);
        expect(result.errors[0]?.message).toContain('invalidCleanup');
      }
    });

    it('should validate lifecycle hooks alongside other program elements', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'init' },
        [
          { name: 'init' },
          {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'count', value: { expr: 'lit', value: 1 } },
            ],
          },
        ],
        { count: { type: 'number', initial: 0 } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should report lifecycle hook errors alongside other errors', () => {
      // Arrange - Both lifecycle hook and state reference are invalid
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'missingAction',
        },
        state: {},
        actions: [
          {
            name: 'otherAction',
            steps: [
              { do: 'set', target: 'undefinedState', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
        const errorCodes = result.errors.map((e) => e.code);
        expect(errorCodes).toContain('UNDEFINED_ACTION');
        expect(errorCodes).toContain('UNDEFINED_STATE');
      }
    });

    it('should handle action name with special characters', () => {
      // Arrange - Action names should be valid identifiers
      const program = createProgramWithLifecycle(
        { onMount: 'init_app_data' },
        [{ name: 'init_app_data' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle case-sensitive action names', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'InitializeApp' }, // Note: different case
        [{ name: 'initializeApp' }] // Different case
      );

      // Act
      const result = analyzePass(program);

      // Assert - Should fail because action names are case-sensitive
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
      }
    });
  });

  // ==================== Context Building ====================

  describe('analysis context', () => {
    it('should include action names in context for lifecycle hook validation', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'init', onUnmount: 'cleanup' },
        [{ name: 'init' }, { name: 'cleanup' }, { name: 'extraAction' }]
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
      // Context should have all action names for hook validation
    });

    it('should validate lifecycle hooks after collecting all action names', () => {
      // Arrange - Action defined after lifecycle hooks
      // This tests that analysis collects all actions before validating hooks
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'laterDefinedAction',
        },
        state: {},
        actions: [
          { name: 'laterDefinedAction', steps: [] },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});
