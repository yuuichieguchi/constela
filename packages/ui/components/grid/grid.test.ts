/**
 * Test suite for Grid component
 *
 * @constela/ui Grid component tests following TDD methodology.
 * These tests verify the Grid component structure, params, and styles.
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

describe('Grid Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('grid');
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

    it('should contain a slot for grid items', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with gridStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'gridStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['cols', 'gap', 'className'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: cols', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'cols')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'cols', 'string')).toBe(true);
      });
    });

    describe('param: gap', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'gap')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'gap', 'string')).toBe(true);
      });
    });

    describe('param: className', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'className')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'className', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const gridStyles = ctx.styles['gridStyles'];
      expect(gridStyles).toBeDefined();
      assertValidStylePreset(gridStyles);
    });

    it('should have base classes for common grid styles', () => {
      const gridStyles = ctx.styles['gridStyles'];
      expect(gridStyles.base).toBeDefined();
      expect(typeof gridStyles.base).toBe('string');
      expect(gridStyles.base.length).toBeGreaterThan(0);
    });

    describe('cols variant options', () => {
      const colsOptions = ['1', '2', '3', '4', '6', '12'];

      it('should have cols variant', () => {
        const gridStyles = ctx.styles['gridStyles'];
        expect(hasVariants(gridStyles, ['cols'])).toBe(true);
      });

      it.each(colsOptions)('should have %s cols option', (option) => {
        const gridStyles = ctx.styles['gridStyles'];
        expect(hasVariantOptions(gridStyles, 'cols', [option])).toBe(true);
      });
    });

    describe('gap variant options', () => {
      const gapOptions = ['none', 'sm', 'md', 'lg'];

      it('should have gap variant', () => {
        const gridStyles = ctx.styles['gridStyles'];
        expect(hasVariants(gridStyles, ['gap'])).toBe(true);
      });

      it.each(gapOptions)('should have %s gap option', (option) => {
        const gridStyles = ctx.styles['gridStyles'];
        expect(hasVariantOptions(gridStyles, 'gap', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default cols set to "1"', () => {
        const gridStyles = ctx.styles['gridStyles'];
        expect(hasDefaultVariants(gridStyles, { cols: '1' })).toBe(true);
      });

      it('should have default gap set to "md"', () => {
        const gridStyles = ctx.styles['gridStyles'];
        expect(hasDefaultVariants(gridStyles, { gap: 'md' })).toBe(true);
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass cols to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          cols: expect.objectContaining({ expr: 'param', name: 'cols' }),
        }),
      });
    });

    it('should pass gap to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          gap: expect.objectContaining({ expr: 'param', name: 'gap' }),
        }),
      });
    });

    it('should pass className to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          className: expect.objectContaining({ expr: 'param', name: 'className' }),
        }),
      });
    });
  });
});
