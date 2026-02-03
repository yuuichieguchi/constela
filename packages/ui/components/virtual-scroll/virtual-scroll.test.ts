/**
 * Test suite for VirtualScroll component
 *
 * @constela/ui VirtualScroll component tests following TDD methodology.
 * These tests verify the VirtualScroll component structure, params, local state,
 * styles, and accessibility for efficient rendering of large lists.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation (including required params)
 * - Local state validation
 * - Style preset validation
 * - Accessibility attributes (role="listbox", aria-setsize, aria-live, tabindex)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef, StylePreset } from '@constela/core';
import {
  assertValidComponent,
  assertValidStylePreset,
  hasParams,
  isOptionalParam,
  hasParamType,
  getRootTag,
  hasVariants,
  hasVariantOptions,
  hasDefaultVariants,
  findPropInView,
  hasRole,
  hasAriaAttribute,
} from '../../tests/helpers/test-utils.js';

// ==================== Test Utilities ====================

/**
 * Get the path to a component file in the virtual-scroll directory
 */
function getVirtualScrollComponentPath(fileName: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, fileName);
}

/**
 * Load virtual-scroll component definition
 */
function loadVirtualScrollComponent(): ComponentDef {
  const path = getVirtualScrollComponentPath('virtual-scroll.constela.json');
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ComponentDef;
}

/**
 * Load virtual-scroll styles
 */
function loadVirtualScrollStyles(): Record<string, StylePreset> {
  const path = getVirtualScrollComponentPath('virtual-scroll.styles.json');
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as Record<string, StylePreset>;
}

/**
 * Check if a param is required (required: true or required not specified)
 */
function isRequiredParam(component: ComponentDef, paramName: string): boolean {
  if (!component.params || !(paramName in component.params)) {
    return false;
  }
  const param = component.params[paramName];
  // In Constela, params are required by default unless explicitly set to false
  return param.required !== false;
}

/**
 * Check if a component has local state with a specific field
 */
function hasLocalState(component: ComponentDef, fieldName: string): boolean {
  if (!component.localState) {
    return false;
  }
  return fieldName in component.localState;
}

/**
 * Check if a local state field has a specific type
 */
function hasLocalStateType(
  component: ComponentDef,
  fieldName: string,
  expectedType: 'string' | 'number' | 'boolean' | 'list' | 'object'
): boolean {
  if (!component.localState || !(fieldName in component.localState)) {
    return false;
  }
  return component.localState[fieldName].type === expectedType;
}

/**
 * Check if a local state field has a specific initial value
 */
function hasLocalStateInitial(
  component: ComponentDef,
  fieldName: string,
  expectedInitial: unknown
): boolean {
  if (!component.localState || !(fieldName in component.localState)) {
    return false;
  }
  const actualInitial = component.localState[fieldName].initial;
  if (Array.isArray(expectedInitial) && Array.isArray(actualInitial)) {
    return JSON.stringify(expectedInitial) === JSON.stringify(actualInitial);
  }
  return actualInitial === expectedInitial;
}

// ==================== Test Context ====================

interface VirtualScrollTestContext {
  component: ComponentDef;
  styles: Record<string, StylePreset>;
}

