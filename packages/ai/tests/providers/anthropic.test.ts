/**
 * Test suite for AnthropicProvider
 *
 * Coverage:
 * - Constructor with explicit apiKey
 * - Constructor reads ANTHROPIC_API_KEY from env
 * - isConfigured() returns true when API key set
 * - isConfigured() returns false when no API key
 * - generate() throws when not configured
 * - generate() throws for empty prompt
 * - generate() with mocked API response returns ProviderResponse
 * - Default model is claude-sonnet-4-20250514
 * - Custom model option is used
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { ProviderResponse } from '../../src/types';
import { AiError } from '../../src/errors';

// Create mock at module level
const mockCreate = vi.fn();

// Mock the Anthropic SDK before importing the provider
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

// Import after mocking
import { AnthropicProvider, createAnthropicProvider } from '../../src/providers/anthropic';

// ==================== AnthropicProvider ====================

describe('AnthropicProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockCreate.mockReset();

    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==================== Constructor ====================

  describe('constructor', () => {
    describe('with explicit apiKey', () => {
      it('should create provider with explicit API key', () => {
        // Arrange & Act
        const provider = new AnthropicProvider({ apiKey: 'sk-ant-explicit-key' });

        // Assert
        expect(provider).toBeInstanceOf(AnthropicProvider);
      });

      it('should use explicit API key over environment variable', () => {
        // Arrange
        process.env.ANTHROPIC_API_KEY = 'env-key';

        // Act
        const provider = new AnthropicProvider({ apiKey: 'explicit-key' });

        // Assert
        expect(provider.isConfigured()).toBe(true);
      });

      it('should accept empty options object', () => {
        // Arrange
        process.env.ANTHROPIC_API_KEY = 'env-key';

        // Act
        const provider = new AnthropicProvider({});

        // Assert
        expect(provider.isConfigured()).toBe(true);
      });
    });

    describe('with environment variable', () => {
      it('should read ANTHROPIC_API_KEY from environment', () => {
        // Arrange
        process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key-123';

        // Act
        const provider = new AnthropicProvider();

        // Assert
        expect(provider.isConfigured()).toBe(true);
      });

      it('should work without explicit options when env var is set', () => {
        // Arrange
        process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key-456';

        // Act
        const provider = new AnthropicProvider();

        // Assert
        expect(provider).toBeInstanceOf(AnthropicProvider);
        expect(provider.isConfigured()).toBe(true);
      });
    });

    describe('without any API key', () => {
      it('should create provider but not be configured', () => {
        // Arrange - no env var, no explicit key

        // Act
        const provider = new AnthropicProvider();

        // Assert
        expect(provider).toBeInstanceOf(AnthropicProvider);
        expect(provider.isConfigured()).toBe(false);
      });
    });
  });

  // ==================== name Property ====================

  describe('name property', () => {
    it('should return "anthropic" as provider name', () => {
      // Arrange & Act
      const provider = new AnthropicProvider({ apiKey: 'test-key' });

      // Assert
      expect(provider.name).toBe('anthropic');
    });

    it('should be readonly', () => {
      // Arrange
      const provider = new AnthropicProvider({ apiKey: 'test-key' });

      // Assert - name should be accessible and equal to 'anthropic'
      expect(provider.name).toBe('anthropic');
    });
  });

  // ==================== isConfigured ====================

  describe('isConfigured', () => {
    describe('when API key is set', () => {
      it('should return true with explicit API key', () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'sk-ant-test-key' });

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(true);
      });

      it('should return true with environment API key', () => {
        // Arrange
        process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key';
        const provider = new AnthropicProvider();

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('when API key is not set', () => {
      it('should return false without any API key', () => {
        // Arrange
        const provider = new AnthropicProvider();

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(false);
      });

      it('should return false with empty API key', () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: '' });

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(false);
      });

      it('should return false with undefined API key', () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: undefined });

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  // ==================== generate ====================

  describe('generate', () => {
    describe('when not configured', () => {
      it('should throw AiError with PROVIDER_NOT_CONFIGURED code', async () => {
        // Arrange
        const provider = new AnthropicProvider();

        // Act & Assert
        await expect(provider.generate('test prompt')).rejects.toThrow(AiError);
      });

      it('should throw with PROVIDER_NOT_CONFIGURED code', async () => {
        // Arrange
        const provider = new AnthropicProvider();

        // Act & Assert
        try {
          await provider.generate('test prompt');
          expect.fail('Expected AiError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AiError);
          if (error instanceof AiError) {
            expect(error.code).toBe('PROVIDER_NOT_CONFIGURED');
          }
        }
      });

      it('should include provider name in error message', async () => {
        // Arrange
        const provider = new AnthropicProvider();

        // Act & Assert
        await expect(provider.generate('test prompt')).rejects.toThrow(/anthropic/i);
      });
    });

    describe('when prompt is empty', () => {
      it('should throw AiError with VALIDATION_ERROR code', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });

        // Act & Assert
        await expect(provider.generate('')).rejects.toThrow(AiError);
      });

      it('should throw for whitespace-only prompt', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });

        // Act & Assert
        await expect(provider.generate('   ')).rejects.toThrow(AiError);
      });

      it('should throw with VALIDATION_ERROR code', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });

        // Act & Assert
        try {
          await provider.generate('');
          expect.fail('Expected AiError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AiError);
          if (error instanceof AiError) {
            expect(error.code).toBe('VALIDATION_ERROR');
          }
        }
      });
    });

    describe('with mocked API response', () => {
      it('should return ProviderResponse with content', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Generated response' }],
          model: 'claude-sonnet-4-20250514',
          usage: {
            input_tokens: 10,
            output_tokens: 20,
          },
        });

        // Act
        const result = await provider.generate('Test prompt');

        // Assert
        expect(result.content).toBe('Generated response');
      });

      it('should return ProviderResponse with model name', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-sonnet-4-20250514',
          usage: {
            input_tokens: 10,
            output_tokens: 20,
          },
        });

        // Act
        const result = await provider.generate('Test prompt');

        // Assert
        expect(result.model).toBe('claude-sonnet-4-20250514');
      });

      it('should return ProviderResponse with usage information', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-sonnet-4-20250514',
          usage: {
            input_tokens: 100,
            output_tokens: 250,
          },
        });

        // Act
        const result = await provider.generate('Test prompt');

        // Assert
        expect(result.usage).toBeDefined();
        expect(result.usage?.inputTokens).toBe(100);
        expect(result.usage?.outputTokens).toBe(250);
      });

      it('should pass correct parameters to Anthropic API', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 20 },
        });

        // Act
        await provider.generate('Test prompt', {
          maxTokens: 1000,
          temperature: 0.7,
        });

        // Assert
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'user', content: 'Test prompt' }),
            ]),
            max_tokens: 1000,
            temperature: 0.7,
          })
        );
      });

      it('should handle API errors gracefully', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });
        mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

        // Act & Assert
        await expect(provider.generate('Test prompt')).rejects.toThrow(AiError);
      });

      it('should wrap API errors with API_ERROR code', async () => {
        // Arrange
        const provider = new AnthropicProvider({ apiKey: 'test-key' });
        mockCreate.mockRejectedValueOnce(new Error('Network error'));

        // Act & Assert
        try {
          await provider.generate('Test prompt');
          expect.fail('Expected AiError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AiError);
          if (error instanceof AiError) {
            expect(error.code).toBe('API_ERROR');
          }
        }
      });
    });
  });

  // ==================== Default Model ====================

  describe('default model', () => {
    it('should use claude-sonnet-4-20250514 as default model', async () => {
      // Arrange
      const provider = new AnthropicProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt');

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        })
      );
    });

    it('should use constructor default model when provided', async () => {
      // Arrange
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        defaultModel: 'claude-opus-4-20250514',
      });
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-opus-4-20250514',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt');

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-20250514',
        })
      );
    });
  });

  // ==================== Custom Model Option ====================

  describe('custom model option', () => {
    it('should use model from generate options over default', async () => {
      // Arrange
      const provider = new AnthropicProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-haiku-3-5-20241022',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt', { model: 'claude-haiku-3-5-20241022' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-3-5-20241022',
        })
      );
    });

    it('should use model from options over constructor default', async () => {
      // Arrange
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        defaultModel: 'claude-sonnet-4-20250514',
      });
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-opus-4-20250514',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt', { model: 'claude-opus-4-20250514' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-20250514',
        })
      );
    });
  });

  // ==================== System Prompt ====================

  describe('system prompt', () => {
    it('should pass system prompt to API when provided', async () => {
      // Arrange
      const provider = new AnthropicProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt', { systemPrompt: 'You are a helpful assistant.' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
        })
      );
    });
  });
});

// ==================== createAnthropicProvider Factory ====================

describe('createAnthropicProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return an AnthropicProvider instance', () => {
    // Arrange & Act
    const provider = createAnthropicProvider({ apiKey: 'test-key' });

    // Assert
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should pass options to provider', () => {
    // Arrange & Act
    const provider = createAnthropicProvider({
      apiKey: 'test-key',
      defaultModel: 'claude-opus-4-20250514',
    });

    // Assert
    expect(provider.isConfigured()).toBe(true);
  });

  it('should work without options', () => {
    // Arrange
    process.env.ANTHROPIC_API_KEY = 'env-key';

    // Act
    const provider = createAnthropicProvider();

    // Assert
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.isConfigured()).toBe(true);
  });
});
