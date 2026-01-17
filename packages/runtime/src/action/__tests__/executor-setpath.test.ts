/**
 * Test module for setPath Action Step Executor.
 *
 * Coverage:
 * - Basic setPath with literal index and property
 * - setPath with dynamic index from payload
 * - setPath with string path (dot notation)
 * - setPath creates intermediate objects/arrays if needed
 * - setPath triggers subscribers
 * - setPath preserves immutability
 * - setPath in sync execution
 * - setPath with computed value
 *
 * TDD Red Phase: These tests verify the runtime execution of the setPath action step
 * that will be added to support fine-grained state updates in Constela DSL.
 */

import { describe, it, expect, vi } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep, CompiledExpression } from '@constela/compiler';

/**
 * Type definition for CompiledSetPathStep
 * This type does not exist yet in @constela/compiler - it will be added during implementation.
 */
interface CompiledSetPathStep {
  do: 'setPath';
  target: string;
  path: CompiledExpression;
  value: CompiledExpression;
}

describe('executeAction with setPath step', () => {
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

  // ==================== Basic setPath with literal index and property ====================

  describe('basic setPath with literal index and property', () => {
    it('should update nested array element property with literal path', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'toggleLike',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [
            { id: 1, liked: false },
            { id: 2, liked: true },
          ],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const posts = context.state.get('posts') as Array<{ id: number; liked: boolean }>;
      expect(posts[0].liked).toBe(true);
      expect(posts[1].liked).toBe(true); // unchanged
    });

    it('should update deeply nested object property', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateAddress',
        steps: [
          {
            do: 'setPath',
            target: 'user',
            path: { expr: 'lit', value: ['address', 'city'] },
            value: { expr: 'lit', value: 'Tokyo' },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        user: {
          type: 'object',
          initial: {
            name: 'John',
            address: { city: 'New York', zip: '10001' },
          },
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const user = context.state.get('user') as { name: string; address: { city: string; zip: string } };
      expect(user.address.city).toBe('Tokyo');
      expect(user.address.zip).toBe('10001'); // unchanged
      expect(user.name).toBe('John'); // unchanged
    });

    it('should update second element in array', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateSecondPost',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [1, 'liked'] },
            value: { expr: 'lit', value: false },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [
            { id: 1, liked: false },
            { id: 2, liked: true },
          ],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const posts = context.state.get('posts') as Array<{ id: number; liked: boolean }>;
      expect(posts[0].liked).toBe(false); // unchanged
      expect(posts[1].liked).toBe(false); // changed
    });
  });

  // ==================== setPath with dynamic index from payload ====================

  describe('setPath with dynamic index from payload', () => {
    it('should update array element using index from payload', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateItemCount',
        steps: [
          {
            do: 'setPath',
            target: 'items',
            path: {
              expr: 'lit',
              value: [{ expr: 'var', name: 'payload', path: 'index' }, 'count'],
            },
            value: { expr: 'lit', value: 99 },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: {
          type: 'array',
          initial: [
            { count: 10 },
            { count: 20 },
            { count: 30 },
          ],
        },
      });
      context.locals['payload'] = { index: 1 };

      // Act
      await executeAction(action, context);

      // Assert
      const items = context.state.get('items') as Array<{ count: number }>;
      expect(items[0].count).toBe(10); // unchanged
      expect(items[1].count).toBe(99); // updated
      expect(items[2].count).toBe(30); // unchanged
    });

    it('should update using multiple dynamic path segments', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateNestedDynamic',
        steps: [
          {
            do: 'setPath',
            target: 'data',
            path: {
              expr: 'lit',
              value: [
                { expr: 'var', name: 'payload', path: 'categoryIndex' },
                'items',
                { expr: 'var', name: 'payload', path: 'itemIndex' },
                'value',
              ],
            },
            value: { expr: 'lit', value: 'updated' },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: {
          type: 'array',
          initial: [
            { items: [{ value: 'a' }, { value: 'b' }] },
            { items: [{ value: 'c' }, { value: 'd' }] },
          ],
        },
      });
      context.locals['payload'] = { categoryIndex: 0, itemIndex: 1 };

      // Act
      await executeAction(action, context);

      // Assert
      const data = context.state.get('data') as Array<{ items: Array<{ value: string }> }>;
      expect(data[0].items[0].value).toBe('a'); // unchanged
      expect(data[0].items[1].value).toBe('updated'); // updated
      expect(data[1].items[0].value).toBe('c'); // unchanged
    });
  });

  // ==================== setPath with string path (dot notation) ====================

  describe('setPath with string path', () => {
    it('should update using dot notation string path', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateProfileName',
        steps: [
          {
            do: 'setPath',
            target: 'user',
            path: { expr: 'lit', value: 'profile.name' },
            value: { expr: 'lit', value: 'Jane' },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        user: {
          type: 'object',
          initial: {
            profile: { name: 'John', email: 'john@example.com' },
          },
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const user = context.state.get('user') as { profile: { name: string; email: string } };
      expect(user.profile.name).toBe('Jane');
      expect(user.profile.email).toBe('john@example.com'); // unchanged
    });

    it('should update deeply nested property using dot notation', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateDeepValue',
        steps: [
          {
            do: 'setPath',
            target: 'config',
            path: { expr: 'lit', value: 'settings.display.theme' },
            value: { expr: 'lit', value: 'dark' },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        config: {
          type: 'object',
          initial: {
            settings: {
              display: { theme: 'light', fontSize: 14 },
              general: { language: 'en' },
            },
          },
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const config = context.state.get('config') as {
        settings: {
          display: { theme: string; fontSize: number };
          general: { language: string };
        };
      };
      expect(config.settings.display.theme).toBe('dark');
      expect(config.settings.display.fontSize).toBe(14); // unchanged
      expect(config.settings.general.language).toBe('en'); // unchanged
    });
  });

  // ==================== setPath creates intermediate objects/arrays if needed ====================

  describe('setPath creates intermediate structures', () => {
    it('should create intermediate objects when path does not exist', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'createNestedPath',
        steps: [
          {
            do: 'setPath',
            target: 'data',
            path: { expr: 'lit', value: ['nested', 'deep'] },
            value: { expr: 'lit', value: 42 },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const data = context.state.get('data') as { nested?: { deep?: number } };
      expect(data.nested?.deep).toBe(42);
    });

    it('should create intermediate arrays when numeric index is used', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'createArrayPath',
        steps: [
          {
            do: 'setPath',
            target: 'data',
            path: { expr: 'lit', value: ['items', 0, 'name'] },
            value: { expr: 'lit', value: 'first' },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: {} },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const data = context.state.get('data') as { items?: Array<{ name?: string }> };
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items?.[0]?.name).toBe('first');
    });
  });

  // ==================== setPath triggers subscribers ====================

  describe('setPath triggers subscribers', () => {
    it('should trigger state subscriber when setPath is executed', async () => {
      // Arrange
      const subscriberFn = vi.fn();
      const action: CompiledAction = {
        name: 'updatePost',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [{ id: 1, liked: false }],
        },
      });

      // Subscribe before action
      context.state.subscribe('posts', subscriberFn);

      // Act
      await executeAction(action, context);

      // Assert
      expect(subscriberFn).toHaveBeenCalledTimes(1);
      const newPosts = subscriberFn.mock.calls[0][0] as Array<{ id: number; liked: boolean }>;
      expect(newPosts[0].liked).toBe(true);
    });

    it('should trigger path-specific subscriber', async () => {
      // Arrange
      const subscriberFn = vi.fn();
      const action: CompiledAction = {
        name: 'updateLiked',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [{ id: 1, liked: false }],
        },
      });

      // Subscribe to specific path before action
      context.state.subscribeToPath('posts', [0, 'liked'], subscriberFn);

      // Act
      await executeAction(action, context);

      // Assert
      expect(subscriberFn).toHaveBeenCalledTimes(1);
      expect(subscriberFn).toHaveBeenCalledWith(true);
    });
  });

  // ==================== setPath preserves immutability ====================

  describe('setPath preserves immutability', () => {
    it('should create new array reference when updating array element', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateArray',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as unknown as CompiledActionStep,
        ],
      };
      const initialPosts = [
        { id: 1, liked: false },
        { id: 2, liked: true },
      ];
      const context = createContext({
        posts: { type: 'array', initial: initialPosts },
      });

      // Get reference before update
      const beforePosts = context.state.get('posts');

      // Act
      await executeAction(action, context);

      // Assert
      const afterPosts = context.state.get('posts');
      expect(afterPosts).not.toBe(beforePosts);
      expect(afterPosts).not.toBe(initialPosts);
    });

    it('should create new object reference when updating nested object', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'updateUser',
        steps: [
          {
            do: 'setPath',
            target: 'user',
            path: { expr: 'lit', value: ['address', 'city'] },
            value: { expr: 'lit', value: 'Tokyo' },
          } as unknown as CompiledActionStep,
        ],
      };
      const initialUser = {
        name: 'John',
        address: { city: 'New York', zip: '10001' },
      };
      const context = createContext({
        user: { type: 'object', initial: initialUser },
      });

      // Get reference before update
      const beforeUser = context.state.get('user') as typeof initialUser;
      const beforeAddress = beforeUser.address;

      // Act
      await executeAction(action, context);

      // Assert
      const afterUser = context.state.get('user') as typeof initialUser;
      expect(afterUser).not.toBe(beforeUser);
      expect(afterUser.address).not.toBe(beforeAddress);
      // Siblings should be preserved
      expect(afterUser.name).toBe('John');
      expect(afterUser.address.zip).toBe('10001');
    });
  });

  // ==================== setPath in sync execution ====================

  describe('setPath in sync execution', () => {
    it('should execute setPath synchronously like set step', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'syncSetPath',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as unknown as CompiledActionStep,
          {
            do: 'set',
            target: 'lastUpdated',
            value: { expr: 'lit', value: 'posts' },
          },
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [{ id: 1, liked: false }],
        },
        lastUpdated: { type: 'string', initial: '' },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const posts = context.state.get('posts') as Array<{ id: number; liked: boolean }>;
      expect(posts[0].liked).toBe(true);
      expect(context.state.get('lastUpdated')).toBe('posts');
    });

    it('should execute multiple setPath steps in sequence', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'multipleSetPath',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: { expr: 'lit', value: true },
          } as unknown as CompiledActionStep,
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [1, 'liked'] },
            value: { expr: 'lit', value: false },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [
            { id: 1, liked: false },
            { id: 2, liked: true },
          ],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const posts = context.state.get('posts') as Array<{ id: number; liked: boolean }>;
      expect(posts[0].liked).toBe(true);
      expect(posts[1].liked).toBe(false);
    });
  });

  // ==================== setPath with computed value ====================

  describe('setPath with computed value', () => {
    it('should use binary expression as value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'incrementCount',
        steps: [
          {
            do: 'setPath',
            target: 'items',
            path: { expr: 'lit', value: [0, 'count'] },
            value: {
              expr: 'bin',
              op: '+',
              left: {
                expr: 'index',
                base: {
                  expr: 'index',
                  base: { expr: 'state', name: 'items' },
                  key: { expr: 'lit', value: 0 },
                },
                key: { expr: 'lit', value: 'count' },
              },
              right: { expr: 'lit', value: 1 },
            },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        items: {
          type: 'array',
          initial: [{ count: 10 }],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const items = context.state.get('items') as Array<{ count: number }>;
      expect(items[0].count).toBe(11);
    });

    it('should use not expression to toggle boolean', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'toggleLiked',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [0, 'liked'] },
            value: {
              expr: 'not',
              operand: {
                expr: 'index',
                base: {
                  expr: 'index',
                  base: { expr: 'state', name: 'posts' },
                  key: { expr: 'lit', value: 0 },
                },
                key: { expr: 'lit', value: 'liked' },
              },
            },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [{ id: 1, liked: false }],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const posts = context.state.get('posts') as Array<{ id: number; liked: boolean }>;
      expect(posts[0].liked).toBe(true);
    });

    it('should use value from payload', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromPayload',
        steps: [
          {
            do: 'setPath',
            target: 'posts',
            path: { expr: 'lit', value: [{ expr: 'var', name: 'payload', path: 'index' }, 'liked'] },
            value: {
              expr: 'not',
              operand: { expr: 'var', name: 'payload', path: 'currentLiked' },
            },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        posts: {
          type: 'array',
          initial: [
            { id: 1, liked: false },
            { id: 2, liked: true },
          ],
        },
      });
      context.locals['payload'] = { index: 1, currentLiked: true };

      // Act
      await executeAction(action, context);

      // Assert
      const posts = context.state.get('posts') as Array<{ id: number; liked: boolean }>;
      expect(posts[0].liked).toBe(false); // unchanged
      expect(posts[1].liked).toBe(false); // toggled from true to false
    });
  });

  // ==================== Edge cases ====================

  describe('edge cases', () => {
    it('should handle single element path', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'singleElementPath',
        steps: [
          {
            do: 'setPath',
            target: 'data',
            path: { expr: 'lit', value: ['value'] },
            value: { expr: 'lit', value: 100 },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: { value: 0 } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const data = context.state.get('data') as { value: number };
      expect(data.value).toBe(100);
    });

    it('should handle numeric string in path (treated as string key)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'numericStringPath',
        steps: [
          {
            do: 'setPath',
            target: 'data',
            path: { expr: 'lit', value: '0.name' },
            value: { expr: 'lit', value: 'zero' },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: {
          type: 'object',
          initial: [{ name: 'original' }],
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const data = context.state.get('data') as Array<{ name: string }>;
      expect(data[0].name).toBe('zero');
    });

    it('should handle setPath with null value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setNull',
        steps: [
          {
            do: 'setPath',
            target: 'user',
            path: { expr: 'lit', value: ['profile', 'avatar'] },
            value: { expr: 'lit', value: null },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        user: {
          type: 'object',
          initial: { profile: { avatar: 'url' } },
        },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const user = context.state.get('user') as { profile: { avatar: string | null } };
      expect(user.profile.avatar).toBeNull();
    });

    it('should handle empty array path (sets entire value)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'emptyPath',
        steps: [
          {
            do: 'setPath',
            target: 'data',
            path: { expr: 'lit', value: [] },
            value: { expr: 'lit', value: { replaced: true } },
          } as unknown as CompiledActionStep,
        ],
      };
      const context = createContext({
        data: { type: 'object', initial: { original: true } },
      });

      // Act
      await executeAction(action, context);

      // Assert
      const data = context.state.get('data') as { replaced?: boolean; original?: boolean };
      expect(data.replaced).toBe(true);
      expect(data.original).toBeUndefined();
    });
  });
});
