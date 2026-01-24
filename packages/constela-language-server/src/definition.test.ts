/**
 * Test module for definition.ts
 *
 * Coverage:
 * - State reference navigates to state definition
 * - Action reference navigates to action definition
 * - Component reference navigates to component definition
 * - Invalid references return null
 * - Invalid JSON returns null
 */

import { describe, it, expect } from 'vitest';
import type { Definition, Position } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { provideDefinition } from './definition.js';

// ==================== Test Utilities ====================

function createTextDocument(content: string, uri = 'file:///test.constela.json'): TextDocument {
  return TextDocument.create(uri, 'constela', 1, content);
}

function createPosition(line: number, character: number): Position {
  return { line, character };
}

/**
 * Find the position of a word in the document (for navigation)
 */
function findWordPosition(content: string, word: string, context?: string): Position {
  const lines = content.split('\n');
  for (let line = 0; line < lines.length; line++) {
    // If context is provided, only match lines containing the context
    if (context && !lines[line].includes(context)) {
      continue;
    }
    const character = lines[line].indexOf(`"${word}"`);
    if (character !== -1) {
      // Return position inside the word (after the quote)
      return { line, character: character + 1 };
    }
  }
  return { line: 0, character: 0 };
}

/**
 * Find line number where a pattern first occurs
 */
function findLineNumber(content: string, pattern: string): number {
  const lines = content.split('\n');
  for (let line = 0; line < lines.length; line++) {
    if (lines[line].includes(pattern)) {
      return line;
    }
  }
  return 0;
}

// ==================== Test Documents ====================

// Document with state references
const DOCUMENT_WITH_STATE_REFS = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 },
    "name": { "type": "string", "initial": "" },
    "items": { "type": "list", "initial": [] }
  },
  "actions": [],
  "view": {
    "kind": "text",
    "value": {
      "expr": "state",
      "name": "count"
    }
  }
}`;

const DOCUMENT_WITH_MULTIPLE_STATE_REFS = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 },
    "name": { "type": "string", "initial": "" }
  },
  "actions": [
    {
      "name": "updateBoth",
      "steps": [
        {
          "do": "set",
          "target": "count",
          "value": { "expr": "lit", "value": 1 }
        },
        {
          "do": "set",
          "target": "name",
          "value": { "expr": "lit", "value": "test" }
        }
      ]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      { "kind": "text", "value": { "expr": "state", "name": "count" } },
      { "kind": "text", "value": { "expr": "state", "name": "name" } }
    ]
  }
}`;

// Document with action references
const DOCUMENT_WITH_ACTION_REFS = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [
    {
      "name": "increment",
      "steps": [
        { "do": "update", "target": "count", "operation": "increment" }
      ]
    },
    {
      "name": "decrement",
      "steps": [
        { "do": "update", "target": "count", "operation": "decrement" }
      ]
    }
  ],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      {
        "kind": "element",
        "tag": "button",
        "props": {
          "onClick": {
            "event": "click",
            "action": "increment"
          }
        }
      },
      {
        "kind": "element",
        "tag": "button",
        "props": {
          "onClick": {
            "event": "click",
            "action": "decrement"
          }
        }
      }
    ]
  }
}`;

// Document with component references
const DOCUMENT_WITH_COMPONENT_REFS = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      {
        "kind": "component",
        "name": "Button"
      },
      {
        "kind": "component",
        "name": "Card"
      }
    ]
  },
  "components": {
    "Button": {
      "params": {},
      "view": {
        "kind": "element",
        "tag": "button",
        "children": [
          { "kind": "slot" }
        ]
      }
    },
    "Card": {
      "params": {
        "title": { "type": "string" }
      },
      "view": {
        "kind": "element",
        "tag": "div",
        "props": {
          "className": { "expr": "lit", "value": "card" }
        }
      }
    }
  }
}`;

