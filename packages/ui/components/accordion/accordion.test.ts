/**
 * Test suite for Accordion Component Suite
 *
 * @constela/ui Accordion component tests following TDD methodology.
 * These tests verify the Accordion, AccordionItem, AccordionTrigger, and AccordionContent
 * components structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation (including required params)
 * - Local state validation
 * - Style preset validation
 * - Accessibility attributes (aria-expanded, aria-controls, role="region")
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
  hasSlot,
  findPropInView,
  hasRole,
  hasAriaAttribute,
} from '../../tests/helpers/test-utils.js';

// ==================== Test Utilities ====================

/**
 * Get the path to a component file in the accordion directory
 */
function getAccordionComponentPath(fileName: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, fileName);
}

/**
 * Load a specific accordion sub-component
 */
function loadAccordionComponent(componentName: string): ComponentDef {
  const path = getAccordionComponentPath(`${componentName}.constela.json`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ComponentDef;
}

/**
 * Load accordion styles
 */
function loadAccordionStyles(): Record<string, StylePreset> {
  const path = getAccordionComponentPath('accordion.styles.json');
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
  return component.localState[fieldName].initial === expectedInitial;
}

// ==================== Test Contexts ====================

interface AccordionTestContext {
  accordion: ComponentDef;
  accordionItem: ComponentDef;
  accordionTrigger: ComponentDef;
  accordionContent: ComponentDef;
  styles: Record<string, StylePreset>;
}

describe('Accordion Component Suite', () => {
  let ctx: AccordionTestContext;

  beforeAll(() => {
    ctx = {
      accordion: loadAccordionComponent('accordion'),
      accordionItem: loadAccordionComponent('accordion-item'),
      accordionTrigger: loadAccordionComponent('accordion-trigger'),
      accordionContent: loadAccordionComponent('accordion-content'),
      styles: loadAccordionStyles(),
    };
  });

  // ==================== Accordion (Container) Tests ====================

  describe('Accordion (Container)', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.accordion);
      });

      it('should have div as root element', () => {
        const rootTag = getRootTag(ctx.accordion);
        expect(rootTag).toBe('div');
      });

      it('should contain a slot for AccordionItems', () => {
        expect(hasSlot(ctx.accordion.view)).toBe(true);
      });

      it('should have className using StyleExpr with accordionStyles preset', () => {
        const className = findPropInView(ctx.accordion.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'accordionStyles',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['type', 'collapsible', 'disabled'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.accordion, expectedParams)).toBe(true);
      });

      describe('param: type', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordion, 'type')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.accordion, 'type', 'string')).toBe(true);
        });
      });

      describe('param: collapsible', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordion, 'collapsible')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.accordion, 'collapsible', 'boolean')).toBe(true);
        });
      });

      describe('param: disabled', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordion, 'disabled')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.accordion, 'disabled', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (accordionStyles)', () => {
      it('should have valid style preset structure', () => {
        const accordionStyles = ctx.styles['accordionStyles'];
        expect(accordionStyles).toBeDefined();
        assertValidStylePreset(accordionStyles);
      });

      it('should have base classes for flex column layout with dividers', () => {
        const accordionStyles = ctx.styles['accordionStyles'];
        expect(accordionStyles.base).toBeDefined();
        expect(typeof accordionStyles.base).toBe('string');
        expect(accordionStyles.base).toContain('flex');
        expect(accordionStyles.base).toContain('flex-col');
      });
    });
  });

  // ==================== AccordionItem Tests ====================

  describe('AccordionItem', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.accordionItem);
      });

      it('should have div as root element', () => {
        const rootTag = getRootTag(ctx.accordionItem);
        expect(rootTag).toBe('div');
      });

      it('should contain a slot for trigger and content', () => {
        expect(hasSlot(ctx.accordionItem.view)).toBe(true);
      });

      it('should have className using StyleExpr with accordionItemStyles preset', () => {
        const className = findPropInView(ctx.accordionItem.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'accordionItemStyles',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['value', 'disabled'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.accordionItem, expectedParams)).toBe(true);
      });

      describe('param: value', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.accordionItem, 'value')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.accordionItem, 'value', 'string')).toBe(true);
        });
      });

      describe('param: disabled', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordionItem, 'disabled')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.accordionItem, 'disabled', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Local State Tests ====================

    describe('Local State', () => {
      it('should have isExpanded local state', () => {
        expect(hasLocalState(ctx.accordionItem, 'isExpanded')).toBe(true);
      });

      it('should have isExpanded as boolean type', () => {
        expect(hasLocalStateType(ctx.accordionItem, 'isExpanded', 'boolean')).toBe(true);
      });

      it('should have isExpanded initial value as false', () => {
        expect(hasLocalStateInitial(ctx.accordionItem, 'isExpanded', false)).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (accordionItemStyles)', () => {
      it('should have valid style preset structure', () => {
        const accordionItemStyles = ctx.styles['accordionItemStyles'];
        expect(accordionItemStyles).toBeDefined();
        assertValidStylePreset(accordionItemStyles);
      });

      it('should have base classes with border-b', () => {
        const accordionItemStyles = ctx.styles['accordionItemStyles'];
        expect(accordionItemStyles.base).toBeDefined();
        expect(typeof accordionItemStyles.base).toBe('string');
        expect(accordionItemStyles.base).toContain('border-b');
      });

      describe('variant options', () => {
        const stateOptions = ['default', 'disabled'];

        it('should have state variants', () => {
          const accordionItemStyles = ctx.styles['accordionItemStyles'];
          expect(hasVariants(accordionItemStyles, ['state'])).toBe(true);
        });

        it.each(stateOptions)('should have %s state option', (option) => {
          const accordionItemStyles = ctx.styles['accordionItemStyles'];
          expect(hasVariantOptions(accordionItemStyles, 'state', [option])).toBe(true);
        });
      });
    });
  });

  // ==================== AccordionTrigger Tests ====================

  describe('AccordionTrigger', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.accordionTrigger);
      });

      it('should have button as root element', () => {
        const rootTag = getRootTag(ctx.accordionTrigger);
        expect(rootTag).toBe('button');
      });

      it('should have type="button" attribute', () => {
        const type = findPropInView(ctx.accordionTrigger.view, 'type');
        expect(type).not.toBeNull();
        expect(type).toMatchObject({
          expr: 'lit',
          value: 'button',
        });
      });

      it('should have className using StyleExpr with accordionTriggerStyles preset', () => {
        const className = findPropInView(ctx.accordionTrigger.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'accordionTriggerStyles',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['contentId', 'disabled'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.accordionTrigger, expectedParams)).toBe(true);
      });

      describe('param: contentId', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordionTrigger, 'contentId')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.accordionTrigger, 'contentId', 'string')).toBe(true);
        });
      });

      describe('param: disabled', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordionTrigger, 'disabled')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.accordionTrigger, 'disabled', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have aria-expanded attribute', () => {
        expect(hasAriaAttribute(ctx.accordionTrigger.view, 'aria-expanded')).toBe(true);
      });

      it('should have aria-controls attribute', () => {
        expect(hasAriaAttribute(ctx.accordionTrigger.view, 'aria-controls')).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (accordionTriggerStyles)', () => {
      it('should have valid style preset structure', () => {
        const accordionTriggerStyles = ctx.styles['accordionTriggerStyles'];
        expect(accordionTriggerStyles).toBeDefined();
        assertValidStylePreset(accordionTriggerStyles);
      });

      it('should have base classes for flex layout with spacing', () => {
        const accordionTriggerStyles = ctx.styles['accordionTriggerStyles'];
        expect(accordionTriggerStyles.base).toBeDefined();
        expect(typeof accordionTriggerStyles.base).toBe('string');
        expect(accordionTriggerStyles.base).toContain('flex');
        expect(accordionTriggerStyles.base).toContain('items-center');
        expect(accordionTriggerStyles.base).toContain('justify-between');
      });

      describe('variant options', () => {
        const stateOptions = ['default', 'disabled', 'hover'];

        it('should have state variants', () => {
          const accordionTriggerStyles = ctx.styles['accordionTriggerStyles'];
          expect(hasVariants(accordionTriggerStyles, ['state'])).toBe(true);
        });

        it.each(stateOptions)('should have %s state option', (option) => {
          const accordionTriggerStyles = ctx.styles['accordionTriggerStyles'];
          expect(hasVariantOptions(accordionTriggerStyles, 'state', [option])).toBe(true);
        });
      });
    });

    describe('Style Preset (accordionChevronStyles)', () => {
      it('should have valid style preset structure', () => {
        const accordionChevronStyles = ctx.styles['accordionChevronStyles'];
        expect(accordionChevronStyles).toBeDefined();
        assertValidStylePreset(accordionChevronStyles);
      });

      it('should have base classes for icon sizing and transition', () => {
        const accordionChevronStyles = ctx.styles['accordionChevronStyles'];
        expect(accordionChevronStyles.base).toBeDefined();
        expect(typeof accordionChevronStyles.base).toBe('string');
        expect(accordionChevronStyles.base).toContain('h-4');
        expect(accordionChevronStyles.base).toContain('w-4');
        expect(accordionChevronStyles.base).toContain('transition-transform');
      });

      describe('variant options', () => {
        it('should have expanded variants', () => {
          const accordionChevronStyles = ctx.styles['accordionChevronStyles'];
          expect(hasVariants(accordionChevronStyles, ['expanded'])).toBe(true);
        });

        it('should have true expanded option with rotate-180', () => {
          const accordionChevronStyles = ctx.styles['accordionChevronStyles'];
          expect(hasVariantOptions(accordionChevronStyles, 'expanded', ['true'])).toBe(true);
          expect(accordionChevronStyles.variants?.expanded?.['true']).toContain('rotate-180');
        });

        it('should have false expanded option with rotate-0', () => {
          const accordionChevronStyles = ctx.styles['accordionChevronStyles'];
          expect(hasVariantOptions(accordionChevronStyles, 'expanded', ['false'])).toBe(true);
          expect(accordionChevronStyles.variants?.expanded?.['false']).toContain('rotate-0');
        });
      });

      describe('default variants', () => {
        it('should have default expanded set to false', () => {
          const accordionChevronStyles = ctx.styles['accordionChevronStyles'];
          expect(hasDefaultVariants(accordionChevronStyles, { expanded: 'false' })).toBe(true);
        });
      });
    });
  });

  // ==================== AccordionContent Tests ====================

  describe('AccordionContent', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.accordionContent);
      });

      it('should have div as root element', () => {
        const rootTag = getRootTag(ctx.accordionContent);
        expect(rootTag).toBe('div');
      });

      it('should have role="region" attribute', () => {
        expect(hasRole(ctx.accordionContent.view, 'region')).toBe(true);
      });

      it('should contain a slot for content', () => {
        expect(hasSlot(ctx.accordionContent.view)).toBe(true);
      });

      it('should have className using StyleExpr with accordionContentStyles preset', () => {
        const className = findPropInView(ctx.accordionContent.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'accordionContentStyles',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['id', 'triggerId'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.accordionContent, expectedParams)).toBe(true);
      });

      describe('param: id', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordionContent, 'id')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.accordionContent, 'id', 'string')).toBe(true);
        });
      });

      describe('param: triggerId', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.accordionContent, 'triggerId')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.accordionContent, 'triggerId', 'string')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="region" for screen readers', () => {
        const role = findPropInView(ctx.accordionContent.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'region',
        });
      });

      it('should have aria-labelledby attribute', () => {
        expect(hasAriaAttribute(ctx.accordionContent.view, 'aria-labelledby')).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (accordionContentStyles)', () => {
      it('should have valid style preset structure', () => {
        const accordionContentStyles = ctx.styles['accordionContentStyles'];
        expect(accordionContentStyles).toBeDefined();
        assertValidStylePreset(accordionContentStyles);
      });

      it('should have base classes for overflow and transition', () => {
        const accordionContentStyles = ctx.styles['accordionContentStyles'];
        expect(accordionContentStyles.base).toBeDefined();
        expect(typeof accordionContentStyles.base).toBe('string');
        expect(accordionContentStyles.base).toContain('overflow-hidden');
        expect(accordionContentStyles.base).toContain('text-sm');
      });

      describe('variant options', () => {
        const stateOptions = ['open', 'closed'];

        it('should have state variants', () => {
          const accordionContentStyles = ctx.styles['accordionContentStyles'];
          expect(hasVariants(accordionContentStyles, ['state'])).toBe(true);
        });

        it.each(stateOptions)('should have %s state option', (option) => {
          const accordionContentStyles = ctx.styles['accordionContentStyles'];
          expect(hasVariantOptions(accordionContentStyles, 'state', [option])).toBe(true);
        });

        it('should have open state with animate-accordion-down', () => {
          const accordionContentStyles = ctx.styles['accordionContentStyles'];
          expect(accordionContentStyles.variants?.state?.['open']).toContain('animate-accordion-down');
        });

        it('should have closed state with animate-accordion-up', () => {
          const accordionContentStyles = ctx.styles['accordionContentStyles'];
          expect(accordionContentStyles.variants?.state?.['closed']).toContain('animate-accordion-up');
        });
      });
    });
  });
});
