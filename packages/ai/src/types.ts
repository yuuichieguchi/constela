export const AI_PROVIDERS = Object.freeze(['anthropic', 'openai'] as const);
export type AiProviderType = (typeof AI_PROVIDERS)[number];

export const AI_OUTPUT_TYPES = Object.freeze(['component', 'view', 'suggestion'] as const);
export type AiOutputType = (typeof AI_OUTPUT_TYPES)[number];

export interface GenerationContext {
  existingComponents?: string[];
  theme?: Record<string, unknown>;
  schema?: Record<string, unknown>;
}

export interface SecurityOptions {
  allowedTags?: string[];
  allowedActions?: string[];
  allowedUrlPatterns?: string[];
  maxNestingDepth?: number;
}

export interface GenerateOptions {
  prompt: string;
  output: AiOutputType;
  context?: GenerationContext;
  security?: SecurityOptions;
}

export interface ProviderGenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ProviderResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AiProvider {
  readonly name: AiProviderType;
  generate(prompt: string, options?: ProviderGenerateOptions): Promise<ProviderResponse>;
  isConfigured(): boolean;
}
