/**
 * Test module for ConstelaEmbed component.
 *
 * Coverage:
 * - Basic rendering (mount, className, id props)
 * - SSR HTML display (initial render with ssrHtml)
 * - Client-side mounting (useEffect calls createApp)
 * - Cleanup (app.destroy() on unmount)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { CompiledProgram } from '@constela/compiler';
import type { AppInstance } from '@constela/runtime';

// Mock @constela/runtime - must use hoisted vi.fn()
const mockDestroy = vi.fn();
const mockCreateApp = vi.fn<[CompiledProgram, HTMLElement], AppInstance>();

vi.mock('@constela/runtime', async () => {
  return {
    createApp: (...args: [CompiledProgram, HTMLElement]) => mockCreateApp(...args),
  };
});

// Import component after mock setup
import { ConstelaEmbed } from '../../components/ConstelaEmbed.js';

describe('ConstelaEmbed', () => {
  // ==================== Test Data ====================

  const sampleProgram: CompiledProgram = {
    version: '1.0',
    state: { count: { type: 'number', initial: 0 } },
    actions: {},
    view: {
      kind: 'element',
      tag: 'div',
      children: [{ kind: 'text', value: { expr: 'lit', value: 'Hello' } }],
    },
  };

  // ==================== Setup & Teardown ====================

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default return value for mockCreateApp
    mockCreateApp.mockReturnValue({
      destroy: mockDestroy,
      setState: vi.fn(),
      getState: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ==================== Basic Rendering ====================

  describe('basic rendering', () => {
    it('should mount the component', () => {
      // Arrange & Act
      render(<ConstelaEmbed program={sampleProgram} />);

      // Assert
      // Component should render without throwing
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    it('should apply className prop to container', () => {
      // Arrange
      const className = 'custom-class';

      // Act
      render(<ConstelaEmbed program={sampleProgram} className={className} />);

      // Assert
      const container = document.body.querySelector(`.${className}`);
      expect(container).not.toBeNull();
    });

    it('should apply id prop to container', () => {
      // Arrange
      const id = 'custom-id';

      // Act
      render(<ConstelaEmbed program={sampleProgram} id={id} />);

      // Assert
      const container = document.getElementById(id);
      expect(container).not.toBeNull();
    });

    it('should render container without className when not provided', () => {
      // Arrange & Act
      render(<ConstelaEmbed program={sampleProgram} />);

      // Assert
      const container = document.body.querySelector('[data-testid]') || 
                       document.body.querySelector('div');
      expect(container).not.toBeNull();
      // No specific className should be required when not provided
    });

    it('should render container without id when not provided', () => {
      // Arrange & Act
      render(<ConstelaEmbed program={sampleProgram} />);

      // Assert
      // Container should exist but may not have an id
      const allDivs = document.body.querySelectorAll('div');
      expect(allDivs.length).toBeGreaterThan(0);
    });
  });

  // ==================== SSR HTML Display ====================

  describe('SSR HTML display', () => {
    it('should display ssrHtml content on initial render', () => {
      // Arrange
      const ssrHtml = '<span data-testid="ssr-content">Server Rendered</span>';

      // Act
      render(<ConstelaEmbed program={sampleProgram} ssrHtml={ssrHtml} />);

      // Assert
      expect(screen.getByTestId('ssr-content')).not.toBeNull();
      expect(screen.getByText('Server Rendered')).not.toBeNull();
    });

    it('should render empty container when ssrHtml is not provided', () => {
      // Arrange & Act
      render(<ConstelaEmbed program={sampleProgram} />);

      // Assert
      // Container should be present but initially empty or with mounted content
      const container = document.body.querySelector('div');
      expect(container).not.toBeNull();
    });

    it('should render empty container when ssrHtml is empty string', () => {
      // Arrange & Act
      render(<ConstelaEmbed program={sampleProgram} ssrHtml="" />);

      // Assert
      const container = document.body.querySelector('div');
      expect(container).not.toBeNull();
    });
  });

  // ==================== Client-side Mounting ====================

  describe('client-side mounting', () => {
    it('should call createApp with program and container element', () => {
      // Arrange & Act
      render(<ConstelaEmbed program={sampleProgram} />);

      // Assert
      expect(mockCreateApp).toHaveBeenCalledTimes(1);
      expect(mockCreateApp).toHaveBeenCalledWith(
        sampleProgram,
        expect.any(HTMLElement)
      );
    });

    it('should mount Constela app to the container element', () => {
      // Arrange
      const id = 'mount-target';

      // Act
      render(<ConstelaEmbed program={sampleProgram} id={id} />);

      // Assert
      expect(mockCreateApp).toHaveBeenCalledWith(
        sampleProgram,
        expect.objectContaining({ id })
      );
    });

    it('should pass the correct program to createApp', () => {
      // Arrange
      const customProgram: CompiledProgram = {
        version: '1.0',
        state: { message: { type: 'string', initial: 'Hello World' } },
        actions: {},
        view: {
          kind: 'element',
          tag: 'p',
          children: [{ kind: 'text', value: { expr: 'state', name: 'message' } }],
        },
      };

      // Act
      render(<ConstelaEmbed program={customProgram} />);

      // Assert
      expect(mockCreateApp).toHaveBeenCalledWith(
        customProgram,
        expect.any(HTMLElement)
      );
    });
  });

  // ==================== Cleanup ====================

  describe('cleanup', () => {
    it('should call app.destroy() on unmount', () => {
      // Arrange
      const { unmount } = render(<ConstelaEmbed program={sampleProgram} />);

      // Act
      unmount();

      // Assert
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('should not call destroy if createApp was not called', () => {
      // Arrange
      mockCreateApp.mockReturnValueOnce(undefined as unknown as AppInstance);

      // Act
      const { unmount } = render(<ConstelaEmbed program={sampleProgram} />);
      unmount();

      // Assert
      // destroy should not throw even if app is undefined
      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('should handle multiple mount/unmount cycles', () => {
      // Arrange & Act
      const { unmount: unmount1 } = render(<ConstelaEmbed program={sampleProgram} />);
      unmount1();

      const { unmount: unmount2 } = render(<ConstelaEmbed program={sampleProgram} />);
      unmount2();

      // Assert
      expect(mockCreateApp).toHaveBeenCalledTimes(2);
      expect(mockDestroy).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle program with empty state', () => {
      // Arrange
      const emptyStateProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div' },
      };

      // Act
      render(<ConstelaEmbed program={emptyStateProgram} />);

      // Assert
      expect(mockCreateApp).toHaveBeenCalledWith(
        emptyStateProgram,
        expect.any(HTMLElement)
      );
    });

    it('should handle ssrHtml with complex HTML structure', () => {
      // Arrange
      const complexHtml = `
        <div class="wrapper">
          <h1>Title</h1>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;

      // Act
      render(<ConstelaEmbed program={sampleProgram} ssrHtml={complexHtml} />);

      // Assert
      expect(screen.getByText('Title')).not.toBeNull();
      expect(screen.getByText('Item 1')).not.toBeNull();
      expect(screen.getByText('Item 2')).not.toBeNull();
    });

    it('should apply both className and id props together', () => {
      // Arrange
      const className = 'test-class';
      const id = 'test-id';

      // Act
      render(
        <ConstelaEmbed
          program={sampleProgram}
          className={className}
          id={id}
        />
      );

      // Assert
      const container = document.getElementById(id);
      expect(container).not.toBeNull();
      expect(container?.classList.contains(className)).toBe(true);
    });
  });
});
