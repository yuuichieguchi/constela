/**
 * Common type definitions for code generation
 */

/**
 * Extracted type information from AST
 */
export interface ExtractedType {
  /** Type discriminator value (e.g., 'lit', 'state', 'set') */
  name: string;
  /** JSDoc description if available */
  description: string;
  /** Property definitions */
  properties: PropertyInfo[];
}

/**
 * Property information extracted from interface
 */
export interface PropertyInfo {
  /** Property name */
  name: string;
  /** TypeScript type as string */
  type: string;
  /** Whether the property is optional */
  optional: boolean;
  /** JSDoc description if available */
  description: string;
}

/**
 * Extraction result containing all AST types
 */
export interface ExtractionResult {
  /** Expression types (discriminated by 'expr' field) */
  expressions: ExtractedType[];
  /** ActionStep types (discriminated by 'do' field) */
  actionSteps: ExtractedType[];
  /** ViewNode types (discriminated by 'kind' field) */
  viewNodes: ExtractedType[];
}

/**
 * Completion entry for VSCode completion provider
 */
export interface CompletionEntry {
  /** Completion label */
  label: string;
  /** Detail text shown in completion popup */
  detail: string;
  /** CompletionItemKind value */
  kind: number;
}

/**
 * Hover documentation entry
 */
export interface HoverDocEntry {
  /** JSON signature showing the structure */
  signature: string;
  /** Description text */
  description: string;
}
