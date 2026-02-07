/**
 * Unified Expression Evaluator
 *
 * Single source of truth for evaluating compiled expressions.
 * SSR/CSR differences are abstracted via EnvironmentAdapter.
 *
 * Based on runtime/evaluator.ts (most complete implementation)
 * with bug fixes from the unification plan.
 */

import type { CoreEvaluationContext } from './types.js';
import {
  SAFE_ARRAY_METHODS,
  SAFE_STRING_METHODS,
  SAFE_MATH_METHODS,
  SAFE_DATE_STATIC_METHODS,
  SAFE_DATE_INSTANCE_METHODS,
  FORBIDDEN_KEYS,
} from './constants.js';
import { callGlobalFunction } from '../helpers/global-functions.js';

// ==================== Internal structural types ====================
// We use structural typing to avoid depending on @constela/compiler

interface ExprBase {
  expr: string;
}

interface LitExpr extends ExprBase {
  expr: 'lit';
  value: unknown;
}

interface StateExpr extends ExprBase {
  expr: 'state';
  name: string;
  path?: string;
}

interface LocalExpr extends ExprBase {
  expr: 'local';
  name: string;
}

interface VarExpr extends ExprBase {
  expr: 'var';
  name: string;
  path?: string;
}

interface BinExpr extends ExprBase {
  expr: 'bin';
  op: string;
  left: ExprBase;
  right: ExprBase;
}

interface NotExpr extends ExprBase {
  expr: 'not';
  operand: ExprBase;
}

interface CondExpr extends ExprBase {
  expr: 'cond';
  if: ExprBase;
  then: ExprBase;
  else: ExprBase;
}

interface GetExpr extends ExprBase {
  expr: 'get';
  base: ExprBase;
  path: string;
}

interface RouteExpr extends ExprBase {
  expr: 'route';
  name: string;
  source?: 'param' | 'query' | 'path';
}

interface ImportExpr extends ExprBase {
  expr: 'import';
  name: string;
  path?: string;
}

interface DataExpr extends ExprBase {
  expr: 'data';
  name: string;
  path?: string;
}

interface RefExpr extends ExprBase {
  expr: 'ref';
  name: string;
}

interface IndexExpr extends ExprBase {
  expr: 'index';
  base: ExprBase;
  key: ExprBase;
}

interface ParamExpr extends ExprBase {
  expr: 'param';
  name: string;
}

interface StyleExpr extends ExprBase {
  expr: 'style';
  name: string;
  variants?: Record<string, ExprBase>;
}

interface ConcatExpr extends ExprBase {
  expr: 'concat';
  items: ExprBase[];
}

interface ValidityExpr extends ExprBase {
  expr: 'validity';
  ref: string;
  property?: string;
}

interface CallExpr extends ExprBase {
  expr: 'call';
  target: ExprBase | null;
  method: string;
  args?: ExprBase[];
}

interface LambdaExpr extends ExprBase {
  expr: 'lambda';
  param: string;
  index?: string;
  body: ExprBase;
}

interface ArrayExpr extends ExprBase {
  expr: 'array';
  elements: ExprBase[];
}

interface ObjExpr extends ExprBase {
  expr: 'obj';
  props: Record<string, ExprBase>;
}

type AnyExpr =
  | LitExpr | StateExpr | LocalExpr | VarExpr | BinExpr | NotExpr
  | CondExpr | GetExpr | RouteExpr | ImportExpr | DataExpr | RefExpr
  | IndexExpr | ParamExpr | StyleExpr | ConcatExpr | ValidityExpr
  | CallExpr | LambdaExpr | ArrayExpr | ObjExpr;

// ==================== Main evaluate ====================

