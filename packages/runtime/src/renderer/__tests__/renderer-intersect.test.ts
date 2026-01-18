/**
 * Test module for Renderer IntersectionObserver Event.
 *
 * Coverage:
 * - Setup IntersectionObserver for element
 * - Trigger action when element becomes visible
 * - Pass isIntersecting to action payload
 * - Respect threshold option
 * - Respect rootMargin option
 * - Disconnect observer on cleanup/unmount
 *
 * TDD Red Phase: These tests verify that the renderer properly handles
 * the 'intersect' event type for visibility detection using IntersectionObserver.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledNode, CompiledAction, CompiledEventHandler } from '@constela/compiler';

/**
 * Extended event handler type with intersect options
 * This should be added to ast.ts
 */
interface IntersectEventHandler extends CompiledEventHandler {
  event: 'intersect';
  action: string;
  options?: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
  };
}

// ==================== Mock IntersectionObserver ====================

interface MockIntersectionObserverEntry {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRect;
  intersectionRect: DOMRect;
  rootBounds: DOMRect | null;
  time: number;
}

type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver
) => void;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  private callback: IntersectionObserverCallback;
  private observedElements: Set<Element> = new Set();
  private static instances: MockIntersectionObserver[] = [];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observedElements.add(target);
  }

  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  disconnect(): void {
    this.observedElements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Test helper methods
  static getInstances(): MockIntersectionObserver[] {
    return MockIntersectionObserver.instances;
  }

  static clearInstances(): void {
    MockIntersectionObserver.instances = [];
  }

  isObserving(element: Element): boolean {
    return this.observedElements.has(element);
  }

  getObservedElements(): Set<Element> {
    return this.observedElements;
  }

  /**
   * Simulate an intersection event for testing
   */
  triggerIntersect(target: Element, isIntersecting: boolean, ratio: number = 1): void {
    if (!this.observedElements.has(target)) return;

    const entry: MockIntersectionObserverEntry = {
      target,
      isIntersecting,
      intersectionRatio: ratio,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: performance.now(),
    };

    this.callback([entry as IntersectionObserverEntry], this);
  }
}

