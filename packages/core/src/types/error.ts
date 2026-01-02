/**
 * Error Types for Constela
 *
 * This module defines error types, the ConstelaError class,
 * and factory functions for creating specific errors.
 */

// ==================== Error Codes ====================

export type ErrorCode =
  | 'SCHEMA_INVALID'
  | 'UNDEFINED_STATE'
  | 'UNDEFINED_ACTION'
  | 'VAR_UNDEFINED'
  | 'DUPLICATE_ACTION'
  | 'UNSUPPORTED_VERSION';

// ==================== ConstelaError Class ====================

/**
 * Custom error class for Constela validation errors
 */
export class ConstelaError extends Error {
  public readonly code: ErrorCode;
  public readonly path: string | undefined;

  constructor(code: ErrorCode, message: string, path?: string | undefined) {
    super(message);
    this.name = 'ConstelaError';
    this.code = code;
    this.path = path;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ConstelaError.prototype);
  }

  /**
   * Converts the error to a JSON-serializable object
   */
  toJSON(): { code: ErrorCode; message: string; path: string | undefined } {
    return {
      code: this.code,
      message: this.message,
      path: this.path,
    };
  }
}

// ==================== Type Guard ====================

/**
 * Checks if value is a ConstelaError instance
 */
export function isConstelaError(value: unknown): value is ConstelaError {
  return value instanceof ConstelaError;
}

// ==================== Error Factory Functions ====================

/**
 * Creates a schema validation error
 */
export function createSchemaError(message: string, path?: string): ConstelaError {
  return new ConstelaError('SCHEMA_INVALID', message, path);
}

/**
 * Creates an undefined state reference error
 */
export function createUndefinedStateError(stateName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'UNDEFINED_STATE',
    `Undefined state reference: '${stateName}' is not defined in state`,
    path
  );
}

/**
 * Creates an undefined action reference error
 */
export function createUndefinedActionError(actionName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'UNDEFINED_ACTION',
    `Undefined action reference: '${actionName}' is not defined in actions`,
    path
  );
}

/**
 * Creates a duplicate action name error
 */
export function createDuplicateActionError(actionName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'DUPLICATE_ACTION',
    `Duplicate action name: '${actionName}' is already defined`,
    path
  );
}

/**
 * Creates an undefined variable reference error
 */
export function createUndefinedVarError(varName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'VAR_UNDEFINED',
    `Undefined variable reference: '${varName}' is not defined in scope`,
    path
  );
}

/**
 * Creates an unsupported version error
 */
export function createUnsupportedVersionError(version: string): ConstelaError {
  return new ConstelaError(
    'UNSUPPORTED_VERSION',
    `Unsupported version: '${version}'. Supported versions: 1.0`,
    '/version'
  );
}
