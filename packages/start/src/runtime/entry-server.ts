/**
 * Server-side entry point for Constela applications
 * Handles SSR rendering
 */

import type { CompiledProgram, CompiledExpression, CompiledRouteDefinition } from '@constela/compiler';
import { renderToString, type RenderOptions } from '@constela/server';

// ==================== Types ====================

export interface SSRContext {
  url: string;
  params: Record<string, string>;
  query: URLSearchParams;
  cookies?: Record<string, string>;
}

export interface WrapHtmlOptions {
  theme?: 'dark' | 'light';
  /** HTML lang attribute for SEO */
  lang?: string;
  /** Import map entries for resolving bare module specifiers */
  importMap?: Record<string, string>;
  /** Path to bundled runtime for production builds. When provided, replaces @constela/runtime imports and excludes importmap. */
  runtimePath?: string;
  /** localStorage key for theme persistence. When provided, generates anti-flash script. */
  themeStorageKey?: string;
  /** Default theme to use when no stored preference exists */
  defaultTheme?: 'dark' | 'light';
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
  // Build state overrides from cookies
  const stateOverrides: Record<string, unknown> = {};

  // Read theme from cookie if available and theme state exists in program.
  // Note: Theme value validation (e.g., restricting to 'dark'|'light') is intentionally
  // deferred to the application level. This allows custom themes and doesn't break
  // SSR if a user has an unexpected cookie value - the runtime will handle it gracefully.
  if (ctx.cookies?.['theme'] && program.state?.['theme']) {
    const themeFromCookie = ctx.cookies['theme'];
    if (themeFromCookie) {
      stateOverrides['theme'] = themeFromCookie;
    }
  }

  const options: RenderOptions = {
    route: {
      params: ctx.params,
      query: Object.fromEntries(ctx.query.entries()),
      path: ctx.url,
    },
  };

  // Pass cookies if available
  if (ctx.cookies) {
    options.cookies = ctx.cookies;
  }

