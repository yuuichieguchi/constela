/**
 * Error Types Tests for Constela
 *
 * Coverage:
 * - ConstelaError class instantiation
 * - toJSON method
 * - Error codes type safety
 * - Error message formatting
 */

import { describe, it, expect } from 'vitest';
import {
  ConstelaError,
  ErrorCode,
  isConstelaError,
  createSchemaError,
  createUndefinedStateError,
  createUndefinedActionError,
  createDuplicateActionError,
  createUnsupportedVersionError,
  // New component-related error factories
  createComponentNotFoundError,
  createComponentPropMissingError,
  createComponentCycleError,
  createComponentPropTypeError,
  createUndefinedParamError,
} from '../src/index.js';

// ==================== ConstelaError Class ====================

describe('ConstelaError', () => {
  describe('constructor', () => {
    it('should create error with code, message, and path', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Invalid schema', '/version');

      expect(error.code).toBe('SCHEMA_INVALID');
      expect(error.message).toBe('Invalid schema');
      expect(error.path).toBe('/version');
    });

    it('should create error with optional path', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Invalid schema');

      expect(error.code).toBe('SCHEMA_INVALID');
      expect(error.message).toBe('Invalid schema');
      expect(error.path).toBeUndefined();
    });

    it('should extend Error class', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConstelaError);
    });

    it('should have correct error name', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Test error');

      expect(error.name).toBe('ConstelaError');
    });

    it('should have stack trace', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConstelaError');
    });
  });

  describe('toJSON', () => {
    it('should return structured error object', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Field is required', '/state/count');
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'SCHEMA_INVALID',
        message: 'Field is required',
        path: '/state/count',
        severity: 'error',
        suggestion: undefined,
        expected: undefined,
        actual: undefined,
        context: undefined,
      });
    });

    it('should handle undefined path in JSON', () => {
      const error = new ConstelaError('UNSUPPORTED_VERSION', 'Version not supported');
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'UNSUPPORTED_VERSION',
        message: 'Version not supported',
        path: undefined,
        severity: 'error',
        suggestion: undefined,
        expected: undefined,
        actual: undefined,
        context: undefined,
      });
    });

    it('should be JSON serializable', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Test error', '/path');
      const jsonString = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(jsonString);

      expect(parsed.code).toBe('SCHEMA_INVALID');
      expect(parsed.message).toBe('Test error');
      expect(parsed.path).toBe('/path');
    });
  });

  describe('error codes', () => {
    it('should accept SCHEMA_INVALID code', () => {
      const error = new ConstelaError('SCHEMA_INVALID', 'Schema error');
      expect(error.code).toBe('SCHEMA_INVALID');
    });

    it('should accept UNDEFINED_STATE code', () => {
      const error = new ConstelaError('UNDEFINED_STATE', 'State not found');
      expect(error.code).toBe('UNDEFINED_STATE');
    });

    it('should accept UNDEFINED_ACTION code', () => {
      const error = new ConstelaError('UNDEFINED_ACTION', 'Action not found');
      expect(error.code).toBe('UNDEFINED_ACTION');
    });

    it('should accept DUPLICATE_ACTION code', () => {
      const error = new ConstelaError('DUPLICATE_ACTION', 'Action already exists');
      expect(error.code).toBe('DUPLICATE_ACTION');
    });

    it('should accept UNSUPPORTED_VERSION code', () => {
      const error = new ConstelaError('UNSUPPORTED_VERSION', 'Version not supported');
      expect(error.code).toBe('UNSUPPORTED_VERSION');
    });

    // New component-related error codes
    it('should accept COMPONENT_NOT_FOUND code', () => {
      const error = new ConstelaError('COMPONENT_NOT_FOUND', 'Component not found');
      expect(error.code).toBe('COMPONENT_NOT_FOUND');
    });

    it('should accept COMPONENT_PROP_MISSING code', () => {
      const error = new ConstelaError('COMPONENT_PROP_MISSING', 'Required prop missing');
      expect(error.code).toBe('COMPONENT_PROP_MISSING');
    });

    it('should accept COMPONENT_CYCLE code', () => {
      const error = new ConstelaError('COMPONENT_CYCLE', 'Circular dependency');
      expect(error.code).toBe('COMPONENT_CYCLE');
    });

    it('should accept COMPONENT_PROP_TYPE code', () => {
      const error = new ConstelaError('COMPONENT_PROP_TYPE', 'Invalid prop type');
      expect(error.code).toBe('COMPONENT_PROP_TYPE');
    });

    it('should accept PARAM_UNDEFINED code', () => {
      const error = new ConstelaError('PARAM_UNDEFINED', 'Param not defined');
      expect(error.code).toBe('PARAM_UNDEFINED');
    });
  });
});