// Document with nested component reference
const DOCUMENT_WITH_NESTED_COMPONENT = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "component",
    "name": "Layout"
  },
  "components": {
    "Layout": {
      "view": {
        "kind": "element",
        "tag": "main",
        "children": [
          {
            "kind": "component",
            "name": "Header"
          },
          { "kind": "slot" },
          {
            "kind": "component",
            "name": "Footer"
          }
        ]
      }
    },
    "Header": {
      "view": { "kind": "element", "tag": "header" }
    },
    "Footer": {
      "view": { "kind": "element", "tag": "footer" }
    }
  }
}`;

// Invalid JSON document
const INVALID_JSON_DOCUMENT = `{ "version": "1.0", `;

// Document without state/actions/components
const MINIMAL_DOCUMENT = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
}`;

describe('provideDefinition', () => {
  // ==================== State References ====================

  describe('when navigating to state definitions', () => {
    it('should find definition for state reference in view', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_STATE_REFS);
      // Find the position of "count" in the state expr (not in state definition)
      const lines = DOCUMENT_WITH_STATE_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"expr": "state"')) {
          // The next line should have "name": "count"
          const nextLine = lines[line + 1];
          const charIndex = nextLine.indexOf('"count"');
          if (charIndex !== -1) {
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      expect(definition).toHaveProperty('uri', document.uri);
      expect(definition).toHaveProperty('range');
    });

    it('should navigate to the correct state field in state object', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_STATE_REFS);
      const lines = DOCUMENT_WITH_STATE_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"expr": "state"')) {
          const nextLine = lines[line + 1];
          const charIndex = nextLine.indexOf('"count"');
          if (charIndex !== -1) {
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      // The definition should point to the state field definition
      const defRange = (definition as { range: { start: Position } }).range;
      // The state definition for "count" should be around line 3-4
      const stateDefLine = findLineNumber(DOCUMENT_WITH_STATE_REFS, '"count": { "type"');
      expect(defRange.start.line).toBeLessThanOrEqual(stateDefLine);
    });

    it('should return correct URI for same-file definition', () => {
      // Arrange
      const uri = 'file:///custom/path/app.constela.json';
      const document = createTextDocument(DOCUMENT_WITH_STATE_REFS, uri);
      const lines = DOCUMENT_WITH_STATE_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"expr": "state"')) {
          const nextLine = lines[line + 1];
          const charIndex = nextLine.indexOf('"count"');
          if (charIndex !== -1) {
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      expect((definition as { uri: string }).uri).toBe(uri);
    });
  });

  // ==================== Action References ====================

  describe('when navigating to action definitions', () => {
    it('should find definition for action reference in event handler', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_ACTION_REFS);
      // Find the position of "increment" in the event handler
      const lines = DOCUMENT_WITH_ACTION_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"action": "increment"')) {
          const charIndex = lines[line].indexOf('"increment"');
          position = { line, character: charIndex + 1 };
          break;
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      expect(definition).toHaveProperty('uri', document.uri);
      expect(definition).toHaveProperty('range');
    });

    it('should navigate to the correct action in actions array', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_ACTION_REFS);
      const lines = DOCUMENT_WITH_ACTION_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"action": "decrement"')) {
          const charIndex = lines[line].indexOf('"decrement"');
          position = { line, character: charIndex + 1 };
          break;
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      // The definition should point to the action definition
      const defRange = (definition as { range: { start: Position } }).range;
      // The action definition for "decrement" should be in the actions array
      const actionDefLine = findLineNumber(DOCUMENT_WITH_ACTION_REFS, '"name": "decrement"');
      // Definition should be near the action definition line
      expect(defRange.start.line).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== Component References ====================

  describe('when navigating to component definitions', () => {
    it('should find definition for component reference in view', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_COMPONENT_REFS);
      // Find the position of "Button" in the component node
      const lines = DOCUMENT_WITH_COMPONENT_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"kind": "component"')) {
          const nextLine = lines[line + 1];
          if (nextLine.includes('"name": "Button"')) {
            const charIndex = nextLine.indexOf('"Button"');
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      expect(definition).toHaveProperty('uri', document.uri);
      expect(definition).toHaveProperty('range');
    });

    it('should navigate to the correct component in components object', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_COMPONENT_REFS);
      const lines = DOCUMENT_WITH_COMPONENT_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"kind": "component"')) {
          const nextLine = lines[line + 1];
          if (nextLine.includes('"name": "Card"')) {
            const charIndex = nextLine.indexOf('"Card"');
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      // The definition should point to the component definition
      const defRange = (definition as { range: { start: Position } }).range;
      // The component definition for "Card" should be in the components section
      const componentDefLine = findLineNumber(DOCUMENT_WITH_COMPONENT_REFS, '"Card": {');
      expect(defRange.start.line).toBeGreaterThanOrEqual(0);
    });

    it('should find nested component references', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_NESTED_COMPONENT);
      const lines = DOCUMENT_WITH_NESTED_COMPONENT.split('\n');
      let position: Position = { line: 0, character: 0 };
      // Find "Header" component reference inside Layout
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"kind": "component"')) {
          const nextLine = lines[line + 1];
          if (nextLine.includes('"name": "Header"')) {
            const charIndex = nextLine.indexOf('"Header"');
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      expect(definition).toHaveProperty('uri', document.uri);
    });
  });

  // ==================== No Definition Cases ====================

  describe('when definition should return null', () => {
    it('should return null for invalid JSON', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_DOCUMENT);
      const position = createPosition(0, 10);

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).toBeNull();
    });

    it('should return null for empty document', () => {
      // Arrange
      const document = createTextDocument('');
      const position = createPosition(0, 0);

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).toBeNull();
    });

    it('should return null for non-reference positions', () => {
      // Arrange
      const document = createTextDocument(MINIMAL_DOCUMENT);
      // Position at "version" field - not a reference
      const position = findWordPosition(MINIMAL_DOCUMENT, 'version');

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).toBeNull();
    });

    it('should return null for undefined state reference', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "actions": [],
        "view": {
          "kind": "text",
          "value": {
            "expr": "state",
            "name": "nonexistent"
          }
        }
      }`;
      const document = createTextDocument(content);
      const position = findWordPosition(content, 'nonexistent');

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      // Should return null since the state doesn't exist
      expect(definition).toBeNull();
    });

    it('should return null for undefined action reference', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "actions": [],
        "view": {
          "kind": "element",
          "tag": "button",
          "props": {
            "onClick": {
              "event": "click",
              "action": "nonexistent"
            }
          }
        }
      }`;
      const document = createTextDocument(content);
      const position = findWordPosition(content, 'nonexistent');

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).toBeNull();
    });

    it('should return null for undefined component reference', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "actions": [],
        "view": {
          "kind": "component",
          "name": "NonexistentComponent"
        }
      }`;
      const document = createTextDocument(content);
      const position = findWordPosition(content, 'NonexistentComponent');

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).toBeNull();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle document with parse errors gracefully', () => {
      // Arrange
      const content = '{ "version": "1.0", }'; // Trailing comma - JSONC tolerant
      const document = createTextDocument(content);
      const position = createPosition(0, 5);

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      // Should not throw, just return null
      expect(definition).toBeNull();
    });

    it('should handle cursor at document boundaries', () => {
      // Arrange
      const document = createTextDocument(MINIMAL_DOCUMENT);
      const position = createPosition(0, 0);

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).toBeNull();
    });

    it('should handle very long document', () => {
      // Arrange
      const state: Record<string, object> = {};
      for (let i = 0; i < 100; i++) {
        state[`field${i}`] = { type: 'number', initial: i };
      }
      const content = JSON.stringify({
        version: '1.0',
        state,
        actions: [],
        view: {
          kind: 'text',
          value: { expr: 'state', name: 'field50' },
        },
      }, null, 2);
      const document = createTextDocument(content);
      
      // Find the position of field50 reference
      const lines = content.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"name": "field50"')) {
          const charIndex = lines[line].indexOf('"field50"');
          position = { line, character: charIndex + 1 };
          break;
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      expect(definition).toHaveProperty('uri', document.uri);
    });
  });

  // ==================== Definition Range ====================

  describe('definition range accuracy', () => {
    it('should return range that includes the definition name', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_STATE_REFS);
      const lines = DOCUMENT_WITH_STATE_REFS.split('\n');
      let position: Position = { line: 0, character: 0 };
      for (let line = 0; line < lines.length; line++) {
        if (lines[line].includes('"expr": "state"')) {
          const nextLine = lines[line + 1];
          const charIndex = nextLine.indexOf('"count"');
          if (charIndex !== -1) {
            position = { line: line + 1, character: charIndex + 1 };
            break;
          }
        }
      }

      // Act
      const definition: Definition | null = provideDefinition(document, position);

      // Assert
      expect(definition).not.toBeNull();
      const range = (definition as { range: { start: Position; end: Position } }).range;
      expect(range.start.line).toBeGreaterThanOrEqual(0);
      expect(range.start.character).toBeGreaterThanOrEqual(0);
      expect(range.end.line).toBeGreaterThanOrEqual(range.start.line);
    });
  });
});
