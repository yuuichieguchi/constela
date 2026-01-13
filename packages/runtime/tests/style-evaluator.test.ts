/**
 * Style Evaluator Tests for @constela/runtime
 *
 * Phase 4: Style System - Runtime Evaluation Tests
 *
 * Coverage:
 * - Style expression evaluates to base classes
 * - Style expression with variant adds variant classes
 * - Default variants applied when not specified
 * - Dynamic variant expression evaluation
 * - Multiple variants combine correctly
 *
 * TDD Red Phase: These tests will FAIL because the style evaluator is not implemented.
 */

import { describe, it, expect } from 'vitest';

// These imports will fail until the runtime is implemented
// Using ../src (not ../../src) since this test is in tests/ not tests/subdir/
import { evaluateStyle } from '../src/expression/evaluator.js';
import type { EvaluationContext } from '../src/expression/evaluator.js';
import type { StyleExpr } from '@constela/core';
import { createStateStore } from '../src/state/store.js';

// ==================== Helper Functions ====================

interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<Record<string, string> & { class: string }>;
}

function createContext(
  stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
  locals: Record<string, unknown> = {},
  styles: Record<string, StylePreset> = {}
): EvaluationContext & { styles: Record<string, StylePreset> } {
  return {
    state: createStateStore(stateDefinitions),
    locals,
    styles,
  };
}

// ==================== Base Classes Tests ====================

describe('evaluateStyle - Base Classes', () => {
  describe('Style expression evaluates to base classes', () => {
    it('should return only base classes when no variants specified', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2 rounded font-medium',
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 rounded font-medium');
    });

    it('should return only base classes when variants object is empty', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {},
      };
      const context = createContext({}, {}, {
        button: {
          base: 'inline-flex items-center',
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('inline-flex items-center');
    });

    it('should handle base with multiple space-separated classes', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'card',
      };
      const context = createContext({}, {}, {
        card: {
          base: 'p-4 rounded-lg shadow-md bg-white border border-gray-200',
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('p-4 rounded-lg shadow-md bg-white border border-gray-200');
    });

    it('should handle empty base string', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'minimal',
      };
      const context = createContext({}, {}, {
        minimal: {
          base: '',
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('');
    });
  });
});

// ==================== Variant Classes Tests ====================

describe('evaluateStyle - Variant Classes', () => {
  describe('Style expression with variant adds variant classes', () => {
    it('should add single variant classes to base', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'primary' },
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2 rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200 text-gray-800',
            },
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 rounded bg-blue-500 text-white');
    });

    it('should handle variant value that does not exist (returns base only)', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'nonexistent' },
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2',
          variants: {
            variant: {
              primary: 'bg-blue-500',
            },
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      // When variant value doesn't exist, only base is returned
      expect(result).toBe('px-4 py-2');
    });

    it('should handle undefined variant value (returns base only)', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'state', name: 'undefinedState' },
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2',
          variants: {
            variant: {
              primary: 'bg-blue-500',
            },
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2');
    });
  });
});

// ==================== Default Variants Tests ====================

describe('evaluateStyle - Default Variants', () => {
  describe('Default variants applied when not specified', () => {
    it('should apply default variant when no variants specified in expression', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2 rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200 text-gray-800',
            },
          },
          defaultVariants: {
            variant: 'primary',
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 rounded bg-blue-500 text-white');
    });

    it('should apply multiple default variants', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2',
          variants: {
            variant: {
              primary: 'bg-blue-500',
              secondary: 'bg-gray-200',
            },
            size: {
              sm: 'text-sm',
              md: 'text-base',
              lg: 'text-lg',
            },
          },
          defaultVariants: {
            variant: 'primary',
            size: 'md',
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-base');
    });

    it('should override default variant with explicit variant', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'secondary' }, // override default
        },
      };
      const context = createContext({}, {}, {
        button: {
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
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 bg-gray-200');
    });

    it('should apply partial defaults when some variants specified', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          size: { expr: 'lit', value: 'lg' }, // only size specified
        },
      };
      const context = createContext({}, {}, {
        button: {
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
          defaultVariants: {
            variant: 'primary', // this should still apply
            size: 'sm',         // this should be overridden
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-lg');
    });

    it('should handle missing defaultVariants gracefully', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
      };
      const context = createContext({}, {}, {
        button: {
          base: 'px-4 py-2',
          variants: {
            variant: {
              primary: 'bg-blue-500',
            },
          },
          // no defaultVariants
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2');
    });
  });
});

// ==================== Dynamic Variant Expression Tests ====================

describe('evaluateStyle - Dynamic Variant Expression', () => {
  describe('Dynamic variant expression evaluation', () => {
    it('should evaluate state-based variant expression', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'state', name: 'buttonVariant' },
        },
      };
      const context = createContext(
        { buttonVariant: { type: 'string', initial: 'secondary' } },
        {},
        {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-200',
              },
            },
          },
        }
      );

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 bg-gray-200');
    });

    it('should evaluate var-based variant expression from locals', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'listItem',
        variants: {
          status: { expr: 'var', name: 'item', path: 'status' },
        },
      };
      const context = createContext(
        {},
        { item: { status: 'active', name: 'Item 1' } },
        {
          listItem: {
            base: 'p-2 border-b',
            variants: {
              status: {
                active: 'bg-green-100',
                inactive: 'bg-gray-100',
              },
            },
          },
        }
      );

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('p-2 border-b bg-green-100');
    });

    it('should evaluate conditional variant expression', () => {
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
      const context = createContext(
        { isActive: { type: 'boolean', initial: true } },
        {},
        {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500 text-white',
                secondary: 'bg-gray-200 text-gray-800',
              },
            },
          },
        }
      );

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white');
    });

    it('should update result when state changes', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'state', name: 'buttonVariant' },
        },
      };
      const context = createContext(
        { buttonVariant: { type: 'string', initial: 'primary' } },
        {},
        {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-200',
              },
            },
          },
        }
      );

      // Act - first evaluation
      const result1 = evaluateStyle(expr, context);
      expect(result1).toBe('px-4 py-2 bg-blue-500');

      // Update state
      context.state.set('buttonVariant', 'secondary');

      // Act - second evaluation
      const result2 = evaluateStyle(expr, context);

      // Assert
      expect(result2).toBe('px-4 py-2 bg-gray-200');
    });
  });
});

