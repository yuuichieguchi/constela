/**
 * Test suite for Container component
 *
 * @constela/ui Container component tests following TDD methodology.
 * These tests verify the Container component structure, params, and styles.
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

describe('Container Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('container');
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

    it('should contain a slot for content', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with containerStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'containerStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['maxWidth', 'className'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: maxWidth', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'maxWidth')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'maxWidth', 'string')).toBe(true);
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
      const containerStyles = ctx.styles['containerStyles'];
      expect(containerStyles).toBeDefined();
      assertValidStylePreset(containerStyles);
    });

    it('should have base classes for common container styles', () => {
      const containerStyles = ctx.styles['containerStyles'];
      expect(containerStyles.base).toBeDefined();
      expect(typeof containerStyles.base).toBe('string');
      expect(containerStyles.base.length).toBeGreaterThan(0);
    });

    it('should include mx-auto in base classes', () => {
      const containerStyles = ctx.styles['containerStyles'];
      expect(containerStyles.base).toContain('mx-auto');
    });

    it('should include px-4 in base classes', () => {
      const containerStyles = ctx.styles['containerStyles'];
      expect(containerStyles.base).toContain('px-4');
    });

    describe('maxWidth variants', () => {
      const maxWidthOptions = ['sm', 'md', 'lg', 'xl', '2xl', 'full'];

      it('should have maxWidth variants', () => {
        const containerStyles = ctx.styles['containerStyles'];
        expect(hasVariants(containerStyles, ['maxWidth'])).toBe(true);
      });

      it.each(maxWidthOptions)('should have %s maxWidth option', (option) => {
        const containerStyles = ctx.styles['containerStyles'];
        expect(hasVariantOptions(containerStyles, 'maxWidth', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default maxWidth set to lg', () => {
        const containerStyles = ctx.styles['containerStyles'];
        expect(hasDefaultVariants(containerStyles, { maxWidth: 'lg' })).toBe(true);
      });
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass maxWidth to StyleExpr', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).toMatchObject({
        expr: 'style',
        props: expect.objectContaining({
          maxWidth: expect.objectContaining({ expr: 'param', name: 'maxWidth' }),
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
