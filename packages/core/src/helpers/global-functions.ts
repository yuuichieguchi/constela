/**
 * Global Helper Functions
 *
 * Pure helper functions shared between runtime (client) and server (SSR).
 * These functions are callable as global helpers in Constela expressions.
 *
 * All functions are pure (no DOM, no browser APIs).
 * They use only: Math, Date, Intl.DateTimeFormat, Array methods.
 */

// ==================== Date Helper Functions ====================

/**
 * CalendarDay type - represents a day in the calendar grid
 */
export interface CalendarDay {
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
 * Scales a data value to a Y coordinate within a chart's drawable area.
 *
 * @param value - The data value to scale
 * @param boundsMin - Minimum value in the data set
 * @param boundsMax - Maximum value in the data set
 * @param height - Total height of the chart
 * @param paddingTop - Top padding in pixels
 * @param paddingBottom - Bottom padding in pixels
 * @returns Scaled Y coordinate, or undefined for invalid input
 */
function scaleChartY(
  value: unknown,
  boundsMin: unknown,
  boundsMax: unknown,
  height: unknown,
  paddingTop: unknown,
  paddingBottom: unknown
): number | undefined {
  if (
    typeof value !== 'number' ||
    typeof boundsMin !== 'number' ||
    typeof boundsMax !== 'number' ||
    typeof height !== 'number' ||
    typeof paddingTop !== 'number' ||
    typeof paddingBottom !== 'number'
  ) {
    return undefined;
  }

  const drawableHeight = height - paddingTop - paddingBottom;

  if (drawableHeight <= 0) {
    return paddingTop;
  }

  if (boundsMax === boundsMin) {
    return paddingTop + drawableHeight / 2;
  }

  const normalized = (value - boundsMin) / (boundsMax - boundsMin);
  return paddingTop + drawableHeight * (1 - normalized);
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
  orientation: unknown,
  valueKey?: unknown
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
  const vk = typeof valueKey === 'string' ? valueKey : undefined;
  const values = data.map((d: unknown) => {
    if (typeof d === 'number') return d;
    if (d && typeof d === 'object' && vk && typeof (d as Record<string, unknown>)[vk] === 'number') {
      return (d as Record<string, unknown>)[vk] as number;
    }
    return 0;
  });
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

  // Calculate start and end points (angle convention: 0 at top, clockwise)
  const x1 = cx + radius * Math.cos(startAngle - Math.PI / 2);
  const y1 = cy + radius * Math.sin(startAngle - Math.PI / 2);
  const x2 = cx + radius * Math.cos(endAngle - Math.PI / 2);
  const y2 = cy + radius * Math.sin(endAngle - Math.PI / 2);

  // Determine if arc is more than 180 degrees (large-arc-flag)
  const angleDiff = endAngle - startAngle;
  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

  // SVG arc: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  // sweep-flag = 1 for clockwise
  return `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
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

  for (const [group, groupValues] of groups) {
    let aggregatedValue: number;

    switch (aggregation) {
      case 'sum':
        aggregatedValue = groupValues.reduce((sum, v) => sum + v, 0);
        break;
      case 'avg':
        aggregatedValue = groupValues.reduce((sum, v) => sum + v, 0) / groupValues.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...groupValues);
        break;
      case 'max':
        aggregatedValue = Math.max(...groupValues);
        break;
      case 'count':
        aggregatedValue = groupValues.length;
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

// ==================== Chart Helpers - Grid & Redesign ====================

/**
 * Generates grid line objects by combining generateTicks + scaleChartY
 *
 * @param min - Minimum data value
 * @param max - Maximum data value
 * @param height - Total chart height in pixels
 * @param padTop - Top padding in pixels
 * @param padBottom - Bottom padding in pixels
 * @param count - Number of grid lines to generate
 * @returns Array of {y, value, label} objects, or [] for invalid input
 */
function getChartGridLines(
  min: unknown,
  max: unknown,
  height: unknown,
  padTop: unknown,
  padBottom: unknown,
  count: unknown
): Array<{ y: number; value: number; label: string }> {
  if (
    typeof min !== 'number' ||
    typeof max !== 'number' ||
    typeof height !== 'number' ||
    typeof padTop !== 'number' ||
    typeof padBottom !== 'number' ||
    typeof count !== 'number'
  ) {
    return [];
  }

  if (count <= 0) {
    return [];
  }

  const ticks = generateTicks(min, max, count);

  const result: Array<{ y: number; value: number; label: string }> = [];
  for (const tick of ticks) {
    const y = scaleChartY(tick, min, max, height, padTop, padBottom);
    if (y === undefined) {
      continue;
    }
    result.push({
      y,
      value: tick,
      label: tick.toString(),
    });
  }

  return result;
}

/**
 * Generates an SVG path for a bar with rounded top corners
 *
 * @param x - Left edge x coordinate
 * @param y - Top edge y coordinate
 * @param width - Bar width
 * @param height - Bar height
 * @param radius - Corner radius for top corners
 * @returns SVG path string, or '' for invalid input
 */
function getRoundedBarPath(
  x: unknown,
  y: unknown,
  width: unknown,
  height: unknown,
  radius: unknown
): string {
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof radius !== 'number'
  ) {
    return '';
  }

  if (width <= 0 || height <= 0) {
    return '';
  }

  const r = Math.min(radius, width / 2, height);

  if (r <= 0) {
    // Simple rectangle path (no rounded corners)
    return `M${x},${y + height}L${x},${y}L${x + width},${y}L${x + width},${y + height}Z`;
  }

  // Top-only rounded corners using quadratic Bezier curves
  return `M${x},${y + height}L${x},${y + r}Q${x},${y} ${x + r},${y}L${x + width - r},${y}Q${x + width},${y} ${x + width},${y + r}L${x + width},${y + height}Z`;
}

/**
 * Generates an SVG path for a donut arc segment (ring sector)
 *
 * Uses the same angle convention as getArcPath but with -PI/2 offset
 * so that angle 0 starts at the top (12 o'clock position).
 *
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param outerR - Outer radius
 * @param innerR - Inner radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @returns SVG path string, or '' for invalid input
 */
function getDonutArcPath(
  cx: unknown,
  cy: unknown,
  outerR: unknown,
  innerR: unknown,
  startAngle: unknown,
  endAngle: unknown
): string {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof outerR !== 'number' ||
    typeof innerR !== 'number' ||
    typeof startAngle !== 'number' ||
    typeof endAngle !== 'number'
  ) {
    return '';
  }

  if (innerR >= outerR || outerR <= 0 || innerR < 0) {
    return '';
  }

  // Use angle convention: x = cx + r * cos(angle - PI/2), y = cy + r * sin(angle - PI/2)
  const outerX1 = cx + outerR * Math.cos(startAngle - Math.PI / 2);
  const outerY1 = cy + outerR * Math.sin(startAngle - Math.PI / 2);
  const outerX2 = cx + outerR * Math.cos(endAngle - Math.PI / 2);
  const outerY2 = cy + outerR * Math.sin(endAngle - Math.PI / 2);

  const innerX1 = cx + innerR * Math.cos(startAngle - Math.PI / 2);
  const innerY1 = cy + innerR * Math.sin(startAngle - Math.PI / 2);
  const innerX2 = cx + innerR * Math.cos(endAngle - Math.PI / 2);
  const innerY2 = cy + innerR * Math.sin(endAngle - Math.PI / 2);

  const angleDiff = endAngle - startAngle;
  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

  // 1. Move to outer arc start
  // 2. Arc along outer circle (sweep = 1, clockwise)
  // 3. Line to inner arc end
  // 4. Arc along inner circle back to start (sweep = 0, counter-clockwise)
  // 5. Close
  return `M${outerX1},${outerY1}A${outerR},${outerR} 0 ${largeArcFlag},1 ${outerX2},${outerY2}L${innerX2},${innerY2}A${innerR},${innerR} 0 ${largeArcFlag},0 ${innerX1},${innerY1}Z`;
}

/**
 * Calculates the label position for a pie/donut slice
 *
 * Uses the same angle convention as getDonutArcPath (-PI/2 offset).
 *
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param radius - Radius at which to place the label
 * @param startAngle - Start angle of the slice in radians
 * @param endAngle - End angle of the slice in radians
 * @returns {x, y} position, or undefined for invalid input
 */
function getSliceLabelPosition(
  cx: unknown,
  cy: unknown,
  radius: unknown,
  startAngle: unknown,
  endAngle: unknown
): { x: number; y: number } | undefined {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof radius !== 'number' ||
    typeof startAngle !== 'number' ||
    typeof endAngle !== 'number'
  ) {
    return undefined;
  }

  const midAngle = (startAngle + endAngle) / 2;
  const x = cx + radius * Math.cos(midAngle - Math.PI / 2);
  const y = cy + radius * Math.sin(midAngle - Math.PI / 2);

  return { x, y };
}

/**
 * Generates concentric polygon point strings for a radar chart grid
 *
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param radius - Outer radius of the radar grid
 * @param sides - Number of sides (axes) of the radar
 * @param levels - Number of concentric levels
 * @returns Array of polygon point strings ("x1,y1 x2,y2 ..."), or [] for invalid input
 */
function getRadarGridPolygons(
  cx: unknown,
  cy: unknown,
  radius: unknown,
  sides: unknown,
  levels: unknown
): string[] {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof radius !== 'number' ||
    typeof sides !== 'number' ||
    typeof levels !== 'number'
  ) {
    return [];
  }

  if (sides < 3 || levels < 1) {
    return [];
  }

  const result: string[] = [];

  for (let i = 1; i <= levels; i++) {
    const levelRadius = radius * (i / levels);
    const points: string[] = [];

    for (let j = 0; j < sides; j++) {
      const angle = (2 * Math.PI * j) / sides - Math.PI / 2;
      const x = cx + levelRadius * Math.cos(angle);
      const y = cy + levelRadius * Math.sin(angle);
      points.push(`${x},${y}`);
    }

    result.push(points.join(' '));
  }

  return result;
}

// ==================== Activity Ring Helpers ====================

/**
 * Creates an SVG arc path for a single stroke-based activity ring segment.
 *
 * Returns an OPEN arc (no trailing Z) suitable for stroke-based rendering.
 * Uses the same angle convention as getDonutArcPath: x = cx + r * cos(angle - PI/2).
 *
 * For nearly full circles (angle diff > 2*PI - 0.01), generates two arcs split
 * at the midpoint to avoid SVG rendering issues with 360-degree arcs.
 *
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param radius - Radius of the ring (stroke center)
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @returns SVG path string "M...A..." without trailing Z, or '' for invalid input
 */
function getActivityRingArcPath(
  cx: unknown,
  cy: unknown,
  radius: unknown,
  startAngle: unknown,
  endAngle: unknown
): string {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof radius !== 'number' ||
    typeof startAngle !== 'number' ||
    typeof endAngle !== 'number'
  ) {
    return '';
  }

  const angleDiff = endAngle - startAngle;

  // For nearly full circles, split into two arcs to avoid SVG rendering issues
  if (Math.abs(angleDiff) > 2 * Math.PI - 0.01) {
    const midAngle = startAngle + angleDiff / 2;

    const x1 = cx + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = cy + radius * Math.sin(startAngle - Math.PI / 2);
    const xMid = cx + radius * Math.cos(midAngle - Math.PI / 2);
    const yMid = cy + radius * Math.sin(midAngle - Math.PI / 2);
    const x2 = cx + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = cy + radius * Math.sin(endAngle - Math.PI / 2);

    const halfDiff = angleDiff / 2;
    const largeArc1 = Math.abs(halfDiff) > Math.PI ? 1 : 0;
    const largeArc2 = Math.abs(halfDiff) > Math.PI ? 1 : 0;

    return `M${x1},${y1}A${radius},${radius} 0 ${largeArc1},1 ${xMid},${yMid}A${radius},${radius} 0 ${largeArc2},1 ${x2},${y2}`;
  }

  const x1 = cx + radius * Math.cos(startAngle - Math.PI / 2);
  const y1 = cy + radius * Math.sin(startAngle - Math.PI / 2);
  const x2 = cx + radius * Math.cos(endAngle - Math.PI / 2);
  const y2 = cy + radius * Math.sin(endAngle - Math.PI / 2);

  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

  return `M${x1},${y1}A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}`;
}

/**
 * Computes layout for Activity Ring style concentric rings.
 *
 * Returns an array of ring descriptors with radius (stroke center), angle,
 * and maxAngle for each data item. Rings are laid out from outerRadius inward.
 *
 * @param data - Array of data items
 * @param valueKey - Key to extract numeric values from data items
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param outerRadius - Outer radius of the outermost ring
 * @param ringWidth - Width (stroke width) of each ring
 * @param ringGap - Gap between adjacent rings
 * @returns Array of {radius, angle, maxAngle}, or [] for invalid input
 */
function getActivityRingLayout(
  data: unknown,
  valueKey: unknown,
  cx: unknown,
  cy: unknown,
  outerRadius: unknown,
  ringWidth: unknown,
  ringGap: unknown
): Array<{ radius: number; angle: number; maxAngle: number }> {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  if (typeof valueKey !== 'string') {
    return [];
  }

  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof ringWidth !== 'number' ||
    typeof ringGap !== 'number'
  ) {
    return [];
  }

  const numOuterRadius = outerRadius;
  const numRingWidth = ringWidth;
  const numRingGap = ringGap;

  const values = data.map((d: Record<string, unknown>) => {
    const v = d[valueKey];
    return typeof v === 'number' ? v : 0;
  });

  const max = Math.max(...values);
  const minRadius = numRingWidth / 2;

  const rings: Array<{ radius: number; angle: number; maxAngle: number }> = [];
  for (let i = 0; i < data.length; i++) {
    const radius = numOuterRadius - numRingWidth / 2 - i * (numRingWidth + numRingGap);
    if (radius < minRadius) break;
    rings.push({
      radius,
      angle: max === 0 ? 0 : ((values[i] ?? 0) / max) * 2 * Math.PI,
      maxAngle: 2 * Math.PI,
    });
  }
  return rings;
}

// ==================== Color Palette Helpers ====================

/**
 * Returns a named color palette as an array of hex color strings.
 *
 * Available palettes:
 * - "health": 7 Apple Health-inspired colors
 * - "activity": 3 Activity Ring colors (Move/Exercise/Stand)
 * - "vibrant": 6 vibrant UI colors
 *
 * Falls back to the "health" palette for any unknown, null, or non-string input.
 *
 * @param palette - Palette name
 * @returns Array of hex color strings
 */
function getChartDefaultColors(palette: unknown): string[] {
  const palettes: Record<string, string[]> = {
    health: ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'],
    activity: ['#FA114F', '#A8FF04', '#00D4FF'],
    vibrant: ['#FF2D55', '#FF9500', '#5AC8FA', '#007AFF', '#4CD964', '#FF3B30'],
  };

  if (typeof palette !== 'string' || !(palette in palettes)) {
    return palettes['health']!;
  }

  return palettes[palette]!;
}

// ==================== Global Functions Map ====================

/**
 * Whitelist of global helper functions that can be called with target: null
 */
export const GLOBAL_FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
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
  getBarDimensions: (data, index, width, height, gap, orientation, valueKey) => getBarDimensions(data, index, width, height, gap, orientation, valueKey),
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
  scaleChartY: (value, boundsMin, boundsMax, height, paddingTop, paddingBottom) =>
    scaleChartY(value, boundsMin, boundsMax, height, paddingTop, paddingBottom),
  generateTicks: (min, max, count) => generateTicks(min, max, count),
  // Chart helpers - Data aggregation
  binData: (data, valueKey, binCount) => binData(data, valueKey, binCount),
  aggregateData: (data, groupKey, valueKey, aggregation) => aggregateData(data, groupKey, valueKey, aggregation),
  downsample: (data, targetCount, method) => downsample(data, targetCount, method),
  // Chart helpers - Grid & redesign
  getChartGridLines: (min, max, height, padTop, padBottom, count) =>
    getChartGridLines(min, max, height, padTop, padBottom, count),
  getRoundedBarPath: (x, y, width, height, radius) => getRoundedBarPath(x, y, width, height, radius),
  getDonutArcPath: (cx, cy, outerR, innerR, startAngle, endAngle) =>
    getDonutArcPath(cx, cy, outerR, innerR, startAngle, endAngle),
  getSliceLabelPosition: (cx, cy, radius, startAngle, endAngle) =>
    getSliceLabelPosition(cx, cy, radius, startAngle, endAngle),
  getRadarGridPolygons: (cx, cy, radius, sides, levels) => getRadarGridPolygons(cx, cy, radius, sides, levels),
  // Chart helpers - Activity Ring
  getActivityRingArcPath: (cx, cy, radius, startAngle, endAngle) => getActivityRingArcPath(cx, cy, radius, startAngle, endAngle),
  getActivityRingLayout: (data, valueKey, cx, cy, outerRadius, ringWidth, ringGap) => getActivityRingLayout(data, valueKey, cx, cy, outerRadius, ringWidth, ringGap),
  getChartDefaultColors: (palette) => getChartDefaultColors(palette),
  // Math utility functions
  min: (...args: unknown[]) => {
    const nums = args.filter((a): a is number => typeof a === 'number');
    return nums.length > 0 ? Math.min(...nums) : undefined;
  },
  max: (...args: unknown[]) => {
    const nums = args.filter((a): a is number => typeof a === 'number');
    return nums.length > 0 ? Math.max(...nums) : undefined;
  },
};

// ==================== Plugin Registration API ====================

// Track built-in function names (immutable after module load)
const BUILTIN_FUNCTION_NAMES = new Set(Object.keys(GLOBAL_FUNCTIONS));

/**
 * Registers a custom global function.
 * Throws if the name collides with a built-in or existing custom function.
 */
const FORBIDDEN_FUNCTION_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

export function registerGlobalFunction(name: string, fn: (...args: unknown[]) => unknown): void {
  if (FORBIDDEN_FUNCTION_NAMES.has(name)) {
    throw new Error(`Cannot register global function '${name}': forbidden name`);
  }
  if (BUILTIN_FUNCTION_NAMES.has(name)) {
    throw new Error(`Cannot register global function '${name}': conflicts with built-in function`);
  }
  if (name in GLOBAL_FUNCTIONS) {
    throw new Error(`Cannot register global function '${name}': already registered`);
  }
  GLOBAL_FUNCTIONS[name] = fn;
}

/**
 * Unregisters a custom global function.
 * Built-in functions cannot be unregistered.
 */
export function unregisterGlobalFunction(name: string): void {
  if (BUILTIN_FUNCTION_NAMES.has(name)) {
    throw new Error(`Cannot unregister built-in function '${name}'`);
  }
  delete GLOBAL_FUNCTIONS[name];
}

// ==================== Public API ====================

/**
 * Calls a global helper function by name
 *
 * @param method - The function name to call
 * @param args - Arguments to pass to the function
 * @returns The function result, or undefined if the function is not found
 */
export function callGlobalFunction(method: string, args: unknown[]): unknown {
  const fn = GLOBAL_FUNCTIONS[method];
  if (!fn) {
    return undefined;
  }
  return fn(...args);
}
