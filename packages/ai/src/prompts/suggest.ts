/**
 * Suggest prompt builder for Constela DSL analysis
 */

/**
 * Aspects that can be analyzed for suggestions
 */
export type SuggestionAspect = 'accessibility' | 'performance' | 'security' | 'ux';

/**
 * Severity levels for suggestions
 */
export type SuggestionSeverity = 'low' | 'medium' | 'high';

/**
 * A suggestion for improving DSL
 */
export interface Suggestion {
  aspect: SuggestionAspect;
  issue: string;
  recommendation: string;
  location?: string;
  severity: SuggestionSeverity;
}

/**
 * Options for building a suggest prompt
 */
export interface SuggestPromptOptions {
  dsl: unknown;
  aspect: SuggestionAspect;
}

/**
 * Valid aspects for validation
 */
const VALID_ASPECTS: readonly SuggestionAspect[] = ['accessibility', 'performance', 'security', 'ux'];

/**
 * Valid severities for validation
 */
const VALID_SEVERITIES: readonly SuggestionSeverity[] = ['low', 'medium', 'high'];

/**
 * System prompt for suggestion generation
 */
export const SUGGEST_SYSTEM_PROMPT = `You are a Constela DSL code reviewer.

Your task is to analyze Constela DSL and provide suggestions for improvements.

Output Requirements:
- Return a JSON array of suggestion objects
- Each suggestion must have: aspect, issue, recommendation, severity
- Optionally include location (e.g., "children[0].props")
- Severity levels: low, medium, high
- Aspects: accessibility, performance, security, ux

Focus Areas by Aspect:
- accessibility: ARIA labels, keyboard navigation, screen reader support, color contrast
- performance: unnecessary nesting, heavy components, render optimization
- security: dangerous props, untrusted URLs, injection risks
- ux: usability issues, confusing layouts, missing feedback, touch targets

Always output a JSON array, optionally wrapped in a markdown code block.`;

/**
 * Build a user prompt for suggestion generation
 */
export function buildSuggestPrompt(options: SuggestPromptOptions): string {
  const { dsl, aspect } = options;

  const dslString = typeof dsl === 'string' ? dsl : JSON.stringify(dsl, null, 2);

  return `Analyze the following Constela DSL for ${aspect} issues and provide suggestions:

\`\`\`json
${dslString}
\`\`\`

Focus specifically on ${aspect} concerns. Return a JSON array of suggestions.`;
}

/**
 * Extract JSON from a response string (handles markdown code blocks)
 */
function extractJson(response: string): string | null {
  const trimmed = response.trim();
  
  if (trimmed === '') {
    return null;
  }

  // Try to find JSON in markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Return as-is if no code block found
  return trimmed;
}

/**
 * Validate a single suggestion object
 */
function isValidSuggestion(obj: unknown): obj is Suggestion {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const suggestion = obj as Record<string, unknown>;

  // Check required fields
  if (
    typeof suggestion['aspect'] !== 'string' ||
    typeof suggestion['issue'] !== 'string' ||
    typeof suggestion['recommendation'] !== 'string' ||
    typeof suggestion['severity'] !== 'string'
  ) {
    return false;
  }

  // Validate aspect
  if (!VALID_ASPECTS.includes(suggestion['aspect'] as SuggestionAspect)) {
    return false;
  }

  // Validate severity
  if (!VALID_SEVERITIES.includes(suggestion['severity'] as SuggestionSeverity)) {
    return false;
  }

  // Location is optional, but if present must be a string
  if (suggestion['location'] !== undefined && typeof suggestion['location'] !== 'string') {
    return false;
  }

  return true;
}

/**
 * Parse AI response into suggestions array
 * Returns empty array for invalid responses
 */
export function parseSuggestions(response: string): Suggestion[] {
  const jsonString = extractJson(response);
  
  if (!jsonString) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Must be an array
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter to only valid suggestions
    const validSuggestions = parsed.filter(isValidSuggestion);

    // If all items were invalid (and there were items), return empty
    if (parsed.length > 0 && validSuggestions.length === 0) {
      return [];
    }

    return validSuggestions;
  } catch {
    return [];
  }
}
