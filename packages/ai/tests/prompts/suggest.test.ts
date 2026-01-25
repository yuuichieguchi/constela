/**
 * Test suite for prompts/suggest.ts
 *
 * Coverage:
 * - buildSuggestPrompt() includes DSL
 * - buildSuggestPrompt() includes aspect
 * - parseSuggestions() parses JSON array
 * - parseSuggestions() handles markdown code blocks
 * - parseSuggestions() returns empty array for invalid response
 * - SUGGEST_SYSTEM_PROMPT is non-empty
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';

// Import targets - will fail until implementation exists
import {
  buildSuggestPrompt,
  parseSuggestions,
  SUGGEST_SYSTEM_PROMPT,
  type SuggestionAspect,
  type SuggestPromptOptions,
  type Suggestion,
} from '../../src/prompts/suggest';

// ==================== Test Fixtures ====================

const sampleDsl = {
  type: 'view',
  props: { title: 'Test View' },
  children: [
    {
      type: 'button',
      props: { label: 'Click me' },
      actions: [{ type: 'navigate', payload: { path: '/next' } }],
    },
    {
      type: 'text',
      props: { content: 'Hello World' },
    },
  ],
};

const validSuggestionsJson: Suggestion[] = [
  {
    aspect: 'accessibility',
    issue: 'Button lacks ARIA label',
    recommendation: 'Add aria-label prop to the button',
    location: 'children[0]',
    severity: 'high',
  },
  {
    aspect: 'accessibility',
    issue: 'Missing alt text for images',
    recommendation: 'Add alt prop to image elements',
    severity: 'medium',
  },
];

const validSuggestionsString = JSON.stringify(validSuggestionsJson);

const suggestionsWithMarkdown = `Here are my suggestions:

\`\`\`json
${validSuggestionsString}
\`\`\`

These changes will improve accessibility.`;

// ==================== SUGGEST_SYSTEM_PROMPT ====================

describe('SUGGEST_SYSTEM_PROMPT', () => {
  it('should be defined', () => {
    expect(SUGGEST_SYSTEM_PROMPT).toBeDefined();
  });

  it('should be a non-empty string', () => {
    expect(typeof SUGGEST_SYSTEM_PROMPT).toBe('string');
    expect(SUGGEST_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention Constela DSL', () => {
    expect(SUGGEST_SYSTEM_PROMPT.toLowerCase()).toContain('constela');
  });

  it('should mention suggestions or recommendations', () => {
    const lowerPrompt = SUGGEST_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/suggest|recommend|improvement|review/);
  });

  it('should mention JSON output format', () => {
    const lowerPrompt = SUGGEST_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/json|array/);
  });

  it('should mention severity levels', () => {
    const lowerPrompt = SUGGEST_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/low|medium|high|severity/);
  });
});

// ==================== SuggestionAspect Type ====================

describe('SuggestionAspect type', () => {
  it('should accept accessibility aspect', () => {
    const aspect: SuggestionAspect = 'accessibility';
    expect(aspect).toBe('accessibility');
  });

  it('should accept performance aspect', () => {
    const aspect: SuggestionAspect = 'performance';
    expect(aspect).toBe('performance');
  });

  it('should accept security aspect', () => {
    const aspect: SuggestionAspect = 'security';
    expect(aspect).toBe('security');
  });

  it('should accept ux aspect', () => {
    const aspect: SuggestionAspect = 'ux';
    expect(aspect).toBe('ux');
  });
});

// ==================== Suggestion Interface ====================

describe('Suggestion interface', () => {
  it('should have required properties', () => {
    const suggestion: Suggestion = {
      aspect: 'accessibility',
      issue: 'Missing label',
      recommendation: 'Add a label',
      severity: 'high',
    };

    expect(suggestion.aspect).toBe('accessibility');
    expect(suggestion.issue).toBe('Missing label');
    expect(suggestion.recommendation).toBe('Add a label');
    expect(suggestion.severity).toBe('high');
  });

  it('should have optional location property', () => {
    const suggestion: Suggestion = {
      aspect: 'performance',
      issue: 'Heavy computation',
      recommendation: 'Memoize the result',
      location: 'children[2].props.compute',
      severity: 'medium',
    };

    expect(suggestion.location).toBe('children[2].props.compute');
  });

  it('should accept low severity', () => {
    const suggestion: Suggestion = {
      aspect: 'ux',
      issue: 'Minor issue',
      recommendation: 'Consider improvement',
      severity: 'low',
    };

    expect(suggestion.severity).toBe('low');
  });

  it('should accept medium severity', () => {
    const suggestion: Suggestion = {
      aspect: 'security',
      issue: 'Moderate risk',
      recommendation: 'Add validation',
      severity: 'medium',
    };

    expect(suggestion.severity).toBe('medium');
  });
});

// ==================== buildSuggestPrompt() ====================

describe('buildSuggestPrompt', () => {
  // ==================== DSL Inclusion Tests ====================

  describe('DSL inclusion', () => {
    it('should include DSL in output', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'accessibility',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt).toContain('view');
      expect(prompt).toContain('button');
    });

    it('should include stringified DSL for objects', () => {
      const options: SuggestPromptOptions = {
        dsl: { type: 'test', props: { value: 123 } },
        aspect: 'performance',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt).toContain('test');
      expect(prompt).toContain('123');
    });

    it('should handle complex nested DSL', () => {
      const complexDsl = {
        type: 'view',
        children: [
          {
            type: 'container',
            children: [
              {
                type: 'list',
                props: { items: ['a', 'b', 'c'] },
              },
            ],
          },
        ],
      };

      const options: SuggestPromptOptions = {
        dsl: complexDsl,
        aspect: 'ux',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt).toContain('container');
      expect(prompt).toContain('list');
    });

    it('should handle DSL with actions', () => {
      const dslWithActions = {
        type: 'button',
        actions: [
          { type: 'navigate', payload: { path: '/home' } },
          { type: 'emit', payload: { event: 'click' } },
        ],
      };

      const options: SuggestPromptOptions = {
        dsl: dslWithActions,
        aspect: 'security',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt).toContain('navigate');
      expect(prompt).toContain('emit');
    });
  });

  // ==================== Aspect Inclusion Tests ====================

  describe('aspect inclusion', () => {
    it('should include accessibility aspect', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'accessibility',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt.toLowerCase()).toContain('accessibility');
    });

    it('should include performance aspect', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'performance',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt.toLowerCase()).toContain('performance');
    });

    it('should include security aspect', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'security',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt.toLowerCase()).toContain('security');
    });

    it('should include ux aspect', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'ux',
      };

      const prompt = buildSuggestPrompt(options);

      expect(prompt.toLowerCase()).toContain('ux');
    });
  });

  // ==================== Prompt Structure Tests ====================

  describe('prompt structure', () => {
    it('should return non-empty string', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'accessibility',
      };

      const prompt = buildSuggestPrompt(options);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should be well-formed', () => {
      const options: SuggestPromptOptions = {
        dsl: sampleDsl,
        aspect: 'performance',
      };

      const prompt = buildSuggestPrompt(options);

      // Should not have excessive whitespace
      expect(prompt).not.toMatch(/\n{4,}/);
    });
  });
});

// ==================== parseSuggestions() ====================

describe('parseSuggestions', () => {
  // ==================== JSON Parsing Tests ====================

  describe('JSON parsing', () => {
    it('should parse valid JSON array', () => {
      const result = parseSuggestions(validSuggestionsString);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should parse suggestions with correct properties', () => {
      const result = parseSuggestions(validSuggestionsString);

      expect(result[0]).toHaveProperty('aspect', 'accessibility');
      expect(result[0]).toHaveProperty('issue', 'Button lacks ARIA label');
      expect(result[0]).toHaveProperty('recommendation');
      expect(result[0]).toHaveProperty('severity', 'high');
    });

    it('should preserve optional location property', () => {
      const result = parseSuggestions(validSuggestionsString);

      expect(result[0]).toHaveProperty('location', 'children[0]');
      expect(result[1].location).toBeUndefined();
    });

    it('should parse empty array', () => {
      const result = parseSuggestions('[]');

      expect(result).toEqual([]);
    });

    it('should parse single suggestion', () => {
      const single: Suggestion[] = [{
        aspect: 'ux',
        issue: 'Single issue',
        recommendation: 'Fix it',
        severity: 'low',
      }];

      const result = parseSuggestions(JSON.stringify(single));

      expect(result).toHaveLength(1);
      expect(result[0].aspect).toBe('ux');
    });
  });

  // ==================== Markdown Code Block Tests ====================

  describe('markdown code block handling', () => {
    it('should extract JSON from markdown code block with json tag', () => {
      const result = parseSuggestions(suggestionsWithMarkdown);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should extract JSON from markdown code block without tag', () => {
      const markdown = `\`\`\`
${validSuggestionsString}
\`\`\``;

      const result = parseSuggestions(markdown);

      expect(result).toHaveLength(2);
    });

    it('should handle text before code block', () => {
      const markdown = `I analyzed the DSL and found these issues:

\`\`\`json
${validSuggestionsString}
\`\`\``;

      const result = parseSuggestions(markdown);

      expect(result).toHaveLength(2);
    });

    it('should handle text after code block', () => {
      const markdown = `\`\`\`json
${validSuggestionsString}
\`\`\`

Let me know if you need more details.`;

      const result = parseSuggestions(markdown);

      expect(result).toHaveLength(2);
    });

    it('should use first code block when multiple exist', () => {
      const markdown = `\`\`\`json
[{"aspect": "ux", "issue": "First", "recommendation": "A", "severity": "low"}]
\`\`\`

\`\`\`json
[{"aspect": "ux", "issue": "Second", "recommendation": "B", "severity": "low"}]
\`\`\``;

      const result = parseSuggestions(markdown);

      expect(result).toHaveLength(1);
      expect(result[0].issue).toBe('First');
    });
  });

  // ==================== Error Handling Tests ====================

  describe('error handling', () => {
    it('should return empty array for invalid JSON', () => {
      const result = parseSuggestions('{ invalid json }');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = parseSuggestions('');

      expect(result).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
      const result = parseSuggestions('{"type": "object"}');

      expect(result).toEqual([]);
    });

    it('should return empty array for null', () => {
      const result = parseSuggestions('null');

      expect(result).toEqual([]);
    });

    it('should return empty array for string JSON', () => {
      const result = parseSuggestions('"just a string"');

      expect(result).toEqual([]);
    });

    it('should return empty array for number JSON', () => {
      const result = parseSuggestions('42');

      expect(result).toEqual([]);
    });

    it('should return empty array for markdown without JSON', () => {
      const result = parseSuggestions(`
Here are some suggestions:
- Fix the button
- Add labels
      `);

      expect(result).toEqual([]);
    });

    it('should return empty array for array of non-objects', () => {
      const result = parseSuggestions('[1, 2, 3]');

      expect(result).toEqual([]);
    });

    it('should return empty array for array with invalid suggestion objects', () => {
      const invalid = JSON.stringify([
        { invalid: 'structure' },
        { also: 'invalid' },
      ]);

      const result = parseSuggestions(invalid);

      expect(result).toEqual([]);
    });
  });

  // ==================== Validation Tests ====================

  describe('suggestion validation', () => {
    it('should filter out suggestions with missing required fields', () => {
      const partiallyValid = JSON.stringify([
        {
          aspect: 'ux',
          issue: 'Valid issue',
          recommendation: 'Valid recommendation',
          severity: 'high',
        },
        {
          // Missing required fields
          issue: 'Only has issue',
        },
      ]);

      const result = parseSuggestions(partiallyValid);

      expect(result).toHaveLength(1);
      expect(result[0].issue).toBe('Valid issue');
    });

    it('should filter out suggestions with invalid aspect', () => {
      const withInvalidAspect = JSON.stringify([
        {
          aspect: 'invalid_aspect',
          issue: 'Test',
          recommendation: 'Test',
          severity: 'low',
        },
      ]);

      const result = parseSuggestions(withInvalidAspect);

      expect(result).toEqual([]);
    });

    it('should filter out suggestions with invalid severity', () => {
      const withInvalidSeverity = JSON.stringify([
        {
          aspect: 'ux',
          issue: 'Test',
          recommendation: 'Test',
          severity: 'critical', // Invalid severity
        },
      ]);

      const result = parseSuggestions(withInvalidSeverity);

      expect(result).toEqual([]);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle suggestions with special characters', () => {
      const suggestionsWithSpecialChars: Suggestion[] = [{
        aspect: 'accessibility',
        issue: 'Button has "quotes" and <brackets>',
        recommendation: 'Fix the & symbol',
        severity: 'medium',
      }];

      const result = parseSuggestions(JSON.stringify(suggestionsWithSpecialChars));

      expect(result[0].issue).toContain('"quotes"');
      expect(result[0].issue).toContain('<brackets>');
    });

    it('should handle suggestions with unicode', () => {
      const suggestionsWithUnicode: Suggestion[] = [{
        aspect: 'ux',
        issue: 'Text contains 日本語',
        recommendation: 'Support internationalization',
        severity: 'low',
      }];

      const result = parseSuggestions(JSON.stringify(suggestionsWithUnicode));

      expect(result[0].issue).toContain('日本語');
    });

    it('should handle suggestions with long text', () => {
      const longText = 'A'.repeat(1000);
      const suggestionsWithLongText: Suggestion[] = [{
        aspect: 'performance',
        issue: longText,
        recommendation: 'Optimize',
        severity: 'high',
      }];

      const result = parseSuggestions(JSON.stringify(suggestionsWithLongText));

      expect(result[0].issue).toHaveLength(1000);
    });

    it('should handle JSON with extra whitespace', () => {
      const jsonWithWhitespace = `
        [
          {
            "aspect": "accessibility",
            "issue": "Test",
            "recommendation": "Fix",
            "severity": "low"
          }
        ]
      `;

      const result = parseSuggestions(jsonWithWhitespace);

      expect(result).toHaveLength(1);
    });
  });
});
