/**
 * Test module for createRouter.
 *
 * Coverage:
 * - Route matching and mounting
 * - Fallback for unmatched routes
 * - navigate() with push
 * - navigate() with replace
 * - popstate handling (back/forward)
 * - getContext() returns current context
 * - onRouteChange callback
 * - basePath handling
 * - title updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter } from '../src/router.js';
import type { RouterInstance, RouteDef, RouteContext } from '../src/router.js';
import type { CompiledProgram } from '@constela/compiler';

describe('createRouter', () => {
  // ==================== Setup ====================

  let container: HTMLElement;
  let originalLocation: Location;
  let originalHistory: History;
  let currentMountHandle: { destroy(): void } | null = null;

  /**
   * Create a minimal mock CompiledProgram for testing
   */
  function createMockProgram(id: string): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: {
        kind: 'element',
        tag: 'div',
        props: { id: { expr: 'lit', value: id } },
        children: [{ kind: 'text', value: { expr: 'lit', value: `Page: ${id}` } }],
      },
    };
  }

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    // Store original window objects
    originalLocation = window.location;
    originalHistory = window.history;

    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://localhost/',
        origin: 'http://localhost',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock history
    const historyState: { state: unknown; url: string }[] = [{ state: null, url: '/' }];
    let historyIndex = 0;

    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn((state, _title, url) => {
          historyIndex++;
          historyState.splice(historyIndex, historyState.length - historyIndex, { state, url: url as string });
          (window.location as { pathname: string }).pathname = url as string;
        }),
        replaceState: vi.fn((state, _title, url) => {
          historyState[historyIndex] = { state, url: url as string };
          (window.location as { pathname: string }).pathname = url as string;
        }),
        back: vi.fn(() => {
          if (historyIndex > 0) {
            historyIndex--;
            (window.location as { pathname: string }).pathname = historyState[historyIndex].url;
            window.dispatchEvent(new PopStateEvent('popstate', { state: historyState[historyIndex].state }));
          }
        }),
        forward: vi.fn(() => {
          if (historyIndex < historyState.length - 1) {
            historyIndex++;
            (window.location as { pathname: string }).pathname = historyState[historyIndex].url;
            window.dispatchEvent(new PopStateEvent('popstate', { state: historyState[historyIndex].state }));
          }
        }),
        go: vi.fn(),
        length: 1,
        scrollRestoration: 'auto',
        state: null,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up current router to remove popstate listener
    if (currentMountHandle) {
      currentMountHandle.destroy();
      currentMountHandle = null;
    }
    container.remove();
    vi.clearAllMocks();
  });

  // ==================== Route Matching and Mounting ====================

  describe('route matching and mounting', () => {
    it('should mount the matching route program', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];

      // Act
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#home')).not.toBeNull();
      expect(container.querySelector('#home')?.textContent).toBe('Page: home');
    });

    it('should mount correct route based on current path', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/about';
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];

      // Act
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#about')).not.toBeNull();
      expect(container.querySelector('#home')).toBeNull();
    });

    it('should match dynamic routes and provide params', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/users/42';
      const usersProgram = createMockProgram('user-detail');
      const routes: RouteDef[] = [
        { path: '/users/:id', program: usersProgram },
      ];

      // Act
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#user-detail')).not.toBeNull();
      const ctx = router.getContext();
      expect(ctx.params).toEqual({ id: '42' });
    });

    it('should destroy previous program when mounting new route', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];

      // Act
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);
      expect(container.querySelector('#home')).not.toBeNull();

      router.navigate('/about');

      // Assert
      expect(container.querySelector('#home')).toBeNull();
      expect(container.querySelector('#about')).not.toBeNull();
    });
  });

  // ==================== Fallback for Unmatched Routes ====================

  describe('fallback for unmatched routes', () => {
    it('should render fallback program when no route matches', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/non-existent';
      const homeProgram = createMockProgram('home');
      const fallbackProgram = createMockProgram('not-found');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];

      // Act
      const router = createRouter({ routes, fallback: fallbackProgram });
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#not-found')).not.toBeNull();
      expect(container.querySelector('#home')).toBeNull();
    });

    it('should throw error when no route matches and no fallback provided', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/non-existent';
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];

      // Act & Assert
      const router = createRouter({ routes });
      expect(() => currentMountHandle = router.mount(container)).toThrow();
    });
  });

  // ==================== navigate() with push ====================

  describe('navigate() with push', () => {
    it('should navigate to new path using pushState', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about');

      // Assert
      expect(window.history.pushState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        '/about'
      );
      expect(container.querySelector('#about')).not.toBeNull();
    });

    it('should update current path after navigation', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about');

      // Assert
      expect(router.getContext().path).toBe('/about');
    });

    it('should navigate to dynamic route with params', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const userProgram = createMockProgram('user');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/users/:id', program: userProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/users/123');

      // Assert
      expect(router.getContext().params).toEqual({ id: '123' });
    });
  });

  // ==================== navigate() with replace ====================

  describe('navigate() with replace', () => {
    it('should navigate using replaceState when replace option is true', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about', { replace: true });

      // Assert
      expect(window.history.replaceState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        '/about'
      );
      expect(window.history.pushState).not.toHaveBeenCalled();
    });

    it('should render correct view when using replace', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about', { replace: true });

      // Assert
      expect(container.querySelector('#about')).not.toBeNull();
    });
  });

  // ==================== popstate handling (back/forward) ====================

  describe('popstate handling (back/forward)', () => {
    it('should handle browser back button', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Navigate to about
      router.navigate('/about');
      expect(container.querySelector('#about')).not.toBeNull();

      // Act - simulate back button
      window.history.back();

      // Assert
      expect(container.querySelector('#home')).not.toBeNull();
      expect(container.querySelector('#about')).toBeNull();
    });

    it('should handle browser forward button', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Navigate to about, then back
      router.navigate('/about');
      window.history.back();
      expect(container.querySelector('#home')).not.toBeNull();

      // Act - simulate forward button
      window.history.forward();

      // Assert
      expect(container.querySelector('#about')).not.toBeNull();
    });

    it('should clean up popstate listener on destroy', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const router = createRouter({ routes });
      const { destroy } = currentMountHandle = router.mount(container);

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Act
      destroy();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  // ==================== getContext() ====================

  describe('getContext()', () => {
    it('should return current path', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      const ctx = router.getContext();

      // Assert
      expect(ctx.path).toBe('/');
    });

    it('should return route params', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/users/456';
      const userProgram = createMockProgram('user');
      const routes: RouteDef[] = [
        { path: '/users/:id', program: userProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      const ctx = router.getContext();

      // Assert
      expect(ctx.params).toEqual({ id: '456' });
    });

    it('should return query parameters', () => {
      // Arrange
      (window.location as { pathname: string; search: string }).pathname = '/search';
      (window.location as { search: string }).search = '?q=hello&page=1';
      const searchProgram = createMockProgram('search');
      const routes: RouteDef[] = [
        { path: '/search', program: searchProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      const ctx = router.getContext();

      // Assert
      expect(ctx.query.get('q')).toBe('hello');
      expect(ctx.query.get('page')).toBe('1');
    });

    it('should update context after navigation', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about');
      const ctx = router.getContext();

      // Assert
      expect(ctx.path).toBe('/about');
    });
  });

  // ==================== onRouteChange callback ====================

  describe('onRouteChange callback', () => {
    it('should call onRouteChange when route changes via navigate', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const onRouteChange = vi.fn();
      const router = createRouter({ routes, onRouteChange });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about');

      // Assert
      expect(onRouteChange).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/about',
          params: {},
          query: expect.any(URLSearchParams),
        })
      );
    });

    it('should call onRouteChange when route changes via popstate', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const onRouteChange = vi.fn();
      const router = createRouter({ routes, onRouteChange });
      currentMountHandle = router.mount(container);

      router.navigate('/about');
      onRouteChange.mockClear();

      // Act
      window.history.back();

      // Assert
      expect(onRouteChange).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/',
        })
      );
    });

    it('should call onRouteChange on initial mount', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const onRouteChange = vi.fn();

      // Act
      const router = createRouter({ routes, onRouteChange });
      currentMountHandle = router.mount(container);

      // Assert
      expect(onRouteChange).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/',
        })
      );
    });

    it('should provide params in onRouteChange callback', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const userProgram = createMockProgram('user');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/users/:userId', program: userProgram },
      ];
      const onRouteChange = vi.fn();
      const router = createRouter({ routes, onRouteChange });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/users/789');

      // Assert
      expect(onRouteChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          path: '/users/789',
          params: { userId: '789' },
        })
      );
    });
  });

  // ==================== basePath handling ====================

  describe('basePath handling', () => {
    it('should prepend basePath when navigating', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/app/';
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes, basePath: '/app' });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/about');

      // Assert
      expect(window.history.pushState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        '/app/about'
      );
    });

    it('should strip basePath when matching routes', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/app/about';
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes, basePath: '/app' });

      // Act
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#about')).not.toBeNull();
    });

    it('should handle basePath with trailing slash', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/app/';
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const router = createRouter({ routes, basePath: '/app/' });

      // Act
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#home')).not.toBeNull();
    });

    it('should return path without basePath in getContext', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/app/users/42';
      const userProgram = createMockProgram('user');
      const routes: RouteDef[] = [
        { path: '/users/:id', program: userProgram },
      ];
      const router = createRouter({ routes, basePath: '/app' });
      currentMountHandle = router.mount(container);

      // Act
      const ctx = router.getContext();

      // Assert
      expect(ctx.path).toBe('/users/42');
    });
  });

  // ==================== title updates ====================

  describe('title updates', () => {
    it('should update document title with static string', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram, title: 'Home Page' },
      ];
      const router = createRouter({ routes });

      // Act
      currentMountHandle = router.mount(container);

      // Assert
      expect(document.title).toBe('Home Page');
    });

    it('should update document title with function', () => {
      // Arrange
      (window.location as { pathname: string }).pathname = '/users/42';
      const userProgram = createMockProgram('user');
      const routes: RouteDef[] = [
        {
          path: '/users/:id',
          program: userProgram,
          title: (ctx: RouteContext) => `User ${ctx.params.id}`,
        },
      ];
      const router = createRouter({ routes });

      // Act
      currentMountHandle = router.mount(container);

      // Assert
      expect(document.title).toBe('User 42');
    });

    it('should update title on navigation', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram, title: 'Home' },
        { path: '/about', program: aboutProgram, title: 'About Us' },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);
      expect(document.title).toBe('Home');

      // Act
      router.navigate('/about');

      // Assert
      expect(document.title).toBe('About Us');
    });

    it('should not change title if not specified', () => {
      // Arrange
      document.title = 'Original Title';
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const router = createRouter({ routes });

      // Act
      currentMountHandle = router.mount(container);

      // Assert
      expect(document.title).toBe('Original Title');
    });
  });

  // ==================== destroy() ====================

  describe('destroy()', () => {
    it('should remove rendered content from DOM', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const router = createRouter({ routes });
      const { destroy } = currentMountHandle = router.mount(container);

      expect(container.querySelector('#home')).not.toBeNull();

      // Act
      destroy();

      // Assert
      expect(container.querySelector('#home')).toBeNull();
    });

    it('should stop responding to navigate calls after destroy', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const aboutProgram = createMockProgram('about');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/about', program: aboutProgram },
      ];
      const router = createRouter({ routes });
      const { destroy } = currentMountHandle = router.mount(container);

      // Act
      destroy();

      // Attempting to navigate after destroy should not throw but also should not change anything
      expect(() => router.navigate('/about')).not.toThrow();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle empty routes array with fallback', () => {
      // Arrange
      const fallbackProgram = createMockProgram('fallback');
      const routes: RouteDef[] = [];
      const router = createRouter({ routes, fallback: fallbackProgram });

      // Act
      currentMountHandle = router.mount(container);

      // Assert
      expect(container.querySelector('#fallback')).not.toBeNull();
    });

    it('should handle multiple route matches by using first match', () => {
      // Arrange
      const specificProgram = createMockProgram('specific');
      const wildcardProgram = createMockProgram('wildcard');
      const routes: RouteDef[] = [
        { path: '/users/admin', program: specificProgram },
        { path: '/users/:id', program: wildcardProgram },
      ];
      (window.location as { pathname: string }).pathname = '/users/admin';
      const router = createRouter({ routes });

      // Act
      currentMountHandle = router.mount(container);

      // Assert - should match the first (more specific) route
      expect(container.querySelector('#specific')).not.toBeNull();
    });

    it('should handle navigation to same path', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act - navigate to same path
      router.navigate('/');

      // Assert - should not cause issues
      expect(container.querySelector('#home')).not.toBeNull();
    });

    it('should handle paths with query strings', () => {
      // Arrange
      const homeProgram = createMockProgram('home');
      const searchProgram = createMockProgram('search');
      const routes: RouteDef[] = [
        { path: '/', program: homeProgram },
        { path: '/search', program: searchProgram },
      ];
      const router = createRouter({ routes });
      currentMountHandle = router.mount(container);

      // Act
      router.navigate('/search?q=test&page=2');

      // Assert
      expect(container.querySelector('#search')).not.toBeNull();
      expect(router.getContext().query.get('q')).toBe('test');
      expect(router.getContext().query.get('page')).toBe('2');
    });
  });
});
