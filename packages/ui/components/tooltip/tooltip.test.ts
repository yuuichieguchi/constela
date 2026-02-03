/**
 * Test suite for Tooltip component
 *
 * @constela/ui Tooltip component tests following TDD methodology.
 * These tests verify the Tooltip component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
 * - Accessibility attributes
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
  hasRole,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Tooltip Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('tooltip');
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

    it('should have role="tooltip" attribute', () => {
      expect(hasRole(ctx.component.view, 'tooltip')).toBe(true);
    });

    it('should contain a slot for trigger element', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with preset tooltipStyles', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'tooltipStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['content', 'position'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: content', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'content')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'content', 'string')).toBe(true);
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
      const tooltipStyles = ctx.styles['tooltipStyles'];
      expect(tooltipStyles).toBeDefined();
      assertValidStylePreset(tooltipStyles);
    });

    it('should have base classes for common tooltip styles', () => {
      const tooltipStyles = ctx.styles['tooltipStyles'];
      expect(tooltipStyles.base).toBeDefined();
      expect(typeof tooltipStyles.base).toBe('string');
      expect(tooltipStyles.base.length).toBeGreaterThan(0);
    });

    describe('position variants', () => {
      const positionOptions = ['top', 'right', 'bottom', 'left'];

      it('should have position variants', () => {
        const tooltipStyles = ctx.styles['tooltipStyles'];
        expect(hasVariants(tooltipStyles, ['position'])).toBe(true);
      });

      it.each(positionOptions)('should have %s position option', (option) => {
        const tooltipStyles = ctx.styles['tooltipStyles'];
        expect(hasVariantOptions(tooltipStyles, 'position', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default position set to top', () => {
        const tooltipStyles = ctx.styles['tooltipStyles'];
        expect(hasDefaultVariants(tooltipStyles, { position: 'top' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have role="tooltip" for screen readers', () => {
      const role = findPropInView(ctx.component.view, 'role');
      expect(role).not.toBeNull();
      expect(role).toMatchObject({
        expr: 'lit',
        value: 'tooltip',
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
