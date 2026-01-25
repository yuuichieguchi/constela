export {
  AI_PROVIDERS,
  AI_OUTPUT_TYPES,
  type AiProviderType,
  type AiOutputType,
  type GenerationContext,
  type SecurityOptions,
  type GenerateOptions,
  type ProviderGenerateOptions,
  type ProviderResponse,
  type AiProvider,
} from './types';

export {
  type AiErrorCode,
  AiError,
  ValidationError,
  SecurityError,
} from './errors';

// Security exports
export {
  FORBIDDEN_TAGS,
  FORBIDDEN_ACTIONS,
  RESTRICTED_ACTIONS,
  isForbiddenTag,
  isForbiddenAction,
  isRestrictedAction,
  type ForbiddenTag,
  type ForbiddenAction,
  type RestrictedAction,
  FORBIDDEN_URL_SCHEMES,
  isForbiddenScheme,
  validateUrl,
  type ForbiddenUrlScheme,
  type UrlValidationOptions,
  type UrlValidationResult,
} from './security';

// Validator exports
export {
  validateDsl,
  validateNode,
  validateActions,
  type ValidationContext,
  type DslValidationResult,
  type ValidationError as DslValidationError,
} from './validator';

// Provider exports
export {
  BaseProvider,
  AnthropicProvider,
  createAnthropicProvider,
  type AnthropicProviderOptions,
  OpenAIProvider,
  createOpenAIProvider,
  type OpenAIProviderOptions,
  createProviderFactory,
  getProvider,
  type ProviderFactory,
} from './providers';

// Prompts exports
export {
  buildComponentPrompt,
  COMPONENT_SYSTEM_PROMPT,
  type ComponentPromptOptions,
  buildViewPrompt,
  VIEW_SYSTEM_PROMPT,
  type ViewPromptOptions,
  buildSuggestPrompt,
  parseSuggestions,
  SUGGEST_SYSTEM_PROMPT,
  type SuggestionAspect,
  type SuggestPromptOptions,
  type Suggestion,
} from './prompts';

// Generator exports
export {
  DslGenerator,
  createDslGenerator,
  type DslGeneratorOptions,
  type GenerateResult,
} from './generator';
