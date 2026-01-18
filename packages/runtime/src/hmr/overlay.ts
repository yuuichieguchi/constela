/**
 * HMR Error Overlay - Display compilation errors during development
 *
 * This module provides an error overlay UI that displays compilation errors
 * as an overlay on the DOM, helping developers quickly identify and fix issues.
 *
 * Features:
 * - Display file path and error details
 * - Show error code and suggestions
 * - Auto-hide when error is fixed
 * - Styled overlay with dark background and high z-index
 *
 * Usage:
 * ```typescript
 * const overlay = createErrorOverlay();
 *
 * // Show error
 * overlay.show({
 *   file: '/src/pages/index.json',
 *   errors: [{ code: 'PARSE_ERROR', message: 'Unexpected token' }]
 * });
 *
 * // Hide when fixed
 * overlay.hide();
 * ```
 */

import { escapeHtml } from '../utils/escape.js';

/**
 * Error information to display in the overlay
 */
export interface ErrorInfo {
  /** File path where the error occurred */
  file: string;
  /** Array of error details */
  errors: Array<{
    /** Error code (e.g., 'PARSE_ERROR', 'UNDEFINED_STATE') */
    code?: string;
    /** Human-readable error message */
    message: string;
    /** Path to the problematic element in the JSON (e.g., 'view.children[0].value') */
    path?: string;
    /** Error severity ('error' | 'warning') */
    severity?: string;
    /** Suggestion for fixing the error */
    suggestion?: string;
  }>;
}

/**
 * Error overlay interface for displaying and hiding compilation errors
 */
export interface ErrorOverlay {
  /**
   * Show the error overlay with the given error information
   * @param errorInfo - Error details to display
   */
  show(errorInfo: ErrorInfo): void;

  /**
   * Hide the error overlay and remove it from the DOM
   */
  hide(): void;

  /**
   * Check if the overlay is currently visible
   * @returns true if the overlay is visible, false otherwise
   */
  isVisible(): boolean;
}

/** Data attribute for identifying the overlay element */
const OVERLAY_ATTRIBUTE = 'data-constela-error-overlay';

/**
 * Creates the overlay container element with appropriate styling.
 */
function createOverlayElement(): HTMLDivElement {
  const element = document.createElement('div');
  element.setAttribute(OVERLAY_ATTRIBUTE, '');

  // Apply dark overlay styling
  Object.assign(element.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#ffffff',
    zIndex: '9999',
    overflow: 'auto',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
  });

  return element;
}

/**
 * Renders the error content HTML for the overlay.
 */
function renderErrorContent(errorInfo: ErrorInfo): string {
  const errorItems = errorInfo.errors
    .map((error) => {
      const parts: string[] = [];

      if (error.code) {
        parts.push(`<span style="color: #ff6b6b; font-weight: bold;">${escapeHtml(error.code)}</span>`);
      }

      parts.push(`<div style="margin-top: 4px;">${escapeHtml(error.message)}</div>`);

      if (error.path) {
        parts.push(`<div style="color: #888; margin-top: 4px;">at ${escapeHtml(error.path)}</div>`);
      }

      if (error.suggestion) {
        parts.push(`<div style="color: #4ecdc4; margin-top: 8px;">${escapeHtml(error.suggestion)}</div>`);
      }

      return `<div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 4px; margin-bottom: 12px;">${parts.join('')}</div>`;
    })
    .join('');

  return `
    <div style="margin-bottom: 24px;">
      <div style="color: #ff6b6b; font-size: 18px; font-weight: bold; margin-bottom: 8px;">Compilation Error</div>
      <div style="color: #aaa; word-break: break-all;">${escapeHtml(errorInfo.file)}</div>
    </div>
    <div>${errorItems}</div>
  `;
}

/**
 * Creates an error overlay instance for displaying compilation errors.
 *
 * The overlay is rendered as a full-screen element with:
 * - Dark semi-transparent background
 * - White text for readability
 * - High z-index to appear above all other content
 * - File path and error details prominently displayed
 *
 * @returns ErrorOverlay interface for managing the overlay
 */
export function createErrorOverlay(): ErrorOverlay {
  let overlayElement: HTMLDivElement | null = null;

  return {
    show(errorInfo: ErrorInfo): void {
      // If already visible, update content instead of creating duplicate
      if (overlayElement && document.body.contains(overlayElement)) {
        overlayElement.innerHTML = renderErrorContent(errorInfo);
        return;
      }

      // Create new overlay element
      overlayElement = createOverlayElement();
      overlayElement.innerHTML = renderErrorContent(errorInfo);

      // Add to DOM
      document.body.appendChild(overlayElement);
    },

    hide(): void {
      // Safe to call when not visible
      if (overlayElement && document.body.contains(overlayElement)) {
        document.body.removeChild(overlayElement);
      }
      overlayElement = null;
    },

    isVisible(): boolean {
      return overlayElement !== null && document.body.contains(overlayElement);
    },
  };
}
