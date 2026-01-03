/**
 * Analyze Pass Tests for Component Validation - @constela/compiler
 *
 * Coverage:
 * - COMPONENT_NOT_FOUND: Reference to undefined component
 * - COMPONENT_PROP_MISSING: Required prop not provided
 * - COMPONENT_CYCLE: Direct and indirect circular references
 * - PARAM_UNDEFINED: Reference to undefined param in component
 * - SLOT_OUTSIDE_COMPONENT: Slot used outside component definition
 * - Valid component usage patterns
 *
 * TDD Red Phase: These tests will FAIL because implementation does not exist.
 */

import { describe, it, expect } from 'vitest';

import { analyzePass, type AnalyzePassResult } from '../../src/passes/analyze.js';
import type { Program, ViewNode, ComponentDef } from '@constela/core';

// ==================== Helper to create minimal valid AST ====================

function createAst(overrides: Partial<Program> = {}): Program {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view: { kind: 'element', tag: 'div' },
    ...overrides,
  } as Program;
}

// ==================== COMPONENT_NOT_FOUND ====================

describe('analyzePass - COMPONENT_NOT_FOUND', () => {
  describe('when component node references undefined component', () => {
    it('should return COMPONENT_NOT_FOUND error for non-existent component in view', () => {
      const ast = createAst({
        components: {},
        view: { kind: 'component', name: 'NonExistent' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_NOT_FOUND')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('NonExistent'))).toBe(true);
      }
    });

    it('should return COMPONENT_NOT_FOUND error with correct path', () => {
      const ast = createAst({
        components: {},
        view: { kind: 'component', name: 'MissingComponent' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((e) => e.code === 'COMPONENT_NOT_FOUND');
        expect(error).toBeDefined();
        expect(error?.path).toBe('/view');
      }
    });

    it('should return COMPONENT_NOT_FOUND error for component in nested children', () => {
      const ast = createAst({
        components: {},
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'element',
              tag: 'section',
              children: [{ kind: 'component', name: 'DeepMissing' }],
            },
          ],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((e) => e.code === 'COMPONENT_NOT_FOUND');
        expect(error).toBeDefined();
        expect(error?.path).toContain('/view/children/0/children/0');
      }
    });

    it('should return COMPONENT_NOT_FOUND error when components field is missing', () => {
      const ast = createAst({
        view: { kind: 'component', name: 'SomeComponent' },
      });
      // Note: components field is undefined

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_NOT_FOUND')).toBe(true);
      }
    });

    it('should return COMPONENT_NOT_FOUND error for component in if then branch', () => {
      const ast = createAst({
        state: { show: { type: 'number', initial: 1 } },
        components: {},
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'show' },
          then: { kind: 'component', name: 'MissingInThen' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_NOT_FOUND')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('MissingInThen'))).toBe(true);
      }
    });

    it('should return COMPONENT_NOT_FOUND error for component in if else branch', () => {
      const ast = createAst({
        state: { show: { type: 'number', initial: 0 } },
        components: {},
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'show' },
          then: { kind: 'element', tag: 'div' },
          else: { kind: 'component', name: 'MissingInElse' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_NOT_FOUND')).toBe(true);
      }
    });

    it('should return COMPONENT_NOT_FOUND error for component in each body', () => {
      const ast = createAst({
        state: { items: { type: 'list', initial: [] } },
        components: {},
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: { kind: 'component', name: 'MissingInEach' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_NOT_FOUND')).toBe(true);
      }
    });
  });
});

// ==================== COMPONENT_PROP_MISSING ====================

describe('analyzePass - COMPONENT_PROP_MISSING', () => {
  describe('when required prop is not provided', () => {
    it('should return COMPONENT_PROP_MISSING error when required prop is missing', () => {
      const ast = createAst({
        components: {
          Button: {
            params: { label: { type: 'string' } }, // required by default
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: { kind: 'component', name: 'Button', props: {} }, // missing 'label'
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_PROP_MISSING')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('label'))).toBe(true);
        expect(result.errors.some((e) => e.message.includes('Button'))).toBe(true);
      }
    });

    it('should return COMPONENT_PROP_MISSING error when props is undefined', () => {
      const ast = createAst({
        components: {
          Card: {
            params: { title: { type: 'string' } },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'component', name: 'Card' }, // no props at all
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_PROP_MISSING')).toBe(true);
      }
    });

    it('should return COMPONENT_PROP_MISSING error with correct path', () => {
      const ast = createAst({
        components: {
          Input: {
            params: { placeholder: { type: 'string' } },
            view: { kind: 'element', tag: 'input' },
          },
        },
        view: {
          kind: 'element',
          tag: 'form',
          children: [{ kind: 'component', name: 'Input', props: {} }],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((e) => e.code === 'COMPONENT_PROP_MISSING');
        expect(error).toBeDefined();
        expect(error?.path).toContain('/view/children/0');
      }
    });

    it('should return multiple errors when multiple required props are missing', () => {
      const ast = createAst({
        components: {
          UserCard: {
            params: {
              name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' },
            },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'component', name: 'UserCard', props: {} },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const missingPropErrors = result.errors.filter(
          (e) => e.code === 'COMPONENT_PROP_MISSING'
        );
        expect(missingPropErrors.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should return COMPONENT_PROP_MISSING when required:true is explicit', () => {
      const ast = createAst({
        components: {
          Alert: {
            params: { message: { type: 'string', required: true } },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'component', name: 'Alert', props: {} },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_PROP_MISSING')).toBe(true);
      }
    });
  });
});

// ==================== COMPONENT_CYCLE ====================

describe('analyzePass - COMPONENT_CYCLE', () => {
  describe('direct cycle (A -> A)', () => {
    it('should return COMPONENT_CYCLE error for self-referencing component', () => {
      const ast = createAst({
        components: {
          A: { view: { kind: 'component', name: 'A' } },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_CYCLE')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('A'))).toBe(true);
      }
    });

    it('should return COMPONENT_CYCLE error with cycle path in message', () => {
      const ast = createAst({
        components: {
          Recursive: { view: { kind: 'component', name: 'Recursive' } },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const cycleError = result.errors.find((e) => e.code === 'COMPONENT_CYCLE');
        expect(cycleError).toBeDefined();
        // Message should show the cycle: "Recursive -> Recursive"
        expect(cycleError?.message).toMatch(/Recursive.*->.*Recursive/);
      }
    });
  });

  describe('indirect cycle (A -> B -> C -> A)', () => {
    it('should return COMPONENT_CYCLE error for indirect circular reference', () => {
      const ast = createAst({
        components: {
          A: { view: { kind: 'component', name: 'B' } },
          B: { view: { kind: 'component', name: 'C' } },
          C: { view: { kind: 'component', name: 'A' } },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_CYCLE')).toBe(true);
      }
    });

    it('should include all components in cycle message', () => {
      const ast = createAst({
        components: {
          Alpha: { view: { kind: 'component', name: 'Beta' } },
          Beta: { view: { kind: 'component', name: 'Gamma' } },
          Gamma: { view: { kind: 'component', name: 'Alpha' } },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const cycleError = result.errors.find((e) => e.code === 'COMPONENT_CYCLE');
        expect(cycleError).toBeDefined();
        expect(cycleError?.message).toContain('Alpha');
        expect(cycleError?.message).toContain('Beta');
        expect(cycleError?.message).toContain('Gamma');
      }
    });

    it('should return COMPONENT_CYCLE error for two-component cycle (A -> B -> A)', () => {
      const ast = createAst({
        components: {
          Parent: { view: { kind: 'component', name: 'Child' } },
          Child: { view: { kind: 'component', name: 'Parent' } },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_CYCLE')).toBe(true);
      }
    });
  });

  describe('cycle in nested structure', () => {
    it('should detect cycle when component is nested inside element', () => {
      const ast = createAst({
        components: {
          Container: {
            view: {
              kind: 'element',
              tag: 'div',
              children: [{ kind: 'component', name: 'Container' }],
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_CYCLE')).toBe(true);
      }
    });

    it('should detect cycle when component is in conditional branch', () => {
      const ast = createAst({
        state: { depth: { type: 'number', initial: 0 } },
        components: {
          Tree: {
            view: {
              kind: 'if',
              condition: { expr: 'state', name: 'depth' },
              then: { kind: 'component', name: 'Tree' },
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'COMPONENT_CYCLE')).toBe(true);
      }
    });
  });
});

// ==================== PARAM_UNDEFINED ====================

describe('analyzePass - PARAM_UNDEFINED', () => {
  describe('when param expression references undefined param', () => {
    it('should return PARAM_UNDEFINED error for non-existent param in text value', () => {
      const ast = createAst({
        components: {
          Card: {
            params: { title: { type: 'string' } },
            view: { kind: 'text', value: { expr: 'param', name: 'nonexistent' } },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'PARAM_UNDEFINED')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('nonexistent'))).toBe(true);
      }
    });

    it('should return PARAM_UNDEFINED error with correct path', () => {
      const ast = createAst({
        components: {
          Widget: {
            params: { size: { type: 'number' } },
            view: {
              kind: 'element',
              tag: 'div',
              props: {
                width: { expr: 'param', name: 'unknownParam' },
              },
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const error = result.errors.find((e) => e.code === 'PARAM_UNDEFINED');
        expect(error).toBeDefined();
        expect(error?.path).toContain('/components/Widget');
      }
    });

    it('should return PARAM_UNDEFINED error when params field is missing', () => {
      const ast = createAst({
        components: {
          Simple: {
            // no params defined
            view: { kind: 'text', value: { expr: 'param', name: 'anyParam' } },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'PARAM_UNDEFINED')).toBe(true);
      }
    });

    it('should return PARAM_UNDEFINED error for param in nested expression', () => {
      const ast = createAst({
        components: {
          Calculator: {
            params: { value: { type: 'number' } },
            view: {
              kind: 'text',
              value: {
                expr: 'bin',
                op: '+',
                left: { expr: 'param', name: 'value' },
                right: { expr: 'param', name: 'multiplier' }, // undefined
              },
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'PARAM_UNDEFINED')).toBe(true);
        expect(result.errors.some((e) => e.message.includes('multiplier'))).toBe(true);
      }
    });

    it('should return PARAM_UNDEFINED error for param in if condition', () => {
      const ast = createAst({
        components: {
          Conditional: {
            params: { show: { type: 'boolean' } },
            view: {
              kind: 'if',
              condition: { expr: 'param', name: 'visible' }, // undefined, should be 'show'
              then: { kind: 'element', tag: 'div' },
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'PARAM_UNDEFINED')).toBe(true);
      }
    });
  });
});

// ==================== SLOT_OUTSIDE_COMPONENT ====================

describe('analyzePass - Slot Validation', () => {
  describe('when slot is used outside component definition', () => {
    it('should return error for slot at root level view', () => {
      const ast = createAst({
        view: { kind: 'slot' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // The exact error code may vary - could be a generic error or specific SLOT error
        expect(result.errors.length).toBeGreaterThan(0);
        // Check that error relates to slot usage
        expect(
          result.errors.some((e) => e.message.toLowerCase().includes('slot'))
        ).toBe(true);
      }
    });

    it('should return error for slot nested in root view', () => {
      const ast = createAst({
        view: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'slot' }],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return error for slot in if branch of root view', () => {
      const ast = createAst({
        state: { show: { type: 'number', initial: 1 } },
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'show' },
          then: { kind: 'slot' },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

// ==================== Valid Component Cases ====================

describe('analyzePass - Valid Component Usage', () => {
  describe('component with all props provided', () => {
    it('should return ok: true when all required props are provided', () => {
      const ast = createAst({
        components: {
          Button: {
            params: {
              label: { type: 'string' },
              disabled: { type: 'boolean' },
            },
            view: { kind: 'element', tag: 'button' },
          },
        },
        view: {
          kind: 'component',
          name: 'Button',
          props: {
            label: { expr: 'lit', value: 'Click me' },
            disabled: { expr: 'lit', value: false },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('component with optional props omitted', () => {
    it('should return ok: true when optional props (required: false) are omitted', () => {
      const ast = createAst({
        components: {
          Card: {
            params: {
              title: { type: 'string' }, // required (default)
              subtitle: { type: 'string', required: false }, // optional
            },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: {
          kind: 'component',
          name: 'Card',
          props: {
            title: { expr: 'lit', value: 'My Card' },
            // subtitle is optional, so not providing it is OK
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return ok: true when all props are optional and none provided', () => {
      const ast = createAst({
        components: {
          Spacer: {
            params: {
              size: { type: 'number', required: false },
            },
            view: { kind: 'element', tag: 'div' },
          },
        },
        view: { kind: 'component', name: 'Spacer', props: {} },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('nested components without cycles', () => {
    it('should return ok: true for valid component composition', () => {
      const ast = createAst({
        components: {
          Button: {
            params: { label: { type: 'string' } },
            view: { kind: 'element', tag: 'button' },
          },
          Card: {
            params: { title: { type: 'string' } },
            view: {
              kind: 'element',
              tag: 'div',
              children: [
                {
                  kind: 'component',
                  name: 'Button',
                  props: { label: { expr: 'param', name: 'title' } },
                },
              ],
            },
          },
        },
        view: {
          kind: 'component',
          name: 'Card',
          props: { title: { expr: 'lit', value: 'Welcome' } },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return ok: true for deeply nested component structure', () => {
      const ast = createAst({
        components: {
          Inner: {
            params: { text: { type: 'string' } },
            view: { kind: 'text', value: { expr: 'param', name: 'text' } },
          },
          Middle: {
            params: { content: { type: 'string' } },
            view: {
              kind: 'component',
              name: 'Inner',
              props: { text: { expr: 'param', name: 'content' } },
            },
          },
          Outer: {
            params: { message: { type: 'string' } },
            view: {
              kind: 'component',
              name: 'Middle',
              props: { content: { expr: 'param', name: 'message' } },
            },
          },
        },
        view: {
          kind: 'component',
          name: 'Outer',
          props: { message: { expr: 'lit', value: 'Hello World' } },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('slot inside component definition', () => {
    it('should return ok: true for slot used inside component view', () => {
      const ast = createAst({
        components: {
          Wrapper: {
            view: {
              kind: 'element',
              tag: 'div',
              children: [{ kind: 'slot' }],
            },
          },
        },
        view: {
          kind: 'component',
          name: 'Wrapper',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Child content' } }],
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });

    it('should return ok: true for slot in conditional inside component', () => {
      const ast = createAst({
        state: { showSlot: { type: 'number', initial: 1 } },
        components: {
          ConditionalWrapper: {
            view: {
              kind: 'if',
              condition: { expr: 'state', name: 'showSlot' },
              then: { kind: 'slot' },
              else: { kind: 'text', value: { expr: 'lit', value: 'No content' } },
            },
          },
        },
        view: { kind: 'component', name: 'ConditionalWrapper' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('component with no params', () => {
    it('should return ok: true for component without params definition', () => {
      const ast = createAst({
        components: {
          Divider: {
            view: { kind: 'element', tag: 'hr' },
          },
        },
        view: { kind: 'component', name: 'Divider' },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });

  describe('valid param references', () => {
    it('should return ok: true when all param references are valid', () => {
      const ast = createAst({
        components: {
          Profile: {
            params: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
            view: {
              kind: 'element',
              tag: 'div',
              children: [
                { kind: 'text', value: { expr: 'param', name: 'name' } },
                { kind: 'text', value: { expr: 'param', name: 'age' } },
              ],
            },
          },
        },
        view: {
          kind: 'component',
          name: 'Profile',
          props: {
            name: { expr: 'lit', value: 'John' },
            age: { expr: 'lit', value: 30 },
          },
        },
      });

      const result = analyzePass(ast);

      expect(result.ok).toBe(true);
    });
  });
});

// ==================== Multiple Component Errors ====================

describe('analyzePass - Multiple Component Error Collection', () => {
  it('should collect multiple component-related errors', () => {
    const ast = createAst({
      components: {
        A: { view: { kind: 'component', name: 'A' } }, // cycle
        B: {
          params: { required: { type: 'string' } },
          view: { kind: 'text', value: { expr: 'param', name: 'undefined' } }, // undefined param
        },
      },
      view: {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'component', name: 'Missing' }, // not found
          { kind: 'component', name: 'B', props: {} }, // missing prop
        ],
      },
    });

    const result = analyzePass(ast);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should have multiple different types of errors
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });
});