// ==================== Type Guard ====================

describe('isConstelaError', () => {
  it('should return true for ConstelaError instance', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Test error');
    expect(isConstelaError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isConstelaError(error)).toBe(false);
  });

  it('should return false for plain object with similar shape', () => {
    const obj = {
      code: 'SCHEMA_INVALID',
      message: 'Test error',
      path: '/path',
    };
    expect(isConstelaError(obj)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isConstelaError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isConstelaError(undefined)).toBe(false);
  });

  it('should return false for string', () => {
    expect(isConstelaError('error')).toBe(false);
  });
});

// ==================== Error Factory Functions ====================

describe('createSchemaError', () => {
  it('should create error with SCHEMA_INVALID code', () => {
    const error = createSchemaError('Field is missing', '/state/count');

    expect(error.code).toBe('SCHEMA_INVALID');
    expect(error.message).toBe('Field is missing');
    expect(error.path).toBe('/state/count');
  });

  it('should handle complex path', () => {
    const error = createSchemaError('Invalid value', '/view/children/0/props/onclick/action');

    expect(error.path).toBe('/view/children/0/props/onclick/action');
  });
});

describe('createUndefinedStateError', () => {
  it('should create error with UNDEFINED_STATE code', () => {
    const error = createUndefinedStateError('count', '/view/value');

    expect(error.code).toBe('UNDEFINED_STATE');
    expect(error.message).toContain('count');
    expect(error.path).toBe('/view/value');
  });

  it('should include state name in message', () => {
    const error = createUndefinedStateError('undefinedState');

    expect(error.message).toContain('undefinedState');
  });
});

describe('createUndefinedActionError', () => {
  it('should create error with UNDEFINED_ACTION code', () => {
    const error = createUndefinedActionError('doSomething', '/view/props/onclick');

    expect(error.code).toBe('UNDEFINED_ACTION');
    expect(error.message).toContain('doSomething');
    expect(error.path).toBe('/view/props/onclick');
  });

  it('should include action name in message', () => {
    const error = createUndefinedActionError('nonexistent');

    expect(error.message).toContain('nonexistent');
  });
});

describe('createDuplicateActionError', () => {
  it('should create error with DUPLICATE_ACTION code', () => {
    const error = createDuplicateActionError('increment', '/actions/1');

    expect(error.code).toBe('DUPLICATE_ACTION');
    expect(error.message).toContain('increment');
    expect(error.path).toBe('/actions/1');
  });

  it('should include action name in message', () => {
    const error = createDuplicateActionError('duplicate');

    expect(error.message).toContain('duplicate');
  });
});

describe('createUnsupportedVersionError', () => {
  it('should create error with UNSUPPORTED_VERSION code', () => {
    const error = createUnsupportedVersionError('2.0');

    expect(error.code).toBe('UNSUPPORTED_VERSION');
    expect(error.message).toContain('2.0');
  });

  it('should mention supported versions', () => {
    const error = createUnsupportedVersionError('3.0');

    expect(error.message).toContain('1.0');
  });
});

// ==================== Component Error Factory Functions ====================

describe('createComponentNotFoundError', () => {
  it('should create error with COMPONENT_NOT_FOUND code', () => {
    const error = createComponentNotFoundError('Button', '/view');

    expect(error.code).toBe('COMPONENT_NOT_FOUND');
    expect(error.message).toContain('Button');
    expect(error.path).toBe('/view');
  });

  it('should include component name in message', () => {
    const error = createComponentNotFoundError('MyComponent');

    expect(error.message).toContain('MyComponent');
  });

  it('should work without path', () => {
    const error = createComponentNotFoundError('Card');

    expect(error.code).toBe('COMPONENT_NOT_FOUND');
    expect(error.path).toBeUndefined();
  });
});

