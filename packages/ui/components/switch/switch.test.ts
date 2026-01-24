/**
 * Test suite for Switch component
 *
 * @constela/ui Switch component tests following TDD methodology.
 * These tests verify the Switch component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
 * - Accessibility attributes (role="switch", aria-checked, aria-label)
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
  hasAriaAttribute,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Switch Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('switch');
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

    it('should NOT contain a slot (switch is self-contained)', () => {
      expect(hasSlot(ctx.component.view)).toBe(false);
    });

    it('should have className using StyleExpr with preset "switchStyles"', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'switchStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['checked', 'disabled', 'name', 'id', 'ariaLabel'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: checked', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'checked')).toBe(true);
      });

      it('should have type boolean', () => {
        expect(hasParamType(ctx.component, 'checked', 'boolean')).toBe(true);
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

    describe('param: name', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'name')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'name', 'string')).toBe(true);
      });
    });

    describe('param: id', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'id')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'id', 'string')).toBe(true);
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
      const switchStyles = ctx.styles['switchStyles'];
      expect(switchStyles).toBeDefined();
      assertValidStylePreset(switchStyles);
    });

    it('should have base classes with common switch styles', () => {
      const switchStyles = ctx.styles['switchStyles'];
      expect(switchStyles.base).toBeDefined();
      expect(typeof switchStyles.base).toBe('string');
      expect(switchStyles.base.length).toBeGreaterThan(0);
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const switchStyles = ctx.styles['switchStyles'];
        expect(hasVariants(switchStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const switchStyles = ctx.styles['switchStyles'];
        expect(hasVariantOptions(switchStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to "default"', () => {
        const switchStyles = ctx.styles['switchStyles'];
        expect(hasDefaultVariants(switchStyles, { size: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have role="switch"', () => {
      expect(hasRole(ctx.component.view, 'switch')).toBe(true);
    });

    it('should support aria-label attribute', () => {
      const ariaLabel = findPropInView(ctx.component.view, 'aria-label');
      expect(ariaLabel).not.toBeNull();
      // Should reference the ariaLabel param
      expect(ariaLabel).toMatchObject({
        expr: 'param',
        name: 'ariaLabel',
      });
    });

    it('should have aria-checked attribute bound to checked param', () => {
      const ariaChecked = findPropInView(ctx.component.view, 'aria-checked');
      expect(ariaChecked).not.toBeNull();
      // Should reference the checked param
      expect(ariaChecked).toMatchObject({
        expr: 'param',
        name: 'checked',
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
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass name to button', () => {
      const name = findPropInView(ctx.component.view, 'name');
      expect(name).not.toBeNull();
      expect(name).toMatchObject({
        expr: 'param',
        name: 'name',
      });
    });

    it('should pass id to button', () => {
      const id = findPropInView(ctx.component.view, 'id');
      expect(id).not.toBeNull();
      expect(id).toMatchObject({
        expr: 'param',
        name: 'id',
      });
    });
  });
});
