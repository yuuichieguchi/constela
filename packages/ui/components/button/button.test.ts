/**
 * Test suite for Button component
 *
 * @constela/ui Button component tests following TDD methodology.
 * These tests verify the Button component structure, params, styles, and accessibility.
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
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';
describe('Button Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('button');
  });

  // ==================== Component Structure Tests ====================

  describe('Component Structure', () => {
    it('should have valid component structure', () => {
      assertValidComponent(ctx.component);
    });

    it('should have button as root element', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('button');
    });

    it('should contain a slot for children', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'buttonStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['variant', 'size', 'disabled', 'type', 'ariaLabel'];

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

    describe('param: size', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'size')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'size', 'string')).toBe(true);
      });
    });

    describe('param: disabled', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'disabled')).toBe(true);
      });

      it('should have type boolean', () => {
        expect(hasParamType(ctx.component, 'disabled', 'boolean')).toBe(true);
      });
    });

    describe('param: type', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'type')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'type', 'string')).toBe(true);
      });
    });

    describe('param: ariaLabel', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'ariaLabel')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'ariaLabel', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const buttonStyles = ctx.styles['buttonStyles'];
      expect(buttonStyles).toBeDefined();
      assertValidStylePreset(buttonStyles);
    });

    it('should have base classes', () => {
      const buttonStyles = ctx.styles['buttonStyles'];
      expect(buttonStyles.base).toBeDefined();
      expect(typeof buttonStyles.base).toBe('string');
      expect(buttonStyles.base.length).toBeGreaterThan(0);
    });

    describe('variant options', () => {
      const variantOptions = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];

      it('should have variant variants', () => {
        const buttonStyles = ctx.styles['buttonStyles'];
        expect(hasVariants(buttonStyles, ['variant'])).toBe(true);
      });

      it.each(variantOptions)('should have %s variant option', (option) => {
        const buttonStyles = ctx.styles['buttonStyles'];
        expect(hasVariantOptions(buttonStyles, 'variant', [option])).toBe(true);
      });
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg', 'icon'];

      it('should have size variants', () => {
        const buttonStyles = ctx.styles['buttonStyles'];
        expect(hasVariants(buttonStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const buttonStyles = ctx.styles['buttonStyles'];
        expect(hasVariantOptions(buttonStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default variant set to default', () => {
        const buttonStyles = ctx.styles['buttonStyles'];
        expect(hasDefaultVariants(buttonStyles, { variant: 'default' })).toBe(true);
      });

      it('should have default size set to default', () => {
        const buttonStyles = ctx.styles['buttonStyles'];
        expect(hasDefaultVariants(buttonStyles, { size: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should support aria-label attribute', () => {
      const ariaLabel = findPropInView(ctx.component.view, 'aria-label');
      expect(ariaLabel).not.toBeNull();
      // Should reference the ariaLabel param
      expect(ariaLabel).toMatchObject({
        expr: 'param',
        name: 'ariaLabel',
      });
    });

    it('should support disabled attribute', () => {
      const disabled = findPropInView(ctx.component.view, 'disabled');
      expect(disabled).not.toBeNull();
      // Should reference the disabled param
      expect(disabled).toMatchObject({
        expr: 'param',
        name: 'disabled',
      });
    });

    it('should support type attribute', () => {
      const type = findPropInView(ctx.component.view, 'type');
      expect(type).not.toBeNull();
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

    it('should pass size to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          size: expect.objectContaining({ expr: 'param', name: 'size' }),
        }),
      });
    });
  });
});
