/**
 * @constela/router - Client-side routing for Constela applications
 *
 * Provides History API-based routing without changes to core DSL.
 */

export { createRouter } from './router.js';
export type {
  RouterOptions,
  RouterInstance,
  RouteDef,
  RouteContext,
} from './router.js';

export { bindLink, createLink } from './helpers.js';
export { matchRoute, parseParams } from './matcher.js';
