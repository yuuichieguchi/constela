/**
 * Test suite for TextMate Grammar Updater
 *
 * Coverage:
 * - generateKeywordPattern function
 * - updateTextMateGrammar function
 * - Regex pattern generation
 * - Grammar structure preservation
 */

import { describe, it, expect } from 'vitest';

import {
  generateKeywordPattern,
  updateTextMateGrammar,
} from '../../src/generators/textmate.js';

import type { ExtractionResult } from '../../src/types.js';

// ==================== Mock Data ====================

const mockExtractionResult: ExtractionResult = {
  expressions: [
    { name: 'lit', description: '', properties: [] },
    { name: 'call', description: '', properties: [] },
    { name: 'lambda', description: '', properties: [] },
  ],
  actionSteps: [
    { name: 'set', description: '', properties: [] },
    { name: 'if', description: '', properties: [] },
  ],
  viewNodes: [
    { name: 'element', description: '', properties: [] },
    { name: 'text', description: '', properties: [] },
  ],
};

// Full mock with all 18 expressions, 19 action steps, 9 view nodes
const fullMockExtractionResult: ExtractionResult = {
  expressions: [
    { name: 'lit', description: '', properties: [] },
    { name: 'state', description: '', properties: [] },
    { name: 'var', description: '', properties: [] },
    { name: 'bin', description: '', properties: [] },
    { name: 'not', description: '', properties: [] },
    { name: 'param', description: '', properties: [] },
    { name: 'cond', description: '', properties: [] },
    { name: 'get', description: '', properties: [] },
    { name: 'route', description: '', properties: [] },
    { name: 'import', description: '', properties: [] },
    { name: 'data', description: '', properties: [] },
    { name: 'ref', description: '', properties: [] },
    { name: 'index', description: '', properties: [] },
    { name: 'style', description: '', properties: [] },
    { name: 'concat', description: '', properties: [] },
    { name: 'validity', description: '', properties: [] },
    { name: 'call', description: '', properties: [] },
    { name: 'lambda', description: '', properties: [] },
  ],
  actionSteps: [
    { name: 'set', description: '', properties: [] },
    { name: 'update', description: '', properties: [] },
    { name: 'setPath', description: '', properties: [] },
    { name: 'fetch', description: '', properties: [] },
    { name: 'storage', description: '', properties: [] },
    { name: 'clipboard', description: '', properties: [] },
    { name: 'navigate', description: '', properties: [] },
    { name: 'import', description: '', properties: [] },
    { name: 'call', description: '', properties: [] },
    { name: 'subscribe', description: '', properties: [] },
    { name: 'dispose', description: '', properties: [] },
    { name: 'dom', description: '', properties: [] },
    { name: 'send', description: '', properties: [] },
    { name: 'close', description: '', properties: [] },
    { name: 'delay', description: '', properties: [] },
    { name: 'interval', description: '', properties: [] },
    { name: 'clearTimer', description: '', properties: [] },
    { name: 'focus', description: '', properties: [] },
    { name: 'if', description: '', properties: [] },
  ],
  viewNodes: [
    { name: 'element', description: '', properties: [] },
    { name: 'text', description: '', properties: [] },
    { name: 'if', description: '', properties: [] },
    { name: 'each', description: '', properties: [] },
    { name: 'component', description: '', properties: [] },
    { name: 'slot', description: '', properties: [] },
    { name: 'markdown', description: '', properties: [] },
    { name: 'code', description: '', properties: [] },
    { name: 'portal', description: '', properties: [] },
  ],
};

// Sample TextMate grammar JSON for testing
const sampleGrammarContent = `{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "Constela",
  "scopeName": "source.constela",
  "patterns": [
    { "include": "#value" }
  ],
  "repository": {
    "expr-key": {
      "match": "\\"(expr)\\"\\\\s*:\\\\s*\\"(lit|state|var)\\"",
      "captures": {
        "1": { "name": "keyword.control.constela" },
        "2": { "name": "entity.name.type.constela" }
      }
    },
    "do-key": {
      "match": "\\"(do)\\"\\\\s*:\\\\s*\\"(set|update)\\"",
      "captures": {
        "1": { "name": "keyword.control.constela" },
        "2": { "name": "entity.name.function.constela" }
      }
    },
    "node-key": {
      "match": "\\"(node)\\"\\\\s*:\\\\s*\\"(element|text)\\"",
      "captures": {
        "1": { "name": "keyword.control.constela" },
        "2": { "name": "entity.name.tag.constela" }
      }
    },
    "other-key": {
      "match": "\\"(other)\\"\\\\s*:",
      "captures": {
        "1": { "name": "keyword.other.constela" }
      }
    }
  }
}`;

