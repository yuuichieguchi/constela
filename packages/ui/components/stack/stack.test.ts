/**
 * Test suite for Stack component
 *
 * @constela/ui Stack component tests following TDD methodology.
 * These tests verify the Stack component structure, params, and styles.
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

describe('Stack Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('stack');
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

    it('should contain a slot for stack items', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with stackStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'stackStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['direction', 'gap', 'align', 'justify', 'className'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: direction', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'direction')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'direction', 'string')).toBe(true);
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

    describe('param: align', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'align')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'align', 'string')).toBe(true);
      });
    });

    describe('param: justify', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'justify')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'justify', 'string')).toBe(true);
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
      const stackStyles = ctx.styles['stackStyles'];
      expect(stackStyles).toBeDefined();
      assertValidStylePreset(stackStyles);
    });

    it('should have base classes for common stack styles', () => {
      const stackStyles = ctx.styles['stackStyles'];
      expect(stackStyles.base).toBeDefined();
      expect(typeof stackStyles.base).toBe('string');
      expect(stackStyles.base.length).toBeGreaterThan(0);
    });

    describe('direction variants', () => {
      const directionOptions = ['row', 'column'];

      it('should have direction variant', () => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariants(stackStyles, ['direction'])).toBe(true);
      });

      it.each(directionOptions)('should have %s direction option', (option) => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariantOptions(stackStyles, 'direction', [option])).toBe(true);
      });
    });

    describe('gap variants', () => {
      const gapOptions = ['none', 'sm', 'md', 'lg'];

      it('should have gap variant', () => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariants(stackStyles, ['gap'])).toBe(true);
      });

      it.each(gapOptions)('should have %s gap option', (option) => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariantOptions(stackStyles, 'gap', [option])).toBe(true);
      });
    });

    describe('align variants', () => {
      const alignOptions = ['start', 'center', 'end', 'stretch'];

      it('should have align variant', () => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariants(stackStyles, ['align'])).toBe(true);
      });

      it.each(alignOptions)('should have %s align option', (option) => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariantOptions(stackStyles, 'align', [option])).toBe(true);
      });
    });

    describe('justify variants', () => {
      const justifyOptions = ['start', 'center', 'end', 'between'];

      it('should have justify variant', () => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariants(stackStyles, ['justify'])).toBe(true);
      });

      it.each(justifyOptions)('should have %s justify option', (option) => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasVariantOptions(stackStyles, 'justify', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default direction set to column', () => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasDefaultVariants(stackStyles, { direction: 'column' })).toBe(true);
      });

      it('should have default gap set to md', () => {
        const stackStyles = ctx.styles['stackStyles'];
        expect(hasDefaultVariants(stackStyles, { gap: 'md' })).toBe(true);
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass direction to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          direction: expect.objectContaining({ expr: 'param', name: 'direction' }),
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

    it('should pass align to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          align: expect.objectContaining({ expr: 'param', name: 'align' }),
        }),
      });
    });

    it('should pass justify to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          justify: expect.objectContaining({ expr: 'param', name: 'justify' }),
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
