import type { AiProvider, AiProviderType, ProviderGenerateOptions, ProviderResponse } from '../types';
import { AiError } from '../errors';

export abstract class BaseProvider implements AiProvider {
  abstract readonly name: AiProviderType;

  abstract generate(prompt: string, options?: ProviderGenerateOptions): Promise<ProviderResponse>;
  abstract isConfigured(): boolean;

  protected validatePrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AiError('Prompt cannot be empty', 'VALIDATION_ERROR');
    }
  }

  protected getEnvVar(name: string): string | undefined {
    return process.env[name];
  }
}
