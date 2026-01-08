/**
 * Test module for Lifecycle Hooks transformation.
 *
 * Coverage:
 * - LifecycleHooks transforms to CompiledLifecycleHooks
 * - CompiledProgram includes lifecycle
 * - All hook types preserved during transformation
 *
 * TDD Red Phase: These tests verify the transformation of lifecycle hooks
 * that will be added to support component lifecycle in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';
import type { CompiledProgram, CompiledLifecycleHooks } from '../../index.js';

describe('transformPass with Lifecycle Hooks', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(options: {
    stateNames?: string[];
    actionNames?: string[];
  } = {}): AnalysisContext {
    return {
      stateNames: new Set<string>(options.stateNames ?? []),
      actionNames: new Set<string>(options.actionNames ?? []),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(),
      importNames: new Set<string>(),
      dataNames: new Set<string>(),
    };
  }

  /**
   * Creates a minimal Program for testing lifecycle hook transformation
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

  // ==================== Basic Transformation ====================

  describe('basic lifecycle transformation', () => {
    it('should transform onMount to CompiledLifecycleHooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'initializeApp' },
        [{ name: 'initializeApp' }]
      );
      const context = createContext({ actionNames: ['initializeApp'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle).toBeDefined();
      expect(result.lifecycle?.onMount).toBe('initializeApp');
    });

    it('should transform onUnmount to CompiledLifecycleHooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onUnmount: 'cleanupApp' },
        [{ name: 'cleanupApp' }]
      );
      const context = createContext({ actionNames: ['cleanupApp'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle).toBeDefined();
      expect(result.lifecycle?.onUnmount).toBe('cleanupApp');
    });

    it('should transform onRouteEnter to CompiledLifecycleHooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteEnter: 'loadPageData' },
        [{ name: 'loadPageData' }]
      );
      const context = createContext({ actionNames: ['loadPageData'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle).toBeDefined();
      expect(result.lifecycle?.onRouteEnter).toBe('loadPageData');
    });

    it('should transform onRouteLeave to CompiledLifecycleHooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onRouteLeave: 'saveUnsavedChanges' },
        [{ name: 'saveUnsavedChanges' }]
      );
      const context = createContext({ actionNames: ['saveUnsavedChanges'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle).toBeDefined();
      expect(result.lifecycle?.onRouteLeave).toBe('saveUnsavedChanges');
    });

    it('should transform all lifecycle hooks together', () => {
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
      const context = createContext({
        actionNames: ['init', 'cleanup', 'load', 'save'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle).toEqual({
        onMount: 'init',
        onUnmount: 'cleanup',
        onRouteEnter: 'load',
        onRouteLeave: 'save',
      });
    });
  });

  // ==================== Optional Lifecycle ====================

  describe('optional lifecycle handling', () => {
    it('should handle program without lifecycle field', () => {
      // Arrange
      const program = createProgramWithLifecycle(undefined, []);
      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle).toBeUndefined();
    });

    it('should handle empty lifecycle object', () => {
      // Arrange
      const program = createProgramWithLifecycle({}, []);
      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      // Empty lifecycle should be omitted or empty object
      expect(result.lifecycle === undefined || Object.keys(result.lifecycle).length === 0).toBe(true);
    });

    it('should preserve partial lifecycle hooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'init',
          // onUnmount, onRouteEnter, onRouteLeave are undefined
        },
        [{ name: 'init' }]
      );
      const context = createContext({ actionNames: ['init'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onMount).toBe('init');
      expect(result.lifecycle?.onUnmount).toBeUndefined();
      expect(result.lifecycle?.onRouteEnter).toBeUndefined();
      expect(result.lifecycle?.onRouteLeave).toBeUndefined();
    });
  });

  // ==================== CompiledProgram Structure ====================

  describe('CompiledProgram structure', () => {
    it('should include lifecycle in CompiledProgram', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'init' },
        [{ name: 'init' }]
      );
      const context = createContext({ actionNames: ['init'] });

      // Act
      const result: CompiledProgram = transformPass(program, context);

      // Assert
      expect(result.version).toBe('1.0');
      expect(result.lifecycle).toBeDefined();
      expect(result.actions).toBeDefined();
      expect(result.view).toBeDefined();
    });

    it('should have correct CompiledLifecycleHooks type', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'initAction',
          onUnmount: 'cleanupAction',
        },
        [{ name: 'initAction' }, { name: 'cleanupAction' }]
      );
      const context = createContext({
        actionNames: ['initAction', 'cleanupAction'],
      });

      // Act
      const result = transformPass(program, context);
      const lifecycle: CompiledLifecycleHooks | undefined = result.lifecycle;

      // Assert
      expect(lifecycle?.onMount).toBe('initAction');
      expect(lifecycle?.onUnmount).toBe('cleanupAction');
    });

    it('should preserve other program fields alongside lifecycle', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'init',
        },
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: [
          { name: 'init', steps: [] },
          {
            name: 'increment',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
      } as unknown as Program;
      const context = createContext({
        stateNames: ['count'],
        actionNames: ['init', 'increment'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onMount).toBe('init');
      expect(result.state).toBeDefined();
      expect(result.actions['init']).toBeDefined();
      expect(result.actions['increment']).toBeDefined();
      expect(result.view).toBeDefined();
    });
  });

  // ==================== Lifecycle with Route ====================

  describe('lifecycle with route', () => {
    it('should transform lifecycle hooks with route definition', () => {
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
          { name: 'loadUser', steps: [] },
          { name: 'clearUser', steps: [] },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;
      const context = createContext({
        actionNames: ['loadUser', 'clearUser'],
        stateNames: ['user'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.route).toBeDefined();
      expect(result.route?.path).toBe('/users/:id');
      expect(result.lifecycle?.onRouteEnter).toBe('loadUser');
      expect(result.lifecycle?.onRouteLeave).toBe('clearUser');
    });

    it('should preserve route params in route expression for lifecycle actions', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
        },
        lifecycle: {
          onRouteEnter: 'loadUser',
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
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;
      const context = createContext({
        actionNames: ['loadUser'],
        stateNames: ['user'],
      });
      context.routeParams = new Set(['id']);

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onRouteEnter).toBe('loadUser');
      const loadUserAction = result.actions['loadUser'];
      expect(loadUserAction).toBeDefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle action names with underscores', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'init_app_data' },
        [{ name: 'init_app_data' }]
      );
      const context = createContext({ actionNames: ['init_app_data'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onMount).toBe('init_app_data');
    });

    it('should handle action names with numbers', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'init2' },
        [{ name: 'init2' }]
      );
      const context = createContext({ actionNames: ['init2'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onMount).toBe('init2');
    });

    it('should preserve lifecycle when transforming complex program', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        lifecycle: {
          onMount: 'init',
          onUnmount: 'cleanup',
        },
        state: {
          items: { type: 'list', initial: [] },
          loading: { type: 'boolean', initial: false },
        },
        actions: [
          {
            name: 'init',
            steps: [
              { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api/items' },
                onSuccess: [
                  { do: 'set', target: 'items', value: { expr: 'var', name: 'response' } },
                ],
              },
              { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
            ],
          },
          {
            name: 'cleanup',
            steps: [
              { do: 'set', target: 'items', value: { expr: 'lit', value: [] } },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'text',
                value: { expr: 'var', name: 'item' },
              },
            },
          ],
        },
      } as unknown as Program;
      const context = createContext({
        stateNames: ['items', 'loading'],
        actionNames: ['init', 'cleanup'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onMount).toBe('init');
      expect(result.lifecycle?.onUnmount).toBe('cleanup');
      expect(result.actions['init']?.steps.length).toBe(3);
      expect(result.actions['cleanup']?.steps.length).toBe(1);
    });

    it('should handle same action for multiple lifecycle hooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'initData',
          onRouteEnter: 'initData',
        },
        [{ name: 'initData' }]
      );
      const context = createContext({ actionNames: ['initData'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      expect(result.lifecycle?.onMount).toBe('initData');
      expect(result.lifecycle?.onRouteEnter).toBe('initData');
    });
  });

  // ==================== Type Compatibility ====================

  describe('CompiledLifecycleHooks type compatibility', () => {
    it('should allow undefined hooks in CompiledLifecycleHooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        { onMount: 'init' },
        [{ name: 'init' }]
      );
      const context = createContext({ actionNames: ['init'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const lifecycle: CompiledLifecycleHooks | undefined = result.lifecycle;
      expect(lifecycle?.onMount).toBe('init');
      expect(lifecycle?.onUnmount).toBeUndefined();
      expect(lifecycle?.onRouteEnter).toBeUndefined();
      expect(lifecycle?.onRouteLeave).toBeUndefined();
    });

    it('should correctly type all lifecycle hooks', () => {
      // Arrange
      const program = createProgramWithLifecycle(
        {
          onMount: 'mount',
          onUnmount: 'unmount',
          onRouteEnter: 'enter',
          onRouteLeave: 'leave',
        },
        [
          { name: 'mount' },
          { name: 'unmount' },
          { name: 'enter' },
          { name: 'leave' },
        ]
      );
      const context = createContext({
        actionNames: ['mount', 'unmount', 'enter', 'leave'],
      });

      // Act
      const result = transformPass(program, context);
      const lifecycle = result.lifecycle as CompiledLifecycleHooks;

      // Assert
      expect(typeof lifecycle.onMount).toBe('string');
      expect(typeof lifecycle.onUnmount).toBe('string');
      expect(typeof lifecycle.onRouteEnter).toBe('string');
      expect(typeof lifecycle.onRouteLeave).toBe('string');
    });
  });
});
