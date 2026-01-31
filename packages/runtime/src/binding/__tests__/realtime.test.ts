/**
 * Test module for Realtime Data Binding.
 *
 * Coverage:
 * - Binding registration and ID generation
 * - Message handling and state updates
 * - Event type filtering
 * - Nested path binding
 * - Transform functions
 * - JSON Patch operations
 * - Binding removal (by ID, connection, target)
 * - Multiple bindings per connection
 * - Binding listing and disposal
 *
 * TDD Red Phase: These tests verify the realtime binding functionality
 * that will automatically update state when messages arrive from WebSocket/SSE connections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBindingManager,
  type BindingConfig,
  type BindingManager,
} from '../realtime.js';

// ==================== Test Setup ====================

describe('Realtime Binding', () => {
  let manager: BindingManager;
  let mockSetState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    manager = createBindingManager();
    mockSetState = vi.fn();
  });

  // ==================== bind() Tests ====================

  describe('bind()', () => {
    // ==================== Binding Registration ====================

    describe('binding registration', () => {
      it('should register binding and return unique ID', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'messages',
        };

        // Act
        const id = manager.bind(config, mockSetState);

        // Assert
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should return different IDs for different bindings', () => {
        // Arrange
        const config1: BindingConfig = {
          connection: 'ws1',
          target: 'messages',
        };
        const config2: BindingConfig = {
          connection: 'ws1',
          target: 'notifications',
        };

        // Act
        const id1 = manager.bind(config1, mockSetState);
        const id2 = manager.bind(config2, mockSetState);

        // Assert
        expect(id1).not.toBe(id2);
      });

      it('should register binding with all optional fields', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          eventType: 'chat',
          target: 'messages',
          path: ['items', 0, 'text'],
          transform: (data) => data,
          patch: true,
        };

        // Act
        const id = manager.bind(config, mockSetState);

        // Assert
        expect(id).toBeDefined();
      });
    });
  });

  // ==================== handleMessage() Tests ====================

  describe('handleMessage()', () => {
    // ==================== Basic Message Handling ====================

    describe('basic message handling', () => {
      it('should update state when message matches binding', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello, World!' };

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('messages', messageData);
      });

      it('should not update state when connection does not match', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello' };

        // Act
        manager.handleMessage('ws2', messageData);

        // Assert
        expect(mockSetState).not.toHaveBeenCalled();
      });

      it('should handle primitive message data', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'counter',
        };
        manager.bind(config, mockSetState);

        // Act
        manager.handleMessage('ws1', 42);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('counter', 42);
      });

      it('should handle array message data', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'items',
        };
        manager.bind(config, mockSetState);
        const items = [{ id: 1 }, { id: 2 }];

        // Act
        manager.handleMessage('ws1', items);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('items', items);
      });

      it('should handle null message data', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
        };
        manager.bind(config, mockSetState);

        // Act
        manager.handleMessage('ws1', null);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('data', null);
      });
    });

    // ==================== Event Type Filter ====================

    describe('event type filter', () => {
      it('should only update state when eventType matches', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          eventType: 'chat',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello' };

        // Act
        manager.handleMessage('ws1', messageData, 'chat');

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('messages', messageData);
      });

      it('should not update state when eventType does not match', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          eventType: 'chat',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello' };

        // Act
        manager.handleMessage('ws1', messageData, 'notification');

        // Assert
        expect(mockSetState).not.toHaveBeenCalled();
      });

      it('should update state when binding has no eventType filter (any event)', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello' };

        // Act
        manager.handleMessage('ws1', messageData, 'any-event');

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('messages', messageData);
      });

      it('should update state when message has no eventType (matches no filter)', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello' };

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('messages', messageData);
      });

      it('should not update state when binding has eventType but message does not', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          eventType: 'chat',
          target: 'messages',
        };
        manager.bind(config, mockSetState);
        const messageData = { text: 'Hello' };

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).not.toHaveBeenCalled();
      });
    });

    // ==================== Path Binding ====================

    describe('path binding', () => {
      it('should update nested path within state', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'user',
          path: ['profile', 'name'],
        };
        manager.bind(config, mockSetState);
        const messageData = 'John Doe';

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('user', messageData, ['profile', 'name']);
      });

      it('should update array index path', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'items',
          path: [0, 'value'],
        };
        manager.bind(config, mockSetState);
        const messageData = 'updated';

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('items', messageData, [0, 'value']);
      });

      it('should update single-level path', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'config',
          path: ['theme'],
        };
        manager.bind(config, mockSetState);
        const messageData = 'dark';

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('config', messageData, ['theme']);
      });

      it('should update root when path is empty array', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          path: [],
        };
        manager.bind(config, mockSetState);
        const messageData = { value: 'test' };

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('data', messageData, []);
      });
    });

    // ==================== Transform Function ====================

    describe('transform function', () => {
      it('should apply transform function before updating state', () => {
        // Arrange
        const transform = vi.fn((data: unknown) => {
          const d = data as { value: number };
          return d.value * 2;
        });
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'result',
          transform,
        };
        manager.bind(config, mockSetState);
        const messageData = { value: 10 };

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(transform).toHaveBeenCalledWith(messageData);
        expect(mockSetState).toHaveBeenCalledWith('result', 20);
      });

      it('should pass original data to transform', () => {
        // Arrange
        const transform = vi.fn((data: unknown) => data);
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          transform,
        };
        manager.bind(config, mockSetState);
        const messageData = { nested: { value: 'test' } };

        // Act
        manager.handleMessage('ws1', messageData);

        // Assert
        expect(transform).toHaveBeenCalledWith(messageData);
      });

      it('should handle transform returning null', () => {
        // Arrange
        const transform = vi.fn(() => null);
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          transform,
        };
        manager.bind(config, mockSetState);

        // Act
        manager.handleMessage('ws1', { value: 'test' });

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('data', null);
      });

      it('should handle transform returning undefined', () => {
        // Arrange
        const transform = vi.fn(() => undefined);
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          transform,
        };
        manager.bind(config, mockSetState);

        // Act
        manager.handleMessage('ws1', { value: 'test' });

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('data', undefined);
      });

      it('should apply transform with path binding', () => {
        // Arrange
        const transform = vi.fn((data: unknown) => {
          const d = data as string;
          return d.toUpperCase();
        });
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'user',
          path: ['name'],
          transform,
        };
        manager.bind(config, mockSetState);

        // Act
        manager.handleMessage('ws1', 'john');

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('user', 'JOHN', ['name']);
      });
    });

    // ==================== JSON Patch ====================

    describe('JSON Patch', () => {
      it('should apply JSON Patch operations when patch=true', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          patch: true,
        };
        manager.bind(config, mockSetState);
        const patchOperations = [
          { op: 'replace', path: '/name', value: 'Updated Name' },
        ];

        // Act
        manager.handleMessage('ws1', patchOperations);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('data', patchOperations, { patch: true });
      });

      it('should apply multiple patch operations', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'user',
          patch: true,
        };
        manager.bind(config, mockSetState);
        const patchOperations = [
          { op: 'replace', path: '/name', value: 'John' },
          { op: 'add', path: '/email', value: 'john@example.com' },
          { op: 'remove', path: '/temp' },
        ];

        // Act
        manager.handleMessage('ws1', patchOperations);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('user', patchOperations, { patch: true });
      });

      it('should apply nested path patch operations', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'config',
          patch: true,
        };
        manager.bind(config, mockSetState);
        const patchOperations = [
          { op: 'replace', path: '/settings/theme/color', value: 'blue' },
        ];

        // Act
        manager.handleMessage('ws1', patchOperations);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('config', patchOperations, { patch: true });
      });

      it('should apply array index patch operations', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'items',
          patch: true,
        };
        manager.bind(config, mockSetState);
        const patchOperations = [
          { op: 'replace', path: '/0/name', value: 'Updated Item' },
          { op: 'add', path: '/1', value: { name: 'New Item' } },
        ];

        // Act
        manager.handleMessage('ws1', patchOperations);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('items', patchOperations, { patch: true });
      });

      it('should not apply patch when patch=false', () => {
        // Arrange
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          patch: false,
        };
        manager.bind(config, mockSetState);
        const patchOperations = [
          { op: 'replace', path: '/name', value: 'Updated' },
        ];

        // Act
        manager.handleMessage('ws1', patchOperations);

        // Assert
        // Should pass raw data without patch flag
        expect(mockSetState).toHaveBeenCalledWith('data', patchOperations);
      });

      it('should apply transform before patch', () => {
        // Arrange
        const transform = vi.fn((data: unknown) => {
          const ops = data as Array<{ op: string; path: string; value?: unknown }>;
          return ops.map((op) => ({ ...op, path: `/prefixed${op.path}` }));
        });
        const config: BindingConfig = {
          connection: 'ws1',
          target: 'data',
          patch: true,
          transform,
        };
        manager.bind(config, mockSetState);
        const patchOperations = [
          { op: 'replace', path: '/name', value: 'Updated' },
        ];

        // Act
        manager.handleMessage('ws1', patchOperations);

        // Assert
        expect(transform).toHaveBeenCalledWith(patchOperations);
        expect(mockSetState).toHaveBeenCalledWith(
          'data',
          [{ op: 'replace', path: '/prefixed/name', value: 'Updated' }],
          { patch: true }
        );
      });
    });
  });

  // ==================== unbind() Tests ====================

  describe('unbind()', () => {
    it('should remove binding by ID', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const id = manager.bind(config, mockSetState);

      // Act
      const result = manager.unbind(id);
      manager.handleMessage('ws1', { text: 'Hello' });

      // Assert
      expect(result).toBe(true);
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = manager.unbind('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });

    it('should only remove specified binding', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws1',
        target: 'notifications',
      };
      const mockSetState1 = vi.fn();
      const mockSetState2 = vi.fn();
      const id1 = manager.bind(config1, mockSetState1);
      manager.bind(config2, mockSetState2);

      // Act
      manager.unbind(id1);
      manager.handleMessage('ws1', { data: 'test' });

      // Assert
      expect(mockSetState1).not.toHaveBeenCalled();
      expect(mockSetState2).toHaveBeenCalledWith('notifications', { data: 'test' });
    });
  });

  // ==================== unbindByConnection() Tests ====================

  describe('unbindByConnection()', () => {
    it('should remove all bindings for a connection', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws1',
        target: 'notifications',
      };
      manager.bind(config1, mockSetState);
      manager.bind(config2, mockSetState);

      // Act
      manager.unbindByConnection('ws1');
      manager.handleMessage('ws1', { text: 'Hello' });

      // Assert
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should not affect bindings for other connections', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws2',
        target: 'notifications',
      };
      manager.bind(config1, mockSetState);
      manager.bind(config2, mockSetState);

      // Act
      manager.unbindByConnection('ws1');
      manager.handleMessage('ws2', { data: 'test' });

      // Assert
      expect(mockSetState).toHaveBeenCalledWith('notifications', { data: 'test' });
    });

    it('should handle non-existent connection gracefully', () => {
      // Act & Assert
      expect(() => manager.unbindByConnection('non-existent')).not.toThrow();
    });
  });

  // ==================== unbindByTarget() Tests ====================

  describe('unbindByTarget()', () => {
    it('should remove all bindings for a target', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws2',
        target: 'messages',
      };
      manager.bind(config1, mockSetState);
      manager.bind(config2, mockSetState);

      // Act
      manager.unbindByTarget('messages');
      manager.handleMessage('ws1', { text: 'Hello' });
      manager.handleMessage('ws2', { text: 'World' });

      // Assert
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should not affect bindings for other targets', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws1',
        target: 'notifications',
      };
      manager.bind(config1, mockSetState);
      manager.bind(config2, mockSetState);

      // Act
      manager.unbindByTarget('messages');
      manager.handleMessage('ws1', { data: 'test' });

      // Assert
      expect(mockSetState).toHaveBeenCalledWith('notifications', { data: 'test' });
    });

    it('should handle non-existent target gracefully', () => {
      // Act & Assert
      expect(() => manager.unbindByTarget('non-existent')).not.toThrow();
    });
  });

  // ==================== Multiple Bindings Tests ====================

  describe('multiple bindings', () => {
    it('should allow multiple bindings for same connection', () => {
      // Arrange
      const mockSetState1 = vi.fn();
      const mockSetState2 = vi.fn();
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws1',
        target: 'notifications',
      };
      manager.bind(config1, mockSetState1);
      manager.bind(config2, mockSetState2);
      const messageData = { data: 'test' };

      // Act
      manager.handleMessage('ws1', messageData);

      // Assert
      expect(mockSetState1).toHaveBeenCalledWith('messages', messageData);
      expect(mockSetState2).toHaveBeenCalledWith('notifications', messageData);
    });

    it('should allow multiple bindings with different event types', () => {
      // Arrange
      const mockSetStateChat = vi.fn();
      const mockSetStateNotify = vi.fn();
      const configChat: BindingConfig = {
        connection: 'ws1',
        eventType: 'chat',
        target: 'chatMessages',
      };
      const configNotify: BindingConfig = {
        connection: 'ws1',
        eventType: 'notification',
        target: 'alerts',
      };
      manager.bind(configChat, mockSetStateChat);
      manager.bind(configNotify, mockSetStateNotify);

      // Act
      manager.handleMessage('ws1', { text: 'Hello' }, 'chat');

      // Assert
      expect(mockSetStateChat).toHaveBeenCalledWith('chatMessages', { text: 'Hello' });
      expect(mockSetStateNotify).not.toHaveBeenCalled();
    });

    it('should update multiple targets from different connections', () => {
      // Arrange
      const mockSetState1 = vi.fn();
      const mockSetState2 = vi.fn();
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'data1',
      };
      const config2: BindingConfig = {
        connection: 'ws2',
        target: 'data2',
      };
      manager.bind(config1, mockSetState1);
      manager.bind(config2, mockSetState2);

      // Act
      manager.handleMessage('ws1', 'value1');
      manager.handleMessage('ws2', 'value2');

      // Assert
      expect(mockSetState1).toHaveBeenCalledWith('data1', 'value1');
      expect(mockSetState2).toHaveBeenCalledWith('data2', 'value2');
    });
  });

  // ==================== getBindings() Tests ====================

  describe('getBindings()', () => {
    it('should return all registered bindings', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws2',
        target: 'notifications',
      };
      manager.bind(config1, mockSetState);
      manager.bind(config2, mockSetState);

      // Act
      const bindings = manager.getBindings();

      // Assert
      expect(bindings).toHaveLength(2);
      expect(bindings).toContainEqual(expect.objectContaining({ connection: 'ws1', target: 'messages' }));
      expect(bindings).toContainEqual(expect.objectContaining({ connection: 'ws2', target: 'notifications' }));
    });

    it('should return empty array when no bindings exist', () => {
      // Act
      const bindings = manager.getBindings();

      // Assert
      expect(bindings).toEqual([]);
    });

    it('should return copy of bindings (immutable)', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      manager.bind(config, mockSetState);

      // Act
      const bindings1 = manager.getBindings();
      const bindings2 = manager.getBindings();

      // Assert
      expect(bindings1).not.toBe(bindings2);
      expect(bindings1).toEqual(bindings2);
    });

    it('should reflect removed bindings', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const id = manager.bind(config, mockSetState);

      // Act
      manager.unbind(id);
      const bindings = manager.getBindings();

      // Assert
      expect(bindings).toHaveLength(0);
    });
  });

  // ==================== dispose() Tests ====================

  describe('dispose()', () => {
    it('should remove all bindings', () => {
      // Arrange
      const config1: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      const config2: BindingConfig = {
        connection: 'ws2',
        target: 'notifications',
      };
      manager.bind(config1, mockSetState);
      manager.bind(config2, mockSetState);

      // Act
      manager.dispose();

      // Assert
      expect(manager.getBindings()).toHaveLength(0);
    });

    it('should stop handling messages after dispose', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      manager.bind(config, mockSetState);

      // Act
      manager.dispose();
      manager.handleMessage('ws1', { text: 'Hello' });

      // Assert
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should be safe to call dispose multiple times', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'messages',
      };
      manager.bind(config, mockSetState);

      // Act & Assert
      expect(() => {
        manager.dispose();
        manager.dispose();
      }).not.toThrow();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle rapid sequential messages', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'counter',
      };
      manager.bind(config, mockSetState);

      // Act
      for (let i = 1; i <= 100; i++) {
        manager.handleMessage('ws1', i);
      }

      // Assert
      expect(mockSetState).toHaveBeenCalledTimes(100);
      expect(mockSetState).toHaveBeenLastCalledWith('counter', 100);
    });

    it('should handle deeply nested transform result', () => {
      // Arrange
      const transform = vi.fn(() => ({
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }));
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'data',
        transform,
      };
      manager.bind(config, mockSetState);

      // Act
      manager.handleMessage('ws1', 'input');

      // Assert
      expect(mockSetState).toHaveBeenCalledWith('data', {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      });
    });

    it('should handle transform that throws error', () => {
      // Arrange
      const transform = vi.fn(() => {
        throw new Error('Transform error');
      });
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'data',
        transform,
      };
      manager.bind(config, mockSetState);

      // Act & Assert
      expect(() => manager.handleMessage('ws1', 'input')).toThrow('Transform error');
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should handle empty string connection name', () => {
      // Arrange
      const config: BindingConfig = {
        connection: '',
        target: 'data',
      };
      manager.bind(config, mockSetState);

      // Act
      manager.handleMessage('', { value: 'test' });

      // Assert
      expect(mockSetState).toHaveBeenCalledWith('data', { value: 'test' });
    });

    it('should handle special characters in target name', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'data.with.dots',
      };
      manager.bind(config, mockSetState);

      // Act
      manager.handleMessage('ws1', 'value');

      // Assert
      expect(mockSetState).toHaveBeenCalledWith('data.with.dots', 'value');
    });

    it('should handle binding and unbinding in sequence', () => {
      // Arrange
      const config: BindingConfig = {
        connection: 'ws1',
        target: 'data',
      };

      // Act
      const id1 = manager.bind(config, mockSetState);
      manager.unbind(id1);
      const id2 = manager.bind(config, mockSetState);
      manager.handleMessage('ws1', 'value');

      // Assert
      expect(id1).not.toBe(id2);
      expect(mockSetState).toHaveBeenCalledTimes(1);
      expect(mockSetState).toHaveBeenCalledWith('data', 'value');
    });
  });
});
