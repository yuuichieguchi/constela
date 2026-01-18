/**
 * Test module for createStateStore cookie expression priority.
 *
 * When using cookie expression for initial value, cookie should be
 * the source of truth. localStorage should NOT override cookie values.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStateStore } from '../src/state/store.js';
import type { StateDefinition } from '../src/state/store.js';

describe('createStateStore cookie expression priority', () => {
  beforeEach(() => {
    // Clear localStorage and cookies before each test
    localStorage.clear();
    document.cookie = 'theme=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  });

  afterEach(() => {
    localStorage.clear();
    document.cookie = 'theme=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  });

  it('should prioritize cookie over localStorage when using cookie expression', () => {
    /**
     * Scenario: User switched to light mode (cookie updated),
     * but localStorage still has old "dark" value.
     *
     * Expected: Cookie wins because cookie expression is specified.
     */

    // Arrange - set conflicting values
    document.cookie = 'theme=light; path=/';
    localStorage.setItem('theme', JSON.stringify('dark'));

    const definitions: Record<string, StateDefinition> = {
      theme: {
        type: 'string',
        initial: { expr: 'cookie', key: 'theme', default: 'dark' },
      },
    };

    // Act
    const store = createStateStore(definitions);

    // Assert - cookie should win, not localStorage
    expect(store.get('theme')).toBe('light');
  });

  it('should use cookie default when cookie is not set and localStorage has value', () => {
    /**
     * Scenario: No cookie set, but localStorage has old value.
     *
     * Expected: Cookie expression default wins because cookie expression is specified.
     */

    // Arrange - no cookie, but localStorage has value
    localStorage.setItem('theme', JSON.stringify('light'));

    const definitions: Record<string, StateDefinition> = {
      theme: {
        type: 'string',
        initial: { expr: 'cookie', key: 'theme', default: 'dark' },
      },
    };

    // Act
    const store = createStateStore(definitions);

    // Assert - cookie expression default should be used, not localStorage
    expect(store.get('theme')).toBe('dark');
  });

  it('should still read localStorage when NOT using cookie expression', () => {
    /**
     * Backward compatibility: When NOT using cookie expression,
     * localStorage should still be read for theme state.
     */

    // Arrange - localStorage has value, no cookie expression
    localStorage.setItem('theme', JSON.stringify('light'));

    const definitions: Record<string, StateDefinition> = {
      theme: {
        type: 'string',
        initial: 'dark', // NOT cookie expression
      },
    };

    // Act
    const store = createStateStore(definitions);

    // Assert - localStorage should be used (backward compatibility)
    expect(store.get('theme')).toBe('light');
  });

  it('should use literal initial when no localStorage and no cookie expression', () => {
    /**
     * Basic case: No localStorage, no cookie expression.
     */

    // Arrange - no localStorage
    const definitions: Record<string, StateDefinition> = {
      theme: {
        type: 'string',
        initial: 'dark',
      },
    };

    // Act
    const store = createStateStore(definitions);

    // Assert
    expect(store.get('theme')).toBe('dark');
  });
});
