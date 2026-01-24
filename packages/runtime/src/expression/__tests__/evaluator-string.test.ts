/**
 * Test module for Call Expression evaluation (String methods).
 *
 * Coverage:
 * - length method: Get string length
 * - charAt method: Get character at index
 * - substring method: Extract substring
 * - slice method: Extract substring with negative index support
 * - split method: Split string into array
 * - trim method: Remove leading/trailing whitespace
 * - toUpperCase/toLowerCase: Case conversion
 * - replace method: String replacement
 * - includes/startsWith/endsWith: Substring search
 * - indexOf method: Find index of substring
 * - State string method calls
 * - Error cases (null/undefined target)
 *
 * TDD Red Phase: These tests verify the runtime evaluation of call expressions
 * for string methods. The evaluator does not yet support string methods,
 * so all tests are expected to FAIL.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, type EvaluationContext } from '../evaluator.js';
import type { CompiledExpression } from '@constela/compiler';

// Mock StateStore for testing
class MockStateStore {
  private state: Record<string, unknown>;

  constructor(initialState: Record<string, unknown> = {}) {
    this.state = initialState;
  }

  get(name: string): unknown {
    return this.state[name];
  }

  set(name: string, value: unknown): void {
    this.state[name] = value;
  }
}

describe('evaluate with Call expressions (String methods)', () => {
  // ==================== Setup ====================

  let mockState: MockStateStore;
  let baseContext: EvaluationContext;

  beforeEach(() => {
    mockState = new MockStateStore({});
    baseContext = {
      state: mockState as EvaluationContext['state'],
      locals: {},
    };
  });

  // ==================== Helper Functions ====================

  /**
   * Creates an EvaluationContext with state and locals
   */
  function createContext(
    stateData: Record<string, unknown> = {},
    locals: Record<string, unknown> = {}
  ): EvaluationContext {
    mockState = new MockStateStore(stateData);
    return {
      state: mockState as EvaluationContext['state'],
      locals,
    };
  }

  // ==================== length Method ====================

  describe('length method', () => {
    it('should return string length', () => {
      // Arrange
      // DSL: "hello".length()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should return 0 for empty string', () => {
      // Arrange
      // DSL: "".length()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: '' },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(0);
    });
  });

  // ==================== charAt Method ====================

  describe('charAt method', () => {
    it('should return character at specified index', () => {
      // Arrange
      // DSL: "hello".charAt(1)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'charAt',
        args: [{ expr: 'lit', value: 1 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('e');
    });

    it('should return empty string for out-of-range index', () => {
      // Arrange
      // DSL: "hello".charAt(10)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'charAt',
        args: [{ expr: 'lit', value: 10 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('');
    });

    it('should return first character when index is 0', () => {
      // Arrange
      // DSL: "hello".charAt(0)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'charAt',
        args: [{ expr: 'lit', value: 0 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('h');
    });
  });

  // ==================== substring Method ====================

  describe('substring method', () => {
    it('should return substring from start to end of string', () => {
      // Arrange
      // DSL: "hello".substring(2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'substring',
        args: [{ expr: 'lit', value: 2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('llo');
    });

    it('should return substring between start and end indices', () => {
      // Arrange
      // DSL: "hello".substring(1, 3)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'substring',
        args: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 3 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('el');
    });

    it('should return empty string when start equals end', () => {
      // Arrange
      // DSL: "hello".substring(2, 2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'substring',
        args: [
          { expr: 'lit', value: 2 },
          { expr: 'lit', value: 2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('');
    });
  });

  // ==================== slice Method ====================

  describe('slice method', () => {
    it('should return substring from start to end of string', () => {
      // Arrange
      // DSL: "hello".slice(2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'slice',
        args: [{ expr: 'lit', value: 2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('llo');
    });

    it('should return substring with negative index', () => {
      // Arrange
      // DSL: "hello".slice(-2)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'slice',
        args: [{ expr: 'lit', value: -2 }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('lo');
    });

    it('should return substring between start and end indices', () => {
      // Arrange
      // DSL: "hello".slice(1, 4)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'slice',
        args: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: 4 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('ell');
    });

    it('should handle negative end index', () => {
      // Arrange
      // DSL: "hello".slice(1, -1)
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'slice',
        args: [
          { expr: 'lit', value: 1 },
          { expr: 'lit', value: -1 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('ell');
    });
  });

  // ==================== split Method ====================

  describe('split method', () => {
    it('should split string by separator', () => {
      // Arrange
      // DSL: "a,b,c".split(",")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'a,b,c' },
        method: 'split',
        args: [{ expr: 'lit', value: ',' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should split string by empty separator into characters', () => {
      // Arrange
      // DSL: "abc".split("")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'abc' },
        method: 'split',
        args: [{ expr: 'lit', value: '' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should return array with original string when separator not found', () => {
      // Arrange
      // DSL: "hello".split(",")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'split',
        args: [{ expr: 'lit', value: ',' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['hello']);
    });

    it('should handle multi-character separator', () => {
      // Arrange
      // DSL: "a--b--c".split("--")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'a--b--c' },
        method: 'split',
        args: [{ expr: 'lit', value: '--' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  // ==================== trim Method ====================

  describe('trim method', () => {
    it('should remove leading and trailing whitespace', () => {
      // Arrange
      // DSL: "  hello  ".trim()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: '  hello  ' },
        method: 'trim',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello');
    });

    it('should return empty string when trimming whitespace-only string', () => {
      // Arrange
      // DSL: "   ".trim()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: '   ' },
        method: 'trim',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('');
    });

    it('should return same string when no leading/trailing whitespace', () => {
      // Arrange
      // DSL: "hello".trim()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'trim',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello');
    });
  });

  // ==================== toUpperCase / toLowerCase Methods ====================

  describe('toUpperCase method', () => {
    it('should convert string to uppercase', () => {
      // Arrange
      // DSL: "hello".toUpperCase()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'toUpperCase',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('HELLO');
    });

    it('should handle mixed case string', () => {
      // Arrange
      // DSL: "HeLLo WoRLd".toUpperCase()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'HeLLo WoRLd' },
        method: 'toUpperCase',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('HELLO WORLD');
    });
  });

  describe('toLowerCase method', () => {
    it('should convert string to lowercase', () => {
      // Arrange
      // DSL: "HELLO".toLowerCase()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'HELLO' },
        method: 'toLowerCase',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello');
    });

    it('should handle mixed case string', () => {
      // Arrange
      // DSL: "HeLLo WoRLd".toLowerCase()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'HeLLo WoRLd' },
        method: 'toLowerCase',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello world');
    });
  });

  // ==================== replace Method ====================

  describe('replace method', () => {
    it('should replace first occurrence of search string', () => {
      // Arrange
      // DSL: "hello world".replace("world", "there")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello world' },
        method: 'replace',
        args: [
          { expr: 'lit', value: 'world' },
          { expr: 'lit', value: 'there' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello there');
    });

    it('should only replace first occurrence', () => {
      // Arrange
      // DSL: "hello hello".replace("hello", "hi")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello hello' },
        method: 'replace',
        args: [
          { expr: 'lit', value: 'hello' },
          { expr: 'lit', value: 'hi' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hi hello');
    });

    it('should return original string when search string not found', () => {
      // Arrange
      // DSL: "hello".replace("xyz", "abc")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'replace',
        args: [
          { expr: 'lit', value: 'xyz' },
          { expr: 'lit', value: 'abc' },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello');
    });
  });

  // ==================== includes Method ====================

  describe('includes method', () => {
    it('should return true when string contains substring', () => {
      // Arrange
      // DSL: "hello".includes("ell")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'includes',
        args: [{ expr: 'lit', value: 'ell' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when string does not contain substring', () => {
      // Arrange
      // DSL: "hello".includes("xyz")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'includes',
        args: [{ expr: 'lit', value: 'xyz' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      // Arrange
      // DSL: "hello".includes("ELL")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'includes',
        args: [{ expr: 'lit', value: 'ELL' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==================== startsWith Method ====================

  describe('startsWith method', () => {
    it('should return true when string starts with prefix', () => {
      // Arrange
      // DSL: "hello".startsWith("he")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'startsWith',
        args: [{ expr: 'lit', value: 'he' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when string does not start with prefix', () => {
      // Arrange
      // DSL: "hello".startsWith("lo")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'startsWith',
        args: [{ expr: 'lit', value: 'lo' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for empty prefix', () => {
      // Arrange
      // DSL: "hello".startsWith("")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'startsWith',
        args: [{ expr: 'lit', value: '' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== endsWith Method ====================

  describe('endsWith method', () => {
    it('should return true when string ends with suffix', () => {
      // Arrange
      // DSL: "hello".endsWith("lo")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'endsWith',
        args: [{ expr: 'lit', value: 'lo' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when string does not end with suffix', () => {
      // Arrange
      // DSL: "hello".endsWith("he")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'endsWith',
        args: [{ expr: 'lit', value: 'he' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for empty suffix', () => {
      // Arrange
      // DSL: "hello".endsWith("")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'endsWith',
        args: [{ expr: 'lit', value: '' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== indexOf Method ====================

  describe('indexOf method', () => {
    it('should return index of first occurrence', () => {
      // Arrange
      // DSL: "hello".indexOf("l")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'indexOf',
        args: [{ expr: 'lit', value: 'l' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(2);
    });

    it('should return -1 when substring not found', () => {
      // Arrange
      // DSL: "hello".indexOf("x")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'indexOf',
        args: [{ expr: 'lit', value: 'x' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(-1);
    });

    it('should return 0 for empty search string', () => {
      // Arrange
      // DSL: "hello".indexOf("")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'indexOf',
        args: [{ expr: 'lit', value: '' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(0);
    });

    it('should find multi-character substring', () => {
      // Arrange
      // DSL: "hello world".indexOf("world")
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello world' },
        method: 'indexOf',
        args: [{ expr: 'lit', value: 'world' }],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(6);
    });
  });

  // ==================== State String Method Calls ====================

  describe('state string method calls', () => {
    it('should call length on state string', () => {
      // Arrange
      // DSL: state.name.length()
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'name' },
        method: 'length',
      } as CompiledExpression;
      const ctx = createContext({ name: 'Alice' });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should call toUpperCase on state string', () => {
      // Arrange
      // DSL: state.name.toUpperCase()
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'name' },
        method: 'toUpperCase',
      } as CompiledExpression;
      const ctx = createContext({ name: 'alice' });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('ALICE');
    });

    it('should call split on state string', () => {
      // Arrange
      // DSL: state.tags.split(",")
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'tags' },
        method: 'split',
        args: [{ expr: 'lit', value: ',' }],
      } as CompiledExpression;
      const ctx = createContext({ tags: 'react,typescript,node' });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toEqual(['react', 'typescript', 'node']);
    });

    it('should call replace on state string', () => {
      // Arrange
      // DSL: state.message.replace(searchTerm, replacement)
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'message' },
        method: 'replace',
        args: [
          { expr: 'var', name: 'searchTerm' },
          { expr: 'var', name: 'replacement' },
        ],
      } as CompiledExpression;
      const ctx = createContext(
        { message: 'Hello World' },
        { searchTerm: 'World', replacement: 'Universe' }
      );

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('Hello Universe');
    });

    it('should call includes on state string with variable', () => {
      // Arrange
      // DSL: state.text.includes(searchText)
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'text' },
        method: 'includes',
        args: [{ expr: 'var', name: 'searchText' }],
      } as CompiledExpression;
      const ctx = createContext(
        { text: 'The quick brown fox' },
        { searchText: 'brown' }
      );

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== Error Cases ====================

  describe('error cases', () => {
    it('should return undefined when target is null', () => {
      // Arrange
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: null },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when target is undefined state', () => {
      // Arrange
      const expr = {
        expr: 'call',
        target: { expr: 'state', name: 'nonexistent' },
        method: 'length',
      } as CompiledExpression;
      const ctx = createContext({});

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when method is not whitelisted', () => {
      // Arrange
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'hello' },
        method: 'unsafeMethod',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when target is number', () => {
      // Arrange
      // Numbers should not support string methods
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 123 },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle unicode characters in length', () => {
      // Arrange
      // DSL: "こんにちは".length()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'こんにちは' },
        method: 'length',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(5);
    });

    it('should handle variable target for string method', () => {
      // Arrange
      // DSL: text.toUpperCase() where text comes from var
      const expr = {
        expr: 'call',
        target: { expr: 'var', name: 'text' },
        method: 'toUpperCase',
      } as CompiledExpression;
      const ctx = createContext({}, { text: 'hello' });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('HELLO');
    });

    it('should handle chained expression as target', () => {
      // Arrange
      // DSL: user.name.toUpperCase() using get expression
      const expr = {
        expr: 'call',
        target: {
          expr: 'get',
          base: { expr: 'var', name: 'user' },
          path: 'name',
        },
        method: 'toUpperCase',
      } as CompiledExpression;
      const ctx = createContext({}, { user: { name: 'alice' } });

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('ALICE');
    });

    it('should handle trim with tabs and newlines', () => {
      // Arrange
      // DSL: "\t\nhello\n\t".trim()
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: '\t\nhello\n\t' },
        method: 'trim',
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe('hello');
    });

    it('should handle split with limit parameter if supported', () => {
      // Arrange
      // DSL: "a,b,c,d".split(",", 2)
      // Note: This test documents expected behavior even if limit is not implemented
      const expr = {
        expr: 'call',
        target: { expr: 'lit', value: 'a,b,c,d' },
        method: 'split',
        args: [
          { expr: 'lit', value: ',' },
          { expr: 'lit', value: 2 },
        ],
      } as CompiledExpression;
      const ctx = baseContext;

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      // If limit is supported, expect ['a', 'b']
      // If not supported, expect ['a', 'b', 'c', 'd'] (full split)
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
