/**
 * Expression Evaluator - Evaluates compiled expressions
 *
 * Supports:
 * - Literal values (lit)
 * - State reads (state)
 * - Variable reads (var)
 * - Binary operations (bin)
 * - Not operation (not)
 * - Conditional expressions (cond)
 * - Property access (get)
 */

import type { StateStore } from '../state/store.js';
import type { CompiledExpression, CompiledCallExpr, CompiledLambdaExpr } from '@constela/compiler';

/**
 * Style preset definition - matches @constela/core StylePreset
 */
export interface StylePreset {
  base: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<Record<string, string> & { class: string }>;
}

/**
 * Whitelist of safe array methods that can be called via call expressions
 */
const SAFE_ARRAY_METHODS = new Set([
  'length', 'at', 'includes', 'slice', 'indexOf', 'join',
  'filter', 'map', 'find', 'findIndex', 'some', 'every',
]);

/**
 * Whitelist of safe string methods that can be called via call expressions
 */
const SAFE_STRING_METHODS = new Set([
  'length', 'charAt', 'substring', 'slice', 'split',
  'trim', 'toUpperCase', 'toLowerCase', 'replace',
  'includes', 'startsWith', 'endsWith', 'indexOf',
]);

/**
 * Whitelist of safe Math static methods
 */
const SAFE_MATH_METHODS = new Set([
  'min', 'max', 'round', 'floor', 'ceil', 'abs',
  'sqrt', 'pow', 'random', 'sin', 'cos', 'tan',
]);

/**
 * Whitelist of safe Date static methods
 */
const SAFE_DATE_STATIC_METHODS = new Set([
  'now', 'parse',
]);

/**
 * Whitelist of safe Date instance methods
 */
const SAFE_DATE_INSTANCE_METHODS = new Set([
  'toISOString', 'toDateString', 'toTimeString',
  'getTime', 'getFullYear', 'getMonth', 'getDate',
  'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
]);

// ==================== Date Helper Functions ====================

/**
 * CalendarDay type - represents a day in the calendar grid
 */
interface CalendarDay {
  readonly date: number;
  readonly month: number;
  readonly year: number;
  readonly isCurrentMonth: boolean;
}

/**
 * Returns an array of day objects for a calendar grid
 *
 * @param year - The year (e.g., 2024)
 * @param month - The month (0-indexed, 0 = January)
 * @returns Array of CalendarDay objects, or undefined for invalid input
 */
function getCalendarDays(year: unknown, month: unknown): CalendarDay[] | undefined {
  // Validate inputs
  if (typeof year !== 'number' || typeof month !== 'number') {
    return undefined;
  }
  if (month < 0 || month > 11) {
    return undefined;
  }

  const days: CalendarDay[] = [];

  // Get first day of the month
  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Get last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Calculate how many days we need from previous month
  const prevMonthDays = dayOfWeek;

  // Get previous month's last day
  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthDaysCount = prevMonthLastDay.getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  // Add days from previous month
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    days.push({
      date: prevMonthDaysCount - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Add days from current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }

  // Calculate total days needed (always 42 for 6 complete weeks, or fewer if fits in 5 weeks)
  // For a complete calendar grid, we need enough to fill complete weeks
  const totalDaysSoFar = days.length;
  const totalWeeksNeeded = Math.ceil(totalDaysSoFar / 7);
  const targetDays = totalWeeksNeeded * 7;

  // Add days from next month to complete the grid
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthDaysNeeded = targetDays - totalDaysSoFar;

  for (let i = 1; i <= nextMonthDaysNeeded; i++) {
    days.push({
      date: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  return days;
}

/**
 * Returns an array of weekday names
 *
 * @param locale - The locale (default: 'en-US')
 * @returns Array of 7 weekday names starting from Sunday
 */
function getWeekDays(locale?: unknown): string[] {
  const effectiveLocale = typeof locale === 'string' ? locale : 'en-US';

  // Use a known Sunday date (January 7, 2024 is a Sunday)
  const baseSunday = new Date(2024, 0, 7);
  const weekDays: string[] = [];

  try {
    const formatter = new Intl.DateTimeFormat(effectiveLocale || 'en-US', { weekday: 'short' });

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseSunday);
      date.setDate(baseSunday.getDate() + i);
      weekDays.push(formatter.format(date));
    }

    return weekDays;
  } catch {
    // Fallback to English if locale is invalid
    const fallbackFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseSunday);
      date.setDate(baseSunday.getDate() + i);
      weekDays.push(fallbackFormatter.format(date));
    }
    return weekDays;
  }
}

/**
 * Returns the name of a month
 *
 * @param month - The month (0-indexed, 0 = January)
 * @param locale - The locale (default: 'en-US')
 * @returns Month name, or undefined for invalid month
 */
function getMonthName(month: unknown, locale?: unknown): string | undefined {
  // Validate month
  if (typeof month !== 'number' || month < 0 || month > 11) {
    return undefined;
  }

  const effectiveLocale = typeof locale === 'string' ? locale : 'en-US';

  try {
    const date = new Date(2024, month, 1);
    const formatter = new Intl.DateTimeFormat(effectiveLocale, { month: 'long' });
    return formatter.format(date);
  } catch {
    // Fallback to English
    const date = new Date(2024, month, 1);
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
    return formatter.format(date);
  }
}

/**
 * Formats year, month, date to ISO string (YYYY-MM-DD)
 * @param year - The full year (e.g., 2024)
 * @param month - The month (0-indexed, 0 = January)
 * @param date - The day of month (1-31)
 */
