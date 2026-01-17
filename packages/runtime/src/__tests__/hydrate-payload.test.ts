/**
 * Test module for Payload Evaluation in Hydration.
 *
 * Coverage:
 * - Object payload with expression fields in click handler
 * - Single expression payload (existing behavior)
 * - Object payload with concat expression
 * - Mixed literal and expression fields in object payload
 *
 * These tests verify the integration of evaluatePayload through hydrate.ts
 * to ensure the full end-to-end flow works correctly when events are dispatched.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hydrateApp } from '../hydrate.js';
import type { CompiledProgram } from '@constela/compiler';

describe('Payload Evaluation in Hydration', () => {
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

  // ==================== Helper Functions ====================

  function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  /**
   * Sets up container with SSR-rendered HTML to match the program structure
   */
  function setupSSRContent(html: string): void {
    container.innerHTML = html;
  }

  // ==================== Object Payload with Expression Fields ====================

  describe('object payload with expression fields in click handler', () => {
    it('should evaluate expressions in object payload when button is clicked', async () => {
      // Arrange
      // Component with button that has onClick handler
      // Handler has payload: { index: { expr: 'var', name: 'i' }, liked: { expr: 'state', path: ['liked'] } }
      // When button is clicked, the action should receive the evaluated payload
      const program = createMinimalProgram({
        state: {
          liked: { type: 'boolean', initial: true },
          receivedIndex: { type: 'number', initial: -1 },
          receivedLiked: { type: 'boolean', initial: false },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              // payload is an object: { index: 5, liked: true }
              { do: 'set', target: 'receivedIndex', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'index' } },
              { do: 'set', target: 'receivedLiked', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'liked' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'lit', value: [0, 1, 2, 3, 4, 5] },
              as: 'i',
              index: 'idx',
              body: {
                kind: 'element',
                tag: 'button',
                props: {
                  id: {
                    expr: 'concat',
                    items: [{ expr: 'lit', value: 'btn-' }, { expr: 'var', name: 'i' }],
                  },
                  onClick: {
                    event: 'click',
                    action: 'handleClick',
                    payload: {
                      index: { expr: 'var', name: 'i' },
                      liked: { expr: 'state', name: 'liked' },
                    },
                  },
                },
                children: [{ kind: 'text', value: { expr: 'var', name: 'i' } }],
              },
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<div><button id="btn-0">0</button><button id="btn-1">1</button><button id="btn-2">2</button><button id="btn-3">3</button><button id="btn-4">4</button><button id="btn-5">5</button></div>');

      // Act
      const app = hydrateApp({ program, container });

      // Verify initial state
      expect(app.getState('receivedIndex')).toBe(-1);
      expect(app.getState('receivedLiked')).toBe(false);

      // Click button with index 5
      const button = container.querySelector('#btn-5') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert - Evaluated payload should have been received
      expect(app.getState('receivedIndex')).toBe(5);
      expect(app.getState('receivedLiked')).toBe(true);

      app.destroy();
    });
  });

  // ==================== Single Expression Payload ====================

  describe('single expression payload (existing behavior)', () => {
    it('should evaluate single expression payload correctly', async () => {
      // Arrange
      // Payload: { expr: 'literal', value: 'test' } → dispatch receives 'test'
      const program = createMinimalProgram({
        state: {
          receivedValue: { type: 'string', initial: '' },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedValue', value: { expr: 'var', name: 'payload' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'test-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              payload: { expr: 'lit', value: 'test' },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Click' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="test-btn">Click</button>');

      // Act
      const app = hydrateApp({ program, container });

      // Verify initial state
      expect(app.getState('receivedValue')).toBe('');

      // Click button
      const button = container.querySelector('#test-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert - Single expression payload should be evaluated to 'test'
      expect(app.getState('receivedValue')).toBe('test');

      app.destroy();
    });

    it('should evaluate state expression in single payload', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          currentCount: { type: 'number', initial: 42 },
          receivedCount: { type: 'number', initial: 0 },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedCount', value: { expr: 'var', name: 'payload' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'count-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              payload: { expr: 'state', name: 'currentCount' },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Get Count' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="count-btn">Get Count</button>');

      // Act
      const app = hydrateApp({ program, container });
      
      const button = container.querySelector('#count-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert
      expect(app.getState('receivedCount')).toBe(42);

      app.destroy();
    });
  });

  // ==================== Object Payload with Concat Expression ====================

  describe('object payload with concat expression', () => {
    it('should evaluate concat expression within object payload', async () => {
      // Arrange
      // Payload: { message: { expr: 'concat', items: [{ expr: 'literal', value: 'Hello ' }, { expr: 'var', name: 'name' }] } }
      // Should evaluate to { message: 'Hello Alice' }
      const program = createMinimalProgram({
        state: {
          receivedMessage: { type: 'string', initial: '' },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedMessage', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'message' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'lit', value: ['Alice', 'Bob', 'Charlie'] },
              as: 'name',
              body: {
                kind: 'element',
                tag: 'button',
                props: {
                  id: {
                    expr: 'concat',
                    items: [{ expr: 'lit', value: 'greet-' }, { expr: 'var', name: 'name' }],
                  },
                  onClick: {
                    event: 'click',
                    action: 'handleClick',
                    payload: {
                      message: {
                        expr: 'concat',
                        items: [
                          { expr: 'lit', value: 'Hello ' },
                          { expr: 'var', name: 'name' },
                        ],
                      },
                    },
                  },
                },
                children: [{ kind: 'text', value: { expr: 'var', name: 'name' } }],
              },
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<div><button id="greet-Alice">Alice</button><button id="greet-Bob">Bob</button><button id="greet-Charlie">Charlie</button></div>');

      // Act
      const app = hydrateApp({ program, container });

      // Click Alice button
      const aliceButton = container.querySelector('#greet-Alice') as HTMLButtonElement;
      aliceButton.click();
      await Promise.resolve();

      // Assert
      expect(app.getState('receivedMessage')).toBe('Hello Alice');

      app.destroy();
    });
  });

  // ==================== Mixed Literal and Expression Fields ====================

  describe('mixed literal and expression fields in object payload', () => {
    it('should handle object payload where some fields are literals and some are expressions', async () => {
      // Arrange
      // Payload: { type: 'click', value: { expr: 'var', name: 'count' } }
      // where `type` is a literal string, not an expression
      // Note: In the compiled format, even literal strings are wrapped in expressions
      // But for this test, we verify that both expression fields and non-expression fields work
      const program = createMinimalProgram({
        state: {
          receivedType: { type: 'string', initial: '' },
          receivedValue: { type: 'number', initial: 0 },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedType', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'type' } },
              { do: 'set', target: 'receivedValue', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'value' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'lit', value: [10, 20, 30, 42] },
              as: 'count',
              body: {
                kind: 'element',
                tag: 'button',
                props: {
                  id: {
                    expr: 'concat',
                    items: [{ expr: 'lit', value: 'item-' }, { expr: 'var', name: 'count' }],
                  },
                  onClick: {
                    event: 'click',
                    action: 'handleClick',
                    payload: {
                      type: { expr: 'lit', value: 'click' },
                      value: { expr: 'var', name: 'count' },
                    },
                  },
                },
                children: [{ kind: 'text', value: { expr: 'var', name: 'count' } }],
              },
            },
          ],
        },
      });

      // Set up SSR content
      setupSSRContent('<div><button id="item-10">10</button><button id="item-20">20</button><button id="item-30">30</button><button id="item-42">42</button></div>');

      // Act
      const app = hydrateApp({ program, container });

      // Click button with value 42
      const button = container.querySelector('#item-42') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert - Both literal and expression fields should be evaluated correctly
      expect(app.getState('receivedType')).toBe('click');
      expect(app.getState('receivedValue')).toBe(42);

      app.destroy();
    });

    it('should handle deeply nested expression in object payload', async () => {
      // Arrange - Test with nested state access
      const program = createMinimalProgram({
        state: {
          user: { type: 'object', initial: { name: 'TestUser', age: 25 } },
          receivedName: { type: 'string', initial: '' },
          receivedAge: { type: 'number', initial: 0 },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedName', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'userName' } },
              { do: 'set', target: 'receivedAge', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'userAge' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'user-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              payload: {
                userName: { expr: 'state', name: 'user', path: 'name' },
                userAge: { expr: 'state', name: 'user', path: 'age' },
              },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Get User' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="user-btn">Get User</button>');

      // Act
      const app = hydrateApp({ program, container });

      const button = container.querySelector('#user-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert
      expect(app.getState('receivedName')).toBe('TestUser');
      expect(app.getState('receivedAge')).toBe(25);

      app.destroy();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty object payload', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          clicked: { type: 'boolean', initial: false },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'clicked', value: { expr: 'lit', value: true } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'empty-payload-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              // No payload
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'No Payload' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="empty-payload-btn">No Payload</button>');

      // Act
      const app = hydrateApp({ program, container });

      const button = container.querySelector('#empty-payload-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert - Action should still execute
      expect(app.getState('clicked')).toBe(true);

      app.destroy();
    });

    it('should handle payload with import expression', async () => {
      // Arrange
      const program = createMinimalProgram({
        importData: {
          config: { apiUrl: 'https://api.example.com' },
        },
        state: {
          receivedUrl: { type: 'string', initial: '' },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedUrl', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'url' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'import-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              payload: {
                url: { expr: 'import', name: 'config', path: 'apiUrl' },
              },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Get Config' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="import-btn">Get Config</button>');

      // Act
      const app = hydrateApp({ program, container });

      const button = container.querySelector('#import-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert
      expect(app.getState('receivedUrl')).toBe('https://api.example.com');

      app.destroy();
    });

    it('should handle payload with route expression', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          receivedId: { type: 'string', initial: '' },
        },
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'receivedId', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'itemId' } },
            ],
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            id: { expr: 'lit', value: 'route-btn' },
            onClick: {
              event: 'click',
              action: 'handleClick',
              payload: {
                itemId: { expr: 'route', name: 'id', source: 'param' },
              },
            },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Get Route' } }],
        },
      });

      // Set up SSR content
      setupSSRContent('<button id="route-btn">Get Route</button>');

      // Act
      const app = hydrateApp({
        program,
        container,
        route: {
          params: { id: 'item-999' },
          query: {},
          path: '/items/item-999',
        },
      });

      const button = container.querySelector('#route-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert
      expect(app.getState('receivedId')).toBe('item-999');

      app.destroy();
    });
  });
});
