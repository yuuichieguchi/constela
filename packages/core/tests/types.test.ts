/**
 * Type Guard Tests for Constela AST Types
 *
 * Coverage:
 * - ViewNode type guards (element, text, if, each)
 * - Expression type guards (lit, state, var, bin, not)
 * - ActionStep type guards (set, update, fetch)
 * - StateField type guards (number, string, list)
 */

import { describe, it, expect } from 'vitest';
import {
  // ViewNode type guards
  isElementNode,
  isTextNode,
  isIfNode,
  isEachNode,
  isViewNode,
  isMarkdownNode,
  isCodeNode,
  // Expression type guards
  isLitExpr,
  isStateExpr,
  isVarExpr,
  isBinExpr,
  isNotExpr,
  isExpression,
  // ActionStep type guards
  isSetStep,
  isUpdateStep,
  isFetchStep,
  isActionStep,
  // StateField type guards
  isNumberField,
  isStringField,
  isListField,
  isStateField,
} from '../src/index.js';

// ==================== ViewNode Type Guards ====================

describe('ViewNode Type Guards', () => {
  describe('isElementNode', () => {
    it('should return true for valid element node', () => {
      const node = { kind: 'element', tag: 'div' };
      expect(isElementNode(node)).toBe(true);
    });

    it('should return true for element node with props', () => {
      const node = {
        kind: 'element',
        tag: 'button',
        props: { class: { expr: 'lit', value: 'btn' } },
      };
      expect(isElementNode(node)).toBe(true);
    });

    it('should return true for element node with children', () => {
      const node = {
        kind: 'element',
        tag: 'div',
        children: [{ kind: 'text', value: { expr: 'lit', value: 'hello' } }],
      };
      expect(isElementNode(node)).toBe(true);
    });

    it('should return false for text node', () => {
      const node = { kind: 'text', value: { expr: 'lit', value: 'hello' } };
      expect(isElementNode(node)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isElementNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isElementNode(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isElementNode('element')).toBe(false);
      expect(isElementNode(42)).toBe(false);
    });
  });

  describe('isTextNode', () => {
    it('should return true for valid text node with literal', () => {
      const node = { kind: 'text', value: { expr: 'lit', value: 'hello' } };
      expect(isTextNode(node)).toBe(true);
    });

    it('should return true for text node with state expression', () => {
      const node = { kind: 'text', value: { expr: 'state', name: 'count' } };
      expect(isTextNode(node)).toBe(true);
    });

    it('should return false for element node', () => {
      const node = { kind: 'element', tag: 'div' };
      expect(isTextNode(node)).toBe(false);
    });

    it('should return false for missing value property', () => {
      const node = { kind: 'text' };
      expect(isTextNode(node)).toBe(false);
    });
  });

  describe('isIfNode', () => {
    it('should return true for valid if node', () => {
      const node = {
        kind: 'if',
        condition: { expr: 'state', name: 'isVisible' },
        then: { kind: 'element', tag: 'div' },
      };
      expect(isIfNode(node)).toBe(true);
    });

    it('should return true for if node with else branch', () => {
      const node = {
        kind: 'if',
        condition: { expr: 'state', name: 'isVisible' },
        then: { kind: 'element', tag: 'div' },
        else: { kind: 'text', value: { expr: 'lit', value: 'hidden' } },
      };
      expect(isIfNode(node)).toBe(true);
    });

    it('should return false for missing condition', () => {
      const node = {
        kind: 'if',
        then: { kind: 'element', tag: 'div' },
      };
      expect(isIfNode(node)).toBe(false);
    });

    it('should return false for missing then branch', () => {
      const node = {
        kind: 'if',
        condition: { expr: 'state', name: 'isVisible' },
      };
      expect(isIfNode(node)).toBe(false);
    });
  });

  describe('isEachNode', () => {
    it('should return true for valid each node', () => {
      const node = {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        as: 'todo',
        body: { kind: 'element', tag: 'li' },
      };
      expect(isEachNode(node)).toBe(true);
    });

    it('should return true for each node with index', () => {
      const node = {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        as: 'todo',
        index: 'idx',
        body: { kind: 'element', tag: 'li' },
      };
      expect(isEachNode(node)).toBe(true);
    });

    it('should return true for each node with key', () => {
      const node = {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        as: 'todo',
        key: { expr: 'var', name: 'todo.id' },
        body: { kind: 'element', tag: 'li' },
      };
      expect(isEachNode(node)).toBe(true);
    });

    it('should return false for missing items', () => {
      const node = {
        kind: 'each',
        as: 'todo',
        body: { kind: 'element', tag: 'li' },
      };
      expect(isEachNode(node)).toBe(false);
    });

    it('should return false for missing as', () => {
      const node = {
        kind: 'each',
        items: { expr: 'state', name: 'todos' },
        body: { kind: 'element', tag: 'li' },
      };
      expect(isEachNode(node)).toBe(false);
    });
  });

  describe('isViewNode', () => {
    it('should return true for any valid view node type', () => {
      expect(isViewNode({ kind: 'element', tag: 'div' })).toBe(true);
      expect(isViewNode({ kind: 'text', value: { expr: 'lit', value: 'hi' } })).toBe(true);
      expect(
        isViewNode({
          kind: 'if',
          condition: { expr: 'lit', value: true },
          then: { kind: 'element', tag: 'div' },
        })
      ).toBe(true);
      expect(
        isViewNode({
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: { kind: 'element', tag: 'div' },
        })
      ).toBe(true);
    });

    it('should return false for invalid kinds', () => {
      expect(isViewNode({ kind: 'unknown' })).toBe(false);
    });
  });
});

// ==================== Expression Type Guards ====================

describe('Expression Type Guards', () => {
  describe('isLitExpr', () => {
    it('should return true for string literal', () => {
      const expr = { expr: 'lit', value: 'hello' };
      expect(isLitExpr(expr)).toBe(true);
    });

    it('should return true for number literal', () => {
      const expr = { expr: 'lit', value: 42 };
      expect(isLitExpr(expr)).toBe(true);
    });

    it('should return true for boolean literal', () => {
      const expr = { expr: 'lit', value: true };
      expect(isLitExpr(expr)).toBe(true);
    });

    it('should return true for null literal', () => {
      const expr = { expr: 'lit', value: null };
      expect(isLitExpr(expr)).toBe(true);
    });

    it('should return false for state expression', () => {
      const expr = { expr: 'state', name: 'count' };
      expect(isLitExpr(expr)).toBe(false);
    });
  });

  describe('isStateExpr', () => {
    it('should return true for valid state expression', () => {
      const expr = { expr: 'state', name: 'count' };
      expect(isStateExpr(expr)).toBe(true);
    });

    it('should return false for missing name', () => {
      const expr = { expr: 'state' };
      expect(isStateExpr(expr)).toBe(false);
    });

    it('should return false for non-string name', () => {
      const expr = { expr: 'state', name: 123 };
      expect(isStateExpr(expr)).toBe(false);
    });
  });

  describe('isVarExpr', () => {
    it('should return true for valid var expression', () => {
      const expr = { expr: 'var', name: 'item' };
      expect(isVarExpr(expr)).toBe(true);
    });

    it('should return true for nested var name', () => {
      const expr = { expr: 'var', name: 'item.id' };
      expect(isVarExpr(expr)).toBe(true);
    });

    it('should return false for state expression', () => {
      const expr = { expr: 'state', name: 'count' };
      expect(isVarExpr(expr)).toBe(false);
    });
  });

  describe('isBinExpr', () => {
    it('should return true for valid binary expression with arithmetic op', () => {
      const expr = {
        expr: 'bin',
        op: '+',
        left: { expr: 'state', name: 'a' },
        right: { expr: 'lit', value: 1 },
      };
      expect(isBinExpr(expr)).toBe(true);
    });

    it('should return true for comparison operators', () => {
      const ops = ['==', '!=', '<', '>', '<=', '>='];
      ops.forEach((op) => {
        const expr = {
          expr: 'bin',
          op,
          left: { expr: 'lit', value: 1 },
          right: { expr: 'lit', value: 2 },
        };
        expect(isBinExpr(expr)).toBe(true);
      });
    });

    it('should return true for logical operators', () => {
      const expr = {
        expr: 'bin',
        op: '&&',
        left: { expr: 'lit', value: true },
        right: { expr: 'lit', value: false },
      };
      expect(isBinExpr(expr)).toBe(true);
    });

    it('should return false for missing operands', () => {
      expect(isBinExpr({ expr: 'bin', op: '+', left: { expr: 'lit', value: 1 } })).toBe(false);
      expect(isBinExpr({ expr: 'bin', op: '+', right: { expr: 'lit', value: 1 } })).toBe(false);
    });

    it('should return false for invalid operator', () => {
      const expr = {
        expr: 'bin',
        op: '**',
        left: { expr: 'lit', value: 1 },
        right: { expr: 'lit', value: 2 },
      };
      expect(isBinExpr(expr)).toBe(false);
    });
  });

  describe('isNotExpr', () => {
    it('should return true for valid not expression', () => {
      const expr = { expr: 'not', operand: { expr: 'state', name: 'isActive' } };
      expect(isNotExpr(expr)).toBe(true);
    });

    it('should return false for missing operand', () => {
      const expr = { expr: 'not' };
      expect(isNotExpr(expr)).toBe(false);
    });

    it('should return false for invalid operand', () => {
      const expr = { expr: 'not', operand: 'invalid' };
      expect(isNotExpr(expr)).toBe(false);
    });
  });

  describe('isExpression', () => {
    it('should return true for all valid expression types', () => {
      expect(isExpression({ expr: 'lit', value: 'hello' })).toBe(true);
      expect(isExpression({ expr: 'state', name: 'count' })).toBe(true);
      expect(isExpression({ expr: 'var', name: 'item' })).toBe(true);
      expect(
        isExpression({
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 1 },
          right: { expr: 'lit', value: 2 },
        })
      ).toBe(true);
      expect(isExpression({ expr: 'not', operand: { expr: 'lit', value: true } })).toBe(true);
    });

    it('should return false for invalid expression type', () => {
      expect(isExpression({ expr: 'unknown', value: 1 })).toBe(false);
    });
  });
});