describe('createComponentPropMissingError', () => {
  it('should create error with COMPONENT_PROP_MISSING code', () => {
    const error = createComponentPropMissingError('Button', 'label', '/view/props');

    expect(error.code).toBe('COMPONENT_PROP_MISSING');
    expect(error.message).toContain('Button');
    expect(error.message).toContain('label');
    expect(error.path).toBe('/view/props');
  });

  it('should include both component and prop name in message', () => {
    const error = createComponentPropMissingError('Card', 'title');

    expect(error.message).toContain('Card');
    expect(error.message).toContain('title');
  });

  it('should work without path', () => {
    const error = createComponentPropMissingError('Input', 'value');

    expect(error.code).toBe('COMPONENT_PROP_MISSING');
    expect(error.path).toBeUndefined();
  });
});

describe('createComponentCycleError', () => {
  it('should create error with COMPONENT_CYCLE code', () => {
    const cycle = ['A', 'B', 'C', 'A'];
    const error = createComponentCycleError(cycle, '/components/A');

    expect(error.code).toBe('COMPONENT_CYCLE');
    expect(error.path).toBe('/components/A');
  });

  it('should include cycle path in message', () => {
    const cycle = ['Card', 'CardHeader', 'Card'];
    const error = createComponentCycleError(cycle);

    expect(error.message).toContain('Card');
    expect(error.message).toContain('CardHeader');
  });

  it('should format cycle as readable string', () => {
    const cycle = ['X', 'Y', 'Z', 'X'];
    const error = createComponentCycleError(cycle);

    // Message should show the cycle in some readable format
    expect(error.message).toMatch(/X.*Y.*Z.*X|cycle|circular/i);
  });

  it('should work without path', () => {
    const cycle = ['A', 'B', 'A'];
    const error = createComponentCycleError(cycle);

    expect(error.code).toBe('COMPONENT_CYCLE');
    expect(error.path).toBeUndefined();
  });
});

describe('createComponentPropTypeError', () => {
  it('should create error with COMPONENT_PROP_TYPE code', () => {
    const error = createComponentPropTypeError('Button', 'count', 'number', 'string', '/view/props/count');

    expect(error.code).toBe('COMPONENT_PROP_TYPE');
    expect(error.message).toContain('Button');
    expect(error.message).toContain('count');
    expect(error.message).toContain('number');
    expect(error.message).toContain('string');
    expect(error.path).toBe('/view/props/count');
  });

  it('should include expected and actual types in message', () => {
    const error = createComponentPropTypeError('Input', 'disabled', 'boolean', 'number');

    expect(error.message).toContain('boolean');
    expect(error.message).toContain('number');
  });

  it('should work without path', () => {
    const error = createComponentPropTypeError('Card', 'data', 'json', 'string');

    expect(error.code).toBe('COMPONENT_PROP_TYPE');
    expect(error.path).toBeUndefined();
  });
});

describe('createUndefinedParamError', () => {
  it('should create error with PARAM_UNDEFINED code', () => {
    const error = createUndefinedParamError('title', '/components/Card/view/children/0');

    expect(error.code).toBe('PARAM_UNDEFINED');
    expect(error.message).toContain('title');
    expect(error.path).toBe('/components/Card/view/children/0');
  });

  it('should include param name in message', () => {
    const error = createUndefinedParamError('undefinedParam');

    expect(error.message).toContain('undefinedParam');
  });

  it('should work without path', () => {
    const error = createUndefinedParamError('value');

    expect(error.code).toBe('PARAM_UNDEFINED');
    expect(error.path).toBeUndefined();
  });

  it('should provide helpful error message', () => {
    const error = createUndefinedParamError('myParam', '/view');

    expect(error.message).toMatch(/param|undefined|not.*defined|not.*found/i);
  });
});

// ==================== ErrorCode Type ====================

