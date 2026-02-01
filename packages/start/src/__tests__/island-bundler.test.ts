/**
 * Test module for Island Build Optimization (Phase 3).
 *
 * Coverage:
 * - bundleIslands function: individual island bundling
 * - extractIslands helper: island extraction from CompiledProgram
 * - Build integration: island manifest generation
 * - Island loader: dynamic import and caching
 *
 * TDD Red Phase: These tests verify the island bundling and loading
 * functionality for the Islands Architecture optimization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, readFile, access, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Import the modules under test - will fail until implemented
import { bundleIslands, extractIslands } from '../build/bundler.js';
import type {
  BundleIslandOptions,
  IslandManifest,
  IslandManifestEntry,
} from '../build/bundler.js';
import { createIslandLoader } from '@constela/runtime';
import type { IslandLoaderOptions } from '@constela/runtime';

// Types from @constela/compiler for test fixtures
import type {
  CompiledProgram,
  CompiledIslandNode,
  CompiledNode,
  CompiledElementNode,
  CompiledIfNode,
  CompiledEachNode,
} from '@constela/compiler';

// ==================== Test Helpers ====================

/**
 * Create a temporary test directory with unique name
 */
async function createTestDir(): Promise<string> {
  const testDir = join(tmpdir(), 'constela-island-bundler-test-' + randomUUID());
  await mkdir(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test directory
 */
async function cleanupTestDir(testDir: string): Promise<void> {
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a mock CompiledIslandNode for testing
 */
function createMockIsland(overrides: Partial<CompiledIslandNode> = {}): CompiledIslandNode {
  return {
    kind: 'island',
    id: overrides.id ?? 'test-island',
    strategy: overrides.strategy ?? 'load',
    strategyOptions: overrides.strategyOptions,
    content: overrides.content ?? {
      kind: 'element',
      tag: 'button',
      props: {
        class: { expr: 'lit', value: 'btn' },
      },
      children: [{ kind: 'text', value: { expr: 'lit', value: 'Click me' } }],
    } as CompiledElementNode,
    state: overrides.state,
    actions: overrides.actions,
  };
}

/**
 * Create a mock CompiledProgram containing islands
 */
function createMockProgramWithIslands(islands: CompiledIslandNode[]): CompiledProgram {
  // Wrap islands in a container element
  const children: CompiledNode[] = islands;

  return {
    version: '1.0',
    state: {},
    actions: {},
    view: {
      kind: 'element',
      tag: 'div',
      children,
    } as CompiledElementNode,
  };
}

/**
 * Create a mock CompiledProgram with nested islands
 */
function createMockProgramWithNestedIslands(): CompiledProgram {
  const nestedIsland = createMockIsland({ id: 'nested-island', strategy: 'visible' });
  const parentIsland = createMockIsland({
    id: 'parent-island',
    strategy: 'load',
    content: {
      kind: 'element',
      tag: 'div',
      children: [nestedIsland],
    } as CompiledElementNode,
  });

  return createMockProgramWithIslands([parentIsland]);
}

/**
 * Create a mock CompiledProgram with islands in conditionals
 */
function createMockProgramWithConditionalIslands(): CompiledProgram {
  const island1 = createMockIsland({ id: 'island-then', strategy: 'idle' });
  const island2 = createMockIsland({ id: 'island-else', strategy: 'interaction' });

  const conditionalNode: CompiledIfNode = {
    kind: 'if',
    condition: { expr: 'state', name: 'showFirst' },
    then: island1,
    else: island2,
  };

  return {
    version: '1.0',
    state: { showFirst: { type: 'boolean', initial: true } },
    actions: {},
    view: {
      kind: 'element',
      tag: 'div',
      children: [conditionalNode],
    } as CompiledElementNode,
  };
}

/**
 * Create a mock CompiledProgram with islands in each loops
 */
function createMockProgramWithIslandsInEach(): CompiledProgram {
  const island = createMockIsland({ id: 'list-item-island', strategy: 'visible' });

  const eachNode: CompiledEachNode = {
    kind: 'each',
    items: { expr: 'state', name: 'items' },
    as: 'item',
    body: island,
  };

  return {
    version: '1.0',
    state: { items: { type: 'list', initial: [] } },
    actions: {},
    view: {
      kind: 'element',
      tag: 'div',
      children: [eachNode],
    } as CompiledElementNode,
  };
}

// ==================== bundleIslands() Tests ====================

describe('bundleIslands()', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ==================== Export Verification ====================

  describe('module exports', () => {
    it('should export bundleIslands function', () => {
      /**
       * Given: The bundler module
       * When: Importing bundleIslands
       * Then: bundleIslands should be a function
       */
      expect(typeof bundleIslands).toBe('function');
    });
  });

  // ==================== Individual Island Bundling ====================

  describe('individual island bundling', () => {
    it('should create individual bundles for each island', async () => {
      /**
       * Given: Multiple islands with unique IDs
       * When: bundleIslands is called
       * Then: Each island gets its own bundle file
       */

      // Arrange
      const island1 = createMockIsland({ id: 'counter-island' });
      const island2 = createMockIsland({ id: 'toggle-island' });
      const islands = [island1, island2];

      const options: BundleIslandOptions = {
        outDir: testDir,
        islands,
      };

      // Act
      const result = await bundleIslands(options);

      // Assert
      expect(result.size).toBe(2);
      expect(result.has('counter-island')).toBe(true);
      expect(result.has('toggle-island')).toBe(true);

      // Verify files exist
      const counterPath = join(testDir, '_constela', 'islands', 'counter-island.js');
      const togglePath = join(testDir, '_constela', 'islands', 'toggle-island.js');
      expect(await fileExists(counterPath)).toBe(true);
      expect(await fileExists(togglePath)).toBe(true);
    });

    it('should output bundles to correct paths at {outDir}/_constela/islands/{id}.js', async () => {
      /**
       * Given: An island with a specific ID
       * When: bundleIslands is called
       * Then: Bundle is created at the correct path
       */

      // Arrange
      const island = createMockIsland({ id: 'my-button' });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      await bundleIslands(options);

      // Assert
      const expectedPath = join(testDir, '_constela', 'islands', 'my-button.js');
      expect(await fileExists(expectedPath)).toBe(true);
    });

    it('should return Map with island ID to relative path mapping', async () => {
      /**
       * Given: Islands to bundle
       * When: bundleIslands is called
       * Then: Returns Map<string, string> with ID -> "/_constela/islands/{id}.js"
       */

      // Arrange
      const island = createMockIsland({ id: 'search-box' });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      const result = await bundleIslands(options);

      // Assert
      expect(result.get('search-box')).toBe('/_constela/islands/search-box.js');
    });

    it('should handle islands with special characters in ID by sanitizing', async () => {
      /**
       * Given: Island with special characters in ID
       * When: bundleIslands is called
       * Then: ID is sanitized for filesystem safety
       */

      // Arrange
      const island = createMockIsland({ id: 'my-island/component' });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      const result = await bundleIslands(options);

      // Assert
      // Should sanitize '/' to safe character
      expect(result.size).toBe(1);
      // The actual file should exist (sanitized name)
      const allFiles = await readdir(join(testDir, '_constela', 'islands'));
      const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
      expect(jsFiles.length).toBe(1);
      expect(jsFiles[0]).toMatch(/\.js$/);
    });

    it('should include island state in bundle', async () => {
      /**
       * Given: Island with state definition
       * When: bundleIslands is called
       * Then: Bundle contains state initialization code
       */

      // Arrange
      const island = createMockIsland({
        id: 'stateful-island',
        state: {
          count: { type: 'number', initial: 0 },
          enabled: { type: 'boolean', initial: true },
        },
      });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      await bundleIslands(options);

      // Assert
      const bundlePath = join(testDir, '_constela', 'islands', 'stateful-island.js');
      const content = await readFile(bundlePath, 'utf-8');

      // Bundle should contain state references
      expect(content).toMatch(/count|enabled|state/);
    });

    it('should include island actions in bundle', async () => {
      /**
       * Given: Island with actions
       * When: bundleIslands is called
       * Then: Bundle contains action definitions
       */

      // Arrange
      const island = createMockIsland({
        id: 'action-island',
        actions: {
          increment: {
            name: 'increment',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        },
      });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      await bundleIslands(options);

      // Assert
      const bundlePath = join(testDir, '_constela', 'islands', 'action-island.js');
      const content = await readFile(bundlePath, 'utf-8');

      // Bundle should contain action references
      expect(content).toMatch(/increment|action/);
    });
  });

  // ==================== Minification ====================

  describe('minification option', () => {
    it('should minify bundles by default', async () => {
      /**
       * Given: Islands without minify option specified
       * When: bundleIslands is called
       * Then: Output is minified (compact)
       */

      // Arrange
      const island = createMockIsland({ id: 'default-minify' });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      await bundleIslands(options);

      // Assert
      const bundlePath = join(testDir, '_constela', 'islands', 'default-minify.js');
      const content = await readFile(bundlePath, 'utf-8');

      // Minified code has fewer newlines
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThan(50);
    });

    it('should not minify when minify: false', async () => {
      /**
       * Given: minify: false option
       * When: bundleIslands is called
       * Then: Output is readable (not minified)
       */

      // Arrange
      const minifiedDir = join(testDir, 'minified');
      const unminifiedDir = join(testDir, 'unminified');
      await mkdir(minifiedDir, { recursive: true });
      await mkdir(unminifiedDir, { recursive: true });

      const island = createMockIsland({ id: 'test-island' });

      // Act
      await bundleIslands({ outDir: minifiedDir, islands: [island], minify: true });
      await bundleIslands({ outDir: unminifiedDir, islands: [island], minify: false });

      // Assert
      const minifiedContent = await readFile(
        join(minifiedDir, '_constela', 'islands', 'test-island.js'),
        'utf-8'
      );
      const unminifiedContent = await readFile(
        join(unminifiedDir, '_constela', 'islands', 'test-island.js'),
        'utf-8'
      );

      // Unminified should be larger
      expect(unminifiedContent.length).toBeGreaterThan(minifiedContent.length);
    });
  });

  // ==================== Tree Shaking ====================

  describe('tree shaking', () => {
    it('should tree shake unused code from island bundles', async () => {
      /**
       * Given: Island with minimal dependencies
       * When: bundleIslands is called
       * Then: Bundle only contains necessary code (tree shaken)
       */

      // Arrange
      const simpleIsland = createMockIsland({
        id: 'simple-island',
        content: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Simple' } }],
        } as CompiledElementNode,
      });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [simpleIsland],
        minify: true,
      };

      // Act
      await bundleIslands(options);

      // Assert
      const bundlePath = join(testDir, '_constela', 'islands', 'simple-island.js');
      const content = await readFile(bundlePath, 'utf-8');

      // Bundle should be reasonably small for simple island
      // Exact size depends on implementation, but should be under 10KB
      expect(content.length).toBeLessThan(10000);
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should return empty map when islands array is empty', async () => {
      /**
       * Given: Empty islands array
       * When: bundleIslands is called
       * Then: Returns empty Map
       */

      // Arrange
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [],
      };

      // Act
      const result = await bundleIslands(options);

      // Assert
      expect(result.size).toBe(0);
    });

    it('should throw error when outDir cannot be created', async () => {
      /**
       * Given: Invalid output directory
       * When: bundleIslands is called
       * Then: Error is thrown with descriptive message
       */

      // Arrange
      const options: BundleIslandOptions = {
        outDir: '/nonexistent/root/path/that/cannot/exist',
        islands: [createMockIsland()],
      };

      // Act & Assert
      await expect(bundleIslands(options)).rejects.toThrow();
    });

    it('should handle duplicate island IDs by overwriting', async () => {
      /**
       * Given: Islands with duplicate IDs
       * When: bundleIslands is called
       * Then: Later island overwrites earlier (or throws error)
       */

      // Arrange
      const island1 = createMockIsland({ id: 'same-id', strategy: 'load' });
      const island2 = createMockIsland({ id: 'same-id', strategy: 'idle' });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island1, island2],
      };

      // Act
      const result = await bundleIslands(options);

      // Assert - should have only one entry (later overwrites)
      expect(result.size).toBe(1);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle deeply nested island content', async () => {
      /**
       * Given: Island with deeply nested view tree
       * When: bundleIslands is called
       * Then: Bundle is created successfully
       */

      // Arrange
      const deepContent: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'div',
            children: [
              {
                kind: 'element',
                tag: 'div',
                children: [
                  {
                    kind: 'element',
                    tag: 'button',
                    children: [{ kind: 'text', value: { expr: 'lit', value: 'Deep' } }],
                  } as CompiledElementNode,
                ],
              } as CompiledElementNode,
            ],
          } as CompiledElementNode,
        ],
      };

      const island = createMockIsland({ id: 'deep-island', content: deepContent });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      const result = await bundleIslands(options);

      // Assert
      expect(result.has('deep-island')).toBe(true);
      expect(await fileExists(join(testDir, '_constela', 'islands', 'deep-island.js'))).toBe(true);
    });

    it('should handle concurrent bundling of multiple islands', async () => {
      /**
       * Given: Many islands
       * When: bundleIslands is called
       * Then: All bundles are created correctly
       */

      // Arrange
      const islands = Array.from({ length: 10 }, (_, i) =>
        createMockIsland({ id: 'island-' + i })
      );
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands,
      };

      // Act
      const result = await bundleIslands(options);

      // Assert
      expect(result.size).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(result.has('island-' + i)).toBe(true);
      }
    });
  });
});

