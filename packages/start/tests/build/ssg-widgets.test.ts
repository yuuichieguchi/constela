/**
 * Test module for SSG widget mounting support.
 *
 * Coverage:
 * - Widget mounting code generation in SSG builds
 *   - Static pages with widgets should generate createApp imports
 *   - Static pages without widgets should only include hydrateApp
 *   - Widget program should be serialized and mounted
 *   - Multiple widgets should all be mounted
 *
 * Bug context:
 * - In dev server (server.ts:391), widgets are passed to generateHydrationScript
 * - In SSG build (build/index.ts:769), widgets are always passed as undefined
 * - This causes widgets (like counter demos) to not render in SSG builds
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CompiledProgram } from '@constela/compiler';
import type { WidgetConfig } from '../../src/runtime/entry-server.js';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-widgets-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Counter widget JSON (uses correct format matching existing fixtures)
 */
const counterWidgetJson = {
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 },
  },
  actions: [
    {
      name: 'increment',
      steps: [
        {
          do: 'update',
          target: 'count',
          value: {
            expr: 'bin',
            op: '+',
            left: { expr: 'state', name: 'count' },
            right: { expr: 'lit', value: 1 },
          },
        },
      ],
    },
  ],
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'counter-widget' } },
    children: [
      {
        kind: 'element',
        tag: 'span',
        children: [{ kind: 'text', value: { expr: 'state', name: 'count' } }],
      },
      {
        kind: 'element',
        tag: 'button',
        props: { 'on:click': { action: 'increment' } },
        children: [{ kind: 'text', value: { expr: 'lit', value: '+' } }],
      },
    ],
  },
};

/**
 * Timer widget JSON for multi-widget tests
 */
const timerWidgetJson = {
  version: '1.0',
  state: {
    elapsed: { type: 'number', initial: 0 },
  },
  actions: [],
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'timer-widget' } },
    children: [{ kind: 'text', value: { expr: 'state', name: 'elapsed' } }],
  },
};

/**
 * Counter widget CompiledProgram for generateHydrationScript tests
 */
const counterWidgetProgram: CompiledProgram = {
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 },
  },
  actions: {
    increment: {
      params: [],
      body: [
        {
          kind: 'set',
          target: 'count',
          value: {
            expr: 'binop',
            op: '+',
            left: { expr: 'var', name: 'count' },
            right: { expr: 'lit', value: 1 },
          },
        },
      ],
    },
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'counter-widget' } },
    children: [
      {
        kind: 'element',
        tag: 'span',
        props: {},
        children: [{ kind: 'text', value: { expr: 'var', name: 'count' } }],
      },
      {
        kind: 'element',
        tag: 'button',
        props: { '@click': { expr: 'action', name: 'increment' } },
        children: [{ kind: 'text', value: { expr: 'lit', value: '+' } }],
      },
    ],
  },
};

/**
 * Timer widget CompiledProgram for generateHydrationScript tests
 */
const timerWidgetProgram: CompiledProgram = {
  version: '1.0',
  state: {
    elapsed: { type: 'number', initial: 0 },
  },
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'timer-widget' } },
    children: [{ kind: 'text', value: { expr: 'var', name: 'elapsed' } }],
  },
};

// ==================== generateHydrationScript Tests ====================
// These tests verify generateHydrationScript works correctly with widgets.
// The bug is that build/index.ts doesn't pass widgets to this function.

