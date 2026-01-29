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
      const target = evaluate(callExpr.target, ctx);
      if (target == null) return undefined;

      const args = callExpr.args?.map(arg => {
        // lambda expressions are not directly evaluated; they are passed to array methods
        if (arg.expr === 'lambda') return arg;
        return evaluate(arg, ctx);
      }) ?? [];

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
