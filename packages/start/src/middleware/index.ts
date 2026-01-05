import type { Middleware, MiddlewareContext, MiddlewareNext } from '../types.js';

/**
 * Create middleware chain from array of middlewares.
 *
 * Middlewares are executed in order, with each middleware able to:
 * - Call next() to proceed to the next middleware
 * - Return a Response directly to short-circuit the chain
 * - Modify the response returned by next()
 * - Share data via ctx.locals
 *
 * @param middlewares - Array of middleware functions to chain
 * @returns A single middleware function that executes the entire chain
 */
export function createMiddlewareChain(middlewares: Middleware[]): Middleware {
  return async (ctx: MiddlewareContext, finalNext: MiddlewareNext): Promise<Response> => {
    /**
     * Dispatch function to execute middleware at given index.
     * When all middlewares are exhausted, calls the final handler.
     */
    const dispatch = async (index: number): Promise<Response> => {
      const middleware = middlewares[index];

      if (!middleware) {
        // All middlewares executed, call final handler
        return finalNext();
      }

      // Create next function for this middleware
      const next: MiddlewareNext = () => dispatch(index + 1);

      // Execute middleware and await result (handles both sync and async)
      return await middleware(ctx, next);
    };

    return dispatch(0);
  };
}
