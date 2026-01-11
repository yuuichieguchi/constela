/**
 * Test module for SSG onClick event handler serialization.
 *
 * Coverage:
 * - Event handler preservation during normalizeProps transformation
 *   - Should NOT wrap { event, action } handlers in literal expressions
 *   - Should preserve event handlers as-is for SSR skipping
 * - SSG build output validation
 *   - Should NOT output onClick="[object Object]" in generated HTML
 *   - Should properly skip event handler attributes during SSR
 *
 * Bug context:
 * - build/index.ts normalizeProps() incorrectly wraps event handlers
 * - { event: 'click', action: 'increment' } becomes { expr: 'lit', value: { event, action } }
 * - Server renderer's isEventHandler() check fails on wrapped format
 * - Result: onClick="[object Object]" in SSR output
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-event-handler-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Page with onClick event handler
 * This simulates a button with click event that should be handled client-side
 */
const pageWithClickHandler = {
  version: '1.0',
  route: {
    path: '/counter',
  },
  state: {
    count: { initial: 0 },
  },
  actions: [
    {
      name: 'increment',
      body: [{ op: 'set', name: 'count', value: { expr: 'bin', op: '+', left: { expr: 'state', name: 'count' }, right: { expr: 'lit', value: 1 } } }],
    },
  ],
  view: {
    kind: 'element',
    tag: 'div',
    props: {
      class: { expr: 'lit', value: 'counter-container' },
    },
    children: [
      {
        kind: 'element',
        tag: 'button',
        props: {
          // This is the problematic pattern: event handler in { event, action } format
          onClick: { event: 'click', action: 'increment' },
          class: { expr: 'lit', value: 'increment-btn' },
        },
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 'Click me' },
          },
        ],
      },
      {
        kind: 'element',
        tag: 'span',
        props: {
          id: { expr: 'lit', value: 'count-display' },
        },
        children: [
          {
            kind: 'text',
            value: { expr: 'state', name: 'count' },
          },
        ],
      },
    ],
  },
};

/**
 * Page with multiple event handlers including payload
 */
const pageWithMultipleHandlers = {
  version: '1.0',
  route: {
    path: '/multi-handler',
  },
  state: {
    value: { initial: '' },
  },
  actions: [
    {
      name: 'setValue',
      params: ['newValue'],
      body: [{ op: 'set', name: 'value', value: { expr: 'var', name: 'newValue' } }],
    },
    {
      name: 'clear',
      body: [{ op: 'set', name: 'value', value: { expr: 'lit', value: '' } }],
    },
  ],
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [
      {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: { event: 'click', action: 'setValue', payload: { expr: 'lit', value: 'clicked' } },
        },
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Set Value' } }],
      },
      {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: { event: 'click', action: 'clear' },
        },
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Clear' } }],
      },
    ],
  },
};

/**
 * Page with mixed props (regular and event handlers)
 * Tests that regular props are still normalized correctly
 */
const pageWithMixedProps = {
  version: '1.0',
  route: {
    path: '/mixed-props',
  },
  state: {},
  actions: [{ name: 'doSomething', body: [] }],
  view: {
    kind: 'element',
    tag: 'button',
    props: {
      id: { expr: 'lit', value: 'my-button' },
      class: 'button-class', // Raw string value that should be normalized
      'data-testid': { expr: 'lit', value: 'test-btn' },
      disabled: false, // Boolean that should be normalized
      onClick: { event: 'click', action: 'doSomething' },
    },
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Test' } }],
  },
};

// ==================== SSG Event Handler Tests ====================