// ==================== ActionStep Type Guards ====================

describe('ActionStep Type Guards', () => {
  describe('isSetStep', () => {
    it('should return true for valid set step', () => {
      const step = {
        do: 'set',
        target: 'count',
        value: { expr: 'lit', value: 0 },
      };
      expect(isSetStep(step)).toBe(true);
    });

    it('should return false for missing target', () => {
      const step = { do: 'set', value: { expr: 'lit', value: 0 } };
      expect(isSetStep(step)).toBe(false);
    });

    it('should return false for missing value', () => {
      const step = { do: 'set', target: 'count' };
      expect(isSetStep(step)).toBe(false);
    });

    it('should return false for update step', () => {
      const step = { do: 'update', target: 'count', operation: 'increment' };
      expect(isSetStep(step)).toBe(false);
    });
  });

  describe('isUpdateStep', () => {
    it('should return true for increment operation', () => {
      const step = { do: 'update', target: 'count', operation: 'increment' };
      expect(isUpdateStep(step)).toBe(true);
    });

    it('should return true for decrement operation', () => {
      const step = { do: 'update', target: 'count', operation: 'decrement' };
      expect(isUpdateStep(step)).toBe(true);
    });

    it('should return true for push operation with value', () => {
      const step = {
        do: 'update',
        target: 'todos',
        operation: 'push',
        value: { expr: 'lit', value: 'new item' },
      };
      expect(isUpdateStep(step)).toBe(true);
    });

    it('should return true for pop operation', () => {
      const step = { do: 'update', target: 'todos', operation: 'pop' };
      expect(isUpdateStep(step)).toBe(true);
    });

    it('should return true for remove operation with index', () => {
      const step = {
        do: 'update',
        target: 'todos',
        operation: 'remove',
        value: { expr: 'var', name: 'index' },
      };
      expect(isUpdateStep(step)).toBe(true);
    });

    it('should return false for invalid operation', () => {
      const step = { do: 'update', target: 'count', operation: 'multiply' };
      expect(isUpdateStep(step)).toBe(false);
    });

    it('should return false for missing operation', () => {
      const step = { do: 'update', target: 'count' };
      expect(isUpdateStep(step)).toBe(false);
    });
  });

  describe('isFetchStep', () => {
    it('should return true for minimal fetch step', () => {
      const step = { do: 'fetch', url: { expr: 'lit', value: '/api/data' } };
      expect(isFetchStep(step)).toBe(true);
    });

    it('should return true for fetch with method', () => {
      const step = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
        method: 'POST',
      };
      expect(isFetchStep(step)).toBe(true);
    });

    it('should return true for fetch with body', () => {
      const step = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
        method: 'POST',
        body: { expr: 'state', name: 'formData' },
      };
      expect(isFetchStep(step)).toBe(true);
    });

    it('should return true for fetch with result binding', () => {
      const step = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
        result: 'response',
      };
      expect(isFetchStep(step)).toBe(true);
    });

    it('should return true for fetch with callbacks', () => {
      const step = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
        onSuccess: [{ do: 'set', target: 'data', value: { expr: 'var', name: 'result' } }],
        onError: [{ do: 'set', target: 'error', value: { expr: 'var', name: 'error' } }],
      };
      expect(isFetchStep(step)).toBe(true);
    });

    it('should return false for missing url', () => {
      const step = { do: 'fetch', method: 'GET' };
      expect(isFetchStep(step)).toBe(false);
    });

    it('should return false for invalid method', () => {
      const step = {
        do: 'fetch',
        url: { expr: 'lit', value: '/api/data' },
        method: 'PATCH',
      };
      expect(isFetchStep(step)).toBe(false);
    });
  });

  describe('isActionStep', () => {
    it('should return true for all valid action step types', () => {
      expect(
        isActionStep({ do: 'set', target: 'x', value: { expr: 'lit', value: 1 } })
      ).toBe(true);
      expect(isActionStep({ do: 'update', target: 'x', operation: 'increment' })).toBe(true);
      expect(isActionStep({ do: 'fetch', url: { expr: 'lit', value: '/api' } })).toBe(true);
    });

    it('should return false for invalid do value', () => {
      expect(isActionStep({ do: 'unknown', target: 'x' })).toBe(false);
    });
  });
});

