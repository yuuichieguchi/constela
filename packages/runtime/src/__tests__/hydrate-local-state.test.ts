/**
 * Test module for Hydrate with Component Local State.
 *
 * Coverage:
 * - Initial value hydration: SSR-rendered initial values are maintained
 * - Local action execution: click triggers toggle/increment on hydrated elements
 * - Multiple instance independence: each instance has its own isolated state
 * - Each loop independence: localState in each loop items are independent
 * - Global and local state coexistence: local shadows global where applicable
 *
 * TDD Red Phase: These tests verify that hydrateApp properly handles
 * CompiledLocalStateNode for component-level local state during hydration.
 * The hydrate function currently does NOT handle 'localState' case, so tests should fail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hydrateApp } from '../hydrate.js';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledLocalStateNode,
  CompiledAction,
} from '@constela/compiler';

describe('Hydrate with Component Local State', () => {
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

  // ==================== Test Case 1: Initial Value Hydration ====================

  describe('initial value hydration', () => {
    it('should maintain SSR-rendered initial value after hydration', async () => {
      /**
       * Given: SSR rendered a localState component with count=42
       * When: hydrateApp is called on the SSR HTML
       * Then: The hydrated DOM should still show 42 and be reactive
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
        state: {
          count: { type: 'number', initial: 42 },
        },
        child: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'count-display' } },
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
      });

      const program = createMinimalProgram({
        view: localStateNode,
      });

      // SSR would have rendered this HTML
      setupSSRContent('<span id="count-display">42</span>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert - initial value should be maintained
      const span = container.querySelector('#count-display');
      expect(span?.textContent).toBe('42');

      app.destroy();
    });

    it('should maintain SSR-rendered boolean state initial value', async () => {
      /**
       * Given: SSR rendered a localState component with isExpanded=true
       * When: hydrateApp is called
       * Then: The hydrated element should have class 'expanded'
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
        state: {
          isExpanded: { type: 'boolean', initial: true },
        },
        child: {
          kind: 'element',
          tag: 'div',
          props: {
            id: { expr: 'lit', value: 'expandable' },
            className: {
              expr: 'cond',
              if: { expr: 'state', name: 'isExpanded' },
              then: { expr: 'lit', value: 'expanded' },
              else: { expr: 'lit', value: 'collapsed' },
            },
          },
        },
      });

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<div id="expandable" class="expanded"></div>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      const div = container.querySelector('#expandable');
      expect(div?.className).toBe('expanded');

      app.destroy();
    });

    it('should render conditional content based on local state initial value', async () => {
      /**
       * Given: SSR rendered a localState with showDetails=false, so else branch is shown
       * When: hydrateApp is called
       * Then: The else branch element should be present
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
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
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Details shown' } }],
          },
          else: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'no-details' } },
            children: [{ kind: 'text', value: { expr: 'lit', value: 'No details' } }],
          },
        },
      });

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<!--if:else--><div id="no-details">No details</div>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      expect(container.querySelector('#details')).toBeNull();
      expect(container.querySelector('#no-details')).not.toBeNull();
      expect(container.querySelector('#no-details')?.textContent).toBe('No details');

      app.destroy();
    });
  });

  // ==================== Test Case 2: Local Action Execution ====================

  describe('local action execution', () => {
    it('should toggle boolean state when local action is triggered', async () => {
      /**
       * Given: A hydrated localState component with isExpanded=false and a toggleExpand action
       * When: The button is clicked
       * Then: isExpanded should become true and the UI should update
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
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
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Toggle' } }],
            },
            {
              kind: 'element',
              tag: 'span',
              props: {
                id: { expr: 'lit', value: 'status' },
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

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<div><button id="toggle-btn">Toggle</button><span id="status" class="collapsed"></span></div>');

      // Act
      const app = hydrateApp({ program, container });

      // Initial state
      const span = container.querySelector('#status');
      expect(span?.className).toBe('collapsed');

      // Click button to trigger local action
      const button = container.querySelector('#toggle-btn') as HTMLButtonElement;
      button.click();

      // Wait for async action execution
      await Promise.resolve();

      // Assert - UI should update
      expect(span?.className).toBe('expanded');

      app.destroy();
    });

    it('should increment number state when local action is triggered', async () => {
      /**
       * Given: A hydrated localState component with count=0 and an increment action
       * When: The button is clicked 3 times
       * Then: count should become 3 and the UI should show 3
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
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
              children: [{ kind: 'text', value: { expr: 'lit', value: '+' } }],
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

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<div><button id="inc-btn">+</button><span id="count-display">0</span></div>');

      // Act
      const app = hydrateApp({ program, container });

      const countDisplay = container.querySelector('#count-display');
      expect(countDisplay?.textContent).toBe('0');

      const button = container.querySelector('#inc-btn') as HTMLButtonElement;
      
      // Click 3 times
      button.click();
      await Promise.resolve();
      expect(countDisplay?.textContent).toBe('1');

      button.click();
      await Promise.resolve();
      expect(countDisplay?.textContent).toBe('2');

      button.click();
      await Promise.resolve();
      expect(countDisplay?.textContent).toBe('3');

      app.destroy();
    });

    it('should set value with payload when local action is triggered', async () => {
      /**
       * Given: A hydrated localState component with selectedId='' and a selectItem action
       * When: The button is clicked with payload 'item-123'
       * Then: selectedId should become 'item-123'
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
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
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Select' } }],
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

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<div><button id="select-btn">Select</button><span id="selected-display"></span></div>');

      // Act
      const app = hydrateApp({ program, container });

      const selectedDisplay = container.querySelector('#selected-display');
      expect(selectedDisplay?.textContent).toBe('');

      const button = container.querySelector('#select-btn') as HTMLButtonElement;
      button.click();
      await Promise.resolve();

      // Assert
      expect(selectedDisplay?.textContent).toBe('item-123');

      app.destroy();
    });
  });

  // ==================== Test Case 3: Multiple Instance Independence ====================

  describe('multiple instance independence', () => {
    it('should maintain independent state for multiple localState instances', async () => {
      /**
       * Given: Two hydrated localState component instances with count=0
       * When: Instance 1 button is clicked twice, Instance 2 button is clicked once
       * Then: Instance 1 shows 2, Instance 2 shows 1
       */
      
      // Arrange
      const createCounterInstance = (id: string): CompiledLocalStateNode =>
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
                children: [{ kind: 'text', value: { expr: 'lit', value: '+' } }],
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

      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createCounterInstance('counter-1'),
            createCounterInstance('counter-2'),
          ],
        },
      });

      setupSSRContent(
        '<div>' +
        '<div id="counter-1"><button class="inc-btn">+</button><span class="count-display">0</span></div>' +
        '<div id="counter-2"><button class="inc-btn">+</button><span class="count-display">0</span></div>' +
        '</div>'
      );

      // Act
      const app = hydrateApp({ program, container });

      const instance1 = container.querySelector('#counter-1');
      const instance2 = container.querySelector('#counter-2');
      const btn1 = instance1?.querySelector('.inc-btn') as HTMLButtonElement;
      const btn2 = instance2?.querySelector('.inc-btn') as HTMLButtonElement;
      const display1 = instance1?.querySelector('.count-display');
      const display2 = instance2?.querySelector('.count-display');

      // Initial state - both should be 0
      expect(display1?.textContent).toBe('0');
      expect(display2?.textContent).toBe('0');

      // Increment instance 1 twice
      btn1.click();
      await Promise.resolve();
      btn1.click();
      await Promise.resolve();

      // Increment instance 2 once
      btn2.click();
      await Promise.resolve();

      // Assert - instances should have independent state
      expect(display1?.textContent).toBe('2');
      expect(display2?.textContent).toBe('1');

      app.destroy();
    });

    it('should maintain independent boolean state for multiple toggle instances', async () => {
      /**
       * Given: Three toggle instances with isExpanded=false
       * When: Instance 1 is toggled once, Instance 2 is toggled twice
       * Then: Instance 1 is expanded, Instance 2 is collapsed, Instance 3 is collapsed
       */
      
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

      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createToggleInstance('toggle-1'),
            createToggleInstance('toggle-2'),
            createToggleInstance('toggle-3'),
          ],
        },
      });

      setupSSRContent(
        '<div>' +
        '<div id="toggle-1"><button class="toggle-btn"></button><span class="collapsed"></span></div>' +
        '<div id="toggle-2"><button class="toggle-btn"></button><span class="collapsed"></span></div>' +
        '<div id="toggle-3"><button class="toggle-btn"></button><span class="collapsed"></span></div>' +
        '</div>'
      );

      // Act
      const app = hydrateApp({ program, container });

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

      // Toggle instance 1 once
      btn1.click();
      await Promise.resolve();

      // Toggle instance 2 twice (back to original)
      btn2.click();
      await Promise.resolve();
      btn2.click();
      await Promise.resolve();

      // Assert - independent states
      expect(span1?.className).toBe('expanded');
      expect(span2?.className).toBe('collapsed');
      expect(span3?.className).toBe('collapsed');

      app.destroy();
    });
  });

  // ==================== Test Case 4: Each Loop Independence ====================

  describe('each loop independence', () => {
    it('should maintain independent local state for components in each loop', async () => {
      /**
       * Given: An each loop rendering 3 items, each with localState isSelected=false
       * When: Item 0 and Item 1 are clicked
       * Then: Item 0 and Item 1 are selected, Item 2 is not selected
       */
      
      // Arrange
      // Each item in the loop has its own localState
      const createItemWithLocalState = (index: number): CompiledLocalStateNode =>
        createLocalStateNode({
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
              id: { expr: 'lit', value: `item-${index}` },
              className: {
                expr: 'cond',
                if: { expr: 'state', name: 'isSelected' },
                then: { expr: 'lit', value: 'selected' },
                else: { expr: 'lit', value: 'not-selected' },
              },
            },
            children: [
              { kind: 'text', value: { expr: 'lit', value: `Item ${index}` } },
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

      // Simulate what compiler would produce for an each loop with localState items
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'ul',
          children: [
            createItemWithLocalState(0),
            createItemWithLocalState(1),
            createItemWithLocalState(2),
          ],
        },
      });

      setupSSRContent(
        '<ul>' +
        '<li id="item-0" class="not-selected">Item 0<button class="select-btn"></button></li>' +
        '<li id="item-1" class="not-selected">Item 1<button class="select-btn"></button></li>' +
        '<li id="item-2" class="not-selected">Item 2<button class="select-btn"></button></li>' +
        '</ul>'
      );

      // Act
      const app = hydrateApp({ program, container });

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
      await Promise.resolve();

      // Select item 1
      btn1.click();
      await Promise.resolve();

      // Assert - independent states
      expect(item0?.className).toBe('selected');
      expect(item1?.className).toBe('selected');
      expect(item2?.className).toBe('not-selected');

      // Toggle item 0 again
      btn0.click();
      await Promise.resolve();

      // Assert
      expect(item0?.className).toBe('not-selected');
      expect(item1?.className).toBe('selected');
      expect(item2?.className).toBe('not-selected');

      app.destroy();
    });
  });

  // ==================== Test Case 5: Global and Local State Coexistence ====================

  describe('global and local state coexistence', () => {
    it('should handle local state alongside global state', async () => {
      /**
       * Given: A component with global state (globalCount=100) and local state (localCount=0)
       * When: Local increment button is clicked
       * Then: localCount becomes 1, globalCount remains 100
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
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
              props: { id: { expr: 'lit', value: 'global-display' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'globalCount' } },
              ],
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'local-display' } },
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

      const program = createMinimalProgram({
        state: {
          globalCount: { type: 'number', initial: 100 },
        },
        view: localStateNode,
      });

      setupSSRContent('<div><span id="global-display">100</span><span id="local-display">0</span><button id="local-btn"></button></div>');

      // Act
      const app = hydrateApp({ program, container });

      const globalDisplay = container.querySelector('#global-display');
      const localDisplay = container.querySelector('#local-display');
      const localBtn = container.querySelector('#local-btn') as HTMLButtonElement;

      // Initial values
      expect(globalDisplay?.textContent).toBe('100');
      expect(localDisplay?.textContent).toBe('0');

      // Increment local state
      localBtn.click();
      await Promise.resolve();

      // Assert - only local state changes
      expect(globalDisplay?.textContent).toBe('100');
      expect(localDisplay?.textContent).toBe('1');

      app.destroy();
    });

    it('should allow local state to shadow global state with same name', async () => {
      /**
       * Given: Global state has 'count=100' and local state has 'count=0'
       * When: Local increment is triggered
       * Then: Local count becomes 1, global count remains 100 (local shadows global)
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
        state: {
          count: { type: 'number', initial: 0 }, // Same name as global state
        },
        actions: {
          incrementLocal: {
            name: 'incrementLocal',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        },
        child: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'local-count' } },
              children: [
                // This should resolve to local 'count', not global 'count'
                { kind: 'text', value: { expr: 'state', name: 'count' } },
              ],
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'inc-local' },
                onClick: { event: 'click', action: 'incrementLocal' },
              },
            },
          ],
        },
      });

      const program = createMinimalProgram({
        state: {
          count: { type: 'number', initial: 100 }, // Global count
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'global-count' } },
              children: [
                // This should show global count (outside localState)
                { kind: 'text', value: { expr: 'state', name: 'count' } },
              ],
            },
            localStateNode,
          ],
        },
      });

      setupSSRContent(
        '<div>' +
        '<span id="global-count">100</span>' +
        '<div><span id="local-count">0</span><button id="inc-local"></button></div>' +
        '</div>'
      );

      // Act
      const app = hydrateApp({ program, container });

      const globalCount = container.querySelector('#global-count');
      const localCount = container.querySelector('#local-count');
      const incLocalBtn = container.querySelector('#inc-local') as HTMLButtonElement;

      // Initial values
      expect(globalCount?.textContent).toBe('100');
      expect(localCount?.textContent).toBe('0');

      // Increment local (shadowed) count
      incLocalBtn.click();
      await Promise.resolve();

      // Assert - local shadows global, global remains unchanged
      expect(globalCount?.textContent).toBe('100');
      expect(localCount?.textContent).toBe('1');

      // Verify global state is unaffected via app API
      expect(app.getState('count')).toBe(100);

      app.destroy();
    });

    it('should allow global action to work alongside local actions', async () => {
      /**
       * Given: A component with global action (incrementGlobal) and local action (incrementLocal)
       * When: Both actions are triggered
       * Then: Both counters update independently
       */
      
      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
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
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'global-btn' },
                onClick: { event: 'click', action: 'incrementGlobal' },
              },
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                id: { expr: 'lit', value: 'local-btn' },
                onClick: { event: 'click', action: 'incrementLocal' },
              },
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'global-display' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'globalCount' } },
              ],
            },
            {
              kind: 'element',
              tag: 'span',
              props: { id: { expr: 'lit', value: 'local-display' } },
              children: [
                { kind: 'text', value: { expr: 'state', name: 'localCount' } },
              ],
            },
          ],
        },
      });

      const program = createMinimalProgram({
        state: {
          globalCount: { type: 'number', initial: 0 },
        },
        actions: {
          incrementGlobal: {
            name: 'incrementGlobal',
            steps: [{ do: 'update', target: 'globalCount', operation: 'increment' }],
          },
        },
        view: localStateNode,
      });

      setupSSRContent(
        '<div>' +
        '<button id="global-btn"></button>' +
        '<button id="local-btn"></button>' +
        '<span id="global-display">0</span>' +
        '<span id="local-display">0</span>' +
        '</div>'
      );

      // Act
      const app = hydrateApp({ program, container });

      const globalBtn = container.querySelector('#global-btn') as HTMLButtonElement;
      const localBtn = container.querySelector('#local-btn') as HTMLButtonElement;
      const globalDisplay = container.querySelector('#global-display');
      const localDisplay = container.querySelector('#local-display');

      // Initial values
      expect(globalDisplay?.textContent).toBe('0');
      expect(localDisplay?.textContent).toBe('0');

      // Trigger global action
      globalBtn.click();
      await Promise.resolve();

      expect(globalDisplay?.textContent).toBe('1');
      expect(localDisplay?.textContent).toBe('0');

      // Trigger local action
      localBtn.click();
      await Promise.resolve();

      // Assert - both updated independently
      expect(globalDisplay?.textContent).toBe('1');
      expect(localDisplay?.textContent).toBe('1');

      app.destroy();
    });
  });

  // ==================== Inter-Field Dependency in LocalState Initialization ====================

  describe('inter-field dependency in localState initialization (hydrate)', () => {
    /**
     * BUG: When field B's initial value references field A via
     * { expr: 'local', name: '_fieldA' }, field A is undefined because
     * ctx.locals hasn't been updated yet during the initialization loop
     * inside createLocalStateStore in hydrate.ts.
     *
     * The fix should progressively update ctx.locals as each field is initialized,
     * so that later fields can reference earlier ones during hydration.
     */

    it('should resolve field B that references field A via expr:get on a literal object', async () => {
      /**
       * Given: SSR rendered localState with _bounds and _gridMin = _bounds.min
       * When: hydrateApp is called
       * Then: _gridMin should resolve to 0 (from _bounds.min)
       *
       * Currently BROKEN: _bounds is undefined when _gridMin is evaluated
       * in createLocalStateStore inside hydrate.ts.
       */

      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
        state: {
          _bounds: {
            type: 'object',
            initial: { min: 0, max: 100 },
          },
          _gridMin: {
            type: 'number',
            initial: {
              expr: 'get',
              base: { expr: 'local', name: '_bounds' },
              path: 'min',
            } as unknown,
          },
        },
        child: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'result' } },
          children: [
            { kind: 'text', value: { expr: 'state', name: '_gridMin' } },
          ],
        },
      });

      const program = createMinimalProgram({
        view: localStateNode,
      });

      // SSR would have rendered _gridMin as "0" if the bug were fixed.
      // We set it to "0" to match expected post-fix SSR output.
      setupSSRContent('<span id="result">0</span>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert - after hydration, the text should reflect the correctly resolved value
      await Promise.resolve();
      const span = container.querySelector('#result');
      expect(span?.textContent).toBe('0');

      app.destroy();
    });

    it('should resolve field B that computes from two properties of field A via expr:bin', async () => {
      /**
       * Given: SSR rendered localState with _bounds ({min:10, max:200}) and _range = max - min
       * When: hydrateApp is called
       * Then: _range should resolve to 190
       *
       * Currently BROKEN: _bounds is undefined, so bin:- produces NaN.
       */

      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
        state: {
          _bounds: {
            type: 'object',
            initial: { min: 10, max: 200 },
          },
          _range: {
            type: 'number',
            initial: {
              expr: 'bin',
              op: '-',
              left: {
                expr: 'get',
                base: { expr: 'local', name: '_bounds' },
                path: 'max',
              },
              right: {
                expr: 'get',
                base: { expr: 'local', name: '_bounds' },
                path: 'min',
              },
            } as unknown,
          },
        },
        child: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'result' } },
          children: [
            { kind: 'text', value: { expr: 'state', name: '_range' } },
          ],
        },
      });

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<span id="result">190</span>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      await Promise.resolve();
      const span = container.querySelector('#result');
      expect(span?.textContent).toBe('190');

      app.destroy();
    });

    it('should resolve a three-field chain A -> B -> C', async () => {
      /**
       * Given: SSR rendered localState with:
       *   _base = 10, _doubled = _base * 2, _tripled = _doubled + _base
       * When: hydrateApp is called
       * Then: _tripled should resolve to 30 (10*2 + 10)
       *
       * Currently BROKEN: _base is undefined when _doubled is evaluated,
       * so _doubled = NaN, _tripled = NaN.
       */

      // Arrange
      const localStateNode: CompiledLocalStateNode = createLocalStateNode({
        state: {
          _base: {
            type: 'number',
            initial: 10,
          },
          _doubled: {
            type: 'number',
            initial: {
              expr: 'bin',
              op: '*',
              left: { expr: 'local', name: '_base' },
              right: { expr: 'lit', value: 2 },
            } as unknown,
          },
          _tripled: {
            type: 'number',
            initial: {
              expr: 'bin',
              op: '+',
              left: { expr: 'local', name: '_doubled' },
              right: { expr: 'local', name: '_base' },
            } as unknown,
          },
        },
        child: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'result' } },
          children: [
            { kind: 'text', value: { expr: 'state', name: '_tripled' } },
          ],
        },
      });

      const program = createMinimalProgram({
        view: localStateNode,
      });

      setupSSRContent('<span id="result">30</span>');

      // Act
      const app = hydrateApp({ program, container });

      // Assert
      await Promise.resolve();
      const span = container.querySelector('#result');
      expect(span?.textContent).toBe('30');

      app.destroy();
    });
  });
});
