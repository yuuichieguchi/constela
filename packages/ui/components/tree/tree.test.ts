/**
 * Test suite for Tree Component Suite
 *
 * @constela/ui Tree component tests following TDD methodology.
 * These tests verify the Tree (container) and TreeNode (recursive) components
 * structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation (including required params)
 * - Local state validation
 * - Style preset validation
 * - Accessibility attributes (role="tree", role="treeitem", aria-expanded, aria-selected, aria-level)
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
 * Get the path to a component file in the tree directory
 */
function getTreeComponentPath(fileName: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, fileName);
}

/**
 * Load a specific tree sub-component
 */
function loadTreeComponent(componentName: string): ComponentDef {
  const path = getTreeComponentPath(`${componentName}.constela.json`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ComponentDef;
}

/**
 * Load tree styles
 */
function loadTreeStyles(): Record<string, StylePreset> {
  const path = getTreeComponentPath('tree.styles.json');
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
  const actual = component.localState[fieldName].initial;
  // Handle array comparison
  if (Array.isArray(expectedInitial) && Array.isArray(actual)) {
    return JSON.stringify(actual) === JSON.stringify(expectedInitial);
  }
  return actual === expectedInitial;
}

// ==================== Test Contexts ====================

interface TreeTestContext {
  tree: ComponentDef;
  treeNode: ComponentDef;
  styles: Record<string, StylePreset>;
}

describe('Tree Component Suite', () => {
  let ctx: TreeTestContext;

  beforeAll(() => {
    ctx = {
      tree: loadTreeComponent('tree'),
      treeNode: loadTreeComponent('tree-node'),
      styles: loadTreeStyles(),
    };
  });

  // ==================== Tree (Container) Tests ====================

  describe('Tree (Container)', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.tree);
      });

      it('should have ul as root element', () => {
        const rootTag = getRootTag(ctx.tree);
        expect(rootTag).toBe('ul');
      });

      it('should have role="tree" attribute', () => {
        expect(hasRole(ctx.tree.view, 'tree')).toBe(true);
      });

      it('should have className using StyleExpr with treeStyles preset', () => {
        const className = findPropInView(ctx.tree.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          preset: 'treeStyles',
        });
      });

      it('should have aria-multiselectable attribute', () => {
        expect(hasAriaAttribute(ctx.tree.view, 'aria-multiselectable')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['items', 'selectable', 'multiSelect'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.tree, expectedParams)).toBe(true);
      });

      describe('param: items', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.tree, 'items')).toBe(true);
        });

        it('should have type list', () => {
          expect(hasParamType(ctx.tree, 'items', 'list')).toBe(true);
        });
      });

      describe('param: selectable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.tree, 'selectable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.tree, 'selectable', 'boolean')).toBe(true);
        });
      });

      describe('param: multiSelect', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.tree, 'multiSelect')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.tree, 'multiSelect', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Local State Tests ====================

    describe('Local State', () => {
      it('should have expandedNodes local state', () => {
        expect(hasLocalState(ctx.tree, 'expandedNodes')).toBe(true);
      });

      it('should have expandedNodes as list type', () => {
        expect(hasLocalStateType(ctx.tree, 'expandedNodes', 'list')).toBe(true);
      });

      it('should have expandedNodes initial value as empty array', () => {
        expect(hasLocalStateInitial(ctx.tree, 'expandedNodes', [])).toBe(true);
      });

      it('should have selectedNodes local state', () => {
        expect(hasLocalState(ctx.tree, 'selectedNodes')).toBe(true);
      });

      it('should have selectedNodes as list type', () => {
        expect(hasLocalStateType(ctx.tree, 'selectedNodes', 'list')).toBe(true);
      });

      it('should have selectedNodes initial value as empty array', () => {
        expect(hasLocalStateInitial(ctx.tree, 'selectedNodes', [])).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (treeStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeStyles = ctx.styles['treeStyles'];
        expect(treeStyles).toBeDefined();
        assertValidStylePreset(treeStyles);
      });

      it('should have base classes for list-none and spacing', () => {
        const treeStyles = ctx.styles['treeStyles'];
        expect(treeStyles.base).toBeDefined();
        expect(typeof treeStyles.base).toBe('string');
        expect(treeStyles.base).toContain('list-none');
        expect(treeStyles.base).toContain('space-y-1');
      });
    });
  });

  // ==================== TreeNode Tests ====================

  describe('TreeNode', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.treeNode);
      });

      it('should have li as root element', () => {
        const rootTag = getRootTag(ctx.treeNode);
        expect(rootTag).toBe('li');
      });

      it('should have role="treeitem" attribute', () => {
        expect(hasRole(ctx.treeNode.view, 'treeitem')).toBe(true);
      });

      it('should have className using StyleExpr with treeNodeStyles preset', () => {
        const className = findPropInView(ctx.treeNode.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          preset: 'treeNodeStyles',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['node', 'level', 'expandedNodes', 'selectedNodes', 'expanded', 'selected', 'selectable'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.treeNode, expectedParams)).toBe(true);
      });

      describe('param: node', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.treeNode, 'node')).toBe(true);
        });

        it('should have type object', () => {
          expect(hasParamType(ctx.treeNode, 'node', 'object')).toBe(true);
        });
      });

      describe('param: level', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.treeNode, 'level')).toBe(true);
        });

        it('should have type number', () => {
          expect(hasParamType(ctx.treeNode, 'level', 'number')).toBe(true);
        });
      });

      describe('param: expandedNodes', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.treeNode, 'expandedNodes')).toBe(true);
        });

        it('should have type list', () => {
          expect(hasParamType(ctx.treeNode, 'expandedNodes', 'list')).toBe(true);
        });
      });

      describe('param: selectedNodes', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.treeNode, 'selectedNodes')).toBe(true);
        });

        it('should have type list', () => {
          expect(hasParamType(ctx.treeNode, 'selectedNodes', 'list')).toBe(true);
        });
      });

      describe('param: expanded', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.treeNode, 'expanded')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.treeNode, 'expanded', 'boolean')).toBe(true);
        });
      });

      describe('param: selected', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.treeNode, 'selected')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.treeNode, 'selected', 'boolean')).toBe(true);
        });
      });

      describe('param: selectable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.treeNode, 'selectable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.treeNode, 'selectable', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have aria-expanded attribute', () => {
        expect(hasAriaAttribute(ctx.treeNode.view, 'aria-expanded')).toBe(true);
      });

      it('should have aria-selected attribute', () => {
        expect(hasAriaAttribute(ctx.treeNode.view, 'aria-selected')).toBe(true);
      });

      it('should have aria-level attribute', () => {
        expect(hasAriaAttribute(ctx.treeNode.view, 'aria-level')).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (treeNodeStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeNodeStyles = ctx.styles['treeNodeStyles'];
        expect(treeNodeStyles).toBeDefined();
        assertValidStylePreset(treeNodeStyles);
      });

      it('should have base classes with relative positioning', () => {
        const treeNodeStyles = ctx.styles['treeNodeStyles'];
        expect(treeNodeStyles.base).toBeDefined();
        expect(typeof treeNodeStyles.base).toBe('string');
        expect(treeNodeStyles.base).toContain('relative');
      });
    });

    describe('Style Preset (treeNodeContentStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeNodeContentStyles = ctx.styles['treeNodeContentStyles'];
        expect(treeNodeContentStyles).toBeDefined();
        assertValidStylePreset(treeNodeContentStyles);
      });

      it('should have base classes for flex layout with gap and rounded corners', () => {
        const treeNodeContentStyles = ctx.styles['treeNodeContentStyles'];
        expect(treeNodeContentStyles.base).toBeDefined();
        expect(typeof treeNodeContentStyles.base).toBe('string');
        expect(treeNodeContentStyles.base).toContain('flex');
        expect(treeNodeContentStyles.base).toContain('items-center');
        expect(treeNodeContentStyles.base).toContain('gap-1');
        expect(treeNodeContentStyles.base).toContain('rounded-md');
        expect(treeNodeContentStyles.base).toContain('px-2');
        expect(treeNodeContentStyles.base).toContain('py-1');
      });

      describe('variant options', () => {
        const selectedOptions = ['true', 'false'];

        it('should have selected variants', () => {
          const treeNodeContentStyles = ctx.styles['treeNodeContentStyles'];
          expect(hasVariants(treeNodeContentStyles, ['selected'])).toBe(true);
        });

        it.each(selectedOptions)('should have %s selected option', (option) => {
          const treeNodeContentStyles = ctx.styles['treeNodeContentStyles'];
          expect(hasVariantOptions(treeNodeContentStyles, 'selected', [option])).toBe(true);
        });
      });
    });

    describe('Style Preset (treeToggleStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeToggleStyles = ctx.styles['treeToggleStyles'];
        expect(treeToggleStyles).toBeDefined();
        assertValidStylePreset(treeToggleStyles);
      });

      it('should have base classes for inline-flex layout with fixed dimensions', () => {
        const treeToggleStyles = ctx.styles['treeToggleStyles'];
        expect(treeToggleStyles.base).toBeDefined();
        expect(typeof treeToggleStyles.base).toBe('string');
        expect(treeToggleStyles.base).toContain('inline-flex');
        expect(treeToggleStyles.base).toContain('h-4');
        expect(treeToggleStyles.base).toContain('w-4');
        expect(treeToggleStyles.base).toContain('items-center');
        expect(treeToggleStyles.base).toContain('justify-center');
      });
    });

    describe('Style Preset (treeChevronStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeChevronStyles = ctx.styles['treeChevronStyles'];
        expect(treeChevronStyles).toBeDefined();
        assertValidStylePreset(treeChevronStyles);
      });

      it('should have base classes for icon sizing and transition', () => {
        const treeChevronStyles = ctx.styles['treeChevronStyles'];
        expect(treeChevronStyles.base).toBeDefined();
        expect(typeof treeChevronStyles.base).toBe('string');
        expect(treeChevronStyles.base).toContain('h-4');
        expect(treeChevronStyles.base).toContain('w-4');
        expect(treeChevronStyles.base).toContain('shrink-0');
        expect(treeChevronStyles.base).toContain('transition-transform');
      });

      describe('variant options', () => {
        it('should have expanded variants', () => {
          const treeChevronStyles = ctx.styles['treeChevronStyles'];
          expect(hasVariants(treeChevronStyles, ['expanded'])).toBe(true);
        });

        it('should have true expanded option with rotate-90', () => {
          const treeChevronStyles = ctx.styles['treeChevronStyles'];
          expect(hasVariantOptions(treeChevronStyles, 'expanded', ['true'])).toBe(true);
          expect(treeChevronStyles.variants?.expanded?.['true']).toContain('rotate-90');
        });

        it('should have false expanded option with rotate-0', () => {
          const treeChevronStyles = ctx.styles['treeChevronStyles'];
          expect(hasVariantOptions(treeChevronStyles, 'expanded', ['false'])).toBe(true);
          expect(treeChevronStyles.variants?.expanded?.['false']).toContain('rotate-0');
        });
      });

      describe('default variants', () => {
        it('should have default expanded set to false', () => {
          const treeChevronStyles = ctx.styles['treeChevronStyles'];
          expect(hasDefaultVariants(treeChevronStyles, { expanded: 'false' })).toBe(true);
        });
      });
    });

    describe('Style Preset (treeLabelStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeLabelStyles = ctx.styles['treeLabelStyles'];
        expect(treeLabelStyles).toBeDefined();
        assertValidStylePreset(treeLabelStyles);
      });

      it('should have base classes for flex-1 and truncate', () => {
        const treeLabelStyles = ctx.styles['treeLabelStyles'];
        expect(treeLabelStyles.base).toBeDefined();
        expect(typeof treeLabelStyles.base).toBe('string');
        expect(treeLabelStyles.base).toContain('flex-1');
        expect(treeLabelStyles.base).toContain('truncate');
      });

      describe('variant options', () => {
        const selectedOptions = ['true', 'false'];

        it('should have selected variants', () => {
          const treeLabelStyles = ctx.styles['treeLabelStyles'];
          expect(hasVariants(treeLabelStyles, ['selected'])).toBe(true);
        });

        it.each(selectedOptions)('should have %s selected option', (option) => {
          const treeLabelStyles = ctx.styles['treeLabelStyles'];
          expect(hasVariantOptions(treeLabelStyles, 'selected', [option])).toBe(true);
        });
      });
    });

    describe('Style Preset (treeGroupStyles)', () => {
      it('should have valid style preset structure', () => {
        const treeGroupStyles = ctx.styles['treeGroupStyles'];
        expect(treeGroupStyles).toBeDefined();
        assertValidStylePreset(treeGroupStyles);
      });

      it('should have base classes with pl-4 for indentation', () => {
        const treeGroupStyles = ctx.styles['treeGroupStyles'];
        expect(treeGroupStyles.base).toBeDefined();
        expect(typeof treeGroupStyles.base).toBe('string');
        expect(treeGroupStyles.base).toContain('pl-4');
      });
    });
  });
});