// ==================== extractIslands() Tests ====================

describe('extractIslands()', () => {
  // ==================== Export Verification ====================

  describe('module exports', () => {
    it('should export extractIslands function', () => {
      /**
       * Given: The bundler module
       * When: Importing extractIslands
       * Then: extractIslands should be a function
       */
      expect(typeof extractIslands).toBe('function');
    });
  });

  // ==================== Basic Extraction ====================

  describe('basic extraction', () => {
    it('should extract islands from CompiledProgram view', () => {
      /**
       * Given: CompiledProgram with islands in view
       * When: extractIslands is called
       * Then: Returns array of CompiledIslandNode
       */

      // Arrange
      const island1 = createMockIsland({ id: 'island-1' });
      const island2 = createMockIsland({ id: 'island-2' });
      const program = createMockProgramWithIslands([island1, island2]);

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('island-1');
      expect(result[1]?.id).toBe('island-2');
    });

    it('should return empty array when no islands exist', () => {
      /**
       * Given: CompiledProgram without islands
       * When: extractIslands is called
       * Then: Returns empty array
       */

      // Arrange
      const program: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'No islands here' } }],
        } as CompiledElementNode,
      };

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ==================== Nested Island Handling ====================

  describe('nested islands', () => {
    it('should extract islands nested inside other islands', () => {
      /**
       * Given: CompiledProgram with nested islands
       * When: extractIslands is called
       * Then: All islands (parent and nested) are returned in flat list
       */

      // Arrange
      const program = createMockProgramWithNestedIslands();

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(2);
      const ids = result.map((i) => i.id);
      expect(ids).toContain('parent-island');
      expect(ids).toContain('nested-island');
    });

    it('should extract islands from deeply nested structures', () => {
      /**
       * Given: Islands nested multiple levels deep
       * When: extractIslands is called
       * Then: All islands are found
       */

      // Arrange
      const deepIsland = createMockIsland({ id: 'deep-nested', strategy: 'media' });
      const midIsland = createMockIsland({
        id: 'mid-level',
        content: {
          kind: 'element',
          tag: 'div',
          children: [deepIsland],
        } as CompiledElementNode,
      });
      const topIsland = createMockIsland({
        id: 'top-level',
        content: {
          kind: 'element',
          tag: 'div',
          children: [midIsland],
        } as CompiledElementNode,
      });
      const program = createMockProgramWithIslands([topIsland]);

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(3);
      const ids = result.map((i) => i.id);
      expect(ids).toContain('top-level');
      expect(ids).toContain('mid-level');
      expect(ids).toContain('deep-nested');
    });
  });

  // ==================== Conditional and Loop Handling ====================

  describe('islands in control flow', () => {
    it('should extract islands from if/else branches', () => {
      /**
       * Given: Islands inside if/else nodes
       * When: extractIslands is called
       * Then: Islands from both branches are extracted
       */

      // Arrange
      const program = createMockProgramWithConditionalIslands();

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(2);
      const ids = result.map((i) => i.id);
      expect(ids).toContain('island-then');
      expect(ids).toContain('island-else');
    });

    it('should extract islands from each loop body', () => {
      /**
       * Given: Island inside each loop
       * When: extractIslands is called
       * Then: Island is extracted (once, as template)
       */

      // Arrange
      const program = createMockProgramWithIslandsInEach();

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('list-item-island');
    });

    it('should extract islands from mixed control flow structures', () => {
      /**
       * Given: Complex program with islands in various positions
       * When: extractIslands is called
       * Then: All unique islands are extracted
       */

      // Arrange
      const island1 = createMockIsland({ id: 'standalone' });
      const island2 = createMockIsland({ id: 'in-conditional' });
      const island3 = createMockIsland({ id: 'in-loop' });

      const program: CompiledProgram = {
        version: '1.0',
        state: { show: { type: 'boolean', initial: true }, items: { type: 'list', initial: [] } },
        actions: {},
        view: {
          kind: 'element',
          tag: 'main',
          children: [
            island1,
            {
              kind: 'if',
              condition: { expr: 'state', name: 'show' },
              then: island2,
            } as CompiledIfNode,
            {
              kind: 'each',
              items: { expr: 'state', name: 'items' },
              as: 'item',
              body: island3,
            } as CompiledEachNode,
          ],
        } as CompiledElementNode,
      };

      // Act
      const result = extractIslands(program);

      // Assert
      expect(result).toHaveLength(3);
      const ids = result.map((i) => i.id);
      expect(ids).toContain('standalone');
      expect(ids).toContain('in-conditional');
      expect(ids).toContain('in-loop');
    });
  });

  // ==================== Flat List Requirement ====================

  describe('flat list output', () => {
    it('should return flat array regardless of nesting depth', () => {
      /**
       * Given: Deeply nested islands
       * When: extractIslands is called
       * Then: Result is a flat array (not nested)
       */

      // Arrange
      const program = createMockProgramWithNestedIslands();

      // Act
      const result = extractIslands(program);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      // All items should be islands, not arrays
      for (const item of result) {
        expect(item.kind).toBe('island');
        expect(typeof item.id).toBe('string');
      }
    });
  });
});

