/**
 * Test suite for Textarea component
 *
 * @constela/ui Textarea component tests following TDD methodology.
 * These tests verify the Textarea component structure, params, styles, and accessibility.
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
  findPropInView,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Textarea Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('textarea');
  });

  // ==================== Component Structure Tests ====================

  describe('Component Structure', () => {
    it('should have valid component structure', () => {
      assertValidComponent(ctx.component);
    });

    it('should have textarea as root element', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('textarea');
    });

    it('should have className using StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'textareaStyles',
      });
    });

    it('should support rows attribute', () => {
      const rows = findPropInView(ctx.component.view, 'rows');
      expect(rows).not.toBeNull();
      // Should reference the rows param
      expect(rows).toMatchObject({
        expr: 'param',
        name: 'rows',
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
      'rows',
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

    describe('param: rows', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'rows')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'rows', 'number')).toBe(true);
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
      const textareaStyles = ctx.styles['textareaStyles'];
      expect(textareaStyles).toBeDefined();
      assertValidStylePreset(textareaStyles);
    });

    it('should have base classes', () => {
      const textareaStyles = ctx.styles['textareaStyles'];
      expect(textareaStyles.base).toBeDefined();
      expect(typeof textareaStyles.base).toBe('string');
      expect(textareaStyles.base.length).toBeGreaterThan(0);
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const textareaStyles = ctx.styles['textareaStyles'];
        expect(hasVariants(textareaStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const textareaStyles = ctx.styles['textareaStyles'];
        expect(hasVariantOptions(textareaStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const textareaStyles = ctx.styles['textareaStyles'];
        expect(hasDefaultVariants(textareaStyles, { size: 'default' })).toBe(true);
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
    it('should pass value to textarea', () => {
      const value = findPropInView(ctx.component.view, 'value');
      expect(value).not.toBeNull();
      expect(value).toMatchObject({
        expr: 'param',
        name: 'value',
      });
    });

    it('should pass placeholder to textarea', () => {
      const placeholder = findPropInView(ctx.component.view, 'placeholder');
      expect(placeholder).not.toBeNull();
      expect(placeholder).toMatchObject({
        expr: 'param',
        name: 'placeholder',
      });
    });

    it('should pass name to textarea', () => {
      const name = findPropInView(ctx.component.view, 'name');
      expect(name).not.toBeNull();
      expect(name).toMatchObject({
        expr: 'param',
        name: 'name',
      });
    });

    it('should pass id to textarea', () => {
      const id = findPropInView(ctx.component.view, 'id');
      expect(id).not.toBeNull();
      expect(id).toMatchObject({
        expr: 'param',
        name: 'id',
      });
    });

    it('should pass size to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        variants: expect.objectContaining({
          size: expect.objectContaining({ expr: 'param', name: 'size' }),
        }),
      });
    });
  });
});
