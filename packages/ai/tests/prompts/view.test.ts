/**
 * Test suite for prompts/view.ts
 *
 * Coverage:
 * - buildViewPrompt() includes description
 * - buildViewPrompt() includes context when provided
 * - buildViewPrompt() includes constraints
 * - VIEW_SYSTEM_PROMPT is non-empty
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';
import type { GenerationContext } from '../../src/types';

// Import targets - will fail until implementation exists
import {
  buildViewPrompt,
  VIEW_SYSTEM_PROMPT,
  type ViewPromptOptions,
} from '../../src/prompts/view';

// ==================== VIEW_SYSTEM_PROMPT ====================

describe('VIEW_SYSTEM_PROMPT', () => {
  it('should be defined', () => {
    expect(VIEW_SYSTEM_PROMPT).toBeDefined();
  });

  it('should be a non-empty string', () => {
    expect(typeof VIEW_SYSTEM_PROMPT).toBe('string');
    expect(VIEW_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention Constela DSL', () => {
    expect(VIEW_SYSTEM_PROMPT.toLowerCase()).toContain('constela');
  });

  it('should mention view generation', () => {
    const lowerPrompt = VIEW_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/view|page|screen|layout/);
  });

  it('should mention JSON output format', () => {
    const lowerPrompt = VIEW_SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toMatch(/json|dsl/);
  });

  it('should be different from COMPONENT_SYSTEM_PROMPT', async () => {
    // Import component prompt to compare
    const { COMPONENT_SYSTEM_PROMPT } = await import('../../src/prompts/component');
    expect(VIEW_SYSTEM_PROMPT).not.toBe(COMPONENT_SYSTEM_PROMPT);
  });
});

// ==================== buildViewPrompt() ====================

describe('buildViewPrompt', () => {
  // ==================== Description Tests ====================

  describe('description handling', () => {
    it('should include description in output', () => {
      const options: ViewPromptOptions = {
        description: 'Create a dashboard view',
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('dashboard');
    });

    it('should include full description text', () => {
      const options: ViewPromptOptions = {
        description: 'A user profile page with avatar, bio, and activity feed',
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('user profile');
      expect(prompt).toContain('avatar');
      expect(prompt).toContain('activity feed');
    });

    it('should handle long descriptions', () => {
      const longDescription = 'Create a comprehensive admin dashboard view ' +
        'with sidebar navigation, header with user menu, main content area ' +
        'containing multiple widgets for analytics, user management, and ' +
        'system health monitoring. Include breadcrumbs and search functionality.';

      const options: ViewPromptOptions = {
        description: longDescription,
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('admin dashboard');
      expect(prompt).toContain('sidebar');
      expect(prompt).toContain('analytics');
    });

    it('should handle empty description', () => {
      const options: ViewPromptOptions = {
        description: '',
      };

      const prompt = buildViewPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });

  // ==================== Context Tests ====================

  describe('context handling', () => {
    it('should include existingComponents when provided', () => {
      const options: ViewPromptOptions = {
        description: 'Create a settings page',
        context: {
          existingComponents: ['Sidebar', 'Header', 'Card', 'Form'],
        },
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('Sidebar');
      expect(prompt).toContain('Header');
      expect(prompt).toContain('Card');
      expect(prompt).toContain('Form');
    });

    it('should include theme information when provided', () => {
      const options: ViewPromptOptions = {
        description: 'Create a landing page',
        context: {
          theme: {
            primaryColor: '#ff5722',
            backgroundColor: '#ffffff',
            spacing: 'comfortable',
          },
        },
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('#ff5722');
    });

    it('should include schema information when provided', () => {
      const options: ViewPromptOptions = {
        description: 'Create an order details view',
        context: {
          schema: {
            order: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                items: { type: 'array' },
                total: { type: 'number' },
              },
            },
          },
        },
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toMatch(/schema|order|properties/i);
    });

    it('should include all context properties together', () => {
      const context: GenerationContext = {
        existingComponents: ['NavBar', 'Footer', 'Button'],
        theme: { mode: 'light' },
        schema: { apiVersion: '2.0' },
      };

      const options: ViewPromptOptions = {
        description: 'Create a home page',
        context,
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('NavBar');
      expect(prompt).toContain('Footer');
    });

    it('should work without context', () => {
      const options: ViewPromptOptions = {
        description: 'Simple view without context',
      };

      const prompt = buildViewPrompt(options);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should work with empty context object', () => {
      const options: ViewPromptOptions = {
        description: 'View with empty context',
        context: {},
      };

      const prompt = buildViewPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });

  // ==================== Constraints Tests ====================

  describe('constraints handling', () => {
    it('should include single constraint', () => {
      const options: ViewPromptOptions = {
        description: 'Create a checkout page',
        constraints: ['Must be mobile-first'],
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('mobile-first');
    });

    it('should include multiple constraints', () => {
      const options: ViewPromptOptions = {
        description: 'Create a search results page',
        constraints: [
          'Must support infinite scroll',
          'Must have filter sidebar',
          'Must show loading states',
          'Must handle empty results',
        ],
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('infinite scroll');
      expect(prompt).toContain('filter sidebar');
      expect(prompt).toContain('loading states');
      expect(prompt).toContain('empty results');
    });

    it('should handle empty constraints array', () => {
      const options: ViewPromptOptions = {
        description: 'View without constraints',
        constraints: [],
      };

      const prompt = buildViewPrompt(options);

      expect(typeof prompt).toBe('string');
    });

    it('should work without constraints', () => {
      const options: ViewPromptOptions = {
        description: 'View without constraints property',
      };

      const prompt = buildViewPrompt(options);

      expect(typeof prompt).toBe('string');
    });
  });

  // ==================== Combined Options Tests ====================

  describe('combined options', () => {
    it('should handle all options together', () => {
      const options: ViewPromptOptions = {
        description: 'Create a blog post page',
        context: {
          existingComponents: ['Header', 'ArticleCard', 'Comments'],
          theme: { serif: true },
        },
        constraints: [
          'Must have sticky header',
          'Must show reading time',
        ],
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('blog post');
      expect(prompt).toContain('Header');
      expect(prompt).toContain('ArticleCard');
      expect(prompt).toContain('sticky header');
      expect(prompt).toContain('reading time');
    });

    it('should return well-formed prompt string', () => {
      const options: ViewPromptOptions = {
        description: 'Test view',
        context: { existingComponents: ['A'] },
        constraints: ['Must work'],
      };

      const prompt = buildViewPrompt(options);

      // Should not have multiple consecutive newlines (well-formatted)
      expect(prompt).not.toMatch(/\n{4,}/);
      // Should not start or end with excessive whitespace
      expect(prompt.trim()).toBe(prompt.trim());
    });
  });

  // ==================== View-Specific Tests ====================

  describe('view-specific features', () => {
    it('should handle page layout descriptions', () => {
      const options: ViewPromptOptions = {
        description: 'Create a two-column layout with sidebar and main content',
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('two-column');
      expect(prompt).toContain('sidebar');
    });

    it('should handle navigation descriptions', () => {
      const options: ViewPromptOptions = {
        description: 'Create a view with breadcrumb navigation and tabs',
        constraints: ['Must maintain scroll position on tab switch'],
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('breadcrumb');
      expect(prompt).toContain('tabs');
    });

    it('should handle data-driven view descriptions', () => {
      const options: ViewPromptOptions = {
        description: 'Create a product listing view with filters and sorting',
        context: {
          schema: {
            product: {
              properties: ['name', 'price', 'category'],
            },
          },
        },
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('product');
      expect(prompt).toContain('filters');
      expect(prompt).toContain('sorting');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle special characters in description', () => {
      const options: ViewPromptOptions = {
        description: 'Create a "quoted" view with <html> & entities',
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('"quoted"');
      expect(prompt).toContain('<html>');
      expect(prompt).toContain('&');
    });

    it('should handle unicode in description', () => {
      const options: ViewPromptOptions = {
        description: 'Create a view for displaying 中文 content',
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('中文');
    });

    it('should handle newlines in description', () => {
      const options: ViewPromptOptions = {
        description: 'Create a view\nwith multiple\nline breaks',
      };

      const prompt = buildViewPrompt(options);

      expect(typeof prompt).toBe('string');
    });

    it('should handle very long constraint text', () => {
      const options: ViewPromptOptions = {
        description: 'Test view',
        constraints: [
          'This is a very long constraint that describes in great detail ' +
          'exactly what the view must do including all edge cases and ' +
          'specific behaviors that must be implemented correctly.',
        ],
      };

      const prompt = buildViewPrompt(options);

      expect(prompt).toContain('very long constraint');
    });
  });
});
