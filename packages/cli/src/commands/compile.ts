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
 *   --json            Output results as JSON
 */

import { validatePass, analyzePass, transformPass } from '@constela/compiler';
import type { CompiledNode, AnalysisContext } from '@constela/compiler';
import { ConstelaError } from '@constela/core';
import type { Program } from '@constela/core';
import { readFileSync, writeFileSync, mkdirSync, statSync, watch as fsWatch, type FSWatcher } from 'node:fs';
import { dirname, basename, join } from 'node:path';

export interface CompileOptions {
  out?: string;
  pretty?: boolean;
  json?: boolean;
  watch?: boolean;
  verbose?: boolean;
  debug?: boolean;
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

// ==================== Verbose Mode Utilities ====================

/**
 * Counts view nodes recursively in a compiled view tree
 */
function countViewNodes(node: CompiledNode): number {
  let count = 1; // Count this node

  switch (node.kind) {
    case 'element':
      if (node.children) {
        for (const child of node.children) {
          count += countViewNodes(child);
        }
      }
      break;
    case 'if':
      count += countViewNodes(node.then);
      if (node.else) {
        count += countViewNodes(node.else);
      }
      break;
    case 'each':
      count += countViewNodes(node.template);
      break;
    // text, markdown, code, slot nodes have no children
    default:
      break;
  }

  return count;
}

/**
 * Verbose output logger
 */
interface VerboseLogger {
  phaseStart(phase: number, total: number, message: string): void;
  phaseOk(phase: number, total: number, message: string, durationMs: number): void;
  phaseFail(phase: number, total: number, message: string): void;
  detail(message: string): void;
  summary(states: number, actions: number, viewNodes: number, totalMs: number): void;
}

function createVerboseLogger(enabled: boolean, c: typeof colors): VerboseLogger {
  if (!enabled) {
    return {
      phaseStart: () => {},
      phaseOk: () => {},
      phaseFail: () => {},
      detail: () => {},
      summary: () => {},
    };
  }

  return {
    phaseStart(phase: number, total: number, message: string): void {
      process.stdout.write(`[${phase}/${total}] ${message}...`);
    },
    phaseOk(phase: number, total: number, message: string, durationMs: number): void {
      console.log(`[${phase}/${total}] ${message}... ${c.green('OK')} (${durationMs}ms)`);
    },
    phaseFail(phase: number, total: number, message: string): void {
      console.log(`[${phase}/${total}] ${message}... ${c.red('FAILED')}`);
    },
    detail(message: string): void {
      console.log(`  ${message}`);
    },
    summary(states: number, actions: number, viewNodes: number, totalMs: number): void {
      console.log('');
      console.log('Summary:');
      console.log(`  States: ${states}`);
      console.log(`  Actions: ${actions}`);
      console.log(`  View nodes: ${viewNodes}`);
      console.log('');
      console.log(`${c.green('Compilation successful')} (${totalMs}ms total)`);
    },
  };
}

// ==================== Debug Mode Utilities ====================

/**
 * Debug information collected during compilation
 */
interface DebugInfo {
  inputFile: string;
  inputSize: number;
  parseTime: number;
  validateTime: number;
  analyzeTime: number;
  transformTime: number;
  nodesValidated: number;
  stateCount: number;
  actionCount: number;
  viewNodeCount: number;
  outputSize: number;
}

/**
 * Debug output logger
 */
interface DebugLogger {
  inputFile(filename: string, size: number): void;
  parseTime(ms: number): void;
  validatePass(nodes: number, ms: number): void;
  analyzePass(states: number, actions: number, views: number, ms: number): void;
  transformPass(outputSize: number, ms: number): void;
  getInfo(): DebugInfo | undefined;
}

/**
 * Creates a debug logger that tracks compilation metrics
 */
function createDebugLogger(enabled: boolean): DebugLogger {
  if (!enabled) {
    return {
      inputFile: () => {},
      parseTime: () => {},
      validatePass: () => {},
      analyzePass: () => {},
      transformPass: () => {},
      getInfo: () => undefined,
    };
  }

  const info: DebugInfo = {
    inputFile: '',
    inputSize: 0,
    parseTime: 0,
    validateTime: 0,
    analyzeTime: 0,
    transformTime: 0,
    nodesValidated: 0,
    stateCount: 0,
    actionCount: 0,
    viewNodeCount: 0,
    outputSize: 0,
  };

  return {
    inputFile(filename: string, size: number): void {
      info.inputFile = filename;
      info.inputSize = size;
      console.log(`[DEBUG] Input file: ${filename} (${size} bytes)`);
    },
    parseTime(ms: number): void {
      info.parseTime = ms;
      console.log(`[DEBUG] Parse time: ${ms}ms`);
    },
    validatePass(nodes: number, ms: number): void {
      info.nodesValidated = nodes;
      info.validateTime = ms;
      console.log(`[DEBUG] Validate pass: ${nodes} nodes validated (${ms}ms)`);
    },
    analyzePass(states: number, actions: number, views: number, ms: number): void {
      info.stateCount = states;
      info.actionCount = actions;
      info.viewNodeCount = views;
      info.analyzeTime = ms;
      console.log(`[DEBUG] Analyze pass: ${states} states, ${actions} actions, ${views} views (${ms}ms)`);
    },
    transformPass(outputSize: number, ms: number): void {
      info.outputSize = outputSize;
      info.transformTime = ms;
      console.log(`[DEBUG] Transform pass: output size ${outputSize} bytes (${ms}ms)`);
    },
    getInfo(): DebugInfo {
      return info;
    },
  };
}

/**
 * Builds debug info object for JSON output
 */
function buildDebugInfo(
  inputFile: string,
  inputSize: number,
  parseTime: number,
  validateTime: number,
  analyzeTime: number,
  transformTime: number,
  nodesValidated: number,
  stateCount: number,
  actionCount: number,
  viewNodeCount: number,
  outputSize: number
): DebugInfo {
  return {
    inputFile,
    inputSize,
    parseTime,
    validateTime,
    analyzeTime,
    transformTime,
    nodesValidated,
    stateCount,
    actionCount,
    viewNodeCount,
    outputSize,
  };
}

/**
 * Counts nodes in AST for debug validation count
 */
function countAstNodes(ast: Program): number {
  let count = 1; // Program node

  // Count state definitions
  count += Object.keys(ast.state).length;

  // Count actions and their steps
  for (const action of ast.actions) {
    count += 1; // action node
    count += action.steps.length; // step nodes
  }

  // Count view nodes (reuse existing countViewNodes logic, but for raw AST)
  count += countViewNodesFromAst(ast.view);

  // Count components
  if (ast.components) {
    for (const key of Object.keys(ast.components)) {
      const comp = ast.components[key];
      if (comp) {
        count += 1; // component node
        count += countViewNodesFromAst(comp.view);
      }
    }
  }

  return count;
}

/**
 * Counts view nodes from raw AST view structure
 */
function countViewNodesFromAst(node: Program['view']): number {
  let count = 1;

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countViewNodesFromAst(child as Program['view']);
    }
  }

  if ('then' in node && node.then) {
    count += countViewNodesFromAst(node.then as Program['view']);
  }

  if ('else' in node && node.else) {
    count += countViewNodesFromAst(node.else as Program['view']);
  }

  if ('template' in node && node.template) {
    count += countViewNodesFromAst(node.template as Program['view']);
  }

  return count;
}

