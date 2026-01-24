/**
 * AST Type Extractor
 *
 * Extracts type information from @constela/core ast.ts
 * using ts-morph for TypeScript AST analysis
 */

import { Project, InterfaceDeclaration, Node, PropertySignature } from 'ts-morph';
import type { ExtractionResult, ExtractedType, PropertyInfo } from './types.js';

/**
 * Extract union types from a TypeScript source file
 *
 * @param sourceFilePath - Path to the TypeScript source file
 * @param unionName - Name of the union type alias (e.g., 'Expression', 'ActionStep', 'ViewNode')
 * @param discriminatorProp - Property name that discriminates union members (e.g., 'expr', 'do', 'kind')
 * @returns Array of extracted types with their properties and descriptions
 */
function extractUnionTypes(
  sourceFilePath: string,
  unionName: string,
  discriminatorProp: string
): ExtractedType[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(sourceFilePath);
  const typeAlias = sourceFile.getTypeAlias(unionName);

  if (!typeAlias) {
    return [];
  }

  const result: ExtractedType[] = [];
  const unionType = typeAlias.getType();

  for (const memberType of unionType.getUnionTypes()) {
    const symbol = memberType.getSymbol();
    if (!symbol) continue;

    const declarations = symbol.getDeclarations();
    const interfaceDecl = declarations.find((d) =>
      Node.isInterfaceDeclaration(d)
    ) as InterfaceDeclaration | undefined;
    if (!interfaceDecl) continue;

    // Get discriminator value
    const discriminatorPropDecl = interfaceDecl.getProperty(discriminatorProp);
    if (!discriminatorPropDecl) continue;

    const typeText = discriminatorPropDecl.getType().getText();
    const name = typeText.replace(/"/g, '').replace(/'/g, '');

    // Get JSDoc description from the interface
    const jsDocs = interfaceDecl.getJsDocs();
    const firstJsDoc = jsDocs[0];
    const description = firstJsDoc ? firstJsDoc.getDescription().trim() : '';

    // Get properties
    const properties = extractProperties(interfaceDecl);

    result.push({ name, description, properties });
  }

  return result;
}

/**
 * Extract property information from an interface declaration
 */
function extractProperties(interfaceDecl: InterfaceDeclaration): PropertyInfo[] {
  return interfaceDecl.getProperties().map((prop: PropertySignature) => {
    const propJsDocs = prop.getJsDocs();
    let description = '';

    const firstPropJsDoc = propJsDocs[0];
    if (firstPropJsDoc) {
      // Get full description from JSDoc
      description = firstPropJsDoc.getDescription().trim();
    }

    // Check for inline comment (e.g., // defaults to 'param')
    const trailingComment = prop.getTrailingCommentRanges();
    const firstComment = trailingComment[0];
    if (firstComment && !description) {
      const commentText = firstComment.getText();
      // Extract text from // comment
      description = commentText.replace(/^\/\/\s*/, '').trim();
    }

    // Get type text from type node to preserve original syntax
    // This avoids expanding type aliases and keeps single quotes for string literals
    const typeNode = prop.getTypeNode();
    let typeText: string;

    if (typeNode) {
      typeText = typeNode.getText();
    } else {
      // Fallback to type inference
      typeText = prop.getType().getText(prop);
    }

    return {
      name: prop.getName(),
      type: typeText,
      optional: prop.hasQuestionToken(),
      description,
    };
  });
}

/**
 * Extract all AST types from the given source file path
 */
export function extractAstTypes(sourceFilePath: string): ExtractionResult {
  return {
    expressions: extractExpressionTypes(sourceFilePath),
    actionSteps: extractActionStepTypes(sourceFilePath),
    viewNodes: extractViewNodeTypes(sourceFilePath),
  };
}

/**
 * Extract expression types from the AST
 *
 * Parses the Expression union type and extracts 18 types
 * discriminated by the 'expr' property.
 */
export function extractExpressionTypes(sourceFilePath: string): ExtractedType[] {
  return extractUnionTypes(sourceFilePath, 'Expression', 'expr');
}

/**
 * Extract action step types from the AST
 *
 * Parses the ActionStep union type and extracts 19 types
 * discriminated by the 'do' property.
 */
export function extractActionStepTypes(sourceFilePath: string): ExtractedType[] {
  return extractUnionTypes(sourceFilePath, 'ActionStep', 'do');
}

/**
 * Extract view node types from the AST
 *
 * Parses the ViewNode union type and extracts 9 types
 * discriminated by the 'kind' property.
 */
export function extractViewNodeTypes(sourceFilePath: string): ExtractedType[] {
  return extractUnionTypes(sourceFilePath, 'ViewNode', 'kind');
}
