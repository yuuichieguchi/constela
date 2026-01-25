/**
 * Test suite for types.ts
 *
 * Coverage:
 * - AI_PROVIDERS constant array
 * - AI_OUTPUT_TYPES constant array
 * - Type definitions (GenerationContext, SecurityOptions, etc.)
 * - Interface structure validation
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';
import {
  AI_PROVIDERS,
  AI_OUTPUT_TYPES,
  type AiProviderType,
  type AiOutputType,
  type GenerationContext,
  type SecurityOptions,
  type GenerateOptions,
  type ProviderGenerateOptions,
  type ProviderResponse,
  type AiProvider,
} from '../src/types';

// ==================== AI_PROVIDERS Constant ====================

describe('AI_PROVIDERS', () => {
  it('should be defined as a readonly array', () => {
    expect(AI_PROVIDERS).toBeDefined();
    expect(Array.isArray(AI_PROVIDERS)).toBe(true);
  });

  it('should contain "anthropic" as a provider', () => {
    expect(AI_PROVIDERS).toContain('anthropic');
  });

  it('should contain "openai" as a provider', () => {
    expect(AI_PROVIDERS).toContain('openai');
  });

  it('should have exactly 2 providers', () => {
    expect(AI_PROVIDERS).toHaveLength(2);
  });

  it('should be a const assertion (readonly)', () => {
    // TypeScript compile-time check - this test validates the array is readonly
    // by checking that modifying it would fail at runtime if attempted
    const providers: readonly string[] = AI_PROVIDERS;
    expect(Object.isFrozen(AI_PROVIDERS)).toBe(true);
  });
});

// ==================== AI_OUTPUT_TYPES Constant ====================

describe('AI_OUTPUT_TYPES', () => {
  it('should be defined as a readonly array', () => {
    expect(AI_OUTPUT_TYPES).toBeDefined();
    expect(Array.isArray(AI_OUTPUT_TYPES)).toBe(true);
  });

  it('should contain "component" as an output type', () => {
    expect(AI_OUTPUT_TYPES).toContain('component');
  });

  it('should contain "view" as an output type', () => {
    expect(AI_OUTPUT_TYPES).toContain('view');
  });

  it('should contain "suggestion" as an output type', () => {
    expect(AI_OUTPUT_TYPES).toContain('suggestion');
  });

  it('should have exactly 3 output types', () => {
    expect(AI_OUTPUT_TYPES).toHaveLength(3);
  });

  it('should be a const assertion (readonly)', () => {
    const outputTypes: readonly string[] = AI_OUTPUT_TYPES;
    expect(Object.isFrozen(AI_OUTPUT_TYPES)).toBe(true);
  });
});

// ==================== Type Compatibility Tests ====================

describe('AiProviderType', () => {
  it('should accept valid provider types', () => {
    // These are compile-time checks that validate type compatibility
    const anthropic: AiProviderType = 'anthropic';
    const openai: AiProviderType = 'openai';

    expect(anthropic).toBe('anthropic');
    expect(openai).toBe('openai');
  });
});

describe('AiOutputType', () => {
  it('should accept valid output types', () => {
    const component: AiOutputType = 'component';
    const view: AiOutputType = 'view';
    const suggestion: AiOutputType = 'suggestion';

    expect(component).toBe('component');
    expect(view).toBe('view');
    expect(suggestion).toBe('suggestion');
  });
});

// ==================== Interface Structure Tests ====================

describe('GenerationContext', () => {
  it('should allow empty object', () => {
    const context: GenerationContext = {};
    expect(context).toEqual({});
  });

  it('should accept existingComponents array', () => {
    const context: GenerationContext = {
      existingComponents: ['Button', 'Card', 'Modal'],
    };
    expect(context.existingComponents).toEqual(['Button', 'Card', 'Modal']);
  });

  it('should accept theme record', () => {
    const context: GenerationContext = {
      theme: {
        primaryColor: '#007bff',
        fontSize: 16,
      },
    };
    expect(context.theme).toEqual({
      primaryColor: '#007bff',
      fontSize: 16,
    });
  });

  it('should accept schema record', () => {
    const context: GenerationContext = {
      schema: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    };
    expect(context.schema).toBeDefined();
  });

  it('should accept all optional properties together', () => {
    const context: GenerationContext = {
      existingComponents: ['Header'],
      theme: { color: 'blue' },
      schema: { version: 1 },
    };
    expect(context.existingComponents).toBeDefined();
    expect(context.theme).toBeDefined();
    expect(context.schema).toBeDefined();
  });
});

describe('SecurityOptions', () => {
  it('should allow empty object', () => {
    const options: SecurityOptions = {};
    expect(options).toEqual({});
  });

  it('should accept allowedTags array', () => {
    const options: SecurityOptions = {
      allowedTags: ['view', 'text', 'button'],
    };
    expect(options.allowedTags).toEqual(['view', 'text', 'button']);
  });

  it('should accept allowedActions array', () => {
    const options: SecurityOptions = {
      allowedActions: ['navigate', 'submit'],
    };
    expect(options.allowedActions).toEqual(['navigate', 'submit']);
  });

  it('should accept allowedUrlPatterns array', () => {
    const options: SecurityOptions = {
      allowedUrlPatterns: ['https://api.example.com/*', '/internal/*'],
    };
    expect(options.allowedUrlPatterns).toHaveLength(2);
  });

  it('should accept maxNestingDepth number', () => {
    const options: SecurityOptions = {
      maxNestingDepth: 10,
    };
    expect(options.maxNestingDepth).toBe(10);
  });

  it('should accept all security options together', () => {
    const options: SecurityOptions = {
      allowedTags: ['view'],
      allowedActions: ['click'],
      allowedUrlPatterns: ['https://*'],
      maxNestingDepth: 5,
    };
    expect(Object.keys(options)).toHaveLength(4);
  });
});

describe('GenerateOptions', () => {
  it('should require prompt and output', () => {
    const options: GenerateOptions = {
      prompt: 'Create a login form',
      output: 'component',
    };
    expect(options.prompt).toBe('Create a login form');
    expect(options.output).toBe('component');
  });

  it('should accept optional context', () => {
    const options: GenerateOptions = {
      prompt: 'Generate a dashboard',
      output: 'view',
      context: {
        existingComponents: ['Sidebar'],
      },
    };
    expect(options.context).toBeDefined();
  });

  it('should accept optional security options', () => {
    const options: GenerateOptions = {
      prompt: 'Generate UI',
      output: 'suggestion',
      security: {
        maxNestingDepth: 3,
      },
    };
    expect(options.security).toBeDefined();
  });

  it('should accept all options together', () => {
    const options: GenerateOptions = {
      prompt: 'Full options test',
      output: 'component',
      context: { theme: { dark: true } },
      security: { allowedTags: ['view'] },
    };
    expect(options.prompt).toBeDefined();
    expect(options.output).toBeDefined();
    expect(options.context).toBeDefined();
    expect(options.security).toBeDefined();
  });
});

describe('ProviderGenerateOptions', () => {
  it('should allow empty object', () => {
    const options: ProviderGenerateOptions = {};
    expect(options).toEqual({});
  });

  it('should accept model string', () => {
    const options: ProviderGenerateOptions = {
      model: 'claude-3-5-sonnet-20241022',
    };
    expect(options.model).toBe('claude-3-5-sonnet-20241022');
  });

  it('should accept maxTokens number', () => {
    const options: ProviderGenerateOptions = {
      maxTokens: 4096,
    };
    expect(options.maxTokens).toBe(4096);
  });

  it('should accept temperature number', () => {
    const options: ProviderGenerateOptions = {
      temperature: 0.7,
    };
    expect(options.temperature).toBe(0.7);
  });

  it('should accept systemPrompt string', () => {
    const options: ProviderGenerateOptions = {
      systemPrompt: 'You are a helpful assistant.',
    };
    expect(options.systemPrompt).toBe('You are a helpful assistant.');
  });

  it('should accept all provider options together', () => {
    const options: ProviderGenerateOptions = {
      model: 'gpt-4',
      maxTokens: 2048,
      temperature: 0.5,
      systemPrompt: 'Generate Constela DSL.',
    };
    expect(Object.keys(options)).toHaveLength(4);
  });
});

describe('ProviderResponse', () => {
  it('should require content and model', () => {
    const response: ProviderResponse = {
      content: '<view>Generated content</view>',
      model: 'claude-3-5-sonnet-20241022',
    };
    expect(response.content).toBe('<view>Generated content</view>');
    expect(response.model).toBe('claude-3-5-sonnet-20241022');
  });

  it('should accept optional usage statistics', () => {
    const response: ProviderResponse = {
      content: '<text>Hello</text>',
      model: 'gpt-4',
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
    };
    expect(response.usage).toBeDefined();
    expect(response.usage?.inputTokens).toBe(100);
    expect(response.usage?.outputTokens).toBe(50);
  });

  it('should allow response without usage', () => {
    const response: ProviderResponse = {
      content: 'test',
      model: 'test-model',
    };
    expect(response.usage).toBeUndefined();
  });
});

describe('AiProvider interface', () => {
  it('should define required name property', () => {
    // Mock provider to test interface structure
    const mockProvider: AiProvider = {
      name: 'anthropic',
      generate: async () => ({
        content: 'test',
        model: 'test',
      }),
      isConfigured: () => true,
    };

    expect(mockProvider.name).toBe('anthropic');
  });

  it('should define generate method returning Promise<ProviderResponse>', async () => {
    const mockProvider: AiProvider = {
      name: 'openai',
      generate: async (prompt: string, options?: ProviderGenerateOptions) => ({
        content: `Response to: ${prompt}`,
        model: options?.model ?? 'default-model',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
        },
      }),
      isConfigured: () => true,
    };

    const response = await mockProvider.generate('test prompt', { model: 'gpt-4' });
    expect(response.content).toBe('Response to: test prompt');
    expect(response.model).toBe('gpt-4');
  });

  it('should define isConfigured method returning boolean', () => {
    const configuredProvider: AiProvider = {
      name: 'anthropic',
      generate: async () => ({ content: '', model: '' }),
      isConfigured: () => true,
    };

    const unconfiguredProvider: AiProvider = {
      name: 'openai',
      generate: async () => ({ content: '', model: '' }),
      isConfigured: () => false,
    };

    expect(configuredProvider.isConfigured()).toBe(true);
    expect(unconfiguredProvider.isConfigured()).toBe(false);
  });

  it('should enforce readonly name property', () => {
    const provider: AiProvider = {
      name: 'anthropic',
      generate: async () => ({ content: '', model: '' }),
      isConfigured: () => true,
    };

    // The name should be readonly - this is a compile-time check
    // At runtime, we verify the structure is correct
    expect(typeof provider.name).toBe('string');
  });
});
