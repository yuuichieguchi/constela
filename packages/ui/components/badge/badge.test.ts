/**
 * Test suite for Badge component
 *
 * @constela/ui Badge component tests following TDD methodology.
 * These tests verify the Badge component structure, params, and styles.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
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

describe('Badge Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('badge');
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

    it('should contain a slot for badge content', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with preset badgeStyles', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'badgeStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['variant'];

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
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const badgeStyles = ctx.styles['badgeStyles'];
      expect(badgeStyles).toBeDefined();
      assertValidStylePreset(badgeStyles);
    });

    it('should have base classes for common badge styles', () => {
      const badgeStyles = ctx.styles['badgeStyles'];
      expect(badgeStyles.base).toBeDefined();
      expect(typeof badgeStyles.base).toBe('string');
      expect(badgeStyles.base.length).toBeGreaterThan(0);
    });

    describe('variant options', () => {
      const variantOptions = ['default', 'secondary', 'destructive', 'outline'];

      it('should have variant variants', () => {
        const badgeStyles = ctx.styles['badgeStyles'];
        expect(hasVariants(badgeStyles, ['variant'])).toBe(true);
      });

      it.each(variantOptions)('should have %s variant option', (option) => {
        const badgeStyles = ctx.styles['badgeStyles'];
        expect(hasVariantOptions(badgeStyles, 'variant', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default variant set to default', () => {
        const badgeStyles = ctx.styles['badgeStyles'];
        expect(hasDefaultVariants(badgeStyles, { variant: 'default' })).toBe(true);
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
