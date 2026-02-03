/**
 * Test suite for Dialog component
 *
 * @constela/ui Dialog component tests following TDD methodology.
 * These tests verify the Dialog component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation
 * - Style preset validation
 * - Accessibility attributes (role="dialog", aria-modal="true")
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
  hasRole,
  hasAriaAttribute,
  type ComponentTestContext,
} from '../../tests/helpers/test-utils.js';

describe('Dialog Component', () => {
  let ctx: ComponentTestContext;

  beforeAll(() => {
    ctx = loadComponentForTesting('dialog');
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

    it('should have role="dialog" attribute', () => {
      expect(hasRole(ctx.component.view, 'dialog')).toBe(true);
    });

    it('should have aria-modal="true" attribute', () => {
      expect(hasAriaAttribute(ctx.component.view, 'aria-modal')).toBe(true);
    });

    it('should contain a slot for dialog content', () => {
      expect(hasSlot(ctx.component.view)).toBe(true);
    });

    it('should have className using StyleExpr with dialogStyles preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        name: 'dialogStyles',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['open', 'title'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: open', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'open')).toBe(true);
      });

      it('should have type boolean', () => {
        expect(hasParamType(ctx.component, 'open', 'boolean')).toBe(true);
      });
    });

    describe('param: title', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'title')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'title', 'string')).toBe(true);
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset', () => {
    it('should have valid style preset structure', () => {
      const dialogStyles = ctx.styles['dialogStyles'];
      expect(dialogStyles).toBeDefined();
      assertValidStylePreset(dialogStyles);
    });

    it('should have base classes for common dialog styles', () => {
      const dialogStyles = ctx.styles['dialogStyles'];
      expect(dialogStyles.base).toBeDefined();
      expect(typeof dialogStyles.base).toBe('string');
      expect(dialogStyles.base.length).toBeGreaterThan(0);
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have role="dialog" for screen readers', () => {
      const role = findPropInView(ctx.component.view, 'role');
      expect(role).not.toBeNull();
      expect(role).toMatchObject({
        expr: 'lit',
        value: 'dialog',
      });
    });

    it('should have aria-modal="true" to indicate modal behavior', () => {
      const ariaModal = findPropInView(ctx.component.view, 'aria-modal');
      expect(ariaModal).not.toBeNull();
      expect(ariaModal).toMatchObject({
        expr: 'lit',
        value: 'true',
      });
    });
  });
});