describe('generateHydrationScript widget support', () => {
  describe('when widgets are provided', () => {
    it('should include createApp import', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      };

      const widgets: WidgetConfig[] = [
        { id: 'counter-preview', program: counterWidgetProgram },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      expect(script).toContain(
        "import { hydrateApp, createApp } from '@constela/runtime'"
      );
    });

    it('should serialize widget program as widgetProgram_<id>', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      const widgets: WidgetConfig[] = [
        { id: 'my-counter', program: counterWidgetProgram },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      expect(script).toContain('widgetProgram_my_counter');
      // Widget state should be serialized
      expect(script).toContain('"count"');
    });

    it('should include getElementById call for widget container', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      const widgets: WidgetConfig[] = [
        { id: 'widget-container', program: counterWidgetProgram },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      expect(script).toContain("document.getElementById('widget-container')");
    });

    it('should include createApp call with positional parameters', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      const widgets: WidgetConfig[] = [
        { id: 'test-widget', program: counterWidgetProgram },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      expect(script).toContain(
        'createApp(widgetProgram_test_widget, container_test_widget)'
      );
    });

    it('should mount multiple widgets when multiple widgets are provided', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      const widgets: WidgetConfig[] = [
        { id: 'counter-demo', program: counterWidgetProgram },
        { id: 'timer-demo', program: timerWidgetProgram },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      expect(script).toContain('widgetProgram_counter_demo');
      expect(script).toContain('widgetProgram_timer_demo');
      expect(script).toContain("document.getElementById('counter-demo')");
      expect(script).toContain("document.getElementById('timer-demo')");
      expect(script).toContain(
        'createApp(widgetProgram_counter_demo, container_counter_demo)'
      );
      expect(script).toContain(
        'createApp(widgetProgram_timer_demo, container_timer_demo)'
      );
    });
  });

  describe('when widgets are NOT provided (undefined)', () => {
    it('should NOT include createApp import', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      // Act
      const script = generateHydrationScript(mainProgram, undefined);

      // Assert
      expect(script).toContain(
        "import { hydrateApp } from '@constela/runtime'"
      );
      expect(script).not.toContain('createApp');
    });

    it('should NOT include widgetProgram declarations', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      // Act
      const script = generateHydrationScript(mainProgram, undefined);

      // Assert
      expect(script).not.toContain('widgetProgram_');
    });
  });

  describe('when widgets array is empty', () => {
    it('should NOT include createApp import', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      // Act
      const script = generateHydrationScript(mainProgram, []);

      // Assert
      expect(script).toContain(
        "import { hydrateApp } from '@constela/runtime'"
      );
      expect(script).not.toContain('createApp');
    });
  });

  describe('edge cases', () => {
    it('should handle widget IDs with special characters (hyphens, numbers)', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      const widgets: WidgetConfig[] = [
        { id: 'counter-demo-123', program: counterWidgetProgram },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      // JS identifier should have hyphens converted to underscores
      expect(script).toContain('widgetProgram_counter_demo_123');
      expect(script).toContain('container_counter_demo_123');
      // DOM query should use the original ID
      expect(script).toContain("document.getElementById('counter-demo-123')");
    });

    it('should serialize widget state and actions correctly', async () => {
      // Arrange
      const { generateHydrationScript } = await import(
        '../../src/runtime/entry-server.js'
      );

      const mainProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: { kind: 'element', tag: 'div', props: {}, children: [] },
      };

      const complexWidget: CompiledProgram = {
        version: '1.0',
        state: {
          items: { type: 'array', initial: [] },
          selectedIndex: { type: 'number', initial: -1 },
          isLoading: { type: 'boolean', initial: false },
        },
        actions: {
          addItem: { params: ['item'], body: [] },
          selectItem: { params: ['index'], body: [] },
        },
        view: { kind: 'element', tag: 'ul', props: {}, children: [] },
      };

      const widgets: WidgetConfig[] = [
        { id: 'complex-list', program: complexWidget },
      ];

      // Act
      const script = generateHydrationScript(mainProgram, widgets);

      // Assert
      expect(script).toContain('items');
      expect(script).toContain('selectedIndex');
      expect(script).toContain('isLoading');
      expect(script).toContain('addItem');
      expect(script).toContain('selectItem');
    });
  });
});

// ==================== SSG Build Integration Tests ====================
// These tests verify that the SSG build correctly passes widgets to generateHydrationScript.
// This is where the bug exists - widgets are not passed.

