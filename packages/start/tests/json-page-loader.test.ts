/**
 * Test module for JsonPageLoader page widgets support.
 *
 * Coverage:
 * - Page without widgets: PageInfo.widgets should be empty array
 * - Page with one widget: Should load and compile the widget
 * - Page with multiple widgets: Should load and compile all widgets
 * - Widget file not found: Should throw error with clear message
 * - Widget compilation: Widget program should have correct state, actions, view
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonPageLoader } from '../src/json-page-loader.js';
import type { PageInfo, CompiledWidget } from '../src/json-page-loader.js';

// ==================== Test Fixtures ====================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

// ==================== JsonPageLoader Widgets Tests ====================

describe('JsonPageLoader', () => {
  let loader: JsonPageLoader;

  beforeEach(() => {
    loader = new JsonPageLoader(FIXTURES_DIR);
  });

  // ==================== Page Without Widgets ====================

  describe('page without widgets', () => {
    it('should return PageInfo with empty widgets array when page has no widgets', async () => {
      // Arrange
      const pagePath = 'pages/page-without-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo).toHaveProperty('widgets');
      expect(pageInfo.widgets).toEqual([]);
    });

    it('should return PageInfo with empty widgets array when widgets field is undefined', async () => {
      // Arrange
      // Using a page that doesn't have widgets field at all
      const pagePath = 'pages-layout/index.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo).toHaveProperty('widgets');
      expect(pageInfo.widgets).toEqual([]);
    });
  });

  // ==================== Page With One Widget ====================

  describe('page with one widget', () => {
    it('should load and compile a single widget', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.widgets).toHaveLength(1);
      expect(pageInfo.widgets[0]).toHaveProperty('id', 'counter-widget');
      expect(pageInfo.widgets[0]).toHaveProperty('program');
    });

    it('should compile widget with correct version', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.version).toBe('1.0');
    });

    it('should compile widget with correct state', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.state).toHaveProperty('count');
      expect(widget.program.state.count).toEqual({
        type: 'number',
        initial: 0,
      });
    });

    it('should compile widget with correct actions', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.actions).toHaveProperty('increment');
      expect(widget.program.actions.increment.name).toBe('increment');
      expect(widget.program.actions.increment.steps).toHaveLength(1);
    });

    it('should compile widget with correct view', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget.program.view).toHaveProperty('kind', 'element');
      expect(widget.program.view).toHaveProperty('tag', 'div');
    });
  });

  // ==================== Page With Multiple Widgets ====================

  describe('page with multiple widgets', () => {
    it('should load and compile all widgets', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.widgets).toHaveLength(2);
    });

    it('should preserve widget order from page definition', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(pageInfo.widgets[0].id).toBe('counter-widget');
      expect(pageInfo.widgets[1].id).toBe('timer-widget');
    });

    it('should compile each widget independently', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      // Counter widget should have 'count' state
      expect(pageInfo.widgets[0].program.state).toHaveProperty('count');
      expect(pageInfo.widgets[0].program.actions).toHaveProperty('increment');

      // Timer widget should have 'seconds' and 'running' state
      expect(pageInfo.widgets[1].program.state).toHaveProperty('seconds');
      expect(pageInfo.widgets[1].program.state).toHaveProperty('running');
      expect(pageInfo.widgets[1].program.actions).toHaveProperty('start');
      expect(pageInfo.widgets[1].program.actions).toHaveProperty('stop');
    });

    it('should compile all widgets with correct versions', async () => {
      // Arrange
      const pagePath = 'pages/page-with-multiple-widgets.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      for (const widget of pageInfo.widgets) {
        expect(widget.program.version).toBe('1.0');
      }
    });
  });

  // ==================== Widget File Not Found ====================

  describe('widget file not found', () => {
    it('should throw error when widget file does not exist', async () => {
      // Arrange
      const pagePath = 'pages/page-with-missing-widget.json';

      // Act & Assert
      await expect(loader.loadPage(pagePath)).rejects.toThrow();
    });

    it('should include widget src path in error message', async () => {
      // Arrange
      const pagePath = 'pages/page-with-missing-widget.json';

      // Act & Assert
      await expect(loader.loadPage(pagePath)).rejects.toThrow(/nonexistent/);
    });

    it('should include widget id in error message', async () => {
      // Arrange
      const pagePath = 'pages/page-with-missing-widget.json';

      // Act & Assert
      await expect(loader.loadPage(pagePath)).rejects.toThrow(
        /nonexistent-widget|Widget.*not found/i
      );
    });
  });

  // ==================== CompiledWidget Interface ====================

  describe('CompiledWidget interface', () => {
    it('should have id property matching widget definition', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget).toHaveProperty('id');
      expect(typeof widget.id).toBe('string');
      expect(widget.id).toBe('counter-widget');
    });

    it('should have program property of type CompiledProgram', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      const widget = pageInfo.widgets[0];
      expect(widget).toHaveProperty('program');
      expect(widget.program).toHaveProperty('version');
      expect(widget.program).toHaveProperty('state');
      expect(widget.program).toHaveProperty('actions');
      expect(widget.program).toHaveProperty('view');
    });
  });

  // ==================== PageInfo.widgets Type ====================

  describe('PageInfo.widgets type', () => {
    it('should be an array type', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      expect(Array.isArray(pageInfo.widgets)).toBe(true);
    });

    it('should contain CompiledWidget objects', async () => {
      // Arrange
      const pagePath = 'pages/page-with-widget.json';

      // Act
      const pageInfo = await loader.loadPage(pagePath);

      // Assert
      for (const widget of pageInfo.widgets) {
        expect(widget).toHaveProperty('id');
        expect(widget).toHaveProperty('program');
      }
    });
  });
});
