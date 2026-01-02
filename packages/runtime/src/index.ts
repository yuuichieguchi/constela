/**
 * @constela/runtime - Runtime DOM renderer for Constela UI framework
 * 
 * Provides fine-grained reactive rendering without virtual DOM.
 */

// Reactive primitives
export { createSignal } from './reactive/signal.js';
export type { Signal } from './reactive/signal.js';

export { createEffect } from './reactive/effect.js';

// State management
export { createStateStore } from './state/store.js';
export type { StateStore } from './state/store.js';

// Expression evaluation
export { evaluate } from './expression/evaluator.js';
export type { EvaluationContext } from './expression/evaluator.js';

// Action execution
export { executeAction } from './action/executor.js';
export type { ActionContext } from './action/executor.js';

// Rendering
export { render } from './renderer/index.js';
export type { RenderContext } from './renderer/index.js';

// App
export { createApp } from './app.js';
export type { AppInstance } from './app.js';