  // Only add stateOverrides if there are any
  if (Object.keys(stateOverrides).length > 0) {
    options.stateOverrides = stateOverrides;
  }

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
 * - When hmrUrl is provided, sets up HMR client, handler, and error overlay
 *
 * @param program - The compiled program to hydrate
 * @param widgets - Optional array of widget configurations to mount after hydration
 * @param route - Optional route context for dynamic routes
 * @param hmrUrl - Optional WebSocket URL for HMR connection (development mode)
 * @returns JavaScript module code as string
 */
export function generateHydrationScript(
  program: CompiledProgram,
  widgets?: WidgetConfig[],
  route?: HydrationRouteContext,
  hmrUrl?: string
): string {
  const serializedProgram = escapeJsonForScript(serializeProgram(program));
  const hasWidgets = widgets && widgets.length > 0;
  const enableHmr = hmrUrl && hmrUrl.length > 0;

  // Build import statement
  let imports: string;
  if (enableHmr) {
    const baseImports = ['hydrateApp', 'createHMRClient', 'createHMRHandler', 'createErrorOverlay'];
    if (hasWidgets) {
      baseImports.push('createApp');
    }
    imports = `import { ${baseImports.join(', ')} } from '@constela/runtime';`;
  } else {
    imports = hasWidgets
      ? `import { hydrateApp, createApp } from '@constela/runtime';`
      : `import { hydrateApp } from '@constela/runtime';`;
  }

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
  // Note: params are static (from SSG), but query and path are dynamic (from browser)
  const routeDeclaration = route
    ? `const route = {
  params: ${escapeJsonForScript(JSON.stringify(route.params || {}))},
  query: Object.fromEntries(new URLSearchParams(window.location.search)),
  path: window.location.pathname
};`
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

  // Build HMR setup code if enabled
  let hmrSetup = '';
  if (enableHmr) {
    const escapedHmrUrl = escapeJsString(hmrUrl);
    const handlerOptions = route
      ? `{
  container: document.getElementById('app'),
  program,
  route,
  skipInitialRender: true
}`
      : `{
  container: document.getElementById('app'),
  program,
  skipInitialRender: true
}`;

    hmrSetup = `

const overlay = createErrorOverlay();
const handler = createHMRHandler(${handlerOptions});
const client = createHMRClient({
  url: '${escapedHmrUrl}',
  onUpdate: (file, newProgram) => { handler.handleUpdate(newProgram); },
  onError: (file, errors) => { overlay.show(errors); },
  onConnect: () => { console.log('[HMR] Connected'); }
});
client.connect();`;
  }

  return `${imports}

const program = ${serializedProgram};
${routeDeclaration ? '\n' + routeDeclaration : ''}${widgetDeclarations ? '\n' + widgetDeclarations : ''}
hydrateApp(${hydrateOptions});${hmrSetup}${widgetMounting}`;
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
  // Build lang attribute with validation
  let langAttr = '';
  if (options?.lang) {
    // Validate lang to prevent injection attacks (BCP 47 language tag format)
    // Supports: extended language subtags (zh-cmn-Hans), variants (de-CH-1901),
    // extensions (de-DE-u-co-phonebk), private use (en-x-custom), grandfathered (i-klingon)
    if (!/^([a-zA-Z]{2,3}|i)(-[a-zA-Z0-9]{1,8})*$/.test(options.lang)) {
      throw new Error(`Invalid lang: ${options.lang}. Expected BCP 47 language tag (e.g., 'en', 'ja', 'en-US', 'zh-Hans-CN', 'zh-cmn-Hans', 'de-DE-u-co-phonebk').`);
    }
    langAttr = ` lang="${options.lang}"`;
  }
  // Determine html class: use defaultTheme if set, otherwise fall back to theme option
  const htmlClass = options?.defaultTheme === 'dark' || options?.theme === 'dark' ? ' class="dark"' : '';

  // Production mode: use bundled runtime, no importmap
  let processedScript = hydrationScript;
  let importMapScript = '';

  if (options?.runtimePath) {
    // Validate runtimePath to prevent injection attacks
    if (!/^[a-zA-Z0-9/_.-]+$/.test(options.runtimePath)) {
      throw new Error(`Invalid runtimePath: ${options.runtimePath}. Only alphanumeric characters, slashes, underscores, dots, and hyphens are allowed.`);
    }
    // Replace @constela/runtime import with bundled runtime path
    processedScript = hydrationScript.replace(
      /from\s+['"]@constela\/runtime['"]/g,
      `from '${options.runtimePath}'`
    );
    // In production mode with runtimePath, still generate importmap for external imports if provided
    if (options?.importMap && Object.keys(options.importMap).length > 0) {
      const importMapJson = JSON.stringify({ imports: options.importMap }, null, 2);
      importMapScript = `<script type="importmap">\n${importMapJson}\n</script>\n`;
    }
  } else if (options?.importMap && Object.keys(options.importMap).length > 0) {
    // Development mode: use importmap
    const importMapJson = JSON.stringify({ imports: options.importMap }, null, 2);
    importMapScript = `<script type="importmap">\n${importMapJson}\n</script>\n`;
  }

  // Generate anti-flash script for theme persistence
  let themeScript = '';
  if (options?.themeStorageKey) {
    // Validate themeStorageKey to prevent injection attacks
    if (!/^[a-zA-Z0-9_-]+$/.test(options.themeStorageKey)) {
      throw new Error(`Invalid themeStorageKey: ${options.themeStorageKey}. Only alphanumeric characters, underscores, and hyphens are allowed.`);
    }
    themeScript = `<script>
(function() {
  try {
    var theme;
    // Check cookie first (for SSR/SSG sync)
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.indexOf('${options.themeStorageKey}=') === 0) {
        theme = decodeURIComponent(cookie.substring('${options.themeStorageKey}='.length));
        break;
      }
    }
    // Fallback to localStorage
    if (!theme) {
      var raw = localStorage.getItem('${options.themeStorageKey}');
      theme = raw;
      try { theme = JSON.parse(raw); } catch (e) {}
    }
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
</script>
`;
  }

  return `<!DOCTYPE html>
<html${langAttr}${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${themeScript}${importMapScript}${head ?? ''}
</head>
<body>
<div id="app">${content}</div>
<script type="module">
${processedScript}
</script>
</body>
</html>`;
}

// ==================== Meta Tag Generation ====================

/**
 * Context for evaluating meta tag expressions
 */
export interface MetaContext {
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}

/**
 * Escapes HTML special characters for safe embedding in meta tags.
 */
function escapeHtmlForMeta(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Evaluates a compiled expression for meta tag values.
 */
export function evaluateMetaExpression(
  expr: CompiledExpression,
  ctx: MetaContext
): string {
  switch (expr.expr) {
    case 'lit':
      return String(expr.value);
    case 'route':
      if (expr.source === 'param') {
        return ctx.params[expr.name] || '';
      } else if (expr.source === 'query') {
        return ctx.query[expr.name] || '';
      } else if (expr.source === 'path') {
        return ctx.path;
      }
      return '';
    case 'bin':
      if (expr.op === '+') {
        return evaluateMetaExpression(expr.left, ctx) + evaluateMetaExpression(expr.right, ctx);
      }
      return '';
    case 'concat':
      return expr.items.map(item => evaluateMetaExpression(item, ctx)).join('');
    default:
      return '';
  }
}

// JSON-LD specific expression types (not part of standard CompiledExpression)
interface JsonLdObjectExpr {
  expr: 'object';
  type?: string;
  properties: Record<string, JsonLdExpression>;
}

interface JsonLdArrayExpr {
  expr: 'array';
  items: JsonLdExpression[];
}

type JsonLdExpression = CompiledExpression | JsonLdObjectExpr | JsonLdArrayExpr;

/**
 * Evaluates a compiled expression for JSON-LD property values.
 * Unlike evaluateMetaExpression, this preserves the original types
 * (number, boolean, null) for proper JSON serialization.
 */
function evaluateJsonLdExpression(
  expr: JsonLdExpression,
  ctx: MetaContext
): unknown {
  switch (expr.expr) {
    case 'lit':
      // Preserve the original type (number, boolean, null, string)
      return expr.value;
    case 'route':
      if (expr.source === 'param') {
        return ctx.params[expr.name] ?? '';
      } else if (expr.source === 'query') {
        return ctx.query[expr.name] ?? '';
      } else if (expr.source === 'path') {
        return ctx.path;
      }
      return '';
    case 'bin':
      if (expr.op === '+') {
        return String(evaluateJsonLdExpression(expr.left, ctx)) +
               String(evaluateJsonLdExpression(expr.right, ctx));
      }
      return '';
    case 'concat':
      return expr.items.map(item => String(evaluateJsonLdExpression(item, ctx))).join('');
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (expr.type) {
        obj['@type'] = expr.type;
      }
      for (const [key, propExpr] of Object.entries(expr.properties)) {
        obj[key] = evaluateJsonLdExpression(propExpr, ctx);
      }
      return obj;
    }
    case 'array':
      // JsonLdArrayExpr has 'items', CompiledArrayExpr has 'elements'
      if ('items' in expr) {
        return (expr as JsonLdArrayExpr).items.map(item => evaluateJsonLdExpression(item, ctx));
      }
      // CompiledArrayExpr - evaluate elements
      return (expr as { elements: JsonLdExpression[] }).elements.map(elem => evaluateJsonLdExpression(elem, ctx));
    default:
      return '';
  }
}

/**
 * Generates HTML meta tags from route definition.
 */
export function generateMetaTags(
  route: CompiledRouteDefinition | undefined,
  ctx: MetaContext
): string {
  if (!route) {
    return '';
  }

  const tags: string[] = [];

  // Generate title tag
  if (route.title) {
    const titleValue = evaluateMetaExpression(route.title, ctx);
    if (titleValue) {
      tags.push(`<title>${escapeHtmlForMeta(titleValue)}</title>`);
    }
  }

  // Generate meta tags
  if (route.meta) {
    for (const [key, expr] of Object.entries(route.meta)) {
      const value = evaluateMetaExpression(expr, ctx);
      if (!value) {
        continue; // Skip empty values
      }
      const escapedValue = escapeHtmlForMeta(value);

      // Use property attribute for og: and twitter: prefixes
      if (key.startsWith('og:') || key.startsWith('twitter:')) {
        tags.push(`<meta property="${key}" content="${escapedValue}">`);
      } else {
        tags.push(`<meta name="${key}" content="${escapedValue}">`);
      }
    }
  }

  // Generate canonical link tag
  if (route.canonical) {
    const canonicalValue = evaluateMetaExpression(route.canonical, ctx);
    if (canonicalValue) {
      tags.push(`<link rel="canonical" href="${escapeHtmlForMeta(canonicalValue)}">`);
    }
  }

  // Generate JSON-LD script tag
  if (route.jsonLd) {
    const jsonLdObject: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': route.jsonLd.type,
    };

    // Evaluate and add all properties (preserving types for JSON-LD)
    for (const [key, expr] of Object.entries(route.jsonLd.properties)) {
      const value = evaluateJsonLdExpression(expr, ctx);
      jsonLdObject[key] = value;
    }

    // Serialize to JSON and escape </script> to prevent XSS
    const jsonString = escapeJsonForScript(JSON.stringify(jsonLdObject));
    tags.push(`<script type="application/ld+json">${jsonString}</script>`);
  }

  return tags.join('\n');
}
