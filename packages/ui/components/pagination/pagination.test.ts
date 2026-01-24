/**
 * Test suite for Pagination component
 *
 * @constela/ui Pagination component tests following TDD methodology.
 * These tests verify the Pagination component structure, params, styles, and accessibility.
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

describe('Pagination Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('pagination');
  });

  // ==================== Component Structure Tests ====================

  describe('Component Structure', () => {
    it('should have valid component structure', () => {
      assertValidComponent(ctx.component);
    });

    it('should have nav as root element', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('nav');
    });

    it('should contain a slot for pagination items', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with preset paginationStyles', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'paginationStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['currentPage', 'totalPages', 'size'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: currentPage', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'currentPage')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'currentPage', 'number')).toBe(true);
      });
    });

    describe('param: totalPages', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'totalPages')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'totalPages', 'number')).toBe(true);
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
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const paginationStyles = ctx.styles['paginationStyles'];
      expect(paginationStyles).toBeDefined();
      assertValidStylePreset(paginationStyles);
    });

    it('should have base classes for common pagination styles', () => {
      const paginationStyles = ctx.styles['paginationStyles'];
      expect(paginationStyles.base).toBeDefined();
      expect(typeof paginationStyles.base).toBe('string');
      expect(paginationStyles.base.length).toBeGreaterThan(0);
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const paginationStyles = ctx.styles['paginationStyles'];
        expect(hasVariants(paginationStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const paginationStyles = ctx.styles['paginationStyles'];
        expect(hasVariantOptions(paginationStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const paginationStyles = ctx.styles['paginationStyles'];
        expect(hasDefaultVariants(paginationStyles, { size: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have aria-label="Pagination" on root element', () => {
      const ariaLabel = findPropInView(ctx.component.view, 'aria-label');
      expect(ariaLabel).not.toBeNull();
      // Should be a literal "Pagination" value
      expect(ariaLabel).toMatchObject({
        expr: 'lit',
        value: 'Pagination',
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
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
