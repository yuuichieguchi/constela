import type { TransitionDirective } from '@constela/core';

/**
 * Applies enter transition to an element.
 * Flow: add enter class → rAF → add enterActive → transitionend/timeout → remove both
 */
export function applyEnterTransition(el: HTMLElement, config: TransitionDirective): () => void {
  const duration = config.duration ?? 300;
  let cancelled = false;

  el.classList.add(config.enter);

  requestAnimationFrame(() => {
    if (cancelled) return;
    el.classList.add(config.enterActive);

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      el.classList.remove(config.enter);
      el.classList.remove(config.enterActive);
      el.removeEventListener('transitionend', onEnd);
    };

    const onEnd = (e: Event) => {
      if (e.target !== el) return;
      cleanup();
    };
    el.addEventListener('transitionend', onEnd);
    setTimeout(cleanup, duration);
  });

  // Return cancel function
  return () => { cancelled = true; };
}

/**
 * Applies exit transition to an element.
 * Flow: add exit class → rAF → add exitActive → transitionend/timeout → resolve
 * Returns a Promise that resolves when the transition is complete.
 */
export function applyExitTransition(
  el: HTMLElement,
  config: TransitionDirective
): { promise: Promise<void>; cancel: () => void } {
  const duration = config.duration ?? 300;
  let cancelled = false;

  const promise = new Promise<void>((resolve) => {
    el.classList.add(config.exit);

    requestAnimationFrame(() => {
      if (cancelled) { resolve(); return; }
      el.classList.add(config.exitActive);

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        el.classList.remove(config.exit);
        el.classList.remove(config.exitActive);
        el.removeEventListener('transitionend', onEnd);
        resolve();
      };

      const onEnd = (e: Event) => {
        if (e.target !== el) return;
        cleanup();
      };
      el.addEventListener('transitionend', onEnd);
      setTimeout(cleanup, duration);
    });
  });

  const cancel = () => {
    cancelled = true;
    el.classList.remove(config.exit);
    el.classList.remove(config.exitActive);
  };

  return { promise, cancel };
}
