/**
 * Inspect command for @constela/cli
 *
 * Inspects Constela program structure and displays AST information.
 *
 * Usage:
 *   constela inspect <input> [options]
 *
 * Options:
 *   --state       Show only state section
 *   --actions     Show only actions section
 *   --components  Show only components section
 *   --view        Show only view tree
 *   --json        Output as JSON
 */

import type {
  Program,
  ViewNode,
  ActionDefinition,
  ActionStep,
  StateField,
  StylePreset,
} from '@constela/core';
import { readFileSync } from 'node:fs';

export interface InspectOptions {
  state?: boolean;
  actions?: boolean;
  components?: boolean;
  view?: boolean;
  json?: boolean;
}

// ==================== Types for JSON Output ====================

interface StateFieldInfo {
  type: string;
  initial: unknown;
}

interface ActionInfo {
  name: string;
  stepSummary: string;
}

interface ParamInfo {
  name: string;
  type: string;
}

interface ComponentInfo {
  name: string;
  params: ParamInfo[];
}

interface ViewTreeInfo {
  kind: string;
  tag?: string;
  text?: string;
  event?: string;
  children?: ViewTreeInfo[];
}

interface InspectJsonOutput {
  state?: Record<string, StateFieldInfo>;
  actions?: ActionInfo[];
  components?: ComponentInfo[];
  styles?: Record<string, unknown>;
  viewTree?: ViewTreeInfo;
}

// ==================== Color Utilities ====================

/**
 * Determines if colored output should be used
 */
function shouldUseColors(): boolean {
  if (process.env['NO_COLOR'] !== undefined) {
    return false;
  }
  if (process.env['FORCE_COLOR'] === '1') {
    return true;
  }
  return process.stdout.isTTY === true;
}

const colors = {
  red: (s: string): string => `\x1b[31m${s}\x1b[0m`,
  green: (s: string): string => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string): string => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string): string => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string): string => `\x1b[2m${s}\x1b[0m`,
  reset: '\x1b[0m',
} as const;

function getColors(): typeof colors {
  if (shouldUseColors()) {
    return colors;
  }
  return {
    red: (s: string): string => s,
    green: (s: string): string => s,
    yellow: (s: string): string => s,
    cyan: (s: string): string => s,
    dim: (s: string): string => s,
    reset: '',
  };
}

// ==================== AST Analysis Helpers ====================

/**
 * Summarizes a single action step
 */
function summarizeStep(step: ActionStep): string {
  switch (step.do) {
    case 'set':
      return `set ${step.target}`;
    case 'update':
      return `${step.operation} ${step.target}`;
    case 'fetch':
      return 'fetch';
    case 'storage':
      return `storage ${step.operation}`;
    case 'clipboard':
      return `clipboard ${step.operation}`;
    case 'navigate':
      return 'navigate';
    case 'import':
      return `import ${step.module}`;
    case 'call':
      return 'call';
    case 'subscribe':
      return `subscribe ${step.event}`;
    case 'dispose':
      return 'dispose';
    case 'dom':
      return `dom ${step.operation}`;
    default:
      return 'unknown';
  }
}

/**
 * Summarizes an action's steps
 */
function summarizeAction(action: ActionDefinition): string {
  if (action.steps.length === 0) {
    return '(empty)';
  }
  if (action.steps.length === 1) {
    return summarizeStep(action.steps[0]);
  }
  return `${summarizeStep(action.steps[0])} + ${action.steps.length - 1} more`;
}

/**
 * Converts a ViewNode to ViewTreeInfo for JSON output
 */
function viewNodeToInfo(node: ViewNode): ViewTreeInfo {
  const info: ViewTreeInfo = { kind: node.kind };

  switch (node.kind) {
    case 'element': {
      info.tag = node.tag;
      // Check for onClick event
      if (node.props) {
        for (const [key, value] of Object.entries(node.props)) {
          if (
            key === 'onClick' &&
            typeof value === 'object' &&
            value !== null &&
            'action' in value
          ) {
            info.event = `onClick=${(value as { action: string }).action}`;
            break;
          }
        }
      }
      if (node.children && node.children.length > 0) {
        info.children = node.children.map(viewNodeToInfo);
      }
      break;
    }
    case 'text': {
      const val = node.value;
      if (val.expr === 'state') {
        info.text = `state.${val.name}`;
      } else if (val.expr === 'lit') {
        info.text = String(val.value);
      } else if (val.expr === 'param') {
        info.text = `param.${val.name}`;
      } else {
        info.text = `(${val.expr})`;
      }
      break;
    }
    case 'if': {
      info.children = [viewNodeToInfo(node.then)];
      if (node.else) {
        info.children.push(viewNodeToInfo(node.else));
      }
      break;
    }
    case 'each': {
      info.children = [viewNodeToInfo(node.body)];
      break;
    }
    case 'component': {
      info.tag = node.name;
      if (node.children && node.children.length > 0) {
        info.children = node.children.map(viewNodeToInfo);
      }
      break;
    }
    default:
      break;
  }

  return info;
}

