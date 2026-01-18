/**
 * Test module for StateStore serialization methods.
 *
 * Coverage:
 * - serialize(): Serialize all state fields to a plain object
 * - restore(): Restore state values from a snapshot with type checking
 *
 * State Preservation Strategy:
 * | Case          | Behavior                                |
 * |---------------|----------------------------------------|
 * | Same type     | Restore as-is                          |
 * | Type changed  | Use new initial value (show warning)   |
 * | State added   | Use new initial value                  |
 * | State removed | Ignore                                 |
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStateStore } from '../store.js';
import type { StateStore, StateDefinition } from '../store.js';

// Extended interface with serialize/restore methods (not yet implemented)
interface SerializableStateStore extends StateStore {
  serialize(): Record<string, unknown>;
  restore(snapshot: Record<string, unknown>, newDefinitions: StateDefinition[]): void;
}

describe('StateStore serialization methods', () => {
  // ==================== serialize() ====================

  describe('serialize()', () => {
    describe('when serializing primitive values', () => {
      it('should serialize string state field', () => {
        // Arrange
        const store = createStateStore({
          theme: { type: 'string', initial: 'light' },
        }) as SerializableStateStore;
        store.set('theme', 'dark');

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({ theme: 'dark' });
      });

      it('should serialize number state field', () => {
        // Arrange
        const store = createStateStore({
          count: { type: 'number', initial: 0 },
        }) as SerializableStateStore;
        store.set('count', 42);

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({ count: 42 });
      });

      it('should serialize boolean state field', () => {
        // Arrange
        const store = createStateStore({
          isActive: { type: 'boolean', initial: false },
        }) as SerializableStateStore;
        store.set('isActive', true);

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({ isActive: true });
      });

      it('should serialize multiple primitive state fields', () => {
        // Arrange
        const store = createStateStore({
          theme: { type: 'string', initial: 'light' },
          count: { type: 'number', initial: 0 },
          isActive: { type: 'boolean', initial: false },
        }) as SerializableStateStore;
        store.set('theme', 'dark');
        store.set('count', 100);
        store.set('isActive', true);

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({
          theme: 'dark',
          count: 100,
          isActive: true,
        });
      });
    });

    describe('when serializing complex values', () => {
      it('should serialize array state field', () => {
        // Arrange
        const store = createStateStore({
          items: { type: 'list', initial: [] as string[] },
        }) as SerializableStateStore;
        store.set('items', ['apple', 'banana', 'cherry']);

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({ items: ['apple', 'banana', 'cherry'] });
      });

      it('should serialize object state field', () => {
        // Arrange
        const store = createStateStore({
          user: { type: 'object', initial: { name: '', age: 0 } },
        }) as SerializableStateStore;
        store.set('user', { name: 'Alice', age: 30 });

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({ user: { name: 'Alice', age: 30 } });
      });

      it('should serialize nested object state field', () => {
        // Arrange
        const store = createStateStore({
          config: {
            type: 'object',
            initial: {
              settings: {
                display: { theme: 'light' },
              },
            },
          },
        }) as SerializableStateStore;
        store.set('config', {
          settings: {
            display: { theme: 'dark' },
          },
        });

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({
          config: {
            settings: {
              display: { theme: 'dark' },
            },
          },
        });
      });

      it('should serialize array of objects', () => {
        // Arrange
        const store = createStateStore({
          posts: {
            type: 'list',
            initial: [] as { id: number; liked: boolean }[],
          },
        }) as SerializableStateStore;
        store.set('posts', [
          { id: 1, liked: true },
          { id: 2, liked: false },
        ]);

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({
          posts: [
            { id: 1, liked: true },
            { id: 2, liked: false },
          ],
        });
      });
    });

    describe('when serializing empty state', () => {
      it('should serialize empty state as empty object', () => {
        // Arrange
        const store = createStateStore({}) as SerializableStateStore;

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).toEqual({});
      });
    });

    describe('when handling non-serializable values', () => {
      it('should not include function values in serialization', () => {
        // Arrange
        const store = createStateStore({
          callback: { type: 'object', initial: () => {} },
          name: { type: 'string', initial: 'test' },
        }) as SerializableStateStore;

        // Act
        const snapshot = store.serialize();

        // Assert
        expect(snapshot).not.toHaveProperty('callback');
        expect(snapshot).toEqual({ name: 'test' });
      });
    });
  });

  // ==================== restore() ====================

  describe('restore()', () => {
    describe('when restoring state with same types', () => {
      it('should restore state values from snapshot', () => {
        // Arrange
        const definitions = {
          theme: { type: 'string', initial: 'light' },
          count: { type: 'number', initial: 0 },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = { theme: 'dark', count: 42 };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('theme')).toBe('dark');
        expect(store.get('count')).toBe(42);
      });

      it('should preserve existing state if snapshot value has same type', () => {
        // Arrange
        const definitions = {
          name: { type: 'string', initial: 'default' },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = { name: 'Alice' };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('name')).toBe('Alice');
      });
    });

    describe('when type has changed', () => {
      let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleWarnSpy.mockRestore();
      });

      it('should use new initial value if type changed from string to number', () => {
        // Arrange
        const oldSnapshot = { count: 'not-a-number' }; // was string
        const newDefinitions = [
          { name: 'count', type: 'number', initial: 0 }, // now number
        ];
        const store = createStateStore({
          count: { type: 'number', initial: 0 },
        }) as SerializableStateStore;

        // Act
        store.restore(oldSnapshot, newDefinitions as unknown as StateDefinition[]);

        // Assert
        expect(store.get('count')).toBe(0); // Uses new initial value
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it('should use new initial value if type changed from number to string', () => {
        // Arrange
        const oldSnapshot = { theme: 123 }; // was number
        const newDefinitions = [
          { name: 'theme', type: 'string', initial: 'light' }, // now string
        ];
        const store = createStateStore({
          theme: { type: 'string', initial: 'light' },
        }) as SerializableStateStore;

        // Act
        store.restore(oldSnapshot, newDefinitions as unknown as StateDefinition[]);

        // Assert
        expect(store.get('theme')).toBe('light'); // Uses new initial value
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it('should show warning when type changed', () => {
        // Arrange
        const oldSnapshot = { value: 'string-value' };
        const newDefinitions = [
          { name: 'value', type: 'number', initial: 42 },
        ];
        const store = createStateStore({
          value: { type: 'number', initial: 42 },
        }) as SerializableStateStore;

        // Act
        store.restore(oldSnapshot, newDefinitions as unknown as StateDefinition[]);

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('value')
        );
      });
    });

    describe('when state is added', () => {
      it('should use new initial value for newly added state fields', () => {
        // Arrange
        const oldSnapshot = { existingField: 'existing' }; // newField doesn't exist
        const newDefinitions = [
          { name: 'existingField', type: 'string', initial: 'default' },
          { name: 'newField', type: 'number', initial: 100 }, // newly added
        ];
        const store = createStateStore({
          existingField: { type: 'string', initial: 'default' },
          newField: { type: 'number', initial: 100 },
        }) as SerializableStateStore;

        // Act
        store.restore(oldSnapshot, newDefinitions as unknown as StateDefinition[]);

        // Assert
        expect(store.get('existingField')).toBe('existing');
        expect(store.get('newField')).toBe(100); // Uses new initial value
      });
    });

    describe('when state is removed', () => {
      it('should ignore removed state fields from snapshot', () => {
        // Arrange
        const oldSnapshot = {
          keepField: 'keep',
          removedField: 'removed', // This field no longer exists
        };
        const newDefinitions = [
          { name: 'keepField', type: 'string', initial: 'default' },
          // removedField is not in new definitions
        ];
        const store = createStateStore({
          keepField: { type: 'string', initial: 'default' },
        }) as SerializableStateStore;

        // Act & Assert - Should not throw
        expect(() => {
          store.restore(oldSnapshot, newDefinitions as unknown as StateDefinition[]);
        }).not.toThrow();
        expect(store.get('keepField')).toBe('keep');
      });
    });

    describe('when handling complex state', () => {
      it('should handle nested object state', () => {
        // Arrange
        const definitions = {
          config: {
            type: 'object',
            initial: {
              settings: {
                display: { theme: 'light' },
              },
            },
          },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = {
          config: {
            settings: {
              display: { theme: 'dark' },
            },
          },
        };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('config')).toEqual({
          settings: {
            display: { theme: 'dark' },
          },
        });
      });

      it('should handle array state', () => {
        // Arrange
        const definitions = {
          items: { type: 'list', initial: [] as string[] },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = { items: ['apple', 'banana', 'cherry'] };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('items')).toEqual(['apple', 'banana', 'cherry']);
      });

      it('should handle array of objects state', () => {
        // Arrange
        const definitions = {
          posts: {
            type: 'list',
            initial: [] as { id: number; liked: boolean }[],
          },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = {
          posts: [
            { id: 1, liked: true },
            { id: 2, liked: false },
          ],
        };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('posts')).toEqual([
          { id: 1, liked: true },
          { id: 2, liked: false },
        ]);
      });
    });

    describe('when restoring multiple state fields', () => {
      it('should restore multiple state fields at once', () => {
        // Arrange
        const definitions = {
          theme: { type: 'string', initial: 'light' },
          count: { type: 'number', initial: 0 },
          isActive: { type: 'boolean', initial: false },
          items: { type: 'list', initial: [] as string[] },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = {
          theme: 'dark',
          count: 42,
          isActive: true,
          items: ['a', 'b', 'c'],
        };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('theme')).toBe('dark');
        expect(store.get('count')).toBe(42);
        expect(store.get('isActive')).toBe(true);
        expect(store.get('items')).toEqual(['a', 'b', 'c']);
      });
    });

    describe('edge cases', () => {
      it('should handle null values in snapshot', () => {
        // Arrange
        const definitions = {
          value: { type: 'object', initial: { name: 'default' } },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = { value: null };

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('value')).toBeNull();
      });

      it('should handle empty snapshot', () => {
        // Arrange
        const definitions = {
          theme: { type: 'string', initial: 'light' },
        };
        const store = createStateStore(definitions) as SerializableStateStore;
        const snapshot = {};

        // Act
        store.restore(snapshot, Object.entries(definitions).map(([name, def]) => ({
          ...def,
          name,
        })) as unknown as StateDefinition[]);

        // Assert
        expect(store.get('theme')).toBe('light'); // Uses initial value
      });
    });
  });
});
