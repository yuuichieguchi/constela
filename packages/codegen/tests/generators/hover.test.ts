/**
 * Test suite for Hover Data Generator
 *
 * Coverage:
 * - generateHoverDocs function
 * - generateHoverDataFile function
 * - Signature formatting (required/optional properties)
 * - Output file format validation
 */

import { describe, it, expect } from 'vitest';

import {
  generateHoverDocs,
  generateHoverDataFile,
} from '../../src/generators/hover.js';

import type { ExtractionResult, HoverDocEntry } from '../../src/types.js';

// ==================== Mock Data ====================

const mockExtractionResult: ExtractionResult = {
  expressions: [
    {
      name: 'lit',
      description: 'Literal expression - represents a constant value',
      properties: [
        { name: 'expr', type: "'lit'", optional: false, description: '' },
        { name: 'value', type: 'string | number | boolean | null | unknown[]', optional: false, description: '' },
      ],
    },
    {
      name: 'not',
      description: 'Not expression - logical negation',
      properties: [
        { name: 'expr', type: "'not'", optional: false, description: '' },
        { name: 'operand', type: 'Expression', optional: false, description: '' },
      ],
    },
  ],
  actionSteps: [
    {
      name: 'set',
      description: 'Set step - sets a state field to a new value',
      properties: [
        { name: 'do', type: "'set'", optional: false, description: '' },
        { name: 'target', type: 'string', optional: false, description: '' },
        { name: 'value', type: 'Expression', optional: false, description: '' },
      ],
    },
  ],
  viewNodes: [
    {
      name: 'element',
      description: 'Element node - represents an HTML element',
      properties: [
        { name: 'kind', type: "'element'", optional: false, description: '' },
        { name: 'tag', type: 'string', optional: false, description: '' },
        { name: 'ref', type: 'string', optional: true, description: '' },
        { name: 'props', type: 'Record<string, Expression | EventHandler>', optional: true, description: '' },
        { name: 'children', type: 'ViewNode[]', optional: true, description: '' },
      ],
    },
  ],
};

