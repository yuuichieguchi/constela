/**
 * Test module for scaleChartY global function.
 *
 * scaleChartY maps a data value to a Y-coordinate within a chart's drawable area,
 * accounting for padding.
 *
 * Signature: scaleChartY(value, boundsMin, boundsMax, height, paddingTop, paddingBottom)
 *
 * The drawable area is: height - paddingTop - paddingBottom
 * Maximum value maps to paddingTop (top of drawable area)
 * Minimum value maps to height - paddingBottom (bottom of drawable area)
 *
 * Coverage:
 * - Maximum value returns paddingTop
 * - Minimum value returns bottom of drawable area
 * - Middle value returns center of drawable area
 * - Equal bounds (all same values) returns center placement
 * - Negative value ranges
 * - Invalid (non-numeric) input returns undefined
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from '../../src/expression/evaluator.js';
import type { EvaluationContext } from '../../src/expression/evaluator.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledExpression } from '@constela/compiler';

describe('scaleChartY global function', () => {
  // ==================== Helper ====================

  function createContext(): EvaluationContext {
    return {
      state: createStateStore({}),
      locals: {},
    };
  }

  /**
   * Creates a call expression for scaleChartY with the given arguments.
   */
  function makeScaleChartYExpr(
    value: unknown,
    boundsMin: unknown,
    boundsMax: unknown,
    height: unknown,
    paddingTop: unknown,
    paddingBottom: unknown
  ): CompiledExpression {
    return {
      expr: 'call',
      target: null,
      method: 'scaleChartY',
      args: [
        { expr: 'lit', value: value },
        { expr: 'lit', value: boundsMin },
        { expr: 'lit', value: boundsMax },
        { expr: 'lit', value: height },
        { expr: 'lit', value: paddingTop },
        { expr: 'lit', value: paddingBottom },
      ],
    } as CompiledExpression;
  }

  // ==================== Happy Path ====================

  describe('when value equals boundsMax (maximum)', () => {
    it('should return paddingTop', () => {
      // Arrange
      // scaleChartY(100, 0, 100, 300, 20, 40)
      // value=100 is the max, so it maps to the top of drawable area = paddingTop = 20
      const expr = makeScaleChartYExpr(100, 0, 100, 300, 20, 40);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(20);
    });
  });

  describe('when value equals boundsMin (minimum)', () => {
    it('should return height minus paddingBottom', () => {
      // Arrange
      // scaleChartY(0, 0, 100, 300, 20, 40)
      // value=0 is the min, so it maps to the bottom of drawable area = height - paddingBottom = 260
      const expr = makeScaleChartYExpr(0, 0, 100, 300, 20, 40);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(260);
    });
  });

  describe('when value is at the midpoint', () => {
    it('should return center of drawable area', () => {
      // Arrange
      // scaleChartY(50, 0, 100, 300, 20, 40)
      // midpoint of drawable area: paddingTop + (height - paddingTop - paddingBottom) / 2
      //   = 20 + (300 - 20 - 40) / 2 = 20 + 120 = 140
      const expr = makeScaleChartYExpr(50, 0, 100, 300, 20, 40);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(140);
    });
  });

  // ==================== Edge Cases ====================

  describe('when boundsMin equals boundsMax (all same values)', () => {
    it('should return center placement', () => {
      // Arrange
      // scaleChartY(50, 50, 50, 300, 20, 40)
      // When min === max, the value should be placed at the center of drawable area = 140
      const expr = makeScaleChartYExpr(50, 50, 50, 300, 20, 40);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(140);
    });
  });

  describe('when values are negative', () => {
    it('should correctly scale negative ranges', () => {
      // Arrange
      // scaleChartY(-50, -100, 0, 300, 20, 40)
      // -50 is the midpoint of [-100, 0], so result should be center = 140
      const expr = makeScaleChartYExpr(-50, -100, 0, 300, 20, 40);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(140);
    });
  });

  describe('when drawableHeight is zero or negative', () => {
    it('should return paddingTop when padding exceeds height', () => {
      // Arrange
      // scaleChartY(50, 0, 100, 50, 30, 30) → drawableHeight = 50-30-30 = -10 → paddingTop
      const expr = makeScaleChartYExpr(50, 0, 100, 50, 30, 30);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBe(30);
    });
  });

  // ==================== Error Handling ====================

  describe('when input is invalid (non-numeric)', () => {
    it('should return undefined for string value', () => {
      // Arrange
      // scaleChartY("not a number", 0, 100, 300, 20, 40)
      const expr = makeScaleChartYExpr('not a number', 0, 100, 300, 20, 40);
      const context = createContext();

      // Act
      const result = evaluate(expr, context);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
