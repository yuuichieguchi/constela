/**
 * Analyze Pass Tests - Style System for @constela/compiler
 *
 * Phase 4: Style System - Compiler Analysis Tests
 *
 * Coverage:
 * - Undefined style reference produces error
 * - Undefined variant key produces error
 * - Error includes suggestion for typo
 * - Valid style reference passes
 *
 * TDD Red Phase: These tests will FAIL because style analysis is not implemented.
 */

import { describe, it, expect } from 'vitest';

// Import compile function to trigger full pipeline including analyze pass
import { compile } from '../../src/index.js';

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

// ==================== Undefined Style Reference Tests ====================

describe('analyzePass - Undefined Style Reference', () => {
  describe('Style name not found', () => {
    it('should return UNDEFINED_STYLE error when style name does not exist', () => {
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
              name: 'nonexistent', // 'nonexistent' is not defined in styles
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
        expect(styleError).toBeDefined();
        expect(styleError?.message).toContain('nonexistent');
      }
    });

    it('should return UNDEFINED_STYLE error with correct path', () => {
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
                  name: 'missing',
                },
              },
            },
          ],
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
        expect(styleError).toBeDefined();
        expect(styleError?.path).toContain('/view/children/0/props/className');
      }
    });

    it('should return UNDEFINED_STYLE error when styles field is empty', () => {
      // Arrange
      const ast = createAst({
        styles: {},
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
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
        expect(styleError).toBeDefined();
      }
    });

    it('should return UNDEFINED_STYLE error when styles field is not defined', () => {
      // Arrange
      const ast = createAst({
        // no styles field
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
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find(
          (e) => e.code === 'UNDEFINED_STYLE' || e.code === 'STYLES_NOT_DEFINED'
        );
        expect(styleError).toBeDefined();
      }
    });
  });
});

// ==================== Undefined Variant Key Tests ====================

describe('analyzePass - Undefined Variant Key', () => {
  describe('Variant key not found in style preset', () => {
    it('should return UNDEFINED_VARIANT error when variant key does not exist', () => {
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
                size: { expr: 'lit', value: 'lg' }, // 'size' is not defined in button variants
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const variantError = result.errors.find((e) => e.code === 'UNDEFINED_VARIANT');
        expect(variantError).toBeDefined();
        expect(variantError?.message).toContain('size');
        expect(variantError?.message).toContain('button');
      }
    });

    it('should return UNDEFINED_VARIANT error with correct path', () => {
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
                nonexistent: { expr: 'lit', value: 'value' },
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const variantError = result.errors.find((e) => e.code === 'UNDEFINED_VARIANT');
        expect(variantError).toBeDefined();
        expect(variantError?.path).toContain('/view/props/className/variants/nonexistent');
      }
    });

    it('should return UNDEFINED_VARIANT when style has no variants defined but variants used', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            // no variants defined
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
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const variantError = result.errors.find((e) => e.code === 'UNDEFINED_VARIANT');
        expect(variantError).toBeDefined();
      }
    });

    it('should detect multiple undefined variants', () => {
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
                size: { expr: 'lit', value: 'lg' },      // undefined
                color: { expr: 'lit', value: 'red' },   // undefined
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const variantErrors = result.errors.filter((e) => e.code === 'UNDEFINED_VARIANT');
        expect(variantErrors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

// ==================== Suggestion for Typos Tests ====================

describe('analyzePass - Style Suggestion for Typos', () => {
  describe('Style name typo suggestions', () => {
    it('should include suggestion for typo in style name (button -> buton)', () => {
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
              name: 'buton', // typo: missing 't'
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
        expect(styleError).toBeDefined();
        expect(styleError?.suggestion).toBe("Did you mean 'button'?");
      }
    });

    it('should include context.availableNames with defined style names', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: { base: 'px-4 py-2' },
          card: { base: 'p-4 rounded' },
          badge: { base: 'px-2 py-1' },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'buttons', // typo
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
        expect(styleError).toBeDefined();
        expect(styleError?.context?.availableNames).toContain('button');
        expect(styleError?.context?.availableNames).toContain('card');
        expect(styleError?.context?.availableNames).toContain('badge');
      }
    });

    it('should not include suggestion when no similar style names exist', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: { base: 'px-4 py-2' },
        },
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            className: {
              expr: 'style',
              name: 'xyz', // very different from 'button'
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
        expect(styleError).toBeDefined();
        expect(styleError?.suggestion).toBeUndefined();
      }
    });
  });

  describe('Variant key typo suggestions', () => {
    it('should include suggestion for typo in variant key (variant -> varaint)', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: {
                primary: 'bg-blue-500',
              },
              size: {
                sm: 'text-sm',
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
                varaint: { expr: 'lit', value: 'primary' }, // typo
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const variantError = result.errors.find((e) => e.code === 'UNDEFINED_VARIANT');
        expect(variantError).toBeDefined();
        expect(variantError?.suggestion).toBe("Did you mean 'variant'?");
      }
    });

    it('should include context.availableNames with defined variant keys', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              variant: { primary: 'bg-blue-500' },
              size: { sm: 'text-sm' },
              intent: { danger: 'bg-red-500' },
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
                nonexistent: { expr: 'lit', value: 'value' },
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const variantError = result.errors.find((e) => e.code === 'UNDEFINED_VARIANT');
        expect(variantError).toBeDefined();
        expect(variantError?.context?.availableNames).toContain('variant');
        expect(variantError?.context?.availableNames).toContain('size');
        expect(variantError?.context?.availableNames).toContain('intent');
      }
    });
  });
});

