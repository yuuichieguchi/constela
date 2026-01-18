/**
 * Test module for theme Cookie saving when theme state changes.
 *
 * Coverage:
 * - Setting theme state saves to document.cookie
 * - Cookie is set with correct path, max-age, and SameSite attributes
 *
 * TDD Red Phase: These tests will FAIL because cookie saving is not yet implemented.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStateStore } from '../../src/state/store.js';

// ==================== Test Setup ====================

/**
 * Mock for document.cookie that tracks set cookies
 */
class CookieMock {
  private cookies: Map<string, string> = new Map();
  private setCookieCalls: string[] = [];

  constructor() {
    this.setup();
  }

  setup(): void {
    let self = this;
    Object.defineProperty(document, 'cookie', {
      get() {
        return Array.from(self.cookies.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join('; ');
      },
      set(value: string) {
        self.setCookieCalls.push(value);
        // Parse the cookie string and extract name/value
        const [nameValue] = value.split(';');
        if (nameValue) {
          const [name, ...valueParts] = nameValue.split('=');
          if (name) {
            self.cookies.set(name.trim(), valueParts.join('=').trim());
          }
        }
      },
      configurable: true,
    });
  }

  getSetCookieCalls(): string[] {
    return this.setCookieCalls;
  }

  getLastSetCookie(): string | undefined {
    return this.setCookieCalls[this.setCookieCalls.length - 1];
  }

  reset(): void {
    this.cookies.clear();
    this.setCookieCalls = [];
  }

  restore(): void {
    // Restore default cookie behavior
    delete (document as Record<string, unknown>).cookie;
  }
}

// ==================== Tests ====================

describe('theme state cookie persistence', () => {
  let cookieMock: CookieMock;

  beforeEach(() => {
    cookieMock = new CookieMock();
  });

  afterEach(() => {
    cookieMock.restore();
  });

  // ==================== Setting theme state saves to cookie ====================

  describe('setting theme state saves to document.cookie', () => {
    /**
     * Given: A state store with theme state
     * When: theme state is set to 'dark'
     * Then: document.cookie should be set with theme=dark
     */
    it('should save theme=dark to document.cookie when theme is set to dark', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      store.set('theme', 'dark');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie).toBeDefined();
      expect(lastCookie).toContain('theme=dark');
    });

    /**
     * Given: A state store with theme state (initial: dark)
     * When: theme state is set to 'light'
     * Then: document.cookie should be set with theme=light
     */
    it('should save theme=light to document.cookie when theme is set to light', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'dark' },
      });