// ==================== generateKeywordPattern ====================

describe('generateKeywordPattern', () => {
  describe('when given keyword array', () => {
    it('should join keywords with | separator', () => {
      const result = generateKeywordPattern(['lit', 'state', 'var']);
      expect(result).toContain('|');
      expect(result.split('|')).toHaveLength(3);
    });

    it('should sort keywords alphabetically', () => {
      const result = generateKeywordPattern(['var', 'lit', 'state']);
      expect(result).toBe('lit|state|var');
    });

    it('should return sorted pattern for call, lambda, lit', () => {
      const result = generateKeywordPattern(['lit', 'call', 'lambda']);
      expect(result).toBe('call|lambda|lit');
    });

    it('should return sorted pattern for if, set', () => {
      const result = generateKeywordPattern(['set', 'if']);
      expect(result).toBe('if|set');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for empty array', () => {
      const result = generateKeywordPattern([]);
      expect(result).toBe('');
    });

    it('should return just the keyword for single-element array', () => {
      const result = generateKeywordPattern(['lit']);
      expect(result).toBe('lit');
    });
  });

  describe('special character escaping', () => {
    it('should escape + character', () => {
      const result = generateKeywordPattern(['add+']);
      expect(result).toBe('add\\+');
    });

    it('should escape * character', () => {
      const result = generateKeywordPattern(['mul*']);
      expect(result).toBe('mul\\*');
    });

    it('should escape . character', () => {
      const result = generateKeywordPattern(['file.ext']);
      expect(result).toBe('file\\.ext');
    });

    it('should escape ( and ) characters', () => {
      const result = generateKeywordPattern(['func()']);
      expect(result).toBe('func\\(\\)');
    });

    it('should escape [ and ] characters', () => {
      const result = generateKeywordPattern(['arr[]']);
      expect(result).toBe('arr\\[\\]');
    });

    it('should escape { and } characters', () => {
      const result = generateKeywordPattern(['obj{}']);
      expect(result).toBe('obj\\{\\}');
    });

    it('should escape ^ and $ characters', () => {
      const result = generateKeywordPattern(['^start', 'end$']);
      expect(result).toBe('\\^start|end\\$');
    });

    it('should escape ? character', () => {
      const result = generateKeywordPattern(['maybe?']);
      expect(result).toBe('maybe\\?');
    });

    it('should escape \\ character', () => {
      const result = generateKeywordPattern(['back\\slash']);
      expect(result).toBe('back\\\\slash');
    });

    it('should handle multiple special characters in one keyword', () => {
      const result = generateKeywordPattern(['test.name+1']);
      expect(result).toBe('test\\.name\\+1');
    });

    it('should escape and sort mixed keywords', () => {
      const result = generateKeywordPattern(['z.ext', 'a+b', 'normal']);
      expect(result).toBe('a\\+b|normal|z\\.ext');
    });
  });

  describe('full expression list', () => {
    it('should generate pattern with all 18 expression types sorted', () => {
      const keywords = fullMockExtractionResult.expressions.map((e) => e.name);
      const result = generateKeywordPattern(keywords);
      // Expected: bin|call|concat|cond|data|get|import|index|lambda|lit|not|param|ref|route|state|style|validity|var
      expect(result).toBe(
        'bin|call|concat|cond|data|get|import|index|lambda|lit|not|param|ref|route|state|style|validity|var'
      );
    });

    it('should generate pattern with all 19 action step types sorted', () => {
      const keywords = fullMockExtractionResult.actionSteps.map((a) => a.name);
      const result = generateKeywordPattern(keywords);
      // Expected: call|clearTimer|clipboard|close|delay|dispose|dom|fetch|focus|if|import|interval|navigate|send|set|setPath|storage|subscribe|update
      expect(result).toBe(
        'call|clearTimer|clipboard|close|delay|dispose|dom|fetch|focus|if|import|interval|navigate|send|set|setPath|storage|subscribe|update'
      );
    });

    it('should generate pattern with all 9 view node types sorted', () => {
      const keywords = fullMockExtractionResult.viewNodes.map((v) => v.name);
      const result = generateKeywordPattern(keywords);
      // Expected: code|component|each|element|if|markdown|portal|slot|text
      expect(result).toBe(
        'code|component|each|element|if|markdown|portal|slot|text'
      );
    });
  });
});

