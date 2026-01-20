import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_FILENAME = 'constela.config.json';

export interface ConstelaConfigFile {
  css?: string | string[];
  cssContent?: string[];
  layoutsDir?: string;
  routesDir?: string;
  publicDir?: string;
  build?: {
    outDir?: string;
  };
  dev?: {
    port?: number;
    host?: string;
  };
  /** SEO settings */
  seo?: {
    /** HTML lang attribute (e.g., 'ja', 'en', 'zh-CN') */
    lang?: string;
  };
}

export interface CLIOptions {
  css?: string | undefined;
  cssContent?: string | undefined;
  layoutsDir?: string | undefined;
  routesDir?: string | undefined;
  publicDir?: string | undefined;
  outDir?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
}

/**
 * Load config from constela.config.json in project root
 */
export async function loadConfig(projectRoot: string): Promise<ConstelaConfigFile> {
  const configPath = join(projectRoot, CONFIG_FILENAME);
  
  if (!existsSync(configPath)) {
    return {};
  }
  
  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read config file: ${configPath}`);
  }
  
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in config file: ${configPath}`);
  }
}

/**
 * Merge file config with CLI options (CLI takes precedence)
 */
export async function resolveConfig(
  fileConfig: ConstelaConfigFile,
  cliOptions?: CLIOptions
): Promise<ConstelaConfigFile> {
  if (!cliOptions) {
    return { ...fileConfig };
  }
  
  const result: ConstelaConfigFile = { ...fileConfig };
  
  // Merge top-level options (CLI takes precedence for defined values)
  if (cliOptions.css !== undefined) result.css = cliOptions.css;
  if (cliOptions.cssContent !== undefined) {
    // Convert comma-separated string to array, trim whitespace, and filter empty strings
    result.cssContent = cliOptions.cssContent
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (cliOptions.layoutsDir !== undefined) result.layoutsDir = cliOptions.layoutsDir;
  if (cliOptions.routesDir !== undefined) result.routesDir = cliOptions.routesDir;
  if (cliOptions.publicDir !== undefined) result.publicDir = cliOptions.publicDir;
  
  // Merge build options
  if (cliOptions.outDir !== undefined) {
    result.build = { ...result.build, outDir: cliOptions.outDir };
  }
  
  // Merge dev options
  if (cliOptions.port !== undefined || cliOptions.host !== undefined) {
    result.dev = { ...result.dev };
    if (cliOptions.port !== undefined) result.dev.port = cliOptions.port;
    if (cliOptions.host !== undefined) result.dev.host = cliOptions.host;
  }
  
  return result;
}