// ==================== StateField Type Guards ====================

// ==================== MarkdownNode and CodeNode Type Guards ====================

describe('MarkdownNode and CodeNode Type Guards', () => {
  describe('isMarkdownNode', () => {
    it('should return true for valid markdown node with literal content', () => {
      const node = {
        kind: 'markdown',
        content: { expr: 'lit', value: '# Hello World' },
      };
      expect(isMarkdownNode(node)).toBe(true);
    });

    it('should return true for markdown node with state expression', () => {
      const node = {
        kind: 'markdown',
        content: { expr: 'state', name: 'markdownContent' },
      };
      expect(isMarkdownNode(node)).toBe(true);
    });

    it('should return false for missing content', () => {
      const node = { kind: 'markdown' };
      expect(isMarkdownNode(node)).toBe(false);
    });

    it('should return false for non-object content', () => {
      const node = { kind: 'markdown', content: '# Hello' };
      expect(isMarkdownNode(node)).toBe(false);
    });

    it('should return false for element node', () => {
      const node = { kind: 'element', tag: 'div' };
      expect(isMarkdownNode(node)).toBe(false);
    });

    it('should return false for text node', () => {
      const node = { kind: 'text', value: { expr: 'lit', value: 'hello' } };
      expect(isMarkdownNode(node)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isMarkdownNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMarkdownNode(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isMarkdownNode('markdown')).toBe(false);
      expect(isMarkdownNode(42)).toBe(false);
    });
  });

  describe('isCodeNode', () => {
    it('should return true for valid code node with literal values', () => {
      const node = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      expect(isCodeNode(node)).toBe(true);
    });

    it('should return true for code node with state expressions', () => {
      const node = {
        kind: 'code',
        language: { expr: 'state', name: 'selectedLanguage' },
        content: { expr: 'state', name: 'codeContent' },
      };
      expect(isCodeNode(node)).toBe(true);
    });

    it('should return true for code node with mixed expressions', () => {
      const node = {
        kind: 'code',
        language: { expr: 'lit', value: 'typescript' },
        content: { expr: 'state', name: 'snippet' },
      };
      expect(isCodeNode(node)).toBe(true);
    });

    it('should return false for missing language', () => {
      const node = {
        kind: 'code',
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      expect(isCodeNode(node)).toBe(false);
    });

    it('should return false for missing content', () => {
      const node = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
      };
      expect(isCodeNode(node)).toBe(false);
    });

    it('should return false for non-object language', () => {
      const node = {
        kind: 'code',
        language: 'javascript',
        content: { expr: 'lit', value: 'const x = 1;' },
      };
      expect(isCodeNode(node)).toBe(false);
    });

    it('should return false for non-object content', () => {
      const node = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: 'const x = 1;',
      };
      expect(isCodeNode(node)).toBe(false);
    });

    it('should return false for element node', () => {
      const node = { kind: 'element', tag: 'code' };
      expect(isCodeNode(node)).toBe(false);
    });

    it('should return false for text node', () => {
      const node = { kind: 'text', value: { expr: 'lit', value: 'code' } };
      expect(isCodeNode(node)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isCodeNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isCodeNode(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isCodeNode('code')).toBe(false);
      expect(isCodeNode(42)).toBe(false);
    });
  });

  describe('isViewNode with markdown and code', () => {
    it('should return true for valid markdown node', () => {
      expect(
        isViewNode({
          kind: 'markdown',
          content: { expr: 'lit', value: '# Title' },
        })
      ).toBe(true);
    });

    it('should return true for valid code node', () => {
      expect(
        isViewNode({
          kind: 'code',
          language: { expr: 'lit', value: 'python' },
          content: { expr: 'lit', value: 'print("hello")' },
        })
      ).toBe(true);
    });
  });
});

// ==================== StateField Type Guards ====================

describe('StateField Type Guards', () => {
  describe('isNumberField', () => {
    it('should return true for valid number field', () => {
      const field = { type: 'number', initial: 0 };
      expect(isNumberField(field)).toBe(true);
    });

    it('should return true for negative initial value', () => {
      const field = { type: 'number', initial: -10 };
      expect(isNumberField(field)).toBe(true);
    });

    it('should return true for float initial value', () => {
      const field = { type: 'number', initial: 3.14 };
      expect(isNumberField(field)).toBe(true);
    });

    it('should return false for string initial value', () => {
      const field = { type: 'number', initial: '0' };
      expect(isNumberField(field)).toBe(false);
    });

    it('should return false for string type', () => {
      const field = { type: 'string', initial: 'hello' };
      expect(isNumberField(field)).toBe(false);
    });
  });

  describe('isStringField', () => {
    it('should return true for valid string field', () => {
      const field = { type: 'string', initial: '' };
      expect(isStringField(field)).toBe(true);
    });

    it('should return true for non-empty initial value', () => {
      const field = { type: 'string', initial: 'hello world' };
      expect(isStringField(field)).toBe(true);
    });

    it('should return false for number initial value', () => {
      const field = { type: 'string', initial: 0 };
      expect(isStringField(field)).toBe(false);
    });

    it('should return false for number type', () => {
      const field = { type: 'number', initial: 0 };
      expect(isStringField(field)).toBe(false);
    });
  });

  describe('isListField', () => {
    it('should return true for valid list field with empty array', () => {
      const field = { type: 'list', initial: [] };
      expect(isListField(field)).toBe(true);
    });

    it('should return true for list with initial items', () => {
      const field = { type: 'list', initial: ['a', 'b', 'c'] };
      expect(isListField(field)).toBe(true);
    });

    it('should return true for list with mixed initial items', () => {
      const field = { type: 'list', initial: [1, 'two', { three: 3 }] };
      expect(isListField(field)).toBe(true);
    });

    it('should return false for non-array initial value', () => {
      const field = { type: 'list', initial: {} };
      expect(isListField(field)).toBe(false);
    });

    it('should return false for string type', () => {
      const field = { type: 'string', initial: '[]' };
      expect(isListField(field)).toBe(false);
    });
  });

  describe('isStateField', () => {
    it('should return true for all valid state field types', () => {
      expect(isStateField({ type: 'number', initial: 0 })).toBe(true);
      expect(isStateField({ type: 'string', initial: '' })).toBe(true);
      expect(isStateField({ type: 'list', initial: [] })).toBe(true);
    });

    it('should return true for boolean field', () => {
      expect(isStateField({ type: 'boolean', initial: true })).toBe(true);
      expect(isStateField({ type: 'boolean', initial: false })).toBe(true);
    });

    it('should return true for object field', () => {
      expect(isStateField({ type: 'object', initial: {} })).toBe(true);
      expect(isStateField({ type: 'object', initial: { key: 'value' } })).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(isStateField({ type: 'unknown', initial: null })).toBe(false);
      expect(isStateField({ type: 'array', initial: [] })).toBe(false);
    });

    it('should return false for missing initial value', () => {
      expect(isStateField({ type: 'number' })).toBe(false);
    });
  });
});