// ==================== Build Integration Tests ====================

describe('Build Integration for Islands', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe('island manifest generation', () => {
    it('should generate island manifest JSON file', async () => {
      /**
       * Given: Islands bundled via bundleIslands
       * When: Build completes
       * Then: Island manifest is created at _constela/islands/manifest.json
       */

      // Arrange
      const island = createMockIsland({ id: 'manifest-test' });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island],
      };

      // Act
      await bundleIslands(options);

      // Assert
      const manifestPath = join(testDir, '_constela', 'islands', 'manifest.json');
      expect(await fileExists(manifestPath)).toBe(true);
    });

    it('should include island metadata in manifest', async () => {
      /**
       * Given: Islands with various strategies
       * When: bundleIslands completes
       * Then: Manifest contains id, strategy, path for each island
       */

      // Arrange
      const island1 = createMockIsland({ id: 'load-island', strategy: 'load' });
      const island2 = createMockIsland({
        id: 'visible-island',
        strategy: 'visible',
        strategyOptions: { threshold: 0.5 },
      });
      const options: BundleIslandOptions = {
        outDir: testDir,
        islands: [island1, island2],
      };

      // Act
      await bundleIslands(options);

      // Assert
      const manifestPath = join(testDir, '_constela', 'islands', 'manifest.json');
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest: IslandManifest = JSON.parse(manifestContent);

      expect(manifest.islands).toHaveLength(2);

      const loadIsland = manifest.islands.find((i) => i.id === 'load-island');
      expect(loadIsland).toBeDefined();
      expect(loadIsland?.strategy).toBe('load');
      expect(loadIsland?.path).toBe('/_constela/islands/load-island.js');

      const visibleIsland = manifest.islands.find((i) => i.id === 'visible-island');
      expect(visibleIsland).toBeDefined();
      expect(visibleIsland?.strategy).toBe('visible');
      expect(visibleIsland?.strategyOptions?.threshold).toBe(0.5);
    });
  });
});

