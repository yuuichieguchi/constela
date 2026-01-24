/**
 * @constela/ui - Copy-paste UI components for Constela
 *
 * Pre-built, accessible UI components written in Constela JSON DSL.
 */

// Re-export core types needed for component definitions
export type {
  ComponentDef,
  StylePreset,
  ParamDef,
  ViewNode,
  Expression,
} from '@constela/core';

// Re-export validation utilities
export { validateAst } from '@constela/core';

/**
 * Component validation result
 */
export interface ComponentValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Style preset validation result
 */
export interface StyleValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a Constela component definition
 */
export function validateComponent(component: unknown): ComponentValidationResult {
  const errors: string[] = [];

  if (!component || typeof component !== 'object') {
    return { valid: false, errors: ['Component must be an object'] };
  }

  const comp = component as Record<string, unknown>;

  // Check for required view property
  if (!comp['view']) {
    errors.push('Component must have a view property');
  }

  // Validate params if present
  if (comp['params'] !== undefined) {
    if (typeof comp['params'] !== 'object' || comp['params'] === null) {
      errors.push('params must be an object');
    } else {
      const params = comp['params'] as Record<string, unknown>;
      for (const [name, def] of Object.entries(params)) {
        if (!def || typeof def !== 'object') {
          errors.push(`Param "${name}" must be an object`);
          continue;
        }
        const paramDef = def as Record<string, unknown>;
        if (!paramDef['type'] || typeof paramDef['type'] !== 'string') {
          errors.push(`Param "${name}" must have a string type property`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a style preset definition
 */
export function validateStylePreset(preset: unknown): StyleValidationResult {
  const errors: string[] = [];

  if (!preset || typeof preset !== 'object') {
    return { valid: false, errors: ['Style preset must be an object'] };
  }

  const style = preset as Record<string, unknown>;

  // Check for required base property
  if (typeof style['base'] !== 'string') {
    errors.push('Style preset must have a string base property');
  }

  // Validate variants if present
  if (style['variants'] !== undefined) {
    if (typeof style['variants'] !== 'object' || style['variants'] === null) {
      errors.push('variants must be an object');
    } else {
      const variants = style['variants'] as Record<string, unknown>;
      for (const [variantName, variantOptions] of Object.entries(variants)) {
        if (typeof variantOptions !== 'object' || variantOptions === null) {
          errors.push(`Variant "${variantName}" must be an object`);
          continue;
        }
        const options = variantOptions as Record<string, unknown>;
        for (const [optionName, optionValue] of Object.entries(options)) {
          if (typeof optionValue !== 'string') {
            errors.push(`Variant "${variantName}.${optionName}" must be a string`);
          }
        }
      }
    }
  }

  // Validate defaultVariants if present
  if (style['defaultVariants'] !== undefined) {
    if (typeof style['defaultVariants'] !== 'object' || style['defaultVariants'] === null) {
      errors.push('defaultVariants must be an object');
    } else {
      const defaults = style['defaultVariants'] as Record<string, unknown>;
      for (const [name, value] of Object.entries(defaults)) {
        if (typeof value !== 'string') {
          errors.push(`defaultVariants.${name} must be a string`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Button component variant types
 */
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Input component type
 */
export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';

/**
 * Alert component variant types
 */
export type AlertVariant = 'default' | 'destructive';

/**
 * Badge component variant types
 */
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Toast component variant types
 */
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
