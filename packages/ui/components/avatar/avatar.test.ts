/**
 * Test suite for Avatar component
 *
 * @constela/ui Avatar component tests following TDD methodology.
 * These tests verify the Avatar component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
 * - Accessibility attributes (alt for image)
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

describe('Avatar Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('avatar');
  });

  // ==================== Component Structure Tests ====================

  describe('Component Structure', () => {
    it('should have valid component structure', () => {
      assertValidComponent(ctx.component);
    });

    it('should have div as root element (container)', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('div');
    });

    it('should NOT contain a slot (avatar displays image or fallback)', () => {
      expect(hasSlot(ctx.component.view)).toBe(false);
    });

    it('should have className using StyleExpr with avatarStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      // StyleExpr should have expr: 'style' and preset reference
      expect(className).toMatchObject({
        expr: 'style',
        preset: 'avatarStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['src', 'alt', 'fallback', 'size'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: src', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'src')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'src', 'string')).toBe(true);
      });
    });

    describe('param: alt', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'alt')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'alt', 'string')).toBe(true);
      });
    });

    describe('param: fallback', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'fallback')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'fallback', 'string')).toBe(true);
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
      const avatarStyles = ctx.styles['avatarStyles'];
      expect(avatarStyles).toBeDefined();
      assertValidStylePreset(avatarStyles);
    });

    it('should have base classes', () => {
      const avatarStyles = ctx.styles['avatarStyles'];
      expect(avatarStyles.base).toBeDefined();
      expect(typeof avatarStyles.base).toBe('string');
      expect(avatarStyles.base.length).toBeGreaterThan(0);
    });

    it('should include avatar-specific base classes', () => {
      const avatarStyles = ctx.styles['avatarStyles'];
      // Avatar should have relative, rounded-full, overflow-hidden
      expect(avatarStyles.base).toContain('relative');
      expect(avatarStyles.base).toContain('rounded-full');
      expect(avatarStyles.base).toContain('overflow-hidden');
    });

    describe('size options', () => {
      const sizeOptions = ['default', 'sm', 'lg'];

      it('should have size variants', () => {
        const avatarStyles = ctx.styles['avatarStyles'];
        expect(hasVariants(avatarStyles, ['size'])).toBe(true);
      });

      it.each(sizeOptions)('should have %s size option', (option) => {
        const avatarStyles = ctx.styles['avatarStyles'];
        expect(hasVariantOptions(avatarStyles, 'size', [option])).toBe(true);
      });
    });

    describe('default variants', () => {
      it('should have default size set to default', () => {
        const avatarStyles = ctx.styles['avatarStyles'];
        expect(hasDefaultVariants(avatarStyles, { size: 'default' })).toBe(true);
      });
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should support alt attribute for image', () => {
      const alt = findPropInView(ctx.component.view, 'alt');
      expect(alt).not.toBeNull();
      // Should reference the alt param
      expect(alt).toMatchObject({
        expr: 'param',
        name: 'alt',
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

    it('should pass src to image element', () => {
      const src = findPropInView(ctx.component.view, 'src');
      expect(src).not.toBeNull();
      expect(src).toMatchObject({
        expr: 'param',
        name: 'src',
      });
    });
  });
});
