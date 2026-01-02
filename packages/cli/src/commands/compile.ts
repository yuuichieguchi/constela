/**
 * Compile command for @constela/cli
 *
 * Compiles a Constela program JSON file using @constela/compiler.
 *
 * Usage:
 *   constela compile <input> [options]
 *
 * Options:
 *   -o, --out <path>  Output file path (default: <input>.compiled.json)
 *   --pretty          Pretty-print JSON output
 */

import { compile } from '@constela/compiler';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

export interface CompileOptions {
  out?: string;
  pretty?: boolean;
}

/**
 * Determines the output file path based on input path and options
 */
function getOutputPath(inputPath: string, options: CompileOptions): string {
  if (options.out) {
    return options.out;
  }

  // Replace .json with .compiled.json, or append .compiled.json
  const dir = dirname(inputPath);
  const base = basename(inputPath);

  if (base.endsWith('.json')) {
    const nameWithoutExt = base.slice(0, -5);
    return join(dir, `${nameWithoutExt}.compiled.json`);
  }

  return join(dir, `${base}.compiled.json`);
}

/**
 * Execute the compile command
 *
 * @param inputPath - Path to input JSON file
 * @param options - Command options
 */
export async function compileCommand(
  inputPath: string,
  options: CompileOptions
): Promise<void> {
  // 1. Validate input is a regular file
  try {
    const stat = statSync(inputPath);
    if (!stat.isFile()) {
      console.error(`Error: Input path is not a regular file: ${inputPath}`);
      process.exit(1);
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.error(`Error: File not found: ${inputPath}`);
    } else {
      console.error(`Error: Could not access file: ${inputPath} - ${error.message}`);
    }
    process.exit(1);
  }

  // 2. Read input file
  let fileContent: string;
  try {
    fileContent = readFileSync(inputPath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    console.error(`Error: Could not read file: ${inputPath} - ${error.message}`);
    process.exit(1);
  }

  // 3. Parse JSON
  let inputJson: unknown;
  try {
    inputJson = JSON.parse(fileContent);
  } catch (err) {
    const error = err as SyntaxError;
    console.error(`Error: Invalid JSON: ${error.message}`);
    process.exit(1);
  }

  // 4. Compile
  const result = compile(inputJson);

  if (!result.ok) {
    // Output compile errors to stderr
    for (const error of result.errors) {
      const pathInfo = error.path ? ` at ${error.path}` : '';
      console.error(`Error [${error.code}]: ${error.message}${pathInfo}`);
    }
    process.exit(1);
  }

  // 5. Determine output path
  const outputPath = getOutputPath(inputPath, options);

  // 6. Create output directory if needed
  const outputDir = dirname(outputPath);
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    console.error(`Error: Could not create output directory: ${outputDir} - ${error.message}`);
    process.exit(1);
  }

  // 7. Write output file
  const outputContent = options.pretty
    ? JSON.stringify(result.program, null, 2)
    : JSON.stringify(result.program);

  try {
    writeFileSync(outputPath, outputContent, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    console.error(`Error: Could not write output file: ${outputPath} - ${error.message}`);
    process.exit(1);
  }

  // 8. Print success message
  console.log(`Compiled ${inputPath} → ${outputPath}`);
}
