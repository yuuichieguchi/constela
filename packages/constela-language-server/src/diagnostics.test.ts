/**
 * Test module for diagnostics.ts
 *
 * Coverage:
 * - Valid JSON with valid Constela program returns no diagnostics
 * - Invalid JSON returns parse errors
 * - Valid JSON but invalid Constela program returns compiler errors
 * - Diagnostic range calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Connection, Diagnostic } from 'vscode-languageserver/node.js';
import { DiagnosticSeverity } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateDocument, type ValidationResult } from './diagnostics.js';

// ==================== Test Utilities ====================

function createMockConnection(): Connection {
  return {
    sendDiagnostics: vi.fn(),
  } as unknown as Connection;
}

function createTextDocument(content: string, uri = 'file:///test.constela.json'): TextDocument {
  return TextDocument.create(uri, 'constela', 1, content);
}

// ==================== Valid Constela Programs ====================

const VALID_MINIMAL_PROGRAM = JSON.stringify({
  version: '1.0',
  state: {},
  actions: [],
  view: { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
});

const VALID_PROGRAM_WITH_STATE = JSON.stringify({
  version: '1.0',
  state: {
    count: { type: 'number', initial: 0 },
    name: { type: 'string', initial: '' },
  },
  actions: [
    {
      name: 'increment',
      steps: [
        { do: 'update', target: 'count', operation: 'increment' },
      ],
    },
  ],
  view: {
    kind: 'element',
    tag: 'div',
    children: [
      { kind: 'text', value: { expr: 'state', name: 'count' } },
    ],
  },
});

const VALID_PROGRAM_WITH_COMPONENTS = JSON.stringify({
  version: '1.0',
  state: {},
  actions: [],
  view: { kind: 'component', name: 'Button', props: {} },
  components: {
    Button: {
      params: {},
      view: { kind: 'element', tag: 'button', children: [] },
    },
  },
});

// ==================== Invalid JSON ====================

const INVALID_JSON_MISSING_BRACE = '{ "version": "1.0"';
const INVALID_JSON_TRAILING_COMMA = '{ "version": "1.0", }';
const INVALID_JSON_UNQUOTED_KEY = '{ version: "1.0" }';

// ==================== Valid JSON but Invalid Constela ====================

const INVALID_CONSTELA_MISSING_VERSION = JSON.stringify({
  state: {},
  actions: [],
  view: { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
});

const INVALID_CONSTELA_MISSING_STATE = JSON.stringify({
  version: '1.0',
  actions: [],
  view: { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
});

const INVALID_CONSTELA_UNDEFINED_STATE_REF = JSON.stringify({
  version: '1.0',
  state: {},
  actions: [],
  view: { kind: 'text', value: { expr: 'state', name: 'undefinedState' } },
});

const INVALID_CONSTELA_UNDEFINED_ACTION_REF = JSON.stringify({
  version: '1.0',
  state: {},
  actions: [],
  view: {
    kind: 'element',
    tag: 'button',
    props: {
      onClick: { event: 'click', action: 'undefinedAction' },
    },
  },
});

describe('validateDocument', () => {
  let mockConnection: Connection;

  beforeEach(() => {
    mockConnection = createMockConnection();
  });

  // ==================== Happy Path: Valid Programs ====================

  describe('when given valid Constela programs', () => {
    it('should return no diagnostics for minimal valid program', () => {
      // Arrange
      const document = createTextDocument(VALID_MINIMAL_PROGRAM);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics).toHaveLength(0);
      expect(result.program).not.toBeNull();
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: [],
      });
    });

    it('should return no diagnostics for program with state and actions', () => {
      // Arrange
      const document = createTextDocument(VALID_PROGRAM_WITH_STATE);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics).toHaveLength(0);
      expect(result.program).not.toBeNull();
    });

    it('should return no diagnostics for program with components', () => {
      // Arrange
      const document = createTextDocument(VALID_PROGRAM_WITH_COMPONENTS);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics).toHaveLength(0);
      expect(result.program).not.toBeNull();
    });

    it('should return the parsed program on success', () => {
      // Arrange
      const document = createTextDocument(VALID_MINIMAL_PROGRAM);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.program).toEqual(JSON.parse(VALID_MINIMAL_PROGRAM));
    });
  });

  // ==================== Edge Case: Invalid JSON Syntax ====================

  describe('when given invalid JSON', () => {
    it('should return diagnostic for missing closing brace', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_MISSING_BRACE);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(result.diagnostics[0].message).toContain('JSON parse error');
      expect(result.diagnostics[0].source).toBe('constela');
      expect(result.program).toBeNull();
    });

    it('should return diagnostic for unquoted key', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_UNQUOTED_KEY);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(result.diagnostics[0].message).toContain('JSON parse error');
      expect(result.program).toBeNull();
    });

    it('should provide correct range for parse error', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_MISSING_BRACE);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics[0].range).toBeDefined();
      expect(result.diagnostics[0].range.start.line).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics[0].range.start.character).toBeGreaterThanOrEqual(0);
    });

    it('should send diagnostics to connection for JSON errors', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_MISSING_BRACE);

      // Act
      validateDocument(mockConnection, document);

      // Assert
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: document.uri,
          diagnostics: expect.arrayContaining([
            expect.objectContaining({
              severity: DiagnosticSeverity.Error,
            }),
          ]),
        })
      );
    });
  });

  // ==================== Edge Case: Valid JSON but Invalid Constela ====================

  describe('when given valid JSON but invalid Constela program', () => {
    it('should return diagnostic for missing version field', () => {
      // Arrange
      const document = createTextDocument(INVALID_CONSTELA_MISSING_VERSION);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(result.diagnostics[0].source).toBe('constela');
      expect(result.program).toBeNull();
    });

    it('should return diagnostic for missing state field', () => {
      // Arrange
      const document = createTextDocument(INVALID_CONSTELA_MISSING_STATE);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(result.program).toBeNull();
    });

    it('should return diagnostic for undefined state reference', () => {
      // Arrange
      const document = createTextDocument(INVALID_CONSTELA_UNDEFINED_STATE_REF);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(result.program).toBeNull();
    });

    it('should return diagnostic for undefined action reference', () => {
      // Arrange
      const document = createTextDocument(INVALID_CONSTELA_UNDEFINED_ACTION_REF);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(result.program).toBeNull();
    });

    it('should include error code in diagnostic', () => {
      // Arrange
      const document = createTextDocument(INVALID_CONSTELA_UNDEFINED_STATE_REF);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics[0].code).toBeDefined();
    });
  });

  // ==================== Edge Case: Empty and Special Inputs ====================

  describe('when given edge case inputs', () => {
    it('should handle empty string', () => {
      // Arrange
      const document = createTextDocument('');

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.program).toBeNull();
      // Empty string should result in some kind of error
    });

    it('should handle whitespace only', () => {
      // Arrange
      const document = createTextDocument('   \n\t  ');

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.program).toBeNull();
    });

    it('should handle JSON array instead of object', () => {
      // Arrange
      const document = createTextDocument('[]');

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.program).toBeNull();
    });

    it('should handle JSON primitive instead of object', () => {
      // Arrange
      const document = createTextDocument('"just a string"');

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.program).toBeNull();
    });
  });

  // ==================== Diagnostic Details ====================

  describe('diagnostic details', () => {
    it('should include source as constela', () => {
      // Arrange
      const document = createTextDocument(INVALID_CONSTELA_MISSING_VERSION);

      // Act
      const result: ValidationResult = validateDocument(mockConnection, document);

      // Assert
      result.diagnostics.forEach((diagnostic) => {
        expect(diagnostic.source).toBe('constela');
      });
    });

    it('should always call sendDiagnostics on connection', () => {
      // Arrange
      const document = createTextDocument(VALID_MINIMAL_PROGRAM);

      // Act
      validateDocument(mockConnection, document);

      // Assert
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledTimes(1);
    });
  });
});
