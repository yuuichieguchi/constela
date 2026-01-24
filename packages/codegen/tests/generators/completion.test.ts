/**
 * Test suite for Completion Data Generator
 *
 * Coverage:
 * - generateCompletionEntries function
 * - generateCompletionDataFile function
 * - CompletionItemKind mapping
 * - Output file format validation
 */

import { describe, it, expect } from 'vitest';

import {
  generateCompletionEntries,
  generateCompletionDataFile,
} from '../../src/generators/completion.js';

import type { ExtractionResult, CompletionEntry } from '../../src/types.js';

// ==================== CompletionItemKind Values ====================
// From vscode-languageserver protocol
const CompletionItemKind = {
  Method: 2,
  Function: 3,
  Class: 7,
  Property: 10,
  Value: 12,
  Keyword: 14,
} as const;

// ==================== Mock Data ====================

const mockExtractionResult: ExtractionResult = {
  expressions: [
    {
      name: 'lit',
      description: 'Literal expression - represents a constant value',
      properties: [],
    },
    {
      name: 'call',
      description: 'Call expression - calls a method on a target',
      properties: [],
    },
  ],
  actionSteps: [
    {
      name: 'set',
      description: 'Set step - sets a state field to a new value',
      properties: [],
    },
  ],
  viewNodes: [
    {
      name: 'element',
      description: 'Element node - represents an HTML element',
      properties: [],
    },
  ],
};

// Full mock with all 18 expressions, 19 action steps, 9 view nodes
const fullMockExtractionResult: ExtractionResult = {
  expressions: [
    { name: 'lit', description: 'Literal expression - represents a constant value', properties: [] },
    { name: 'state', description: 'State expression - references a state field', properties: [] },
    { name: 'var', description: 'Variable expression - references a local variable', properties: [] },
    { name: 'bin', description: 'Binary expression - arithmetic, comparison, or logical operation', properties: [] },
    { name: 'not', description: 'Not expression - logical negation', properties: [] },
    { name: 'param', description: 'Param expression - references a component parameter', properties: [] },
    { name: 'cond', description: 'Conditional expression - ternary operator', properties: [] },
    { name: 'get', description: 'Get expression - property access', properties: [] },
    { name: 'route', description: 'Route expression - route parameter access', properties: [] },
    { name: 'import', description: 'Import expression - module import', properties: [] },
    { name: 'data', description: 'Data expression - data context access', properties: [] },
    { name: 'ref', description: 'Ref expression - element reference', properties: [] },
    { name: 'index', description: 'Index expression - array index access', properties: [] },
    { name: 'style', description: 'Style expression - style binding', properties: [] },
    { name: 'concat', description: 'Concat expression - string concatenation', properties: [] },
    { name: 'validity', description: 'Validity expression - form validation', properties: [] },
    { name: 'call', description: 'Call expression - calls a method on a target', properties: [] },
    { name: 'lambda', description: 'Lambda expression - anonymous function', properties: [] },
  ],
  actionSteps: [
    { name: 'set', description: 'Set step - sets a state field to a new value', properties: [] },
    { name: 'update', description: 'Update step - updates a state field', properties: [] },
    { name: 'setPath', description: 'SetPath step - sets a nested path', properties: [] },
    { name: 'fetch', description: 'Fetch step - makes an HTTP request', properties: [] },
    { name: 'storage', description: 'Storage step - localStorage operation', properties: [] },
    { name: 'clipboard', description: 'Clipboard step - clipboard operation', properties: [] },
    { name: 'navigate', description: 'Navigate step - navigation', properties: [] },
    { name: 'import', description: 'Import step - dynamic import', properties: [] },
    { name: 'call', description: 'Call step - calls an action', properties: [] },
    { name: 'subscribe', description: 'Subscribe step - event subscription', properties: [] },
    { name: 'dispose', description: 'Dispose step - cleanup', properties: [] },
    { name: 'dom', description: 'DOM step - DOM manipulation', properties: [] },
    { name: 'send', description: 'Send step - message sending', properties: [] },
    { name: 'close', description: 'Close step - close operation', properties: [] },
    { name: 'delay', description: 'Delay step - timeout', properties: [] },
    { name: 'interval', description: 'Interval step - interval timer', properties: [] },
    { name: 'clearTimer', description: 'ClearTimer step - timer cleanup', properties: [] },
    { name: 'focus', description: 'Focus step - focus management', properties: [] },
    { name: 'if', description: 'If step - conditional action execution', properties: [] },
  ],
  viewNodes: [
    { name: 'element', description: 'Element node - represents an HTML element', properties: [] },
    { name: 'text', description: 'Text node - text content', properties: [] },
    { name: 'if', description: 'If node - conditional rendering', properties: [] },
    { name: 'each', description: 'Each node - list rendering', properties: [] },
    { name: 'component', description: 'Component node - component instance', properties: [] },
    { name: 'slot', description: 'Slot node - slot projection', properties: [] },
    { name: 'markdown', description: 'Markdown node - markdown rendering', properties: [] },
    { name: 'code', description: 'Code node - code highlighting', properties: [] },
    { name: 'portal', description: 'Portal node - renders children to a different DOM location', properties: [] },
  ],
};

