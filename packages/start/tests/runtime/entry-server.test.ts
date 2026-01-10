/**
 * Test module for entry-server.ts wrapHtml dark mode support and generateHydrationScript.
 *
 * Coverage:
 * - wrapHtml dark class when theme is 'dark'
 * - wrapHtml no dark class when theme is 'light'
 * - wrapHtml backward compatibility without theme option
 * - generateHydrationScript backward compatibility (no widgets)
 * - generateHydrationScript widget mounting support
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  wrapHtml,
  generateHydrationScript,
} from '../../src/runtime/entry-server.js';
import type { CompiledProgram } from '@constela/compiler';

// ==================== Type Definitions for Widget Mounting Feature ====================
// NOTE: This interface will be exported from entry-server.ts after implementation

/**
 * Configuration for mounting a widget after hydration.
 */
interface WidgetConfig {
  /** The DOM element ID where the widget should be mounted */
  id: string;
  /** The compiled program for the widget */
  program: CompiledProgram;
}

// ==================== Test Fixtures ====================

const SAMPLE_CONTENT = '<div>Hello World</div>';
const SAMPLE_HYDRATION_SCRIPT = 'console.log("hydrate");';
const SAMPLE_HEAD = '<title>Test Page</title>';

/**
 * Creates a minimal CompiledProgram for testing purposes.
 */
function createMockProgram(overrides: Partial<CompiledProgram> = {}): CompiledProgram {
  return {
    component: { type: 'div', props: {}, children: [] },
    actions: new Map(),
    slots: new Map(),
    ...overrides,
  } as CompiledProgram;
}

// ==================== Tests ====================

describe('wrapHtml', () => {
  // ==================== Dark Mode Support ====================

  describe('dark mode class support', () => {
    it('should add dark class to html element when theme is dark', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { theme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when theme is light', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = { theme: 'light' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when theme option is not provided', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when options is undefined', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, undefined);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });

    it('should not add dark class when options is empty object', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const options = {};

      // Act
      const result = wrapHtml(content, hydrationScript, undefined, options);

      // Assert
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should generate valid HTML without theme option (3 args)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;

      // Act
      const result = wrapHtml(content, hydrationScript, head);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain(head);
      expect(result).toContain('<body>');
      expect(result).toContain(content);
      expect(result).toContain(hydrationScript);
    });

    it('should generate valid HTML without head and theme option (2 args)', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('<body>');
      expect(result).toContain(content);
    });

    it('should include meta charset and viewport tags', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<meta charset="utf-8">');
      expect(result).toContain('<meta name="viewport"');
    });

    it('should wrap content in div#app', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain(`<div id="app">${content}</div>`);
    });

    it('should include hydration script in module script tag', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;

      // Act
      const result = wrapHtml(content, hydrationScript);

      // Assert
      expect(result).toContain('<script type="module">');
      expect(result).toContain(hydrationScript);
      expect(result).toContain('</script>');
    });
  });

  // ==================== Integration ====================

  describe('integration with theme option', () => {
    it('should work with head content and dark theme', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;
      const options = { theme: 'dark' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, head, options);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toMatch(/<html[^>]*class="[^"]*dark[^"]*"/);
      expect(result).toContain(head);
      expect(result).toContain(content);
      expect(result).toContain(hydrationScript);
    });

    it('should work with head content and light theme', () => {
      // Arrange
      const content = SAMPLE_CONTENT;
      const hydrationScript = SAMPLE_HYDRATION_SCRIPT;
      const head = SAMPLE_HEAD;
      const options = { theme: 'light' as const };

      // Act
      const result = wrapHtml(content, hydrationScript, head, options);

      // Assert
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).not.toMatch(/class="[^"]*dark[^"]*"/);
      expect(result).toContain(head);
      expect(result).toContain(content);
    });
  });
});

// ==================== generateHydrationScript Tests ====================

describe('generateHydrationScript', () => {
  // ==================== Backward Compatibility ====================

  describe('backward compatibility (without widgets)', () => {
    it('should work without widgets parameter', () => {
      // Arrange
      const program = createMockProgram();

      // Act
      const result = generateHydrationScript(program);

      // Assert
      expect(result).toContain("import { hydrateApp } from '@constela/runtime'");
      expect(result).toContain("document.getElementById('app')");
    });

    it('should not include createApp import when no widgets provided', () => {
      // Arrange
      const program = createMockProgram();

      // Act
      const result = generateHydrationScript(program);

      // Assert
      expect(result).not.toContain('createApp');
    });
  });

  // ==================== Widget Mounting Support ====================

  describe('widget mounting support', () => {
    it('should include createApp import when widgets are provided', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram({
        component: { type: 'span', props: {}, children: ['Widget'] },
      });
      const widgets: WidgetConfig[] = [
        { id: 'code-demo-preview', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain('createApp');
      expect(result).toContain("import { hydrateApp, createApp } from '@constela/runtime'");
    });

    it('should mount widget to specified container element', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'code-demo-preview', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain("document.getElementById('code-demo-preview')");
    });

    it('should include widget program data in the script', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram({
        component: { type: 'div', props: { className: 'widget-test' }, children: [] },
      });
      const widgets: WidgetConfig[] = [
        { id: 'test-widget', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain('widget-test');
    });

    it('should mount multiple widgets when multiple widgets are provided', () => {
      // Arrange
      const program = createMockProgram();
      const widget1Program = createMockProgram();
      const widget2Program = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'widget-1', program: widget1Program },
        { id: 'widget-2', program: widget2Program },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      expect(result).toContain("document.getElementById('widget-1')");
      expect(result).toContain("document.getElementById('widget-2')");
    });

    it('should handle empty widgets array (no widget mounting)', () => {
      // Arrange
      const program = createMockProgram();
      const widgets: WidgetConfig[] = [];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // Empty array should behave like no widgets
      expect(result).not.toContain('createApp');
    });

    it('should mount widgets after main app hydration', () => {
      // Arrange
      const program = createMockProgram();
      const widgetProgram = createMockProgram();
      const widgets: WidgetConfig[] = [
        { id: 'my-widget', program: widgetProgram },
      ];

      // Act
      const result = generateHydrationScript(program, widgets);

      // Assert
      // hydrateApp should appear before createApp for widgets
      const hydrateAppIndex = result.indexOf('hydrateApp({');
      const createAppIndex = result.indexOf('createApp({');
      expect(hydrateAppIndex).toBeLessThan(createAppIndex);
    });
  });
});
