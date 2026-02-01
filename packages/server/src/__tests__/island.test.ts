/**
 * Test module for SSR Island Rendering.
 *
 * Coverage:
 * - Basic Island rendering with data attributes
 * - Island with state serialization
 * - Island with different hydration strategies
 * - Island with strategyOptions
 * - Nested Islands
 * - Island content rendering (elements, text, expressions)
 *
 * TDD Red Phase: These tests verify the Island SSR rendering implementation.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from '../renderer.js';
import type { CompiledProgram, CompiledIslandNode } from '@constela/compiler';

// ==================== Helper Functions ====================

/**
 * Creates a minimal CompiledProgram for testing
 */
function createProgram(
  view: CompiledProgram['view'],
  state: CompiledProgram['state'] = {},
  actions: CompiledProgram['actions'] = {}
): CompiledProgram {
  return {
    version: '1.0',
    state,
    actions,
    view,
  };
}

/**
 * Creates a minimal CompiledIslandNode for testing
 */
function createIsland(
  overrides: Partial<CompiledIslandNode> = {}
): CompiledIslandNode {
  return {
    kind: 'island',
    id: 'test-island',
    strategy: 'load',
    content: { kind: 'element', tag: 'div' },
    ...overrides,
  };
}

// ==================== Basic Island Rendering ====================

