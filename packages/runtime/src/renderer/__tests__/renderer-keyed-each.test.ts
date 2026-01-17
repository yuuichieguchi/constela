/**
 * Test module for Key-based list diff rendering in `each` loops.
 *
 * Coverage:
 * - Basic key-based DOM preservation
 * - Adding items at beginning/end
 * - Removing items from any position
 * - Reordering items
 * - Input state preservation on reorder
 * - Mixed operations (add, remove, reorder)
 * - Backward compatibility (no key = current behavior)
 * - Duplicate key warnings
 * - Various key types (number, string)
 *
 * TDD Red Phase: These tests verify that the renderEach function
 * uses the `key` expression to efficiently diff and reuse DOM nodes
 * instead of removing and re-creating all items on each update.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore, type StateStore } from '../../state/store.js';
import type {
  CompiledEachNode,
  CompiledExpression,
  CompiledElementNode,
} from '@constela/compiler';

// ==================== Helper Functions ====================

function createContext(
  stateDefinitions: Record<string, { type: string; initial: unknown }>,
  actions = {}
): RenderContext {
  return {
    state: createStateStore(stateDefinitions),
    actions,
    locals: {},
    cleanups: [],
  };
}

/**
 * Creates a CompiledEachNode for testing
 */
function createEachNode(
  itemsExpr: CompiledExpression,
  keyExpr?: CompiledExpression,
  bodyProps?: Record<string, CompiledExpression>
): CompiledEachNode {
  return {
    kind: 'each',
    items: itemsExpr,
    as: 'item',
    index: 'i',
    key: keyExpr,
    body: {
      kind: 'element',
      tag: 'div',
      props: {
        'data-id': { expr: 'var', name: 'item', path: 'id' },
        'data-name': { expr: 'var', name: 'item', path: 'name' },
        ...bodyProps,
      },
      children: [
        {
          kind: 'text',
          value: { expr: 'var', name: 'item', path: 'name' },
        },
      ],
    },
  };
}

/**
 * Creates a CompiledEachNode with input children for state preservation testing
 */
function createEachNodeWithInput(
  itemsExpr: CompiledExpression,
  keyExpr?: CompiledExpression
): CompiledEachNode {
  return {
    kind: 'each',
    items: itemsExpr,
    as: 'item',
    index: 'i',
    key: keyExpr,
    body: {
      kind: 'element',
      tag: 'div',
      props: {
        'data-id': { expr: 'var', name: 'item', path: 'id' },
      },
      children: [
        {
          kind: 'element',
          tag: 'input',
          props: {
            type: { expr: 'lit', value: 'text' },
            'data-input-id': { expr: 'var', name: 'item', path: 'id' },
          },
        },
      ],
    },
  };
}

// ==================== Test Suite ====================

