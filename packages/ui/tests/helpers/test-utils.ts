/**
 * Test utilities for @constela/ui component testing
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef, StylePreset, ViewNode, ParamDef } from '@constela/core';
import { validateComponent, validateStylePreset } from '../../src/index.js';

/**
 * Get the path to a component file
 */
export function getComponentPath(componentName: string, fileName: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '..', '..', 'components', componentName, fileName);
}

/**
 * Load and parse a component JSON file
 */
export function loadComponent(componentName: string): ComponentDef {
  const path = getComponentPath(componentName, `${componentName}.constela.json`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ComponentDef;
}

/**
 * Load and parse a component's style preset file
 */
export function loadStyles(componentName: string): Record<string, StylePreset> {
  const path = getComponentPath(componentName, `${componentName}.styles.json`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as Record<string, StylePreset>;
}

/**
 * Assert that a component has a valid structure
 */
export function assertValidComponent(component: unknown): asserts component is ComponentDef {
  const result = validateComponent(component);
  if (!result.valid) {
    throw new Error(`Invalid component: ${result.errors.join(', ')}`);
  }
}

/**
 * Assert that a style preset has a valid structure
 */
export function assertValidStylePreset(preset: unknown): asserts preset is StylePreset {
  const result = validateStylePreset(preset);
  if (!result.valid) {
    throw new Error(`Invalid style preset: ${result.errors.join(', ')}`);
  }
}

/**
 * Check if a component has specific params
 */
export function hasParams(
  component: ComponentDef,
  expectedParams: string[]
): boolean {
  if (!component.params) {
    return expectedParams.length === 0;
  }
  return expectedParams.every((param) => param in component.params!);
}

/**
 * Check if a param is optional (required: false)
 */
export function isOptionalParam(component: ComponentDef, paramName: string): boolean {
  if (!component.params || !(paramName in component.params)) {
    return false;
  }
  const param = component.params[paramName];
  return param.required === false;
}

/**
 * Check if a param has a specific type
 */
export function hasParamType(
  component: ComponentDef,
  paramName: string,
  expectedType: ParamDef['type']
): boolean {
  if (!component.params || !(paramName in component.params)) {
    return false;
  }
  return component.params[paramName].type === expectedType;
}

/**
 * Get the root element tag from a component's view
 */
export function getRootTag(component: ComponentDef): string | null {
  const view = component.view;
  if (view.kind === 'element') {
    return view.tag;
  }
  return null;
}

/**
 * Check if a style preset has specific variants
 */
export function hasVariants(
  preset: StylePreset,
  expectedVariants: string[]
): boolean {
  if (!preset.variants) {
    return expectedVariants.length === 0;
  }
  return expectedVariants.every((variant) => variant in preset.variants!);
}

/**
 * Check if a style preset has specific variant options
 */
export function hasVariantOptions(
  preset: StylePreset,
  variantName: string,
  expectedOptions: string[]
): boolean {
  if (!preset.variants || !(variantName in preset.variants)) {
    return expectedOptions.length === 0;
  }
  const variantOptions = preset.variants[variantName];
  return expectedOptions.every((option) => option in variantOptions);
}

/**
 * Check if a style preset has default variants
 */
export function hasDefaultVariants(
  preset: StylePreset,
  expectedDefaults: Record<string, string>
): boolean {
  if (!preset.defaultVariants) {
    return Object.keys(expectedDefaults).length === 0;
  }
  return Object.entries(expectedDefaults).every(
    ([key, value]) => preset.defaultVariants![key] === value
  );
}

/**
 * Find a prop in the view tree
 */
export function findPropInView(
  view: ViewNode,
  propName: string
): unknown | null {
  if (view.kind === 'element') {
    if (view.props && propName in view.props) {
      return view.props[propName];
    }
    if (view.children) {
      for (const child of view.children) {
        const found = findPropInView(child, propName);
        if (found !== null) {
          return found;
        }
      }
    }
  } else if (view.kind === 'if') {
    const found = findPropInView(view.then, propName);
    if (found !== null) return found;
    if (view.else) {
      return findPropInView(view.else, propName);
    }
  } else if (view.kind === 'each') {
    return findPropInView(view.body, propName);
  }
  return null;
}

/**
 * Check if view contains a slot
 */
export function hasSlot(view: ViewNode): boolean {
  if (view.kind === 'slot') {
    return true;
  }
  if (view.kind === 'element' && view.children) {
    return view.children.some((child) => hasSlot(child));
  }
  if (view.kind === 'if') {
    if (hasSlot(view.then)) return true;
    if (view.else && hasSlot(view.else)) return true;
  }
  if (view.kind === 'each') {
    return hasSlot(view.body);
  }
  if (view.kind === 'portal') {
    return view.children.some((child) => hasSlot(child));
  }
  return false;
}

/**
 * Check if view has an ARIA attribute
 */
export function hasAriaAttribute(view: ViewNode, attribute: string): boolean {
  const ariaName = attribute.startsWith('aria-') ? attribute : `aria-${attribute}`;
  return findPropInView(view, ariaName) !== null;
}

/**
 * Check if view has a role attribute
 */
export function hasRole(view: ViewNode, role?: string): boolean {
  const foundRole = findPropInView(view, 'role');
  if (foundRole === null) return false;
  if (role === undefined) return true;
  // Check if role matches expected value
  if (typeof foundRole === 'object' && foundRole !== null) {
    const expr = foundRole as { expr?: string; value?: string };
    if (expr.expr === 'lit' && expr.value === role) return true;
    if (expr.expr === 'param') return true; // Dynamic role from param
  }
  return false;
}

/**
 * Component test context for use in tests
 */
export interface ComponentTestContext {
  component: ComponentDef;
  styles: Record<string, StylePreset>;
}

/**
 * Load a component and its styles for testing
 */
export function loadComponentForTesting(componentName: string): ComponentTestContext {
  return {
    component: loadComponent(componentName),
    styles: loadStyles(componentName),
  };
}