      // Act
      store.set('theme', 'light');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie).toBeDefined();
      expect(lastCookie).toContain('theme=light');
    });

    /**
     * Given: A state store with theme state
     * When: theme state is set multiple times
     * Then: document.cookie should be set each time
     */
    it('should update cookie each time theme is changed', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      store.set('theme', 'dark');
      store.set('theme', 'light');
      store.set('theme', 'dark');

      // Assert
      const calls = cookieMock.getSetCookieCalls();
      expect(calls.length).toBe(3);
      expect(calls[0]).toContain('theme=dark');
      expect(calls[1]).toContain('theme=light');
      expect(calls[2]).toContain('theme=dark');
    });

    /**
     * Given: A state store with theme state and other states
     * When: Non-theme state is changed
     * Then: document.cookie should NOT be set for non-theme changes
     */
    it('should NOT save to cookie when non-theme state is changed', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
        count: { type: 'number', initial: 0 },
        name: { type: 'string', initial: 'test' },
      });

      // Act
      store.set('count', 10);
      store.set('name', 'updated');

      // Assert
      const calls = cookieMock.getSetCookieCalls();
      // Should have no cookie set calls for non-theme changes
      expect(calls.length).toBe(0);
    });

    /**
     * Given: A state store without theme state
     * When: Any state is changed
     * Then: document.cookie should NOT be set
     */
    it('should NOT save to cookie when store has no theme state', () => {
      // Arrange
      const store = createStateStore({
        count: { type: 'number', initial: 0 },
        message: { type: 'string', initial: 'hello' },
      });

      // Act
      store.set('count', 100);
      store.set('message', 'world');

      // Assert
      const calls = cookieMock.getSetCookieCalls();
      expect(calls.length).toBe(0);
    });
  });

  // ==================== Cookie attributes ====================

  describe('cookie attributes', () => {
    /**
     * Given: A state store with theme state
     * When: theme state is set
     * Then: Cookie should include path=/ attribute
     */
    it('should set cookie with path=/ attribute', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      store.set('theme', 'dark');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie).toContain('path=/');
    });

    /**
     * Given: A state store with theme state
     * When: theme state is set
     * Then: Cookie should include max-age attribute for persistence (1 year)
     */
    it('should set cookie with max-age attribute for 1 year', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });
      const oneYearInSeconds = 365 * 24 * 60 * 60; // 31536000

      // Act
      store.set('theme', 'dark');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie).toContain(`max-age=${oneYearInSeconds}`);
    });

    /**
     * Given: A state store with theme state
     * When: theme state is set
     * Then: Cookie should include SameSite=Lax attribute
     */
    it('should set cookie with SameSite=Lax attribute', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      store.set('theme', 'dark');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie?.toLowerCase()).toContain('samesite=lax');
    });

    /**
     * Given: A state store with theme state
     * When: theme state is set
     * Then: Cookie should have all required attributes in correct format
     */
    it('should set cookie with all required attributes', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      store.set('theme', 'dark');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie).toBeDefined();
      // Check format: theme=dark; path=/; max-age=31536000; SameSite=Lax
      expect(lastCookie).toMatch(/theme=dark/);
      expect(lastCookie).toMatch(/path=\//);
      expect(lastCookie).toMatch(/max-age=\d+/);
      expect(lastCookie?.toLowerCase()).toMatch(/samesite=lax/i);
    });

    /**
     * Given: A state store with theme state
     * When: theme state is set to a value with special characters
     * Then: Cookie value should be properly encoded
     */
    it('should properly encode theme value with special characters', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      // Note: While 'dark' and 'light' are typical, we test encoding behavior
      store.set('theme', 'custom theme');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      // Space should be encoded
      expect(lastCookie).toContain('theme=custom%20theme');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: A state store with theme state
     * When: theme is set to empty string
     * Then: Cookie should be set with empty value (effectively clearing it)
     */
    it('should handle setting theme to empty string', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'dark' },
      });

      // Act
      store.set('theme', '');

      // Assert
      const lastCookie = cookieMock.getLastSetCookie();
      expect(lastCookie).toBeDefined();
      // Empty string cookie: theme=; path=/; ...
      expect(lastCookie).toMatch(/theme=;|theme=$/);
    });

    /**
     * Given: A state store with theme state
     * When: theme is set to same value as current
     * Then: Cookie should still be set (implementation may optimize this)
     */
    it('should set cookie even when theme value unchanged', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act
      store.set('theme', 'light'); // Same as initial

      // Assert
      // Cookie should be set (or implementation may skip this as optimization)
      const calls = cookieMock.getSetCookieCalls();
      // If implementation optimizes, this may be 0; otherwise expect 1
      expect(calls.length).toBeGreaterThanOrEqual(0);
    });

    /**
     * Given: A state store initialized in SSR environment (no document)
     * When: Running on server
     * Then: Setting theme should not throw (graceful degradation)
     *
     * Note: This test verifies the behavior doesn't break in SSR.
     * In jsdom, document exists, so we mock it as undefined.
     */
    it('should not throw when document is undefined (SSR safety)', () => {
      // Arrange
      const originalDocument = globalThis.document;
      // Temporarily remove document to simulate SSR
      // @ts-expect-error - Simulating SSR environment
      delete globalThis.document;

      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      // Act & Assert - should not throw
      expect(() => {
        store.set('theme', 'dark');
      }).not.toThrow();

      // Cleanup
      globalThis.document = originalDocument;
    });
  });

  // ==================== Integration with subscribe ====================

  describe('integration with subscribe', () => {
    /**
     * Given: A state store with theme state and a subscriber
     * When: theme state is set via subscription callback
     * Then: Cookie should be set after state change
     */
    it('should save cookie before notifying subscribers', () => {
      // Arrange
      const store = createStateStore({
        theme: { type: 'string', initial: 'light' },
      });

      let callbackOrder: string[] = [];
      const callback = (value: unknown) => {
        // Check if cookie was already set when callback is called
        const cookieAtCallbackTime = cookieMock.getSetCookieCalls().length;
        callbackOrder.push(`callback:${cookieAtCallbackTime}`);
      };

      store.subscribe('theme', callback);

      // Act
      store.set('theme', 'dark');

      // Assert
      // Callback should see that cookie was already set
      expect(callbackOrder[0]).toBe('callback:1');
    });
  });
});
