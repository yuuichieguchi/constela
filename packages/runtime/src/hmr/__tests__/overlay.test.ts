/**
 * Test module for HMR Error Overlay.
 *
 * Coverage:
 * - createErrorOverlay: Create an error overlay instance
 * - show(): Display error overlay with file path and error details
 * - hide(): Remove error overlay from DOM
 * - isVisible(): Check visibility state
 * - Styling: Dark background, white text, high z-index
 *
 * TDD Red Phase: These tests verify the error overlay functionality
 * that will be implemented to display compilation errors during development.
 *
 * Error Display Flow:
 * 1. Compilation error occurs
 * 2. HMR client receives error message
 * 3. Error overlay is shown with file path and error details
 * 4. User fixes the error
 * 5. Overlay is hidden automatically on successful recompilation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import the module under test (will fail until implemented)
import {
  createErrorOverlay,
  type ErrorOverlay,
  type ErrorInfo,
} from '../overlay.js';

// ==================== Test Helpers ====================

/**
 * Create a sample ErrorInfo for testing
 */
function createSampleErrorInfo(overrides: Partial<ErrorInfo> = {}): ErrorInfo {
  return {
    file: '/src/pages/index.json',
    errors: [
      {
        code: 'UNDEFINED_STATE',
        message: 'State "count" is not defined',
        path: 'view.children[0].value',
        severity: 'error',
        suggestion: 'Did you mean "counter"?',
      },
    ],
    ...overrides,
  };
}

/**
 * Get the overlay element from the DOM
 */
function getOverlayElement(): HTMLElement | null {
  return document.querySelector('[data-constela-error-overlay]');
}

// ==================== Tests ====================

