/**
 * Test suite for Breadcrumb component
 *
 * @constela/ui Breadcrumb component tests following TDD methodology.
 * These tests verify the Breadcrumb component structure, params, styles, and accessibility.
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
  hasSlot,
  findPropInView,
  hasAriaAttribute,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Breadcrumb Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('breadcrumb');
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

    it('should have aria-label="Breadcrumb" attribute', () => {
      const ariaLabel = findPropInView(ctx.component.view, 'aria-label');
      expect(ariaLabel).not.toBeNull();
      expect(ariaLabel).toMatchObject({
        expr: 'lit',
        value: 'Breadcrumb',
      });
    });

    it('should contain a slot for breadcrumb items', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with preset breadcrumbStyles', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        name: 'breadcrumbStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['separator'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: separator', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'separator')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'separator', 'string')).toBe(true);
      });

      it('should have default value of "/"', () => {
        const separatorParam = ctx.component.params?.['separator'];
        expect(separatorParam).toBeDefined();
        expect(separatorParam?.default).toBe('/');
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const breadcrumbStyles = ctx.styles['breadcrumbStyles'];
      expect(breadcrumbStyles).toBeDefined();
      assertValidStylePreset(breadcrumbStyles);
    });

    it('should have base classes for common breadcrumb styles', () => {
      const breadcrumbStyles = ctx.styles['breadcrumbStyles'];
      expect(breadcrumbStyles.base).toBeDefined();
      expect(typeof breadcrumbStyles.base).toBe('string');
      expect(breadcrumbStyles.base.length).toBeGreaterThan(0);
    });

    it('should include flex layout classes in base', () => {
      const breadcrumbStyles = ctx.styles['breadcrumbStyles'];
      expect(breadcrumbStyles.base).toMatch(/flex/);
    });

    it('should include items-center class in base', () => {
      const breadcrumbStyles = ctx.styles['breadcrumbStyles'];
      expect(breadcrumbStyles.base).toMatch(/items-center/);
    });

    it('should include gap class in base', () => {
      const breadcrumbStyles = ctx.styles['breadcrumbStyles'];
      expect(breadcrumbStyles.base).toMatch(/gap/);
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have aria-label attribute for screen readers', () => {
      expect(hasAriaAttribute(ctx.component.view, 'aria-label')).toBe(true);
    });

    it('should have aria-label value of "Breadcrumb"', () => {
      const ariaLabel = findPropInView(ctx.component.view, 'aria-label');
      expect(ariaLabel).toMatchObject({
        expr: 'lit',
        value: 'Breadcrumb',
      });
    });

    it('should use nav element for semantic navigation', () => {
      const rootTag = getRootTag(ctx.component);
      expect(rootTag).toBe('nav');
    });
  });
});
