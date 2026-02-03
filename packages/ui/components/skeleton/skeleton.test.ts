/**
 * Test suite for Skeleton component
 *
 * @constela/ui Skeleton component tests following TDD methodology.
 * These tests verify the Skeleton component structure, params, and styles.
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
  hasSlot,
  findPropInView,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Skeleton Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('skeleton');
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

    it('should NOT contain a slot (skeleton is self-contained)', () => {
      expect(hasSlot(ctx.component.view)).toBe(false);
    });

    it('should have className using StyleExpr with preset "skeletonStyles"', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        name: 'skeletonStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['width', 'height', 'className'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: width', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'width')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'width', 'string')).toBe(true);
      });
    });

    describe('param: height', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'height')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'height', 'string')).toBe(true);
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
      const skeletonStyles = ctx.styles['skeletonStyles'];
      expect(skeletonStyles).toBeDefined();
      assertValidStylePreset(skeletonStyles);
    });

    it('should have base classes with common skeleton styles', () => {
      const skeletonStyles = ctx.styles['skeletonStyles'];
      expect(skeletonStyles.base).toBeDefined();
      expect(typeof skeletonStyles.base).toBe('string');
      expect(skeletonStyles.base.length).toBeGreaterThan(0);
    });

    it('should include animate-pulse in base classes', () => {
      const skeletonStyles = ctx.styles['skeletonStyles'];
      expect(skeletonStyles.base).toContain('animate-pulse');
    });

    it('should include bg-muted in base classes', () => {
      const skeletonStyles = ctx.styles['skeletonStyles'];
      expect(skeletonStyles.base).toContain('bg-muted');
    });

    it('should include rounded in base classes', () => {
      const skeletonStyles = ctx.styles['skeletonStyles'];
      expect(skeletonStyles.base).toContain('rounded');
    });
  });

  // ==================== View Props Tests ====================

  describe('View Props', () => {
    it('should pass width to style attribute', () => {
      const style = findPropInView(ctx.component.view, 'style');
      expect(style).not.toBeNull();
      // Style object should contain width via obj expression
      expect(style).toMatchObject({
        expr: 'obj',
        props: expect.objectContaining({
          width: expect.objectContaining({ expr: 'param', name: 'width' }),
        }),
      });
    });

    it('should pass height to style attribute', () => {
      const style = findPropInView(ctx.component.view, 'style');
      expect(style).not.toBeNull();
      // Style object should contain height via obj expression
      expect(style).toMatchObject({
        expr: 'obj',
        props: expect.objectContaining({
          height: expect.objectContaining({ expr: 'param', name: 'height' }),
        }),
      });
    });

    it('should pass className to StyleExpr props', () => {
      const className = findPropInView(ctx.component.view, 'className');
      // className uses style expression without variants (direct style reference)
      expect(className).toMatchObject({
        expr: 'style',
        name: 'skeletonStyles',
      });
    });
  });
});
