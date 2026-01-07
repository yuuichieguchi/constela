import type { CompiledProgram } from '@constela/compiler';
import type { PageExportFunction } from '../types.js';

/**
 * Type guard to check if a page export is a function (dynamic) or a static program
 *
 * @param exported - The default export from a page module
 * @returns true if the export is a function, false if it's a static CompiledProgram
 */
export function isPageExportFunction(
  exported: CompiledProgram | PageExportFunction
): exported is PageExportFunction {
  return typeof exported === 'function';
}

/**
 * Resolve a page export to a CompiledProgram
 *
 * If the export is a function, it will be called with the route params.
 * If the export is a static CompiledProgram, it will be returned as-is.
 *
 * @param pageDefault - The default export from a page module (function or static program)
 * @param params - Route parameters extracted from the URL
 * @param expectedParams - Optional array of expected parameter names for validation
 * @returns Promise resolving to a CompiledProgram
 * @throws Error if expectedParams is provided and a required param is missing
 */
export async function resolvePageExport(
  pageDefault: CompiledProgram | PageExportFunction,
  params: Record<string, string>,
  expectedParams?: string[]
): Promise<CompiledProgram> {
  if (expectedParams) {
    for (const key of expectedParams) {
      if (!(key in params)) {
        throw new Error(`Missing required route param: ${key}`);
      }
    }
  }
  if (isPageExportFunction(pageDefault)) {
    return await pageDefault(params);
  }
  return pageDefault;
}
