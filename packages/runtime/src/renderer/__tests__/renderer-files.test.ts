/**
 * Test module for Renderer File Input Event Data Extraction.
 *
 * Coverage:
 * - Extract file info from file input change event
 * - Extract multiple files info
 * - Include name, size, type for each file
 * - Include raw File object as _file for FormData
 * - Return empty array for no files selected
 *
 * TDD Red Phase: These tests verify that the renderer properly extracts
 * file input data and makes it available through event locals for payload expressions.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledNode, CompiledAction } from '@constela/compiler';

describe('Renderer File Input Event Data Extraction', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  // ==================== Helper Functions ====================

  function createRenderContext(
    overrides?: Partial<RenderContext>
  ): RenderContext {
    return {
      state: createStateStore({}),
      actions: {},
      locals: {},
      cleanups: [],
      refs: {},
      ...overrides,
    };
  }

  /**
   * Creates a mock File object
   */
  function createMockFile(
    name: string,
    size: number,
    type: string,
    lastModified?: number
  ): File {
    const blob = new Blob(['x'.repeat(size)], { type });
    const file = new File([blob], name, {
      type,
      lastModified: lastModified ?? Date.now(),
    });
    return file;
  }

  /**
   * Creates a mock FileList from an array of Files
   */
  function createMockFileList(files: File[]): FileList {
    const fileList = {
      length: files.length,
      item: (index: number) => files[index] ?? null,
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file;
        }
      },
    };
    // Add indexed access
    for (let i = 0; i < files.length; i++) {
      Object.defineProperty(fileList, i, {
        value: files[i],
        enumerable: true,
      });
    }
    return fileList as FileList;
  }

  /**
   * Dispatches a change event with mock files on a file input
   */
  function dispatchFileChangeEvent(
    input: HTMLInputElement,
    files: File[]
  ): void {
    const fileList = createMockFileList(files);
    Object.defineProperty(input, 'files', {
      value: fileList,
      writable: false,
      configurable: true,
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ==================== Single File Tests ====================

  describe('single file extraction', () => {
    it('should extract file info from file input change event', async () => {
      // Arrange
      const state = createStateStore({
        fileData: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileData',
            value: { expr: 'var', name: 'payload' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf');
      dispatchFileChangeEvent(input, [mockFile]);

      // Wait for async action execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const fileData = state.get('fileData') as { files: unknown[] };
      expect(fileData.files).toHaveLength(1);
    });

    it('should include name property for file', async () => {
      // Arrange
      const state = createStateStore({
        fileName: { type: 'string', initial: '' },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileName',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0.name',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      const mockFile = createMockFile('document.pdf', 2048, 'application/pdf');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      expect(state.get('fileName')).toBe('document.pdf');
    });

    it('should include size property for file', async () => {
      // Arrange
      const state = createStateStore({
        fileSize: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileSize',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0.size',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      const mockFile = createMockFile('image.png', 5000, 'image/png');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      expect(state.get('fileSize')).toBe(5000);
    });

    it('should include type property for file', async () => {
      // Arrange
      const state = createStateStore({
        fileType: { type: 'string', initial: '' },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileType',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0.type',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      const mockFile = createMockFile('photo.jpg', 3000, 'image/jpeg');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      expect(state.get('fileType')).toBe('image/jpeg');
    });

    it('should include raw File object as _file property', async () => {
      // Arrange
      const state = createStateStore({
        fileData: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileData',
            value: { expr: 'var', name: 'payload' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      const mockFile = createMockFile('data.csv', 1500, 'text/csv');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const fileData = state.get('fileData') as { files: { _file: File }[] };
      expect(fileData.files[0]._file).toBeInstanceOf(File);
      expect(fileData.files[0]._file.name).toBe('data.csv');
    });
  });

  // ==================== Multiple Files Tests ====================

  describe('multiple files extraction', () => {
    it('should extract multiple files info', async () => {
      // Arrange
      const state = createStateStore({
        fileCount: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileCount',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: 'length',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          multiple: { expr: 'lit', value: true },
          id: { expr: 'lit', value: 'multi-file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#multi-file-input') as HTMLInputElement;
      const mockFiles = [
        createMockFile('file1.txt', 100, 'text/plain'),
        createMockFile('file2.txt', 200, 'text/plain'),
        createMockFile('file3.txt', 300, 'text/plain'),
      ];
      dispatchFileChangeEvent(input, mockFiles);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      expect(state.get('fileCount')).toBe(3);
    });

    it('should include name, size, type for each file', async () => {
      // Arrange
      const state = createStateStore({
        filesData: { type: 'array', initial: [] },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'filesData',
            value: {
              expr: 'get',
              base: { expr: 'var', name: 'payload' },
              path: 'files',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          multiple: { expr: 'lit', value: true },
          id: { expr: 'lit', value: 'multi-file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#multi-file-input') as HTMLInputElement;
      const mockFiles = [
        createMockFile('image.png', 1000, 'image/png'),
        createMockFile('document.pdf', 2000, 'application/pdf'),
      ];
      dispatchFileChangeEvent(input, mockFiles);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const filesData = state.get('filesData') as Array<{
        name: string;
        size: number;
        type: string;
        _file: File;
      }>;

      expect(filesData).toHaveLength(2);

      // First file
      expect(filesData[0].name).toBe('image.png');
      expect(filesData[0].size).toBe(1000);
      expect(filesData[0].type).toBe('image/png');
      expect(filesData[0]._file).toBeInstanceOf(File);

      // Second file
      expect(filesData[1].name).toBe('document.pdf');
      expect(filesData[1].size).toBe(2000);
      expect(filesData[1].type).toBe('application/pdf');
      expect(filesData[1]._file).toBeInstanceOf(File);
    });
  });

  // ==================== Empty Selection Tests ====================

  describe('empty file selection', () => {
    it('should return empty array for no files selected', async () => {
      // Arrange
      const state = createStateStore({
        filesData: { type: 'array', initial: [{ name: 'initial' }] },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'filesData',
            value: {
              expr: 'get',
              base: { expr: 'var', name: 'payload' },
              path: 'files',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      // Dispatch change with empty file list (user cancelled file dialog)
      dispatchFileChangeEvent(input, []);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const filesData = state.get('filesData') as unknown[];
      expect(filesData).toEqual([]);
    });

    it('should handle null files property gracefully', async () => {
      // Arrange
      const state = createStateStore({
        filesData: { type: 'array', initial: [{ name: 'initial' }] },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'filesData',
            value: {
              expr: 'get',
              base: { expr: 'var', name: 'payload' },
              path: 'files',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      // Set files to null
      Object.defineProperty(input, 'files', {
        value: null,
        writable: false,
        configurable: true,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      // Should handle null gracefully and return empty array
      const filesData = state.get('filesData') as unknown[];
      expect(filesData).toEqual([]);
    });
  });

  // ==================== File Type Variations ====================

  describe('file type variations', () => {
    it('should handle image files', async () => {
      // Arrange
      const state = createStateStore({
        fileInfo: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileInfo',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          accept: { expr: 'lit', value: 'image/*' },
          id: { expr: 'lit', value: 'image-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#image-input') as HTMLInputElement;
      const mockFile = createMockFile('photo.jpg', 50000, 'image/jpeg');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const fileInfo = state.get('fileInfo') as { name: string; type: string };
      expect(fileInfo.name).toBe('photo.jpg');
      expect(fileInfo.type).toBe('image/jpeg');
    });

    it('should handle video files', async () => {
      // Arrange
      const state = createStateStore({
        fileInfo: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileInfo',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          accept: { expr: 'lit', value: 'video/*' },
          id: { expr: 'lit', value: 'video-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#video-input') as HTMLInputElement;
      const mockFile = createMockFile('video.mp4', 10000000, 'video/mp4');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const fileInfo = state.get('fileInfo') as { name: string; type: string; size: number };
      expect(fileInfo.name).toBe('video.mp4');
      expect(fileInfo.type).toBe('video/mp4');
      expect(fileInfo.size).toBe(10000000);
    });

    it('should handle files without MIME type', async () => {
      // Arrange
      const state = createStateStore({
        fileInfo: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileInfo',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'unknown-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#unknown-input') as HTMLInputElement;
      // File without MIME type
      const mockFile = createMockFile('unknown.xyz', 100, '');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const fileInfo = state.get('fileInfo') as { name: string; type: string };
      expect(fileInfo.name).toBe('unknown.xyz');
      expect(fileInfo.type).toBe('');
    });
  });

  // ==================== Integration Tests ====================

  describe('integration with other event data', () => {
    it('should combine files data with input value access', async () => {
      // Arrange - In real scenarios, file input value is a fake path
      const state = createStateStore({
        filesInfo: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'filesInfo',
            value: { expr: 'var', name: 'payload' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
              // value for file input contains the fake path (C:\fakepath\...)
              fakePath: { expr: 'var', name: 'value' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#file-input') as HTMLInputElement;
      const mockFile = createMockFile('test.txt', 100, 'text/plain');
      dispatchFileChangeEvent(input, [mockFile]);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      const filesInfo = state.get('filesInfo') as { files: unknown[]; fakePath: string };
      expect(filesInfo.files).toHaveLength(1);
      // The value property is the fake path shown by browsers
      expect(typeof filesInfo.fakePath).toBe('string');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should not extract files for non-file inputs', async () => {
      // Arrange - text input should not have files extraction
      const state = createStateStore({
        data: { type: 'object', initial: null },
      });

      const captureAction: CompiledAction = {
        name: 'handleChange',
        steps: [
          {
            do: 'set',
            target: 'data',
            value: { expr: 'var', name: 'payload' },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' }, // Not a file input
          id: { expr: 'lit', value: 'text-input' },
          onChange: {
            event: 'change',
            action: 'handleChange',
            payload: {
              value: { expr: 'var', name: 'value' },
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#text-input') as HTMLInputElement;
      input.value = 'test value';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      const data = state.get('data') as { value: string; files: unknown };
      expect(data.value).toBe('test value');
      // files should be undefined or empty for non-file inputs
      expect(data.files).toBeUndefined();
    });

    it('should handle very large file size', async () => {
      // Arrange
      const state = createStateStore({
        fileSize: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleFileChange',
        steps: [
          {
            do: 'set',
            target: 'fileSize',
            value: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'var', name: 'payload' },
                path: 'files',
              },
              path: '0.size',
            },
          },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'file' },
          id: { expr: 'lit', value: 'large-file-input' },
          onChange: {
            event: 'change',
            action: 'handleFileChange',
            payload: {
              files: { expr: 'var', name: 'files' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFileChange: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#large-file-input') as HTMLInputElement;
      // Simulate a 5GB file
      const largeSize = 5 * 1024 * 1024 * 1024;
      // Create a minimal mock file with the size property
      const mockFile = {
        name: 'large-video.mp4',
        size: largeSize,
        type: 'video/mp4',
        lastModified: Date.now(),
      } as File;

      const fileList = createMockFileList([mockFile]);
      Object.defineProperty(input, 'files', {
        value: fileList,
        writable: false,
        configurable: true,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because files extraction is not implemented
      expect(state.get('fileSize')).toBe(largeSize);
    });
  });
});
