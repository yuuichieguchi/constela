import type { AiProvider, AiProviderType } from '../types';
import { AI_PROVIDERS } from '../types';
import { AiError } from '../errors';
import { AnthropicProvider, createAnthropicProvider, type AnthropicProviderOptions } from './anthropic';
import { OpenAIProvider, createOpenAIProvider, type OpenAIProviderOptions } from './openai';

export { BaseProvider } from './base';
export { AnthropicProvider, createAnthropicProvider, type AnthropicProviderOptions } from './anthropic';
export { OpenAIProvider, createOpenAIProvider, type OpenAIProviderOptions } from './openai';

export interface ProviderFactory {
  create(type: AiProviderType): AiProvider;
  getAvailable(): readonly AiProviderType[];
  isAvailable(type: AiProviderType): boolean;
}

export function createProviderFactory(): ProviderFactory {
  return {
    create(type: AiProviderType): AiProvider {
      switch (type) {
        case 'anthropic':
          return createAnthropicProvider();
        case 'openai':
          return createOpenAIProvider();
        default:
          throw new AiError(
            `Unknown provider type: ${type}. Available providers: ${AI_PROVIDERS.join(', ')}`,
            'PROVIDER_NOT_FOUND'
          );
      }
    },

    getAvailable(): readonly AiProviderType[] {
      return AI_PROVIDERS;
    },

    isAvailable(type: AiProviderType): boolean {
      try {
        const provider = this.create(type);
        return provider.isConfigured();
      } catch {
        return false;
      }
    },
  };
}

export function getProvider(type: AiProviderType): AiProvider {
  const factory = createProviderFactory();
  return factory.create(type);
}
