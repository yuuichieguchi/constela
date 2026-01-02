/**
 * Test module for createApp.
 *
 * Coverage:
 * - createApp mounts to element
 * - createApp renders view
 * - destroy() removes from DOM
 * - setState() updates state
 * - getState() returns current state
 * - Events trigger actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppInstance } from '../src/app.js';
import type { CompiledProgram } from '@constela/compiler';

describe('createApp', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper to create minimal program ====================

  function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  // ==================== Mounting ====================

  describe('mounting', () => {
    it('should mount to the provided element', () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'mounted-content' } },
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(container.querySelector('#mounted-content')).not.toBeNull();
    });

    it('should return an AppInstance', () => {
      // Arrange
      const program = createMinimalProgram();

      // Act
      const app = createApp(program, container);

      // Assert
      expect(app).toBeDefined();
      expect(typeof app.destroy).toBe('function');
      expect(typeof app.setState).toBe('function');
      expect(typeof app.getState).toBe('function');
    });

    it('should render the view tree', () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'main',
          children: [
            {
              kind: 'element',
              tag: 'header',
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Header' } }],
            },
            {
              kind: 'element',
              tag: 'section',
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Content' } }],
            },
          ],
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(container.querySelector('main')).not.toBeNull();
      expect(container.querySelector('header')?.textContent).toBe('Header');
      expect(container.querySelector('section')?.textContent).toBe('Content');
    });

    it('should initialize state from program', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 42 },
          message: { type: 'string', initial: 'Hello' },
        },
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(app.getState('count')).toBe(42);
      expect(app.getState('message')).toBe('Hello');
    });
  });

  // ==================== Rendering with State ====================

  describe('rendering with state', () => {
    it('should render state values', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          title: { type: 'string', initial: 'Welcome' },
        },
        view: {
          kind: 'element',
          tag: 'h1',
          children: [{ kind: 'text', value: { expr: 'state', name: 'title' } }],
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(container.querySelector('h1')?.textContent).toBe('Welcome');
    });

    it('should update DOM when state changes', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'counter' } },
          children: [{ kind: 'text', value: { expr: 'state', name: 'count' } }],
        },
      });

      // Act
      const app = createApp(program, container);
      expect(container.querySelector('#counter')?.textContent).toBe('0');

      app.setState('count', 10);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(container.querySelector('#counter')?.textContent).toBe('10');
    });
  });

  // ==================== destroy() ====================

  describe('destroy()', () => {
    it('should remove rendered content from DOM', () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'to-be-removed' } },
        },
      });
      const app = createApp(program, container);

      expect(container.querySelector('#to-be-removed')).not.toBeNull();

      // Act
      app.destroy();

      // Assert
      expect(container.querySelector('#to-be-removed')).toBeNull();
    });

    it('should clean up reactive effects', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          value: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'state', name: 'value' } }],
        },
      });
      const app = createApp(program, container);

      // Act
      app.destroy();

      // Attempt to update state after destroy
      app.setState('value', 100);
      await Promise.resolve();

      // Assert - container should be empty and no errors
      expect(container.children.length).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      // Arrange
      const program = createMinimalProgram();
      const app = createApp(program, container);

      // Act & Assert - should not throw
      expect(() => {
        app.destroy();
        app.destroy();
        app.destroy();
      }).not.toThrow();
    });
  });

  // ==================== setState() ====================

  describe('setState()', () => {
    it('should update number state', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      app.setState('count', 42);

      // Assert
      expect(app.getState('count')).toBe(42);
    });

    it('should update string state', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          name: { type: 'string', initial: '' },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      app.setState('name', 'Updated Name');

      // Assert
      expect(app.getState('name')).toBe('Updated Name');
    });

    it('should update list state', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: [] },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      app.setState('items', ['a', 'b', 'c']);

      // Assert
      expect(app.getState('items')).toEqual(['a', 'b', 'c']);
    });

    it('should trigger reactive updates', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          message: { type: 'string', initial: 'Initial' },
        },
        view: {
          kind: 'element',
          tag: 'p',
          children: [{ kind: 'text', value: { expr: 'state', name: 'message' } }],
        },
      });
      const app = createApp(program, container);

      expect(container.querySelector('p')?.textContent).toBe('Initial');

      // Act
      app.setState('message', 'Updated');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(container.querySelector('p')?.textContent).toBe('Updated');
    });
  });

  // ==================== getState() ====================

  describe('getState()', () => {
    it('should return current number state value', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 100 },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      const value = app.getState('count');

      // Assert
      expect(value).toBe(100);
    });

    it('should return current string state value', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          greeting: { type: 'string', initial: 'Hello, World!' },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      const value = app.getState('greeting');

      // Assert
      expect(value).toBe('Hello, World!');
    });

    it('should return current list state value', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          tags: { type: 'list', initial: ['javascript', 'typescript'] },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      const value = app.getState('tags');

      // Assert
      expect(value).toEqual(['javascript', 'typescript']);
    });

    it('should return updated value after setState', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          score: { type: 'number', initial: 0 },
        },
        view: { kind: 'element', tag: 'div' },
      });
      const app = createApp(program, container);

      // Act
      app.setState('score', 999);

      // Assert
      expect(app.getState('score')).toBe(999);
    });
  });

  // ==================== Events and Actions ====================

  describe('events and actions', () => {
    it('should execute action when event is triggered', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          clicked: { type: 'number', initial: 0 },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'clicked', value: { expr: 'lit', value: 1 } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'test-button' },
            onClick: { event: 'click', action: 'handleClick' },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Click me' } }],
        },
      });

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('#test-button') as HTMLButtonElement;

      expect(app.getState('clicked')).toBe(0);

      button.click();

      // Wait for action execution
      await Promise.resolve();

      // Assert
      expect(app.getState('clicked')).toBe(1);
    });

    it('should execute increment action', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: {
          increment: {
            name: 'increment',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: { event: 'click', action: 'increment' },
          },
        },
      });

      // Act
      const app = createApp(program, container);
      const button = container.querySelector('button') as HTMLButtonElement;

      button.click();
      await Promise.resolve();
      expect(app.getState('count')).toBe(1);

      button.click();
      await Promise.resolve();
      expect(app.getState('count')).toBe(2);

      button.click();
      await Promise.resolve();
      expect(app.getState('count')).toBe(3);
    });

    it('should update DOM after action changes state', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          value: { type: 'number', initial: 0 },
        },
        actions: {
          setValue: {
            name: 'setValue',
            steps: [
              { do: 'set', target: 'value', value: { expr: 'lit', value: 42 } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'display' } },
              children: [{ kind: 'text', value: { expr: 'state', name: 'value' } }],
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'set-btn' },
                onClick: { event: 'click', action: 'setValue' },
              },
            },
          ],
        },
      });

      // Act
      const app = createApp(program, container);
      const display = container.querySelector('#display') as HTMLElement;
      const button = container.querySelector('#set-btn') as HTMLButtonElement;

      expect(display.textContent).toBe('0');

      button.click();
      await Promise.resolve();

      // Assert
      expect(display.textContent).toBe('42');
    });
  });

  // ==================== Complex Programs ====================

  describe('complex programs', () => {
    it('should handle conditional rendering based on state', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          loggedIn: { type: 'number', initial: 0 },
        },
        actions: {
          login: {
            name: 'login',
            steps: [
              { do: 'set', target: 'loggedIn', value: { expr: 'lit', value: 1 } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'loggedIn' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'welcome' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome!' } }],
              },
              else: {
                kind: 'element',
                tag: 'button',
                props: {
                  id: { expr: 'lit', value: 'login-btn' },
                  onClick: { event: 'click', action: 'login' },
                },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Log In' } }],
              },
            },
          ],
        },
      });

      // Act
      const app = createApp(program, container);

      // Initially logged out
      expect(container.querySelector('#login-btn')).not.toBeNull();
      expect(container.querySelector('#welcome')).toBeNull();

      // Click login
      (container.querySelector('#login-btn') as HTMLButtonElement).click();
      await Promise.resolve();

      // Assert - now logged in
      expect(container.querySelector('#login-btn')).toBeNull();
      expect(container.querySelector('#welcome')).not.toBeNull();
    });

    it('should handle list rendering with actions', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: ['Item 1', 'Item 2'] },
        },
        actions: {
          addItem: {
            name: 'addItem',
            steps: [
              {
                do: 'update',
                target: 'items',
                operation: 'push',
                value: { expr: 'lit', value: 'New Item' },
              },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'add-btn' },
                onClick: { event: 'click', action: 'addItem' },
              },
            },
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'element',
                tag: 'li',
                props: { className: { expr: 'lit', value: 'list-item' } },
                children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
              },
            },
          ],
        },
      });

      // Act
      const app = createApp(program, container);

      expect(container.querySelectorAll('.list-item').length).toBe(2);

      (container.querySelector('#add-btn') as HTMLButtonElement).click();
      await Promise.resolve();

      // Assert
      const items = container.querySelectorAll('.list-item');
      expect(items.length).toBe(3);
      expect(items[2].textContent).toBe('New Item');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty program', () => {
      // Arrange
      const program = createMinimalProgram();

      // Act & Assert - should not throw
      expect(() => {
        createApp(program, container);
      }).not.toThrow();
    });

    it('should handle program with no actions', () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: {},
        view: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'state', name: 'count' } }],
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(container.querySelector('span')?.textContent).toBe('0');

      // Can still update state directly
      app.setState('count', 5);
    });

    it('should handle nested views deeply', () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'div',
              children: [
                {
                  kind: 'element',
                  tag: 'div',
                  children: [
                    {
                      kind: 'element',
                      tag: 'div',
                      children: [
                        {
                          kind: 'element',
                          tag: 'span',
                          props: { id: { expr: 'lit', value: 'deep' } },
                          children: [{ kind: 'text', value: { expr: 'lit', value: 'Deep content' } }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      // Act
      const app = createApp(program, container);

      // Assert
      expect(container.querySelector('#deep')?.textContent).toBe('Deep content');
    });
  });
});
