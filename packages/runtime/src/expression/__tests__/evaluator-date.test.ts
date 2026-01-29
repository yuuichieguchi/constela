/**
 * Test module for Date Helper Functions.
 *
 * Coverage:
 * - getCalendarDays: Generate calendar grid days for a given month
 * - getWeekDays: Get localized weekday names
 * - getMonthName: Get localized month name
 * - formatDate: Format date strings with locale support
 *
 * TDD Red Phase: These tests verify date helper functions that will be added
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

/**
 * CalendarDay type definition for test expectations
 */
interface CalendarDay {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

describe('Date Helper Functions', () => {
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

  // ==================== getCalendarDays ====================

  describe('getCalendarDays', () => {
    describe('basic functionality', () => {
      it('should return array of day objects for a month', () => {
        // Arrange
        // DSL: getCalendarDays(2024, 0) - January 2024
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(28); // At least 4 weeks
        expect(result.length).toBeLessThanOrEqual(42); // At most 6 weeks
      });

      it('should return day objects with correct structure', () => {
        // Arrange
        // DSL: getCalendarDays(2024, 0)
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        expect(result[0]).toHaveProperty('date');
        expect(result[0]).toHaveProperty('month');
        expect(result[0]).toHaveProperty('year');
        expect(result[0]).toHaveProperty('isCurrentMonth');
        expect(typeof result[0]!.date).toBe('number');
        expect(typeof result[0]!.month).toBe('number');
        expect(typeof result[0]!.year).toBe('number');
        expect(typeof result[0]!.isCurrentMonth).toBe('boolean');
      });

      it('should include all days of the current month', () => {
        // Arrange
        // January 2024 has 31 days
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const currentMonthDays = result.filter(d => d.isCurrentMonth);
        expect(currentMonthDays.length).toBe(31);
        expect(currentMonthDays.map(d => d.date)).toEqual(
          Array.from({ length: 31 }, (_, i) => i + 1)
        );
      });

      it('should start week on Sunday (index 0) by default', () => {
        // Arrange
        // January 1, 2024 is a Monday
        // So the first day of the grid should be Sunday Dec 31, 2023
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        // First day should be Sunday, Dec 31, 2023
        expect(result[0]).toEqual({
          date: 31,
          month: 11,
          year: 2023,
          isCurrentMonth: false,
        });
      });
    });

    describe('previous/next month days', () => {
      it('should include days from previous month to complete first week', () => {
        // Arrange
        // March 2024 starts on Friday
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 2 }, // March
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const prevMonthDays = result.filter(
          d => !d.isCurrentMonth && d.month === 1 // February
        );
        expect(prevMonthDays.length).toBeGreaterThan(0);
        // March 1, 2024 is Friday, so we need 5 days from February (Sun-Thu)
        expect(prevMonthDays.length).toBe(5);
      });

      it('should include days from next month to complete last week', () => {
        // Arrange
        // January 2024 ends on Wednesday
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const nextMonthDays = result.filter(
          d => !d.isCurrentMonth && d.month === 1 // February
        );
        expect(nextMonthDays.length).toBeGreaterThan(0);
        // January 31, 2024 is Wednesday, so we need 3 days from February (Thu-Sat)
        expect(nextMonthDays.length).toBe(3);
      });

      it('should mark previous month days with isCurrentMonth: false', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 2 }, // March
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const prevMonthDays = result.filter(d => d.month === 1);
        prevMonthDays.forEach(day => {
          expect(day.isCurrentMonth).toBe(false);
        });
      });

      it('should mark next month days with isCurrentMonth: false', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 }, // January
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const nextMonthDays = result.filter(d => d.month === 1); // February
        nextMonthDays.forEach(day => {
          expect(day.isCurrentMonth).toBe(false);
        });
      });
    });

    describe('edge cases - month boundaries', () => {
      it('should handle February in leap year (2024)', () => {
        // Arrange
        // February 2024 has 29 days (leap year)
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 1 }, // February
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const currentMonthDays = result.filter(d => d.isCurrentMonth);
        expect(currentMonthDays.length).toBe(29);
        expect(currentMonthDays[28]!.date).toBe(29);
      });

      it('should handle February in non-leap year (2023)', () => {
        // Arrange
        // February 2023 has 28 days
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2023 },
            { expr: 'lit', value: 1 }, // February
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const currentMonthDays = result.filter(d => d.isCurrentMonth);
        expect(currentMonthDays.length).toBe(28);
      });

      it('should handle month that starts on Sunday', () => {
        // Arrange
        // September 2024 starts on Sunday
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 8 }, // September
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        // First day should be September 1st
        expect(result[0]).toEqual({
          date: 1,
          month: 8,
          year: 2024,
          isCurrentMonth: true,
        });
      });

      it('should handle month that ends on Saturday', () => {
        // Arrange
        // August 2024 ends on Saturday
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 7 }, // August
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        // Last day should be August 31st (Saturday)
        const lastDay = result[result.length - 1]!;
        expect(lastDay).toEqual({
          date: 31,
          month: 7,
          year: 2024,
          isCurrentMonth: true,
        });
      });
    });

    describe('edge cases - year transitions', () => {
      it('should handle January with previous year days', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 }, // January
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const prevYearDays = result.filter(d => d.year === 2023);
        expect(prevYearDays.length).toBeGreaterThan(0);
        prevYearDays.forEach(day => {
          expect(day.month).toBe(11); // December
          expect(day.isCurrentMonth).toBe(false);
        });
      });

      it('should handle December with next year days', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 11 }, // December
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as CalendarDay[];

        // Assert
        const nextYearDays = result.filter(d => d.year === 2025);
        expect(nextYearDays.length).toBeGreaterThan(0);
        nextYearDays.forEach(day => {
          expect(day.month).toBe(0); // January
          expect(day.isCurrentMonth).toBe(false);
        });
      });
    });

    describe('invalid input handling', () => {
      it('should handle invalid month (negative)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: -1 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Should return undefined or throw, not crash
        expect(result === undefined || Array.isArray(result)).toBe(true);
      });

      it('should handle invalid month (> 11)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 12 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result === undefined || Array.isArray(result)).toBe(true);
      });

      it('should handle non-numeric input', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getCalendarDays' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'invalid' },
            { expr: 'lit', value: 0 },
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

  // ==================== getWeekDays ====================

  describe('getWeekDays', () => {
    describe('basic functionality', () => {
      it('should return array of 7 weekday names', () => {
        // Arrange
        // DSL: getWeekDays()
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(7);
      });

      it('should return short weekday names in English by default', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        expect(result).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      });

      it('should start with Sunday (index 0)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        expect(result[0]).toBe('Sun');
        expect(result[6]).toBe('Sat');
      });
    });

    describe('locale support', () => {
      it('should return English weekday names for en-US locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [{ expr: 'lit', value: 'en-US' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        expect(result).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      });

      it('should return Japanese weekday names for ja-JP locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [{ expr: 'lit', value: 'ja-JP' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        expect(result).toEqual(['日', '月', '火', '水', '木', '金', '土']);
      });

      it('should handle locale with state reference', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [{ expr: 'state', name: 'locale' }],
        } as CompiledExpression;
        const ctx = createContext({ locale: 'ja-JP' });

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        expect(result).toEqual(['日', '月', '火', '水', '木', '金', '土']);
      });
    });

    describe('invalid input handling', () => {
      it('should fallback to en-US for invalid locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [{ expr: 'lit', value: 'invalid-locale' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        // Should return valid result (either default or throw)
        expect(Array.isArray(result) && result.length === 7).toBe(true);
      });

      it('should handle null locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getWeekDays' },
          method: 'call',
          args: [{ expr: 'lit', value: null }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx) as string[];

        // Assert
        // Should use default locale
        expect(result).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      });
    });
  });

  // ==================== getMonthName ====================

  describe('getMonthName', () => {
    describe('basic functionality', () => {
      it('should return month name for given month index', () => {
        // Arrange
        // DSL: getMonthName(0) - January
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getMonthName' },
          method: 'call',
          args: [{ expr: 'lit', value: 0 }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('January');
      });

      it('should return correct names for all months', () => {
        // Arrange
        const expectedMonths = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ];

        for (let i = 0; i < 12; i++) {
          const expr = {
            expr: 'call',
            target: { expr: 'var', name: 'getMonthName' },
            method: 'call',
            args: [{ expr: 'lit', value: i }],
          } as CompiledExpression;
          const ctx = baseContext;

          // Act
          const result = evaluate(expr, ctx);

          // Assert
          expect(result).toBe(expectedMonths[i]);
        }
      });
    });

    describe('locale support', () => {
      it('should return English month name for en-US locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getMonthName' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 'en-US' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('January');
      });

      it('should return Japanese month name for ja-JP locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getMonthName' },
          method: 'call',
          args: [
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 'ja-JP' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('1月');
      });

      it('should return all Japanese month names correctly', () => {
        // Arrange
        const expectedMonths = [
          '1月', '2月', '3月', '4月', '5月', '6月',
          '7月', '8月', '9月', '10月', '11月', '12月',
        ];

        for (let i = 0; i < 12; i++) {
          const expr = {
            expr: 'call',
            target: { expr: 'var', name: 'getMonthName' },
            method: 'call',
            args: [
              { expr: 'lit', value: i },
              { expr: 'lit', value: 'ja-JP' },
            ],
          } as CompiledExpression;
          const ctx = baseContext;

          // Act
          const result = evaluate(expr, ctx);

          // Assert
          expect(result).toBe(expectedMonths[i]);
        }
      });
    });

    describe('invalid input handling', () => {
      it('should handle negative month index', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getMonthName' },
          method: 'call',
          args: [{ expr: 'lit', value: -1 }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should handle month index > 11', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getMonthName' },
          method: 'call',
          args: [{ expr: 'lit', value: 12 }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should handle non-numeric month input', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'getMonthName' },
          method: 'call',
          args: [{ expr: 'lit', value: 'invalid' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ==================== formatDate ====================

  describe('formatDate', () => {
    describe('basic functionality', () => {
      it('should format date with default format (medium)', () => {
        // Arrange
        // DSL: formatDate("2024-01-15")
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2024-01-15' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(typeof result).toBe('string');
        expect(result).toBeTruthy();
      });

      it('should return ISO format when format is "iso"', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'iso' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-01-15');
      });
    });

    describe('format options', () => {
      it('should format date with "short" format', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'short' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Short format: "1/15/24" for en-US
        expect(result).toBe('1/15/24');
      });

      it('should format date with "medium" format', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'medium' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Medium format: "Jan 15, 2024" for en-US
        expect(result).toBe('Jan 15, 2024');
      });

      it('should format date with "long" format', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'long' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Long format: "January 15, 2024" for en-US
        expect(result).toBe('January 15, 2024');
      });
    });

    describe('locale support', () => {
      it('should format date with en-US locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'long' },
            { expr: 'lit', value: 'en-US' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('January 15, 2024');
      });

      it('should format date with ja-JP locale', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'long' },
            { expr: 'lit', value: 'ja-JP' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Japanese long format: "2024年1月15日"
        expect(result).toBe('2024年1月15日');
      });

      it('should format date with ja-JP locale short format', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'short' },
            { expr: 'lit', value: 'ja-JP' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Japanese short format: "2024/01/15"
        expect(result).toBe('2024/01/15');
      });
    });

    describe('state integration', () => {
      it('should format date from state value', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'state', name: 'selectedDate' },
            { expr: 'lit', value: 'medium' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ selectedDate: '2024-06-20' });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('Jun 20, 2024');
      });

      it('should use locale from state', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'long' },
            { expr: 'state', name: 'userLocale' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ userLocale: 'ja-JP' });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024年1月15日');
      });
    });

    describe('edge cases', () => {
      it('should handle date at year boundary (Dec 31)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-12-31' },
            { expr: 'lit', value: 'long' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('December 31, 2024');
      });

      it('should handle date at year start (Jan 1)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-01' },
            { expr: 'lit', value: 'long' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('January 1, 2024');
      });

      it('should handle leap year date (Feb 29)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-02-29' },
            { expr: 'lit', value: 'long' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('February 29, 2024');
      });
    });

    describe('invalid date validation', () => {
      it('should return undefined for Feb 30 (invalid date)', () => {
        // Arrange
        // JavaScript auto-corrects 2024-02-30 to 2024-03-01, we should reject it
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2024-02-30' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for Apr 31 (invalid date)', () => {
        // Arrange
        // April has 30 days, so Apr 31 is invalid
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2024-04-31' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for Feb 29 in non-leap year', () => {
        // Arrange
        // 2023 is not a leap year, so Feb 29 is invalid
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2023-02-29' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for month 13 (invalid month)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2024-13-15' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for month 00 (invalid month)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2024-00-15' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for day 00 (invalid day)', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '2024-01-00' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for invalid date string', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: 'not-a-date' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for null date', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: null }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [{ expr: 'lit', value: '' }],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should handle invalid format gracefully', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'lit', value: '2024-01-15' },
            { expr: 'lit', value: 'invalid-format' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        // Should fallback to default format or return undefined
        expect(result === undefined || typeof result === 'string').toBe(true);
      });

      it('should handle undefined state date', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDate' },
          method: 'call',
          args: [
            { expr: 'state', name: 'nonexistent' },
            { expr: 'lit', value: 'medium' },
          ],
        } as CompiledExpression;
        const ctx = createContext({});

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ==================== formatDateISO ====================

  describe('formatDateISO', () => {
    describe('basic functionality', () => {
      it('should format year, month, date to ISO string', () => {
        // Arrange
        // DSL: formatDateISO(2024, 0, 15) -> "2024-01-15"
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },  // January (0-indexed)
            { expr: 'lit', value: 15 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-01-15');
      });

      it('should pad single-digit month with leading zero', () => {
        // Arrange
        // March (month 2) should become "03"
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 2 },  // March
            { expr: 'lit', value: 10 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-03-10');
      });

      it('should pad single-digit date with leading zero', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 11 },  // December
            { expr: 'lit', value: 5 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-12-05');
      });

      it('should handle December (month 11) correctly', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 11 },  // December (0-indexed)
            { expr: 'lit', value: 31 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-12-31');
      });

      it('should handle January (month 0) correctly', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },  // January
            { expr: 'lit', value: 1 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-01-01');
      });
    });

    describe('state integration', () => {
      it('should work with state values for year, month, date', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'state', name: 'year' },
            { expr: 'state', name: 'month' },
            { expr: 'state', name: 'date' },
          ],
        } as CompiledExpression;
        const ctx = createContext({ year: 2024, month: 5, date: 20 });

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBe('2024-06-20');
      });
    });

    describe('invalid input handling', () => {
      it('should return undefined for non-numeric year', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 'invalid' },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 15 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-numeric month', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 'invalid' },
            { expr: 'lit', value: 15 },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-numeric date', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: 2024 },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 'invalid' },
          ],
        } as CompiledExpression;
        const ctx = baseContext;

        // Act
        const result = evaluate(expr, ctx);

        // Assert
        expect(result).toBeUndefined();
      });

      it('should return undefined for null values', () => {
        // Arrange
        const expr = {
          expr: 'call',
          target: { expr: 'var', name: 'formatDateISO' },
          method: 'call',
          args: [
            { expr: 'lit', value: null },
            { expr: 'lit', value: 0 },
            { expr: 'lit', value: 15 },
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
});
