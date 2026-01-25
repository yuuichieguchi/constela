/**
 * Test suite for DslGenerator
 *
 * Coverage:
 * - Constructor with valid options
 * - generate() calls provider and returns result
 * - generate() validates output by default
 * - validate() catches forbidden tags
 * - validate() catches forbidden actions
 * - parseResponse() extracts JSON from markdown code blocks
 * - parseResponse() handles plain JSON
 * - parseResponse() throws for invalid JSON
 * - Integration with mocked provider
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiProvider, ProviderResponse, GenerateOptions } from '../src/types';

// Import targets - will fail until implementation exists
import {
  DslGenerator,
  createDslGenerator,
  type DslGeneratorOptions,
  type GenerateResult,
} from '../src/generator';

// ==================== Test Fixtures ====================

function createMockProvider(response: ProviderResponse): AiProvider {
  return {
    name: 'anthropic',
    generate: vi.fn().mockResolvedValue(response),
    isConfigured: vi.fn().mockReturnValue(true),
  };
}

const validDslJson = {
  type: 'view',
  props: { title: 'Test View' },
  children: [
    {
      type: 'text',
      props: { content: 'Hello World' },
    },
  ],
};

const validDslString = JSON.stringify(validDslJson);

const validDslWithMarkdown = `\`\`\`json
${validDslString}
\`\`\``;

const invalidDslWithScript = {
  type: 'view',
  children: [
    { type: 'script', props: { src: 'malicious.js' } },
  ],
};

const invalidDslWithForbiddenAction = {
  type: 'view',
  actions: [
    { type: 'import', payload: { module: 'danger' } },
  ],
};

// ==================== DslGenerator Constructor ====================

describe('DslGenerator', () => {
  describe('constructor', () => {
    it('should create instance with valid provider type', () => {
      const generator = new DslGenerator({ provider: 'anthropic' });
      expect(generator).toBeInstanceOf(DslGenerator);
    });

    it('should create instance with openai provider type', () => {
      const generator = new DslGenerator({ provider: 'openai' });
      expect(generator).toBeInstanceOf(DslGenerator);
    });

    it('should accept optional providerInstance for dependency injection', () => {
      const mockProvider = createMockProvider({
        content: validDslString,
        model: 'test-model',
      });

      const generator = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
      });

      expect(generator).toBeInstanceOf(DslGenerator);
    });

    it('should accept optional security options', () => {
      const generator = new DslGenerator({
        provider: 'anthropic',
        security: {
          allowedTags: ['view', 'text'],
          maxNestingDepth: 5,
        },
      });

      expect(generator).toBeInstanceOf(DslGenerator);
    });

    it('should accept optional context', () => {
      const generator = new DslGenerator({
        provider: 'anthropic',
        context: {
          existingComponents: ['Button', 'Card'],
          theme: { primaryColor: '#007bff' },
        },
      });

      expect(generator).toBeInstanceOf(DslGenerator);
    });
  });

  // ==================== generate() Method ====================

  describe('generate()', () => {
    let mockProvider: AiProvider;
    let generator: DslGenerator;

    beforeEach(() => {
      mockProvider = createMockProvider({
        content: validDslString,
        model: 'claude-3-5-sonnet-20241022',
        usage: { inputTokens: 100, outputTokens: 200 },
      });

      generator = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
      });
    });

    it('should call provider.generate with prompt', async () => {
      const options: GenerateOptions = {
        prompt: 'Create a login form',
        output: 'component',
      };

      await generator.generate(options);

      expect(mockProvider.generate).toHaveBeenCalled();
    });

    it('should return GenerateResult with parsed dsl', async () => {
      const options: GenerateOptions = {
        prompt: 'Create a view',
        output: 'view',
      };

      const result = await generator.generate(options);

      expect(result).toHaveProperty('dsl');
      expect(result.dsl).toEqual(validDslJson);
    });

    it('should return raw response string', async () => {
      const options: GenerateOptions = {
        prompt: 'Create component',
        output: 'component',
      };

      const result = await generator.generate(options);

      expect(result).toHaveProperty('raw');
      expect(result.raw).toBe(validDslString);
    });

    it('should return validated: true for valid DSL', async () => {
      const options: GenerateOptions = {
        prompt: 'Create safe content',
        output: 'component',
      };

      const result = await generator.generate(options);

      expect(result.validated).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate output by default', async () => {
      const invalidProvider = createMockProvider({
        content: JSON.stringify(invalidDslWithScript),
        model: 'test',
      });

      const invalidGenerator = new DslGenerator({
        provider: 'anthropic',
        providerInstance: invalidProvider,
      });

      const options: GenerateOptions = {
        prompt: 'Create anything',
        output: 'component',
      };

      const result = await invalidGenerator.generate(options);

      expect(result.validated).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should use security options from constructor', async () => {
      const generatorWithSecurity = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
        security: {
          allowedTags: ['view', 'text'],
          maxNestingDepth: 3,
        },
      });

      const result = await generatorWithSecurity.generate({
        prompt: 'test',
        output: 'component',
      });

      expect(result.validated).toBe(true);
    });

    it('should merge security options from generate call', async () => {
      const options: GenerateOptions = {
        prompt: 'test',
        output: 'component',
        security: {
          maxNestingDepth: 2,
        },
      };

      const result = await generator.generate(options);

      expect(result).toHaveProperty('dsl');
    });

    it('should include context in generation', async () => {
      const generatorWithContext = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
        context: {
          existingComponents: ['Header', 'Footer'],
        },
      });

      const options: GenerateOptions = {
        prompt: 'Create page layout',
        output: 'view',
        context: {
          theme: { dark: true },
        },
      };

      await generatorWithContext.generate(options);

      expect(mockProvider.generate).toHaveBeenCalled();
    });
  });

  // ==================== validate() Method ====================

  describe('validate()', () => {
    let generator: DslGenerator;

    beforeEach(() => {
      generator = new DslGenerator({ provider: 'anthropic' });
    });

    it('should return valid: true for valid DSL', () => {
      const result = generator.validate(validDslJson);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should catch forbidden script tag', () => {
      const result = generator.validate(invalidDslWithScript);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('script')]));
    });

    it('should catch forbidden iframe tag', () => {
      const dsl = {
        type: 'view',
        children: [{ type: 'iframe', props: { src: 'http://evil.com' } }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('iframe')]));
    });

    it('should catch forbidden object tag', () => {
      const dsl = {
        type: 'view',
        children: [{ type: 'object', props: {} }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('object')]));
    });

    it('should catch forbidden embed tag', () => {
      const dsl = {
        type: 'view',
        children: [{ type: 'embed', props: {} }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('embed')]));
    });

    it('should catch forbidden form tag', () => {
      const dsl = {
        type: 'view',
        children: [{ type: 'form', props: {} }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('form')]));
    });

    it('should catch forbidden import action', () => {
      const result = generator.validate(invalidDslWithForbiddenAction);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('import')]));
    });

    it('should catch forbidden call action', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'call', payload: { fn: 'dangerous' } }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('call')]));
    });

    it('should catch forbidden dom action', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'dom', payload: { method: 'innerHTML' } }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('dom')]));
    });

    it('should catch multiple violations', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'script' },
          { type: 'iframe' },
        ],
        actions: [{ type: 'import' }],
      };

      const result = generator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should use custom security options', () => {
      const restrictedGenerator = new DslGenerator({
        provider: 'anthropic',
        security: {
          allowedTags: ['view', 'text'],
        },
      });

      const dsl = {
        type: 'button', // Not in allowed list
        props: { label: 'Click' },
      };

      const result = restrictedGenerator.validate(dsl);

      expect(result.valid).toBe(false);
    });
  });

  // ==================== parseResponse() Method ====================

  describe('parseResponse()', () => {
    let generator: DslGenerator;

    beforeEach(() => {
      generator = new DslGenerator({ provider: 'anthropic' });
    });

    it('should parse plain JSON string', () => {
      const result = generator.parseResponse(validDslString);

      expect(result).toEqual(validDslJson);
    });

    it('should extract JSON from markdown code block with json tag', () => {
      const result = generator.parseResponse(validDslWithMarkdown);

      expect(result).toEqual(validDslJson);
    });

    it('should extract JSON from markdown code block without tag', () => {
      const markdown = `\`\`\`
${validDslString}
\`\`\``;

      const result = generator.parseResponse(markdown);

      expect(result).toEqual(validDslJson);
    });

    it('should handle response with text before JSON block', () => {
      const markdown = `Here is the generated DSL:

\`\`\`json
${validDslString}
\`\`\``;

      const result = generator.parseResponse(markdown);

      expect(result).toEqual(validDslJson);
    });

    it('should handle response with text after JSON block', () => {
      const markdown = `\`\`\`json
${validDslString}
\`\`\`

I hope this helps!`;

      const result = generator.parseResponse(markdown);

      expect(result).toEqual(validDslJson);
    });

    it('should parse JSON with whitespace', () => {
      const jsonWithWhitespace = `
        {
          "type": "view",
          "props": {}
        }
      `;

      const result = generator.parseResponse(jsonWithWhitespace);

      expect(result).toEqual({ type: 'view', props: {} });
    });

    it('should throw for invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      expect(() => generator.parseResponse(invalidJson)).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => generator.parseResponse('')).toThrow();
    });

    it('should throw for non-object JSON (string)', () => {
      const stringJson = '"just a string"';

      expect(() => generator.parseResponse(stringJson)).toThrow();
    });

    it('should throw for non-object JSON (array)', () => {
      const arrayJson = '[1, 2, 3]';

      expect(() => generator.parseResponse(arrayJson)).toThrow();
    });

    it('should throw for non-object JSON (number)', () => {
      const numberJson = '42';

      expect(() => generator.parseResponse(numberJson)).toThrow();
    });

    it('should handle nested JSON objects', () => {
      const nestedJson = JSON.stringify({
        type: 'view',
        children: [
          {
            type: 'container',
            children: [
              { type: 'text', props: { content: 'Nested' } },
            ],
          },
        ],
      });

      const result = generator.parseResponse(nestedJson);

      expect(result).toHaveProperty('type', 'view');
      expect(result).toHaveProperty('children');
    });

    it('should use first JSON code block when multiple exist', () => {
      const multipleBlocks = `\`\`\`json
{"type": "first"}
\`\`\`

\`\`\`json
{"type": "second"}
\`\`\``;

      const result = generator.parseResponse(multipleBlocks);

      expect(result).toEqual({ type: 'first' });
    });
  });

  // ==================== Integration Tests ====================

  describe('integration', () => {
    it('should work end-to-end with mocked provider', async () => {
      const mockProvider = createMockProvider({
        content: validDslWithMarkdown,
        model: 'claude-3-5-sonnet-20241022',
        usage: { inputTokens: 150, outputTokens: 300 },
      });

      const generator = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
      });

      const result = await generator.generate({
        prompt: 'Create a login form with email and password fields',
        output: 'component',
      });

      expect(result.dsl).toEqual(validDslJson);
      expect(result.raw).toBe(validDslWithMarkdown);
      expect(result.validated).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle provider returning invalid DSL', async () => {
      const mockProvider = createMockProvider({
        content: JSON.stringify(invalidDslWithScript),
        model: 'test',
      });

      const generator = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
      });

      const result = await generator.generate({
        prompt: 'test',
        output: 'component',
      });

      expect(result.validated).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle provider returning malformed JSON', async () => {
      const mockProvider = createMockProvider({
        content: '{ not valid json }',
        model: 'test',
      });

      const generator = new DslGenerator({
        provider: 'anthropic',
        providerInstance: mockProvider,
      });

      await expect(
        generator.generate({ prompt: 'test', output: 'component' })
      ).rejects.toThrow();
    });
  });
});

// ==================== createDslGenerator Factory ====================

describe('createDslGenerator', () => {
  it('should create DslGenerator instance', () => {
    const generator = createDslGenerator({ provider: 'anthropic' });

    expect(generator).toBeInstanceOf(DslGenerator);
  });

  it('should pass options to DslGenerator', () => {
    const mockProvider = createMockProvider({
      content: validDslString,
      model: 'test',
    });

    const generator = createDslGenerator({
      provider: 'openai',
      providerInstance: mockProvider,
      security: { maxNestingDepth: 10 },
    });

    expect(generator).toBeInstanceOf(DslGenerator);
  });
});
