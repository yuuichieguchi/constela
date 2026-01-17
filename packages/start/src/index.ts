// Types
export type {
  ScannedRoute,
  APIContext,
  APIModule,
  MiddlewareContext,
  MiddlewareNext,
  Middleware,
  PageModule,
  PageExportFunction,
  StaticPathEntry,
  StaticPathsResult,
  ConstelaConfig,
  DevServerOptions,
  BuildOptions,
} from './types.js';

// Router
export { scanRoutes, filePathToPattern } from './router/file-router.js';

// Dev server
export { createDevServer } from './dev/server.js';

// Static file utilities
export {
  isPathSafe,
  getMimeType,
  resolveStaticFile,
  type StaticFileResult,
} from './static/index.js';

// Build
export { build } from './build/index.js';
export {
  generateStaticPages,
  type StaticPathsProvider,
  type GenerateStaticPagesOptions,
} from './build/ssg.js';

// API
export { createAPIHandler } from './api/handler.js';

// Middleware
export { createMiddlewareChain } from './middleware/index.js';

// Edge adapter
export { createAdapter } from './edge/adapter.js';

// Page utilities
export { isPageExportFunction, resolvePageExport } from './utils/resolve-page.js';

// Layout utilities
export {
  scanLayouts,
  resolveLayout,
  loadLayout,
  LayoutResolver,
} from './layout/resolver.js';
export type { ScannedLayout, LayoutInfo } from './layout/resolver.js';

// Data loader utilities
export {
  loadGlob,
  loadFile,
  loadApi,
  transformMdx,
  transformYaml,
  transformCsv,
  generateStaticPaths,
  DataLoader,
  loadComponentDefinitions,
  mdxContentToNode,
} from './data/loader.js';
export type { GlobResult, MdxGlobResult, StaticPath } from './data/loader.js';

// MDX transformation
export { mdxToConstela } from './build/mdx.js';
export type { ComponentDef, MDXToConstelaOptions } from './build/mdx.js';

// Config loader
export { loadConfig, resolveConfig } from './config/config-loader.js';
export type { ConstelaConfigFile, CLIOptions } from './config/config-loader.js';

// Terminal utilities
export { hyperlink } from './utils/terminal.js';
