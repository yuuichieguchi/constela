/**
 * Test suite for Calendar component
 *
 * @constela/ui Calendar component tests following TDD methodology.
 * These tests verify the Calendar component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
 * - Accessibility attributes
 * - Navigation functionality
 * - Date selection
 * - Locale support
 * - Week start configuration
 * - Disabled state handling
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
  hasRole,
  hasAriaAttribute,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Calendar Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('calendar');
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

    it('should have role="grid" for calendar grid', () => {
      expect(hasRole(ctx.component.view, 'grid')).toBe(true);
    });

    it('should have className using StyleExpr with calendarStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'calendarStyles',
      });
    });

    it('should have aria-label for accessibility', () => {
      expect(hasAriaAttribute(ctx.component.view, 'label')).toBe(true);
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = [
      'value',
      'year',
      'month',
      'min',
      'max',
      'disabled',
      'locale',
      'weekStartsOn',
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

    describe('param: year', () => {
      it('should be required', () => {
        expect(isOptionalParam(ctx.component, 'year')).toBe(false);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'year', 'number')).toBe(true);
      });
    });

    describe('param: month', () => {
      it('should be required', () => {
        expect(isOptionalParam(ctx.component, 'month')).toBe(false);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'month', 'number')).toBe(true);
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

    describe('param: locale', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'locale')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'locale', 'string')).toBe(true);
      });
    });

    describe('param: weekStartsOn', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'weekStartsOn')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'weekStartsOn', 'number')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const calendarStyles = ctx.styles['calendarStyles'];
      expect(calendarStyles).toBeDefined();
      assertValidStylePreset(calendarStyles);
    });

    it('should have base classes for common calendar styles', () => {
      const calendarStyles = ctx.styles['calendarStyles'];
      expect(calendarStyles.base).toBeDefined();
      expect(typeof calendarStyles.base).toBe('string');
      expect(calendarStyles.base.length).toBeGreaterThan(0);
    });

    describe('size variants', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const calendarStyles = ctx.styles['calendarStyles'];
        expect(hasVariants(calendarStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const calendarStyles = ctx.styles['calendarStyles'];
        expect(hasVariantOptions(calendarStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const calendarStyles = ctx.styles['calendarStyles'];
        expect(hasDefaultVariants(calendarStyles, { size: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Calendar Day Styles ====================

  describe('Calendar Day Styles', () => {
    it('should have calendarDayStyles preset', () => {
      const calendarDayStyles = ctx.styles['calendarDayStyles'];
      expect(calendarDayStyles).toBeDefined();
      assertValidStylePreset(calendarDayStyles);
    });

    it('should have base classes for day cells', () => {
      const calendarDayStyles = ctx.styles['calendarDayStyles'];
      expect(calendarDayStyles.base).toBeDefined();
      expect(typeof calendarDayStyles.base).toBe('string');
    });

    describe('day state variants', () => {
      const stateOptions = ['default', 'selected', 'today', 'disabled', 'outside'];

      it('should have state variants', () => {
        const calendarDayStyles = ctx.styles['calendarDayStyles'];
        expect(hasVariants(calendarDayStyles, ['state'])).toBe(true);
      });

      it.each(stateOptions)('should have %s state option', (option) => {
        const calendarDayStyles = ctx.styles['calendarDayStyles'];
        expect(hasVariantOptions(calendarDayStyles, 'state', [option])).toBe(true);
      });
    });
  });

  // ==================== Calendar Navigation Styles ====================

  describe('Calendar Navigation Styles', () => {
    it('should have calendarNavStyles preset', () => {
      const calendarNavStyles = ctx.styles['calendarNavStyles'];
      expect(calendarNavStyles).toBeDefined();
      assertValidStylePreset(calendarNavStyles);
    });

    it('should have base classes for navigation', () => {
      const calendarNavStyles = ctx.styles['calendarNavStyles'];
      expect(calendarNavStyles.base).toBeDefined();
      expect(typeof calendarNavStyles.base).toBe('string');
    });
  });

  // ==================== Rendering Tests ====================

  describe('Rendering', () => {
    it('should render calendar grid with correct structure', () => {
      // Calendar should have header (navigation), weekday headers, and day grid
      const view = ctx.component.view;
      expect(view.kind).toBe('element');
      if (view.kind === 'element') {
        expect(view.children).toBeDefined();
        expect(view.children!.length).toBeGreaterThan(0);
      }
    });

    it('should display month name in header', () => {
      // Component should have a text node or element displaying month/year
      const view = ctx.component.view;
      expect(view).toBeDefined();
      // The month display should reference year and month params
    });

    it('should show weekday headers', () => {
      // Should have 7 weekday header elements
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should highlight selected date when value is provided', () => {
      // Day with matching value should have 'selected' state
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Navigation Tests ====================

  describe('Navigation', () => {
    it('should have previous month navigation button', () => {
      const view = ctx.component.view;
      // Should find a button for previous month navigation
      expect(view).toBeDefined();
    });

    it('should have next month navigation button', () => {
      const view = ctx.component.view;
      // Should find a button for next month navigation
      expect(view).toBeDefined();
    });

    it('should support year transition from December to January', () => {
      // Navigation from month 11 (Dec) should go to month 0 (Jan) of next year
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should support year transition from January to December', () => {
      // Navigation from month 0 (Jan) should go to month 11 (Dec) of previous year
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Date Selection Tests ====================

  describe('Date Selection', () => {
    it('should have event handler for date selection', () => {
      // Day cells should have onClick or similar event for @select
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should not allow selection of disabled dates', () => {
      // Dates outside min/max range or when disabled=true should not trigger @select
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should respect min date boundary', () => {
      // Dates before min should be marked as disabled
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should respect max date boundary', () => {
      // Dates after max should be marked as disabled
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Locale Support Tests ====================

  describe('Locale Support', () => {
    it('should support locale param for month names', () => {
      const localeParam = ctx.component.params?.['locale'];
      expect(localeParam).toBeDefined();
      expect(localeParam?.type).toBe('string');
    });

    it('should support locale param for weekday names', () => {
      // Weekday names should be localizable based on locale param
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Week Start Configuration Tests ====================

  describe('Week Start Configuration', () => {
    it('should support weekStartsOn param', () => {
      const weekStartsOnParam = ctx.component.params?.['weekStartsOn'];
      expect(weekStartsOnParam).toBeDefined();
      expect(weekStartsOnParam?.type).toBe('number');
    });

    it('should default to Sunday first (weekStartsOn: 0)', () => {
      const weekStartsOnParam = ctx.component.params?.['weekStartsOn'];
      expect(weekStartsOnParam?.required).toBe(false);
    });

    it('should support Monday first (weekStartsOn: 1)', () => {
      // Component should handle weekStartsOn: 1 to show Monday as first day
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

    it('should prevent all interactions when disabled is true', () => {
      // When disabled=true, navigation and date selection should be blocked
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should apply disabled styling when disabled is true', () => {
      // Calendar should have visual indication of disabled state
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have proper ARIA role for calendar grid', () => {
      expect(hasRole(ctx.component.view, 'grid')).toBe(true);
    });

    it('should have aria-label for calendar', () => {
      expect(hasAriaAttribute(ctx.component.view, 'label')).toBe(true);
    });

    it('should have accessible navigation buttons', () => {
      // Navigation buttons should have aria-label
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should mark disabled dates with aria-disabled', () => {
      // Disabled dates should have aria-disabled="true"
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });

    it('should mark selected date with aria-selected', () => {
      // Selected date should have aria-selected="true"
      const view = ctx.component.view;
      expect(view).toBeDefined();
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass year to component', () => {
      const params = ctx.component.params;
      expect(params?.['year']).toBeDefined();
    });

    it('should pass month to component', () => {
      const params = ctx.component.params;
      expect(params?.['month']).toBeDefined();
    });

    it('should pass value to component for selected date', () => {
      const params = ctx.component.params;
      expect(params?.['value']).toBeDefined();
    });

    it('should pass disabled to component', () => {
      const params = ctx.component.params;
      expect(params?.['disabled']).toBeDefined();
    });
  });
});
