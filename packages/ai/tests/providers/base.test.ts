/**
 * Test suite for BaseProvider abstract class
 *
 * Coverage:
 * - validatePrompt method throws for empty string
 * - validatePrompt method throws for null/undefined
 * - validatePrompt method throws for whitespace-only string
 * - getEnvVar method returns environment variable value
 * - getEnvVar method returns undefined for unset variables
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AiProviderType, ProviderGenerateOptions, ProviderResponse } from '../../src/types';
import { AiError } from '../../src/errors';

// Import will fail until implementation exists
// This is expected in TDD Red phase
import { BaseProvider } from '../../src/providers/base';

// ==================== Test Concrete Implementation ====================

/**
 * Concrete implementation of BaseProvider for testing purposes.
 * Since BaseProvider is abstract, we need a concrete class to test it.
 */
class TestProvider extends BaseProvider {
  readonly name: AiProviderType = 'anthropic';

  isConfigured(): boolean {
    return true;
  }

  async generate(prompt: string, options?: ProviderGenerateOptions): Promise<ProviderResponse> {
    // Call validatePrompt to test the protected method
    this.validatePrompt(prompt);
    return {
      content: 'test response',
      model: 'test-model',
    };
  }

  // Expose protected methods for testing
  public testValidatePrompt(prompt: string): void {
    this.validatePrompt(prompt);
  }

  public testGetEnvVar(name: string): string | undefined {
    return this.getEnvVar(name);
  }
}

// ==================== BaseProvider Abstract Class ====================

