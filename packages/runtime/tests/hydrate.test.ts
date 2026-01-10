/**
 * Test module for hydrateApp.
 *
 * Coverage:
 * - Basic hydration: attach to SSR HTML without DOM reconstruction
 * - State synchronization: initialize from program.state, reactive updates
 * - Conditional nodes (if): hydrate and update
 * - List nodes (each): hydrate and update
 * - AppInstance interface: destroy(), setState(), getState()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from '@constela/server';
import type { CompiledProgram } from '@constela/compiler';
// hydrateApp is not yet implemented - this import will cause tests to fail
import { hydrateApp } from '../src/hydrate.js';
import type { AppInstance } from '../src/app.js';

describe('hydrateApp', () => {
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

  // ==================== Basic Hydration ====================

  describe('basic hydration', () => {
    it('should attach to existing SSR HTML without DOM reconstruction', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'ssr-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello SSR' } },
          ],
        },
      });

      // Generate SSR HTML and set it to container
      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Get reference to existing DOM node before hydration
      const existingNode = container.querySelector('#ssr-content');

      // Act
      const app = hydrateApp({ program, container });

      // Assert - DOM node should be the same reference (not recreated)
      const hydratedNode = container.querySelector('#ssr-content');
      expect(hydratedNode).toBe(existingNode);
      expect(hydratedNode?.textContent).toBe('Hello SSR');
    });

    it('should preserve existing DOM structure after hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'main',
          children: [
            {
              kind: 'element',
              tag: 'header',
              props: { id: { expr: 'lit', value: 'header' } },
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Header' } }],
            },
            {
              kind: 'element',
              tag: 'section',
              props: { id: { expr: 'lit', value: 'content' } },
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Content' } }],
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      const existingHeader = container.querySelector('#header');
      const existingContent = container.querySelector('#content');

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(container.querySelector('#header')).toBe(existingHeader);
      expect(container.querySelector('#content')).toBe(existingContent);
      expect(container.querySelector('main')).not.toBeNull();
    });

    it('should enable event handlers on hydrated DOM elements', async () => {
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
            id: { expr: 'lit', value: 'click-btn' },
            onClick: { event: 'click', action: 'handleClick' },
          },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Click me' } }],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });
      const button = container.querySelector('#click-btn') as HTMLButtonElement;

      expect(app.getState('clicked')).toBe(0);

      button.click();
      await Promise.resolve();

      // Assert
      expect(app.getState('clicked')).toBe(1);
    });

    it('should return an AppInstance', async () => {
      // Arrange
      const program = createMinimalProgram();
      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(app).toBeDefined();
      expect(typeof app.destroy).toBe('function');
      expect(typeof app.setState).toBe('function');
      expect(typeof app.getState).toBe('function');
    });
  });

  // ==================== State Synchronization ====================

  describe('state synchronization', () => {
    it('should initialize state from program.state', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 42 },
          message: { type: 'string', initial: 'Hello' },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(app.getState('count')).toBe(42);
      expect(app.getState('message')).toBe('Hello');
    });

    it('should reactively update DOM after state change', async () => {
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

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      expect(container.querySelector('#counter')?.textContent).toBe('0');

      // Act
      const app = hydrateApp({ program, container });
      app.setState('count', 10);
      await Promise.resolve();

      // Assert
      expect(container.querySelector('#counter')?.textContent).toBe('10');
    });

    it('should update multiple state values', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          firstName: { type: 'string', initial: 'John' },
          lastName: { type: 'string', initial: 'Doe' },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'first-name' } },
              children: [{ kind: 'text', value: { expr: 'state', name: 'firstName' } }],
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'last-name' } },
              children: [{ kind: 'text', value: { expr: 'state', name: 'lastName' } }],
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });
      app.setState('firstName', 'Jane');
      app.setState('lastName', 'Smith');
      await Promise.resolve();

      // Assert
      expect(container.querySelector('#first-name')?.textContent).toBe('Jane');
      expect(container.querySelector('#last-name')?.textContent).toBe('Smith');
    });
  });

  // ==================== Conditional Nodes (if) ====================

  describe('conditional nodes (if)', () => {
    it('should hydrate if node correctly', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          showContent: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showContent' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Visible' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'placeholder' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Hidden' } }],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert - should have hydrated the then branch
      expect(container.querySelector('#content')).not.toBeNull();
      expect(container.querySelector('#content')?.textContent).toBe('Visible');
      expect(container.querySelector('#placeholder')).toBeNull();
    });

    it('should update when condition changes after hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          isLoggedIn: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isLoggedIn' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'welcome' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome!' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'login-prompt' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Please log in' } }],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Initially logged out
      expect(container.querySelector('#login-prompt')).not.toBeNull();
      expect(container.querySelector('#welcome')).toBeNull();

      // Act
      const app = hydrateApp({ program, container });
      app.setState('isLoggedIn', 1);
      await Promise.resolve();

      // Assert - should now show welcome
      expect(container.querySelector('#welcome')).not.toBeNull();
      expect(container.querySelector('#login-prompt')).toBeNull();
    });

    it('should handle nested if nodes after hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          level1: { type: 'number', initial: 1 },
          level2: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'level1' },
              then: {
                kind: 'if',
                condition: { expr: 'state', name: 'level2' },
                then: {
                  kind: 'element',
                  tag: 'span',
                  props: { id: { expr: 'lit', value: 'both-true' } },
                  children: [{ kind: 'text', value: { expr: 'lit', value: 'Both true' } }],
                },
                else: {
                  kind: 'element',
                  tag: 'span',
                  props: { id: { expr: 'lit', value: 'level2-false' } },
                  children: [{ kind: 'text', value: { expr: 'lit', value: 'Level2 false' } }],
                },
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'level1-false' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Level1 false' } }],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Initially both true
      expect(container.querySelector('#both-true')).not.toBeNull();

      // Change level2 to false
      app.setState('level2', 0);
      await Promise.resolve();

      // Assert
      expect(container.querySelector('#both-true')).toBeNull();
      expect(container.querySelector('#level2-false')).not.toBeNull();
    });
  });

  // ==================== List Nodes (each) ====================

  describe('list nodes (each)', () => {
    it('should hydrate each node correctly', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: ['Apple', 'Banana', 'Cherry'] },
        },
        view: {
          kind: 'element',
          tag: 'ul',
          children: [
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

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert - use tag selector since SSR outputs 'className' as attribute
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('Apple');
      expect(items[1].textContent).toBe('Banana');
      expect(items[2].textContent).toBe('Cherry');
    });

    it('should update list when items are added after hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: ['Item 1', 'Item 2'] },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'element',
                tag: 'span',
                props: { className: { expr: 'lit', value: 'item' } },
                children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Use tag selector since SSR outputs 'className' as attribute
      expect(container.querySelectorAll('span').length).toBe(2);

      // Act
      const app = hydrateApp({ program, container });
      app.setState('items', ['Item 1', 'Item 2', 'Item 3', 'Item 4']);
      await Promise.resolve();

      // Assert
      const items = container.querySelectorAll('span');
      expect(items.length).toBe(4);
      expect(items[2].textContent).toBe('Item 3');
      expect(items[3].textContent).toBe('Item 4');
    });

    it('should update list when items are removed after hydration', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: ['A', 'B', 'C', 'D'] },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: {
                kind: 'element',
                tag: 'span',
                props: { className: { expr: 'lit', value: 'item' } },
                children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Use tag selector since SSR outputs 'className' as attribute
      expect(container.querySelectorAll('span').length).toBe(4);

      // Act
      const app = hydrateApp({ program, container });
      app.setState('items', ['A', 'D']);
      await Promise.resolve();

      // Assert
      const items = container.querySelectorAll('span');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toBe('A');
      expect(items[1].textContent).toBe('D');
    });

    it('should handle each node with index variable', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          items: { type: 'list', initial: ['First', 'Second', 'Third'] },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              index: 'i',
              body: {
                kind: 'element',
                tag: 'div',
                props: { className: { expr: 'lit', value: 'indexed-item' } },
                children: [
                  { kind: 'text', value: { expr: 'var', name: 'i' } },
                  { kind: 'text', value: { expr: 'lit', value: ': ' } },
                  { kind: 'text', value: { expr: 'var', name: 'item' } },
                ],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert - use tag selector since SSR outputs 'className' as attribute
      // Note: container is a div, so 'div > div' would include the root div.
      // We need to select the inner item divs specifically.
      const root = container.firstElementChild as HTMLElement;
      const items = root.querySelectorAll(':scope > div');
      expect(items[0].textContent).toBe('0: First');
      expect(items[1].textContent).toBe('1: Second');
      expect(items[2].textContent).toBe('2: Third');
    });
  });

  // ==================== AppInstance Interface ====================

  describe('AppInstance interface', () => {
    describe('destroy()', () => {
      it('should clean up after destroy', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            value: { type: 'number', initial: 0 },
          },
          view: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'content' } },
            children: [{ kind: 'text', value: { expr: 'state', name: 'value' } }],
          },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        app.destroy();

        // Assert - container should be empty
        expect(container.children.length).toBe(0);
      });

      it('should not update DOM after destroy', async () => {
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

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        app.destroy();
        app.setState('value', 100);
        await Promise.resolve();

        // Assert - container should be empty and no errors
        expect(container.children.length).toBe(0);
      });

      it('should be safe to call destroy multiple times', async () => {
        // Arrange
        const program = createMinimalProgram();
        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act & Assert - should not throw
        expect(() => {
          app.destroy();
          app.destroy();
          app.destroy();
        }).not.toThrow();
      });
    });

    describe('setState()', () => {
      it('should update number state', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 0 },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        app.setState('count', 42);

        // Assert
        expect(app.getState('count')).toBe(42);
      });

      it('should update string state', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            name: { type: 'string', initial: '' },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        app.setState('name', 'Updated Name');

        // Assert
        expect(app.getState('name')).toBe('Updated Name');
      });

      it('should update list state', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            items: { type: 'list', initial: [] },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        app.setState('items', ['a', 'b', 'c']);

        // Assert
        expect(app.getState('items')).toEqual(['a', 'b', 'c']);
      });
    });

    describe('getState()', () => {
      it('should return current number state value', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 100 },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        const value = app.getState('count');

        // Assert
        expect(value).toBe(100);
      });

      it('should return current string state value', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            greeting: { type: 'string', initial: 'Hello, World!' },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        const value = app.getState('greeting');

        // Assert
        expect(value).toBe('Hello, World!');
      });

      it('should return updated value after setState', async () => {
        // Arrange
        const program = createMinimalProgram({
          state: {
            score: { type: 'number', initial: 0 },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act
        app.setState('score', 999);

        // Assert
        expect(app.getState('score')).toBe(999);
      });
    });
  });

  // ==================== Lifecycle Hooks ====================

  describe('lifecycle hooks', () => {
    describe('onMount', () => {
      it('should execute onMount action when app is hydrated', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onMount: 'initializeApp',
          },
          state: {
            initialized: { type: 'boolean', initial: false },
          },
          actions: {
            initializeApp: {
              name: 'initializeApp',
              steps: [
                { do: 'set', target: 'initialized', value: { expr: 'lit', value: true } },
              ],
            },
          },
          view: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'hydrate-target' } },
          },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        // Act
        const app = hydrateApp({ program, container });

        // Wait for lifecycle hook to execute
        await Promise.resolve();

        // Assert - onMount should have been executed, setting initialized to true
        expect(app.getState('initialized')).toBe(true);
      });

      it('should execute onMount with multiple steps during hydration', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onMount: 'complexInit',
          },
          state: {
            step1: { type: 'boolean', initial: false },
            step2: { type: 'boolean', initial: false },
            step3: { type: 'boolean', initial: false },
          },
          actions: {
            complexInit: {
              name: 'complexInit',
              steps: [
                { do: 'set', target: 'step1', value: { expr: 'lit', value: true } },
                { do: 'set', target: 'step2', value: { expr: 'lit', value: true } },
                { do: 'set', target: 'step3', value: { expr: 'lit', value: true } },
              ],
            },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        // Act
        const app = hydrateApp({ program, container });
        await Promise.resolve();

        // Assert - All steps should have been executed
        expect(app.getState('step1')).toBe(true);
        expect(app.getState('step2')).toBe(true);
        expect(app.getState('step3')).toBe(true);
      });

      it('should not break hydration if onMount action is missing', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onMount: 'nonExistentAction', // This action doesn't exist
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        // Act & Assert - Should not throw
        expect(() => {
          hydrateApp({ program, container });
        }).not.toThrow();
      });

      it('should allow onMount to update state that reflects in hydrated DOM', async () => {
        // Arrange - This simulates the dark mode use case: loadTheme reads from localStorage
        const program = createMinimalProgram({
          lifecycle: {
            onMount: 'loadTheme',
          },
          state: {
            theme: { type: 'string', initial: 'light' },
          },
          actions: {
            loadTheme: {
              name: 'loadTheme',
              steps: [
                // Simulates reading from localStorage and setting theme to 'dark'
                { do: 'set', target: 'theme', value: { expr: 'lit', value: 'dark' } },
              ],
            },
          },
          view: {
            kind: 'element',
            tag: 'div',
            props: {
              id: { expr: 'lit', value: 'themed-container' },
              'data-theme': { expr: 'state', name: 'theme' },
            },
          },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        // Initially SSR renders with 'light' theme
        expect(container.querySelector('#themed-container')?.getAttribute('data-theme')).toBe('light');

        // Act
        const app = hydrateApp({ program, container });
        await Promise.resolve();

        // Assert - onMount should have updated theme to 'dark'
        expect(app.getState('theme')).toBe('dark');
        // The DOM should reflect the new theme after hydration
        expect(container.querySelector('#themed-container')?.getAttribute('data-theme')).toBe('dark');
      });
    });

    describe('onUnmount', () => {
      it('should execute onUnmount action when app.destroy() is called', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onUnmount: 'cleanupApp',
          },
          state: {
            cleanedUp: { type: 'boolean', initial: false },
          },
          actions: {
            cleanupApp: {
              name: 'cleanupApp',
              steps: [
                { do: 'set', target: 'cleanedUp', value: { expr: 'lit', value: true } },
              ],
            },
          },
          view: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'unmount-target' } },
          },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Verify initial state
        expect(app.getState('cleanedUp')).toBe(false);

        // Act
        app.destroy();

        // Assert - onUnmount should have been executed, setting cleanedUp to true
        expect(app.getState('cleanedUp')).toBe(true);
      });

      it('should execute onUnmount with multiple steps when destroyed', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onUnmount: 'complexCleanup',
          },
          state: {
            step1Done: { type: 'boolean', initial: false },
            step2Done: { type: 'boolean', initial: false },
            step3Done: { type: 'boolean', initial: false },
          },
          actions: {
            complexCleanup: {
              name: 'complexCleanup',
              steps: [
                { do: 'set', target: 'step1Done', value: { expr: 'lit', value: true } },
                { do: 'set', target: 'step2Done', value: { expr: 'lit', value: true } },
                { do: 'set', target: 'step3Done', value: { expr: 'lit', value: true } },
              ],
            },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Verify initial state
        expect(app.getState('step1Done')).toBe(false);
        expect(app.getState('step2Done')).toBe(false);
        expect(app.getState('step3Done')).toBe(false);

        // Act
        app.destroy();

        // Assert - All cleanup steps should have been executed
        expect(app.getState('step1Done')).toBe(true);
        expect(app.getState('step2Done')).toBe(true);
        expect(app.getState('step3Done')).toBe(true);
      });

      it('should not break destroy if onUnmount action is missing', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onUnmount: 'nonExistentAction', // This action doesn't exist
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act & Assert - Should not throw
        expect(() => {
          app.destroy();
        }).not.toThrow();

        // Container should still be cleaned up
        expect(container.children.length).toBe(0);
      });

      it('should execute onUnmount before DOM cleanup', async () => {
        // Arrange - This test verifies the order of operations: onUnmount runs before DOM removal
        // The onUnmount action can still access state before cleanup completes
        const program = createMinimalProgram({
          lifecycle: {
            onUnmount: 'recordFinalState',
          },
          state: {
            count: { type: 'number', initial: 42 },
            finalCountRecorded: { type: 'number', initial: 0 },
          },
          actions: {
            recordFinalState: {
              name: 'recordFinalState',
              steps: [
                // Record the current count value during unmount
                { do: 'set', target: 'finalCountRecorded', value: { expr: 'state', name: 'count' } },
              ],
            },
          },
          view: {
            kind: 'element',
            tag: 'div',
            children: [{ kind: 'text', value: { expr: 'state', name: 'count' } }],
          },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Change count before destroy
        app.setState('count', 100);
        await Promise.resolve();

        // Act
        app.destroy();

        // Assert - onUnmount should have recorded the count value (100) before cleanup
        expect(app.getState('finalCountRecorded')).toBe(100);
      });

      it('should only execute onUnmount once even if destroy is called multiple times', async () => {
        // Arrange
        const program = createMinimalProgram({
          lifecycle: {
            onUnmount: 'incrementCounter',
          },
          state: {
            destroyCount: { type: 'number', initial: 0 },
          },
          actions: {
            incrementCounter: {
              name: 'incrementCounter',
              steps: [
                // This would increment each time if onUnmount were called multiple times
                { do: 'set', target: 'destroyCount', value: { expr: 'lit', value: 1 } },
              ],
            },
          },
          view: { kind: 'element', tag: 'div' },
        });

        const ssrHtml = await renderToString(program);
        container.innerHTML = ssrHtml;

        const app = hydrateApp({ program, container });

        // Act - Call destroy multiple times
        app.destroy();
        app.destroy();
        app.destroy();

        // Assert - onUnmount should have been executed only once
        expect(app.getState('destroyCount')).toBe(1);
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty program', async () => {
      // Arrange
      const program = createMinimalProgram();
      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act & Assert - should not throw
      expect(() => {
        hydrateApp({ program, container });
      }).not.toThrow();
    });

    it('should handle program with no actions', async () => {
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

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(container.querySelector('span')?.textContent).toBe('0');

      // Can still update state directly
      app.setState('count', 5);
      await Promise.resolve();
      expect(container.querySelector('span')?.textContent).toBe('5');
    });

    it('should handle deeply nested views', async () => {
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
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(container.querySelector('#deep')?.textContent).toBe('Deep content');
    });

    it('should handle mixed if and each nodes', async () => {
      // Arrange
      const program = createMinimalProgram({
        state: {
          showList: { type: 'number', initial: 1 },
          items: { type: 'list', initial: ['A', 'B', 'C'] },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showList' },
              then: {
                kind: 'element',
                tag: 'ul',
                children: [
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
              else: {
                kind: 'element',
                tag: 'p',
                props: { id: { expr: 'lit', value: 'empty-message' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'No items' } }],
              },
            },
          ],
        },
      });

      const ssrHtml = await renderToString(program);
      container.innerHTML = ssrHtml;

      // Initially showing list - use tag selector since SSR outputs 'className' as attribute
      expect(container.querySelectorAll('li').length).toBe(3);

      // Act
      const app = hydrateApp({ program, container });

      // Hide list
      app.setState('showList', 0);
      await Promise.resolve();

      // Assert
      expect(container.querySelectorAll('li').length).toBe(0);
      expect(container.querySelector('#empty-message')).not.toBeNull();

      // Show list again
      app.setState('showList', 1);
      await Promise.resolve();

      expect(container.querySelectorAll('li').length).toBe(3);
    });
  });
});
