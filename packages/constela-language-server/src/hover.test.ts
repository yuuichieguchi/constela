/**
 * Test module for hover.ts
 *
 * Coverage:
 * - Hover over expression types returns documentation
 * - Hover over action types returns documentation
 * - Hover over view node types returns documentation
 * - Hover on unknown words returns null
 * - Hover on invalid JSON returns null
 */

import { describe, it, expect } from 'vitest';
import type { Hover, Position } from 'vscode-languageserver/node.js';
import { MarkupKind } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { provideHover } from './hover.js';

// ==================== Test Utilities ====================

function createTextDocument(content: string, uri = 'file:///test.constela.json'): TextDocument {
  return TextDocument.create(uri, 'constela', 1, content);
}

function createPosition(line: number, character: number): Position {
  return { line, character };
}

/**
 * Find the position of a word in the document
 * @param context - Optional context string that must appear on the same line
 */
function findWordPosition(content: string, word: string, context?: string): Position {
  const lines = content.split('\n');
  for (let line = 0; line < lines.length; line++) {
    // If context is provided, skip lines that don't contain it
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
 * Find the position of a value after a specific key
 */
function findValuePosition(content: string, key: string, value: string): Position {
  const lines = content.split('\n');
  for (let line = 0; line < lines.length; line++) {
    const lineContent = lines[line];
    // Look for pattern like "key": "value"
    const pattern = `"${key}": "${value}"`;
    const idx = lineContent.indexOf(pattern);
    if (idx !== -1) {
      // Find the position of value within the pattern
      const valueStart = lineContent.indexOf(`"${value}"`, idx);
      return { line, character: valueStart + 1 };
    }
  }
  return { line: 0, character: 0 };
}

// ==================== Test Documents ====================

// Document with expression types
const DOCUMENT_WITH_EXPR = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [],
  "view": {
    "kind": "text",
    "value": {
      "expr": "lit",
      "value": 42
    }
  }
}`;

const DOCUMENT_WITH_STATE_EXPR = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
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

const DOCUMENT_WITH_BIN_EXPR = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "text",
    "value": {
      "expr": "bin",
      "op": "+",
      "left": { "expr": "lit", "value": 1 },
      "right": { "expr": "lit", "value": 2 }
    }
  }
}`;

// Document with action step types
const DOCUMENT_WITH_ACTION_STEPS = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [
    {
      "name": "increment",
      "steps": [
        {
          "do": "set",
          "target": "count",
          "value": { "expr": "lit", "value": 1 }
        }
      ]
    }
  ],
  "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
}`;

const DOCUMENT_WITH_FETCH_STEP = `{
  "version": "1.0",
  "state": {},
  "actions": [
    {
      "name": "loadData",
      "steps": [
        {
          "do": "fetch",
          "url": { "expr": "lit", "value": "/api/data" }
        }
      ]
    }
  ],
  "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
}`;

const DOCUMENT_WITH_NAVIGATE_STEP = `{
  "version": "1.0",
  "state": {},
  "actions": [
    {
      "name": "goHome",
      "steps": [
        {
          "do": "navigate",
          "url": { "expr": "lit", "value": "/" }
        }
      ]
    }
  ],
  "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
}`;

// Document with view node types
const DOCUMENT_WITH_ELEMENT_NODE = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": []
  }
}`;

const DOCUMENT_WITH_TEXT_NODE = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "text",
    "value": { "expr": "lit", "value": "Hello" }
  }
}`;

const DOCUMENT_WITH_IF_NODE = `{
  "version": "1.0",
  "state": {
    "show": { "type": "boolean", "initial": true }
  },
  "actions": [],
  "view": {
    "kind": "if",
    "condition": { "expr": "state", "name": "show" },
    "then": { "kind": "text", "value": { "expr": "lit", "value": "Visible" } }
  }
}`;

const DOCUMENT_WITH_EACH_NODE = `{
  "version": "1.0",
  "state": {
    "items": { "type": "list", "initial": [] }
  },
  "actions": [],
  "view": {
    "kind": "each",
    "items": { "expr": "state", "name": "items" },
    "as": "item",
    "body": { "kind": "text", "value": { "expr": "var", "name": "item" } }
  }
}`;

const DOCUMENT_WITH_COMPONENT_NODE = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "component",
    "name": "Button"
  },
  "components": {
    "Button": {
      "view": { "kind": "element", "tag": "button" }
    }
  }
}`;

// Invalid JSON document
const INVALID_JSON_DOCUMENT = `{ "version": "1.0", `;

