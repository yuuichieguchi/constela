/**
 * Test module for StateStore path-based methods.
 *
 * Coverage:
 * - getPath: Retrieve values at nested paths
 * - setPath: Update values at nested paths (immutably)
 * - subscribeToPath: Subscribe to changes at specific paths
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStateStore } from '../store.js';
import type { StateStore } from '../store.js';

describe('StateStore path-based methods', () => {
  // ==================== getPath() ====================

  describe('getPath()', () => {
    describe('when accessing simple property path', () => {
      it('should return the value at a simple string path', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', age: 30, liked: true },
          },
        });

        // Act
        const result = (store as any).getPath('user', 'name');

        // Assert
        expect(result).toBe('Alice');
      });

      it('should return the value at a simple string path for boolean', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', liked: false },
          },
        });

        // Act
        const result = (store as any).getPath('user', 'liked');

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when accessing nested object path', () => {
      it('should return the value at a dot-separated path', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: {
              name: 'Alice',
              address: {
                city: 'Tokyo',
                zip: '100-0001',
              },
            },
          },
        });

        // Act
        const result = (store as any).getPath('user', 'address.city');

        // Assert
        expect(result).toBe('Tokyo');
      });

      it('should return the value at a deeply nested path', () => {
        // Arrange
        const store = createStateStore({
          config: {
            type: 'object',
            initial: {
              settings: {
                display: {
                  theme: {
                    primary: '#3498db',
                  },
                },
              },
            },
          },
        });

        // Act
        const result = (store as any).getPath(
          'config',
          'settings.display.theme.primary'
        );

        // Assert
        expect(result).toBe('#3498db');
      });
    });

    describe('when accessing array index', () => {
      it('should return the value at a numeric array index using array path', () => {
        // Arrange
        const store = createStateStore({
          items: {
            type: 'list',
            initial: ['apple', 'banana', 'cherry'],
          },
        });

        // Act
        const result = (store as any).getPath('items', [1]);

        // Assert
        expect(result).toBe('banana');
      });

      it('should return the first element with index 0', () => {
        // Arrange
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: [
              { id: 1, title: 'First' },
              { id: 2, title: 'Second' },
            ],
          },
        });

        // Act
        const result = (store as any).getPath('posts', [0]);

        // Assert
        expect(result).toEqual({ id: 1, title: 'First' });
      });
    });

    describe('when accessing array index with property', () => {
      it('should return the property of an array element', () => {
        // Arrange
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: [
              { id: 1, liked: false },
              { id: 2, liked: true },
            ],
          },
        });

        // Act
        const result = (store as any).getPath('posts', [0, 'liked']);

        // Assert
        expect(result).toBe(false);
      });

      it('should return nested property of an array element', () => {
        // Arrange
        const store = createStateStore({
          users: {
            type: 'list',
            initial: [
              { id: 1, profile: { avatar: 'avatar1.png' } },
              { id: 2, profile: { avatar: 'avatar2.png' } },
            ],
          },
        });

        // Act
        const result = (store as any).getPath('users', [1, 'profile', 'avatar']);

        // Assert
        expect(result).toBe('avatar2.png');
      });
    });

    describe('when accessing non-existent path', () => {
      it('should return undefined for non-existent property', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice' },
          },
        });

        // Act
        const result = (store as any).getPath('user', 'nonexistent');

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-existent nested path', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice' },
          },
        });

        // Act
        const result = (store as any).getPath('user', 'address.city');

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for out-of-bounds array index', () => {
        // Arrange
        const store = createStateStore({
          items: {
            type: 'list',
            initial: ['a', 'b', 'c'],
          },
        });

        // Act
        const result = (store as any).getPath('items', [100]);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ==================== setPath() ====================

  describe('setPath()', () => {
    describe('when setting simple property', () => {
      it('should update a simple property value', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', age: 30 },
          },
        });

        // Act
        (store as any).setPath('user', 'name', 'Bob');

        // Assert
        expect((store as any).getPath('user', 'name')).toBe('Bob');
        // Verify rest of object is preserved
        const user = store.get('user') as { name: string; age: number };
        expect(user.age).toBe(30);
      });

      it('should update a boolean property value', () => {
        // Arrange
        const store = createStateStore({
          post: {
            type: 'object',
            initial: { id: 1, liked: false },
          },
        });

        // Act
        (store as any).setPath('post', 'liked', true);

        // Assert
        expect((store as any).getPath('post', 'liked')).toBe(true);
      });
    });

    describe('when setting nested object property', () => {
      it('should update a nested property value', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: {
              name: 'Alice',
              address: { city: 'Tokyo', zip: '100-0001' },
            },
          },
        });

        // Act
        (store as any).setPath('user', 'address.city', 'Osaka');

        // Assert
        expect((store as any).getPath('user', 'address.city')).toBe('Osaka');
        // Verify sibling property is preserved
        expect((store as any).getPath('user', 'address.zip')).toBe('100-0001');
      });

      it('should create intermediate objects if they do not exist', () => {
        // Arrange
        const store = createStateStore({
          config: {
            type: 'object',
            initial: {},
          },
        });

        // Act
        (store as any).setPath('config', 'settings.display.theme', 'dark');

        // Assert
        expect((store as any).getPath('config', 'settings.display.theme')).toBe(
          'dark'
        );
      });
    });

    describe('when setting array index', () => {
      it('should update an element at array index', () => {
        // Arrange
        const store = createStateStore({
          items: {
            type: 'list',
            initial: ['apple', 'banana', 'cherry'],
          },
        });

        // Act
        (store as any).setPath('items', [1], 'blueberry');

        // Assert
        expect((store as any).getPath('items', [1])).toBe('blueberry');
        // Verify other elements are preserved
        expect((store as any).getPath('items', [0])).toBe('apple');
        expect((store as any).getPath('items', [2])).toBe('cherry');
      });
    });

    describe('when setting array index with property', () => {
      it('should update a property of an array element', () => {
        // Arrange
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: [
              { id: 1, liked: false },
              { id: 2, liked: true },
            ],
          },
        });

        // Act
        (store as any).setPath('posts', [0, 'liked'], true);

        // Assert
        expect((store as any).getPath('posts', [0, 'liked'])).toBe(true);
        // Verify other properties are preserved
        expect((store as any).getPath('posts', [0, 'id'])).toBe(1);
        // Verify other elements are preserved
        expect((store as any).getPath('posts', [1, 'liked'])).toBe(true);
      });

      it('should update nested property of an array element', () => {
        // Arrange
        const store = createStateStore({
          users: {
            type: 'list',
            initial: [
              { id: 1, profile: { avatar: 'old.png', bio: 'Hello' } },
            ],
          },
        });

        // Act
        (store as any).setPath('users', [0, 'profile', 'avatar'], 'new.png');

        // Assert
        expect((store as any).getPath('users', [0, 'profile', 'avatar'])).toBe(
          'new.png'
        );
        // Verify sibling property is preserved
        expect((store as any).getPath('users', [0, 'profile', 'bio'])).toBe(
          'Hello'
        );
      });
    });

    describe('immutability', () => {
      it('should not mutate the original state object', () => {
        // Arrange
        const originalUser = { name: 'Alice', age: 30 };
        const store = createStateStore({
          user: {
            type: 'object',
            initial: originalUser,
          },
        });

        const userBefore = store.get('user');

        // Act
        (store as any).setPath('user', 'name', 'Bob');

        // Assert - original reference should not be mutated
        expect(originalUser.name).toBe('Alice');
        // New value should be returned
        const userAfter = store.get('user') as { name: string };
        expect(userAfter.name).toBe('Bob');
        // References should be different
        expect(userBefore).not.toBe(userAfter);
      });

      it('should not mutate the original array', () => {
        // Arrange
        const originalPosts = [
          { id: 1, liked: false },
          { id: 2, liked: true },
        ];
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: originalPosts,
          },
        });

        const postsBefore = store.get('posts');

        // Act
        (store as any).setPath('posts', [0, 'liked'], true);

        // Assert - original array should not be mutated
        expect(originalPosts[0].liked).toBe(false);
        // New value should be returned
        const postsAfter = store.get('posts') as Array<{ liked: boolean }>;
        expect(postsAfter[0].liked).toBe(true);
        // References should be different
        expect(postsBefore).not.toBe(postsAfter);
      });

      it('should create new references for all ancestor objects', () => {
        // Arrange
        const store = createStateStore({
          data: {
            type: 'object',
            initial: {
              level1: {
                level2: {
                  value: 'original',
                },
              },
            },
          },
        });

        const dataBefore = store.get('data') as any;
        const level1Before = dataBefore.level1;
        const level2Before = dataBefore.level1.level2;

        // Act
        (store as any).setPath('data', 'level1.level2.value', 'updated');

        // Assert
        const dataAfter = store.get('data') as any;
        expect(dataAfter).not.toBe(dataBefore);
        expect(dataAfter.level1).not.toBe(level1Before);
        expect(dataAfter.level1.level2).not.toBe(level2Before);
        expect(dataAfter.level1.level2.value).toBe('updated');
      });
    });

    describe('subscriber notification', () => {
      it('should trigger subscribers on the state field when path is updated', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', age: 30 },
          },
        });
        const callback = vi.fn();
        store.subscribe('user', callback);

        // Act
        (store as any).setPath('user', 'name', 'Bob');

        // Assert
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({ name: 'Bob', age: 30 });
      });
    });
  });

  // ==================== subscribeToPath() ====================

  describe('subscribeToPath()', () => {
    describe('when subscribing to property path', () => {
      it('should call callback when the specific path changes', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', age: 30 },
          },
        });
        const callback = vi.fn();

        // Act
        (store as any).subscribeToPath('user', 'name', callback);
        (store as any).setPath('user', 'name', 'Bob');

        // Assert
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('Bob');
      });

      it('should call callback with each value change', () => {
        // Arrange
        const store = createStateStore({
          counter: {
            type: 'object',
            initial: { value: 0 },
          },
        });
        const callback = vi.fn();

        // Act
        (store as any).subscribeToPath('counter', 'value', callback);
        (store as any).setPath('counter', 'value', 1);
        (store as any).setPath('counter', 'value', 2);
        (store as any).setPath('counter', 'value', 3);

        // Assert
        expect(callback).toHaveBeenCalledTimes(3);
        expect(callback).toHaveBeenNthCalledWith(1, 1);
        expect(callback).toHaveBeenNthCalledWith(2, 2);
        expect(callback).toHaveBeenNthCalledWith(3, 3);
      });
    });

    describe('when subscribing to array index path', () => {
      it('should call callback when the specific array element changes', () => {
        // Arrange
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: [
              { id: 1, liked: false },
              { id: 2, liked: true },
            ],
          },
        });
        const callback = vi.fn();

        // Act
        (store as any).subscribeToPath('posts', [0, 'liked'], callback);
        (store as any).setPath('posts', [0, 'liked'], true);

        // Assert
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(true);
      });
    });

    describe('selective notification', () => {
      it('should NOT call callback when a different path changes', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', age: 30 },
          },
        });
        const nameCallback = vi.fn();

        // Act
        (store as any).subscribeToPath('user', 'name', nameCallback);
        (store as any).setPath('user', 'age', 31); // Change age, not name

        // Assert
        expect(nameCallback).not.toHaveBeenCalled();
      });

      it('should NOT call callback when a different array element changes', () => {
        // Arrange
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: [
              { id: 1, liked: false },
              { id: 2, liked: false },
            ],
          },
        });
        const callback = vi.fn();

        // Act
        (store as any).subscribeToPath('posts', [0, 'liked'], callback);
        (store as any).setPath('posts', [1, 'liked'], true); // Change index 1, not 0

        // Assert
        expect(callback).not.toHaveBeenCalled();
      });

      it('should call callback for parent path changes that affect the subscribed path', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', address: { city: 'Tokyo' } },
          },
        });
        const cityCallback = vi.fn();

        // Act
        (store as any).subscribeToPath('user', 'address.city', cityCallback);
        // Replace the entire address object
        (store as any).setPath('user', 'address', { city: 'Osaka' });

        // Assert
        expect(cityCallback).toHaveBeenCalledTimes(1);
        expect(cityCallback).toHaveBeenCalledWith('Osaka');
      });
    });

    describe('cleanup function', () => {
      it('should return an unsubscribe function', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice' },
          },
        });
        const callback = vi.fn();

        // Act
        const unsubscribe = (store as any).subscribeToPath(
          'user',
          'name',
          callback
        );

        // Assert
        expect(typeof unsubscribe).toBe('function');
      });

      it('should stop calling callback after unsubscribe', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice' },
          },
        });
        const callback = vi.fn();

        // Act
        const unsubscribe = (store as any).subscribeToPath(
          'user',
          'name',
          callback
        );
        (store as any).setPath('user', 'name', 'Bob');
        unsubscribe();
        (store as any).setPath('user', 'name', 'Charlie');
        (store as any).setPath('user', 'name', 'David');

        // Assert
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('Bob');
      });

      it('should allow multiple independent subscriptions with separate cleanup', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', age: 30 },
          },
        });
        const nameCallback = vi.fn();
        const ageCallback = vi.fn();

        // Act
        const unsubscribeName = (store as any).subscribeToPath(
          'user',
          'name',
          nameCallback
        );
        (store as any).subscribeToPath('user', 'age', ageCallback);

        (store as any).setPath('user', 'name', 'Bob');
        (store as any).setPath('user', 'age', 31);

        unsubscribeName();

        (store as any).setPath('user', 'name', 'Charlie');
        (store as any).setPath('user', 'age', 32);

        // Assert
        expect(nameCallback).toHaveBeenCalledTimes(1);
        expect(nameCallback).toHaveBeenCalledWith('Bob');
        expect(ageCallback).toHaveBeenCalledTimes(2);
        expect(ageCallback).toHaveBeenNthCalledWith(1, 31);
        expect(ageCallback).toHaveBeenNthCalledWith(2, 32);
      });
    });

    describe('edge cases', () => {
      it('should not call callback on initial subscribe', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice' },
          },
        });
        const callback = vi.fn();

        // Act
        (store as any).subscribeToPath('user', 'name', callback);

        // Assert
        expect(callback).not.toHaveBeenCalled();
      });

      it('should handle subscription when value becomes undefined', () => {
        // Arrange
        const store = createStateStore({
          user: {
            type: 'object',
            initial: { name: 'Alice', nickname: 'Ali' } as {
              name: string;
              nickname?: string;
            },
          },
        });
        const callback = vi.fn();

        // Act
        (store as any).subscribeToPath('user', 'nickname', callback);
        // Replace user object without nickname
        store.set('user', { name: 'Bob' });

        // Assert
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
