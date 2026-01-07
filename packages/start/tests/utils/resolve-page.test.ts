/**
 * Test module for resolve-page utility functions.
 *
 * Coverage:
 * - isPageExportFunction: Type guard for function exports
 *   - Should return true for function exports
 *   - Should return false for static CompiledProgram
 *
 * - resolvePageExport: Resolve page export to CompiledProgram
 *   - Should return static program unchanged
 *   - Should call function with params and return result
 *   - Should handle async function exports
 *   - Should propagate errors from function exports
 */

import { describe, it, expect, vi } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';

// Import will fail until implementation exists - this is TDD Red phase
// import { isPageExportFunction, resolvePageExport } from '../../src/utils/resolve-page.js';

// ==================== Test Fixtures ====================

/**
 * Simple test program (static export)
 */
const staticProgram: CompiledProgram = {
  version: '1.0',
  state: {},
  actions: {},
  view: {
    kind: 'element',
    tag: 'div',
    props: {},
    children: [{ kind: 'text', value: { expr: 'lit', value: 'Static Page' } }],
  },
};

/**
 * Program created with params (for function export tests)
 */
function createProgramWithParams(
  params: Record<string, string>
): CompiledProgram {
  const id = params.id || '';
  const slug = params.slug || '';
  return {
    version: '1.0',
    state: {
      id: { type: 'string', initial: id },
      slug: { type: 'string', initial: slug },
    },
    actions: {},
    view: {
      kind: 'element',
      tag: 'div',
      props: {},
      children: [
        {
          kind: 'text',
          value: { expr: 'lit', value: 'Page for ' + (id || slug) },
        },
      ],
    },
  };
}

/**
 * Sync function export
 */
const syncFunctionExport = (
  params: Record<string, string>
): CompiledProgram => {
  return createProgramWithParams(params);
};

/**
 * Async function export
 */
const asyncFunctionExport = async (
  params: Record<string, string>
): Promise<CompiledProgram> => {
  // Simulate async data fetching
  await new Promise((resolve) => setTimeout(resolve, 10));
  return createProgramWithParams(params);
};

/**
 * Throwing function export (for error handling tests)
 */
const throwingFunctionExport = (): CompiledProgram => {
  throw new Error('Data fetch failed');
};

/**
 * Async throwing function export
 */
const asyncThrowingFunctionExport = async (): Promise<CompiledProgram> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Async data fetch failed');
};

// ==================== isPageExportFunction Tests ====================

describe('isPageExportFunction', () => {
  // ==================== Type Guard: True Cases ====================

  describe('should return true for function exports', () => {
    it('should return true for sync function export', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );

      // Act
      const result = isPageExportFunction(syncFunctionExport);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for async function export', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );

      // Act
      const result = isPageExportFunction(asyncFunctionExport);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for arrow function', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );
      const arrowFn = (params: Record<string, string>) =>
        createProgramWithParams(params);

      // Act
      const result = isPageExportFunction(arrowFn);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for function declaration', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );
      function declaredFn(params: Record<string, string>): CompiledProgram {
        return createProgramWithParams(params);
      }

      // Act
      const result = isPageExportFunction(declaredFn);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== Type Guard: False Cases ====================

  describe('should return false for static CompiledProgram', () => {
    it('should return false for static program object', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );

      // Act
      const result = isPageExportFunction(staticProgram);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for program with all properties', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );
      const fullProgram: CompiledProgram = {
        version: '1.0',
        state: {
          count: { type: 'number', initial: 0 },
          name: { type: 'string', initial: 'test' },
        },
        actions: {
          increment: { steps: [] },
        },
        view: {
          kind: 'element',
          tag: 'section',
          props: { class: { expr: 'lit', value: 'container' } },
          children: [],
        },
      };

      // Act
      const result = isPageExportFunction(fullProgram);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for minimal valid program', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );
      const minimalProgram: CompiledProgram = {
        version: '1.0',
        state: {},
        actions: {},
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      };

      // Act
      const result = isPageExportFunction(minimalProgram);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle function with no parameters', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );
      const noParamFn = () => staticProgram;

      // Act
      const result = isPageExportFunction(noParamFn);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle bound functions', async () => {
      // Arrange
      const { isPageExportFunction } = await import(
        '../../src/utils/resolve-page.js'
      );
      const boundFn = syncFunctionExport.bind(null);

      // Act
      const result = isPageExportFunction(boundFn);

      // Assert
      expect(result).toBe(true);
    });
  });
});

// ==================== resolvePageExport Tests ====================

