import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderType, ProviderGenerateOptions, ProviderResponse } from '../types';
import { AiError } from '../errors';
import { BaseProvider } from './base';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

export interface AnthropicProviderOptions {
  apiKey?: string;
  defaultModel?: string;
}

export class AnthropicProvider extends BaseProvider {
  readonly name: AiProviderType = 'anthropic';
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;

  constructor(options?: AnthropicProviderOptions) {
    super();
    this.apiKey = options?.apiKey ?? this.getEnvVar('ANTHROPIC_API_KEY');
    this.defaultModel = options?.defaultModel ?? DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async generate(prompt: string, options?: ProviderGenerateOptions): Promise<ProviderResponse> {
    if (!this.isConfigured()) {
      throw new AiError(
        'Anthropic provider is not configured. Please set ANTHROPIC_API_KEY environment variable or provide apiKey in options.',
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    this.validatePrompt(prompt);

    try {
      const client = new Anthropic({ apiKey: this.apiKey });

      const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      };

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }
      if (options?.systemPrompt !== undefined) {
        params.system = options.systemPrompt;
      }

      const response = await client.messages.create(params);

      const textContent = response.content.find((block) => block.type === 'text');
      const content = textContent && 'text' in textContent ? textContent.text : '';

      const result: ProviderResponse = {
        content,
        model: response.model,
      };

      if (response.usage) {
        result.usage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      }

      return result;
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new AiError(`Anthropic API error: ${message}`, 'API_ERROR');
    }
  }
}

export function createAnthropicProvider(options?: AnthropicProviderOptions): AnthropicProvider {
  return new AnthropicProvider(options);
}