export function evaluate(expr: unknown, ctx: CoreEvaluationContext): unknown {
  const e = expr as AnyExpr;

  switch (e.expr) {
    case 'lit':
      return e.value;

    case 'state': {
      const stateValue = ctx.state.get(e.name);
      if (e.path && stateValue != null) {
        return getNestedValue(stateValue, e.path);
      }
      return stateValue;
    }

    case 'local':
      return ctx.locals[e.name];

    case 'var': {
      let varName = e.name;
      let pathParts: string[] = [];

      if (varName.includes('.')) {
        const parts = varName.split('.');
        varName = parts[0]!;
        pathParts = parts.slice(1);
      }

      if (e.path) {
        pathParts = pathParts.concat(e.path.split('.'));
      }

      for (const part of pathParts) {
        if (FORBIDDEN_KEYS.has(part)) {
          return undefined;
        }
      }

      let value = ctx.locals[varName];

      // Fallback to globals via adapter
      if (value === undefined) {
        value = ctx.env.resolveGlobal(varName);
      }

      // Traverse path
      for (const part of pathParts) {
        if (value == null) break;
        value = (value as Record<string, unknown>)[part];
      }

      // Bind methods to their parent object
      if (typeof value === 'function' && pathParts.length > 0) {
        let parent = ctx.locals[varName];
        if (parent === undefined) {
          parent = ctx.env.resolveGlobal(varName);
        }
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (parent == null) break;
          parent = (parent as Record<string, unknown>)[pathParts[i]!];
        }
        if (parent != null) {
          if (ctx.env.bindFunction) {
            return ctx.env.bindFunction(value as Function, parent);
          }
          return value;
        }
      }

      return value;
    }

    case 'bin':
      return evaluateBinary(e.op, e.left, e.right, ctx);

    case 'not':
      return !evaluate(e.operand, ctx);

    case 'cond':
      return evaluate(e.if, ctx) ? evaluate(e.then, ctx) : evaluate(e.else, ctx);

    case 'get': {
      const baseValue = evaluate(e.base, ctx);
      if (baseValue == null) return undefined;

      const pathParts = e.path.split('.');
      let value: unknown = baseValue;
      for (const part of pathParts) {
        if (FORBIDDEN_KEYS.has(part)) return undefined;
        if (value == null) return undefined;
        value = (value as Record<string, unknown>)[part];
      }
      return value;
    }

    case 'route': {
      const source = e.source ?? 'param';
      const routeCtx = ctx.route;
      if (!routeCtx) return '';
      switch (source) {
        case 'param':
          return routeCtx.params[e.name] ?? '';
        case 'query':
          return routeCtx.query[e.name] ?? '';
        case 'path':
          return routeCtx.path;
        default:
          return '';
      }
    }

    case 'import': {
      const importData = ctx.imports?.[e.name];
      if (importData === undefined) return undefined;
      if (e.path) {
        return getNestedValue(importData, e.path);
      }
      return importData;
    }

    case 'data': {
      const dataValue = ctx.imports?.[e.name];
      if (dataValue === undefined) return undefined;
      if (e.path) {
        return getNestedValue(dataValue, e.path);
      }
      return dataValue;
    }

    case 'ref':
      return ctx.env.resolveRef(e.name);

    case 'index': {
      const base = evaluate(e.base, ctx);
      const key = evaluate(e.key, ctx);
      if (base == null || key == null) return undefined;
      if (typeof key === 'string' && FORBIDDEN_KEYS.has(key)) return undefined;
      return (base as Record<string | number, unknown>)[key as string | number];
    }

    case 'param':
      return undefined;

    case 'style':
      return evaluateStyle(e, ctx);

    case 'concat': {
      return e.items
        .map((item: ExprBase) => {
          const val = evaluate(item, ctx);
          return val == null ? '' : String(val);
        })
        .join('');
    }

    case 'validity':
      return ctx.env.resolveValidity(e.ref, e.property);

    case 'call': {
      const target = e.target != null ? evaluate(e.target, ctx) : null;

      const args = e.args?.map((arg: ExprBase) => {
        if (arg.expr === 'lambda') return arg;
        return evaluate(arg, ctx);
      }) ?? [];

      // Global function calls (target is null)
      if (target === null) {
        return callGlobalFunction(e.method, args);
      }

      // Array methods
      if (Array.isArray(target)) {
        return callArrayMethod(target, e.method, args, ctx, e.args);
      }

      // String methods
      if (typeof target === 'string') {
        return callStringMethod(target, e.method, args);
      }

      // Math static methods
      if (target === Math) {
        return callMathMethod(e.method, args);
      }

      // Date static methods
      if (target === Date) {
        return callDateStaticMethod(e.method, args);
      }

      // Date instance methods
      if (target instanceof Date) {
        return callDateInstanceMethod(target, e.method);
      }

      // Function call support via adapter
      if (typeof target === 'function' && e.method === 'call') {
        if (ctx.env.callFunction) {
          return ctx.env.callFunction(target, args);
        }
        return target(...args);
      }

      return undefined;
    }

    case 'lambda':
      return undefined;

    case 'array':
      return e.elements.map((elem: ExprBase) => evaluate(elem, ctx));

    case 'obj': {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(e.props)) {
        result[key] = evaluate(value, ctx);
      }
      return result;
    }

    default:
      return undefined;
  }
}

// ==================== evaluateStyle ====================