function formatDateISO(year: unknown, month: unknown, date: unknown): string | undefined {
  if (typeof year !== 'number' || typeof month !== 'number' || typeof date !== 'number') {
    return undefined;
  }
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0'); // month is 0-indexed
  const d = String(date).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==================== DataTable Helper Functions ====================

/**
 * Sorts an array of objects by a specified key
 *
 * @param items - Array of objects to sort
 * @param key - The key to sort by
 * @param direction - Sort direction: 'asc' (default) or 'desc'
 * @returns Sorted array (new array, does not mutate original), or undefined for invalid input
 */
function sortBy(
  items: unknown,
  key: unknown,
  direction?: unknown
): unknown[] | undefined {
  // Validate items
  if (!Array.isArray(items)) {
    return undefined;
  }

  // Validate key
  if (typeof key !== 'string') {
    return undefined;
  }

  // Prototype pollution prevention
  const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
  if (forbiddenKeys.has(key)) {
    return undefined;
  }

  // Determine direction (default to 'asc', treat invalid as 'asc')
  const dir = direction === 'desc' ? 'desc' : 'asc';

  // Create a copy to avoid mutation
  const sorted = [...items];

  sorted.sort((a, b) => {
    const aVal = a != null && typeof a === 'object' ? (a as Record<string, unknown>)[key] : undefined;
    const bVal = b != null && typeof b === 'object' ? (b as Record<string, unknown>)[key] : undefined;

    // Handle null/undefined values - push them to the end
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return dir === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Gets items for a specified page (0-indexed)
 *
 * @param items - Array of items to paginate
 * @param page - Page number (0-indexed)
 * @param pageSize - Number of items per page
 * @returns Subset of items for the specified page, or undefined for invalid input
 */
function getPaginatedItems(
  items: unknown,
  page: unknown,
  pageSize: unknown
): unknown[] | undefined {
  // Validate items
  if (!Array.isArray(items)) {
    return undefined;
  }

  // Validate page
  if (typeof page !== 'number' || page < 0) {
    return undefined;
  }

  // Validate pageSize
  if (typeof pageSize !== 'number' || pageSize <= 0) {
    return undefined;
  }

  const start = page * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
}

/**
 * Calculates total number of pages
 *
 * @param itemCount - Total number of items
 * @param pageSize - Number of items per page
 * @returns Total number of pages, or 0 for invalid input
 */
function getTotalPages(itemCount: unknown, pageSize: unknown): number {
  // Validate inputs
  if (typeof itemCount !== 'number' || typeof pageSize !== 'number') {
    return 0;
  }

  if (itemCount < 0 || pageSize <= 0) {
    return 0;
  }

  if (itemCount === 0) {
    return 0;
  }

  return Math.ceil(itemCount / pageSize);
}

/**
 * Returns an array of page numbers for pagination UI
 *
 * @param currentPage - Current page (0-indexed)
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum number of visible page buttons
 * @returns Array of page numbers, with -1 representing ellipsis
 */
function getPageNumbers(
  currentPage: unknown,
  totalPages: unknown,
  maxVisible: unknown
): number[] {
  // Validate inputs
  if (
    typeof currentPage !== 'number' ||
    typeof totalPages !== 'number' ||
    typeof maxVisible !== 'number'
  ) {
    return [];
  }

  if (totalPages <= 0) {
    return [];
  }

  if (currentPage < 0 || currentPage >= totalPages) {
    return [];
  }

  // If total pages fit within maxVisible, return all pages
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const result: number[] = [];
  const firstPage = 0;
  const lastPage = totalPages - 1;

  // Always include first page
  result.push(firstPage);

  // Calculate the range around current page
  // We need to reserve space for: first, last, and up to 2 ellipses
  // So the "middle" section has maxVisible - 2 slots (minus first and last)
  const middleSlots = maxVisible - 2;

  // Calculate start and end of middle section
  let middleStart = currentPage - Math.floor((middleSlots - 1) / 2);
  let middleEnd = currentPage + Math.ceil((middleSlots - 1) / 2);

  // Adjust if near the start
  if (middleStart <= 1) {
    middleStart = 1;
    middleEnd = Math.min(middleSlots, lastPage - 1);
  }

  // Adjust if near the end
  if (middleEnd >= lastPage - 1) {
    middleEnd = lastPage - 1;
    middleStart = Math.max(1, lastPage - middleSlots);
  }

  // Add ellipsis or pages between first and middle
  if (middleStart > 1) {
    result.push(-1); // ellipsis
  }

  // Add middle pages
  for (let i = middleStart; i <= middleEnd; i++) {
    if (i > firstPage && i < lastPage) {
      result.push(i);
    }
  }

  // Add ellipsis or pages between middle and last
  if (middleEnd < lastPage - 1) {
    result.push(-1); // ellipsis
  }

  // Always include last page
  result.push(lastPage);

  return result;
}

// ==================== Virtual Scroll Helper Functions ====================

/**
 * Calculates visible item indices for virtual scrolling
 *
 * @param scrollTop - Current scroll position
 * @param itemHeight - Height of each item
 * @param containerHeight - Height of the container
 * @param overscan - Number of items to render outside visible area
 * @returns Object with start and end indices, or undefined for invalid input
 */
function getVisibleRange(
  scrollTop: unknown,
  itemHeight: unknown,
  containerHeight: unknown,
  overscan: unknown
): { start: number; end: number } | undefined {
  // Validate inputs
  if (
    typeof scrollTop !== 'number' ||
    typeof itemHeight !== 'number' ||
    typeof containerHeight !== 'number' ||
    typeof overscan !== 'number'
  ) {
    return undefined;
  }

  if (scrollTop < 0 || itemHeight <= 0 || containerHeight <= 0) {
    return undefined;
  }

  // Calculate first visible item
  const firstVisible = Math.floor(scrollTop / itemHeight);

  // Calculate number of visible items
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  // Apply overscan
  const start = Math.max(0, firstVisible - overscan);
  const end = firstVisible + visibleCount + overscan - 1;

  return { start, end };
}

/**
 * Calculates total scrollable height for virtual scrolling
 *
 * @param itemCount - Total number of items
 * @param itemHeight - Height of each item
 * @returns Total height, or 0 for invalid input
 */
function getTotalHeight(itemCount: unknown, itemHeight: unknown): number {
  // Validate inputs
  if (typeof itemCount !== 'number' || typeof itemHeight !== 'number') {
    return 0;
  }

  if (itemCount < 0 || itemHeight <= 0) {
    return 0;
  }

  return itemCount * itemHeight;
}

// ==================== Date Formatting Helper Functions ====================

/**
 * Formats an ISO date string
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param format - Format type: 'short', 'medium', 'long', 'iso' (default: 'medium')
 * @param locale - The locale (default: 'en-US')
 * @returns Formatted date string, or undefined for invalid input
 */
function formatDate(dateStr: unknown, format?: unknown, locale?: unknown): string | undefined {
  // Validate date string
  if (typeof dateStr !== 'string' || !dateStr) {
    return undefined;
  }

  // Parse ISO date string (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateStr)) {
    return undefined;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1; // 0-indexed
  const day = parseInt(dayStr!, 10);

  // Create date in UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, month, day));

  // Validate the date - ensure it wasn't auto-corrected
  if (isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day) {
    return undefined;
  }

  const effectiveFormat = typeof format === 'string' ? format : 'medium';
  const effectiveLocale = typeof locale === 'string' ? locale : 'en-US';

  // Handle ISO format
  if (effectiveFormat === 'iso') {
    return dateStr;
  }

  try {
    let options: Intl.DateTimeFormatOptions;

    switch (effectiveFormat) {
      case 'short':
        // Japanese locale uses 4-digit year with leading zeros (2024/01/15)
        // English locale uses 2-digit year without leading zeros (1/15/24)
        if (effectiveLocale.startsWith('ja')) {
          options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
        } else {
          options = { year: '2-digit', month: 'numeric', day: 'numeric', timeZone: 'UTC' };
        }
        break;
      case 'medium':
        options = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
        break;
      case 'long':
        options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
        break;
      default:
        // Invalid format - fallback to medium
        options = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
    }

    const formatter = new Intl.DateTimeFormat(effectiveLocale, options);
    return formatter.format(date);
  } catch {
    // Fallback to English
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
    return formatter.format(date);
  }
}

/**
 * Creates a JavaScript function from a lambda expression
 */
function createLambdaFunction(
  lambda: CompiledLambdaExpr,
  ctx: EvaluationContext
): (item: unknown, index: number) => unknown {
  return (item: unknown, index: number): unknown => {
    const lambdaLocals: Record<string, unknown> = {
      ...ctx.locals,
      [lambda.param]: item,
    };
    if (lambda.index !== undefined) {
      lambdaLocals[lambda.index] = index;
    }
    return evaluate(lambda.body, { ...ctx, locals: lambdaLocals });
  };
}

/**
 * Safely calls an array method
 */
function callArrayMethod(
  target: unknown[],
  method: string,
  args: unknown[],
  ctx: EvaluationContext,
  rawArgs?: CompiledExpression[]
): unknown {
  if (!SAFE_ARRAY_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'length':
      return target.length;
    case 'at': {
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return target.at(index);
    }
    case 'includes': {
      const searchElement = args[0];
      const fromIndex = typeof args[1] === 'number' ? args[1] : undefined;
      return target.includes(searchElement, fromIndex);
    }
    case 'slice': {
      const start = typeof args[0] === 'number' ? args[0] : undefined;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.slice(start, end);
    }
    case 'indexOf': {
      const searchElement = args[0];
      const fromIndex = typeof args[1] === 'number' ? args[1] : undefined;
      return target.indexOf(searchElement, fromIndex);
    }
    case 'join': {
      const separator = typeof args[0] === 'string' ? args[0] : ',';
      return target.join(separator);
    }
    case 'filter': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.filter((item, index) => !!fn(item, index));
    }
    case 'map': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.map((item, index) => fn(item, index));
    }
    case 'find': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.find((item, index) => !!fn(item, index));
    }
    case 'findIndex': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.findIndex((item, index) => !!fn(item, index));
    }
    case 'some': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.some((item, index) => !!fn(item, index));
    }
    case 'every': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as CompiledLambdaExpr, ctx);
      return target.every((item, index) => !!fn(item, index));
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a string method
 */
