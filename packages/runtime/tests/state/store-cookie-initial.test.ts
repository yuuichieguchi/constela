/**
 * Test module for StateStore - Cookie Expression Initial Value Evaluation (Client-side)
 *
 * Coverage:
 * - Cookie expression reads from document.cookie on initialization
 * - Falls back to default when cookie not present
 * - Backwards compatible with primitive initial values
 *
 * TDD Red Phase: These tests will FAIL because cookie expression evaluation
 * in client-side state store is not yet implemented.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStateStore, type StateDefinition } from '../../src/state/store.js';

// ==================== Type Definition for Cookie Initial Expression ====================

/**
 * Cookie initial expression type
 * This type defines the structure for cookie-based state initialization
 */
interface CookieInitialExpr {
  expr: 'cookie';
  key: string;
  default: string;
}

// ==================== Test Setup ====================

/**
 * Mock for document.cookie that provides controlled cookie values
 */
class CookieMock {
  private cookies: Map<string, string> = new Map();
  private originalDescriptor: PropertyDescriptor | undefined;

  setup(): void {
    // Save original descriptor
    this.originalDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');

    const self = this;
    Object.defineProperty(document, 'cookie', {
      get() {
        return Array.from(self.cookies.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join('; ');
      },
      set(value: string) {
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

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  getCookies(): Map<string, string> {
    return this.cookies;
  }

  clear(): void {
    this.cookies.clear();
  }

  restore(): void {
    if (this.originalDescriptor) {
      Object.defineProperty(document, 'cookie', this.originalDescriptor);
    } else {
      delete (document as Record<string, unknown>).cookie;
    }
  }
}

// ==================== Tests ====================

describe('createStateStore with Cookie Expression Initial Values', () => {
  let cookieMock: CookieMock;

  beforeEach(() => {
    cookieMock = new CookieMock();
    cookieMock.setup();
  });

  afterEach(() => {
    cookieMock.restore();
  });

  // ==================== Cookie expression reads from document.cookie ====================

  describe('cookie expression reads from document.cookie on initialization', () => {
    /**
     * Given: A state definition with cookie expression initial
     * When: createStateStore is called and document.cookie has the value
     * Then: The state should be initialized from the cookie value
     */
    it('should read theme from document.cookie on initialization', () => {
      // Arrange
      cookieMock.setCookie('theme', 'dark');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('dark');
    });

    /**
     * Given: Multiple state definitions with different cookie expressions
     * When: createStateStore is called with corresponding cookies set
     * Then: Each state should be initialized from its respective cookie
     */
    it('should read multiple cookies for different state fields', () => {
      // Arrange
      cookieMock.setCookie('theme', 'dark');
      cookieMock.setCookie('locale', 'ja-JP');
      cookieMock.setCookie('sidebar', 'collapsed');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
        locale: {
          type: 'string',
          initial: { expr: 'cookie', key: 'locale', default: 'en-US' } as unknown,
        },
        sidebarState: {
          type: 'string',
          initial: { expr: 'cookie', key: 'sidebar', default: 'expanded' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('dark');
      expect(store.get('locale')).toBe('ja-JP');
      expect(store.get('sidebarState')).toBe('collapsed');
    });

    /**
     * Given: A cookie expression with key containing special characters
     * When: The cookie with that key exists
     * Then: The value should be read correctly
     */
    it('should read cookies with special characters in key', () => {
      // Arrange
      cookieMock.setCookie('user-pref_v2', 'custom-value');

      const definitions: Record<string, StateDefinition> = {
        preference: {
          type: 'string',
          initial: { expr: 'cookie', key: 'user-pref_v2', default: 'default' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('preference')).toBe('custom-value');
    });

    /**
     * Given: A cookie with URL-encoded value
     * When: createStateStore reads the cookie
     * Then: The value should be decoded properly
     */
    it('should handle URL-encoded cookie values', () => {
      // Arrange
      // Cookie values are often URL-encoded
      cookieMock.setCookie('theme', encodeURIComponent('dark mode'));

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      // Implementation should decode the value
      expect(store.get('theme')).toBe('dark mode');
    });
  });

  // ==================== Falls back to default when cookie not present ====================

  describe('falls back to default when cookie not present', () => {
    /**
     * Given: A state definition with cookie expression initial
     * When: document.cookie does not have the specified cookie
     * Then: The state should be initialized to the default value
     */
    it('should use default value when cookie is not present', () => {
      // Arrange - no cookies set
      cookieMock.clear();

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('light');
    });

    /**
     * Given: Multiple cookie expressions with different defaults
     * When: No cookies are set
     * Then: Each state should use its own default value
     */
    it('should use respective default values for each state field', () => {
      // Arrange - no cookies set
      cookieMock.clear();

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'system' } as unknown,
        },
        locale: {
          type: 'string',
          initial: { expr: 'cookie', key: 'locale', default: 'en-US' } as unknown,
        },
        fontSize: {
          type: 'string',
          initial: { expr: 'cookie', key: 'font-size', default: 'medium' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('system');
      expect(store.get('locale')).toBe('en-US');
      expect(store.get('fontSize')).toBe('medium');
    });

    /**
     * Given: Some cookies present and some not
     * When: createStateStore is called
     * Then: Present cookies should use cookie value, missing should use default
     */
    it('should mix cookie values and defaults based on cookie presence', () => {
      // Arrange
      cookieMock.setCookie('theme', 'dark');
      // 'locale' cookie is NOT set

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
        locale: {
          type: 'string',
          initial: { expr: 'cookie', key: 'locale', default: 'en-US' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('dark'); // From cookie
      expect(store.get('locale')).toBe('en-US'); // From default
    });

    /**
     * Given: A cookie expression with empty string as default
     * When: Cookie is not present
     * Then: The state should be initialized to empty string
     */
    it('should use empty string as default when specified', () => {
      // Arrange - no cookies set
      cookieMock.clear();

      const definitions: Record<string, StateDefinition> = {
        sessionId: {
          type: 'string',
          initial: { expr: 'cookie', key: 'session', default: '' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('sessionId')).toBe('');
    });

    /**
     * Given: A cookie is set to empty string
     * When: createStateStore is called
     * Then: Empty string should be used as the value (not fall back to default)
     */
    it('should use empty cookie value instead of default', () => {
      // Arrange
      cookieMock.setCookie('theme', '');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      // Empty string cookie value should be used, not the default
      expect(store.get('theme')).toBe('');
    });
  });

  // ==================== Backwards compatible with primitive initial values ====================

  describe('backwards compatible with primitive initial values', () => {
    /**
     * Given: A state definition with primitive string initial value
     * When: createStateStore is called
     * Then: The primitive value should be used (existing behavior)
     */
    it('should use primitive string initial value as before', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {
        message: {
          type: 'string',
          initial: 'Hello, World!',
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('message')).toBe('Hello, World!');
    });

    /**
     * Given: A state definition with primitive number initial value
     * When: createStateStore is called
     * Then: The number value should be used
     */
    it('should use primitive number initial value', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {
        count: {
          type: 'number',
          initial: 42,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('count')).toBe(42);
    });

    /**
     * Given: A state definition with primitive boolean initial value
     * When: createStateStore is called
     * Then: The boolean value should be used
     */
    it('should use primitive boolean initial value', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {
        isEnabled: {
          type: 'boolean',
          initial: true,
        },
        isHidden: {
          type: 'boolean',
          initial: false,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('isEnabled')).toBe(true);
      expect(store.get('isHidden')).toBe(false);
    });

    /**
     * Given: A state definition with primitive list initial value
     * When: createStateStore is called
     * Then: The list value should be used
     */
    it('should use primitive list initial value', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {
        items: {
          type: 'list',
          initial: ['a', 'b', 'c'],
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('items')).toEqual(['a', 'b', 'c']);
    });

    /**
     * Given: A state definition with primitive object initial value
     * When: createStateStore is called
     * Then: The object value should be used
     */
    it('should use primitive object initial value', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {
        config: {
          type: 'object',
          initial: { key: 'value', nested: { a: 1 } },
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('config')).toEqual({ key: 'value', nested: { a: 1 } });
    });

    /**
     * Given: Mixed cookie expression and primitive initial values
     * When: createStateStore is called with cookies set
     * Then: Cookie expressions should read cookies, primitives unchanged
     */
    it('should handle mixed cookie expressions and primitive initial values', () => {
      // Arrange
      cookieMock.setCookie('theme', 'dark');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
        count: {
          type: 'number',
          initial: 0,
        },
        items: {
          type: 'list',
          initial: ['initial'],
        },
        locale: {
          type: 'string',
          initial: { expr: 'cookie', key: 'locale', default: 'en' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('dark'); // From cookie
      expect(store.get('count')).toBe(0); // Primitive
      expect(store.get('items')).toEqual(['initial']); // Primitive
      expect(store.get('locale')).toBe('en'); // From default (cookie not set)
    });

    /**
     * Given: Primitive initial value that looks like cookie expression
     * When: createStateStore is called
     * Then: It should not be interpreted as cookie expression
     */
    it('should not interpret plain object initial as cookie expression', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {
        data: {
          type: 'object',
          initial: { expr: 'not-cookie', key: 'something', default: 'value' },
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      // Should be treated as plain object, not a cookie expression
      expect(store.get('data')).toEqual({
        expr: 'not-cookie',
        key: 'something',
        default: 'value',
      });
    });
  });

  // ==================== State mutations after initialization ====================

  describe('state mutations after initialization', () => {
    /**
     * Given: A state initialized from cookie expression
     * When: The state is updated via set()
     * Then: The new value should be stored correctly
     */
    it('should allow updating state that was initialized from cookie', () => {
      // Arrange
      cookieMock.setCookie('theme', 'dark');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      const store = createStateStore(definitions);
      expect(store.get('theme')).toBe('dark'); // Initial from cookie

      // Act
      store.set('theme', 'system');

      // Assert
      expect(store.get('theme')).toBe('system');
    });

    /**
     * Given: A state initialized from cookie expression
     * When: A subscriber is added and state is updated
     * Then: The subscriber should receive the new value
     */
    it('should notify subscribers when cookie-initialized state is updated', () => {
      // Arrange
      cookieMock.setCookie('theme', 'dark');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      const store = createStateStore(definitions);
      const subscriber = vi.fn();
      store.subscribe('theme', subscriber);

      // Act
      store.set('theme', 'high-contrast');

      // Assert
      expect(subscriber).toHaveBeenCalledWith('high-contrast');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    /**
     * Given: document.cookie contains multiple cookies
     * When: createStateStore reads a specific cookie
     * Then: Only the correct cookie value should be used
     */
    it('should correctly parse specific cookie from multiple cookies', () => {
      // Arrange
      cookieMock.setCookie('other', 'value1');
      cookieMock.setCookie('theme', 'dark');
      cookieMock.setCookie('another', 'value2');

      const definitions: Record<string, StateDefinition> = {
        theme: {
          type: 'string',
          initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('theme')).toBe('dark');
    });

    /**
     * Given: Cookie value contains equals sign
     * When: createStateStore parses the cookie
     * Then: The full value including equals sign should be preserved
     */
    it('should handle cookie values containing equals signs', () => {
      // Arrange
      cookieMock.setCookie('data', 'key=value=extra');

      const definitions: Record<string, StateDefinition> = {
        data: {
          type: 'string',
          initial: { expr: 'cookie', key: 'data', default: 'default' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('data')).toBe('key=value=extra');
    });

    /**
     * Given: SSR environment simulation (no window/document)
     * When: createStateStore is called with cookie expression
     * Then: Should fall back to default without error
     *
     * Note: In jsdom environment, we simulate by temporarily removing document
     */
    it('should handle missing document gracefully (SSR safety)', () => {
      // Arrange
      const originalDocument = globalThis.document;

      try {
        // @ts-expect-error - Simulating SSR environment
        delete globalThis.document;

        const definitions: Record<string, StateDefinition> = {
          theme: {
            type: 'string',
            initial: { expr: 'cookie', key: 'theme', default: 'light' } as unknown,
          },
        };

        // Act & Assert
        expect(() => {
          const store = createStateStore(definitions);
          expect(store.get('theme')).toBe('light'); // Should use default
        }).not.toThrow();
      } finally {
        // Cleanup - always restore document
        globalThis.document = originalDocument;
        // Reinitialize cookie mock for subsequent tests
        cookieMock.setup();
      }
    });

    /**
     * Given: Empty state definitions
     * When: createStateStore is called
     * Then: Should create empty store without error
     */
    it('should handle empty state definitions', () => {
      // Arrange
      const definitions: Record<string, StateDefinition> = {};

      // Act & Assert
      expect(() => {
        const store = createStateStore(definitions);
        expect(store).toBeDefined();
      }).not.toThrow();
    });

    /**
     * Given: Cookie with whitespace in value
     * When: createStateStore reads the cookie
     * Then: Whitespace should be preserved
     */
    it('should preserve whitespace in cookie values', () => {
      // Arrange
      cookieMock.setCookie('message', '  spaces around  ');

      const definitions: Record<string, StateDefinition> = {
        message: {
          type: 'string',
          initial: { expr: 'cookie', key: 'message', default: 'default' } as unknown,
        },
      };

      // Act
      const store = createStateStore(definitions);

      // Assert
      expect(store.get('message')).toBe('  spaces around  ');
    });
  });
});