// Full mock with all 18 expressions, 19 action steps, 9 view nodes
const fullMockExtractionResult: ExtractionResult = {
  expressions: [
    { name: 'lit', description: 'Literal expression - represents a constant value', properties: [{ name: 'expr', type: "'lit'", optional: false, description: '' }] },
    { name: 'state', description: 'State expression - references a state field', properties: [{ name: 'expr', type: "'state'", optional: false, description: '' }] },
    { name: 'var', description: 'Variable expression - references a local variable', properties: [{ name: 'expr', type: "'var'", optional: false, description: '' }] },
    { name: 'bin', description: 'Binary expression - arithmetic, comparison, or logical operation', properties: [{ name: 'expr', type: "'bin'", optional: false, description: '' }] },
    { name: 'not', description: 'Not expression - logical negation', properties: [{ name: 'expr', type: "'not'", optional: false, description: '' }] },
    { name: 'param', description: 'Param expression - references a component parameter', properties: [{ name: 'expr', type: "'param'", optional: false, description: '' }] },
    { name: 'cond', description: 'Conditional expression - ternary operator', properties: [{ name: 'expr', type: "'cond'", optional: false, description: '' }] },
    { name: 'get', description: 'Get expression - property access', properties: [{ name: 'expr', type: "'get'", optional: false, description: '' }] },
    { name: 'route', description: 'Route expression - route parameter access', properties: [{ name: 'expr', type: "'route'", optional: false, description: '' }] },
    { name: 'import', description: 'Import expression - module import', properties: [{ name: 'expr', type: "'import'", optional: false, description: '' }] },
    { name: 'data', description: 'Data expression - data context access', properties: [{ name: 'expr', type: "'data'", optional: false, description: '' }] },
    { name: 'ref', description: 'Ref expression - element reference', properties: [{ name: 'expr', type: "'ref'", optional: false, description: '' }] },
    { name: 'index', description: 'Index expression - array index access', properties: [{ name: 'expr', type: "'index'", optional: false, description: '' }] },
    { name: 'style', description: 'Style expression - style binding', properties: [{ name: 'expr', type: "'style'", optional: false, description: '' }] },
    { name: 'concat', description: 'Concat expression - string concatenation', properties: [{ name: 'expr', type: "'concat'", optional: false, description: '' }] },
    { name: 'validity', description: 'Validity expression - form validation', properties: [{ name: 'expr', type: "'validity'", optional: false, description: '' }] },
    { name: 'call', description: 'Call expression - calls a method on a target', properties: [{ name: 'expr', type: "'call'", optional: false, description: '' }] },
    { name: 'lambda', description: 'Lambda expression - anonymous function', properties: [{ name: 'expr', type: "'lambda'", optional: false, description: '' }] },
  ],
  actionSteps: [
    { name: 'set', description: 'Set step - sets a state field to a new value', properties: [{ name: 'do', type: "'set'", optional: false, description: '' }] },
    { name: 'update', description: 'Update step - updates a state field', properties: [{ name: 'do', type: "'update'", optional: false, description: '' }] },
    { name: 'setPath', description: 'SetPath step - sets a nested path', properties: [{ name: 'do', type: "'setPath'", optional: false, description: '' }] },
    { name: 'fetch', description: 'Fetch step - makes an HTTP request', properties: [{ name: 'do', type: "'fetch'", optional: false, description: '' }] },
    { name: 'storage', description: 'Storage step - localStorage operation', properties: [{ name: 'do', type: "'storage'", optional: false, description: '' }] },
    { name: 'clipboard', description: 'Clipboard step - clipboard operation', properties: [{ name: 'do', type: "'clipboard'", optional: false, description: '' }] },
    { name: 'navigate', description: 'Navigate step - navigation', properties: [{ name: 'do', type: "'navigate'", optional: false, description: '' }] },
    { name: 'import', description: 'Import step - dynamic import', properties: [{ name: 'do', type: "'import'", optional: false, description: '' }] },
    { name: 'call', description: 'Call step - calls an action', properties: [{ name: 'do', type: "'call'", optional: false, description: '' }] },
    { name: 'subscribe', description: 'Subscribe step - event subscription', properties: [{ name: 'do', type: "'subscribe'", optional: false, description: '' }] },
    { name: 'dispose', description: 'Dispose step - cleanup', properties: [{ name: 'do', type: "'dispose'", optional: false, description: '' }] },
    { name: 'dom', description: 'DOM step - DOM manipulation', properties: [{ name: 'do', type: "'dom'", optional: false, description: '' }] },
    { name: 'send', description: 'Send step - message sending', properties: [{ name: 'do', type: "'send'", optional: false, description: '' }] },
    { name: 'close', description: 'Close step - close operation', properties: [{ name: 'do', type: "'close'", optional: false, description: '' }] },
    { name: 'delay', description: 'Delay step - timeout', properties: [{ name: 'do', type: "'delay'", optional: false, description: '' }] },
    { name: 'interval', description: 'Interval step - interval timer', properties: [{ name: 'do', type: "'interval'", optional: false, description: '' }] },
    { name: 'clearTimer', description: 'ClearTimer step - timer cleanup', properties: [{ name: 'do', type: "'clearTimer'", optional: false, description: '' }] },
    { name: 'focus', description: 'Focus step - focus management', properties: [{ name: 'do', type: "'focus'", optional: false, description: '' }] },
    { name: 'if', description: 'If step - conditional action execution', properties: [{ name: 'do', type: "'if'", optional: false, description: '' }] },
  ],
  viewNodes: [
    { name: 'element', description: 'Element node - represents an HTML element', properties: [{ name: 'kind', type: "'element'", optional: false, description: '' }] },
    { name: 'text', description: 'Text node - text content', properties: [{ name: 'kind', type: "'text'", optional: false, description: '' }] },
    { name: 'if', description: 'If node - conditional rendering', properties: [{ name: 'kind', type: "'if'", optional: false, description: '' }] },
    { name: 'each', description: 'Each node - list rendering', properties: [{ name: 'kind', type: "'each'", optional: false, description: '' }] },
    { name: 'component', description: 'Component node - component instance', properties: [{ name: 'kind', type: "'component'", optional: false, description: '' }] },
    { name: 'slot', description: 'Slot node - slot projection', properties: [{ name: 'kind', type: "'slot'", optional: false, description: '' }] },
    { name: 'markdown', description: 'Markdown node - markdown rendering', properties: [{ name: 'kind', type: "'markdown'", optional: false, description: '' }] },
    { name: 'code', description: 'Code node - code highlighting', properties: [{ name: 'kind', type: "'code'", optional: false, description: '' }] },
    { name: 'portal', description: 'Portal node - renders children to a different DOM location', properties: [{ name: 'kind', type: "'portal'", optional: false, description: '' }] },
  ],
};

// ==================== generateHoverDocs ====================