// ==================== Multiple Variants Tests ====================

describe('evaluateStyle - Multiple Variants', () => {
  describe('Multiple variants combine correctly', () => {
    it('should combine two variants with base', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'primary' },
          size: { expr: 'lit', value: 'lg' },
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'rounded font-medium',
          variants: {
            variant: {
              primary: 'bg-blue-500 text-white',
              secondary: 'bg-gray-200 text-gray-800',
            },
            size: {
              sm: 'px-2 py-1 text-sm',
              md: 'px-4 py-2 text-base',
              lg: 'px-6 py-3 text-lg',
            },
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('rounded font-medium bg-blue-500 text-white px-6 py-3 text-lg');
    });

    it('should combine three variants with base', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'outline' },
          size: { expr: 'lit', value: 'md' },
          rounded: { expr: 'lit', value: 'full' },
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'font-medium',
          variants: {
            variant: {
              solid: 'bg-blue-500 text-white',
              outline: 'border border-blue-500 text-blue-500',
            },
            size: {
              sm: 'px-2 py-1 text-sm',
              md: 'px-4 py-2 text-base',
            },
            rounded: {
              none: 'rounded-none',
              sm: 'rounded-sm',
              full: 'rounded-full',
            },
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('font-medium border border-blue-500 text-blue-500 px-4 py-2 text-base rounded-full');
    });

    it('should handle partial variants (some specified, some default)', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          variant: { expr: 'lit', value: 'destructive' },
          // size not specified, should use default
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500',
              destructive: 'bg-red-500',
            },
            size: {
              sm: 'text-sm',
              md: 'text-base',
            },
          },
          defaultVariants: {
            variant: 'primary',
            size: 'md',
          },
        },
      });

      // Act
      const result = evaluateStyle(expr, context);

      // Assert
      expect(result).toBe('rounded bg-red-500 text-base');
    });

    it('should maintain consistent class order', () => {
      // Arrange
      const expr: StyleExpr = {
        expr: 'style',
        name: 'button',
        variants: {
          size: { expr: 'lit', value: 'lg' },
          variant: { expr: 'lit', value: 'primary' },
        },
      };
      const context = createContext({}, {}, {
        button: {
          base: 'rounded',
          variants: {
            variant: {
              primary: 'bg-blue-500',
            },
            size: {
              lg: 'text-lg',
            },
          },
        },
      });

      // Act - Run multiple times
      const results = [
        evaluateStyle(expr, context),
        evaluateStyle(expr, context),
        evaluateStyle(expr, context),
      ];

      // Assert - All results should be identical
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });
});

// ==================== Edge Cases Tests ====================

describe('evaluateStyle - Edge Cases', () => {
  it('should handle empty variants object in style definition', () => {
    // Arrange
    const expr: StyleExpr = {
      expr: 'style',
      name: 'button',
      variants: {
        variant: { expr: 'lit', value: 'primary' },
      },
    };
    const context = createContext({}, {}, {
      button: {
        base: 'px-4 py-2',
        variants: {}, // empty variants
      },
    });

    // Act
    const result = evaluateStyle(expr, context);

    // Assert
    expect(result).toBe('px-4 py-2');
  });

  it('should handle whitespace in class strings', () => {
    // Arrange
    const expr: StyleExpr = {
      expr: 'style',
      name: 'button',
      variants: {
        variant: { expr: 'lit', value: 'primary' },
      },
    };
    const context = createContext({}, {}, {
      button: {
        base: '  px-4   py-2  ',
        variants: {
          variant: {
            primary: '  bg-blue-500  ',
          },
        },
      },
    });

    // Act
    const result = evaluateStyle(expr, context);

    // Assert - Should trim and normalize whitespace
    expect(result.includes('px-4')).toBe(true);
    expect(result.includes('py-2')).toBe(true);
    expect(result.includes('bg-blue-500')).toBe(true);
  });

  it('should return undefined when style name not found', () => {
    // Arrange
    const expr: StyleExpr = {
      expr: 'style',
      name: 'nonexistent',
    };
    const context = createContext({}, {}, {
      button: {
        base: 'px-4 py-2',
      },
    });

    // Act
    const result = evaluateStyle(expr, context);

    // Assert
    expect(result).toBeUndefined();
  });

  it('should return undefined when styles not defined in context', () => {
    // Arrange
    const expr: StyleExpr = {
      expr: 'style',
      name: 'button',
    };
    const context = createContext({}, {}, {}); // empty styles

    // Act
    const result = evaluateStyle(expr, context);

    // Assert
    expect(result).toBeUndefined();
  });
});
