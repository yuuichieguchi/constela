/**
 * Router helper functions
 */

import type { RouterInstance } from './router.js';

/**
 * Binds an anchor element to use the router for navigation
 *
 * @param router - Router instance
 * @param anchor - Anchor element to bind
 * @param to - Path to navigate to (optional, uses href if not provided)
 * @returns Cleanup function to remove the binding
 */
export function bindLink(
  router: RouterInstance,
  anchor: HTMLAnchorElement,
  to?: string
): () => void {
  const targetPath = to ?? anchor.getAttribute('href') ?? '/';

  function handleClick(event: MouseEvent): void {
    // Allow opening in new tab with modifier keys
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    // Only handle left clicks
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    router.navigate(targetPath);
  }

  anchor.addEventListener('click', handleClick);

  return () => {
    anchor.removeEventListener('click', handleClick);
  };
}

/**
 * Creates a link element bound to the router
 *
 * @param router - Router instance
 * @param to - Path to navigate to
 * @param text - Link text content
 * @returns Object with element and destroy function
 */
export function createLink(
  router: RouterInstance,
  to: string,
  text: string
): { element: HTMLAnchorElement; destroy: () => void } {
  const anchor = document.createElement('a');
  anchor.href = to;
  anchor.textContent = text;

  const cleanup = bindLink(router, anchor, to);

  return {
    element: anchor,
    destroy: cleanup,
  };
}
