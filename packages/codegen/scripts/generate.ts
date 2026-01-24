/**
 * Code Generation Script
 *
 * Generates all VSCode extension files from AST types
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { extractAstTypes } from '../src/extractor.js';
import { generateCompletionDataFile } from '../src/generators/completion.js';
import { generateHoverDataFile } from '../src/generators/hover.js';
import { updateTextMateGrammar } from '../src/generators/textmate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = resolve(__dirname, '../..');

// Source file
const astSourcePath = resolve(packagesDir, 'core/src/types/ast.ts');

// Output paths
const languageServerGeneratedDir = resolve(packagesDir, 'constela-language-server/src/generated');
const textMateGrammarPath = resolve(packagesDir, 'vscode-constela/syntaxes/constela.tmLanguage.json');

async function main() {
  console.log('Extracting AST types...');
  const result = extractAstTypes(astSourcePath);

  console.log(`Found ${result.expressions.length} expression types`);
  console.log(`Found ${result.actionSteps.length} action step types`);
  console.log(`Found ${result.viewNodes.length} view node types`);

  // Ensure output directory exists
  mkdirSync(languageServerGeneratedDir, { recursive: true });

  // Generate completion data
  console.log('Generating completion-data.ts...');
  const completionData = generateCompletionDataFile(result);
  writeFileSync(resolve(languageServerGeneratedDir, 'completion-data.ts'), completionData);

  // Generate hover data
  console.log('Generating hover-data.ts...');
  const hoverData = generateHoverDataFile(result);
  writeFileSync(resolve(languageServerGeneratedDir, 'hover-data.ts'), hoverData);

  // Update TextMate grammar
  console.log('Updating TextMate grammar...');
  const grammarContent = readFileSync(textMateGrammarPath, 'utf-8');
  const updatedGrammar = updateTextMateGrammar(grammarContent, result);
  writeFileSync(textMateGrammarPath, updatedGrammar);

  console.log('Code generation complete!');
}

main().catch((error) => {
  console.error('Code generation failed:', error);
  process.exit(1);
});
