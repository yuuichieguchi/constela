import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveJsonRefs } from '../data/loader.js';

/**
 * Resolve imports from external JSON files
 * @param pageDir - The directory containing the page file (imports are relative to this)
 * @param imports - Map of import names to relative paths
 * @param projectRoot - Optional project root directory for path traversal validation
 */
export async function resolveImports(
  pageDir: string,
  imports?: Record<string, string>,
  projectRoot?: string
): Promise<Record<string, unknown>> {
  if (!imports || Object.keys(imports).length === 0) {
    return {};
  }

  const resolved: Record<string, unknown> = {};

  // Path traversal protection: resolve projectRoot once (if provided)
  const resolvedRoot = projectRoot ? resolve(projectRoot) : null;

  for (const [name, importPath] of Object.entries(imports)) {
    const fullPath = join(pageDir, importPath);

    // Path traversal protection: ensure resolved path is within projectRoot (if provided)
    if (resolvedRoot) {
      const resolvedPath = resolve(fullPath);
      if (!resolvedPath.startsWith(resolvedRoot + '/') && resolvedPath !== resolvedRoot) {
        throw new Error(`Invalid import path "${name}": path traversal detected`);
      }
    }

    if (!existsSync(fullPath)) {
      throw new Error(`Import "${name}" not found: ${fullPath}`);
    }

    let content: string;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read import "${name}": ${fullPath}`);
    }

    try {
      const parsed = JSON.parse(content);
      // Resolve $ref references in imported JSON
      resolved[name] = resolveJsonRefs(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in import "${name}": ${fullPath}`);
      }
      throw error;
    }
  }

  return resolved;
}
