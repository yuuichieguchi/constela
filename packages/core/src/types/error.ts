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
  | 'PARAM_UNDEFINED'
  | 'OPERATION_INVALID_FOR_TYPE'
  | 'OPERATION_MISSING_FIELD'
  | 'OPERATION_UNKNOWN'
  | 'EXPR_INVALID_BASE'
  | 'EXPR_INVALID_CONDITION'
  | 'EXPR_COND_ELSE_REQUIRED'
  | 'UNDEFINED_ROUTE_PARAM'
  | 'ROUTE_NOT_DEFINED'
  | 'UNDEFINED_IMPORT'
  | 'IMPORTS_NOT_DEFINED'
  // Layout-related error codes
  | 'LAYOUT_MISSING_SLOT'
  | 'LAYOUT_NOT_FOUND'
  | 'INVALID_SLOT_NAME'
  | 'DUPLICATE_SLOT_NAME'
  | 'DUPLICATE_DEFAULT_SLOT'
  | 'SLOT_IN_LOOP'
  // Data source-related error codes
  | 'INVALID_DATA_SOURCE'
  | 'UNDEFINED_DATA_SOURCE'
  | 'DATA_NOT_DEFINED'
  | 'UNDEFINED_DATA'
  // Browser action-related error codes
  | 'INVALID_STORAGE_OPERATION'
  | 'INVALID_STORAGE_TYPE'
  | 'STORAGE_SET_MISSING_VALUE'
  | 'INVALID_CLIPBOARD_OPERATION'
  | 'CLIPBOARD_WRITE_MISSING_VALUE'
  | 'INVALID_NAVIGATE_TARGET';

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

/**
 * Creates an operation invalid for type error
 */
export function createOperationInvalidForTypeError(
  operation: string,
  stateType: string,
  path?: string
): ConstelaError {
  return new ConstelaError(
    'OPERATION_INVALID_FOR_TYPE',
    `Operation '${operation}' is not valid for state type '${stateType}'`,
    path
  );
}

/**
 * Creates an operation missing field error
 */
export function createOperationMissingFieldError(
  operation: string,
  field: string,
  path?: string
): ConstelaError {
  return new ConstelaError(
    'OPERATION_MISSING_FIELD',
    `Operation '${operation}' requires field '${field}'`,
    path
  );
}

/**
 * Creates an operation unknown error
 */
export function createOperationUnknownError(
  operation: string,
  path?: string
): ConstelaError {
  return new ConstelaError(
    'OPERATION_UNKNOWN',
    `Unknown operation: '${operation}'`,
    path
  );
}

/**
 * Creates a cond else required error
 */
export function createCondElseRequiredError(path?: string): ConstelaError {
  return new ConstelaError(
    'EXPR_COND_ELSE_REQUIRED',
    `Cond expression requires 'else' field`,
    path
  );
}

/**
 * Creates an undefined route param error
 */
export function createUndefinedRouteParamError(paramName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'UNDEFINED_ROUTE_PARAM',
    `Undefined route param reference: '${paramName}' is not defined in route path`,
    path
  );
}

/**
 * Creates a route not defined error
 */
export function createRouteNotDefinedError(path?: string): ConstelaError {
  return new ConstelaError(
    'ROUTE_NOT_DEFINED',
    `Route expression used but no route is defined in the program`,
    path
  );
}

/**
 * Creates an undefined import reference error
 */
export function createUndefinedImportError(importName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'UNDEFINED_IMPORT',
    `Undefined import reference: '${importName}' is not defined in imports`,
    path
  );
}

/**
 * Creates an imports not defined error
 */
export function createImportsNotDefinedError(path?: string): ConstelaError {
  return new ConstelaError(
    'IMPORTS_NOT_DEFINED',
    `Import expression used but no imports are defined in the program`,
    path
  );
}

// ==================== Layout Error Factory Functions ====================

/**
 * Creates a layout missing slot error
 */
export function createLayoutMissingSlotError(path?: string): ConstelaError {
  return new ConstelaError(
    'LAYOUT_MISSING_SLOT',
    `Layout must contain at least one slot node for page content`,
    path
  );
}

/**
 * Creates a layout not found error
 */
export function createLayoutNotFoundError(layoutName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'LAYOUT_NOT_FOUND',
    `Layout '${layoutName}' is not found`,
    path
  );
}

