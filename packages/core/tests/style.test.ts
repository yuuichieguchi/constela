/**
 * Style System Type Tests for @constela/core
 *
 * Phase 4: Style System - Core Type Tests
 *
 * Coverage:
 * - StylePreset type validation
 * - StyleExpr type validation
 * - isStyleExpr type guard
 *
 * TDD Red Phase: These tests will FAIL because the style types are not implemented.
 */

import { describe, it, expect } from 'vitest';

// These imports will fail until the types are implemented
import type { StylePreset, StyleExpr } from '../src/index.js';
import { isStyleExpr } from '../src/index.js';

// ==================== StylePreset Type Tests ====================

describe('StylePreset Type', () => {
  describe('Valid StylePreset Structure', () => {
    it('should accept minimal style preset with only base', () => {
      // Arrange
      const preset: StylePreset = {
        base: 'px-4 py-2 rounded',
      };

      // Assert - TypeScript compilation should succeed
      expect(preset.base).toBe('px-4 py-2 rounded');
    });

    it('should accept style preset with base and variants', () => {
      // Arrange
      const preset: StylePreset = {
        base: 'px-4 py-2 rounded font-medium',
        variants: {
          variant: {
            primary: 'bg-blue-500 text-white',
            secondary: 'bg-gray-200 text-gray-800',
          },
          size: {
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg',
          },
        },
      };

      // Assert
      expect(preset.base).toBeDefined();
      expect(preset.variants).toBeDefined();
      expect(preset.variants?.variant?.primary).toBe('bg-blue-500 text-white');
      expect(preset.variants?.size?.lg).toBe('text-lg');
    });

    it('should accept style preset with defaultVariants', () => {
      // Arrange
      const preset: StylePreset = {
        base: 'px-4 py-2',
        variants: {
          variant: {
            primary: 'bg-blue-500',
            secondary: 'bg-gray-200',
          },
        },
        defaultVariants: {
          variant: 'primary',
        },
      };

      // Assert
      expect(preset.defaultVariants).toBeDefined();
      expect(preset.defaultVariants?.variant).toBe('primary');
    });

    it('should accept style preset with compound variants', () => {
      // Arrange
      const preset: StylePreset = {
        base: 'px-4 py-2',
        variants: {
          variant: {
            primary: 'bg-blue-500',
            secondary: 'bg-gray-200',
          },
          size: {
            sm: 'text-sm',
            lg: 'text-lg',
          },
        },
        compoundVariants: [
          {
            variant: 'primary',
            size: 'lg',
            class: 'uppercase tracking-wide',
          },
        ],
      };

      // Assert
      expect(preset.compoundVariants).toBeDefined();
      expect(preset.compoundVariants?.length).toBe(1);
      expect(preset.compoundVariants?.[0].class).toBe('uppercase tracking-wide');
    });

    it('should accept full style preset with all options', () => {
      // Arrange
      const preset: StylePreset = {
        base: 'inline-flex items-center justify-center rounded-md font-medium',
        variants: {
          variant: {
            default: 'bg-primary text-primary-foreground',
            destructive: 'bg-destructive text-destructive-foreground',
            outline: 'border border-input bg-background',
            secondary: 'bg-secondary text-secondary-foreground',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 hover:underline',
          },
          size: {
            default: 'h-10 px-4 py-2',
            sm: 'h-9 rounded-md px-3',
            lg: 'h-11 rounded-md px-8',
            icon: 'h-10 w-10',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
      };

      // Assert
      expect(preset.base).toContain('inline-flex');
      expect(Object.keys(preset.variants?.variant ?? {}).length).toBe(6);
      expect(Object.keys(preset.variants?.size ?? {}).length).toBe(4);
    });
  });
});

// ==================== StyleExpr Type Tests ====================

describe('StyleExpr Type', () => {
  describe('Valid StyleExpr Structure', () => {
    it('should accept minimal style expression with name only', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
      };

      // Assert
      expect(expr.expr).toBe('style');
      expect(expr.name).toBe('button');
    });

    it('should accept style expression with static variants', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'primary' },
          size: { expr: 'lit', value: 'lg' },
        },
      };

      // Assert
      expect(expr.variants?.variant).toEqual({ expr: 'lit', value: 'primary' });
      expect(expr.variants?.size).toEqual({ expr: 'lit', value: 'lg' });
    });

    it('should accept style expression with dynamic variants from state', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'state', name: 'buttonVariant' },
          size: { expr: 'state', name: 'buttonSize' },
        },
      };

      // Assert
      expect(expr.variants?.variant).toEqual({ expr: 'state', name: 'buttonVariant' });
      expect(expr.variants?.size).toEqual({ expr: 'state', name: 'buttonSize' });
    });

    it('should accept style expression with mixed static and dynamic variants', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'primary' },
          size: { expr: 'var', name: 'item', path: 'size' },
        },
      };

      // Assert
      expect(expr.variants?.variant).toEqual({ expr: 'lit', value: 'primary' });
      expect(expr.variants?.size).toEqual({ expr: 'var', name: 'item', path: 'size' });
    });

    it('should accept style expression with conditional variant', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: {
            expr: 'cond',
            if: { expr: 'state', name: 'isActive' },
            then: { expr: 'lit', value: 'primary' },
            else: { expr: 'lit', value: 'secondary' },
          },
        },
      };

      // Assert
      expect(expr.variants?.variant?.expr).toBe('cond');
    });
  });
});

// ==================== isStyleExpr Type Guard Tests ====================

describe('isStyleExpr Type Guard', () => {
  describe('Valid Style Expressions', () => {
    it('should return true for minimal valid style expression', () => {
      // Arrange
      const expr = { expr: 'style', name: 'button' };

      // Act
      const result = isStyleExpr(expr);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for style expression with variants', () => {
      // Arrange
      const expr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'primary' },
        },
      };

      // Act
      const result = isStyleExpr(expr);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for style expression with empty variants object', () => {
      // Arrange
      const expr = {
        expr: 'style',
        name: 'button',
        variants: {},
      };

      // Act
      const result = isStyleExpr(expr);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Invalid Style Expressions', () => {
    it('should return false for null', () => {
      expect(isStyleExpr(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isStyleExpr(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isStyleExpr('style')).toBe(false);
      expect(isStyleExpr(42)).toBe(false);
      expect(isStyleExpr(true)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isStyleExpr([])).toBe(false);
    });

    it('should return false for object without expr field', () => {
      // Arrange
      const expr = { name: 'button' };

      // Act & Assert
      expect(isStyleExpr(expr)).toBe(false);
    });

    it('should return false for object with wrong expr value', () => {
      // Arrange
      const expr = { expr: 'state', name: 'button' };

      // Act & Assert
      expect(isStyleExpr(expr)).toBe(false);
    });

    it('should return false for object without name field', () => {
      // Arrange
      const expr = { expr: 'style' };

      // Act & Assert
      expect(isStyleExpr(expr)).toBe(false);
    });

    it('should return false for object with non-string name', () => {
      // Arrange
      const expr = { expr: 'style', name: 123 };

      // Act & Assert
      expect(isStyleExpr(expr)).toBe(false);
    });

    it('should return false for other expression types', () => {
      expect(isStyleExpr({ expr: 'lit', value: 'hello' })).toBe(false);
      expect(isStyleExpr({ expr: 'state', name: 'count' })).toBe(false);
      expect(isStyleExpr({ expr: 'var', name: 'item' })).toBe(false);
      expect(isStyleExpr({
        expr: 'bin',
        op: '+',
        left: { expr: 'lit', value: 1 },
        right: { expr: 'lit', value: 2 },
      })).toBe(false);
    });
  });
});
