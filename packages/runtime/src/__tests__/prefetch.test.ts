/**
 * Test module for Island Prefetching functionality.
 *
 * Coverage:
 * - PrefetchOptions interface
 * - prefetchIsland function
 * - createPrefetcher factory
 * - prefetchOnHover strategy
 * - prefetchOnVisible strategy with IntersectionObserver
 * - Cleanup functions
 *
 * TDD Red Phase: These tests verify the prefetching implementation
 * that will be added to optimize Island loading performance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { PrefetchOptions } from '../prefetch.js';
import {
  prefetchIsland,
  createPrefetcher,
  isPrefetchOptions,
  PREFETCH_STRATEGIES,
} from '../prefetch.js';
import type { IslandLoader } from '../island-loader.js';

// ==================== Mock Browser APIs ====================

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

// ==================== Mock Island Loader ====================

function createMockLoader(): IslandLoader & { loadCalls: string[]; preloadCalls: string[] } {
  const loadCalls: string[] = [];
  const preloadCalls: string[] = [];

  return {
    loadCalls,
    preloadCalls,
    async load(id: string) {
      loadCalls.push(id);
      return {
        island: {},
        state: {},
        actions: {},
        default: {},
      };
    },
    preload(id: string) {
      preloadCalls.push(id);
    },
  };
}

// ==================== Setup/Teardown ====================

describe('Island Prefetching', () => {
  let originalIntersectionObserver: typeof globalThis.IntersectionObserver | undefined;

  beforeEach(() => {
    // Reset mock state
    mockObservedElements.length = 0;
    mockIntersectionObserverCallback = null;
    mockIntersectionObserverOptions = null;

    // Save original browser APIs
    originalIntersectionObserver = globalThis.IntersectionObserver;

    // Install mocks
    (globalThis as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    // Reset mock call counters
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original browser APIs
    if (originalIntersectionObserver !== undefined) {
      (globalThis as unknown as { IntersectionObserver: typeof originalIntersectionObserver }).IntersectionObserver = originalIntersectionObserver;
    }
  });

  // ==================== PREFETCH_STRATEGIES Constant ====================

  describe('PREFETCH_STRATEGIES', () => {
    it('should export PREFETCH_STRATEGIES as a readonly array', () => {
      expect(PREFETCH_STRATEGIES).toBeDefined();
      expect(Array.isArray(PREFETCH_STRATEGIES)).toBe(true);
    });

    it('should contain "hover" strategy', () => {
      expect(PREFETCH_STRATEGIES).toContain('hover');
    });

    it('should contain "visible" strategy', () => {
      expect(PREFETCH_STRATEGIES).toContain('visible');
    });

    it('should contain "immediate" strategy', () => {
      expect(PREFETCH_STRATEGIES).toContain('immediate');
    });
  });

  // ==================== PrefetchOptions Type ====================

  describe('PrefetchOptions', () => {
    describe('type structure', () => {
      it('should accept strategy as required field', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'hover',
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
        expect(options.strategy).toBe('hover');
      });

      it('should accept "hover" strategy', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'hover',
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
      });

      it('should accept "visible" strategy', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'visible',
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
      });

      it('should accept "immediate" strategy', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'immediate',
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
      });

      it('should accept optional threshold for visible strategy', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'visible',
          threshold: 0.5,
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
        expect(options.threshold).toBe(0.5);
      });

      it('should accept optional rootMargin for visible strategy', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'visible',
          rootMargin: '100px',
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
        expect(options.rootMargin).toBe('100px');
      });

      it('should accept all options together', () => {
        // Arrange
        const options: PrefetchOptions = {
          strategy: 'visible',
          threshold: 0.1,
          rootMargin: '50px 0px',
        };

        // Assert
        expect(isPrefetchOptions(options)).toBe(true);
      });
    });

    describe('isPrefetchOptions type guard', () => {
      it('should return true for valid options', () => {
        const options = { strategy: 'hover' };
        expect(isPrefetchOptions(options)).toBe(true);
      });

      it('should return false for null', () => {
        expect(isPrefetchOptions(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isPrefetchOptions(undefined)).toBe(false);
      });

      it('should return false for object without strategy', () => {
        expect(isPrefetchOptions({ threshold: 0.5 })).toBe(false);
      });

      it('should return false for invalid strategy', () => {
        expect(isPrefetchOptions({ strategy: 'invalid' })).toBe(false);
      });

      it('should return false when threshold is not a number', () => {
        expect(isPrefetchOptions({ strategy: 'visible', threshold: '0.5' })).toBe(false);
      });

      it('should return false when rootMargin is not a string', () => {
        expect(isPrefetchOptions({ strategy: 'visible', rootMargin: 100 })).toBe(false);
      });

      it('should return false for primitive values', () => {
        expect(isPrefetchOptions('hover')).toBe(false);
        expect(isPrefetchOptions(123)).toBe(false);
      });
    });
  });

  // ==================== prefetchIsland Function ====================

  describe('prefetchIsland', () => {
    it('should be a function', () => {
      expect(typeof prefetchIsland).toBe('function');
    });

    it('should accept island id as required parameter', () => {
      // Should not throw
      expect(() => prefetchIsland('counter-island')).not.toThrow();
    });

    it('should accept optional PrefetchOptions', () => {
      // Should not throw
      expect(() => prefetchIsland('counter-island', { strategy: 'hover' })).not.toThrow();
    });

    it('should use default strategy when options not provided', () => {
      // This test verifies default behavior - implementation will determine default
      expect(() => prefetchIsland('counter-island')).not.toThrow();
    });

    it('should return void', () => {
      const result = prefetchIsland('counter-island');
      expect(result).toBeUndefined();
    });
  });

  // ==================== createPrefetcher Factory ====================

  describe('createPrefetcher', () => {
    it('should be a function', () => {
      expect(typeof createPrefetcher).toBe('function');
    });

    it('should accept IslandLoader as parameter', () => {
      const mockLoader = createMockLoader();
      expect(() => createPrefetcher(mockLoader)).not.toThrow();
    });

    it('should return an object with prefetchOnHover method', () => {
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);

      expect(prefetcher).toBeDefined();
      expect(typeof prefetcher.prefetchOnHover).toBe('function');
    });

    it('should return an object with prefetchOnVisible method', () => {
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);

      expect(prefetcher).toBeDefined();
      expect(typeof prefetcher.prefetchOnVisible).toBe('function');
    });
  });

  // ==================== prefetchOnHover ====================

  describe('prefetchOnHover', () => {
    it('should attach mouseenter event listener to element', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

      // Act
      prefetcher.prefetchOnHover(element, 'counter-island');

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function),
        expect.anything()
      );
    });

    it('should preload island on mouseenter', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnHover(element, 'counter-island');
      element.dispatchEvent(new MouseEvent('mouseenter'));

      // Assert
      expect(mockLoader.preloadCalls).toContain('counter-island');
    });

    it('should return cleanup function', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      const cleanup = prefetcher.prefetchOnHover(element, 'counter-island');

      // Assert
      expect(typeof cleanup).toBe('function');
    });

    it('should remove event listener when cleanup is called', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');
      const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

      // Act
      const cleanup = prefetcher.prefetchOnHover(element, 'counter-island');
      cleanup();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function),
        expect.anything()
      );
    });

    it('should only preload once even with multiple mouseenter events', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnHover(element, 'counter-island');
      element.dispatchEvent(new MouseEvent('mouseenter'));
      element.dispatchEvent(new MouseEvent('mouseenter'));
      element.dispatchEvent(new MouseEvent('mouseenter'));

      // Assert - should only preload once
      expect(mockLoader.preloadCalls.filter(id => id === 'counter-island').length).toBe(1);
    });
  });

  // ==================== prefetchOnVisible ====================

  describe('prefetchOnVisible', () => {
    it('should create IntersectionObserver', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      // Assert
      expect(mockIntersectionObserverCallback).not.toBeNull();
    });

    it('should observe the element', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      // Assert
      expect(mockObservedElements).toContain(element);
    });

    it('should preload island when element becomes visible', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      // Simulate intersection
      if (mockIntersectionObserverCallback) {
        mockIntersectionObserverCallback([
          { isIntersecting: true, target: element, intersectionRatio: 1 },
        ]);
      }

      // Assert
      expect(mockLoader.preloadCalls).toContain('counter-island');
    });

    it('should not preload when element is not intersecting', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      // Simulate non-intersection
      if (mockIntersectionObserverCallback) {
        mockIntersectionObserverCallback([
          { isIntersecting: false, target: element, intersectionRatio: 0 },
        ]);
      }

      // Assert
      expect(mockLoader.preloadCalls).not.toContain('counter-island');
    });

    it('should accept optional PrefetchOptions', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island', {
        strategy: 'visible',
        threshold: 0.5,
        rootMargin: '100px',
      });

      // Assert
      expect(mockIntersectionObserverOptions?.threshold).toBe(0.5);
      expect(mockIntersectionObserverOptions?.rootMargin).toBe('100px');
    });

    it('should return cleanup function', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      const cleanup = prefetcher.prefetchOnVisible(element, 'counter-island');

      // Assert
      expect(typeof cleanup).toBe('function');
    });

    it('should unobserve element when cleanup is called', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      const cleanup = prefetcher.prefetchOnVisible(element, 'counter-island');
      expect(mockObservedElements).toContain(element);

      cleanup();

      // Assert
      expect(mockObservedElements).not.toContain(element);
    });

    it('should unobserve after first intersection', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      // Simulate intersection
      if (mockIntersectionObserverCallback) {
        mockIntersectionObserverCallback([
          { isIntersecting: true, target: element, intersectionRatio: 1 },
        ]);
      }

      // Assert - should unobserve after preloading
      expect(mockObservedElements).not.toContain(element);
    });

    it('should only preload once even with multiple intersections', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      // Simulate multiple intersections
      if (mockIntersectionObserverCallback) {
        mockIntersectionObserverCallback([
          { isIntersecting: true, target: element, intersectionRatio: 1 },
        ]);
        mockIntersectionObserverCallback([
          { isIntersecting: true, target: element, intersectionRatio: 1 },
        ]);
      }

      // Assert - should only preload once
      expect(mockLoader.preloadCalls.filter(id => id === 'counter-island').length).toBe(1);
    });
  });

  // ==================== Multiple Elements ====================

  describe('multiple elements', () => {
    it('should handle multiple elements with prefetchOnHover', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      // Act
      prefetcher.prefetchOnHover(element1, 'island-1');
      prefetcher.prefetchOnHover(element2, 'island-2');

      element1.dispatchEvent(new MouseEvent('mouseenter'));
      element2.dispatchEvent(new MouseEvent('mouseenter'));

      // Assert
      expect(mockLoader.preloadCalls).toContain('island-1');
      expect(mockLoader.preloadCalls).toContain('island-2');
    });

    it('should handle multiple elements with prefetchOnVisible', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element1, 'island-1');
      prefetcher.prefetchOnVisible(element2, 'island-2');

      // Assert
      expect(mockObservedElements).toContain(element1);
      expect(mockObservedElements).toContain(element2);
    });

    it('should cleanup only the specified element', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      // Act
      const cleanup1 = prefetcher.prefetchOnVisible(element1, 'island-1');
      prefetcher.prefetchOnVisible(element2, 'island-2');

      cleanup1();

      // Assert
      expect(mockObservedElements).not.toContain(element1);
      expect(mockObservedElements).toContain(element2);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle same island id for different elements', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      // Act
      prefetcher.prefetchOnHover(element1, 'counter-island');
      prefetcher.prefetchOnHover(element2, 'counter-island');

      element1.dispatchEvent(new MouseEvent('mouseenter'));
      element2.dispatchEvent(new MouseEvent('mouseenter'));

      // Assert - loader should handle deduplication internally
      expect(mockLoader.preloadCalls).toContain('counter-island');
    });

    it('should handle cleanup being called multiple times', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      const cleanup = prefetcher.prefetchOnHover(element, 'counter-island');
      cleanup();

      // Assert - should not throw when called multiple times
      expect(() => cleanup()).not.toThrow();
    });

    it('should handle element being removed from DOM', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const container = document.createElement('div');
      const element = document.createElement('div');
      container.appendChild(element);
      document.body.appendChild(container);

      // Act
      const cleanup = prefetcher.prefetchOnVisible(element, 'counter-island');
      container.removeChild(element);

      // Assert - cleanup should work even after element removal
      expect(() => cleanup()).not.toThrow();

      // Cleanup
      document.body.removeChild(container);
    });
  });

  // ==================== Integration with Island Loader ====================

  describe('integration with IslandLoader', () => {
    it('should use loader.preload for hover strategy', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnHover(element, 'counter-island');
      element.dispatchEvent(new MouseEvent('mouseenter'));

      // Assert - should use preload, not load
      expect(mockLoader.preloadCalls).toContain('counter-island');
      expect(mockLoader.loadCalls).not.toContain('counter-island');
    });

    it('should use loader.preload for visible strategy', () => {
      // Arrange
      const mockLoader = createMockLoader();
      const prefetcher = createPrefetcher(mockLoader);
      const element = document.createElement('div');

      // Act
      prefetcher.prefetchOnVisible(element, 'counter-island');

      if (mockIntersectionObserverCallback) {
        mockIntersectionObserverCallback([
          { isIntersecting: true, target: element, intersectionRatio: 1 },
        ]);
      }

      // Assert - should use preload, not load
      expect(mockLoader.preloadCalls).toContain('counter-island');
      expect(mockLoader.loadCalls).not.toContain('counter-island');
    });
  });
});