function callStringMethod(
  target: string,
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_STRING_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'length':
      return target.length;
    case 'charAt': {
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return target.charAt(index);
    }
    case 'substring': {
      const start = typeof args[0] === 'number' ? args[0] : 0;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.substring(start, end);
    }
    case 'slice': {
      const start = typeof args[0] === 'number' ? args[0] : undefined;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.slice(start, end);
    }
    case 'split': {
      const separator = typeof args[0] === 'string' ? args[0] : '';
      return target.split(separator);
    }
    case 'trim':
      return target.trim();
    case 'toUpperCase':
      return target.toUpperCase();
    case 'toLowerCase':
      return target.toLowerCase();
    case 'replace': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const replace = typeof args[1] === 'string' ? args[1] : '';
      return target.replace(search, replace);
    }
    case 'includes': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.includes(search, position);
    }
    case 'startsWith': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.startsWith(search, position);
    }
    case 'endsWith': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const length = typeof args[1] === 'number' ? args[1] : undefined;
      return target.endsWith(search, length);
    }
    case 'indexOf': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.indexOf(search, position);
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a Math static method
 */
function callMathMethod(
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_MATH_METHODS.has(method)) {
    return undefined;
  }

  const numbers = args.filter((a): a is number => typeof a === 'number');

  switch (method) {
    case 'min':
      return numbers.length > 0 ? Math.min(...numbers) : undefined;
    case 'max':
      return numbers.length > 0 ? Math.max(...numbers) : undefined;
    case 'round': {
      const num = numbers[0];
      return num !== undefined ? Math.round(num) : undefined;
    }
    case 'floor': {
      const num = numbers[0];
      return num !== undefined ? Math.floor(num) : undefined;
    }
    case 'ceil': {
      const num = numbers[0];
      return num !== undefined ? Math.ceil(num) : undefined;
    }
    case 'abs': {
      const num = numbers[0];
      return num !== undefined ? Math.abs(num) : undefined;
    }
    case 'sqrt': {
      const num = numbers[0];
      return num !== undefined ? Math.sqrt(num) : undefined;
    }
    case 'pow': {
      const base = numbers[0];
      const exponent = numbers[1];
      return base !== undefined && exponent !== undefined ? Math.pow(base, exponent) : undefined;
    }
    case 'random':
      return Math.random();
    case 'sin': {
      const num = numbers[0];
      return num !== undefined ? Math.sin(num) : undefined;
    }
    case 'cos': {
      const num = numbers[0];
      return num !== undefined ? Math.cos(num) : undefined;
    }
    case 'tan': {
      const num = numbers[0];
      return num !== undefined ? Math.tan(num) : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a Date static method
 */
function callDateStaticMethod(
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_DATE_STATIC_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'now':
      return Date.now();
    case 'parse': {
      const dateString = args[0];
      return typeof dateString === 'string' ? Date.parse(dateString) : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Safely calls a Date instance method
 */
function callDateInstanceMethod(
  target: Date,
  method: string
): unknown {
  if (!SAFE_DATE_INSTANCE_METHODS.has(method)) {
    return undefined;
  }

  switch (method) {
    case 'toISOString':
      return target.toISOString();
    case 'toDateString':
      return target.toDateString();
    case 'toTimeString':
      return target.toTimeString();
    case 'getTime':
      return target.getTime();
    case 'getFullYear':
      return target.getFullYear();
    case 'getMonth':
      return target.getMonth();
    case 'getDate':
      return target.getDate();
    case 'getHours':
      return target.getHours();
    case 'getMinutes':
      return target.getMinutes();
    case 'getSeconds':
      return target.getSeconds();
    case 'getMilliseconds':
      return target.getMilliseconds();
    default:
      return undefined;
  }
}

/**
 * Whitelist of global helper functions that can be called with target: null
 */
const GLOBAL_FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  // Date helpers
  getCalendarDays: (year, month) => getCalendarDays(year, month),
  getWeekDays: (locale) => getWeekDays(locale),
  getMonthName: (month, locale) => getMonthName(month, locale),
  formatDate: (dateStr, format, locale) => formatDate(dateStr, format, locale),
  formatDateISO: (year, month, date) => formatDateISO(year, month, date),
  // DataTable helpers
  sortBy: (items, key, direction) => sortBy(items, key, direction),
  getPaginatedItems: (items, page, pageSize) => getPaginatedItems(items, page, pageSize),
  getTotalPages: (itemCount, pageSize) => getTotalPages(itemCount, pageSize),
  getPageNumbers: (currentPage, totalPages, maxVisible) => getPageNumbers(currentPage, totalPages, maxVisible),
  // Virtual scroll helpers
  getVisibleRange: (scrollTop, itemHeight, containerHeight, overscan) => getVisibleRange(scrollTop, itemHeight, containerHeight, overscan),
  getTotalHeight: (itemCount, itemHeight) => getTotalHeight(itemCount, itemHeight),
  // Chart helpers - Coordinate calculation
  normalizeValue: (value, min, max) => normalizeValue(value, min, max),
  scaleValue: (value, domainMin, domainMax, rangeMin, rangeMax) => scaleValue(value, domainMin, domainMax, rangeMin, rangeMax),
  getBarDimensions: (data, index, width, height, gap, orientation) => getBarDimensions(data, index, width, height, gap, orientation),
  // Chart helpers - Path generation
  getLinePath: (points, curved) => getLinePath(points, curved),
  getAreaPath: (points, baseline, curved) => getAreaPath(points, baseline, curved),
  getArcPath: (cx, cy, radius, startAngle, endAngle) => getArcPath(cx, cy, radius, startAngle, endAngle),
  // Chart helpers - Pie/Donut
  getPieSlices: (data, valueKey) => getPieSlices(data, valueKey),
  getDonutSlices: (data, valueKey, innerRadius) => getDonutSlices(data, valueKey, innerRadius),
  // Chart helpers - Radar
  getRadarPoints: (data, valueKey, cx, cy, radius, maxValue) => getRadarPoints(data, valueKey, cx, cy, radius, maxValue),
  getRadarAxes: (labels, cx, cy, radius) => getRadarAxes(labels, cx, cy, radius),
  // Chart helpers - Utilities
  getChartBounds: (data, valueKey) => getChartBounds(data, valueKey),
  generateTicks: (min, max, count) => generateTicks(min, max, count),
  // Chart helpers - Data aggregation
  binData: (data, valueKey, binCount) => binData(data, valueKey, binCount),
  aggregateData: (data, groupKey, valueKey, aggregation) => aggregateData(data, groupKey, valueKey, aggregation),
  downsample: (data, targetCount, method) => downsample(data, targetCount, method),
};

/**
 * Calls a global helper function by name
 */
function callGlobalFunction(method: string, args: unknown[]): unknown {
  const fn = GLOBAL_FUNCTIONS[method];
  if (!fn) {
    return undefined;
  }
  return fn(...args);
}

export interface EvaluationContext {
  state: StateStore;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };
  imports?: Record<string, unknown>;
  refs?: Record<string, Element>;  // DOM element refs
  styles?: Record<string, StylePreset>;  // Style presets for style expressions
}

export function evaluate(expr: CompiledExpression, ctx: EvaluationContext): unknown {
  switch (expr.expr) {
    case 'lit':
      return expr.value;

    case 'state': {
      const stateValue = ctx.state.get(expr.name);
      if (expr.path && stateValue != null) {
        return getNestedValue(stateValue, expr.path);
      }
      return stateValue;
    }

    case 'local':
      return ctx.locals[expr.name];

    case 'var': {
      let varName = expr.name;
      let pathParts: string[] = [];

      // Support dot notation in name: "user.name" -> name="user", path="name"
      if (varName.includes('.')) {
        const parts = varName.split('.');
        varName = parts[0]!;
        pathParts = parts.slice(1);
      }

      // Add explicit path if provided
      if (expr.path) {
        pathParts = pathParts.concat(expr.path.split('.'));
      }

      // Prototype pollution prevention
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
      for (const part of pathParts) {
        if (forbiddenKeys.has(part)) {
          return undefined;
        }
      }

      let value = ctx.locals[varName];

      // Fallback to safe globals if not found in locals
      if (value === undefined) {
        const safeGlobals: Record<string, unknown> = {
          JSON,
          Math,
          Date,
          Object,
          Array,
          String,
          Number,
          Boolean,
          console,
          // Date helper functions
          getCalendarDays,
          getWeekDays,
          getMonthName,
          formatDate,
          formatDateISO,
          // DataTable helper functions
          sortBy,
          getPaginatedItems,
          getTotalPages,
          getPageNumbers,
          // Virtual scroll helper functions
          getVisibleRange,
          getTotalHeight,
        };
        value = safeGlobals[varName];
      }

      // Traverse path
      for (const part of pathParts) {
        if (value == null) break;
        value = (value as Record<string, unknown>)[part];
      }

      // Bind methods to their parent object
      if (typeof value === 'function' && pathParts.length > 0) {
        let parent = ctx.locals[varName];
        if (parent === undefined) {
          const safeGlobals: Record<string, unknown> = { JSON, Math, Date, Object, Array, String, Number, Boolean, console, getCalendarDays, getWeekDays, getMonthName, formatDate, formatDateISO, sortBy, getPaginatedItems, getTotalPages, getPageNumbers, getVisibleRange, getTotalHeight };
          parent = safeGlobals[varName];
        }
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (parent == null) break;
          parent = (parent as Record<string, unknown>)[pathParts[i]!];
        }
        if (parent != null) {
          return (value as Function).bind(parent);
        }
      }

      return value;
    }

    case 'bin':
      return evaluateBinary(expr.op, expr.left, expr.right, ctx);

    case 'not':
      return !evaluate(expr.operand, ctx);

    case 'cond':
      return evaluate(expr.if, ctx) ? evaluate(expr.then, ctx) : evaluate(expr.else, ctx);

    case 'get': {
      const baseValue = evaluate(expr.base, ctx);
      if (baseValue == null) return undefined;

      const pathParts = expr.path.split('.');
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

      let value: unknown = baseValue;
      for (const part of pathParts) {
        if (forbiddenKeys.has(part)) return undefined;
        if (value == null) return undefined;
        value = (value as Record<string, unknown>)[part];
      }
      return value;
    }

    case 'route': {
      const source = expr.source ?? 'param';
      const routeCtx = ctx.route;
      if (!routeCtx) return '';
      switch (source) {
        case 'param':
          return routeCtx.params[expr.name] ?? '';
        case 'query':
          return routeCtx.query[expr.name] ?? '';
        case 'path':
          return routeCtx.path;
      }
    }

    case 'import': {
      const importData = ctx.imports?.[expr.name];
      if (importData === undefined) return undefined;
      if (expr.path) {
        return getNestedValue(importData, expr.path);
      }
      return importData;
    }

    case 'ref':
      return ctx.refs?.[expr.name] ?? null;

    case 'index': {
      const base = evaluate(expr.base, ctx);
      const key = evaluate(expr.key, ctx);
      if (base == null || key == null) return undefined;
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
      if (typeof key === 'string' && forbiddenKeys.has(key)) return undefined;
      return (base as Record<string | number, unknown>)[key as string | number];
    }

    case 'data': {
      // Data expressions are resolved from imports (loadedData is merged into importData)
      const dataValue = ctx.imports?.[expr.name];
      if (dataValue === undefined) return undefined;
      if (expr.path) {
        return getNestedValue(dataValue, expr.path);
      }
      return dataValue;
    }

    case 'param': {
      // Param expressions should be resolved during layout composition.
      // If one reaches runtime, it means layoutParams was missing - return undefined.
      return undefined;
    }

    case 'style':
      return evaluateStyle(expr, ctx);

    case 'concat': {
      return expr.items
        .map(item => {
          const val = evaluate(item, ctx);
          return val == null ? '' : String(val);
        })
        .join('');
    }

    case 'validity': {
      const element = ctx.refs?.[expr.ref];
      if (!element) return null;

      // Check if element has validity property (form elements)
      const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!formElement.validity) return null;

      const validity = formElement.validity;
      const property = expr.property || 'valid';

      if (property === 'message') {
        return formElement.validationMessage || '';
      }

      return validity[property as keyof ValidityState] ?? null;
    }

    case 'call': {
      const callExpr = expr as CompiledCallExpr;
      const target = callExpr.target != null ? evaluate(callExpr.target, ctx) : null;

      const args = callExpr.args?.map(arg => {
        // lambda expressions are not directly evaluated; they are passed to array methods
        if (arg.expr === 'lambda') return arg;
        return evaluate(arg, ctx);
      }) ?? [];

      // Global function calls (target is null)
      if (target === null) {
        return callGlobalFunction(callExpr.method, args);
      }

      // Array methods
      if (Array.isArray(target)) {
        return callArrayMethod(target, callExpr.method, args, ctx, callExpr.args);
      }

      // String methods
      if (typeof target === 'string') {
        return callStringMethod(target, callExpr.method, args);
      }

      // Math static methods
      if (target === Math) {
        return callMathMethod(callExpr.method, args);
      }

      // Date static methods
      if (target === Date) {
        return callDateStaticMethod(callExpr.method, args);
      }

      // Date instance methods
      if (target instanceof Date) {
        return callDateInstanceMethod(target, callExpr.method);
      }

      // Function call support (for global helper functions like getCalendarDays, getWeekDays, etc.)
      if (typeof target === 'function' && callExpr.method === 'call') {
        return target(...args);
      }

      return undefined;
    }

    case 'lambda':
      // Lambda expressions are not directly evaluated
      // They are passed to array methods and converted to functions there
      return undefined;

    case 'array': {
      const arrayExpr = expr as { expr: 'array'; elements: CompiledExpression[] };
      return arrayExpr.elements.map(elem => evaluate(elem, ctx));
    }

    case 'obj': {
      const objExpr = expr as { expr: 'obj'; props: Record<string, CompiledExpression> };
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(objExpr.props)) {
        result[key] = evaluate(value, ctx);
      }
      return result;
    }

    default: {
      const _exhaustiveCheck: never = expr;
      throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Type guard to check if a value is a CompiledExpression
 * Uses hasOwnProperty to avoid prototype chain issues
 */
function isExpression(value: unknown): value is CompiledExpression {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'expr') &&
    typeof (value as { expr: unknown }).expr === 'string'
  );
}

