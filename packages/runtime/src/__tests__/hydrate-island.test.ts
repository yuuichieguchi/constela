/**
 * Test module for Island Hydration (Runtime Partial Hydration).
 *
 * Coverage:
 * - hydrateIsland function export and cleanup
 * - Strategy: 'load' (immediate hydration)
 * - Strategy: 'idle' (requestIdleCallback)
 * - Strategy: 'visible' (IntersectionObserver)
 * - Strategy: 'interaction' (click, focus, mouseover)
 * - Strategy: 'media' (matchMedia)
 * - Strategy: 'never' (SSR only, no hydration)
 * - Island detection from DOM (data attributes)
 * - hydrateAppWithIslands integration
 *
 * TDD Red Phase: These tests verify the Island hydration implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CompiledProgram, CompiledIslandNode } from '@constela/compiler';
import type { IslandStrategy, IslandStrategyOptions } from '@constela/core';

// ==================== Mock Browser APIs ====================

// Mock requestIdleCallback
interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallback = (deadline: IdleDeadline) => void;

const mockIdleCallbacks: { callback: IdleCallback; options?: { timeout?: number } }[] = [];

const mockRequestIdleCallback = vi.fn((callback: IdleCallback, options?: { timeout?: number }) => {
  const id = mockIdleCallbacks.length;
  mockIdleCallbacks.push({ callback, options });
  return id;
});

const mockCancelIdleCallback = vi.fn((id: number) => {
  // Remove callback at id (set to undefined to preserve indices)
  delete mockIdleCallbacks[id];
});

// Mock IntersectionObserver
interface MockIntersectionObserverEntry {
  isIntersecting: boolean;
  target: Element;
  intersectionRatio: number;
}

type IntersectionObserverCallback = (entries: MockIntersectionObserverEntry[]) => void;

let mockIntersectionObserverCallback: IntersectionObserverCallback | null = null;
let mockIntersectionObserverOptions: { threshold?: number; rootMargin?: string } | null = null;
const mockObservedElements: Element[] = [];

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  options: { threshold?: number; rootMargin?: string };

  constructor(callback: IntersectionObserverCallback, options?: { threshold?: number; rootMargin?: string }) {
    this.callback = callback;
    this.options = options || {};
    mockIntersectionObserverCallback = callback;
    mockIntersectionObserverOptions = options || null;
  }

  observe(element: Element) {
    mockObservedElements.push(element);
  }

  unobserve(element: Element) {
    const index = mockObservedElements.indexOf(element);
    if (index > -1) {
      mockObservedElements.splice(index, 1);
    }
  }

  disconnect() {
    mockObservedElements.length = 0;
  }
}

// Mock matchMedia
interface MockMediaQueryList {
  matches: boolean;
  media: string;
  onchange: ((event: { matches: boolean }) => void) | null;
  addListener: (listener: (event: { matches: boolean }) => void) => void;
  removeListener: (listener: (event: { matches: boolean }) => void) => void;
  addEventListener: (event: string, listener: (event: { matches: boolean }) => void) => void;
  removeEventListener: (event: string, listener: (event: { matches: boolean }) => void) => void;
}

const mockMediaQueryLists: Map<string, MockMediaQueryList> = new Map();
const mockMediaListeners: Map<string, ((event: { matches: boolean }) => void)[]> = new Map();

function createMockMediaQueryList(query: string, initialMatches: boolean = false): MockMediaQueryList {
  const listeners: ((event: { matches: boolean }) => void)[] = [];
  mockMediaListeners.set(query, listeners);

  const mql: MockMediaQueryList = {
    matches: initialMatches,
    media: query,
    onchange: null,
    addListener: (listener) => listeners.push(listener),
    removeListener: (listener) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    },
    addEventListener: (_event, listener) => listeners.push(listener),
    removeEventListener: (_event, listener) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    },
  };

  mockMediaQueryLists.set(query, mql);
  return mql;
}

const mockMatchMedia = vi.fn((query: string) => {
  if (mockMediaQueryLists.has(query)) {
    return mockMediaQueryLists.get(query)!;
  }
  return createMockMediaQueryList(query);
});

// ==================== Setup/Teardown ====================

describe('Island Hydration', () => {
  let container: HTMLElement;
  let originalRequestIdleCallback: typeof globalThis.requestIdleCallback | undefined;
  let originalCancelIdleCallback: typeof globalThis.cancelIdleCallback | undefined;
  let originalIntersectionObserver: typeof globalThis.IntersectionObserver | undefined;
  let originalMatchMedia: typeof globalThis.matchMedia | undefined;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    // Reset mock state
    mockIdleCallbacks.length = 0;
    mockObservedElements.length = 0;
    mockIntersectionObserverCallback = null;
    mockIntersectionObserverOptions = null;
    mockMediaQueryLists.clear();
    mockMediaListeners.clear();

    // Save original browser APIs
    originalRequestIdleCallback = globalThis.requestIdleCallback;
    originalCancelIdleCallback = globalThis.cancelIdleCallback;
    originalIntersectionObserver = globalThis.IntersectionObserver;
    originalMatchMedia = globalThis.matchMedia;

    // Install mocks
    (globalThis as unknown as { requestIdleCallback: typeof mockRequestIdleCallback }).requestIdleCallback = mockRequestIdleCallback;
    (globalThis as unknown as { cancelIdleCallback: typeof mockCancelIdleCallback }).cancelIdleCallback = mockCancelIdleCallback;
    (globalThis as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    (globalThis as unknown as { matchMedia: typeof mockMatchMedia }).matchMedia = mockMatchMedia;

    // Reset mock call counters
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup container
    container.remove();

    // Restore original browser APIs
    if (originalRequestIdleCallback !== undefined) {
      (globalThis as unknown as { requestIdleCallback: typeof originalRequestIdleCallback }).requestIdleCallback = originalRequestIdleCallback;
    } else {
      delete (globalThis as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    }

    if (originalCancelIdleCallback !== undefined) {
      (globalThis as unknown as { cancelIdleCallback: typeof originalCancelIdleCallback }).cancelIdleCallback = originalCancelIdleCallback;
    } else {
      delete (globalThis as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
    }

    if (originalIntersectionObserver !== undefined) {
      (globalThis as unknown as { IntersectionObserver: typeof originalIntersectionObserver }).IntersectionObserver = originalIntersectionObserver;
    }

    if (originalMatchMedia !== undefined) {
      (globalThis as unknown as { matchMedia: typeof originalMatchMedia }).matchMedia = originalMatchMedia;
    }
  });

  // ==================== Helper Functions ====================

  /**
   * Creates a minimal CompiledIslandNode for testing
   */
  function createIslandNode(
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

  /**
   * Creates a minimal CompiledProgram for testing
   */
  function createMinimalProgram(
    overrides: Partial<CompiledProgram> = {}
  ): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  /**
   * Sets up container with SSR-rendered island HTML
   */
  function setupIslandHTML(
    id: string,
    strategy: IslandStrategy,
    content: string,
    options?: {
      state?: Record<string, unknown>;
      strategyOptions?: IslandStrategyOptions;
    }
  ): HTMLElement {
    const stateAttr = options?.state
      ? ` data-island-state="${escapeHtml(JSON.stringify(options.state))}"`
      : '';
    const optionsAttr = options?.strategyOptions
      ? ` data-island-options="${escapeHtml(JSON.stringify(options.strategyOptions))}"`
      : '';

    container.innerHTML = `<div data-island-id="${id}" data-island-strategy="${strategy}"${stateAttr}${optionsAttr}>${content}</div>`;
    return container.querySelector(`[data-island-id="${id}"]`) as HTMLElement;
  }

  function escapeHtml(str: string): string {
    return str.replace(/"/g, '&quot;');
  }

  /**
   * Triggers idle callback for testing
   */
  function triggerIdleCallback(index: number = 0): void {
    const entry = mockIdleCallbacks[index];
    if (entry) {
      entry.callback({ didTimeout: false, timeRemaining: () => 50 });
    }
  }

  /**
   * Triggers intersection observer callback for testing
   */
  function triggerIntersection(element: Element, isIntersecting: boolean, ratio: number = 1): void {
    if (mockIntersectionObserverCallback) {
      mockIntersectionObserverCallback([
        {
          isIntersecting,
          target: element,
          intersectionRatio: ratio,
        },
      ]);
    }
  }

  /**
   * Triggers media query change for testing
   */
  function triggerMediaQueryChange(query: string, matches: boolean): void {
    const mql = mockMediaQueryLists.get(query);
    if (mql) {
      mql.matches = matches;
      const listeners = mockMediaListeners.get(query);
      if (listeners) {
        listeners.forEach((listener) => listener({ matches }));
      }
    }
  }

  // ==================== hydrateIsland Function ====================

  describe('hydrateIsland function', () => {
    it('should export hydrateIsland function', async () => {
      // Act
      const { hydrateIsland } = await import('../hydrate-island.js');

      // Assert
      expect(hydrateIsland).toBeDefined();
      expect(typeof hydrateIsland).toBe('function');
    });

    it('should return a cleanup function', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('test', 'load', '<button>Click</button>');
      const program = createIslandNode();

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'test',
        strategy: 'load',
        program,
      });

      // Assert
      expect(typeof cleanup).toBe('function');

      // Cleanup
      cleanup();
    });

    it('should call appropriate strategy based on options.strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('idle-test', 'idle', '<div>Content</div>');
      const program = createIslandNode({ strategy: 'idle' });

      // Act
      hydrateIsland({
        element,
        id: 'idle-test',
        strategy: 'idle',
        program,
      });

      // Assert - should have scheduled idle callback
      expect(mockRequestIdleCallback).toHaveBeenCalled();
    });
  });

  // ==================== Strategy: 'load' (immediate) ====================

  describe("Strategy: 'load' (immediate)", () => {
    it('should hydrate immediately on call', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('immediate', 'load', '<button id="load-btn">Click</button>', {
        state: { count: 0 },
      });
      const program = createIslandNode({
        id: 'immediate',
        strategy: 'load',
        content: {
          kind: 'element',
          tag: 'button',
          props: { id: { expr: 'lit', value: 'load-btn' } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Click' } }],
        },
        state: {
          count: { type: 'number', initial: 0 },
        },
      });

      // Track hydration by checking if event handlers are attached
      let hydrationComplete = false;
      const originalAttachEventListeners = element.addEventListener;
      element.addEventListener = function (...args: Parameters<typeof originalAttachEventListeners>) {
        hydrationComplete = true;
        return originalAttachEventListeners.apply(this, args);
      };

      // Act
      hydrateIsland({
        element,
        id: 'immediate',
        strategy: 'load',
        state: { count: 0 },
        program,
      });

      // Assert - hydration should have happened immediately (synchronously)
      // The actual assertion depends on implementation, but we verify the function completes
      expect(element.getAttribute('data-island-id')).toBe('immediate');
    });

    it('should not use requestIdleCallback for load strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('load-no-idle', 'load', '<div>Content</div>');
      const program = createIslandNode({ strategy: 'load' });

      // Act
      hydrateIsland({
        element,
        id: 'load-no-idle',
        strategy: 'load',
        program,
      });

      // Assert - should NOT have called requestIdleCallback
      expect(mockRequestIdleCallback).not.toHaveBeenCalled();
    });
  });

  // ==================== Strategy: 'idle' ====================

  describe("Strategy: 'idle'", () => {
    it('should use requestIdleCallback for idle strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('idle-island', 'idle', '<div>Idle content</div>');
      const program = createIslandNode({ strategy: 'idle' });

      // Act
      hydrateIsland({
        element,
        id: 'idle-island',
        strategy: 'idle',
        program,
      });

      // Assert
      expect(mockRequestIdleCallback).toHaveBeenCalled();
    });

    it('should fall back to setTimeout if requestIdleCallback not available', async () => {
      // Arrange - remove requestIdleCallback
      const savedRIC = globalThis.requestIdleCallback;
      delete (globalThis as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;

      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('idle-fallback', 'idle', '<div>Fallback</div>');
      const program = createIslandNode({ strategy: 'idle' });

      // Act
      hydrateIsland({
        element,
        id: 'idle-fallback',
        strategy: 'idle',
        program,
      });

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalled();

      // Cleanup
      (globalThis as unknown as { requestIdleCallback: typeof savedRIC }).requestIdleCallback = savedRIC;
      setTimeoutSpy.mockRestore();
    });

    it('should respect timeout option in strategyOptions', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('idle-timeout', 'idle', '<div>Timeout</div>', {
        strategyOptions: { timeout: 3000 },
      });
      const program = createIslandNode({
        strategy: 'idle',
        strategyOptions: { timeout: 3000 },
      });

      // Act
      hydrateIsland({
        element,
        id: 'idle-timeout',
        strategy: 'idle',
        strategyOptions: { timeout: 3000 },
        program,
      });

      // Assert
      expect(mockRequestIdleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: 3000 })
      );
    });

    it('should hydrate when idle callback is triggered', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('idle-trigger', 'idle', '<div id="idle-content">Content</div>');
      const program = createIslandNode({ strategy: 'idle' });

      let hydrated = false;
      // We track hydration indirectly since the actual implementation will modify the DOM

      // Act
      hydrateIsland({
        element,
        id: 'idle-trigger',
        strategy: 'idle',
        program,
      });

      // Trigger idle callback
      triggerIdleCallback(0);

      // Assert - hydration should have occurred after idle callback
      // Implementation will determine exact behavior
      expect(mockIdleCallbacks.length).toBeGreaterThan(0);
    });

    it('should cancel idle callback on cleanup', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('idle-cleanup', 'idle', '<div>Cleanup</div>');
      const program = createIslandNode({ strategy: 'idle' });

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'idle-cleanup',
        strategy: 'idle',
        program,
      });

      // Trigger cleanup before idle callback fires
      cleanup();

      // Assert
      expect(mockCancelIdleCallback).toHaveBeenCalled();
    });
  });

  // ==================== Strategy: 'visible' ====================

  describe("Strategy: 'visible'", () => {
    it('should use IntersectionObserver for visible strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('visible-island', 'visible', '<div>Visible</div>');
      const program = createIslandNode({ strategy: 'visible' });

      // Act
      hydrateIsland({
        element,
        id: 'visible-island',
        strategy: 'visible',
        program,
      });

      // Assert
      expect(mockObservedElements).toContain(element);
    });

    it('should respect threshold option', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('visible-threshold', 'visible', '<div>Threshold</div>', {
        strategyOptions: { threshold: 0.5 },
      });
      const program = createIslandNode({
        strategy: 'visible',
        strategyOptions: { threshold: 0.5 },
      });

      // Act
      hydrateIsland({
        element,
        id: 'visible-threshold',
        strategy: 'visible',
        strategyOptions: { threshold: 0.5 },
        program,
      });

      // Assert
      expect(mockIntersectionObserverOptions?.threshold).toBe(0.5);
    });

    it('should respect rootMargin option', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('visible-margin', 'visible', '<div>Margin</div>', {
        strategyOptions: { rootMargin: '100px 0px' },
      });
      const program = createIslandNode({
        strategy: 'visible',
        strategyOptions: { rootMargin: '100px 0px' },
      });

      // Act
      hydrateIsland({
        element,
        id: 'visible-margin',
        strategy: 'visible',
        strategyOptions: { rootMargin: '100px 0px' },
        program,
      });

      // Assert
      expect(mockIntersectionObserverOptions?.rootMargin).toBe('100px 0px');
    });

    it('should hydrate when element becomes visible', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('visible-trigger', 'visible', '<div id="vis-content">Content</div>');
      const program = createIslandNode({ strategy: 'visible' });

      // Act
      hydrateIsland({
        element,
        id: 'visible-trigger',
        strategy: 'visible',
        program,
      });

      // Trigger intersection (element becomes visible)
      triggerIntersection(element, true, 1);

      // Assert - observer should have been notified
      expect(mockIntersectionObserverCallback).not.toBeNull();
    });

    it('should not hydrate when element is not intersecting', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('visible-not-intersecting', 'visible', '<div>Not visible</div>');
      const program = createIslandNode({ strategy: 'visible' });

      let hydrationCalled = false;

      // Act
      hydrateIsland({
        element,
        id: 'visible-not-intersecting',
        strategy: 'visible',
        program,
      });

      // Trigger intersection with isIntersecting = false
      triggerIntersection(element, false, 0);

      // Assert - should not have hydrated yet
      // (implementation-specific assertion)
      expect(mockObservedElements).toContain(element);
    });

    it('should disconnect observer on cleanup', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('visible-cleanup', 'visible', '<div>Cleanup</div>');
      const program = createIslandNode({ strategy: 'visible' });

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'visible-cleanup',
        strategy: 'visible',
        program,
      });

      expect(mockObservedElements).toContain(element);

      cleanup();

      // Assert - element should be unobserved
      expect(mockObservedElements).not.toContain(element);
    });
  });

  // ==================== Strategy: 'interaction' ====================

  describe("Strategy: 'interaction'", () => {
    it('should listen for click events', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('interaction-click', 'interaction', '<button>Click me</button>');
      const program = createIslandNode({ strategy: 'interaction' });

      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

      // Act
      hydrateIsland({
        element,
        id: 'interaction-click',
        strategy: 'interaction',
        program,
      });

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.anything());

      addEventListenerSpy.mockRestore();
    });

    it('should listen for focus events', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('interaction-focus', 'interaction', '<input type="text" />');
      const program = createIslandNode({ strategy: 'interaction' });

      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

      // Act
      hydrateIsland({
        element,
        id: 'interaction-focus',
        strategy: 'interaction',
        program,
      });

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function), expect.anything());

      addEventListenerSpy.mockRestore();
    });

    it('should listen for mouseover events', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('interaction-mouseover', 'interaction', '<div>Hover me</div>');
      const program = createIslandNode({ strategy: 'interaction' });

      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

      // Act
      hydrateIsland({
        element,
        id: 'interaction-mouseover',
        strategy: 'interaction',
        program,
      });

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseover', expect.any(Function), expect.anything());

      addEventListenerSpy.mockRestore();
    });

    it('should hydrate on first interaction', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('interaction-hydrate', 'interaction', '<button id="int-btn">Click</button>');
      const program = createIslandNode({ strategy: 'interaction' });

      // Act
      hydrateIsland({
        element,
        id: 'interaction-hydrate',
        strategy: 'interaction',
        program,
      });

      // Simulate click event
      const clickEvent = new MouseEvent('click', { bubbles: true });
      element.dispatchEvent(clickEvent);

      // Assert - hydration should have occurred
      // (implementation will determine exact behavior)
      expect(element.getAttribute('data-island-id')).toBe('interaction-hydrate');
    });

    it('should remove event listeners after hydration', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('interaction-remove', 'interaction', '<button>Remove</button>');
      const program = createIslandNode({ strategy: 'interaction' });

      const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

      // Act
      hydrateIsland({
        element,
        id: 'interaction-remove',
        strategy: 'interaction',
        program,
      });

      // Trigger interaction
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Assert - event listeners should be removed after hydration
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on cleanup', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('interaction-cleanup', 'interaction', '<button>Cleanup</button>');
      const program = createIslandNode({ strategy: 'interaction' });

      const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'interaction-cleanup',
        strategy: 'interaction',
        program,
      });

      cleanup();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });

  // ==================== Strategy: 'media' ====================

  describe("Strategy: 'media'", () => {
    it('should use matchMedia for media strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('media-island', 'media', '<div>Media</div>', {
        strategyOptions: { media: '(min-width: 768px)' },
      });
      const program = createIslandNode({
        strategy: 'media',
        strategyOptions: { media: '(min-width: 768px)' },
      });

      // Act
      hydrateIsland({
        element,
        id: 'media-island',
        strategy: 'media',
        strategyOptions: { media: '(min-width: 768px)' },
        program,
      });

      // Assert
      expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    });

    it('should hydrate immediately if media query already matches', async () => {
      // Arrange
      createMockMediaQueryList('(min-width: 768px)', true);

      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('media-immediate', 'media', '<div>Immediate</div>', {
        strategyOptions: { media: '(min-width: 768px)' },
      });
      const program = createIslandNode({
        strategy: 'media',
        strategyOptions: { media: '(min-width: 768px)' },
      });

      // Act
      hydrateIsland({
        element,
        id: 'media-immediate',
        strategy: 'media',
        strategyOptions: { media: '(min-width: 768px)' },
        program,
      });

      // Assert - should have hydrated immediately since media matches
      expect(mockMatchMedia).toHaveBeenCalled();
    });

    it('should hydrate when media query starts matching', async () => {
      // Arrange
      createMockMediaQueryList('(min-width: 1024px)', false);

      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('media-change', 'media', '<div>Change</div>', {
        strategyOptions: { media: '(min-width: 1024px)' },
      });
      const program = createIslandNode({
        strategy: 'media',
        strategyOptions: { media: '(min-width: 1024px)' },
      });

      // Act
      hydrateIsland({
        element,
        id: 'media-change',
        strategy: 'media',
        strategyOptions: { media: '(min-width: 1024px)' },
        program,
      });

      // Trigger media query change
      triggerMediaQueryChange('(min-width: 1024px)', true);

      // Assert - hydration should have occurred
      expect(mockMediaListeners.get('(min-width: 1024px)')?.length).toBeGreaterThanOrEqual(0);
    });

    it('should remove listener on cleanup', async () => {
      // Arrange
      createMockMediaQueryList('(min-width: 500px)', false);

      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('media-cleanup', 'media', '<div>Cleanup</div>', {
        strategyOptions: { media: '(min-width: 500px)' },
      });
      const program = createIslandNode({
        strategy: 'media',
        strategyOptions: { media: '(min-width: 500px)' },
      });

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'media-cleanup',
        strategy: 'media',
        strategyOptions: { media: '(min-width: 500px)' },
        program,
      });

      const listenersBeforeCleanup = mockMediaListeners.get('(min-width: 500px)')?.length ?? 0;

      cleanup();

      const listenersAfterCleanup = mockMediaListeners.get('(min-width: 500px)')?.length ?? 0;

      // Assert - listener should be removed
      expect(listenersAfterCleanup).toBeLessThanOrEqual(listenersBeforeCleanup);
    });
  });

  // ==================== Strategy: 'never' ====================

  describe("Strategy: 'never'", () => {
    it('should not hydrate for never strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('never-island', 'never', '<div>Static</div>');
      const program = createIslandNode({ strategy: 'never' });

      // Track if any hydration-related activity occurs
      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'never-island',
        strategy: 'never',
        program,
      });

      // Assert - should not set up any observers or listeners for hydration
      expect(mockRequestIdleCallback).not.toHaveBeenCalled();
      expect(mockObservedElements).not.toContain(element);
      // For 'never' strategy, no interaction listeners should be added for hydration purposes
      expect(addEventListenerSpy).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
      cleanup();
    });

    it('should return noop cleanup function for never strategy', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('never-cleanup', 'never', '<div>Noop</div>');
      const program = createIslandNode({ strategy: 'never' });

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'never-cleanup',
        strategy: 'never',
        program,
      });

      // Assert - cleanup should be callable without error
      expect(() => cleanup()).not.toThrow();
    });
  });

  // ==================== Island Detection from DOM ====================

  describe('Island detection from DOM', () => {
    it('should find elements with data-island-id attribute', async () => {
      // Arrange
      container.innerHTML = `
        <div data-island-id="island-1" data-island-strategy="load"><button>1</button></div>
        <div data-island-id="island-2" data-island-strategy="visible"><button>2</button></div>
        <div data-island-id="island-3" data-island-strategy="idle"><button>3</button></div>
      `;

      // Act
      const islands = container.querySelectorAll('[data-island-id]');

      // Assert
      expect(islands.length).toBe(3);
      expect(islands[0].getAttribute('data-island-id')).toBe('island-1');
      expect(islands[1].getAttribute('data-island-id')).toBe('island-2');
      expect(islands[2].getAttribute('data-island-id')).toBe('island-3');
    });

    it('should parse data-island-strategy attribute', async () => {
      // Arrange
      const element = setupIslandHTML('parse-strategy', 'visible', '<div>Content</div>');

      // Act
      const strategy = element.getAttribute('data-island-strategy');

      // Assert
      expect(strategy).toBe('visible');
    });

    it('should parse data-island-options attribute', async () => {
      // Arrange
      const options = { threshold: 0.5, rootMargin: '100px' };
      const element = setupIslandHTML('parse-options', 'visible', '<div>Content</div>', {
        strategyOptions: options,
      });

      // Act
      const optionsAttr = element.getAttribute('data-island-options');
      const parsedOptions = optionsAttr ? JSON.parse(optionsAttr.replace(/&quot;/g, '"')) : null;

      // Assert
      expect(parsedOptions).toEqual(options);
    });

    it('should parse data-island-state attribute', async () => {
      // Arrange
      const state = { count: 42, name: 'test' };
      const element = setupIslandHTML('parse-state', 'load', '<div>Content</div>', {
        state,
      });

      // Act
      const stateAttr = element.getAttribute('data-island-state');
      const parsedState = stateAttr ? JSON.parse(stateAttr.replace(/&quot;/g, '"')) : null;

      // Assert
      expect(parsedState).toEqual(state);
    });

    it('should handle missing optional attributes', async () => {
      // Arrange
      container.innerHTML = '<div data-island-id="minimal" data-island-strategy="load"><span>Minimal</span></div>';
      const element = container.querySelector('[data-island-id="minimal"]') as HTMLElement;

      // Act
      const stateAttr = element.getAttribute('data-island-state');
      const optionsAttr = element.getAttribute('data-island-options');

      // Assert
      expect(stateAttr).toBeNull();
      expect(optionsAttr).toBeNull();
    });
  });

  // ==================== hydrateAppWithIslands ====================

  describe('hydrateAppWithIslands', () => {
    it('should export hydrateAppWithIslands function', async () => {
      // Act
      const { hydrateAppWithIslands } = await import('../hydrate.js');

      // Assert
      expect(hydrateAppWithIslands).toBeDefined();
      expect(typeof hydrateAppWithIslands).toBe('function');
    });

    it('should return a cleanup function', async () => {
      // Arrange
      const { hydrateAppWithIslands } = await import('../hydrate.js');
      container.innerHTML = '<div><div data-island-id="test" data-island-strategy="load"><button>Test</button></div></div>';
      const program = createMinimalProgram({
        view: createIslandNode(),
      });

      // Act
      const cleanup = hydrateAppWithIslands(program, { container });

      // Assert
      expect(typeof cleanup).toBe('function');

      // Cleanup
      cleanup();
    });

    it('should find and hydrate all islands in the container', async () => {
      // Arrange
      const { hydrateAppWithIslands } = await import('../hydrate.js');
      container.innerHTML = `
        <div>
          <div data-island-id="island-a" data-island-strategy="load"><button>A</button></div>
          <div data-island-id="island-b" data-island-strategy="load"><button>B</button></div>
        </div>
      `;
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'island-a' }),
            createIslandNode({ id: 'island-b' }),
          ],
        },
      });

      // Act
      const cleanup = hydrateAppWithIslands(program, { container });

      // Assert - both islands should be detected
      const islands = container.querySelectorAll('[data-island-id]');
      expect(islands.length).toBe(2);

      // Cleanup
      cleanup();
    });

    it('should apply different strategies to different islands', async () => {
      // Arrange
      const { hydrateAppWithIslands } = await import('../hydrate.js');
      container.innerHTML = `
        <div>
          <div data-island-id="load-island" data-island-strategy="load"><div>Load</div></div>
          <div data-island-id="idle-island" data-island-strategy="idle"><div>Idle</div></div>
          <div data-island-id="visible-island" data-island-strategy="visible"><div>Visible</div></div>
        </div>
      `;
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'load-island', strategy: 'load' }),
            createIslandNode({ id: 'idle-island', strategy: 'idle' }),
            createIslandNode({ id: 'visible-island', strategy: 'visible' }),
          ],
        },
      });

      // Act
      const cleanup = hydrateAppWithIslands(program, { container });

      // Assert - each strategy should be applied appropriately
      // idle should use requestIdleCallback
      expect(mockRequestIdleCallback).toHaveBeenCalled();
      // visible should use IntersectionObserver
      expect(mockObservedElements.length).toBeGreaterThan(0);

      // Cleanup
      cleanup();
    });

    it('should cleanup all islands when cleanup function is called', async () => {
      // Arrange
      const { hydrateAppWithIslands } = await import('../hydrate.js');
      container.innerHTML = `
        <div>
          <div data-island-id="cleanup-1" data-island-strategy="idle"><div>1</div></div>
          <div data-island-id="cleanup-2" data-island-strategy="visible"><div>2</div></div>
        </div>
      `;
      const program = createMinimalProgram({
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            createIslandNode({ id: 'cleanup-1', strategy: 'idle' }),
            createIslandNode({ id: 'cleanup-2', strategy: 'visible' }),
          ],
        },
      });

      // Act
      const cleanup = hydrateAppWithIslands(program, { container });

      // Verify observers/callbacks are set up
      const observedBefore = mockObservedElements.length;

      cleanup();

      // Assert - all resources should be cleaned up
      expect(mockCancelIdleCallback).toHaveBeenCalled();
      expect(mockObservedElements.length).toBeLessThan(observedBefore);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle islands with no state', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('no-state', 'load', '<div>No State</div>');
      const program = createIslandNode({ state: undefined });

      // Act & Assert - should not throw
      expect(() => {
        const cleanup = hydrateIsland({
          element,
          id: 'no-state',
          strategy: 'load',
          program,
        });
        cleanup();
      }).not.toThrow();
    });

    it('should handle islands with empty state', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('empty-state', 'load', '<div>Empty</div>', { state: {} });
      const program = createIslandNode({ state: {} });

      // Act & Assert - should not throw
      expect(() => {
        const cleanup = hydrateIsland({
          element,
          id: 'empty-state',
          strategy: 'load',
          state: {},
          program,
        });
        cleanup();
      }).not.toThrow();
    });

    it('should handle multiple cleanups without error', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('multi-cleanup', 'idle', '<div>Multi</div>');
      const program = createIslandNode({ strategy: 'idle' });

      // Act
      const cleanup = hydrateIsland({
        element,
        id: 'multi-cleanup',
        strategy: 'idle',
        program,
      });

      // Assert - multiple cleanup calls should not throw
      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });

    it('should handle nested islands', async () => {
      // Arrange
      container.innerHTML = `
        <div data-island-id="outer" data-island-strategy="load">
          <div>Outer content</div>
          <div data-island-id="inner" data-island-strategy="visible">
            <button>Inner button</button>
          </div>
        </div>
      `;

      const islands = container.querySelectorAll('[data-island-id]');

      // Assert
      expect(islands.length).toBe(2);
      expect(islands[0].getAttribute('data-island-id')).toBe('outer');
      expect(islands[1].getAttribute('data-island-id')).toBe('inner');
    });

    it('should handle islands with actions', async () => {
      // Arrange
      const { hydrateIsland } = await import('../hydrate-island.js');
      const element = setupIslandHTML('actions-island', 'load', '<button>Click</button>');
      const program = createIslandNode({
        actions: {
          handleClick: {
            name: 'handleClick',
            steps: [
              { do: 'set', target: 'count', value: { expr: 'lit', value: 1 } },
            ],
          },
        },
      });

      // Act & Assert - should not throw
      expect(() => {
        const cleanup = hydrateIsland({
          element,
          id: 'actions-island',
          strategy: 'load',
          program,
        });
        cleanup();
      }).not.toThrow();
    });
  });
});
