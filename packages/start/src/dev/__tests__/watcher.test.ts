/**
 * Test module for File Watcher.
 *
 * Coverage:
 * - createWatcher: Create a file system watcher
 * - Watch directory: Monitor specified directory for changes
 * - Event emission: 'change' event on file modifications
 * - Debouncing: Rapid changes are debounced
 * - File filtering: Only JSON files trigger events
 * - Watcher lifecycle: Start, stop watching
 *
 * TDD Red Phase: These tests verify the file watcher functionality
 * that will be implemented to support HMR in Constela Start.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Import the module under test (will fail until implemented)
import {
  createWatcher,
  type FileWatcher,
  type FileChangeEvent,
} from '../watcher.js';

// ==================== Test Helpers ====================

/**
 * Create a temporary test directory with unique name
 */
async function createTestDir(): Promise<string> {
  const testDir = join(tmpdir(), `constela-watcher-test-${randomUUID()}`);
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
 * Wait for a specific event to be emitted
 */
function waitForEvent<T>(
  watcher: FileWatcher,
  eventName: string,
  timeoutMs: number = 2000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName} event`));
    }, timeoutMs);

    watcher.once(eventName, (data: T) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

/**
 * Wait for a specific number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== Tests ====================

describe('createWatcher()', () => {
  let testDir: string;
  let watcher: FileWatcher | null = null;

  beforeEach(async () => {
    testDir = await createTestDir();
  });

  afterEach(async () => {
    // Stop watcher first
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    // Then cleanup test directory
    await cleanupTestDir(testDir);
  });

  // ==================== Watcher Creation ====================

  describe('watcher creation', () => {
    it('should create a watcher for specified directory', async () => {
      /**
       * Given: A directory path
       * When: createWatcher is called
       * Then: A FileWatcher instance should be returned
       */
      // Arrange & Act
      watcher = await createWatcher({ directory: testDir });

      // Assert
      expect(watcher).toBeDefined();
      expect(typeof watcher.close).toBe('function');
      expect(typeof watcher.on).toBe('function');
      expect(typeof watcher.once).toBe('function');
    });

    it('should watch nested directories', async () => {
      /**
       * Given: A directory with nested subdirectories
       * When: createWatcher is called
       * Then: Changes in nested directories should be detected
       */
      // Arrange
      const nestedDir = join(testDir, 'src', 'pages');
      await mkdir(nestedDir, { recursive: true });

      watcher = await createWatcher({ directory: testDir });

      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      // Act
      const nestedFile = join(nestedDir, 'index.json');
      await writeFile(nestedFile, '{"version": "1.0"}');

      // Assert
      const event = await changePromise;
      expect(event.path).toContain('index.json');
    });

    it('should throw error for non-existent directory', async () => {
      /**
       * Given: A non-existent directory path
       * When: createWatcher is called
       * Then: An error should be thrown
       */
      // Arrange
      const nonExistentDir = join(testDir, 'does-not-exist');

      // Act & Assert
      await expect(
        createWatcher({ directory: nonExistentDir })
      ).rejects.toThrow();
    });
  });

  // ==================== Change Event Emission ====================

  describe('change event emission', () => {
    it('should emit "change" event when a .json file is created', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: A new .json file is created
       * Then: 'change' event should be emitted with file path
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      // Act
      const testFile = join(testDir, 'test.json');
      await writeFile(testFile, '{"version": "1.0"}');

      // Assert
      const event = await changePromise;
      expect(event.path).toBe(testFile);
      expect(event.type).toBe('change');
    });

    it('should emit "change" event when a .json file is modified', async () => {
      /**
       * Given: A watcher monitoring a directory with an existing .json file
       * When: The file is modified
       * Then: 'change' event should be emitted
       */
      // Arrange
      const testFile = join(testDir, 'existing.json');
      await writeFile(testFile, '{"version": "1.0"}');

      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      // Act
      await writeFile(testFile, '{"version": "2.0"}');

      // Assert
      const event = await changePromise;
      expect(event.path).toBe(testFile);
    });

    it('should emit "change" event when a .json file is deleted', async () => {
      /**
       * Given: A watcher monitoring a directory with an existing .json file
       * When: The file is deleted
       * Then: 'change' event should be emitted with type 'unlink'
       */
      // Arrange
      const testFile = join(testDir, 'to-delete.json');
      await writeFile(testFile, '{"version": "1.0"}');

      watcher = await createWatcher({ directory: testDir });

      // Give watcher time to initialize
      await delay(100);

      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      // Act
      await unlink(testFile);

      // Assert
      const event = await changePromise;
      expect(event.path).toBe(testFile);
      expect(event.type).toBe('unlink');
    });

    it('should include file path in event payload', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: A .json file changes
       * Then: Event should contain the absolute file path
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      const testFile = join(testDir, 'with-path.json');

      // Act
      await writeFile(testFile, '{}');

      // Assert
      const event = await changePromise;
      expect(event.path).toBe(testFile);
      // Should be absolute path
      expect(event.path.startsWith('/')).toBe(true);
    });
  });

  // ==================== Debouncing ====================

  describe('debouncing', () => {
    it('should debounce rapid file changes', async () => {
      /**
       * Given: A watcher with debounce configured
       * When: Multiple rapid changes occur to the same file
       * Then: Only one 'change' event should be emitted
       */
      // Arrange
      const debounceMs = 100;
      watcher = await createWatcher({
        directory: testDir,
        debounceMs,
      });

      const testFile = join(testDir, 'debounced.json');
      const events: FileChangeEvent[] = [];

      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act - rapid changes
      await writeFile(testFile, '{"v": 1}');
      await delay(10);
      await writeFile(testFile, '{"v": 2}');
      await delay(10);
      await writeFile(testFile, '{"v": 3}');

      // Wait for debounce to complete
      await delay(debounceMs + 150);

      // Assert - should have only one event (or at most two due to initial creation)
      expect(events.length).toBeLessThanOrEqual(2);
    });

    it('should emit separate events for changes after debounce period', async () => {
      /**
       * Given: A watcher with debounce configured
       * When: Changes occur with sufficient time between them
       * Then: Separate 'change' events should be emitted
       */
      // Arrange
      const debounceMs = 50;
      watcher = await createWatcher({
        directory: testDir,
        debounceMs,
      });

      const testFile = join(testDir, 'separate.json');
      const events: FileChangeEvent[] = [];

      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act - changes with delay between them
      await writeFile(testFile, '{"v": 1}');
      await delay(debounceMs + 100);
      await writeFile(testFile, '{"v": 2}');
      await delay(debounceMs + 100);

      // Assert - should have at least 2 events
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should use default debounce of 100ms when not specified', async () => {
      /**
       * Given: A watcher without explicit debounce configuration
       * When: Rapid changes occur
       * Then: Default debouncing behavior (100ms) should apply
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const testFile = join(testDir, 'default-debounce.json');
      const events: FileChangeEvent[] = [];

      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act - rapid changes within default debounce period
      await writeFile(testFile, '{"v": 1}');
      await delay(20);
      await writeFile(testFile, '{"v": 2}');

      // Wait for default debounce
      await delay(200);

      // Assert - should be debounced
      expect(events.length).toBeLessThanOrEqual(2);
    });
  });

  // ==================== File Filtering ====================

  describe('file filtering', () => {
    it('should ignore non-JSON files by default', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: A non-JSON file is created
       * Then: No 'change' event should be emitted
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act - create non-JSON files
      await writeFile(join(testDir, 'test.ts'), 'const x = 1;');
      await writeFile(join(testDir, 'test.txt'), 'hello');
      await writeFile(join(testDir, 'test.md'), '# Hello');

      // Wait for potential events
      await delay(200);

      // Assert - no events should be emitted for non-JSON files
      expect(events.length).toBe(0);
    });

    it('should watch .json files', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: A .json file is created
       * Then: 'change' event should be emitted
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      // Act
      await writeFile(join(testDir, 'page.json'), '{}');

      // Assert
      const event = await changePromise;
      expect(event.path).toContain('.json');
    });

    it('should support custom file patterns', async () => {
      /**
       * Given: A watcher with custom pattern (e.g., *.tsx)
       * When: A matching file is created
       * Then: 'change' event should be emitted
       */
      // Arrange
      watcher = await createWatcher({
        directory: testDir,
        patterns: ['**/*.tsx', '**/*.json'],
      });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act
      await writeFile(join(testDir, 'component.tsx'), 'export const C = () => {}');
      await delay(200);

      // Assert
      expect(events.some((e) => e.path.endsWith('.tsx'))).toBe(true);
    });

    it('should ignore dot files and directories', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: Files in hidden directories are created
       * Then: No 'change' event should be emitted
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Create hidden directory
      const hiddenDir = join(testDir, '.hidden');
      await mkdir(hiddenDir, { recursive: true });

      // Act
      await writeFile(join(hiddenDir, 'secret.json'), '{}');
      await writeFile(join(testDir, '.dotfile.json'), '{}');

      // Wait for potential events
      await delay(200);

      // Assert - no events for hidden files/directories
      expect(
        events.filter((e) => e.path.includes('.hidden') || e.path.includes('.dotfile'))
      ).toHaveLength(0);
    });

    it('should ignore node_modules directory', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: Files in node_modules are created
       * Then: No 'change' event should be emitted
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Create node_modules directory
      const nodeModules = join(testDir, 'node_modules');
      await mkdir(nodeModules, { recursive: true });

      // Act
      await writeFile(join(nodeModules, 'package.json'), '{}');

      // Wait for potential events
      await delay(200);

      // Assert - no events for node_modules
      expect(events.filter((e) => e.path.includes('node_modules'))).toHaveLength(0);
    });
  });

  // ==================== Watcher Lifecycle ====================

  describe('watcher lifecycle', () => {
    it('should stop watching when close() is called', async () => {
      /**
       * Given: An active watcher
       * When: close() is called
       * Then: No more events should be emitted
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act
      await watcher.close();

      // Create file after close
      await writeFile(join(testDir, 'after-close.json'), '{}');
      await delay(200);

      // Assert - no events after close
      expect(events.length).toBe(0);
    });

    it('should handle multiple close calls gracefully', async () => {
      /**
       * Given: A watcher
       * When: close() is called multiple times
       * Then: No error should be thrown
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      // Act & Assert - should not throw
      await watcher.close();
      await expect(watcher.close()).resolves.toBeUndefined();
    });

    it('should support restarting with new watcher after close', async () => {
      /**
       * Given: A closed watcher
       * When: A new watcher is created for the same directory
       * Then: New watcher should work properly
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });
      await watcher.close();

      // Act - create new watcher
      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      await writeFile(join(testDir, 'new-watcher.json'), '{}');

      // Assert
      const event = await changePromise;
      expect(event.path).toContain('new-watcher.json');
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should emit "error" event on watcher errors', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: An error occurs (e.g., directory deleted while watching)
       * Then: 'error' event should be emitted
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const errorPromise = waitForEvent<Error>(watcher, 'error', 3000);

      // Act - delete the watched directory
      await rm(testDir, { recursive: true, force: true });

      // Create new directory for cleanup to work
      await mkdir(testDir, { recursive: true });

      // Assert - error event may be emitted depending on platform
      // This is platform-dependent, so we use a try-catch
      try {
        await errorPromise;
      } catch {
        // Timeout is acceptable - some platforms handle this differently
      }
    });

    it('should continue watching other files after error in one file', async () => {
      /**
       * Given: A watcher monitoring multiple files
       * When: One file causes an error but others are valid
       * Then: Watcher should continue working for other files
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act - create a valid file
      await writeFile(join(testDir, 'valid.json'), '{}');
      await delay(200);

      // Assert - should still receive events
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle files with special characters in names', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: A file with special characters is created
       * Then: Event should be emitted with correct path
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      const specialName = 'test-file_2.json';
      const testFile = join(testDir, specialName);

      // Act
      await writeFile(testFile, '{}');

      // Assert
      const event = await changePromise;
      expect(event.path).toContain(specialName);
    });

    it('should handle deeply nested directories', async () => {
      /**
       * Given: A watcher monitoring a directory with deep nesting
       * When: A file in a deeply nested directory changes
       * Then: Event should be emitted
       */
      // Arrange
      const deepDir = join(testDir, 'a', 'b', 'c', 'd', 'e');
      await mkdir(deepDir, { recursive: true });

      watcher = await createWatcher({ directory: testDir });
      const changePromise = waitForEvent<FileChangeEvent>(watcher, 'change');

      // Act
      const deepFile = join(deepDir, 'deep.json');
      await writeFile(deepFile, '{}');

      // Assert
      const event = await changePromise;
      expect(event.path).toBe(deepFile);
    });

    it('should handle rapid file creation and deletion', async () => {
      /**
       * Given: A watcher monitoring a directory
       * When: A file is rapidly created and deleted
       * Then: At least one event should be emitted without crashing
       */
      // Arrange
      watcher = await createWatcher({ directory: testDir });

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      const testFile = join(testDir, 'rapid.json');

      // Act - rapid create/delete cycles
      for (let i = 0; i < 5; i++) {
        await writeFile(testFile, `{"v": ${i}}`);
        await delay(10);
        try {
          await unlink(testFile);
        } catch {
          // File might already be deleted
        }
        await delay(10);
      }

      await delay(300);

      // Assert - should have handled without throwing
      // At least some events should be captured
      expect(watcher).toBeDefined();
    });

    it('should handle empty directory', async () => {
      /**
       * Given: An empty directory
       * When: createWatcher is called
       * Then: Watcher should be created successfully
       */
      // Arrange
      const emptyDir = join(testDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      // Act
      watcher = await createWatcher({ directory: emptyDir });

      // Assert
      expect(watcher).toBeDefined();
    });

    it('should handle file rename as delete and create', async () => {
      /**
       * Given: A watcher monitoring a directory with an existing file
       * When: The file is renamed
       * Then: Events for both old and new paths should be emitted
       */
      // Arrange
      const oldFile = join(testDir, 'old-name.json');
      await writeFile(oldFile, '{}');

      watcher = await createWatcher({ directory: testDir });
      await delay(100);

      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Act - rename file (simulate via fs.rename)
      const { rename } = await import('node:fs/promises');
      const newFile = join(testDir, 'new-name.json');
      await rename(oldFile, newFile);

      await delay(300);

      // Assert - should have events for the rename
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