export function evaluateStyle(expr: unknown, ctx: CoreEvaluationContext): string {
  const e = expr as StyleExpr;
  const preset = ctx.styles?.[e.name];
  if (!preset) return '';

  let classes = preset.base;

  if (preset.variants) {
    for (const variantKey of Object.keys(preset.variants)) {
      let variantValueStr: string | null = null;

      if (e.variants?.[variantKey]) {
        let variantValue: unknown;
        try {
          variantValue = evaluate(e.variants[variantKey]!, ctx);
        } catch {
          continue;
        }
        if (variantValue != null) {
          variantValueStr = String(variantValue);
        }
      } else if (preset.defaultVariants?.[variantKey] !== undefined) {
        variantValueStr = preset.defaultVariants[variantKey]!;
      }

      if (variantValueStr !== null) {
        const variantClasses = preset.variants[variantKey]?.[variantValueStr];
        if (variantClasses) {
          classes += ' ' + variantClasses;
        }
      }
    }
  }

  return classes.trim();
}

// ==================== Helper functions ====================

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let value: unknown = obj;
  let parent: unknown = null;

  for (const part of parts) {
    if (FORBIDDEN_KEYS.has(part)) return undefined;
    if (value == null) return undefined;

    parent = value;

    if (Array.isArray(value)) {
      const index = Number(part);
      if (Number.isInteger(index) && index >= 0) {
        value = value[index];
      } else {
        value = (value as unknown as Record<string, unknown>)[part];
      }
    } else if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  if (typeof value === 'function' && parent != null) {
    return (value as Function).bind(parent);
  }

  return value;
}

function evaluateBinary(
  op: string,
  left: ExprBase,
  right: ExprBase,
  ctx: CoreEvaluationContext
): unknown {
  // Short-circuit for logical operators
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
    case '+':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal + rightVal;
      }
      return String(leftVal) + String(rightVal);
    case '-':
      return (typeof leftVal === 'number' ? leftVal : 0) - (typeof rightVal === 'number' ? rightVal : 0);
    case '*':
      return (typeof leftVal === 'number' ? leftVal : 0) * (typeof rightVal === 'number' ? rightVal : 0);
    case '/': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      if (divisor === 0) {
        return dividend === 0 ? NaN : (dividend > 0 ? Infinity : -Infinity);
      }
      return dividend / divisor;
    }
    case '%': {
      const dividend = typeof leftVal === 'number' ? leftVal : 0;
      const divisor = typeof rightVal === 'number' ? rightVal : 0;
      if (divisor === 0) return NaN;
      return dividend % divisor;
    }
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '<':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') return leftVal < rightVal;
      return String(leftVal) < String(rightVal);
    case '<=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') return leftVal <= rightVal;
      return String(leftVal) <= String(rightVal);
    case '>':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') return leftVal > rightVal;
      return String(leftVal) > String(rightVal);
    case '>=':
      if (typeof leftVal === 'number' && typeof rightVal === 'number') return leftVal >= rightVal;
      return String(leftVal) >= String(rightVal);
    default:
      throw new Error('Unknown binary operator: ' + op);
  }
}

// ==================== Lambda / Array / String / Math / Date helpers ====================

function createLambdaFunction(
  lambda: LambdaExpr,
  ctx: CoreEvaluationContext
): (item: unknown, index: number) => unknown {
  return (item: unknown, index: number): unknown => {
    const lambdaLocals: Record<string, unknown> = {
      ...ctx.locals,
      [lambda.param]: item,
    };
    if (lambda.index !== undefined) {
      lambdaLocals[lambda.index] = index;
    }
    return evaluate(lambda.body, { ...ctx, locals: lambdaLocals });
  };
}

function callArrayMethod(
  target: unknown[],
  method: string,
  args: unknown[],
  ctx: CoreEvaluationContext,
  rawArgs?: ExprBase[]
): unknown {
  if (!SAFE_ARRAY_METHODS.has(method)) return undefined;

  switch (method) {
    case 'length':
      return target.length;
    case 'at': {
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return target.at(index);
    }
    case 'includes': {
      const searchElement = args[0];
      const fromIndex = typeof args[1] === 'number' ? args[1] : undefined;
      return target.includes(searchElement, fromIndex);
    }
    case 'slice': {
      const start = typeof args[0] === 'number' ? args[0] : undefined;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.slice(start, end);
    }
    case 'indexOf': {
      const searchElement = args[0];
      const fromIndex = typeof args[1] === 'number' ? args[1] : undefined;
      return target.indexOf(searchElement, fromIndex);
    }
    case 'join': {
      const separator = typeof args[0] === 'string' ? args[0] : ',';
      return target.join(separator);
    }
    case 'filter': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as LambdaExpr, ctx);
      return target.filter((item, index) => !!fn(item, index));
    }
    case 'map': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as LambdaExpr, ctx);
      return target.map((item, index) => fn(item, index));
    }
    case 'find': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as LambdaExpr, ctx);
      return target.find((item, index) => !!fn(item, index));
    }
    case 'findIndex': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as LambdaExpr, ctx);
      return target.findIndex((item, index) => !!fn(item, index));
    }
    case 'some': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as LambdaExpr, ctx);
      return target.some((item, index) => !!fn(item, index));
    }
    case 'every': {
      const lambdaExpr = rawArgs?.[0];
      if (!lambdaExpr || lambdaExpr.expr !== 'lambda') return undefined;
      const fn = createLambdaFunction(lambdaExpr as LambdaExpr, ctx);
      return target.every((item, index) => !!fn(item, index));
    }
    default:
      return undefined;
  }
}

