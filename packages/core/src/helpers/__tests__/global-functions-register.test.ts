/**
 * Test module for registerGlobalFunction() and unregisterGlobalFunction() APIs.
 *
 * Coverage:
 * - registerGlobalFunction: adding custom functions to the global registry
 * - unregisterGlobalFunction: removing custom functions from the global registry
 * - Protection of built-in functions from overwriting and removal
 * - Integration: register, call, unregister, verify undefined
 *
 * TDD Red Phase: All tests MUST FAIL because registerGlobalFunction and
 * unregisterGlobalFunction do not exist yet in global-functions.ts.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  callGlobalFunction,
  GLOBAL_FUNCTIONS,
  registerGlobalFunction,
  unregisterGlobalFunction,
} from '../global-functions.js';

// ==================== Cleanup ====================

/**
 * Track custom functions registered during tests so we can clean up.
 * Since unregisterGlobalFunction may not work yet (TDD Red), we still try.
 */
const registeredDuringTest: string[] = [];

afterEach(() => {
  for (const name of registeredDuringTest) {
    try {
      unregisterGlobalFunction(name);
    } catch {
      // Cleanup best-effort; function may not exist in Red phase
    }
  }
  registeredDuringTest.length = 0;
});

// ==================== Helper ====================

function registerAndTrack(name: string, fn: (...args: unknown[]) => unknown): void {
  registerGlobalFunction(name, fn);
  registeredDuringTest.push(name);
}

// ==================== Tests ====================

describe('registerGlobalFunction', () => {
  // ==================== Happy Path ====================

  it('should register a new function and make it callable via callGlobalFunction', () => {
    // Arrange
    const square = (x: unknown) => (typeof x === 'number' ? x * x : undefined);

    // Act
    registerAndTrack('square', square);
    const result = callGlobalFunction('square', [4]);

    // Assert
    expect(result).toBe(16);
  });

  it('should register multiple custom functions independently', () => {
    // Arrange
    const add10 = (x: unknown) => (typeof x === 'number' ? x + 10 : undefined);
    const negate = (x: unknown) => (typeof x === 'number' ? -x : undefined);

    // Act
    registerAndTrack('add10', add10);
    registerAndTrack('negate', negate);

    // Assert
    expect(callGlobalFunction('add10', [5])).toBe(15);
    expect(callGlobalFunction('negate', [7])).toBe(-7);
  });

  // ==================== Error Handling ====================

  it('should throw when registering a name that already exists in built-in GLOBAL_FUNCTIONS', () => {
    // 'min' is a built-in global function
    expect('min' in GLOBAL_FUNCTIONS).toBe(true);

    // Act & Assert
    const fakeFn = () => 42;
    expect(() => registerGlobalFunction('min', fakeFn)).toThrow();
  });

  it('should throw when registering a name that already exists as a custom function', () => {
    // Arrange
    const fn1 = () => 'first';
    const fn2 = () => 'second';
    registerAndTrack('myCustomFn', fn1);

    // Act & Assert
    expect(() => registerGlobalFunction('myCustomFn', fn2)).toThrow();
  });
});

describe('unregisterGlobalFunction', () => {
  // ==================== Happy Path ====================

  it('should remove a previously registered custom function', () => {
    // Arrange
    const halfFn = (x: unknown) => (typeof x === 'number' ? x / 2 : undefined);
    registerGlobalFunction('half', halfFn);

    // Precondition: function works
    expect(callGlobalFunction('half', [10])).toBe(5);

    // Act
    unregisterGlobalFunction('half');

    // Assert
    const result = callGlobalFunction('half', [10]);
    expect(result).toBeUndefined();
  });

  // ==================== Error Handling ====================

  it('should NOT allow unregistering built-in functions (throw or no-op)', () => {
    // 'min' is a built-in function
    const minBefore = GLOBAL_FUNCTIONS['min'];
    expect(minBefore).toBeDefined();

    // Act & Assert: either throws or silently does nothing
    let threw = false;
    try {
      unregisterGlobalFunction('min');
    } catch {
      threw = true;
    }

    // Whether it threw or not, 'min' must still be callable
    const result = callGlobalFunction('min', [3, 1, 2]);
    expect(result).toBe(1);

    // If it didn't throw, it was a no-op (still acceptable)
    if (!threw) {
      expect(GLOBAL_FUNCTIONS['min']).toBe(minBefore);
    }
  });

  it('should return undefined from callGlobalFunction after unregistering', () => {
    // Arrange
    const greetFn = (name: unknown) =>
      typeof name === 'string' ? `Hello, ${name}!` : undefined;
    registerGlobalFunction('greet', greetFn);

    // Precondition
    expect(callGlobalFunction('greet', ['World'])).toBe('Hello, World!');

    // Act
    unregisterGlobalFunction('greet');

    // Assert
    expect(callGlobalFunction('greet', ['World'])).toBeUndefined();
  });
});

describe('Integration: register, call, unregister, verify undefined', () => {
  it('should complete the full lifecycle: register -> call -> unregister -> undefined', () => {
    // 1. Register
    const cube = (x: unknown) => (typeof x === 'number' ? x * x * x : undefined);
    registerGlobalFunction('cube', cube);

    // 2. Call - should work
    expect(callGlobalFunction('cube', [3])).toBe(27);

    // 3. Unregister
    unregisterGlobalFunction('cube');

    // 4. Verify undefined
    expect(callGlobalFunction('cube', [3])).toBeUndefined();
  });

  it('should not interfere with built-in functions during custom function lifecycle', () => {
    // Register custom function
    const myMax = (a: unknown, b: unknown) =>
      typeof a === 'number' && typeof b === 'number' ? a + b : undefined;
    registerAndTrack('myMax', myMax);

    // Built-in 'max' still works
    expect(callGlobalFunction('max', [5, 10])).toBe(10);

    // Custom 'myMax' works
    expect(callGlobalFunction('myMax', [5, 10])).toBe(15);

    // Unregister custom, built-in still works
    unregisterGlobalFunction('myMax');
    registeredDuringTest.splice(registeredDuringTest.indexOf('myMax'), 1);

    expect(callGlobalFunction('max', [5, 10])).toBe(10);
    expect(callGlobalFunction('myMax', [5, 10])).toBeUndefined();
  });
});
