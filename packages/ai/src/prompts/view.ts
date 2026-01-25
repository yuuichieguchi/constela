/**
 * View prompt builder for Constela DSL generation
 */

import type { GenerationContext } from '../types';

/**
 * Options for building a view prompt
 */
export interface ViewPromptOptions {
  description: string;
  context?: GenerationContext;
  constraints?: string[];
}

/**
 * System prompt for view generation
 */
export const VIEW_SYSTEM_PROMPT = `You are a Constela DSL view generator.

Your task is to generate valid Constela DSL JSON for complete views, pages, screens, and layouts based on user descriptions.

Output Requirements:
- Return valid JSON representing a Constela DSL view
- The root element should typically be a "view" or layout component
- Include a "props" object for view properties (title, layout options, etc.)
- Include "children" array for the view's content structure
- Include "actions" array for page-level event handlers if needed
- Structure the view with proper layout containers and nested components

Security Rules:
- Do NOT use forbidden tags: script, iframe, object, embed, form
- Do NOT use forbidden actions: import, call, dom
- Keep nesting depth reasonable

Always output raw JSON, optionally wrapped in a markdown code block.`;

/**
 * Build a user prompt for view generation
 */
export function buildViewPrompt(options: ViewPromptOptions): string {
  const { description, context, constraints } = options;

  const parts: string[] = [];

  // Add description
  parts.push('Create a Constela DSL view based on the following description:\n\n' + description);

  // Add context if provided
  if (context) {
    const contextParts: string[] = [];

    if (context.existingComponents && context.existingComponents.length > 0) {
      contextParts.push('Available components: ' + context.existingComponents.join(', '));
    }

    if (context.theme && Object.keys(context.theme).length > 0) {
      contextParts.push('Theme: ' + JSON.stringify(context.theme));
    }

    if (context.schema && Object.keys(context.schema).length > 0) {
      contextParts.push('Schema: ' + JSON.stringify(context.schema));
    }

    if (contextParts.length > 0) {
      parts.push('\nContext:\n' + contextParts.join('\n'));
    }
  }

  // Add constraints if provided
  if (constraints && constraints.length > 0) {
    parts.push('\nConstraints:\n' + constraints.map(c => '- ' + c).join('\n'));
  }

  return parts.join('\n');
}
