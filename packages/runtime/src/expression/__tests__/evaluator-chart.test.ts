/**
 * Test module for Chart Helper Functions.
 *
 * Coverage:
 * 1. Coordinate Calculation
 *    - normalizeValue: Normalize value to 0-1 range
 *    - scaleValue: Scale value from one range to another
 *    - getBarDimensions: Calculate bar position and size
 *
 * 2. Path Generation
 *    - getLinePath: Generate SVG path for line chart
 *    - getAreaPath: Generate SVG path for area chart
 *    - getArcPath: Generate SVG arc path for pie/donut slices
 *
 * 3. Pie/Donut Chart
 *    - getPieSlices: Calculate pie slice angles and percentages
 *    - getDonutSlices: Calculate donut slice angles with inner radius
 *
 * 4. Radar Chart
 *    - getRadarPoints: Convert data to radar polygon points
 *    - getRadarAxes: Calculate axis line coordinates
 *
 * 5. Utilities
 *    - getChartBounds: Find min/max values in data
 *    - generateTicks: Generate nice tick values for axis
 *
 * 6. Data Aggregation
 *    - binData: Group data into bins (histogram)
 *    - aggregateData: Aggregate data by group key
 *    - downsample: Reduce data points for large datasets
 *
 * TDD Red Phase: These tests verify Chart helper functions that will be added
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

describe('Chart Helper Functions', () => {
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

  /**
   * Helper to create a call expression for chart functions
   */
  function createCallExpr(
    method: string,
    args: unknown[]
  ): CompiledExpression {
    return {
      expr: 'call',
      target: null,
      method,
      args: args.map(arg => {
        if (typeof arg === 'object' && arg !== null && 'expr' in arg) {
          return arg;
        }
        return { expr: 'lit', value: arg };
      }),
    } as CompiledExpression;
  }

  // ============================================================
  // 1. COORDINATE CALCULATION
  // ============================================================

  describe('normalizeValue', () => {
    describe('basic functionality', () => {
      it('should normalize value to 0.5 when value is midpoint', () => {
        // Arrange
        // DSL: normalizeValue(50, 0, 100) -> 0.5
        const expr = createCallExpr('normalizeValue', [50, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0.5);
      });

      it('should return 0 when value equals min', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [0, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 1 when value equals max', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [100, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(1);
      });

      it('should handle negative ranges', () => {
        // Arrange
        // normalizeValue(-50, -100, 0) -> 0.5
        const expr = createCallExpr('normalizeValue', [-50, -100, 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0.5);
      });

      it('should handle values outside range (below min)', () => {
        // Arrange
        // normalizeValue(-10, 0, 100) -> -0.1 (clamped or unclamped?)
        const expr = createCallExpr('normalizeValue', [-10, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(-0.1);
      });

      it('should handle values outside range (above max)', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [150, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(1.5);
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'normalizeValue',
          args: [
            { expr: 'state', name: 'value' },
            { expr: 'state', name: 'min' },
            { expr: 'state', name: 'max' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ value: 75, min: 0, max: 100 });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0.75);
      });
    });

    describe('edge cases', () => {
      it('should return 0 when min equals max (avoid division by zero)', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [50, 100, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });

      it('should handle floating point values', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [0.5, 0, 1]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeCloseTo(0.5);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for non-numeric value', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', ['fifty', 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-numeric min', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [50, 'zero', 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-numeric max', () => {
        // Arrange
        const expr = createCallExpr('normalizeValue', [50, 0, 'hundred']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('scaleValue', () => {
    describe('basic functionality', () => {
      it('should scale normalized value to target range', () => {
        // Arrange
        // scaleValue(0.5, 0, 1, 0, 100) -> 50
        const expr = createCallExpr('scaleValue', [0.5, 0, 1, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(50);
      });

      it('should scale from one range to another', () => {
        // Arrange
        // scaleValue(50, 0, 100, 0, 200) -> 100
        const expr = createCallExpr('scaleValue', [50, 0, 100, 0, 200]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(100);
      });

      it('should handle inverted ranges', () => {
        // Arrange
        // scaleValue(0.5, 0, 1, 100, 0) -> 50 (inverted target range)
        const expr = createCallExpr('scaleValue', [0.5, 0, 1, 100, 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(50);
      });

      it('should handle negative target range', () => {
        // Arrange
        // scaleValue(0.5, 0, 1, -100, 100) -> 0
        const expr = createCallExpr('scaleValue', [0.5, 0, 1, -100, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'scaleValue',
          args: [
            { expr: 'state', name: 'value' },
            { expr: 'state', name: 'domainMin' },
            { expr: 'state', name: 'domainMax' },
            { expr: 'state', name: 'rangeMin' },
            { expr: 'state', name: 'rangeMax' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          value: 25,
          domainMin: 0,
          domainMax: 100,
          rangeMin: 0,
          rangeMax: 400,
        });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(100);
      });
    });

    describe('edge cases', () => {
      it('should return rangeMin when domainMin equals domainMax', () => {
        // Arrange
        const expr = createCallExpr('scaleValue', [50, 50, 50, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for non-numeric inputs', () => {
        // Arrange
        const expr = createCallExpr('scaleValue', ['value', 0, 1, 0, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('getBarDimensions', () => {
    describe('basic functionality - vertical bars', () => {
      it('should return correct dimensions for first bar', () => {
        // Arrange
        // getBarDimensions([10, 20, 30], 0, 300, 200, 10, 'vertical')
        const data = [10, 20, 30];
        const expr = createCallExpr('getBarDimensions', [data, 0, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { x: number; y: number; width: number; height: number };

        // Assert
        expect(result).toHaveProperty('x');
        expect(result).toHaveProperty('y');
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
        expect(result.x).toBe(10); // gap
        expect(result.width).toBeCloseTo(86.67, 1); // (300 - 4*10) / 3
      });

      it('should return correct dimensions for middle bar', () => {
        // Arrange
        const data = [10, 20, 30];
        const expr = createCallExpr('getBarDimensions', [data, 1, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { x: number; y: number; width: number; height: number };

        // Assert
        expect(result.x).toBeGreaterThan(90); // After first bar + gap
      });

      it('should calculate height based on value', () => {
        // Arrange
        // Max value is 30, so bar with value 30 should have full height
        const data = [10, 20, 30];
        const expr = createCallExpr('getBarDimensions', [data, 2, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { x: number; y: number; width: number; height: number };

        // Assert
        expect(result.height).toBe(200); // Full height for max value
        expect(result.y).toBe(0); // Top of chart
      });
    });

    describe('basic functionality - horizontal bars', () => {
      it('should return correct dimensions for horizontal bar', () => {
        // Arrange
        const data = [10, 20, 30];
        const expr = createCallExpr('getBarDimensions', [data, 0, 300, 200, 10, 'horizontal']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { x: number; y: number; width: number; height: number };

        // Assert
        expect(result.x).toBe(0);
        expect(result.y).toBe(10); // gap
        expect(result.height).toBeCloseTo(56.67, 1); // (200 - 4*10) / 3
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getBarDimensions',
          args: [
            { expr: 'state', name: 'data' },
            { expr: 'state', name: 'index' },
            { expr: 'state', name: 'width' },
            { expr: 'state', name: 'height' },
            { expr: 'state', name: 'gap' },
            { expr: 'lit', value: 'vertical' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          data: [50, 100, 75],
          index: 1,
          width: 400,
          height: 300,
          gap: 20,
        });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toHaveProperty('x');
        expect(result).toHaveProperty('y');
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
      });
    });

    describe('edge cases', () => {
      it('should handle single bar', () => {
        // Arrange
        const data = [100];
        const expr = createCallExpr('getBarDimensions', [data, 0, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { x: number; y: number; width: number; height: number };

        // Assert
        expect(result.width).toBe(280); // 300 - 2*10 (gaps on sides)
        expect(result.height).toBe(200);
      });

      it('should handle zero gap', () => {
        // Arrange
        const data = [10, 20];
        const expr = createCallExpr('getBarDimensions', [data, 0, 200, 100, 0, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { x: number; y: number; width: number; height: number };

        // Assert
        expect(result.x).toBe(0);
        expect(result.width).toBe(100); // 200 / 2
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for empty data', () => {
        // Arrange
        const expr = createCallExpr('getBarDimensions', [[], 0, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for index out of bounds', () => {
        // Arrange
        const data = [10, 20, 30];
        const expr = createCallExpr('getBarDimensions', [data, 5, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('getBarDimensions', ['not array', 0, 300, 200, 10, 'vertical']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ============================================================
  // 2. PATH GENERATION
  // ============================================================

  describe('getLinePath', () => {
    describe('basic functionality', () => {
      it('should generate SVG path for two points', () => {
        // Arrange
        const points = [{ x: 0, y: 10 }, { x: 10, y: 20 }];
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0,10 L10,20');
      });

      it('should generate SVG path for multiple points', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 10, y: 20 },
          { x: 20, y: 15 },
          { x: 30, y: 25 },
        ];
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0,10 L10,20 L20,15 L30,25');
      });

      it('should handle single point', () => {
        // Arrange
        const points = [{ x: 50, y: 50 }];
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M50,50');
      });
    });

    describe('state integration', () => {
      it('should work with points from state', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getLinePath',
          args: [{ expr: 'state', name: 'points' }],
        } as CompiledExpression;
        const ctx = createContext({
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0,0 L100,100');
      });
    });

    describe('edge cases', () => {
      it('should handle floating point coordinates', () => {
        // Arrange
        const points = [{ x: 0.5, y: 10.75 }, { x: 10.25, y: 20.5 }];
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0.5,10.75 L10.25,20.5');
      });

      it('should handle negative coordinates', () => {
        // Arrange
        const points = [{ x: -10, y: -20 }, { x: 10, y: 20 }];
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M-10,-20 L10,20');
      });
    });

    describe('invalid input handling', () => {
      it('should return empty string for empty points array', () => {
        // Arrange
        const expr = createCallExpr('getLinePath', [[]]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('');
      });

      it('should return undefined for non-array input', () => {
        // Arrange
        const expr = createCallExpr('getLinePath', ['not an array']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for points missing x or y', () => {
        // Arrange
        const points = [{ x: 0 }, { y: 20 }];
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('getAreaPath', () => {
    describe('basic functionality', () => {
      it('should generate closed SVG path for area chart', () => {
        // Arrange
        // getAreaPath(points, baseline) where baseline is the y-coordinate for closing
        const points = [{ x: 0, y: 10 }, { x: 10, y: 20 }, { x: 20, y: 15 }];
        const expr = createCallExpr('getAreaPath', [points, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Should start at first point, draw lines, go down to baseline, and close
        expect(result).toBe('M0,10 L10,20 L20,15 L20,100 L0,100 Z');
      });

      it('should handle two points', () => {
        // Arrange
        const points = [{ x: 0, y: 50 }, { x: 100, y: 25 }];
        const expr = createCallExpr('getAreaPath', [points, 200]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0,50 L100,25 L100,200 L0,200 Z');
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getAreaPath',
          args: [
            { expr: 'state', name: 'points' },
            { expr: 'state', name: 'baseline' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          points: [{ x: 0, y: 0 }, { x: 50, y: 25 }, { x: 100, y: 0 }],
          baseline: 100,
        });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0,0 L50,25 L100,0 L100,100 L0,100 Z');
      });
    });

    describe('edge cases', () => {
      it('should handle single point (degenerate case)', () => {
        // Arrange
        const points = [{ x: 50, y: 50 }];
        const expr = createCallExpr('getAreaPath', [points, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M50,50 L50,100 L50,100 Z');
      });
    });

    describe('invalid input handling', () => {
      it('should return empty string for empty points', () => {
        // Arrange
        const expr = createCallExpr('getAreaPath', [[], 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('');
      });

      it('should return undefined for non-numeric baseline', () => {
        // Arrange
        const points = [{ x: 0, y: 10 }];
        const expr = createCallExpr('getAreaPath', [points, 'bottom']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ============================================================
  // 2.1 CURVED LINE PATH (Task 3: curved parameter implementation)
  // ============================================================

  describe('getLinePath with curved parameter', () => {
    /**
     * TDD Red Phase: These tests verify the curved parameter functionality
     * that will be added to getLinePath. The function currently only accepts
     * one argument (points), so tests with curved=true will FAIL.
     *
     * Expected behavior:
     * - getLinePath(points, false) => same as getLinePath(points) - straight lines with L commands
     * - getLinePath(points, true) => smooth curves using C (cubic bezier) commands
     * - getLinePath(points, undefined) => defaults to straight lines (backward compatible)
     */

    describe('curved=false (straight lines)', () => {
      it('should return same path as before with curved=false', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        const expr = createCallExpr('getLinePath', [points, false]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert - should use M and L commands only
        expect(result).toBe('M0,10 L50,5 L100,15');
      });

      it('should generate straight line path for two points with curved=false', () => {
        // Arrange
        const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
        const expr = createCallExpr('getLinePath', [points, false]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M0,0 L100,100');
      });
    });

    describe('curved=true (smooth Catmull-Rom spline)', () => {
      it('should return path with cubic bezier (C) commands when curved=true', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert - should contain C (cubic bezier) commands
        expect(result).toMatch(/^M[\d.,-]+ C[\d.,-]+ [\d.,-]+ [\d.,-]+/);
        expect(result).toContain('C');
      });

      it('should NOT have L commands between points when curved=true', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
          { x: 150, y: 20 },
        ];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        // Should use M for first point, then only C/S commands (no L)
        expect(result).toMatch(/^M/);
        expect(result).not.toMatch(/ L\d/); // No L commands after M
      });

      it('should use M command for the first point when curved=true', () => {
        // Arrange
        const points = [
          { x: 10, y: 20 },
          { x: 50, y: 30 },
          { x: 90, y: 10 },
        ];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toMatch(/^M10,20/);
      });

      it('should pass through all original points when curved=true', () => {
        // Arrange
        // Catmull-Rom splines pass through all control points
        const points = [
          { x: 0, y: 0 },
          { x: 50, y: 100 },
          { x: 100, y: 0 },
        ];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert - the curve should include all points' coordinates
        expect(result).toContain('0,0');
        expect(result).toContain('50,100');
        expect(result).toContain('100,0');
      });

      it('should handle four or more points with smooth curves', () => {
        // Arrange
        const points = [
          { x: 0, y: 50 },
          { x: 25, y: 20 },
          { x: 50, y: 80 },
          { x: 75, y: 30 },
          { x: 100, y: 60 },
        ];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toMatch(/^M/);
        expect(result).toContain('C'); // Should have cubic bezier commands
      });
    });

    describe('curved=undefined (default behavior - backward compatible)', () => {
      it('should behave same as curved=false when curved is undefined', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        // Only pass points, no curved parameter
        const expr = createCallExpr('getLinePath', [points]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert - should use L commands (straight lines)
        expect(result).toBe('M0,10 L50,5 L100,15');
      });
    });

    describe('edge cases with curved=true', () => {
      it('should handle two points with curved=true (falls back to straight line)', () => {
        // Arrange
        // With only 2 points, curved line is just a straight line
        const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert - with 2 points, result should still be valid (either L or C)
        expect(result).toMatch(/^M0,0/);
        expect(result).toContain('100,100');
      });

      it('should handle single point with curved=true', () => {
        // Arrange
        const points = [{ x: 50, y: 50 }];
        const expr = createCallExpr('getLinePath', [points, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('M50,50');
      });

      it('should return empty string for empty points with curved=true', () => {
        // Arrange
        const expr = createCallExpr('getLinePath', [[], true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('');
      });
    });

    describe('state integration with curved parameter', () => {
      it('should work with state values and curved=true', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getLinePath',
          args: [
            { expr: 'state', name: 'points' },
            { expr: 'state', name: 'curved' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          points: [
            { x: 0, y: 10 },
            { x: 50, y: 5 },
            { x: 100, y: 15 },
          ],
          curved: true,
        });

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toContain('C'); // Should have cubic bezier commands
      });
    });
  });

  // ============================================================
  // 2.2 CURVED AREA PATH (Task 3: curved parameter implementation)
  // ============================================================

  describe('getAreaPath with curved parameter', () => {
    /**
     * TDD Red Phase: These tests verify the curved parameter functionality
     * that will be added to getAreaPath. The function currently only accepts
     * two arguments (points, baseline), so tests with curved will FAIL.
     *
     * Expected behavior:
     * - getAreaPath(points, baseline, false) => same as before - straight lines
     * - getAreaPath(points, baseline, true) => upper line uses C commands (curved),
     *   closing path (back to baseline) still uses L commands
     * - getAreaPath(points, baseline, undefined) => defaults to straight lines
     */

    describe('curved=false (straight lines)', () => {
      it('should return same path as before with curved=false', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        const expr = createCallExpr('getAreaPath', [points, 100, false]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert - should use M, L, and Z commands only
        expect(result).toBe('M0,10 L50,5 L100,15 L100,100 L0,100 Z');
      });
    });

    describe('curved=true (smooth upper line)', () => {
      it('should use C commands for upper line when curved=true', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        const expr = createCallExpr('getAreaPath', [points, 100, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert - should contain C (cubic bezier) commands for the upper line
        expect(result).toContain('C');
        expect(result).toMatch(/^M/);
      });

      it('should use L commands for closing path (baseline) when curved=true', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        const expr = createCallExpr('getAreaPath', [points, 100, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert - closing path should still use L commands and Z
        expect(result).toContain('L100,100'); // down to baseline
        expect(result).toContain('L0,100'); // back to start baseline
        expect(result).toContain('Z'); // close path
      });

      it('should start and end at correct positions when curved=true', () => {
        // Arrange
        const points = [
          { x: 0, y: 20 },
          { x: 50, y: 10 },
          { x: 100, y: 30 },
        ];
        const baseline = 80;
        const expr = createCallExpr('getAreaPath', [points, baseline, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toMatch(/^M0,20/); // starts at first point
        expect(result).toContain('100,30'); // ends at last point (upper line)
        expect(result).toContain(`L100,${baseline}`); // goes to baseline
        expect(result).toContain(`L0,${baseline}`); // goes back
        expect(result).toMatch(/Z$/); // closes path
      });

      it('should handle multiple points with smooth curves for upper line', () => {
        // Arrange
        const points = [
          { x: 0, y: 50 },
          { x: 25, y: 20 },
          { x: 50, y: 80 },
          { x: 75, y: 30 },
          { x: 100, y: 60 },
        ];
        const expr = createCallExpr('getAreaPath', [points, 100, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toMatch(/^M/);
        expect(result).toContain('C');
        expect(result).toContain('Z');
      });
    });

    describe('curved=undefined (default behavior - backward compatible)', () => {
      it('should behave same as curved=false when curved is undefined', () => {
        // Arrange
        const points = [
          { x: 0, y: 10 },
          { x: 50, y: 5 },
          { x: 100, y: 15 },
        ];
        // Only pass points and baseline, no curved parameter
        const expr = createCallExpr('getAreaPath', [points, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert - should use L commands (straight lines)
        expect(result).toBe('M0,10 L50,5 L100,15 L100,100 L0,100 Z');
      });
    });

    describe('edge cases with curved=true', () => {
      it('should handle two points with curved=true', () => {
        // Arrange
        const points = [{ x: 0, y: 50 }, { x: 100, y: 25 }];
        const expr = createCallExpr('getAreaPath', [points, 200, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert - should still produce valid area path
        expect(result).toMatch(/^M0,50/);
        expect(result).toContain('100,25');
        expect(result).toContain('Z');
      });

      it('should handle single point with curved=true', () => {
        // Arrange
        const points = [{ x: 50, y: 50 }];
        const expr = createCallExpr('getAreaPath', [points, 100, true]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert - degenerate case, should still close properly
        expect(result).toBe('M50,50 L50,100 L50,100 Z');
      });
    });

    describe('state integration with curved parameter', () => {
      it('should work with state values and curved=true', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getAreaPath',
          args: [
            { expr: 'state', name: 'points' },
            { expr: 'state', name: 'baseline' },
            { expr: 'state', name: 'curved' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          points: [
            { x: 0, y: 10 },
            { x: 50, y: 5 },
            { x: 100, y: 15 },
          ],
          baseline: 100,
          curved: true,
        });

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toContain('C'); // Should have cubic bezier commands
        expect(result).toContain('Z'); // Should close the path
      });
    });
  });

  describe('getArcPath', () => {
    describe('basic functionality', () => {
      it('should generate arc path for quarter circle', () => {
        // Arrange
        // getArcPath(cx, cy, radius, startAngle, endAngle)
        // Angles in radians: 0 to PI/2 (quarter circle)
        const expr = createCallExpr('getArcPath', [100, 100, 50, 0, Math.PI / 2]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toMatch(/^M[\d.]+,[\d.]+ A50,50 0 0,1 [\d.]+,[\d.]+$/);
      });

      it('should generate arc path for half circle', () => {
        // Arrange
        const expr = createCallExpr('getArcPath', [100, 100, 50, 0, Math.PI]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toContain('A50,50');
      });

      it('should generate arc path for full circle (large-arc-flag = 1)', () => {
        // Arrange
        // More than half circle should use large-arc-flag
        const expr = createCallExpr('getArcPath', [100, 100, 50, 0, Math.PI * 1.5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string;

        // Assert
        expect(result).toMatch(/A50,50 0 1,1/); // large-arc-flag = 1
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getArcPath',
          args: [
            { expr: 'state', name: 'cx' },
            { expr: 'state', name: 'cy' },
            { expr: 'state', name: 'radius' },
            { expr: 'state', name: 'startAngle' },
            { expr: 'state', name: 'endAngle' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          cx: 150,
          cy: 150,
          radius: 75,
          startAngle: 0,
          endAngle: Math.PI / 4,
        });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(typeof result).toBe('string');
        expect(result).toContain('A75,75');
      });
    });

    describe('edge cases', () => {
      it('should handle zero-length arc (same start and end)', () => {
        // Arrange
        const expr = createCallExpr('getArcPath', [100, 100, 50, 0, 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Zero-length arc should return empty or minimal path
        expect(typeof result).toBe('string');
      });

      it('should handle very small arc angles', () => {
        // Arrange
        const expr = createCallExpr('getArcPath', [100, 100, 50, 0, 0.001]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(typeof result).toBe('string');
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for non-numeric center', () => {
        // Arrange
        const expr = createCallExpr('getArcPath', ['center', 100, 50, 0, Math.PI]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for negative radius', () => {
        // Arrange
        const expr = createCallExpr('getArcPath', [100, 100, -50, 0, Math.PI]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for zero radius', () => {
        // Arrange
        const expr = createCallExpr('getArcPath', [100, 100, 0, 0, Math.PI]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ============================================================
  // 3. PIE/DONUT CHART
  // ============================================================

  describe('getPieSlices', () => {
    describe('basic functionality', () => {
      it('should calculate slices for simple data', () => {
        // Arrange
        // getPieSlices(data, valueKey)
        const data = [
          { label: 'A', value: 50 },
          { label: 'B', value: 50 },
        ];
        const expr = createCallExpr('getPieSlices', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].startAngle).toBe(0);
        expect(result[0].endAngle).toBeCloseTo(Math.PI, 5);
        expect(result[0].percentage).toBe(50);
        expect(result[1].startAngle).toBeCloseTo(Math.PI, 5);
        expect(result[1].endAngle).toBeCloseTo(Math.PI * 2, 5);
        expect(result[1].percentage).toBe(50);
      });

      it('should calculate slices for unequal values', () => {
        // Arrange
        const data = [
          { label: 'A', value: 25 },
          { label: 'B', value: 75 },
        ];
        const expr = createCallExpr('getPieSlices', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result[0].percentage).toBe(25);
        expect(result[1].percentage).toBe(75);
        expect(result[0].endAngle - result[0].startAngle).toBeCloseTo(Math.PI / 2, 5);
        expect(result[1].endAngle - result[1].startAngle).toBeCloseTo(Math.PI * 1.5, 5);
      });

      it('should include value in each slice', () => {
        // Arrange
        const data = [
          { label: 'A', value: 100 },
          { label: 'B', value: 200 },
          { label: 'C', value: 300 },
        ];
        const expr = createCallExpr('getPieSlices', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result[0].value).toBe(100);
        expect(result[1].value).toBe(200);
        expect(result[2].value).toBe(300);
      });
    });

    describe('state integration', () => {
      it('should work with state data', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getPieSlices',
          args: [
            { expr: 'state', name: 'chartData' },
            { expr: 'lit', value: 'amount' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          chartData: [
            { category: 'X', amount: 10 },
            { category: 'Y', amount: 20 },
            { category: 'Z', amount: 30 },
          ],
        });

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].percentage).toBeCloseTo(16.67, 1);
        expect(result[1].percentage).toBeCloseTo(33.33, 1);
        expect(result[2].percentage).toBe(50);
      });
    });

    describe('edge cases', () => {
      it('should handle single item (full circle)', () => {
        // Arrange
        const data = [{ label: 'A', value: 100 }];
        const expr = createCallExpr('getPieSlices', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].startAngle).toBe(0);
        expect(result[0].endAngle).toBeCloseTo(Math.PI * 2, 5);
        expect(result[0].percentage).toBe(100);
      });

      it('should handle items with zero value', () => {
        // Arrange
        const data = [
          { label: 'A', value: 100 },
          { label: 'B', value: 0 },
          { label: 'C', value: 100 },
        ];
        const expr = createCallExpr('getPieSlices', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result).toHaveLength(3);
        expect(result[1].percentage).toBe(0);
        expect(result[1].startAngle).toBe(result[1].endAngle);
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for empty data', () => {
        // Arrange
        const expr = createCallExpr('getPieSlices', [[], 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('getPieSlices', ['not array', 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-string valueKey', () => {
        // Arrange
        const data = [{ value: 100 }];
        const expr = createCallExpr('getPieSlices', [data, 123]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should handle all zero values (total = 0)', () => {
        // Arrange
        const data = [
          { label: 'A', value: 0 },
          { label: 'B', value: 0 },
        ];
        const expr = createCallExpr('getPieSlices', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        // All slices should have 0 percentage
        expect(result.every(s => s.percentage === 0)).toBe(true);
      });
    });
  });

  describe('getDonutSlices', () => {
    describe('basic functionality', () => {
      it('should calculate donut slices with inner radius', () => {
        // Arrange
        // getDonutSlices(data, valueKey, innerRadius)
        const data = [
          { label: 'A', value: 50 },
          { label: 'B', value: 50 },
        ];
        const expr = createCallExpr('getDonutSlices', [data, 'value', 30]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          outerRadius: number;
          innerRadius: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].innerRadius).toBe(30);
        expect(result[1].innerRadius).toBe(30);
      });

      it('should include outer radius (default or calculated)', () => {
        // Arrange
        const data = [{ label: 'A', value: 100 }];
        const expr = createCallExpr('getDonutSlices', [data, 'value', 25]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          startAngle: number;
          endAngle: number;
          outerRadius: number;
          innerRadius: number;
          value: number;
          percentage: number;
        }>;

        // Assert
        expect(result[0]).toHaveProperty('outerRadius');
        expect(result[0].outerRadius).toBeGreaterThan(result[0].innerRadius);
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getDonutSlices',
          args: [
            { expr: 'state', name: 'data' },
            { expr: 'lit', value: 'value' },
            { expr: 'state', name: 'innerRadius' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          data: [
            { value: 30 },
            { value: 70 },
          ],
          innerRadius: 40,
        });

        // Act
        const result = evaluate(expr, ctx) as Array<{
          innerRadius: number;
        }>;

        // Assert
        expect(result[0].innerRadius).toBe(40);
        expect(result[1].innerRadius).toBe(40);
      });
    });

    describe('edge cases', () => {
      it('should handle zero inner radius (becomes pie chart)', () => {
        // Arrange
        const data = [{ label: 'A', value: 100 }];
        const expr = createCallExpr('getDonutSlices', [data, 'value', 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          innerRadius: number;
        }>;

        // Assert
        expect(result[0].innerRadius).toBe(0);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for negative inner radius', () => {
        // Arrange
        const data = [{ value: 100 }];
        const expr = createCallExpr('getDonutSlices', [data, 'value', -10]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ============================================================
  // 4. RADAR CHART
  // ============================================================

  describe('getRadarPoints', () => {
    describe('basic functionality', () => {
      it('should convert data to polygon points', () => {
        // Arrange
        // getRadarPoints(data, valueKey, cx, cy, radius, maxValue)
        const data = [
          { axis: 'A', value: 100 },
          { axis: 'B', value: 100 },
          { axis: 'C', value: 100 },
        ];
        const expr = createCallExpr('getRadarPoints', [data, 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(3);
        // All points should be at max radius (50) from center
        result.forEach(point => {
          const distance = Math.sqrt(Math.pow(point.x - 100, 2) + Math.pow(point.y - 100, 2));
          expect(distance).toBeCloseTo(50, 1);
        });
      });

      it('should scale points based on value', () => {
        // Arrange
        const data = [
          { axis: 'A', value: 50 },
          { axis: 'B', value: 100 },
          { axis: 'C', value: 25 },
        ];
        const expr = createCallExpr('getRadarPoints', [data, 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(3);
        // Point B (value=100) should be furthest from center
        const distances = result.map(point =>
          Math.sqrt(Math.pow(point.x - 100, 2) + Math.pow(point.y - 100, 2))
        );
        expect(distances[1]).toBeGreaterThan(distances[0]);
        expect(distances[1]).toBeGreaterThan(distances[2]);
      });

      it('should distribute points evenly around center', () => {
        // Arrange
        // 4 axes = 90 degrees apart
        const data = [
          { axis: 'A', value: 100 },
          { axis: 'B', value: 100 },
          { axis: 'C', value: 100 },
          { axis: 'D', value: 100 },
        ];
        const expr = createCallExpr('getRadarPoints', [data, 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(4);
        // First point should be at top (or right, depending on implementation)
        // Points should be 90 degrees apart
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getRadarPoints',
          args: [
            { expr: 'state', name: 'data' },
            { expr: 'lit', value: 'score' },
            { expr: 'state', name: 'cx' },
            { expr: 'state', name: 'cy' },
            { expr: 'state', name: 'radius' },
            { expr: 'state', name: 'maxValue' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          data: [
            { skill: 'JS', score: 90 },
            { skill: 'CSS', score: 80 },
            { skill: 'HTML', score: 95 },
          ],
          cx: 150,
          cy: 150,
          radius: 100,
          maxValue: 100,
        });

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(3);
      });
    });

    describe('edge cases', () => {
      it('should handle single data point', () => {
        // Arrange
        const data = [{ axis: 'A', value: 100 }];
        const expr = createCallExpr('getRadarPoints', [data, 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(1);
      });

      it('should handle zero values', () => {
        // Arrange
        const data = [
          { axis: 'A', value: 0 },
          { axis: 'B', value: 0 },
        ];
        const expr = createCallExpr('getRadarPoints', [data, 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        // All points should be at center
        result.forEach(point => {
          expect(point.x).toBeCloseTo(100, 1);
          expect(point.y).toBeCloseTo(100, 1);
        });
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for empty data', () => {
        // Arrange
        const expr = createCallExpr('getRadarPoints', [[], 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('getRadarPoints', ['not array', 'value', 100, 100, 50, 100]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for zero maxValue', () => {
        // Arrange
        const data = [{ value: 50 }];
        const expr = createCallExpr('getRadarPoints', [data, 'value', 100, 100, 50, 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('getRadarAxes', () => {
    describe('basic functionality', () => {
      it('should return axis line coordinates', () => {
        // Arrange
        // getRadarAxes(labels, cx, cy, radius)
        const labels = ['A', 'B', 'C'];
        const expr = createCallExpr('getRadarAxes', [labels, 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          label: string;
          angle: number;
        }>;

        // Assert
        expect(result).toHaveLength(3);
        result.forEach(axis => {
          expect(axis).toHaveProperty('x1');
          expect(axis).toHaveProperty('y1');
          expect(axis).toHaveProperty('x2');
          expect(axis).toHaveProperty('y2');
          expect(axis).toHaveProperty('label');
          expect(axis).toHaveProperty('angle');
        });
      });

      it('should start all axes from center', () => {
        // Arrange
        const labels = ['A', 'B'];
        const expr = createCallExpr('getRadarAxes', [labels, 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          x1: number;
          y1: number;
          x2: number;
          y2: number;
        }>;

        // Assert
        result.forEach(axis => {
          expect(axis.x1).toBe(100);
          expect(axis.y1).toBe(100);
        });
      });

      it('should include label for each axis', () => {
        // Arrange
        const labels = ['Speed', 'Power', 'Defense'];
        const expr = createCallExpr('getRadarAxes', [labels, 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          label: string;
        }>;

        // Assert
        expect(result[0].label).toBe('Speed');
        expect(result[1].label).toBe('Power');
        expect(result[2].label).toBe('Defense');
      });

      it('should include angle for each axis', () => {
        // Arrange
        const labels = ['A', 'B', 'C', 'D']; // 4 axes = 90 degrees apart
        const expr = createCallExpr('getRadarAxes', [labels, 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          angle: number;
        }>;

        // Assert
        const angleDiff = result[1].angle - result[0].angle;
        expect(angleDiff).toBeCloseTo(Math.PI / 2, 5); // 90 degrees in radians
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getRadarAxes',
          args: [
            { expr: 'state', name: 'labels' },
            { expr: 'state', name: 'cx' },
            { expr: 'state', name: 'cy' },
            { expr: 'state', name: 'radius' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          labels: ['Attack', 'Defense', 'Speed'],
          cx: 200,
          cy: 200,
          radius: 100,
        });

        // Act
        const result = evaluate(expr, ctx) as Array<{
          x1: number;
          y1: number;
        }>;

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].x1).toBe(200);
        expect(result[0].y1).toBe(200);
      });
    });

    describe('edge cases', () => {
      it('should handle single label', () => {
        // Arrange
        const labels = ['Only'];
        const expr = createCallExpr('getRadarAxes', [labels, 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          label: string;
        }>;

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Only');
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for empty labels', () => {
        // Arrange
        const expr = createCallExpr('getRadarAxes', [[], 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return undefined for non-array labels', () => {
        // Arrange
        const expr = createCallExpr('getRadarAxes', ['not array', 100, 100, 50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for negative radius', () => {
        // Arrange
        const labels = ['A', 'B'];
        const expr = createCallExpr('getRadarAxes', [labels, 100, 100, -50]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ============================================================
  // 5. UTILITIES
  // ============================================================

  describe('getChartBounds', () => {
    describe('basic functionality', () => {
      it('should return min and max from array of objects', () => {
        // Arrange
        // getChartBounds(data, valueKey)
        const data = [
          { x: 1, y: 10 },
          { x: 2, y: 50 },
          { x: 3, y: 30 },
        ];
        const expr = createCallExpr('getChartBounds', [data, 'y']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { min: number; max: number };

        // Assert
        expect(result).toEqual({ min: 10, max: 50 });
      });

      it('should handle negative values', () => {
        // Arrange
        const data = [
          { value: -100 },
          { value: 50 },
          { value: -25 },
        ];
        const expr = createCallExpr('getChartBounds', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { min: number; max: number };

        // Assert
        expect(result).toEqual({ min: -100, max: 50 });
      });

      it('should handle single item', () => {
        // Arrange
        const data = [{ value: 42 }];
        const expr = createCallExpr('getChartBounds', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { min: number; max: number };

        // Assert
        expect(result).toEqual({ min: 42, max: 42 });
      });
    });

    describe('state integration', () => {
      it('should work with state data', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'getChartBounds',
          args: [
            { expr: 'state', name: 'data' },
            { expr: 'lit', value: 'price' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          data: [
            { date: '2024-01', price: 100 },
            { date: '2024-02', price: 150 },
            { date: '2024-03', price: 120 },
          ],
        });

        // Act
        const result = evaluate(expr, ctx) as { min: number; max: number };

        // Assert
        expect(result).toEqual({ min: 100, max: 150 });
      });
    });

    describe('edge cases', () => {
      it('should handle all same values', () => {
        // Arrange
        const data = [
          { value: 50 },
          { value: 50 },
          { value: 50 },
        ];
        const expr = createCallExpr('getChartBounds', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { min: number; max: number };

        // Assert
        expect(result).toEqual({ min: 50, max: 50 });
      });

      it('should handle floating point values', () => {
        // Arrange
        const data = [
          { value: 0.1 },
          { value: 0.9 },
          { value: 0.5 },
        ];
        const expr = createCallExpr('getChartBounds', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as { min: number; max: number };

        // Assert
        expect(result.min).toBeCloseTo(0.1);
        expect(result.max).toBeCloseTo(0.9);
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for empty data', () => {
        // Arrange
        const expr = createCallExpr('getChartBounds', [[], 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('getChartBounds', ['not array', 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for missing value key', () => {
        // Arrange
        const data = [{ x: 10 }, { y: 20 }];
        const expr = createCallExpr('getChartBounds', [data, 'value']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('generateTicks', () => {
    describe('basic functionality', () => {
      it('should generate nice tick values', () => {
        // Arrange
        // generateTicks(min, max, count)
        const expr = createCallExpr('generateTicks', [0, 100, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toEqual([0, 25, 50, 75, 100]);
      });

      it('should generate ticks for non-zero starting point', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [10, 50, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toHaveLength(5);
        expect(result[0]).toBe(10);
        expect(result[result.length - 1]).toBe(50);
      });

      it('should handle negative ranges', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [-100, 0, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toEqual([-100, -75, -50, -25, 0]);
      });

      it('should generate round numbers when possible', () => {
        // Arrange
        // For 0-97, should prefer [0, 25, 50, 75, 100] over exact divisions
        const expr = createCallExpr('generateTicks', [0, 97, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        // Should use nice round numbers
        expect(result.every(tick => tick % 5 === 0 || tick % 10 === 0)).toBe(true);
      });
    });

    describe('state integration', () => {
      it('should work with state values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'generateTicks',
          args: [
            { expr: 'state', name: 'min' },
            { expr: 'state', name: 'max' },
            { expr: 'state', name: 'tickCount' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ min: 0, max: 1000, tickCount: 6 });

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toHaveLength(6);
        expect(result[0]).toBe(0);
        expect(result[result.length - 1]).toBe(1000);
      });
    });

    describe('edge cases', () => {
      it('should handle min equals max', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [50, 50, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toEqual([50]);
      });

      it('should handle count of 1', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [0, 100, 1]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toHaveLength(1);
      });

      it('should handle count of 2', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [0, 100, 2]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toEqual([0, 100]);
      });

      it('should handle floating point range', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [0, 1, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as number[];

        // Assert
        expect(result).toHaveLength(5);
        expect(result[0]).toBe(0);
        expect(result[result.length - 1]).toBe(1);
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for non-numeric min', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', ['zero', 100, 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array for non-positive count', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [0, 100, 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array for negative count', () => {
        // Arrange
        const expr = createCallExpr('generateTicks', [0, 100, -5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  // ============================================================
  // 6. DATA AGGREGATION
  // ============================================================

  describe('binData', () => {
    describe('basic functionality', () => {
      it('should group data into bins', () => {
        // Arrange
        // binData(data, valueKey, binCount)
        const data = [
          { value: 5 },
          { value: 15 },
          { value: 25 },
          { value: 35 },
          { value: 45 },
        ];
        const expr = createCallExpr('binData', [data, 'value', 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          binStart: number;
          binEnd: number;
          count: number;
          values: number[];
        }>;

        // Assert
        expect(result).toHaveLength(5);
        result.forEach(bin => {
          expect(bin).toHaveProperty('binStart');
          expect(bin).toHaveProperty('binEnd');
          expect(bin).toHaveProperty('count');
          expect(bin).toHaveProperty('values');
        });
      });

      it('should correctly count items in each bin', () => {
        // Arrange
        const data = [
          { value: 10 },
          { value: 20 },
          { value: 21 },
          { value: 22 },
          { value: 50 },
        ];
        const expr = createCallExpr('binData', [data, 'value', 3]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          count: number;
        }>;

        // Assert
        // Total count should equal data length
        const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
        expect(totalCount).toBe(5);
      });

      it('should include original values in each bin', () => {
        // Arrange
        const data = [
          { value: 5 },
          { value: 10 },
          { value: 15 },
        ];
        const expr = createCallExpr('binData', [data, 'value', 2]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          values: number[];
        }>;

        // Assert
        const allValues = result.flatMap(bin => bin.values);
        expect(allValues.sort((a, b) => a - b)).toEqual([5, 10, 15]);
      });
    });

    describe('state integration', () => {
      it('should work with state data', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'binData',
          args: [
            { expr: 'state', name: 'data' },
            { expr: 'lit', value: 'score' },
            { expr: 'state', name: 'bins' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          data: [
            { score: 65 },
            { score: 72 },
            { score: 88 },
            { score: 95 },
          ],
          bins: 4,
        });

        // Act
        const result = evaluate(expr, ctx) as Array<{
          count: number;
        }>;

        // Assert
        expect(result).toHaveLength(4);
      });
    });

    describe('edge cases', () => {
      it('should handle single bin', () => {
        // Arrange
        const data = [{ value: 10 }, { value: 50 }, { value: 90 }];
        const expr = createCallExpr('binData', [data, 'value', 1]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          count: number;
        }>;

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].count).toBe(3);
      });

      it('should handle data with same values', () => {
        // Arrange
        const data = [
          { value: 50 },
          { value: 50 },
          { value: 50 },
        ];
        const expr = createCallExpr('binData', [data, 'value', 3]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{
          count: number;
        }>;

        // Assert
        // All items should be in same bin
        const totalCount = result.reduce((sum, bin) => sum + bin.count, 0);
        expect(totalCount).toBe(3);
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for empty data', () => {
        // Arrange
        const expr = createCallExpr('binData', [[], 'value', 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('binData', ['not array', 'value', 5]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return empty array for non-positive binCount', () => {
        // Arrange
        const data = [{ value: 10 }];
        const expr = createCallExpr('binData', [data, 'value', 0]);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  describe('aggregateData', () => {
    describe('basic functionality - sum', () => {
      it('should aggregate data by group with sum', () => {
        // Arrange
        // aggregateData(data, groupKey, valueKey, aggregation)
        const data = [
          { category: 'A', value: 10 },
          { category: 'A', value: 20 },
          { category: 'B', value: 30 },
          { category: 'B', value: 40 },
        ];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'sum']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        expect(result).toHaveLength(2);
        const groupA = result.find(r => r.group === 'A');
        const groupB = result.find(r => r.group === 'B');
        expect(groupA?.value).toBe(30);
        expect(groupB?.value).toBe(70);
      });
    });

    describe('basic functionality - avg', () => {
      it('should aggregate data by group with average', () => {
        // Arrange
        const data = [
          { category: 'A', value: 10 },
          { category: 'A', value: 20 },
          { category: 'B', value: 30 },
        ];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'avg']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        const groupA = result.find(r => r.group === 'A');
        const groupB = result.find(r => r.group === 'B');
        expect(groupA?.value).toBe(15); // (10+20)/2
        expect(groupB?.value).toBe(30);
      });
    });

    describe('basic functionality - min', () => {
      it('should aggregate data by group with min', () => {
        // Arrange
        const data = [
          { category: 'A', value: 10 },
          { category: 'A', value: 5 },
          { category: 'A', value: 15 },
        ];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'min']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        expect(result[0].value).toBe(5);
      });
    });

    describe('basic functionality - max', () => {
      it('should aggregate data by group with max', () => {
        // Arrange
        const data = [
          { category: 'A', value: 10 },
          { category: 'A', value: 25 },
          { category: 'A', value: 15 },
        ];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'max']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        expect(result[0].value).toBe(25);
      });
    });

    describe('basic functionality - count', () => {
      it('should aggregate data by group with count', () => {
        // Arrange
        const data = [
          { category: 'A', value: 10 },
          { category: 'A', value: 20 },
          { category: 'B', value: 30 },
        ];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'count']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        const groupA = result.find(r => r.group === 'A');
        const groupB = result.find(r => r.group === 'B');
        expect(groupA?.value).toBe(2);
        expect(groupB?.value).toBe(1);
      });
    });

    describe('state integration', () => {
      it('should work with state data', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'aggregateData',
          args: [
            { expr: 'state', name: 'sales' },
            { expr: 'lit', value: 'region' },
            { expr: 'lit', value: 'amount' },
            { expr: 'state', name: 'aggregationType' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          sales: [
            { region: 'East', amount: 100 },
            { region: 'East', amount: 200 },
            { region: 'West', amount: 150 },
          ],
          aggregationType: 'sum',
        });

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        const east = result.find(r => r.group === 'East');
        expect(east?.value).toBe(300);
      });
    });

    describe('edge cases', () => {
      it('should handle single group', () => {
        // Arrange
        const data = [
          { category: 'A', value: 10 },
          { category: 'A', value: 20 },
        ];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'sum']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ group: string; value: number }>;

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].value).toBe(30);
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for empty data', () => {
        // Arrange
        const expr = createCallExpr('aggregateData', [[], 'category', 'value', 'sum']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('aggregateData', ['not array', 'category', 'value', 'sum']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for invalid aggregation type', () => {
        // Arrange
        const data = [{ category: 'A', value: 10 }];
        const expr = createCallExpr('aggregateData', [data, 'category', 'value', 'invalid']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('downsample', () => {
    describe('basic functionality - uniform', () => {
      it('should reduce data points using uniform sampling', () => {
        // Arrange
        // downsample(data, targetCount, method)
        const data = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 2 }));
        const expr = createCallExpr('downsample', [data, 10, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(10);
      });

      it('should preserve first and last points with uniform', () => {
        // Arrange
        const data = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i }));
        const expr = createCallExpr('downsample', [data, 5, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result[0].x).toBe(0);
        expect(result[result.length - 1].x).toBe(49);
      });
    });

    describe('basic functionality - lttb', () => {
      it('should reduce data points using LTTB algorithm', () => {
        // Arrange
        // LTTB (Largest Triangle Three Buckets) preserves visual shape
        const data = Array.from({ length: 100 }, (_, i) => ({
          x: i,
          y: Math.sin(i / 10) * 50,
        }));
        const expr = createCallExpr('downsample', [data, 20, 'lttb']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result).toHaveLength(20);
      });

      it('should preserve first and last points with LTTB', () => {
        // Arrange
        const data = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i }));
        const expr = createCallExpr('downsample', [data, 10, 'lttb']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        expect(result[0].x).toBe(0);
        expect(result[result.length - 1].x).toBe(99);
      });

      it('should preserve peaks better than uniform sampling', () => {
        // Arrange
        // Data with a clear peak that LTTB should preserve
        const data = [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 100 }, // Peak
          { x: 3, y: 0 },
          { x: 4, y: 0 },
        ];
        const expr = createCallExpr('downsample', [data, 3, 'lttb']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number; y: number }>;

        // Assert
        // LTTB should preserve the peak at x=2
        expect(result.some(p => p.y === 100)).toBe(true);
      });
    });

    describe('state integration', () => {
      it('should work with state data', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: null,
          method: 'downsample',
          args: [
            { expr: 'state', name: 'timeSeries' },
            { expr: 'state', name: 'targetPoints' },
            { expr: 'lit', value: 'lttb' },
          ],
        } as CompiledExpression;
        const ctx = createContext({
          timeSeries: Array.from({ length: 1000 }, (_, i) => ({
            timestamp: i,
            value: Math.random() * 100,
          })),
          targetPoints: 100,
        });

        // Act
        const result = evaluate(expr, ctx) as unknown[];

        // Assert
        expect(result).toHaveLength(100);
      });
    });

    describe('edge cases', () => {
      it('should return original data when targetCount >= data length', () => {
        // Arrange
        const data = [{ x: 1 }, { x: 2 }, { x: 3 }];
        const expr = createCallExpr('downsample', [data, 5, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual(data);
      });

      it('should handle targetCount of 1', () => {
        // Arrange
        const data = Array.from({ length: 10 }, (_, i) => ({ x: i }));
        const expr = createCallExpr('downsample', [data, 1, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as unknown[];

        // Assert
        expect(result).toHaveLength(1);
      });

      it('should handle targetCount of 2', () => {
        // Arrange
        const data = Array.from({ length: 10 }, (_, i) => ({ x: i }));
        const expr = createCallExpr('downsample', [data, 2, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as Array<{ x: number }>;

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].x).toBe(0);
        expect(result[1].x).toBe(9);
      });
    });

    describe('invalid input handling', () => {
      it('should return empty array for empty data', () => {
        // Arrange
        const expr = createCallExpr('downsample', [[], 10, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return undefined for non-array data', () => {
        // Arrange
        const expr = createCallExpr('downsample', ['not array', 10, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-positive targetCount', () => {
        // Arrange
        const data = [{ x: 1 }, { x: 2 }];
        const expr = createCallExpr('downsample', [data, 0, 'uniform']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for invalid method', () => {
        // Arrange
        const data = [{ x: 1 }, { x: 2 }];
        const expr = createCallExpr('downsample', [data, 1, 'invalid_method']);
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });
});