// ==================== generateCompletionEntries ====================

describe('generateCompletionEntries', () => {
  describe('when given full extraction result', () => {
    it('should generate 18 expression entries', () => {
      const result = generateCompletionEntries(fullMockExtractionResult);
      expect(result.expressions).toHaveLength(18);
    });

    it('should generate 19 action step entries', () => {
      const result = generateCompletionEntries(fullMockExtractionResult);
      expect(result.actionSteps).toHaveLength(19);
    });

    it('should generate 9 view node entries', () => {
      const result = generateCompletionEntries(fullMockExtractionResult);
      expect(result.viewNodes).toHaveLength(9);
    });
  });

  describe('entry structure', () => {
    it('should have label, detail, and kind for each expression entry', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      for (const entry of result.expressions) {
        expect(entry).toHaveProperty('label');
        expect(entry).toHaveProperty('detail');
        expect(entry).toHaveProperty('kind');
        expect(typeof entry.label).toBe('string');
        expect(typeof entry.detail).toBe('string');
        expect(typeof entry.kind).toBe('number');
      }
    });

    it('should have label, detail, and kind for each action step entry', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      for (const entry of result.actionSteps) {
        expect(entry).toHaveProperty('label');
        expect(entry).toHaveProperty('detail');
        expect(entry).toHaveProperty('kind');
        expect(typeof entry.label).toBe('string');
        expect(typeof entry.detail).toBe('string');
        expect(typeof entry.kind).toBe('number');
      }
    });

    it('should have label, detail, and kind for each view node entry', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      for (const entry of result.viewNodes) {
        expect(entry).toHaveProperty('label');
        expect(entry).toHaveProperty('detail');
        expect(entry).toHaveProperty('kind');
        expect(typeof entry.label).toBe('string');
        expect(typeof entry.detail).toBe('string');
        expect(typeof entry.kind).toBe('number');
      }
    });
  });

  describe('expression entry values', () => {
    it('should set label to type name for lit', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const litEntry = result.expressions.find((e) => e.label === 'lit');
      expect(litEntry).toBeDefined();
    });

    it('should set detail to description for lit', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const litEntry = result.expressions.find((e) => e.label === 'lit');
      expect(litEntry).toBeDefined();
      expect(litEntry!.detail).toBe('Literal expression - represents a constant value');
    });

    it('should set kind to CompletionItemKind.Value (12) for lit', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const litEntry = result.expressions.find((e) => e.label === 'lit');
      expect(litEntry).toBeDefined();
      expect(litEntry!.kind).toBe(CompletionItemKind.Value);
    });

    it('should set kind to CompletionItemKind.Method (2) for call expression', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const callEntry = result.expressions.find((e) => e.label === 'call');
      expect(callEntry).toBeDefined();
      expect(callEntry!.kind).toBe(CompletionItemKind.Method);
    });
  });

  describe('action step entry values', () => {
    it('should set label to type name for set', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const setEntry = result.actionSteps.find((e) => e.label === 'set');
      expect(setEntry).toBeDefined();
    });

    it('should set detail to description for set', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const setEntry = result.actionSteps.find((e) => e.label === 'set');
      expect(setEntry).toBeDefined();
      expect(setEntry!.detail).toBe('Set step - sets a state field to a new value');
    });

    it('should set kind to CompletionItemKind.Function (3) for set', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const setEntry = result.actionSteps.find((e) => e.label === 'set');
      expect(setEntry).toBeDefined();
      expect(setEntry!.kind).toBe(CompletionItemKind.Function);
    });
  });

  describe('view node entry values', () => {
    it('should set label to type name for element', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const elementEntry = result.viewNodes.find((e) => e.label === 'element');
      expect(elementEntry).toBeDefined();
    });

    it('should set detail to description for element', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const elementEntry = result.viewNodes.find((e) => e.label === 'element');
      expect(elementEntry).toBeDefined();
      expect(elementEntry!.detail).toBe('Element node - represents an HTML element');
    });

    it('should set kind to CompletionItemKind.Class (7) for element', () => {
      const result = generateCompletionEntries(mockExtractionResult);
      const elementEntry = result.viewNodes.find((e) => e.label === 'element');
      expect(elementEntry).toBeDefined();
      expect(elementEntry!.kind).toBe(CompletionItemKind.Class);
    });
  });

  describe('empty input handling', () => {
    it('should return empty arrays for empty extraction result', () => {
      const emptyResult: ExtractionResult = {
        expressions: [],
        actionSteps: [],
        viewNodes: [],
      };
      const result = generateCompletionEntries(emptyResult);
      expect(result.expressions).toHaveLength(0);
      expect(result.actionSteps).toHaveLength(0);
      expect(result.viewNodes).toHaveLength(0);
    });
  });
});

