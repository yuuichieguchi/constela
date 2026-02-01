/**
 * Island Hydration - Runtime Partial Hydration
 *
 * This module provides selective hydration for Islands Architecture,
 * enabling fine-grained control over when interactive components become active.
 */

import type { IslandStrategy, IslandStrategyOptions } from '@constela/core';
import type { CompiledProgram, CompiledIslandNode } from '@constela/compiler';

export interface IslandHydrationOptions {
  element: HTMLElement;
  id: string;
  strategy: IslandStrategy;
  strategyOptions?: IslandStrategyOptions;
  state?: Record<string, unknown>;
  program: CompiledProgram | CompiledIslandNode;
}

/**
 * Hydrates an island based on the specified strategy.
 * Returns a cleanup function to cancel pending hydration or cleanup resources.
 */
export function hydrateIsland(options: IslandHydrationOptions): () => void {
  const { strategy } = options;

  switch (strategy) {
    case 'load':
      hydrateImmediately(options);
      return () => {};
    case 'idle':
      return hydrateOnIdle(options, options.strategyOptions?.timeout);
    case 'visible':
      return hydrateOnVisible(options, options.strategyOptions);
    case 'interaction':
      return hydrateOnInteraction(options);
    case 'media':
      return hydrateOnMedia(options, options.strategyOptions?.media);
    case 'never':
      return () => {}; // SSR only, no hydration
    default:
      hydrateImmediately(options);
      return () => {};
  }
}

/**
 * Hydrates the island immediately (synchronously)
 */
function hydrateImmediately(options: IslandHydrationOptions): void {
  // Mark as hydrated
  options.element.dataset['islandHydrated'] = 'true';
  // TODO: Implement actual hydration logic using program
}

/**
 * Hydrates the island when the browser is idle
 */
function hydrateOnIdle(
  options: IslandHydrationOptions,
  timeout?: number
): () => void {
  let cancelled = false;
  let handle: number | ReturnType<typeof setTimeout>;

  if ('requestIdleCallback' in window) {
    handle = window.requestIdleCallback(
      () => {
        if (!cancelled) hydrateImmediately(options);
      },
      timeout ? { timeout } : undefined
    );
    return () => {
      cancelled = true;
      window.cancelIdleCallback(handle as number);
    };
  } else {
    // Fallback to setTimeout for browsers without requestIdleCallback
    handle = setTimeout(() => {
      if (!cancelled) hydrateImmediately(options);
    }, timeout ?? 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }
}

/**
 * Hydrates the island when it becomes visible in the viewport
 */
function hydrateOnVisible(
  options: IslandHydrationOptions,
  strategyOptions?: IslandStrategyOptions
): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          hydrateImmediately(options);
          observer.disconnect();
          break;
        }
      }
    },
    {
      threshold: strategyOptions?.threshold ?? 0,
      rootMargin: strategyOptions?.rootMargin ?? '0px',
    }
  );

  observer.observe(options.element);
  return () => observer.disconnect();
}

/**
 * Hydrates the island on first user interaction
 */
function hydrateOnInteraction(options: IslandHydrationOptions): () => void {
  const events = ['click', 'focusin', 'mouseover'] as const;
  let hydrated = false;

  const handler = () => {
    if (hydrated) return;
    hydrated = true;
    hydrateImmediately(options);
    for (const event of events) {
      options.element.removeEventListener(event, handler);
    }
  };

  for (const event of events) {
    options.element.addEventListener(event, handler, { passive: true });
  }

  return () => {
    for (const event of events) {
      options.element.removeEventListener(event, handler);
    }
  };
}

/**
 * Hydrates the island when a media query matches
 */
function hydrateOnMedia(
  options: IslandHydrationOptions,
  media?: string
): () => void {
  if (!media) {
    hydrateImmediately(options);
    return () => {};
  }

  const mql = window.matchMedia(media);

  if (mql.matches) {
    hydrateImmediately(options);
    return () => {};
  }

  const handler = (e: MediaQueryListEvent) => {
    if (e.matches) {
      hydrateImmediately(options);
      mql.removeEventListener('change', handler);
    }
  };

  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

/**
 * Detects islands in the DOM by looking for data attributes.
 * Returns an array of island configurations extracted from the DOM.
 */
export function detectIslandsInDOM(container: HTMLElement): Array<{
  element: HTMLElement;
  id: string;
  strategy: IslandStrategy;
  strategyOptions?: IslandStrategyOptions;
  state?: Record<string, unknown>;
}> {
  const islands: Array<{
    element: HTMLElement;
    id: string;
    strategy: IslandStrategy;
    strategyOptions?: IslandStrategyOptions;
    state?: Record<string, unknown>;
  }> = [];

  const elements = container.querySelectorAll('[data-island-id]');
  for (const element of elements) {
    const id = element.getAttribute('data-island-id');
    const strategy = element.getAttribute(
      'data-island-strategy'
    ) as IslandStrategy | null;
    const optionsJson = element.getAttribute('data-island-options');
    const stateJson = element.getAttribute('data-island-state');

    if (id && strategy) {
      islands.push({
        element: element as HTMLElement,
        id,
        strategy,
        strategyOptions: optionsJson ? JSON.parse(optionsJson) : undefined,
        state: stateJson ? JSON.parse(stateJson) : undefined,
      });
    }
  }

  return islands;
}
