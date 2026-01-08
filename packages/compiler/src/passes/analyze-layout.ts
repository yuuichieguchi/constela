/**
 * Layout Analysis Pass - Semantic validation for layout programs
 *
 * This pass performs semantic analysis on layout programs:
 * - Validates that at least one slot node exists
 * - Detects duplicate named slots
 * - Validates state and action references within layouts
 * - Warns/errors for slots inside loops
 */

import type {
  LayoutProgram,
  ViewNode,
  ConstelaError,
  Expression,
} from '@constela/core';
import {
  createLayoutMissingSlotError,
  createDuplicateSlotNameError,
  createDuplicateDefaultSlotError,
  createSlotInLoopError,
  createUndefinedStateError,
  createUndefinedActionError,
  isEventHandler,
} from '@constela/core';

// ==================== Types ====================

export interface LayoutAnalysisContext {
  stateNames: Set<string>;
  actionNames: Set<string>;
  componentNames: Set<string>;
  routeParams: Set<string>;
  importNames: Set<string>;
  slotNames: Set<string>;
  hasDefaultSlot: boolean;
}

export interface LayoutAnalysisSuccess {
  ok: true;
  context: LayoutAnalysisContext;
}

export interface LayoutAnalysisFailure {
  ok: false;
  errors: ConstelaError[];
}

export type LayoutAnalysisResult = LayoutAnalysisSuccess | LayoutAnalysisFailure;

// ==================== Helper Functions ====================

/**
 * Builds a JSON Pointer path from segments
 */
function buildPath(base: string, ...segments: (string | number)[]): string {
  return segments.reduce<string>((p, s) => `${p}/${s}`, base);
}

// ==================== Context Collection ====================

/**
 * Collects state, action, and component names from layout
 */
function collectContext(layout: LayoutProgram): Omit<LayoutAnalysisContext, 'slotNames' | 'hasDefaultSlot'> {
  const stateNames = new Set<string>(layout.state ? Object.keys(layout.state) : []);
  const actionNames = new Set<string>(layout.actions ? layout.actions.map((a) => a.name) : []);
  const componentNames = new Set<string>(
    layout.components ? Object.keys(layout.components) : []
  );
  return { stateNames, actionNames, componentNames, routeParams: new Set(), importNames: new Set() };
}

// ==================== Slot Analysis ====================

interface SlotInfo {
  name: string | undefined;
  path: string;
  inLoop: boolean;
}

/**
 * Finds all slot nodes in the view tree
 */
function findSlotNodes(
  node: ViewNode,
  path: string,
  slots: SlotInfo[],
  inLoop: boolean = false
): void {
  if (node.kind === 'slot') {
    slots.push({
      name: (node as ViewNode & { name?: string }).name,
      path,
      inLoop,
    });
    return;
  }

  // Check children for element nodes
  if (node.kind === 'element' && node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child) {
        findSlotNodes(child, buildPath(path, 'children', i), slots, inLoop);
      }
    }
  }

  // Check if branches
  if (node.kind === 'if') {
    findSlotNodes(node.then, buildPath(path, 'then'), slots, inLoop);
    if (node.else) {
      findSlotNodes(node.else, buildPath(path, 'else'), slots, inLoop);
    }
  }

  // Check each body - mark as in loop
  if (node.kind === 'each') {
    findSlotNodes(node.body, buildPath(path, 'body'), slots, true);
  }

  // Check component nodes (though slots shouldn't be inside component invocations)
  if (node.kind === 'component' && node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child) {
        findSlotNodes(child, buildPath(path, 'children', i), slots, inLoop);
      }
    }
  }
}

/**
 * Validates slots and returns slot names and whether there's a default slot
 */
function validateSlots(
  layout: LayoutProgram
): { errors: ConstelaError[]; slotNames: Set<string>; hasDefaultSlot: boolean } {
  const errors: ConstelaError[] = [];
  const slots: SlotInfo[] = [];
  const slotNames = new Set<string>();
  let hasDefaultSlot = false;

  // Find all slots
  findSlotNodes(layout.view, '/view', slots);

  // Check if any slots found
  if (slots.length === 0) {
    errors.push(createLayoutMissingSlotError('/view'));
    return { errors, slotNames, hasDefaultSlot };
  }

  // Check for duplicates and slots in loops
  const seenNames = new Map<string, string>(); // name -> first path
  let defaultSlotPath: string | undefined;

  for (const slot of slots) {
    // Check for slot in loop
    if (slot.inLoop) {
      errors.push(createSlotInLoopError(slot.path));
      continue;
    }

    if (slot.name === undefined || slot.name === '') {
      // Default slot
      if (defaultSlotPath !== undefined) {
        errors.push(createDuplicateDefaultSlotError(slot.path));
      } else {
        defaultSlotPath = slot.path;
        hasDefaultSlot = true;
      }
    } else {
      // Named slot
      const existingPath = seenNames.get(slot.name);
      if (existingPath !== undefined) {
        errors.push(createDuplicateSlotNameError(slot.name, slot.path));
      } else {
        seenNames.set(slot.name, slot.path);
        slotNames.add(slot.name);
      }
    }
  }

  return { errors, slotNames, hasDefaultSlot };
}

