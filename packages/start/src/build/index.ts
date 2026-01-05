import type { BuildOptions } from '../types.js';
import { scanRoutes } from '../router/file-router.js';

export interface BuildResult {
  outDir: string;
  routes: string[];
}

/**
 * Build application for production
 *
 * @param options - Build options
 * @returns BuildResult with outDir and discovered routes
 */
export async function build(options?: BuildOptions): Promise<BuildResult> {
  const outDir = options?.outDir ?? 'dist';
  const routesDir = options?.routesDir ?? 'src/routes';
  // target is accepted but not used in current implementation
  // const target = options?.target ?? 'node';

  let routes: string[] = [];

  try {
    const scannedRoutes = await scanRoutes(routesDir);
    routes = scannedRoutes.map((r) => r.pattern);
  } catch {
    // If routesDir does not exist, return empty routes array
  }

  return {
    outDir,
    routes,
  };
}
