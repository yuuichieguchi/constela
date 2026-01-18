/**
 * Test module for renderIf branch markers.
 *
 * Coverage:
 * - Branch marker output (then, else, none)
 * - Nested if markers
 * - Marker placement (immediately before content)
 *
 * These tests verify that SSR output includes HTML comment markers
 * to enable client-side hydration to detect SSR/client branch mismatches.
 *
 * Expected markers:
 * - <!--if:then--> when condition is true
 * - <!--if:else--> when condition is false with else branch
 * - <!--if:none--> when condition is false without else branch
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from '../renderer.js';
import type { CompiledProgram, CompiledNode } from '@constela/compiler';

describe('renderIf branch markers', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal CompiledProgram for testing
   */
  function createProgram(
    view: CompiledProgram['view'],
    state: CompiledProgram['state'] = {},
    actions: CompiledProgram['actions'] = {}
  ): CompiledProgram {
    return {
      version: '1.0',
      state,
      actions,
      view,
    };
  }

  // ==================== Branch Marker Output ====================

  describe('branch marker output', () => {
    /**
     * Given: An if node with a true condition
     * When: renderIf is called
     * Then: Output should contain <!--if:then--> marker before the content
     */
    it('should output <!--if:then--> when condition is true', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'show' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Visible' } }],
              },
            },
          ],
        },
        {
          show: { type: 'boolean', initial: true },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:then-->');
      expect(html).toContain('<span id="content">Visible</span>');
    });

    /**
     * Given: An if node with a false condition and an else branch
     * When: renderIf is called
     * Then: Output should contain <!--if:else--> marker before the else content
     */
    it('should output <!--if:else--> when condition is false with else', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'show' },
              then: {
                kind: 'element',
                tag: 'span',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Visible' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Hidden' } }],
              },
            },
          ],
        },
        {
          show: { type: 'boolean', initial: false },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:else-->');
      expect(html).toContain('<span>Hidden</span>');
      expect(html).not.toContain('<!--if:then-->');
    });

    /**
     * Given: An if node with a false condition and no else branch
     * When: renderIf is called
     * Then: Output should contain <!--if:none--> marker (empty placeholder)
     */
    it('should output <!--if:none--> when condition is false without else', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'show' },
              then: {
                kind: 'element',
                tag: 'span',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Visible' } }],
              },
            },
          ],
        },
        {
          show: { type: 'boolean', initial: false },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:none-->');
      expect(html).not.toContain('<!--if:then-->');
      expect(html).not.toContain('<!--if:else-->');
    });

    /**
     * Given: An if node with literal true condition
     * When: renderIf is called
     * Then: Output should contain <!--if:then--> marker
     */
    it('should output <!--if:then--> for literal true condition', async () => {
      // Arrange
      const program = createProgram({
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Always visible' } }],
        },
      });

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:then-->');
      expect(html).toContain('<div>Always visible</div>');
    });

    /**
     * Given: An if node with literal false condition
     * When: renderIf is called
     * Then: Output should contain <!--if:none--> marker
     */
    it('should output <!--if:none--> for literal false condition without else', async () => {
      // Arrange
      const program = createProgram({
        kind: 'if',
        condition: { expr: 'lit', value: false },
        then: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Never visible' } }],
        },
      });

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:none-->');
      expect(html).not.toContain('<div>Never visible</div>');
    });
  });

  // ==================== Nested If Markers ====================

  describe('nested if markers', () => {
    /**
     * Given: Nested if nodes with various conditions
     * When: renderIf is called
     * Then: Each if node should output its own branch marker
     */
    it('should output correct markers for nested if nodes', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'outer' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { class: { expr: 'lit', value: 'outer' } },
                children: [
                  {
                    kind: 'if',
                    condition: { expr: 'state', name: 'inner' },
                    then: {
                      kind: 'element',
                      tag: 'span',
                      children: [{ kind: 'text', value: { expr: 'lit', value: 'Inner content' } }],
                    },
                  },
                ],
              },
            },
          ],
        },
        {
          outer: { type: 'boolean', initial: true },
          inner: { type: 'boolean', initial: true },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      // Both outer and inner should have <!--if:then--> markers
      const thenMarkerCount = (html.match(/<!--if:then-->/g) || []).length;
      expect(thenMarkerCount).toBe(2);
      expect(html).toContain('<span>Inner content</span>');
    });

    /**
     * Given: Nested if nodes where outer is true and inner is false (no else)
     * When: renderIf is called
     * Then: Outer should have <!--if:then-->, inner should have <!--if:none-->
     */
    it('should output <!--if:then--> for outer and <!--if:none--> for inner', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'outer' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { class: { expr: 'lit', value: 'outer' } },
                children: [
                  {
                    kind: 'if',
                    condition: { expr: 'state', name: 'inner' },
                    then: {
                      kind: 'element',
                      tag: 'span',
                      children: [{ kind: 'text', value: { expr: 'lit', value: 'Inner content' } }],
                    },
                  },
                ],
              },
            },
          ],
        },
        {
          outer: { type: 'boolean', initial: true },
          inner: { type: 'boolean', initial: false },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:then-->');
      expect(html).toContain('<!--if:none-->');
      expect(html).toContain('<div class="outer">');
    });

    /**
     * Given: Nested if nodes where outer is false
     * When: renderIf is called
     * Then: Only outer should have <!--if:none-->, inner should not be rendered
     */
    it('should output only outer marker when outer condition is false', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'outer' },
              then: {
                kind: 'element',
                tag: 'div',
                children: [
                  {
                    kind: 'if',
                    condition: { expr: 'state', name: 'inner' },
                    then: {
                      kind: 'element',
                      tag: 'span',
                      children: [{ kind: 'text', value: { expr: 'lit', value: 'Inner' } }],
                    },
                  },
                ],
              },
            },
          ],
        },
        {
          outer: { type: 'boolean', initial: false },
          inner: { type: 'boolean', initial: true },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      // Only outer <!--if:none--> should be present
      expect(html).toContain('<!--if:none-->');
      // The inner if node should NOT be rendered at all (not even its marker)
      const noneMarkerCount = (html.match(/<!--if:none-->/g) || []).length;
      expect(noneMarkerCount).toBe(1);
    });
  });

  // ==================== Marker Placement ====================

  describe('marker placement', () => {
    /**
     * Given: An if node with a true condition
     * When: renderIf is called
     * Then: Marker should be immediately before content (no whitespace)
     */
    it('should place marker immediately before content (no whitespace)', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'show' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'target' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Content' } }],
              },
            },
          ],
        },
        {
          show: { type: 'boolean', initial: true },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      // Marker should be immediately followed by <span (no whitespace)
      expect(html).toMatch(/<!--if:then--><span/);
    });

    /**
     * Given: An if node with a false condition and else branch
     * When: renderIf is called
     * Then: Else marker should be immediately before else content
     */
    it('should place else marker immediately before else content', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'show' },
              then: {
                kind: 'element',
                tag: 'span',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Then' } }],
              },
              else: {
                kind: 'element',
                tag: 'em',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Else' } }],
              },
            },
          ],
        },
        {
          show: { type: 'boolean', initial: false },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      // Marker should be immediately followed by <em (no whitespace)
      expect(html).toMatch(/<!--if:else--><em/);
    });

    /**
     * Given: An if node with a false condition and no else branch
     * When: renderIf is called
     * Then: None marker should be the only output (no extra content)
     */
    it('should output only <!--if:none--> when no else branch', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: { expr: 'lit', value: false },
          then: {
            kind: 'element',
            tag: 'div',
          },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toBe('<!--if:none-->');
    });

    /**
     * Given: An if node with text node as then branch
     * When: renderIf is called
     * Then: Marker should be immediately before text content
     */
    it('should place marker immediately before text content', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'if',
          condition: { expr: 'lit', value: true },
          then: {
            kind: 'text',
            value: { expr: 'lit', value: 'Hello World' },
          },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      // Marker should be immediately followed by text (no whitespace)
      expect(html).toBe('<!--if:then-->Hello World');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: Multiple sibling if nodes
     * When: renderToString is called
     * Then: Each if node should have its own marker
     */
    it('should output markers for multiple sibling if nodes', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'first' },
              then: {
                kind: 'element',
                tag: 'span',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'First' } }],
              },
            },
            {
              kind: 'if',
              condition: { expr: 'state', name: 'second' },
              then: {
                kind: 'element',
                tag: 'span',
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Second' } }],
              },
            },
          ],
        },
        {
          first: { type: 'boolean', initial: true },
          second: { type: 'boolean', initial: false },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      expect(html).toContain('<!--if:then-->');
      expect(html).toContain('<!--if:none-->');
      expect(html).toContain('<span>First</span>');
      expect(html).not.toContain('<span>Second</span>');
    });

    /**
     * Given: If node inside each loop
     * When: renderToString is called
     * Then: Each iteration should have its own if marker
     */
    it('should output markers for if nodes inside each loop', async () => {
      // Arrange
      const program = createProgram(
        {
          kind: 'each',
          items: { expr: 'lit', value: [true, false, true] },
          as: 'item',
          body: {
            kind: 'if',
            condition: { expr: 'var', name: 'item' },
            then: {
              kind: 'element',
              tag: 'span',
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Yes' } }],
            },
          },
        }
      );

      // Act
      const html = await renderToString(program);

      // Assert
      // Should have 2 then markers and 1 none marker
      const thenMarkerCount = (html.match(/<!--if:then-->/g) || []).length;
      const noneMarkerCount = (html.match(/<!--if:none-->/g) || []).length;
      expect(thenMarkerCount).toBe(2);
      expect(noneMarkerCount).toBe(1);
    });
  });
});