// ==================== Text Output Formatters ====================

/**
 * Formats state section for text output
 */
function formatStateSection(
  state: Record<string, StateField>,
  c: typeof colors
): string[] {
  const lines: string[] = [];
  const fieldCount = Object.keys(state).length;

  lines.push(`${c.cyan('State')} (${fieldCount} fields):`);

  for (const [name, field] of Object.entries(state)) {
    const initialStr = JSON.stringify(field.initial);
    lines.push(`  ${name}: ${c.yellow(field.type)} = ${c.dim(initialStr)}`);
  }

  return lines;
}

/**
 * Formats actions section for text output
 */
function formatActionsSection(
  actions: ActionDefinition[],
  c: typeof colors
): string[] {
  const lines: string[] = [];

  lines.push(`${c.cyan('Actions')} (${actions.length}):`);

  for (const action of actions) {
    const summary = summarizeAction(action);
    lines.push(`  ${action.name}: ${c.dim(summary)}`);
  }

  return lines;
}

// ==================== Component Input Types ====================

/**
 * Component definition with array-style params (for JSON input compatibility)
 */
interface ArrayParamComponent {
  name: string;
  params?: Array<{ name: string; type: string }>;
  view?: ViewNode;
}

/**
 * Component definition with record-style params (AST standard)
 */
interface RecordParamComponent {
  params?: Record<string, { type: string }>;
  view?: ViewNode;
}

/**
 * Normalizes component definitions to a consistent format
 * Handles both array format (from JSON input) and record format (from AST)
 */
function normalizeComponents(
  components: unknown
): Array<{ name: string; params: Array<{ name: string; type: string }> }> {
  // Check if components is an array (JSON input format)
  if (Array.isArray(components)) {
    return (components as ArrayParamComponent[]).map((comp) => ({
      name: comp.name,
      params: Array.isArray(comp.params)
        ? comp.params
        : Object.entries(comp.params ?? {}).map(([pName, pDef]) => ({
            name: pName,
            type: (pDef as { type: string }).type,
          })),
    }));
  }

  // Handle record format (AST standard)
  return Object.entries(components as Record<string, RecordParamComponent>).map(
    ([name, def]) => ({
      name,
      params: Array.isArray(def.params)
        ? (def.params as Array<{ name: string; type: string }>)
        : Object.entries(def.params ?? {}).map(([pName, pDef]) => ({
            name: pName,
            type: pDef.type,
          })),
    })
  );
}

/**
 * Formats components section for text output
 */
function formatComponentsSection(
  components: unknown,
  c: typeof colors
): string[] {
  const lines: string[] = [];
  const normalized = normalizeComponents(components);
  const componentCount = normalized.length;

  lines.push(`${c.cyan('Components')} (${componentCount}):`);

  for (const comp of normalized) {
    const paramList = comp.params.map((p) => `${p.name}: ${p.type}`).join(', ');
    lines.push(`  ${comp.name}: params(${c.dim(paramList)})`);
  }

  return lines;
}

/**
 * Formats styles section for text output
 */
function formatStylesSection(
  styles: Record<string, StylePreset>,
  c: typeof colors
): string[] {
  const lines: string[] = [];
  const styleCount = Object.keys(styles).length;

  lines.push(`${c.cyan('Styles')} (${styleCount}):`);

  for (const [name, preset] of Object.entries(styles)) {
    const variantCount = preset.variants
      ? Object.keys(preset.variants).length
      : 0;
    const desc =
      variantCount > 0 ? `base + ${variantCount} variants` : 'base only';
    lines.push(`  ${name}: ${c.dim(desc)}`);
  }

  return lines;
}

/**
 * Formats view tree for text output with indentation
 */
