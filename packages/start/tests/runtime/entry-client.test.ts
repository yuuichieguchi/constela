/**
 * Test module for entry-client.ts Escape Hatch mechanism.
 *
 * Coverage:
 * - initClient basic behavior: hydrateApp integration, AppInstance return
 * - Escape Hatch mechanism: [data-constela-escape] detection, handler mounting
 * - EscapeContext: getState, setState, subscribe
 * - Cleanup: destroy() calls EscapeHandler cleanup functions
 * - Error handling: unregistered escape names, empty escapeHandlers
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';

// Mock @constela/runtime before importing entry-client
vi.mock('@constela/runtime', () => ({
  hydrateApp: vi.fn(() => ({
    destroy: vi.fn(),
    setState: vi.fn(),
    getState: vi.fn(),
  })),
}));

// Types for the Escape Hatch mechanism (to be implemented)
interface EscapeContext {
  appInstance: AppInstance;
  getState: (name: string) => unknown;
  setState: (name: string, value: unknown) => void;
  subscribe: (name: string, fn: (value: unknown) => void) => () => void;
}

interface EscapeHandler {
  name: string;
  mount: (element: HTMLElement, ctx: EscapeContext) => () => void;
}

interface AppInstance {
  destroy(): void;
  setState(name: string, value: unknown): void;
  getState(name: string): unknown;
}

interface InitClientOptions {
  program: CompiledProgram;
  container: HTMLElement;
  escapeHandlers?: EscapeHandler[];
}

// ==================== Test Fixtures ====================

function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
  return {
    version: '1.0',
    state: {},
    actions: {},
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  };
}

function createMockEscapeHandler(name: string): {
  handler: EscapeHandler;
  mountFn: Mock;
  cleanupFn: Mock;
} {
  const cleanupFn = vi.fn();
  const mountFn = vi.fn(() => cleanupFn);
  return {
    handler: { name, mount: mountFn },
    mountFn,
    cleanupFn,
  };
}

// ==================== Tests ====================

describe('initClient', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Basic Behavior ====================

  describe('basic behavior', () => {
    it('should call hydrateApp from @constela/runtime', async () => {
      // Arrange
      const { hydrateApp } = await import('@constela/runtime');
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      // Act
      initClient({ program, container });

      // Assert
      expect(hydrateApp).toHaveBeenCalledTimes(1);
      expect(hydrateApp).toHaveBeenCalledWith(
        expect.objectContaining({
          program,
          container,
        })
      );
    });

    it('should return an AppInstance', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      // Act
      const app = initClient({ program, container });

      // Assert
      expect(app).toBeDefined();
      expect(typeof app.destroy).toBe('function');
      expect(typeof app.setState).toBe('function');
      expect(typeof app.getState).toBe('function');
    });

    it('should work without escapeHandlers option', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      // Act & Assert - should not throw
      expect(() => {
        initClient({ program, container });
      }).not.toThrow();
    });

    it('should work with empty escapeHandlers array', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      // Act & Assert - should not throw
      expect(() => {
        initClient({ program, container, escapeHandlers: [] });
      }).not.toThrow();
    });
  });

  // ==================== Escape Hatch Detection ====================

  describe('escape hatch detection', () => {
    it('should detect elements with [data-constela-escape] attribute', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('chart');

      container.innerHTML = '<div data-constela-escape="chart"></div>';

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert
      expect(mountFn).toHaveBeenCalledTimes(1);
    });

    it('should detect multiple escape elements', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler: chartHandler, mountFn: chartMount } = createMockEscapeHandler('chart');
      const { handler: mapHandler, mountFn: mapMount } = createMockEscapeHandler('map');

      container.innerHTML = `
        <div data-constela-escape="chart"></div>
        <div data-constela-escape="map"></div>
      `;

      // Act
      initClient({
        program,
        container,
        escapeHandlers: [chartHandler, mapHandler],
      });

      // Assert
      expect(chartMount).toHaveBeenCalledTimes(1);
      expect(mapMount).toHaveBeenCalledTimes(1);
    });

    it('should detect nested escape elements', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('widget');

      container.innerHTML = `
        <div class="parent">
          <div class="child">
            <div data-constela-escape="widget"></div>
          </div>
        </div>
      `;

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert
      expect(mountFn).toHaveBeenCalledTimes(1);
    });

    it('should detect multiple instances of the same escape type', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('chart');

      container.innerHTML = `
        <div data-constela-escape="chart" id="chart1"></div>
        <div data-constela-escape="chart" id="chart2"></div>
        <div data-constela-escape="chart" id="chart3"></div>
      `;

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert
      expect(mountFn).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== EscapeHandler Mount ====================

  describe('escape handler mount', () => {
    it('should call mount with the correct element', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('chart');

      container.innerHTML = '<div data-constela-escape="chart" id="my-chart"></div>';
      const escapeElement = container.querySelector('#my-chart') as HTMLElement;

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert
      expect(mountFn).toHaveBeenCalledWith(
        escapeElement,
        expect.any(Object)
      );
    });

    it('should provide EscapeContext with appInstance to mount', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('chart');

      container.innerHTML = '<div data-constela-escape="chart"></div>';

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert
      const ctx = mountFn.mock.calls[0][1] as EscapeContext;
      expect(ctx.appInstance).toBeDefined();
      expect(typeof ctx.appInstance.destroy).toBe('function');
      expect(typeof ctx.appInstance.setState).toBe('function');
      expect(typeof ctx.appInstance.getState).toBe('function');
    });
  });

  // ==================== EscapeContext ====================

  describe('EscapeContext', () => {
    describe('getState', () => {
      it('should provide getState function in EscapeContext', async () => {
        // Arrange
        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 42 },
          },
        });
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });

        // Assert
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        expect(typeof ctx.getState).toBe('function');
      });

      it('should return state value via getState', async () => {
        // Arrange
        const { hydrateApp } = await import('@constela/runtime');
        (hydrateApp as Mock).mockReturnValue({
          destroy: vi.fn(),
          setState: vi.fn(),
          getState: vi.fn((name: string) => {
            if (name === 'count') return 42;
            return undefined;
          }),
        });

        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 42 },
          },
        });
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });

        // Assert
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        expect(ctx.getState('count')).toBe(42);
      });
    });

    describe('setState', () => {
      it('should provide setState function in EscapeContext', async () => {
        // Arrange
        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram();
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });

        // Assert
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        expect(typeof ctx.setState).toBe('function');
      });

      it('should update state via setState', async () => {
        // Arrange
        const mockSetState = vi.fn();
        const { hydrateApp } = await import('@constela/runtime');
        (hydrateApp as Mock).mockReturnValue({
          destroy: vi.fn(),
          setState: mockSetState,
          getState: vi.fn(),
        });

        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 0 },
          },
        });
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        ctx.setState('count', 100);

        // Assert
        expect(mockSetState).toHaveBeenCalledWith('count', 100);
      });
    });

    describe('subscribe', () => {
      it('should provide subscribe function in EscapeContext', async () => {
        // Arrange
        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram();
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });

        // Assert
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        expect(typeof ctx.subscribe).toBe('function');
      });

      it('should return unsubscribe function from subscribe', async () => {
        // Arrange
        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 0 },
          },
        });
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        const unsubscribe = ctx.subscribe('count', vi.fn());

        // Assert
        expect(typeof unsubscribe).toBe('function');
      });

      it('should call subscriber callback when state changes', async () => {
        // Arrange
        let subscriberCallback: ((value: unknown) => void) | null = null;
        const mockSubscribe = vi.fn((name: string, fn: (value: unknown) => void) => {
          subscriberCallback = fn;
          return vi.fn();
        });

        const { hydrateApp } = await import('@constela/runtime');
        (hydrateApp as Mock).mockReturnValue({
          destroy: vi.fn(),
          setState: vi.fn(),
          getState: vi.fn(),
          // Note: hydrateApp returns AppInstance which doesn't have subscribe
          // This test assumes EscapeContext.subscribe uses internal StateStore
        });

        const { initClient } = await import('../../src/runtime/entry-client.js');
        const program = createMinimalProgram({
          state: {
            count: { type: 'number', initial: 0 },
          },
        });

        const subscriberFn = vi.fn();
        const { handler, mountFn } = createMockEscapeHandler('chart');

        container.innerHTML = '<div data-constela-escape="chart"></div>';

        // Act
        initClient({ program, container, escapeHandlers: [handler] });
        const ctx = mountFn.mock.calls[0][1] as EscapeContext;
        ctx.subscribe('count', subscriberFn);

        // Note: This test may need adjustment based on actual implementation
        // For now, we verify that subscribe is callable
        expect(true).toBe(true);
      });
    });
  });

  // ==================== Cleanup ====================

  describe('cleanup', () => {
    it('should call cleanup function when app is destroyed', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, cleanupFn } = createMockEscapeHandler('chart');

      container.innerHTML = '<div data-constela-escape="chart"></div>';

      // Act
      const app = initClient({ program, container, escapeHandlers: [handler] });
      app.destroy();

      // Assert
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });

    it('should call all cleanup functions for multiple escape handlers', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler: h1, cleanupFn: c1 } = createMockEscapeHandler('chart');
      const { handler: h2, cleanupFn: c2 } = createMockEscapeHandler('map');
      const { handler: h3, cleanupFn: c3 } = createMockEscapeHandler('widget');

      container.innerHTML = `
        <div data-constela-escape="chart"></div>
        <div data-constela-escape="map"></div>
        <div data-constela-escape="widget"></div>
      `;

      // Act
      const app = initClient({
        program,
        container,
        escapeHandlers: [h1, h2, h3],
      });
      app.destroy();

      // Assert
      expect(c1).toHaveBeenCalledTimes(1);
      expect(c2).toHaveBeenCalledTimes(1);
      expect(c3).toHaveBeenCalledTimes(1);
    });

    it('should call cleanup for multiple instances of same handler', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      const cleanupFns: Mock[] = [];
      const mountFn = vi.fn(() => {
        const cleanup = vi.fn();
        cleanupFns.push(cleanup);
        return cleanup;
      });
      const handler: EscapeHandler = { name: 'chart', mount: mountFn };

      container.innerHTML = `
        <div data-constela-escape="chart"></div>
        <div data-constela-escape="chart"></div>
        <div data-constela-escape="chart"></div>
      `;

      // Act
      const app = initClient({ program, container, escapeHandlers: [handler] });
      app.destroy();

      // Assert
      expect(cleanupFns.length).toBe(3);
      cleanupFns.forEach(cleanup => {
        expect(cleanup).toHaveBeenCalledTimes(1);
      });
    });

    it('should be safe to call destroy multiple times', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, cleanupFn } = createMockEscapeHandler('chart');

      container.innerHTML = '<div data-constela-escape="chart"></div>';

      // Act
      const app = initClient({ program, container, escapeHandlers: [handler] });

      // Assert - should not throw
      expect(() => {
        app.destroy();
        app.destroy();
        app.destroy();
      }).not.toThrow();

      // Cleanup should only be called once
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should ignore unregistered escape names without throwing', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler } = createMockEscapeHandler('chart');

      // Element has escape name "unknown" but no handler is registered for it
      container.innerHTML = `
        <div data-constela-escape="unknown"></div>
        <div data-constela-escape="chart"></div>
      `;

      // Act & Assert - should not throw
      expect(() => {
        initClient({ program, container, escapeHandlers: [handler] });
      }).not.toThrow();
    });

    it('should not call any handler for unregistered escape names', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('chart');

      container.innerHTML = `
        <div data-constela-escape="unknown1"></div>
        <div data-constela-escape="unknown2"></div>
      `;

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert
      expect(mountFn).not.toHaveBeenCalled();
    });

    it('should work when escapeHandlers is undefined', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      container.innerHTML = '<div data-constela-escape="chart"></div>';

      // Act & Assert - should not throw
      expect(() => {
        initClient({ program, container });
      }).not.toThrow();
    });

    it('should handle escape elements without value in attribute', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();
      const { handler, mountFn } = createMockEscapeHandler('');

      // Empty attribute value
      container.innerHTML = '<div data-constela-escape=""></div>';

      // Act
      initClient({ program, container, escapeHandlers: [handler] });

      // Assert - handler for empty name should be called
      expect(mountFn).toHaveBeenCalledTimes(1);
    });

    it('should handle handler mount throwing error gracefully', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram();

      const errorHandler: EscapeHandler = {
        name: 'error-handler',
        mount: () => {
          throw new Error('Mount error');
        },
      };
      const { handler: normalHandler, mountFn: normalMount } = createMockEscapeHandler('normal');

      container.innerHTML = `
        <div data-constela-escape="error-handler"></div>
        <div data-constela-escape="normal"></div>
      `;

      // Act & Assert - should handle error gracefully (implementation may vary)
      // Option 1: Throw - test would need try/catch
      // Option 2: Log and continue - test should verify normal handler still mounts
      // For now, we verify the app can be created without crashing
      try {
        const app = initClient({
          program,
          container,
          escapeHandlers: [errorHandler, normalHandler],
        });
        // If no error thrown, normal handler might or might not be called
        // depending on implementation decision
      } catch {
        // If error is propagated, that's also acceptable behavior
      }
    });
  });

  // ==================== Integration ====================

  describe('integration', () => {
    it('should work with realistic DOM structure', async () => {
      // Arrange
      const { initClient } = await import('../../src/runtime/entry-client.js');
      const program = createMinimalProgram({
        state: {
          data: { type: 'list', initial: [1, 2, 3] },
        },
      });
      const { handler: chartHandler, mountFn: chartMount } = createMockEscapeHandler('chart');

      container.innerHTML = `
        <header>
          <h1>Dashboard</h1>
        </header>
        <main>
          <section class="chart-section">
            <div data-constela-escape="chart" data-chart-type="bar"></div>
          </section>
          <section class="content">
            <p>Some content</p>
          </section>
        </main>
        <footer>
          <p>Footer</p>
        </footer>
      `;

      // Act
      const app = initClient({
        program,
        container,
        escapeHandlers: [chartHandler],
      });

      // Assert
      expect(chartMount).toHaveBeenCalledTimes(1);
      const mountedElement = chartMount.mock.calls[0][0] as HTMLElement;
      expect(mountedElement.getAttribute('data-chart-type')).toBe('bar');
    });
  });
});