// ==================== JSON Output Types ====================

interface JsonSuccessOutput {
  success: true;
  inputFile: string;
  outputFile: string;
  debug?: DebugInfo;
  diagnostics: {
    duration: number;
  };
}

interface JsonErrorOutput {
  success: false;
  errors: Array<{
    code: string;
    message: string;
    path?: string;
    suggestion?: string;
    context?: Record<string, unknown>;
  }>;
  diagnostics: {
    duration: number;
  };
}

type JsonOutput = JsonSuccessOutput | JsonErrorOutput;

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
    lines.push(`  ${c.yellow(`Did you mean: ${error.suggestion}`)}`);
  }

  return lines.join('\n');
}

/**
 * Converts ConstelaError to JSON-serializable format
 */
function errorToJson(error: ConstelaError): JsonErrorOutput['errors'][number] {
  const result: JsonErrorOutput['errors'][number] = {
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
function outputJson(output: JsonOutput): void {
  console.log(JSON.stringify(output));
}

// ==================== Compilation Result Types ====================

interface CompilationSuccess {
  ok: true;
  outputPath: string;
  duration: number;
  debugInfo?: DebugInfo;
}

interface CompilationFailure {
  ok: false;
  errors: ConstelaError[];
  duration: number;
}

type CompilationResult = CompilationSuccess | CompilationFailure;

/**
 * Performs the actual compilation work
 * Returns result instead of exiting, so watch mode can continue
 */
function performCompilation(
  inputPath: string,
  options: CompileOptions,
  c: typeof colors
): CompilationResult {
  const startTime = performance.now();
  const verbose = createVerboseLogger(options.verbose === true, c);
  const isJsonMode = options.json === true;
  const debug = createDebugLogger(options.debug === true && !isJsonMode);

  // 1. Validate input is a regular file
  let inputSize: number;
  try {
    const stat = statSync(inputPath);
    if (!stat.isFile()) {
      return {
        ok: false,
        errors: [new ConstelaError('SCHEMA_INVALID', `Input path is not a regular file: ${inputPath}`)],
        duration: Math.round(performance.now() - startTime),
      };
    }
    inputSize = stat.size;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    const message = error.code === 'ENOENT'
      ? `File not found: ${inputPath}`
      : `Could not access file: ${inputPath} - ${error.message}`;
    return {
      ok: false,
      errors: [new ConstelaError('SCHEMA_INVALID', message)],
      duration: Math.round(performance.now() - startTime),
    };
  }

  // Log debug input file info
  debug.inputFile(basename(inputPath), inputSize);

  // 2. Read input file
  let fileContent: string;
  try {
    fileContent = readFileSync(inputPath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    return {
      ok: false,
      errors: [new ConstelaError('SCHEMA_INVALID', `Could not read file: ${inputPath} - ${error.message}`)],
      duration: Math.round(performance.now() - startTime),
    };
  }

  // 3. Parse JSON
  const parseStart = performance.now();
  let inputJson: unknown;
  try {
    inputJson = JSON.parse(fileContent);
  } catch (err) {
    const error = err as SyntaxError;
    return {
      ok: false,
      errors: [new ConstelaError('SCHEMA_INVALID', `Invalid JSON: ${error.message}`)],
      duration: Math.round(performance.now() - startTime),
    };
  }
  const parseDuration = Math.round(performance.now() - parseStart);
  debug.parseTime(parseDuration);

  // 4. Compile - Phase 1: Validate schema
  const phase1Start = performance.now();
  const validateResult = validatePass(inputJson);
  const phase1Duration = Math.round(performance.now() - phase1Start);

  if (!validateResult.ok) {
    verbose.phaseFail(1, 3, 'Validating schema');
    return {
      ok: false,
      errors: [validateResult.error],
      duration: Math.round(performance.now() - startTime),
    };
  }
  verbose.phaseOk(1, 3, 'Validating schema', phase1Duration);

  // Log debug validate pass info
  const ast = validateResult.ast as Program;
  const nodesValidated = countAstNodes(ast);
  debug.validatePass(nodesValidated, phase1Duration);

  // 5. Compile - Phase 2: Analyze semantics
  const phase2Start = performance.now();

  // Collect names for verbose output
  const stateNames = Object.keys(ast.state);
  const actionNames = ast.actions.map(a => a.name);

  verbose.detail(`Collecting state names: ${stateNames.join(', ')}`);
  verbose.detail(`Collecting action names: ${actionNames.join(', ')}`);
  verbose.detail('Validating view tree');

  const analyzeResult = analyzePass(ast);
  const phase2Duration = Math.round(performance.now() - phase2Start);

  if (!analyzeResult.ok) {
    verbose.phaseFail(2, 3, 'Analyzing semantics');
    return {
      ok: false,
      errors: analyzeResult.errors,
      duration: Math.round(performance.now() - startTime),
    };
  }
  verbose.phaseOk(2, 3, 'Analyzing semantics', phase2Duration);

  // 6. Compile - Phase 3: Transform AST
  const phase3Start = performance.now();
  const program = transformPass(analyzeResult.ast, analyzeResult.context);
  const phase3Duration = Math.round(performance.now() - phase3Start);
  verbose.phaseOk(3, 3, 'Transforming AST', phase3Duration);

  // Log debug analyze pass info (after transform so we have viewNodeCount)
  const viewNodeCount = countViewNodes(program.view);
  debug.analyzePass(stateNames.length, actionNames.length, viewNodeCount, phase2Duration);

  // 7. Determine output path
  const outputPath = getOutputPath(inputPath, options);

  // 8. Create output directory if needed
  const outputDir = dirname(outputPath);
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    return {
      ok: false,
      errors: [new ConstelaError('SCHEMA_INVALID', `Could not create output directory: ${outputDir} - ${error.message}`)],
      duration: Math.round(performance.now() - startTime),
    };
  }

  // 9. Write output file
  const outputContent = options.pretty
    ? JSON.stringify(program, null, 2)
    : JSON.stringify(program);

  try {
    writeFileSync(outputPath, outputContent, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    return {
      ok: false,
      errors: [new ConstelaError('SCHEMA_INVALID', `Could not write output file: ${outputPath} - ${error.message}`)],
      duration: Math.round(performance.now() - startTime),
    };
  }

  // Log debug transform pass info
  const outputSize = outputContent.length;
  debug.transformPass(outputSize, phase3Duration);

  // 10. Show verbose summary
  const totalDuration = Math.round(performance.now() - startTime);
  verbose.summary(stateNames.length, actionNames.length, viewNodeCount, totalDuration);

  // Build debug info for JSON output if needed
  const result: CompilationSuccess = {
    ok: true,
    outputPath,
    duration: totalDuration,
  };

  if (options.debug) {
    result.debugInfo = buildDebugInfo(
      basename(inputPath),
      inputSize,
      parseDuration,
      phase1Duration,
      phase2Duration,
      phase3Duration,
      nodesValidated,
      stateNames.length,
      actionNames.length,
      viewNodeCount,
      outputSize
    );
  }

  return result;
}

/**
 * Outputs compilation result (success or error) to console/JSON
 */
function outputResult(
  inputPath: string,
  result: CompilationResult,
  options: CompileOptions,
  c: typeof colors
): void {
  const isJsonMode = options.json === true;

  if (result.ok) {
    if (isJsonMode) {
      const output: JsonSuccessOutput = {
        success: true,
        inputFile: basename(inputPath),
        outputFile: basename(result.outputPath),
        diagnostics: { duration: result.duration },
      };
      if (result.debugInfo) {
        output.debug = result.debugInfo;
      }
      outputJson(output);
    } else if (!options.verbose) {
      // In verbose mode, summary is already shown
      console.log(`${c.green('✓')} Compiled ${inputPath} → ${result.outputPath}`);
    }
  } else {
    if (isJsonMode) {
      const output: JsonErrorOutput = {
        success: false,
        errors: result.errors.map(errorToJson),
        diagnostics: { duration: result.duration },
      };
      outputJson(output);
    } else {
      for (const error of result.errors) {
        console.error(formatColoredError(error, c));
      }
    }
  }
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
  const isJsonMode = options.json === true;
  const c = isJsonMode ? { red: (s: string) => s, green: (s: string) => s, yellow: (s: string) => s, reset: '' } : getColors();

  // Perform initial compilation
  const result = performCompilation(inputPath, options, c);
  outputResult(inputPath, result, options, c);

  // In non-watch mode, exit with appropriate code
  if (!options.watch) {
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  // Watch mode: continue watching regardless of initial result
  console.log('[Watching for changes...]');

  // Use fs.watch for OS-level file change notifications
  const watcher: FSWatcher = fsWatch(inputPath, (eventType) => {
    if (eventType === 'change') {
      console.log(`[File changed: ${inputPath}]`);
      const watchResult = performCompilation(inputPath, options, c);
      outputResult(inputPath, watchResult, options, c);
      console.log('[Watching for changes...]');
    }
  });

  // Handle SIGINT (Ctrl+C) for graceful shutdown
  process.on('SIGINT', () => {
    watcher.close();
    console.log('\n[Watch mode stopped]');
    process.exit(0);
  });

  // Keep process alive (never resolves)
  await new Promise(() => {});
}