describe('generateHoverDocs', () => {
  describe('when given full extraction result', () => {
    it('should generate hover docs for all 18 expression types', () => {
      const result = generateHoverDocs(fullMockExtractionResult);
      expect(Object.keys(result.expressions)).toHaveLength(18);
    });

    it('should generate hover docs for all 19 action step types', () => {
      const result = generateHoverDocs(fullMockExtractionResult);
      expect(Object.keys(result.actionSteps)).toHaveLength(19);
    });

    it('should generate hover docs for all 9 view node types', () => {
      const result = generateHoverDocs(fullMockExtractionResult);
      expect(Object.keys(result.viewNodes)).toHaveLength(9);
    });
  });

  describe('entry structure', () => {
    it('should have signature and description for each expression entry', () => {
      const result = generateHoverDocs(mockExtractionResult);
      for (const [, entry] of Object.entries(result.expressions)) {
        expect(entry).toHaveProperty('signature');
        expect(entry).toHaveProperty('description');
        expect(typeof entry.signature).toBe('string');
        expect(typeof entry.description).toBe('string');
      }
    });

    it('should have signature and description for each action step entry', () => {
      const result = generateHoverDocs(mockExtractionResult);
      for (const [, entry] of Object.entries(result.actionSteps)) {
        expect(entry).toHaveProperty('signature');
        expect(entry).toHaveProperty('description');
        expect(typeof entry.signature).toBe('string');
        expect(typeof entry.description).toBe('string');
      }
    });

    it('should have signature and description for each view node entry', () => {
      const result = generateHoverDocs(mockExtractionResult);
      for (const [, entry] of Object.entries(result.viewNodes)) {
        expect(entry).toHaveProperty('signature');
        expect(entry).toHaveProperty('description');
        expect(typeof entry.signature).toBe('string');
        expect(typeof entry.description).toBe('string');
      }
    });
  });

  describe('signature formatting - required properties', () => {
    it('should format required properties without question mark', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const litEntry = result.expressions['lit'];
      expect(litEntry).toBeDefined();
      // Required properties should be formatted as "name": type
      expect(litEntry.signature).toContain('"expr": "lit"');
      expect(litEntry.signature).toContain('"value":');
      expect(litEntry.signature).not.toContain('"value"?:');
    });

    it('should include all required properties in signature for set action', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const setEntry = result.actionSteps['set'];
      expect(setEntry).toBeDefined();
      expect(setEntry.signature).toContain('"do": "set"');
      expect(setEntry.signature).toContain('"target": string');
      expect(setEntry.signature).toContain('"value": Expression');
    });
  });

  describe('signature formatting - optional properties', () => {
    it('should format optional properties with question mark', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const elementEntry = result.viewNodes['element'];
      expect(elementEntry).toBeDefined();
      // Optional properties should be formatted as "name"?: type
      expect(elementEntry.signature).toContain('"ref"?:');
      expect(elementEntry.signature).toContain('"props"?:');
      expect(elementEntry.signature).toContain('"children"?:');
    });

    it('should format required properties without question mark in element', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const elementEntry = result.viewNodes['element'];
      expect(elementEntry).toBeDefined();
      expect(elementEntry.signature).toContain('"kind": "element"');
      expect(elementEntry.signature).toContain('"tag": string');
      expect(elementEntry.signature).not.toContain('"tag"?:');
    });
  });

  describe('not expression property', () => {
    it('should have operand property (NOT value)', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const notEntry = result.expressions['not'];
      expect(notEntry).toBeDefined();
      expect(notEntry.signature).toContain('"operand":');
      // Ensure it doesn't have "value" for not expression
      expect(notEntry.signature).not.toMatch(/"value":/);
    });
  });

  describe('description values', () => {
    it('should use description from extracted type for lit', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const litEntry = result.expressions['lit'];
      expect(litEntry.description).toBe('Literal expression - represents a constant value');
    });

    it('should use description from extracted type for set', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const setEntry = result.actionSteps['set'];
      expect(setEntry.description).toBe('Set step - sets a state field to a new value');
    });

    it('should use description from extracted type for element', () => {
      const result = generateHoverDocs(mockExtractionResult);
      const elementEntry = result.viewNodes['element'];
      expect(elementEntry.description).toBe('Element node - represents an HTML element');
    });
  });

  describe('empty input handling', () => {
    it('should return empty objects for empty extraction result', () => {
      const emptyResult: ExtractionResult = {
        expressions: [],
        actionSteps: [],
        viewNodes: [],
      };
      const result = generateHoverDocs(emptyResult);
      expect(Object.keys(result.expressions)).toHaveLength(0);
      expect(Object.keys(result.actionSteps)).toHaveLength(0);
      expect(Object.keys(result.viewNodes)).toHaveLength(0);
    });
  });
});

