/**
 * Completion Data Generator
 *
 * Generates completion-data.ts for the language server
 */

import type { ExtractionResult, ExtractedType, CompletionEntry } from '../types.js';

// CompletionItemKind values from vscode-languageserver protocol
const CompletionItemKind = {
  Method: 2,
  Function: 3,
  Class: 7,
  Value: 12,
} as const;

/**
 * Get CompletionItemKind for expression type
 */
function getExpressionKind(name: string): number {
  // 'call' and 'lambda' expressions are methods
  if (name === 'call' || name === 'lambda') {
    return CompletionItemKind.Method;
  }
  // Other expressions are values
  return CompletionItemKind.Value;
}

/**
 * Convert ExtractedType to CompletionEntry
 */
function toCompletionEntry(type: ExtractedType, kind: number): CompletionEntry {
  return {
    label: type.name,
    detail: type.description,
    kind,
  };
}

/**
 * Generate completion entries from extraction result
 */
export function generateCompletionEntries(result: ExtractionResult): {
  expressions: CompletionEntry[];
  actionSteps: CompletionEntry[];
  viewNodes: CompletionEntry[];
} {
  return {
    expressions: result.expressions.map((type) =>
      toCompletionEntry(type, getExpressionKind(type.name))
    ),
    actionSteps: result.actionSteps.map((type) =>
      toCompletionEntry(type, CompletionItemKind.Function)
    ),
    viewNodes: result.viewNodes.map((type) =>
      toCompletionEntry(type, CompletionItemKind.Class)
    ),
  };
}

/**
 * Get CompletionItemKind name for code generation
 */
function getKindName(kind: number): string {
  switch (kind) {
    case CompletionItemKind.Method:
      return 'CompletionItemKind.Method';
    case CompletionItemKind.Function:
      return 'CompletionItemKind.Function';
    case CompletionItemKind.Class:
      return 'CompletionItemKind.Class';
    case CompletionItemKind.Value:
    default:
      return 'CompletionItemKind.Value';
  }
}

/**
 * Escape string for use in TypeScript single-quoted string literal
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Format a completion entry as TypeScript object literal
 */
function formatEntry(entry: CompletionEntry): string {
  const escapedDetail = escapeString(entry.detail);
  return `  { label: '${entry.label}', detail: '${escapedDetail}', kind: ${getKindName(entry.kind)} }`;
}

/**
 * Format an array of entries as TypeScript array
 */
function formatArray(name: string, entries: CompletionEntry[]): string {
  if (entries.length === 0) {
    return `export const ${name} = [];`;
  }
  const formattedEntries = entries.map(formatEntry).join(',\n');
  return `export const ${name} = [\n${formattedEntries},\n];`;
}

/**
 * Generate completion-data.ts file content
 */
export function generateCompletionDataFile(result: ExtractionResult): string {
  const entries = generateCompletionEntries(result);

  const header = `// Auto-generated from @constela/core ast.ts - DO NOT EDIT
import { CompletionItemKind } from 'vscode-languageserver';`;

  const exprTypes = formatArray('EXPR_TYPES', entries.expressions);
  const actionSteps = formatArray('ACTION_STEPS', entries.actionSteps);
  const viewNodes = formatArray('VIEW_NODES', entries.viewNodes);

  return `${header}

${exprTypes}

${actionSteps}

${viewNodes}
`;
}
