/**
 * Test suite for Checkbox component
 *
 * @constela/ui Checkbox component tests following TDD methodology.
 * These tests verify the Checkbox component structure, params, styles, and accessibility.
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

describe('Checkbox Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('checkbox');
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

    it('should have type="checkbox" attribute', () => {
      const type = findPropInView(ctx.component.view, 'type');
      expect(type).not.toBeNull();
      // Type should be a literal 'checkbox'
      expect(type).toMatchObject({
        expr: 'lit',
        value: 'checkbox',
      });
    });

    it('should NOT contain a slot (checkbox is self-closing)', () => {
      expect(hasSlot(ctx.component.view)).toBe(false);
    });

    it('should have className using StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'checkboxStyles',
      });
    });

    it('should support checked attribute for localState usage', () => {
      const checked = findPropInView(ctx.component.view, 'checked');
      expect(checked).not.toBeNull();
      // Should reference the checked param
      expect(checked).toMatchObject({
        expr: 'param',
        name: 'checked',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = [
      'checked',
      'disabled',
      'required',
      'name',
      'id',
      'ariaLabel',
      'value',
    ];

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

    describe('param: required', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'required')).toBe(true);
      });

      it('should have type boolean', () => {
        expect(hasParamType(ctx.component, 'required', 'boolean')).toBe(true);
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

    describe('param: value', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'value')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'value', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const checkboxStyles = ctx.styles['checkboxStyles'];
      expect(checkboxStyles).toBeDefined();
      assertValidStylePreset(checkboxStyles);
    });

    it('should have base classes', () => {
      const checkboxStyles = ctx.styles['checkboxStyles'];
      expect(checkboxStyles.base).toBeDefined();
      expect(typeof checkboxStyles.base).toBe('string');
      expect(checkboxStyles.base.length).toBeGreaterThan(0);
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const checkboxStyles = ctx.styles['checkboxStyles'];
        expect(hasVariants(checkboxStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const checkboxStyles = ctx.styles['checkboxStyles'];
        expect(hasVariantOptions(checkboxStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const checkboxStyles = ctx.styles['checkboxStyles'];
        expect(hasDefaultVariants(checkboxStyles, { size: 'default' })).toBe(true);
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
    it('should pass name to checkbox', () => {
      const name = findPropInView(ctx.component.view, 'name');
      expect(name).not.toBeNull();
      expect(name).toMatchObject({
        expr: 'param',
        name: 'name',
      });
    });

    it('should pass id to checkbox', () => {
      const id = findPropInView(ctx.component.view, 'id');
      expect(id).not.toBeNull();
      expect(id).toMatchObject({
        expr: 'param',
        name: 'id',
      });
    });

    it('should pass value to checkbox', () => {
      const value = findPropInView(ctx.component.view, 'value');
      expect(value).not.toBeNull();
      expect(value).toMatchObject({
        expr: 'param',
        name: 'value',
      });
    });
  });
});
