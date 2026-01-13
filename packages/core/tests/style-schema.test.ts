/**
 * Style System Schema Validation Tests for @constela/core
 *
 * Phase 4: Style System - Schema Tests
 *
 * Coverage:
 * - Valid styles field passes validation
 * - Valid StyleExpr in className passes validation
 * - Invalid style preset (missing base) fails
 * - Invalid StyleExpr (missing name) fails
 *
 * TDD Red Phase: These tests will FAIL because the schema is not updated.
 */

import { describe, it, expect } from 'vitest';
import { validateAst } from '../src/index.js';

// ==================== Helper to create minimal valid AST ====================

interface MinimalAST {
  version: string;
  state: Record<string, { type: string; initial: unknown }>;
  actions: Array<{ name: string; steps: unknown[] }>;
  view: unknown;
  styles?: Record<string, unknown>;
}

function createAst(overrides: Partial<MinimalAST> = {}): MinimalAST {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  };
}

// ==================== Valid styles Field Tests ====================

describe('validateAst - Valid styles Field', () => {
  describe('Valid Style Presets', () => {
    it('should accept program with minimal style preset (base only)', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2 rounded font-medium',
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept program with style preset containing variants', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
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
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept program with style preset containing defaultVariants', () => {
      // Arrange
      const ast = createAst({
        styles: {
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
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept program with multiple style presets', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2 rounded',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-200',
              },
            },
          },
          card: {
            base: 'p-4 rounded-lg shadow',
            variants: {
              elevation: {
                low: 'shadow-sm',
                high: 'shadow-lg',
              },
            },
          },
          badge: {
            base: 'inline-flex items-center px-2 py-1 rounded-full text-xs',
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept program with empty styles object', () => {
      // Arrange
      const ast = createAst({
        styles: {},
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept program without styles field (optional)', () => {
      // Arrange
      const ast = createAst();
      // No styles field

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Valid StyleExpr in className Tests ====================

describe('validateAst - Valid StyleExpr in className', () => {
  describe('Valid StyleExpr Structure', () => {
    it('should accept style expression with name only', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept style expression with literal variant values', () => {
      // Arrange
      const ast = createAst({
        styles: {
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
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
              variants: {
                variant: { expr: 'lit', value: 'primary' },
                size: { expr: 'lit', value: 'lg' },
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept style expression with state-based variant values', () => {
      // Arrange
      const ast = createAst({
        state: {
          buttonVariant: { type: 'string', initial: 'primary' },
        },
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-200',
              },
            },
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
              variants: {
                variant: { expr: 'state', name: 'buttonVariant' },
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept style expression with var-based variant values', () => {
      // Arrange
      const ast = createAst({
        state: {
          items: { type: 'list', initial: [] },
        },
        styles: {
          listItem: {
            base: 'p-2',
            variants: {
              status: {
                active: 'bg-green-100',
                inactive: 'bg-gray-100',
              },
            },
          },
        },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'li',
            props: {
              className: {
                expr: 'style',
                name: 'listItem',
                variants: {
                  status: { expr: 'var', name: 'item', path: 'status' },
                },
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept style expression with conditional variant', () => {
      // Arrange
      const ast = createAst({
        state: {
          isActive: { type: 'boolean', initial: false },
        },
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
                secondary: 'bg-gray-200',
              },
            },
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
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
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept style expression with empty variants object', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
              variants: {},
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Invalid Style Preset Tests ====================

describe('validateAst - Invalid Style Preset', () => {
  describe('Missing required fields', () => {
    it('should return error for style preset missing base field', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            // missing 'base'
            variants: {
              variant: {
                primary: 'bg-blue-500',
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/styles/button/base');
      }
    });

    it('should return error for style preset with non-string base', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 123, // should be string
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/styles/button/base');
      }
    });

    it('should return error for variant value that is not a string', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 123, // should be string
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/styles/button/variants/variant/primary');
      }
    });

    it('should return error for defaultVariants referencing non-existent variant key', () => {
      // Arrange - semantic validation (may be in analyze pass)
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
              },
            },
            defaultVariants: {
              nonexistent: 'value', // 'nonexistent' is not a defined variant
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert - This might be caught at schema level or analyze level
      // Either SCHEMA_INVALID or a custom semantic error is acceptable
      expect(result.ok).toBe(false);
    });
  });
});

// ==================== Invalid StyleExpr Tests ====================

describe('validateAst - Invalid StyleExpr', () => {
  describe('Missing required fields', () => {
    it('should return error for style expression missing name', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              // missing 'name'
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/props/className/name');
      }
    });

    it('should return error for style expression with non-string name', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 123, // should be string
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/props/className/name');
      }
    });

    it('should return error for style expression with invalid variant expression', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
              },
            },
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
              variants: {
                variant: { expr: 'invalid-expr', value: 'primary' }, // invalid expression type
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/props/className/variants/variant/expr');
      }
    });

    it('should return error for style expression variants that are not expressions', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
              },
            },
          },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'button',
              variants: {
                variant: 'primary', // should be an Expression object, not a string
              },
            },
          },
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
      }
    });
  });

  describe('Nested style expressions', () => {
    it('should return error for invalid style expression in nested element', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'button',
              props: {
                className: {
                  expr: 'style',
                  // missing 'name'
                },
              },
            },
          ],
        },
      });

      // Act
      const result = validateAst(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SCHEMA_INVALID');
        expect(result.error.path).toBe('/view/children/0/props/className/name');
      }
    });
  });
});
