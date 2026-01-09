/**
 * Server-side entry point for Constela applications
 * Handles SSR rendering
 */

import type { CompiledProgram } from '@constela/compiler';
import { renderToString, type RenderOptions } from '@constela/server';

// ==================== Types ====================

export interface SSRContext {
  url: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

export interface WrapHtmlOptions {
  theme?: 'dark' | 'light';
}

// ==================== Render Page ====================

/**
 * Renders a CompiledProgram to HTML string using @constela/server's renderToString.
 *
 * @param program - The compiled program to render
 * @param ctx - SSR context including route params
 * @returns Promise that resolves to HTML string
 */
export async function renderPage(
  program: CompiledProgram,
  ctx: SSRContext
): Promise<string> {
  const options: RenderOptions = {
    route: {
      params: ctx.params,
      query: Object.fromEntries(ctx.query.entries()),
      path: ctx.url,
    },
  };
  return await renderToString(program, options);
}

// ==================== Hydration Script Generation ====================

/**
 * Escapes a JSON string for safe embedding in a script tag.
 * Prevents XSS attacks by escaping characters that could break out of the script context.
 *
 * @param json - The JSON string to escape
 * @returns Escaped JSON string safe for script tag embedding
 */
function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Serializes a CompiledProgram for client-side hydration.
 * Handles Map to Object conversion for JSON serialization.
 *
 * @param program - The compiled program to serialize
 * @returns Serialized program as JSON string
 */
function serializeProgram(program: CompiledProgram): string {
  // Create a serializable copy of the program
  const serializable = {
    ...program,
    // Convert Map to Object if actions is a Map
    actions:
      program.actions instanceof Map
        ? Object.fromEntries(program.actions.entries())
        : program.actions,
  };

  return JSON.stringify(serializable);
}

/**
 * Generates a hydration script for client-side initialization.
 *
 * The generated script:
 * - Imports hydrateApp from @constela/runtime
 * - Serializes the program data
 * - Calls hydrateApp with the program and container element
 *
 * @param program - The compiled program to hydrate
 * @returns JavaScript module code as string
 */
export function generateHydrationScript(program: CompiledProgram): string {
  const serializedProgram = escapeJsonForScript(serializeProgram(program));

  return `import { hydrateApp } from '@constela/runtime';

const program = ${serializedProgram};

hydrateApp({
  program,
  container: document.getElementById('app')
});`;
}

// ==================== HTML Document Wrapper ====================

/**
 * Wraps rendered content in a complete HTML document.
 *
 * The generated HTML includes:
 * - DOCTYPE declaration
 * - html, head, body tags
 * - Meta charset and viewport tags
 * - Optional custom head content
 * - Content wrapped in div#app
 * - Hydration script in a module script tag
 *
 * @param content - The rendered HTML content
 * @param hydrationScript - The hydration script code
 * @param head - Optional additional head content
 * @param options - Optional configuration including theme
 * @returns Complete HTML document string
 */
export function wrapHtml(
  content: string,
  hydrationScript: string,
  head?: string,
  options?: WrapHtmlOptions
): string {
  const htmlClass = options?.theme === 'dark' ? ' class="dark"' : '';
  return `<!DOCTYPE html>
<html${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head ?? ''}
</head>
<body>
<div id="app">${content}</div>
<script type="module">
${hydrationScript}
</script>
</body>
</html>`;
}
