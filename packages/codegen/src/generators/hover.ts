/**
 * Hover Data Generator
 *
 * Generates hover-data.ts for the language server
 */

import type {
  ExtractionResult,
  ExtractedType,
  HoverDocEntry,
  PropertyInfo,
} from '../types.js';

/**
 * Format a single property for the signature string
 */
function formatProperty(prop: PropertyInfo): string {
  const optionalMarker = prop.optional ? '?' : '';
  // For discriminator values (literal types like "'lit'"), extract just the value
  const typeValue = prop.type.startsWith("'") && prop.type.endsWith("'")
    ? prop.type.slice(1, -1) // Remove quotes to get the literal value
    : prop.type;

  // Format: "name": type or "name"?: type
  if (prop.type.startsWith("'") && prop.type.endsWith("'")) {
    // Literal type - show as quoted value
    return `"${prop.name}"${optionalMarker}: "${typeValue}"`;
  }
  // Non-literal type - show type name directly
  return `"${prop.name}"${optionalMarker}: ${typeValue}`;
}

/**
 * Generate signature string from extracted type properties
 */
function generateSignature(type: ExtractedType): string {
  const propStrings = type.properties.map(formatProperty);
  return `{ ${propStrings.join(', ')} }`;
}

/**
 * Convert extracted types array to hover doc record
 */
function typesToHoverDocs(types: ExtractedType[]): Record<string, HoverDocEntry> {
  const result: Record<string, HoverDocEntry> = {};

  for (const type of types) {
    result[type.name] = {
      signature: generateSignature(type),
      description: type.description,
    };
  }

  return result;
}

/**
 * Generate hover documentation from extraction result
 */
export function generateHoverDocs(result: ExtractionResult): {
  expressions: Record<string, HoverDocEntry>;
  actionSteps: Record<string, HoverDocEntry>;
  viewNodes: Record<string, HoverDocEntry>;
} {
  return {
    expressions: typesToHoverDocs(result.expressions),
    actionSteps: typesToHoverDocs(result.actionSteps),
    viewNodes: typesToHoverDocs(result.viewNodes),
  };
}

/**
 * Escape string for use in TypeScript single-quoted string literal
 * Note: Double quotes don't need escaping in single-quoted strings
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

/**
 * Generate a TypeScript object declaration for hover docs
 */
function generateDocsObject(
  name: string,
  docs: Record<string, HoverDocEntry>,
): string {
  const entries = Object.entries(docs).map(([key, entry]) => {
    const signature = escapeString(entry.signature);
    const description = escapeString(entry.description);
    return `  ${key}: {\n    signature: '${signature}',\n    description: '${description}',\n  }`;
  });

  return `export const ${name}: Record<string, { signature: string; description: string }> = {\n${entries.join(',\n')},\n};`;
}

/**
 * Generate hover-data.ts file content
 */
export function generateHoverDataFile(result: ExtractionResult): string {
  const docs = generateHoverDocs(result);

  const header = '// Auto-generated from @constela/core ast.ts - DO NOT EDIT\n';

  const exprDocs = generateDocsObject('EXPR_DOCS', docs.expressions);
  const actionDocs = generateDocsObject('ACTION_DOCS', docs.actionSteps);
  const viewDocs = generateDocsObject('VIEW_DOCS', docs.viewNodes);

  return `${header}\n${exprDocs}\n\n${actionDocs}\n\n${viewDocs}\n`;
}
