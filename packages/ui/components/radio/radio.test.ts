/**
 * Test suite for Radio component
 *
 * @constela/ui Radio component tests following TDD methodology.
 * These tests verify the Radio component structure, params, styles, and accessibility.
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

describe('Radio Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('radio');
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

    it('should have type="radio" attribute', () => {
      const type = findPropInView(ctx.component.view, 'type');
      expect(type).not.toBeNull();
      // Should be a literal value 'radio'
      expect(type).toMatchObject({
        expr: 'lit',
        value: 'radio',
      });
    });

    it('should NOT contain a slot (radio is self-closing)', () => {
      expect(hasSlot(ctx.component.view)).toBe(false);
    });

    it('should have className using StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'radioStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = [
      'checked',
      'disabled',
      'name',
      'value',
      'id',
      'ariaLabel',
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

    describe('param: name', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'name')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'name', 'string')).toBe(true);
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
      const radioStyles = ctx.styles['radioStyles'];
      expect(radioStyles).toBeDefined();
      assertValidStylePreset(radioStyles);
    });

    it('should have base classes', () => {
      const radioStyles = ctx.styles['radioStyles'];
      expect(radioStyles.base).toBeDefined();
      expect(typeof radioStyles.base).toBe('string');
      expect(radioStyles.base.length).toBeGreaterThan(0);
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const radioStyles = ctx.styles['radioStyles'];
        expect(hasVariants(radioStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const radioStyles = ctx.styles['radioStyles'];
        expect(hasVariantOptions(radioStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const radioStyles = ctx.styles['radioStyles'];
        expect(hasDefaultVariants(radioStyles, { size: 'default' })).toBe(true);
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
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass checked to input', () => {
      const checked = findPropInView(ctx.component.view, 'checked');
      expect(checked).not.toBeNull();
      expect(checked).toMatchObject({
        expr: 'param',
        name: 'checked',
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

    it('should pass value to input', () => {
      const value = findPropInView(ctx.component.view, 'value');
      expect(value).not.toBeNull();
      expect(value).toMatchObject({
        expr: 'param',
        name: 'value',
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