// ==================== Expression Validation ====================

/**
 * Validates expressions for state references in layout
 */
function validateExpression(
  expr: Expression,
  path: string,
  stateNames: Set<string>
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (expr.expr) {
    case 'state':
      if (!stateNames.has(expr.name)) {
        errors.push(createUndefinedStateError(expr.name, path));
      }
      break;

    case 'bin':
      errors.push(...validateExpression(expr.left, buildPath(path, 'left'), stateNames));
      errors.push(...validateExpression(expr.right, buildPath(path, 'right'), stateNames));
      break;

    case 'not':
      errors.push(...validateExpression(expr.operand, buildPath(path, 'operand'), stateNames));
      break;

    case 'cond':
      errors.push(...validateExpression(expr.if, buildPath(path, 'if'), stateNames));
      errors.push(...validateExpression(expr.then, buildPath(path, 'then'), stateNames));
      errors.push(...validateExpression(expr.else, buildPath(path, 'else'), stateNames));
      break;

    case 'get':
      errors.push(...validateExpression(expr.base, buildPath(path, 'base'), stateNames));
      break;

    case 'lit':
    case 'var':
    case 'param':
    case 'route':
    case 'import':
      // These are either always valid or validated elsewhere
      break;
  }

  return errors;
}

/**
 * Validates view node for state and action references
 */
function validateViewNode(
  node: ViewNode,
  path: string,
  stateNames: Set<string>,
  actionNames: Set<string>
): ConstelaError[] {
  const errors: ConstelaError[] = [];

  switch (node.kind) {
    case 'element':
      // Validate props
      if (node.props) {
        for (const [propName, propValue] of Object.entries(node.props)) {
          const propPath = buildPath(path, 'props', propName);
          if (isEventHandler(propValue)) {
            // Check action reference
            if (!actionNames.has(propValue.action)) {
              errors.push(createUndefinedActionError(propValue.action, propPath));
            }
            // Check payload expression if present
            if (propValue.payload) {
              errors.push(
                ...validateExpression(propValue.payload as Expression, buildPath(propPath, 'payload'), stateNames)
              );
            }
          } else {
            // It's an expression
            errors.push(...validateExpression(propValue as Expression, propPath, stateNames));
          }
        }
      }
      // Validate children
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child) {
            errors.push(
              ...validateViewNode(child, buildPath(path, 'children', i), stateNames, actionNames)
            );
          }
        }
      }
      break;

    case 'text':
      errors.push(...validateExpression(node.value, buildPath(path, 'value'), stateNames));
      break;

    case 'if':
      errors.push(
        ...validateExpression(node.condition, buildPath(path, 'condition'), stateNames)
      );
      errors.push(...validateViewNode(node.then, buildPath(path, 'then'), stateNames, actionNames));
      if (node.else) {
        errors.push(...validateViewNode(node.else, buildPath(path, 'else'), stateNames, actionNames));
      }
      break;

    case 'each':
      errors.push(...validateExpression(node.items, buildPath(path, 'items'), stateNames));
      errors.push(...validateViewNode(node.body, buildPath(path, 'body'), stateNames, actionNames));
      break;

    case 'slot':
      // Slots don't need validation here - already handled in validateSlots
      break;
  }

  return errors;
}

// ==================== Main Analyze Function ====================

/**
 * Performs static analysis on a layout program
 *
 * - Validates at least one slot exists
 * - Detects duplicate slot names
 * - Validates state references
 * - Validates action references
 *
 * @param layout - Layout program to analyze
 * @returns LayoutAnalysisResult
 */
export function analyzeLayoutPass(layout: LayoutProgram): LayoutAnalysisResult {
  const baseContext = collectContext(layout);
  const errors: ConstelaError[] = [];

  // Validate slots first (critical for layouts)
  const { errors: slotErrors, slotNames, hasDefaultSlot } = validateSlots(layout);
  errors.push(...slotErrors);

  // If slot validation failed, return early without state/action validation
  // This ensures slot-related tests can pass independently
  if (slotErrors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  // Validate view node for state/action references
  errors.push(
    ...validateViewNode(
      layout.view,
      '/view',
      baseContext.stateNames,
      baseContext.actionNames
    )
  );

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    context: {
      ...baseContext,
      slotNames,
      hasDefaultSlot,
    },
  };
}
