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
      });
    });

    it('should handle undefined path in JSON', () => {
      const error = new ConstelaError('UNSUPPORTED_VERSION', 'Version not supported');
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'UNSUPPORTED_VERSION',
        message: 'Version not supported',
        path: undefined,
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