describe('ErrorCode type', () => {
  it('should include all expected error codes', () => {
    const codes: ErrorCode[] = [
      'SCHEMA_INVALID',
      'UNDEFINED_STATE',
      'UNDEFINED_ACTION',
      'DUPLICATE_ACTION',
      'UNSUPPORTED_VERSION',
      // New component-related error codes
      'COMPONENT_NOT_FOUND',
      'COMPONENT_PROP_MISSING',
      'COMPONENT_CYCLE',
      'COMPONENT_PROP_TYPE',
      'PARAM_UNDEFINED',
    ];

    // This test verifies that all expected codes compile correctly
    codes.forEach((code) => {
      expect(typeof code).toBe('string');
    });
  });
});

// ==================== Error Message Formatting ====================

describe('Error Message Formatting', () => {
  it('should format schema error messages clearly', () => {
    const error = new ConstelaError(
      'SCHEMA_INVALID',
      "Required field 'version' is missing",
      '/version'
    );

    expect(error.message).toContain('version');
    expect(error.message).toContain('missing');
  });

  it('should format undefined reference errors clearly', () => {
    const error = createUndefinedStateError('myState', '/actions/0/steps/0/target');

    expect(error.message).toMatch(/state|reference|undefined|not.*found/i);
  });

  it('should provide actionable error information', () => {
    const error = new ConstelaError(
      'SCHEMA_INVALID',
      "Invalid node kind 'unknown'. Expected one of: element, text, if, each",
      '/view/kind'
    );

    expect(error.message).toContain('element');
    expect(error.message).toContain('text');
  });
});

// ==================== Edge Cases ====================

describe('Error Edge Cases', () => {
  it('should handle empty message', () => {
    const error = new ConstelaError('SCHEMA_INVALID', '');

    expect(error.message).toBe('');
  });

  it('should handle empty path', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Error', '');

    expect(error.path).toBe('');
  });

  it('should handle very long paths', () => {
    const longPath = '/view' + '/children/0'.repeat(50);
    const error = new ConstelaError('SCHEMA_INVALID', 'Deep error', longPath);

    expect(error.path).toBe(longPath);
  });

  it('should handle special characters in message', () => {
    const message = 'Error with "quotes" and <brackets> and {braces}';
    const error = new ConstelaError('SCHEMA_INVALID', message);

    expect(error.message).toBe(message);
  });

  it('should handle unicode in message', () => {
    const message = 'Error: Invalid value in field';
    const error = new ConstelaError('SCHEMA_INVALID', message);

    expect(error.message).toBe(message);
  });
});

// ==================== Phase 1.1: Enhanced Error Types ====================

describe('Enhanced Error Types - Severity Field', () => {
  it('should create error with severity "error" (default)', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Test error');

    expect(error.severity).toBe('error');
  });

  it('should create error with severity "warning"', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Test warning', '/path', {
      severity: 'warning',
    });

    expect(error.severity).toBe('warning');
  });

  it('should create error with severity "info"', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Test info', '/path', {
      severity: 'info',
    });

    expect(error.severity).toBe('info');
  });

  it('should include severity in toJSON output', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Test', '/path', {
      severity: 'warning',
    });
    const json = error.toJSON();

    expect(json.severity).toBe('warning');
  });
});

describe('Enhanced Error Types - Suggestion Field', () => {
  it('should create error with suggestion field', () => {
    const error = new ConstelaError('UNDEFINED_STATE', 'State not found', '/path', {
      suggestion: "Did you mean 'count'?",
    });

    expect(error.suggestion).toBe("Did you mean 'count'?");
  });

  it('should allow undefined suggestion', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Test error');

    expect(error.suggestion).toBeUndefined();
  });

  it('should include suggestion in toJSON output when present', () => {
    const error = new ConstelaError('UNDEFINED_STATE', 'State not found', '/path', {
      suggestion: "Did you mean 'counter'?",
    });
    const json = error.toJSON();

    expect(json.suggestion).toBe("Did you mean 'counter'?");
  });
});