// ==================== Valid Style Reference Tests ====================

describe('analyzePass - Valid Style Reference', () => {
  describe('Valid style usage passes', () => {
    it('should pass when style name exists and is used correctly', () => {
      // Arrange
      const ast = createAst({
        styles: {
          button: {
            base: 'px-4 py-2 rounded font-medium',
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
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should pass when all variant keys exist', () => {
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
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should pass when using dynamic variant values from state', () => {
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
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should pass when using style in each loop body', () => {
      // Arrange
      const ast = createAst({
        state: {
          items: { type: 'list', initial: [] },
        },
        styles: {
          listItem: {
            base: 'p-2 border-b',
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
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should pass when using style in if node branches', () => {
      // Arrange
      const ast = createAst({
        state: {
          isLoading: { type: 'boolean', initial: false },
        },
        styles: {
          button: {
            base: 'px-4 py-2',
            variants: {
              state: {
                loading: 'opacity-50 cursor-wait',
                ready: 'cursor-pointer',
              },
            },
          },
        },
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'isLoading' },
          then: {
            kind: 'element',
            tag: 'button',
            props: {
              className: {
                expr: 'style',
                name: 'button',
                variants: {
                  state: { expr: 'lit', value: 'loading' },
                },
              },
            },
          },
          else: {
            kind: 'element',
            tag: 'button',
            props: {
              className: {
                expr: 'style',
                name: 'button',
                variants: {
                  state: { expr: 'lit', value: 'ready' },
                },
              },
            },
          },
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should pass when using multiple styles in same view tree', () => {
      // Arrange
      const ast = createAst({
        styles: {
          card: {
            base: 'p-4 rounded-lg shadow',
          },
          button: {
            base: 'px-4 py-2 rounded',
            variants: {
              variant: {
                primary: 'bg-blue-500 text-white',
              },
            },
          },
          text: {
            base: 'text-base',
          },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            className: { expr: 'style', name: 'card' },
          },
          children: [
            {
              kind: 'element',
              tag: 'p',
              props: {
                className: { expr: 'style', name: 'text' },
              },
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                className: {
                  expr: 'style',
                  name: 'button',
                  variants: {
                    variant: { expr: 'lit', value: 'primary' },
                  },
                },
              },
            },
          ],
        },
      });

      // Act
      const result = compile(ast);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Edge Cases ====================

describe('analyzePass - Style Edge Cases', () => {
  it('should handle style expression in component props', () => {
    // Arrange
    const ast = createAst({
      styles: {
        button: {
          base: 'px-4 py-2',
        },
      },
      components: {
        Button: {
          params: {
            className: { type: 'string' },
          },
          view: {
            kind: 'element',
            tag: 'button',
            props: {
              className: { expr: 'param', name: 'className' },
            },
          },
        },
      },
      view: {
        kind: 'component',
        name: 'Button',
        props: {
          className: {
            expr: 'style',
            name: 'button',
          },
        },
      },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(true);
  });

  it('should report error for undefined style in component definition view', () => {
    // Arrange
    const ast = createAst({
      styles: {
        button: {
          base: 'px-4 py-2',
        },
      },
      components: {
        Card: {
          view: {
            kind: 'element',
            tag: 'div',
            props: {
              className: {
                expr: 'style',
                name: 'card', // 'card' is not defined
              },
            },
          },
        },
      },
      view: { kind: 'element', tag: 'div' },
    });

    // Act
    const result = compile(ast);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const styleError = result.errors.find((e) => e.code === 'UNDEFINED_STYLE');
      expect(styleError).toBeDefined();
    }
  });
});
