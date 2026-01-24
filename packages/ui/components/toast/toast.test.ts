/**
 * Test suite for Toast component
 *
 * @constela/ui Toast component tests following TDD methodology.
 * These tests verify the Toast component structure, params, styles, and accessibility.
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

describe('Toast Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('toast');
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

    it('should contain a slot for toast content', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with preset toastStyles', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'toastStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['variant', 'title', 'description'];

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

    describe('param: description', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'description')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'description', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const toastStyles = ctx.styles['toastStyles'];
      expect(toastStyles).toBeDefined();
      assertValidStylePreset(toastStyles);
    });

    it('should have base classes for common toast styles', () => {
      const toastStyles = ctx.styles['toastStyles'];
      expect(toastStyles.base).toBeDefined();
      expect(typeof toastStyles.base).toBe('string');
      expect(toastStyles.base.length).toBeGreaterThan(0);
    });

    describe('variant options', () => {
      const variantOptions = ['default', 'success', 'error', 'warning', 'info'];

      it('should have variant variants', () => {
        const toastStyles = ctx.styles['toastStyles'];
        expect(hasVariants(toastStyles, ['variant'])).toBe(true);
      });

      it.each(variantOptions)('should have %s variant option', (option) => {
        const toastStyles = ctx.styles['toastStyles'];
        expect(hasVariantOptions(toastStyles, 'variant', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default variant set to default', () => {
        const toastStyles = ctx.styles['toastStyles'];
        expect(hasDefaultVariants(toastStyles, { variant: 'default' })).toBe(true);
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

    it('should have aria-live="polite" for non-intrusive notifications', () => {
      const ariaLive = findPropInView(ctx.component.view, 'aria-live');
      expect(ariaLive).not.toBeNull();
      expect(ariaLive).toMatchObject({
        expr: 'lit',
        value: 'polite',
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass variant to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          variant: expect.objectContaining({ expr: 'param', name: 'variant' }),
        }),
      });
    });
  });
});
