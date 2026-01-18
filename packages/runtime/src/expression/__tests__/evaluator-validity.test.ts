/**
 * Test module for Validity Expression Evaluator.
 *
 * Coverage:
 * - ValidityExpr evaluates to validity state from form element ref
 * - Returns validity.valid property (boolean)
 * - Returns validity.valueMissing for empty required input
 * - Returns validity.typeMismatch for invalid email
 * - Returns validity.patternMismatch for pattern violation
 * - Returns validation message via 'message' property
 * - Handles non-existent ref gracefully
 *
 * TDD Red Phase: These tests verify the runtime evaluation of validity expressions
 * that will be added to support form validation state access in Constela DSL.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, type EvaluationContext } from '../evaluator.js';
import type { CompiledExpression } from '@constela/compiler';

/**
 * Type definition for ValidityExpr - to be added to @constela/compiler
 * This serves as documentation for the expected interface.
 */
interface ValidityExpr {
  expr: 'validity';
  ref: string;
  property?:
    | 'valid'
    | 'valueMissing'
    | 'typeMismatch'
    | 'patternMismatch'
    | 'tooLong'
    | 'tooShort'
    | 'rangeUnderflow'
    | 'rangeOverflow'
    | 'customError'
    | 'message';
}

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

describe('evaluate with Validity expressions', () => {
  // ==================== Setup ====================

  let mockState: MockStateStore;
  let container: HTMLElement;

  beforeEach(() => {
    mockState = new MockStateStore({});
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper Functions ====================

  function createContextWithRefs(refs: Record<string, Element>): EvaluationContext {
    return {
      state: mockState as EvaluationContext['state'],
      locals: {},
      refs,
    } as EvaluationContext;
  }

  // ==================== valid Property Tests ====================

  describe('validity.valid property', () => {
    it('should return true for valid input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Hello';
      container.appendChild(input);

      const ctx = createContextWithRefs({ myInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'myInput',
        property: 'valid',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should return false for invalid required input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.required = true;
      input.value = ''; // Empty but required
      container.appendChild(input);

      const ctx = createContextWithRefs({ myInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'myInput',
        property: 'valid',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });

    it('should return false for invalid email input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'email';
      input.value = 'not-an-email';
      container.appendChild(input);

      const ctx = createContextWithRefs({ emailInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'emailInput',
        property: 'valid',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });

    it('should return default valid property when property is not specified', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test';
      container.appendChild(input);

      const ctx = createContextWithRefs({ myInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'myInput',
        // No property specified - should return valid by default
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      // Default behavior should return the 'valid' boolean
      expect(result).toBe(true);
    });
  });

  // ==================== valueMissing Property Tests ====================

  describe('validity.valueMissing property', () => {
    it('should return true for empty required input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.required = true;
      input.value = '';
      container.appendChild(input);

      const ctx = createContextWithRefs({ requiredInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'requiredInput',
        property: 'valueMissing',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should return false for filled required input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.required = true;
      input.value = 'filled';
      container.appendChild(input);

      const ctx = createContextWithRefs({ requiredInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'requiredInput',
        property: 'valueMissing',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });

    it('should return false for non-required empty input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.required = false;
      input.value = '';
      container.appendChild(input);

      const ctx = createContextWithRefs({ optionalInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'optionalInput',
        property: 'valueMissing',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });
  });

  // ==================== typeMismatch Property Tests ====================

  describe('validity.typeMismatch property', () => {
    it('should return true for invalid email format', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'email';
      input.value = 'invalid-email';
      container.appendChild(input);

      const ctx = createContextWithRefs({ emailInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'emailInput',
        property: 'typeMismatch',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should return false for valid email format', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'email';
      input.value = 'test@example.com';
      container.appendChild(input);

      const ctx = createContextWithRefs({ emailInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'emailInput',
        property: 'typeMismatch',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });

    it('should return true for invalid URL format', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'url';
      input.value = 'not-a-url';
      container.appendChild(input);

      const ctx = createContextWithRefs({ urlInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'urlInput',
        property: 'typeMismatch',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });
  });

  // ==================== patternMismatch Property Tests ====================

  describe('validity.patternMismatch property', () => {
    it('should return true for pattern violation', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.pattern = '[A-Za-z]+'; // Only letters
      input.value = '12345'; // Numbers - violates pattern
      container.appendChild(input);

      const ctx = createContextWithRefs({ patternInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'patternInput',
        property: 'patternMismatch',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should return false when pattern matches', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.pattern = '[A-Za-z]+';
      input.value = 'letters'; // Matches pattern
      container.appendChild(input);

      const ctx = createContextWithRefs({ patternInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'patternInput',
        property: 'patternMismatch',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });

    it('should return false for input without pattern', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'anything';
      // No pattern attribute
      container.appendChild(input);

      const ctx = createContextWithRefs({ noPatternInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'noPatternInput',
        property: 'patternMismatch',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });
  });

  // ==================== Range Validation Tests ====================

  describe('validity range properties', () => {
    // NOTE: jsdom does not support tooShort/tooLong validity checks.
    // These tests pass in real browsers but fail in jsdom.
    // See: https://github.com/jsdom/jsdom/issues/2898
    it.todo('should return true for tooShort when minlength not met (jsdom limitation)');
    it.todo('should return true for tooLong when maxlength exceeded (jsdom limitation)');

    it('should return true for rangeUnderflow when below min', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '10';
      input.value = '5'; // Below min
      container.appendChild(input);

      const ctx = createContextWithRefs({ numberInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'numberInput',
        property: 'rangeUnderflow',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should return true for rangeOverflow when above max', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'number';
      input.max = '100';
      input.value = '150'; // Above max
      container.appendChild(input);

      const ctx = createContextWithRefs({ numberInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'numberInput',
        property: 'rangeOverflow',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });
  });

  // ==================== customError Property Tests ====================

  describe('validity.customError property', () => {
    it('should return true when setCustomValidity has been called', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.setCustomValidity('Custom error message');
      container.appendChild(input);

      const ctx = createContextWithRefs({ customInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'customInput',
        property: 'customError',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should return false when no custom validity is set', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test';
      container.appendChild(input);

      const ctx = createContextWithRefs({ normalInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'normalInput',
        property: 'customError',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(false);
    });
  });

  // ==================== message Property Tests ====================

  describe('validity message property', () => {
    it('should return validation message for invalid input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'email';
      input.value = 'invalid';
      container.appendChild(input);

      const ctx = createContextWithRefs({ emailInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'emailInput',
        property: 'message',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      // The browser provides a localized validation message
      expect(typeof result).toBe('string');
      expect(result).not.toBe('');
    });

    it('should return empty string for valid input', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'valid';
      container.appendChild(input);

      const ctx = createContextWithRefs({ validInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'validInput',
        property: 'message',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe('');
    });

    it('should return custom validation message when set', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.setCustomValidity('Please enter a valid username');
      container.appendChild(input);

      const ctx = createContextWithRefs({ customInput: input });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'customInput',
        property: 'message',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe('Please enter a valid username');
    });
  });

  // ==================== Error Handling Tests ====================

  describe('error handling', () => {
    it('should handle non-existent ref gracefully', () => {
      // Arrange
      const ctx = createContextWithRefs({});
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'nonExistent',
        property: 'valid',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      // Should return null/undefined or false, not throw
      expect(result).toBeNull();
    });

    it('should handle element without validity property gracefully', () => {
      // Arrange - div element doesn't have validity property
      const div = document.createElement('div');
      container.appendChild(div);

      const ctx = createContextWithRefs({ myDiv: div });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'myDiv',
        property: 'valid',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      // Should return null/undefined, not throw
      expect(result).toBeNull();
    });

    it('should handle undefined refs object gracefully', () => {
      // Arrange
      const ctx: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        // No refs property
      };
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'anyRef',
        property: 'valid',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBeNull();
    });
  });

  // ==================== Different Element Types ====================

  describe('different form element types', () => {
    it('should work with textarea elements', () => {
      // Arrange
      const textarea = document.createElement('textarea');
      textarea.required = true;
      textarea.value = '';
      container.appendChild(textarea);

      const ctx = createContextWithRefs({ myTextarea: textarea });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'myTextarea',
        property: 'valueMissing',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });

    it('should work with select elements', () => {
      // Arrange
      const select = document.createElement('select');
      select.required = true;
      // Empty select with required = valueMissing should be true
      container.appendChild(select);

      const ctx = createContextWithRefs({ mySelect: select });
      const expr: CompiledExpression = {
        expr: 'validity',
        ref: 'mySelect',
        property: 'valueMissing',
      } as unknown as CompiledExpression;

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe(true);
    });
  });

  // ==================== Integration with Conditional Expression ====================

  describe('integration with conditional expression', () => {
    it('should work in conditional expression for form validation', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'email';
      input.value = 'invalid';
      container.appendChild(input);

      const ctx = createContextWithRefs({ emailInput: input });

      // Conditional: if validity.valid then "Valid" else "Invalid"
      const expr: CompiledExpression = {
        expr: 'cond',
        if: {
          expr: 'validity',
          ref: 'emailInput',
          property: 'valid',
        } as unknown as CompiledExpression,
        then: { expr: 'lit', value: 'Valid' },
        else: { expr: 'lit', value: 'Invalid' },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert - Should FAIL because validity expression is not implemented
      expect(result).toBe('Invalid');
    });
  });
});
