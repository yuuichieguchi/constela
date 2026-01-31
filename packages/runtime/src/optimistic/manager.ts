/**
 * OptimisticManager - Manages optimistic UI updates with rollback support.
 *
 * TDD Stub: This file contains only type definitions and stub implementations
 * to allow tests to run and fail at assertion level (Red phase).
 */

/**
 * Represents a pending optimistic update that can be confirmed or rejected.
 */
export interface PendingUpdate {
  /** Unique identifier for this update */
  id: string;
  /** The state target being updated */
  target: string;
  /** Optional path for nested updates (e.g., ['items', 0, 'liked']) */
  path: (string | number)[] | undefined;
  /** The original value before optimistic update */
  originalValue: unknown;
  /** The optimistically applied value */
  optimisticValue: unknown;
  /** Timestamp when the update was applied */
  timestamp: number;
}

/**
 * Manager for optimistic UI updates with automatic rollback support.
 */
export interface OptimisticManager {
  /**
   * Apply an optimistic update immediately.
   * @param target - The state target to update
   * @param path - Optional path for nested updates
   * @param value - The optimistic value to apply
   * @param getState - Function to get current state
   * @param setState - Function to set new state
   * @returns Unique ID for this update
   */
  apply(
    target: string,
    path: (string | number)[] | undefined,
    value: unknown,
    getState: (target: string) => unknown,
    setState: (target: string, value: unknown) => void
  ): string;

  /**
   * Confirm an optimistic update (server accepted).
   * @param id - The update ID to confirm
   * @returns true if update was found and confirmed, false otherwise
   */
  confirm(id: string): boolean;

  /**
   * Reject an optimistic update and rollback to original value.
   * @param id - The update ID to reject
   * @param getState - Function to get current state
   * @param setState - Function to set new state
   * @returns true if update was found and rejected, false otherwise
   */
  reject(
    id: string,
    getState: (target: string) => unknown,
    setState: (target: string, value: unknown) => void
  ): boolean;

  /**
   * Get a pending update by ID.
   * @param id - The update ID to look up
   * @returns The pending update or undefined if not found
   */
  getPending(id: string): PendingUpdate | undefined;

  /**
   * Get all pending updates.
   * @returns Array of all pending updates
   */
  getAllPending(): PendingUpdate[];

  /**
   * Set auto-rollback timeout for pending updates.
   * @param ms - Timeout in milliseconds (0 to disable)
   */
  setAutoRollbackTimeout(ms: number): void;

  /**
   * Dispose the manager and clear all pending updates.
   */
  dispose(): void;
}

/**
 * Deep clone a value to prevent mutation.
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone) as T;
  }
  const cloned = {} as T;
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      cloned[key] = deepClone(value[key]);
    }
  }
  return cloned;
}

/**
 * Get a value at a nested path from an object.
 */
function getAtPath(obj: unknown, path: (string | number)[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/**
 * Set a value at a nested path in an object (immutably).
 * Returns a new object with the value set at the path.
 */
function setAtPath(
  obj: unknown,
  path: (string | number)[],
  value: unknown
): unknown {
  if (path.length === 0) {
    return deepClone(value);
  }

  const [head, ...rest] = path;
  // head is guaranteed to exist since path.length > 0
  const key = head as string | number;
  const isArray = Array.isArray(obj);
  const cloned = isArray ? [...(obj as unknown[])] : { ...(obj as Record<string | number, unknown>) };

  if (rest.length === 0) {
    (cloned as Record<string | number, unknown>)[key] = deepClone(value);
  } else {
    (cloned as Record<string | number, unknown>)[key] = setAtPath(
      (obj as Record<string | number, unknown>)[key],
      rest,
      value
    );
  }

  return cloned;
}

/**
 * Create a new OptimisticManager instance.
 */
export function createOptimisticManager(): OptimisticManager {
  const pendingUpdates = new Map<string, PendingUpdate>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let autoRollbackTimeout = 0;

  // Store getState and setState for auto-rollback
  const stateAccessors = new Map<
    string,
    {
      getState: (target: string) => unknown;
      setState: (target: string, value: unknown) => void;
    }
  >();

  function generateId(): string {
    return crypto.randomUUID();
  }

  function apply(
    target: string,
    path: (string | number)[] | undefined,
    value: unknown,
    getState: (target: string) => unknown,
    setState: (target: string, value: unknown) => void
  ): string {
    const id = generateId();
    const currentState = getState(target);

    // Get original value at path (or entire state if no path)
    const originalValue =
      path && path.length > 0
        ? getAtPath(currentState, path)
        : currentState;

    // Apply the update
    let newState: unknown;
    if (path && path.length > 0) {
      newState = setAtPath(currentState, path, value);
    } else {
      newState = deepClone(value);
    }
    setState(target, newState);

    // Store the pending update
    const pendingUpdate: PendingUpdate = {
      id,
      target,
      path: path && path.length > 0 ? path : undefined,
      originalValue,
      optimisticValue: value,
      timestamp: Date.now(),
    };
    pendingUpdates.set(id, pendingUpdate);

    // Store state accessors for auto-rollback
    stateAccessors.set(id, { getState, setState });

    // Set up auto-rollback timer if configured
    if (autoRollbackTimeout > 0) {
      const timer = setTimeout(() => {
        reject(id, getState, setState);
      }, autoRollbackTimeout);
      timers.set(id, timer);
    }

    return id;
  }

  function confirm(id: string): boolean {
    const pending = pendingUpdates.get(id);
    if (!pending) {
      return false;
    }

    // Clear the timer if exists
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    pendingUpdates.delete(id);
    stateAccessors.delete(id);
    return true;
  }

  function reject(
    id: string,
    getState: (target: string) => unknown,
    setState: (target: string, value: unknown) => void
  ): boolean {
    const pending = pendingUpdates.get(id);
    if (!pending) {
      return false;
    }

    // Clear the timer if exists
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    // Rollback to original value
    const currentState = getState(pending.target);
    if (pending.path && pending.path.length > 0) {
      const restoredState = setAtPath(currentState, pending.path, pending.originalValue);
      setState(pending.target, restoredState);
    } else {
      setState(pending.target, pending.originalValue);
    }

    pendingUpdates.delete(id);
    stateAccessors.delete(id);
    return true;
  }

  function getPending(id: string): PendingUpdate | undefined {
    return pendingUpdates.get(id);
  }

  function getAllPending(): PendingUpdate[] {
    return Array.from(pendingUpdates.values());
  }

  function setAutoRollbackTimeout(ms: number): void {
    autoRollbackTimeout = ms;
  }

  function dispose(): void {
    // Clear all timers
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    pendingUpdates.clear();
    stateAccessors.clear();
  }

  return {
    apply,
    confirm,
    reject,
    getPending,
    getAllPending,
    setAutoRollbackTimeout,
    dispose,
  };
}