describe('resolvePageExport', () => {
  // ==================== Static Export Handling ====================

  describe('static export handling', () => {
    it('should return static program unchanged', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '123' };

      // Act
      const result = await resolvePageExport(staticProgram, params);

      // Assert
      expect(result).toBe(staticProgram);
      expect(result.version).toBe('1.0');
    });

    it('should ignore params for static export', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: 'should-be-ignored' };

      // Act
      const result = await resolvePageExport(staticProgram, params);

      // Assert
      expect(result).toBe(staticProgram);
    });

    it('should handle empty params for static export', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = {};

      // Act
      const result = await resolvePageExport(staticProgram, params);

      // Assert
      expect(result).toBe(staticProgram);
    });
  });

  // ==================== Function Export Handling ====================

  describe('function export handling', () => {
    it('should call sync function with params and return result', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '456' };

      // Act
      const result = await resolvePageExport(syncFunctionExport, params);

      // Assert
      expect(result.state?.id).toEqual({ type: 'string', initial: '456' });
    });

    it('should call async function with params and return result', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { slug: 'hello-world' };

      // Act
      const result = await resolvePageExport(asyncFunctionExport, params);

      // Assert
      expect(result.state?.slug).toEqual({
        type: 'string',
        initial: 'hello-world',
      });
    });

    it('should pass params object correctly to function', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const mockFn = vi.fn().mockReturnValue(staticProgram);
      const params = { year: '2024', month: '06' };

      // Act
      await resolvePageExport(mockFn, params);

      // Assert
      expect(mockFn).toHaveBeenCalledWith(params);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle function returning program with complex state', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const complexFn = (params: Record<string, string>): CompiledProgram => ({
        version: '1.0',
        state: {
          userId: { type: 'string', initial: params.id || '' },
          loading: { type: 'boolean', initial: false },
          data: { type: 'any', initial: null },
        },
        actions: {
          fetchData: { steps: [] },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [],
        },
      });
      const params = { id: 'user-123' };

      // Act
      const result = await resolvePageExport(complexFn, params);

      // Assert
      expect(result.state?.userId).toEqual({
        type: 'string',
        initial: 'user-123',
      });
      expect(result.state?.loading).toEqual({ type: 'boolean', initial: false });
    });

    it('should handle empty params object for function export', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const emptyParamFn = vi.fn().mockReturnValue(staticProgram);
      const params = {};

      // Act
      await resolvePageExport(emptyParamFn, params);

      // Assert
      expect(emptyParamFn).toHaveBeenCalledWith({});
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should propagate error from sync function', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = {};

      // Act & Assert
      await expect(
        resolvePageExport(throwingFunctionExport, params)
      ).rejects.toThrow('Data fetch failed');
    });

    it('should propagate error from async function', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = {};

      // Act & Assert
      await expect(
        resolvePageExport(asyncThrowingFunctionExport, params)
      ).rejects.toThrow('Async data fetch failed');
    });

    it('should propagate custom error types', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string
        ) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const customThrowFn = (): CompiledProgram => {
        throw new CustomError('Custom failure', 'ERR_CUSTOM');
      };
      const params = {};

      // Act & Assert
      await expect(resolvePageExport(customThrowFn, params)).rejects.toThrow(
        CustomError
      );
    });

    it('should not catch errors in static export', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const validProgram = staticProgram;
      const params = { id: '123' };

      // Act
      const result = await resolvePageExport(validProgram, params);

      // Assert - should complete without error
      expect(result).toBe(validProgram);
    });
  });

  // ==================== Async Behavior ====================

  describe('async behavior', () => {
    it('should always return a Promise', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = {};

      // Act
      const staticResult = resolvePageExport(staticProgram, params);
      const syncFnResult = resolvePageExport(syncFunctionExport, params);
      const asyncFnResult = resolvePageExport(asyncFunctionExport, params);

      // Assert
      expect(staticResult).toBeInstanceOf(Promise);
      expect(syncFnResult).toBeInstanceOf(Promise);
      expect(asyncFnResult).toBeInstanceOf(Promise);
    });

    it('should handle long-running async function', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const slowFn = async (
        params: Record<string, string>
      ): Promise<CompiledProgram> => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return createProgramWithParams(params);
      };
      const params = { id: 'slow-page' };

      // Act
      const start = Date.now();
      const result = await resolvePageExport(slowFn, params);
      const elapsed = Date.now() - start;

      // Assert
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(result.state?.id).toEqual({ type: 'string', initial: 'slow-page' });
    });
  });

  // ==================== expectedParams Validation ====================

  describe('expectedParams validation', () => {
    it('should pass when all expected params are present', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '123', slug: 'test' };
      const expectedParams = ['id', 'slug'];

      // Act & Assert
      await expect(
        resolvePageExport(staticProgram, params, expectedParams)
      ).resolves.toBe(staticProgram);
    });

    it('should pass when expectedParams is undefined', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '123' };

      // Act & Assert
      await expect(
        resolvePageExport(staticProgram, params, undefined)
      ).resolves.toBe(staticProgram);
    });

    it('should pass when expectedParams is empty array', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '123' };

      // Act & Assert
      await expect(
        resolvePageExport(staticProgram, params, [])
      ).resolves.toBe(staticProgram);
    });

    it('should throw when required param is missing', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '123' };
      const expectedParams = ['id', 'slug'];

      // Act & Assert
      await expect(
        resolvePageExport(staticProgram, params, expectedParams)
      ).rejects.toThrow('Missing required route param: slug');
    });

    it('should throw with correct param name when first param is missing', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = {};
      const expectedParams = ['year', 'month'];

      // Act & Assert
      await expect(
        resolvePageExport(staticProgram, params, expectedParams)
      ).rejects.toThrow('Missing required route param: year');
    });

    it('should validate before calling function export', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const mockFn = vi.fn().mockReturnValue(staticProgram);
      const params = { id: '123' };
      const expectedParams = ['id', 'slug'];

      // Act & Assert
      await expect(
        resolvePageExport(mockFn, params, expectedParams)
      ).rejects.toThrow('Missing required route param: slug');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should pass extra params without error', async () => {
      // Arrange
      const { resolvePageExport } = await import(
        '../../src/utils/resolve-page.js'
      );
      const params = { id: '123', extra: 'value', another: 'param' };
      const expectedParams = ['id'];

      // Act & Assert
      await expect(
        resolvePageExport(staticProgram, params, expectedParams)
      ).resolves.toBe(staticProgram);
    });
  });
});
