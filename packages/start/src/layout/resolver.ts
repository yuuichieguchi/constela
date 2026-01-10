/**
 * Layout Resolver - Scans and resolves layout files for Constela Start
 *
 * This module provides functionality to:
 * - Scan layout directories for layout files
 * - Resolve layout by name
 * - Load and validate layout programs
 * - Compose layouts with page content
 */

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import fg from 'fast-glob';
import type { LayoutProgram, Program } from '@constela/core';
import { isLayoutProgram } from '@constela/core';
import { resolveImports } from '../utils/import-resolver.js';

// ==================== Types ====================

export interface ScannedLayout {
  name: string;
  file: string;
}

export interface LayoutInfo {
  name: string;
  file: string;
  program?: LayoutProgram;
}

// ==================== Layout Scanning ====================

/**
 * Scans a directory for layout files
 *
 * @param layoutsDir - Directory to scan for layouts
 * @returns Array of scanned layouts with name and file path
 * @throws Error if directory doesn't exist or is not a directory
 */
export async function scanLayouts(layoutsDir: string): Promise<ScannedLayout[]> {
  // Validate directory exists
  if (!existsSync(layoutsDir)) {
    throw new Error(`Layouts directory does not exist: ${layoutsDir}`);
  }

  // Validate it's a directory
  const stat = statSync(layoutsDir);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${layoutsDir}`);
  }

  // Find all TypeScript/TSX/JSON files
  const files = await fg(['**/*.ts', '**/*.tsx', '**/*.json'], {
    cwd: layoutsDir,
    ignore: ['**/_*', '**/*.d.ts'],
  });

  // Convert to ScannedLayout, filtering out ignored files
  // (filtering here ensures consistency even if glob doesn't filter)
  const layouts: ScannedLayout[] = files
    .filter(file => {
      const name = basename(file);
      // Ignore files starting with underscore
      if (name.startsWith('_')) return false;
      // Ignore type definition files
      if (name.endsWith('.d.ts')) return false;
      // Only include .ts, .tsx, and .json files
      if (!name.endsWith('.ts') && !name.endsWith('.tsx') && !name.endsWith('.json')) return false;
      return true;
    })
    .map(file => {
      // Extract name from filename (without extension)
      const name = basename(file).replace(/\.(tsx?|json)$/, '');
      return {
        name,
        file: join(layoutsDir, file),
      };
    });

  return layouts;
}

// ==================== Layout Resolution ====================

/**
 * Resolves a layout by name from scanned layouts
 *
 * @param layoutName - Name of the layout to resolve
 * @param layouts - Array of scanned layouts
 * @returns The matching layout or undefined
 */
export function resolveLayout(
  layoutName: string,
  layouts: ScannedLayout[]
): ScannedLayout | undefined {
  return layouts.find(l => l.name === layoutName);
}

// ==================== Layout Loading ====================

/**
 * Loads and validates a layout file
 *
 * @param layoutFile - Path to the layout file
 * @returns The loaded LayoutProgram
 * @throws Error if file cannot be loaded or is not a valid layout
 */
export async function loadLayout(layoutFile: string): Promise<LayoutProgram> {
  try {
    let exported: unknown;

    // Handle JSON files differently from TypeScript files
    if (layoutFile.endsWith('.json')) {
      // Read and parse JSON file
      const content = readFileSync(layoutFile, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, unknown>;

      // Resolve imports if defined
      const importsValue = parsed['imports'];
      if (
        importsValue &&
        typeof importsValue === 'object' &&
        Object.keys(importsValue as Record<string, unknown>).length > 0
      ) {
        const layoutDir = dirname(layoutFile);
        const resolvedImports = await resolveImports(
          layoutDir,
          importsValue as Record<string, string>
        );
        exported = { ...parsed, importData: resolvedImports };
      } else {
        exported = parsed;
      }
    } else {
      // Dynamic import for TypeScript files
      const module = await import(layoutFile);
      exported = module.default || module;
    }

    // Validate it's a layout program
    if (!isLayoutProgram(exported)) {
      throw new Error(`File is not a valid layout: ${layoutFile}`);
    }

    return exported;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not a valid layout')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      throw error;
    }
    throw new Error(`Failed to load layout: ${layoutFile}`);
  }
}

// ==================== LayoutResolver Class ====================

/**
 * LayoutResolver - Manages layout scanning, resolution, and composition
 */
export class LayoutResolver {
  private layoutsDir: string;
  private layouts: ScannedLayout[] = [];
  private loadedLayouts: Map<string, LayoutProgram> = new Map();
  private initialized = false;

  constructor(layoutsDir: string) {
    this.layoutsDir = layoutsDir;
  }

  /**
   * Initialize the resolver by scanning the layouts directory
   */
  async initialize(): Promise<void> {
    try {
      this.layouts = await scanLayouts(this.layoutsDir);
      this.initialized = true;
    } catch {
      // If layouts directory doesn't exist, that's okay - just use empty layouts
      this.layouts = [];
      this.initialized = true;
    }
  }

  /**
   * Check if a layout exists
   */
  hasLayout(name: string): boolean {
    return this.layouts.some(l => l.name === name);
  }

  /**
   * Get a layout by name
   *
   * @param name - Layout name
   * @returns The layout program or undefined if not found
   */
  async getLayout(name: string): Promise<LayoutProgram | undefined> {
    // Check cache first
    const cached = this.loadedLayouts.get(name);
    if (cached) {
      return cached;
    }

    // Find layout
    const scanned = resolveLayout(name, this.layouts);
    if (!scanned) {
      return undefined;
    }

    // Load and cache
    const layout = await loadLayout(scanned.file);
    this.loadedLayouts.set(name, layout);
    return layout;
  }

  /**
   * Compose a page with its layout
   *
   * @param page - Page program to compose
   * @returns Composed program (or original if no layout)
   * @throws Error if specified layout is not found
   */
  async composeWithLayout(page: Program): Promise<Program> {
    const layoutName = page.route?.layout;

    // If no layout specified, return page as-is
    if (!layoutName) {
      return page;
    }

    // Check if layout exists
    if (!this.hasLayout(layoutName)) {
      const available = this.layouts.map(l => l.name).join(', ');
      throw new Error(
        `Layout '${layoutName}' not found. Available layouts: ${available || 'none'}`
      );
    }

    // Get layout
    const layout = await this.getLayout(layoutName);
    if (!layout) {
      throw new Error(`Layout '${layoutName}' not found`);
    }

    // For now, return the page as-is
    // Full composition will be handled by the compiler's composeLayoutWithPage
    return page;
  }

  /**
   * Get all scanned layouts
   */
  getAll(): ScannedLayout[] {
    return [...this.layouts];
  }
}
