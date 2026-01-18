/**
 * Test module for Renderer Portal Node.
 *
 * Coverage:
 * - Render children to document.body when target is 'body'
 * - Render children to document.head when target is 'head'
 * - Render children to element matching CSS selector
 * - Update portal content reactively
 * - Cleanup portal content on unmount
 * - Handle non-existent selector gracefully
 *
 * TDD Red Phase: These tests verify that the renderer properly handles
 * PortalNode for rendering children to different DOM locations.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledNode, CompiledAction } from '@constela/compiler';

/**
 * Portal node type - renders children to a different DOM location
 * This type should be added to ast.ts and transform.ts
 */
interface CompiledPortalNode {
  kind: 'portal';
  target: 'body' | 'head' | string; // 'body', 'head', or CSS selector
  children: CompiledNode[];
}

describe('Renderer Portal Node', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    // Clean up any portal content that may have been added to body/head
    document.querySelectorAll('[data-portal]').forEach((el) => el.remove());
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
   * Creates a portal node for testing
   */
  function createPortalNode(
    target: 'body' | 'head' | string,
    children: CompiledNode[]
  ): CompiledPortalNode {
    return {
      kind: 'portal',
      target,
      children,
    };
  }

  // ==================== Portal to Body Tests ====================

  describe('when target is body', () => {
    it('should render children to document.body when target is body', () => {
      // Arrange
      const portalNode = createPortalNode('body', [
        {
          kind: 'element',
          tag: 'div',
          props: {
            id: { expr: 'lit', value: 'portal-content' },
            className: { expr: 'lit', value: 'modal' },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Portal Content' } },
          ],
        },
      ]);

      const ctx = createRenderContext();

      // Act
      // This will fail because 'portal' kind is not recognized by the renderer
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert - Content should be in document.body, not in container
      const portalContent = document.body.querySelector('#portal-content');
      expect(portalContent).not.toBeNull();
      expect(portalContent?.textContent).toBe('Portal Content');
      expect(portalContent?.className).toBe('modal');

      // Content should NOT be inside the container
      const insideContainer = container.querySelector('#portal-content');
      expect(insideContainer).toBeNull();
    });

    it('should render multiple children to document.body', () => {
      // Arrange
      const portalNode = createPortalNode('body', [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'modal-backdrop' } },
        },
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'modal-dialog' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Dialog Content' } },
          ],
        },
      ]);

      const ctx = createRenderContext();

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert
      expect(document.body.querySelector('#modal-backdrop')).not.toBeNull();
      expect(document.body.querySelector('#modal-dialog')).not.toBeNull();
      expect(
        document.body.querySelector('#modal-dialog')?.textContent
      ).toBe('Dialog Content');
    });
  });

  // ==================== Portal to Head Tests ====================

  describe('when target is head', () => {
    it('should render children to document.head when target is head', () => {
      // Arrange
      const portalNode = createPortalNode('head', [
        {
          kind: 'element',
          tag: 'style',
          props: {
            id: { expr: 'lit', value: 'dynamic-style' },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: '.modal { display: block; }' } },
          ],
        },
      ]);

      const ctx = createRenderContext();

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert
      const styleElement = document.head.querySelector('#dynamic-style');
      expect(styleElement).not.toBeNull();
      expect(styleElement?.textContent).toBe('.modal { display: block; }');
    });

    it('should render meta tags to document.head', () => {
      // Arrange
      const portalNode = createPortalNode('head', [
        {
          kind: 'element',
          tag: 'meta',
          props: {
            name: { expr: 'lit', value: 'description' },
            content: { expr: 'lit', value: 'Dynamic page description' },
          },
        },
      ]);

      const ctx = createRenderContext();

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert
      const metaElement = document.head.querySelector('meta[name="description"]');
      expect(metaElement).not.toBeNull();
      expect(metaElement?.getAttribute('content')).toBe('Dynamic page description');
    });
  });

  // ==================== Portal to CSS Selector Tests ====================

  describe('when target is CSS selector', () => {
    it('should render children to element matching CSS selector', () => {
      // Arrange - Create a target element
      const targetElement = document.createElement('div');
      targetElement.id = 'portal-target';
      document.body.appendChild(targetElement);

      const portalNode = createPortalNode('#portal-target', [
        {
          kind: 'element',
          tag: 'span',
          props: { className: { expr: 'lit', value: 'injected-content' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Injected!' } },
          ],
        },
      ]);

      const ctx = createRenderContext();

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert
      const injectedContent = targetElement.querySelector('.injected-content');
      expect(injectedContent).not.toBeNull();
      expect(injectedContent?.textContent).toBe('Injected!');

      // Cleanup
      targetElement.remove();
    });

    it('should render to element matching class selector', () => {
      // Arrange
      const targetElement = document.createElement('div');
      targetElement.className = 'notification-area';
      document.body.appendChild(targetElement);

      const portalNode = createPortalNode('.notification-area', [
        {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'notification' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'New notification!' } },
          ],
        },
      ]);

      const ctx = createRenderContext();

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert
      const notification = targetElement.querySelector('.notification');
      expect(notification).not.toBeNull();
      expect(notification?.textContent).toBe('New notification!');

      // Cleanup
      targetElement.remove();
    });
  });

  // ==================== Reactive Updates Tests ====================

  describe('reactive portal content updates', () => {
    it('should update portal content reactively when state changes', async () => {
      // Arrange
      const state = createStateStore({
        message: { type: 'string', initial: 'Initial Message' },
      });

      const portalNode = createPortalNode('body', [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'reactive-portal' } },
          children: [
            { kind: 'text', value: { expr: 'state', name: 'message' } },
          ],
        },
      ]);

      const ctx = createRenderContext({ state });

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Initial assertion
      const portalContent = document.body.querySelector('#reactive-portal');
      expect(portalContent?.textContent).toBe('Initial Message');

      // Update state
      state.set('message', 'Updated Message');

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Content should be updated
      expect(portalContent?.textContent).toBe('Updated Message');
    });

    it('should update portal content when conditional changes', async () => {
      // Arrange
      const state = createStateStore({
        isVisible: { type: 'boolean', initial: true },
      });

      const portalNode = createPortalNode('body', [
        {
          kind: 'if',
          condition: { expr: 'state', name: 'isVisible' },
          then: {
            kind: 'element',
            tag: 'div',
            props: { id: { expr: 'lit', value: 'conditional-content' } },
            children: [
              { kind: 'text', value: { expr: 'lit', value: 'Visible!' } },
            ],
          },
        },
      ]);

      const ctx = createRenderContext({ state });

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Initial assertion - should be visible
      expect(
        document.body.querySelector('#conditional-content')
      ).not.toBeNull();

      // Update state to hide
      state.set('isVisible', false);

      // Wait for reactive update
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Content should be removed
      expect(document.body.querySelector('#conditional-content')).toBeNull();
    });
  });

  // ==================== Cleanup Tests ====================

  describe('portal cleanup on unmount', () => {
    it('should cleanup portal content on unmount', () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const portalNode = createPortalNode('body', [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'cleanup-portal' } },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Will be cleaned up' } },
          ],
        },
      ]);

      const ctx = createRenderContext({ cleanups });

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Verify content exists
      expect(
        document.body.querySelector('#cleanup-portal')
      ).not.toBeNull();

      // Simulate unmount by running cleanups
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Assert - Portal content should be removed
      expect(document.body.querySelector('#cleanup-portal')).toBeNull();
    });

    it('should cleanup all nested portal content', () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const portalNode = createPortalNode('body', [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'outer-portal' } },
          children: [
            {
              kind: 'element',
              tag: 'div',
              props: { id: { expr: 'lit', value: 'inner-element' } },
            },
          ],
        },
      ]);

      const ctx = createRenderContext({ cleanups });

      // Act
      const result = render(portalNode as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Run cleanups
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Assert
      expect(document.body.querySelector('#outer-portal')).toBeNull();
      expect(document.body.querySelector('#inner-element')).toBeNull();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle non-existent selector gracefully', () => {
      // Arrange
      const portalNode = createPortalNode('#non-existent-target', [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'orphan-content' } },
        },
      ]);

      const ctx = createRenderContext();

      // Act & Assert - Should not throw, content should be discarded or fallback
      expect(() => {
        render(portalNode as unknown as CompiledNode, ctx);
      }).not.toThrow();

      // Content should not appear anywhere since target doesn't exist
      expect(document.querySelector('#orphan-content')).toBeNull();
    });

    it('should handle empty children array', () => {
      // Arrange
      const portalNode = createPortalNode('body', []);

      const ctx = createRenderContext();

      // Act & Assert - Should not throw
      expect(() => {
        render(portalNode as unknown as CompiledNode, ctx);
      }).not.toThrow();
    });

    it('should handle portal within portal (nested portals)', () => {
      // Arrange
      const targetElement = document.createElement('div');
      targetElement.id = 'nested-target';
      document.body.appendChild(targetElement);

      const innerPortal = createPortalNode('#nested-target', [
        {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'inner-portal-content' } },
        },
      ]);

      const outerPortal = createPortalNode('body', [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'outer-portal-content' } },
          children: [innerPortal as unknown as CompiledNode],
        },
      ]);

      const ctx = createRenderContext();

      // Act
      const result = render(outerPortal as unknown as CompiledNode, ctx);
      container.appendChild(result);

      // Assert
      expect(
        document.body.querySelector('#outer-portal-content')
      ).not.toBeNull();
      expect(
        targetElement.querySelector('#inner-portal-content')
      ).not.toBeNull();

      // Cleanup
      targetElement.remove();
    });
  });
});
