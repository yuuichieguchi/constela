/**
 * Test suite for Alert component
 *
 * @constela/ui Alert component tests following TDD methodology.
 * These tests verify the Alert component structure, params, styles, and accessibility.
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

describe('Alert Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('alert');
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

    it('should have role="alert" attribute', () => {
      expect(hasRole(ctx.component.view, 'alert')).toBe(true);
    });

    it('should contain a slot for alert content', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'alertStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['variant', 'title'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: variant', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'variant')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'variant', 'string')).toBe(true);
      });
    });

    describe('param: title', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'title')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'title', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const alertStyles = ctx.styles['alertStyles'];
      expect(alertStyles).toBeDefined();
      assertValidStylePreset(alertStyles);
    });

    it('should have base classes', () => {
      const alertStyles = ctx.styles['alertStyles'];
      expect(alertStyles.base).toBeDefined();
      expect(typeof alertStyles.base).toBe('string');
      expect(alertStyles.base.length).toBeGreaterThan(0);
    });

    describe('variant options', () => {
      const variantOptions = ['default', 'destructive'];

      it('should have variant variants', () => {
        const alertStyles = ctx.styles['alertStyles'];
        expect(hasVariants(alertStyles, ['variant'])).toBe(true);
      });

      it.each(variantOptions)('should have %s variant option', (option) => {
        const alertStyles = ctx.styles['alertStyles'];
        expect(hasVariantOptions(alertStyles, 'variant', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default variant set to default', () => {
        const alertStyles = ctx.styles['alertStyles'];
        expect(hasDefaultVariants(alertStyles, { variant: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      const role = findPropInView(ctx.component.view, 'role');
      expect(role).not.toBeNull();
      expect(role).toMatchObject({
        expr: 'lit',
        value: 'alert',
      });
    });

    it('should have aria-live="assertive" for important alerts', () => {
      const ariaLive = findPropInView(ctx.component.view, 'aria-live');
      expect(ariaLive).not.toBeNull();
      expect(ariaLive).toMatchObject({
        expr: 'lit',
        value: 'assertive',
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass variant to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        variants: expect.objectContaining({
          variant: expect.objectContaining({ expr: 'param', name: 'variant' }),
        }),
      });
    });
  });
});