describe('SSG build widget mounting', () => {
  let tempDir: string;
  let routesDir: string;
  let widgetsDir: string;
  let outDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    routesDir = join(tempDir, 'routes');
    widgetsDir = join(tempDir, 'widgets');
    outDir = join(tempDir, 'dist');
    await mkdir(routesDir, { recursive: true });
    await mkdir(widgetsDir, { recursive: true });
    await mkdir(outDir, { recursive: true });
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('static page with widgets', () => {
    it('should include createApp import when page has widgets', async () => {
      // Arrange
      // Create a widget JSON file in the widgets directory
      await writeFile(
        join(widgetsDir, 'counter.json'),
        JSON.stringify(counterWidgetJson),
        'utf-8'
      );

      // Create a JSON page that references the widget
      const jsonPageContent = {
        version: '1.0',
        route: { path: '/' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'main',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Page with Widget' } },
            {
              kind: 'element',
              tag: 'div',
              props: { id: { expr: 'lit', value: 'counter-preview' } },
              children: [],
            },
          ],
        },
        widgets: [
          {
            id: 'counter-preview',
            src: '../widgets/counter.json',
          },
        ],
      };

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(jsonPageContent),
        'utf-8'
      );

      // Act
      const { build } = await import('../../src/build/index.js');
      await build({
        routesDir,
        outDir,
      });

      // Assert
      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      // BUG: Currently this will FAIL because widgets are not passed to generateHydrationScript
      expect(html).toContain('import { hydrateApp, createApp } from');
    });

    it('should include widget program data in hydration script', async () => {
      // Arrange
      await writeFile(
        join(widgetsDir, 'counter.json'),
        JSON.stringify(counterWidgetJson),
        'utf-8'
      );

      const jsonPageContent = {
        version: '1.0',
        route: { path: '/' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'article',
          children: [
            {
              kind: 'element',
              tag: 'div',
              props: { id: { expr: 'lit', value: 'my-counter' } },
              children: [],
            },
          ],
        },
        widgets: [
          {
            id: 'my-counter',
            src: '../widgets/counter.json',
          },
        ],
      };

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(jsonPageContent),
        'utf-8'
      );

      // Act
      const { build } = await import('../../src/build/index.js');
      await build({ routesDir, outDir });

      // Assert
      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      // BUG: These will FAIL because widgets are not serialized
      expect(html).toContain('widgetProgram_my_counter');
    });

    it('should include widget mounting code with document.getElementById', async () => {
      // Arrange
      await writeFile(
        join(widgetsDir, 'counter.json'),
        JSON.stringify(counterWidgetJson),
        'utf-8'
      );

      const jsonPageContent = {
        version: '1.0',
        route: { path: '/' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'div',
              props: { id: { expr: 'lit', value: 'widget-container' } },
              children: [],
            },
          ],
        },
        widgets: [
          {
            id: 'widget-container',
            src: '../widgets/counter.json',
          },
        ],
      };

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(jsonPageContent),
        'utf-8'
      );

      // Act
      const { build } = await import('../../src/build/index.js');
      await build({ routesDir, outDir });

      // Assert
      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      // BUG: These will FAIL because widget mounting code is not generated
      expect(html).toContain("document.getElementById('widget-container')");
      expect(html).toContain(
        'createApp(widgetProgram_widget_container, container_widget_container)'
      );
    });

    it('should mount multiple widgets when page has multiple widgets', async () => {
      // Arrange
      await writeFile(
        join(widgetsDir, 'counter.json'),
        JSON.stringify(counterWidgetJson),
        'utf-8'
      );
      await writeFile(
        join(widgetsDir, 'timer.json'),
        JSON.stringify(timerWidgetJson),
        'utf-8'
      );

      const jsonPageContent = {
        version: '1.0',
        route: { path: '/' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'div',
              props: { id: { expr: 'lit', value: 'counter-demo' } },
              children: [],
            },
            {
              kind: 'element',
              tag: 'div',
              props: { id: { expr: 'lit', value: 'timer-demo' } },
              children: [],
            },
          ],
        },
        widgets: [
          { id: 'counter-demo', src: '../widgets/counter.json' },
          { id: 'timer-demo', src: '../widgets/timer.json' },
        ],
      };

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(jsonPageContent),
        'utf-8'
      );

      // Act
      const { build } = await import('../../src/build/index.js');
      await build({ routesDir, outDir });

      // Assert
      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      // BUG: All widget-related assertions will FAIL
      expect(html).toContain('widgetProgram_counter_demo');
      expect(html).toContain('widgetProgram_timer_demo');
      expect(html).toContain("document.getElementById('counter-demo')");
      expect(html).toContain("document.getElementById('timer-demo')");
    });
  });

  describe('static page without widgets', () => {
    it('should NOT include createApp import when page has no widgets', async () => {
      // Arrange
      const jsonPageContent = {
        version: '1.0',
        route: { path: '/' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'No widgets here' } },
          ],
        },
        // No widgets array
      };

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(jsonPageContent),
        'utf-8'
      );

      // Act
      const { build } = await import('../../src/build/index.js');
      await build({ routesDir, outDir });

      // Assert
      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      // This should PASS (no widgets case works correctly)
      expect(html).toContain('import { hydrateApp } from');
      expect(html).not.toContain('createApp');
    });

    it('should NOT include createApp when widgets array is empty', async () => {
      // Arrange
      const jsonPageContent = {
        version: '1.0',
        route: { path: '/' },
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'text',
              value: { expr: 'lit', value: 'Empty widgets array' },
            },
          ],
        },
        widgets: [], // Empty array
      };

      await writeFile(
        join(routesDir, 'index.json'),
        JSON.stringify(jsonPageContent),
        'utf-8'
      );

      // Act
      const { build } = await import('../../src/build/index.js');
      await build({ routesDir, outDir });

      // Assert
      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      expect(html).toContain('import { hydrateApp } from');
      expect(html).not.toContain('createApp');
    });
  });

  // NOTE: Dynamic page with widgets test is skipped for now.
  // The bug being tested (widgets not passed to generateHydrationScript) affects
  // both static and dynamic pages equally. The static page tests are sufficient
  // to verify the fix. Dynamic routes require complex data source setup.
});