describe('provideHover', () => {
  // ==================== Expression Types ====================

  describe('when hovering over expression types', () => {
    it('should return hover info for lit expression', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_EXPR);
      const position = findWordPosition(DOCUMENT_WITH_EXPR, 'lit');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect(hover?.contents).toHaveProperty('kind', MarkupKind.Markdown);
      expect((hover?.contents as { value: string }).value).toContain('**lit** expression');
      expect((hover?.contents as { value: string }).value).toContain('represents a constant value');
    });

    it('should return hover info for state expression', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_STATE_EXPR);
      // Find "state" as a value of "expr" key, not the top-level "state" key
      const position = findValuePosition(DOCUMENT_WITH_STATE_EXPR, 'expr', 'state');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**state** expression');
      expect((hover?.contents as { value: string }).value).toContain('state field');
    });

    it('should return hover info for bin expression', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_BIN_EXPR);
      const position = findWordPosition(DOCUMENT_WITH_BIN_EXPR, 'bin');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**bin** expression');
      expect((hover?.contents as { value: string }).value).toContain('Binary expression');
    });

    it('should include signature in hover for expressions', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_EXPR);
      const position = findWordPosition(DOCUMENT_WITH_EXPR, 'lit');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      // Should contain JSON signature in a code block
      expect((hover?.contents as { value: string }).value).toContain('```json');
      expect((hover?.contents as { value: string }).value).toContain('"expr": "lit"');
    });
  });

  // ==================== Action Step Types ====================

  describe('when hovering over action step types', () => {
    it('should return hover info for set action', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_ACTION_STEPS);
      const position = findWordPosition(DOCUMENT_WITH_ACTION_STEPS, 'set');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**set** action');
      expect((hover?.contents as { value: string }).value).toContain('sets a state field');
    });

    it('should return hover info for fetch action', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_FETCH_STEP);
      const position = findWordPosition(DOCUMENT_WITH_FETCH_STEP, 'fetch');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**fetch** action');
      expect((hover?.contents as { value: string }).value).toContain('HTTP request');
    });

    it('should return hover info for navigate action', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_NAVIGATE_STEP);
      const position = findWordPosition(DOCUMENT_WITH_NAVIGATE_STEP, 'navigate');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**navigate** action');
      expect((hover?.contents as { value: string }).value).toContain('page navigation');
    });

    it('should include signature in hover for actions', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_ACTION_STEPS);
      const position = findWordPosition(DOCUMENT_WITH_ACTION_STEPS, 'set');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('```json');
      expect((hover?.contents as { value: string }).value).toContain('"do": "set"');
    });
  });

  // ==================== View Node Types ====================

  describe('when hovering over view node types', () => {
    it('should return hover info for element node', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_ELEMENT_NODE);
      const position = findWordPosition(DOCUMENT_WITH_ELEMENT_NODE, 'element');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**element** node');
      expect((hover?.contents as { value: string }).value).toContain('HTML element');
    });

    it('should return hover info for text node', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_TEXT_NODE);
      const position = findWordPosition(DOCUMENT_WITH_TEXT_NODE, 'text');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**text** node');
      expect((hover?.contents as { value: string }).value).toContain('represents text content');
    });

    it('should return hover info for if node', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_IF_NODE);
      const position = findWordPosition(DOCUMENT_WITH_IF_NODE, 'if');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      // Note: 'if' appears in both view and action contexts
      const hoverValue = (hover?.contents as { value: string }).value;
      expect(hoverValue).toMatch(/\*\*if\*\* (node|action)/);
    });

    it('should return hover info for each node', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_EACH_NODE);
      const position = findWordPosition(DOCUMENT_WITH_EACH_NODE, 'each');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**each** node');
      expect((hover?.contents as { value: string }).value).toContain('list rendering');
    });

    it('should return hover info for component node', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_COMPONENT_NODE);
      const position = findWordPosition(DOCUMENT_WITH_COMPONENT_NODE, 'component');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('**component** node');
      expect((hover?.contents as { value: string }).value).toContain('invokes a defined component');
    });

    it('should include signature in hover for view nodes', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_ELEMENT_NODE);
      const position = findWordPosition(DOCUMENT_WITH_ELEMENT_NODE, 'element');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toContain('```json');
      expect((hover?.contents as { value: string }).value).toContain('"kind": "element"');
    });
  });

  // ==================== No Hover Cases ====================

  describe('when hover should return null', () => {
    it('should return null for unknown words', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "actions": [],
        "view": { "kind": "text", "value": { "expr": "lit", "value": "unknownWord" } }
      }`;
      const document = createTextDocument(content);
      const position = findWordPosition(content, 'unknownWord');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_DOCUMENT);
      const position = createPosition(0, 10);

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).toBeNull();
    });

    it('should return null for empty document', () => {
      // Arrange
      const document = createTextDocument('');
      const position = createPosition(0, 0);

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).toBeNull();
    });

    it('should return null for position outside JSON content', () => {
      // Arrange
      const document = createTextDocument('{}');
      const position = createPosition(0, 0); // At the very beginning

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).toBeNull();
    });

    it('should return null for non-keyword JSON keys', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "actions": [],
        "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
      }`;
      const document = createTextDocument(content);
      const position = findWordPosition(content, 'version');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).toBeNull();
    });
  });

  // ==================== Markdown Formatting ====================

  describe('hover content formatting', () => {
    it('should use Markdown kind for content', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_EXPR);
      const position = findWordPosition(DOCUMENT_WITH_EXPR, 'lit');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect(hover?.contents).toHaveProperty('kind', MarkupKind.Markdown);
    });

    it('should format hover with bold keyword', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_EXPR);
      const position = findWordPosition(DOCUMENT_WITH_EXPR, 'lit');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      expect((hover?.contents as { value: string }).value).toMatch(/\*\*\w+\*\*/);
    });

    it('should include code block with signature', () => {
      // Arrange
      const document = createTextDocument(DOCUMENT_WITH_EXPR);
      const position = findWordPosition(DOCUMENT_WITH_EXPR, 'lit');

      // Act
      const hover: Hover | null = provideHover(document, position);

      // Assert
      expect(hover).not.toBeNull();
      const value = (hover?.contents as { value: string }).value;
      expect(value).toMatch(/```json[\s\S]*```/);
    });
  });
});
