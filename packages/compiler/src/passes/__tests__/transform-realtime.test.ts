/**
 * Test module for Realtime ActionStep transformation.
 *
 * Coverage:
 * - SSEConnectStep transforms to CompiledSSEConnectStep
 * - SSECloseStep transforms to CompiledSSECloseStep
 * - OptimisticStep transforms to CompiledOptimisticStep
 * - ConfirmStep transforms to CompiledConfirmStep
 * - RejectStep transforms to CompiledRejectStep
 * - BindStep transforms to CompiledBindStep
 * - UnbindStep transforms to CompiledUnbindStep
 * - Expression transformation within realtime steps
 *
 * TDD Red Phase: These tests verify the transformation of realtime action steps
 * that will be added to support SSE, optimistic updates, and data binding.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';

describe('transformPass with Realtime ActionSteps', () => {
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
   * Creates a minimal Program for testing realtime action transformation
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

  // ==================== SSE Connect Step Transformation ====================

  describe('SSEConnectStep transformation', () => {
    it('should transform sseConnect step with basic configuration', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'sseConnect',
          connection: 'notif',
          url: { expr: 'lit', value: '/stream' },
          eventTypes: ['message'],
          onOpen: [],
          onMessage: [],
          onError: [],
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'sseConnect',
        connection: 'notif',
        url: { expr: 'lit', value: '/stream' },
        eventTypes: ['message'],
      });
    });

    it('should transform sseConnect step with reconnect configuration', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'sseConnect',
          connection: 'notif',
          url: { expr: 'lit', value: '/stream' },
          eventTypes: ['message'],
          reconnect: {
            enabled: true,
            strategy: 'exponential',
            maxRetries: 5,
            baseDelay: 1000,
          },
          onOpen: [],
          onMessage: [],
          onError: [],
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        do: string;
        reconnect: { enabled: boolean; strategy: string; maxRetries: number; baseDelay: number };
      };
      expect(step.do).toBe('sseConnect');
      expect(step.reconnect).toEqual({
        enabled: true,
        strategy: 'exponential',
        maxRetries: 5,
        baseDelay: 1000,
      });
    });

    it('should transform sseConnect step with dynamic url from state', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: {
              expr: 'bin',
              op: '+',
              left: { expr: 'lit', value: '/stream/' },
              right: { expr: 'state', name: 'userId' },
            },
            onOpen: [],
            onMessage: [],
            onError: [],
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
        url: { expr: string; op: string; left: { expr: string }; right: { expr: string; name: string } };
      };
      expect(step.url.expr).toBe('bin');
      expect(step.url.op).toBe('+');
      expect(step.url.right.expr).toBe('state');
      expect(step.url.right.name).toBe('userId');
    });

    it('should transform sseConnect step with onOpen callback steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [
              { do: 'set', target: 'connected', value: { expr: 'lit', value: true } },
            ],
            onMessage: [],
            onError: [],
          },
        ],
        { connected: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['connected'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onOpen?: Array<{ do: string; target: string }>;
      };
      expect(step.onOpen).toBeDefined();
      expect(step.onOpen?.length).toBe(1);
      expect(step.onOpen?.[0]?.do).toBe('set');
      expect(step.onOpen?.[0]?.target).toBe('connected');
    });

    it('should transform sseConnect step with onMessage callback steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [
              { do: 'set', target: 'lastMessage', value: { expr: 'var', name: 'event' } },
            ],
            onError: [],
          },
        ],
        { lastMessage: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['lastMessage'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onMessage?: Array<{ do: string }>;
      };
      expect(step.onMessage).toBeDefined();
      expect(step.onMessage?.length).toBe(1);
    });

    it('should transform sseConnect step with onError callback steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [],
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
        onError?: Array<{ do: string }>;
      };
      expect(step.onError).toBeDefined();
      expect(step.onError?.length).toBe(1);
    });
  });

  // ==================== SSE Close Step Transformation ====================

  describe('SSECloseStep transformation', () => {
    it('should transform sseClose step to CompiledSSECloseStep', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'sseClose',
          connection: 'notif',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'sseClose',
        connection: 'notif',
      });
    });
  });

  // ==================== Optimistic Step Transformation ====================

  describe('OptimisticStep transformation', () => {
    it('should transform optimistic step with all options', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            result: 'updateId',
            timeout: 5000,
          },
        ],
        { items: { type: 'list', initial: [{ liked: false }] } }
      );

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'optimistic',
        target: 'items',
        path: { expr: 'lit', value: [0, 'liked'] },
        value: { expr: 'lit', value: true },
        result: 'updateId',
        timeout: 5000,
      });
    });

    it('should transform optimistic step with dynamic path', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'optimistic',
            target: 'items',
            path: {
              expr: 'array',
              elements: [
                { expr: 'state', name: 'currentIndex' },
                { expr: 'lit', value: 'liked' },
              ],
            },
            value: { expr: 'lit', value: true },
          },
        ],
        { items: { type: 'list', initial: [] }, currentIndex: { type: 'number', initial: 0 } }
      );

      const context = createContext({ stateNames: ['items', 'currentIndex'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        path: { expr: string; elements: unknown[] };
      };
      expect(step.path.expr).toBe('array');
      expect(step.path.elements.length).toBe(2);
    });

    it('should transform optimistic step with dynamic value from state', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'optimistic',
            target: 'items',
            value: { expr: 'state', name: 'newValue' },
          },
        ],
        { items: { type: 'list', initial: [] }, newValue: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['items', 'newValue'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        value: { expr: string; name: string };
      };
      expect(step.value.expr).toBe('state');
      expect(step.value.name).toBe('newValue');
    });

    it('should transform optimistic step without optional path', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'optimistic',
            target: 'items',
            value: { expr: 'lit', value: [] },
          },
        ],
        { items: { type: 'list', initial: [] } }
      );

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        do: string;
        target: string;
        path?: unknown;
      };
      expect(step.do).toBe('optimistic');
      expect(step.target).toBe('items');
      expect(step.path).toBeUndefined();
    });
  });

  // ==================== Confirm Step Transformation ====================

  describe('ConfirmStep transformation', () => {
    it('should transform confirm step with variable id', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'confirm',
          id: { expr: 'var', name: 'updateId' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'confirm',
        id: { expr: 'var', name: 'updateId' },
      });
    });

    it('should transform confirm step with literal id', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'confirm',
          id: { expr: 'lit', value: 'fixed-id-123' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        id: { expr: string; value: string };
      };
      expect(step.id.expr).toBe('lit');
      expect(step.id.value).toBe('fixed-id-123');
    });
  });

  // ==================== Reject Step Transformation ====================

  describe('RejectStep transformation', () => {
    it('should transform reject step with variable id', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'reject',
          id: { expr: 'var', name: 'updateId' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'reject',
        id: { expr: 'var', name: 'updateId' },
      });
    });

    it('should transform reject step with state-based id', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'reject',
            id: { expr: 'state', name: 'pendingUpdateId' },
          },
        ],
        { pendingUpdateId: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['pendingUpdateId'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        id: { expr: string; name: string };
      };
      expect(step.id.expr).toBe('state');
      expect(step.id.name).toBe('pendingUpdateId');
    });
  });

  // ==================== Bind Step Transformation ====================

  describe('BindStep transformation', () => {
    it('should transform bind step with all options', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'bind',
            connection: 'ws',
            eventType: 'update',
            target: 'data',
            path: { expr: 'lit', value: ['items'] },
            patch: true,
          },
        ],
        { data: { type: 'object', initial: { items: [] } } }
      );

      const context = createContext({ stateNames: ['data'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'bind',
        connection: 'ws',
        eventType: 'update',
        target: 'data',
        path: { expr: 'lit', value: ['items'] },
        patch: true,
      });
    });

    it('should transform bind step with minimal options', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'bind',
            connection: 'ws',
            target: 'messages',
          },
        ],
        { messages: { type: 'list', initial: [] } }
      );

      const context = createContext({ stateNames: ['messages'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        do: string;
        connection: string;
        target: string;
        eventType?: string;
        path?: unknown;
        patch?: boolean;
      };
      expect(step.do).toBe('bind');
      expect(step.connection).toBe('ws');
      expect(step.target).toBe('messages');
      expect(step.eventType).toBeUndefined();
      expect(step.path).toBeUndefined();
      expect(step.patch).toBeUndefined();
    });

    it('should transform bind step with transform expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
            transform: {
              expr: 'get',
              base: { expr: 'var', name: 'msg' },
              path: 'payload',
            },
          },
        ],
        { data: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['data'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        transform?: { expr: string; base: { expr: string }; path: string };
      };
      expect(step.transform).toBeDefined();
      expect(step.transform?.expr).toBe('get');
      expect(step.transform?.path).toBe('payload');
    });

    it('should transform bind step with dynamic path expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
            path: {
              expr: 'array',
              elements: [
                { expr: 'lit', value: 'users' },
                { expr: 'state', name: 'selectedUserId' },
              ],
            },
          },
        ],
        { data: { type: 'object', initial: {} }, selectedUserId: { type: 'number', initial: 0 } }
      );

      const context = createContext({ stateNames: ['data', 'selectedUserId'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        path?: { expr: string; elements: unknown[] };
      };
      expect(step.path?.expr).toBe('array');
      expect(step.path?.elements.length).toBe(2);
    });
  });

  // ==================== Unbind Step Transformation ====================

  describe('UnbindStep transformation', () => {
    it('should transform unbind step', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'unbind',
          connection: 'ws',
          target: 'data',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'unbind',
        connection: 'ws',
        target: 'data',
      });
    });
  });

  // ==================== Mixed Realtime Steps ====================

  describe('mixed realtime action steps', () => {
    it('should transform action with multiple realtime steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'sseConnect',
            connection: 'notif',
            url: { expr: 'lit', value: '/stream' },
            onOpen: [],
            onMessage: [],
            onError: [],
          },
          {
            do: 'bind',
            connection: 'notif',
            target: 'notifications',
          },
          {
            do: 'optimistic',
            target: 'items',
            value: { expr: 'lit', value: true },
          },
        ],
        { notifications: { type: 'list', initial: [] }, items: { type: 'list', initial: [] } }
      );

      const context = createContext({ stateNames: ['notifications', 'items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps.length).toBe(3);

      const step1 = action?.steps[0] as { do: string };
      const step2 = action?.steps[1] as { do: string };
      const step3 = action?.steps[2] as { do: string };

      expect(step1.do).toBe('sseConnect');
      expect(step2.do).toBe('bind');
      expect(step3.do).toBe('optimistic');
    });

    it('should transform action with realtime and regular steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
          {
            do: 'sseConnect',
            connection: 'live',
            url: { expr: 'lit', value: '/live' },
            onOpen: [],
            onMessage: [],
            onError: [],
          },
          { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
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
      expect(step2.do).toBe('sseConnect');
      expect(step3.do).toBe('set');
    });

    it('should transform optimistic/confirm/reject workflow in sequence', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'optimistic',
            target: 'items',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
            result: 'updateId',
          },
          {
            do: 'fetch',
            url: { expr: 'lit', value: '/api/like' },
            method: 'POST',
            onSuccess: [
              { do: 'confirm', id: { expr: 'var', name: 'updateId' } },
            ],
            onError: [
              { do: 'reject', id: { expr: 'var', name: 'updateId' } },
            ],
          },
        ],
        { items: { type: 'list', initial: [{ liked: false }] } }
      );

      const context = createContext({ stateNames: ['items'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps.length).toBe(2);

      const step1 = action?.steps[0] as { do: string; result: string };
      const step2 = action?.steps[1] as {
        do: string;
        onSuccess?: Array<{ do: string }>;
        onError?: Array<{ do: string }>;
      };

      expect(step1.do).toBe('optimistic');
      expect(step1.result).toBe('updateId');
      expect(step2.do).toBe('fetch');
      expect(step2.onSuccess?.[0]?.do).toBe('confirm');
      expect(step2.onError?.[0]?.do).toBe('reject');
    });

    it('should transform bind/unbind lifecycle pattern', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'bind',
            connection: 'ws',
            eventType: 'update',
            target: 'data',
          },
          {
            do: 'unbind',
            connection: 'ws',
            target: 'data',
          },
        ],
        { data: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['data'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps.length).toBe(2);

      const step1 = action?.steps[0] as { do: string; connection: string };
      const step2 = action?.steps[1] as { do: string; connection: string };

      expect(step1.do).toBe('bind');
      expect(step1.connection).toBe('ws');
      expect(step2.do).toBe('unbind');
      expect(step2.connection).toBe('ws');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should preserve sseConnect step properties during transformation', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'sseConnect',
          connection: 'stream',
          url: { expr: 'lit', value: '/sse' },
          eventTypes: ['message', 'error', 'custom'],
          reconnect: {
            enabled: true,
            strategy: 'linear',
            maxRetries: 3,
            baseDelay: 500,
            maxDelay: 5000,
          },
          onOpen: [],
          onMessage: [],
          onError: [],
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        do: string;
        connection: string;
        eventTypes: string[];
        reconnect: { strategy: string; maxDelay: number };
      };
      expect(step.do).toBe('sseConnect');
      expect(step.connection).toBe('stream');
      expect(step.eventTypes).toEqual(['message', 'error', 'custom']);
      expect(step.reconnect.strategy).toBe('linear');
      expect(step.reconnect.maxDelay).toBe(5000);
    });

    it('should handle empty callback arrays in sseConnect', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'sseConnect',
          connection: 'stream',
          url: { expr: 'lit', value: '/sse' },
          onOpen: [],
          onMessage: [],
          onError: [],
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        onOpen?: unknown[];
        onMessage?: unknown[];
        onError?: unknown[];
      };
      expect(step.onOpen).toEqual([]);
      expect(step.onMessage).toEqual([]);
      expect(step.onError).toEqual([]);
    });

    it('should handle bind step with patch mode for JSON Patch', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'bind',
            connection: 'ws',
            target: 'data',
            patch: true,
          },
        ],
        { data: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['data'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        do: string;
        patch: boolean;
      };
      expect(step.do).toBe('bind');
      expect(step.patch).toBe(true);
    });

    it('should handle optimistic step without timeout', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'optimistic',
            target: 'counter',
            value: { expr: 'lit', value: 1 },
          },
        ],
        { counter: { type: 'number', initial: 0 } }
      );

      const context = createContext({ stateNames: ['counter'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0] as {
        do: string;
        timeout?: number;
      };
      expect(step.do).toBe('optimistic');
      expect(step.timeout).toBeUndefined();
    });
  });
});
