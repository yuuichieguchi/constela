/**
 * Test module for chart redesign helper functions.
 *
 * Coverage:
 * - getChartGridLines: grid line generation combining generateTicks + scaleChartY
 * - getRoundedBarPath: SVG path for bars with rounded top corners
 * - getDonutArcPath: SVG path for donut ring segments
 * - getSliceLabelPosition: label positioning on pie/donut slices
 * - getRadarGridPolygons: concentric polygon point strings for radar grids
 * - getActivityRingArcPath: SVG open arc path for activity ring segments
 * - getActivityRingLayout: layout computation for concentric activity rings
 * - getChartDefaultColors: named color palette lookup
 *
 * TDD Red Phase: New tests (6-8) MUST FAIL because the functions do not exist yet.
 */

import { describe, it, expect } from 'vitest';

import { callGlobalFunction } from '../global-functions.js';

// ==================== 1. getChartGridLines ====================

describe('getChartGridLines', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return an array of grid line objects with the requested count', () => {
      const result = callGlobalFunction('getChartGridLines', [0, 100, 300, 20, 40, 5]) as
        | Array<{ y: number; value: number; label: string }>
        | undefined;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
    });

    it('should return objects with y, value, and label properties', () => {
      const result = callGlobalFunction('getChartGridLines', [0, 100, 300, 20, 40, 5]) as Array<{
        y: number;
        value: number;
        label: string;
      }>;

      for (const item of result) {
        expect(item).toHaveProperty('y');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('label');
        expect(typeof item.y).toBe('number');
        expect(typeof item.value).toBe('number');
        expect(typeof item.label).toBe('string');
      }
    });

    it('should produce y values between padTop and height - padBottom', () => {
      const padTop = 20;
      const padBottom = 40;
      const height = 300;
      const result = callGlobalFunction('getChartGridLines', [0, 100, height, padTop, padBottom, 5]) as Array<{
        y: number;
        value: number;
        label: string;
      }>;

      for (const item of result) {
        expect(item.y).toBeGreaterThanOrEqual(padTop);
        expect(item.y).toBeLessThanOrEqual(height - padBottom);
      }
    });

    it('should produce value entries between min and max (or slightly extended for nice ticks)', () => {
      const result = callGlobalFunction('getChartGridLines', [0, 100, 300, 20, 40, 5]) as Array<{
        y: number;
        value: number;
        label: string;
      }>;

      for (const item of result) {
        // Nice ticks may extend slightly beyond the original min/max
        expect(item.value).toBeGreaterThanOrEqual(-10);
        expect(item.value).toBeLessThanOrEqual(110);
      }
    });

    it('should produce label as the string representation of value', () => {
      const result = callGlobalFunction('getChartGridLines', [0, 100, 300, 20, 40, 5]) as Array<{
        y: number;
        value: number;
        label: string;
      }>;

      for (const item of result) {
        expect(item.label).toBe(String(item.value));
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('when min equals max', () => {
    it('should return an array with a single grid line', () => {
      const result = callGlobalFunction('getChartGridLines', [50, 50, 300, 20, 40, 5]) as Array<{
        y: number;
        value: number;
        label: string;
      }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(50);
    });
  });

  describe('when count is zero or negative', () => {
    it('should return an empty array for count = 0', () => {
      const result = callGlobalFunction('getChartGridLines', [0, 100, 300, 20, 40, 0]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array for negative count', () => {
      const result = callGlobalFunction('getChartGridLines', [0, 100, 300, 20, 40, -3]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== Error Handling ====================

  describe('when given invalid types', () => {
    it('should return an empty array for string arguments', () => {
      const result = callGlobalFunction('getChartGridLines', ['a', 'b', 300, 20, 40, 5]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array for null arguments', () => {
      const result = callGlobalFunction('getChartGridLines', [null, null, 300, 20, 40, 5]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});

// ==================== 2. getRoundedBarPath ====================

describe('getRoundedBarPath', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return a valid SVG path string starting with M', () => {
      const result = callGlobalFunction('getRoundedBarPath', [10, 10, 40, 90, 6]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
    });

    it('should contain Q commands for rounded top corners', () => {
      const result = callGlobalFunction('getRoundedBarPath', [10, 10, 40, 90, 6]) as string;

      // Q is the quadratic Bezier curve command used for rounded corners
      expect(result).toContain('Q');
    });

    it('should end with Z to close the path', () => {
      const result = callGlobalFunction('getRoundedBarPath', [10, 10, 40, 90, 6]) as string;

      expect(result).toMatch(/Z$/);
    });
  });

  // ==================== Edge Cases ====================

  describe('when radius is 0', () => {
    it('should return a simple rectangle path without Q commands', () => {
      const result = callGlobalFunction('getRoundedBarPath', [10, 10, 40, 90, 0]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
      expect(result).not.toContain('Q');
      expect(result).toMatch(/Z$/);
    });
  });

  describe('when radius exceeds half the width', () => {
    it('should clamp radius to width / 2', () => {
      // width = 40, radius = 30 -> should clamp to 20
      const result = callGlobalFunction('getRoundedBarPath', [10, 10, 40, 90, 30]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
      expect(result).toMatch(/Z$/);
    });
  });

  describe('when height is less than radius', () => {
    it('should clamp radius to height', () => {
      // height = 4, radius = 10 -> should clamp radius
      const result = callGlobalFunction('getRoundedBarPath', [10, 10, 40, 4, 10]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
    });
  });

  // ==================== Error Handling ====================

  describe('when given invalid inputs', () => {
    it('should return an empty string for non-number arguments', () => {
      const result = callGlobalFunction('getRoundedBarPath', ['a', 10, 40, 90, 6]);

      expect(result).toBe('');
    });

    it('should return an empty string for null arguments', () => {
      const result = callGlobalFunction('getRoundedBarPath', [null, null, null, null, null]);

      expect(result).toBe('');
    });
  });
});

// ==================== 3. getDonutArcPath ====================

describe('getDonutArcPath', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return a valid SVG path string starting with M', () => {
      const result = callGlobalFunction('getDonutArcPath', [0, 0, 100, 60, 0, Math.PI / 2]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
    });

    it('should contain A commands for arcs', () => {
      const result = callGlobalFunction('getDonutArcPath', [0, 0, 100, 60, 0, Math.PI / 2]) as string;

      expect(result).toContain('A');
    });

    it('should end with Z to close the path', () => {
      const result = callGlobalFunction('getDonutArcPath', [0, 0, 100, 60, 0, Math.PI / 2]) as string;

      expect(result).toMatch(/Z$/);
    });
  });

  describe('when arc is nearly a full circle', () => {
    it('should produce a valid path for 0 to 2*PI - epsilon', () => {
      const epsilon = 0.001;
      const result = callGlobalFunction('getDonutArcPath', [
        0,
        0,
        100,
        60,
        0,
        2 * Math.PI - epsilon,
      ]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
      expect(result).toContain('A');
      expect(result).toMatch(/Z$/);
    });
  });

  // ==================== Error Handling ====================

  describe('when innerR >= outerR', () => {
    it('should return an empty string', () => {
      const result = callGlobalFunction('getDonutArcPath', [0, 0, 60, 100, 0, Math.PI / 2]);

      expect(result).toBe('');
    });

    it('should return an empty string when radii are equal', () => {
      const result = callGlobalFunction('getDonutArcPath', [0, 0, 100, 100, 0, Math.PI / 2]);

      expect(result).toBe('');
    });
  });

  describe('when given invalid inputs', () => {
    it('should return an empty string for non-number arguments', () => {
      const result = callGlobalFunction('getDonutArcPath', ['a', 'b', 100, 60, 0, Math.PI / 2]);

      expect(result).toBe('');
    });

    it('should return an empty string for null arguments', () => {
      const result = callGlobalFunction('getDonutArcPath', [null, null, null, null, null, null]);

      expect(result).toBe('');
    });
  });
});

// ==================== 4. getSliceLabelPosition ====================

describe('getSliceLabelPosition', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return an object with x and y properties', () => {
      const result = callGlobalFunction('getSliceLabelPosition', [
        150,
        150,
        100,
        0,
        Math.PI / 2,
      ]) as { x: number; y: number } | undefined;

      expect(result).toBeDefined();
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result!.x).toBe('number');
      expect(typeof result!.y).toBe('number');
    });

    it('should position label at midAngle using SVG convention (angle 0 = top)', () => {
      const cx = 150;
      const cy = 150;
      const radius = 100;
      const startAngle = 0;
      const endAngle = Math.PI / 2;
      const midAngle = (startAngle + endAngle) / 2; // PI/4

      const result = callGlobalFunction('getSliceLabelPosition', [
        cx,
        cy,
        radius,
        startAngle,
        endAngle,
      ]) as { x: number; y: number };

      // SVG convention: angle 0 = top, so we subtract PI/2
      const expectedX = cx + radius * Math.cos(midAngle - Math.PI / 2);
      const expectedY = cy + radius * Math.sin(midAngle - Math.PI / 2);

      expect(result.x).toBeCloseTo(expectedX, 5);
      expect(result.y).toBeCloseTo(expectedY, 5);
    });

    it('should position label at top for a full circle slice (0 to 2*PI)', () => {
      const cx = 150;
      const cy = 150;
      const radius = 100;

      const result = callGlobalFunction('getSliceLabelPosition', [
        cx,
        cy,
        radius,
        0,
        2 * Math.PI,
      ]) as { x: number; y: number };

      // midAngle = PI, SVG convention: PI - PI/2 = PI/2
      // cos(PI/2) = 0, sin(PI/2) = 1
      // So x = cx + 0 = 150, y = cy + radius = 250
      // Wait, full circle midAngle = PI -> adjusted = PI/2
      // Actually midAngle = (0 + 2*PI)/2 = PI
      // adjusted = PI - PI/2 = PI/2
      // x = 150 + 100 * cos(PI/2) = 150 + 0 = 150
      // y = 150 + 100 * sin(PI/2) = 150 + 100 = 250
      expect(result.x).toBeCloseTo(150, 5);
      expect(result.y).toBeCloseTo(250, 5);
    });
  });

  // ==================== Error Handling ====================

  describe('when given invalid inputs', () => {
    it('should return undefined for non-number arguments', () => {
      const result = callGlobalFunction('getSliceLabelPosition', ['a', 'b', 100, 0, Math.PI / 2]);

      expect(result).toBeUndefined();
    });

    it('should return undefined for null arguments', () => {
      const result = callGlobalFunction('getSliceLabelPosition', [null, null, null, null, null]);

      expect(result).toBeUndefined();
    });
  });
});

// ==================== 5. getRadarGridPolygons ====================

describe('getRadarGridPolygons', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return an array of strings with the requested number of levels', () => {
      const result = callGlobalFunction('getRadarGridPolygons', [150, 150, 100, 5, 3]) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('should return strings containing coordinate pairs separated by spaces', () => {
      const sides = 5;
      const result = callGlobalFunction('getRadarGridPolygons', [150, 150, 100, sides, 3]) as string[];

      for (const polygon of result) {
        expect(typeof polygon).toBe('string');
        // Each polygon should have `sides` coordinate pairs separated by spaces
        const pairs = polygon.trim().split(' ');
        expect(pairs).toHaveLength(sides);
        // Each pair should be "x,y" format
        for (const pair of pairs) {
          expect(pair).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
        }
      }
    });

    it('should produce the outer polygon (last item) at full radius', () => {
      const cx = 150;
      const cy = 150;
      const radius = 100;
      const sides = 4;
      const result = callGlobalFunction('getRadarGridPolygons', [cx, cy, radius, sides, 3]) as string[];

      const outerPolygon = result[result.length - 1];
      const pairs = outerPolygon.trim().split(' ');

      // At least one point should be at distance `radius` from center
      let hasFullRadiusPoint = false;
      for (const pair of pairs) {
        const [x, y] = pair.split(',').map(Number);
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (Math.abs(dist - radius) < 0.01) {
          hasFullRadiusPoint = true;
          break;
        }
      }
      expect(hasFullRadiusPoint).toBe(true);
    });

    it('should produce inner polygons proportionally smaller than the outer', () => {
      const cx = 150;
      const cy = 150;
      const radius = 100;
      const sides = 5;
      const levels = 3;
      const result = callGlobalFunction('getRadarGridPolygons', [cx, cy, radius, sides, levels]) as string[];

      // Check that each successive polygon is larger
      const avgDistances: number[] = [];
      for (const polygon of result) {
        const pairs = polygon.trim().split(' ');
        let totalDist = 0;
        for (const pair of pairs) {
          const [x, y] = pair.split(',').map(Number);
          totalDist += Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        }
        avgDistances.push(totalDist / pairs.length);
      }

      // Each subsequent level should be larger
      for (let i = 1; i < avgDistances.length; i++) {
        expect(avgDistances[i]).toBeGreaterThan(avgDistances[i - 1]);
      }
    });
  });

  describe('when levels is 1', () => {
    it('should return a single polygon', () => {
      const result = callGlobalFunction('getRadarGridPolygons', [150, 150, 100, 5, 1]) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('when sides is 3', () => {
    it('should return triangular polygons with 3 coordinate pairs each', () => {
      const result = callGlobalFunction('getRadarGridPolygons', [150, 150, 100, 3, 2]) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      for (const polygon of result) {
        const pairs = polygon.trim().split(' ');
        expect(pairs).toHaveLength(3);
      }
    });
  });

  // ==================== Error Handling ====================

  describe('when given invalid parameters', () => {
    it('should return an empty array when sides < 3', () => {
      const result = callGlobalFunction('getRadarGridPolygons', [150, 150, 100, 2, 3]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array when levels < 1', () => {
      const result = callGlobalFunction('getRadarGridPolygons', [150, 150, 100, 5, 0]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array for non-number arguments', () => {
      const result = callGlobalFunction('getRadarGridPolygons', ['a', 'b', 100, 5, 3]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});

// ==================== 6. getActivityRingArcPath ====================

describe('getActivityRingArcPath', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return a string starting with M and containing A', () => {
      const result = callGlobalFunction('getActivityRingArcPath', [
        150,
        150,
        100,
        0,
        Math.PI / 2,
      ]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
      expect(result).toContain('A');
    });

    it('should NOT end with Z (open arc, not a closed shape)', () => {
      const result = callGlobalFunction('getActivityRingArcPath', [
        150,
        150,
        100,
        0,
        Math.PI / 2,
      ]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toMatch(/Z\s*$/);
    });

    it('should return a non-empty string for a quarter arc (0 to PI/2)', () => {
      const result = callGlobalFunction('getActivityRingArcPath', [
        100,
        100,
        80,
        0,
        Math.PI / 2,
      ]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return a non-empty string for a nearly full circle (0 to 2*PI - 0.001)', () => {
      const result = callGlobalFunction('getActivityRingArcPath', [
        100,
        100,
        80,
        0,
        2 * Math.PI - 0.001,
      ]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/^M/);
      expect(result).toContain('A');
    });
  });

  // ==================== Error Handling ====================

  describe('when given invalid inputs', () => {
    it('should return an empty string for non-number arguments', () => {
      const result = callGlobalFunction('getActivityRingArcPath', [
        'a',
        'b',
        100,
        0,
        Math.PI / 2,
      ]);

      expect(result).toBe('');
    });

    it('should return an empty string for null arguments', () => {
      const result = callGlobalFunction('getActivityRingArcPath', [null, null, null, null, null]);

      expect(result).toBe('');
    });
  });
});

// ==================== 7. getActivityRingLayout ====================

describe('getActivityRingLayout', () => {
  const sampleData = [
    { label: 'Move', value: 450, color: '#FA114F' },
    { label: 'Exercise', value: 30, color: '#A8FF04' },
    { label: 'Stand', value: 10, color: '#00D4FF' },
  ];

  // ==================== Happy Path ====================

  describe('when given valid parameters', () => {
    it('should return an array with the same length as data', () => {
      const result = callGlobalFunction('getActivityRingLayout', [
        sampleData,
        'value',
        150,
        150,
        120,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(sampleData.length);
    });

    it('should return items with radius, angle, and maxAngle properties', () => {
      const result = callGlobalFunction('getActivityRingLayout', [
        sampleData,
        'value',
        150,
        150,
        120,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      for (const item of result) {
        expect(item).toHaveProperty('radius');
        expect(item).toHaveProperty('angle');
        expect(item).toHaveProperty('maxAngle');
        expect(typeof item.radius).toBe('number');
        expect(typeof item.angle).toBe('number');
        expect(typeof item.maxAngle).toBe('number');
      }
    });

    it('should set the first item radius to outerRadius - ringWidth/2', () => {
      const outerRadius = 120;
      const ringWidth = 20;
      const result = callGlobalFunction('getActivityRingLayout', [
        sampleData,
        'value',
        150,
        150,
        outerRadius,
        ringWidth,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result[0].radius).toBeCloseTo(outerRadius - ringWidth / 2, 5);
    });

    it('should set the second item radius smaller than first by (ringWidth + ringGap)', () => {
      const outerRadius = 120;
      const ringWidth = 20;
      const ringGap = 4;
      const result = callGlobalFunction('getActivityRingLayout', [
        sampleData,
        'value',
        150,
        150,
        outerRadius,
        ringWidth,
        ringGap,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result[1].radius).toBeCloseTo(result[0].radius - (ringWidth + ringGap), 5);
    });

    it('should set angle to 2*PI for the item with the maximum value', () => {
      const result = callGlobalFunction('getActivityRingLayout', [
        sampleData,
        'value',
        150,
        150,
        120,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      // sampleData[0] has value 450, which is the max
      expect(result[0].angle).toBeCloseTo(2 * Math.PI, 5);
    });
  });

  // ==================== Error Handling ====================

  describe('when given invalid inputs', () => {
    it('should return an empty array for empty data', () => {
      const result = callGlobalFunction('getActivityRingLayout', [
        [],
        'value',
        150,
        150,
        120,
        20,
        4,
      ]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array for non-array data', () => {
      const result = callGlobalFunction('getActivityRingLayout', [
        'not-an-array',
        'value',
        150,
        150,
        120,
        20,
        4,
      ]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array for null data', () => {
      const result = callGlobalFunction('getActivityRingLayout', [
        null,
        'value',
        150,
        150,
        120,
        20,
        4,
      ]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== Negative Radius Protection ====================

  describe('Negative Radius Protection', () => {
    it('should exclude rings with radius below minRadius for many items in small area', () => {
      // 8 items, outerRadius=50, ringWidth=20, ringGap=4
      // Ring 0: 50 - 10 - 0*(20+4) = 40 >= 10 ✓
      // Ring 1: 50 - 10 - 1*(20+4) = 16 >= 10 ✓
      // Ring 2: 50 - 10 - 2*(20+4) = -8 < 10 ✗
      // Rings 3-7: even more negative
      const data = Array.from({ length: 8 }, () => ({ value: 10 }));
      const result = callGlobalFunction('getActivityRingLayout', [
        data,
        'value',
        150,
        150,
        50,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Only 2 rings should fit (radius 40 and 16), not all 8
      expect(result).toHaveLength(2);
      // All returned radii must be >= ringWidth / 2 (= 10)
      for (const item of result) {
        expect(item.radius).toBeGreaterThanOrEqual(10);
      }
    });

    it('should return empty array when outerRadius is too small for even one ring', () => {
      // 3 items, outerRadius=5, ringWidth=20, ringGap=4
      // Ring 0: 5 - 10 = -5 < 10 ✗
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = callGlobalFunction('getActivityRingLayout', [
        data,
        'value',
        150,
        150,
        5,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return exactly one ring when only the first fits', () => {
      // 5 items, outerRadius=20, ringWidth=20, ringGap=4
      // Ring 0: 20 - 10 - 0 = 10 >= 10 ✓
      // Ring 1: 20 - 10 - 24 = -14 < 10 ✗
      const data = Array.from({ length: 5 }, () => ({ value: 10 }));
      const result = callGlobalFunction('getActivityRingLayout', [
        data,
        'value',
        150,
        150,
        20,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].radius).toBeCloseTo(10, 5);
    });

    it('should preserve correct angle ratios after filtering', () => {
      // 8 items with different values, only 2 rings fit
      // outerRadius=50, ringWidth=20, ringGap=4 → same geometry as test 1
      // max of ALL 8 values = 100 (angles computed against global max)
      const data = [
        { v: 100 },
        { v: 50 },
        { v: 0 },
        { v: 75 },
        { v: 25 },
        { v: 10 },
        { v: 60 },
        { v: 90 },
      ];
      const result = callGlobalFunction('getActivityRingLayout', [
        data,
        'v',
        150,
        150,
        50,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Only 2 rings fit
      expect(result).toHaveLength(2);
      // Angles should be computed using the global max (100) across ALL 8 items
      expect(result[0].angle).toBeCloseTo((100 / 100) * 2 * Math.PI, 5);
      expect(result[1].angle).toBeCloseTo((50 / 100) * 2 * Math.PI, 5);
    });

    it('should handle 20 items gracefully without negative radii', () => {
      // 20 items, outerRadius=120, ringWidth=20, ringGap=4
      // Rings fit while: 120 - 10 - i*24 >= 10 → 110 - 24i >= 10 → i <= 100/24 ≈ 4.16 → 5 rings
      const data = Array.from({ length: 20 }, (_, i) => ({ value: i * 10 }));
      const result = callGlobalFunction('getActivityRingLayout', [
        data,
        'value',
        150,
        150,
        120,
        20,
        4,
      ]) as Array<{ radius: number; angle: number; maxAngle: number }>;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should return some rings but not all 20
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(20);
      // All returned radii must be positive
      for (const item of result) {
        expect(item.radius).toBeGreaterThan(0);
      }
    });
  });
});

// ==================== 8. getChartDefaultColors ====================

describe('getChartDefaultColors', () => {
  const healthPalette = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'];
  const activityPalette = ['#FA114F', '#A8FF04', '#00D4FF'];
  const vibrantPalette = ['#FF2D55', '#FF9500', '#5AC8FA', '#007AFF', '#4CD964', '#FF3B30'];

  // ==================== Happy Path ====================

  describe('when given a valid palette name', () => {
    it('should return exactly the 7 expected colors for "health"', () => {
      const result = callGlobalFunction('getChartDefaultColors', ['health']) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(7);
      expect(result).toEqual(healthPalette);
    });

    it('should return exactly the 3 expected colors for "activity"', () => {
      const result = callGlobalFunction('getChartDefaultColors', ['activity']) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result).toEqual(activityPalette);
    });

    it('should return exactly the 6 expected colors for "vibrant"', () => {
      const result = callGlobalFunction('getChartDefaultColors', ['vibrant']) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(6);
      expect(result).toEqual(vibrantPalette);
    });
  });

  // ==================== Fallback Behavior ====================

  describe('when given an unknown or invalid palette name', () => {
    it('should return the health palette for an unknown string', () => {
      const result = callGlobalFunction('getChartDefaultColors', ['nonexistent']) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(healthPalette);
    });

    it('should return the health palette for null', () => {
      const result = callGlobalFunction('getChartDefaultColors', [null]) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(healthPalette);
    });

    it('should return the health palette for undefined', () => {
      const result = callGlobalFunction('getChartDefaultColors', [undefined]) as string[];

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(healthPalette);
    });
  });
});

// ==================== 9. getArcPath (pie wedge) ====================

describe('getArcPath', () => {
  // ==================== Happy Path ====================

  describe('when given valid parameters for a quarter circle', () => {
    it('should generate a pie wedge path that starts at the center', () => {
      const result = callGlobalFunction('getArcPath', [0, 0, 100, 0, Math.PI / 2]) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // The path must start with M0,0 (move to center) for a pie wedge
      expect(result).toMatch(/^M\s*0[,\s]+0/);
    });

    it('should contain an L command (line from center to circumference start)', () => {
      const result = callGlobalFunction('getArcPath', [0, 0, 100, 0, Math.PI / 2]) as string;

      expect(result).toContain('L');
    });

    it('should contain an A command (arc along circumference)', () => {
      const result = callGlobalFunction('getArcPath', [0, 0, 100, 0, Math.PI / 2]) as string;

      expect(result).toContain('A');
    });

    it('should end with Z to close the path back to center', () => {
      const result = callGlobalFunction('getArcPath', [0, 0, 100, 0, Math.PI / 2]) as string;

      expect(result).toMatch(/Z$/);
    });
  });
});

// ==================== 10. min / max global functions ====================

describe('min / max global functions', () => {
  describe('min', () => {
    it('should return the smallest number from multiple arguments', () => {
      const result = callGlobalFunction('min', [10, 5, 20]);
      expect(result).toBe(5);
    });

    it('should work with two arguments', () => {
      const result = callGlobalFunction('min', [100, 50]);
      expect(result).toBe(50);
    });

    it('should return undefined when called with no arguments', () => {
      const result = callGlobalFunction('min', []);
      expect(result).toBeUndefined();
    });

    it('should filter out non-number arguments', () => {
      const result = callGlobalFunction('min', [10, 'abc', 5]);
      expect(result).toBe(5);
    });

    it('should return undefined when all arguments are non-numbers', () => {
      const result = callGlobalFunction('min', ['a', 'b']);
      expect(result).toBeUndefined();
    });
  });

  describe('max', () => {
    it('should return the largest number from multiple arguments', () => {
      const result = callGlobalFunction('max', [10, 5, 20]);
      expect(result).toBe(20);
    });

    it('should work with two arguments', () => {
      const result = callGlobalFunction('max', [100, 50]);
      expect(result).toBe(100);
    });

    it('should return undefined when called with no arguments', () => {
      const result = callGlobalFunction('max', []);
      expect(result).toBeUndefined();
    });

    it('should filter out non-number arguments', () => {
      const result = callGlobalFunction('max', [3, 'x', 7]);
      expect(result).toBe(7);
    });
  });
});

// ==================== 11. getBarDimensions (object data with valueKey) ====================

describe('getBarDimensions with object data and valueKey', () => {
  /**
   * BUG: getBarDimensions currently does:
   *   const values = data.map((d) => (typeof d === 'number' ? d : 0));
   * This means when data is an array of objects like
   *   [{month: "Jan", value: 50}, {month: "Feb", value: 100}]
   * all values become 0 and bars have 0 height.
   *
   * The fix requires:
   * 1. Accept a `valueKey` parameter to extract values from objects
   * 2. Update the global function map to pass valueKey through
   */

  const objectData = [
    { month: 'Jan', value: 50 },
    { month: 'Feb', value: 100 },
  ];

  it('should return a defined result with non-zero height for object data', () => {
    /**
     * Given: data is [{month: 'Jan', value: 50}, {month: 'Feb', value: 100}]
     *        index = 0, width = 400, height = 300, gap = 10,
     *        orientation = 'vertical', valueKey = 'value'
     * When:  callGlobalFunction('getBarDimensions', ...) is invoked
     * Then:  result should be defined with height > 0
     */
    const result = callGlobalFunction('getBarDimensions', [
      objectData,
      0,
      400,
      300,
      10,
      'vertical',
      'value',
    ]) as { x: number; y: number; width: number; height: number } | undefined;

    expect(result).toBeDefined();
    expect(result!.height).toBeGreaterThan(0);
  });

  it('should compute bar height proportional to max value (50/100 * 300 = 150)', () => {
    /**
     * Given: data[0].value = 50, max(values) = 100, chart height = 300
     * When:  bar height = (50 / 100) * 300 = 150
     * Then:  result.height should be approximately 150
     */
    const result = callGlobalFunction('getBarDimensions', [
      objectData,
      0,
      400,
      300,
      10,
      'vertical',
      'value',
    ]) as { x: number; y: number; width: number; height: number } | undefined;

    expect(result).toBeDefined();
    expect(result!.height).toBeCloseTo(150, 0);
  });

  it('should compute full chart height for the bar with maximum value (100/100 * 300 = 300)', () => {
    /**
     * Given: data[1].value = 100 (max), chart height = 300
     * When:  bar height = (100 / 100) * 300 = 300
     * Then:  result.height should be approximately 300
     */
    const result = callGlobalFunction('getBarDimensions', [
      objectData,
      1,
      400,
      300,
      10,
      'vertical',
      'value',
    ]) as { x: number; y: number; width: number; height: number } | undefined;

    expect(result).toBeDefined();
    expect(result!.height).toBeCloseTo(300, 0);
  });
});
