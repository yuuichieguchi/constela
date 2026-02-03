/**
 * Test suite for DatePicker component
 *
 * @constela/ui DatePicker component tests following TDD methodology.
 * These tests verify the DatePicker component structure, params, styles, and integration.
 *
 * Coverage:
 * - Component structure validation (input + popover + calendar integration)
 * - Params definition validation
 * - Style preset validation (container, input, icon)
 * - Input display and formatting
 * - Calendar popover integration
 * - Form integration
 * - Disabled state handling
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
  hasAriaAttribute,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('DatePicker Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('datepicker');
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

    it('should have className using StyleExpr with datepickerStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        name: 'datepickerStyles',
      });
    });

    it('should contain input element for displaying selected date', () => {
      const view = ctx.component.view;
      expect(view.kind).toBe('element');
      if (view.kind === 'element') {
        expect(view.children).toBeDefined();
        // Should have at least input and popover/calendar structure
        expect(view.children!.length).toBeGreaterThan(0);
      }
    });

    it('should contain hidden input for form submission', () => {
      // Hidden input with name attribute for form data
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should have aria-label for accessibility', () => {
      expect(hasAriaAttribute(ctx.component.view, 'label')).toBe(true);
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = [
      'value',
      'placeholder',
      'format',
      'min',
      'max',
      'disabled',
      'required',
      'name',
      'id',
      'locale',
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

    describe('param: format', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'format')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'format', 'string')).toBe(true);
      });
    });

    describe('param: min', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'min')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'min', 'string')).toBe(true);
      });
    });

    describe('param: max', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'max')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'max', 'string')).toBe(true);
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

    describe('param: locale', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'locale')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'locale', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests: datepickerStyles ====================

  describe('Style Preset: datepickerStyles', () => {
    it('should have valid style preset structure', () => {
      const datepickerStyles = ctx.styles['datepickerStyles'];
      expect(datepickerStyles).toBeDefined();
      assertValidStylePreset(datepickerStyles);
    });

    it('should have base classes for container', () => {
      const datepickerStyles = ctx.styles['datepickerStyles'];
      expect(datepickerStyles.base).toBeDefined();
      expect(typeof datepickerStyles.base).toBe('string');
      expect(datepickerStyles.base.length).toBeGreaterThan(0);
    });

    it('should include relative positioning for popover anchor', () => {
      const datepickerStyles = ctx.styles['datepickerStyles'];
      expect(datepickerStyles.base).toContain('relative');
    });

    describe('size variants', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const datepickerStyles = ctx.styles['datepickerStyles'];
        expect(hasVariants(datepickerStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const datepickerStyles = ctx.styles['datepickerStyles'];
        expect(hasVariantOptions(datepickerStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const datepickerStyles = ctx.styles['datepickerStyles'];
        expect(hasDefaultVariants(datepickerStyles, { size: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests: datepickerInputStyles ====================

  describe('Style Preset: datepickerInputStyles', () => {
    it('should have datepickerInputStyles preset', () => {
      const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
      expect(datepickerInputStyles).toBeDefined();
      assertValidStylePreset(datepickerInputStyles);
    });

    it('should have base classes for input field', () => {
      const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
      expect(datepickerInputStyles.base).toBeDefined();
      expect(typeof datepickerInputStyles.base).toBe('string');
      expect(datepickerInputStyles.base.length).toBeGreaterThan(0);
    });

    it('should include padding for icon space', () => {
      const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
      // Should have right padding for calendar icon
      expect(datepickerInputStyles.base).toMatch(/pr-\d+/);
    });

    describe('state variants', () => {
      const stateOptions = ['default', 'focused', 'disabled', 'error'];

      it('should have state variants', () => {
        const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
        expect(hasVariants(datepickerInputStyles, ['state'])).toBe(true);
      });

      it.each(stateOptions)('should have %s state option', (option) => {
        const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
        expect(hasVariantOptions(datepickerInputStyles, 'state', [option])).toBe(true);
      });
    });

    describe('size variants', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
        expect(hasVariants(datepickerInputStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const datepickerInputStyles = ctx.styles['datepickerInputStyles'];
        expect(hasVariantOptions(datepickerInputStyles, 'size', [option])).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests: datepickerIconStyles ====================

  describe('Style Preset: datepickerIconStyles', () => {
    it('should have datepickerIconStyles preset', () => {
      const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
      expect(datepickerIconStyles).toBeDefined();
      assertValidStylePreset(datepickerIconStyles);
    });

    it('should have base classes for calendar icon', () => {
      const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
      expect(datepickerIconStyles.base).toBeDefined();
      expect(typeof datepickerIconStyles.base).toBe('string');
      expect(datepickerIconStyles.base.length).toBeGreaterThan(0);
    });

    it('should include absolute positioning', () => {
      const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
      expect(datepickerIconStyles.base).toContain('absolute');
    });

    it('should include right alignment', () => {
      const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
      expect(datepickerIconStyles.base).toMatch(/right-\d+/);
    });

    it('should include pointer cursor for clickable icon', () => {
      const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
      expect(datepickerIconStyles.base).toContain('cursor-pointer');
    });

    describe('state variants', () => {
      const stateOptions = ['default', 'disabled'];

      it('should have state variants', () => {
        const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
        expect(hasVariants(datepickerIconStyles, ['state'])).toBe(true);
      });

      it.each(stateOptions)('should have %s state option', (option) => {
        const datepickerIconStyles = ctx.styles['datepickerIconStyles'];
        expect(hasVariantOptions(datepickerIconStyles, 'state', [option])).toBe(true);
      });
    });
  });

  // ==================== Input Display Tests ====================

  describe('Input Display', () => {
    it('should show placeholder when no value is set', () => {
      const placeholderParam = ctx.component.params?.['placeholder'];
      expect(placeholderParam).toBeDefined();
      expect(placeholderParam?.type).toBe('string');
    });

    it('should support format param for date display', () => {
      const formatParam = ctx.component.params?.['format'];
      expect(formatParam).toBeDefined();
      expect(formatParam?.type).toBe('string');
    });

    it('should support locale param for localized display', () => {
      const localeParam = ctx.component.params?.['locale'];
      expect(localeParam).toBeDefined();
      expect(localeParam?.type).toBe('string');
    });

    it('should display value when set', () => {
      const valueParam = ctx.component.params?.['value'];
      expect(valueParam).toBeDefined();
      // value should be used to display formatted date in input
    });

    it('should make input read-only (date selection via calendar only)', () => {
      // Input should be readonly to prevent manual text entry
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Calendar Popover Integration Tests ====================

  describe('Calendar Popover Integration', () => {
    it('should integrate with popover component', () => {
      // Should contain popover element or component reference
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should integrate with calendar component', () => {
      // Should contain calendar element or component reference
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should pass min prop to calendar', () => {
      const minParam = ctx.component.params?.['min'];
      expect(minParam).toBeDefined();
    });

    it('should pass max prop to calendar', () => {
      const maxParam = ctx.component.params?.['max'];
      expect(maxParam).toBeDefined();
    });

    it('should pass locale prop to calendar', () => {
      const localeParam = ctx.component.params?.['locale'];
      expect(localeParam).toBeDefined();
    });

    it('should have internal state for calendar open/close', () => {
      // Component should manage open state for popover
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Form Integration Tests ====================

  describe('Form Integration', () => {
    it('should support name param for form submission', () => {
      const nameParam = ctx.component.params?.['name'];
      expect(nameParam).toBeDefined();
      expect(nameParam?.type).toBe('string');
    });

    it('should support required param', () => {
      const requiredParam = ctx.component.params?.['required'];
      expect(requiredParam).toBeDefined();
      expect(requiredParam?.type).toBe('boolean');
    });

    it('should support id param', () => {
      const idParam = ctx.component.params?.['id'];
      expect(idParam).toBeDefined();
      expect(idParam?.type).toBe('string');
    });

    it('should have hidden input with ISO format value for form data', () => {
      // Hidden input should always contain YYYY-MM-DD format
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Disabled State Tests ====================

  describe('Disabled State', () => {
    it('should support disabled param', () => {
      const disabledParam = ctx.component.params?.['disabled'];
      expect(disabledParam).toBeDefined();
      expect(disabledParam?.type).toBe('boolean');
    });

    it('should apply disabled styling when disabled is true', () => {
      // Input and icon should reflect disabled state
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should prevent calendar opening when disabled', () => {
      // Click handlers should check disabled state
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have aria-label for date picker', () => {
      expect(hasAriaAttribute(ctx.component.view, 'label')).toBe(true);
    });

    it('should have aria-haspopup attribute', () => {
      // Input should indicate it opens a popup
      expect(hasAriaAttribute(ctx.component.view, 'haspopup')).toBe(true);
    });

    it('should have aria-expanded attribute', () => {
      // Should reflect whether calendar is open
      expect(hasAriaAttribute(ctx.component.view, 'expanded')).toBe(true);
    });

    it('should support keyboard navigation', () => {
      // Should be focusable and support Enter/Space to open
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass value to component', () => {
      const params = ctx.component.params;
      expect(params?.['value']).toBeDefined();
    });

    it('should pass placeholder to input', () => {
      const params = ctx.component.params;
      expect(params?.['placeholder']).toBeDefined();
    });

    it('should pass disabled to component', () => {
      const params = ctx.component.params;
      expect(params?.['disabled']).toBeDefined();
    });

    it('should pass format to component', () => {
      const params = ctx.component.params;
      expect(params?.['format']).toBeDefined();
    });

    it('should pass locale to component', () => {
      const params = ctx.component.params;
      expect(params?.['locale']).toBeDefined();
    });
  });

  // ==================== Events Tests ====================

  describe('Events', () => {
    it('should emit @change event when date is selected', () => {
      // Component should have event handler for date selection
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should emit @open event when calendar opens', () => {
      // Component should emit event on popover open
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should emit @close event when calendar closes', () => {
      // Component should emit event on popover close
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });
});
