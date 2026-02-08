import { registerPlugin } from '@constela/core';
import type { ConstelaPlugin } from '@constela/core';

/**
 * Dynamically loads and registers plugins from module paths.
 */
export async function loadPlugins(paths: string[]): Promise<void> {
  for (const pluginPath of paths) {
    const module = await import(pluginPath);
    const plugin: ConstelaPlugin = module.default;

    if (!plugin || !plugin.name) {
      throw new Error(`Plugin at '${pluginPath}' must export a default object with a 'name' field`);
    }

    registerPlugin(plugin);
  }
}