describe('BaseProvider', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  // ==================== validatePrompt Method ====================

  describe('validatePrompt', () => {
    describe('when given empty string', () => {
      it('should throw AiError with VALIDATION_ERROR code', () => {
        // Arrange
        const emptyPrompt = '';

        // Act & Assert
        expect(() => provider.testValidatePrompt(emptyPrompt)).toThrow(AiError);
      });

      it('should throw with message "Prompt cannot be empty"', () => {
        // Arrange
        const emptyPrompt = '';

        // Act & Assert
        expect(() => provider.testValidatePrompt(emptyPrompt)).toThrow('Prompt cannot be empty');
      });

      it('should have VALIDATION_ERROR code', () => {
        // Arrange
        const emptyPrompt = '';

        // Act & Assert
        try {
          provider.testValidatePrompt(emptyPrompt);
          expect.fail('Expected AiError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AiError);
          if (error instanceof AiError) {
            expect(error.code).toBe('VALIDATION_ERROR');
          }
        }
      });
    });

    describe('when given null or undefined', () => {
      it('should throw AiError for null prompt', () => {
        // Arrange
        const nullPrompt = null as unknown as string;

        // Act & Assert
        expect(() => provider.testValidatePrompt(nullPrompt)).toThrow(AiError);
      });

      it('should throw AiError for undefined prompt', () => {
        // Arrange
        const undefinedPrompt = undefined as unknown as string;

        // Act & Assert
        expect(() => provider.testValidatePrompt(undefinedPrompt)).toThrow(AiError);
      });

      it('should throw with VALIDATION_ERROR code for null', () => {
        // Arrange
        const nullPrompt = null as unknown as string;

        // Act & Assert
        try {
          provider.testValidatePrompt(nullPrompt);
          expect.fail('Expected AiError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AiError);
          if (error instanceof AiError) {
            expect(error.code).toBe('VALIDATION_ERROR');
          }
        }
      });
    });

    describe('when given whitespace-only string', () => {
      it('should throw AiError for single space', () => {
        // Arrange
        const whitespacePrompt = ' ';

        // Act & Assert
        expect(() => provider.testValidatePrompt(whitespacePrompt)).toThrow(AiError);
      });

      it('should throw AiError for multiple spaces', () => {
        // Arrange
        const whitespacePrompt = '     ';

        // Act & Assert
        expect(() => provider.testValidatePrompt(whitespacePrompt)).toThrow(AiError);
      });

      it('should throw AiError for tabs', () => {
        // Arrange
        const whitespacePrompt = '\t\t\t';

        // Act & Assert
        expect(() => provider.testValidatePrompt(whitespacePrompt)).toThrow(AiError);
      });

      it('should throw AiError for newlines', () => {
        // Arrange
        const whitespacePrompt = '\n\n\n';

        // Act & Assert
        expect(() => provider.testValidatePrompt(whitespacePrompt)).toThrow(AiError);
      });

      it('should throw AiError for mixed whitespace', () => {
        // Arrange
        const whitespacePrompt = '  \t\n  \t\n  ';

        // Act & Assert
        expect(() => provider.testValidatePrompt(whitespacePrompt)).toThrow(AiError);
      });

      it('should throw with message "Prompt cannot be empty"', () => {
        // Arrange
        const whitespacePrompt = '   ';

        // Act & Assert
        expect(() => provider.testValidatePrompt(whitespacePrompt)).toThrow('Prompt cannot be empty');
      });
    });

    describe('when given valid prompt', () => {
      it('should not throw for simple text', () => {
        // Arrange
        const validPrompt = 'Hello, world!';

        // Act & Assert
        expect(() => provider.testValidatePrompt(validPrompt)).not.toThrow();
      });

      it('should not throw for prompt with leading/trailing whitespace', () => {
        // Arrange
        const validPrompt = '  valid text  ';

        // Act & Assert
        expect(() => provider.testValidatePrompt(validPrompt)).not.toThrow();
      });

      it('should not throw for single character', () => {
        // Arrange
        const validPrompt = 'a';

        // Act & Assert
        expect(() => provider.testValidatePrompt(validPrompt)).not.toThrow();
      });

      it('should not throw for long prompt', () => {
        // Arrange
        const validPrompt = 'a'.repeat(10000);

        // Act & Assert
        expect(() => provider.testValidatePrompt(validPrompt)).not.toThrow();
      });

      it('should not throw for prompt with unicode characters', () => {
        // Arrange
        const validPrompt = '日本語のプロンプト 🎉';

        // Act & Assert
        expect(() => provider.testValidatePrompt(validPrompt)).not.toThrow();
      });
    });
  });

  // ==================== getEnvVar Method ====================

  describe('getEnvVar', () => {
    const testEnvVarName = 'TEST_AI_PROVIDER_ENV_VAR';
    const testEnvVarValue = 'test-value-123';

    beforeEach(() => {
      // Clean up any existing test env var
      delete process.env[testEnvVarName];
    });

    afterEach(() => {
      // Clean up after each test
      delete process.env[testEnvVarName];
    });

    describe('when environment variable is set', () => {
      it('should return the environment variable value', () => {
        // Arrange
        process.env[testEnvVarName] = testEnvVarValue;

        // Act
        const result = provider.testGetEnvVar(testEnvVarName);

        // Assert
        expect(result).toBe(testEnvVarValue);
      });

      it('should return empty string when env var is set to empty', () => {
        // Arrange
        process.env[testEnvVarName] = '';

        // Act
        const result = provider.testGetEnvVar(testEnvVarName);

        // Assert
        expect(result).toBe('');
      });

      it('should return value with special characters', () => {
        // Arrange
        const specialValue = 'sk-abc123!@#$%^&*()_+';
        process.env[testEnvVarName] = specialValue;

        // Act
        const result = provider.testGetEnvVar(testEnvVarName);

        // Assert
        expect(result).toBe(specialValue);
      });
    });

    describe('when environment variable is not set', () => {
      it('should return undefined for unset variable', () => {
        // Arrange - env var is not set

        // Act
        const result = provider.testGetEnvVar('COMPLETELY_UNSET_ENV_VAR_12345');

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for deleted variable', () => {
        // Arrange
        process.env[testEnvVarName] = 'temporary';
        delete process.env[testEnvVarName];

        // Act
        const result = provider.testGetEnvVar(testEnvVarName);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('common API key environment variables', () => {
      it('should be able to read ANTHROPIC_API_KEY format', () => {
        // Arrange
        const apiKeyName = 'ANTHROPIC_API_KEY_TEST';
        const apiKey = 'sk-ant-api03-test-key';
        process.env[apiKeyName] = apiKey;

        // Act
        const result = provider.testGetEnvVar(apiKeyName);

        // Assert
        expect(result).toBe(apiKey);

        // Cleanup
        delete process.env[apiKeyName];
      });

      it('should be able to read OPENAI_API_KEY format', () => {
        // Arrange
        const apiKeyName = 'OPENAI_API_KEY_TEST';
        const apiKey = 'sk-test-openai-key-12345';
        process.env[apiKeyName] = apiKey;

        // Act
        const result = provider.testGetEnvVar(apiKeyName);

        // Assert
        expect(result).toBe(apiKey);

        // Cleanup
        delete process.env[apiKeyName];
      });
    });
  });

  // ==================== Abstract Class Contract ====================

  describe('abstract class contract', () => {
    it('should have name property of type AiProviderType', () => {
      // Assert
      expect(provider.name).toBe('anthropic');
    });

    it('should have generate method', () => {
      // Assert
      expect(typeof provider.generate).toBe('function');
    });

    it('should have isConfigured method', () => {
      // Assert
      expect(typeof provider.isConfigured).toBe('function');
    });
  });
});
