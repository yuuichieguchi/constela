/**
 * Test suite for errors.ts
 *
 * Coverage:
 * - AiError base class
 * - AiErrorCode type
 * - ValidationError subclass
 * - SecurityError subclass
 * - Error inheritance chain
 * - Error properties and serialization
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';
import {
  AiError,
  ValidationError,
  SecurityError,
  type AiErrorCode,
} from '../src/errors';

// ==================== AiError Base Class ====================

describe('AiError', () => {
  describe('constructor', () => {
    it('should create an error with message and code', () => {
      const error = new AiError('Test error message', 'API_ERROR');

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('API_ERROR');
    });

    it('should set name to "AiError"', () => {
      const error = new AiError('Test', 'PROVIDER_NOT_FOUND');

      expect(error.name).toBe('AiError');
    });

    it('should be an instance of Error', () => {
      const error = new AiError('Test', 'API_ERROR');

      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of AiError', () => {
      const error = new AiError('Test', 'API_ERROR');

      expect(error).toBeInstanceOf(AiError);
    });

    it('should have a stack trace', () => {
      const error = new AiError('Test', 'API_ERROR');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('error codes', () => {
    it('should accept PROVIDER_NOT_CONFIGURED code', () => {
      const error = new AiError('Provider not configured', 'PROVIDER_NOT_CONFIGURED');
      expect(error.code).toBe('PROVIDER_NOT_CONFIGURED');
    });

    it('should accept PROVIDER_NOT_FOUND code', () => {
      const error = new AiError('Provider not found', 'PROVIDER_NOT_FOUND');
      expect(error.code).toBe('PROVIDER_NOT_FOUND');
    });

    it('should accept API_ERROR code', () => {
      const error = new AiError('API request failed', 'API_ERROR');
      expect(error.code).toBe('API_ERROR');
    });

    it('should accept VALIDATION_ERROR code', () => {
      const error = new AiError('Validation failed', 'VALIDATION_ERROR');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept SECURITY_VIOLATION code', () => {
      const error = new AiError('Security violation', 'SECURITY_VIOLATION');
      expect(error.code).toBe('SECURITY_VIOLATION');
    });

    it('should accept RATE_LIMIT_EXCEEDED code', () => {
      const error = new AiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('readonly code property', () => {
    it('should have readonly code property', () => {
      const error = new AiError('Test', 'API_ERROR');

      // The code property should be readonly
      // This is primarily a compile-time check, but we verify the value exists
      expect(error.code).toBe('API_ERROR');
    });
  });

  describe('error throwing and catching', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw new AiError('Thrown error', 'API_ERROR');
      }).toThrow(AiError);
    });

    it('should preserve message when caught', () => {
      try {
        throw new AiError('Specific message', 'PROVIDER_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(AiError);
        if (error instanceof AiError) {
          expect(error.message).toBe('Specific message');
          expect(error.code).toBe('PROVIDER_NOT_FOUND');
        }
      }
    });

    it('should be catchable as Error', () => {
      expect(() => {
        throw new AiError('Test', 'API_ERROR');
      }).toThrow(Error);
    });
  });
});

// ==================== AiErrorCode Type ====================

describe('AiErrorCode', () => {
  it('should include all valid error codes', () => {
    const validCodes: AiErrorCode[] = [
      'PROVIDER_NOT_CONFIGURED',
      'PROVIDER_NOT_FOUND',
      'API_ERROR',
      'VALIDATION_ERROR',
      'SECURITY_VIOLATION',
      'RATE_LIMIT_EXCEEDED',
    ];

    // Each code should be assignable to AiErrorCode
    validCodes.forEach((code) => {
      const error = new AiError('Test', code);
      expect(error.code).toBe(code);
    });
  });
});

// ==================== ValidationError Subclass ====================

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create an error with message and violations array', () => {
      const violations = ['Field "name" is required', 'Field "age" must be a number'];
      const error = new ValidationError('Validation failed', violations);

      expect(error.message).toBe('Validation failed');
      expect(error.violations).toEqual(violations);
    });

    it('should set code to VALIDATION_ERROR', () => {
      const error = new ValidationError('Test', ['violation']);

      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should set name to "ValidationError"', () => {
      const error = new ValidationError('Test', []);

      expect(error.name).toBe('ValidationError');
    });

    it('should accept empty violations array', () => {
      const error = new ValidationError('No violations', []);

      expect(error.violations).toEqual([]);
      expect(error.violations).toHaveLength(0);
    });

    it('should accept single violation', () => {
      const error = new ValidationError('Single issue', ['One violation']);

      expect(error.violations).toHaveLength(1);
      expect(error.violations[0]).toBe('One violation');
    });

    it('should accept multiple violations', () => {
      const violations = [
        'Error 1',
        'Error 2',
        'Error 3',
        'Error 4',
        'Error 5',
      ];
      const error = new ValidationError('Multiple issues', violations);

      expect(error.violations).toHaveLength(5);
    });
  });

  describe('inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new ValidationError('Test', []);

      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of AiError', () => {
      const error = new ValidationError('Test', []);

      expect(error).toBeInstanceOf(AiError);
    });

    it('should be an instance of ValidationError', () => {
      const error = new ValidationError('Test', []);

      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('readonly violations property', () => {
    it('should have readonly violations array', () => {
      const violations = ['test violation'];
      const error = new ValidationError('Test', violations);

      // Verify the violations are accessible
      expect(error.violations).toEqual(['test violation']);
    });
  });

  describe('error throwing and catching', () => {
    it('should be throwable and catchable as ValidationError', () => {
      expect(() => {
        throw new ValidationError('Validation error', ['error 1']);
      }).toThrow(ValidationError);
    });

    it('should be catchable as AiError', () => {
      expect(() => {
        throw new ValidationError('Test', []);
      }).toThrow(AiError);
    });

    it('should preserve violations when caught', () => {
      const violations = ['violation 1', 'violation 2'];

      try {
        throw new ValidationError('Test', violations);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.violations).toEqual(violations);
        }
      }
    });
  });
});

// ==================== SecurityError Subclass ====================

describe('SecurityError', () => {
  describe('constructor', () => {
    it('should create an error with message and violation string', () => {
      const error = new SecurityError('Security check failed', 'Disallowed tag: script');

      expect(error.message).toBe('Security check failed');
      expect(error.violation).toBe('Disallowed tag: script');
    });

    it('should set code to SECURITY_VIOLATION', () => {
      const error = new SecurityError('Test', 'violation');

      expect(error.code).toBe('SECURITY_VIOLATION');
    });

    it('should set name to "SecurityError"', () => {
      const error = new SecurityError('Test', 'violation');

      expect(error.name).toBe('SecurityError');
    });

    it('should accept empty violation string', () => {
      const error = new SecurityError('Empty violation', '');

      expect(error.violation).toBe('');
    });

    it('should accept detailed violation description', () => {
      const violation = 'Attempted to use blocked URL pattern: javascript:void(0)';
      const error = new SecurityError('URL blocked', violation);

      expect(error.violation).toBe(violation);
    });
  });

  describe('inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new SecurityError('Test', 'violation');

      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of AiError', () => {
      const error = new SecurityError('Test', 'violation');

      expect(error).toBeInstanceOf(AiError);
    });

    it('should be an instance of SecurityError', () => {
      const error = new SecurityError('Test', 'violation');

      expect(error).toBeInstanceOf(SecurityError);
    });
  });

  describe('readonly violation property', () => {
    it('should have readonly violation string', () => {
      const error = new SecurityError('Test', 'test violation');

      expect(error.violation).toBe('test violation');
    });
  });

  describe('error throwing and catching', () => {
    it('should be throwable and catchable as SecurityError', () => {
      expect(() => {
        throw new SecurityError('Security error', 'blocked');
      }).toThrow(SecurityError);
    });

    it('should be catchable as AiError', () => {
      expect(() => {
        throw new SecurityError('Test', 'violation');
      }).toThrow(AiError);
    });

    it('should preserve violation when caught', () => {
      const violation = 'Nesting depth exceeded: 15 > 10';

      try {
        throw new SecurityError('Nesting too deep', violation);
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError);
        if (error instanceof SecurityError) {
          expect(error.violation).toBe(violation);
        }
      }
    });
  });

  describe('common security violations', () => {
    it('should handle disallowed tag violation', () => {
      const error = new SecurityError(
        'Disallowed HTML tag detected',
        'Tag <iframe> is not allowed'
      );

      expect(error.violation).toContain('iframe');
    });

    it('should handle disallowed action violation', () => {
      const error = new SecurityError(
        'Action not permitted',
        'Action "eval" is not in the allowed list'
      );

      expect(error.violation).toContain('eval');
    });

    it('should handle URL pattern violation', () => {
      const error = new SecurityError(
        'URL blocked by security policy',
        'URL "http://malicious.com" does not match allowed patterns'
      );

      expect(error.violation).toContain('malicious.com');
    });

    it('should handle nesting depth violation', () => {
      const error = new SecurityError(
        'Maximum nesting depth exceeded',
        'Current depth: 25, Maximum allowed: 10'
      );

      expect(error.violation).toContain('25');
    });
  });
});

// ==================== Error Type Discrimination ====================

describe('Error type discrimination', () => {
  it('should distinguish between error types using instanceof', () => {
    const aiError = new AiError('Base', 'API_ERROR');
    const validationError = new ValidationError('Validation', ['issue']);
    const securityError = new SecurityError('Security', 'blocked');

    // AiError checks
    expect(aiError instanceof AiError).toBe(true);
    expect(aiError instanceof ValidationError).toBe(false);
    expect(aiError instanceof SecurityError).toBe(false);

    // ValidationError checks
    expect(validationError instanceof AiError).toBe(true);
    expect(validationError instanceof ValidationError).toBe(true);
    expect(validationError instanceof SecurityError).toBe(false);

    // SecurityError checks
    expect(securityError instanceof AiError).toBe(true);
    expect(securityError instanceof ValidationError).toBe(false);
    expect(securityError instanceof SecurityError).toBe(true);
  });

  it('should distinguish between error types using name property', () => {
    const aiError = new AiError('Base', 'API_ERROR');
    const validationError = new ValidationError('Validation', ['issue']);
    const securityError = new SecurityError('Security', 'blocked');

    expect(aiError.name).toBe('AiError');
    expect(validationError.name).toBe('ValidationError');
    expect(securityError.name).toBe('SecurityError');
  });

  it('should allow switching on error code', () => {
    const errors: AiError[] = [
      new AiError('Not configured', 'PROVIDER_NOT_CONFIGURED'),
      new ValidationError('Invalid', ['error']),
      new SecurityError('Blocked', 'violation'),
    ];

    const codes = errors.map((error) => error.code);

    expect(codes).toContain('PROVIDER_NOT_CONFIGURED');
    expect(codes).toContain('VALIDATION_ERROR');
    expect(codes).toContain('SECURITY_VIOLATION');
  });
});

// ==================== Error Serialization ====================

describe('Error serialization', () => {
  it('should serialize AiError to JSON-like structure', () => {
    const error = new AiError('API failed', 'API_ERROR');

    const serialized = {
      name: error.name,
      message: error.message,
      code: error.code,
    };

    expect(serialized).toEqual({
      name: 'AiError',
      message: 'API failed',
      code: 'API_ERROR',
    });
  });

  it('should serialize ValidationError including violations', () => {
    const error = new ValidationError('Invalid input', ['error1', 'error2']);

    const serialized = {
      name: error.name,
      message: error.message,
      code: error.code,
      violations: error.violations,
    };

    expect(serialized).toEqual({
      name: 'ValidationError',
      message: 'Invalid input',
      code: 'VALIDATION_ERROR',
      violations: ['error1', 'error2'],
    });
  });

  it('should serialize SecurityError including violation', () => {
    const error = new SecurityError('Blocked', 'disallowed tag');

    const serialized = {
      name: error.name,
      message: error.message,
      code: error.code,
      violation: error.violation,
    };

    expect(serialized).toEqual({
      name: 'SecurityError',
      message: 'Blocked',
      code: 'SECURITY_VIOLATION',
      violation: 'disallowed tag',
    });
  });
});
