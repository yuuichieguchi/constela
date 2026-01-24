/**
 * Test module for completion.ts
 *
 * Coverage:
 * - Expression context returns EXPR_TYPES completions
 * - Action step context returns ACTION_STEPS completions
 * - View node context returns VIEW_NODES completions
 * - State reference context returns state names from program
 * - Action reference context returns action names from program
 * - Component reference context returns component names from program
 * - Unknown context returns empty completions
 */

import { describe, it, expect } from 'vitest';
import type { CompletionItem, Position } from 'vscode-languageserver/node.js';
import { CompletionItemKind } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { provideCompletion } from './completion.js';

// ==================== Test Utilities ====================

function createTextDocument(content: string, uri = 'file:///test.constela.json'): TextDocument {
  return TextDocument.create(uri, 'constela', 1, content);
}

function createPosition(line: number, character: number): Position {
  return { line, character };
}

/**
 * Find the position of a marker string in the document
 */
function findPositionOfMarker(content: string, marker: string): Position {
  const lines = content.split('\n');
  for (let line = 0; line < lines.length; line++) {
    const character = lines[line].indexOf(marker);
    if (character !== -1) {
      return { line, character };
    }
  }
  return { line: 0, character: 0 };
}

// ==================== Test Documents ====================

// Document with expression context (inside "expr" field)
const DOCUMENT_WITH_EXPR_CONTEXT = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [],
  "view": {
    "kind": "text",
    "value": {
      "expr": "|CURSOR|"
    }
  }
}`;

// Document with action step context (inside "do" field)
const DOCUMENT_WITH_ACTION_STEP_CONTEXT = `{
  "version": "1.0",
  "state": {
    "count": { "type": "number", "initial": 0 }
  },
  "actions": [
    {
      "name": "increment",
      "steps": [
        {
          "do": "|CURSOR|"
        }
      ]
    }
  ],
  "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
}`;

// Document with view node context (inside "children" or "view")
const DOCUMENT_WITH_VIEW_NODE_CONTEXT = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": [
      {
        "kind": "|CURSOR|"
      }
    ]
  }
}`;

// Document with state reference context (inside state expr)
const DOCUMENT_WITH_STATE_REF_CONTEXT = `{
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
      "name": "|CURSOR|"
    }
  }
}`;

// Document with action reference context (inside event handler)
const DOCUMENT_WITH_ACTION_REF_CONTEXT = `{
  "version": "1.0",
  "state": {},
  "actions": [
    { "name": "handleClick", "steps": [] },
    { "name": "handleSubmit", "steps": [] },
    { "name": "fetchData", "steps": [] }
  ],
  "view": {
    "kind": "element",
    "tag": "button",
    "props": {
      "onClick": {
        "event": "click",
        "action": "|CURSOR|"
      }
    }
  }
}`;

// Document with component reference context
const DOCUMENT_WITH_COMPONENT_REF_CONTEXT = `{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "component",
    "name": "|CURSOR|"
  },
  "components": {
    "Button": { "view": { "kind": "element", "tag": "button" } },
    "Card": { "view": { "kind": "element", "tag": "div" } },
    "Modal": { "view": { "kind": "element", "tag": "dialog" } }
  }
}`;

// Document with no special context (cursor at root level version field)
const DOCUMENT_WITH_NO_CONTEXT = `{
  "version": "|CURSOR|",
  "state": {},
  "actions": [],
  "view": { "kind": "text", "value": { "expr": "lit", "value": "Hello" } }
}`;

// Invalid JSON document
const INVALID_JSON_DOCUMENT = `{ "version": "1.0", `;

