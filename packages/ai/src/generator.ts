/**
 * DSL Generator
 *
 * Main class for generating Constela DSL using AI providers
 */

import type {
  AiProvider,
  AiProviderType,
  GenerateOptions,
  GenerationContext,
  SecurityOptions,
} from './types';
import { validateDsl, type DslValidationResult } from './validator';
import { getProvider } from './providers';
import { buildComponentPrompt, COMPONENT_SYSTEM_PROMPT } from './prompts/component';
import { buildViewPrompt, VIEW_SYSTEM_PROMPT } from './prompts/view';
import { buildSuggestPrompt, SUGGEST_SYSTEM_PROMPT } from './prompts/suggest';

/**
 * Options for creating a DslGenerator
 */
export interface DslGeneratorOptions {
  provider: AiProviderType;
  providerInstance?: AiProvider;
  security?: SecurityOptions;
  context?: GenerationContext;
}

/**
 * Result of DSL generation
 */
export interface GenerateResult {
  dsl: Record<string, unknown>;
  raw: string;
  validated: boolean;
  errors?: string[];
}

/**
 * Main class for generating DSL
 */
export class DslGenerator {
  private readonly providerType: AiProviderType;
  private readonly provider: AiProvider;
  private readonly security: SecurityOptions;
  private readonly context: GenerationContext;

  constructor(options: DslGeneratorOptions) {
    this.providerType = options.provider;
    this.provider = options.providerInstance ?? getProvider(options.provider);
    this.security = options.security ?? {};
    this.context = options.context ?? {};
  }

  /**
   * Generate DSL from a prompt
   */
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const { prompt, output, context, security } = options;

    // Merge contexts
    const mergedContext: GenerationContext = {
      ...this.context,
      ...context,
    };

    // Merge security options
    const mergedSecurity: SecurityOptions = {
      ...this.security,
      ...security,
    };

    // Build the user prompt based on output type
    let userPrompt: string;
    let systemPrompt: string;

    switch (output) {
      case 'component':
        userPrompt = buildComponentPrompt({
          description: prompt,
          context: mergedContext,
        });
        systemPrompt = COMPONENT_SYSTEM_PROMPT;
        break;
      case 'view':
        userPrompt = buildViewPrompt({
          description: prompt,
          context: mergedContext,
        });
        systemPrompt = VIEW_SYSTEM_PROMPT;
        break;
      case 'suggestion':
        userPrompt = buildSuggestPrompt({
          dsl: {},
          aspect: 'accessibility',
        });
        systemPrompt = SUGGEST_SYSTEM_PROMPT;
        break;
      default:
        userPrompt = prompt;
        systemPrompt = COMPONENT_SYSTEM_PROMPT;
    }

    // Call the provider
    const response = await this.provider.generate(userPrompt, {
      systemPrompt,
    });

    const raw = response.content;

    // Parse the response
    const dsl = this.parseResponse(raw);

    // Validate the DSL
    const validationResult = this.validate(dsl, mergedSecurity);

    if (validationResult.valid) {
      return {
        dsl,
        raw,
        validated: true,
      };
    }

    return {
      dsl,
      raw,
      validated: false,
      errors: validationResult.errors,
    };
  }

  /**
   * Validate DSL against security rules
   */
  validate(
    dsl: unknown,
    securityOverrides?: SecurityOptions
  ): { valid: boolean; errors: string[] } {
    const mergedSecurity: SecurityOptions = {
      ...this.security,
      ...securityOverrides,
    };

    const result: DslValidationResult = validateDsl(dsl, {
      security: mergedSecurity,
    });

    return {
      valid: result.valid,
      errors: result.errors.map(e => e.message),
    };
  }

  /**
   * Parse AI response and extract JSON
   */
  parseResponse(response: string): Record<string, unknown> {
    const trimmed = response.trim();

    if (trimmed === '') {
      throw new Error('Empty response');
    }

    // Try to find JSON in markdown code block
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = codeBlockMatch?.[1]?.trim() ?? trimmed;

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON in response');
    }

    // Validate it's a plain object (not array, not primitive)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Response must be a JSON object');
    }

    return parsed as Record<string, unknown>;
  }
}

/**
 * Factory function to create a DslGenerator
 */
export function createDslGenerator(options: DslGeneratorOptions): DslGenerator {
  return new DslGenerator(options);
}