// ==================== generateCompletionDataFile ====================

describe('generateCompletionDataFile', () => {
  describe('file format', () => {
    it('should generate valid TypeScript', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include auto-generated header comment', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain('Auto-generated from @constela/core ast.ts');
      expect(content).toContain('DO NOT EDIT');
    });

    it('should include import statement for CompletionItemKind', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain("import { CompletionItemKind } from 'vscode-languageserver'");
    });
  });

  describe('exports', () => {
    it('should export EXPR_TYPES', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain('export const EXPR_TYPES');
    });

    it('should export ACTION_STEPS', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain('export const ACTION_STEPS');
    });

    it('should export VIEW_NODES', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain('export const VIEW_NODES');
    });
  });

  describe('content structure', () => {
    it('should include lit entry in EXPR_TYPES', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain("label: 'lit'");
      expect(content).toContain('CompletionItemKind.Value');
    });

    it('should include call entry in EXPR_TYPES with Method kind', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain("label: 'call'");
      expect(content).toContain('CompletionItemKind.Method');
    });

    it('should include set entry in ACTION_STEPS', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain("label: 'set'");
      expect(content).toContain('CompletionItemKind.Function');
    });

    it('should include element entry in VIEW_NODES', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain("label: 'element'");
      expect(content).toContain('CompletionItemKind.Class');
    });

    it('should include detail with description', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      expect(content).toContain('Literal expression - represents a constant value');
      expect(content).toContain('Call expression - calls a method on a target');
      expect(content).toContain('Set step - sets a state field to a new value');
      expect(content).toContain('Element node - represents an HTML element');
    });
  });

  describe('syntactic validity', () => {
    it('should generate syntactically valid TypeScript array declarations', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      // Check for valid array syntax
      expect(content).toMatch(/export const EXPR_TYPES = \[/);
      expect(content).toMatch(/export const ACTION_STEPS = \[/);
      expect(content).toMatch(/export const VIEW_NODES = \[/);
      // Check for closing brackets
      expect(content).toMatch(/\];/);
    });

    it('should generate valid object literals in arrays', () => {
      const content = generateCompletionDataFile(mockExtractionResult);
      // Check for object literal structure: { label: '...', detail: '...', kind: ... }
      expect(content).toMatch(/\{\s*label:\s*'[^']+',\s*detail:\s*'[^']+',\s*kind:\s*CompletionItemKind\.\w+\s*\}/);
    });
  });

  describe('full extraction result', () => {
    it('should generate content with all 18 expression types', () => {
      const content = generateCompletionDataFile(fullMockExtractionResult);
      // Count occurrences of label: in EXPR_TYPES section
      const exprSection = content.split('export const ACTION_STEPS')[0];
      const labelMatches = exprSection.match(/label: '/g);
      expect(labelMatches).toHaveLength(18);
    });

    it('should generate content with all 19 action step types', () => {
      const content = generateCompletionDataFile(fullMockExtractionResult);
      // Extract ACTION_STEPS section
      const afterExpr = content.split('export const ACTION_STEPS')[1];
      const actionSection = afterExpr.split('export const VIEW_NODES')[0];
      const labelMatches = actionSection.match(/label: '/g);
      expect(labelMatches).toHaveLength(19);
    });

    it('should generate content with all 9 view node types', () => {
      const content = generateCompletionDataFile(fullMockExtractionResult);
      // Extract VIEW_NODES section
      const viewSection = content.split('export const VIEW_NODES')[1];
      const labelMatches = viewSection.match(/label: '/g);
      expect(labelMatches).toHaveLength(9);
    });
  });
});
