import type { Connection, Diagnostic } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/node.js';
import { compile } from '@constela/compiler';
import { parse, printParseErrorCode } from 'jsonc-parser';
import type { Program } from '@constela/core';

export interface ValidationResult {
  diagnostics: Diagnostic[];
  program: Program | null;
}

export function validateDocument(
  connection: Connection,
  document: TextDocument
): ValidationResult {
  const text = document.getText();
  const diagnostics: Diagnostic[] = [];
  let program: Program | null = null;

  // Parse JSON
  const parseErrors: import('jsonc-parser').ParseError[] = [];
  const parsed = parse(text, parseErrors, { allowTrailingComma: true });

  if (parseErrors.length > 0) {
    for (const error of parseErrors) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(error.offset),
          end: document.positionAt(error.offset + error.length),
        },
        message: `JSON parse error: ${printParseErrorCode(error.error)}`,
        source: 'constela',
      });
    }
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
    return { diagnostics, program: null };
  }

  // Compile and validate
  const result = compile(parsed as Program);

  if (!result.ok) {
    for (const error of result.errors) {
      const range = findErrorRange(document, error.path ?? '');
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range,
        message: error.message,
        source: 'constela',
        code: error.code,
      });
    }
  } else {
    program = parsed as Program;
  }

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
  return { diagnostics, program };
}

function findErrorRange(
  document: TextDocument,
  path: string
): { start: { line: number; character: number }; end: { line: number; character: number } } {
  const text = document.getText();
  const pathParts = path.split('.');

  // Simple heuristic: search for the key in the JSON
  let offset = 0;
  let lastPartLength = 10; // Default fallback length
  for (const part of pathParts) {
    const searchPattern = `"${part}"`;
    const idx = text.indexOf(searchPattern, offset);
    if (idx !== -1) {
      offset = idx;
      lastPartLength = searchPattern.length;
    }
  }

  const startPos = document.positionAt(offset);
  const endPos = document.positionAt(offset + lastPartLength);

  return { start: startPos, end: endPos };
}