describe('Renderer: Key-based list diff rendering', () => {
  let container: HTMLDivElement;
  let cleanups: (() => void)[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    cleanups = [];
  });

  afterEach(() => {
    // Cleanup all effects
    for (const cleanup of cleanups) {
      cleanup();
    }
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  // ==================== 1. Basic key-based preservation ====================

  describe('basic key-based preservation', () => {
    it('should reuse DOM elements when items have same keys in same order', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
            { id: 3, name: 'Cherry' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' } // key = item.id
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      // Store references to original DOM elements
      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(3);

      // Update with same items (could have different data but same keys)
      ctx.state.set('items', [
        { id: 1, name: 'Apple Updated' },
        { id: 2, name: 'Banana Updated' },
        { id: 3, name: 'Cherry Updated' },
      ]);

      // Assert - Same DOM elements should be reused
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(3);

      // Verify same DOM node references
      expect(elementsBefore[0]).toBe(elementsAfter[0]);
      expect(elementsBefore[1]).toBe(elementsAfter[1]);
      expect(elementsBefore[2]).toBe(elementsAfter[2]);

      // Verify content was updated
      expect(elementsAfter[0]?.textContent).toBe('Apple Updated');
      expect(elementsAfter[1]?.textContent).toBe('Banana Updated');
      expect(elementsAfter[2]?.textContent).toBe('Cherry Updated');
    });
  });

  // ==================== 2. Adding new item at end ====================

  describe('adding new item at end', () => {
    it('should preserve existing DOM elements and add new one at end', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(2);

      // Update: add new item at end
      ctx.state.set('items', [
        { id: 1, name: 'Apple' },
        { id: 2, name: 'Banana' },
        { id: 3, name: 'Cherry' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(3);

      // First two elements should be same references
      expect(elementsBefore[0]).toBe(elementsAfter[0]);
      expect(elementsBefore[1]).toBe(elementsAfter[1]);

      // Third element is new
      expect(elementsAfter[2]?.getAttribute('data-id')).toBe('3');
      expect(elementsAfter[2]?.textContent).toBe('Cherry');
    });
  });

  // ==================== 3. Adding new item at beginning ====================

  describe('adding new item at beginning', () => {
    it('should preserve existing DOM elements and add new one at beginning', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 2, name: 'Banana' },
            { id: 3, name: 'Cherry' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(2);
      const id2Element = elementsBefore[0];
      const id3Element = elementsBefore[1];

      // Update: add new item at beginning
      ctx.state.set('items', [
        { id: 1, name: 'Apple' },
        { id: 2, name: 'Banana' },
        { id: 3, name: 'Cherry' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(3);

      // First element is new
      expect(elementsAfter[0]?.getAttribute('data-id')).toBe('1');
      expect(elementsAfter[0]?.textContent).toBe('Apple');

      // Last two elements should be same references (moved in DOM)
      expect(elementsAfter[1]).toBe(id2Element);
      expect(elementsAfter[2]).toBe(id3Element);
    });
  });

  // ==================== 4. Removing item from middle ====================

  describe('removing item from middle', () => {
    it('should preserve remaining DOM elements when middle item is removed', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
            { id: 3, name: 'Cherry' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(3);
      const id1Element = elementsBefore[0];
      const id3Element = elementsBefore[2];

      // Update: remove middle item (id: 2)
      ctx.state.set('items', [
        { id: 1, name: 'Apple' },
        { id: 3, name: 'Cherry' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(2);

      // Elements for id:1 and id:3 should be preserved
      expect(elementsAfter[0]).toBe(id1Element);
      expect(elementsAfter[1]).toBe(id3Element);

      // Verify content
      expect(elementsAfter[0]?.getAttribute('data-id')).toBe('1');
      expect(elementsAfter[1]?.getAttribute('data-id')).toBe('3');
    });
  });

  // ==================== 5. Reordering items ====================

  describe('reordering items', () => {
    it('should reuse same DOM elements when items are reordered', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
            { id: 3, name: 'Cherry' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(3);
      const id1Element = elementsBefore[0];
      const id2Element = elementsBefore[1];
      const id3Element = elementsBefore[2];

      // Update: reorder to [3, 1, 2]
      ctx.state.set('items', [
        { id: 3, name: 'Cherry' },
        { id: 1, name: 'Apple' },
        { id: 2, name: 'Banana' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(3);

      // Same DOM elements, different order
      expect(elementsAfter[0]).toBe(id3Element);
      expect(elementsAfter[1]).toBe(id1Element);
      expect(elementsAfter[2]).toBe(id2Element);

      // Verify DOM order matches data order
      expect(elementsAfter[0]?.getAttribute('data-id')).toBe('3');
      expect(elementsAfter[1]?.getAttribute('data-id')).toBe('1');
      expect(elementsAfter[2]?.getAttribute('data-id')).toBe('2');
    });

    it('should handle reverse order', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'First' },
            { id: 2, name: 'Second' },
            { id: 3, name: 'Third' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      const id1Element = elementsBefore[0];
      const id2Element = elementsBefore[1];
      const id3Element = elementsBefore[2];

      // Update: reverse order
      ctx.state.set('items', [
        { id: 3, name: 'Third' },
        { id: 2, name: 'Second' },
        { id: 1, name: 'First' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];

      expect(elementsAfter[0]).toBe(id3Element);
      expect(elementsAfter[1]).toBe(id2Element);
      expect(elementsAfter[2]).toBe(id1Element);
    });
  });

  // ==================== 6. Input state preservation on reorder ====================

  describe('input state preservation on reorder', () => {
    it('should preserve input values when items are reordered', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNodeWithInput(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      // Type values into inputs
      const inputsBefore = Array.from(
        container.querySelectorAll('input')
      ) as HTMLInputElement[];
      expect(inputsBefore).toHaveLength(3);

      inputsBefore[0]!.value = 'Value for item 1';
      inputsBefore[1]!.value = 'Value for item 2';
      inputsBefore[2]!.value = 'Value for item 3';

      // Store references
      const input1 = inputsBefore[0];
      const input2 = inputsBefore[1];
      const input3 = inputsBefore[2];

      // Update: reorder to [3, 1, 2]
      ctx.state.set('items', [
        { id: 3, name: 'Item 3' },
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ]);

      // Assert
      const inputsAfter = Array.from(
        container.querySelectorAll('input')
      ) as HTMLInputElement[];
      expect(inputsAfter).toHaveLength(3);

      // Same input elements, reordered
      expect(inputsAfter[0]).toBe(input3);
      expect(inputsAfter[1]).toBe(input1);
      expect(inputsAfter[2]).toBe(input2);

      // Input values should be preserved
      expect(inputsAfter[0]?.value).toBe('Value for item 3');
      expect(inputsAfter[1]?.value).toBe('Value for item 1');
      expect(inputsAfter[2]?.value).toBe('Value for item 2');
    });

    it('should preserve focus when focused item is reordered', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNodeWithInput(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const inputs = container.querySelectorAll('input');
      const input2 = inputs[1] as HTMLInputElement;

      // Focus the second input
      input2.focus();
      expect(document.activeElement).toBe(input2);

      // Reorder: move item 2 to first position
      ctx.state.set('items', [
        { id: 2, name: 'Item 2' },
        { id: 1, name: 'Item 1' },
      ]);

      // Assert - Same input should still be focused
      expect(document.activeElement).toBe(input2);

      // The focused input should now be first in DOM order
      const inputsAfter = container.querySelectorAll('input');
      expect(inputsAfter[0]).toBe(input2);
    });
  });

  // ==================== 7. Mixed operations ====================

  describe('mixed operations (add, remove, reorder)', () => {
    it('should handle simultaneous add, remove, and reorder', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
            { id: 3, name: 'Cherry' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      const id1Element = elementsBefore[0];
      const id2Element = elementsBefore[1];
      // id3Element will be removed

      // Update: remove id:3, add id:4, reorder [4, 2, 1]
      ctx.state.set('items', [
        { id: 4, name: 'Date' },
        { id: 2, name: 'Banana' },
        { id: 1, name: 'Apple' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(3);

      // id:4 is new
      expect(elementsAfter[0]?.getAttribute('data-id')).toBe('4');
      expect(elementsAfter[0]?.textContent).toBe('Date');

      // id:2 and id:1 are preserved and reordered
      expect(elementsAfter[1]).toBe(id2Element);
      expect(elementsAfter[2]).toBe(id1Element);

      // id:3 should be removed from DOM
      expect(container.querySelector('[data-id="3"]')).toBeNull();
    });

    it('should handle empty list to populated list', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render (empty)
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      expect(container.querySelectorAll('[data-id]')).toHaveLength(0);

      // Update: add items
      ctx.state.set('items', [
        { id: 1, name: 'Apple' },
        { id: 2, name: 'Banana' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(2);
      expect(elementsAfter[0]?.getAttribute('data-id')).toBe('1');
      expect(elementsAfter[1]?.getAttribute('data-id')).toBe('2');
    });

    it('should handle populated list to empty list', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      expect(container.querySelectorAll('[data-id]')).toHaveLength(2);

      // Update: remove all items
      ctx.state.set('items', []);

      // Assert
      expect(container.querySelectorAll('[data-id]')).toHaveLength(0);
    });
  });

  // ==================== 8. Without key (backward compatibility) ====================

  describe('without key (backward compatibility)', () => {
    it('should re-render all items when no key is provided', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      // No key expression provided
      const node = createEachNode({ expr: 'state', name: 'items' });

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(2);

      // Update: same items
      ctx.state.set('items', [
        { id: 1, name: 'Apple Updated' },
        { id: 2, name: 'Banana Updated' },
      ]);

      // Assert - Without key, elements should be re-created (different references)
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(2);

      // Elements should NOT be the same references (current behavior)
      expect(elementsBefore[0]).not.toBe(elementsAfter[0]);
      expect(elementsBefore[1]).not.toBe(elementsAfter[1]);
    });
  });

  // ==================== 9. Duplicate keys warning ====================

  describe('duplicate keys warning', () => {
    it('should log a warning when duplicate keys are detected', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Apple' },
            { id: 1, name: 'Duplicate Apple' }, // Same key!
            { id: 2, name: 'Banana' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate key')
      );
    });
  });

  // ==================== 10. Key type handling ====================

  describe('key type handling', () => {
    it('should handle string keys', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 'apple', name: 'Apple' },
            { id: 'banana', name: 'Banana' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      const appleElement = elementsBefore[0];

      // Update: reorder
      ctx.state.set('items', [
        { id: 'banana', name: 'Banana' },
        { id: 'apple', name: 'Apple' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];

      // Apple element should now be second
      expect(elementsAfter[1]).toBe(appleElement);
    });

    it('should handle numeric keys', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 100, name: 'Item 100' },
            { id: 200, name: 'Item 200' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node = createEachNode(
        { expr: 'state', name: 'items' },
        { expr: 'var', name: 'item', path: 'id' }
      );

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      const item200Element = elementsBefore[1];

      // Update: add item at beginning
      ctx.state.set('items', [
        { id: 50, name: 'Item 50' },
        { id: 100, name: 'Item 100' },
        { id: 200, name: 'Item 200' },
      ]);

      // Assert
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsAfter).toHaveLength(3);

      // Item 200 element should be preserved
      expect(elementsAfter[2]).toBe(item200Element);
    });

    it('should handle using array index as key', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: ['Apple', 'Banana', 'Cherry'],
        },
      });
      cleanups = ctx.cleanups!;

      // Use index 'i' as key
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'i',
        key: { expr: 'var', name: 'i' },
        body: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-index': { expr: 'var', name: 'i' },
          },
          children: [
            { kind: 'text', value: { expr: 'var', name: 'item' } },
          ],
        },
      };

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const elementsBefore = Array.from(
        container.querySelectorAll('[data-index]')
      ) as HTMLElement[];
      expect(elementsBefore).toHaveLength(3);

      // Update: same length, different content
      ctx.state.set('items', ['Date', 'Elderberry', 'Fig']);

      // Assert - Elements should be reused (by index key)
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-index]')
      ) as HTMLElement[];

      // With index as key, same elements should be reused
      expect(elementsBefore[0]).toBe(elementsAfter[0]);
      expect(elementsBefore[1]).toBe(elementsAfter[1]);
      expect(elementsBefore[2]).toBe(elementsAfter[2]);

      // Content should be updated
      expect(elementsAfter[0]?.textContent).toBe('Date');
      expect(elementsAfter[1]?.textContent).toBe('Elderberry');
      expect(elementsAfter[2]?.textContent).toBe('Fig');
    });
  });

  // ==================== 11. Complex nested children ====================

  describe('complex nested children', () => {
    it('should preserve nested element state on reorder', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      // Create a more complex body with nested children
      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'i',
        key: { expr: 'var', name: 'item', path: 'id' },
        body: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-id': { expr: 'var', name: 'item', path: 'id' },
          },
          children: [
            {
              kind: 'element',
              tag: 'span',
              props: {
                className: { expr: 'lit', value: 'label' },
              },
              children: [
                { kind: 'text', value: { expr: 'var', name: 'item', path: 'name' } },
              ],
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                'data-btn-id': { expr: 'var', name: 'item', path: 'id' },
              },
            },
          ],
        },
      };

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      const buttonsBefore = Array.from(
        container.querySelectorAll('button')
      ) as HTMLButtonElement[];
      const btn1 = buttonsBefore[0];
      const btn2 = buttonsBefore[1];

      // Reorder
      ctx.state.set('items', [
        { id: 2, name: 'Item 2' },
        { id: 1, name: 'Item 1' },
      ]);

      // Assert - Nested buttons should also be preserved
      const buttonsAfter = Array.from(
        container.querySelectorAll('button')
      ) as HTMLButtonElement[];

      expect(buttonsAfter[0]).toBe(btn2);
      expect(buttonsAfter[1]).toBe(btn1);
    });
  });

  // ==================== 12. Update index variable correctly ====================

  describe('index variable updates', () => {
    it('should update index variable when items are reordered', () => {
      // Arrange
      const ctx = createContext({
        items: {
          type: 'array',
          initial: [
            { id: 'a', name: 'Alpha' },
            { id: 'b', name: 'Beta' },
            { id: 'c', name: 'Gamma' },
          ],
        },
      });
      cleanups = ctx.cleanups!;

      const node: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        index: 'i',
        key: { expr: 'var', name: 'item', path: 'id' },
        body: {
          kind: 'element',
          tag: 'div',
          props: {
            'data-id': { expr: 'var', name: 'item', path: 'id' },
            'data-index': { expr: 'var', name: 'i' },
          },
          children: [
            { kind: 'text', value: { expr: 'var', name: 'item', path: 'name' } },
          ],
        },
      };

      // Act - Initial render
      const fragment = render(node, ctx);
      container.appendChild(fragment);

      // Verify initial indices
      const elementsBefore = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];
      expect(elementsBefore[0]?.getAttribute('data-index')).toBe('0');
      expect(elementsBefore[1]?.getAttribute('data-index')).toBe('1');
      expect(elementsBefore[2]?.getAttribute('data-index')).toBe('2');

      // Reorder: move 'c' to first position
      ctx.state.set('items', [
        { id: 'c', name: 'Gamma' },
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ]);

      // Assert - Indices should be updated
      const elementsAfter = Array.from(
        container.querySelectorAll('[data-id]')
      ) as HTMLElement[];

      // Item 'c' should now have index 0
      expect(elementsAfter[0]?.getAttribute('data-id')).toBe('c');
      expect(elementsAfter[0]?.getAttribute('data-index')).toBe('0');

      // Item 'a' should now have index 1
      expect(elementsAfter[1]?.getAttribute('data-id')).toBe('a');
      expect(elementsAfter[1]?.getAttribute('data-index')).toBe('1');

      // Item 'b' should now have index 2
      expect(elementsAfter[2]?.getAttribute('data-id')).toBe('b');
      expect(elementsAfter[2]?.getAttribute('data-index')).toBe('2');
    });
  });
});