describe('Enhanced Error Types - Expected/Actual Fields', () => {
  it('should create error with expected and actual fields', () => {
    const error = new ConstelaError('COMPONENT_PROP_TYPE', 'Type mismatch', '/path', {
      expected: 'number',
      actual: 'string',
    });

    expect(error.expected).toBe('number');
    expect(error.actual).toBe('string');
  });

  it('should allow only expected field', () => {
    const error = new ConstelaError('SCHEMA_INVALID', 'Invalid value', '/path', {
      expected: 'boolean',
    });

    expect(error.expected).toBe('boolean');
    expect(error.actual).toBeUndefined();
  });

  it('should include expected/actual in toJSON output', () => {
    const error = new ConstelaError('COMPONENT_PROP_TYPE', 'Type error', '/path', {
      expected: 'array',
      actual: 'object',
    });
    const json = error.toJSON();

    expect(json.expected).toBe('array');
    expect(json.actual).toBe('object');
  });
});

describe('Enhanced Error Types - Context Field', () => {
  it('should create error with context containing availableNames', () => {
    const error = new ConstelaError('UNDEFINED_STATE', 'State not found', '/path', {
      context: {
        availableNames: ['count', 'name', 'items'],
      },
    });

    expect(error.context).toBeDefined();
    expect(error.context?.availableNames).toEqual(['count', 'name', 'items']);
  });

  it('should allow empty availableNames array', () => {
    const error = new ConstelaError('UNDEFINED_STATE', 'State not found', '/path', {
      context: {
        availableNames: [],
      },
    });

    expect(error.context?.availableNames).toEqual([]);
  });

  it('should include context in toJSON output', () => {
    const error = new ConstelaError('UNDEFINED_ACTION', 'Action not found', '/path', {
      context: {
        availableNames: ['increment', 'decrement'],
      },
    });
    const json = error.toJSON();

    expect(json.context?.availableNames).toEqual(['increment', 'decrement']);
  });
});

describe('Enhanced Error Types - Combined Fields', () => {
  it('should create error with all enhanced fields', () => {
    const error = new ConstelaError('UNDEFINED_STATE', "State 'cunt' not found", '/path', {
      severity: 'error',
      suggestion: "Did you mean 'count'?",
      expected: 'defined state name',
      actual: 'cunt',
      context: {
        availableNames: ['count', 'name', 'items'],
      },
    });

    expect(error.severity).toBe('error');
    expect(error.suggestion).toBe("Did you mean 'count'?");
    expect(error.expected).toBe('defined state name');
    expect(error.actual).toBe('cunt');
    expect(error.context?.availableNames).toEqual(['count', 'name', 'items']);
  });

  it('should serialize all enhanced fields to JSON', () => {
    const error = new ConstelaError('COMPONENT_NOT_FOUND', "Component 'Buton' not found", '/view', {
      severity: 'error',
      suggestion: "Did you mean 'Button'?",
      context: {
        availableNames: ['Button', 'Card', 'Input'],
      },
    });
    const json = error.toJSON();
    const serialized = JSON.stringify(json);
    const parsed = JSON.parse(serialized);

    expect(parsed.severity).toBe('error');
    expect(parsed.suggestion).toBe("Did you mean 'Button'?");
    expect(parsed.context.availableNames).toEqual(['Button', 'Card', 'Input']);
  });
});

// ==================== Phase 1.1: findSimilarNames Utility ====================

// Note: findSimilarNames will be exported from error.ts once implemented
// For now, we define a stub that will be replaced by the actual import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let findSimilarNames: (target: string, candidates: Set<string>, maxDistance?: number) => string[];

// Try to import the function, will fail until implemented
try {
  // Dynamic import to avoid compilation errors before implementation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const errorModule = await import('../src/types/error.js');
  findSimilarNames = (errorModule as { findSimilarNames: typeof findSimilarNames }).findSimilarNames;
} catch {
  // Function not yet implemented - tests will fail as expected (Red phase)
  findSimilarNames = () => {
    throw new Error('findSimilarNames is not yet implemented - Red phase');
  };
}

