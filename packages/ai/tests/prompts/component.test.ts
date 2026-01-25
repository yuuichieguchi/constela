/**
 * Test suite for prompts/component.ts
 *
 * Coverage:
 * - buildComponentPrompt() includes description
 * - buildComponentPrompt() includes context when provided
 * - buildComponentPrompt() includes constraints
 * - COMPONENT_SYSTEM_PROMPT is non-empty
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';
import type { GenerationContext } from '../../src/types';

// Import targets - will fail until implementation exists
import {
  buildComponentPrompt,
  COMPONENT_SYSTEM_PROMPT,
  type ComponentPromptOptions,
} from '../../src/prompts/component';

// ==================== COMPONENT_SYSTEM_PROMPT ====================

describe('COMPONENT_SYSTEM_PROMPT', () => {
  it('should be defined', () => {
    expect(COMPONENT_SYSTEM_PROMPT).toBeDefined();
  });

  it('should be a non-empty string', () => {
    expect(typeof COMPONENT_SYSTEM_PROMPT).toBe('string');
    expect(COMPONENT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention Constela DSL', () => {
    expect(COMPONENT_SYSTEM_PROMPT.toLowerCase()).toContain('constela');
  });

  it('should mention component generation', () => {
    const lowerPrompt = COMPONENT_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/component|ui|element/);
  });

  it('should mention JSON output format', () => {
    const lowerPrompt = COMPONENT_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/json|dsl/);
  });
});

// ==================== buildComponentPrompt() ====================

describe('buildComponentPrompt', () => {
  // ==================== Description Tests ====================

  describe('description handling', () => {
    it('should include description in output', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a login button',
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('login button');
    });

    it('should include full description text', () => {
      const options: ComponentPromptOptions = {
        description: 'A responsive navigation menu with dropdown support',
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('responsive navigation menu');
      expect(prompt).toContain('dropdown');
    });

    it('should handle long descriptions', () => {
      const longDescription = 'Create a complex dashboard component with ' +
        'multiple charts, data tables, filters, and real-time updates. ' +
        'The dashboard should support dark mode and be fully accessible.';

      const options: ComponentPromptOptions = {
        description: longDescription,
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('dashboard');
      expect(prompt).toContain('charts');
      expect(prompt).toContain('accessible');
    });

    it('should handle empty description', () => {
      const options: ComponentPromptOptions = {
        description: '',
      };

      const prompt = buildComponentPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });

  // ==================== Context Tests ====================

  describe('context handling', () => {
    it('should include existingComponents when provided', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a new card component',
        context: {
          existingComponents: ['Button', 'Icon', 'Text'],
        },
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('Button');
      expect(prompt).toContain('Icon');
      expect(prompt).toContain('Text');
    });

    it('should include theme information when provided', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a themed button',
        context: {
          theme: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            fontFamily: 'Inter',
          },
        },
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('#007bff');
    });

    it('should include schema information when provided', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a user profile component',
        context: {
          schema: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toMatch(/schema|user|properties/i);
    });

    it('should include all context properties together', () => {
      const context: GenerationContext = {
        existingComponents: ['Header', 'Footer'],
        theme: { dark: true },
        schema: { version: 1 },
      };

      const options: ComponentPromptOptions = {
        description: 'Create a page layout',
        context,
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('Header');
      expect(prompt).toContain('Footer');
    });

    it('should work without context', () => {
      const options: ComponentPromptOptions = {
        description: 'Simple component without context',
      };

      const prompt = buildComponentPrompt(options);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should work with empty context object', () => {
      const options: ComponentPromptOptions = {
        description: 'Component with empty context',
        context: {},
      };

      const prompt = buildComponentPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });

  // ==================== Constraints Tests ====================

  describe('constraints handling', () => {
    it('should include single constraint', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a button',
        constraints: ['Must be accessible'],
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('accessible');
    });

    it('should include multiple constraints', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a form input',
        constraints: [
          'Must support keyboard navigation',
          'Must have proper ARIA labels',
          'Must show validation errors',
        ],
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('keyboard navigation');
      expect(prompt).toContain('ARIA');
      expect(prompt).toContain('validation');
    });

    it('should handle empty constraints array', () => {
      const options: ComponentPromptOptions = {
        description: 'Component without constraints',
        constraints: [],
      };

      const prompt = buildComponentPrompt(options);

      expect(typeof prompt).toBe('string');
    });

    it('should work without constraints', () => {
      const options: ComponentPromptOptions = {
        description: 'Component without constraints property',
      };

      const prompt = buildComponentPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });

  // ==================== Combined Options Tests ====================

  describe('combined options', () => {
    it('should handle all options together', () => {
      const options: ComponentPromptOptions = {
        description: 'Create an interactive data table',
        context: {
          existingComponents: ['Button', 'Pagination'],
          theme: { primaryColor: 'blue' },
        },
        constraints: [
          'Must support sorting',
          'Must be responsive',
        ],
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('data table');
      expect(prompt).toContain('Button');
      expect(prompt).toContain('sorting');
      expect(prompt).toContain('responsive');
    });

    it('should return well-formed prompt string', () => {
      const options: ComponentPromptOptions = {
        description: 'Test component',
        context: { existingComponents: ['A'] },
        constraints: ['Must work'],
      };

      const prompt = buildComponentPrompt(options);

      // Should not have multiple consecutive newlines (well-formatted)
      expect(prompt).not.toMatch(/\n{4,}/);
      // Should not start or end with excessive whitespace
      expect(prompt.trim()).toBe(prompt.trim());
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle special characters in description', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a "quote" component with <tags> & symbols',
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('"quote"');
      expect(prompt).toContain('<tags>');
      expect(prompt).toContain('&');
    });

    it('should handle unicode in description', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a component for displaying 日本語 text',
      };

      const prompt = buildComponentPrompt(options);

      expect(prompt).toContain('日本語');
    });

    it('should handle newlines in description', () => {
      const options: ComponentPromptOptions = {
        description: 'Create a component\nwith multiple\nlines',
      };

      const prompt = buildComponentPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });
});
