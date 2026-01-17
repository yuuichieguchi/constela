/**
 * Test module for Renderer with Component Local State.
 *
 * Coverage:
 * - Local state initial value renders correctly
 * - UI updates when local action is executed
 * - Multiple instances have independent state
 * - Each loop components have independent state
 *
 * TDD Red Phase: These tests verify that the renderer properly handles
 * CompiledLocalStateNode for component-level local state that is independent
 * per component instance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type {
  CompiledNode,
  CompiledLocalStateNode,
  CompiledAction,
} from '@constela/compiler';

describe('Renderer with Component Local State', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  // ==================== Helper Functions ====================

  function createRenderContext(
    overrides?: Partial<RenderContext>
  ): RenderContext {
    return {
      state: createStateStore({}),
      actions: {},
      locals: {},
      cleanups: [],
      refs: {},
      ...overrides,
    };
  }

  /**
   * Creates a CompiledLocalStateNode for testing
   */
  function createLocalStateNode(options: {
    state: Record<string, { type: string; initial: unknown }>;
    actions?: Record<string, CompiledAction>;
    child: CompiledNode;
  }): CompiledLocalStateNode {
    return {
      kind: 'localState',
      state: options.state,
      actions: options.actions ?? {},
      child: options.child,
    };
  }

  // ==================== Initial Value Rendering ====================

  describe('local state initial value rendering', () => {
    it('should render local state initial value correctly', () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          count: { type: 'number', initial: 42 },
        },
        child: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const span = container.querySelector('span');
      expect(span?.textContent).toBe('42');
    });

    it('should render boolean local state initial value', () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          isExpanded: { type: 'boolean', initial: true },
        },
        child: {
          kind: 'element',
          tag: 'div',
          props: {
            className: {
              expr: 'cond',
              if: { expr: 'state', name: 'isExpanded' },
              then: { expr: 'lit', value: 'expanded' },
              else: { expr: 'lit', value: 'collapsed' },
            },
          },
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const div = container.querySelector('div');
      expect(div?.className).toBe('expanded');
    });

    it('should render string local state initial value', () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          label: { type: 'string', initial: 'Hello World' },
        },
        child: {
          kind: 'element',
          tag: 'p',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'label' } },
          ],
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const p = container.querySelector('p');
      expect(p?.textContent).toBe('Hello World');
    });

    it('should render conditional content based on local state', () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          showDetails: { type: 'boolean', initial: false },
        },
        child: {
          kind: 'if',
          condition: { expr: 'state', name: 'showDetails' },
          then: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'details' } },
          },
          else: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'no-details' } },
          },
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      expect(container.querySelector('#details')).toBeNull();
      expect(container.querySelector('#no-details')).not.toBeNull();
    });
  });

  // ==================== UI Updates on Local Action ====================

  describe('UI updates when local action is executed', () => {
    it('should update UI when local action toggles boolean state', async () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          isExpanded: { type: 'boolean', initial: false },
        },
        actions: {
          toggleExpand: {
            name: 'toggleExpand',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        },
        child: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'toggle-btn' },
                onClick: { event: 'click', action: 'toggleExpand' },
              },
            },
            {
              kind: 'element',
              tag: 'span',
              props: {
                className: {
                  expr: 'cond',
                  if: { expr: 'state', name: 'isExpanded' },
                  then: { expr: 'lit', value: 'expanded' },
                  else: { expr: 'lit', value: 'collapsed' },
                },
              },
            },
          ],
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Initial state
      const span = container.querySelector('span');
      expect(span?.className).toBe('collapsed');

      // Click button to trigger local action
      const button = container.querySelector('#toggle-btn') as HTMLButtonElement;
      button.click();

      // Wait for async action execution
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - UI should update
      expect(span?.className).toBe('expanded');
    });

    it('should update UI when local action increments number state', async () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          count: { type: 'number', initial: 0 },
        },
        actions: {
          increment: {
            name: 'increment',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        },
        child: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'inc-btn' },
                onClick: { event: 'click', action: 'increment' },
              },
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'count-display' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'count' } },
              ],
            },
          ],
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Initial state
      const countDisplay = container.querySelector('#count-display');
      expect(countDisplay?.textContent).toBe('0');

      // Click button multiple times
      const button = container.querySelector('#inc-btn') as HTMLButtonElement;
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(countDisplay?.textContent).toBe('1');

      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(countDisplay?.textContent).toBe('2');

      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(countDisplay?.textContent).toBe('3');
    });

    it('should update UI when local action sets value with payload', async () => {
      // Arrange
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          selectedId: { type: 'string', initial: '' },
        },
        actions: {
          selectItem: {
            name: 'selectItem',
            steps: [
              { do: 'set', target: 'selectedId', value: { expr: 'var', name: 'payload' } },
            ],
          },
        },
        child: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'select-btn' },
                onClick: {
                  event: 'click',
                  action: 'selectItem',
                  payload: { expr: 'lit', value: 'item-123' },
                },
              },
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'selected-display' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'selectedId' } },
              ],
            },
          ],
        },
      });

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Initial state
      const selectedDisplay = container.querySelector('#selected-display');
      expect(selectedDisplay?.textContent).toBe('');

      // Click button
      const button = container.querySelector('#select-btn') as HTMLButtonElement;
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(selectedDisplay?.textContent).toBe('item-123');
    });
  });

  // ==================== Multiple Instances Independence ====================

  describe('multiple instances should have independent state', () => {
    it('should maintain independent state for multiple component instances', async () => {
      // Arrange - Two instances of the same local state component
      const createInstance = (id: string): CompiledLocalStateNode =>
        createLocalStateNode({
          state: {
            count: { type: 'number', initial: 0 },
          },
          actions: {
            increment: {
              name: 'increment',
              steps: [{ do: 'update', target: 'count', operation: 'increment' }],
            },
          },
          child: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: id } },
            children: [
              {
                kind: 'element',
                tag: 'button',
                props: {
                  className: { expr: 'lit', value: 'inc-btn' },
                  onClick: { event: 'click', action: 'increment' },
                },
              },
              {
                kind: 'element',
                tag: 'span',
                props: { className: { expr: 'lit', value: 'count-display' } },
                children: [
                  { kind: 'text', value: { expr: 'state', name: 'count' } },
                ],
              },
            ],
          },
        });

      const wrapperNode: CompiledNode = {
        kind: 'element',
        tag: 'div',
        children: [
          createInstance('instance-1'),
          createInstance('instance-2'),
        ],
      };

      const ctx = createRenderContext();

      // Act
      const result = render(wrapperNode, ctx);
      container.appendChild(result);

      // Get elements for each instance
      const instance1 = container.querySelector('#instance-1');
      const instance2 = container.querySelector('#instance-2');
      const btn1 = instance1?.querySelector('.inc-btn') as HTMLButtonElement;
      const btn2 = instance2?.querySelector('.inc-btn') as HTMLButtonElement;
      const display1 = instance1?.querySelector('.count-display');
      const display2 = instance2?.querySelector('.count-display');

      // Initial state - both should be 0
      expect(display1?.textContent).toBe('0');
      expect(display2?.textContent).toBe('0');

      // Increment instance 1 twice
      btn1.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      btn1.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Increment instance 2 once
      btn2.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - instances should have independent state
      expect(display1?.textContent).toBe('2');
      expect(display2?.textContent).toBe('1');
    });

    it('should maintain independent boolean state for multiple instances', async () => {
      // Arrange
      const createToggleInstance = (id: string): CompiledLocalStateNode =>
        createLocalStateNode({
          state: {
            isExpanded: { type: 'boolean', initial: false },
          },
          actions: {
            toggle: {
              name: 'toggle',
              steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
            },
          },
          child: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: id } },
            children: [
              {
                kind: 'element',
                tag: 'button',
                props: {
                  className: { expr: 'lit', value: 'toggle-btn' },
                  onClick: { event: 'click', action: 'toggle' },
                },
              },
              {
                kind: 'element',
                tag: 'span',
                props: {
                  className: {
                    expr: 'cond',
                    if: { expr: 'state', name: 'isExpanded' },
                    then: { expr: 'lit', value: 'expanded' },
                    else: { expr: 'lit', value: 'collapsed' },
                  },
                },
              },
            ],
          },
        });

      const wrapperNode: CompiledNode = {
        kind: 'element',
        tag: 'div',
        children: [
          createToggleInstance('toggle-1'),
          createToggleInstance('toggle-2'),
          createToggleInstance('toggle-3'),
        ],
      };

      const ctx = createRenderContext();

      // Act
      const result = render(wrapperNode, ctx);
      container.appendChild(result);

      const instance1 = container.querySelector('#toggle-1');
      const instance2 = container.querySelector('#toggle-2');
      const instance3 = container.querySelector('#toggle-3');
      const btn1 = instance1?.querySelector('.toggle-btn') as HTMLButtonElement;
      const btn2 = instance2?.querySelector('.toggle-btn') as HTMLButtonElement;
      const span1 = instance1?.querySelector('span');
      const span2 = instance2?.querySelector('span');
      const span3 = instance3?.querySelector('span');

      // Initial state - all collapsed
      expect(span1?.className).toBe('collapsed');
      expect(span2?.className).toBe('collapsed');
      expect(span3?.className).toBe('collapsed');

      // Toggle instance 1
      btn1.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Toggle instance 2 twice (back to original)
      btn2.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      btn2.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - independent states
      expect(span1?.className).toBe('expanded');
      expect(span2?.className).toBe('collapsed');
      expect(span3?.className).toBe('collapsed');
    });
  });

  // ==================== Each Loop Components Independence ====================

  describe('each loop components should have independent state', () => {
    it('should maintain independent state for components in each loop', async () => {
      // Arrange - Each loop that renders local state components
      const localStateComponent: CompiledLocalStateNode = createLocalStateNode({
        state: {
          isSelected: { type: 'boolean', initial: false },
        },
        actions: {
          toggleSelect: {
            name: 'toggleSelect',
            steps: [{ do: 'update', target: 'isSelected', operation: 'toggle' }],
          },
        },
        child: {
          kind: 'element',
          tag: 'li',
          props: {
            className: {
              expr: 'cond',
              if: { expr: 'state', name: 'isSelected' },
              then: { expr: 'lit', value: 'selected' },
              else: { expr: 'lit', value: 'not-selected' },
            },
          },
          children: [
            { kind: 'text', value: { expr: 'var', name: 'item', path: 'name' } },
            {
              kind: 'element',
              tag: 'button',
              props: {
                className: { expr: 'lit', value: 'select-btn' },
                onClick: { event: 'click', action: 'toggleSelect' },
              },
            },
          ],
        },
      });

      // For each loop, we need to wrap the local state component properly
      // In a real scenario, the component would be expanded inside the each body
      const node: CompiledNode = {
        kind: 'element',
        tag: 'ul',
        children: [
          // Simulate rendered each loop with 3 items
          // Each item has its own local state
          createLocalStateNode({
            state: { isSelected: { type: 'boolean', initial: false } },
            actions: {
              toggleSelect: {
                name: 'toggleSelect',
                steps: [{ do: 'update', target: 'isSelected', operation: 'toggle' }],
              },
            },
            child: {
              kind: 'element',
              tag: 'li',
              props: {
                id: { expr: 'lit', value: 'item-0' },
                className: {
                  expr: 'cond',
                  if: { expr: 'state', name: 'isSelected' },
                  then: { expr: 'lit', value: 'selected' },
                  else: { expr: 'lit', value: 'not-selected' },
                },
              },
              children: [
                { kind: 'text', value: { expr: 'lit', value: 'Item 0' } },
                {
                  kind: 'element',
                  tag: 'button',
                  props: {
                    className: { expr: 'lit', value: 'select-btn' },
                    onClick: { event: 'click', action: 'toggleSelect' },
                  },
                },
              ],
            },
          }),
          createLocalStateNode({
            state: { isSelected: { type: 'boolean', initial: false } },
            actions: {
              toggleSelect: {
                name: 'toggleSelect',
                steps: [{ do: 'update', target: 'isSelected', operation: 'toggle' }],
              },
            },
            child: {
              kind: 'element',
              tag: 'li',
              props: {
                id: { expr: 'lit', value: 'item-1' },
                className: {
                  expr: 'cond',
                  if: { expr: 'state', name: 'isSelected' },
                  then: { expr: 'lit', value: 'selected' },
                  else: { expr: 'lit', value: 'not-selected' },
                },
              },
              children: [
                { kind: 'text', value: { expr: 'lit', value: 'Item 1' } },
                {
                  kind: 'element',
                  tag: 'button',
                  props: {
                    className: { expr: 'lit', value: 'select-btn' },
                    onClick: { event: 'click', action: 'toggleSelect' },
                  },
                },
              ],
            },
          }),
          createLocalStateNode({
            state: { isSelected: { type: 'boolean', initial: false } },
            actions: {
              toggleSelect: {
                name: 'toggleSelect',
                steps: [{ do: 'update', target: 'isSelected', operation: 'toggle' }],
              },
            },
            child: {
              kind: 'element',
              tag: 'li',
              props: {
                id: { expr: 'lit', value: 'item-2' },
                className: {
                  expr: 'cond',
                  if: { expr: 'state', name: 'isSelected' },
                  then: { expr: 'lit', value: 'selected' },
                  else: { expr: 'lit', value: 'not-selected' },
                },
              },
              children: [
                { kind: 'text', value: { expr: 'lit', value: 'Item 2' } },
                {
                  kind: 'element',
                  tag: 'button',
                  props: {
                    className: { expr: 'lit', value: 'select-btn' },
                    onClick: { event: 'click', action: 'toggleSelect' },
                  },
                },
              ],
            },
          }),
        ],
      };

      const ctx = createRenderContext();

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const item0 = container.querySelector('#item-0');
      const item1 = container.querySelector('#item-1');
      const item2 = container.querySelector('#item-2');
      const btn0 = item0?.querySelector('.select-btn') as HTMLButtonElement;
      const btn1 = item1?.querySelector('.select-btn') as HTMLButtonElement;

      // Initial state - all not-selected
      expect(item0?.className).toBe('not-selected');
      expect(item1?.className).toBe('not-selected');
      expect(item2?.className).toBe('not-selected');

      // Select item 0
      btn0.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Select item 1
      btn1.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - independent states
      expect(item0?.className).toBe('selected');
      expect(item1?.className).toBe('selected');
      expect(item2?.className).toBe('not-selected');

      // Toggle item 0 again
      btn0.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(item0?.className).toBe('not-selected');
      expect(item1?.className).toBe('selected');
      expect(item2?.className).toBe('not-selected');
    });
  });

  // ==================== Combination with Global State ====================

  describe('combination with global state', () => {
    it('should handle local state alongside global state', async () => {
      // Arrange
      const globalState = createStateStore({
        globalCount: { type: 'number', initial: 100 },
      });

      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          localCount: { type: 'number', initial: 0 },
        },
        actions: {
          incrementLocal: {
            name: 'incrementLocal',
            steps: [{ do: 'update', target: 'localCount', operation: 'increment' }],
          },
        },
        child: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'global' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'globalCount' } },
              ],
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'local' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'localCount' } },
              ],
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'local-btn' },
                onClick: { event: 'click', action: 'incrementLocal' },
              },
            },
          ],
        },
      });

      const ctx = createRenderContext({ state: globalState });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const globalDisplay = container.querySelector('#global');
      const localDisplay = container.querySelector('#local');
      const localBtn = container.querySelector('#local-btn') as HTMLButtonElement;

      // Initial values
      expect(globalDisplay?.textContent).toBe('100');
      expect(localDisplay?.textContent).toBe('0');

      // Increment local state
      localBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - only local state changes
      expect(globalDisplay?.textContent).toBe('100');
      expect(localDisplay?.textContent).toBe('1');
    });
  });

  // ==================== Cleanup ====================

  describe('cleanup', () => {
    it('should collect cleanups for local state effects', () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const node: CompiledLocalStateNode = createLocalStateNode({
        state: {
          count: { type: 'number', initial: 0 },
        },
        child: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
      });

      const ctx = createRenderContext({ cleanups });

      // Act
      render(node, ctx);

      // Assert - cleanups should be collected for reactive effects
      expect(cleanups.length).toBeGreaterThan(0);
    });
  });
});
