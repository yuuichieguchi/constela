/**
 * Test suite for prompts/index.ts
 *
 * Coverage:
 * - Re-exports from component.ts
 * - Re-exports from view.ts
 * - Re-exports from suggest.ts
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';

// Import targets - will fail until implementation exists
import {
  // From component.ts
  buildComponentPrompt,
  COMPONENT_SYSTEM_PROMPT,
  type ComponentPromptOptions,
  
  // From view.ts
  buildViewPrompt,
  VIEW_SYSTEM_PROMPT,
  type ViewPromptOptions,
  
  // From suggest.ts
  buildSuggestPrompt,
  parseSuggestions,
  SUGGEST_SYSTEM_PROMPT,
  type SuggestionAspect,
  type SuggestPromptOptions,
  type Suggestion,
} from '../../src/prompts';

// ==================== Component Exports ====================

describe('prompts/index.ts component exports', () => {
  it('should export buildComponentPrompt function', () => {
    expect(buildComponentPrompt).toBeDefined();
    expect(typeof buildComponentPrompt).toBe('function');
  });

  it('should export COMPONENT_SYSTEM_PROMPT constant', () => {
    expect(COMPONENT_SYSTEM_PROMPT).toBeDefined();
    expect(typeof COMPONENT_SYSTEM_PROMPT).toBe('string');
  });

  it('should make ComponentPromptOptions type available', () => {
    // Type check - this validates the type is exported and usable
    const options: ComponentPromptOptions = {
      description: 'Test component',
    };
    expect(options.description).toBe('Test component');
  });

  it('should allow using buildComponentPrompt with full options', () => {
    const options: ComponentPromptOptions = {
      description: 'Create a button',
      context: { existingComponents: ['Text'] },
      constraints: ['Must be accessible'],
    };

    const result = buildComponentPrompt(options);
    expect(typeof result).toBe('string');
  });
});

// ==================== View Exports ====================

describe('prompts/index.ts view exports', () => {
  it('should export buildViewPrompt function', () => {
    expect(buildViewPrompt).toBeDefined();
    expect(typeof buildViewPrompt).toBe('function');
  });

  it('should export VIEW_SYSTEM_PROMPT constant', () => {
    expect(VIEW_SYSTEM_PROMPT).toBeDefined();
    expect(typeof VIEW_SYSTEM_PROMPT).toBe('string');
  });

  it('should make ViewPromptOptions type available', () => {
    // Type check - this validates the type is exported and usable
    const options: ViewPromptOptions = {
      description: 'Test view',
    };
    expect(options.description).toBe('Test view');
  });

  it('should allow using buildViewPrompt with full options', () => {
    const options: ViewPromptOptions = {
      description: 'Create a dashboard',
      context: { existingComponents: ['Header'] },
      constraints: ['Must be responsive'],
    };

    const result = buildViewPrompt(options);
    expect(typeof result).toBe('string');
  });
});

// ==================== Suggest Exports ====================

describe('prompts/index.ts suggest exports', () => {
  it('should export buildSuggestPrompt function', () => {
    expect(buildSuggestPrompt).toBeDefined();
    expect(typeof buildSuggestPrompt).toBe('function');
  });

  it('should export parseSuggestions function', () => {
    expect(parseSuggestions).toBeDefined();
    expect(typeof parseSuggestions).toBe('function');
  });

  it('should export SUGGEST_SYSTEM_PROMPT constant', () => {
    expect(SUGGEST_SYSTEM_PROMPT).toBeDefined();
    expect(typeof SUGGEST_SYSTEM_PROMPT).toBe('string');
  });

  it('should make SuggestionAspect type available', () => {
    // Type check - validates the union type is exported
    const aspect1: SuggestionAspect = 'accessibility';
    const aspect2: SuggestionAspect = 'performance';
    const aspect3: SuggestionAspect = 'security';
    const aspect4: SuggestionAspect = 'ux';

    expect(aspect1).toBe('accessibility');
    expect(aspect2).toBe('performance');
    expect(aspect3).toBe('security');
    expect(aspect4).toBe('ux');
  });

  it('should make SuggestPromptOptions type available', () => {
    // Type check - this validates the type is exported and usable
    const options: SuggestPromptOptions = {
      dsl: { type: 'view' },
      aspect: 'accessibility',
    };
    expect(options.aspect).toBe('accessibility');
  });

  it('should make Suggestion type available', () => {
    // Type check - this validates the type is exported and usable
    const suggestion: Suggestion = {
      aspect: 'ux',
      issue: 'Test issue',
      recommendation: 'Test recommendation',
      severity: 'medium',
    };
    expect(suggestion.severity).toBe('medium');
  });

  it('should allow using buildSuggestPrompt with options', () => {
    const options: SuggestPromptOptions = {
      dsl: { type: 'button', props: {} },
      aspect: 'accessibility',
    };

    const result = buildSuggestPrompt(options);
    expect(typeof result).toBe('string');
  });

  it('should allow using parseSuggestions', () => {
    const suggestions: Suggestion[] = [{
      aspect: 'performance',
      issue: 'Slow render',
      recommendation: 'Optimize',
      severity: 'high',
    }];

    const result = parseSuggestions(JSON.stringify(suggestions));
    expect(Array.isArray(result)).toBe(true);
  });
});

// ==================== All Exports Together ====================

describe('prompts/index.ts all exports', () => {
  it('should export all functions from single import', () => {
    // All functions should be available from single import
    expect(buildComponentPrompt).toBeDefined();
    expect(buildViewPrompt).toBeDefined();
    expect(buildSuggestPrompt).toBeDefined();
    expect(parseSuggestions).toBeDefined();
  });

  it('should export all constants from single import', () => {
    // All constants should be available from single import
    expect(COMPONENT_SYSTEM_PROMPT).toBeDefined();
    expect(VIEW_SYSTEM_PROMPT).toBeDefined();
    expect(SUGGEST_SYSTEM_PROMPT).toBeDefined();
  });

  it('should have distinct system prompts for each type', () => {
    // Each prompt type should have a unique system prompt
    expect(COMPONENT_SYSTEM_PROMPT).not.toBe(VIEW_SYSTEM_PROMPT);
    expect(VIEW_SYSTEM_PROMPT).not.toBe(SUGGEST_SYSTEM_PROMPT);
    expect(COMPONENT_SYSTEM_PROMPT).not.toBe(SUGGEST_SYSTEM_PROMPT);
  });

  it('should allow using all types together in a workflow', () => {
    // Simulate a workflow using all exported types

    // 1. Create component prompt
    const componentOptions: ComponentPromptOptions = {
      description: 'Button',
    };
    const componentPrompt = buildComponentPrompt(componentOptions);
    expect(componentPrompt).toBeDefined();

    // 2. Create view prompt
    const viewOptions: ViewPromptOptions = {
      description: 'Dashboard',
    };
    const viewPrompt = buildViewPrompt(viewOptions);
    expect(viewPrompt).toBeDefined();

    // 3. Create suggest prompt and parse response
    const suggestOptions: SuggestPromptOptions = {
      dsl: { type: 'view' },
      aspect: 'accessibility' as SuggestionAspect,
    };
    const suggestPrompt = buildSuggestPrompt(suggestOptions);
    expect(suggestPrompt).toBeDefined();

    // 4. Parse mock suggestions
    const mockResponse = JSON.stringify([
      {
        aspect: 'accessibility',
        issue: 'Missing labels',
        recommendation: 'Add ARIA labels',
        severity: 'high',
      },
    ]);
    const suggestions: Suggestion[] = parseSuggestions(mockResponse);
    expect(suggestions).toHaveLength(1);
  });
});

// ==================== Type Compatibility ====================

describe('prompts/index.ts type compatibility', () => {
  it('should allow ComponentPromptOptions with context', () => {
    const options: ComponentPromptOptions = {
      description: 'Test',
      context: {
        existingComponents: ['A', 'B'],
        theme: { color: 'blue' },
        schema: { version: 1 },
      },
      constraints: ['a', 'b'],
    };

    expect(options.context?.existingComponents).toHaveLength(2);
  });

  it('should allow ViewPromptOptions with context', () => {
    const options: ViewPromptOptions = {
      description: 'Test',
      context: {
        existingComponents: ['Header', 'Footer'],
        theme: { dark: true },
      },
      constraints: ['responsive'],
    };

    expect(options.context?.theme).toEqual({ dark: true });
  });

  it('should allow Suggestion with optional location', () => {
    const withLocation: Suggestion = {
      aspect: 'security',
      issue: 'Issue',
      recommendation: 'Fix',
      location: 'root.children[0]',
      severity: 'high',
    };

    const withoutLocation: Suggestion = {
      aspect: 'security',
      issue: 'Issue',
      recommendation: 'Fix',
      severity: 'low',
    };

    expect(withLocation.location).toBe('root.children[0]');
    expect(withoutLocation.location).toBeUndefined();
  });
});
