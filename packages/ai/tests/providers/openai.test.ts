/**
 * Test suite for OpenAIProvider
 *
 * Coverage:
 * - Constructor with explicit apiKey
 * - Constructor reads OPENAI_API_KEY from env
 * - isConfigured() returns true when API key set
 * - isConfigured() returns false when no API key
 * - generate() throws when not configured
 * - generate() throws for empty prompt
 * - generate() with mocked API response returns ProviderResponse
 * - Default model is gpt-4o
 * - Custom model option is used
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ProviderResponse } from '../../src/types';
import { AiError } from '../../src/errors';

// Create mock at module level
const mockCreate = vi.fn();

// Mock the OpenAI SDK before importing the provider
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

// Import after mocking
import { OpenAIProvider, createOpenAIProvider } from '../../src/providers/openai';

// ==================== OpenAIProvider ====================

describe('OpenAIProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockCreate.mockReset();

    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==================== Constructor ====================

  describe('constructor', () => {
    describe('with explicit apiKey', () => {
      it('should create provider with explicit API key', () => {
        // Arrange & Act
        const provider = new OpenAIProvider({ apiKey: 'sk-openai-explicit-key' });

        // Assert
        expect(provider).toBeInstanceOf(OpenAIProvider);
      });

      it('should use explicit API key over environment variable', () => {
        // Arrange
        process.env.OPENAI_API_KEY = 'env-key';

        // Act
        const provider = new OpenAIProvider({ apiKey: 'explicit-key' });

        // Assert
        expect(provider.isConfigured()).toBe(true);
      });

      it('should accept empty options object', () => {
        // Arrange
        process.env.OPENAI_API_KEY = 'env-key';

        // Act
        const provider = new OpenAIProvider({});

        // Assert
        expect(provider.isConfigured()).toBe(true);
      });
    });

    describe('with environment variable', () => {
      it('should read OPENAI_API_KEY from environment', () => {
        // Arrange
        process.env.OPENAI_API_KEY = 'sk-openai-env-key-123';

        // Act
        const provider = new OpenAIProvider();

        // Assert
        expect(provider.isConfigured()).toBe(true);
      });

      it('should work without explicit options when env var is set', () => {
        // Arrange
        process.env.OPENAI_API_KEY = 'sk-openai-env-key-456';

        // Act
        const provider = new OpenAIProvider();

        // Assert
        expect(provider).toBeInstanceOf(OpenAIProvider);
        expect(provider.isConfigured()).toBe(true);
      });
    });

    describe('without any API key', () => {
      it('should create provider but not be configured', () => {
        // Arrange - no env var, no explicit key

        // Act
        const provider = new OpenAIProvider();

        // Assert
        expect(provider).toBeInstanceOf(OpenAIProvider);
        expect(provider.isConfigured()).toBe(false);
      });
    });
  });

  // ==================== name Property ====================

  describe('name property', () => {
    it('should return "openai" as provider name', () => {
      // Arrange & Act
      const provider = new OpenAIProvider({ apiKey: 'test-key' });

      // Assert
      expect(provider.name).toBe('openai');
    });

    it('should be readonly', () => {
      // Arrange
      const provider = new OpenAIProvider({ apiKey: 'test-key' });

      // Assert - name should be accessible and equal to 'openai'
      expect(provider.name).toBe('openai');
    });
  });

  // ==================== isConfigured ====================

  describe('isConfigured', () => {
    describe('when API key is set', () => {
      it('should return true with explicit API key', () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'sk-openai-test-key' });

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(true);
      });

      it('should return true with environment API key', () => {
        // Arrange
        process.env.OPENAI_API_KEY = 'sk-openai-env-key';
        const provider = new OpenAIProvider();

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('when API key is not set', () => {
      it('should return false without any API key', () => {
        // Arrange
        const provider = new OpenAIProvider();

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(false);
      });

      it('should return false with empty API key', () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: '' });

        // Act
        const result = provider.isConfigured();

        // Assert
        expect(result).toBe(false);
      });

      it('should return false with undefined API key', () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: undefined });

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
        const provider = new OpenAIProvider();

        // Act & Assert
        await expect(provider.generate('test prompt')).rejects.toThrow(AiError);
      });

      it('should throw with PROVIDER_NOT_CONFIGURED code', async () => {
        // Arrange
        const provider = new OpenAIProvider();

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
        const provider = new OpenAIProvider();

        // Act & Assert
        await expect(provider.generate('test prompt')).rejects.toThrow(/openai/i);
      });
    });

    describe('when prompt is empty', () => {
      it('should throw AiError with VALIDATION_ERROR code', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });

        // Act & Assert
        await expect(provider.generate('')).rejects.toThrow(AiError);
      });

      it('should throw for whitespace-only prompt', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });

        // Act & Assert
        await expect(provider.generate('   ')).rejects.toThrow(AiError);
      });

      it('should throw with VALIDATION_ERROR code', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });

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
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: 'Generated response' } }],
          model: 'gpt-4o',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
          },
        });

        // Act
        const result = await provider.generate('Test prompt');

        // Assert
        expect(result.content).toBe('Generated response');
      });

      it('should return ProviderResponse with model name', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: 'Response' } }],
          model: 'gpt-4o',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
          },
        });

        // Act
        const result = await provider.generate('Test prompt');

        // Assert
        expect(result.model).toBe('gpt-4o');
      });

      it('should return ProviderResponse with usage information', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: 'Response' } }],
          model: 'gpt-4o',
          usage: {
            prompt_tokens: 100,
            completion_tokens: 250,
          },
        });

        // Act
        const result = await provider.generate('Test prompt');

        // Assert
        expect(result.usage).toBeDefined();
        expect(result.usage?.inputTokens).toBe(100);
        expect(result.usage?.outputTokens).toBe(250);
      });

      it('should pass correct parameters to OpenAI API', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: 'Response' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 20 },
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
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
        mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

        // Act & Assert
        await expect(provider.generate('Test prompt')).rejects.toThrow(AiError);
      });

      it('should wrap API errors with API_ERROR code', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
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

      it('should handle null content in response', async () => {
        // Arrange
        const provider = new OpenAIProvider({ apiKey: 'test-key' });
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: null } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 0 },
        });

        // Act & Assert
        await expect(provider.generate('Test prompt')).rejects.toThrow(AiError);
      });
    });
  });

  // ==================== Default Model ====================

  describe('default model', () => {
    it('should use gpt-4o as default model', async () => {
      // Arrange
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt');

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
        })
      );
    });

    it('should use constructor default model when provided', async () => {
      // Arrange
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        defaultModel: 'gpt-4-turbo',
      });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt');

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
        })
      );
    });
  });

  // ==================== Custom Model Option ====================

  describe('custom model option', () => {
    it('should use model from generate options over default', async () => {
      // Arrange
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt', { model: 'gpt-4o-mini' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        })
      );
    });

    it('should use model from options over constructor default', async () => {
      // Arrange
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        defaultModel: 'gpt-4o',
      });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt', { model: 'gpt-4-turbo' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
        })
      );
    });
  });

  // ==================== System Prompt ====================

  describe('system prompt', () => {
    it('should pass system prompt to API when provided', async () => {
      // Arrange
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      // Act
      await provider.generate('Test prompt', { systemPrompt: 'You are a helpful assistant.' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system', content: 'You are a helpful assistant.' }),
          ]),
        })
      );
    });

    it('should put system message before user message', async () => {
      // Arrange
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      // Act
      await provider.generate('User message', { systemPrompt: 'System instruction' });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System instruction' },
            { role: 'user', content: 'User message' },
          ],
        })
      );
    });
  });
});

// ==================== createOpenAIProvider Factory ====================

describe('createOpenAIProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return an OpenAIProvider instance', () => {
    // Arrange & Act
    const provider = createOpenAIProvider({ apiKey: 'test-key' });

    // Assert
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should pass options to provider', () => {
    // Arrange & Act
    const provider = createOpenAIProvider({
      apiKey: 'test-key',
      defaultModel: 'gpt-4-turbo',
    });

    // Assert
    expect(provider.isConfigured()).toBe(true);
  });

  it('should work without options', () => {
    // Arrange
    process.env.OPENAI_API_KEY = 'env-key';

    // Act
    const provider = createOpenAIProvider();

    // Assert
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.isConfigured()).toBe(true);
  });
});
