/**
 * Test module for Transition Runtime Functions.
 *
 * Coverage:
 * - applyEnterTransition: adds CSS classes for enter animation lifecycle
 * - applyExitTransition: adds CSS classes for exit animation lifecycle, returns Promise
 * - Class addition/removal timing with requestAnimationFrame
 * - Cleanup after transitionend event
 * - Timeout fallback when transitionend does not fire
 * - Default duration of 300ms
 *
 * TDD Red Phase: These tests MUST FAIL because:
 * - The module `../index.js` (packages/runtime/src/transition/index.ts) does not exist
 * - `applyEnterTransition` and `applyExitTransition` are not implemented
 * - `TransitionDirective` type is not exported from @constela/core
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyEnterTransition, applyExitTransition } from '../index.js';
import type { TransitionDirective } from '@constela/core';

// ==================== Test Configuration ====================

const config: TransitionDirective = {
  enter: 'fade-enter',
  enterActive: 'fade-enter-active',
  exit: 'fade-exit',
  exitActive: 'fade-exit-active',
  duration: 300,
};

// ==================== applyEnterTransition ====================

describe('applyEnterTransition', () => {
  let el: HTMLDivElement;
  let rafCallbacks: Array<(time: number) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('div');
    document.body.appendChild(el);
    rafCallbacks = [];
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should add enter class initially', () => {
    /**
     * Given: A DOM element and a transition config
     * When: applyEnterTransition is called
     * Then: The element should immediately have the `enter` class
     */
    applyEnterTransition(el, config);

    expect(el.classList.contains('fade-enter')).toBe(true);
  });

  it('should add enterActive class after requestAnimationFrame', () => {
    /**
     * Given: applyEnterTransition has been called
     * When: requestAnimationFrame callback fires
     * Then: The element should have the `enterActive` class
     */
    applyEnterTransition(el, config);

    // Fire the rAF callback
    expect(rafCallbacks.length).toBeGreaterThan(0);
    rafCallbacks[0]!(0);

    expect(el.classList.contains('fade-enter-active')).toBe(true);
  });

  it('should remove both classes after transitionend event', () => {
    /**
     * Given: applyEnterTransition has been called and rAF has fired
     * When: transitionend event fires on the element
     * Then: Both enter and enterActive classes should be removed
     */
    applyEnterTransition(el, config);

    // Fire rAF
    rafCallbacks[0]!(0);

    // Dispatch transitionend (target === el for the guard check)
    el.dispatchEvent(new Event('transitionend', { bubbles: true }));

    expect(el.classList.contains('fade-enter')).toBe(false);
    expect(el.classList.contains('fade-enter-active')).toBe(false);
  });

  it('should remove both classes after duration timeout if transitionend does not fire', () => {
    /**
     * Given: applyEnterTransition has been called and rAF has fired
     * When: duration ms elapse without transitionend event
     * Then: Both enter and enterActive classes should be removed
     */
    applyEnterTransition(el, config);

    // Fire rAF
    rafCallbacks[0]!(0);

    // Advance timer past duration (no transitionend event)
    vi.advanceTimersByTime(300);

    expect(el.classList.contains('fade-enter')).toBe(false);
    expect(el.classList.contains('fade-enter-active')).toBe(false);
  });
});

// ==================== applyExitTransition ====================

describe('applyExitTransition', () => {
  let el: HTMLDivElement;
  let rafCallbacks: Array<(time: number) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('div');
    document.body.appendChild(el);
    rafCallbacks = [];
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should add exit class initially', () => {
    /**
     * Given: A DOM element and a transition config
     * When: applyExitTransition is called
     * Then: The element should immediately have the `exit` class
     */
    applyExitTransition(el, config);

    expect(el.classList.contains('fade-exit')).toBe(true);
  });

  it('should add exitActive class after requestAnimationFrame', () => {
    /**
     * Given: applyExitTransition has been called
     * When: requestAnimationFrame callback fires
     * Then: The element should have the `exitActive` class
     */
    applyExitTransition(el, config);

    // Fire the rAF callback
    expect(rafCallbacks.length).toBeGreaterThan(0);
    rafCallbacks[0]!(0);

    expect(el.classList.contains('fade-exit-active')).toBe(true);
  });

  it('should resolve after transitionend event', async () => {
    /**
     * Given: applyExitTransition has been called
     * When: rAF fires, then transitionend event fires
     * Then: The returned promise should resolve
     */
    const { promise } = applyExitTransition(el, config);

    // Fire rAF
    rafCallbacks[0]!(0);

    // Dispatch transitionend (target must match the element for the guard check)
    el.dispatchEvent(new Event('transitionend', { bubbles: true }));

    // Promise should resolve without throwing
    await expect(promise).resolves.toBeUndefined();
  });

  it('should resolve after duration timeout if transitionend does not fire', async () => {
    /**
     * Given: applyExitTransition has been called
     * When: duration ms elapse without transitionend event
     * Then: The returned promise should resolve
     */
    const { promise } = applyExitTransition(el, config);

    // Fire rAF
    rafCallbacks[0]!(0);

    // Advance timer past duration
    vi.advanceTimersByTime(300);

    // Promise should resolve
    await expect(promise).resolves.toBeUndefined();
  });
});

// ==================== Default Duration ====================

describe('default duration', () => {
  let el: HTMLDivElement;
  let rafCallbacks: Array<(time: number) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('div');
    document.body.appendChild(el);
    rafCallbacks = [];
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should use 300ms as default duration when not specified', () => {
    /**
     * Given: A transition config without duration
     * When: applyEnterTransition is called
     * Then: Classes should be removed after 300ms (default)
     */
    const configWithoutDuration: TransitionDirective = {
      enter: 'fade-enter',
      enterActive: 'fade-enter-active',
      exit: 'fade-exit',
      exitActive: 'fade-exit-active',
    };

    applyEnterTransition(el, configWithoutDuration);

    // Fire rAF
    rafCallbacks[0]!(0);

    // 299ms - classes should still be present
    vi.advanceTimersByTime(299);
    expect(el.classList.contains('fade-enter')).toBe(true);

    // 1 more ms (total 300ms) - classes should be removed
    vi.advanceTimersByTime(1);
    expect(el.classList.contains('fade-enter')).toBe(false);
    expect(el.classList.contains('fade-enter-active')).toBe(false);
  });
});
