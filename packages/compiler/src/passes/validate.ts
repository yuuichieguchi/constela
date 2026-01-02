/**
 * Validate Pass - Schema validation using @constela/core
 *
 * This pass validates the raw input against the Constela AST schema
 * and performs basic semantic validation.
 */

import type { Program, ConstelaError } from '@constela/core';
import { validateAst } from '@constela/core';

// ==================== Types ====================

export interface ValidatePassSuccess {
  ok: true;
  ast: Program;
}

export interface ValidatePassFailure {
  ok: false;
  error: ConstelaError;
}

export type ValidatePassResult = ValidatePassSuccess | ValidatePassFailure;

// ==================== Implementation ====================

/**
 * Validates the AST using @constela/core validateAst
 *
 * @param input - Raw input to validate
 * @returns ValidatePassResult
 */
export function validatePass(input: unknown): ValidatePassResult {
  const result = validateAst(input);

  if (result.ok) {
    return {
      ok: true,
      ast: result.ast,
    };
  }

  return {
    ok: false,
    error: result.error,
  };
}
