/**
 * Layout Transform Pass - Layout to CompiledProgram transformation and composition
 *
 * This pass transforms layout programs and composes them with page programs.
 */

import type {
  LayoutProgram,
  ViewNode,
  ActionDefinition,
  StateField,
  ComponentDef,
} from '@constela/core';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledAction,
  CompiledRouteDefinition,
} from './transform.js';
import type { LayoutAnalysisContext } from './analyze-layout.js';

// ==================== Compiled Layout Program Type ====================

export interface CompiledLayoutProgram {
  version: '1.0';
  type: 'layout';
  state: Record<string, { type: string; initial: unknown }>;
  actions: CompiledAction[];
  view: CompiledNode;
  components?: Record<string, ComponentDef> | undefined;
}

// ==================== Transform Context ====================

interface TransformContext {
  components: Record<string, ComponentDef>;
}

// ==================== State Transformation ====================

function transformState(
  state?: Record<string, StateField>
): Record<string, { type: string; initial: unknown }> {
  if (!state) return {};
  const result: Record<string, { type: string; initial: unknown }> = {};
  for (const [name, field] of Object.entries(state)) {
    result[name] = {
      type: field.type,
      initial: field.initial,
    };
  }
  return result;
}

// ==================== Actions Transformation ====================

function transformActions(actions?: ActionDefinition[]): CompiledAction[] {
  if (!actions) return [];
  return actions.map(action => ({
    name: action.name,
    steps: action.steps.map(step => {
      if (step.do === 'set') {
        return {
          do: 'set' as const,
          target: step.target,
          value: { expr: 'lit' as const, value: null }, // Simplified for now
        };
      }
      if (step.do === 'update') {
        return {
          do: 'update' as const,
          target: step.target,
          operation: step.operation,
        };
      }
      // fetch
      return {
        do: 'fetch' as const,
        url: { expr: 'lit' as const, value: '' },
      };
    }),
  }));
}

// ==================== View Node Transformation ====================

function transformViewNode(node: ViewNode, ctx: TransformContext): CompiledNode {
  switch (node.kind) {
    case 'element': {
      const result: CompiledNode = {
        kind: 'element',
        tag: node.tag,
      };
      if (node.props) {
        (result as { props?: Record<string, unknown> }).props = {};
        for (const [key, value] of Object.entries(node.props)) {
          if ('event' in value) {
            // Event handler
            (result as { props: Record<string, unknown> }).props[key] = {
              event: value.event,
              action: value.action,
            };
          } else {
            // Expression - pass through
            (result as { props: Record<string, unknown> }).props[key] = value;
          }
        }
      }
      if (node.children && node.children.length > 0) {
        (result as { children?: CompiledNode[] }).children = node.children.map(
          child => transformViewNode(child, ctx)
        );
      }
      return result;
    }

    case 'text':
      return {
        kind: 'text',
        value: node.value as CompiledNode['value' & keyof CompiledNode],
      } as CompiledNode;

    case 'if': {
      const result: CompiledNode = {
        kind: 'if',
        condition: node.condition as CompiledNode['condition' & keyof CompiledNode],
        then: transformViewNode(node.then, ctx),
      } as CompiledNode;
      if (node.else) {
        (result as { else?: CompiledNode }).else = transformViewNode(node.else, ctx);
      }
      return result;
    }

    case 'each':
      return {
        kind: 'each',
        items: node.items,
        as: node.as,
        body: transformViewNode(node.body, ctx),
      } as CompiledNode;

    case 'slot':
      // Slots remain as-is in layout transformation
      // They will be replaced during composition
      return {
        kind: 'slot',
        name: (node as ViewNode & { name?: string }).name,
      } as unknown as CompiledNode;

    case 'component': {
      const def = ctx.components[node.name];
      if (def) {
        return transformViewNode(def.view, ctx);
      }
      return { kind: 'element', tag: 'div' };
    }

    case 'markdown':
      return {
        kind: 'markdown',
        content: node.content,
      } as CompiledNode;

    case 'code':
      return {
        kind: 'code',
        language: node.language,
        content: node.content,
      } as CompiledNode;
  }
}

// ==================== Main Transform Function ====================

/**
 * Transforms a layout program into a compiled layout
 */
export function transformLayoutPass(
  layout: LayoutProgram,
  _context: LayoutAnalysisContext
): CompiledLayoutProgram {
  const ctx: TransformContext = {
    components: layout.components || {},
  };

  return {
    version: '1.0',
    type: 'layout',
    state: transformState(layout.state),
    actions: transformActions(layout.actions),
    view: transformViewNode(layout.view, ctx),
    components: layout.components,
  };
}