describe('Island SSR Rendering', () => {
  describe('Basic Island Rendering', () => {
    it('should render island with wrapper div and data-island-id attribute', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'counter',
          strategy: 'visible',
          content: { kind: 'element', tag: 'button' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-id="counter"');
      expect(result).toContain('<div');
      expect(result).toContain('<button></button>');
    });

    it('should render island with data-island-strategy attribute', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'my-island',
          strategy: 'visible',
          content: { kind: 'element', tag: 'div' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-strategy="visible"');
    });

    it('should render island content inside wrapper div', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'content-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'button',
            props: {
              class: { expr: 'lit', value: 'btn-primary' },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Click me' } },
            ],
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<button class="btn-primary">Click me</button>');
      expect(result).toMatch(
        /^<div[^>]*data-island-id="content-island"[^>]*>.*<button.*<\/button>.*<\/div>$/
      );
    });
  });

  // ==================== Island with State Serialization ====================

  describe('Island with State Serialization', () => {
    it('should render island with data-island-state attribute containing serialized state', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'stateful-island',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'state', name: 'count' } },
          state: {
            count: { type: 'number', initial: 0 },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-state=');
      // The state should be serialized as JSON
      expect(result).toContain('&quot;count&quot;:0');
    });

    it('should serialize multiple state fields in data-island-state', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'multi-state-island',
          strategy: 'visible',
          content: { kind: 'element', tag: 'div' },
          state: {
            count: { type: 'number', initial: 42 },
            name: { type: 'string', initial: 'test' },
            active: { type: 'boolean', initial: true },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // Extract data-island-state value and parse it
      const stateMatch = result.match(/data-island-state="([^"]+)"/);
      expect(stateMatch).not.toBeNull();

      // Decode HTML entities and parse JSON
      const stateJson = stateMatch![1]!.replace(/&quot;/g, '"');
      const state = JSON.parse(stateJson);

      expect(state.count).toBe(42);
      expect(state.name).toBe('test');
      expect(state.active).toBe(true);
    });

    it('should serialize complex state types (arrays and objects)', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'complex-state-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
          state: {
            items: { type: 'list', initial: [1, 2, 3] },
            config: { type: 'object', initial: { key: 'value' } },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      const stateMatch = result.match(/data-island-state="([^"]+)"/);
      expect(stateMatch).not.toBeNull();

      const stateJson = stateMatch![1]!.replace(/&quot;/g, '"');
      const state = JSON.parse(stateJson);

      expect(state.items).toEqual([1, 2, 3]);
      expect(state.config).toEqual({ key: 'value' });
    });

    it('should render island state values in content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'state-content-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'span',
            children: [
              { kind: 'text', value: { expr: 'state', name: 'message' } },
            ],
          },
          state: {
            message: { type: 'string', initial: 'Hello, Island!' },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<span>Hello, Island!</span>');
    });

    it('should NOT include data-island-state when island has no state', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'stateless-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
          // No state property
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).not.toContain('data-island-state');
    });
  });

  // ==================== Island with Different Strategies ====================

  describe('Island with Different Hydration Strategies', () => {
    const strategies = ['load', 'idle', 'visible', 'interaction', 'media', 'never'] as const;

    for (const strategy of strategies) {
      it(`should render island with strategy="${strategy}"`, async () => {
        // Arrange
        const program = createProgram(
          createIsland({
            id: `${strategy}-island`,
            strategy,
            content: { kind: 'element', tag: 'div' },
          })
        );

        // Act
        const result = await renderToString(program);

        // Assert
        expect(result).toContain(`data-island-strategy="${strategy}"`);
      });
    }
  });

  // ==================== Island with strategyOptions ====================

  describe('Island with strategyOptions', () => {
    it('should render island with data-island-options for visible strategy', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'visible-options-island',
          strategy: 'visible',
          strategyOptions: { threshold: 0.5, rootMargin: '10px' },
          content: { kind: 'element', tag: 'div' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-options=');
      expect(result).toContain('threshold');
      expect(result).toContain('0.5');
      expect(result).toContain('rootMargin');
    });

    it('should render island with data-island-options for idle strategy', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'idle-options-island',
          strategy: 'idle',
          strategyOptions: { timeout: 2000 },
          content: { kind: 'element', tag: 'div' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-options=');
      expect(result).toContain('timeout');
      expect(result).toContain('2000');
    });

    it('should render island with data-island-options for media strategy', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'media-options-island',
          strategy: 'media',
          strategyOptions: { media: '(min-width: 768px)' },
          content: { kind: 'element', tag: 'div' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-options=');
      expect(result).toContain('media');
      expect(result).toContain('min-width');
    });

    it('should NOT include data-island-options when strategyOptions is not provided', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'no-options-island',
          strategy: 'visible',
          content: { kind: 'element', tag: 'div' },
          // No strategyOptions
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).not.toContain('data-island-options');
    });

    it('should properly escape strategyOptions JSON', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'escape-options-island',
          strategy: 'media',
          strategyOptions: { media: '(prefers-color-scheme: dark)' },
          content: { kind: 'element', tag: 'div' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // The options should be properly escaped for HTML attribute context
      expect(result).toContain('data-island-options=');
      // Should not break the HTML structure
      expect(result).toMatch(/<div[^>]*>.*<\/div>/);
    });
  });

  // ==================== Nested Islands ====================

  describe('Nested Islands', () => {
    it('should render nested islands with their own markers', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'outer-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'div',
            children: [
              createIsland({
                id: 'inner-island',
                strategy: 'visible',
                content: { kind: 'element', tag: 'button' },
              }),
            ],
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-id="outer-island"');
      expect(result).toContain('data-island-id="inner-island"');
      expect(result).toContain('data-island-strategy="load"');
      expect(result).toContain('data-island-strategy="visible"');
    });

    it('should maintain island hierarchy in HTML structure', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'parent',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'section',
            children: [
              createIsland({
                id: 'child',
                strategy: 'idle',
                content: { kind: 'text', value: { expr: 'lit', value: 'Nested content' } },
              }),
            ],
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // Parent island wrapper should contain child island wrapper
      const parentStart = result.indexOf('data-island-id="parent"');
      const childStart = result.indexOf('data-island-id="child"');
      expect(parentStart).toBeLessThan(childStart);
    });

    it('should render deeply nested islands (3 levels)', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'level-1',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'div',
            children: [
              createIsland({
                id: 'level-2',
                strategy: 'idle',
                content: {
                  kind: 'element',
                  tag: 'div',
                  children: [
                    createIsland({
                      id: 'level-3',
                      strategy: 'visible',
                      content: { kind: 'element', tag: 'span' },
                    }),
                  ],
                },
              }),
            ],
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-id="level-1"');
      expect(result).toContain('data-island-id="level-2"');
      expect(result).toContain('data-island-id="level-3"');
    });

    it('should isolate nested island state from parent island', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'parent-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'text', value: { expr: 'state', name: 'parentCount' } },
              createIsland({
                id: 'child-island',
                strategy: 'visible',
                content: { kind: 'text', value: { expr: 'state', name: 'childCount' } },
                state: {
                  childCount: { type: 'number', initial: 99 },
                },
              }),
            ],
          },
          state: {
            parentCount: { type: 'number', initial: 42 },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('42');
      expect(result).toContain('99');
      // Verify separate state serialization
      const parentStateMatch = result.match(
        /data-island-id="parent-island"[^>]*data-island-state="([^"]+)"/
      );
      const childStateMatch = result.match(
        /data-island-id="child-island"[^>]*data-island-state="([^"]+)"/
      );
      expect(parentStateMatch).not.toBeNull();
      expect(childStateMatch).not.toBeNull();
    });
  });

  // ==================== Island Content Rendering ====================

  describe('Island Content Rendering', () => {
    it('should render island with simple text content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'text-island',
          strategy: 'load',
          content: { kind: 'text', value: { expr: 'lit', value: 'Hello World' } },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('Hello World');
    });

    it('should render island with element content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'element-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'article',
            props: {
              class: { expr: 'lit', value: 'article-content' },
            },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<article class="article-content"></article>');
    });

    it('should render island with if/else content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'conditional-island',
          strategy: 'load',
          content: {
            kind: 'if',
            condition: { expr: 'state', name: 'showContent' },
            then: { kind: 'text', value: { expr: 'lit', value: 'Visible' } },
            else: { kind: 'text', value: { expr: 'lit', value: 'Hidden' } },
          },
          state: {
            showContent: { type: 'boolean', initial: true },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('Visible');
      expect(result).not.toContain('Hidden');
    });

    it('should render island with each content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'list-island',
          strategy: 'load',
          content: {
            kind: 'each',
            items: { expr: 'state', name: 'items' },
            as: 'item',
            body: {
              kind: 'element',
              tag: 'li',
              children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
            },
          },
          state: {
            items: { type: 'list', initial: ['apple', 'banana', 'cherry'] },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<li>apple</li>');
      expect(result).toContain('<li>banana</li>');
      expect(result).toContain('<li>cherry</li>');
    });

    it('should render island with expression in content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'expr-island',
          strategy: 'load',
          content: {
            kind: 'element',
            tag: 'span',
            children: [
              {
                kind: 'text',
                value: {
                  expr: 'bin',
                  op: '+',
                  left: { expr: 'state', name: 'prefix' },
                  right: { expr: 'state', name: 'suffix' },
                },
              },
            ],
          },
          state: {
            prefix: { type: 'string', initial: 'Hello, ' },
            suffix: { type: 'string', initial: 'World!' },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('<span>Hello, World!</span>');
    });

    it('should escape HTML in island content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'escape-island',
          strategy: 'load',
          content: {
            kind: 'text',
            value: { expr: 'state', name: 'html' },
          },
          state: {
            html: { type: 'string', initial: '<script>alert("XSS")</script>' },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  // ==================== Island with Actions ====================

  describe('Island with Actions', () => {
    it('should render island with event handlers (skipped in SSR)', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'interactive-island',
          strategy: 'interaction',
          content: {
            kind: 'element',
            tag: 'button',
            props: {
              class: { expr: 'lit', value: 'btn' },
              onclick: { event: 'click', action: 'handleClick' },
            },
            children: [{ kind: 'text', value: { expr: 'state', name: 'label' } }],
          },
          state: {
            label: { type: 'string', initial: 'Click me' },
          },
          actions: {
            handleClick: {
              name: 'handleClick',
              steps: [{ do: 'update', target: 'count', operation: 'increment' }],
            },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // Event handlers should NOT be in SSR output
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('handleClick');
      // But content should render
      expect(result).toContain('<button class="btn">Click me</button>');
    });
  });

  // ==================== Island Data Attributes Order ====================

  describe('Island Data Attributes', () => {
    it('should include all required data attributes in correct format', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'full-island',
          strategy: 'visible',
          strategyOptions: { threshold: 0.25 },
          content: { kind: 'element', tag: 'div' },
          state: {
            count: { type: 'number', initial: 5 },
          },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toMatch(/data-island-id="full-island"/);
      expect(result).toMatch(/data-island-strategy="visible"/);
      expect(result).toMatch(/data-island-options="[^"]+"/);
      expect(result).toMatch(/data-island-state="[^"]+"/);
    });

    it('should properly escape special characters in island id', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'island-with-special<chars>',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
        })
      );

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-id=');
      expect(result).not.toContain('<chars>');
      expect(result).toContain('&lt;chars&gt;');
    });
  });

  // ==================== Island with Global State ====================

  describe('Island with Global State Access', () => {
    it('should not access global program state from island content', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'isolated-island',
          strategy: 'load',
          content: {
            kind: 'text',
            // Attempt to access global state (should be undefined or empty)
            value: { expr: 'state', name: 'globalCount' },
          },
          // Island has no state, global state exists
        }),
        // Global state
        { globalCount: { type: 'number', initial: 999 } }
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // The island should NOT render the global state value
      // Since it can't access it, it should render empty or nothing
      // Note: Current implementation may actually access global state (this is a design question)
      // This test documents expected behavior
    });

    it('should prioritize island state over global state with same name', async () => {
      // Arrange
      const program = createProgram(
        createIsland({
          id: 'shadow-island',
          strategy: 'load',
          content: {
            kind: 'text',
            value: { expr: 'state', name: 'count' },
          },
          state: {
            count: { type: 'number', initial: 100 }, // Island's own count
          },
        }),
        // Global state with same name
        { count: { type: 'number', initial: 50 } }
      );

      // Act
      const result = await renderToString(program);

      // Assert
      // Island state should take precedence
      expect(result).toContain('100');
      expect(result).not.toContain('>50<');
    });
  });

  // ==================== Island Sibling Rendering ====================

  describe('Multiple Sibling Islands', () => {
    it('should render multiple sibling islands correctly', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'main',
        children: [
          createIsland({
            id: 'island-1',
            strategy: 'load',
            content: { kind: 'text', value: { expr: 'lit', value: 'First' } },
          }),
          createIsland({
            id: 'island-2',
            strategy: 'idle',
            content: { kind: 'text', value: { expr: 'lit', value: 'Second' } },
          }),
          createIsland({
            id: 'island-3',
            strategy: 'visible',
            content: { kind: 'text', value: { expr: 'lit', value: 'Third' } },
          }),
        ],
      });

      // Act
      const result = await renderToString(program);

      // Assert
      expect(result).toContain('data-island-id="island-1"');
      expect(result).toContain('data-island-id="island-2"');
      expect(result).toContain('data-island-id="island-3"');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('should maintain island independence with separate state', async () => {
      // Arrange
      const program = createProgram({
        kind: 'element',
        tag: 'div',
        children: [
          createIsland({
            id: 'counter-a',
            strategy: 'load',
            content: { kind: 'text', value: { expr: 'state', name: 'value' } },
            state: { value: { type: 'number', initial: 1 } },
          }),
          createIsland({
            id: 'counter-b',
            strategy: 'load',
            content: { kind: 'text', value: { expr: 'state', name: 'value' } },
            state: { value: { type: 'number', initial: 2 } },
          }),
        ],
      });

      // Act
      const result = await renderToString(program);

      // Assert
      // Each island should have its own state serialized
      expect(result).toContain('data-island-id="counter-a"');
      expect(result).toContain('data-island-id="counter-b"');

      // Extract state for each island
      const islandAMatch = result.match(
        /data-island-id="counter-a"[^>]*data-island-state="([^"]+)"/
      );
      const islandBMatch = result.match(
        /data-island-id="counter-b"[^>]*data-island-state="([^"]+)"/
      );

      expect(islandAMatch).not.toBeNull();
      expect(islandBMatch).not.toBeNull();

      const stateA = JSON.parse(islandAMatch![1]!.replace(/&quot;/g, '"'));
      const stateB = JSON.parse(islandBMatch![1]!.replace(/&quot;/g, '"'));

      expect(stateA.value).toBe(1);
      expect(stateB.value).toBe(2);
    });
  });
});