// ==================== generateHoverDataFile ====================

describe('generateHoverDataFile', () => {
  describe('file format', () => {
    it('should generate valid TypeScript', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include auto-generated header comment', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('Auto-generated from @constela/core ast.ts');
      expect(content).toContain('DO NOT EDIT');
    });
  });

  describe('exports', () => {
    it('should export EXPR_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('export const EXPR_DOCS');
    });

    it('should export ACTION_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('export const ACTION_DOCS');
    });

    it('should export VIEW_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('export const VIEW_DOCS');
    });
  });

  describe('content structure', () => {
    it('should include lit entry in EXPR_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('lit:');
      expect(content).toContain('signature:');
      expect(content).toContain('description:');
    });

    it('should include set entry in ACTION_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('set:');
    });

    it('should include element entry in VIEW_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('element:');
    });

    it('should include descriptions in output', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toContain('Literal expression - represents a constant value');
      expect(content).toContain('Set step - sets a state field to a new value');
      expect(content).toContain('Element node - represents an HTML element');
    });
  });

  describe('type annotation', () => {
    it('should include Record type annotation for EXPR_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toMatch(/EXPR_DOCS:\s*Record<string,\s*\{\s*signature:\s*string;\s*description:\s*string\s*\}>/);
    });

    it('should include Record type annotation for ACTION_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toMatch(/ACTION_DOCS:\s*Record<string,\s*\{\s*signature:\s*string;\s*description:\s*string\s*\}>/);
    });

    it('should include Record type annotation for VIEW_DOCS', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      expect(content).toMatch(/VIEW_DOCS:\s*Record<string,\s*\{\s*signature:\s*string;\s*description:\s*string\s*\}>/);
    });
  });

  describe('syntactic validity', () => {
    it('should generate syntactically valid TypeScript object declarations', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      // Check for valid object syntax
      expect(content).toMatch(/export const EXPR_DOCS.*=\s*\{/);
      expect(content).toMatch(/export const ACTION_DOCS.*=\s*\{/);
      expect(content).toMatch(/export const VIEW_DOCS.*=\s*\{/);
      // Check for closing braces with semicolons
      expect(content).toMatch(/\};/);
    });

    it('should generate valid nested object literals', () => {
      const content = generateHoverDataFile(mockExtractionResult);
      // Check for object literal structure: key: { signature: '...', description: '...' }
      // Note: signature values contain double quotes, so we use [^']* instead of [^'"`]*
      expect(content).toMatch(/\w+:\s*\{\s*signature:\s*'[^']*',\s*description:\s*'[^']*',?\s*\}/s);
    });
  });

  describe('full extraction result', () => {
    it('should generate content with all 18 expression types', () => {
      const content = generateHoverDataFile(fullMockExtractionResult);
      // Extract EXPR_DOCS section
      const exprSection = content.split('export const ACTION_DOCS')[0];
      // Count unique type names
      const typeNames = ['lit', 'state', 'var', 'bin', 'not', 'param', 'cond', 'get', 'route', 'import', 'data', 'ref', 'index', 'style', 'concat', 'validity', 'call', 'lambda'];
      for (const name of typeNames) {
        expect(exprSection).toContain(`${name}:`);
      }
    });

    it('should generate content with all 19 action step types', () => {
      const content = generateHoverDataFile(fullMockExtractionResult);
      // Extract ACTION_DOCS section
      const afterExpr = content.split('export const ACTION_DOCS')[1];
      const actionSection = afterExpr.split('export const VIEW_DOCS')[0];
      const typeNames = ['set', 'update', 'setPath', 'fetch', 'storage', 'clipboard', 'navigate', 'import', 'call', 'subscribe', 'dispose', 'dom', 'send', 'close', 'delay', 'interval', 'clearTimer', 'focus', 'if'];
      for (const name of typeNames) {
        expect(actionSection).toContain(`${name}:`);
      }
    });

    it('should generate content with all 9 view node types', () => {
      const content = generateHoverDataFile(fullMockExtractionResult);
      // Extract VIEW_DOCS section
      const viewSection = content.split('export const VIEW_DOCS')[1];
      const typeNames = ['element', 'text', 'if', 'each', 'component', 'slot', 'markdown', 'code', 'portal'];
      for (const name of typeNames) {
        expect(viewSection).toContain(`${name}:`);
      }
    });
  });
});