function formatViewTree(
  node: ViewNode,
  c: typeof colors,
  indent: number = 0
): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  switch (node.kind) {
    case 'element': {
      let line = `${prefix}element<${c.green(node.tag)}>`;
      // Check for onClick
      if (node.props) {
        for (const [key, value] of Object.entries(node.props)) {
          if (
            key === 'onClick' &&
            typeof value === 'object' &&
            value !== null &&
            'action' in value
          ) {
            line += ` ${c.dim(`onClick=${(value as { action: string }).action}`)}`;
          }
        }
      }
      lines.push(line);
      if (node.children) {
        for (const child of node.children) {
          lines.push(...formatViewTree(child, c, indent + 1));
        }
      }
      break;
    }
    case 'text': {
      const val = node.value;
      let textDesc: string;
      if (val.expr === 'state') {
        textDesc = `state.${val.name}`;
      } else if (val.expr === 'lit') {
        textDesc = JSON.stringify(val.value);
      } else if (val.expr === 'param') {
        textDesc = `param.${val.name}`;
      } else {
        textDesc = `(${val.expr})`;
      }
      lines.push(`${prefix}text: ${c.dim(textDesc)}`);
      break;
    }
    case 'if': {
      lines.push(`${prefix}if:`);
      lines.push(`${prefix}  then:`);
      lines.push(...formatViewTree(node.then, c, indent + 2));
      if (node.else) {
        lines.push(`${prefix}  else:`);
        lines.push(...formatViewTree(node.else, c, indent + 2));
      }
      break;
    }
    case 'each': {
      lines.push(`${prefix}each (as ${node.as}):`);
      lines.push(...formatViewTree(node.body, c, indent + 1));
      break;
    }
    case 'component': {
      lines.push(`${prefix}component<${c.green(node.name)}>`);
      if (node.children) {
        for (const child of node.children) {
          lines.push(...formatViewTree(child, c, indent + 1));
        }
      }
      break;
    }
    case 'slot': {
      const slotName = node.name ? `(${node.name})` : '';
      lines.push(`${prefix}slot${slotName}`);
      break;
    }
    case 'markdown': {
      lines.push(`${prefix}markdown`);
      break;
    }
    case 'code': {
      lines.push(`${prefix}code`);
      break;
    }
  }

  return lines;
}

/**
 * Formats view tree section for text output
 */
function formatViewSection(view: ViewNode, c: typeof colors): string[] {
  const lines: string[] = [];
  lines.push(`${c.cyan('View Tree')}:`);
  lines.push(...formatViewTree(view, c, 1));
  return lines;
}

// ==================== Main Command ====================

/**
 * Execute the inspect command
 *
 * @param input - Path to input file
 * @param options - Command options
 */
export async function inspectCommand(
  input: string,
  options: InspectOptions
): Promise<void> {
  const isJsonMode = options.json === true;
  const c = isJsonMode
    ? {
        red: (s: string) => s,
        green: (s: string) => s,
        yellow: (s: string) => s,
        cyan: (s: string) => s,
        dim: (s: string) => s,
        reset: '',
      }
    : getColors();

  // Determine which sections to show
  const showAll =
    !options.state &&
    !options.actions &&
    !options.components &&
    !options.view;
  const showState = showAll || options.state === true;
  const showActions = showAll || options.actions === true;
  const showComponents = showAll || options.components === true;
  const showView = showAll || options.view === true;
  const showStyles = showAll; // Styles are shown when all sections are shown

  // 1. Read input file
  let fileContent: string;
  try {
    fileContent = readFileSync(input, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.error(`Error: File not found: ${input}`);
    } else {
      console.error(`Error: Could not read file: ${input} - ${error.message}`);
    }
    process.exit(1);
  }

  // 2. Parse JSON
  let program: Program;
  try {
    program = JSON.parse(fileContent) as Program;
  } catch (err) {
    const error = err as SyntaxError;
    console.error(`Error: Invalid JSON syntax: ${error.message}`);
    process.exit(1);
  }

  // 3. Output based on mode
  if (isJsonMode) {
    const output: InspectJsonOutput = {};

    if (showState && program.state) {
      output.state = {};
      for (const [name, field] of Object.entries(program.state)) {
        output.state[name] = {
          type: field.type,
          initial: field.initial,
        };
      }
    }

    if (showActions && program.actions) {
      output.actions = program.actions.map((action) => ({
        name: action.name,
        stepSummary: summarizeAction(action),
      }));
    }

    if (showComponents && program.components) {
      output.components = normalizeComponents(program.components);
    }

    if (showStyles && program.styles) {
      output.styles = program.styles;
    }

    if (showView && program.view) {
      output.viewTree = viewNodeToInfo(program.view);
    }

    console.log(JSON.stringify(output));
  } else {
    // Text output
    const sections: string[][] = [];

    if (showState && program.state) {
      sections.push(formatStateSection(program.state, c));
    }

    if (showActions && program.actions) {
      sections.push(formatActionsSection(program.actions, c));
    }

    if (showComponents && program.components) {
      sections.push(formatComponentsSection(program.components, c));
    }

    if (showStyles && program.styles) {
      sections.push(formatStylesSection(program.styles, c));
    }

    if (showView && program.view) {
      sections.push(formatViewSection(program.view, c));
    }

    // Print sections with blank lines between them
    for (let i = 0; i < sections.length; i++) {
      for (const line of sections[i]) {
        console.log(line);
      }
      if (i < sections.length - 1) {
        console.log('');
      }
    }
  }
}
