/**
 * Test suite for entry-server.ts generateHydrationScript function
 *
 * Coverage:
 * - Default behavior (no HMR)
 * - HMR-enabled behavior (hmrUrl provided)
 * - Widget mounting with HMR
 * - Route context with HMR
 */

import { describe, it, expect } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';
import { generateHydrationScript } from '../entry-server.js';

// ==================== Test Fixtures ====================

function createMinimalProgram(): CompiledProgram {
  return {
    view: {
      node: 'element',
      tag: 'div',
      children: [{ node: 'text', value: 'Hello' }],
    },
    state: {},
    actions: {},
  } as CompiledProgram;
}

function createWidgetProgram(): CompiledProgram {
  return {
    view: {
      node: 'element',
      tag: 'span',
      children: [{ node: 'text', value: 'Widget' }],
    },
    state: {},
    actions: {},
  } as CompiledProgram;
}

// ==================== Tests: Default Behavior (no hmrUrl) ====================

describe('generateHydrationScript', () => {
  describe('when hmrUrl is NOT provided', () => {
    it('should import only hydrateApp from @constela/runtime', () => {
      // Arrange
      const program = createMinimalProgram();

      // Act
      const script = generateHydrationScript(program);

      // Assert
      expect(script).toContain("import { hydrateApp } from '@constela/runtime'");
      expect(script).not.toContain('createHMRClient');
      expect(script).not.toContain('createHMRHandler');
      expect(script).not.toContain('createErrorOverlay');
    });

    it('should call hydrateApp directly', () => {
      // Arrange
      const program = createMinimalProgram();

      // Act
      const script = generateHydrationScript(program);

      // Assert
      expect(script).toContain('hydrateApp(');
      expect(script).not.toContain('handler.handleUpdate');
      expect(script).not.toContain('client.connect');
    });

    it('should include both hydrateApp and createApp when widgets are provided', () => {
      // Arrange
      const program = createMinimalProgram();
      const widgets = [{ id: 'my-widget', program: createWidgetProgram() }];

      // Act
      const script = generateHydrationScript(program, widgets);

      // Assert
      expect(script).toContain("import { hydrateApp, createApp } from '@constela/runtime'");
    });
  });

  // ==================== Tests: HMR Behavior (hmrUrl provided) ====================

  describe('when hmrUrl is provided', () => {
    it('should import HMR-related functions from @constela/runtime', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createHMRClient');
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('createErrorOverlay');
    });

    it('should create HMR client with the provided URL', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createHMRClient');
      expect(script).toContain('ws://localhost:3001');
    });

    it('should create error overlay', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createErrorOverlay()');
    });

    it('should create HMR handler with container and program', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createHMRHandler');
      expect(script).toContain("container: document.getElementById('app')");
      expect(script).toContain('program');
    });

    it('should call client.connect()', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toMatch(/client\.connect\(\)/);
    });

    it('should setup onUpdate handler to call handler.handleUpdate', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('onUpdate');
      expect(script).toContain('handleUpdate');
    });

    it('should setup onError handler to show error overlay', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      expect(script).toContain('onError');
      expect(script).toContain('overlay.show');
    });

    it('should still call hydrateApp for initial hydration', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      // HMR mode should still hydrate the app initially
      expect(script).toContain('hydrateApp');
    });
  });

  // ==================== Tests: HMR skipInitialRender Option ====================

  describe('when hmrUrl is provided (skipInitialRender)', () => {
    it('should include skipInitialRender: true in HMR handler options', () => {
      /**
       * Given: Program and hmrUrl for HMR-enabled hydration
       * When: generateHydrationScript is called
       * Then: The generated script should include skipInitialRender: true
       *       in the createHMRHandler options
       *
       * This is necessary because hydrateApp() handles the initial rendering,
       * so the HMR handler should NOT render the initial app to avoid
       * double rendering.
       */
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert
      // The createHMRHandler call should include skipInitialRender: true
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('skipInitialRender: true');
    });

    it('should include skipInitialRender: true with route context', () => {
      /**
       * Given: Program, route context, and hmrUrl
       * When: generateHydrationScript is called
       * Then: The generated script should include both route and skipInitialRender: true
       */
      // Arrange
      const program = createMinimalProgram();
      const route = { params: { id: '123' }, query: { q: 'test' }, path: '/items/123' };
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, route, hmrUrl);

      // Assert
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('skipInitialRender: true');
      expect(script).toContain('route');
    });
  });

  // ==================== Tests: HMR with Route Context ====================

  describe('when hmrUrl is provided with route context', () => {
    it('should pass route context to HMR handler', () => {
      // Arrange
      const program = createMinimalProgram();
      const route = { params: { id: '123' }, query: { q: 'test' }, path: '/items/123' };
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, undefined, route, hmrUrl);

      // Assert
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('route');
    });
  });

  // ==================== Tests: HMR with Widgets ====================

  describe('when hmrUrl is provided with widgets', () => {
    it('should include createApp for widget mounting along with HMR imports', () => {
      // Arrange
      const program = createMinimalProgram();
      const widgets = [{ id: 'sidebar', program: createWidgetProgram() }];
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, widgets, undefined, hmrUrl);

      // Assert
      expect(script).toContain('createApp');
      expect(script).toContain('createHMRClient');
      expect(script).toContain('createHMRHandler');
      expect(script).toContain('createErrorOverlay');
    });

    it('should still mount widgets in HMR mode', () => {
      // Arrange
      const program = createMinimalProgram();
      const widgets = [{ id: 'sidebar', program: createWidgetProgram() }];
      const hmrUrl = 'ws://localhost:3001';

      // Act
      const script = generateHydrationScript(program, widgets, undefined, hmrUrl);

      // Assert
      expect(script).toContain("document.getElementById('sidebar')");
      expect(script).toContain('widgetProgram_sidebar');
    });
  });

  // ==================== Tests: Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty hmrUrl string as no HMR', () => {
      // Arrange
      const program = createMinimalProgram();
      const hmrUrl = '';

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert - empty string should be treated as falsy, no HMR
      expect(script).not.toContain('createHMRClient');
      expect(script).toContain("import { hydrateApp } from '@constela/runtime'");
    });

    it('should escape special characters in hmrUrl', () => {
      // Arrange
      const program = createMinimalProgram();
      // URL with query params that could cause issues if not properly escaped
      const hmrUrl = "ws://localhost:3001?token=abc'123";

      // Act
      const script = generateHydrationScript(program, undefined, undefined, hmrUrl);

      // Assert - should not break the script
      expect(script).toContain('createHMRClient');
      // The single quote should be escaped
      expect(script).not.toContain("'abc'123'"); // This would break
    });
  });
});
