/**
 * Component System Tests for Constela AST Types
 *
 * Coverage:
 * - ParamExpr type guard (param expression)
 * - ComponentNode type guard (component invocation)
 * - SlotNode type guard (slot placeholder)
 * - ComponentDef structure validation
 * - Component-related ViewNode union extension
 */

import { describe, it, expect } from 'vitest';
import {
  // New type guards to be implemented
  isParamExpr,
  isComponentNode,
  isSlotNode,
  // Existing type guards should work with new types
  isExpression,
  isViewNode,
} from '../src/index.js';

// ==================== ParamExpr Type Guard ====================

describe('ParamExpr Type Guard', () => {
  describe('isParamExpr', () => {
    it('should return true for valid param expression with name only', () => {
      const expr = { expr: 'param', name: 'title' };
      expect(isParamExpr(expr)).toBe(true);
    });

    it('should return true for param expression with path', () => {
      const expr = { expr: 'param', name: 'user', path: 'name' };
      expect(isParamExpr(expr)).toBe(true);
    });

    it('should return true for param expression with nested path', () => {
      const expr = { expr: 'param', name: 'data', path: 'items.0.value' };
      expect(isParamExpr(expr)).toBe(true);
    });

    it('should return false for missing name', () => {
      const expr = { expr: 'param' };
      expect(isParamExpr(expr)).toBe(false);
    });

    it('should return false for non-string name', () => {
      const expr = { expr: 'param', name: 123 };
      expect(isParamExpr(expr)).toBe(false);
    });

    it('should return false for non-string path', () => {
      const expr = { expr: 'param', name: 'data', path: 123 };
      expect(isParamExpr(expr)).toBe(false);
    });

    it('should return false for state expression', () => {
      const expr = { expr: 'state', name: 'count' };
      expect(isParamExpr(expr)).toBe(false);
    });

    it('should return false for var expression', () => {
      const expr = { expr: 'var', name: 'item' };
      expect(isParamExpr(expr)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isParamExpr(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isParamExpr(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isParamExpr('param')).toBe(false);
      expect(isParamExpr(42)).toBe(false);
      expect(isParamExpr(true)).toBe(false);
    });
  });

  describe('isExpression with ParamExpr', () => {
    it('should return true for param expression in isExpression', () => {
      const expr = { expr: 'param', name: 'title' };
      expect(isExpression(expr)).toBe(true);
    });

    it('should return true for param expression with path in isExpression', () => {
      const expr = { expr: 'param', name: 'user', path: 'email' };
      expect(isExpression(expr)).toBe(true);
    });
  });
});

// ==================== ComponentNode Type Guard ====================

describe('ComponentNode Type Guard', () => {
  describe('isComponentNode', () => {
    it('should return true for minimal component node', () => {
      const node = { kind: 'component', name: 'Button' };
      expect(isComponentNode(node)).toBe(true);
    });

    it('should return true for component node with props', () => {
      const node = {
        kind: 'component',
        name: 'Button',
        props: {
          label: { expr: 'lit', value: 'Click me' },
          disabled: { expr: 'state', name: 'isLoading' },
        },
      };
      expect(isComponentNode(node)).toBe(true);
    });

    it('should return true for component node with children', () => {
      const node = {
        kind: 'component',
        name: 'Card',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Content' } },
        ],
      };
      expect(isComponentNode(node)).toBe(true);
    });

    it('should return true for component node with both props and children', () => {
      const node = {
        kind: 'component',
        name: 'Card',
        props: {
          title: { expr: 'param', name: 'cardTitle' },
        },
        children: [
          { kind: 'element', tag: 'p' },
        ],
      };
      expect(isComponentNode(node)).toBe(true);
    });

    it('should return false for missing name', () => {
      const node = { kind: 'component' };
      expect(isComponentNode(node)).toBe(false);
    });

    it('should return false for non-string name', () => {
      const node = { kind: 'component', name: 123 };
      expect(isComponentNode(node)).toBe(false);
    });

    it('should return false for element node', () => {
      const node = { kind: 'element', tag: 'div' };
      expect(isComponentNode(node)).toBe(false);
    });

    it('should return false for text node', () => {
      const node = { kind: 'text', value: { expr: 'lit', value: 'hello' } };
      expect(isComponentNode(node)).toBe(false);
    });

    it('should return false for if node', () => {
      const node = {
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: { kind: 'element', tag: 'div' },
      };
      expect(isComponentNode(node)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isComponentNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isComponentNode(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isComponentNode('component')).toBe(false);
      expect(isComponentNode(42)).toBe(false);
    });

    it('should return false for non-object props', () => {
      const node = { kind: 'component', name: 'Button', props: 'invalid' };
      expect(isComponentNode(node)).toBe(false);
    });

    it('should return false for non-array children', () => {
      const node = { kind: 'component', name: 'Card', children: 'invalid' };
      expect(isComponentNode(node)).toBe(false);
    });
  });

  describe('isViewNode with ComponentNode', () => {
    it('should return true for component node in isViewNode', () => {
      const node = { kind: 'component', name: 'Button' };
      expect(isViewNode(node)).toBe(true);
    });

    it('should return true for component with props in isViewNode', () => {
      const node = {
        kind: 'component',
        name: 'Input',
        props: { value: { expr: 'state', name: 'inputValue' } },
      };
      expect(isViewNode(node)).toBe(true);
    });
  });
});

// ==================== SlotNode Type Guard ====================

describe('SlotNode Type Guard', () => {
  describe('isSlotNode', () => {
    it('should return true for valid slot node', () => {
      const node = { kind: 'slot' };
      expect(isSlotNode(node)).toBe(true);
    });

    it('should return false for element node', () => {
      const node = { kind: 'element', tag: 'div' };
      expect(isSlotNode(node)).toBe(false);
    });

    it('should return false for text node', () => {
      const node = { kind: 'text', value: { expr: 'lit', value: 'hello' } };
      expect(isSlotNode(node)).toBe(false);
    });

    it('should return false for component node', () => {
      const node = { kind: 'component', name: 'Button' };
      expect(isSlotNode(node)).toBe(false);
    });

    it('should return false for object without kind', () => {
      const node = { type: 'slot' };
      expect(isSlotNode(node)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSlotNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSlotNode(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isSlotNode('slot')).toBe(false);
      expect(isSlotNode(42)).toBe(false);
    });
  });

  describe('isViewNode with SlotNode', () => {
    it('should return true for slot node in isViewNode', () => {
      const node = { kind: 'slot' };
      expect(isViewNode(node)).toBe(true);
    });
  });
});

// ==================== Component Integration Tests ====================

describe('Component System Integration', () => {
  describe('ComponentDef structure validation', () => {
    it('should accept component definition with only view', () => {
      const componentDef = {
        view: { kind: 'element', tag: 'div' },
      };
      // This tests that ComponentDef structure is valid
      expect(componentDef.view).toBeDefined();
      expect(isViewNode(componentDef.view)).toBe(true);
    });

    it('should accept component definition with params and view', () => {
      const componentDef = {
        params: {
          title: { type: 'string', required: true },
          count: { type: 'number', required: false },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'param', name: 'title' } },
          ],
        },
      };
      expect(componentDef.params).toBeDefined();
      expect(componentDef.params.title.type).toBe('string');
      expect(componentDef.params.title.required).toBe(true);
      expect(componentDef.params.count.required).toBe(false);
    });

    it('should accept component definition with slot in view', () => {
      const componentDef = {
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'slot' },
          ],
        },
      };
      expect(isSlotNode(componentDef.view.children[0])).toBe(true);
    });
  });

  describe('Program with components field', () => {
    it('should accept program with components defined', () => {
      const program = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Button: {
            params: {
              label: { type: 'string', required: true },
            },
            view: {
              kind: 'element',
              tag: 'button',
              children: [
                { kind: 'text', value: { expr: 'param', name: 'label' } },
              ],
            },
          },
        },
        view: {
          kind: 'component',
          name: 'Button',
          props: {
            label: { expr: 'lit', value: 'Click me' },
          },
        },
      };

      expect(program.components).toBeDefined();
      expect(program.components.Button).toBeDefined();
      expect(isComponentNode(program.view)).toBe(true);
    });
  });

  describe('Nested component usage', () => {
    it('should allow components within components', () => {
      const program = {
        version: '1.0',
        state: {},
        actions: [],
        components: {
          Icon: {
            params: { name: { type: 'string', required: true } },
            view: { kind: 'element', tag: 'i' },
          },
          Button: {
            params: { icon: { type: 'string', required: false } },
            view: {
              kind: 'element',
              tag: 'button',
              children: [
                {
                  kind: 'component',
                  name: 'Icon',
                  props: { name: { expr: 'param', name: 'icon' } },
                },
                { kind: 'slot' },
              ],
            },
          },
        },
        view: { kind: 'element', tag: 'div' },
      };

      const buttonView = program.components.Button.view;
      expect(isComponentNode(buttonView.children[0])).toBe(true);
      expect(isSlotNode(buttonView.children[1])).toBe(true);
    });
  });

  describe('ParamType validation', () => {
    it('should accept string param type', () => {
      const param = { type: 'string', required: true };
      expect(param.type).toBe('string');
    });

    it('should accept number param type', () => {
      const param = { type: 'number', required: false };
      expect(param.type).toBe('number');
    });

    it('should accept boolean param type', () => {
      const param = { type: 'boolean', required: true };
      expect(param.type).toBe('boolean');
    });

    it('should accept json param type', () => {
      const param = { type: 'json', required: false };
      expect(param.type).toBe('json');
    });
  });
});
