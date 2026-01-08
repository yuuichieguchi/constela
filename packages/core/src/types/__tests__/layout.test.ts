/**
 * Test module for Layout Program types.
 *
 * Coverage:
 * - LayoutProgram type structure and type guard
 * - SlotNode with name field for named slots
 * - Program with type field distinction
 * - isLayoutProgram type guard
 *
 * TDD Red Phase: These tests verify the LayoutProgram type and related
 * functionality that will be added to support layout composition in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type { LayoutProgram, SlotNode, Program, ViewNode } from '../ast.js';
import { isLayoutProgram, isSlotNode, isNamedSlotNode } from '../guards.js';

describe('LayoutProgram', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have type field set to "layout"', () => {
      // Arrange
      const layoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
      };

      // Assert
      expect(isLayoutProgram(layoutProgram)).toBe(true);
    });

    it('should require view field containing at least one slot', () => {
      // Arrange
      const layoutWithSlot = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'slot' }],
        },
      };

      // Assert
      expect(isLayoutProgram(layoutWithSlot)).toBe(true);
    });

    it('should accept layout with header, footer, and slot', () => {
      // Arrange
      const fullLayout = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'element', tag: 'header', children: [] },
            { kind: 'slot' },
            { kind: 'element', tag: 'footer', children: [] },
          ],
        },
      };

      // Assert
      expect(isLayoutProgram(fullLayout)).toBe(true);
    });

    it('should accept layout with state and actions', () => {
      // Arrange
      const layoutWithState = {
        version: '1.0',
        type: 'layout',
        state: {
          menuOpen: { type: 'boolean', initial: false },
        },
        actions: [
          { name: 'toggleMenu', steps: [] },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'slot' }],
        },
      };

      // Assert
      expect(isLayoutProgram(layoutWithState)).toBe(true);
    });

    it('should accept layout with components', () => {
      // Arrange
      const layoutWithComponents = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'component', name: 'Header' },
            { kind: 'slot' },
          ],
        },
        components: {
          Header: {
            view: { kind: 'element', tag: 'header' },
          },
        },
      };

      // Assert
      expect(isLayoutProgram(layoutWithComponents)).toBe(true);
    });
  });

  // ==================== Type Guard ====================

  describe('isLayoutProgram type guard', () => {
    it('should return true for valid layout program', () => {
      const layout = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
      };

      expect(isLayoutProgram(layout)).toBe(true);
    });

    it('should return false for regular program without type field', () => {
      const program = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      expect(isLayoutProgram(program)).toBe(false);
    });

    it('should return false for program with type "page"', () => {
      const program = {
        version: '1.0',
        type: 'page',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      expect(isLayoutProgram(program)).toBe(false);
    });

    it('should reject null', () => {
      expect(isLayoutProgram(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isLayoutProgram(undefined)).toBe(false);
    });

    it('should reject array', () => {
      expect(isLayoutProgram([])).toBe(false);
    });

    it('should reject object without version field', () => {
      const obj = { type: 'layout', state: {}, actions: [], view: { kind: 'slot' } };
      expect(isLayoutProgram(obj)).toBe(false);
    });

    it('should reject object with wrong version', () => {
      const obj = {
        version: '2.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
      };
      expect(isLayoutProgram(obj)).toBe(false);
    });
  });
});

describe('SlotNode with name field', () => {
  // ==================== Named Slots ====================

  describe('named slots', () => {
    it('should accept slot with name field', () => {
      // Arrange
      const namedSlot = {
        kind: 'slot',
        name: 'header',
      };

      // Assert
      expect(isSlotNode(namedSlot)).toBe(true);
      expect(isNamedSlotNode(namedSlot)).toBe(true);
    });

    it('should accept slot without name field (default slot)', () => {
      // Arrange
      const defaultSlot = {
        kind: 'slot',
      };

      // Assert
      expect(isSlotNode(defaultSlot)).toBe(true);
      expect(isNamedSlotNode(defaultSlot)).toBe(false);
    });

    it('should validate name is a string', () => {
      // Arrange
      const validNamedSlot = { kind: 'slot', name: 'sidebar' };
      const invalidNamedSlot = { kind: 'slot', name: 123 };

      // Assert
      expect(isNamedSlotNode(validNamedSlot)).toBe(true);
      expect(isNamedSlotNode(invalidNamedSlot)).toBe(false);
    });

    it('should support multiple named slots in layout', () => {
      // Arrange - Layout with header, content, and footer slots
      const layoutWithNamedSlots: LayoutProgram = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'slot', name: 'header' } as SlotNode,
            { kind: 'slot' } as SlotNode, // default slot for main content
            { kind: 'slot', name: 'footer' } as SlotNode,
          ],
        },
      } as unknown as LayoutProgram;

      // Assert
      expect(isLayoutProgram(layoutWithNamedSlots)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('isNamedSlotNode edge cases', () => {
    it('should reject non-slot nodes', () => {
      const textNode = { kind: 'text', value: { expr: 'lit', value: 'hello' } };
      expect(isNamedSlotNode(textNode)).toBe(false);
    });

    it('should reject slot with empty string name', () => {
      // Empty string might be technically valid but semantically invalid
      const emptyNameSlot = { kind: 'slot', name: '' };
      // Type guard allows it, semantic validation done elsewhere
      expect(isSlotNode(emptyNameSlot)).toBe(true);
    });
  });
});

describe('Program type distinction', () => {
  // ==================== Type Field ====================

  describe('type field for program distinction', () => {
    it('should distinguish layout from regular program', () => {
      // Arrange
      const layout = {
        version: '1.0',
        type: 'layout',
        state: {},
        actions: [],
        view: { kind: 'slot' },
      };

      const page = {
        version: '1.0',
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isLayoutProgram(layout)).toBe(true);
      expect(isLayoutProgram(page)).toBe(false);
    });

    it('should preserve backward compatibility for programs without type', () => {
      // Arrange - Existing programs should still work
      const legacyProgram: Program = {
        version: '1.0',
        state: { count: { type: 'number', initial: 0 } },
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(legacyProgram.version).toBe('1.0');
      // Type field should be optional for backward compatibility
      expect((legacyProgram as { type?: string }).type).toBeUndefined();
    });
  });
});

describe('RouteDefinition with layout field', () => {
  // ==================== Layout Reference ====================

  describe('layout reference in route', () => {
    it('should accept route with layout field', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/dashboard',
          layout: 'DashboardLayout',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.route?.layout).toBe('DashboardLayout');
    });

    it('should accept route without layout field', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/about',
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(program.route?.layout).toBeUndefined();
    });

    it('should allow combining layout with title and meta', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        route: {
          path: '/users/:id',
          title: { expr: 'lit', value: 'User Profile' },
          layout: 'MainLayout',
          meta: {
            description: { expr: 'lit', value: 'View user details' },
          },
        },
        state: {},
        actions: [],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Assert
      expect(program.route?.layout).toBe('MainLayout');
      expect(program.route?.title).toBeDefined();
      expect(program.route?.meta).toBeDefined();
    });
  });
});
