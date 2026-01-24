/**
 * Test suite for Input component
 *
 * @constela/ui Input component tests following TDD methodology.
 * These tests verify the Input component structure, params, styles, and accessibility.
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

describe('Input Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('input');
  });

  // ==================== Component Structure Tests ====================

  describe('Component Structure', () => {
    it('should have valid component structure', () => {
      assertValidComponent(ctx.component);
    });

    it('should have input as root element', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('input');
    });

    it('should NOT contain a slot (input is self-closing)', () => {
      expect(hasSlot(ctx.component.view)).toBe(false);
    });

    it('should have className using StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'inputStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = [
      'value',
      'placeholder',
      'disabled',
      'required',
      'type',
      'name',
      'id',
      'ariaLabel',
    ];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: value', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'value')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'value', 'string')).toBe(true);
      });
    });

    describe('param: placeholder', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'placeholder')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'placeholder', 'string')).toBe(true);
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

    describe('param: required', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'required')).toBe(true);
      });

      it('should have type boolean', () => {
        expect(hasParamType(ctx.component, 'required', 'boolean')).toBe(true);
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
      const inputStyles = ctx.styles['inputStyles'];
      expect(inputStyles).toBeDefined();
      assertValidStylePreset(inputStyles);
    });

    it('should have base classes', () => {
      const inputStyles = ctx.styles['inputStyles'];
      expect(inputStyles.base).toBeDefined();
      expect(typeof inputStyles.base).toBe('string');
      expect(inputStyles.base.length).toBeGreaterThan(0);
    });

    describe('variant options', () => {
      it('should have variant variants', () => {
        const inputStyles = ctx.styles['inputStyles'];
        expect(hasVariants(inputStyles, ['variant'])).toBe(true);
      });

      it('should have default variant option', () => {
        const inputStyles = ctx.styles['inputStyles'];
        expect(hasVariantOptions(inputStyles, 'variant', ['default'])).toBe(true);
      });
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const inputStyles = ctx.styles['inputStyles'];
        expect(hasVariants(inputStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const inputStyles = ctx.styles['inputStyles'];
        expect(hasVariantOptions(inputStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default variant set to default', () => {
        const inputStyles = ctx.styles['inputStyles'];
        expect(hasDefaultVariants(inputStyles, { variant: 'default' })).toBe(true);
      });

      it('should have default size set to default', () => {
        const inputStyles = ctx.styles['inputStyles'];
        expect(hasDefaultVariants(inputStyles, { size: 'default' })).toBe(true);
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

    it('should support required attribute', () => {
      const required = findPropInView(ctx.component.view, 'required');
      expect(required).not.toBeNull();
      // Should reference the required param
      expect(required).toMatchObject({
        expr: 'param',
        name: 'required',
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass value to input', () => {
      const value = findPropInView(ctx.component.view, 'value');
      expect(value).not.toBeNull();
      expect(value).toMatchObject({
        expr: 'param',
        name: 'value',
      });
    });

    it('should pass placeholder to input', () => {
      const placeholder = findPropInView(ctx.component.view, 'placeholder');
      expect(placeholder).not.toBeNull();
      expect(placeholder).toMatchObject({
        expr: 'param',
        name: 'placeholder',
      });
    });

    it('should pass type to input', () => {
      const type = findPropInView(ctx.component.view, 'type');
      expect(type).not.toBeNull();
      expect(type).toMatchObject({
        expr: 'param',
        name: 'type',
      });
    });

    it('should pass name to input', () => {
      const name = findPropInView(ctx.component.view, 'name');
      expect(name).not.toBeNull();
      expect(name).toMatchObject({
        expr: 'param',
        name: 'name',
      });
    });

    it('should pass id to input', () => {
      const id = findPropInView(ctx.component.view, 'id');
      expect(id).not.toBeNull();
      expect(id).toMatchObject({
        expr: 'param',
        name: 'id',
      });
    });
  });
});
