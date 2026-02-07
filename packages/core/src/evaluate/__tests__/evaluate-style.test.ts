/**
 * Test module for the unified evaluateStyle() function.
 *
 * Coverage:
 * - Returns base classes for preset without variants
 * - Applies variant classes based on expression values
 * - Uses default variants when not specified
 * - Returns empty string when preset not found
 * - Handles compound variants (future)
 *
 * TDD Red Phase: ALL tests MUST FAIL because the module does not exist yet.
 */

import { describe, it, expect } from 'vitest';

import type { CoreEvaluationContext, StateReader } from '../index.js';
import { evaluateStyle } from '../index.js';

// ==================== Test Helpers ====================

function makeCtx(overrides?: Partial<CoreEvaluationContext>): CoreEvaluationContext {
  const stateMap = new Map<string, unknown>();
  return {
    state: { get: (name: string) => stateMap.get(name) },
    locals: {},
    env: {
      resolveRef: () => null,
      resolveValidity: () => false,
      resolveGlobal: () => undefined,
    },
    ...overrides,
  };
}

function makeStateReader(entries: Record<string, unknown>): StateReader {
  const map = new Map<string, unknown>(Object.entries(entries));
  return { get: (name: string) => map.get(name) };
}

// ==================== evaluateStyle ====================

describe('evaluateStyle', () => {
  // ==================== Base Classes ====================

  describe('base classes', () => {
    it('should return base classes for a preset without variants', () => {
      const ctx = makeCtx({
        styles: {
          button: {
            base: 'px-4 py-2 rounded',
          },
        },
      });
      const result = evaluateStyle(
        { expr: 'style', name: 'button' },
        ctx,
      );
      expect(result).toBe('px-4 py-2 rounded');
    });

    it('should trim the result', () => {
      const ctx = makeCtx({
        styles: {
          card: {
            base: '  border shadow  ',
          },
        },
      });
      const result = evaluateStyle(
        { expr: 'style', name: 'card' },
        ctx,
      );
      expect(result).toBe('border shadow');
    });
  });

  // ==================== Variant Classes ====================

  describe('variant classes', () => {
    it('should apply variant classes based on expression values', () => {
      const ctx = makeCtx({
        styles: {
          button: {
            base: 'btn',
            variants: {
              size: {
                sm: 'text-sm',
                md: 'text-md',
                lg: 'text-lg',
              },
              color: {
                red: 'bg-red',
                blue: 'bg-blue',
              },
            },
          },
        },
      });
      const result = evaluateStyle(
        {
          expr: 'style',
          name: 'button',
          variants: {
            size: { expr: 'lit', value: 'lg' },
            color: { expr: 'lit', value: 'blue' },
          },
        },
        ctx,
      );
      expect(result).toBe('btn text-lg bg-blue');
    });

    it('should skip variants whose expression evaluates to null/undefined', () => {
      const ctx = makeCtx({
        styles: {
          button: {
            base: 'btn',
            variants: {
              size: {
                sm: 'text-sm',
                md: 'text-md',
              },
            },
          },
        },
      });
      const result = evaluateStyle(
        {
          expr: 'style',
          name: 'button',
          variants: {
            size: { expr: 'lit', value: null },
          },
        },
        ctx,
      );
      expect(result).toBe('btn');
    });

    it('should handle variant value not matching any defined variant', () => {
      const ctx = makeCtx({
        styles: {
          button: {
            base: 'btn',
            variants: {
              size: {
                sm: 'text-sm',
                md: 'text-md',
              },
            },
          },
        },
      });
      const result = evaluateStyle(
        {
          expr: 'style',
          name: 'button',
          variants: {
            size: { expr: 'lit', value: 'xl' },
          },
        },
        ctx,
      );
      // xl is not defined, so no variant classes added
      expect(result).toBe('btn');
    });
  });

  // ==================== Default Variants ====================

  describe('default variants', () => {
    it('should use default variants when variant not specified in expression', () => {
      const ctx = makeCtx({
        styles: {
          button: {
            base: 'btn',
            variants: {
              size: {
                sm: 'text-sm',
                md: 'text-md',
                lg: 'text-lg',
              },
            },
            defaultVariants: {
              size: 'md',
            },
          },
        },
      });
      const result = evaluateStyle(
        { expr: 'style', name: 'button' },
        ctx,
      );
      expect(result).toBe('btn text-md');
    });

    it('should override default variant when expression provides a value', () => {
      const ctx = makeCtx({
        styles: {
          button: {
            base: 'btn',
            variants: {
              size: {
                sm: 'text-sm',
                md: 'text-md',
                lg: 'text-lg',
              },
            },
            defaultVariants: {
              size: 'md',
            },
          },
        },
      });
      const result = evaluateStyle(
        {
          expr: 'style',
          name: 'button',
          variants: {
            size: { expr: 'lit', value: 'lg' },
          },
        },
        ctx,
      );
      expect(result).toBe('btn text-lg');
    });
  });

  // ==================== Preset Not Found ====================

  describe('preset not found', () => {
    it('should return empty string when preset does not exist', () => {
      const ctx = makeCtx({ styles: {} });
      const result = evaluateStyle(
        { expr: 'style', name: 'nonexistent' },
        ctx,
      );
      expect(result).toBe('');
    });

    it('should return empty string when styles is undefined', () => {
      const ctx = makeCtx();
      const result = evaluateStyle(
        { expr: 'style', name: 'button' },
        ctx,
      );
      expect(result).toBe('');
    });
  });

  // ==================== Dynamic Variant from State ====================

  describe('dynamic variant from state', () => {
    it('should resolve variant value from state expression', () => {
      const ctx = makeCtx({
        state: makeStateReader({ theme: 'dark' }),
        styles: {
          card: {
            base: 'rounded shadow',
            variants: {
              theme: {
                light: 'bg-white text-black',
                dark: 'bg-gray-900 text-white',
              },
            },
          },
        },
      });
      const result = evaluateStyle(
        {
          expr: 'style',
          name: 'card',
          variants: {
            theme: { expr: 'state', name: 'theme' },
          },
        },
        ctx,
      );
      expect(result).toBe('rounded shadow bg-gray-900 text-white');
    });
  });
});
