/**
 * Expression Evaluator - Evaluates compiled expressions
 * 
 * Supports:
 * - Literal values (lit)
 * - State reads (state)
 * - Variable reads (var)
 * - Binary operations (bin)
 * - Not operation (not)
 */

import type { StateStore } from '../state/store.js';
import type { CompiledExpression } from '@constela/compiler';

export interface EvaluationContext {
  state: StateStore;
  locals: Record<string, unknown>;
}

export function evaluate(expr: CompiledExpression, ctx: EvaluationContext): unknown {
  switch (expr.expr) {
    case 'lit':
      return expr.value;

    case 'state':
      return ctx.state.get(expr.name);

    case 'var': {
      let varName = expr.name;
      let pathParts: string[] = [];

      // Support dot notation in name: "user.name" -> name="user", path="name"
      if (varName.includes('.')) {
        const parts = varName.split('.');
        varName = parts[0]!;
        pathParts = parts.slice(1);
      }

      // Add explicit path if provided
      if (expr.path) {
        pathParts = pathParts.concat(expr.path.split('.'));
      }

      // Prototype pollution prevention
      const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
      for (const part of pathParts) {
        if (forbiddenKeys.has(part)) {
          return undefined;
        }
      }

      let value = ctx.locals[varName];

      // Traverse path
      for (const part of pathParts) {
        if (value == null) break;
        value = (value as Record<string, unknown>)[part];
      }

      return value;
    }

    case 'bin':
      return evaluateBinary(expr.op, expr.left, expr.right, ctx);

    case 'not':
      return !evaluate(expr.operand, ctx);

    default:
      throw new Error('Unknown expression type');
  }
}

function evaluateBinary(
  op: string,
  left: CompiledExpression,
  right: CompiledExpression,
  ctx: EvaluationContext
): unknown {
  // Short-circuit evaluation for logical operators
  if (op === '&&') {
    const leftVal = evaluate(left, ctx);
    if (!leftVal) return leftVal;
    return evaluate(right, ctx);
  }

  if (op === '||') {
    const leftVal = evaluate(left, ctx);
    if (leftVal) return leftVal;
    return evaluate(right, ctx);
  }

  const leftVal = evaluate(left, ctx);
  const rightVal = evaluate(right, ctx);

  switch (op) {
    // Arithmetic
    case '+':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal + rightVal;
      }
      // Fallback for string concatenation
      return String(leftVal) + String(rightVal);
    case '-':
      return (typeof leftVal === 'number' ? leftVal : 0) - (typeof rightVal === 'number' ? rightVal : 0);
    case '*':
      return (typeof leftVal === 'number' ? leftVal : 0) * (typeof rightVal === 'number' ? rightVal : 0);
    case '/': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      // Handle division by zero - return Infinity (matches JavaScript semantics)
      if (divisor === 0) {
        return dividend === 0 ? NaN : (dividend > 0 ? Infinity : -Infinity);
      }
      return dividend / divisor;
    }

    // Comparison (using strict equality)
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '<':
      // Safe comparison with type checking
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal < rightVal;
      }
      return String(leftVal) < String(rightVal);
    case '<=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal <= rightVal;
      }
      return String(leftVal) <= String(rightVal);
    case '>':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal > rightVal;
      }
      return String(leftVal) > String(rightVal);
    case '>=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal >= rightVal;
      }
      return String(leftVal) >= String(rightVal);

    default:
      throw new Error('Unknown binary operator: ' + op);
  }
}
