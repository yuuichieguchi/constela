import OpenAI from 'openai';
import type { AiProviderType, ProviderGenerateOptions, ProviderResponse } from '../types';
import { AiError } from '../errors';
import { BaseProvider } from './base';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 4096;

export interface OpenAIProviderOptions {
  apiKey?: string;
  defaultModel?: string;
}

export class OpenAIProvider extends BaseProvider {
  readonly name: AiProviderType = 'openai';
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;

  constructor(options?: OpenAIProviderOptions) {
    super();
    this.apiKey = options?.apiKey ?? this.getEnvVar('OPENAI_API_KEY');
    this.defaultModel = options?.defaultModel ?? DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async generate(prompt: string, options?: ProviderGenerateOptions): Promise<ProviderResponse> {
    if (!this.isConfigured()) {
      throw new AiError(
        'OpenAI provider is not configured. Please set OPENAI_API_KEY environment variable or provide apiKey in options.',
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    this.validatePrompt(prompt);

    try {
      const client = new OpenAI({ apiKey: this.apiKey });

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages,
      };

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      const response = await client.chat.completions.create(params);

      const content = response.choices[0]?.message?.content;

      if (content === null || content === undefined) {
        throw new AiError('OpenAI returned empty response', 'API_ERROR');
      }

      const result: ProviderResponse = {
        content,
        model: response.model,
      };

      if (response.usage) {
        result.usage = {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        };
      }

      return result;
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new AiError(`OpenAI API error: ${message}`, 'API_ERROR');
    }
  }
}

export function createOpenAIProvider(options?: OpenAIProviderOptions): OpenAIProvider {
  return new OpenAIProvider(options);
}