describe('VirtualScroll Component', () => {
  let ctx: VirtualScrollTestContext;

  beforeAll(() => {
    ctx = {
      component: loadVirtualScrollComponent(),
      styles: loadVirtualScrollStyles(),
    };
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

    it('should have role="listbox" or role="feed" attribute', () => {
      const role = findPropInView(ctx.component.view, 'role');
      expect(role).not.toBeNull();
      expect(role).toMatchObject({
        expr: 'lit',
      });
      // Accept either listbox or feed role
      const roleValue = (role as { value: string }).value;
      expect(['listbox', 'feed']).toContain(roleValue);
    });

    it('should have className using StyleExpr with virtualScrollContainer preset', () => {
      const className = findPropInView(ctx.component.view, 'className');
      expect(className).not.toBeNull();
      expect(className).toMatchObject({
        expr: 'style',
        name: 'virtualScrollContainer',
      });
    });
  });

  // ==================== Params Validation Tests ====================

  describe('Params Validation', () => {
    const expectedParams = ['items', 'itemHeight', 'containerHeight', 'overscan', 'keyField'];

    it('should have all expected params', () => {
      expect(hasParams(ctx.component, expectedParams)).toBe(true);
    });

    describe('param: items', () => {
      it('should be required', () => {
        expect(isRequiredParam(ctx.component, 'items')).toBe(true);
      });

      it('should have type json', () => {
        expect(hasParamType(ctx.component, 'items', 'json')).toBe(true);
      });
    });

    describe('param: itemHeight', () => {
      it('should be required', () => {
        expect(isRequiredParam(ctx.component, 'itemHeight')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'itemHeight', 'number')).toBe(true);
      });
    });

    describe('param: containerHeight', () => {
      it('should be required', () => {
        expect(isRequiredParam(ctx.component, 'containerHeight')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'containerHeight', 'number')).toBe(true);
      });
    });

    describe('param: overscan', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'overscan')).toBe(true);
      });

      it('should have type number', () => {
        expect(hasParamType(ctx.component, 'overscan', 'number')).toBe(true);
      });
    });

    describe('param: keyField', () => {
      it('should be optional', () => {
        expect(isOptionalParam(ctx.component, 'keyField')).toBe(true);
      });

      it('should have type string', () => {
        expect(hasParamType(ctx.component, 'keyField', 'string')).toBe(true);
      });
    });
  });

  // ==================== Local State Tests ====================

  describe('Local State', () => {
    it('should have scrollTop local state', () => {
      expect(hasLocalState(ctx.component, 'scrollTop')).toBe(true);
    });

    it('should have scrollTop as number type', () => {
      expect(hasLocalStateType(ctx.component, 'scrollTop', 'number')).toBe(true);
    });

    it('should have scrollTop with initial value 0', () => {
      expect(hasLocalStateInitial(ctx.component, 'scrollTop', 0)).toBe(true);
    });
  });

  // ==================== Accessibility Tests ====================

  describe('Accessibility', () => {
    it('should have aria-setsize attribute for total number of items', () => {
      expect(hasAriaAttribute(ctx.component.view, 'aria-setsize')).toBe(true);
    });

    it('should have aria-live="polite" for screen reader announcements', () => {
      const ariaLive = findPropInView(ctx.component.view, 'aria-live');
      expect(ariaLive).not.toBeNull();
      expect(ariaLive).toMatchObject({
        expr: 'lit',
        value: 'polite',
      });
    });

    it('should have tabindex="0" for keyboard navigation', () => {
      const tabindex = findPropInView(ctx.component.view, 'tabindex');
      expect(tabindex).not.toBeNull();
      expect(tabindex).toMatchObject({
        expr: 'lit',
        value: '0',
      });
    });
  });

  // ==================== Style Preset Tests ====================

  describe('Style Preset (virtualScrollContainer)', () => {
    it('should have valid style preset structure', () => {
      const virtualScrollContainer = ctx.styles['virtualScrollContainer'];
      expect(virtualScrollContainer).toBeDefined();
      assertValidStylePreset(virtualScrollContainer);
    });

    it('should have base classes containing "relative overflow-hidden"', () => {
      const virtualScrollContainer = ctx.styles['virtualScrollContainer'];
      expect(virtualScrollContainer.base).toBeDefined();
      expect(typeof virtualScrollContainer.base).toBe('string');
      expect(virtualScrollContainer.base).toContain('relative');
      expect(virtualScrollContainer.base).toContain('overflow-hidden');
    });
  });

  describe('Style Preset (virtualScrollViewport)', () => {
    it('should have valid style preset structure', () => {
      const virtualScrollViewport = ctx.styles['virtualScrollViewport'];
      expect(virtualScrollViewport).toBeDefined();
      assertValidStylePreset(virtualScrollViewport);
    });

    it('should have base classes containing "overflow-auto"', () => {
      const virtualScrollViewport = ctx.styles['virtualScrollViewport'];
      expect(virtualScrollViewport.base).toBeDefined();
      expect(typeof virtualScrollViewport.base).toBe('string');
      expect(virtualScrollViewport.base).toContain('overflow-auto');
    });
  });

  describe('Style Preset (virtualScrollSpacer)', () => {
    it('should have valid style preset structure', () => {
      const virtualScrollSpacer = ctx.styles['virtualScrollSpacer'];
      expect(virtualScrollSpacer).toBeDefined();
      assertValidStylePreset(virtualScrollSpacer);
    });

    it('should have base classes for spacer element', () => {
      const virtualScrollSpacer = ctx.styles['virtualScrollSpacer'];
      expect(virtualScrollSpacer.base).toBeDefined();
      expect(typeof virtualScrollSpacer.base).toBe('string');
    });
  });

  describe('Style Preset (virtualScrollContent)', () => {
    it('should have valid style preset structure', () => {
      const virtualScrollContent = ctx.styles['virtualScrollContent'];
      expect(virtualScrollContent).toBeDefined();
      assertValidStylePreset(virtualScrollContent);
    });

    it('should have base classes containing "absolute"', () => {
      const virtualScrollContent = ctx.styles['virtualScrollContent'];
      expect(virtualScrollContent.base).toBeDefined();
      expect(typeof virtualScrollContent.base).toBe('string');
      expect(virtualScrollContent.base).toContain('absolute');
    });
  });

  describe('Style Preset (virtualScrollItem)', () => {
    it('should have valid style preset structure', () => {
      const virtualScrollItem = ctx.styles['virtualScrollItem'];
      expect(virtualScrollItem).toBeDefined();
      assertValidStylePreset(virtualScrollItem);
    });

    it('should have base classes for item wrapper', () => {
      const virtualScrollItem = ctx.styles['virtualScrollItem'];
      expect(virtualScrollItem.base).toBeDefined();
      expect(typeof virtualScrollItem.base).toBe('string');
    });
  });
});
