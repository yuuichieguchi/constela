/**
 * Test module for Lifecycle Hooks types.
 *
 * Coverage:
 * - LifecycleHooks type structure
 * - Program with lifecycle field
 * - isLifecycleHooks type guard
 * - All hooks are optional
 *
 * TDD Red Phase: These tests verify the lifecycle hooks types
 * that will be added to support component lifecycle in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type {
  LifecycleHooks,
  Program,
} from '../ast.js';
import {
  isLifecycleHooks,
} from '../guards.js';

describe('LifecycleHooks', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have optional onMount field as string (action name)', () => {
      // Arrange
      const hooks: LifecycleHooks = {
        onMount: 'initializeApp',
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should have optional onUnmount field as string (action name)', () => {
      // Arrange
      const hooks: LifecycleHooks = {
        onUnmount: 'cleanupApp',
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should have optional onRouteEnter field as string (action name)', () => {
      // Arrange
      const hooks: LifecycleHooks = {
        onRouteEnter: 'loadPageData',
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should have optional onRouteLeave field as string (action name)', () => {
      // Arrange
      const hooks: LifecycleHooks = {
        onRouteLeave: 'saveUnsavedChanges',
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should accept all hooks together', () => {
      // Arrange
      const hooks: LifecycleHooks = {
        onMount: 'initializeApp',
        onUnmount: 'cleanupApp',
        onRouteEnter: 'loadPageData',
        onRouteLeave: 'saveUnsavedChanges',
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should accept empty object (all hooks optional)', () => {
      // Arrange
      const hooks: LifecycleHooks = {};

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should accept partial hooks', () => {
      // Arrange
      const hooks1: LifecycleHooks = {
        onMount: 'init',
        onUnmount: 'cleanup',
      };

      const hooks2: LifecycleHooks = {
        onRouteEnter: 'load',
        onRouteLeave: 'save',
      };

      // Assert
      expect(isLifecycleHooks(hooks1)).toBe(true);
      expect(isLifecycleHooks(hooks2)).toBe(true);
    });
  });

  // ==================== Type Guard ====================

  describe('isLifecycleHooks type guard', () => {
    it('should return true for valid lifecycle hooks object', () => {
      // Arrange
      const hooks = {
        onMount: 'initializeApp',
        onUnmount: 'cleanupApp',
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(true);
    });

    it('should return true for empty object', () => {
      // Assert
      expect(isLifecycleHooks({})).toBe(true);
    });

    it('should return false for null', () => {
      expect(isLifecycleHooks(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLifecycleHooks(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isLifecycleHooks('string')).toBe(false);
      expect(isLifecycleHooks(123)).toBe(false);
      expect(isLifecycleHooks(true)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isLifecycleHooks(['onMount', 'init'])).toBe(false);
    });

    it('should return false when onMount is not a string', () => {
      // Arrange
      const hooks = {
        onMount: 123,
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(false);
    });

    it('should return false when onUnmount is not a string', () => {
      // Arrange
      const hooks = {
        onUnmount: { action: 'cleanup' },
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(false);
    });

    it('should return false when onRouteEnter is not a string', () => {
      // Arrange
      const hooks = {
        onRouteEnter: ['load', 'data'],
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(false);
    });

    it('should return false when onRouteLeave is not a string', () => {
      // Arrange
      const hooks = {
        onRouteLeave: null,
      };

      // Assert
      expect(isLifecycleHooks(hooks)).toBe(false);
    });

    it('should accept hooks with extra unknown properties', () => {
      // Note: Type guard should be permissive for extensibility
      // Arrange
      const hooks = {
        onMount: 'init',
        customHook: 'custom', // Extra property
      };

      // Assert - depends on implementation choice
      // If strict, should be false; if permissive, should be true
      // This test documents the expected behavior
      expect(isLifecycleHooks(hooks)).toBe(true);
    });
  });
});

describe('Program with lifecycle field', () => {
  // ==================== Program Structure ====================

  describe('Program structure', () => {
    it('should accept Program with lifecycle field', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'initializeApp',
        },
        state: {
          initialized: { type: 'boolean', initial: false },
        },
        actions: [
          {
            name: 'initializeApp',
            steps: [
              { do: 'set', target: 'initialized', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.lifecycle).toBeDefined();
      expect(program.lifecycle?.onMount).toBe('initializeApp');
    });

    it('should accept Program without lifecycle field (optional)', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.lifecycle).toBeUndefined();
    });

    it('should accept Program with all lifecycle hooks', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'init',
          onUnmount: 'cleanup',
          onRouteEnter: 'load',
          onRouteLeave: 'save',
        },
        state: {},
        actions: [
          { name: 'init', steps: [] },
          { name: 'cleanup', steps: [] },
          { name: 'load', steps: [] },
          { name: 'save', steps: [] },
        ],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.lifecycle?.onMount).toBe('init');
      expect(program.lifecycle?.onUnmount).toBe('cleanup');
      expect(program.lifecycle?.onRouteEnter).toBe('load');
      expect(program.lifecycle?.onRouteLeave).toBe('save');
    });

    it('should accept Program with empty lifecycle object', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        lifecycle: {},
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.lifecycle).toEqual({});
    });

    it('should accept Program with route and lifecycle', () => {
      // Arrange - Common use case: route-specific lifecycle hooks
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
                result: 'response',
                onSuccess: [
                  { do: 'set', target: 'user', value: { expr: 'var', name: 'response' } },
                ],
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
      };

      // Assert
      expect(program.route?.path).toBe('/users/:id');
      expect(program.lifecycle?.onRouteEnter).toBe('loadUser');
      expect(program.lifecycle?.onRouteLeave).toBe('clearUser');
    });
  });

  // ==================== TypeScript Type Compatibility ====================

  describe('TypeScript type compatibility', () => {
    it('should allow assigning LifecycleHooks to Program.lifecycle', () => {
      // Arrange
      const hooks: LifecycleHooks = {
        onMount: 'init',
        onUnmount: 'cleanup',
      };

      const program: Program = {
        version: '1.0',
        lifecycle: hooks,
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.lifecycle).toBe(hooks);
    });

    it('should allow accessing undefined lifecycle hooks', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'init',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert - TypeScript should allow optional chaining
      expect(program.lifecycle?.onMount).toBe('init');
      expect(program.lifecycle?.onUnmount).toBeUndefined();
      expect(program.lifecycle?.onRouteEnter).toBeUndefined();
      expect(program.lifecycle?.onRouteLeave).toBeUndefined();
    });
  });
});
