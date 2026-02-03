/**
 * Test suite for Tabs component
 *
 * @constela/ui Tabs component tests following TDD methodology.
 * These tests verify the Tabs component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
 * - Accessibility attributes (role="tablist")
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

describe('Tabs Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('tabs');
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

    it('should have role="tablist" attribute', () => {
      expect(hasRole(ctx.component.view, 'tablist')).toBe(true);
    });

    it('should contain a slot for tab items', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with tabsStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        name: 'tabsStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['activeTab', 'variant'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: activeTab', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'activeTab')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'activeTab', 'string')).toBe(true);
      });
    });

    describe('param: variant', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'variant')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'variant', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const tabsStyles = ctx.styles['tabsStyles'];
      expect(tabsStyles).toBeDefined();
      assertValidStylePreset(tabsStyles);
    });

    it('should have base classes for common tabs styles', () => {
      const tabsStyles = ctx.styles['tabsStyles'];
      expect(tabsStyles.base).toBeDefined();
      expect(typeof tabsStyles.base).toBe('string');
      expect(tabsStyles.base.length).toBeGreaterThan(0);
    });

    describe('variant options', () => {
      const variantOptions = ['default', 'outline'];

      it('should have variant variants', () => {
        const tabsStyles = ctx.styles['tabsStyles'];
        expect(hasVariants(tabsStyles, ['variant'])).toBe(true);
      });

      it.each(variantOptions)('should have %s variant option', (option) => {
        const tabsStyles = ctx.styles['tabsStyles'];
        expect(hasVariantOptions(tabsStyles, 'variant', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default variant set to default', () => {
        const tabsStyles = ctx.styles['tabsStyles'];
        expect(hasDefaultVariants(tabsStyles, { variant: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have role="tablist" for screen readers', () => {
      const role = findPropInView(ctx.component.view, 'role');
      expect(role).not.toBeNull();
      expect(role).toMatchObject({
        expr: 'lit',
        value: 'tablist',
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
