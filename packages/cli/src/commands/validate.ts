/**
 * Validate command for @constela/cli
 *
 * Validates Constela program JSON files using @constela/compiler.
 * This command performs validation only (no transform pass) for faster checking.
 *
 * Usage:
 *   constela validate <input> [options]
 *   constela validate --all <directory>
 *
 * Options:
 *   -a, --all         Validate all JSON files in directory recursively
 *   --json            Output results as JSON
 */

import { validatePass, analyzePass } from '@constela/compiler';
import { ConstelaError } from '@constela/core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

export interface ValidateOptions {
  all?: boolean;
  json?: boolean;
}

// ==================== Color Utilities ====================

/**
 * Determines if colored output should be used
 */
function shouldUseColors(): boolean {
  // NO_COLOR takes precedence (https://no-color.org/)
  if (process.env['NO_COLOR'] !== undefined) {
    return false;
  }
  // FORCE_COLOR enables colors even in non-TTY
  if (process.env['FORCE_COLOR'] === '1') {
    return true;
  }
  // Default to TTY check
  return process.stdout.isTTY === true;
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  red: (s: string): string => `\x1b[31m${s}\x1b[0m`,
  green: (s: string): string => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string): string => `\x1b[33m${s}\x1b[0m`,
  reset: '\x1b[0m',
} as const;

/**
 * Creates color functions that respect NO_COLOR
 */
function getColors(): typeof colors {
  if (shouldUseColors()) {
    return colors;
  }
  return {
    red: (s: string): string => s,
    green: (s: string): string => s,
    yellow: (s: string): string => s,
    reset: '',
  };
}

// ==================== JSON Output Types ====================

interface ValidationError {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
  context?: Record<string, unknown>;
}

interface FileValidationError {
  file: string;
  errors: ValidationError[];
}

interface JsonValidationSuccess {
  success: true;
  file?: string;
  files?: string[];
  validatedCount: number;
  diagnostics: {
    duration: number;
  };
}

interface JsonValidationError {
  success: false;
  file?: string;
  files?: FileValidationError[];
  errors?: ValidationError[];
  diagnostics: {
    duration: number;
  };
}

type JsonValidationOutput = JsonValidationSuccess | JsonValidationError;

// ==================== Error Formatting ====================

/**
 * Formats a ConstelaError for colored terminal output
 */
function formatColoredError(error: ConstelaError, c: typeof colors): string {
  const lines: string[] = [];

  // Error code and message
  const pathInfo = error.path ? ` at ${error.path}` : '';
  lines.push(`Error [${c.red(error.code)}]: ${error.message}${pathInfo}`);

  // Suggestion in yellow
  if (error.suggestion) {
    lines.push(`  ${c.yellow(`Suggestion: ${error.suggestion}`)}`);
  }

  return lines.join('\n');
}

/**
 * Converts ConstelaError to JSON-serializable format
 */
function errorToJson(error: ConstelaError): ValidationError {
  const result: ValidationError = {
    code: error.code,
    message: error.message,
  };

  if (error.path !== undefined) {
    result.path = error.path;
  }

  if (error.suggestion !== undefined) {
    result.suggestion = error.suggestion;
  }

  if (error.context !== undefined) {
    result.context = error.context as Record<string, unknown>;
  }

  return result;
}

// ==================== Output Functions ====================

/**
 * Outputs JSON result to stdout
 */
function outputJson(output: JsonValidationOutput): void {
  console.log(JSON.stringify(output));
}

// ==================== File Discovery ====================

/**
 * Recursively finds all JSON files in a directory
 */
function findJsonFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (stat.isFile() && entry.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

// ==================== Single File Validation ====================

interface SingleFileResult {
  valid: boolean;
  errors: ConstelaError[];
}

/**
 * Validates a single file and returns the result
 */
function validateSingleFile(filePath: string): SingleFileResult {
  // 1. Read input file
  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      return {
        valid: false,
        errors: [new ConstelaError('SCHEMA_INVALID', `File not found: ${filePath}`)],
      };
    }
    return {
      valid: false,
      errors: [new ConstelaError('SCHEMA_INVALID', `Could not read file: ${filePath} - ${error.message}`)],
    };
  }

  // 2. Parse JSON
  let inputJson: unknown;
  try {
    inputJson = JSON.parse(fileContent);
  } catch (err) {
    const error = err as SyntaxError;
    return {
      valid: false,
      errors: [new ConstelaError('SCHEMA_INVALID', `Invalid JSON: ${error.message}`)],
    };
  }

  // 3. Validate schema (validate pass)
  const validateResult = validatePass(inputJson);
  if (!validateResult.ok) {
    return {
      valid: false,
      errors: [validateResult.error],
    };
  }

  // 4. Semantic analysis (analyze pass)
  const analyzeResult = analyzePass(validateResult.ast);
  if (!analyzeResult.ok) {
    return {
      valid: false,
      errors: analyzeResult.errors,
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

// ==================== Main Command ====================

/**
 * Execute the validate command
 *
 * @param input - Path to input file or directory
 * @param options - Command options
 */
export async function validateCommand(
  input: string | undefined,
  options: ValidateOptions
): Promise<void> {
  const startTime = performance.now();
  const isJsonMode = options.json === true;
  const isAllMode = options.all === true;
  const c = isJsonMode
    ? { red: (s: string) => s, green: (s: string) => s, yellow: (s: string) => s, reset: '' }
    : getColors();

  // Helper to exit with proper output
  function exitWithResult(success: boolean, output: JsonValidationOutput | null): never {
    if (isJsonMode && output) {
      outputJson(output);
    }
    process.exit(success ? 0 : 1);
  }

  // Directory validation mode
  if (isAllMode) {
    const dirPath = input ?? '.';

    // Verify directory exists
    try {
      const stat = statSync(dirPath);
      if (!stat.isDirectory()) {
        const duration = Math.round(performance.now() - startTime);
        if (isJsonMode) {
          exitWithResult(false, {
            success: false,
            errors: [{ code: 'SCHEMA_INVALID', message: `Not a directory: ${dirPath}` }],
            diagnostics: { duration },
          });
        } else {
          console.error(`Error: Not a directory: ${dirPath}`);
          process.exit(1);
        }
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      if (isJsonMode) {
        exitWithResult(false, {
          success: false,
          errors: [{ code: 'SCHEMA_INVALID', message: `Directory not found: ${dirPath}` }],
          diagnostics: { duration },
        });
      } else {
        console.error(`Error: Directory not found: ${dirPath}`);
        process.exit(1);
      }
    }

    // Find all JSON files
    const jsonFiles = findJsonFiles(dirPath);
    const validatedCount = jsonFiles.length;
    const fileErrors: FileValidationError[] = [];
    const validFiles: string[] = [];

    // Validate each file
    for (const filePath of jsonFiles) {
      const result = validateSingleFile(filePath);
      const fileName = basename(filePath);

      if (result.valid) {
        validFiles.push(fileName);
      } else {
        fileErrors.push({
          file: fileName,
          errors: result.errors.map(errorToJson),
        });

        // Print errors in non-JSON mode
        if (!isJsonMode) {
          console.error(`\n${c.red('Error')} in ${fileName}:`);
          for (const error of result.errors) {
            console.error(formatColoredError(error, c));
          }
        }
      }
    }

    const duration = Math.round(performance.now() - startTime);
    const hasErrors = fileErrors.length > 0;

    if (isJsonMode) {
      if (hasErrors) {
        const output: JsonValidationError = {
          success: false,
          files: fileErrors,
          validatedCount,
          diagnostics: { duration },
        };
        exitWithResult(false, output);
      } else {
        const output: JsonValidationSuccess = {
          success: true,
          files: validFiles,
          validatedCount,
          diagnostics: { duration },
        };
        exitWithResult(true, output);
      }
    } else {
      if (hasErrors) {
        console.log(`\nValidated ${validatedCount} files with errors`);
        process.exit(1);
      } else {
        console.log(`${c.green('OK')} Validated ${validatedCount} files successfully`);
        process.exit(0);
      }
    }
  }

  // Single file validation mode
  if (!input) {
    const duration = Math.round(performance.now() - startTime);
    if (isJsonMode) {
      exitWithResult(false, {
        success: false,
        errors: [{ code: 'SCHEMA_INVALID', message: 'No input file specified' }],
        diagnostics: { duration },
      });
    } else {
      console.error('Error: No input file specified');
      process.exit(1);
    }
  }

  const result = validateSingleFile(input);
  const duration = Math.round(performance.now() - startTime);
  const fileName = basename(input);

  if (result.valid) {
    if (isJsonMode) {
      const output: JsonValidationSuccess = {
        success: true,
        file: fileName,
        validatedCount: 1,
        diagnostics: { duration },
      };
      exitWithResult(true, output);
    } else {
      console.log(`${c.green('OK')} ${input} is valid`);
      process.exit(0);
    }
  } else {
    if (isJsonMode) {
      const output: JsonValidationError = {
        success: false,
        file: fileName,
        errors: result.errors.map(errorToJson),
        diagnostics: { duration },
      };
      exitWithResult(false, output);
    } else {
      for (const error of result.errors) {
        console.error(formatColoredError(error, c));
      }
      process.exit(1);
    }
  }
}