describe('provideCompletion', () => {
  // ==================== Expression Context ====================

  describe('when in expression type context', () => {
    it('should return expression type completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_EXPR_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_EXPR_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      expect(completions.length).toBeGreaterThan(0);
      
      // Check that essential expression types are present
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('lit');
      expect(labels).toContain('state');
      expect(labels).toContain('var');
      expect(labels).toContain('bin');
      expect(labels).toContain('not');
      expect(labels).toContain('cond');
      expect(labels).toContain('get');
      expect(labels).toContain('concat');
    });

    it('should include details for expression type completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_EXPR_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_EXPR_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const litCompletion = completions.find((c) => c.label === 'lit');
      expect(litCompletion).toBeDefined();
      expect(litCompletion?.detail).toBe('Literal expression - represents a constant value');
      expect(litCompletion?.kind).toBe(CompletionItemKind.Value);
    });

    it('should include all documented expression types', () => {
      // Arrange
      const content = DOCUMENT_WITH_EXPR_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_EXPR_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const expectedExprTypes = [
        'lit', 'state', 'var', 'bin', 'not', 'cond', 'get', 'concat',
        'route', 'import', 'data', 'ref', 'index', 'style', 'validity', 'param',
      ];
      const labels = completions.map((c) => c.label);
      
      for (const exprType of expectedExprTypes) {
        expect(labels).toContain(exprType);
      }
    });
  });

  // ==================== Action Step Context ====================

  describe('when in action step context', () => {
    it('should return action step completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_ACTION_STEP_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_ACTION_STEP_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      expect(completions.length).toBeGreaterThan(0);
      
      // Check that essential action step types are present
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('set');
      expect(labels).toContain('update');
      expect(labels).toContain('fetch');
      expect(labels).toContain('navigate');
    });

    it('should include details for action step completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_ACTION_STEP_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_ACTION_STEP_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const setCompletion = completions.find((c) => c.label === 'set');
      expect(setCompletion).toBeDefined();
      expect(setCompletion?.detail).toBe('Set step - sets a state field to a new value');
      expect(setCompletion?.kind).toBe(CompletionItemKind.Function);
    });

    it('should include all documented action step types', () => {
      // Arrange
      const content = DOCUMENT_WITH_ACTION_STEP_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_ACTION_STEP_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const expectedActionSteps = [
        'set', 'update', 'setPath', 'fetch', 'navigate', 'storage', 'clipboard',
        'delay', 'interval', 'clearTimer', 'focus', 'dom', 'if', 'call',
        'import', 'subscribe', 'dispose', 'send', 'close',
      ];
      const labels = completions.map((c) => c.label);
      
      for (const stepType of expectedActionSteps) {
        expect(labels).toContain(stepType);
      }
    });
  });

  // ==================== View Node Context ====================

  describe('when in view node context', () => {
    it('should return view node completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_VIEW_NODE_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_VIEW_NODE_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      expect(completions.length).toBeGreaterThan(0);
      
      // Check that essential view node types are present
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('element');
      expect(labels).toContain('text');
      expect(labels).toContain('if');
      expect(labels).toContain('each');
      expect(labels).toContain('component');
    });

    it('should include details for view node completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_VIEW_NODE_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_VIEW_NODE_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const elementCompletion = completions.find((c) => c.label === 'element');
      expect(elementCompletion).toBeDefined();
      expect(elementCompletion?.detail).toBe('Element node - represents an HTML element');
      expect(elementCompletion?.kind).toBe(CompletionItemKind.Class);
    });

    it('should include all documented view node types', () => {
      // Arrange
      const content = DOCUMENT_WITH_VIEW_NODE_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_VIEW_NODE_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const expectedViewNodes = [
        'element', 'text', 'if', 'each', 'component', 'slot', 'markdown', 'code', 'portal',
      ];
      const labels = completions.map((c) => c.label);
      
      for (const nodeType of expectedViewNodes) {
        expect(labels).toContain(nodeType);
      }
    });
  });

  // ==================== State Reference Context ====================

  describe('when in state reference context', () => {
    it('should return state names from program', () => {
      // Arrange
      const content = DOCUMENT_WITH_STATE_REF_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_STATE_REF_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('count');
      expect(labels).toContain('name');
      expect(labels).toContain('items');
    });

    it('should use Variable kind for state completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_STATE_REF_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_STATE_REF_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const stateCompletions = completions.filter((c) => ['count', 'name', 'items'].includes(c.label as string));
      stateCompletions.forEach((completion) => {
        expect(completion.kind).toBe(CompletionItemKind.Variable);
      });
    });
  });

  // ==================== Action Reference Context ====================

  describe('when in action reference context', () => {
    it('should return action names from program', () => {
      // Arrange
      const content = DOCUMENT_WITH_ACTION_REF_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_ACTION_REF_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('handleClick');
      expect(labels).toContain('handleSubmit');
      expect(labels).toContain('fetchData');
    });

    it('should use Function kind for action completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_ACTION_REF_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_ACTION_REF_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const actionCompletions = completions.filter((c) => 
        ['handleClick', 'handleSubmit', 'fetchData'].includes(c.label as string)
      );
      actionCompletions.forEach((completion) => {
        expect(completion.kind).toBe(CompletionItemKind.Function);
      });
    });
  });

  // ==================== Component Reference Context ====================

  describe('when in component reference context', () => {
    it('should return component names from program', () => {
      // Arrange
      const content = DOCUMENT_WITH_COMPONENT_REF_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_COMPONENT_REF_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('Button');
      expect(labels).toContain('Card');
      expect(labels).toContain('Modal');
    });

    it('should use Class kind for component completions', () => {
      // Arrange
      const content = DOCUMENT_WITH_COMPONENT_REF_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_COMPONENT_REF_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      const componentCompletions = completions.filter((c) =>
        ['Button', 'Card', 'Modal'].includes(c.label as string)
      );
      componentCompletions.forEach((completion) => {
        expect(completion.kind).toBe(CompletionItemKind.Class);
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should return empty array for unknown context', () => {
      // Arrange
      const content = DOCUMENT_WITH_NO_CONTEXT.replace('|CURSOR|', '');
      const document = createTextDocument(content);
      const position = findPositionOfMarker(DOCUMENT_WITH_NO_CONTEXT, '|CURSOR|');

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      expect(completions).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      // Arrange
      const document = createTextDocument(INVALID_JSON_DOCUMENT);
      const position = createPosition(0, 15);

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      expect(completions).toEqual([]);
    });

    it('should return empty array for empty document', () => {
      // Arrange
      const document = createTextDocument('');
      const position = createPosition(0, 0);

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      expect(completions).toEqual([]);
    });

    it('should handle program without state', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "actions": [],
        "view": {
          "kind": "text",
          "value": {
            "expr": "state",
            "name": ""
          }
        }
      }`;
      const document = createTextDocument(content);
      const position = createPosition(6, 18); // Position in "name" value

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      // Should not throw, may return empty or no state completions
      expect(Array.isArray(completions)).toBe(true);
    });

    it('should handle program without actions', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "view": {
          "kind": "element",
          "tag": "button",
          "props": {
            "onClick": {
              "event": "click",
              "action": ""
            }
          }
        }
      }`;
      const document = createTextDocument(content);
      const position = createPosition(9, 21); // Position in "action" value

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      // Should not throw, may return empty or no action completions
      expect(Array.isArray(completions)).toBe(true);
    });

    it('should handle program without components', () => {
      // Arrange
      const content = `{
        "version": "1.0",
        "state": {},
        "actions": [],
        "view": {
          "kind": "component",
          "name": ""
        }
      }`;
      const document = createTextDocument(content);
      const position = createPosition(6, 17); // Position in "name" value

      // Act
      const completions: CompletionItem[] = provideCompletion(document, position);

      // Assert
      // Should not throw, may return empty or no component completions
      expect(Array.isArray(completions)).toBe(true);
    });
  });
});