// ==================== updateTextMateGrammar ====================

describe('updateTextMateGrammar', () => {
  describe('expr-key pattern update', () => {
    it('should update expr-key match with new expression types', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);
      const exprKeyMatch = parsed.repository['expr-key'].match;

      // Should contain call, lambda, lit (sorted)
      expect(exprKeyMatch).toContain('call|lambda|lit');
    });

    it('should preserve expr discriminator key name', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);
      const exprKeyMatch = parsed.repository['expr-key'].match;

      // Should still use "expr" as the key
      expect(exprKeyMatch).toMatch(/"\(expr\)"/);
    });

    it('should include call and lambda in expr-key pattern', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const exprKeyMatch = parsed.repository['expr-key'].match;

      expect(exprKeyMatch).toContain('call');
      expect(exprKeyMatch).toContain('lambda');
    });

    it('should update expr-key with all 18 expression types', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const exprKeyMatch = parsed.repository['expr-key'].match;

      // Check all 18 types are present
      const expectedTypes = [
        'bin',
        'call',
        'concat',
        'cond',
        'data',
        'get',
        'import',
        'index',
        'lambda',
        'lit',
        'not',
        'param',
        'ref',
        'route',
        'state',
        'style',
        'validity',
        'var',
      ];
      for (const type of expectedTypes) {
        expect(exprKeyMatch).toContain(type);
      }
    });
  });

  describe('do-key pattern update', () => {
    it('should update do-key match with new action step types', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);
      const doKeyMatch = parsed.repository['do-key'].match;

      // Should contain if, set (sorted)
      expect(doKeyMatch).toContain('if|set');
    });

    it('should preserve do discriminator key name', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);
      const doKeyMatch = parsed.repository['do-key'].match;

      // Should still use "do" as the key
      expect(doKeyMatch).toMatch(/"\(do\)"/);
    });

    it('should update do-key with all 19 action step types', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const doKeyMatch = parsed.repository['do-key'].match;

      // Check all 19 types are present
      const expectedTypes = [
        'call',
        'clearTimer',
        'clipboard',
        'close',
        'delay',
        'dispose',
        'dom',
        'fetch',
        'focus',
        'if',
        'import',
        'interval',
        'navigate',
        'send',
        'set',
        'setPath',
        'storage',
        'subscribe',
        'update',
      ];
      for (const type of expectedTypes) {
        expect(doKeyMatch).toContain(type);
      }
    });
  });

  describe('node-key pattern update', () => {
    it('should update node-key match with new view node types', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);
      const nodeKeyMatch = parsed.repository['node-key'].match;

      // Should contain element, text (sorted)
      expect(nodeKeyMatch).toContain('element|text');
    });

    it('should change discriminator from node to kind', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);
      const nodeKeyMatch = parsed.repository['node-key'].match;

      // Should use "kind" instead of "node" as the discriminator
      expect(nodeKeyMatch).toMatch(/"\(kind\)"/);
      expect(nodeKeyMatch).not.toMatch(/"\(node\)"/);
    });

    it('should update node-key with all 9 view node types', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const nodeKeyMatch = parsed.repository['node-key'].match;

      // Check all 9 types are present
      const expectedTypes = [
        'code',
        'component',
        'each',
        'element',
        'if',
        'markdown',
        'portal',
        'slot',
        'text',
      ];
      for (const type of expectedTypes) {
        expect(nodeKeyMatch).toContain(type);
      }
    });
  });

  describe('grammar structure preservation', () => {
    it('should preserve other grammar keys unchanged', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);

      // Should preserve other-key
      expect(parsed.repository['other-key']).toBeDefined();
      expect(parsed.repository['other-key'].match).toBe(
        '"(other)"\\s*:'
      );
    });

    it('should preserve $schema', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);

      expect(parsed.$schema).toBe(
        'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json'
      );
    });

    it('should preserve name and scopeName', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('Constela');
      expect(parsed.scopeName).toBe('source.constela');
    });

    it('should preserve patterns array', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);

      expect(parsed.patterns).toEqual([{ include: '#value' }]);
    });

    it('should preserve captures structure in updated keys', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );
      const parsed = JSON.parse(result);

      // expr-key captures should be preserved
      expect(parsed.repository['expr-key'].captures).toEqual({
        '1': { name: 'keyword.control.constela' },
        '2': { name: 'entity.name.type.constela' },
      });

      // do-key captures should be preserved
      expect(parsed.repository['do-key'].captures).toEqual({
        '1': { name: 'keyword.control.constela' },
        '2': { name: 'entity.name.function.constela' },
      });

      // node-key captures should be preserved
      expect(parsed.repository['node-key'].captures).toEqual({
        '1': { name: 'keyword.control.constela' },
        '2': { name: 'entity.name.tag.constela' },
      });
    });
  });

  describe('output format', () => {
    it('should return valid JSON', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should return properly formatted JSON with indentation', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        mockExtractionResult
      );

      // Should have newlines (formatted, not minified)
      expect(result).toContain('\n');
      // Should have indentation
      expect(result).toMatch(/^\s{2,}/m);
    });

    it('should not modify original content string', () => {
      const original = sampleGrammarContent;
      updateTextMateGrammar(sampleGrammarContent, mockExtractionResult);

      expect(sampleGrammarContent).toBe(original);
    });
  });

  describe('edge cases', () => {
    it('should handle empty extraction result', () => {
      const emptyResult: ExtractionResult = {
        expressions: [],
        actionSteps: [],
        viewNodes: [],
      };

      const result = updateTextMateGrammar(sampleGrammarContent, emptyResult);
      const parsed = JSON.parse(result);

      // Should still have valid structure (empty patterns)
      expect(parsed.repository['expr-key']).toBeDefined();
      expect(parsed.repository['do-key']).toBeDefined();
      expect(parsed.repository['node-key']).toBeDefined();
    });

    it('should handle single type in each category', () => {
      const singleResult: ExtractionResult = {
        expressions: [{ name: 'lit', description: '', properties: [] }],
        actionSteps: [{ name: 'set', description: '', properties: [] }],
        viewNodes: [{ name: 'element', description: '', properties: [] }],
      };

      const result = updateTextMateGrammar(sampleGrammarContent, singleResult);
      const parsed = JSON.parse(result);

      expect(parsed.repository['expr-key'].match).toContain('lit');
      expect(parsed.repository['do-key'].match).toContain('set');
      expect(parsed.repository['node-key'].match).toContain('element');
    });
  });

  describe('expected output patterns', () => {
    it('should generate correct expr-key pattern format', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const exprKeyMatch = parsed.repository['expr-key'].match;

      // Expected format: "(expr)"\s*:\s*"(bin|call|concat|...)"
      expect(exprKeyMatch).toBe(
        '"(expr)"\\s*:\\s*"(bin|call|concat|cond|data|get|import|index|lambda|lit|not|param|ref|route|state|style|validity|var)"'
      );
    });

    it('should generate correct do-key pattern format', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const doKeyMatch = parsed.repository['do-key'].match;

      // Expected format: "(do)"\s*:\s*"(call|clearTimer|...)"
      expect(doKeyMatch).toBe(
        '"(do)"\\s*:\\s*"(call|clearTimer|clipboard|close|delay|dispose|dom|fetch|focus|if|import|interval|navigate|send|set|setPath|storage|subscribe|update)"'
      );
    });

    it('should generate correct node-key pattern format with kind discriminator', () => {
      const result = updateTextMateGrammar(
        sampleGrammarContent,
        fullMockExtractionResult
      );
      const parsed = JSON.parse(result);
      const nodeKeyMatch = parsed.repository['node-key'].match;

      // Expected format: "(kind)"\s*:\s*"(code|component|...)"
      // Note: discriminator changed from "node" to "kind"
      expect(nodeKeyMatch).toBe(
        '"(kind)"\\s*:\\s*"(code|component|each|element|if|markdown|portal|slot|text)"'
      );
    });
  });
});