describe('SSG event handler serialization', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    // Create directories
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== Event Handler Preservation ====================

  describe('event handler preservation in normalizeProps', () => {
    it('should NOT wrap event handlers in literal expressions', async () => {
      // Arrange
      // Import normalizeProps directly to test the function
      // NOTE: This requires exporting normalizeProps from build/index.ts
      const { normalizeProps } = await import('../../src/build/index.js');

      const props = {
        onClick: { event: 'click', action: 'increment' },
        class: { expr: 'lit', value: 'btn' },
      };

      // Act
      const normalized = normalizeProps(props);

      // Assert
      // Event handler should be preserved as-is, NOT wrapped in { expr: 'lit', value: ... }
      expect(normalized.onClick).toEqual({ event: 'click', action: 'increment' });
      expect(normalized.onClick).not.toHaveProperty('expr');
    });

    it('should preserve event handlers with payload', async () => {
      // Arrange
      const { normalizeProps } = await import('../../src/build/index.js');

      const props = {
        onClick: {
          event: 'click',
          action: 'setValue',
          payload: { expr: 'lit', value: 'test' },
        },
      };

      // Act
      const normalized = normalizeProps(props);

      // Assert
      // Event handler with payload should be preserved as-is
      expect(normalized.onClick).toEqual({
        event: 'click',
        action: 'setValue',
        payload: { expr: 'lit', value: 'test' },
      });
    });

    it('should still normalize regular props to literal expressions', async () => {
      // Arrange
      const { normalizeProps } = await import('../../src/build/index.js');

      const props = {
        class: 'button-class',
        id: 'my-id',
      };

      // Act
      const normalized = normalizeProps(props);

      // Assert
      // Regular string values should be wrapped in literal expressions
      expect(normalized.class).toEqual({ expr: 'lit', value: 'button-class' });
      expect(normalized.id).toEqual({ expr: 'lit', value: 'my-id' });
    });
  });

  // ==================== SSG Build Output Validation ====================

  describe('SSG build output validation', () => {
    it('should NOT output [object Object] for onClick attributes', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(routesDir, 'counter.json'),
        JSON.stringify(pageWithClickHandler, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'counter', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The critical assertion: HTML should NOT contain [object Object]
      // This is the bug symptom we're testing against
      expect(htmlContent).not.toContain('[object Object]');
      expect(htmlContent).not.toContain('onClick="[object Object]"');
    });

    it('should skip onClick attribute entirely in SSR output', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(routesDir, 'counter.json'),
        JSON.stringify(pageWithClickHandler, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'counter', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Event handlers should be completely skipped in SSR
      // The button should not have an onClick attribute at all
      expect(htmlContent).not.toMatch(/onClick=/);
      expect(htmlContent).not.toMatch(/onclick=/i);

      // But regular attributes should still be present
      expect(htmlContent).toContain('class="increment-btn"');
    });

    it('should preserve other button attributes while skipping event handlers', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(routesDir, 'mixed-props.json'),
        JSON.stringify(pageWithMixedProps, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'mixed-props', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // Regular attributes should be rendered
      expect(htmlContent).toContain('id="my-button"');
      expect(htmlContent).toContain('class="button-class"');
      expect(htmlContent).toContain('data-testid="test-btn"');

      // Event handler should NOT be rendered (and definitely not as [object Object])
      expect(htmlContent).not.toContain('[object Object]');
      expect(htmlContent).not.toMatch(/onClick=/i);
    });

    it('should handle multiple event handlers on different elements', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(routesDir, 'multi-handler.json'),
        JSON.stringify(pageWithMultipleHandlers, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'multi-handler', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // No [object Object] anywhere in the output
      expect(htmlContent).not.toContain('[object Object]');

      // Count button elements - should have 2 buttons
      const buttonMatches = htmlContent.match(/<button[^>]*>/g);
      expect(buttonMatches).toHaveLength(2);

      // Neither button should have onClick attribute in SSR output
      expect(htmlContent).not.toMatch(/onClick=/i);
    });
  });

  // ==================== Event Handler Format Detection ====================

  describe('event handler format detection', () => {
    it('should recognize { event, action } format as event handler', async () => {
      // This tests that the normalizeProps function correctly identifies
      // the event handler format and does not treat it as a regular object

      const { normalizeProps } = await import('../../src/build/index.js');

      // Various event handler formats that should be preserved
      const testCases = [
        { event: 'click', action: 'increment' },
        { event: 'submit', action: 'handleSubmit' },
        { event: 'change', action: 'onChange', payload: { expr: 'var', name: 'event' } },
        { event: 'keydown', action: 'handleKey' },
      ];

      for (const handler of testCases) {
        const props = { onEvent: handler };
        const normalized = normalizeProps(props);

        // Each event handler should be preserved exactly as-is
        expect(normalized.onEvent).toEqual(handler);
        expect(normalized.onEvent).not.toHaveProperty('expr', 'lit');
      }
    });

    it('should NOT confuse regular objects with event property for event handlers', async () => {
      // Objects that have 'event' property but are not event handlers
      // should still be normalized to literal expressions

      const { normalizeProps } = await import('../../src/build/index.js');

      // This is NOT an event handler - it's just data that happens to have 'event' key
      const props = {
        data: { event: 'some-event-name', count: 5 }, // Missing 'action' key
      };

      const normalized = normalizeProps(props);

      // Since this doesn't have 'action', it should be treated as a regular value
      // and wrapped in a literal expression
      expect(normalized.data).toEqual({
        expr: 'lit',
        value: { event: 'some-event-name', count: 5 },
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle props with null onClick value', async () => {
      const { normalizeProps } = await import('../../src/build/index.js');

      const props = {
        onClick: null,
        class: 'btn',
      };

      const normalized = normalizeProps(props);

      // null should be filtered out
      expect(normalized).not.toHaveProperty('onClick');
      expect(normalized.class).toEqual({ expr: 'lit', value: 'btn' });
    });

    it('should handle props with undefined onClick value', async () => {
      const { normalizeProps } = await import('../../src/build/index.js');

      const props = {
        onClick: undefined,
        class: 'btn',
      };

      const normalized = normalizeProps(props);

      // undefined should be filtered out
      expect(normalized).not.toHaveProperty('onClick');
    });

    it('should handle empty props object', async () => {
      const { normalizeProps } = await import('../../src/build/index.js');

      const normalized = normalizeProps({});

      expect(normalized).toEqual({});
    });

    it('should handle props that already have expr format with event handler inside', async () => {
      // This shouldn't happen in practice, but test defensive behavior
      const { normalizeProps } = await import('../../src/build/index.js');

      const props = {
        onClick: { expr: 'lit', value: { event: 'click', action: 'test' } },
      };

      const normalized = normalizeProps(props);

      // Already in expr format, should be kept as-is
      // (though this is the buggy pattern we want to prevent from being created)
      expect(normalized.onClick).toEqual({
        expr: 'lit',
        value: { event: 'click', action: 'test' },
      });
    });
  });
});