/**
 * Creates an invalid slot name error
 */
export function createInvalidSlotNameError(slotName: string, layoutName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'INVALID_SLOT_NAME',
    `Named slot '${slotName}' does not exist in layout '${layoutName}'`,
    path
  );
}

/**
 * Creates a duplicate slot name error
 */
export function createDuplicateSlotNameError(slotName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'DUPLICATE_SLOT_NAME',
    `Duplicate named slot '${slotName}' found in layout`,
    path
  );
}

/**
 * Creates a duplicate default slot error
 */
export function createDuplicateDefaultSlotError(path?: string): ConstelaError {
  return new ConstelaError(
    'DUPLICATE_DEFAULT_SLOT',
    `Layout contains multiple default (unnamed) slots`,
    path
  );
}

/**
 * Creates a slot in loop error
 */
export function createSlotInLoopError(path?: string): ConstelaError {
  return new ConstelaError(
    'SLOT_IN_LOOP',
    `Slot cannot be placed inside a loop (each node) as it would render multiple times`,
    path
  );
}

// ==================== Data Source Error Factory Functions ====================

/**
 * Creates an invalid data source error
 */
export function createInvalidDataSourceError(dataName: string, reason: string, path?: string): ConstelaError {
  return new ConstelaError(
    'INVALID_DATA_SOURCE',
    `Invalid data source '${dataName}': ${reason}`,
    path
  );
}

/**
 * Creates an undefined data source error (for getStaticPaths)
 */
export function createUndefinedDataSourceError(sourceName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'UNDEFINED_DATA_SOURCE',
    `Undefined data source reference: '${sourceName}' is not defined in data`,
    path
  );
}

/**
 * Creates a data not defined error (for data or getStaticPaths used without data field)
 */
export function createDataNotDefinedError(path?: string): ConstelaError {
  return new ConstelaError(
    'DATA_NOT_DEFINED',
    `Data expression or getStaticPaths used but no data is defined in the program`,
    path
  );
}

/**
 * Creates an undefined data error (for DataExpr references)
 */
export function createUndefinedDataError(dataName: string, path?: string): ConstelaError {
  return new ConstelaError(
    'UNDEFINED_DATA',
    `Undefined data reference: '${dataName}' is not defined in data`,
    path
  );
}

// ==================== Browser Action Error Factory Functions ====================

/**
 * Creates an invalid storage operation error
 */
export function createInvalidStorageOperationError(operation: string, path?: string): ConstelaError {
  return new ConstelaError(
    'INVALID_STORAGE_OPERATION',
    `Invalid storage operation: '${operation}'. Valid operations are: get, set, remove`,
    path
  );
}

/**
 * Creates an invalid storage type error
 */
export function createInvalidStorageTypeError(storageType: string, path?: string): ConstelaError {
  return new ConstelaError(
    'INVALID_STORAGE_TYPE',
    `Invalid storage type: '${storageType}'. Valid types are: local, session`,
    path
  );
}

/**
 * Creates a storage set missing value error
 */
export function createStorageSetMissingValueError(path?: string): ConstelaError {
  return new ConstelaError(
    'STORAGE_SET_MISSING_VALUE',
    `Storage 'set' operation requires a 'value' field`,
    path
  );
}

/**
 * Creates an invalid clipboard operation error
 */
export function createInvalidClipboardOperationError(operation: string, path?: string): ConstelaError {
  return new ConstelaError(
    'INVALID_CLIPBOARD_OPERATION',
    `Invalid clipboard operation: '${operation}'. Valid operations are: write, read`,
    path
  );
}

/**
 * Creates a clipboard write missing value error
 */
export function createClipboardWriteMissingValueError(path?: string): ConstelaError {
  return new ConstelaError(
    'CLIPBOARD_WRITE_MISSING_VALUE',
    `Clipboard 'write' operation requires a 'value' field`,
    path
  );
}

/**
 * Creates an invalid navigate target error
 */
export function createInvalidNavigateTargetError(target: string, path?: string): ConstelaError {
  return new ConstelaError(
    'INVALID_NAVIGATE_TARGET',
    `Invalid navigate target: '${target}'. Valid targets are: _self, _blank`,
    path
  );
}
