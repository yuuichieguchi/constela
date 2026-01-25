/**
 * Test suite for providers/index.ts (Provider Factory)
 *
 * Coverage:
 * - createProviderFactory returns factory
 * - factory.create('anthropic') returns AnthropicProvider
 * - factory.create('openai') returns OpenAIProvider
 * - factory.create with invalid type throws
 * - getAvailable() returns all provider types
 * - isAvailable() returns true for configured providers
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AiError } from '../../src/errors';
import type { AiProviderType, AiProvider } from '../../src/types';

// Import will fail until implementation exists
import {
  createProviderFactory,
  getProvider,
  type ProviderFactory,
} from '../../src/providers/index';
import { AnthropicProvider } from '../../src/providers/anthropic';
import { OpenAIProvider } from '../../src/providers/openai';

// ==================== createProviderFactory ====================

describe('createProviderFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set up API keys for testing
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return a ProviderFactory instance', () => {
    // Arrange & Act
    const factory = createProviderFactory();

    // Assert
    expect(factory).toBeDefined();
    expect(typeof factory.create).toBe('function');
    expect(typeof factory.getAvailable).toBe('function');
    expect(typeof factory.isAvailable).toBe('function');
  });

  it('should return object with create, getAvailable, and isAvailable methods', () => {
    // Arrange & Act
    const factory = createProviderFactory();

    // Assert
    expect(factory).toHaveProperty('create');
    expect(factory).toHaveProperty('getAvailable');
    expect(factory).toHaveProperty('isAvailable');
  });
});

// ==================== ProviderFactory.create ====================

describe('ProviderFactory.create', () => {
  const originalEnv = process.env;
  let factory: ProviderFactory;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    factory = createProviderFactory();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when creating anthropic provider', () => {
    it('should return an AnthropicProvider instance', () => {
      // Arrange & Act
      const provider = factory.create('anthropic');

      // Assert
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should return provider with name "anthropic"', () => {
      // Arrange & Act
      const provider = factory.create('anthropic');

      // Assert
      expect(provider.name).toBe('anthropic');
    });

    it('should return configured provider when API key is set', () => {
      // Arrange & Act
      const provider = factory.create('anthropic');

      // Assert
      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('when creating openai provider', () => {
    it('should return an OpenAIProvider instance', () => {
      // Arrange & Act
      const provider = factory.create('openai');

      // Assert
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should return provider with name "openai"', () => {
      // Arrange & Act
      const provider = factory.create('openai');

      // Assert
      expect(provider.name).toBe('openai');
    });

    it('should return configured provider when API key is set', () => {
      // Arrange & Act
      const provider = factory.create('openai');

      // Assert
      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('when creating with invalid type', () => {
    it('should throw AiError for unknown provider type', () => {
      // Arrange
      const invalidType = 'invalid-provider' as AiProviderType;

      // Act & Assert
      expect(() => factory.create(invalidType)).toThrow(AiError);
    });

    it('should throw with PROVIDER_NOT_FOUND code', () => {
      // Arrange
      const invalidType = 'gemini' as AiProviderType;

      // Act & Assert
      try {
        factory.create(invalidType);
        expect.fail('Expected AiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AiError);
        if (error instanceof AiError) {
          expect(error.code).toBe('PROVIDER_NOT_FOUND');
        }
      }
    });

    it('should include provider type in error message', () => {
      // Arrange
      const invalidType = 'unknown-ai' as AiProviderType;

      // Act & Assert
      expect(() => factory.create(invalidType)).toThrow(/unknown-ai/);
    });
  });

  describe('provider caching behavior', () => {
    it('should create new provider instance on each call', () => {
      // Arrange & Act
      const provider1 = factory.create('anthropic');
      const provider2 = factory.create('anthropic');

      // Assert - providers should be different instances
      // This tests that factory creates fresh instances
      expect(provider1).not.toBe(provider2);
    });
  });
});

// ==================== ProviderFactory.getAvailable ====================

describe('ProviderFactory.getAvailable', () => {
  const originalEnv = process.env;
  let factory: ProviderFactory;

  beforeEach(() => {
    process.env = { ...originalEnv };
    factory = createProviderFactory();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return array of provider types', () => {
    // Arrange & Act
    const available = factory.getAvailable();

    // Assert
    expect(Array.isArray(available)).toBe(true);
  });

  it('should include "anthropic" in available providers', () => {
    // Arrange & Act
    const available = factory.getAvailable();

    // Assert
    expect(available).toContain('anthropic');
  });

  it('should include "openai" in available providers', () => {
    // Arrange & Act
    const available = factory.getAvailable();

    // Assert
    expect(available).toContain('openai');
  });

  it('should return all supported provider types', () => {
    // Arrange & Act
    const available = factory.getAvailable();

    // Assert
    expect(available).toEqual(expect.arrayContaining(['anthropic', 'openai']));
    expect(available).toHaveLength(2);
  });

  it('should return the same types as AI_PROVIDERS constant', async () => {
    // Arrange
    const { AI_PROVIDERS } = await import('../../src/types');

    // Act
    const available = factory.getAvailable();

    // Assert
    expect(available).toEqual(expect.arrayContaining([...AI_PROVIDERS]));
  });
});

// ==================== ProviderFactory.isAvailable ====================

describe('ProviderFactory.isAvailable', () => {
  const originalEnv = process.env;
  let factory: ProviderFactory;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    factory = createProviderFactory();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when API key is configured', () => {
    it('should return true for anthropic when ANTHROPIC_API_KEY is set', () => {
      // Arrange
      process.env.ANTHROPIC_API_KEY = 'test-key';
      factory = createProviderFactory();

      // Act
      const result = factory.isAvailable('anthropic');

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for openai when OPENAI_API_KEY is set', () => {
      // Arrange
      process.env.OPENAI_API_KEY = 'test-key';
      factory = createProviderFactory();

      // Act
      const result = factory.isAvailable('openai');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('when API key is not configured', () => {
    it('should return false for anthropic when ANTHROPIC_API_KEY is not set', () => {
      // Arrange - no env var set

      // Act
      const result = factory.isAvailable('anthropic');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for openai when OPENAI_API_KEY is not set', () => {
      // Arrange - no env var set

      // Act
      const result = factory.isAvailable('openai');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('with invalid provider type', () => {
    it('should return false for unknown provider', () => {
      // Arrange
      const invalidType = 'unknown' as AiProviderType;

      // Act
      const result = factory.isAvailable(invalidType);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('mixed configuration', () => {
    it('should return correct availability for each provider', () => {
      // Arrange
      process.env.ANTHROPIC_API_KEY = 'test-key';
      delete process.env.OPENAI_API_KEY;
      factory = createProviderFactory();

      // Act & Assert
      expect(factory.isAvailable('anthropic')).toBe(true);
      expect(factory.isAvailable('openai')).toBe(false);
    });
  });
});

// ==================== getProvider Function ====================

describe('getProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return AnthropicProvider for "anthropic" type', () => {
    // Arrange & Act
    const provider = getProvider('anthropic');

    // Assert
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.name).toBe('anthropic');
  });

  it('should return OpenAIProvider for "openai" type', () => {
    // Arrange & Act
    const provider = getProvider('openai');

    // Assert
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('openai');
  });

  it('should throw AiError for invalid provider type', () => {
    // Arrange
    const invalidType = 'invalid' as AiProviderType;

    // Act & Assert
    expect(() => getProvider(invalidType)).toThrow(AiError);
  });

  it('should return configured provider when API key exists', () => {
    // Arrange & Act
    const anthropicProvider = getProvider('anthropic');
    const openaiProvider = getProvider('openai');

    // Assert
    expect(anthropicProvider.isConfigured()).toBe(true);
    expect(openaiProvider.isConfigured()).toBe(true);
  });

  it('should return unconfigured provider when API key is missing', () => {
    // Arrange
    delete process.env.ANTHROPIC_API_KEY;

    // Act
    const provider = getProvider('anthropic');

    // Assert
    expect(provider.isConfigured()).toBe(false);
  });
});

// ==================== Integration Tests ====================

describe('Provider Factory Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should allow iterating over all available providers', () => {
    // Arrange
    const factory = createProviderFactory();
    const providers: AiProvider[] = [];

    // Act
    for (const type of factory.getAvailable()) {
      providers.push(factory.create(type));
    }

    // Assert
    expect(providers).toHaveLength(2);
    expect(providers.map(p => p.name)).toContain('anthropic');
    expect(providers.map(p => p.name)).toContain('openai');
  });

  it('should create providers that implement AiProvider interface', () => {
    // Arrange
    const factory = createProviderFactory();

    // Act
    const anthropic = factory.create('anthropic');
    const openai = factory.create('openai');

    // Assert - Check interface compliance
    // name property
    expect(typeof anthropic.name).toBe('string');
    expect(typeof openai.name).toBe('string');

    // isConfigured method
    expect(typeof anthropic.isConfigured).toBe('function');
    expect(typeof openai.isConfigured).toBe('function');

    // generate method
    expect(typeof anthropic.generate).toBe('function');
    expect(typeof openai.generate).toBe('function');
  });

  it('should filter available providers based on configuration', () => {
    // Arrange
    delete process.env.OPENAI_API_KEY;
    const factory = createProviderFactory();

    // Act
    const configuredProviders = factory.getAvailable().filter(type => 
      factory.isAvailable(type)
    );

    // Assert
    expect(configuredProviders).toContain('anthropic');
    expect(configuredProviders).not.toContain('openai');
  });
});