describe('createErrorOverlay()', () => {
  let overlay: ErrorOverlay;

  beforeEach(() => {
    // Clean up any existing overlays
    const existing = getOverlayElement();
    if (existing) {
      existing.remove();
    }
  });

  afterEach(() => {
    // Clean up overlay after each test
    if (overlay) {
      overlay.hide();
    }
    const existing = getOverlayElement();
    if (existing) {
      existing.remove();
    }
  });

  // ==================== Overlay Creation ====================

  describe('overlay creation', () => {
    it('should create an overlay instance', () => {
      /**
       * Given: Nothing
       * When: createErrorOverlay is called
       * Then: An overlay instance should be created with show, hide, and isVisible methods
       */
      // Act
      overlay = createErrorOverlay();

      // Assert
      expect(overlay).toBeDefined();
      expect(typeof overlay.show).toBe('function');
      expect(typeof overlay.hide).toBe('function');
      expect(typeof overlay.isVisible).toBe('function');
    });
  });

  // ==================== show() ====================

  describe('show()', () => {
    it('should add overlay element to document.body', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called with error info
       * Then: An overlay element should be added to document.body
       */
      // Arrange
      overlay = createErrorOverlay();
      const errorInfo = createSampleErrorInfo();

      // Act
      overlay.show(errorInfo);

      // Assert
      const overlayElement = getOverlayElement();
      expect(overlayElement).not.toBeNull();
      expect(document.body.contains(overlayElement)).toBe(true);
    });

    it('should display file path', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called with error info containing file path
       * Then: The file path should be displayed in the overlay
       */
      // Arrange
      overlay = createErrorOverlay();
      const errorInfo = createSampleErrorInfo({
        file: '/src/pages/broken.json',
      });

      // Act
      overlay.show(errorInfo);

      // Assert
      const overlayElement = getOverlayElement();
      expect(overlayElement?.textContent).toContain('/src/pages/broken.json');
    });

    it('should display error messages', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called with error info containing error messages
       * Then: The error messages should be displayed in the overlay
       */
      // Arrange
      overlay = createErrorOverlay();
      const errorInfo = createSampleErrorInfo({
        errors: [
          {
            message: 'Invalid syntax near token "}"',
          },
        ],
      });

      // Act
      overlay.show(errorInfo);

      // Assert
      const overlayElement = getOverlayElement();
      expect(overlayElement?.textContent).toContain('Invalid syntax near token "}"');
    });

    it('should display error code if present', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called with error info containing error code
       * Then: The error code should be displayed in the overlay
       */
      // Arrange
      overlay = createErrorOverlay();
      const errorInfo = createSampleErrorInfo({
        errors: [
          {
            code: 'PARSE_ERROR',
            message: 'Unexpected token',
          },
        ],
      });

      // Act
      overlay.show(errorInfo);

      // Assert
      const overlayElement = getOverlayElement();
      expect(overlayElement?.textContent).toContain('PARSE_ERROR');
    });

    it('should display suggestion if present', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called with error info containing suggestion
       * Then: The suggestion should be displayed in the overlay
       */
      // Arrange
      overlay = createErrorOverlay();
      const errorInfo = createSampleErrorInfo({
        errors: [
          {
            message: 'Unknown action "handleClck"',
            suggestion: 'Did you mean "handleClick"?',
          },
        ],
      });

      // Act
      overlay.show(errorInfo);

      // Assert
      const overlayElement = getOverlayElement();
      expect(overlayElement?.textContent).toContain('Did you mean "handleClick"?');
    });

    it('should handle multiple errors', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called with error info containing multiple errors
       * Then: All errors should be displayed in the overlay
       */
      // Arrange
      overlay = createErrorOverlay();
      const errorInfo = createSampleErrorInfo({
        errors: [
          {
            code: 'ERROR_1',
            message: 'First error message',
          },
          {
            code: 'ERROR_2',
            message: 'Second error message',
          },
          {
            code: 'ERROR_3',
            message: 'Third error message',
          },
        ],
      });

      // Act
      overlay.show(errorInfo);

      // Assert
      const overlayElement = getOverlayElement();
      expect(overlayElement?.textContent).toContain('First error message');
      expect(overlayElement?.textContent).toContain('Second error message');
      expect(overlayElement?.textContent).toContain('Third error message');
    });

    it('should update content when show() is called multiple times (not create duplicate)', () => {
      /**
       * Given: An error overlay instance that is already showing
       * When: show() is called again with new error info
       * Then: Content should be updated without creating duplicate overlays
       */
      // Arrange
      overlay = createErrorOverlay();
      const firstError = createSampleErrorInfo({
        file: '/src/first.json',
        errors: [{ message: 'First error' }],
      });
      const secondError = createSampleErrorInfo({
        file: '/src/second.json',
        errors: [{ message: 'Second error' }],
      });

      // Act
      overlay.show(firstError);
      overlay.show(secondError);

      // Assert
      const overlays = document.querySelectorAll('[data-constela-error-overlay]');
      expect(overlays.length).toBe(1);

      const overlayElement = getOverlayElement();
      expect(overlayElement?.textContent).toContain('/src/second.json');
      expect(overlayElement?.textContent).toContain('Second error');
      expect(overlayElement?.textContent).not.toContain('/src/first.json');
      expect(overlayElement?.textContent).not.toContain('First error');
    });
  });

  // ==================== hide() ====================

  describe('hide()', () => {
    it('should remove overlay from DOM', () => {
      /**
       * Given: An error overlay that is currently showing
       * When: hide() is called
       * Then: The overlay element should be removed from the DOM
       */
      // Arrange
      overlay = createErrorOverlay();
      overlay.show(createSampleErrorInfo());
      expect(getOverlayElement()).not.toBeNull();

      // Act
      overlay.hide();

      // Assert
      expect(getOverlayElement()).toBeNull();
    });

    it('should not throw error when not visible', () => {
      /**
       * Given: An error overlay that is not showing
       * When: hide() is called
       * Then: Should not throw an error
       */
      // Arrange
      overlay = createErrorOverlay();

      // Act & Assert
      expect(() => overlay.hide()).not.toThrow();
    });
  });

  // ==================== isVisible() ====================

  describe('isVisible()', () => {
    it('should return true when overlay is shown', () => {
      /**
       * Given: An error overlay that has been shown
       * When: isVisible() is called
       * Then: Should return true
       */
      // Arrange
      overlay = createErrorOverlay();
      overlay.show(createSampleErrorInfo());

      // Act & Assert
      expect(overlay.isVisible()).toBe(true);
    });

    it('should return false when overlay is hidden', () => {
      /**
       * Given: An error overlay that has not been shown
       * When: isVisible() is called
       * Then: Should return false
       */
      // Arrange
      overlay = createErrorOverlay();

      // Act & Assert
      expect(overlay.isVisible()).toBe(false);
    });

    it('should return false after hide() is called', () => {
      /**
       * Given: An error overlay that was shown and then hidden
       * When: isVisible() is called
       * Then: Should return false
       */
      // Arrange
      overlay = createErrorOverlay();
      overlay.show(createSampleErrorInfo());
      overlay.hide();

      // Act & Assert
      expect(overlay.isVisible()).toBe(false);
    });
  });

  // ==================== Styling ====================

  describe('styling', () => {
    it('should have dark background', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called
       * Then: The overlay should have a dark background color
       */
      // Arrange
      overlay = createErrorOverlay();

      // Act
      overlay.show(createSampleErrorInfo());

      // Assert
      const overlayElement = getOverlayElement();
      const styles = window.getComputedStyle(overlayElement!);
      const bgColor = styles.backgroundColor;

      // Check that background is dark (low RGB values or rgba with low values)
      // Accept various dark colors: black, dark gray, semi-transparent black
      const isDark =
        bgColor === 'rgb(0, 0, 0)' ||
        bgColor === 'rgba(0, 0, 0, 1)' ||
        bgColor.includes('rgba(0, 0, 0,') ||
        bgColor.includes('rgb(17, 17, 17)') || // #111
        bgColor.includes('rgb(34, 34, 34)') || // #222
        bgColor.includes('rgb(51, 51, 51)'); // #333

      expect(isDark).toBe(true);
    });

    it('should have z-index higher than normal content', () => {
      /**
       * Given: An error overlay instance
       * When: show() is called
       * Then: The overlay should have a high z-index to appear above other content
       */
      // Arrange
      overlay = createErrorOverlay();

      // Act
      overlay.show(createSampleErrorInfo());

      // Assert
      const overlayElement = getOverlayElement();
      const styles = window.getComputedStyle(overlayElement!);
      const zIndex = parseInt(styles.zIndex, 10);

      // z-index should be very high (typically 9999 or higher for overlays)
      expect(zIndex).toBeGreaterThanOrEqual(9999);
    });
  });
});
