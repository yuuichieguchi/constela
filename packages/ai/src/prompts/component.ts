/**
 * Component prompt builder for Constela DSL generation
 */

import type { GenerationContext } from '../types';

/**
 * Options for building a component prompt
 */
export interface ComponentPromptOptions {
  description: string;
  context?: GenerationContext;
  constraints?: string[];
}

/**
 * System prompt for component generation
 */
export const COMPONENT_SYSTEM_PROMPT = `You are a Constela DSL component generator.

Your task is to generate valid Constela DSL JSON for UI components based on user descriptions.

Output Requirements:
- Return valid JSON representing a Constela DSL component
- The JSON must have a "type" property specifying the component type
- Include a "props" object for component properties
- Include "children" array for nested elements if needed
- Include "actions" array for event handlers if needed

Security Rules:
- Do NOT use forbidden tags: script, iframe, object, embed, form
- Do NOT use forbidden actions: import, call, dom
- Keep nesting depth reasonable

Always output raw JSON, optionally wrapped in a markdown code block.`;

/**
 * Build a user prompt for component generation
 */
export function buildComponentPrompt(options: ComponentPromptOptions): string {
  const { description, context, constraints } = options;

  const parts: string[] = [];

  // Add description
  parts.push('Create a Constela DSL component based on the following description:\n\n' + description);

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
