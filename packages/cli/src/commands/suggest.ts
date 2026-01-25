/**
 * Suggest command for @constela/cli
 *
 * Analyzes Constela DSL files and provides AI-powered suggestions
 * for improvements in accessibility, performance, security, and UX.
 *
 * Usage:
 *   constela suggest <input> [options]
 *
 * Options:
 *   --aspect <type>     Aspect to analyze: accessibility, performance, security, ux
 *   --provider <name>   AI provider: anthropic, openai (default: anthropic)
 *   --json              Output results as JSON
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getProvider,
  buildSuggestPrompt,
  parseSuggestions,
  SUGGEST_SYSTEM_PROMPT,
  type SuggestionAspect,
  type Suggestion,
} from '@constela/ai';
import type { AiProviderType } from '@constela/core';

export interface SuggestCommandOptions {
  aspect?: string;
  provider?: string;
  json?: boolean;
}

const VALID_ASPECTS = ['accessibility', 'performance', 'security', 'ux'] as const;
const VALID_PROVIDERS = ['anthropic', 'openai'] as const;

/**
 * Execute the suggest command
 */
export async function suggestCommand(
  input: string,
  options: SuggestCommandOptions
): Promise<void> {
  try {
    // Resolve input file path
    const inputPath = resolve(process.cwd(), input);

    if (!existsSync(inputPath)) {
      console.error('Error: File not found - ' + inputPath);
      process.exit(1);
    }

    // Read and parse input file
    const content = readFileSync(inputPath, 'utf-8');
    let dsl: unknown;

    try {
      dsl = JSON.parse(content);
    } catch {
      console.error('Error: Invalid JSON in input file');
      process.exit(1);
    }

    // Validate aspect
    const aspect = (options.aspect ?? 'accessibility') as SuggestionAspect;
    if (!VALID_ASPECTS.includes(aspect as typeof VALID_ASPECTS[number])) {
      console.error('Error: Invalid aspect. Valid options: ' + VALID_ASPECTS.join(', '));
      process.exit(1);
    }

    // Validate provider
    const providerType = (options.provider ?? 'anthropic') as AiProviderType;
    if (!VALID_PROVIDERS.includes(providerType as typeof VALID_PROVIDERS[number])) {
      console.error('Error: Invalid provider. Valid options: ' + VALID_PROVIDERS.join(', '));
      process.exit(1);
    }

    // Check API key
    const apiKeyEnvVar = providerType === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    if (!process.env[apiKeyEnvVar]) {
      console.error('Error: ' + apiKeyEnvVar + ' environment variable is not set');
      process.exit(1);
    }

    console.log('Analyzing ' + input + ' for ' + aspect + ' suggestions...');

    // Get provider and call directly with suggest prompt
    const provider = getProvider(providerType);
    const prompt = buildSuggestPrompt({ dsl, aspect });

    const response = await provider.generate(prompt, {
      systemPrompt: SUGGEST_SYSTEM_PROMPT,
    });

    // Parse suggestions from response
    const suggestions = parseSuggestions(response.content);

    // Output results
    if (options.json) {
      console.log(JSON.stringify({ suggestions, aspect, file: input }, null, 2));
    } else {
      outputSuggestions(suggestions, aspect, input);
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error: ' + error.message);
    process.exit(1);
  }
}

/**
 * Format and output suggestions to console
 */
function outputSuggestions(
  suggestions: Suggestion[],
  aspect: string,
  file: string
): void {
  console.log('');
  console.log('=== Suggestions for ' + file + ' (' + aspect + ') ===');
  console.log('');

  if (suggestions.length === 0) {
    console.log('No suggestions found. Great job!');
    return;
  }

  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i]!;
    const severityIcon = s.severity === 'high' ? '[HIGH]' : s.severity === 'medium' ? '[MED]' : '[LOW]';

    console.log(severityIcon + ' ' + s.issue);
    console.log('   Recommendation: ' + s.recommendation);
    if (s.location) {
      console.log('   Location: ' + s.location);
    }
    console.log('');
  }

  console.log('Total: ' + suggestions.length + ' suggestion(s)');
}