// ==================== Layout Composition ====================

/**
 * Deep clones a compiled node
 */
function deepCloneNode(node: CompiledNode): CompiledNode {
  return JSON.parse(JSON.stringify(node));
}

/**
 * Replaces slot nodes with content in a compiled node tree
 */
function replaceSlots(
  node: CompiledNode,
  defaultContent: CompiledNode,
  namedContent?: Record<string, CompiledNode>
): CompiledNode {
  // Check if this is a slot node
  if ((node as unknown as { kind: string }).kind === 'slot') {
    const slotName = (node as unknown as { name?: string }).name;
    if (slotName && namedContent?.[slotName]) {
      return deepCloneNode(namedContent[slotName]);
    }
    return deepCloneNode(defaultContent);
  }

  // Handle element nodes with children
  if (node.kind === 'element') {
    const children = (node as { children?: CompiledNode[] }).children;
    if (children && children.length > 0) {
      const newChildren = children.map(child => replaceSlots(child, defaultContent, namedContent));
      return {
        ...node,
        children: newChildren,
      };
    }
    return node;
  }

  // Handle if nodes
  if (node.kind === 'if') {
    const ifNode = node as { then: CompiledNode; else?: CompiledNode };
    const result = {
      ...node,
      then: replaceSlots(ifNode.then, defaultContent, namedContent),
    };
    if (ifNode.else) {
      (result as { else?: CompiledNode }).else = replaceSlots(ifNode.else, defaultContent, namedContent);
    }
    return result as CompiledNode;
  }

  // Handle each nodes
  if (node.kind === 'each') {
    const eachNode = node as { body: CompiledNode };
    return {
      ...node,
      body: replaceSlots(eachNode.body, defaultContent, namedContent),
    } as CompiledNode;
  }

  return node;
}

/**
 * Composes a layout with a page, inserting page content into slots
 */
export function composeLayoutWithPage(
  layout: CompiledProgram,
  page: CompiledProgram,
  slots?: Record<string, ViewNode>
): CompiledProgram {
  // Clone layout view for modification
  const layoutView = deepCloneNode(layout.view);

  // Convert ViewNode slots to CompiledNode if provided
  const namedContent: Record<string, CompiledNode> | undefined = slots
    ? Object.fromEntries(
        Object.entries(slots).map(([name, node]) => [name, node as unknown as CompiledNode])
      )
    : undefined;

  // Replace slots with page content
  const composedView = replaceSlots(layoutView, page.view, namedContent);

  // Merge state (prefix layout state if conflicts)
  const mergedState: Record<string, { type: string; initial: unknown }> = {};
  
  // Add page state first
  for (const [name, field] of Object.entries(page.state)) {
    mergedState[name] = field;
  }
  
  // Add layout state, prefixing if conflicts
  for (const [name, field] of Object.entries(layout.state)) {
    if (name in mergedState) {
      mergedState[`$layout.${name}`] = field;
    } else {
      mergedState[name] = field;
    }
  }

  // Merge actions (prefix layout actions if conflicts)
  // Handle both array and Record formats for actions
  const getActionsArray = (actions: unknown): CompiledAction[] => {
    if (Array.isArray(actions)) return actions;
    if (typeof actions === 'object' && actions !== null) {
      return Object.values(actions as Record<string, CompiledAction>);
    }
    return [];
  };

  const pageActions = getActionsArray(page.actions);
  const layoutActions = getActionsArray(layout.actions);
  const pageActionNames = new Set(pageActions.map(a => a.name));

  const mergedActions: Record<string, CompiledAction> = {};
  for (const action of pageActions) {
    mergedActions[action.name] = action;
  }
  for (const action of layoutActions) {
    if (pageActionNames.has(action.name)) {
      const prefixedName = `$layout.${action.name}`;
      mergedActions[prefixedName] = { ...action, name: prefixedName };
    } else {
      mergedActions[action.name] = action;
    }
  }

  // Merge components
  const mergedComponents = {
    ...((layout as unknown as { components?: Record<string, ComponentDef> }).components || {}),
    ...((page as unknown as { components?: Record<string, ComponentDef> }).components || {}),
  };

  const result: CompiledProgram = {
    version: '1.0',
    state: mergedState,
    actions: mergedActions,
    view: composedView,
  };

  // Preserve page route
  if (page.route) {
    result.route = page.route;
  }

  // Add components if any
  if (Object.keys(mergedComponents).length > 0) {
    (result as unknown as { components: Record<string, ComponentDef> }).components = mergedComponents;
  }

  return result;
}
