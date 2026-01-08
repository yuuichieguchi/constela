/**
 * Test module for Layout Program analysis.
 *
 * Coverage:
 * - Layout programs require at least one slot node
 * - Error when layout is missing slot
 * - Named slot validation
 * - Duplicate named slot detection
 * - Layout with state/actions validation
 *
 * TDD Red Phase: These tests verify the semantic analysis of layout programs
 * that will be added to support layout composition in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import { analyzeLayoutPass } from '../analyze-layout.js';
import type { Program, LayoutProgram } from '@constela/core';

describe('analyzeLayoutPass', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal LayoutProgram for testing
   */
  function createLayoutProgram(view: unknown): LayoutProgram {
    return {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view,
    } as unknown as LayoutProgram;
  }

  // ==================== Slot Requirement ====================

  describe('slot requirement', () => {
    it('should accept layout with slot as root view', () => {
      // Arrange
      const layout = createLayoutProgram({ kind: 'slot' });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept layout with slot in element children', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'header' },
          { kind: 'slot' },
          { kind: 'element', tag: 'footer' },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept layout with slot in nested element', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'main',
            children: [{ kind: 'slot' }],
          },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject layout without any slot', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'header' },
          { kind: 'element', tag: 'footer' },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('LAYOUT_MISSING_SLOT');
      }
    });

    it('should reject layout with only text nodes', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('LAYOUT_MISSING_SLOT');
      }
    });

    it('should provide meaningful error message for missing slot', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.message).toContain('slot');
      }
    });
  });

  // ==================== Named Slot Validation ====================

  describe('named slot validation', () => {
    it('should accept layout with named slot', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot' }, // default slot
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept layout with multiple named slots', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot', name: 'sidebar' },
          { kind: 'slot' }, // default slot
          { kind: 'slot', name: 'footer' },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject layout with duplicate named slots', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot', name: 'header' }, // duplicate!
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('DUPLICATE_SLOT_NAME');
      }
    });

    it('should reject layout with multiple default slots', () => {
      // Arrange - Multiple unnamed slots should be an error
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot' }, // default slot 1
          { kind: 'slot' }, // default slot 2 - duplicate!
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('DUPLICATE_DEFAULT_SLOT');
      }
    });

    it('should provide error path for duplicate slots', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'sidebar' },
          {
            kind: 'element',
            tag: 'main',
            children: [
              { kind: 'slot', name: 'sidebar' }, // duplicate in nested element
            ],
          },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/view');
      }
    });
  });

  // ==================== Slot in Conditional/Loop ====================

  describe('slot in conditional and loop', () => {
    it('should accept slot inside if node', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'if',
            condition: { expr: 'lit', value: true },
            then: { kind: 'slot' },
          },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should warn about slot inside each loop', () => {
      // Arrange - Slot in loop might render multiple times, which could be an issue
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'each',
            items: { expr: 'lit', value: [1, 2, 3] },
            as: 'item',
            body: { kind: 'slot' },
          },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      // This might be a warning rather than error, depending on design decision
      // For now, we'll treat it as an error
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('SLOT_IN_LOOP');
      }
    });

    it('should accept slot in else branch of if node', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'if',
            condition: { expr: 'lit', value: false },
            then: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
            else: { kind: 'slot' },
          },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Layout State and Actions ====================

  describe('layout state and actions', () => {
    it('should validate state references in layout', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {
          menuOpen: { type: 'boolean', initial: false },
        },
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'menuOpen' },
              then: { kind: 'element', tag: 'nav' },
            },
            { kind: 'slot' },
          ],
        },
      } as unknown as LayoutProgram;

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined state reference in layout', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'undefinedState' }, // Error!
              then: { kind: 'element', tag: 'nav' },
            },
            { kind: 'slot' },
          ],
        },
      } as unknown as LayoutProgram;

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should validate action references in layout', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {
          menuOpen: { type: 'boolean', initial: false },
        },
        actions: [
          {
            name: 'toggleMenu',
            steps: [
              { do: 'update', target: 'menuOpen', operation: 'toggle' },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                onClick: { event: 'click', action: 'toggleMenu' },
              },
            },
            { kind: 'slot' },
          ],
        },
      } as unknown as LayoutProgram;

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject undefined action reference in layout', () => {
      // Arrange
      const layout: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                onClick: { event: 'click', action: 'undefinedAction' }, // Error!
              },
            },
            { kind: 'slot' },
          ],
        },
      } as unknown as LayoutProgram;

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
      }
    });
  });

  // ==================== Context Output ====================

  describe('analysis context output', () => {
    it('should include slot names in analysis context', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot' },
          { kind: 'slot', name: 'footer' },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      if (result.ok) {
        expect(result.context.slotNames.has('header')).toBe(true);
        expect(result.context.slotNames.has('footer')).toBe(true);
        expect(result.context.hasDefaultSlot).toBe(true);
      }
    });

    it('should indicate when layout has no default slot', () => {
      // Arrange
      const layout = createLayoutProgram({
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'slot', name: 'header' },
          { kind: 'slot', name: 'content' },
        ],
      });

      // Act
      const result = analyzeLayoutPass(layout);

      // Assert
      if (result.ok) {
        expect(result.context.hasDefaultSlot).toBe(false);
      }
    });
  });
});

describe('analyzePass integration with layouts', () => {
  it('should skip slot validation outside component when in layout', () => {
    // Arrange - In a layout, slots are allowed at top level
    const layout: LayoutProgram = {
      version: '1.0',
      type: 'layout',
      state: {},
      actions: [],
      view: { kind: 'slot' },
    } as unknown as LayoutProgram;

    // Act
    const result = analyzePass(layout as unknown as Program);

    // Assert
    // The standard analyzePass should recognize this is a layout
    // and not throw "slot only allowed in component" error
    expect(result.ok).toBe(true);
  });
});