/**
 * Evaluates a payload that can be either a single expression or an object with expression fields
 */
export function evaluatePayload(
  payload: CompiledExpression | Record<string, CompiledExpression>,
  ctx: EvaluationContext
): unknown {
  // Single expression case
  if (isExpression(payload)) {
    return evaluate(payload, ctx);
  }

  // Object payload case - evaluate each field recursively
  if (typeof payload === 'object' && payload !== null) {
    const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (forbiddenKeys.has(key)) continue;

      if (isExpression(value)) {
        result[key] = evaluate(value, ctx);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return payload;
}

/**
 * Gets a nested value from an object using a dot-separated path
 * Handles both object keys and array indices (numeric strings)
 * Includes prototype pollution prevention
 * Binds methods to their parent object to preserve 'this' context
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
  const parts = path.split('.');

  let value: unknown = obj;
  let parent: unknown = null;

  for (const part of parts) {
    // Prototype pollution prevention
    if (forbiddenKeys.has(part)) {
      return undefined;
    }

    if (value == null) {
      return undefined;
    }

    parent = value;

    // Handle array access with numeric indices
    if (Array.isArray(value)) {
      const index = Number(part);
      if (Number.isInteger(index) && index >= 0) {
        value = value[index];
      } else {
        // Non-numeric key on array, try as object property
        value = (value as unknown as Record<string, unknown>)[part];
      }
    } else if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  // Bind methods to their parent object to preserve 'this' context
  if (typeof value === 'function' && parent != null) {
    return (value as Function).bind(parent);
  }

  return value;
}

function evaluateBinary(
  op: string,
  left: CompiledExpression,
  right: CompiledExpression,
  ctx: EvaluationContext
): unknown {
  // Short-circuit evaluation for logical operators
  if (op === '&&') {
    const leftVal = evaluate(left, ctx);
    if (!leftVal) return leftVal;
    return evaluate(right, ctx);
  }

  if (op === '||') {
    const leftVal = evaluate(left, ctx);
    if (leftVal) return leftVal;
    return evaluate(right, ctx);
  }

  const leftVal = evaluate(left, ctx);
  const rightVal = evaluate(right, ctx);

  switch (op) {
    // Arithmetic
    case '+':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal + rightVal;
      }
      // Fallback for string concatenation
      return String(leftVal) + String(rightVal);
    case '-':
      return (typeof leftVal === 'number' ? leftVal : 0) - (typeof rightVal === 'number' ? rightVal : 0);
    case '*':
      return (typeof leftVal === 'number' ? leftVal : 0) * (typeof rightVal === 'number' ? rightVal : 0);
    case '/': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      // Handle division by zero - return Infinity (matches JavaScript semantics)
      if (divisor === 0) {
        return dividend === 0 ? NaN : (dividend > 0 ? Infinity : -Infinity);
      }
      return dividend / divisor;
    }

    // Comparison (using strict equality)
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '<':
      // Safe comparison with type checking
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal < rightVal;
      }
      return String(leftVal) < String(rightVal);
    case '<=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal <= rightVal;
      }
      return String(leftVal) <= String(rightVal);
    case '>':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal > rightVal;
      }
      return String(leftVal) > String(rightVal);
    case '>=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal >= rightVal;
      }
      return String(leftVal) >= String(rightVal);

    default:
      throw new Error('Unknown binary operator: ' + op);
  }
}

/**
 * Style expression type for evaluateStyle
 */
interface StyleExprInput {
  expr: 'style';
  name: string;
  variants?: Record<string, CompiledExpression>;
}

// ==================== Chart Helper Functions ====================

/**
 * Normalizes a value to 0-1 range
 *
 * @param value - The value to normalize
 * @param min - The minimum value of the range
 * @param max - The maximum value of the range
 * @returns Normalized value (0-1), or undefined for invalid input
 */
function normalizeValue(value: unknown, min: unknown, max: unknown): number | undefined {
  if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
    return undefined;
  }

  // Avoid division by zero
  if (max === min) {
    return 0;
  }

  return (value - min) / (max - min);
}

/**
 * Scales a value from one range to another
 *
 * @param value - The value to scale
 * @param domainMin - Minimum of source range
 * @param domainMax - Maximum of source range
 * @param rangeMin - Minimum of target range
 * @param rangeMax - Maximum of target range
 * @returns Scaled value, or undefined for invalid input
 */
function scaleValue(
  value: unknown,
  domainMin: unknown,
  domainMax: unknown,
  rangeMin: unknown,
  rangeMax: unknown
): number | undefined {
  if (
    typeof value !== 'number' ||
    typeof domainMin !== 'number' ||
    typeof domainMax !== 'number' ||
    typeof rangeMin !== 'number' ||
    typeof rangeMax !== 'number'
  ) {
    return undefined;
  }

  // Avoid division by zero
  if (domainMax === domainMin) {
    return rangeMin;
  }

  const normalized = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + normalized * (rangeMax - rangeMin);
}

/**
 * Calculates bar dimensions for bar chart
 *
 * @param data - Array of values
 * @param index - Index of the bar
 * @param width - Total width of the chart
 * @param height - Total height of the chart
 * @param gap - Gap between bars
 * @param orientation - 'vertical' or 'horizontal'
 * @returns Object with x, y, width, height, or undefined for invalid input
 */
function getBarDimensions(
  data: unknown,
  index: unknown,
  width: unknown,
  height: unknown,
  gap: unknown,
  orientation: unknown
): { x: number; y: number; width: number; height: number } | undefined {
  if (!Array.isArray(data) || data.length === 0) {
    return undefined;
  }

  if (typeof index !== 'number' || index < 0 || index >= data.length) {
    return undefined;
  }

  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof gap !== 'number'
  ) {
    return undefined;
  }

  const isVertical = orientation === 'vertical';
  const barCount = data.length;

  // Find max value for scaling
  const values = data.map((d) => (typeof d === 'number' ? d : 0));
  const maxValue = Math.max(...values);

  if (isVertical) {
    // Vertical bars: width is distributed among bars, height is based on value
    const totalGap = gap * (barCount + 1);
    const barWidth = (width - totalGap) / barCount;
    const barX = gap + index * (barWidth + gap);

    const value = values[index] ?? 0;
    const barHeight = maxValue > 0 ? (value / maxValue) * height : 0;
    const barY = height - barHeight;

    return {
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
    };
  } else {
    // Horizontal bars: height is distributed among bars, width is based on value
    // Gap at top and between bars, no gap at bottom
    const totalGap = gap * barCount; // top gap + (n-1) gaps between bars
    const barHeight = (height - totalGap) / barCount;
    const barY = gap + index * (barHeight + gap);

    const value = values[index] ?? 0;
    const barWidth = maxValue > 0 ? (value / maxValue) * width : 0;

    return {
      x: 0,
      y: barY,
      width: barWidth,
      height: barHeight,
    };
  }
}

