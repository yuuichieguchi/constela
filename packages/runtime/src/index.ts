/**
 * @constela/runtime - Runtime DOM renderer for Constela UI framework
 * 
 * Provides fine-grained reactive rendering without virtual DOM.
 */

// Reactive primitives
export { createSignal } from './reactive/signal.js';
export type { Signal } from './reactive/signal.js';

export { createEffect } from './reactive/effect.js';

export { createComputed } from './reactive/computed.js';
export type { Computed } from './reactive/computed.js';

// State management
export { createStateStore } from './state/store.js';
export type { StateStore, TypedStateStore } from './state/store.js';
export { createTypedStateStore } from './state/typed.js';

// Expression evaluation
export { evaluate, evaluateStyle } from './expression/evaluator.js';
export type { EvaluationContext, StylePreset } from './expression/evaluator.js';

// Action execution
export { executeAction } from './action/executor.js';
export type { ActionContext } from './action/executor.js';

// Rendering
export { render } from './renderer/index.js';
export type { RenderContext } from './renderer/index.js';

// App
export { createApp } from './app.js';
export type { AppInstance } from './app.js';

// Hydration
export { hydrateApp } from './hydrate.js';
export type { HydrateOptions } from './hydrate.js';

// WebSocket connections
export { createWebSocketConnection, createConnectionManager } from './connection/websocket.js';
export type { WebSocketConnection, WebSocketHandlers, ConnectionManager } from './connection/websocket.js';

// HMR (Hot Module Replacement)
export { createHMRClient } from './hmr/client.js';
export type { HMRClient, HMRClientOptions } from './hmr/client.js';
export { createHMRHandler } from './hmr/handler.js';
export type { HMRHandler, HMRHandlerOptions, RouteContext } from './hmr/handler.js';
export { createErrorOverlay } from './hmr/overlay.js';
export type { ErrorOverlay, ErrorInfo } from './hmr/overlay.js';