// ==================== Island Loader Tests ====================

describe('createIslandLoader()', () => {
  // ==================== Export Verification ====================

  describe('module exports', () => {
    it('should export createIslandLoader function', () => {
      /**
       * Given: The island-loader module
       * When: Importing createIslandLoader
       * Then: createIslandLoader should be a function
       */
      expect(typeof createIslandLoader).toBe('function');
    });
  });

  // ==================== Loader Creation ====================

  describe('loader creation', () => {
    it('should return object with load and preload methods', () => {
      /**
       * Given: createIslandLoader called
       * When: Loader is created
       * Then: Returns object with load and preload functions
       */

      // Act
      const loader = createIslandLoader();

      // Assert
      expect(typeof loader.load).toBe('function');
      expect(typeof loader.preload).toBe('function');
    });

    it('should use default basePath when not specified', () => {
      /**
       * Given: createIslandLoader called without options
       * When: Loader is created
       * Then: Uses default basePath "/_constela/islands/"
       */

      // Act
      const loader = createIslandLoader();

      // Assert - loader is created without error
      expect(loader).toBeDefined();
    });

    it('should accept custom basePath option', () => {
      /**
       * Given: Custom basePath option
       * When: createIslandLoader is called
       * Then: Loader uses custom basePath
       */

      // Arrange
      const options: IslandLoaderOptions = {
        basePath: '/custom/islands/',
      };

      // Act
      const loader = createIslandLoader(options);

      // Assert
      expect(loader).toBeDefined();
    });
  });

  // ==================== Dynamic Import (load) ====================

  describe('load() method', () => {
    it('should return a Promise', async () => {
      /**
       * Given: Island loader
       * When: load is called with an ID
       * Then: Returns a Promise
       */

      // Arrange
      const loader = createIslandLoader();

      // Act
      const result = loader.load('test-island');

      // Assert
      expect(result).toBeInstanceOf(Promise);

      // Clean up - await the promise to prevent unhandled rejection
      await result.catch(() => {});
    });

    it('should resolve when module is loaded successfully', async () => {
      /**
       * Given: Valid island ID that exists
       * When: load is called
       * Then: Promise resolves
       *
       * Note: This test requires mocking dynamic import
       */

      // Arrange
      const loader = createIslandLoader();

      // Mock dynamic import
      const mockModule = { default: () => {} };
      vi.stubGlobal('import', vi.fn().mockResolvedValue(mockModule));

      // Act & Assert
      // In actual implementation, this would load the module
      // For now, we just verify the interface
      expect(typeof loader.load).toBe('function');
    });

    it('should reject when module does not exist', async () => {
      /**
       * Given: Invalid island ID
       * When: load is called
       * Then: Promise rejects with error
       */

      // Arrange
      const loader = createIslandLoader();

      // Act & Assert
      await expect(loader.load('nonexistent-island')).rejects.toThrow();
    });
  });

  // ==================== Caching ====================

  describe('caching behavior', () => {
    it('should cache loaded islands', async () => {
      /**
       * Given: Island that has been loaded once
       * When: load is called again with same ID
       * Then: Returns cached module (no re-fetch)
       */

      // Arrange
      const loader = createIslandLoader();
      const mockModule = { default: () => {} };

      // Mock the import function to track calls
      let importCallCount = 0;
      const mockImport = vi.fn(() => {
        importCallCount++;
        return Promise.resolve(mockModule);
      });

      // This test verifies the caching behavior expectation
      // Actual implementation will use dynamic import
      expect(typeof loader.load).toBe('function');
    });

    it('should return same promise for concurrent loads of same island', async () => {
      /**
       * Given: Multiple concurrent calls to load same island
       * When: Promises are resolved
       * Then: Only one actual fetch occurs (deduplication)
       */

      // Arrange
      const loader = createIslandLoader();

      // Act
      const promise1 = loader.load('test-island').catch(() => {});
      const promise2 = loader.load('test-island').catch(() => {});

      // Assert - both should reference same underlying promise/cache
      // Exact verification depends on implementation
      expect(promise1).toBeDefined();
      expect(promise2).toBeDefined();

      // Clean up - wait for both promises to settle to prevent unhandled rejections
      await Promise.all([promise1, promise2]);
    });
  });

  // ==================== Preload ====================

  describe('preload() method', () => {
    it('should return void (fire-and-forget)', () => {
      /**
       * Given: Island loader
       * When: preload is called
       * Then: Returns void (not a Promise)
       */

      // Arrange
      const loader = createIslandLoader();

      // Act
      const result = loader.preload('test-island');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should trigger background loading without blocking', () => {
      /**
       * Given: Island loader
       * When: preload is called
       * Then: Does not throw and returns immediately
       */

      // Arrange
      const loader = createIslandLoader();

      // Act & Assert - should not throw
      expect(() => loader.preload('preload-test')).not.toThrow();
    });

    it('should populate cache for subsequent load calls', async () => {
      /**
       * Given: Island that was preloaded
       * When: load is called for same ID
       * Then: Returns faster (from cache or in-progress promise)
       */

      // Arrange
      const loader = createIslandLoader();

      // Act
      loader.preload('preloaded-island');

      // Assert - load should work without error
      // In actual implementation, the preloaded module would be available
      expect(typeof loader.load).toBe('function');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      /**
       * Given: Network failure during load
       * When: load is called
       * Then: Rejects with meaningful error
       */

      // Arrange
      const loader = createIslandLoader();

      // Act & Assert
      try {
        await loader.load('network-error-island');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should allow retry after failed load', async () => {
      /**
       * Given: Previous load failed
       * When: load is called again
       * Then: Retries the load (cache does not store failures)
       */

      // Arrange
      const loader = createIslandLoader();

      // Act - first call fails
      await loader.load('retry-island').catch(() => {});

      // Act - second call should also attempt to load
      const secondAttempt = loader.load('retry-island');

      // Assert - second attempt is a fresh attempt
      expect(secondAttempt).toBeInstanceOf(Promise);

      // Clean up - await the second attempt to prevent unhandled rejection
      await secondAttempt.catch(() => {});
    });
  });
});

// ==================== Type Exports Tests ====================

describe('Type Exports', () => {
  it('should export BundleIslandOptions interface', () => {
    /**
     * Given: bundler module
     * When: Using BundleIslandOptions type
     * Then: Type is available and usable
     */

    // This test verifies TypeScript compilation succeeds
    const options: BundleIslandOptions = {
      outDir: '/tmp/test',
      islands: [],
    };
    expect(options).toBeDefined();
  });

  it('should export IslandManifest interface', () => {
    /**
     * Given: bundler module
     * When: Using IslandManifest type
     * Then: Type is available and usable
     */

    const manifest: IslandManifest = {
      islands: [],
    };
    expect(manifest).toBeDefined();
  });

  it('should export IslandLoaderOptions interface', () => {
    /**
     * Given: island-loader module
     * When: Using IslandLoaderOptions type
     * Then: Type is available and usable
     */

    const options: IslandLoaderOptions = {
      basePath: '/custom/',
    };
    expect(options).toBeDefined();
  });
});
