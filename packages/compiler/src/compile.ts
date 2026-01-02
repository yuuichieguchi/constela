/**
 * Main compile function for @constela/compiler
 *
 * This module provides the main compile function that orchestrates
 * the three compilation passes: validate -> analyze -> transform.
 */

import type { ConstelaError } from '@constela/core';
import type { CompiledProgram } from './passes/transform.js';
import { validatePass } from './passes/validate.js';
import { analyzePass } from './passes/analyze.js';
import { transformPass } from './passes/transform.js';

// ==================== Result Types ====================

export interface CompileSuccess {
  ok: true;
  program: CompiledProgram;
}

export interface CompileFailure {
  ok: false;
  errors: ConstelaError[];
}

export type CompileResult = CompileSuccess | CompileFailure;

// ==================== Implementation ====================

/**
 * Compiles a Constela AST into a CompiledProgram
 *
 * Pipeline: validate -> analyze -> transform
 *
 * @param input - Raw AST input to compile
 * @returns CompileResult with either compiled program or errors
 */
export function compile(input: unknown): CompileResult {
  // Pass 1: Validate
  const validateResult = validatePass(input);
  if (!validateResult.ok) {
    return {
      ok: false,
      errors: [validateResult.error],
    };
  }

  // Pass 2: Analyze
  const analyzeResult = analyzePass(validateResult.ast);
  if (!analyzeResult.ok) {
    return {
      ok: false,
      errors: analyzeResult.errors,
    };
  }

  // Pass 3: Transform
  const program = transformPass(analyzeResult.ast, analyzeResult.context);

  return {
    ok: true,
    program,
  };
}