function callStringMethod(
  target: string,
  method: string,
  args: unknown[]
): unknown {
  if (!SAFE_STRING_METHODS.has(method)) return undefined;

  switch (method) {
    case 'length':
      return target.length;
    case 'charAt': {
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return target.charAt(index);
    }
    case 'substring': {
      const start = typeof args[0] === 'number' ? args[0] : 0;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.substring(start, end);
    }
    case 'slice': {
      const start = typeof args[0] === 'number' ? args[0] : undefined;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return target.slice(start, end);
    }
    case 'split': {
      const separator = typeof args[0] === 'string' ? args[0] : '';
      return target.split(separator);
    }
    case 'trim':
      return target.trim();
    case 'toUpperCase':
      return target.toUpperCase();
    case 'toLowerCase':
      return target.toLowerCase();
    case 'replace': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const replace = typeof args[1] === 'string' ? args[1] : '';
      return target.replace(search, replace);
    }
    case 'includes': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.includes(search, position);
    }
    case 'startsWith': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.startsWith(search, position);
    }
    case 'endsWith': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const length = typeof args[1] === 'number' ? args[1] : undefined;
      return target.endsWith(search, length);
    }
    case 'indexOf': {
      const search = typeof args[0] === 'string' ? args[0] : '';
      const position = typeof args[1] === 'number' ? args[1] : undefined;
      return target.indexOf(search, position);
    }
    default:
      return undefined;
  }
}

function callMathMethod(method: string, args: unknown[]): unknown {
  if (!SAFE_MATH_METHODS.has(method)) return undefined;

  const numbers = args.filter((a): a is number => typeof a === 'number');

  switch (method) {
    case 'min':
      return numbers.length > 0 ? Math.min(...numbers) : undefined;
    case 'max':
      return numbers.length > 0 ? Math.max(...numbers) : undefined;
    case 'round':
      return numbers[0] !== undefined ? Math.round(numbers[0]) : undefined;
    case 'floor':
      return numbers[0] !== undefined ? Math.floor(numbers[0]) : undefined;
    case 'ceil':
      return numbers[0] !== undefined ? Math.ceil(numbers[0]) : undefined;
    case 'abs':
      return numbers[0] !== undefined ? Math.abs(numbers[0]) : undefined;
    case 'sqrt':
      return numbers[0] !== undefined ? Math.sqrt(numbers[0]) : undefined;
    case 'pow':
      return numbers[0] !== undefined && numbers[1] !== undefined
        ? Math.pow(numbers[0], numbers[1])
        : undefined;
    case 'random':
      return Math.random();
    case 'sin':
      return numbers[0] !== undefined ? Math.sin(numbers[0]) : undefined;
    case 'cos':
      return numbers[0] !== undefined ? Math.cos(numbers[0]) : undefined;
    case 'tan':
      return numbers[0] !== undefined ? Math.tan(numbers[0]) : undefined;
    default:
      return undefined;
  }
}

function callDateStaticMethod(method: string, args: unknown[]): unknown {
  if (!SAFE_DATE_STATIC_METHODS.has(method)) return undefined;

  switch (method) {
    case 'now':
      return Date.now();
    case 'parse': {
      const dateString = args[0];
      return typeof dateString === 'string' ? Date.parse(dateString) : undefined;
    }
    default:
      return undefined;
  }
}

function callDateInstanceMethod(target: Date, method: string): unknown {
  if (!SAFE_DATE_INSTANCE_METHODS.has(method)) return undefined;

  switch (method) {
    case 'toISOString':
      return target.toISOString();
    case 'toDateString':
      return target.toDateString();
    case 'toTimeString':
      return target.toTimeString();
    case 'getTime':
      return target.getTime();
    case 'getFullYear':
      return target.getFullYear();
    case 'getMonth':
      return target.getMonth();
    case 'getDate':
      return target.getDate();
    case 'getHours':
      return target.getHours();
    case 'getMinutes':
      return target.getMinutes();
    case 'getSeconds':
      return target.getSeconds();
    case 'getMilliseconds':
      return target.getMilliseconds();
    default:
      return undefined;
  }
}
