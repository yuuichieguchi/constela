/**
 * Plugin System for Constela
 *
 * Allows external packages to register global helper functions
 * callable via { "expr": "call", "target": null, "method": "myFunc" }.
 */

import { registerGlobalFunction, unregisterGlobalFunction } from '../helpers/global-functions.js';

export interface ConstelaPlugin {
  readonly name: string;
  readonly globalFunctions?: Record<string, (...args: unknown[]) => unknown>;
}

const registeredPlugins: ConstelaPlugin[] = [];

export function registerPlugin(plugin: ConstelaPlugin): void {
  // Check for duplicate name
  if (registeredPlugins.some(p => p.name === plugin.name)) {
    throw new Error(`Plugin '${plugin.name}' is already registered`);
  }

  // Register global functions first (may throw on collision)
  // If registration fails, plugin is NOT added to the list
  if (plugin.globalFunctions) {
    const registeredNames: string[] = [];
    try {
      for (const [name, fn] of Object.entries(plugin.globalFunctions)) {
        registerGlobalFunction(name, fn);
        registeredNames.push(name);
      }
    } catch (error) {
      // Rollback already-registered functions
      for (const name of registeredNames) {
        unregisterGlobalFunction(name);
      }
      throw error;
    }
  }

  registeredPlugins.push(plugin);
}

export function getRegisteredPlugins(): readonly ConstelaPlugin[] {
  return [...registeredPlugins];
}

export function clearPlugins(): void {
  // Unregister all plugin global functions
  for (const plugin of registeredPlugins) {
    if (plugin.globalFunctions) {
      for (const name of Object.keys(plugin.globalFunctions)) {
        unregisterGlobalFunction(name);
      }
    }
  }
  registeredPlugins.length = 0;
}
