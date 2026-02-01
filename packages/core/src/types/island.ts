/**
 * Island Architecture Types for Constela Framework
 *
 * This module provides types and type guards for the Islands Architecture,
 * enabling partial hydration of interactive components.
 */

export type { IslandStrategy, IslandStrategyOptions, IslandNode } from './ast.js';

export { ISLAND_STRATEGIES } from './ast.js';

export {
  isIslandStrategy,
  isIslandStrategyOptions,
  isIslandNode,
  isViewNode,
} from './guards.js';
