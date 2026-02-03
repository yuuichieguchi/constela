/**
 * Test suite for Popover component
 *
 * @constela/ui Popover component tests following TDD methodology.
 * These tests verify the Popover component structure, params, styles, and slots.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation (open, position)
 * - Style preset validation (base, position variants, default variants)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadComponentForTesting,
  assertValidComponent,
  assertValidStylePreset,
  hasParams,
  isOptionalParam,
  hasParamType,
  getRootTag,
  hasVariants,
  hasVariantOptions,
  hasDefaultVariants,
  hasSlot,
  findPropInView,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Popover Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('popover');
  });

  // ==================== Component Structure Tests ====================

  describe('Component Structure', () => {
    it('should have valid component structure', () => {
      assertValidComponent(ctx.component);
    });

    it('should have div as root element', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('div');
    });

    it('should contain a slot for popover content', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with preset popoverStyles', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'popoverStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['open', 'position'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: open', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'open')).toBe(true);
      });

      it('should have type boolean', () => {
        expect(hasParamType(ctx.component, 'open', 'boolean')).toBe(true);
      });
    });

    describe('param: position', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'position')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'position', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const popoverStyles = ctx.styles['popoverStyles'];
      expect(popoverStyles).toBeDefined();
      assertValidStylePreset(popoverStyles);
    });

    it('should have base classes for common popover styles', () => {
      const popoverStyles = ctx.styles['popoverStyles'];
      expect(popoverStyles.base).toBeDefined();
      expect(typeof popoverStyles.base).toBe('string');
      expect(popoverStyles.base.length).toBeGreaterThan(0);
    });

    it('should include absolute positioning in base styles', () => {
      const popoverStyles = ctx.styles['popoverStyles'];
      expect(popoverStyles.base).toContain('absolute');
    });

    it('should include z-index in base styles', () => {
      const popoverStyles = ctx.styles['popoverStyles'];
      expect(popoverStyles.base).toMatch(/z-\d+/);
    });

    it('should include rounded corners in base styles', () => {
      const popoverStyles = ctx.styles['popoverStyles'];
      expect(popoverStyles.base).toMatch(/rounded/);
    });

    it('should include shadow in base styles', () => {
      const popoverStyles = ctx.styles['popoverStyles'];
      expect(popoverStyles.base).toMatch(/shadow/);
    });

    describe('position variants', () => {
      const positionOptions = ['top', 'right', 'bottom', 'left'];

      it('should have position variants', () => {
        const popoverStyles = ctx.styles['popoverStyles'];
        expect(hasVariants(popoverStyles, ['position'])).toBe(true);
      });

      it.each(positionOptions)('should have %s position option', (option) => {
        const popoverStyles = ctx.styles['popoverStyles'];
        expect(hasVariantOptions(popoverStyles, 'position', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default position set to bottom', () => {
        const popoverStyles = ctx.styles['popoverStyles'];
        expect(hasDefaultVariants(popoverStyles, { position: 'bottom' })).toBe(true);
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass position to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        variants: expect.objectContaining({
          position: expect.objectContaining({ expr: 'param', name: 'position' }),
        }),
      });
    });
  });
});
