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
  | 'UNSUPPORTED_VERSION'
  | 'COMPONENT_NOT_FOUND'
  | 'COMPONENT_PROP_MISSING'
  | 'COMPONENT_CYCLE'
  | 'COMPONENT_PROP_TYPE'
  | 'PARAM_UNDEFINED';

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

/**
 * Creates a component not found error
 */
export function createComponentNotFoundError(name: string, path?: string): ConstelaError {
  return new ConstelaError(
    'COMPONENT_NOT_FOUND',
    `Component '${name}' is not defined in components`,
    path
  );
}

/**
 * Creates a missing required prop error
 */
export function createComponentPropMissingError(
  componentName: string,
  propName: string,
  path?: string
): ConstelaError {
  return new ConstelaError(
    'COMPONENT_PROP_MISSING',
    `Component '${componentName}' requires prop '${propName}'`,
    path
  );
}

/**
 * Creates a component cycle error
 */
export function createComponentCycleError(cycle: string[], path?: string): ConstelaError {
  return new ConstelaError(
    'COMPONENT_CYCLE',
    `Circular component reference detected: ${cycle.join(' -> ')}`,
    path
  );
}

/**
 * Creates a prop type mismatch error
 */
export function createComponentPropTypeError(
  componentName: string,
  propName: string,
  expected: string,
  actual: string,
  path?: string
): ConstelaError {
  return new ConstelaError(
    'COMPONENT_PROP_TYPE',
    `Component '${componentName}' prop '${propName}' expects ${expected}, got ${actual}`,
    path
  );
}

/**
 * Creates an undefined param reference error
 */
export function createUndefinedParamError(paramName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'PARAM_UNDEFINED',
    `Undefined param reference: '${paramName}' is not defined in component params`,
    path
  );
}
