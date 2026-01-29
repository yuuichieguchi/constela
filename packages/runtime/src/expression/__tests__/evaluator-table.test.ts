/**
 * Test module for DataTable Helper Functions.
 *
 * Coverage:
 * - sortBy: Sort array of objects by specified key
 * - getPaginatedItems: Get items for specified page (0-indexed)
 * - getTotalPages: Calculate total number of pages
 * - getPageNumbers: Return array of page numbers for pagination UI
 * - getVisibleRange: Returns { start, end } indices for virtual scroll
 * - getTotalHeight: Returns total scrollable height for virtual scroll
 *
 * TDD Red Phase: These tests verify DataTable helper functions that will be added
 * to the expression evaluator. The functions do not yet exist,
 * so all tests are expected to FAIL.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, type EvaluationContext } from '../evaluator.js';
import type { CompiledExpression } from '@constela/compiler';

// Mock StateStore for testing
class MockStateStore {
  private state: Record<string, unknown>;

  constructor(initialState: Record<string, unknown> = {}) {
    this.state = initialState;
  }

  get(name: string): unknown {
    return this.state[name];
  }

  set(name: string, value: unknown): void {
    this.state[name] = value;
  }
}

describe('DataTable Helper Functions', () => {
  // ==================== Setup ====================

  let mockState: MockStateStore;
  let baseContext: EvaluationContext;

  beforeEach(() => {
    mockState = new MockStateStore({});
    baseContext = {
      state: mockState as EvaluationContext['state'],
      locals: {},
    };
  });

  // ==================== Helper Functions ====================

  /**
   * Creates an EvaluationContext with state and locals
   */
  function createContext(
    stateData: Record<string, unknown> = {},
    locals: Record<string, unknown> = {}
  ): EvaluationContext {
    mockState = new MockStateStore(stateData);
    return {
      state: mockState as EvaluationContext['state'],
      locals,
    };
  }

  // ==================== sortBy ====================

  describe('sortBy', () => {
    describe('basic functionality', () => {
      it('should sort array of objects by string key in ascending order', () => {
        // Arrange
        // DSL: sortBy(items, "name", "asc")
        const items = [
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 35 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 35 },
          { name: 'Charlie', age: 30 },
        ]);
      });

      it('should sort array of objects by string key in descending order', () => {
        // Arrange
        const items = [
          { name: 'Alice', age: 25 },
          { name: 'Charlie', age: 30 },
          { name: 'Bob', age: 35 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'desc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Charlie', age: 30 },
          { name: 'Bob', age: 35 },
          { name: 'Alice', age: 25 },
        ]);
      });

      it('should sort array of objects by number key in ascending order', () => {
        // Arrange
        const items = [
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 35 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'age' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Alice', age: 25 },
          { name: 'Charlie', age: 30 },
          { name: 'Bob', age: 35 },
        ]);
      });

      it('should sort array of objects by number key in descending order', () => {
        // Arrange
        const items = [
          { name: 'Alice', age: 25 },
          { name: 'Charlie', age: 30 },
          { name: 'Bob', age: 35 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'age' },
            { expr: 'lit', value: 'desc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Bob', age: 35 },
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
        ]);
      });

      it('should default to ascending order when direction is not provided', () => {
        // Arrange
        const items = [
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Alice', age: 25 },
          { name: 'Charlie', age: 30 },
        ]);
      });

      it('should not mutate the original array', () => {
        // Arrange
        const items = [
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
        ];
        const originalItems = [...items];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        evaluate(expr, ctx);

        // Assert
        expect(items).toEqual(originalItems);
      });
    });

    describe('state integration', () => {
      it('should sort items from state', () => {
        // Arrange
        const items = [
          { id: 3, value: 'c' },
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'state', name: 'items' },
            { expr: 'lit', value: 'id' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ items });

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
          { id: 3, value: 'c' },
        ]);
      });

      it('should use sort key from state', () => {
        // Arrange
        const items = [
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'state', name: 'sortKey' },
            { expr: 'state', name: 'sortDirection' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ sortKey: 'age', sortDirection: 'desc' });

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
        ]);
      });
    });

    describe('edge cases', () => {
      it('should return empty array when input is empty', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: [] },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle single item array', () => {
        // Arrange
        const items = [{ name: 'Alice', age: 25 }];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([{ name: 'Alice', age: 25 }]);
      });

      it('should handle items with equal values (stable sort)', () => {
        // Arrange
        const items = [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 25 },
          { name: 'Charlie', age: 25 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'age' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result.length).toBe(3);
        // All ages should be 25
        expect(result.every(item => item.age === 25)).toBe(true);
      });

      it('should handle null/undefined values in sort key', () => {
        // Arrange
        const items = [
          { name: 'Charlie', age: 30 },
          { name: null, age: 25 },
          { name: 'Alice', age: 35 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
      });

      it('should handle missing sort key in objects', () => {
        // Arrange
        const items = [
          { name: 'Charlie' },
          { name: 'Alice', age: 25 },
          { age: 35 },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for non-array input', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'not an array' },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for null input', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: null },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-string key', () => {
        // Arrange
        const items = [{ name: 'Alice' }];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 123 },
            { expr: 'lit', value: 'asc' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should treat invalid direction as ascending', () => {
        // Arrange
        const items = [
          { name: 'Charlie' },
          { name: 'Alice' },
        ];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'sortBy' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'name' },
            { expr: 'lit', value: 'invalid' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as typeof items;

        // Assert
        expect(result).toEqual([
          { name: 'Alice' },
          { name: 'Charlie' },
        ]);
      });
    });
  });

  // ==================== getPaginatedItems ====================

  describe('getPaginatedItems', () => {
    describe('basic functionality', () => {
      it('should return correct items for first page (page 0)', () => {
        // Arrange
        // DSL: getPaginatedItems(items, 0, 3)
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 3 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([1, 2, 3]);
      });

      it('should return correct items for middle page', () => {
        // Arrange
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 3 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([4, 5, 6]);
      });

      it('should return correct items for last page', () => {
        // Arrange
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 3 },
            { expr: 'lit', value: 3 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([10]);
      });

      it('should return all items when pageSize is larger than array', () => {
        // Arrange
        const items = [1, 2, 3];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([1, 2, 3]);
      });
    });

    describe('state integration', () => {
      it('should paginate items from state', () => {
        // Arrange
        const items = ['a', 'b', 'c', 'd', 'e', 'f'];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'state', name: 'items' },
            { expr: 'state', name: 'currentPage' },
            { expr: 'state', name: 'pageSize' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ items, currentPage: 1, pageSize: 2 });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual(['c', 'd']);
      });
    });

    describe('edge cases', () => {
      it('should return empty array for empty input', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: [] },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array for page beyond range', () => {
        // Arrange
        const items = [1, 2, 3];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 3 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle page size of 1', () => {
        // Arrange
        const items = ['a', 'b', 'c'];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 1 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual(['b']);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for non-array input', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'not an array' },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for negative page', () => {
        // Arrange
        const items = [1, 2, 3];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: -1 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-positive pageSize', () => {
        // Arrange
        const items = [1, 2, 3];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-numeric page', () => {
        // Arrange
        const items = [1, 2, 3];
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPaginatedItems' },
          method: 'call',
          args: [
            { expr: 'lit', value: items },
            { expr: 'lit', value: 'first' },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ==================== getTotalPages ====================

  describe('getTotalPages', () => {
    describe('basic functionality', () => {
      it('should calculate total pages when items divide evenly', () => {
        // Arrange
        // DSL: getTotalPages(10, 5) -> 2
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(2);
      });

      it('should round up when items do not divide evenly', () => {
        // Arrange
        // DSL: getTotalPages(10, 3) -> 4
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 3 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(4);
      });

      it('should return 1 when itemCount equals pageSize', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 5 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(1);
      });

      it('should return 1 when itemCount is less than pageSize', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 3 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(1);
      });
    });

    describe('state integration', () => {
      it('should calculate pages with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'state', name: 'totalItems' },
            { expr: 'state', name: 'pageSize' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ totalItems: 25, pageSize: 10 });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(3);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for zero items', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should handle single item', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(1);
      });

      it('should handle large item count', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 1000000 },
            { expr: 'lit', value: 100 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(10000);
      });
    });

    describe('invalid input handling', () => {
      it('should return 0 for negative itemCount', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: -5 },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 for non-positive pageSize', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 for non-numeric itemCount', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'many' },
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 for non-numeric pageSize', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalPages' },
          method: 'call',
          args: [
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 'ten' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });
    });
  });

  // ==================== getPageNumbers ====================

  describe('getPageNumbers', () => {
    describe('basic functionality - small number of pages', () => {
      it('should return all page numbers when total is less than maxVisible', () => {
        // Arrange
        // DSL: getPageNumbers(0, 5, 7) -> [0, 1, 2, 3, 4]
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 5 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([0, 1, 2, 3, 4]);
      });

      it('should return all page numbers when total equals maxVisible', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 3 },
            { expr: 'lit', value: 7 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
      });
    });

    describe('ellipsis handling - large number of pages', () => {
      it('should add ellipsis at end when current page is near start', () => {
        // Arrange
        // DSL: getPageNumbers(1, 20, 7) -> [0, 1, 2, 3, 4, -1, 19]
        // -1 represents ellipsis
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 20 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result[0]).toBe(0); // First page
        expect(result[result.length - 1]).toBe(19); // Last page
        expect(result).toContain(-1); // Contains ellipsis
      });

      it('should add ellipsis at start when current page is near end', () => {
        // Arrange
        // DSL: getPageNumbers(18, 20, 7) -> [0, -1, 15, 16, 17, 18, 19]
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 18 },
            { expr: 'lit', value: 20 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result[0]).toBe(0); // First page
        expect(result[result.length - 1]).toBe(19); // Last page
        expect(result).toContain(-1); // Contains ellipsis
      });

      it('should add ellipsis at both ends when current page is in middle', () => {
        // Arrange
        // DSL: getPageNumbers(10, 20, 7) -> [0, -1, 9, 10, 11, -1, 19]
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 20 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result[0]).toBe(0); // First page
        expect(result[result.length - 1]).toBe(19); // Last page
        expect(result.filter(n => n === -1).length).toBe(2); // Two ellipses
        expect(result).toContain(10); // Current page
      });
    });

    describe('state integration', () => {
      it('should use state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'state', name: 'currentPage' },
            { expr: 'state', name: 'totalPages' },
            { expr: 'state', name: 'maxVisible' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          currentPage: 2,
          totalPages: 5,
          maxVisible: 7,
        });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([0, 1, 2, 3, 4]);
      });
    });

    describe('edge cases', () => {
      it('should handle single page', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([0]);
      });

      it('should handle zero total pages', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle maxVisible of 1', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 5 },
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 1 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for negative currentPage', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: -1 },
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array for currentPage beyond totalPages', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 15 },
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array for non-numeric inputs', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getPageNumbers' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'first' },
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 7 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  // ==================== getVisibleRange (Virtual Scroll) ====================

  describe('getVisibleRange', () => {
    describe('basic functionality', () => {
      it('should return correct start and end indices at scroll position 0', () => {
        // Arrange
        // DSL: getVisibleRange(0, 50, 500, 5)
        // scrollTop=0, itemHeight=50, containerHeight=500, overscan=5
        // Visible items: 500/50 = 10 items, with overscan: 0-14
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(result).toEqual({ start: 0, end: 14 });
      });

      it('should return correct indices when scrolled down', () => {
        // Arrange
        // scrollTop=250, itemHeight=50, containerHeight=500, overscan=5
        // First visible item: 250/50 = 5
        // Visible items: 500/50 = 10
        // With overscan: start=0 (5-5), end=19 (5+10+5-1)
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 250 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(result.start).toBe(0);
        expect(result.end).toBe(19);
      });

      it('should clamp start to 0 when overscan would go negative', () => {
        // Arrange
        // scrollTop=100, itemHeight=50, containerHeight=500, overscan=5
        // First visible: 2, but start would be 2-5 = -3, so clamp to 0
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 100 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(result.start).toBe(0);
      });

      it('should handle zero overscan', () => {
        // Arrange
        // scrollTop=0, itemHeight=50, containerHeight=500, overscan=0
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(result).toEqual({ start: 0, end: 9 });
      });
    });

    describe('state integration', () => {
      it('should use state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'state', name: 'scrollTop' },
            { expr: 'state', name: 'itemHeight' },
            { expr: 'state', name: 'containerHeight' },
            { expr: 'state', name: 'overscan' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          scrollTop: 0,
          itemHeight: 40,
          containerHeight: 400,
          overscan: 3,
        });

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(result.start).toBe(0);
        expect(result.end).toBe(12); // 10 visible + 3 overscan - 1
      });
    });

    describe('edge cases', () => {
      it('should handle very small container', () => {
        // Arrange
        // Container only fits partial item
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 100 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 2 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(result.start).toBe(0);
        expect(result.end).toBeGreaterThanOrEqual(0);
      });

      it('should handle fractional scroll positions', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 125.5 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { start: number; end: number };

        // Assert
        expect(Number.isInteger(result.start)).toBe(true);
        expect(Number.isInteger(result.end)).toBe(true);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for negative scrollTop', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: -100 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-positive itemHeight', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-positive containerHeight', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: -100 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-numeric inputs', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getVisibleRange' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'top' },
            { expr: 'lit', value: 50 },
            { expr: 'lit', value: 500 },
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ==================== getTotalHeight (Virtual Scroll) ====================

  describe('getTotalHeight', () => {
    describe('basic functionality', () => {
      it('should calculate total height for given item count and height', () => {
        // Arrange
        // DSL: getTotalHeight(100, 50) -> 5000
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 100 },
            { expr: 'lit', value: 50 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(5000);
      });

      it('should return 0 for zero items', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 50 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should handle single item', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 1 },
            { expr: 'lit', value: 75 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(75);
      });

      it('should handle large item counts', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 1000000 },
            { expr: 'lit', value: 40 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(40000000);
      });
    });

    describe('state integration', () => {
      it('should use state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'state', name: 'itemCount' },
            { expr: 'state', name: 'rowHeight' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ itemCount: 50, rowHeight: 32 });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(1600);
      });
    });

    describe('edge cases', () => {
      it('should handle fractional item height', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 10 },
            { expr: 'lit', value: 33.5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(335);
      });
    });

    describe('invalid input handling', () => {
      it('should return 0 for negative item count', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: -10 },
            { expr: 'lit', value: 50 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 for non-positive item height', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 100 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 for non-numeric item count', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'many' },
            { expr: 'lit', value: 50 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 for non-numeric item height', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getTotalHeight' },
          method: 'call',
          args: [
            { expr: 'lit', value: 100 },
            { expr: 'lit', value: 'tall' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });
    });
  });
});
