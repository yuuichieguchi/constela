/**
 * @constela/compiler - Compiler for Constela UI framework
 *
 * Transforms validated AST into CompiledProgram for runtime execution.
 *
 * Pipeline: AST -> validate pass -> analyze pass -> transform pass -> CompiledProgram
 */

// ==================== Main Compile Function ====================
export { compile } from './compile.js';
export type { CompileResult, CompileSuccess, CompileFailure } from './compile.js';

// ==================== Pass Functions ====================
export { validatePass } from './passes/validate.js';
export type { ValidatePassResult, ValidatePassSuccess, ValidatePassFailure } from './passes/validate.js';

export { analyzePass } from './passes/analyze.js';
// Re-export createUndefinedVarError from @constela/core for convenience
export { createUndefinedVarError } from '@constela/core';
export type { AnalyzePassResult, AnalyzePassSuccess, AnalyzePassFailure, AnalysisContext } from './passes/analyze.js';

export { transformPass } from './passes/transform.js';
export type {
  CompiledProgram,
  CompiledNode,
  CompiledElementNode,
  CompiledTextNode,
  CompiledIfNode,
  CompiledEachNode,
  CompiledExpression,
  CompiledAction,
  CompiledActionStep,
  CompiledSetStep,
  CompiledUpdateStep,
  CompiledFetchStep,
  CompiledEventHandler,
} from './passes/transform.js';