describe('Renderer IntersectionObserver Event', () => {
  // ==================== Setup ====================

  let container: HTMLElement;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    // Mock IntersectionObserver
    originalIntersectionObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    MockIntersectionObserver.clearInstances();
  });

  afterEach(() => {
    container.remove();
    globalThis.IntersectionObserver = originalIntersectionObserver;
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

  // ==================== Basic Setup Tests ====================

  describe('IntersectionObserver setup', () => {
    it('should setup IntersectionObserver for element with intersect event', () => {
      // Arrange
      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'observed-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert - IntersectionObserver should be created and observing the element
      const observers = MockIntersectionObserver.getInstances();
      expect(observers.length).toBe(1);

      const observer = observers[0];
      const element = container.querySelector('#observed-element');
      expect(observer?.isObserving(element!)).toBe(true);
    });

    it('should create separate observers for multiple elements', () => {
      // Arrange
      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'div',
            props: {
              id: { expr: 'lit', value: 'element-1' },
              onIntersect: {
                event: 'intersect',
                action: 'handleIntersect',
              } as IntersectEventHandler,
            },
          },
          {
            kind: 'element',
            tag: 'div',
            props: {
              id: { expr: 'lit', value: 'element-2' },
              onIntersect: {
                event: 'intersect',
                action: 'handleIntersect',
              } as IntersectEventHandler,
            },
          },
        ],
      };

      const ctx = createRenderContext({
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert - Both elements should be observed
      const observers = MockIntersectionObserver.getInstances();
      // Could be 1 observer with 2 elements or 2 observers
      const observedElements = observers.flatMap((o) =>
        Array.from(o.getObservedElements())
      );
      expect(observedElements.length).toBe(2);
    });
  });

  // ==================== Action Trigger Tests ====================

  describe('action triggering', () => {
    it('should trigger action when element becomes visible', async () => {
      // Arrange
      const state = createStateStore({
        wasTriggered: { type: 'boolean', initial: false },
      });

      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [
          { do: 'set', target: 'wasTriggered', value: { expr: 'lit', value: true } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'trigger-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Simulate intersection
      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#trigger-element')!;
      observer?.triggerIntersect(element, true);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(state.get('wasTriggered')).toBe(true);
    });

    it('should pass isIntersecting to action payload', async () => {
      // Arrange
      const state = createStateStore({
        isVisible: { type: 'boolean', initial: false },
      });

      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [
          {
            do: 'set',
            target: 'isVisible',
            value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'isIntersecting' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'visibility-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
            payload: {
              isIntersecting: { expr: 'var', name: 'isIntersecting' },
            },
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#visibility-element')!;

      // Trigger visible
      observer?.triggerIntersect(element, true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(state.get('isVisible')).toBe(true);

      // Trigger not visible
      observer?.triggerIntersect(element, false);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(state.get('isVisible')).toBe(false);
    });

    it('should pass intersectionRatio to action payload', async () => {
      // Arrange
      const state = createStateStore({
        ratio: { type: 'number', initial: 0 },
      });

      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [
          {
            do: 'set',
            target: 'ratio',
            value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'ratio' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'ratio-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
            payload: {
              ratio: { expr: 'var', name: 'intersectionRatio' },
            },
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#ratio-element')!;

      // Trigger with 50% visibility
      observer?.triggerIntersect(element, true, 0.5);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(state.get('ratio')).toBe(0.5);
    });
  });

  // ==================== Options Tests ====================

  describe('IntersectionObserver options', () => {
    it('should respect threshold option', () => {
      // Arrange
      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'threshold-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
            options: {
              threshold: 0.5,
            },
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const observer = MockIntersectionObserver.getInstances()[0];
      expect(observer?.thresholds).toContain(0.5);
    });

    it('should respect rootMargin option', () => {
      // Arrange
      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'margin-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
            options: {
              rootMargin: '100px',
            },
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      // Assert
      const observer = MockIntersectionObserver.getInstances()[0];
      expect(observer?.rootMargin).toBe('100px');
    });

    it('should only trigger once when once option is true', async () => {
      // Arrange
      const state = createStateStore({
        triggerCount: { type: 'number', initial: 0 },
      });

      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [
          { do: 'update', target: 'triggerCount', operation: 'increment' },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'once-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
            options: {
              once: true,
            },
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleIntersect },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#once-element')!;

      // Trigger multiple times
      observer?.triggerIntersect(element, true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      observer?.triggerIntersect(element, false);
      await new Promise((resolve) => setTimeout(resolve, 10));

      observer?.triggerIntersect(element, true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should only trigger once
      expect(state.get('triggerCount')).toBe(1);

      // Observer should have unobserved the element
      expect(observer?.isObserving(element)).toBe(false);
    });
  });

  // ==================== Cleanup Tests ====================

  describe('cleanup on unmount', () => {
    it('should disconnect observer on cleanup/unmount', () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'cleanup-element' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: { handleIntersect },
        cleanups,
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#cleanup-element')!;

      // Verify element is being observed
      expect(observer?.isObserving(element)).toBe(true);

      // Run cleanups (simulate unmount)
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Assert - Observer should be disconnected
      expect(observer?.isObserving(element)).toBe(false);
    });

    it('should not trigger action after cleanup', async () => {
      // Arrange
      const cleanups: (() => void)[] = [];
      const state = createStateStore({
        wasTriggered: { type: 'boolean', initial: false },
      });

      const handleIntersect: CompiledAction = {
        name: 'handleIntersect',
        steps: [
          { do: 'set', target: 'wasTriggered', value: { expr: 'lit', value: true } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'no-trigger-after-cleanup' },
          onIntersect: {
            event: 'intersect',
            action: 'handleIntersect',
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleIntersect },
        cleanups,
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#no-trigger-after-cleanup')!;

      // Run cleanups before triggering
      for (const cleanup of cleanups) {
        cleanup();
      }

      // Try to trigger after cleanup
      observer?.triggerIntersect(element, true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should not have triggered
      expect(state.get('wasTriggered')).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle element without intersect handler gracefully', () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'no-intersect-handler' },
        },
      };

      const ctx = createRenderContext();

      // Act & Assert - Should not throw
      expect(() => {
        render(node, ctx);
      }).not.toThrow();

      // No observers should be created
      expect(MockIntersectionObserver.getInstances().length).toBe(0);
    });

    it('should handle missing action gracefully', async () => {
      // Arrange
      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'missing-action-element' },
          onIntersect: {
            event: 'intersect',
            action: 'nonExistentAction',
          } as IntersectEventHandler,
        },
      };

      const ctx = createRenderContext({
        actions: {}, // No actions defined
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const observer = MockIntersectionObserver.getInstances()[0];
      const element = container.querySelector('#missing-action-element')!;

      // Assert - Should not throw when triggering
      expect(() => {
        observer?.triggerIntersect(element, true);
      }).not.toThrow();
    });
  });
});
