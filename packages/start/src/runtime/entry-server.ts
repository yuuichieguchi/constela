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
  /** Import map entries for resolving bare module specifiers */
  importMap?: Record<string, string>;
}

export interface WidgetConfig {
  /** The DOM element ID where the widget should be mounted */
  id: string;
  /** The compiled program for the widget */
  program: CompiledProgram;
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

  // Pass importData if present
  if (program.importData) {
    options.imports = program.importData;
  }

  return await renderToString(program, options);
}

// ==================== Hydration Script Generation ====================

/**
 * Escapes a string for safe embedding in JavaScript string literals.
 * Prevents XSS attacks by escaping characters that could break out of string context.
 *
 * @param str - The string to escape
 * @returns Escaped string safe for JavaScript string literal embedding
 */
function escapeJsString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

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
 * Converts a widget ID to a valid JavaScript identifier.
 * Replaces all non-alphanumeric characters with underscores and
 * prefixes with underscore if the result starts with a digit.
 *
 * @param id - The widget container element ID
 * @returns Valid JavaScript identifier
 */
function toJsIdentifier(id: string): string {
  // Replace all non-alphanumeric characters with underscore
  // Prefix with underscore if starts with digit
  let result = id.replace(/[^a-zA-Z0-9]/g, '_');
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  return result;
}

/**
 * Route context for hydration
 */
export interface HydrationRouteContext {
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}

/**
 * Generates a hydration script for client-side initialization.
 *
 * The generated script:
 * - Imports hydrateApp from @constela/runtime
 * - Serializes the program data
 * - Calls hydrateApp with the program and container element
 * - Optionally mounts widgets using createApp
 *
 * @param program - The compiled program to hydrate
 * @param widgets - Optional array of widget configurations to mount after hydration
 * @param route - Optional route context for dynamic routes
 * @returns JavaScript module code as string
 */
export function generateHydrationScript(
  program: CompiledProgram,
  widgets?: WidgetConfig[],
  route?: HydrationRouteContext
): string {
  const serializedProgram = escapeJsonForScript(serializeProgram(program));
  const hasWidgets = widgets && widgets.length > 0;

  // Build import statement
  const imports = hasWidgets
    ? `import { hydrateApp, createApp } from '@constela/runtime';`
    : `import { hydrateApp } from '@constela/runtime';`;

  // Build widget program declarations
  const widgetDeclarations = hasWidgets
    ? widgets
        .map((widget) => {
          const jsId = toJsIdentifier(widget.id);
          const serializedWidget = escapeJsonForScript(
            serializeProgram(widget.program)
          );
          return `const widgetProgram_${jsId} = ${serializedWidget};`;
        })
        .join('\n')
    : '';

  // Build widget mounting code
  const widgetMounting = hasWidgets
    ? widgets
        .map((widget) => {
          const jsId = toJsIdentifier(widget.id);
          const escapedId = escapeJsString(widget.id);
          return `
const container_${jsId} = document.getElementById('${escapedId}');
if (container_${jsId}) {
  container_${jsId}.innerHTML = '';
  createApp(widgetProgram_${jsId}, container_${jsId});
}`;
        })
        .join('\n')
    : '';

  // Build route context if provided
  const routeDeclaration = route
    ? `const route = ${escapeJsonForScript(JSON.stringify(route))};`
    : '';

  // Build hydrateApp options
  const hydrateOptions = route
    ? `{
  program,
  container: document.getElementById('app'),
  route
}`
    : `{
  program,
  container: document.getElementById('app')
}`;

  return `${imports}

const program = ${serializedProgram};
${routeDeclaration ? '\n' + routeDeclaration : ''}${widgetDeclarations ? '\n' + widgetDeclarations : ''}
hydrateApp(${hydrateOptions});${widgetMounting}`;
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

  // Generate import map if provided
  let importMapScript = '';
  if (options?.importMap && Object.keys(options.importMap).length > 0) {
    const importMapJson = JSON.stringify({ imports: options.importMap }, null, 2);
    importMapScript = `<script type="importmap">\n${importMapJson}\n</script>\n`;
  }

  return `<!DOCTYPE html>
<html${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${importMapScript}${head ?? ''}
</head>
<body>
<div id="app">${content}</div>
<script type="module">
${hydrationScript}
</script>
</body>
</html>`;
}
