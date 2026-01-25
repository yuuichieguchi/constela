/**
 * Prompts module exports
 */

export {
  buildComponentPrompt,
  COMPONENT_SYSTEM_PROMPT,
  type ComponentPromptOptions,
} from './component';

export {
  buildViewPrompt,
  VIEW_SYSTEM_PROMPT,
  type ViewPromptOptions,
} from './view';

export {
  buildSuggestPrompt,
  parseSuggestions,
  SUGGEST_SYSTEM_PROMPT,
  type SuggestionAspect,
  type SuggestPromptOptions,
  type Suggestion,
} from './suggest';