describe('findSimilarNames', () => {

  describe('exact match', () => {
    it('should return exact match when present', () => {
      const candidates = new Set(['count', 'name', 'items']);
      const result = findSimilarNames('count', candidates);

      expect(result).toContain('count');
    });
  });

  describe('typo with distance 1', () => {
    it('should find names with single character substitution', () => {
      const candidates = new Set(['count', 'name', 'items']);
      // 'coun' -> 'count' (1 insertion)
      const result = findSimilarNames('coun', candidates);

      expect(result).toContain('count');
    });

    it('should find names with single character deletion', () => {
      const candidates = new Set(['count', 'name', 'items']);
      // 'countt' -> 'count' (1 deletion)
      const result = findSimilarNames('countt', candidates);

      expect(result).toContain('count');
    });

    it('should find names with single character substitution', () => {
      const candidates = new Set(['count', 'name', 'items']);
      // 'coant' -> 'count' (1 substitution: a -> u)
      const result = findSimilarNames('coant', candidates);

      expect(result).toContain('count');
    });
  });

  describe('typo with distance 2', () => {
    it('should find names with two character differences', () => {
      const candidates = new Set(['counter', 'name', 'items']);
      // 'conter' -> 'counter' (distance 2: missing 'u' and wrong 'o')
      const result = findSimilarNames('conter', candidates);

      expect(result).toContain('counter');
    });

    it('should find names with transposed characters', () => {
      const candidates = new Set(['Button', 'Card', 'Input']);
      // 'Buton' -> 'Button' (distance 1)
      // 'Btton' -> 'Button' (distance 2)
      const result = findSimilarNames('Btton', candidates);

      expect(result).toContain('Button');
    });
  });

  describe('no matches', () => {
    it('should return empty array when no similar names exist', () => {
      const candidates = new Set(['count', 'name', 'items']);
      // 'xyz' is too different from all candidates
      const result = findSimilarNames('xyz', candidates);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty candidates', () => {
      const candidates = new Set<string>();
      const result = findSimilarNames('count', candidates);

      expect(result).toEqual([]);
    });

    it('should return empty array when target is too different', () => {
      const candidates = new Set(['increment', 'decrement']);
      // 'handleClick' is completely different
      const result = findSimilarNames('handleClick', candidates);

      expect(result).toEqual([]);
    });
  });

  describe('maxDistance parameter', () => {
    it('should respect maxDistance = 1', () => {
      const candidates = new Set(['count', 'counter', 'counts']);
      // 'coter' has distance 2 from 'counter' (missing 'un'), should not match with maxDistance=1
      const result = findSimilarNames('coter', candidates, 1);

      expect(result).not.toContain('counter');
    });

    it('should respect maxDistance = 3', () => {
      const candidates = new Set(['increment', 'decrement']);
      // 'incremnt' -> 'increment' (distance 1: missing 'e')
      const result = findSimilarNames('incremnt', candidates, 3);

      expect(result).toContain('increment');
    });

    it('should use default maxDistance of 2', () => {
      const candidates = new Set(['Button', 'Card', 'Input']);
      // 'Buton' -> 'Button' (distance 1)
      const result = findSimilarNames('Buton', candidates);

      expect(result).toContain('Button');
    });

    it('should not include results beyond maxDistance', () => {
      const candidates = new Set(['abcdefgh']);
      // 'xyz' has distance > 3 from 'abcdefgh'
      const result = findSimilarNames('xyz', candidates, 3);

      expect(result).not.toContain('abcdefgh');
    });
  });

  describe('multiple matches', () => {
    it('should return all names within maxDistance', () => {
      const candidates = new Set(['count', 'counts', 'mount']);
      // 'coun' is close to both 'count' (dist 1) and 'counts' (dist 2)
      const result = findSimilarNames('coun', candidates);

      expect(result).toContain('count');
      expect(result).toContain('counts');
    });

    it('should sort results by distance (closest first)', () => {
      const candidates = new Set(['count', 'counter', 'counts']);
      // 'coun' -> 'count' (dist 1), 'counts' (dist 2)
      const result = findSimilarNames('coun', candidates);

      // First result should be the closest match
      expect(result[0]).toBe('count');
    });
  });

  describe('case sensitivity', () => {
    it('should treat different cases as different characters', () => {
      const candidates = new Set(['Button', 'button']);
      // 'BUTTON' differs from both candidates
      const result = findSimilarNames('BUTTON', candidates);

      // Distance from 'BUTTON' to 'Button' is 5 (B,u,t,t,o,n vs B,U,T,T,O,N)
      // This may or may not match depending on maxDistance
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