/**
 * Generates curved SVG path using Catmull-Rom to Bezier conversion
 *
 * @param points - Array of {x, y} points
 * @returns SVG path string with cubic bezier curves
 */
function getCurvedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) {
    return points.length === 1 ? `M${points[0]!.x},${points[0]!.y}` : '';
  }

  if (points.length === 2) {
    // For 2 points, just draw a line
    return `M${points[0]!.x},${points[0]!.y} L${points[1]!.x},${points[1]!.y}`;
  }

  const pathParts: string[] = [`M${points[0]!.x},${points[0]!.y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    // Catmull-Rom to Bezier control points (tension = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathParts.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }

  return pathParts.join(' ');
}

/**
 * Generates SVG path string for line chart
 *
 * @param points - Array of {x, y} points
 * @param curved - Whether to use curved lines (Catmull-Rom spline)
 * @returns SVG path string, or undefined for invalid input
 */
function getLinePath(points: unknown, curved?: unknown): string | undefined {
  if (!Array.isArray(points)) {
    return undefined;
  }

  if (points.length === 0) {
    return '';
  }

  // Validate all points have x and y
  for (const point of points) {
    if (
      typeof point !== 'object' ||
      point === null ||
      typeof (point as { x?: unknown }).x !== 'number' ||
      typeof (point as { y?: unknown }).y !== 'number'
    ) {
      return undefined;
    }
  }

  const validPoints = points as Array<{ x: number; y: number }>;

  if (validPoints.length === 1) {
    return `M${validPoints[0]!.x},${validPoints[0]!.y}`;
  }

  // If not curved, use straight lines (existing behavior)
  if (curved !== true) {
    const pathParts = validPoints.map((point, i) => {
      const command = i === 0 ? 'M' : 'L';
      return `${command}${point.x},${point.y}`;
    });
    return pathParts.join(' ');
  }

  // Curved path using Catmull-Rom to Bezier conversion
  return getCurvedPath(validPoints);
}

/**
 * Generates SVG path string for area chart
 *
 * @param points - Array of {x, y} points
 * @param baseline - Y coordinate for the baseline
 * @param curved - Whether to use curved lines (Catmull-Rom spline)
 * @returns SVG path string, or undefined for invalid input
 */
function getAreaPath(points: unknown, baseline: unknown, curved?: unknown): string | undefined {
  if (!Array.isArray(points)) {
    return undefined;
  }

  if (typeof baseline !== 'number') {
    return undefined;
  }

  if (points.length === 0) {
    return '';
  }

  // Validate all points have x and y
  for (const point of points) {
    if (
      typeof point !== 'object' ||
      point === null ||
      typeof (point as { x?: unknown }).x !== 'number' ||
      typeof (point as { y?: unknown }).y !== 'number'
    ) {
      return undefined;
    }
  }

  const validPoints = points as Array<{ x: number; y: number }>;

  // Use getCurvedPath for the upper line when curved=true
  let upperPath: string;
  if (curved === true && validPoints.length > 2) {
    upperPath = getCurvedPath(validPoints);
  } else {
    upperPath = validPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ');
  }

  // Close the area (always straight lines)
  const lastPoint = validPoints[validPoints.length - 1]!;
  const firstPoint = validPoints[0]!;

  return `${upperPath} L${lastPoint.x},${baseline} L${firstPoint.x},${baseline} Z`;
}

/**
 * Generates SVG arc path for pie/donut slices
 *
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param radius - Arc radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @returns SVG arc path string, or undefined for invalid input
 */
function getArcPath(
  cx: unknown,
  cy: unknown,
  radius: unknown,
  startAngle: unknown,
  endAngle: unknown
): string | undefined {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof radius !== 'number' ||
    typeof startAngle !== 'number' ||
    typeof endAngle !== 'number'
  ) {
    return undefined;
  }

  if (radius <= 0) {
    return undefined;
  }

  // Calculate start and end points
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);

  // Determine if arc is more than 180 degrees (large-arc-flag)
  const angleDiff = endAngle - startAngle;
  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

  // SVG arc: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  // sweep-flag = 1 for clockwise
  return `M${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}`;
}

/**
 * Calculates pie slices from data
 *
 * @param data - Array of objects
 * @param valueKey - Key to use for values
 * @returns Array of slice objects, or undefined for invalid input
 */
function getPieSlices(
  data: unknown,
  valueKey: unknown
): Array<{ startAngle: number; endAngle: number; value: number; percentage: number }> | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  if (typeof valueKey !== 'string') {
    return undefined;
  }

  if (data.length === 0) {
    return [];
  }

  // Extract values
  const values = data.map((item) => {
    if (typeof item !== 'object' || item === null) return 0;
    const val = (item as Record<string, unknown>)[valueKey];
    return typeof val === 'number' ? val : 0;
  });

  const total = values.reduce((sum, val) => sum + val, 0);

  // Build slices
  const slices: Array<{ startAngle: number; endAngle: number; value: number; percentage: number }> = [];
  let currentAngle = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const angleSpan = total > 0 ? (value / total) * Math.PI * 2 : 0;

    slices.push({
      startAngle: currentAngle,
      endAngle: currentAngle + angleSpan,
      value,
      percentage,
    });

    currentAngle += angleSpan;
  }

  return slices;
}

/**
 * Calculates donut slices from data
 *
 * @param data - Array of objects
 * @param valueKey - Key to use for values
 * @param innerRadius - Inner radius of donut
 * @returns Array of slice objects with radii, or undefined for invalid input
 */
function getDonutSlices(
  data: unknown,
  valueKey: unknown,
  innerRadius: unknown
): Array<{
  startAngle: number;
  endAngle: number;
  outerRadius: number;
  innerRadius: number;
  value: number;
  percentage: number;
}> | undefined {
  if (typeof innerRadius !== 'number' || innerRadius < 0) {
    return undefined;
  }

  const pieSlices = getPieSlices(data, valueKey);
  if (pieSlices === undefined) {
    return undefined;
  }

  // Default outer radius
  const outerRadius = 100;

  return pieSlices.map((slice) => ({
    ...slice,
    outerRadius,
    innerRadius: innerRadius as number,
  }));
}

/**
 * Converts data to radar polygon points
 *
 * @param data - Array of objects
 * @param valueKey - Key to use for values
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param radius - Maximum radius
 * @param maxValue - Maximum value for scaling
 * @returns Array of {x, y} points, or undefined for invalid input
 */
function getRadarPoints(
  data: unknown,
  valueKey: unknown,
  cx: unknown,
  cy: unknown,
  radius: unknown,
  maxValue: unknown
): Array<{ x: number; y: number }> | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  if (typeof valueKey !== 'string') {
    return undefined;
  }

  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof radius !== 'number' ||
    typeof maxValue !== 'number'
  ) {
    return undefined;
  }

  if (maxValue <= 0) {
    return undefined;
  }

  if (data.length === 0) {
    return [];
  }

  const points: Array<{ x: number; y: number }> = [];
  const angleStep = (Math.PI * 2) / data.length;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const value = typeof item === 'object' && item !== null
      ? (item as Record<string, unknown>)[valueKey]
      : 0;
    const numValue = typeof value === 'number' ? value : 0;

    // Scale value to radius
    const scaledRadius = (numValue / maxValue) * radius;

    // Calculate angle (start from top, go clockwise)
    // -PI/2 to start from top
    const angle = -Math.PI / 2 + i * angleStep;

    const x = cx + scaledRadius * Math.cos(angle);
    const y = cy + scaledRadius * Math.sin(angle);

    points.push({ x, y });
  }

  return points;
}

/**
 * Calculates radar axis line coordinates
 *
 * @param labels - Array of label strings
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param radius - Axis length
 * @returns Array of axis objects, or undefined for invalid input
 */
function getRadarAxes(
  labels: unknown,
  cx: unknown,
  cy: unknown,
  radius: unknown
): Array<{ x1: number; y1: number; x2: number; y2: number; label: string; angle: number }> | undefined {
  if (!Array.isArray(labels)) {
    return undefined;
  }

  if (typeof cx !== 'number' || typeof cy !== 'number' || typeof radius !== 'number') {
    return undefined;
  }

  if (radius < 0) {
    return undefined;
  }

  if (labels.length === 0) {
    return [];
  }

  const axes: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; angle: number }> = [];
  const angleStep = (Math.PI * 2) / labels.length;

  for (let i = 0; i < labels.length; i++) {
    const label = String(labels[i]);
    // Start from top (-PI/2)
    const angle = -Math.PI / 2 + i * angleStep;

    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);

    axes.push({
      x1: cx,
      y1: cy,
      x2,
      y2,
      label,
      angle,
    });
  }

  return axes;
}

/**
 * Finds min and max values in data
 *
 * @param data - Array of objects
 * @param valueKey - Key to use for values
 * @returns Object with min and max, or undefined for invalid input
 */
function getChartBounds(
  data: unknown,
  valueKey: unknown
): { min: number; max: number } | undefined {
  if (!Array.isArray(data) || data.length === 0) {
    return undefined;
  }

  if (typeof valueKey !== 'string') {
    return undefined;
  }

  const values: number[] = [];

  for (const item of data) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const val = (item as Record<string, unknown>)[valueKey];
    if (typeof val === 'number') {
      values.push(val);
    }
  }

  if (values.length === 0) {
    return undefined;
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Generates nice tick values for axis
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param count - Desired number of ticks
 * @returns Array of tick values
 */
function generateTicks(min: unknown, max: unknown, count: unknown): number[] {
  if (typeof min !== 'number' || typeof max !== 'number' || typeof count !== 'number') {
    return [];
  }

  if (count <= 0) {
    return [];
  }

  if (min === max) {
    return [min];
  }

  if (count === 1) {
    return [min];
  }

  if (count === 2) {
    return [min, max];
  }

  // Calculate the raw step
  const range = max - min;
  const rawStep = range / (count - 1);

  // Find a "nice" step value (round to nice increments)
  const niceStep = getNiceStep(rawStep);

  // Adjust min to a nice value (floor to nearest nice step from 0)
  const niceMin = Math.floor(min / niceStep) * niceStep;

  // Generate ticks
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) {
    const tick = niceMin + i * niceStep;
    // Round to avoid floating point issues
    ticks.push(Math.round(tick * 1e10) / 1e10);
  }

  return ticks;
}

/**
 * Finds a "nice" step value for tick generation
 * Nice values are 1, 2, 5, 10, 20, 25, 50, 100, etc.
 */
function getNiceStep(rawStep: number): number {
  // Find the magnitude of the step
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));

  // Normalize to 1-10 range
  const normalized = rawStep / magnitude;

  // Choose nice value
  let niceNormalized: number;
  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 2.5) {
    niceNormalized = 2.5;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  return niceNormalized * magnitude;
}

/**
 * Groups data into bins for histogram
 *
 * @param data - Array of objects
 * @param valueKey - Key to use for values
 * @param binCount - Number of bins
 * @returns Array of bin objects, or undefined for invalid input
 */
function binData(
  data: unknown,
  valueKey: unknown,
  binCount: unknown
): Array<{ binStart: number; binEnd: number; count: number; values: number[] }> | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  if (typeof valueKey !== 'string') {
    return undefined;
  }

  if (typeof binCount !== 'number' || binCount <= 0) {
    return [];
  }

  if (data.length === 0) {
    return [];
  }

  // Extract values
  const values: number[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const val = (item as Record<string, unknown>)[valueKey];
    if (typeof val === 'number') {
      values.push(val);
    }
  }

  if (values.length === 0) {
    return [];
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Handle case where all values are the same
  const binWidth = maxVal === minVal ? 1 : (maxVal - minVal) / binCount;

  // Initialize bins
  const bins: Array<{ binStart: number; binEnd: number; count: number; values: number[] }> = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      binStart: minVal + i * binWidth,
      binEnd: minVal + (i + 1) * binWidth,
      count: 0,
      values: [],
    });
  }

  // Distribute values into bins
  for (const val of values) {
    let binIndex = Math.floor((val - minVal) / binWidth);
    // Handle edge case where val === maxVal
    if (binIndex >= binCount) {
      binIndex = binCount - 1;
    }
    bins[binIndex]!.count++;
    bins[binIndex]!.values.push(val);
  }

  return bins;
}

/**
 * Aggregates data by group key
 *
 * @param data - Array of objects
 * @param groupKey - Key to group by
 * @param valueKey - Key for values
 * @param aggregation - Aggregation type: 'sum', 'avg', 'min', 'max', 'count'
 * @returns Array of aggregated objects, or undefined for invalid input
 */
function aggregateData(
  data: unknown,
  groupKey: unknown,
  valueKey: unknown,
  aggregation: unknown
): Array<{ group: string; value: number }> | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  if (typeof groupKey !== 'string' || typeof valueKey !== 'string') {
    return undefined;
  }

  const validAggregations = new Set(['sum', 'avg', 'min', 'max', 'count']);
  if (typeof aggregation !== 'string' || !validAggregations.has(aggregation)) {
    return undefined;
  }

  if (data.length === 0) {
    return [];
  }

  // Group values
  const groups = new Map<string, number[]>();

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    const obj = item as Record<string, unknown>;
    const group = String(obj[groupKey] ?? '');
    const val = obj[valueKey];
    const numVal = typeof val === 'number' ? val : 0;

    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(numVal);
  }

  // Aggregate each group
  const result: Array<{ group: string; value: number }> = [];

  for (const [group, values] of groups) {
    let aggregatedValue: number;

    switch (aggregation) {
      case 'sum':
        aggregatedValue = values.reduce((sum, v) => sum + v, 0);
        break;
      case 'avg':
        aggregatedValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      default:
        aggregatedValue = 0;
    }

    result.push({ group, value: aggregatedValue });
  }

  return result;
}

/**
 * Downsamples data to reduce points
 *
 * @param data - Array of objects
 * @param targetCount - Target number of points
 * @param method - Downsampling method: 'uniform' or 'lttb'
 * @returns Downsampled array, or undefined for invalid input
 */
function downsample(
  data: unknown,
  targetCount: unknown,
  method: unknown
): unknown[] | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  if (typeof targetCount !== 'number' || targetCount <= 0) {
    return undefined;
  }

  const validMethods = new Set(['uniform', 'lttb']);
  if (typeof method !== 'string' || !validMethods.has(method)) {
    return undefined;
  }

  if (data.length === 0) {
    return [];
  }

  // If target count is >= data length, return original
  if (targetCount >= data.length) {
    return data;
  }

  if (method === 'uniform') {
    return downsampleUniform(data, targetCount);
  } else {
    return downsampleLTTB(data, targetCount);
  }
}

/**
 * Uniform downsampling - evenly spaced samples
 */
function downsampleUniform(data: unknown[], targetCount: number): unknown[] {
  if (targetCount === 1) {
    return [data[0]];
  }

  if (targetCount === 2) {
    return [data[0], data[data.length - 1]];
  }

  const result: unknown[] = [];
  const step = (data.length - 1) / (targetCount - 1);

  for (let i = 0; i < targetCount; i++) {
    const index = Math.round(i * step);
    result.push(data[index]);
  }

  return result;
}

/**
 * LTTB (Largest Triangle Three Buckets) downsampling algorithm
 * Preserves visual shape by selecting points that form the largest triangle area
 */
function downsampleLTTB(data: unknown[], targetCount: number): unknown[] {
  if (targetCount === 1) {
    return [data[0]];
  }

  if (targetCount === 2) {
    return [data[0], data[data.length - 1]];
  }

  // Helper to get x, y values from point
  const getXY = (point: unknown): { x: number; y: number } => {
    if (typeof point !== 'object' || point === null) {
      return { x: 0, y: 0 };
    }
    const obj = point as Record<string, unknown>;
    // Try common keys for x and y
    const x = typeof obj['x'] === 'number' ? obj['x'] :
              typeof obj['timestamp'] === 'number' ? obj['timestamp'] : 0;
    const y = typeof obj['y'] === 'number' ? obj['y'] :
              typeof obj['value'] === 'number' ? obj['value'] : 0;
    return { x, y };
  };

  const result: unknown[] = [];

  // Always keep first point
  result.push(data[0]);

  // Number of buckets for middle points
  const numBuckets = targetCount - 2;
  // Data points excluding first and last
  const middleData = data.length - 2;
  const bucketSize = middleData / numBuckets;

  let prevSelectedIndex = 0; // Index of previously selected point

  for (let bucketIndex = 0; bucketIndex < numBuckets; bucketIndex++) {
    // Current bucket range (in middle data, offset by 1 for original data)
    const bucketStart = Math.floor(bucketIndex * bucketSize) + 1;
    const bucketEnd = Math.floor((bucketIndex + 1) * bucketSize) + 1;

    // Next bucket (or last point) for average calculation
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = bucketIndex < numBuckets - 1
      ? Math.floor((bucketIndex + 2) * bucketSize) + 1
      : data.length;

    // Calculate average point in next bucket
    let avgX = 0;
    let avgY = 0;
    const nextLen = nextBucketEnd - nextBucketStart;

    if (nextLen > 0) {
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        const point = getXY(data[j]);
        avgX += point.x;
        avgY += point.y;
      }
      avgX /= nextLen;
      avgY /= nextLen;
    } else {
      // Use last point
      const lastPoint = getXY(data[data.length - 1]);
      avgX = lastPoint.x;
      avgY = lastPoint.y;
    }

    // Find point in current bucket with largest triangle area
    const pointA = getXY(data[prevSelectedIndex]);
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const pointB = getXY(data[j]);

      // Calculate triangle area using cross product formula
      // Area = 0.5 * |x_A(y_B - y_C) + x_B(y_C - y_A) + x_C(y_A - y_B)|
      const area = Math.abs(
        pointA.x * (pointB.y - avgY) +
        pointB.x * (avgY - pointA.y) +
        avgX * (pointA.y - pointB.y)
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    result.push(data[maxAreaIndex]);
    prevSelectedIndex = maxAreaIndex;
  }

  // Always keep last point
  result.push(data[data.length - 1]);

  return result;
}

/**
 * Evaluates a style expression to produce CSS class names
 *
 * @param expr - The style expression to evaluate
 * @param ctx - The evaluation context containing styles presets
 * @returns The computed CSS class string, or undefined if preset not found
 */
export function evaluateStyle(
  expr: StyleExprInput,
  ctx: EvaluationContext
): string | undefined {
  const preset = ctx.styles?.[expr.name];
  if (!preset) return undefined;

  let classes = preset.base;

  // Apply variants in preset.variants key order for consistency
  // For each variant key, use the expression value if specified, otherwise use default
  if (preset.variants) {
    for (const variantKey of Object.keys(preset.variants)) {
      let variantValueStr: string | null = null;

      // Check if variant is specified in expression
      if (expr.variants?.[variantKey]) {
        let variantValue: unknown;
        try {
          variantValue = evaluate(expr.variants[variantKey]!, ctx);
        } catch {
          // If evaluation fails (e.g., state doesn't exist), skip this variant
          continue;
        }
        if (variantValue != null) {
          variantValueStr = String(variantValue);
        }
      } else if (preset.defaultVariants?.[variantKey] !== undefined) {
        // Use default variant if not specified in expression
        variantValueStr = preset.defaultVariants[variantKey]!;
      }

      // Apply variant classes if we have a value
      if (variantValueStr !== null) {
        const variantClasses = preset.variants[variantKey]?.[variantValueStr];
        if (variantClasses) {
          classes += ' ' + variantClasses;
        }
      }
    }
  }

  return classes.trim();
}
