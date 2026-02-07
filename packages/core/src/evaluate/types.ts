/**
 * Types for the unified evaluate module.
 *
 * StateReader: abstracts Map.get() and StateStore.get()
 * EnvironmentAdapter: abstracts SSR/CSR differences
 * CoreEvaluationContext: the evaluation context consumed by evaluate()
 */

import type { StylePreset } from '../types/ast.js';

export interface StateReader {
  get(name: string): unknown;
}

export interface EnvironmentAdapter {
  resolveRef(name: string): unknown;
  resolveValidity(ref: string, property?: string): unknown;
  resolveGlobal(name: string): unknown;
  bindFunction?(value: Function, parent: unknown): unknown;
  callFunction?(target: Function, args: unknown[]): unknown;
}

export interface CoreEvaluationContext {
  state: StateReader;
  locals: Record<string, unknown>;
  route?: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  } | undefined;
  imports?: Record<string, unknown> | undefined;
  styles?: Record<string, StylePreset> | undefined;
  env: EnvironmentAdapter;
}
