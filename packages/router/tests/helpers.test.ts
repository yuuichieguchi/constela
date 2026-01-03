/**
 * Test module for bindLink helper.
 *
 * Coverage:
 * - Left click navigates
 * - Ctrl+click doesn't navigate (opens in new tab)
 * - Meta+click doesn't navigate
 * - Right click doesn't navigate
 * - Returns cleanup function that removes listener
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindLink, createLink } from '../src/helpers.js';
import type { RouterInstance } from '../src/router.js';

describe('bindLink', () => {
  // ==================== Setup ====================

  let container: HTMLElement;
  let mockRouter: RouterInstance;
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create mock router
    navigateMock = vi.fn();
    mockRouter = {
      mount: vi.fn(() => ({ destroy: vi.fn() })),
      navigate: navigateMock,
      getContext: vi.fn(() => ({
        path: '/',
        params: {},
        query: new URLSearchParams(),
      })),
    };
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  // ==================== Left Click Navigation ====================

  describe('left click navigation', () => {
    it('should navigate on left click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0, // Left button
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).toHaveBeenCalledWith('/about');
    });

    it('should prevent default browser navigation', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      anchor.dispatchEvent(event);

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should use provided "to" path over href', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/ignored';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor, '/custom-path');

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).toHaveBeenCalledWith('/custom-path');
    });

    it('should use href if "to" is not provided', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/from-href';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).toHaveBeenCalledWith('/from-href');
    });
  });

  // ==================== Ctrl+Click (New Tab) ====================

  describe('ctrl+click handling', () => {
    it('should not navigate on ctrl+click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        ctrlKey: true,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('should not prevent default on ctrl+click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        ctrlKey: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      anchor.dispatchEvent(event);

      // Assert
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ==================== Meta+Click (Command+Click on Mac) ====================

  describe('meta+click handling', () => {
    it('should not navigate on meta+click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        metaKey: true,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('should not prevent default on meta+click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        metaKey: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      anchor.dispatchEvent(event);

      // Assert
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ==================== Right Click ====================

  describe('right click handling', () => {
    it('should not navigate on right click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 2, // Right button
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('should not prevent default on right click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 2,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      anchor.dispatchEvent(event);

      // Assert
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ==================== Middle Click ====================

  describe('middle click handling', () => {
    it('should not navigate on middle click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 1, // Middle button
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // ==================== Shift+Click ====================

  describe('shift+click handling', () => {
    it('should not navigate on shift+click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        shiftKey: true,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // ==================== Alt+Click ====================

  describe('alt+click handling', () => {
    it('should not navigate on alt+click', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor);

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        altKey: true,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // ==================== Cleanup Function ====================

  describe('cleanup function', () => {
    it('should return a cleanup function', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';

      // Act
      const cleanup = bindLink(mockRouter, anchor);

      // Assert
      expect(typeof cleanup).toBe('function');
    });

    it('should remove click listener when cleanup is called', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      container.appendChild(anchor);

      const cleanup = bindLink(mockRouter, anchor);

      // Verify navigation works before cleanup
      const firstEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      anchor.dispatchEvent(firstEvent);
      expect(navigateMock).toHaveBeenCalledTimes(1);

      // Act - cleanup
      cleanup();

      // Try clicking again
      navigateMock.mockClear();
      const secondEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      anchor.dispatchEvent(secondEvent);

      // Assert - navigation should not happen after cleanup
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('should be safe to call cleanup multiple times', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '/about';
      const cleanup = bindLink(mockRouter, anchor);

      // Act & Assert - should not throw
      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle anchor with relative href', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = 'relative-path';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor, '/absolute-path');

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      anchor.dispatchEvent(event);

      // Assert - should use the "to" parameter
      expect(navigateMock).toHaveBeenCalledWith('/absolute-path');
    });

    it('should handle anchor with empty href', () => {
      // Arrange
      const anchor = document.createElement('a');
      anchor.href = '';
      container.appendChild(anchor);

      bindLink(mockRouter, anchor, '/fallback');

      // Act
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      anchor.dispatchEvent(event);

      // Assert
      expect(navigateMock).toHaveBeenCalledWith('/fallback');
    });
  });
});

// ==================== createLink ====================

describe('createLink', () => {
  let mockRouter: RouterInstance;
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    mockRouter = {
      mount: vi.fn(() => ({ destroy: vi.fn() })),
      navigate: navigateMock,
      getContext: vi.fn(() => ({
        path: '/',
        params: {},
        query: new URLSearchParams(),
      })),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an anchor element', () => {
    // Act
    const { element } = createLink(mockRouter, '/about', 'About');

    // Assert
    expect(element).toBeInstanceOf(HTMLAnchorElement);
  });

  it('should set href attribute', () => {
    // Act
    const { element } = createLink(mockRouter, '/about', 'About');

    // Assert
    expect(element.getAttribute('href')).toBe('/about');
  });

  it('should set text content', () => {
    // Act
    const { element } = createLink(mockRouter, '/about', 'About Page');

    // Assert
    expect(element.textContent).toBe('About Page');
  });

  it('should navigate when clicked', () => {
    // Arrange
    const { element } = createLink(mockRouter, '/contact', 'Contact');
    document.body.appendChild(element);

    // Act
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    element.dispatchEvent(event);

    // Assert
    expect(navigateMock).toHaveBeenCalledWith('/contact');

    // Cleanup
    element.remove();
  });

  it('should return destroy function that removes listener', () => {
    // Arrange
    const { element, destroy } = createLink(mockRouter, '/about', 'About');
    document.body.appendChild(element);

    // Verify click works
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(navigateMock).toHaveBeenCalledTimes(1);

    // Act
    destroy();
    navigateMock.mockClear();
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    // Assert
    expect(navigateMock).not.toHaveBeenCalled();

    // Cleanup
    element.remove();
  });
});
